import type { Context } from 'npm:hono';
import { getSupabaseClient } from './kv_store.tsx';
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';
import { encryptSensitive, decryptSensitive } from './utils-crypto.ts';
import { SUPABASE_URL } from './utils-env.ts';
import { errorResponse, successResponse, validationErrorResponse, logError, logInfo } from './utils.ts';

// ============================================================================
// Pagar.me (v5)
// - Config (multi-tenant)
// - Payment Links (checkout via URL)
// - Webhooks (auditoria/idempotência)
// ============================================================================

type PagarmeConfigRow = {
  id: string;
  organization_id: string;
  enabled: boolean;
  is_test_mode: boolean;
  public_key: string | null;
  secret_key_encrypted: string | null;
  encryption_key_encrypted: string | null;
  webhook_url: string | null;
  webhook_secret_encrypted: string | null;
  recipient_id: string | null;
  settings: any;
  created_at: string;
  updated_at: string;
};

type PagarmeConfigPublic = {
  enabled: boolean;
  isTestMode: boolean;
  publicKey: string;
  webhookUrl: string;
  recipientId: string;
  hasSecretKey: boolean;
  hasEncryptionKey: boolean;
  hasWebhookSecret: boolean;
  defaultWebhookUrl: string;
  settings: any;
};

type SavePagarmeConfigPayload = {
  enabled?: boolean;
  isTestMode?: boolean;
  publicKey?: string;
  secretKey?: string;
  encryptionKey?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  recipientId?: string;
  settings?: any;
};

function buildDefaultPagarmeWebhookUrl(organizationId: string): string {
  const base = (SUPABASE_URL || '').trim().replace(/\/+$/, '');
  if (!base) return '';
  return `${base}/functions/v1/rendizy-server/pagarme/webhook/${organizationId}`;
}

function isValidPagarmeSecretKey(key: string): boolean {
  const v = key.trim();
  return v.startsWith('sk_') || v.startsWith('sk_test_') || v.startsWith('ak_') || v.startsWith('ak_test_') || v.startsWith('ak_live_');
}

function isValidPagarmePublicKey(key: string): boolean {
  const v = key.trim();
  return v.startsWith('pk_') || v.startsWith('pk_test_');
}

function isValidPagarmeEncryptionKey(key: string): boolean {
  const v = key.trim();
  return v.startsWith('ek_') || v.startsWith('ek_test_') || v.startsWith('ek_live_');
}

function basicAuthHeaderFromSecretKey(secretKey: string): string {
  // Basic base64("sk_xxx:")
  // btoa is available on Deno edge runtime
  return `Basic ${btoa(`${secretKey}:`)}`;
}

function pickCheckoutUrlFromPaymentLinkResponse(resp: any): string | null {
  if (!resp || typeof resp !== 'object') return null;
  return (
    (typeof resp.url === 'string' && resp.url) ||
    (typeof resp.checkout_url === 'string' && resp.checkout_url) ||
    (typeof resp.payment_url === 'string' && resp.payment_url) ||
    (typeof resp.redirect_url === 'string' && resp.redirect_url) ||
    null
  );
}

function readAcceptedPaymentMethodsFromSettings(settings: any): string[] {
  const raw = settings?.accepted_payment_methods ?? settings?.acceptedPaymentMethods;
  if (Array.isArray(raw)) {
    return raw
      .map((v) => String(v || '').trim())
      .filter(Boolean);
  }
  // default
  return ['credit_card', 'pix', 'boleto'];
}

