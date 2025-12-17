/**
 * 🏢 Sincronização de Proprietários Stays.net
 * 
 * Importa proprietários da Stays.net e salva no banco Rendizy
 * 
 * @version 1.0.0
 * @updated 2025-11-22
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { StaysNetClient } from '../routes-staysnet.ts';
import { staysNetOwnersToRendizy, type StaysNetOwner } from '../mappers/staysnet-owner-mapper.ts';

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(supabaseUrl, serviceRoleKey);
}

interface SyncStats {
  fetched: number;
  created: number;
  updated: number;
  failed: number;
  errors: string[];
}

/**
 * Sincroniza proprietários da Stays.net
 */
export async function syncStaysNetOwners(
  client: StaysNetClient,
  organizationId: string
): Promise<{
  success: boolean;
  stats: SyncStats;
}> {
  const supabase = getSupabaseClient();
  const stats: SyncStats = {
    fetched: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  try {
    console.log('[StaysNet Owners Sync] 📥 Iniciando sincronização de proprietários...');

    // Buscar proprietários da API
    const ownersResult = await client.getOwners();

    if (!ownersResult.success) {
      console.log('[StaysNet Owners Sync] ⚠️ Endpoint de proprietários não disponível:', ownersResult.error);
      stats.errors.push(ownersResult.error || 'Endpoint não disponível');
      return {
        success: false,
        stats,
      };
    }

    // Normalizar dados
    let staysOwners: StaysNetOwner[] = [];
    if (Array.isArray(ownersResult.data)) {
      staysOwners = ownersResult.data;
    } else if (ownersResult.data?.owners && Array.isArray(ownersResult.data.owners)) {
      staysOwners = ownersResult.data.owners;
    } else if (ownersResult.data?.data && Array.isArray(ownersResult.data.data)) {
      staysOwners = ownersResult.data.data;
    }

    stats.fetched = staysOwners.length;

    if (staysOwners.length === 0) {
      console.log('[StaysNet Owners Sync] ℹ️ Nenhum proprietário encontrado');
      return {
        success: true,
        stats,
      };
    }

    // Converter para formato Rendizy
    const rendizyOwners = staysNetOwnersToRendizy(staysOwners, organizationId);

    // Salvar no banco
    for (const owner of rendizyOwners) {
      try {
        const { data: existing } = await supabase
          .from('owners')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('id', owner.id)
          .maybeSingle();

        const sqlData: any = {
          id: owner.id,
          organization_id: organizationId,
          name: owner.name,
          email: owner.email,
          phone: owner.phone,
          notes: owner.notes,
          created_at: owner.createdAt,
          updated_at: owner.updatedAt,
          // Campos JSONB
          address: owner.address,
          documents: owner.documents,
          property_ids: owner.propertyIds,
        };

        if (existing) {
          await supabase
            .from('owners')
            .update({ ...sqlData, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
          stats.updated++;
        } else {
          await supabase.from('owners').insert(sqlData);
          stats.created++;
        }
      } catch (error: any) {
        stats.failed++;
        stats.errors.push(`Erro ao salvar proprietário ${owner.name}: ${error.message}`);
      }
    }

    console.log(`[StaysNet Owners Sync] ✅ Proprietários: ${stats.created} criados, ${stats.updated} atualizados`);

    return {
      success: stats.failed === 0,
      stats,
    };
  } catch (error: any) {
    console.error('[StaysNet Owners Sync] ❌ Erro na sincronização:', error);
    stats.errors.push(`Erro geral: ${error.message}`);
    return {
      success: false,
      stats,
    };
  }
}

