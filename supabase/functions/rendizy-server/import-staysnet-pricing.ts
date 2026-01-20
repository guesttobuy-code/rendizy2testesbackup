/**
 * IMPORTAÇÃO DE DADOS FINANCEIROS DO STAYS.NET
 * 
 * Busca configurações de preço, booking e regras da casa para cada property
 * e salva no campo data.precificacao, data.bookingSettings, data.houseRules
 * 
 * ENDPOINTS USADOS:
 * - GET /settings/listing/{id}/sellprice → Taxas e preços
 * - GET /settings/booking/general → Configurações de reserva
 * - GET /settings/house-rules → Regras da casa
 * 
 * @version 1.0.0
 * @date 2024-12-24
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000';
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000002';

interface PricingData {
  cleaningFee?: number;
  guestsIncluded?: number;
  extraGuestFee?: number;
  securityDeposit?: number;
  currency?: string;
  taxRate?: number;
}

interface BookingSettings {
  instantBooking?: boolean;
  autoAccept?: boolean;
  minStay?: number;
  maxStay?: number;
  checkInTime?: string;
  checkOutTime?: string;
  advanceBookingMin?: number;
  advanceBookingMax?: number;
}

interface HouseRules {
  smokingAllowed?: boolean;
  petsAllowed?: boolean;
  partiesAllowed?: boolean;
  quietHours?: string;
  childrenAllowed?: boolean;
  additionalRules?: string[];
}

/**
 * Busca dados financeiros completos de uma property/listing
 */
