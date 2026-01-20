import { loadStaysNetConfigDB } from './staysnet-db.ts';
import { STAYSNET_API_KEY, STAYSNET_API_SECRET, STAYSNET_BASE_URL } from './utils-env.ts';

export interface StaysNetRuntimeConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export async function loadStaysNetRuntimeConfigOrThrow(organizationId: string): Promise<StaysNetRuntimeConfig> {
  // 1) Preferência: config por organização
  const orgResult = await loadStaysNetConfigDB(organizationId);
  const orgConfig = orgResult.success ? orgResult.data : undefined;

  // 2) Fallback: config global
  const globalResult = await loadStaysNetConfigDB('global');
  const globalConfig = globalResult.success ? globalResult.data : undefined;

  // 3) Fallback final: env (para jobs técnicos / bootstrap)
  const baseUrl = normalizeBaseUrl(orgConfig?.baseUrl || globalConfig?.baseUrl || STAYSNET_BASE_URL);
  const apiKey = (orgConfig?.apiKey || globalConfig?.apiKey || STAYSNET_API_KEY || '').trim();
  const apiSecret = (orgConfig?.apiSecret || globalConfig?.apiSecret || STAYSNET_API_SECRET || '').trim();

  if (!apiKey || !apiSecret) {
    throw new Error(
      'Stays.net não configurado (apiKey/apiSecret ausentes). Salve a configuração em /settings/staysnet ou defina STAYSNET_API_KEY/STAYSNET_API_SECRET como secrets.'
    );
  }

  return {
    apiKey,
    apiSecret,
    baseUrl,
  };
}
