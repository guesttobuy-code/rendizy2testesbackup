/**
 * STAYS.NET IMPORT ROUTES
 * 
 * Importação completa de dados da Stays.net para o RENDIZY
 * Implementa o TRIPÉ: Imóveis → Hóspedes → Reservas
 * 
 * @version 1.0.103.450
 * @date 2024-12-18
 */

import { getSupabaseClient } from './kv_store.tsx';
import { getTenant } from './utils-tenancy.ts';
import { getOrganizationIdForRequest } from './utils-multi-tenant.ts';
import { successResponse, errorResponse, logInfo, logError } from './utils.ts';

// ============================================================================
// TYPES
// ============================================================================

interface StaysNetProperty {
  id: string;
  code?: string;
  name: string;
  type?: string;
  bedrooms?: number;
  bathrooms?: number;
  max_guests?: number;
  address?: any;
  amenities?: string[];
  [key: string]: any;
}

interface StaysNetGuest {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  document?: string;
  country?: string;
  [key: string]: any;
}

interface StaysNetReservation {
  id: string;
  code: string;
  property_id: string;
  guest_id?: string;
  guest?: StaysNetGuest;
  check_in: string;
  check_out: string;
  status: string;
  total?: number;
  currency?: string;
  adults?: number;
  children?: number;
  platform?: string;
  [key: string]: any;
}

// ============================================================================
// IMPORT PROPERTIES
// ============================================================================

export async function importProperties(c: any) {
  console.log('🏢 [importProperties] === INÍCIO ===');
  
  try {
    const tenant = getTenant(c);
    const client = getSupabaseClient();
    const organizationId = await getOrganizationIdForRequest(c);
    
    const body = await c.req.json();
    const properties: StaysNetProperty[] = body.properties || [];
    
    console.log(`📦 [importProperties] Recebidas ${properties.length} propriedades`);
    
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[]
    };

    for (const staysProperty of properties) {
      try {
        // Verificar se propriedade já existe (por external_id ou código)
        const { data: existing } = await client
          .from('properties')
          .select('id, external_ids')
          .eq('organization_id', organizationId)
          .or(`external_ids->stays_net_id.eq."${staysProperty.id}",data->codigo.eq."${staysProperty.code}"`)
          .maybeSingle();

        const propertyData = {
          organization_id: organizationId,
          title: staysProperty.name,
          data: {
            nome_interno: staysProperty.name,
            codigo: staysProperty.code || staysProperty.id,
            tipo: staysProperty.type || 'apartment',
            descricao: staysProperty.description || '',
            capacidade: {
              hospedes: staysProperty.max_guests || 2,
              quartos: staysProperty.bedrooms || 1,
              banheiros: staysProperty.bathrooms || 1
            },
            endereco: staysProperty.address || {},
            comodidades: staysProperty.amenities || [],
            preco_base_noite: staysProperty.base_price || 100,
            moeda: staysProperty.currency || 'BRL',
            // Guardar dados originais da Stays.net
            _stays_net_original: staysProperty
          },
          external_ids: {
            stays_net_id: staysProperty.id,
            stays_net_code: staysProperty.code
          },
          source: 'stays.net',
          status: 'active'
        };

        if (existing) {
          // Atualizar existente
          const { error } = await client
            .from('properties')
            .update({
              data: propertyData.data,
              external_ids: propertyData.external_ids,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);

          if (error) {
            results.errors.push(`Erro ao atualizar ${staysProperty.name}: ${error.message}`);
          } else {
            results.updated++;
            console.log(`✅ Propriedade atualizada: ${staysProperty.name} (${existing.id})`);
          }
        } else {
          // Criar nova
          const { data: newProperty, error } = await client
            .from('properties')
            .insert(propertyData)
            .select('id')
            .single();

          if (error) {
            results.errors.push(`Erro ao criar ${staysProperty.name}: ${error.message}`);
          } else {
            results.created++;
            console.log(`✅ Propriedade criada: ${staysProperty.name} (${newProperty.id})`);
          }
        }
      } catch (error: any) {
        results.errors.push(`Erro ao processar ${staysProperty.name}: ${error.message}`);
        console.error('❌ Erro ao processar propriedade:', error);
      }
    }

    console.log('🎯 [importProperties] Resultado:', results);
    
    return c.json(successResponse(
      results,
      `Importação concluída: ${results.created} criadas, ${results.updated} atualizadas`
    ));

  } catch (error: any) {
    console.error('❌ [importProperties] Erro geral:', error);
    return c.json(errorResponse('Erro ao importar propriedades', { details: error.message }), 500);
  }
}

