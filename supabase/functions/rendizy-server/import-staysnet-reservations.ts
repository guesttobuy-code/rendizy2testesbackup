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

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================
const STAYSNET_CONFIG = {
  apiKey: 'a5146970',
  apiSecret: 'bfcf4daf',
  baseUrl: 'https://bvm.stays.net/external/v1'
};

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000';
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000002';

// ============================================================================
// TIPOS - Estrutura da API StaysNet /booking/reservations
// ============================================================================
interface StaysNetReservation {
  _id: string;                    // ID único da reserva
  confirmationCode?: string;      // Código de confirmação
  propertyId?: string;            // ID do imóvel (pode vir como _id_listing)
  _id_listing?: string;           // ID do imóvel (campo alternativo)
  
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
  if (!staysPlatform && !source) return 'direct';
  
  const platformStr = (staysPlatform || source || '').toLowerCase();
  
  if (platformStr.includes('airbnb')) return 'airbnb';
  if (platformStr.includes('booking')) return 'booking';
  if (platformStr.includes('decolar')) return 'decolar';
  if (platformStr.includes('direct')) return 'direct';
  
  return 'other';
}

// ============================================================================
// FUNÇÃO AUXILIAR: Gerar ID no formato esperado pelo schema
// ============================================================================
function generateReservationId(confirmationCode: string): string {
  // Se já tem formato de ID, retorna
  if (confirmationCode.match(/^[A-Z0-9]{8,}$/)) {
    return confirmationCode;
  }
  
  // Gera ID baseado em timestamp + random
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${timestamp}${random}`;
}

// ============================================================================
// FUNÇÃO PRINCIPAL DE IMPORTAÇÃO
// ============================================================================
export async function importStaysNetReservations(c: Context) {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('⚡ IMPORT STAYSNET - RESERVATIONS (RESERVAS)');
  console.log('═══════════════════════════════════════════════════');
  console.log('📍 API Endpoint: /booking/reservations');
  console.log('📍 Tabela Destino: reservations');
  console.log('📍 Método: INSERT direto (flat structure)');
  console.log('═══════════════════════════════════════════════════\n');

  let fetched = 0;
  let saved = 0;
  let errors = 0;
  let skipped = 0;
  const errorDetails: Array<{reservation: string, error: string}> = [];

  try {
    // ========================================================================
    // STEP 1: BUSCAR RESERVATIONS DA API STAYSNET
    // ========================================================================
    console.log('📡 [FETCH] Buscando reservations de /booking/reservations...');
    
    // Buscar reservas dos últimos 6 meses (ajustar conforme necessário)
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 12); // +12 meses no futuro
    
    const params = new URLSearchParams({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      dateType: 'checkIn' // Filtrar por data de check-in
    });
    
    const response = await fetch(
      `${STAYSNET_CONFIG.baseUrl}/booking/reservations?${params}`,
      {
        headers: {
          'x-api-key': STAYSNET_CONFIG.apiKey,
          'x-api-secret': STAYSNET_CONFIG.apiSecret,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`StaysNet API falhou: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const reservations: StaysNetReservation[] = await response.json();
    
    if (!Array.isArray(reservations)) {
      throw new Error(`Resposta da API não é um array. Tipo: ${typeof reservations}`);
    }

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

      console.log(`\n[${i + 1}/${fetched}] 🏨 Processando: ${confirmationCode}`);

      try {
        // ====================================================================
        // 2.1: VALIDAR DADOS MÍNIMOS
        // ====================================================================
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
        // 2.2: VERIFICAR SE JÁ EXISTE (deduplicação via external_id)
        // ====================================================================
        const externalId = res._id || res.confirmationCode;
        
        const { data: existing, error: checkError } = await supabase
          .from('reservations')
          .select('id')
          .eq('organization_id', DEFAULT_ORG_ID)
          .eq('platform', mapPlatform(res.platform, res.source))
          .eq('external_id', externalId)
          .maybeSingle();

        if (checkError) {
          console.error(`   ❌ Erro ao verificar duplicação:`, checkError.message);
        }

        if (existing) {
          console.log(`   ♻️ Reservation já existe: ${existing.id} - SKIP`);
          skipped++;
          continue;
        }

        // ====================================================================
        // 2.3: BUSCAR property_id via externalIds.staysnet_property_id
        // ====================================================================
        let propertyId: string | null = null;
        const staysPropertyId = res.propertyId || res._id_listing;

        if (staysPropertyId) {
          const { data: property, error: propError } = await supabase
            .from('anuncios_ultimate')
            .select('id')
            .eq('organization_id', DEFAULT_ORG_ID)
            .contains('data', { externalIds: { staysnet_property_id: staysPropertyId } })
            .maybeSingle();

          if (propError) {
            console.error(`   ⚠️ Erro ao buscar property:`, propError.message);
          }

          if (property) {
            propertyId = property.id;
            console.log(`   ✅ Property vinculado: ${propertyId}`);
          } else {
            console.warn(`   ⚠️ Property não encontrado para staysnet_id: ${staysPropertyId}`);
          }
        }

        // ====================================================================
        // 2.4: PREPARAR DADOS (flat structure)
        // ====================================================================
        const reservationId = generateReservationId(confirmationCode);
        
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
          // Identificadores
          id: reservationId,
          organization_id: DEFAULT_ORG_ID,
          property_id: propertyId,
          guest_id: null, // Será populado em import-staysnet-guests.ts

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
          platform: mapPlatform(res.platform, res.source),
          external_id: externalId,
          external_url: null,

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
          confirmed_at: res.status === 'confirmed' ? new Date().toISOString() : null
        };

        // ====================================================================
        // 2.5: INSERIR NA TABELA reservations
        // ====================================================================
        console.log(`   ➕ Inserindo reservation...`);
        
        const { data: insertedReservation, error: insertError } = await supabase
          .from('reservations')
          .insert(reservationData)
          .select('id')
          .single();

        if (insertError) {
          throw new Error(`Falha ao inserir reservation: ${insertError.message}`);
        }

        console.log(`   ✅ Reservation salva: ${insertedReservation.id}`);
        saved++;

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
      stats: { fetched, saved, skipped, errors },
      errorDetails: errors > 0 ? errorDetails : undefined,
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
