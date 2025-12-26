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

    // ✅ Preferir organization_id real do usuário; fallback mantém compatibilidade com chamadas técnicas.
    let organizationId = DEFAULT_ORG_ID;
    try {
      organizationId = await getOrganizationIdOrThrow(c);
    } catch {
      // sem sessão/token → mantém DEFAULT_ORG_ID
    }

    // Default range: +-12 meses; override via query ou body
    const body: any = await c.req.json().catch(() => ({}));

    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 12);
    const toDate = new Date();
    toDate.setMonth(toDate.getMonth() + 12);

    const bodyFrom = body?.from || body?.startDate;
    const bodyTo = body?.to || body?.endDate;

    const from = String((c.req.query('from') || bodyFrom || fromDate.toISOString().split('T')[0]) ?? '').trim();
    const to = String((c.req.query('to') || bodyTo || toDate.toISOString().split('T')[0]) ?? '').trim();
    const dateType = String((c.req.query('dateType') || body?.dateType || 'included') ?? '').trim();
    // A API da StaysNet tende a falhar com `limit` muito alto.
    // Permitimos um aumento moderado (até 50) para reduzir batches, e o controle de volume
    // continua via `maxPages` + timeouts do caller.
    const limit = Math.min(50, Math.max(1, Number(c.req.query('limit') || body?.limit || 20)));
    const maxPages = Math.max(1, Number(c.req.query('maxPages') || body?.maxPages || 500));

    console.log(`📅 Período: ${from} até ${to}`);
    console.log(`📌 dateType: ${dateType}`);
    console.log(`📄 Paginação: limit=${limit}, maxPages=${maxPages}`);

    const staysConfig = await loadStaysNetRuntimeConfigOrThrow(organizationId);
    const credentials = btoa(`${staysConfig.apiKey}:${staysConfig.apiSecret}`);

    const allItems: StaysNetReservationLike[] = [];
    let skipPage = Math.max(0, Number(c.req.query('skip') || body?.skip || 0));

    for (let page = 0; page < maxPages; page++) {
      const params = new URLSearchParams({
        from,
        to,
        dateType,
        limit: String(limit),
        skip: String(skipPage),
      });
      // type pode ser múltiplo (repetido)
      params.append('type', 'blocked');
      params.append('type', 'maintenance');

      const resp = await fetch(`${staysConfig.baseUrl}/booking/reservations?${params}`, {
        headers: {
          Authorization: `Basic ${credentials}`,
          Accept: 'application/json',
        },
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`StaysNet API falhou: ${resp.status} - ${errorText.substring(0, 200)}`);
      }

      const pageData: StaysNetReservationLike[] = await resp.json();
      if (!Array.isArray(pageData)) {
        throw new Error(`Resposta da API não é um array. Tipo: ${typeof pageData}`);
      }

      allItems.push(...pageData);
      console.log(`   📥 Página ${page + 1}: ${pageData.length} itens (total=${allItems.length})`);

      if (pageData.length < limit) {
        break;
      }

      skipPage += limit;
    }

    fetched = allItems.length;

    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      const itemId = item._id || `item-${i + 1}`;

      try {
        const typeLower = String(item.type || '').toLowerCase();
        if (typeLower !== 'blocked' && typeLower !== 'maintenance') {
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

        let propertyId: string | null = null;
        for (const candidate of staysListingCandidates) {
          propertyId = await resolveAnuncioUltimateIdFromStaysId(supabase, organizationId, candidate);
          if (propertyId) break;
        }

        if (!propertyId) {
          // Sem property_id válido o calendário não consegue atribuir o block
          skipped++;
          continue;
        }

        // Dedup simples: org + property + start + end + subtype
        const subtype = mapSubtypeFromType(typeLower);
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
          reason: buildReason(typeLower),
          notes: debug ? JSON.stringify({ staysnet: { _id: itemId, type: typeLower, reservationUrl: item.reservationUrl, partner: item.partner, partnerCode: item.partnerCode } }) : undefined,
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

    return c.json({
      success: errors === 0,
      method: 'import-blocks',
      table: 'blocks',
      stats: { fetched, saved, skipped, errors },
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