// ============================================================================
// IMPORT GUESTS
// ============================================================================

export async function importGuests(c: any) {
  console.log('👤 [importGuests] === INÍCIO ===');
  
  try {
    const tenant = getTenant(c);
    const client = getSupabaseClient();
    const organizationId = await getOrganizationIdForRequest(c);
    
    const body = await c.req.json();
    const guests: StaysNetGuest[] = body.guests || [];
    
    console.log(`📦 [importGuests] Recebidos ${guests.length} hóspedes`);
    
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[]
    };

    for (const staysGuest of guests) {
      try {
        // Verificar se hóspede já existe (por email ou external_id)
        const { data: existing } = await client
          .from('guests')
          .select('id')
          .eq('organization_id', organizationId)
          .or(`email.eq."${staysGuest.email}",external_ids->stays_net_id.eq."${staysGuest.id}"`)
          .maybeSingle();

        const guestData = {
          organization_id: organizationId,
          first_name: staysGuest.first_name,
          last_name: staysGuest.last_name,
          full_name: `${staysGuest.first_name} ${staysGuest.last_name}`,
          email: staysGuest.email,
          phone: staysGuest.phone || '',
          document_number: staysGuest.document || '',
          nationality: staysGuest.country || '',
          source: 'stays.net',
          external_ids: {
            stays_net_id: staysGuest.id
          }
        };

        if (existing) {
          // Atualizar existente
          const { error } = await client
            .from('guests')
            .update({
              ...guestData,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);

          if (error) {
            results.errors.push(`Erro ao atualizar ${guestData.full_name}: ${error.message}`);
          } else {
            results.updated++;
            console.log(`✅ Hóspede atualizado: ${guestData.full_name} (${existing.id})`);
          }
        } else {
          // Criar novo
          const { data: newGuest, error } = await client
            .from('guests')
            .insert(guestData)
            .select('id')
            .single();

          if (error) {
            results.errors.push(`Erro ao criar ${guestData.full_name}: ${error.message}`);
          } else {
            results.created++;
            console.log(`✅ Hóspede criado: ${guestData.full_name} (${newGuest.id})`);
          }
        }
      } catch (error: any) {
        results.errors.push(`Erro ao processar hóspede: ${error.message}`);
        console.error('❌ Erro ao processar hóspede:', error);
      }
    }

    console.log('🎯 [importGuests] Resultado:', results);
    
    return c.json(successResponse(
      results,
      `Importação concluída: ${results.created} criados, ${results.updated} atualizados`
    ));

  } catch (error: any) {
    console.error('❌ [importGuests] Erro geral:', error);
    return c.json(errorResponse('Erro ao importar hóspedes', { details: error.message }), 500);
  }
}

// ============================================================================
// IMPORT RESERVATIONS (TRIPÉ COMPLETO)
// ============================================================================

