import type { Context } from 'npm:hono';
import { getSupabaseClient } from './kv_store.tsx';
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';
import { errorResponse, successResponse, validationErrorResponse, logError, logInfo } from './utils.ts';
import * as stripeRoutes from './routes-stripe.ts';

// ============================================================================
// PAYMENTS (Provider-agnostic checkout)
// ============================================================================

export type PaymentProviderId = 'stripe' | 'pagarme';

type CreatePaymentsCheckoutSessionPayload = {
  reservationId: string;
  successUrl: string;
  cancelUrl: string;
  amountTotalCents?: number;
  currency?: string;
  customerEmail?: string;

  // Optional routing hints
  provider?: PaymentProviderId;
  clientSiteSubdomain?: string;
};

function normalizeProviderId(value: unknown): PaymentProviderId | null {
  if (!value) return null;
  const v = String(value).trim().toLowerCase();
  if (v === 'stripe') return 'stripe';
  if (v === 'pagarme' || v === 'pagar.me' || v === 'pagar_me') return 'pagarme';
  return null;
}

function readProviderFromSiteConfig(siteConfig: unknown): PaymentProviderId | null {
  if (!siteConfig || typeof siteConfig !== 'object') return null;
  const obj = siteConfig as Record<string, unknown>;
  return (
    normalizeProviderId(obj.paymentProvider) ||
    normalizeProviderId(obj.payment_provider) ||
    normalizeProviderId(obj.checkoutProvider) ||
    normalizeProviderId(obj.checkout_provider) ||
    null
  );
}

async function resolveProviderForRequest(opts: {
  organizationId: string;
  explicitProvider: PaymentProviderId | null;
  clientSiteSubdomain?: string | null;
}): Promise<PaymentProviderId | null> {
  const { organizationId, explicitProvider, clientSiteSubdomain } = opts;

  if (explicitProvider) return explicitProvider;

  // Per-site override: client_sites.site_config.paymentProvider
  if (clientSiteSubdomain && clientSiteSubdomain.trim()) {
    const sub = clientSiteSubdomain.trim().toLowerCase();
    const supabase = getSupabaseClient();

    const { data: site, error: siteErr } = await supabase
      .from('client_sites')
      .select('organization_id, subdomain, site_config')
      .eq('subdomain', sub)
      .maybeSingle();

    if (siteErr) {
      throw new Error(`Failed to load client site: ${siteErr.message}`);
    }

    if (site) {
      const siteOrgId = String((site as any).organization_id || '').trim();
      if (siteOrgId && siteOrgId !== organizationId) {
        // Prevent cross-tenant access
        throw new Error('clientSiteSubdomain belongs to another organization');
      }

      const fromSite = readProviderFromSiteConfig((site as any).site_config);
      if (fromSite) return fromSite;
    }
  }

  // Fallback: if Stripe is enabled, use Stripe.
  // (When Pagar.me is implemented, we can expand this resolver.)
  const supabase = getSupabaseClient();
  const { data: stripeCfg, error: stripeErr } = await supabase
    .from('stripe_configs')
    .select('enabled')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (stripeErr) {
    throw new Error(`Failed to load stripe config: ${stripeErr.message}`);
  }
  if (stripeCfg && Boolean((stripeCfg as any).enabled)) {
    return 'stripe';
  }

  return null;
}

/**
 * POST /payments/checkout/session
 * Provider-agnostic: chooses the configured provider and returns a checkout URL.
 */
export async function createPaymentsCheckoutSession(c: Context) {
  try {
    const body = await c.req.json<CreatePaymentsCheckoutSessionPayload>();

    const organizationId = await getOrganizationIdOrThrow(c);
    if (!body?.reservationId || !body?.successUrl || !body?.cancelUrl) {
      return c.json(
        validationErrorResponse('reservationId, successUrl e cancelUrl são obrigatórios'),
        400
      );
    }

    const explicitProvider = normalizeProviderId(body.provider);
    const provider = await resolveProviderForRequest({
      organizationId,
      explicitProvider,
      clientSiteSubdomain: body.clientSiteSubdomain || null,
    });

    if (!provider) {
      return c.json(
        validationErrorResponse(
          'Nenhum provedor de pagamento configurado para este checkout. Configure Stripe/Pagar.me para a organização ou defina paymentProvider no site_config.'
        ),
        400
      );
    }

    if (provider === 'stripe') {
      // Delegate to Stripe implementation (already persists sessions)
      const resp = await stripeRoutes.createStripeCheckoutSession(c);
      // If it succeeded, enrich with provider info (best-effort)
      try {
        const json = await resp.clone().json();
        if (json && typeof json === 'object') {
          const enriched = {
            ...(json as any),
            data: {
              ...(json as any).data,
              provider: 'stripe',
            },
          };
          return c.json(enriched, resp.status);
        }
      } catch {
        // ignore; fall back to raw response
      }
      return resp;
    }

    if (provider === 'pagarme') {
      // Stub for future implementation
      logInfo('[Payments] Pagar.me requested but not implemented yet');
      return c.json(
        errorResponse('Pagar.me checkout provider not implemented yet', {
          provider,
        }),
        501
      );
    }

    return c.json(errorResponse('Unsupported payment provider', { provider }), 400);
  } catch (error: any) {
    logError('[Payments] Error creating checkout session', error);
    return c.json(errorResponse('Failed to create checkout session', { details: error.message }), 500);
  }
}
