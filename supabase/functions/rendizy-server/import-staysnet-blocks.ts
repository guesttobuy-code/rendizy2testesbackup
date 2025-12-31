/**
 * ⚡ IMPORT STAYSNET - BLOCKS (BLOQUEIOS/INDISPONIBILIDADES) - v1.0.106
 *
 * Objetivo:
 * - Buscar na API Stays.net via GET /booking/reservations com type=blocked,maintenance
 * - Converter para tabela SQL `blocks` para aparecer no calendário
 *
 * Observações:
 * - API usa paginação `skip/limit` (limit max 20)
 * - Bloqueios não devem virar registros em `reservations`
 *
 * Guardrails (antirregressão):
 * 1) Se há token/sessão do usuário, NUNCA cair no DEFAULT_ORG_ID.
 *    Isso cria o bug “importou mas não aparece” (gravou no tenant errado).
 * 2) O modal envia selectedPropertyIds como IDs da Stays (não UUID interno).
 *    Filtre por IDs da Stays ANTES de resolver; depois resolva p/ UUID interno.
 * 3) Alguns payloads podem vir sem `type`; como a lista já filtra por query params,
 *    aceitamos type vazio como block-like.
 *
 * Docs: docs/04-modules/STAYSNET_INTEGRATION_GOVERNANCE.md
 */

import { Context } from 'npm:hono';
import { getSupabaseClient } from './kv_store.tsx';
import { blockToSql } from './utils-block-mapper.ts';
import type { Block, BlockSubtype } from './types.ts';
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';
import { loadStaysNetRuntimeConfigOrThrow } from './utils-staysnet-config.ts';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000';
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000002';

interface StaysNetReservationLike {
  _id: string;
  type?: string; // blocked | maintenance | ...
  checkInDate?: string;
  checkOutDate?: string;
  nights?: number;
  _idlisting?: string;
  _id_listing?: string;
  propertyId?: string;
  partner?: string;
  partnerCode?: string;
  reservationUrl?: string;
  [key: string]: any;
}

async function resolveAnuncioUltimateIdFromStaysId(
  supabase: ReturnType<typeof getSupabaseClient>,
  organizationId: string,
  staysId: string,
): Promise<string | null> {
  const lookups: Array<{ label: string; needle: any }> = [
    { label: 'data.externalIds.staysnet_property_id', needle: { externalIds: { staysnet_property_id: staysId } } },
    { label: 'data.externalIds.staysnet_listing_id', needle: { externalIds: { staysnet_listing_id: staysId } } },
    { label: 'data.staysnet_raw._id', needle: { staysnet_raw: { _id: staysId } } },
    { label: 'data.staysnet_raw.id', needle: { staysnet_raw: { id: staysId } } },
    { label: 'data.codigo', needle: { codigo: staysId } },
  ];

  for (const l of lookups) {
    const { data: row, error } = await supabase
      .from('anuncios_ultimate')
      .select('id')
      .eq('organization_id', organizationId)
      .contains('data', l.needle)
      .maybeSingle();

    if (error) {
      console.warn(`   ⚠️ Erro ao buscar anuncios_ultimate via ${l.label}: ${error.message}`);
      continue;
    }

    if (row?.id) {
      return row.id;
    }
  }

  return null;
}

