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
  price?: number;                 // Preço total
  pricePerNight?: number;         // Preço por noite
  cleaningFee?: number;           // Taxa de limpeza
  serviceFee?: number;            // Taxa de serviço
  taxes?: number;                 // Impostos
  discount?: number;              // Desconto
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
    'cancelled': 'cancelled',
    'declined': 'cancelled',
    'expired': 'cancelled',
    'checked_in': 'checked_in',
    'checked_out': 'checked_out',
    'no_show': 'no_show'
  };
  
  return statusMap[staysStatus.toLowerCase()] || 'pending';
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
    const limit = Math.min(20, Math.max(1, Number(c.req.query('limit') || body?.limit || 20))); // ✅ max 20
    const maxPages = Math.max(1, Number(c.req.query('maxPages') || body?.maxPages || 500));

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
    let skip = Math.max(0, Number(c.req.query('skip') || body?.skip || 0));
    let pages = 0;

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
        break;
      }

      skip += limit;
      pages++;
    }

    if (pages >= maxPages) {
      console.warn(`   ⚠️ Paginação atingiu maxPages=${maxPages}. Retornando parcial.`);
    }

    const reservations: StaysNetReservation[] = allReservations;

    fetched = reservations.length;
    console.log(`✅ [FETCH] ${fetched} reservations recebidas\n`);

    if (fetched === 0) {
      return c.json({
        success: true,
        method: 'import-reservations',
        stats: { fetched: 0, saved: 0, errors: 0, skipped: 0 },
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
        const typeLower = String((res as any).type || '').toLowerCase();
        if (typeLower === 'blocked' || typeLower === 'maintenance') {
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
        const finalGuestId = existing?.guest_id || null;

        // ====================================================================
        // 2.4: PREPARAR DADOS (flat structure)
        // ====================================================================
        // ✅ FIX: Não gerar ID customizado - Postgres auto-gera UUID
        
        // ✅ FIX: Usar safeInt() para evitar erro "28.2005"
        const guestsAdults = safeInt(res.guests?.adults || res._i_maxGuests, 1);
        const guestsChildren = safeInt(res.guests?.children, 0);
        const guestsInfants = safeInt(res.guests?.infants, 0);
        const guestsPets = safeInt(res.guests?.pets, 0);
        const guestsTotal = safeInt(res.guests?.total || guestsAdults, 1);

        const pricePerNight = Number(res.pricePerNight || 0);
        const baseTotal = Number(res.price || pricePerNight * nights);
        const cleaningFee = Number(res.cleaningFee || 0);
        const serviceFee = Number(res.serviceFee || 0);
        const taxes = Number(res.taxes || 0);
        const discount = Number(res.discount || 0);
        const total = baseTotal + cleaningFee + serviceFee + taxes - discount;

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
          pricing_base_total: baseTotal,
          pricing_cleaning_fee: cleaningFee,
          pricing_service_fee: serviceFee,
          pricing_taxes: taxes,
          pricing_discount: discount,
          pricing_total: total,
          pricing_currency: res.currency || 'BRL',

          // Status
          status: mapReservationStatus(res.status),

          // Plataforma
          platform: mapPlatformV2({
            staysPlatform: res.platform,
            source: res.source,
            partner: (res as any).partner,
            partnerCode: (res as any).partnerCode,
          }),
          external_id: externalId,
          external_url: finalExternalUrl,

          // Pagamento
          payment_status: res.paymentStatus || 'pending',
          payment_method: res.paymentMethod || null,

          // Comunicação
          notes: res.notes || null,
          special_requests: res.specialRequests || null,

          // Check-in/out times
          check_in_time: res.checkInTime || null,
          check_out_time: res.checkOutTime || null,

          // Cancelamento
          cancelled_at: res.cancelledAt ? new Date(res.cancelledAt).toISOString() : null,

          // Metadata
          created_by: DEFAULT_USER_ID,
          source_created_at: sourceCreatedAtIso,
          confirmed_at: res.status === 'confirmed' ? new Date().toISOString() : null
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

        // Compat: se a migration ainda não foi aplicada, não quebrar o import inteiro.
        if (upsertError && /source_created_at/i.test(upsertError.message) && /does not exist/i.test(upsertError.message)) {
          console.warn('⚠️ Coluna source_created_at não existe. Rode a migration; import seguirá sem esse campo por enquanto.');
          const { source_created_at: _ignored, ...reservationDataWithoutSourceCreatedAt } = reservationData as any;
          const retry = await supabase
            .from('reservations')
            .upsert(reservationDataWithoutSourceCreatedAt, { onConflict: 'id' })
            .select('id')
            .single();
          upsertedReservation = retry.data as any;
          upsertError = retry.error as any;
        }

        if (upsertError) {
          throw new Error(`Falha ao upsert reservation: ${upsertError.message}`);
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
      stats: { fetched, saved, skipped, errors }
    }, 500);
  }
}
