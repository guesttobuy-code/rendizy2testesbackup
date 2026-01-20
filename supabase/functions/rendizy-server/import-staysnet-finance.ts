/**
 * ⚡ IMPORT STAYSNET - FINANCE (RAW) - v1.0.105
 *
 * Objetivo:
 * - Cumprir a exigência de auditoria: "salvar o JSON completo" dos endpoints financeiros da Stays.
 * - NÃO cria/atualiza tabelas de domínio (owners/finance) no Rendizy (por enquanto).
 * - Apenas persiste fonte de verdade em `staysnet_raw_objects` (versionado por hash).
 *
 * Endpoints Stays relevantes:
 * - GET /finance/owners?from=YYYY-MM-DD&to=YYYY-MM-DD
 * - GET /finance/payment-providers[?status=...]
 */

import { Context } from 'npm:hono';
import { getSupabaseClient } from './kv_store.tsx';
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';
import { loadStaysNetRuntimeConfigOrThrow } from './utils-staysnet-config.ts';
import { storeStaysnetRawObject } from './utils-staysnet-raw-store.ts';

function ymd(d: Date): string {
  return d.toISOString().split('T')[0];
}

function clampRangeTo365Days(from: string, to: string): { from: string; to: string } {
  const fromD = new Date(from);
  const toD = new Date(to);
  if (isNaN(fromD.getTime()) || isNaN(toD.getTime())) return { from, to };
  const diffDays = Math.floor((toD.getTime() - fromD.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 365) return { from, to };
  const clampedFrom = new Date(toD);
  clampedFrom.setDate(clampedFrom.getDate() - 365);
  return { from: ymd(clampedFrom), to };
}

async function fetchJson(params: {
  url: string;
  credentials: string;
}): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const resp = await fetch(params.url, {
      headers: {
        'Authorization': `Basic ${params.credentials}`,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`StaysNet API falhou: ${resp.status} - ${text.substring(0, 200)}`);
    }

    return await resp.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function importStaysNetFinance(c: Context) {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('⚡ IMPORT STAYSNET - FINANCE (RAW)');
  console.log('═══════════════════════════════════════════════════');

  const supabase = getSupabaseClient();

  try {
    const organizationId = await getOrganizationIdOrThrow(c);

    const body = await c.req.json().catch(() => null as any);
    const rawFrom = String(c.req.query('from') || body?.from || '').trim();
    const rawTo = String(c.req.query('to') || body?.to || '').trim();
    const providerStatus = String(c.req.query('paymentProvidersStatus') || c.req.query('status') || body?.paymentProvidersStatus || body?.status || '').trim();

    const toDefault = ymd(new Date());
    const fromDefault = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 365);
      return ymd(d);
    })();

    const range = clampRangeTo365Days(rawFrom || fromDefault, rawTo || toDefault);

    console.log(`   🧾 organization_id: ${organizationId}`);
    console.log(`   📅 Finance range: from=${range.from} to=${range.to}`);
    if (providerStatus) console.log(`   🧾 paymentProvidersStatus: ${providerStatus}`);

    const staysConfig = await loadStaysNetRuntimeConfigOrThrow(organizationId);
    const credentials = btoa(`${staysConfig.apiKey}:${staysConfig.apiSecret}`);

    // 1) Payment providers
    const paymentProvidersUrl = (() => {
      const base = `${staysConfig.baseUrl}/finance/payment-providers`;
      if (!providerStatus) return base;
      const qs = new URLSearchParams({ status: providerStatus }).toString();
      return `${base}?${qs}`;
    })();

    const paymentProviders = await fetchJson({ url: paymentProvidersUrl, credentials });

    const storeProviders = await storeStaysnetRawObject({
      supabase,
      organizationId,
      domain: 'finance',
      externalId: '__payment_providers_list__',
      externalCode: providerStatus || null,
      endpoint: '/finance/payment-providers',
      payload: paymentProviders,
      fetchedAtIso: new Date().toISOString(),
    });

    if (!storeProviders.ok) {
      console.warn(`⚠️ Falha ao salvar staysnet_raw_objects (finance/payment-providers): ${storeProviders.error}`);
    }

    // 2) Owners list (requires from/to)
    const ownersUrl = `${staysConfig.baseUrl}/finance/owners?${new URLSearchParams({ from: range.from, to: range.to }).toString()}`;
    const owners = await fetchJson({ url: ownersUrl, credentials });

    const storeOwners = await storeStaysnetRawObject({
      supabase,
      organizationId,
      domain: 'finance',
      externalId: '__owners_list__',
      externalCode: `${range.from}:${range.to}`,
      endpoint: '/finance/owners',
      payload: owners,
      fetchedAtIso: new Date().toISOString(),
    });

    if (!storeOwners.ok) {
      console.warn(`⚠️ Falha ao salvar staysnet_raw_objects (finance/owners): ${storeOwners.error}`);
    }

    const ownersCount = Array.isArray(owners) ? owners.length : Array.isArray((owners as any)?.owners) ? (owners as any).owners.length : null;
    const providersCount = Array.isArray(paymentProviders)
      ? paymentProviders.length
      : Array.isArray((paymentProviders as any)?.providers)
        ? (paymentProviders as any).providers.length
        : null;

    return c.json({
      success: true,
      method: 'import-finance-raw',
      organizationId,
      stored: {
        paymentProviders: storeProviders.ok,
        owners: storeOwners.ok,
      },
      counts: {
        owners: ownersCount,
        paymentProviders: providersCount,
      },
      range,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('❌ importStaysNetFinance error:', msg);
    return c.json({ success: false, error: msg }, 500);
  }
}
