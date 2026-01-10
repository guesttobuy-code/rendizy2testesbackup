/**
 * ⚡ UTILS: STAYSNET IMPORT ISSUES — v1.0.111
 * 
 * Módulo compartilhado para registro e resolução de issues de import.
 * Usado tanto pelo import manual quanto pelo webhook/robô.
 * 
 * REGRA CANÔNICA: Reservas sem imóvel NÃO EXISTEM, mas o SKIP nunca pode ser silencioso.
 * Documento canônico: docs/04-modules/STAYSNET_IMPORT_ISSUES.md
 */

import { getSupabaseClient } from './kv_store.tsx';

// ============================================================================
// TIPOS
// ============================================================================

export interface ImportIssueInput {
  organizationId: string;
  externalId: string | null;
  reservationCode: string | null;
  listingId: string;
  listingCandidates: string[];
  checkInDate: string | null;
  checkOutDate: string | null;
  partner: string | null;
  platform: string | null;
  rawPayload: any;
}

export interface ImportIssueResult {
  ok: boolean;
  mode: 'upsert' | 'insert';
  error?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function toYmdOrNull(value: string | null): string | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  const m = s.match(/^\d{4}-\d{2}-\d{2}/);
  if (m?.[0]) return m[0];
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

// ============================================================================
// REGISTRAR ISSUE (missing_property_mapping)
// ============================================================================

/**
 * Registra uma issue de import quando não é possível resolver o imóvel.
 * Esta função é BEST-EFFORT e nunca deve quebrar o fluxo principal.
 * 
 * @param supabase - Cliente Supabase com service role
 * @param input - Dados da reserva que não pôde ser importada
 */
export async function upsertStaysnetImportIssueMissingPropertyMapping(
  supabase: ReturnType<typeof getSupabaseClient>,
  input: ImportIssueInput,
): Promise<ImportIssueResult> {
  try {
    // ✅ Guardrail: manter payload mínimo para auditoria/replay.
    const raw = (input.rawPayload && typeof input.rawPayload === 'object') ? input.rawPayload : {};
    const rawAny = raw as Record<string, unknown>;

    const minimalRawPayload = {
      _id: rawAny?.['_id'] ?? input.externalId ?? null,
      id: rawAny?.['id'] ?? null,
      confirmationCode: rawAny?.['confirmationCode'] ?? input.reservationCode ?? null,
      reservationUrl: rawAny?.['reservationUrl'] ?? null,
      type: rawAny?.['type'] ?? null,
      partner: rawAny?.['partner'] ?? input.partner ?? null,
      partnerCode: rawAny?.['partnerCode'] ?? null,
      _idlisting: rawAny?.['_idlisting'] ?? rawAny?.['_id_listing'] ?? rawAny?.['propertyId'] ?? input.listingId ?? null,
      checkInDate: rawAny?.['checkInDate'] ?? input.checkInDate ?? null,
      checkOutDate: rawAny?.['checkOutDate'] ?? input.checkOutDate ?? null,
    };

    const baseRow: any = {
      organization_id: input.organizationId,
      platform: 'staysnet',
      entity_type: 'reservation',
      issue_type: 'missing_property_mapping',
      external_id: input.externalId,
      reservation_code: input.reservationCode,
      listing_id: input.listingId,
      listing_candidates: input.listingCandidates,
      check_in: toYmdOrNull(input.checkInDate),
      check_out: toYmdOrNull(input.checkOutDate),
      partner: input.partner,
      platform_source: input.platform,
      status: 'open',
      message: 'Reserva StaysNet sem vínculo com imóvel (properties) — importar imóveis/upsert e reprocessar',
      raw_payload: minimalRawPayload,
    };

    // Prefer upsert when external_id available
    if (input.externalId) {
      const { error } = await supabase
        .from('staysnet_import_issues')
        .upsert(baseRow, {
          onConflict: 'organization_id,platform,entity_type,issue_type,external_id',
        });

      if (!error) return { ok: true, mode: 'upsert' };

      console.warn(`   ⚠️ [ImportIssue] upsert falhou (external_id=${input.externalId}): ${error.message}`);
      
      // Fallback to insert
      const { error: insertError } = await supabase.from('staysnet_import_issues').insert(baseRow);
      if (insertError) {
        console.warn(`   ⚠️ [ImportIssue] insert fallback falhou: ${insertError.message}`);
        return { ok: false, mode: 'insert', error: insertError.message };
      }
      return { ok: true, mode: 'insert' };
    }

    // Without external_id, insert best-effort
    const { error } = await supabase.from('staysnet_import_issues').insert(baseRow);
    if (error) {
      console.warn(`   ⚠️ [ImportIssue] insert falhou: ${error.message}`);
      return { ok: false, mode: 'insert', error: error.message };
    }
    return { ok: true, mode: 'insert' };
  } catch (e: any) {
    console.warn(`   ⚠️ [ImportIssue] erro inesperado: ${e?.message || String(e)}`);
    return { ok: false, mode: 'insert', error: e?.message || String(e) };
  }
}

// ============================================================================
// RESOLVER ISSUE (quando import bem-sucedido)
// ============================================================================

/**
 * Marca uma issue como resolvida quando a reserva é importada com sucesso.
 */
export async function resolveStaysnetImportIssue(
  supabase: ReturnType<typeof getSupabaseClient>,
  input: {
    organizationId: string;
    externalId: string | null;
    reservationCode: string | null;
  },
): Promise<void> {
  try {
    const patch = { status: 'resolved', resolved_at: new Date().toISOString() };

    // Por external_id (preferencial)
    if (input.externalId) {
      await supabase
        .from('staysnet_import_issues')
        .update(patch)
        .eq('organization_id', input.organizationId)
        .eq('platform', 'staysnet')
        .eq('entity_type', 'reservation')
        .eq('issue_type', 'missing_property_mapping')
        .eq('external_id', input.externalId)
        .eq('status', 'open');
    }

    // Por reservation_code (fallback)
    if (input.reservationCode) {
      await supabase
        .from('staysnet_import_issues')
        .update(patch)
        .eq('organization_id', input.organizationId)
        .eq('platform', 'staysnet')
        .eq('entity_type', 'reservation')
        .eq('issue_type', 'missing_property_mapping')
        .eq('reservation_code', input.reservationCode)
        .eq('status', 'open');
    }
  } catch (e: any) {
    console.warn(`   ⚠️ [ImportIssue] erro ao resolver: ${e?.message || String(e)}`);
  }
}
