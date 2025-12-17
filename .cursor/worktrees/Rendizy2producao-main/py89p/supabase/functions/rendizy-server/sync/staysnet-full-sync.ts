/**
 * Stays.net Full Sync - Importação Completa
 * 
 * Importa hóspedes, propriedades e reservas da Stays.net e salva no banco Rendizy
 * 
 * @version 1.0.0
 * @updated 2025-11-22
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { StaysNetClient } from '../routes-staysnet.ts';
import { staysNetGuestToRendizy, staysNetGuestsToRendizy, type StaysNetGuest } from '../mappers/staysnet-guest-mapper.ts';
import { staysNetReservationToRendizy, type StaysNetReservation } from '../mappers/staysnet-reservation-mapper.ts';
import { staysNetListingToRendizyProperty } from '../mappers/staysnet-listing-mapper.ts';
import type { StaysNetListing } from '../mappers/staysnet-property-mapper.ts';
import { staysNetListingToPlatformInfo } from '../mappers/staysnet-property-mapper.ts';
// ✅ Removidos imports de mappers que não existem - vamos salvar diretamente no banco

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(supabaseUrl, serviceRoleKey);
}

interface SyncStats {
  guests: { fetched: number; created: number; updated: number; failed: number };
  properties: { fetched: number; created: number; updated: number; failed: number };
  reservations: { fetched: number; created: number; updated: number; failed: number };
  errors: string[];
}

/**
 * Importação completa de dados da Stays.net
 */
