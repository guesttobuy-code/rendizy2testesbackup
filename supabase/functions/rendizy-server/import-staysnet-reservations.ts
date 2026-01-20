/**
 * ⚡ IMPORT STAYSNET - RESERVATIONS (RESERVAS) - v1.0.104
 * 
 * PADRÃO ATÔMICO:
 * - Inserts diretos na tabela reservations (estrutura flat)
 * - Deduplica via external_id + platform
 * - Vincula com properties via property_id
 * - Extrai guests_* de forma flat (adults, children, infants, pets)
 * 
 * ENDPOINT API: GET /booking/reservations
 * TABELA DESTINO: reservations
 * 
 * REFERÊNCIA: docs/architecture/PERSISTENCIA_ATOMICA_PADRAO_VITORIOSO.md
 */

import { Context } from 'npm:hono';
import { getSupabaseClient } from './kv_store.tsx';
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';
import { loadStaysNetRuntimeConfigOrThrow } from './utils-staysnet-config.ts';
import { resolveOrCreateGuestIdFromStaysReservation } from './utils-staysnet-guest-link.ts';
import { storeStaysnetRawObject } from './utils-staysnet-raw-store.ts';

async function fetchStaysReservationDetails(
  baseUrl: string,
  credentials: string,
  idOrCode: string,
): Promise<StaysNetReservation | null> {
  if (!idOrCode) return null;
  const url = `${baseUrl}/booking/reservations/${encodeURIComponent(idOrCode)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const resp = await fetch(url, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    if (!resp.ok) {
      // Silencioso: o import continua com o payload de lista.
      return null;
    }

    const json = await resp.json();
    if (!json || typeof json !== 'object') return null;
    return json as StaysNetReservation;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveAnuncioUltimateIdFromStaysId(
  supabase: ReturnType<typeof getSupabaseClient>,
  organizationId: string,
  staysId: string,
): Promise<string | null> {
  // ⚠️ CANÔNICO: manter esta ordem de resolução alinhada com
  // docs/04-modules/STAYSNET_IMPORT_ISSUES.md ("Como o mapping é encontrado").
  const lookups: Array<{ label: string; needle: any }> = [
    // ✅ Forma atual encontrada no banco: data.externalIds.staysnet_property_id
    { label: 'data.externalIds.staysnet_property_id', needle: { externalIds: { staysnet_property_id: staysId } } },
    // ✅ Alguns setups salvam o código curto do listing
    { label: 'data.externalIds.staysnet_listing_id', needle: { externalIds: { staysnet_listing_id: staysId } } },
    // ✅ Raw listing também é persistido
    { label: 'data.staysnet_raw._id', needle: { staysnet_raw: { _id: staysId } } },
    { label: 'data.staysnet_raw.id', needle: { staysnet_raw: { id: staysId } } },
    // ✅ Fallbacks comuns (quando "codigo" é usado como chave externa)
    { label: 'data.codigo', needle: { codigo: staysId } },
  ];

  for (const l of lookups) {
    const { data: row, error } = await supabase
      .from('properties')
      .select('id')
      .eq('organization_id', organizationId)
      .contains('data', l.needle)
      .maybeSingle();

    if (error) {
      console.warn(`   ⚠️ Erro ao buscar properties via ${l.label}: ${error.message}`);
      continue;
    }

    if (row?.id) {
      console.log(`   ✅ Property vinculado (properties via ${l.label}): ${row.id}`);
      return row.id;
    }
  }

  return null;
}

async function upsertStaysnetImportIssueMissingPropertyMapping(
  supabase: ReturnType<typeof getSupabaseClient>,
  input: {
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
  },
): Promise<{ ok: boolean; mode: 'upsert' | 'insert'; error?: string }> {
  try {
    const toYmdOrNull = (value: string | null): string | null => {
      if (!value) return null;
      const s = String(value).trim();
      if (!s) return null;
      const m = s.match(/^\d{4}-\d{2}-\d{2}/);
      if (m?.[0]) return m[0];
      const d = new Date(s);
      if (!Number.isFinite(d.getTime())) return null;
      return d.toISOString().slice(0, 10);
    };

    // ✅ Guardrail: manter payload mínimo para auditoria/replay.
    // Evita risco de payload gigantesco / ruídos desnecessários.
    const raw = (input.rawPayload && typeof input.rawPayload === 'object') ? input.rawPayload : {};
    const rawAny = raw as Record<string, unknown>;

    const minimalRawPayload = {
      _id: (rawAny && rawAny['_id'] != null ? rawAny['_id'] : (input.externalId ?? null)),
      id: (rawAny && rawAny['id'] != null ? rawAny['id'] : null),
      confirmationCode: (rawAny && rawAny['confirmationCode'] != null ? rawAny['confirmationCode'] : (input.reservationCode ?? null)),
      reservationUrl: (rawAny && rawAny['reservationUrl'] != null ? rawAny['reservationUrl'] : null),
      type: (rawAny && rawAny['type'] != null ? rawAny['type'] : null),
      partner: (rawAny && rawAny['partner'] != null ? rawAny['partner'] : (input.partner ?? null)),
      partnerCode: (rawAny && rawAny['partnerCode'] != null ? rawAny['partnerCode'] : null),
      _idlisting: (
        (rawAny && rawAny['_idlisting'] != null ? rawAny['_idlisting'] : null)
        ?? (rawAny && rawAny['_id_listing'] != null ? rawAny['_id_listing'] : null)
        ?? (rawAny && rawAny['propertyId'] != null ? rawAny['propertyId'] : null)
        ?? input.listingId
        ?? null
      ),
      checkInDate: (rawAny && rawAny['checkInDate'] != null ? rawAny['checkInDate'] : (input.checkInDate ?? null)),
      checkOutDate: (rawAny && rawAny['checkOutDate'] != null ? rawAny['checkOutDate'] : (input.checkOutDate ?? null)),
    };

    // ⚠️ Governança: quando não há mapping do imóvel, a reserva é SKIP por regra canônica,
    // mas NUNCA pode ser SKIP silencioso. Esta escrita é best-effort e não deve quebrar o import.
    // Documento canônico: docs/04-modules/STAYSNET_IMPORT_ISSUES.md
    // Prefer idempotency by external_id when available; otherwise insert best-effort (may duplicate).
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

    // If we have external_id, prefer upsert.
    // IMPORTANT: PostgREST/Supabase upsert requires a NON-PARTIAL unique constraint/index
    // on the conflict target. If the DB only has a partial unique index, upsert will fail
    // with "no unique or exclusion constraint". In that case, we fallback to insert.
    if (input.externalId) {
      const { error } = await supabase
        .from('staysnet_import_issues')
        .upsert(baseRow, {
          onConflict: 'organization_id,platform,entity_type,issue_type,external_id',
        });

      if (!error) return { ok: true, mode: 'upsert' };

      console.warn(
        `   ⚠️ Falha no upsert staysnet_import_issues (external_id=${input.externalId}): ${error.message}`
      );
      // Fallback best-effort insert (may duplicate if unique index is missing).
      const { error: insertError } = await supabase.from('staysnet_import_issues').insert(baseRow);
      if (insertError) {
        console.warn(
          `   ⚠️ Falha no insert staysnet_import_issues (fallback): ${insertError.message}`
        );
        return { ok: false, mode: 'insert', error: insertError.message };
      }
      return { ok: true, mode: 'insert' };
    }

    // Without external_id, insert best-effort.
    const { error } = await supabase.from('staysnet_import_issues').insert(baseRow);
    if (error) {
      console.warn(`   ⚠️ Falha no insert staysnet_import_issues: ${error.message}`);
      return { ok: false, mode: 'insert', error: error.message };
    }
    return { ok: true, mode: 'insert' };
  } catch (e: any) {
    console.warn(`   ⚠️ Falha ao registrar staysnet_import_issue (missing_property_mapping): ${e?.message || String(e)}`);
    return { ok: false, mode: 'insert', error: e?.message || String(e) };
  }
}

async function resolveStaysnetImportIssueForReservation(
  supabase: ReturnType<typeof getSupabaseClient>,
  input: {
    organizationId: string;
    externalId: string | null;
    reservationCode: string | null;
  },
): Promise<void> {
  try {
    const patch = { status: 'resolved', resolved_at: new Date().toISOString() };

    if (input.externalId) {
      await supabase
        .from('staysnet_import_issues')
        .update(patch)
        .eq('organization_id', input.organizationId)
        .eq('platform', 'staysnet')
        .eq('entity_type', 'reservation')
        .eq('issue_type', 'missing_property_mapping')
        .eq('status', 'open')
        .eq('external_id', String(input.externalId));
    }

    if (input.reservationCode) {
      await supabase
        .from('staysnet_import_issues')
        .update(patch)
        .eq('organization_id', input.organizationId)
        .eq('platform', 'staysnet')
        .eq('entity_type', 'reservation')
        .eq('issue_type', 'missing_property_mapping')
        .eq('status', 'open')
        .eq('reservation_code', String(input.reservationCode));
    }
  } catch (e: any) {
    console.warn(`   ⚠️ Falha ao resolver staysnet_import_issue: ${e?.message || String(e)}`);
  }
}

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000';
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000002';
// ⚠️ REGRA CANÔNICA: reserva SEMPRE precisa de um imóvel válido (properties).
// Não existe fallback/placeholder para property_id.

// ============================================================================
// TIPOS - Estrutura da API StaysNet /booking/reservations
// ============================================================================
interface StaysNetReservation {
  _id: string;                    // ID único da reserva
  confirmationCode?: string;      // Código de confirmação
  propertyId?: string;            // ID do imóvel (pode vir como _id_listing/_idlisting)
  _id_listing?: string;           // ID do imóvel (campo alternativo - snake)
  _idlisting?: string;            // ✅ ID do imóvel (campo real visto no payload: _idlisting)
  reservationUrl?: string;        // URL externa da reserva (quando fornecida)

  // Origem / tipo
  type?: string;                  // reservation | blocked | maintenance | ...
  partner?: string;               // Ex: Airbnb, Booking...
  partnerCode?: string;           // Código do parceiro
  
  // Datas
  checkInDate?: string;           // ISO 8601 date
  checkOutDate?: string;          // ISO 8601 date
  nights?: number;
  
  // Hóspede principal
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  
  // Contagem de hóspedes (pode vir como decimal - BUG StaysNet)
  guests?: {
    adults?: number;
    children?: number;
    infants?: number;
    pets?: number;
    total?: number;
  };
  _i_maxGuests?: number;          // Capacidade máxima (pode vir como decimal)
  
  // Preços
  // Observação: em payloads reais esses campos podem vir como string ("R$ 1.234,56")
  // ou como objeto com breakdown. Por isso usamos `any` e normalizamos.
  price?: any;                    // Preço total (ou objeto)
  pricePerNight?: any;            // Preço por noite
  cleaningFee?: any;              // Taxa de limpeza
  serviceFee?: any;               // Taxa de serviço
  taxes?: any;                    // Impostos
  discount?: any;                 // Desconto
  currency?: string;              // Moeda (BRL, USD, etc)
  
  // Status
  status?: string;                // pending, confirmed, cancelled, etc
  platform?: string;              // airbnb, booking, direct, etc
  source?: string;                // Fonte da reserva
  
  // Pagamento
  paymentStatus?: string;         // paid, pending, refunded, etc
  paymentMethod?: string;         // card, pix, cash, etc
  
  // Outros
  notes?: string;
  specialRequests?: string;
  checkInTime?: string;
  checkOutTime?: string;
  cancelledAt?: string;
  
  // Outros campos que podem vir...
  [key: string]: any;
}

// ============================================================================
// FUNÇÃO AUXILIAR: Arredondar guests para evitar erro "28.2005"
// ============================================================================
function safeInt(value: any, defaultValue: number = 0): number {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  if (isNaN(num)) return defaultValue;
  return Math.round(num); // ✅ FIX: Arredondar decimais para INTEGER
}

function parseMoney(value: any, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;

  // Alguns payloads retornam objeto (ex: { total: 123, cleaningFee: 10, ... })
  if (typeof value === 'object') {
    const candidates = [
      (value as any)._f_total,
      (value as any)._f_expected,
      (value as any)._f_val,
      (value as any).total,
      (value as any).amount,
      (value as any).value,
      (value as any).price,
      (value as any).baseTotal,
      (value as any).base_total,
      (value as any).grandTotal,
      (value as any).grand_total,
    ];
    for (const c of candidates) {
      const n = parseMoney(c, Number.NaN);
      if (Number.isFinite(n)) return n;
    }
    return fallback;
  }

  // Strings: aceita "R$ 1.234,56"; "1,234.56"; "1234,56"; "1234.56"
  if (typeof value === 'string') {
    let s = value.trim();
    if (!s) return fallback;
    // remover moeda e espaços
    s = s.replace(/[^0-9,.-]/g, '');
    if (!s) return fallback;

    // Heurística PT-BR: se tem vírgula e ponto, assume ponto = milhar, vírgula = decimal
    if (s.includes(',') && s.includes('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
      // só vírgula: assumir decimal
      s = s.replace(',', '.');
    }

    const n = Number(s);
    return Number.isFinite(n) ? n : fallback;
  }

  // fallback genérico
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseMoneyCents(value: any, fallbackCents = Number.NaN): number {
  const n = parseMoney(value, Number.NaN);
  if (!Number.isFinite(n)) return fallbackCents;
  // Normaliza para centavos inteiros (evita bugs de ponto flutuante)
  return Math.round(n * 100);
}

function centsToMoney2(cents: number): number {
  // Garante no máximo 2 casas decimais (ex: 81338 -> 813.38)
  return Number((cents / 100).toFixed(2));
}

function pickMoneyFromObject(obj: any, keys: string[], fallback = 0): number {
  if (!obj || typeof obj !== 'object') return fallback;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) {
      return parseMoney(obj[k], fallback);
    }
  }
  return fallback;
}

function asTextOrNull(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function normalizeTextCandidates(values: any[]): string[] {
  return values
    .map((v) => asTextOrNull(v))
    .filter(Boolean) as string[];
}

function extractStaysListingIdCandidates(res: any): string[] {
  const candidates = [
    res?._idlisting,
    res?._id_listing,
    res?._idListing,
    res?.propertyId,
    res?.property_id,
    res?.listingId,
    res?.listing_id,
    res?.idListing,
    res?.id_listing,
    res?.listing?._id,
    res?.listing?.id,
    res?.property?._id,
    res?.property?.id,
    res?.apartmentId,
    res?.apartment_id,
    res?.unitId,
    res?.unit_id,
  ];

  return Array.from(new Set(normalizeTextCandidates(candidates)));
}

function parseOptionalDateToIso(value: any): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function normalizeStaysDateType(input: string): 'arrival' | 'departure' | 'creation' | 'creationorig' | 'included' {
  const v = String(input || '').trim().toLowerCase();
  // Frontend legacy values
  if (v === 'checkin') return 'arrival';
  if (v === 'checkout') return 'departure';
  // API official values
  if (v === 'arrival') return 'arrival';
  if (v === 'departure') return 'departure';
  if (v === 'creation') return 'creation';
  if (v === 'creationorig') return 'creationorig';
  if (v === 'included') return 'included';
  // Fallback seguro: arrival (equivalente ao filtro “Data de chegada” do Stays)
  return 'arrival';
}

function normalizeReservationTypes(input: any): string[] {
  if (Array.isArray(input)) {
    return input.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

// ============================================================================
// FUNÇÃO AUXILIAR: Mapear status StaysNet → Rendizy
// ============================================================================
function mapReservationStatus(staysStatus: string | undefined): string {
  if (!staysStatus) return 'pending';
  
  const statusMap: Record<string, string> = {
    'pending': 'pending',
    'confirmed': 'confirmed',
    'inquiry': 'pending',
    'canceled': 'cancelled',
    'cancelled': 'cancelled',
    // PT-BR (UI Stays)
    'cancelada': 'cancelled',
    'cancelado': 'cancelled',
    'declined': 'cancelled',
    'expired': 'cancelled',
    'checked_in': 'checked_in',
    'checked_out': 'checked_out',
    'no_show': 'no_show'
  };
  
  return statusMap[staysStatus.toLowerCase()] || 'pending';
}

function deriveReservationStatus(input: { type?: string; status?: string }): string {
  const typeLower = String(input.type || '').trim().toLowerCase();

  // StaysNet usa `type=canceled` (1 L) como filtro oficial.
  if (typeLower === 'canceled' || typeLower === 'cancelled' || typeLower === 'cancelada' || typeLower === 'cancelado') return 'cancelled';
  if (typeLower === 'no_show') return 'no_show';

  const fromStatus = mapReservationStatus(input.status);

  // Se o payload não trouxer `status`, inferir um default razoável por `type`.
  if (fromStatus === 'pending') {
    // EN
    if (typeLower === 'booked' || typeLower === 'contract') return 'confirmed';
    if (typeLower === 'reserved') return 'pending';
    // PT-BR (UI Stays)
    if (typeLower === 'reserva' || typeLower === 'contrato') return 'confirmed';
    if (typeLower === 'pré-reserva' || typeLower === 'pre-reserva' || typeLower === 'prereserva') return 'pending';
  }

  return fromStatus;
}

function mapPaymentStatus(raw: string | undefined, fallback: string = 'pending'): string {
  if (!raw) return fallback;
  const v = String(raw).trim().toLowerCase();
  const map: Record<string, string> = {
    pending: 'pending',
    paid: 'paid',
    completed: 'paid',
    partial: 'partial',
    partially_paid: 'partial',
    refunded: 'refunded',
    refund: 'refunded',
  };
  return map[v] || fallback;
}

// ============================================================================
// FUNÇÃO AUXILIAR: Mapear platform
// ============================================================================
function mapPlatform(staysPlatform: string | undefined, source: string | undefined): string {
  return mapPlatformV2({ staysPlatform, source });
}

function mapPlatformV2(input: {
  staysPlatform?: unknown;
  source?: unknown;
  partner?: unknown;
  partnerCode?: unknown;
}): string {
  const token = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'object') {
      const v: any = value as any;
      return [
        v?.name,
        v?.code,
        v?.partner,
        v?.platform,
        v?.source,
        v?._id,
      ]
        .filter((x) => typeof x === 'string' || typeof x === 'number')
        .map(String)
        .join(' ');
    }
    return String(value);
  };

  const raw = [token(input.staysPlatform), token(input.source), token(input.partner), token(input.partnerCode)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!raw) return 'direct';
  
  if (raw.includes('airbnb')) return 'airbnb';
  if (raw.includes('booking')) return 'booking';
  if (raw.includes('decolar')) return 'decolar';
  if (raw.includes('direct')) return 'direct';
  
  return 'other';
}

// ============================================================================
// FUNÇÃO PRINCIPAL DE IMPORTAÇÃO
// ============================================================================
export async function importStaysNetReservations(c: Context) {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('⚡ IMPORT STAYSNET - RESERVATIONS (RESERVAS)');
  const debug = c.req.query('debug') === '1';
  const debugSample: Array<any> = [];
  console.log('═══════════════════════════════════════════════════');
  console.log('📍 API Endpoint: /booking/reservations');
  console.log('📍 Tabela Destino: reservations');
  console.log('📍 Método: INSERT direto (flat structure)');
  console.log('═══════════════════════════════════════════════════\n');

  let fetched = 0;
  let saved = 0;
  let created = 0;
  let updated = 0;
  let errors = 0;
  let skipped = 0;
  let skip = 0;
  let hasMore = false;
  const errorDetails: Array<{reservation: string, error: string}> = [];

  // 🧭 AUDIT: reservas puladas por falta de mapping do imóvel
  // (stays `_idlisting` / `propertyId` não encontrado em properties)
  const missingPropertyMappingByListingId = new Map<
    string,
    {
      staysPropertyId: string;
      candidates: string[];
      count: number;
      sampleReservations: Array<{
        externalId: string | null;
        reservationCode: string | null;
        checkInDate: string | null;
        checkOutDate: string | null;
        partner: string | null;
        platform: string | null;
      }>;
    }
  >();
  let skippedMissingPropertyMapping = 0;
  let missingPropertyIssueAttempts = 0;
  let missingPropertyIssueWritten = 0;
  let missingPropertyIssueFailed = 0;
  let missingPropertyIssueLastError: string | null = null;

  try {
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

    // ========================================================================
    // STEP 1: BUSCAR RESERVATIONS DA API STAYSNET
    // ========================================================================
    console.log('📡 [FETCH] Buscando reservations de /booking/reservations...');
    
    // ✅ CORREÇÃO: API exige from, to, dateType (não startDate/endDate)
    // Default: últimos 12 meses e próximos 12 meses (override via querystring ou body)
    // ✅ (Opcional) Restringir importação aos imóveis selecionados na UI
    // Esperado: array de IDs StaysNet do listing (ex.: campo `_idlisting` nas reservations)
    const rawSelectedPropertyIds = Array.isArray(body?.selectedPropertyIds) ? body.selectedPropertyIds : [];
    const selectedPropertyIds = rawSelectedPropertyIds.map((x: any) => String(x ?? '').trim()).filter(Boolean);
    const selectedPropertyIdSet = new Set(selectedPropertyIds);
    const filterBySelectedProperties = selectedPropertyIdSet.size > 0;

    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 12);
    const toDate = new Date();
    toDate.setMonth(toDate.getMonth() + 12);

    const bodyFrom = body?.from || body?.startDate;
    const bodyTo = body?.to || body?.endDate;

    const from = String((c.req.query('from') || bodyFrom || fromDate.toISOString().split('T')[0]) ?? '').trim();
    const to = String((c.req.query('to') || bodyTo || toDate.toISOString().split('T')[0]) ?? '').trim();
    const rawDateType = String((c.req.query('dateType') || body?.dateType || 'checkin') ?? '').trim();
    const dateType = normalizeStaysDateType(rawDateType);
    // ✅ Stays.net: limit max 20
    const limit = Math.min(20, Math.max(1, Number(c.req.query('limit') || body?.limit || 20)));
    // ✅ Segurança anti-timeout: default de poucas páginas. O caller pode continuar via `next.skip`.
    const maxPages = Math.max(1, Number(c.req.query('maxPages') || body?.maxPages || 5));

    // ✅ IMPORTAR todos os tipos “em vigor” por padrão.
    // No Stays, o filtro “Em vigor” normalmente inclui reserved/booked/contract.
    // Se não passarmos type, algumas contas retornam subconjunto.
    const includeCanceled = String(c.req.query('includeCanceled') || body?.includeCanceled || '').trim() === '1';
    // ✅ Por padrão, buscar detalhe por reserva para capturar hóspede (guestsDetails.list) e outros campos.
    // O endpoint de lista (/booking/reservations) pode vir truncado e não traz dados de contato.
    const rawExpandDetails = String(c.req.query('expandDetails') || (body as any)?.expandDetails || 'auto').trim().toLowerCase();
    const expandDetailsMode: 'on' | 'off' | 'auto' =
      (rawExpandDetails === '1' || rawExpandDetails === 'true' || rawExpandDetails === 'on') ? 'on'
        : (rawExpandDetails === '0' || rawExpandDetails === 'false' || rawExpandDetails === 'off') ? 'off'
          : 'auto';
    // Budget anti-egress: no máximo N fetches de detalhes por execução (default 10)
    let detailsFetchBudget = Math.min(200, Math.max(0, Number(c.req.query('maxDetailsFetches') || (body as any)?.maxDetailsFetches || 10)));
    const rawTypes = normalizeReservationTypes(body?.types ?? body?.type ?? c.req.query('types') ?? c.req.query('type'));
    const types = rawTypes.length > 0 ? rawTypes : ['reserved', 'booked', 'contract'];
    if (includeCanceled && !types.includes('canceled')) types.push('canceled');

    console.log(`   📅 Período: ${from} até ${to}`);
    console.log(`   📌 dateType: ${dateType} (raw=${rawDateType})`);
    console.log(`   🧾 types: ${types.join(',')}`);
    console.log(`   📄 Paginação: limit=${limit}, maxPages=${maxPages}`);
    console.log(`   🔎 expandDetails: ${expandDetailsMode} (maxDetailsFetches=${detailsFetchBudget})`);
    if (filterBySelectedProperties) {
      console.log(`   🏠 Filtro: ${selectedPropertyIdSet.size} imóvel(is) selecionado(s)`);
    }

    // ✅ Carregar config Stays.net (DB → global → env)
    const staysConfig = await loadStaysNetRuntimeConfigOrThrow(organizationId);
    const credentials = btoa(`${staysConfig.apiKey}:${staysConfig.apiSecret}`);

    const allReservations: StaysNetReservation[] = [];
    let fetchedFromApi = 0;
    let skippedBySelection = 0;
    skip = Math.max(0, Number(c.req.query('skip') || body?.skip || 0));
    const startSkip = skip;
    let pages = 0;
    hasMore = false;

    while (pages < maxPages) {
      const params = new URLSearchParams({
        from,
        to,
        dateType,
        limit: String(limit),
        skip: String(skip),
      });

      for (const t of types) {
        // Stays.net usa `type[]` (ex.: type[]=reserved&type[]=booked...)
        // Alguns ambientes retornam 200 + [] quando enviamos apenas `type`.
        params.append('type[]', t);
      }

      const response = await fetch(`${staysConfig.baseUrl}/booking/reservations?${params}`, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`StaysNet API falhou: ${response.status} - ${errorText.substring(0, 200)}`);
      }

      const pageData: StaysNetReservation[] = await response.json();
      if (!Array.isArray(pageData)) {
        throw new Error(`Resposta da API não é um array. Tipo: ${typeof pageData}`);
      }

      fetchedFromApi += pageData.length;

      const filteredPageData = filterBySelectedProperties
        ? pageData.filter((r) => {
            const candidates = extractStaysListingIdCandidates(r);
            if (candidates.length === 0) return false;
            return candidates.some((id) => selectedPropertyIdSet.has(id));
          })
        : pageData;

      if (filterBySelectedProperties) {
        skippedBySelection += pageData.length - filteredPageData.length;
      }

      allReservations.push(...filteredPageData);

      console.log(
        `   📥 Página ${pages + 1}: ${filteredPageData.length}/${pageData.length} itens (totalFiltrado=${allReservations.length})`
      );

      if (pageData.length < limit) {
        hasMore = false;
        break;
      }

      skip += limit;
      pages++;
      hasMore = pages < maxPages;
    }

    if (pages >= maxPages) {
      hasMore = true;
      console.warn(`   ⚠️ Paginação atingiu maxPages=${maxPages}. Retornando parcial (use next.skip para continuar).`);
    }

    const reservations: StaysNetReservation[] = allReservations;

    fetched = reservations.length;
    if (filterBySelectedProperties) {
      console.log(`✅ [FETCH] ${fetched} reservations após filtro (${fetchedFromApi} recebidas da API; skippedBySelection=${skippedBySelection})\n`);
    } else {
      console.log(`✅ [FETCH] ${fetched} reservations recebidas\n`);
    }

    if (fetched === 0) {
      return c.json({
        success: true,
        method: 'import-reservations',
        stats: {
          fetched: 0,
          saved: 0,
          errors: 0,
          skipped: skippedBySelection,
          fetchedFromApi,
          skippedBySelection,
        },
        // Se houver mais páginas, o caller pode continuar (mesmo que este lote não tenha matches)
        next: { skip, hasMore },
        message: filterBySelectedProperties
          ? 'Nenhuma reservation encontrada para os imóveis selecionados (neste lote)'
          : 'Nenhuma reservation encontrada na API StaysNet'
      });
    }

    // ========================================================================
    // STEP 2: SALVAR CADA RESERVATION NA TABELA reservations
    // ========================================================================
    const supabase = getSupabaseClient();

    for (let i = 0; i < reservations.length; i++) {
      const res = reservations[i];
      const confirmationCode = res.confirmationCode || res._id || `RES-${i + 1}`;

      const guestsDetailsObj = (res as any).guestsDetails || (res as any).guests_details || null;
      const hasGuestsList = !!(guestsDetailsObj && Array.isArray(guestsDetailsObj.list) && guestsDetailsObj.list.length > 0);
      const hasDirectContact = Boolean((res as any).guestPhone || (res as any).guestEmail || (res as any).guestName);
      const needsDetails = !hasGuestsList && !hasDirectContact;

      const shouldTryDetails = needsDetails
        && expandDetailsMode !== 'off'
        && (expandDetailsMode === 'on' || expandDetailsMode === 'auto')
        && detailsFetchBudget > 0;

      const detailPayload = shouldTryDetails
        ? (detailsFetchBudget--,
          (await fetchStaysReservationDetails(staysConfig.baseUrl, credentials, String(res._id || '').trim()) ||
            await fetchStaysReservationDetails(staysConfig.baseUrl, credentials, String((res as any).id || '').trim()) ||
            null))
        : null;

      const resFull: StaysNetReservation = detailPayload ? ({ ...res, ...detailPayload } as StaysNetReservation) : res;

      // Candidate fields for "created" timestamps in StaysNet payloads
      const sourceCreatedAtRaw =
        (res as any).createdAt ??
        (res as any).created_at ??
        (res as any).bookingDate ??
        (res as any).booking_date ??
        (res as any).reservationDate ??
        (res as any).reservation_date ??
        (res as any).dateCreated ??
        (res as any).date_created ??
        (res as any).createdOn ??
        (res as any).created_on ??
        (res as any).created;

      const sourceCreatedAtIso = parseOptionalDateToIso(sourceCreatedAtRaw);

      if (debug && debugSample.length < 8) {
        const keys = Object.keys(res || {});
        const listingRelatedKeys = keys.filter((k) => /listing|property/i.test(k)).slice(0, 40);
        const pick = (obj: any, k: string) => {
          const v = obj?.[k];
          if (v === null || v === undefined) return undefined;
          if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
          if (typeof v === 'object') {
            return {
              _id: v?._id,
              id: v?.id,
              keys: Object.keys(v || {}).slice(0, 15),
            };
          }
          return String(v);
        };

        const sample: any = {
          confirmationCode,
          externalId: (res._id || res.confirmationCode || null) as any,
          type: (res as any).type,
          sourceCreatedAtRaw,
          sourceCreatedAtIso,
          keys: keys.slice(0, 60),
          listingRelatedKeys,
          propertyId: (res as any).propertyId,
          _id_listing: (res as any)._id_listing,
          platform: (res as any).platform,
          source: (res as any).source,
          partner: (res as any).partner,
          partnerCode: (res as any).partnerCode,
          listingId: (res as any).listingId,
          listing_id: (res as any).listing_id,
          idListing: (res as any).idListing,
          _idListing: (res as any)._idListing,
          property: pick(res, 'property'),
          listing: pick(res, 'listing'),
        };

        for (const k of listingRelatedKeys) {
          if (sample[k] !== undefined) continue;
          sample[k] = pick(res, k);
        }

        debugSample.push(sample);
      }

      console.log(`\n[${i + 1}/${fetched}] 🏨 Processando: ${confirmationCode}`);

      try {
        // ====================================================================
        // 2.1: VALIDAR DADOS MÍNIMOS
        // ====================================================================
        // Tipos que NÃO devem virar reservas: usar import específico de blocks
        const typeLower = String((resFull as any).type || '').trim().toLowerCase();
        if (
          typeLower === 'blocked' ||
          typeLower === 'bloqueado' ||
          typeLower === 'maintenance' ||
          typeLower === 'manutenção' ||
          typeLower === 'manutencao'
        ) {
          console.warn(`   ⛔ Tipo=${typeLower} (não é reserva) - SKIP`);
          skipped++;
          continue;
        }

        if (!resFull.checkInDate || !resFull.checkOutDate) {
          console.warn(`   ⚠️ Sem datas de check-in/check-out - SKIP`);
          skipped++;
          continue;
        }

        const checkIn = new Date(resFull.checkInDate);
        const checkOut = new Date(resFull.checkOutDate);
        const nights = resFull.nights || Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

        if (nights < 1) {
          console.warn(`   ⚠️ Nights inválido: ${nights} - SKIP`);
          skipped++;
          continue;
        }

        // ====================================================================
        // 2.2: RESOLVER property_id (properties) ANTES DO DEDUP
        // ====================================================================
        // StaysNet pode enviar IDs do imóvel/listing em múltiplos campos (e às vezes dentro de objetos `listing/property`).
        // Usar um extrator robusto evita “reservas órfãs” por diferença de ID entre endpoints.
        const staysPropertyCandidates = extractStaysListingIdCandidates(resFull);
        let propertyId: string | null = null;

        for (const candidate of staysPropertyCandidates) {
          propertyId = await resolveAnuncioUltimateIdFromStaysId(supabase, organizationId, candidate);
          if (propertyId) break;
        }

        // ❌ IMPORTANTE: NÃO criar imóvel placeholder automaticamente.
        // Isso gerava cards “Propriedade Stays.net ...” sem endereço/quartos e poluía o Anúncio Ultimate.
        // Se a property não existir no Rendizy, a reserva é ignorada (o usuário deve importar imóveis primeiro).
        if (!propertyId && staysPropertyCandidates.length > 0) {
          const primaryStaysId = staysPropertyCandidates[0];
          console.warn(
            `   ⚠️ Property não encontrado no Rendizy para staysPropertyId=${primaryStaysId}. SKIP (sem criar anúncio placeholder)`
          );

          missingPropertyIssueAttempts++;
          const issueWrite = await upsertStaysnetImportIssueMissingPropertyMapping(supabase, {
            organizationId,
            externalId: asTextOrNull((resFull as any)._id ?? null),
            reservationCode: asTextOrNull((resFull as any).confirmationCode ?? (resFull as any).id ?? (resFull as any).reservationId ?? confirmationCode),
            listingId: String(primaryStaysId),
            listingCandidates: staysPropertyCandidates.map((x) => String(x)),
            checkInDate: asTextOrNull((resFull as any).checkInDate),
            checkOutDate: asTextOrNull((resFull as any).checkOutDate),
            partner: asTextOrNull((resFull as any).partner),
            platform: asTextOrNull((resFull as any).platform),
            rawPayload: resFull,
          });

          if (issueWrite.ok) {
            missingPropertyIssueWritten++;
          } else {
            missingPropertyIssueFailed++;
            missingPropertyIssueLastError = issueWrite.error || 'unknown_error';
          }

          // Auditoria: agregamos por listingId para facilitar o diagnóstico.
          skippedMissingPropertyMapping++;
          const key = String(primaryStaysId);
          const existingAgg = missingPropertyMappingByListingId.get(key);
          if (existingAgg) {
            existingAgg.count++;
            if (existingAgg.sampleReservations.length < 8) {
              existingAgg.sampleReservations.push({
                externalId: asTextOrNull((resFull as any)._id ?? (resFull as any).confirmationCode ?? confirmationCode),
                reservationCode: asTextOrNull((resFull as any).id ?? (resFull as any).reservationId ?? (resFull as any).confirmationCode),
                checkInDate: asTextOrNull((resFull as any).checkInDate),
                checkOutDate: asTextOrNull((resFull as any).checkOutDate),
                partner: asTextOrNull((resFull as any).partner),
                platform: asTextOrNull((resFull as any).platform),
              });
            }
          } else {
            missingPropertyMappingByListingId.set(key, {
              staysPropertyId: key,
              candidates: staysPropertyCandidates.map((x) => String(x)),
              count: 1,
              sampleReservations: [
                {
                  externalId: asTextOrNull((resFull as any)._id ?? (resFull as any).confirmationCode ?? confirmationCode),
                  reservationCode: asTextOrNull((resFull as any).id ?? (resFull as any).reservationId ?? (resFull as any).confirmationCode),
                  checkInDate: asTextOrNull((resFull as any).checkInDate),
                  checkOutDate: asTextOrNull((resFull as any).checkOutDate),
                  partner: asTextOrNull((resFull as any).partner),
                  platform: asTextOrNull((resFull as any).platform),
                },
              ],
            });
          }
          skipped++;
          continue;
        }

        // ====================================================================
        // 2.3: VERIFICAR SE JÁ EXISTE (deduplicação via external_id)
        // ====================================================================
        // ====================================================================
        // 2.3: VERIFICAR SE JÁ EXISTE (dedupe)
        // ====================================================================
        // Histórico: versões antigas salvaram `external_id` como confirmationCode,
        // enquanto versões novas preferem `res._id`. Para evitar duplicar no switch,
        // checamos múltiplos candidatos e também tentamos casar por `id` e por
        // `staysnet_reservation_code`.
        const staysReservationCodeForDedupe = asTextOrNull(
          (resFull as any).id ?? (resFull as any).reservationId ?? (resFull as any).confirmationCode,
        );

        const preferredExternalId = asTextOrNull(resFull._id) || asTextOrNull(resFull.confirmationCode) || asTextOrNull(confirmationCode);

        const dedupeCandidates = Array.from(
          new Set(
            [preferredExternalId, staysReservationCodeForDedupe, asTextOrNull(resFull.confirmationCode), asTextOrNull(confirmationCode)]
              .filter(Boolean)
              .map((x) => String(x))
          )
        );

        const externalUrl = (resFull as any).reservationUrl || null;

        let existing: any = null;
        let checkError: any = null;

        // 1) Tenta dedupe por external_id
        if (!existing && dedupeCandidates.length > 0) {
          const resExisting = await supabase
            .from('reservations')
            .select('id, property_id, external_url, guest_id, external_id')
            .eq('organization_id', organizationId)
            .in('external_id', dedupeCandidates)
            .order('updated_at', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          existing = resExisting.data;
          checkError = resExisting.error;
        }

        // 2) Tenta dedupe por id (alguns ambientes salvaram confirmationCode no id)
        if (!existing && !checkError && dedupeCandidates.length > 0) {
          const resExisting = await supabase
            .from('reservations')
            .select('id, property_id, external_url, guest_id, external_id')
            .eq('organization_id', organizationId)
            .in('id', dedupeCandidates)
            .order('updated_at', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          existing = resExisting.data;
          checkError = resExisting.error;
        }

        // 3) Tenta dedupe por staysnet_reservation_code (casos onde o código foi persistido separado)
        if (!existing && !checkError && dedupeCandidates.length > 0) {
          const resExisting = await supabase
            .from('reservations')
            .select('id, property_id, external_url, guest_id, external_id')
            .eq('organization_id', organizationId)
            .in('staysnet_reservation_code', dedupeCandidates)
            .order('updated_at', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          existing = resExisting.data;
          checkError = resExisting.error;
        }

        const externalId = preferredExternalId || existing?.external_id || null;

        if (checkError) {
          console.error(`   ❌ Erro ao verificar duplicação:`, checkError.message);
        }

        // ✅ Contrato canônico (multi-canal):
        // - `reservations.id` é SEMPRE um UUID interno do Rendizy (string)
        // - A identidade externa é (organization_id, platform, external_id)
        // - Para Stays, `external_id` preferencialmente é o `_id` interno (estável)
        const reservationId = existing?.id || crypto.randomUUID();

        // 🔒 BLINDAGEM: se não conseguimos resolver o imóvel, NÃO salvar reserva.
        // Se já existe uma reserva órfã (property_id nulo/inválido), deletar para não poluir números.
        const finalPropertyId = propertyId || existing?.property_id || null;
        if (!finalPropertyId) {
          if (existing?.id) {
            console.warn(`   🧹 Reserva órfã detectada (id=${existing.id}) - removendo`);
            await supabase
              .from('reservations')
              .delete()
              .eq('organization_id', organizationId)
              .eq('id', existing.id);
          }
          console.warn(`   ⚠️ Sem property_id válido - SKIP (sem criar reserva fantasma)`);
          skipped++;
          continue;
        }
        const finalExternalUrl = externalUrl || existing?.external_url || null;

        // ✅ Vincular guest automaticamente quando possível
        let finalGuestId = existing?.guest_id || null;
        if (!finalGuestId) {
          finalGuestId = await resolveOrCreateGuestIdFromStaysReservation(supabase as any, organizationId, resFull);
        }

        // ====================================================================
        // 2.4: PREPARAR DADOS (flat structure)
        // ====================================================================
        // ✅ FIX: Não gerar ID customizado - Postgres auto-gera UUID
        
        // ✅ FIX: Stays pode enviar:
        // - guests: number (total)
        // - guestsDetails: {adults,children,infants,pets}
        // - guests: {adults,children,...}
        const guestsDetails = (resFull as any).guestsDetails || (resFull as any).guests_details || null;
        const guestsTotalFromNumber = typeof (resFull as any).guests === 'number' ? Number((resFull as any).guests) : Number.NaN;

        const guestsAdults = safeInt(
          guestsDetails?.adults ?? res.guests?.adults ?? (Number.isFinite(guestsTotalFromNumber) ? guestsTotalFromNumber : undefined) ?? 1,
          1,
        );
        const guestsChildren = safeInt(guestsDetails?.children ?? res.guests?.children, 0);
        const guestsInfants = safeInt(guestsDetails?.infants ?? res.guests?.infants, 0);
        const guestsPets = safeInt(guestsDetails?.pets ?? res.guests?.pets, 0);
        const guestsTotal = safeInt(
          guestsDetails?.total ?? res.guests?.total ?? (Number.isFinite(guestsTotalFromNumber) ? guestsTotalFromNumber : guestsAdults),
          1,
        );

        const priceObj = (res as any).price;

        // OBS: os campos pricing_* na tabela reservations são NUMERIC(10,2).
        // O Stays pode enviar strings/objetos com decimais, então normalizamos para centavos e gravamos com 2 casas.
        const hostingDetails = priceObj && typeof priceObj === 'object' ? (priceObj as any).hostingDetails : null;
        const pricePerNightCents = parseMoneyCents(
          resFull.pricePerNight ??
            pickMoneyFromObject(hostingDetails, ['_f_nightPrice', '_f_night_price', 'nightPrice', 'night_price', 'pricePerNight', 'price_per_night'], Number.NaN) ??
            pickMoneyFromObject(priceObj, ['pricePerNight', 'price_per_night', 'perNight', 'per_night'], 0),
          0,
        );

        // No payload real observado:
        // - price._f_expected = base/expected total
        // - price._f_total = total final
        const expectedTotalCents = parseMoneyCents(
          pickMoneyFromObject(priceObj, ['_f_expected', 'expected', 'expectedTotal', 'expected_total', 'baseTotal', 'base_total', 'base', 'accommodation', 'accommodationTotal', 'accommodation_total'], Number.NaN),
          Number.NaN,
        );

        const totalFromStaysCents = parseMoneyCents(
          pickMoneyFromObject(priceObj, ['_f_total', 'total', 'grandTotal', 'grand_total'], Number.NaN),
          Number.NaN,
        );

        const cleaningFeeCents = parseMoneyCents(
          resFull.cleaningFee ?? pickMoneyFromObject(priceObj, ['cleaningFee', 'cleaning_fee', 'cleaning'], 0),
          0,
        );

        const serviceFeeCents = parseMoneyCents(
          resFull.serviceFee ?? pickMoneyFromObject(priceObj, ['serviceFee', 'service_fee', 'service'], 0),
          0,
        );

        const taxesCents = parseMoneyCents(
          resFull.taxes ?? pickMoneyFromObject(priceObj, ['taxes', 'tax', 'vat'], 0),
          0,
        );

        const discountCents = parseMoneyCents(
          resFull.discount ?? pickMoneyFromObject(priceObj, ['discount', 'discounts', 'coupon', 'promotion'], 0),
          0,
        );

        const resolvedBaseTotalCents = Number.isFinite(expectedTotalCents)
          ? expectedTotalCents
          : pricePerNightCents * nights;

        const computedTotalCents = resolvedBaseTotalCents + cleaningFeeCents + serviceFeeCents + taxesCents - discountCents;
        const totalCents = Number.isFinite(totalFromStaysCents) ? totalFromStaysCents : computedTotalCents;

        // ✅ FIX: Salvar valores em CENTAVOS no banco (INTEGER columns)
        // A conversão para reais acontece na leitura (utils-reservation-mapper.ts)
        const pricePerNight = pricePerNightCents;
        const resolvedBaseTotal = resolvedBaseTotalCents;
        const cleaningFee = cleaningFeeCents;
        const serviceFee = serviceFeeCents;
        const taxes = taxesCents;
        const discount = discountCents;
        const total = totalCents;

        const rawType =
          (resFull as any).type ??
          (resFull as any).reservationType ??
          (resFull as any).typeReservation ??
          (resFull as any).tipo ??
          (resFull as any).tipoReserva ??
          null;

        const partnerObj = (resFull as any).partner && typeof (resFull as any).partner === 'object' ? (resFull as any).partner : null;
        const staysPartnerId = asTextOrNull(partnerObj?._id);
        const staysPartnerName = asTextOrNull(partnerObj?.name ?? (resFull as any).partner);

        const staysReservationCode = asTextOrNull((resFull as any).id ?? (resFull as any).reservationId ?? (resFull as any).confirmationCode);
        const staysPartnerCode = asTextOrNull((resFull as any).partnerCode);
        const staysClientId = asTextOrNull((resFull as any)._idclient);
        const staysListingId = asTextOrNull((resFull as any)._idlisting ?? (resFull as any)._id_listing ?? (resFull as any).propertyId);

        const rawStatus =
          (resFull as any).status ??
          (resFull as any).reservationStatus ??
          (resFull as any).statusReservation ??
          (resFull as any).bookingStatus ??
          (resFull as any).status_reservation ??
          (resFull as any).reservation_status ??
          null;

        const derivedStatus = deriveReservationStatus({
          type: rawType,
          status: rawStatus,
        });

        const cancellationAtIso =
          parseOptionalDateToIso(
            resFull.cancelledAt ??
              (resFull as any).cancellationDate ??
              (resFull as any).cancelDate ??
              (resFull as any).cancelled_at ??
              (resFull as any).canceledAt ??
              (resFull as any).cancellation_at,
          ) ?? (derivedStatus === 'cancelled' ? new Date().toISOString() : null);

        const cancellationReason =
          (resFull as any).cancellationReason ??
          (resFull as any).cancellation_reason ??
          (resFull as any).cancelReason ??
          (resFull as any).cancel_reason ??
          null;

        const reservationData = {
          // Identificadores
          id: reservationId, // TEXT PRIMARY KEY (UUID string)
          organization_id: organizationId,
          property_id: finalPropertyId,
          guest_id: finalGuestId, // ✅ preservar se já foi populado por import-staysnet-guests.ts

          // Datas
          check_in: checkIn.toISOString().split('T')[0],
          check_out: checkOut.toISOString().split('T')[0],
          nights: nights,

          // Hóspedes (flat structure) - ✅ FIX: Agora são INTEGER
          guests_adults: guestsAdults,
          guests_children: guestsChildren,
          guests_infants: guestsInfants,
          guests_pets: guestsPets,
          guests_total: guestsTotal,

          // Precificação (flat structure)
          pricing_price_per_night: pricePerNight,
          pricing_base_total: resolvedBaseTotal,
          pricing_cleaning_fee: cleaningFee,
          pricing_service_fee: serviceFee,
          pricing_taxes: taxes,
          pricing_discount: discount,
          pricing_total: total,
          pricing_currency: (resFull.currency || (priceObj && typeof priceObj === 'object' ? (priceObj as any).currency : null) || 'BRL') as any,

          // Status
          status: derivedStatus,

          // Plataforma
          platform: mapPlatformV2({
            staysPlatform: resFull.platform,
            source: resFull.source,
            // Evita "[object Object]" quando partner é objeto.
            partner: staysPartnerName ?? (resFull as any).partner,
            partnerCode: staysPartnerCode ?? (resFull as any).partnerCode,
          }),
          external_id: externalId,
          external_url: finalExternalUrl,

          // Stays derivado (facilita conciliação sem depender de JSONB)
          staysnet_listing_id: staysListingId,
          staysnet_client_id: staysClientId,
          staysnet_reservation_code: staysReservationCode,
          staysnet_partner_code: staysPartnerCode,
          staysnet_partner_id: staysPartnerId,
          staysnet_partner_name: staysPartnerName,
          staysnet_type: asTextOrNull(rawType),

          // Pagamento
          payment_status: mapPaymentStatus(res.paymentStatus, 'pending'),
          payment_method: resFull.paymentMethod || null,

          // Comunicação
          notes: resFull.notes || null,
          special_requests: resFull.specialRequests || null,

          // Check-in/out times
          check_in_time: resFull.checkInTime || null,
          check_out_time: resFull.checkOutTime || null,

          // Cancelamento
          cancelled_at: cancellationAtIso,
          cancellation_reason: cancellationReason,

          // 🔒 Persistência completa do payload de origem (audit/debug)
          staysnet_raw: resFull,

          // Metadata
          created_by: DEFAULT_USER_ID,
          source_created_at: sourceCreatedAtIso,
          confirmed_at: derivedStatus === 'confirmed' ? new Date().toISOString() : null
        };

        // ====================================================================
        // 2.5: UPSERT NA TABELA reservations (idempotente)
        // ====================================================================
        console.log(`   ♻️ Persist reservation (property_id: ${propertyId || 'NULL'})...`);

        const persistReservationRow = async (payload: any) => {
          const byId = async (id: string) => {
            const updatePayload = { ...payload };
            delete updatePayload.id;
            return await supabase
              .from('reservations')
              .update(updatePayload)
              .eq('id', id)
              .eq('organization_id', organizationId)
              .select('id')
              .single();
          };

          const findByCanonicalKey = async () => {
            const ext = payload?.external_id;
            const plat = payload?.platform;
            if (!ext || !plat) return null;
            const found = await supabase
              .from('reservations')
              .select('id')
              .eq('organization_id', organizationId)
              .eq('platform', plat)
              .eq('external_id', ext)
              .maybeSingle();
            return found.data as any;
          };

          // Preferir sempre a linha canônica quando ela existir.
          // Isso evita violação do UNIQUE ao tentar "canonicalizar" um registro legado
          // cujo external_id já está ocupado por outra linha.
          const canonical = await findByCanonicalKey();
          if (canonical?.id) {
            return await byId(String(canonical.id));
          }

          // Se já achamos um registro legado (por external_id/id/staysnet_reservation_code),
          // atualiza por `id` para evitar colisões em reservations_pkey.
          if (existing?.id) {
            return await byId(String(existing.id));
          }

          // Inserção “fresh” (id UUID interno). Em corrida, podemos bater em unique e aí fazemos update.
          let inserted = await supabase.from('reservations').insert(payload).select('id').single();

          const anyErr = inserted.error as any;
          if (anyErr?.code === '23505') {
            const canonicalAfter = await findByCanonicalKey();
            if (canonicalAfter?.id) {
              inserted = await byId(String(canonicalAfter.id));
            }
          }

          return inserted;
        };

        let { data: upsertedReservation, error: upsertError } = await persistReservationRow(reservationData);

        // Compat: alguns ambientes ainda têm colunas monetárias como INTEGER (centavos).
        // Se tentarmos gravar "652.41" em INTEGER, o Postgres retorna:
        //   invalid input syntax for type integer: "652.41"
        // Para preservar centavos EXATOS, re-tentamos salvando em centavos inteiros.
        if (upsertError && /invalid input syntax for type\s+integer/i.test(upsertError.message || '')) {
          console.warn(
            `⚠️ Banco parece esperar valores monetários como INTEGER (centavos). Re-tentando upsert com centavos inteiros...`,
          );

          const reservationDataCents: any = {
            ...(reservationData as any),
            pricing_price_per_night: pricePerNightCents,
            pricing_base_total: resolvedBaseTotalCents,
            pricing_cleaning_fee: cleaningFeeCents,
            pricing_service_fee: serviceFeeCents,
            pricing_taxes: taxesCents,
            pricing_discount: discountCents,
            pricing_total: totalCents,
          };

          const retry = await persistReservationRow(reservationDataCents);

          upsertedReservation = retry.data as any;
          upsertError = retry.error as any;
        }

        // Compat: se migrations ainda não foram aplicadas, não quebrar o import inteiro.
        // =====================================================================
        // COMPAT: Se uma coluna não existe, remove APENAS ela e faz retry.
        // 🐛 FIX (2026-01-18): O regex antigo era muito genérico e podia remover
        // colunas que NÃO estavam faltando (ex: staysnet_reservation_code ficava NULL).
        // AGORA: Usa regex mais específico para extrair APENAS a coluna mencionada.
        // =====================================================================
        if (upsertError && /column[^"]*"([^"]+)"[^"]*does not exist/i.test(upsertError.message)) {
          const msg = String(upsertError.message || '');
          
          // Extrai o nome EXATO da coluna do erro (ex: "column "staysnet_type" does not exist")
          const colMatch = msg.match(/column[^"]*"([^"]+)"[^"]*does not exist/i);
          const missingColumn = colMatch?.[1];
          
          if (missingColumn && (reservationData as any)[missingColumn] !== undefined) {
            console.warn(`⚠️ Coluna ausente no banco: "${missingColumn}". Rode as migrations; import seguirá sem esse campo por enquanto.`);

            const reservationDataCompat: any = { ...(reservationData as any) };
            delete reservationDataCompat[missingColumn];

            const retry = await persistReservationRow(reservationDataCompat);
            upsertedReservation = retry.data as any;
            upsertError = retry.error as any;
          }
        }

        if (upsertError) {
          const anyErr = upsertError as any;
          const meta = {
            code: anyErr?.code,
            details: anyErr?.details,
            hint: anyErr?.hint,
          };
          throw new Error(`Falha ao upsert reservation: ${upsertError.message} | meta: ${JSON.stringify(meta)}`);
        }

        // ✅ Sustentável: se antes essa reserva caiu em "missing_property_mapping",
        // marcar como resolvida automaticamente quando ela finalmente entra.
        await resolveStaysnetImportIssueForReservation(supabase, {
          organizationId,
          externalId: asTextOrNull(externalId),
          reservationCode: staysReservationCodeForDedupe,
        });

        // ====================================================================
        // 2.6: Persistência do JSON bruto (tudo) em tabela dedicada
        // ====================================================================
        // Não torna o import inválido se falhar (ex: migration ainda não aplicada).
        try {
          const store = await storeStaysnetRawObject({
            supabase,
            organizationId,
            domain: 'reservations',
            externalId: resFull._id,
            externalCode: (resFull as any).id ?? null,
            endpoint: '/booking/reservations',
            payload: resFull,
            fetchedAtIso: new Date().toISOString(),
          });
          if (!store.ok) {
            console.warn(`⚠️ Falha ao salvar staysnet_raw_objects (reservations): ${store.error}`);
          }
        } catch (e) {
          console.warn(`⚠️ Falha inesperada ao salvar staysnet_raw_objects (reservations): ${e instanceof Error ? e.message : String(e)}`);
        }

        if (!upsertedReservation?.id) {
          throw new Error('Falha ao upsert reservation: retorno vazio (sem id)');
        }

        console.log(`   ✅ Reservation salva: ${upsertedReservation.id}`);
        saved++;
        if (existing) {
          updated++;
        } else {
          created++;
        }

      } catch (err: any) {
        console.error(`   ❌ Erro ao salvar ${confirmationCode}:`, err.message);
        errors++;
        errorDetails.push({
          reservation: confirmationCode,
          error: err.message
        });
      }
    }

    // ========================================================================
    // STEP 3: RESULTADO FINAL
    // ========================================================================
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 RESULTADO FINAL - IMPORT RESERVATIONS');
    console.log('═══════════════════════════════════════════════════');
    console.log(`   Fetched:  ${fetched}`);
    console.log(`   Saved:    ${saved}`);
    console.log(`   Skipped:  ${skipped}`);
    console.log(`   Errors:   ${errors}`);
    console.log('═══════════════════════════════════════════════════\n');

    if (errors > 0) {
      console.error('❌ ERROS DETALHADOS:');
      errorDetails.forEach((err, idx) => {
        console.error(`   ${idx + 1}. ${err.reservation}: ${err.error}`);
      });
    }

    return c.json({
      // success = true se salvou algo, ou se não houve erro e não havia nada para importar
      success: saved > 0 || (fetched === 0 && errors === 0),
      method: 'import-reservations',
      table: 'reservations',
      stats: {
        fetched,
        saved,
        created,
        updated,
        skipped,
        skippedMissingPropertyMapping,
        missingPropertyIssueAttempts,
        missingPropertyIssueWritten,
        missingPropertyIssueFailed,
        missingPropertyIssueLastError,
        errors,
        ...(filterBySelectedProperties ? { fetchedFromApi, skippedBySelection } : {}),
      },
      next: { skip, hasMore },
      errorDetails: errors > 0 ? errorDetails : undefined,
      debugSample: debug ? debugSample : undefined,
      missingPropertyMappings: debug
        ? Array.from(missingPropertyMappingByListingId.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 50)
        : undefined,
      message: `Importados ${saved}/${fetched} reservations de StaysNet (skipped: ${skipped})`
    });

  } catch (error: any) {
    console.error('\n❌❌❌ ERRO GERAL NO IMPORT ❌❌❌');
    console.error('Erro:', error.message);
    console.error('Stack:', error.stack);
    
    return c.json({
      success: false,
      method: 'import-reservations',
      error: error.message,
      stats: { fetched, saved, skipped, errors },
      next: { skip, hasMore: false }
    }, 500);
  }
}