function calcNights(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function mapSubtypeFromType(type: string): BlockSubtype {
  const t = (type || '').toLowerCase();
  if (t === 'maintenance') return 'maintenance';
  return 'simple';
}

function buildReason(type: string): string {
  const t = (type || '').toLowerCase();
  if (t === 'maintenance') return 'Manutenção (Stays.net)';
  return 'Bloqueio (Stays.net)';
}

function isStaysBlockLikeType(rawType: any): boolean {
  const t = String(rawType || '').trim().toLowerCase();
  if (!t) return false;

  if (
    t === 'blocked' ||
    t === 'maintenance' ||
    t === 'unavailable' ||
    t === 'owner_block' ||
    t === 'ownerblock'
  ) {
    return true;
  }

  if (
    t === 'bloqueado' ||
    t === 'bloqueio' ||
    t === 'indisponivel' ||
    t === 'indisponível' ||
    t === 'manutenção' ||
    t === 'manutencao'
  ) {
    return true;
  }

  if (t.includes('maintenance') || t.includes('manut')) return true;
  if (t.includes('owner') && t.includes('block')) return true;
  if (t.includes('bloq')) return true;
  if (t === 'block') return true;

  return false;
}

async function migrateMisclassifiedReservationsToBlocks(opts: {
  supabase: ReturnType<typeof getSupabaseClient>;
  organizationId: string;
  from: string;
  to: string;
  selectedSet: Set<string> | null;
  debug: boolean;
}): Promise<{ scanned: number; migrated: number; deleted: number; skipped: number }> {
  const { supabase, organizationId, from, to, selectedSet, debug } = opts;

  let scanned = 0;
  let migrated = 0;
  let deleted = 0;
  let skipped = 0;

  // Batch limitado por segurança (evitar estouro de runtime)
  const LIMIT = 500;

  let q = supabase
    .from('reservations')
    .select('id, property_id, check_in, check_out, staysnet_type, staysnet_raw')
    .eq('organization_id', organizationId)
    .lte('check_in', to)
    .gte('check_out', from)
    .limit(LIMIT);

  if (selectedSet && selectedSet.size > 0) {
    q = q.in('property_id', Array.from(selectedSet));
  }

  const { data: rows, error } = await q;
  if (error) {
    console.warn(`⚠️ Falha ao buscar reservas para migração de bloqueios: ${error.message}`);
    return { scanned: 0, migrated: 0, deleted: 0, skipped: 0 };
  }

  const list = rows || [];
  scanned = list.length;

  for (const r of list) {
    const propId = String((r as any).property_id || '').trim();
    const checkIn = String((r as any).check_in || '').split('T')[0];
    const checkOut = String((r as any).check_out || '').split('T')[0];

    const isBlockLike =
      isStaysBlockLikeType((r as any).staysnet_type) || isStaysBlockLikeType((r as any).staysnet_raw?.type);
    if (!isBlockLike) {
      skipped++;
      continue;
    }

    if (!propId || !checkIn || !checkOut) {
      skipped++;
      continue;
    }

    if (selectedSet && !selectedSet.has(propId)) {
      skipped++;
      continue;
    }

    const subtype = mapSubtypeFromType(String((r as any).staysnet_type || (r as any).staysnet_raw?.type || 'blocked'));

    // Se já existe block, apenas remover reserva errada.
    const { data: existing } = await supabase
      .from('blocks')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('property_id', propId)
      .eq('start_date', checkIn)
      .eq('end_date', checkOut)
      .eq('subtype', subtype)
      .maybeSingle();

    if (!existing?.id) {
      const now = new Date().toISOString();
      const nights = calcNights(checkIn, checkOut);

      const block: Block = {
        id: crypto.randomUUID(),
        propertyId: propId,
        startDate: checkIn,
        endDate: checkOut,
        nights,
        type: 'block',
        subtype,
        reason: buildReason(String((r as any).staysnet_type || (r as any).staysnet_raw?.type || 'blocked')),
        notes: debug
          ? JSON.stringify({ migratedFromReservationId: (r as any).id, staysnet_raw: (r as any).staysnet_raw })
          : undefined,
        createdAt: now,
        updatedAt: now,
        createdBy: DEFAULT_USER_ID,
      };

      const { error: insertError } = await supabase.from('blocks').insert(blockToSql(block, organizationId));
      if (!insertError) {
        migrated++;
      } else {
        console.warn(`⚠️ Falha ao migrar reserva->block (res=${(r as any).id}): ${insertError.message}`);
      }
    }

    const { error: delErr } = await supabase
      .from('reservations')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', (r as any).id);
    if (!delErr) {
      deleted++;
    } else {
      console.warn(`⚠️ Falha ao deletar reserva misclassificada (id=${(r as any).id}): ${delErr.message}`);
    }
  }

  return { scanned, migrated, deleted, skipped };
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), Math.max(1, timeoutMs));
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function importStaysNetBlocks(c: Context) {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('⚡ IMPORT STAYSNET - BLOCKS (BLOQUEIOS)');
  console.log('═══════════════════════════════════════════════════\n');

  const debug = c.req.query('debug') === '1';

  let fetched = 0;
  let saved = 0;
  let skipped = 0;
  let errors = 0;

  const errorDetails: Array<{ item: string; error: string }> = [];

  try {
    const supabase = getSupabaseClient();

    // Default range: +-12 meses; override via query ou body
    const body: any = await c.req.json().catch(() => ({}));
    const rawOrganizationIdFromBody = String(body?.organizationId ?? body?.organization_id ?? '').trim();
    const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

    // ✅ RISCO ZERO (multi-tenant): tentar sessão (X-Auth-Token/cookie/Authorization), senão exigir org explícita.
    let organizationId: string | null = null;
    try {
      organizationId = await getOrganizationIdOrThrow(c);
    } catch {
      // ignore
    }

    if (!organizationId) {
      if (rawOrganizationIdFromBody && isUuid(rawOrganizationIdFromBody)) {
        organizationId = rawOrganizationIdFromBody;
      } else {
        return c.json({
          success: false,
          error: 'ORG_REQUIRED',
          message: 'organizationId obrigatório: envie sessão do usuário (X-Auth-Token/cookie/Authorization) ou informe body.organizationId explicitamente.'
        }, 401);
      }
    }


    const selectedPropertyIds = Array.isArray(body?.selectedPropertyIds)
      ? (body.selectedPropertyIds as unknown[]).map(String).map((s) => s.trim()).filter(Boolean)
      : Array.isArray(body?.propertyIds)
        ? (body.propertyIds as unknown[]).map(String).map((s) => s.trim()).filter(Boolean)
        : [];

    // Seleção pode vir como IDs Stays (padrão do modal) ou UUID interno.
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const selectedInternalIdSet = new Set<string>();
    const selectedStaysIdSet = new Set<string>();
    for (const id of selectedPropertyIds) {
      if (uuidRegex.test(id)) selectedInternalIdSet.add(id);
      else selectedStaysIdSet.add(id);
    }
    const filterBySelected = selectedInternalIdSet.size > 0 || selectedStaysIdSet.size > 0;

    const propertyIdCache = new Map<string, string | null>();
    const resolveCached = async (staysId: string): Promise<string | null> => {
      const key = String(staysId || '').trim();
      if (!key) return null;
      if (propertyIdCache.has(key)) return propertyIdCache.get(key) ?? null;
      const resolved = await resolveAnuncioUltimateIdFromStaysId(supabase, organizationId, key);
      propertyIdCache.set(key, resolved);
      return resolved;
    };

    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 12);
    const toDate = new Date();
    toDate.setMonth(toDate.getMonth() + 12);

    const bodyFrom = body?.from || body?.startDate;
    const bodyTo = body?.to || body?.endDate;

    const from = String((c.req.query('from') || bodyFrom || fromDate.toISOString().split('T')[0]) ?? '').trim();
    const to = String((c.req.query('to') || bodyTo || toDate.toISOString().split('T')[0]) ?? '').trim();
    const dateType = String((c.req.query('dateType') || body?.dateType || 'included') ?? '').trim();
    // ✅ Stays.net: limit max 20
    const limit = Math.min(20, Math.max(1, Number(c.req.query('limit') || body?.limit || 20)));
    const maxPages = Math.max(1, Number(c.req.query('maxPages') || body?.maxPages || 500));

    const maxRuntimeMs = Math.max(5_000, Number(body?.maxRuntimeMs || 25_000));
    const fetchTimeoutMs = Math.max(3_000, Number(body?.fetchTimeoutMs || 15_000));
    const startedAt = Date.now();

    console.log(`📅 Período: ${from} até ${to}`);
    console.log(`📌 dateType: ${dateType}`);
    console.log(`📄 Paginação: limit=${limit}, maxPages=${maxPages}`);
    console.log(`⏱️ Runtime budget: ${maxRuntimeMs}ms (fetch timeout=${fetchTimeoutMs}ms)`);
    if (filterBySelected) {
      console.log(
        `🏠 Filtrando por propriedades selecionadas: received=${selectedPropertyIds.length} (stays=${selectedStaysIdSet.size}, internal=${selectedInternalIdSet.size})`,
      );
    }

    const staysConfig = await loadStaysNetRuntimeConfigOrThrow(organizationId);
    const credentials = btoa(`${staysConfig.apiKey}:${staysConfig.apiSecret}`);

    // ✅ GOVERNANÇA: Antes de buscar na API, migrar qualquer bloqueio que tenha sido salvo errado como reserva.
    // Isso garante que o calendário muda de card mesmo quando a Stays não retorna o item neste request.
    try {
      const mig = await migrateMisclassifiedReservationsToBlocks({
        supabase,
        organizationId,
        from,
        to,
        selectedSet: selectedInternalIdSet.size > 0 ? selectedInternalIdSet : null,
        debug,
      });
      if (mig.scanned > 0) {
        console.log(
          `🧹 Migração reservas->blocks: scanned=${mig.scanned} migrated=${mig.migrated} deleted=${mig.deleted} skipped=${mig.skipped}`,
        );
      }
    } catch (e: any) {
      console.warn(`⚠️ Falha na migração reservas->blocks: ${e?.message || String(e)}`);
    }

    let skipCursor = Math.max(0, Number(c.req.query('skip') || body?.skip || 0));
    let pagesFetched = 0;
    let stoppedByTime = false;
    let lastPageLen = 0;

    for (let page = 0; page < maxPages; page++) {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= maxRuntimeMs) {
        stoppedByTime = true;
        console.log(`   ⏱️ Interrompido por budget de runtime (${elapsed}ms >= ${maxRuntimeMs}ms)`);
        break;
      }

      const params = new URLSearchParams({
        from,
        to,
        dateType,
        limit: String(limit),
        skip: String(skipCursor),
      });
      // type pode ser múltiplo (repetido)
      // Stays.net usa `type[]` (ex.: type[]=blocked&type[]=maintenance)
      params.append('type[]', 'blocked');
      params.append('type[]', 'maintenance');

      const resp = await fetchWithTimeout(`${staysConfig.baseUrl}/booking/reservations?${params}`, {
        headers: {
          Authorization: `Basic ${credentials}`,
          Accept: 'application/json',
        },
      }, fetchTimeoutMs);

      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`StaysNet API falhou: ${resp.status} - ${errorText.substring(0, 200)}`);
      }

      const pageData: StaysNetReservationLike[] = await resp.json();
      if (!Array.isArray(pageData)) {
        throw new Error(`Resposta da API não é um array. Tipo: ${typeof pageData}`);
      }

      pagesFetched++;
      lastPageLen = pageData.length;
      fetched += lastPageLen;
      console.log(`   📥 Página ${page + 1}: ${pageData.length} itens (skip=${skipCursor}, total_fetched=${fetched})`);

      for (let i = 0; i < pageData.length; i++) {
        const item = pageData[i];
        const itemId = item._id || `item-${skipCursor + i + 1}`;

        try {
          const rawType = (item as any).type ?? (item as any).reservationType ?? (item as any).kind ?? '';
          const typeLower = String(rawType || '').toLowerCase();
          // ✅ Robustez: a lista já é filtrada via query params, mas alguns payloads vêm sem `type`.
          // Então aceitamos quando for block-like ou quando `type` vier vazio.
          const isBlockLike = !typeLower || isStaysBlockLikeType(typeLower);
          if (!isBlockLike) {
            skipped++;
            continue;
          }

          if (!item.checkInDate || !item.checkOutDate) {
            skipped++;
            continue;
          }

          const checkIn = item.checkInDate.split('T')[0];
          const checkOut = item.checkOutDate.split('T')[0];
          const nights = item.nights || calcNights(checkIn, checkOut);
          if (nights < 1) {
            skipped++;
            continue;
          }

          const staysListingCandidates = [
            (item as any)._idlisting,
            (item as any)._id_listing,
            (item as any).propertyId,
          ].filter(Boolean) as string[];

          // ✅ Filtro de seleção (modal): seleciona por IDs Stays.
          // Fazemos isso antes de resolver p/ UUID interno para evitar abortar tudo quando faltam vínculos.
          if (selectedStaysIdSet.size > 0) {
            const matched = staysListingCandidates.some((c) => selectedStaysIdSet.has(String(c).trim()));
            if (!matched) {
              skipped++;
              continue;
            }
          }

          let propertyId: string | null = null;
          for (const candidate of staysListingCandidates) {
            propertyId = await resolveCached(candidate);
            if (propertyId) break;
          }

          if (!propertyId) {
            // Sem property_id válido o calendário não consegue atribuir o block
            skipped++;
            continue;
          }

          // ✅ Se seleção veio com UUID interno, filtrar aqui após resolução
          if (selectedInternalIdSet.size > 0 && !selectedInternalIdSet.has(propertyId)) {
            skipped++;
            continue;
          }

          // Dedup simples: org + property + start + end + subtype
          const subtype = mapSubtypeFromType(typeLower || 'blocked');
          const { data: existing, error: existingError } = await supabase
            .from('blocks')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('property_id', propertyId)
            .eq('start_date', checkIn)
            .eq('end_date', checkOut)
            .eq('subtype', subtype)
            .maybeSingle();

          if (existingError) {
            console.warn(`   ⚠️ Erro ao verificar duplicação block ${itemId}: ${existingError.message}`);
          }

          // ✅ Reparar bug antigo: bloqueio vindo da Stays não pode ficar em `reservations`
          // Se existirem reservas com staysnet_type=blocked/maintenance no mesmo range, removemos.
          try {
            const { data: wrongRows, error: wrongErr } = await supabase
              .from('reservations')
              .select('id, staysnet_type, staysnet_raw')
              .eq('organization_id', organizationId)
              .eq('property_id', propertyId)
              .eq('check_in', checkIn)
              .eq('check_out', checkOut)
              .limit(25);

            if (wrongErr) {
              console.warn(`   ⚠️ Erro ao buscar reservas misclassificadas p/ cleanup: ${wrongErr.message}`);
            } else if (wrongRows?.length) {
              const toDelete = wrongRows.filter(
                (r: any) => isStaysBlockLikeType(r?.staysnet_type) || isStaysBlockLikeType(r?.staysnet_raw?.type),
              );
              for (const r of toDelete) {
                await supabase
                  .from('reservations')
                  .delete()
                  .eq('organization_id', organizationId)
                  .eq('id', r.id);
              }
            }
          } catch (e: any) {
            console.warn(`   ⚠️ Falha no cleanup de reservas misclassificadas: ${e?.message || String(e)}`);
          }

          if (existing?.id) {
            skipped++;
            continue;
          }

          const now = new Date().toISOString();
          const block: Block = {
            id: crypto.randomUUID(),
            propertyId,
            startDate: checkIn,
            endDate: checkOut,
            nights,
            type: 'block',
            subtype,
            reason: buildReason(typeLower || 'blocked'),
            notes: debug
              ? JSON.stringify({
                  staysnet: {
                    _id: itemId,
                    type: typeLower || null,
                    reservationUrl: item.reservationUrl,
                    partner: item.partner,
                    partnerCode: item.partnerCode,
                  },
                })
              : undefined,
            createdAt: now,
            updatedAt: now,
            createdBy: DEFAULT_USER_ID,
          };

          const sqlData = blockToSql(block, organizationId);

          const { error: insertError } = await supabase.from('blocks').insert(sqlData);
          if (insertError) {
            throw new Error(`Falha ao inserir block: ${insertError.message}`);
          }

          saved++;
        } catch (err: any) {
          errors++;
          errorDetails.push({ item: itemId, error: err?.message || String(err) });
        }
      }

      skipCursor += pageData.length;

      if (pageData.length < limit) {
        break;
      }
    }

    const stoppedByMaxPages = pagesFetched >= maxPages;
    const hasMore = lastPageLen === limit && (stoppedByMaxPages || stoppedByTime);

    return c.json({
      success: errors === 0,
      method: 'import-blocks',
      table: 'blocks',
      stats: { fetched, saved, skipped, errors },
      next: { hasMore, skip: hasMore ? skipCursor : skipCursor },
      errorDetails: errors > 0 ? errorDetails : undefined,
    });
  } catch (err: any) {
    return c.json(
      {
        success: false,
        method: 'import-blocks',
        error: err?.message || String(err),
        stats: { fetched, saved, skipped, errors },
      },
      500,
    );
  }
}
