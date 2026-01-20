/**
 * 🔄 STAYSNET PROPERTIES SYNC CRON - v1.0.111
 * 
 * Robô de sincronização automática de propriedades entre Stays.net e Rendizy.
 * 
 * PROBLEMA RESOLVIDO:
 * A Stays.net NÃO envia webhook quando uma nova propriedade é criada.
 * Isso causa dessincronização: imóveis existem na Stays mas não no Rendizy.
 * 
 * SOLUÇÃO:
 * Cron job que roda 2x ao dia (08:00 e 20:00 BRT) para:
 * 1. Buscar todas as propriedades da Stays.net via API
 * 2. Comparar com propriedades existentes no Rendizy
 * 3. Importar automaticamente as propriedades novas
 * 
 * ENDPOINT: POST /staysnet/properties-sync-cron
 * SCHEDULE: Configurar via Supabase Cron ou pg_cron
 * 
 * REFERÊNCIA: docs/04-modules/STAYSNET_PROPERTIES_SYNC.md
 */

import { Context } from 'npm:hono';
import { getSupabaseClient } from './kv_store.tsx';
import { successResponse, errorResponse, logError } from './utils.ts';
import { loadStaysNetRuntimeConfigOrThrow } from './utils-staysnet-config.ts';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000';

interface SyncResult {
  organizationId: string;
  staysCount: number;
  rendizyCount: number;
  newProperties: string[];
  imported: number;
  errors: string[];
  executedAt: string;
}

/**
 * Busca todas as propriedades da Stays.net via API
 */