export async function importPropertyPricing(
  listingId: string,
  anuncioId: string,
  staysHeaders: any,
  staysApiUrl: string,
  supabase: any,
  organizationId: string,
  userId: string = DEFAULT_USER_ID
): Promise<{ success: boolean; camposImportados: number }> {
  
  console.log(`\n💰 [PRICING] Importando dados financeiros para listing ${listingId}...`);
  
  let camposImportados = 0;

  try {
    // ========================================================================
    // 1. BUSCAR SELL PRICE SETTINGS (Taxas e Preços)
    // ========================================================================
    console.log(`   🔍 Buscando sell price settings...`);
    
    try {
      const sellPriceUrl = `${staysApiUrl}/settings/listing/${listingId}/sellprice`;
      const sellPriceResponse = await fetch(sellPriceUrl, { headers: staysHeaders });
      
      if (sellPriceResponse.ok) {
        const sellPrice = await sellPriceResponse.json();
        
        const precificacao: PricingData = {
          cleaningFee: sellPrice.cleaningFee || 0,
          guestsIncluded: sellPrice.guestsIncluded || 2,
          extraGuestFee: sellPrice.extraGuests?.[0]?.value || 0,
          securityDeposit: sellPrice.securityDeposit || 0,
          currency: sellPrice.currency || 'BRL',
          taxRate: sellPrice.taxRate || 0
        };
        
        // Salvar no banco (objeto direto, sem JSON.stringify)
        const { error: precError } = await supabase.rpc('save_anuncio_field', {
          p_anuncio_id: anuncioId,
          p_field: 'precificacao',
          p_value: precificacao,
          p_idempotency_key: `precificacao-${listingId}`,
          p_organization_id: organizationId,
          p_user_id: userId
        });
        
        if (!precError) {
          console.log(`      ✅ precificacao salvo`);
          console.log(`         💵 Taxa limpeza: ${precificacao.currency} ${precificacao.cleaningFee}`);
          console.log(`         👥 Hóspedes incluídos: ${precificacao.guestsIncluded}`);
          console.log(`         💰 Taxa hóspede extra: ${precificacao.currency} ${precificacao.extraGuestFee}`);
          camposImportados++;
        } else {
          console.error(`      ❌ Erro ao salvar precificacao: ${precError.message}`);
        }
        
        // Salvar currency separadamente para facilitar queries
        if (precificacao.currency) {
          const { error: currencyError } = await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'currency',
            p_value: precificacao.currency,
            p_idempotency_key: `currency-${listingId}`,
            p_organization_id: organizationId,
            p_user_id: userId
          });
          
          if (!currencyError) {
            console.log(`      ✅ currency salvo: ${precificacao.currency}`);
            camposImportados++;
          }
        }
        
      } else {
        console.log(`      ⚠️  Sell price não disponível (${sellPriceResponse.status})`);
      }
    } catch (error: any) {
      console.error(`      ❌ Erro ao buscar sell price: ${error.message}`);
    }

    // ========================================================================
    // 2. BUSCAR BOOKING SETTINGS (Configurações de Reserva)
    // ========================================================================
    console.log(`   🔍 Buscando booking settings...`);
    
    try {
      const bookingUrl = `${staysApiUrl}/settings/booking/general?listingId=${listingId}`;
      const bookingResponse = await fetch(bookingUrl, { headers: staysHeaders });
      
      if (bookingResponse.ok) {
        const booking = await bookingResponse.json();
        
        const bookingSettings: BookingSettings = {
          instantBooking: booking.instantBooking || false,
          autoAccept: booking.autoAccept || false,
          minStay: booking.minStay || 1,
          maxStay: booking.maxStay || 365,
          checkInTime: booking.checkInTime || '15:00',
          checkOutTime: booking.checkOutTime || '11:00',
          advanceBookingMin: booking.advanceBookingMin || 0,
          advanceBookingMax: booking.advanceBookingMax || 365
        };
        
        // Salvar no banco (objeto direto, sem JSON.stringify)
        const { error: bookingError } = await supabase.rpc('save_anuncio_field', {
          p_anuncio_id: anuncioId,
          p_field: 'bookingSettings',
          p_value: bookingSettings,
          p_idempotency_key: `bookingSettings-${listingId}`,
          p_organization_id: organizationId,
          p_user_id: userId
        });
        
        if (!bookingError) {
          console.log(`      ✅ bookingSettings salvo`);
          console.log(`         ⚡ Reserva instantânea: ${bookingSettings.instantBooking ? 'Sim' : 'Não'}`);
          console.log(`         🕐 Check-in: ${bookingSettings.checkInTime}`);
          console.log(`         🕐 Check-out: ${bookingSettings.checkOutTime}`);
          console.log(`         📅 Estadia mínima: ${bookingSettings.minStay} dia(s)`);
          camposImportados++;
        } else {
          console.error(`      ❌ Erro ao salvar bookingSettings: ${bookingError.message}`);
        }
        
        // Salvar campos individuais para facilitar filtros/queries
        if (bookingSettings.instantBooking !== undefined) {
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'instantBooking',
            p_value: String(bookingSettings.instantBooking),
            p_idempotency_key: `instantBooking-${listingId}`,
            p_organization_id: organizationId,
            p_user_id: userId
          });
        }
        
        if (bookingSettings.checkInTime) {
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'checkInTime',
            p_value: bookingSettings.checkInTime,
            p_idempotency_key: `checkInTime-${listingId}`,
            p_organization_id: organizationId,
            p_user_id: userId
          });
          camposImportados++;
        }
        
        if (bookingSettings.checkOutTime) {
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'checkOutTime',
            p_value: bookingSettings.checkOutTime,
            p_idempotency_key: `checkOutTime-${listingId}`,
            p_organization_id: organizationId,
            p_user_id: userId
          });
          camposImportados++;
        }
        
      } else {
        console.log(`      ⚠️  Booking settings não disponível (${bookingResponse.status})`);
      }
    } catch (error: any) {
      console.error(`      ❌ Erro ao buscar booking settings: ${error.message}`);
    }

    // ========================================================================
    // 3. BUSCAR HOUSE RULES (Regras da Casa)
    // ========================================================================
    console.log(`   🔍 Buscando house rules...`);
    
    try {
      const rulesUrl = `${staysApiUrl}/settings/house-rules?listingId=${listingId}`;
      const rulesResponse = await fetch(rulesUrl, { headers: staysHeaders });
      
      if (rulesResponse.ok) {
        const rules = await rulesResponse.json();
        
        const houseRules: HouseRules = {
          smokingAllowed: rules.smokingAllowed || false,
          petsAllowed: rules.petsAllowed || false,
          partiesAllowed: rules.partiesAllowed || false,
          quietHours: rules.quietHours || null,
          childrenAllowed: rules.childrenAllowed !== false, // Default true
          additionalRules: rules.additionalRules || []
        };
        
        // Salvar no banco (objeto direto, sem JSON.stringify)
        const { error: rulesError } = await supabase.rpc('save_anuncio_field', {
          p_anuncio_id: anuncioId,
          p_field: 'houseRules',
          p_value: houseRules,
          p_idempotency_key: `houseRules-${listingId}`,
          p_organization_id: organizationId,
          p_user_id: userId
        });
        
        if (!rulesError) {
          console.log(`      ✅ houseRules salvo`);
          console.log(`         🚭 Fumar: ${houseRules.smokingAllowed ? 'Permitido' : 'Não permitido'}`);
          console.log(`         🐕 Pets: ${houseRules.petsAllowed ? 'Permitidos' : 'Não permitidos'}`);
          console.log(`         🎉 Festas: ${houseRules.partiesAllowed ? 'Permitidas' : 'Não permitidas'}`);
          camposImportados++;
        } else {
          console.error(`      ❌ Erro ao salvar houseRules: ${rulesError.message}`);
        }
        
      } else {
        console.log(`      ⚠️  House rules não disponível (${rulesResponse.status})`);
      }
    } catch (error: any) {
      console.error(`      ❌ Erro ao buscar house rules: ${error.message}`);
    }

    console.log(`   ✅ Importação financeira concluída: ${camposImportados} campos salvos`);
    
    return { success: true, camposImportados };

  } catch (error: any) {
    console.error(`   ❌ Erro geral na importação financeira: ${error.message}`);
    return { success: false, camposImportados };
  }
}

/**
 * Busca listing ID a partir de property ID
 */
export async function getListingIdFromProperty(
  propertyId: string,
  staysHeaders: any,
  staysApiUrl: string
): Promise<string | null> {
  try {
    const listingsUrl = `${staysApiUrl}/content/listings?propertyId=${propertyId}`;
    const response = await fetch(listingsUrl, { headers: staysHeaders });
    
    if (response.ok) {
      const listings = await response.json();
      if (listings && listings.length > 0) {
        return listings[0]._id;
      }
    }
    
    return null;
  } catch (error: any) {
    console.error(`Erro ao buscar listing ID: ${error.message}`);
    return null;
  }
}
