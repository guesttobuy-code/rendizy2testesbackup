/**
 * 🔄 STAYSNET PROPERTIES SYNC CRON - Edge Function
 * 
 * Sincroniza propriedades entre Stays.net e Rendizy.
 * Roda 2x ao dia (08:00 e 20:00 BRT) via Supabase Cron.
 * 
 * PROBLEMA RESOLVIDO:
 * A Stays.net NÃO envia webhook quando uma nova propriedade é criada.
 * Este cron detecta e importa automaticamente novas propriedades.
 * 
 * CONFIGURAÇÃO CRON (pg_cron):
 * -- 08:00 BRT (11:00 UTC)
 * SELECT cron.schedule('staysnet-properties-sync-morning', '0 11 * * *', $$
 *   SELECT net.http_post(
 *     'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/staysnet-properties-sync-cron',
 *     '{}',
 *     '{"Content-Type": "application/json", "Authorization": "Bearer <service_role_key>"}'
 *   );
 * $$);
 * 
 * -- 20:00 BRT (23:00 UTC)
 * SELECT cron.schedule('staysnet-properties-sync-evening', '0 23 * * *', $$
 *   SELECT net.http_post(
 *     'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/staysnet-properties-sync-cron',
 *     '{}',
 *     '{"Content-Type": "application/json", "Authorization": "Bearer <service_role_key>"}'
 *   );
 * $$);
 * 
 * @version 1.0.111
 */

import { loadStaysNetRuntimeConfigOrThrow } from '../rendizy-server/utils-staysnet-config.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000'

interface SyncResult {
  organizationId: string
  staysCount: number
  rendizyCount: number
  newProperties: string[]
  imported: number
  errors: string[]
  executedAt: string
}

/**
 * Busca todas as propriedades da Stays.net via API
 */
