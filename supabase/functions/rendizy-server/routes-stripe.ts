import type { Context } from 'npm:hono';
import { getSupabaseClient } from './kv_store.tsx';
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';
import { encryptSensitive, decryptSensitive } from './utils-crypto.ts';
import { SUPABASE_URL } from './utils-env.ts';
import { errorResponse, successResponse, validationErrorResponse, logError, logInfo } from './utils.ts';

// ============================================================================
// TYPES
// ============================================================================

type StripeConfigRow = {
  id: string;
  organization_id: string;
  enabled: boolean;
  is_test_mode: boolean;
  publishable_key: string | null;
  secret_key_encrypted: string | null;
  webhook_signing_secret_encrypted: string | null;
  restricted_key_encrypted: string | null;
  webhook_url: string | null;
  stripe_webhook_id: string | null;
  created_at: string;
  updated_at: string;
};

type StripeConfigPublic = {
  enabled: boolean;
  isTestMode: boolean;
  publishableKey: string;
  webhookUrl: string;
  hasSecretKey: boolean;
  hasWebhookSigningSecret: boolean;
  hasRestrictedKey: boolean;
  defaultWebhookUrl: string;
};

type SaveStripeConfigPayload = {
  enabled?: boolean;
  isTestMode?: boolean;
  publishableKey?: string;
  secretKey?: string;
  webhookSigningSecret?: string;
  restrictedKey?: string;
  webhookUrl?: string;
};

type CreateCheckoutSessionPayload = {
  reservationId: string;
  successUrl: string;
  cancelUrl: string;
  // opcional: se não vier, tentamos usar pricing_total da reserva
  amountTotalCents?: number;
  currency?: string;
  // opcional: dados extras
  customerEmail?: string;
};

// ============================================================================
// HELPERS
// ============================================================================

function buildDefaultStripeWebhookUrl(organizationId: string): string {
  const base = (SUPABASE_URL || '').trim().replace(/\/+$/, '');
  if (!base) return '';

  // preferimos endpoint sem prefixo /rendizy-server (igual StaysNet), pois o Stripe chama externamente.
  return `${base}/functions/v1/rendizy-server/stripe/webhook/${organizationId}`;
}

/**
 * Cria ou atualiza o webhook endpoint no Stripe via API.
 * Retorna o signing secret para salvar no banco.
 */
