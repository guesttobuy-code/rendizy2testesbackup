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
      console.log(`   ✅ Property vinculado (anuncios_ultimate via ${l.label}): ${row.id}`);
      return row.id;
    }
  }

  return null;
}

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000';
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000002';
const FALLBACK_PROPERTY_ID = '00000000-0000-0000-0000-000000000001'; // Property padrão quando não encontrar

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

  try {
    // ✅ Preferir organization_id real do usuário (via sessions)
    // ⚠️ IMPORTANTE: se há token de usuário, NÃO pode cair no DEFAULT_ORG_ID
    // senão a UI “importa” mas grava no tenant errado (parece que não importou).
    const cookieHeader = c.req.header('Cookie') || '';
    const hasUserToken = Boolean(c.req.header('X-Auth-Token') || cookieHeader.includes('rendizy-token='));

    let organizationId = DEFAULT_ORG_ID;
    if (hasUserToken) {
      organizationId = await getOrganizationIdOrThrow(c);
    } else {
      try {
        organizationId = await getOrganizationIdOrThrow(c);
      } catch {
        // sem sessão/token → mantém DEFAULT_ORG_ID (compat chamadas técnicas)
      }
    }

    // ========================================================================
    // STEP 1: BUSCAR RESERVATIONS DA API STAYSNET
    // ========================================================================
    console.log('📡 [FETCH] Buscando reservations de /booking/reservations...');
    
    // ✅ CORREÇÃO: API exige from, to, dateType (não startDate/endDate)
    // Default: últimos 12 meses e próximos 12 meses (override via querystring ou body)
    const body: any = await c.req.json().catch(() => ({}));

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
    const expandDetails = String(c.req.query('expandDetails') || body?.expandDetails || '1').trim() !== '0';
    const rawTypes = normalizeReservationTypes(body?.types ?? body?.type ?? c.req.query('types') ?? c.req.query('type'));
    const types = rawTypes.length > 0 ? rawTypes : ['reserved', 'booked', 'contract'];
    if (includeCanceled && !types.includes('canceled')) types.push('canceled');

    console.log(`   📅 Período: ${from} até ${to}`);
    console.log(`   📌 dateType: ${dateType} (raw=${rawDateType})`);
    console.log(`   🧾 types: ${types.join(',')}`);
    console.log(`   📄 Paginação: limit=${limit}, maxPages=${maxPages}`);

    // ✅ Carregar config Stays.net (DB → global → env)
    const staysConfig = await loadStaysNetRuntimeConfigOrThrow(organizationId);
    const credentials = btoa(`${staysConfig.apiKey}:${staysConfig.apiSecret}`);

    const allReservations: StaysNetReservation[] = [];
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
        params.append('type', t);
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

      allReservations.push(...pageData);

      console.log(`   📥 Página ${pages + 1}: ${pageData.length} itens (total=${allReservations.length})`);

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
    console.log(`✅ [FETCH] ${fetched} reservations recebidas\n`);

    if (fetched === 0) {
      return c.json({
        success: true,
        method: 'import-reservations',
        stats: { fetched: 0, saved: 0, errors: 0, skipped: 0 },
        next: { skip: startSkip, hasMore: false },
        message: 'Nenhuma reservation encontrada na API StaysNet'
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

      const detailPayload = (expandDetails && needsDetails)
        ? (await fetchStaysReservationDetails(staysConfig.baseUrl, credentials, String(res._id || '').trim()) ||
            await fetchStaysReservationDetails(staysConfig.baseUrl, credentials, String((res as any).id || '').trim()) ||
            null)
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
        // 2.2: RESOLVER property_id (anuncios_ultimate) ANTES DO DEDUP
        // ====================================================================
        // 2.2: RESOLVER property_id (anuncios_ultimate) ANTES DO DEDUP
        // StaysNet envia o ID do imóvel/listing como _idlisting (principal). Mantemos compatibilidade com variantes.
        const staysPropertyCandidates = [
          (resFull as any)._idlisting,
          resFull._id_listing,
          resFull.propertyId,
        ].filter(Boolean) as string[];
        let propertyId: string | null = null;

        for (const candidate of staysPropertyCandidates) {
          propertyId = await resolveAnuncioUltimateIdFromStaysId(supabase, organizationId, candidate);
          if (propertyId) break;
        }

        // Último fallback: criar um imóvel básico para não deixar reserva órfã
        if (!propertyId && staysPropertyCandidates.length > 0) {
          const primaryStaysId = staysPropertyCandidates[0];
          console.warn(`   ⚠️ Property não encontrado para staysPropertyId=${primaryStaysId}. Criando placeholder em anuncios_ultimate...`);

          const { data: newUltimate, error: createUltimateError } = await supabase
            .from('anuncios_ultimate')
            .insert({
              organization_id: organizationId,
              user_id: DEFAULT_USER_ID,
              status: 'created',
              data: {
                title: `Propriedade Stays.net ${primaryStaysId}`,
                status: 'active',
                ativo: true,
                codigo: primaryStaysId,
                externalIds: {
                  staysnet_property_id: primaryStaysId,
                },
                staysnet_raw: {
                  _id: primaryStaysId,
                },
              },
            })
            .select('id')
            .single();

          if (createUltimateError) {
            console.warn(`   ⚠️ Falha ao criar placeholder em anuncios_ultimate: ${createUltimateError.message}`);
          } else {
            propertyId = newUltimate?.id || null;
            if (propertyId) {
              console.log(`   ✅ Placeholder criado e vinculado: ${propertyId}`);
            }
          }
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
        const finalPropertyId = propertyId || existing?.property_id || FALLBACK_PROPERTY_ID;
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

        const pricePerNight = centsToMoney2(pricePerNightCents);
        const resolvedBaseTotal = centsToMoney2(resolvedBaseTotalCents);
        const cleaningFee = centsToMoney2(cleaningFeeCents);
        const serviceFee = centsToMoney2(serviceFeeCents);
        const taxes = centsToMoney2(taxesCents);
        const discount = centsToMoney2(discountCents);
        const total = centsToMoney2(totalCents);

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
          property_id: finalPropertyId, // ✅ manter vinculação existente se ainda não resolver property
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
        console.log(`   ♻️ Upsert reservation (property_id: ${propertyId || 'NULL'})...`);

        let { data: upsertedReservation, error: upsertError } = await supabase
          .from('reservations')
          .upsert(reservationData, { onConflict: 'organization_id,platform,external_id' })
          .select('id')
          .single();

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

          const retry = await supabase
            .from('reservations')
            .upsert(reservationDataCents, { onConflict: 'organization_id,platform,external_id' })
            .select('id')
            .single();

          upsertedReservation = retry.data as any;
          upsertError = retry.error as any;
        }

        // Compat: se migrations ainda não foram aplicadas, não quebrar o import inteiro.
        if (upsertError && /does not exist/i.test(upsertError.message)) {
          const msg = String(upsertError.message || '');
          const dropKeys: string[] = [];
          const candidates = [
            'source_created_at',
            'staysnet_raw',
            'staysnet_listing_id',
            'staysnet_client_id',
            'staysnet_reservation_code',
            'staysnet_partner_code',
            'staysnet_partner_id',
            'staysnet_partner_name',
            'staysnet_type',
          ];

          for (const k of candidates) {
            if (new RegExp(String(k), 'i').test(msg)) dropKeys.push(k);
          }

          if (dropKeys.length > 0) {
            console.warn(`⚠️ Colunas ausentes no banco (${dropKeys.join(', ')}). Rode as migrations; import seguirá sem esses campos por enquanto.`);

            const reservationDataCompat: any = { ...(reservationData as any) };
            for (const k of dropKeys) delete reservationDataCompat[k];

            const retry = await supabase
              .from('reservations')
              .upsert(reservationDataCompat, { onConflict: 'organization_id,platform,external_id' })
              .select('id')
              .single();
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
      success: errors < fetched, // success = true se pelo menos 1 salvou
      method: 'import-reservations',
      table: 'reservations',
      stats: { fetched, saved, created, updated, skipped, errors },
      next: { skip, hasMore },
      errorDetails: errors > 0 ? errorDetails : undefined,
      debugSample: debug ? debugSample : undefined,
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
