/**
 * ⚡ STAYSNET IMPORT ISSUES (SUSTENTÁVEL)
 *
 * Objetivo: nunca perder dados silenciosamente.
 * Este endpoint expõe as "issues" abertas geradas durante importações,
 * por exemplo reservas que vieram da StaysNet mas não puderam ser vinculadas
 * a um imóvel (anuncios_ultimate).
 */

import { getSupabaseClient } from './kv_store.tsx';
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';

type HonoContext = Parameters<typeof getOrganizationIdOrThrow>[0];

export async function listStaysNetImportIssues(c: HonoContext) {
  const organizationId = await getOrganizationIdOrThrow(c);

  const status = String(c.req.query('status') || 'open').trim().toLowerCase();
  const limit = Math.min(200, Math.max(1, Number(c.req.query('limit') || 50)));
  const offset = Math.max(0, Number(c.req.query('offset') || 0));

  const supabase = getSupabaseClient();

  const q = supabase
    .from('staysnet_import_issues')
    .select(
      'id, organization_id, platform, entity_type, issue_type, external_id, reservation_code, listing_id, listing_candidates, check_in, check_out, partner, platform_source, status, message, created_at, updated_at, resolved_at'
    )
    .eq('organization_id', organizationId)
    .eq('platform', 'staysnet')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const filtered = status === 'all' ? q : q.eq('status', status);

  const { data, error } = await filtered;

  // Compat: se migration não foi aplicada ainda, não derrubar o modal.
  if (error && /does not exist/i.test(String(error.message || ''))) {
    return c.json({
      success: true,
      issues: [],
      count: 0,
      message: 'Tabela staysnet_import_issues ainda não existe (migrations pendentes).',
    });
  }

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({
    success: true,
    issues: data || [],
    count: (data || []).length,
  });
}