export async function fullSyncStaysNet(
  client: StaysNetClient,
  organizationId: string,
  selectedPropertyIds?: string[], // IDs de propriedades selecionadas para importar
  startDate?: string, // Data inicial para reservas (opcional)
  endDate?: string // Data final para reservas (opcional)
): Promise<{
  success: boolean;
  stats: SyncStats;
}> {
  const supabase = getSupabaseClient();
  const stats: SyncStats = {
    guests: { fetched: 0, created: 0, updated: 0, failed: 0 },
    properties: { fetched: 0, created: 0, updated: 0, failed: 0 },
    reservations: { fetched: 0, created: 0, updated: 0, failed: 0 },
    errors: [],
  };

  try {
    console.log('[StaysNet Full Sync] 🚀 Iniciando importação completa...');
    
    // ✅ Maps para usar nas reservas (criados nas fases anteriores)
    const guestIdMap = new Map<string, string>(); // clientId -> guestId
    const propertyIdMap = new Map<string, string>(); // listingId -> propertyId
    
    // ============================================================================
    // FASE 1: IMPORTAR HÓSPEDES
    // ============================================================================
    console.log('[StaysNet Full Sync] 📥 Fase 1: Importando hóspedes...');
    const clientsResult = await client.getClients(); // ✅ Usa getClients() que chama /booking/clients
    
    if (clientsResult.success && clientsResult.data) {
      let staysGuests: StaysNetGuest[] = [];
      if (Array.isArray(clientsResult.data)) {
        staysGuests = clientsResult.data;
      } else if (clientsResult.data.clients && Array.isArray(clientsResult.data.clients)) {
        staysGuests = clientsResult.data.clients;
      } else if (clientsResult.data.data && Array.isArray(clientsResult.data.data)) {
        staysGuests = clientsResult.data.data;
      }
      
      stats.guests.fetched = staysGuests.length;
      const rendizyGuests = staysNetGuestsToRendizy(staysGuests, organizationId);
      
      for (const guest of rendizyGuests) {
        try {
          const staysClientId = staysGuests.find(g => 
            (g._id || g.id) === guest.id
          )?._id || guest.id;
          
          const { data: existing } = await supabase
            .from('guests')
            .select('id')
            .eq('organization_id', organizationId)
            .or(`email.eq.${guest.email || ''},id.eq.${guest.id || ''}`)
            .maybeSingle();
          
          // ✅ Salvar diretamente no formato SQL
          const sqlData: any = {
            id: guest.id,
            organization_id: organizationId,
            first_name: guest.firstName || '',
            last_name: guest.lastName || '',
            full_name: guest.fullName || '',
            email: guest.email || null,
            phone: guest.phone || null,
            cpf: guest.cpf || null,
            passport: guest.passport || null,
            rg: guest.rg || null,
            language: guest.language || 'pt-BR',
            source: guest.source || 'staysnet',
            is_blacklisted: guest.isBlacklisted || false,
            notes: guest.notes || null,
            created_at: guest.createdAt || new Date().toISOString(),
            updated_at: guest.updatedAt || new Date().toISOString(),
          };
          
          // Adicionar campos extras de OTA (JSONB)
          if ((guest as any).externalIds) {
            sqlData.external_ids = (guest as any).externalIds;
          }
          if ((guest as any).otaReviews) {
            sqlData.ota_reviews = (guest as any).otaReviews;
          }
          if ((guest as any).otaRatings) {
            sqlData.ota_ratings = (guest as any).otaRatings;
          }
          
          // Adicionar stats (JSONB)
          if (guest.stats) {
            sqlData.stats = guest.stats;
          }
          
          if (existing) {
            const { error: updateError } = await supabase
              .from('guests')
              .update({ ...sqlData, updated_at: new Date().toISOString() })
              .eq('id', existing.id);
            
            if (!updateError) {
              stats.guests.updated++;
              guestIdMap.set(staysClientId, existing.id);
            } else {
              throw updateError;
            }
          } else {
            const { data: inserted, error: insertError } = await supabase
              .from('guests')
              .insert(sqlData)
              .select('id')
              .single();
            
            if (inserted && !insertError) {
              stats.guests.created++;
              guestIdMap.set(staysClientId, inserted.id);
            } else {
              throw insertError || new Error('Failed to insert guest');
            }
          }
        } catch (error: any) {
          stats.guests.failed++;
          stats.errors.push(`Erro ao salvar hóspede ${guest.email}: ${error.message}`);
        }
      }
      
      console.log(`[StaysNet Full Sync] ✅ Hóspedes: ${stats.guests.created} criados, ${stats.guests.updated} atualizados`);
    }
    
    // ============================================================================
    // FASE 2: IMPORTAR PROPRIEDADES (LISTINGS)
    // ============================================================================
    console.log('[StaysNet Full Sync] 📥 Fase 2: Importando propriedades (listings)...');
    const listingsResult = await client.getListings();
    
    if (listingsResult.success && listingsResult.data) {
      let staysListings: StaysNetListing[] = [];
      if (Array.isArray(listingsResult.data)) {
        staysListings = listingsResult.data;
      } else if (listingsResult.data.listings && Array.isArray(listingsResult.data.listings)) {
        staysListings = listingsResult.data.listings;
      } else if (listingsResult.data.data && Array.isArray(listingsResult.data.data)) {
        staysListings = listingsResult.data.data;
      }
      
      // Filtrar por propriedades selecionadas se fornecido
      if (selectedPropertyIds && selectedPropertyIds.length > 0) {
        staysListings = staysListings.filter(l => 
          selectedPropertyIds.includes(l._id || l.id || '')
        );
      }
      
      stats.properties.fetched = staysListings.length;
      
      // ✅ Usar propertyIdMap criado no escopo superior
      
      for (const listing of staysListings) {
        try {
          const listingId = listing._id || listing.id || '';
          const property = staysNetListingToRendizyProperty(listing, organizationId);
          
          const { data: existing } = await supabase
            .from('properties')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('id', property.id)
            .maybeSingle();
          
          // ✅ Salvar diretamente no formato SQL
          const sqlData: any = {
            id: property.id,
            organization_id: organizationId,
            name: property.name || 'Propriedade sem nome',
            code: property.code || '',
            type: property.type || 'apartment',
            status: property.status || 'active',
            max_guests: property.maxGuests || 2,
            bedrooms: property.bedrooms || 0,
            beds: property.beds || 0,
            bathrooms: property.bathrooms || 0,
            area: property.area || null,
            is_active: property.isActive !== false,
            owner_id: property.ownerId || 'system',
            created_at: property.createdAt || new Date().toISOString(),
            updated_at: property.updatedAt || new Date().toISOString(),
          };
          
          // Adicionar endereço (JSONB)
          if (property.address) {
            sqlData.address = property.address;
          }
          
          // Adicionar pricing (JSONB)
          if (property.pricing) {
            sqlData.pricing = property.pricing;
          }
          
          // Adicionar amenities (JSONB)
          if (property.amenities) {
            sqlData.amenities = property.amenities;
          }
          
          // Adicionar photos (JSONB)
          if (property.photos) {
            sqlData.photos = property.photos;
          }
          
          // Adicionar platforms (JSONB)
          if (property.platforms) {
            sqlData.platforms = property.platforms;
          }
          
          // Adicionar metadados de OTA
          const platformInfo = staysNetListingToPlatformInfo(listing);
          if (platformInfo.metadata) {
            sqlData.ota_metadata = platformInfo.metadata;
          }
          
          if (existing) {
            const { error: updateError } = await supabase
              .from('properties')
              .update({ ...sqlData, updated_at: new Date().toISOString() })
              .eq('id', existing.id);
            
            if (!updateError) {
              stats.properties.updated++;
              propertyIdMap.set(listingId, existing.id);
            } else {
              throw updateError;
            }
          } else {
            const { data: inserted, error: insertError } = await supabase
              .from('properties')
              .insert(sqlData)
              .select('id')
              .single();
            
            if (inserted && !insertError) {
              stats.properties.created++;
              propertyIdMap.set(listingId, inserted.id);
            } else {
              throw insertError || new Error('Failed to insert property');
            }
          }
        } catch (error: any) {
          stats.properties.failed++;
          stats.errors.push(`Erro ao salvar propriedade ${listing.internalName || listing.id}: ${error.message}`);
        }
      }
      
      console.log(`[StaysNet Full Sync] ✅ Propriedades: ${stats.properties.created} criadas, ${stats.properties.updated} atualizadas`);
    }
    
          // ============================================================================
          // FASE 3: IMPORTAR RESERVAS
          // ============================================================================
          console.log('[StaysNet Full Sync] 📥 Fase 3: Importando reservas...');
          const reservationsStartDate = startDate || '2025-01-01';
          const reservationsEndDate = endDate || '2026-12-31';
          const reservationsResult = await client.getReservations({ 
            startDate: reservationsStartDate, 
            endDate: reservationsEndDate 
          });
    
    if (reservationsResult.success && reservationsResult.data) {
      let staysReservations: StaysNetReservation[] = [];
      if (Array.isArray(reservationsResult.data)) {
        staysReservations = reservationsResult.data;
      } else if (reservationsResult.data.reservations && Array.isArray(reservationsResult.data.reservations)) {
        staysReservations = reservationsResult.data.reservations;
      } else if (reservationsResult.data.data && Array.isArray(reservationsResult.data.data)) {
        staysReservations = reservationsResult.data.data;
      }
      
      stats.reservations.fetched = staysReservations.length;
      
      // ✅ Usar os maps criados nas fases anteriores (propertyIdMap e guestIdMap)
      // Se não existirem, buscar do banco como fallback
      
      // Buscar propriedades do banco para fallback
      const { data: allProperties } = await supabase
        .from('properties')
        .select('id')
        .eq('organization_id', organizationId);
      
      // Buscar hóspedes do banco para fallback
      const { data: allGuests } = await supabase
        .from('guests')
        .select('id')
        .eq('organization_id', organizationId);
      
      for (const staysRes of staysReservations) {
        try {
          const listingId = staysRes._idlisting || staysRes.listingId || '';
          const clientId = staysRes._idclient || staysRes.clientId || staysRes.client?._id || '';
          
          // ✅ Usar maps criados nas fases anteriores, com fallback para banco
          const propertyId = propertyIdMap.get(listingId) || (allProperties?.[0]?.id || '');
          const guestId = guestIdMap.get(clientId) || (allGuests?.[0]?.id || '');
          
          if (!propertyId || !guestId) {
            stats.reservations.failed++;
            stats.errors.push(`Reserva ${staysRes._id || staysRes.id}: property ou guest não encontrado`);
            continue;
          }
          
          const reservation = staysNetReservationToRendizy(staysRes, propertyId, guestId, organizationId);
          
          // ✅ Salvar diretamente no formato SQL
          const sqlData: any = {
            id: reservation.id,
            organization_id: organizationId,
            property_id: propertyId,
            guest_id: guestId,
            check_in: reservation.checkIn,
            check_out: reservation.checkOut,
            nights: reservation.nights || 0,
            status: reservation.status || 'pending',
            platform: reservation.platform || 'staysnet',
            external_id: reservation.externalId || null,
            external_url: reservation.externalUrl || null,
            check_in_time: reservation.checkInTime || null,
            check_out_time: reservation.checkOutTime || null,
            cancelled_at: reservation.cancelledAt || null,
            cancelled_by: reservation.cancelledBy || null,
            cancellation_reason: reservation.cancellationReason || null,
            created_at: reservation.createdAt || new Date().toISOString(),
            updated_at: reservation.updatedAt || new Date().toISOString(),
            created_by: reservation.createdBy || 'staysnet-sync',
            confirmed_at: reservation.confirmedAt || null,
          };
          
          // Adicionar guests (JSONB)
          if (reservation.guests) {
            sqlData.guests = reservation.guests;
          }
          
          // Adicionar pricing (JSONB) - manter valores em centavos (como está no mapper)
          if (reservation.pricing) {
            sqlData.pricing = reservation.pricing;
          }
          
          // Adicionar payment (JSONB)
          if (reservation.payment) {
            sqlData.payment = reservation.payment;
          }
          
          // Adicionar campos extras de OTA (JSONB)
          if ((reservation as any).externalIds) {
            sqlData.external_ids = (reservation as any).externalIds;
          }
          if ((reservation as any).externalUrls) {
            sqlData.external_urls = (reservation as any).externalUrls;
          }
          if ((reservation as any).otaReviews) {
            sqlData.ota_reviews = (reservation as any).otaReviews;
          }
          if ((reservation as any).otaRatings) {
            sqlData.ota_ratings = (reservation as any).otaRatings;
          }
          
          // Adicionar notas
          if (reservation.notes) {
            sqlData.notes = reservation.notes;
          }
          if (reservation.internalComments) {
            sqlData.internal_comments = reservation.internalComments;
          }
          if (reservation.specialRequests) {
            sqlData.special_requests = reservation.specialRequests;
          }
          
          const { data: existing } = await supabase
            .from('reservations')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('id', reservation.id)
            .maybeSingle();
          
          if (existing) {
            const { error: updateError } = await supabase
              .from('reservations')
              .update({ ...sqlData, updated_at: new Date().toISOString() })
              .eq('id', existing.id);
            
            if (!updateError) {
              stats.reservations.updated++;
            } else {
              throw updateError;
            }
          } else {
            const { error: insertError } = await supabase
              .from('reservations')
              .insert(sqlData);
            
            if (!insertError) {
              stats.reservations.created++;
            } else {
              throw insertError;
            }
          }
        } catch (error: any) {
          stats.reservations.failed++;
          stats.errors.push(`Erro ao salvar reserva: ${error.message}`);
        }
      }
      
      console.log(`[StaysNet Full Sync] ✅ Reservas: ${stats.reservations.created} criadas, ${stats.reservations.updated} atualizadas`);
    }
    
    console.log('[StaysNet Full Sync] ✅ Importação completa finalizada!');
    
    return {
      success: stats.guests.failed === 0 && stats.properties.failed === 0 && stats.reservations.failed === 0,
      stats,
    };
  } catch (error: any) {
    console.error('[StaysNet Full Sync] ❌ Erro na importação:', error);
    stats.errors.push(`Erro geral: ${error.message}`);
    return {
      success: false,
      stats,
    };
  }
}

