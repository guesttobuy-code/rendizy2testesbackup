import { getSupabaseClient } from './kv_store.tsx';
import { errorResponse, successResponse } from './utils-response.ts';

type MinimalContext = {
  req: {
    param: (name: string) => string;
    header: (name: string) => string | undefined;
    json: () => Promise<unknown>;
  };
  json: (payload: unknown, status?: number) => Response;
};

type CurrencySettings = {
  default_currency: string;
  format_locale: string;
  additional_currencies: Array<{ code: string; enabled_for_site: boolean }>;
};

const DEFAULT_SETTINGS: CurrencySettings = {
  default_currency: 'BRL',
  format_locale: 'pt-BR',
  additional_currencies: []
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function normalizeSettings(input: unknown): CurrencySettings {
  const obj = isRecord(input) ? input : {};
  const rawDefault = typeof obj.default_currency === 'string' ? obj.default_currency : '';
  const rawLocale = typeof obj.format_locale === 'string' ? obj.format_locale : '';

  const default_currency = rawDefault.trim() ? rawDefault.trim().toUpperCase() : DEFAULT_SETTINGS.default_currency;
  const format_locale = rawLocale.trim() ? rawLocale.trim() : DEFAULT_SETTINGS.format_locale;

  const additionalRaw = Array.isArray(obj.additional_currencies) ? obj.additional_currencies : [];
  const additional_currencies = additionalRaw
    .map((r) => {
      if (!isRecord(r)) return null;
      const code = typeof r.code === 'string' ? r.code.trim().toUpperCase() : '';
      if (!code) return null;
      return {
        code,
        enabled_for_site: r.enabled_for_site === true
      };
    })
    .filter((x): x is { code: string; enabled_for_site: boolean } => x !== null);

  return { default_currency, format_locale, additional_currencies };
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) {
      cookies[key] = decodeURIComponent(value);
    }
  });
  return cookies;
}

function extractToken(c: MinimalContext): string | undefined {
  const customToken = c.req.header('X-Auth-Token');
  if (customToken) return customToken;

  const cookieHeader = c.req.header('Cookie') || '';
  const cookies = parseCookies(cookieHeader);
  const tokenFromCookie = cookies['rendizy-token'];
  if (tokenFromCookie) return tokenFromCookie;

  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return undefined;
  return authHeader.split(' ')[1];
}

async function getOrganizationIdFromSessionOrThrow(c: MinimalContext): Promise<string> {
  const token = extractToken(c);
  if (!token) {
    throw new Error('Unauthorized: token ausente');
  }

  const client = getSupabaseClient();

  const { data: sessionByAccessToken, error: errorAccessToken } = await client
    .from('sessions')
    .select('organization_id, expires_at')
    .eq('access_token', token)
    .maybeSingle();

  if (!errorAccessToken && sessionByAccessToken?.organization_id) {
    const expiresAt = sessionByAccessToken.expires_at ? Date.parse(String(sessionByAccessToken.expires_at)) : NaN;
    if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
      throw new Error('Unauthorized: sessão expirada');
    }
    return String(sessionByAccessToken.organization_id);
  }

  const { data: sessionByToken, error: errorToken } = await client
    .from('sessions')
    .select('organization_id, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (!errorToken && sessionByToken?.organization_id) {
    const expiresAt = sessionByToken.expires_at ? Date.parse(String(sessionByToken.expires_at)) : NaN;
    if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
      throw new Error('Unauthorized: sessão expirada');
    }
    return String(sessionByToken.organization_id);
  }

  throw new Error('Unauthorized: sessão não encontrada');
}

export async function getOrganizationCurrencySettings(c: MinimalContext) {
  try {
    const orgId = await getOrganizationIdFromSessionOrThrow(c);
    const requestedId = c.req.param('id');
    if (requestedId && requestedId !== orgId) {
      return c.json(errorResponse('Forbidden'), 403);
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('organizations')
      .select('metadata')
      .eq('id', orgId)
      .maybeSingle();

    if (error) return c.json(errorResponse(error.message), 500);

    const metadata = isRecord(data) && isRecord(data.metadata) ? data.metadata : null;
    const settings = metadata && isRecord(metadata.currency_settings) ? metadata.currency_settings : DEFAULT_SETTINGS;
    return c.json(successResponse(normalizeSettings(settings)));
  } catch (e: unknown) {
    console.error('[currency-settings] get failed:', e);
    const message = e instanceof Error ? e.message : 'Failed to load currency settings';
    const status = typeof message === 'string' && message.startsWith('Unauthorized:') ? 401 : 500;
    return c.json(errorResponse(message), status);
  }
}

export async function updateOrganizationCurrencySettings(c: MinimalContext) {
  try {
    const orgId = await getOrganizationIdFromSessionOrThrow(c);
    const requestedId = c.req.param('id');
    if (requestedId && requestedId !== orgId) {
      return c.json(errorResponse('Forbidden'), 403);
    }

    const body: unknown = await c.req.json();
    const next = normalizeSettings(body);

    const client = getSupabaseClient();

    const { data, error } = await client.rpc('set_organization_currency_settings', {
      org_id: orgId,
      settings: next
    });

    if (error) return c.json(errorResponse(error.message), 500);

    return c.json(successResponse(data ?? next));
  } catch (e: unknown) {
    console.error('[currency-settings] put failed:', e);
    const message = e instanceof Error ? e.message : 'Failed to save currency settings';
    const status = typeof message === 'string' && message.startsWith('Unauthorized:') ? 401 : 500;
    return c.json(errorResponse(message), status);
  }
}