async function fetchStaysnetListings(config: { baseUrl: string; apiKey: string; apiSecret?: string }): Promise<any[]> {
  const allListings: any[] = [];
  let skip = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const url = `${config.baseUrl}/content/listings?skip=${skip}&limit=${limit}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(`${config.apiKey}:${config.apiSecret || ''}`)}`,
    };

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`API Stays.net falhou: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const listings = data?.data || data || [];
    
    if (Array.isArray(listings) && listings.length > 0) {
      allListings.push(...listings);
      skip += listings.length;
      hasMore = listings.length === limit;
    } else {
      hasMore = false;
    }
  }

  return allListings;
}

/**
 * Busca IDs de propriedades existentes no Rendizy (via externalIds JSONB)
 */
async function getExistingStaysnetIds(supabase: any, organizationId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('properties')
    .select('data')
    .eq('organization_id', organizationId)
    .not('data', 'is', null);

  if (error) {
    console.error('Erro ao buscar propriedades existentes:', error);
    return new Set();
  }

  const staysIds = new Set<string>();
  
  for (const row of data || []) {
    const externalIds = row.data?.externalIds;
    if (externalIds) {
      // Verifica todos os possíveis campos de ID Stays
      const candidates = [
        externalIds.staysnet_listing_id,
        externalIds.staysnet_property_id,
        externalIds.staysnet_id,
        externalIds.stays_id,
      ];
      
      for (const id of candidates) {
        if (id) {
          staysIds.add(String(id));
        }
      }
    }
  }

  return staysIds;
}

/**
 * Importa uma propriedade nova da Stays.net para o Rendizy
 */
async function importNewProperty(
  supabase: any,
  organizationId: string,
  listing: any,
  config: { baseUrl: string; apiKey: string; apiSecret?: string }
): Promise<{ success: boolean; propertyId?: string; error?: string }> {
  try {
    const listingId = listing._id || listing.id;
    const listingCode = listing.internalName || listing._mstitle || listing.name || `stays-${listingId}`;

    // Prepara dados básicos do anúncio
    const anuncioData: Record<string, any> = {
      externalIds: {
        staysnet_listing_id: listingId,
        staysnet_property_id: listing.propertyId || null,
        staysnet_code: listing.internalName || null,
      },
      title: listing.internalName || listing._mstitle || listing.name || `Imóvel ${listingId}`,
      internalName: listing.internalName || null,
      propertyType: listing._t_propertyMeta?.en || listing._t_propertyTypeMeta?.en || null,
      status: 'draft', // Sempre cria como rascunho para revisão manual
      importedAt: new Date().toISOString(),
      importSource: 'staysnet_sync_cron',
      staysnet_raw: listing,
    };

    // Usa RPC save_anuncio_field para criar/atualizar atomicamente
    const { data, error } = await supabase.rpc('save_anuncio_field', {
      _org: organizationId,
      _user: '00000000-0000-0000-0000-000000000002',
      _id: null, // Novo registro
      _key: 'import_batch',
      _val: anuncioData,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, propertyId: data?.id || data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' };
  }
}

/**
 * Registra resultado do sync na tabela staysnet_sync_log
 */
async function logSyncResult(supabase: any, result: SyncResult): Promise<void> {
  try {
    await supabase.from('staysnet_sync_log').insert({
      organization_id: result.organizationId,
      sync_type: 'properties_cron',
      stays_count: result.staysCount,
      rendizy_count: result.rendizyCount,
      new_count: result.newProperties.length,
      imported_count: result.imported,
      errors: result.errors,
      executed_at: result.executedAt,
    });
  } catch (err) {
    console.error('Erro ao registrar sync log:', err);
  }
}

/**
 * Sincroniza propriedades de uma organização
 */
async function syncOrganizationProperties(
  supabase: any,
  organizationId: string
): Promise<SyncResult> {
  const result: SyncResult = {
    organizationId,
    staysCount: 0,
    rendizyCount: 0,
    newProperties: [],
    imported: 0,
    errors: [],
    executedAt: new Date().toISOString(),
  };

  try {
    // 1. Carregar config da Stays.net
    const config = await loadStaysNetRuntimeConfigOrThrow(organizationId);
    
    console.log(`🔄 [SYNC] Iniciando sync para org: ${organizationId}`);

    // 2. Buscar propriedades da Stays.net
    const staysListings = await fetchStaysnetListings(config);
    result.staysCount = staysListings.length;
    console.log(`📊 [SYNC] Stays.net: ${staysListings.length} propriedades`);

    // 3. Buscar IDs existentes no Rendizy
    const existingIds = await getExistingStaysnetIds(supabase, organizationId);
    result.rendizyCount = existingIds.size;
    console.log(`📊 [SYNC] Rendizy: ${existingIds.size} propriedades`);

    // 4. Identificar propriedades novas
    for (const listing of staysListings) {
      const listingId = String(listing._id || listing.id);
      
      if (!existingIds.has(listingId)) {
        result.newProperties.push(listingId);
      }
    }

    console.log(`🆕 [SYNC] Novas propriedades: ${result.newProperties.length}`);

    // 5. Importar propriedades novas
    for (const listingId of result.newProperties) {
      const listing = staysListings.find(l => String(l._id || l.id) === listingId);
      
      if (listing) {
        const importResult = await importNewProperty(supabase, organizationId, listing, config);
        
        if (importResult.success) {
          result.imported++;
          console.log(`✅ [SYNC] Importado: ${listingId} -> ${importResult.propertyId}`);
        } else {
          result.errors.push(`${listingId}: ${importResult.error}`);
          console.error(`❌ [SYNC] Erro ao importar ${listingId}: ${importResult.error}`);
        }
      }
    }

    // 6. Registrar log
    await logSyncResult(supabase, result);

  } catch (err: any) {
    result.errors.push(err.message || 'Unknown error');
    console.error(`❌ [SYNC] Erro geral: ${err.message}`);
  }

  return result;
}

/**
 * Endpoint principal do cron de sincronização
 * POST /staysnet/properties-sync-cron
 * 
 * Body opcional:
 * - organizationId: string (se não informado, sincroniza todas as orgs com config ativa)
 */
export async function staysnetPropertiesSyncCron(c: Context): Promise<Response> {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🔄 STAYSNET PROPERTIES SYNC CRON');
  console.log('═══════════════════════════════════════════════════');
  console.log(`📅 Executado em: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════\n');

  try {
    const supabase = getSupabaseClient(c);
    const body = await c.req.json().catch(() => ({}));
    const targetOrgId = body?.organizationId;

    const results: SyncResult[] = [];

    if (targetOrgId) {
      // Sincronizar apenas uma organização específica
      const result = await syncOrganizationProperties(supabase, targetOrgId);
      results.push(result);
    } else {
      // Buscar todas as organizações com staysnet_config ativo
      const { data: configs } = await supabase
        .from('staysnet_config')
        .select('organization_id')
        .eq('enabled', true);

      if (configs && configs.length > 0) {
        for (const cfg of configs) {
          const result = await syncOrganizationProperties(supabase, cfg.organization_id);
          results.push(result);
        }
      } else {
        // Fallback: usar org padrão
        const result = await syncOrganizationProperties(supabase, DEFAULT_ORG_ID);
        results.push(result);
      }
    }

    // Resumo
    const totalNew = results.reduce((acc, r) => acc + r.newProperties.length, 0);
    const totalImported = results.reduce((acc, r) => acc + r.imported, 0);
    const totalErrors = results.reduce((acc, r) => acc + r.errors.length, 0);

    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 RESUMO DO SYNC');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Organizações processadas: ${results.length}`);
    console.log(`  Novas propriedades encontradas: ${totalNew}`);
    console.log(`  Importadas com sucesso: ${totalImported}`);
    console.log(`  Erros: ${totalErrors}`);
    console.log('═══════════════════════════════════════════════════\n');

    return c.json(successResponse({
      message: 'Properties sync completed',
      summary: {
        organizations: results.length,
        newPropertiesFound: totalNew,
        imported: totalImported,
        errors: totalErrors,
      },
      details: results,
    }));

  } catch (err: any) {
    logError('staysnetPropertiesSyncCron', err);
    return c.json(errorResponse(err.message || 'Sync failed'), 500);
  }
}

/**
 * Endpoint para verificar status do sync (diagnóstico)
 * GET /staysnet/properties-sync-status
 */
export async function staysnetPropertiesSyncStatus(c: Context): Promise<Response> {
  try {
    const supabase = getSupabaseClient(c);
    const orgId = c.req.query('organizationId') || DEFAULT_ORG_ID;

    // Buscar últimos syncs
    const { data: logs } = await supabase
      .from('staysnet_sync_log')
      .select('*')
      .eq('organization_id', orgId)
      .eq('sync_type', 'properties_cron')
      .order('executed_at', { ascending: false })
      .limit(10);

    // Contagem atual
    const config = await loadStaysNetRuntimeConfigOrThrow(orgId);
    const staysListings = await fetchStaysnetListings(config);
    const existingIds = await getExistingStaysnetIds(supabase, orgId);

    const staysIds = new Set(staysListings.map(l => String(l._id || l.id)));
    const missing: string[] = [];
    
    for (const id of staysIds) {
      if (!existingIds.has(id)) {
        missing.push(id);
      }
    }

    return c.json(successResponse({
      organizationId: orgId,
      currentStatus: {
        staysCount: staysListings.length,
        rendizyCount: existingIds.size,
        missingInRendizy: missing.length,
        missingIds: missing.slice(0, 20), // Primeiros 20
      },
      recentSyncs: logs || [],
    }));

  } catch (err: any) {
    logError('staysnetPropertiesSyncStatus', err);
    return c.json(errorResponse(err.message), 500);
  }
}