export async function importReservations(c: any) {
  console.log('📅 [importReservations] === INÍCIO ===');
  
  try {
    const tenant = getTenant(c);
    const client = getSupabaseClient();
    const organizationId = await getOrganizationIdForRequest(c);
    
    const body = await c.req.json();
    const reservations: StaysNetReservation[] = body.reservations || [];
    
    console.log(`📦 [importReservations] Recebidas ${reservations.length} reservas`);
    
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
      propertiesCreated: 0,
      guestsCreated: 0
    };

    for (const staysReservation of reservations) {
      try {
        // === PASSO 1: GARANTIR QUE PROPRIEDADE EXISTE ===
        let propertyId: string | null = null;
        
        const { data: existingProperty } = await client
          .from('properties')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('external_ids->stays_net_id', staysReservation.property_id)
          .maybeSingle();

        if (existingProperty) {
          propertyId = existingProperty.id;
          console.log(`✅ Propriedade encontrada: ${propertyId}`);
        } else {
          // ❌ REGRA DE OURO: NUNCA criar imóvel/anúncio placeholder.
          // Reservas só podem ser importadas se o imóvel já estiver importado/mapeado.
          results.skipped++;
          results.errors.push(
            `Reserva ${staysReservation.code}: imóvel não encontrado para staysPropertyId=${staysReservation.property_id}. ` +
              `Importe imóveis primeiro (sem placeholder).`
          );
          continue;
        }

        // === PASSO 2: GARANTIR QUE HÓSPEDE EXISTE ===
        let guestId: string | null = null;
        const guestData = staysReservation.guest;

        if (guestData) {
          const { data: existingGuest } = await client
            .from('guests')
            .select('id')
            .eq('organization_id', organizationId)
            .or(`email.eq."${guestData.email}",external_ids->stays_net_id.eq."${guestData.id}"`)
            .maybeSingle();

          if (existingGuest) {
            guestId = existingGuest.id;
            console.log(`✅ Hóspede encontrado: ${guestId}`);
          } else {
            // Criar hóspede
            const { data: newGuest, error: guestError } = await client
              .from('guests')
              .insert({
                organization_id: organizationId,
                first_name: guestData.first_name || 'Hóspede',
                last_name: guestData.last_name || 'Stays.net',
                full_name: `${guestData.first_name || 'Hóspede'} ${guestData.last_name || ''}`.trim(),
                email: guestData.email,
                phone: guestData.phone || '',
                source: 'stays.net',
                external_ids: {
                  stays_net_id: guestData.id
                }
              })
              .select('id')
              .single();

            if (guestError) {
              results.errors.push(`Erro ao criar hóspede para reserva ${staysReservation.code}: ${guestError.message}`);
              continue;
            }

            guestId = newGuest.id;
            results.guestsCreated++;
            console.log(`✅ Hóspede criado: ${guestId}`);
          }
        }

        // === PASSO 3: CRIAR RESERVA ===
        // Verificar se reserva já existe
        const { data: existingReservation } = await client
          .from('reservations')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('external_id', staysReservation.id)
          .maybeSingle();

        const checkIn = new Date(staysReservation.check_in);
        const checkOut = new Date(staysReservation.check_out);
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

        const reservationData = {
          id: `res-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          organization_id: organizationId,
          property_id: propertyId,
          guest_id: guestId,
          check_in: staysReservation.check_in.split('T')[0],
          check_out: staysReservation.check_out.split('T')[0],
          nights,
          guests_adults: staysReservation.adults || 1,
          guests_children: staysReservation.children || 0,
          guests_total: (staysReservation.adults || 1) + (staysReservation.children || 0),
          pricing_total: (() => {
            const n = Number(staysReservation.total || 0);
            if (!Number.isFinite(n)) return 0;
            return Math.round(n * 100) / 100;
          })(),
          pricing_currency: staysReservation.currency || 'BRL',
          status: mapStaysNetStatus(staysReservation.status),
          platform: 'stays.net',
          external_id: staysReservation.id,
          notes: `Importado da Stays.net - Código: ${staysReservation.code}`,
          created_by: tenant.id
        };

        if (existingReservation) {
          // Atualizar existente
          const { error } = await client
            .from('reservations')
            .update({
              ...reservationData,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingReservation.id);

          if (error) {
            results.errors.push(`Erro ao atualizar reserva ${staysReservation.code}: ${error.message}`);
          } else {
            results.updated++;
            console.log(`✅ Reserva atualizada: ${staysReservation.code}`);
          }
        } else {
          // Criar nova
          const { error } = await client
            .from('reservations')
            .insert(reservationData);

          if (error) {
            results.errors.push(`Erro ao criar reserva ${staysReservation.code}: ${error.message}`);
            console.error('❌ Erro detalhado:', error);
          } else {
            results.created++;
            console.log(`✅ Reserva criada: ${staysReservation.code}`);
          }
        }

      } catch (error: any) {
        results.errors.push(`Erro ao processar reserva: ${error.message}`);
        console.error('❌ Erro ao processar reserva:', error);
      }
    }

    console.log('🎯 [importReservations] Resultado:', results);
    
    return c.json(successResponse(
      results,
      `Importação concluída: ${results.created} reservas criadas, ${results.updated} atualizadas`
    ));

  } catch (error: any) {
    console.error('❌ [importReservations] Erro geral:', error);
    return c.json(errorResponse('Erro ao importar reservas', { details: error.message }), 500);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mapStaysNetStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'confirmed': 'confirmed',
    'pending': 'pending',
    'cancelled': 'cancelled',
    'checked_in': 'checked_in',
    'checked_out': 'checked_out',
    'completed': 'checked_out'
  };

  return statusMap[status.toLowerCase()] || 'pending';
}
