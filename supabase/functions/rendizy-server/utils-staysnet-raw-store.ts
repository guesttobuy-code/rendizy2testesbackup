import type { getSupabaseClient } from './kv_store.tsx';

export type StaysnetRawDomain = 'reservations' | 'clients' | 'listings' | 'finance' | string;

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function storeStaysnetRawObject(params: {
  supabase: ReturnType<typeof getSupabaseClient>;
  organizationId: string;
  domain: StaysnetRawDomain;
  externalId?: string | null;
  externalCode?: string | null;
  endpoint?: string | null;
  payload: unknown;
  fetchedAtIso?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const {
    supabase,
    organizationId,
    domain,
    externalId = null,
    externalCode = null,
    endpoint = null,
    payload,
    fetchedAtIso = null,
  } = params;

  try {
    const payloadJson = JSON.stringify(payload);
    const payloadHash = await sha256Hex(payloadJson);

    const row: Record<string, unknown> = {
      organization_id: organizationId,
      domain,
      external_id: externalId,
      external_code: externalCode,
      endpoint,
      payload,
      payload_hash: payloadHash,
      fetched_at: fetchedAtIso,
    };

    const { error } = await supabase
      .from('staysnet_raw_objects')
      .upsert(row, { onConflict: 'organization_id,domain,external_id,payload_hash' })
      .select('id')
      .maybeSingle();

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