async function loadPagarmeConfigOrNull(organizationId: string): Promise<PagarmeConfigRow | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('pagarme_configs')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load pagarme config: ${error.message}`);
  return (data as any) || null;
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /settings/pagarme
 */
export async function getPagarmeConfig(c: Context) {
  try {
    logInfo('[Pagar.me] Getting config');
    const organizationId = await getOrganizationIdOrThrow(c);

    const row = await loadPagarmeConfigOrNull(organizationId);
    const defaultWebhookUrl = buildDefaultPagarmeWebhookUrl(organizationId);

    if (!row) {
      const empty: PagarmeConfigPublic = {
        enabled: false,
        isTestMode: true,
        publicKey: '',
        webhookUrl: '',
        recipientId: '',
        hasSecretKey: false,
        hasEncryptionKey: false,
        hasWebhookSecret: false,
        defaultWebhookUrl,
        settings: {},
      };
      return c.json(successResponse(empty));
    }

    const publicConfig: PagarmeConfigPublic = {
      enabled: Boolean(row.enabled),
      isTestMode: Boolean(row.is_test_mode),
      publicKey: row.public_key || '',
      webhookUrl: row.webhook_url || '',
      recipientId: row.recipient_id || '',
      hasSecretKey: Boolean(row.secret_key_encrypted),
      hasEncryptionKey: Boolean(row.encryption_key_encrypted),
      hasWebhookSecret: Boolean(row.webhook_secret_encrypted),
      defaultWebhookUrl,
      settings: row.settings || {},
    };

    return c.json(successResponse(publicConfig));
  } catch (error: any) {
    logError('[Pagar.me] Error getting config', error);
    return c.json(errorResponse('Failed to get Pagar.me config', { details: error.message }), 500);
  }
}

/**
 * POST /settings/pagarme
 */
export async function savePagarmeConfig(c: Context) {
  try {
    const body = await c.req.json<SavePagarmeConfigPayload>();
    logInfo('[Pagar.me] Saving config');

    const organizationId = await getOrganizationIdOrThrow(c);
    const client = getSupabaseClient();

    const { data: existing, error: existingError } = await client
      .from('pagarme_configs')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (existingError) {
      return c.json(errorResponse('Failed to load existing Pagar.me config', { details: existingError.message }), 500);
    }

    const enabled = body.enabled ?? (existing as any)?.enabled ?? false;
    const isTestMode = body.isTestMode ?? (existing as any)?.is_test_mode ?? true;

    const publicKey = (body.publicKey ?? (existing as any)?.public_key ?? '').trim();
    if (publicKey && !isValidPagarmePublicKey(publicKey)) {
      return c.json(validationErrorResponse('publicKey inválida (esperado pk_...)'), 400);
    }

    let secretKeyEncrypted: string | null = (existing as any)?.secret_key_encrypted ?? null;
    if (body.secretKey && body.secretKey.trim()) {
      const v = body.secretKey.trim();
      if (!isValidPagarmeSecretKey(v)) {
        return c.json(validationErrorResponse('secretKey inválida (esperado sk_* ou ak_*)'), 400);
      }
      secretKeyEncrypted = await encryptSensitive(v);
    }

    let encryptionKeyEncrypted: string | null = (existing as any)?.encryption_key_encrypted ?? null;
    if (body.encryptionKey && body.encryptionKey.trim()) {
      const v = body.encryptionKey.trim();
      if (!isValidPagarmeEncryptionKey(v)) {
        return c.json(validationErrorResponse('encryptionKey inválida (esperado ek_...)'), 400);
      }
      encryptionKeyEncrypted = await encryptSensitive(v);
    }

    let webhookSecretEncrypted: string | null = (existing as any)?.webhook_secret_encrypted ?? null;
    if (body.webhookSecret && body.webhookSecret.trim()) {
      const v = body.webhookSecret.trim();
      webhookSecretEncrypted = await encryptSensitive(v);
    }

    const webhookUrl = (body.webhookUrl ?? (existing as any)?.webhook_url ?? '').trim();
    const recipientId = (body.recipientId ?? (existing as any)?.recipient_id ?? '').trim();
    const settings = body.settings ?? (existing as any)?.settings ?? {};

    const payload = {
      organization_id: organizationId,
      enabled,
      is_test_mode: isTestMode,
      public_key: publicKey || null,
      secret_key_encrypted: secretKeyEncrypted,
      encryption_key_encrypted: encryptionKeyEncrypted,
      webhook_url: webhookUrl || null,
      webhook_secret_encrypted: webhookSecretEncrypted,
      recipient_id: recipientId || null,
      settings,
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error: saveErr } = await client
      .from('pagarme_configs')
      .upsert(payload, { onConflict: 'organization_id' })
      .select('*')
      .maybeSingle();

    if (saveErr) {
      return c.json(errorResponse('Failed to save Pagar.me config', { details: saveErr.message }), 500);
    }

    // Return public config
    const defaultWebhookUrl = buildDefaultPagarmeWebhookUrl(organizationId);
    const publicConfig: PagarmeConfigPublic = {
      enabled: Boolean((saved as any)?.enabled),
      isTestMode: Boolean((saved as any)?.is_test_mode),
      publicKey: (saved as any)?.public_key || '',
      webhookUrl: (saved as any)?.webhook_url || '',
      recipientId: (saved as any)?.recipient_id || '',
      hasSecretKey: Boolean((saved as any)?.secret_key_encrypted),
      hasEncryptionKey: Boolean((saved as any)?.encryption_key_encrypted),
      hasWebhookSecret: Boolean((saved as any)?.webhook_secret_encrypted),
      defaultWebhookUrl,
      settings: (saved as any)?.settings || {},
    };

    return c.json(successResponse(publicConfig));
  } catch (error: any) {
    logError('[Pagar.me] Error saving config', error);
    return c.json(errorResponse('Failed to save Pagar.me config', { details: error.message }), 500);
  }
}

// ============================================================================
// Provider implementation used by /payments/checkout/session
// ============================================================================

type CreateCheckoutSessionPayload = {
  reservationId: string;
  successUrl: string;
  cancelUrl: string;
  amountTotalCents?: number;
  currency?: string;
  customerEmail?: string;
};

/**
 * Creates a hosted checkout URL using Pagar.me Payment Links.
 * Note: Payment Links API may not support success/cancel redirects the same way Stripe does;
 * we accept them for parity but may not use them at this stage.
 */
export async function createPagarmeCheckoutSession(c: Context, body: CreateCheckoutSessionPayload) {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);

    const cfg = await loadPagarmeConfigOrNull(organizationId);
    if (!cfg || !cfg.enabled) {
      return c.json(validationErrorResponse('Pagar.me não está habilitado para esta organização'), 400);
    }
    if (!cfg.secret_key_encrypted) {
      return c.json(validationErrorResponse('Pagar.me secretKey não configurada'), 400);
    }

    const amountTotalCents = Number(body.amountTotalCents ?? 0);
    if (!Number.isFinite(amountTotalCents) || amountTotalCents <= 0) {
      return c.json(
        validationErrorResponse('amountTotalCents é obrigatório para Pagar.me (em centavos)'),
        400
      );
    }

    const currency = (body.currency || 'BRL').trim().toUpperCase();

    const secretKey = await decryptSensitive(cfg.secret_key_encrypted);
    if (!secretKey || !secretKey.trim()) {
      return c.json(validationErrorResponse('Pagar.me secretKey inválida (decrypt falhou)'), 400);
    }

    const acceptedPaymentMethods = readAcceptedPaymentMethodsFromSettings(cfg.settings);

    // Payment Links API (v5)
    const requestPayload: any = {
      is_building: false,
      type: 'order',
      name: `Reserva Rendizy ${body.reservationId}`,
      payment_settings: {
        accepted_payment_methods: acceptedPaymentMethods,
        credit_card_settings: {
          operation_type: 'auth_and_capture',
        },
      },
      cart_settings: {
        items: [
          {
            amount: amountTotalCents,
            name: 'Reserva',
            default_quantity: 1,
          },
        ],
      },
      metadata: {
        reservation_id: body.reservationId,
        currency,
        customer_email: body.customerEmail || null,
      },
    };

    const apiUrl = 'https://api.pagar.me/core/v5/payment-links';
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: basicAuthHeaderFromSecretKey(secretKey),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    const responseText = await resp.text();
    let responseJson: any = null;
    try {
      responseJson = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseJson = null;
    }

    if (!resp.ok) {
      return c.json(
        errorResponse('Failed to create Pagar.me payment link', {
          httpStatus: resp.status,
          provider: 'pagarme',
          body: responseJson || responseText,
        }),
        502
      );
    }

    const url = pickCheckoutUrlFromPaymentLinkResponse(responseJson);
    const pagarmeLinkId = responseJson?.id ? String(responseJson.id) : null;

    // Persist audit
    const client = getSupabaseClient();
    await client.from('pagarme_payment_links').insert({
      organization_id: organizationId,
      reservation_id: body.reservationId,
      pagarme_link_id: pagarmeLinkId,
      url,
      amount_total_cents: amountTotalCents,
      currency,
      request_payload: requestPayload,
      response_payload: responseJson,
    });

    return c.json(
      successResponse({
        provider: 'pagarme',
        url: url || null,
        paymentLinkId: pagarmeLinkId,
      })
    );
  } catch (error: any) {
    logError('[Pagar.me] Error creating checkout session', error);
    return c.json(errorResponse('Failed to create Pagar.me checkout session', { details: error.message }), 500);
  }
}

/**
 * POST /pagarme/webhook/:organizationId
 * Auditoria + idempotência básica (sem processamento de negócio ainda).
 */
export async function receivePagarmeWebhook(c: Context) {
  const organizationId = c.req.param('organizationId');
  try {
    const payload = await c.req.json().catch(() => null);
    const headersObj: Record<string, string> = {};
    for (const [k, v] of c.req.raw.headers.entries()) headersObj[k] = v;

    const eventId =
      (payload && (payload.id || payload.event_id || payload.eventId)) ? String(payload.id || payload.event_id || payload.eventId) : null;
    const eventType = payload && (payload.type || payload.event_type || payload.eventType) ? String(payload.type || payload.event_type || payload.eventType) : null;

    const client = getSupabaseClient();

    // Idempotência best-effort: unique (organization_id, event_id)
    const insertPayload: any = {
      organization_id: organizationId,
      event_id: eventId,
      event_type: eventType,
      payload,
      headers: headersObj,
      received_at: new Date().toISOString(),
      processed: false,
    };

    const { error } = await client.from('pagarme_webhook_events').upsert(insertPayload, {
      onConflict: 'organization_id,event_id',
    });

    if (error) {
      logError('[Pagar.me] Failed saving webhook event', error);
      return c.json(errorResponse('Failed to store webhook event', { details: error.message }), 500);
    }

    return c.json({ ok: true });
  } catch (error: any) {
    logError('[Pagar.me] Webhook error', error);
    return c.json({ ok: false, error: error.message }, 500);
  }
}