async function fetchStaysnetListings(config: { baseUrl: string; apiKey: string; apiSecret?: string }): Promise<any[]> {
  const allListings: any[] = []
  let skip = 0
  const limit = 100
  let hasMore = true

  while (hasMore) {
    const url = `${config.baseUrl}/content/listings?skip=${skip}&limit=${limit}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(`${config.apiKey}:${config.apiSecret || ''}`)}`,
    }

    const response = await fetch(url, { headers })
    
    if (!response.ok) {
      throw new Error(`API Stays.net falhou: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const listings = data?.data || data || []
    
    if (Array.isArray(listings) && listings.length > 0) {
      allListings.push(...listings)
      skip += listings.length
      hasMore = listings.length === limit
    } else {
      hasMore = false
    }
  }

  return allListings
}

/**
 * Busca IDs de propriedades existentes no Rendizy (via externalIds JSONB)
 */
async function getExistingStaysnetIds(supabase: any, organizationId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('properties')
    .select('data')
    .eq('organization_id', organizationId)
    .not('data', 'is', null)

  if (error) {
    console.error('Erro ao buscar propriedades existentes:', error)
    return new Set()
  }

  const staysIds = new Set<string>()
  
  for (const row of data || []) {
    const externalIds = row.data?.externalIds
    if (externalIds) {
      const candidates = [
        externalIds.staysnet_listing_id,
        externalIds.staysnet_property_id,
        externalIds.staysnet_id,
        externalIds.stays_id,
      ]
      
      for (const id of candidates) {
        if (id) {
          staysIds.add(String(id))
        }
      }
    }
  }

  return staysIds
}

/**
 * Importa uma propriedade nova da Stays.net para o Rendizy
 */
async function importNewProperty(
  supabase: any,
  organizationId: string,
  listing: any
): Promise<{ success: boolean; propertyId?: string; error?: string }> {
  try {
    const listingId = listing._id || listing.id

    const anuncioData: Record<string, any> = {
      externalIds: {
        staysnet_listing_id: listingId,
        staysnet_property_id: listing.propertyId || null,
        staysnet_code: listing.internalName || null,
      },
      title: listing.internalName || listing._mstitle || listing.name || `Imóvel ${listingId}`,
      internalName: listing.internalName || null,
      propertyType: listing._t_propertyMeta?.en || listing._t_propertyTypeMeta?.en || null,
      status: 'draft',
      importedAt: new Date().toISOString(),
      importSource: 'staysnet_sync_cron',
      staysnet_raw: listing,
    }

    const { data, error } = await supabase.rpc('save_anuncio_field', {
      _org: organizationId,
      _user: '00000000-0000-0000-0000-000000000002',
      _id: null,
      _key: 'import_batch',
      _val: anuncioData,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, propertyId: data?.id || data }
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' }
  }
}

/**
 * Registra resultado do sync
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
    })
  } catch (err) {
    console.error('Erro ao registrar sync log:', err)
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
  }

  try {
    const config = await loadStaysNetRuntimeConfigOrThrow(organizationId)
    
    console.log(`🔄 [SYNC] Iniciando sync para org: ${organizationId}`)

    const staysListings = await fetchStaysnetListings(config)
    result.staysCount = staysListings.length
    console.log(`📊 [SYNC] Stays.net: ${staysListings.length} propriedades`)

    const existingIds = await getExistingStaysnetIds(supabase, organizationId)
    result.rendizyCount = existingIds.size
    console.log(`📊 [SYNC] Rendizy: ${existingIds.size} propriedades`)

    for (const listing of staysListings) {
      const listingId = String(listing._id || listing.id)
      
      if (!existingIds.has(listingId)) {
        result.newProperties.push(listingId)
      }
    }

    console.log(`🆕 [SYNC] Novas propriedades: ${result.newProperties.length}`)

    for (const listingId of result.newProperties) {
      const listing = staysListings.find(l => String(l._id || l.id) === listingId)
      
      if (listing) {
        const importResult = await importNewProperty(supabase, organizationId, listing)
        
        if (importResult.success) {
          result.imported++
          console.log(`✅ [SYNC] Importado: ${listingId} -> ${importResult.propertyId}`)
        } else {
          result.errors.push(`${listingId}: ${importResult.error}`)
          console.error(`❌ [SYNC] Erro ao importar ${listingId}: ${importResult.error}`)
        }
      }
    }

    await logSyncResult(supabase, result)

  } catch (err: any) {
    result.errors.push(err.message || 'Unknown error')
    console.error(`❌ [SYNC] Erro geral: ${err.message}`)
  }

  return result
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('\n═══════════════════════════════════════════════════')
    console.log('🔄 STAYSNET PROPERTIES SYNC CRON')
    console.log('═══════════════════════════════════════════════════')
    console.log(`📅 Executado em: ${new Date().toISOString()}`)
    console.log('═══════════════════════════════════════════════════\n')

    // Verificar autenticação (cron secret ou service role)
    const cronSecret = (Deno.env.get('STAYSNET_CRON_SECRET') || '').trim()
    const providedSecret = req.headers.get('x-cron-secret') || ''
    const authHeader = req.headers.get('authorization') || ''
    
    if (cronSecret && providedSecret !== cronSecret && !authHeader.includes('Bearer')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    let body: any = {}
    try {
      body = await req.json()
    } catch {
      // empty body is ok
    }

    const targetOrgId = body?.organizationId
    const results: SyncResult[] = []

    if (targetOrgId) {
      const result = await syncOrganizationProperties(supabase, targetOrgId)
      results.push(result)
    } else {
      // Buscar todas as organizações com staysnet_config ativo
      const { data: configs } = await supabase
        .from('staysnet_config')
        .select('organization_id')
        .eq('enabled', true)

      if (configs && configs.length > 0) {
        for (const cfg of configs) {
          const result = await syncOrganizationProperties(supabase, cfg.organization_id)
          results.push(result)
        }
      } else {
        const result = await syncOrganizationProperties(supabase, DEFAULT_ORG_ID)
        results.push(result)
      }
    }

    const totalNew = results.reduce((acc, r) => acc + r.newProperties.length, 0)
    const totalImported = results.reduce((acc, r) => acc + r.imported, 0)
    const totalErrors = results.reduce((acc, r) => acc + r.errors.length, 0)

    console.log('\n═══════════════════════════════════════════════════')
    console.log('📊 RESUMO DO SYNC')
    console.log('═══════════════════════════════════════════════════')
    console.log(`  Organizações processadas: ${results.length}`)
    console.log(`  Novas propriedades encontradas: ${totalNew}`)
    console.log(`  Importadas com sucesso: ${totalImported}`)
    console.log(`  Erros: ${totalErrors}`)
    console.log('═══════════════════════════════════════════════════\n')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Properties sync completed',
        summary: {
          organizations: results.length,
          newPropertiesFound: totalNew,
          imported: totalImported,
          errors: totalErrors,
        },
        details: results,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (err: any) {
    console.error('❌ Sync failed:', err)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
