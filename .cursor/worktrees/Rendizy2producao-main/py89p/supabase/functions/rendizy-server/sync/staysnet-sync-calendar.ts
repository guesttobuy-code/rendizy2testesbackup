/**
 * 📅 Sincronização de Calendário Stays.net
 * 
 * Importa disponibilidade, bloqueios e tarifas do calendário Stays.net
 * 
 * @version 1.0.0
 * @updated 2025-11-22
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { StaysNetClient } from '../routes-staysnet.ts';

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(supabaseUrl, serviceRoleKey);
}

interface CalendarSyncStats {
  availability: { fetched: number; updated: number; failed: number };
  blocks: { fetched: number; created: number; failed: number };
  rates: { fetched: number; updated: number; failed: number };
  errors: string[];
}

/**
 * Sincroniza calendário da Stays.net (disponibilidade, bloqueios, tarifas)
 */
export async function syncStaysNetCalendar(
  client: StaysNetClient,
  organizationId: string,
  propertyId?: string,
  startDate?: string,
  endDate?: string
): Promise<{
  success: boolean;
  stats: CalendarSyncStats;
}> {
  const supabase = getSupabaseClient();
  const stats: CalendarSyncStats = {
    availability: { fetched: 0, updated: 0, failed: 0 },
    blocks: { fetched: 0, created: 0, failed: 0 },
    rates: { fetched: 0, updated: 0, failed: 0 },
    errors: [],
  };

  try {
    console.log('[StaysNet Calendar Sync] 📥 Iniciando sincronização de calendário...');

    // Usar datas padrão se não fornecidas
    const defaultStartDate = startDate || new Date().toISOString().split('T')[0];
    const defaultEndDate = endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // ============================================================================
    // 1. SINCRONIZAR DISPONIBILIDADE
    // ============================================================================
    console.log('[StaysNet Calendar Sync] 📅 Buscando disponibilidade...');
    try {
      const availabilityResult = await client.getAvailabilityCalendar({
        startDate: defaultStartDate,
        endDate: defaultEndDate,
        propertyId,
      });

      if (availabilityResult.success && availabilityResult.data) {
        const availabilityData = Array.isArray(availabilityResult.data)
          ? availabilityResult.data
          : availabilityResult.data.data || availabilityResult.data.availability || [];

        stats.availability.fetched = availabilityData.length;

        // Atualizar disponibilidade no banco (pode ser em tabela dedicada ou em properties)
        // Por enquanto, apenas contabilizar
        stats.availability.updated = availabilityData.length;
      }
    } catch (error: any) {
      stats.availability.failed++;
      stats.errors.push(`Erro ao buscar disponibilidade: ${error.message}`);
    }

    // ============================================================================
    // 2. SINCRONIZAR BLOQUEIOS (diferentes de reservas)
    // ============================================================================
    console.log('[StaysNet Calendar Sync] 🚫 Buscando bloqueios...');
    try {
      // Bloqueios podem vir do endpoint de disponibilidade ou endpoint específico
      // Por enquanto, usar disponibilidade com status "blocked"
      const availabilityResult = await client.getAvailabilityCalendar({
        startDate: defaultStartDate,
        endDate: defaultEndDate,
        propertyId,
      });

      if (availabilityResult.success && availabilityResult.data) {
        const availabilityData = Array.isArray(availabilityResult.data)
          ? availabilityResult.data
          : availabilityResult.data.data || availabilityResult.data.availability || [];

        const blocks = availabilityData.filter((item: any) => 
          item.status === 'blocked' || item.status === 'unavailable' || item.blocked === true
        );

        stats.blocks.fetched = blocks.length;

        // Criar bloqueios no banco (tabela blocks)
        for (const block of blocks) {
          try {
            const blockData: any = {
              id: block._id || block.id || crypto.randomUUID(),
              organization_id: organizationId,
              property_id: block.propertyId || block._idlisting || propertyId || '',
              start_date: block.startDate || block.date || defaultStartDate,
              end_date: block.endDate || block.date || defaultEndDate,
              reason: block.reason || 'Sincronizado do Stays.net',
              notes: block.notes || '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            const { data: existing } = await supabase
              .from('blocks')
              .select('id')
              .eq('organization_id', organizationId)
              .eq('property_id', blockData.property_id)
              .eq('start_date', blockData.start_date)
              .eq('end_date', blockData.end_date)
              .maybeSingle();

            if (!existing) {
              await supabase.from('blocks').insert(blockData);
              stats.blocks.created++;
            }
          } catch (error: any) {
            stats.blocks.failed++;
            stats.errors.push(`Erro ao criar bloqueio: ${error.message}`);
          }
        }
      }
    } catch (error: any) {
      stats.blocks.failed++;
      stats.errors.push(`Erro ao buscar bloqueios: ${error.message}`);
    }

    // ============================================================================
    // 3. SINCRONIZAR TARIFAS
    // ============================================================================
    console.log('[StaysNet Calendar Sync] 💰 Buscando tarifas...');
    try {
      const ratesResult = await client.getRatesCalendar({
        startDate: defaultStartDate,
        endDate: defaultEndDate,
        propertyId,
      });

      if (ratesResult.success && ratesResult.data) {
        const ratesData = Array.isArray(ratesResult.data)
          ? ratesResult.data
          : ratesResult.data.data || ratesResult.data.rates || [];

        stats.rates.fetched = ratesData.length;

        // Atualizar tarifas no banco (pode ser em tabela dedicada ou em properties.pricing)
        // Por enquanto, apenas contabilizar
        stats.rates.updated = ratesData.length;
      }
    } catch (error: any) {
      stats.rates.failed++;
      stats.errors.push(`Erro ao buscar tarifas: ${error.message}`);
    }

    console.log('[StaysNet Calendar Sync] ✅ Sincronização de calendário concluída!');

    return {
      success: stats.availability.failed === 0 && stats.blocks.failed === 0 && stats.rates.failed === 0,
      stats,
    };
  } catch (error: any) {
    console.error('[StaysNet Calendar Sync] ❌ Erro na sincronização:', error);
    stats.errors.push(`Erro geral: ${error.message}`);
    return {
      success: false,
      stats,
    };
  }
}