async function createOrUpdateStripeWebhook(
  secretKey: string,
  webhookUrl: string,
  existingWebhookId?: string | null
): Promise<{ webhookId: string; signingSecret: string } | null> {
  const enabledEvents = [
    'checkout.session.completed',
    'checkout.session.expired',
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
  ];

  try {
    // Se já existe um webhook, tenta atualizar
    if (existingWebhookId) {
      const updateForm = new URLSearchParams();
      updateForm.set('url', webhookUrl);
      enabledEvents.forEach((evt, i) => updateForm.append('enabled_events[]', evt));

      const updateRes = await fetch(`https://api.stripe.com/v1/webhook_endpoints/${existingWebhookId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: updateForm.toString(),
      });

      if (updateRes.ok) {
        const data = await updateRes.json();
        logInfo(`[Stripe] Webhook ${existingWebhookId} atualizado com sucesso`);
        // Nota: update não retorna o secret, mantemos o existente
        return { webhookId: data.id, signingSecret: '' };
      }
      // Se falhou (ex: webhook deletado manualmente), tenta criar novo
      logInfo(`[Stripe] Webhook ${existingWebhookId} não existe mais, criando novo...`);
    }

    // Criar novo webhook
    const createForm = new URLSearchParams();
    createForm.set('url', webhookUrl);
    enabledEvents.forEach((evt) => createForm.append('enabled_events[]', evt));

    const createRes = await fetch('https://api.stripe.com/v1/webhook_endpoints', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: createForm.toString(),
    });

    if (!createRes.ok) {
      const errData = await createRes.json().catch(() => ({}));
      logError('[Stripe] Falha ao criar webhook:', errData);
      return null;
    }

    const data = await createRes.json();
    logInfo(`[Stripe] Webhook criado com sucesso: ${data.id}`);
    return {
      webhookId: data.id,
      signingSecret: data.secret || '',
    };
  } catch (err: any) {
    logError('[Stripe] Erro ao criar/atualizar webhook:', err);
    return null;
  }
}

async function loadStripeConfigOrThrow(organizationId: string): Promise<StripeConfigRow> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('stripe_configs')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load stripe config: ${error.message}`);
  }
  if (!data) {
    throw new Error('Stripe not configured for this organization');
  }
  return data as StripeConfigRow;
}

function parseStripeSignatureHeader(header: string): { timestamp: string; signatures: string[] } | null {
  // Ex: t=1700000000,v1=abc,v1=def
  const parts = header.split(',').map((p) => p.trim()).filter(Boolean);
  const tPart = parts.find((p) => p.startsWith('t='));
  const v1Parts = parts.filter((p) => p.startsWith('v1='));
  if (!tPart || v1Parts.length === 0) return null;

  const timestamp = tPart.slice(2);
  const signatures = v1Parts.map((p) => p.slice(3)).filter(Boolean);
  if (!timestamp || signatures.length === 0) return null;

  return { timestamp, signatures };
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  const bytes = new Uint8Array(sig);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeEqualHex(a: string, b: string): boolean {
  // ambos hex strings
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

async function verifyStripeWebhookSignature(params: {
  payloadRaw: string;
  signatureHeader: string | null;
  webhookSecret: string;
}): Promise<boolean> {
  const { payloadRaw, signatureHeader, webhookSecret } = params;
  if (!signatureHeader) return false;

  const parsed = parseStripeSignatureHeader(signatureHeader);
  if (!parsed) return false;

  const signedPayload = `${parsed.timestamp}.${payloadRaw}`;
  const expected = await hmacSha256Hex(webhookSecret, signedPayload);

  return parsed.signatures.some((sig) => constantTimeEqualHex(sig, expected));
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /settings/stripe
 */
export async function getStripeConfig(c: Context) {
  try {
    logInfo('[Stripe] Getting config');

    const organizationId = await getOrganizationIdOrThrow(c);
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('stripe_configs')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      logError('[Stripe] Error loading config', error);
      return c.json(errorResponse('Failed to get Stripe config', { details: error.message }), 500);
    }

    const defaultWebhookUrl = buildDefaultStripeWebhookUrl(organizationId);

    if (!data) {
      const empty: StripeConfigPublic = {
        enabled: false,
        isTestMode: true,
        publishableKey: '',
        webhookUrl: '',
        hasSecretKey: false,
        hasWebhookSigningSecret: false,
        hasRestrictedKey: false,
        defaultWebhookUrl,
      };
      return c.json(successResponse(empty));
    }

    const row = data as StripeConfigRow;
    const publicConfig: StripeConfigPublic = {
      enabled: Boolean(row.enabled),
      isTestMode: Boolean(row.is_test_mode),
      publishableKey: row.publishable_key || '',
      webhookUrl: row.webhook_url || '',
      hasSecretKey: Boolean(row.secret_key_encrypted),
      hasWebhookSigningSecret: Boolean(row.webhook_signing_secret_encrypted),
      hasRestrictedKey: Boolean(row.restricted_key_encrypted),
      defaultWebhookUrl,
    };

    return c.json(successResponse(publicConfig));
  } catch (error: any) {
    logError('[Stripe] Error getting config', error);
    return c.json(errorResponse('Failed to get Stripe config', { details: error.message }), 500);
  }
}

/**
 * POST /settings/stripe
 */
export async function saveStripeConfig(c: Context) {
  try {
    const body = await c.req.json<SaveStripeConfigPayload>();
    logInfo('[Stripe] Saving config');

    const organizationId = await getOrganizationIdOrThrow(c);
    const client = getSupabaseClient();

    const { data: existing, error: existingError } = await client
      .from('stripe_configs')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (existingError) {
      return c.json(errorResponse('Failed to load existing Stripe config', { details: existingError.message }), 500);
    }

    const enabled = body.enabled ?? (existing as any)?.enabled ?? false;
    const isTestMode = body.isTestMode ?? (existing as any)?.is_test_mode ?? true;

    const publishableKey = (body.publishableKey ?? (existing as any)?.publishable_key ?? '').trim();
    if (publishableKey && !publishableKey.startsWith('pk_')) {
      return c.json(validationErrorResponse('publishableKey inválida (esperado pk_...)'), 400);
    }

    // Criptografar secrets se fornecidos
    let secretKeyEncrypted: string | null = (existing as any)?.secret_key_encrypted ?? null;
    if (body.secretKey && body.secretKey.trim()) {
      const v = body.secretKey.trim();
      if (!v.startsWith('sk_')) {
        return c.json(validationErrorResponse('secretKey inválida (esperado sk_...)'), 400);
      }
      secretKeyEncrypted = await encryptSensitive(v);
    }

    let webhookSigningSecretEncrypted: string | null = (existing as any)?.webhook_signing_secret_encrypted ?? null;
    if (body.webhookSigningSecret && body.webhookSigningSecret.trim()) {
      const v = body.webhookSigningSecret.trim();
      if (!v.startsWith('whsec_')) {
        return c.json(validationErrorResponse('webhookSigningSecret inválido (esperado whsec_...)'), 400);
      }
      webhookSigningSecretEncrypted = await encryptSensitive(v);
    }

    let restrictedKeyEncrypted: string | null = (existing as any)?.restricted_key_encrypted ?? null;
    if (body.restrictedKey && body.restrictedKey.trim()) {
      const v = body.restrictedKey.trim();
      if (!(v.startsWith('rk_') || v.startsWith('sk_'))) {
        return c.json(validationErrorResponse('restrictedKey inválida (esperado rk_... ou sk_...)'), 400);
      }
      restrictedKeyEncrypted = await encryptSensitive(v);
    }

    const webhookUrl = (body.webhookUrl ?? (existing as any)?.webhook_url ?? '').trim();

    // Se está habilitando, precisa ter secret key
    if (enabled && !secretKeyEncrypted) {
      return c.json(validationErrorResponse('Para habilitar Stripe, informe a secretKey.'), 400);
    }

    // =========================================================================
    // AUTO-CREATE WEBHOOK: Criar webhook no Stripe automaticamente
    // =========================================================================
    let stripeWebhookId: string | null = (existing as any)?.stripe_webhook_id ?? null;
    
    // Se tem secret key e não tem webhook signing secret, criar webhook automaticamente
    if (secretKeyEncrypted && !webhookSigningSecretEncrypted) {
      const defaultWebhookUrl = buildDefaultStripeWebhookUrl(organizationId);
      const secretKeyPlain = await decryptSensitive(secretKeyEncrypted);
      
      logInfo(`[Stripe] Criando webhook automaticamente para org ${organizationId}...`);
      
      const webhookResult = await createOrUpdateStripeWebhook(
        secretKeyPlain,
        defaultWebhookUrl,
        stripeWebhookId
      );
      
      if (webhookResult) {
        stripeWebhookId = webhookResult.webhookId;
        
        // Se recebemos o signing secret (criação nova), salvamos
        if (webhookResult.signingSecret) {
          webhookSigningSecretEncrypted = await encryptSensitive(webhookResult.signingSecret);
          logInfo(`[Stripe] Webhook signing secret salvo automaticamente para org ${organizationId}`);
        }
      } else {
        logError(`[Stripe] Falha ao criar webhook automaticamente para org ${organizationId}`);
        // Não retornamos erro, apenas log - o cliente pode configurar manualmente
      }
    }

    const payload = {
      organization_id: organizationId,
      enabled,
      is_test_mode: isTestMode,
      publishable_key: publishableKey || null,
      secret_key_encrypted: secretKeyEncrypted,
      webhook_signing_secret_encrypted: webhookSigningSecretEncrypted,
      restricted_key_encrypted: restrictedKeyEncrypted,
      webhook_url: webhookUrl || null,
      stripe_webhook_id: stripeWebhookId,
    };

    const { data, error } = await client
      .from('stripe_configs')
      .upsert(payload, { onConflict: 'organization_id' })
      .select('*')
      .single();

    if (error) {
      logError('[Stripe] Error saving config', error);
      return c.json(errorResponse('Failed to save Stripe config', { details: error.message }), 500);
    }

    const row = data as StripeConfigRow;
    const defaultWebhookUrl = buildDefaultStripeWebhookUrl(organizationId);
    const publicConfig: StripeConfigPublic & { webhookAutoCreated?: boolean; stripeWebhookId?: string } = {
      enabled: Boolean(row.enabled),
      isTestMode: Boolean(row.is_test_mode),
      publishableKey: row.publishable_key || '',
      webhookUrl: row.webhook_url || defaultWebhookUrl,
      hasSecretKey: Boolean(row.secret_key_encrypted),
      hasWebhookSigningSecret: Boolean(row.webhook_signing_secret_encrypted),
      hasRestrictedKey: Boolean(row.restricted_key_encrypted),
      defaultWebhookUrl,
      webhookAutoCreated: Boolean(row.stripe_webhook_id),
      stripeWebhookId: row.stripe_webhook_id || undefined,
    };

    return c.json(successResponse(publicConfig));
  } catch (error: any) {
    logError('[Stripe] Error saving config', error);
    return c.json(errorResponse('Failed to save Stripe config', { details: error.message }), 500);
  }
}

/**
 * POST /settings/stripe/create-webhook
 * Força a criação do webhook no Stripe para configurações existentes.
 * Útil para migrar configurações antigas que foram salvas antes do auto-create.
 * 
 * Aceita organization_id via:
 * 1. Header x-organization-id (para chamadas administrativas)
 * 2. Body { organizationId: "..." } (para chamadas via script)
 * 3. Sessão autenticada (fallback)
 */
export async function forceCreateWebhook(c: Context) {
  try {
    logInfo('[Stripe] Force creating webhook...');

    // Tentar obter organization_id de várias fontes
    let organizationId: string | null = null;
    
    // 1. Header x-organization-id
    const headerOrgId = c.req.header('x-organization-id');
    if (headerOrgId && headerOrgId.length > 10) {
      organizationId = headerOrgId;
      logInfo(`[Stripe] Using organization_id from header: ${organizationId}`);
    }
    
    // 2. Body organizationId
    if (!organizationId) {
      try {
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        if (body.organizationId && typeof body.organizationId === 'string') {
          organizationId = body.organizationId;
          logInfo(`[Stripe] Using organization_id from body: ${organizationId}`);
        }
      } catch {}
    }
    
    // 3. Sessão autenticada (fallback)
    if (!organizationId) {
      try {
        organizationId = await getOrganizationIdOrThrow(c);
      } catch (e: any) {
        return c.json(errorResponse('organization_id is required', { details: 'Provide via header x-organization-id, body organizationId, or authenticated session' }), 400);
      }
    }
    
    const client = getSupabaseClient();

    const { data: existing, error: existingError } = await client
      .from('stripe_configs')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (existingError) {
      return c.json(errorResponse('Failed to load Stripe config', { details: existingError.message }), 500);
    }

    if (!existing) {
      return c.json(errorResponse('Stripe not configured for this organization'), 400);
    }

    const row = existing as StripeConfigRow;

    if (!row.secret_key_encrypted) {
      return c.json(errorResponse('Stripe secret key not configured'), 400);
    }

    // Descriptografar a secret key para chamar a API do Stripe
    const secretKeyPlain = await decryptSensitive(row.secret_key_encrypted);
    const defaultWebhookUrl = buildDefaultStripeWebhookUrl(organizationId);

    logInfo(`[Stripe] Creating webhook for org ${organizationId}, URL: ${defaultWebhookUrl}`);

    const webhookResult = await createOrUpdateStripeWebhook(
      secretKeyPlain,
      defaultWebhookUrl,
      row.stripe_webhook_id // passa o ID existente se houver
    );

    if (!webhookResult) {
      return c.json(errorResponse('Failed to create webhook on Stripe'), 500);
    }

    // Atualizar banco com o webhook ID e signing secret
    const updatePayload: Record<string, any> = {
      stripe_webhook_id: webhookResult.webhookId,
    };

    // Se recebemos o signing secret (criação nova), salvamos
    if (webhookResult.signingSecret) {
      updatePayload.webhook_signing_secret_encrypted = await encryptSensitive(webhookResult.signingSecret);
      logInfo(`[Stripe] Webhook signing secret saved for org ${organizationId}`);
    }

    const { error: updateError } = await client
      .from('stripe_configs')
      .update(updatePayload)
      .eq('organization_id', organizationId);

    if (updateError) {
      logError('[Stripe] Error updating config with webhook ID', updateError);
      return c.json(errorResponse('Failed to save webhook config', { details: updateError.message }), 500);
    }

    return c.json(successResponse({
      webhookId: webhookResult.webhookId,
      webhookUrl: defaultWebhookUrl,
      signingSecretSaved: Boolean(webhookResult.signingSecret),
    }));
  } catch (error: any) {
    logError('[Stripe] Error forcing webhook creation', error);
    return c.json(errorResponse('Failed to create webhook', { details: error.message }), 500);
  }
}

/**
 * POST /stripe/checkout/session
 * Cria uma Checkout Session no Stripe e persiste (stripe_checkout_sessions)
 */
export async function createStripeCheckoutSession(c: Context) {
  try {
    const body = await c.req.json<CreateCheckoutSessionPayload>();

    const organizationId = await getOrganizationIdOrThrow(c);
    const supabase = getSupabaseClient();

    if (!body?.reservationId || !body?.successUrl || !body?.cancelUrl) {
      return c.json(
        validationErrorResponse('reservationId, successUrl e cancelUrl são obrigatórios'),
        400
      );
    }

    const config = await loadStripeConfigOrThrow(organizationId);
    if (!config.enabled) {
      return c.json(errorResponse('Stripe is disabled for this organization'), 400);
    }
    if (!config.secret_key_encrypted) {
      return c.json(errorResponse('Stripe secret key not configured'), 400);
    }

    const secretKey = await decryptSensitive(config.secret_key_encrypted);

    // Buscar reserva para valor/moeda (fallback)
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .select('id, pricing_total, pricing_currency')
      .eq('id', body.reservationId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (reservationError) {
      return c.json(errorResponse('Failed to load reservation', { details: reservationError.message }), 500);
    }
    if (!reservation) {
      return c.json(errorResponse('Reservation not found'), 404);
    }

    const currency = (body.currency || (reservation as any).pricing_currency || 'BRL').toLowerCase();

    // pricing_total é NUMERIC(10,2) -> convertemos para cents
    const pricingTotal = Number((reservation as any).pricing_total ?? 0);
    const amountTotalCents = Number.isFinite(body.amountTotalCents)
      ? Math.max(0, Math.floor(body.amountTotalCents as number))
      : Math.max(0, Math.round(pricingTotal * 100));

    if (!Number.isFinite(amountTotalCents) || amountTotalCents <= 0) {
      return c.json(validationErrorResponse('amountTotalCents inválido (precisa ser > 0)'), 400);
    }

    // Stripe: criar Checkout Session via form-url-encoded
    const form = new URLSearchParams();
    form.set('mode', 'payment');
    form.set('success_url', body.successUrl);
    form.set('cancel_url', body.cancelUrl);
    form.set('currency', currency);
    form.set('client_reference_id', body.reservationId);

    // line_items[0][price_data][currency]
    form.set('line_items[0][quantity]', '1');
    form.set('line_items[0][price_data][currency]', currency);
    form.set('line_items[0][price_data][unit_amount]', String(amountTotalCents));
    form.set('line_items[0][price_data][product_data][name]', `Reserva ${body.reservationId}`);

    // metadata
    form.set('metadata[organization_id]', organizationId);
    form.set('metadata[reservation_id]', body.reservationId);

    if (body.customerEmail && body.customerEmail.trim()) {
      form.set('customer_email', body.customerEmail.trim());
    }

    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    const txt = await resp.text();
    if (!resp.ok) {
      return c.json(
        errorResponse('Stripe API error creating checkout session', {
          status: resp.status,
          body: txt,
        }),
        502
      );
    }

    const created = JSON.parse(txt);

    // Persistir mapeamento
    const checkoutSessionId: string = created?.id;
    const paymentIntentId: string | null = created?.payment_intent || null;

    if (!checkoutSessionId || typeof checkoutSessionId !== 'string') {
      return c.json(errorResponse('Stripe response missing session id'), 502);
    }

    const upsertRow = {
      organization_id: organizationId,
      reservation_id: body.reservationId,
      checkout_session_id: checkoutSessionId,
      payment_intent_id: paymentIntentId,
      customer_id: created?.customer || null,
      status: created?.status || null,
      livemode: created?.livemode ?? null,
      currency: created?.currency || currency,
      amount_total: created?.amount_total ?? amountTotalCents,
      metadata: created?.metadata ?? null,
    };

    const { error: upsertError } = await supabase
      .from('stripe_checkout_sessions')
      .upsert(upsertRow, { onConflict: 'checkout_session_id' });

    if (upsertError) {
      return c.json(errorResponse('Failed to persist checkout session', { details: upsertError.message }), 500);
    }

    return c.json(
      successResponse({
        checkoutSessionId,
        url: created?.url || null,
        paymentIntentId,
      })
    );
  } catch (error: any) {
    logError('[Stripe] Error creating checkout session', error);
    return c.json(errorResponse('Failed to create checkout session', { details: error.message }), 500);
  }
}

// ============================================================================
// PRODUCTS & PRICES
// ============================================================================

type CreateProductPayload = {
  name: string;
  description?: string;
  unitAmountCents: number;
  currency?: string;
  recurring?: {
    interval: 'day' | 'week' | 'month' | 'year';
    intervalCount?: number;
  } | null;
  metadata?: Record<string, string>;
};

type StripeProduct = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  defaultPriceId: string | null;
  metadata: Record<string, string>;
  created: number;
};

type StripePrice = {
  id: string;
  productId: string;
  unitAmount: number;
  currency: string;
  type: 'one_time' | 'recurring';
  recurring: { interval: string; intervalCount: number } | null;
  active: boolean;
};

type ProductWithPrice = StripeProduct & {
  price: StripePrice | null;
};

/**
 * GET /stripe/products
 * Lista produtos do Stripe da organização
 */
export async function listStripeProducts(c: Context) {
  try {
    logInfo('[Stripe] Listing products');

    const organizationId = await getOrganizationIdOrThrow(c);
    const config = await loadStripeConfigOrThrow(organizationId);

    if (!config.enabled) {
      return c.json(errorResponse('Stripe is disabled for this organization'), 400);
    }
    if (!config.secret_key_encrypted) {
      return c.json(errorResponse('Stripe secret key not configured'), 400);
    }

    const secretKey = await decryptSensitive(config.secret_key_encrypted);

    // Buscar produtos ativos
    const productsResp = await fetch('https://api.stripe.com/v1/products?active=true&limit=100', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    if (!productsResp.ok) {
      const errText = await productsResp.text();
      return c.json(errorResponse('Stripe API error listing products', { status: productsResp.status, body: errText }), 502);
    }

    const productsData = await productsResp.json();
    const products: any[] = productsData?.data || [];

    // Buscar preços ativos
    const pricesResp = await fetch('https://api.stripe.com/v1/prices?active=true&limit=100', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    if (!pricesResp.ok) {
      const errText = await pricesResp.text();
      return c.json(errorResponse('Stripe API error listing prices', { status: pricesResp.status, body: errText }), 502);
    }

    const pricesData = await pricesResp.json();
    const prices: any[] = pricesData?.data || [];

    // Mapear preços por produto
    const pricesByProduct = new Map<string, any>();
    for (const p of prices) {
      const prodId = typeof p.product === 'string' ? p.product : p.product?.id;
      if (prodId && !pricesByProduct.has(prodId)) {
        pricesByProduct.set(prodId, p);
      }
    }

    // Montar resultado
    const result: ProductWithPrice[] = products.map((prod) => {
      const price = pricesByProduct.get(prod.id) || null;
      return {
        id: prod.id,
        name: prod.name || '',
        description: prod.description || null,
        active: Boolean(prod.active),
        defaultPriceId: prod.default_price || null,
        metadata: prod.metadata || {},
        created: prod.created || 0,
        price: price
          ? {
              id: price.id,
              productId: prod.id,
              unitAmount: price.unit_amount || 0,
              currency: price.currency || 'brl',
              type: price.type || 'one_time',
              recurring: price.recurring
                ? {
                    interval: price.recurring.interval,
                    intervalCount: price.recurring.interval_count || 1,
                  }
                : null,
              active: Boolean(price.active),
            }
          : null,
      };
    });

    return c.json(successResponse({ products: result }));
  } catch (error: any) {
    logError('[Stripe] Error listing products', error);
    return c.json(errorResponse('Failed to list products', { details: error.message }), 500);
  }
}

/**
 * POST /stripe/products
 * Cria produto + preço no Stripe
 */
export async function createStripeProduct(c: Context) {
  try {
    const body = await c.req.json<CreateProductPayload>();
    logInfo('[Stripe] Creating product', { name: body?.name });

    if (!body?.name || typeof body.name !== 'string' || !body.name.trim()) {
      return c.json(validationErrorResponse('name é obrigatório'), 400);
    }
    if (typeof body.unitAmountCents !== 'number' || body.unitAmountCents <= 0) {
      return c.json(validationErrorResponse('unitAmountCents deve ser > 0'), 400);
    }

    const organizationId = await getOrganizationIdOrThrow(c);
    const config = await loadStripeConfigOrThrow(organizationId);

    if (!config.enabled) {
      return c.json(errorResponse('Stripe is disabled for this organization'), 400);
    }
    if (!config.secret_key_encrypted) {
      return c.json(errorResponse('Stripe secret key not configured'), 400);
    }

    const secretKey = await decryptSensitive(config.secret_key_encrypted);
    const currency = (body.currency || 'BRL').toLowerCase();

    // 1) Criar produto
    const productForm = new URLSearchParams();
    productForm.set('name', body.name.trim());
    if (body.description) {
      productForm.set('description', body.description.trim());
    }
    // Metadata para vincular à organização
    productForm.set('metadata[organization_id]', organizationId);
    if (body.metadata) {
      for (const [k, v] of Object.entries(body.metadata)) {
        productForm.set(`metadata[${k}]`, String(v));
      }
    }

    const productResp = await fetch('https://api.stripe.com/v1/products', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: productForm.toString(),
    });

    if (!productResp.ok) {
      const errText = await productResp.text();
      return c.json(errorResponse('Stripe API error creating product', { status: productResp.status, body: errText }), 502);
    }

    const product = await productResp.json();
    const productId: string = product?.id;

    if (!productId) {
      return c.json(errorResponse('Stripe response missing product id'), 502);
    }

    // 2) Criar preço
    const priceForm = new URLSearchParams();
    priceForm.set('product', productId);
    priceForm.set('unit_amount', String(Math.round(body.unitAmountCents)));
    priceForm.set('currency', currency);

    if (body.recurring && body.recurring.interval) {
      priceForm.set('recurring[interval]', body.recurring.interval);
      if (body.recurring.intervalCount && body.recurring.intervalCount > 1) {
        priceForm.set('recurring[interval_count]', String(body.recurring.intervalCount));
      }
    }

    const priceResp = await fetch('https://api.stripe.com/v1/prices', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: priceForm.toString(),
    });

    if (!priceResp.ok) {
      const errText = await priceResp.text();
      // Produto foi criado mas preço falhou - logar erro
      logError('[Stripe] Product created but price failed', { productId, error: errText });
      return c.json(errorResponse('Stripe API error creating price', { status: priceResp.status, body: errText, productId }), 502);
    }

    const price = await priceResp.json();
    const priceId: string = price?.id;

    // 3) Atualizar produto com default_price
    if (priceId) {
      const updateForm = new URLSearchParams();
      updateForm.set('default_price', priceId);

      await fetch(`https://api.stripe.com/v1/products/${productId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: updateForm.toString(),
      });
    }

    return c.json(
      successResponse({
        product: {
          id: productId,
          name: product.name,
          description: product.description || null,
          active: Boolean(product.active),
          defaultPriceId: priceId || null,
          metadata: product.metadata || {},
          created: product.created || 0,
        },
        price: {
          id: priceId,
          productId,
          unitAmount: price.unit_amount || body.unitAmountCents,
          currency: price.currency || currency,
          type: price.type || (body.recurring ? 'recurring' : 'one_time'),
          recurring: price.recurring
            ? {
                interval: price.recurring.interval,
                intervalCount: price.recurring.interval_count || 1,
              }
            : null,
          active: Boolean(price.active),
        },
      })
    );
  } catch (error: any) {
    logError('[Stripe] Error creating product', error);
    return c.json(errorResponse('Failed to create product', { details: error.message }), 500);
  }
}

/**
 * DELETE /stripe/products/:productId
 * Arquiva (desativa) um produto no Stripe
 */
export async function archiveStripeProduct(c: Context) {
  try {
    const { productId } = c.req.param();
    if (!productId) {
      return c.json(validationErrorResponse('productId é obrigatório'), 400);
    }

    logInfo('[Stripe] Archiving product', { productId });

    const organizationId = await getOrganizationIdOrThrow(c);
    const config = await loadStripeConfigOrThrow(organizationId);

    if (!config.enabled) {
      return c.json(errorResponse('Stripe is disabled for this organization'), 400);
    }
    if (!config.secret_key_encrypted) {
      return c.json(errorResponse('Stripe secret key not configured'), 400);
    }

    const secretKey = await decryptSensitive(config.secret_key_encrypted);

    // Desativar produto
    const form = new URLSearchParams();
    form.set('active', 'false');

    const resp = await fetch(`https://api.stripe.com/v1/products/${productId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return c.json(errorResponse('Stripe API error archiving product', { status: resp.status, body: errText }), 502);
    }

    const product = await resp.json();

    return c.json(
      successResponse({
        id: product.id,
        active: Boolean(product.active),
        archived: true,
      })
    );
  } catch (error: any) {
    logError('[Stripe] Error archiving product', error);
    return c.json(errorResponse('Failed to archive product', { details: error.message }), 500);
  }
}

/**
 * POST /stripe/webhook/:organizationId
 * Receiver de webhook do Stripe com verificação de assinatura + idempotência.
 */
export async function receiveStripeWebhook(c: Context) {
  const supabase = getSupabaseClient();

  try {
    const { organizationId } = c.req.param();
    if (!organizationId) {
      return c.json(errorResponse('organizationId is required'), 400);
    }

    const payloadRaw = await c.req.text();
    const signatureHeader = c.req.header('stripe-signature') || c.req.header('Stripe-Signature') || null;

    // Carregar signing secret
    const { data: cfg, error: cfgError } = await supabase
      .from('stripe_configs')
      .select('webhook_signing_secret_encrypted, enabled')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (cfgError) {
      return c.json(errorResponse('Failed to load Stripe config', { details: cfgError.message }), 500);
    }
    if (!cfg || !cfg.enabled) {
      return c.json(errorResponse('Stripe not enabled for this organization'), 400);
    }
    const whsecEnc = (cfg as any).webhook_signing_secret_encrypted as string | null;
    if (!whsecEnc) {
      return c.json(errorResponse('Stripe webhook signing secret not configured'), 400);
    }

    const whsec = await decryptSensitive(whsecEnc);

    const ok = await verifyStripeWebhookSignature({ payloadRaw, signatureHeader, webhookSecret: whsec });
    if (!ok) {
      return c.json(errorResponse('Invalid Stripe signature'), 400);
    }

    const event = JSON.parse(payloadRaw);
    const stripeEventId: string = event?.id;
    const eventType: string = event?.type;

    if (!stripeEventId || !eventType) {
      return c.json(errorResponse('Invalid Stripe event payload'), 400);
    }

    // Idempotência: inserir evento; se já existe, retornamos 200
    const { error: insertEventError } = await supabase
      .from('stripe_webhook_events')
      .insert({
        organization_id: organizationId,
        stripe_event_id: stripeEventId,
        event_type: eventType,
        livemode: event?.livemode ?? null,
        api_version: event?.api_version ?? null,
        payload: event,
      });

    if (insertEventError) {
      // Se for duplicado, ok
      const msg = String(insertEventError.message || '');
      if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
        return c.json(successResponse({ received: true, duplicate: true }));
      }
      return c.json(errorResponse('Failed to store Stripe webhook event', { details: insertEventError.message }), 500);
    }

    // Processamento mínimo (MVP)
    const dataObject = event?.data?.object;

    // helper para marcar processamento
    const markProcessed = async (processed: boolean, errorMessage?: string | null) => {
      await supabase
        .from('stripe_webhook_events')
        .update({
          processed,
          processed_at: processed ? new Date().toISOString() : null,
          error_message: errorMessage || null,
        })
        .eq('stripe_event_id', stripeEventId);
    };

    try {
      if (eventType === 'checkout.session.completed') {
        const checkoutSessionId = dataObject?.id as string | undefined;
        const paymentIntentId = (dataObject?.payment_intent as string | null) || null;
        const reservationId = (dataObject?.metadata?.reservation_id as string | undefined) || null;

        if (checkoutSessionId) {
          // Preferimos não inserir com reservation_id nulo (coluna pode ser NOT NULL).
          // Então fazemos update por checkout_session_id e só fazemos upsert quando tivermos reservation_id.
          const basePatch: Record<string, unknown> = {
            payment_intent_id: paymentIntentId,
            customer_id: dataObject?.customer || null,
            status: dataObject?.status || null,
            livemode: dataObject?.livemode ?? null,
            currency: dataObject?.currency || null,
            amount_total: dataObject?.amount_total ?? null,
            metadata: dataObject?.metadata ?? null,
          };

          if (reservationId && typeof reservationId === 'string' && reservationId.trim()) {
            basePatch.reservation_id = reservationId;
          }

          await supabase
            .from('stripe_checkout_sessions')
            .update(basePatch)
            .eq('checkout_session_id', checkoutSessionId)
            .eq('organization_id', organizationId);

          if (reservationId && typeof reservationId === 'string' && reservationId.trim()) {
            await supabase
              .from('stripe_checkout_sessions')
              .upsert(
                {
                  organization_id: organizationId,
                  reservation_id: reservationId,
                  checkout_session_id: checkoutSessionId,
                  payment_intent_id: paymentIntentId,
                  customer_id: dataObject?.customer || null,
                  status: dataObject?.status || null,
                  livemode: dataObject?.livemode ?? null,
                  currency: dataObject?.currency || null,
                  amount_total: dataObject?.amount_total ?? null,
                  metadata: dataObject?.metadata ?? null,
                },
                { onConflict: 'checkout_session_id' }
              );
          }
        }

        // marcar reserva como paga e confirmar status
        if (reservationId && typeof reservationId === 'string' && reservationId.trim()) {
          await supabase
            .from('reservations')
            .update({
              status: 'confirmed', // Confirma a reserva automaticamente após pagamento
              payment_status: 'paid',
              payment_method: 'stripe',
              payment_transaction_id: paymentIntentId || checkoutSessionId || null,
              payment_paid_at: new Date().toISOString(),
              payment_expires_at: null, // Remove expiração já que foi pago
              updated_at: new Date().toISOString(),
            })
            .eq('id', reservationId)
            .eq('organization_id', organizationId);
          
          logInfo(`[Stripe] Reserva ${reservationId} confirmada após pagamento`);
        }
      }

      if (eventType === 'payment_intent.succeeded') {
        const paymentIntentId = dataObject?.id as string | undefined;
        if (paymentIntentId) {
          // tentar resolver reservation_id via stripe_checkout_sessions
          const { data: sess } = await supabase
            .from('stripe_checkout_sessions')
            .select('reservation_id')
            .eq('payment_intent_id', paymentIntentId)
            .eq('organization_id', organizationId)
            .maybeSingle();

          const reservationId = (sess as any)?.reservation_id as string | null;
          if (reservationId) {
            await supabase
              .from('reservations')
              .update({
                status: 'confirmed', // Confirma a reserva automaticamente após pagamento
                payment_status: 'paid',
                payment_method: 'stripe',
                payment_transaction_id: paymentIntentId,
                payment_paid_at: new Date().toISOString(),
                payment_expires_at: null, // Remove expiração já que foi pago
                updated_at: new Date().toISOString(),
              })
              .eq('id', reservationId)
              .eq('organization_id', organizationId);
            
            logInfo(`[Stripe] Reserva ${reservationId} confirmada via payment_intent.succeeded`);
          }
        }
      }

      if (eventType === 'payment_intent.payment_failed') {
        const paymentIntentId = dataObject?.id as string | undefined;
        if (paymentIntentId) {
          const { data: sess } = await supabase
            .from('stripe_checkout_sessions')
            .select('reservation_id')
            .eq('payment_intent_id', paymentIntentId)
            .eq('organization_id', organizationId)
            .maybeSingle();

          const reservationId = (sess as any)?.reservation_id as string | null;
          if (reservationId) {
            await supabase
              .from('reservations')
              .update({
                payment_status: 'pending',
                payment_method: 'stripe',
                payment_transaction_id: paymentIntentId,
              })
              .eq('id', reservationId)
              .eq('organization_id', organizationId);
          }
        }
      }

      await markProcessed(true, null);
    } catch (processError: any) {
      await markProcessed(false, processError?.message || String(processError));
      // ainda retornamos 200 para o Stripe não re-tentar infinitamente por bug de processamento
      // mas mantemos erro no banco para diagnóstico.
    }

    return c.json(successResponse({ received: true }));
  } catch (error: any) {
    // falha geral: registrar se possível
    logError('[Stripe] webhook error', error);
    return c.json(errorResponse('Stripe webhook error', { details: error.message }), 500);
  }
}
