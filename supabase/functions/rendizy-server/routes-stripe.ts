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

    const payload = {
      organization_id: organizationId,
      enabled,
      is_test_mode: isTestMode,
      publishable_key: publishableKey || null,
      secret_key_encrypted: secretKeyEncrypted,
      webhook_signing_secret_encrypted: webhookSigningSecretEncrypted,
      restricted_key_encrypted: restrictedKeyEncrypted,
      webhook_url: webhookUrl || null,
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
    logError('[Stripe] Error saving config', error);
    return c.json(errorResponse('Failed to save Stripe config', { details: error.message }), 500);
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

        // marcar reserva como paga, se possível
        if (reservationId && typeof reservationId === 'string' && reservationId.trim()) {
          await supabase
            .from('reservations')
            .update({
              payment_status: 'paid',
              payment_method: 'stripe',
              payment_transaction_id: paymentIntentId || checkoutSessionId || null,
              payment_paid_at: new Date().toISOString(),
            })
            .eq('id', reservationId)
            .eq('organization_id', organizationId);
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
                payment_status: 'paid',
                payment_method: 'stripe',
                payment_transaction_id: paymentIntentId,
                payment_paid_at: new Date().toISOString(),
              })
              .eq('id', reservationId)
              .eq('organization_id', organizationId);
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
