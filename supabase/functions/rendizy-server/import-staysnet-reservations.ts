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

async function resolveAnuncioDraftIdFromStaysId(
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
      .from('anuncios_drafts')
      .select('id')
      .eq('organization_id', organizationId)
      .contains('data', l.needle)
      .maybeSingle();

    if (error) {
      console.warn(`   ⚠️ Erro ao buscar anuncios_drafts via ${l.label}: ${error.message}`);
      continue;
    }

    if (row?.id) {
      console.log(`   ✅ Property vinculado (anuncios_drafts via ${l.label}): ${row.id}`);
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

function parseMoneyInt(value: any, fallback = 0): number {
  const n = parseMoney(value, Number.NaN);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n);
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
  staysPlatform?: string;
  source?: string;
  partner?: string;
  partnerCode?: string;
}): string {
  const raw = [input.staysPlatform, input.source, input.partner, input.partnerCode]
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
    // ✅ Preferir organization_id real do usuário (via sessions); fallback mantém compatibilidade com chamadas técnicas.
    let organizationId = DEFAULT_ORG_ID;
    try {
      organizationId = await getOrganizationIdOrThrow(c);
    } catch {
      // sem sessão/token → mantém DEFAULT_ORG_ID
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
    // A API da StaysNet tende a falhar com `limit` muito alto.
    // Permitimos um aumento moderado (até 50) para reduzir batches, e o controle de volume
    // continua via `maxPages` + timeouts do caller.
    const limit = Math.min(50, Math.max(1, Number(c.req.query('limit') || body?.limit || 20)));
    // ✅ Segurança anti-timeout: default de poucas páginas. O caller pode continuar via `next.skip`.
    const maxPages = Math.max(1, Number(c.req.query('maxPages') || body?.maxPages || 5));

    // ✅ IMPORTAR todos os tipos “em vigor” por padrão.
    // No Stays, o filtro “Em vigor” normalmente inclui reserved/booked/contract.
    // Se não passarmos type, algumas contas retornam subconjunto.
    const includeCanceled = String(c.req.query('includeCanceled') || body?.includeCanceled || '').trim() === '1';
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
        const typeLower = String((res as any).type || '').trim().toLowerCase();
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

        if (!res.checkInDate || !res.checkOutDate) {
          console.warn(`   ⚠️ Sem datas de check-in/check-out - SKIP`);
          skipped++;
          continue;
        }

        const checkIn = new Date(res.checkInDate);
        const checkOut = new Date(res.checkOutDate);
        const nights = res.nights || Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

        if (nights < 1) {
          console.warn(`   ⚠️ Nights inválido: ${nights} - SKIP`);
          skipped++;
          continue;
        }

        // ====================================================================
        // 2.2: RESOLVER property_id (anuncios_drafts) ANTES DO DEDUP
        // ====================================================================
        // StaysNet envia o ID do imóvel/listing como _idlisting (principal). Mantemos compatibilidade com variantes.
        const staysPropertyCandidates = [
          (res as any)._idlisting,
          res._id_listing,
          res.propertyId,
        ].filter(Boolean) as string[];
        let propertyId: string | null = null;

        for (const candidate of staysPropertyCandidates) {
          propertyId = await resolveAnuncioDraftIdFromStaysId(supabase, organizationId, candidate);
          if (propertyId) break;
        }

        // Último fallback: criar um imóvel básico para não deixar reserva órfã
        if (!propertyId && staysPropertyCandidates.length > 0) {
          const primaryStaysId = staysPropertyCandidates[0];
          console.warn(`   ⚠️ Property não encontrado para staysPropertyId=${primaryStaysId}. Criando placeholder em anuncios_drafts...`);

          const { data: newDraft, error: createDraftError } = await supabase
            .from('anuncios_drafts')
            .insert({
              organization_id: organizationId,
              user_id: DEFAULT_USER_ID,
              // manter compatível com schema real (title pode ser null)
              title: null,
              status: 'draft',
              completion_percentage: 0,
              step_completed: 0,
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

          if (createDraftError) {
            console.warn(`   ⚠️ Falha ao criar placeholder em anuncios_drafts: ${createDraftError.message}`);
          } else {
            propertyId = newDraft?.id || null;
            if (propertyId) {
              console.log(`   ✅ Placeholder criado e vinculado: ${propertyId}`);
            }
          }
        }

        // ====================================================================
        // 2.3: VERIFICAR SE JÁ EXISTE (deduplicação via external_id)
        // ====================================================================
        const externalId = res._id || res.confirmationCode;
        const externalUrl = (res as any).reservationUrl || null;

        const { data: existing, error: checkError } = await supabase
          .from('reservations')
          .select('id, property_id, external_url, guest_id')
          .eq('organization_id', organizationId)
          .eq('external_id', externalId)
          .maybeSingle();

        if (checkError) {
          console.error(`   ❌ Erro ao verificar duplicação:`, checkError.message);
        }

        // ✅ Idempotência: se já existe (por external_id), atualizar ao invés de pular.
        // Importações repetidas precisam refletir mudanças de status/datas/preços.
        const reservationId = existing?.id || confirmationCode;
        const finalPropertyId = propertyId || existing?.property_id || FALLBACK_PROPERTY_ID;
        const finalExternalUrl = externalUrl || existing?.external_url || null;

        // ✅ Vincular guest automaticamente quando possível
        let finalGuestId = existing?.guest_id || null;
        if (!finalGuestId) {
          finalGuestId = await resolveOrCreateGuestIdFromStaysReservation(supabase as any, organizationId, res);
        }

        // ====================================================================
        // 2.4: PREPARAR DADOS (flat structure)
        // ====================================================================
        // ✅ FIX: Não gerar ID customizado - Postgres auto-gera UUID
        
        // ✅ FIX: Stays pode enviar:
        // - guests: number (total)
        // - guestsDetails: {adults,children,infants,pets}
        // - guests: {adults,children,...}
        const guestsDetails = (res as any).guestsDetails || (res as any).guests_details || null;
        const guestsTotalFromNumber = typeof (res as any).guests === 'number' ? Number((res as any).guests) : Number.NaN;

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

        // OBS: em produção, os campos pricing_* são INTEGER. O Stays pode enviar decimais ("813.38"),
        // então normalizamos para inteiro (arredondado) para evitar erro de cast no Postgres.
        const hostingDetails = priceObj && typeof priceObj === 'object' ? (priceObj as any).hostingDetails : null;
        const pricePerNight = parseMoneyInt(
          res.pricePerNight ??
            pickMoneyFromObject(hostingDetails, ['_f_nightPrice', '_f_night_price', 'nightPrice', 'night_price', 'pricePerNight', 'price_per_night'], Number.NaN) ??
            pickMoneyFromObject(priceObj, ['pricePerNight', 'price_per_night', 'perNight', 'per_night'], 0),
          0,
        );

        // No payload real observado:
        // - price._f_expected = base/expected total
        // - price._f_total = total final
        const expectedTotal = parseMoney(
          pickMoneyFromObject(priceObj, ['_f_expected', 'expected', 'expectedTotal', 'expected_total', 'baseTotal', 'base_total', 'base', 'accommodation', 'accommodationTotal', 'accommodation_total'], Number.NaN),
          Number.NaN,
        );

        const totalFromStays = parseMoney(
          pickMoneyFromObject(priceObj, ['_f_total', 'total', 'grandTotal', 'grand_total'], Number.NaN),
          Number.NaN,
        );

        const cleaningFee = parseMoneyInt(
          res.cleaningFee ?? pickMoneyFromObject(priceObj, ['cleaningFee', 'cleaning_fee', 'cleaning'], 0),
          0,
        );

        const serviceFee = parseMoneyInt(
          res.serviceFee ?? pickMoneyFromObject(priceObj, ['serviceFee', 'service_fee', 'service'], 0),
          0,
        );

        const taxes = parseMoneyInt(
          res.taxes ?? pickMoneyFromObject(priceObj, ['taxes', 'tax', 'vat'], 0),
          0,
        );

        const discount = parseMoneyInt(
          res.discount ?? pickMoneyFromObject(priceObj, ['discount', 'discounts', 'coupon', 'promotion'], 0),
          0,
        );

        const resolvedBaseTotal = Number.isFinite(expectedTotal)
          ? Math.round(expectedTotal)
          : pricePerNight * nights;

        const computedTotal = resolvedBaseTotal + cleaningFee + serviceFee + taxes - discount;
        const total = Number.isFinite(totalFromStays) ? Math.round(totalFromStays) : computedTotal;

        const rawType =
          (res as any).type ??
          (res as any).reservationType ??
          (res as any).typeReservation ??
          (res as any).tipo ??
          (res as any).tipoReserva ??
          null;

        const partnerObj = (res as any).partner && typeof (res as any).partner === 'object' ? (res as any).partner : null;
        const staysPartnerId = asTextOrNull(partnerObj?._id);
        const staysPartnerName = asTextOrNull(partnerObj?.name ?? (res as any).partner);

        const staysReservationCode = asTextOrNull((res as any).id ?? (res as any).reservationId ?? (res as any).confirmationCode);
        const staysPartnerCode = asTextOrNull((res as any).partnerCode);
        const staysClientId = asTextOrNull((res as any)._idclient);
        const staysListingId = asTextOrNull((res as any)._idlisting ?? (res as any)._id_listing ?? (res as any).propertyId);

        const rawStatus =
          (res as any).status ??
          (res as any).reservationStatus ??
          (res as any).statusReservation ??
          (res as any).bookingStatus ??
          (res as any).status_reservation ??
          (res as any).reservation_status ??
          null;

        const derivedStatus = deriveReservationStatus({
          type: rawType,
          status: rawStatus,
        });

        const cancellationAtIso =
          parseOptionalDateToIso(
            res.cancelledAt ??
              (res as any).cancellationDate ??
              (res as any).cancelDate ??
              (res as any).cancelled_at ??
              (res as any).canceledAt ??
              (res as any).cancellation_at,
          ) ?? (derivedStatus === 'cancelled' ? new Date().toISOString() : null);

        const cancellationReason =
          (res as any).cancellationReason ??
          (res as any).cancellation_reason ??
          (res as any).cancelReason ??
          (res as any).cancel_reason ??
          null;

        const reservationData = {
          // Identificadores (✅ id é TEXT na tabela, usar confirmationCode)
          id: reservationId, // TEXT PRIMARY KEY
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
          pricing_currency: (res.currency || (priceObj && typeof priceObj === 'object' ? (priceObj as any).currency : null) || 'BRL') as any,

          // Status
          status: derivedStatus,

          // Plataforma
          platform: mapPlatformV2({
            staysPlatform: res.platform,
            source: res.source,
            partner: (res as any).partner,
            partnerCode: (res as any).partnerCode,
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
          payment_method: res.paymentMethod || null,

          // Comunicação
          notes: res.notes || null,
          special_requests: res.specialRequests || null,

          // Check-in/out times
          check_in_time: res.checkInTime || null,
          check_out_time: res.checkOutTime || null,

          // Cancelamento
          cancelled_at: cancellationAtIso,
          cancellation_reason: cancellationReason,

          // 🔒 Persistência completa do payload de origem (audit/debug)
          staysnet_raw: res,

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
          .upsert(reservationData, { onConflict: 'id' })
          .select('id')
          .single();

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
              .upsert(reservationDataCompat, { onConflict: 'id' })
              .select('id')
              .single();
            upsertedReservation = retry.data as any;
            upsertError = retry.error as any;
          }
        }

        if (upsertError) {
          throw new Error(`Falha ao upsert reservation: ${upsertError.message}`);
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
