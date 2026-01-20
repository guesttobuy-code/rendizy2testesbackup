/**
 * ============================================================================
 * CRON ROUTES: StaysNet Auto-Sync
 * ============================================================================
 * 
 * Rotas de cron para sincronização automática com Stays.net.
 * 
 * CONSOLIDAÇÃO ADR: Estas rotas substituem as Edge Functions separadas:
 * - staysnet-properties-sync-cron -> /cron/staysnet-properties-sync
 * - staysnet-webhooks-cron -> /cron/staysnet-webhooks
 * 
 * @see docs/ADR_EDGE_FUNCTIONS_ARQUITETURA_CENTRALIZADA.md
 * @version 1.0.112 - 2026-01-18
 */

import type { Context } from 'npm:hono@4'
import { successResponse, errorResponse } from './utils-response.ts'
import { loadStaysNetRuntimeConfigOrThrow } from './utils-staysnet-config.ts'
import { processPendingStaysNetWebhooksForOrg } from './routes-staysnet-webhooks.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000'

// ============================================================================
// CRON: Sincronizar Propriedades StaysNet
// ============================================================================

interface PropertySyncResult {
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
 * POST /cron/staysnet-properties-sync
 * 
 * Sincroniza propriedades entre Stays.net e Rendizy.
 * Detecta e importa automaticamente novas propriedades.
 * 
 * Chamado 2x ao dia (08:00 e 20:00 BRT) via pg_cron.
 */
export async function cronStaysnetPropertiesSync(c: Context) {
  const startTime = Date.now()
  
  try {
    // Verificar autenticação (service_role ou x-cron-secret)
    const authHeader = c.req.header('Authorization') || ''
    const cronSecret = c.req.header('x-cron-secret')
    const expectedSecret = Deno.env.get('CRON_SECRET')
    
    const isServiceRole = authHeader.includes('service_role') || authHeader.includes('eyJ')
    const isValidCronSecret = cronSecret && expectedSecret && cronSecret === expectedSecret
    
    if (!isServiceRole && !isValidCronSecret) {
      console.warn('⚠️ [cronStaysnetPropertiesSync] Unauthorized request')
      return c.json(errorResponse('Unauthorized - requires service_role or x-cron-secret'), 401)
    }

    const organizationId = DEFAULT_ORG_ID
    console.log(`🔄 [cronStaysnetPropertiesSync] Starting sync for org: ${organizationId}`)

    // Carregar configuração Stays.net
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const config = await loadStaysNetRuntimeConfigOrThrow(supabase, organizationId)
    
    // Buscar propriedades da Stays
    const staysListings = await fetchStaysnetListings(config)
    console.log(`📊 [cronStaysnetPropertiesSync] Found ${staysListings.length} listings in Stays.net`)

    // Buscar propriedades existentes no Rendizy
    // ⚠️ staysnet_listing_id está dentro do JSONB 'data', não como coluna direta
    const { data: rendizyProperties, error: fetchError } = await supabase
      .from('properties')
      .select('id, data')
      .eq('organization_id', organizationId)

    if (fetchError) {
      throw new Error(`Erro ao buscar properties: ${fetchError.message}`)
    }

    // Extrair IDs de mapeamento do JSONB 'data'
    const existingStaysIds = new Set(
      (rendizyProperties || [])
        .flatMap(p => {
          const ids: string[] = []
          const d = p.data || {}
          // Campos possíveis onde o listing_id pode estar
          if (d.externalIds?.staysnet_listing_id) ids.push(d.externalIds.staysnet_listing_id)
          if (d.externalIds?.staysnet_property_id) ids.push(d.externalIds.staysnet_property_id)
          if (d.staysnet_raw?._id) ids.push(d.staysnet_raw._id)
          if (d.staysnet_raw?.id) ids.push(d.staysnet_raw.id)
          if (d.staysnetListingId) ids.push(d.staysnetListingId)
          return ids
        })
        .filter(Boolean)
    )

    // Identificar propriedades novas
    const newListings = staysListings.filter(listing => {
      const staysId = listing._id || listing.id
      return !existingStaysIds.has(staysId)
    })

    console.log(`🆕 [cronStaysnetPropertiesSync] New properties to import: ${newListings.length}`)

    const result: PropertySyncResult = {
      organizationId,
      staysCount: staysListings.length,
      rendizyCount: rendizyProperties?.length || 0,
      newProperties: [],
      imported: 0,
      errors: [],
      executedAt: new Date().toISOString(),
    }

    // Importar novas propriedades
    const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000002' // Sistema
    
    for (const listing of newListings) {
      try {
        const staysId = listing._id || listing.id
        const internalName = listing.internalName || listing.title || listing._mstitle?.pt_BR || 'Sem nome'
        
        // Criar property no Rendizy
        // ⚠️ staysnet_listing_id vai dentro do JSONB 'data' (não existe como coluna direta)
        const propertyData = {
          id: crypto.randomUUID(),
          organization_id: organizationId,
          user_id: DEFAULT_USER_ID,
          title: internalName,
          status: 'active',
          data: {
            title: internalName,
            externalIds: {
              staysnet_listing_id: staysId,
              staysnet_property_id: staysId,
            },
            staysnet_raw: listing,
            importedAt: new Date().toISOString(),
            source: 'cron-sync',
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        const { error: insertError } = await supabase
          .from('properties')
          .insert(propertyData)

        if (insertError) {
          result.errors.push(`Erro ao importar ${staysId}: ${insertError.message}`)
          console.error(`❌ [cronStaysnetPropertiesSync] Error importing ${staysId}:`, insertError.message)
        } else {
          result.imported++
          result.newProperties.push(internalName)
          console.log(`✅ [cronStaysnetPropertiesSync] Imported: ${internalName} (${staysId})`)
        }
      } catch (err: any) {
        result.errors.push(`Exception: ${err.message}`)
        console.error(`❌ [cronStaysnetPropertiesSync] Exception:`, err.message)
      }
    }

    // Registrar execução no log (ignorar erro se tabela não existir)
    try {
      await supabase.from('staysnet_sync_log').insert({
        organization_id: organizationId,
        sync_type: 'properties',
        result: result,
        executed_at: new Date().toISOString(),
      })
    } catch {
      // Tabela pode não existir - ignorar
    }

    const duration = Date.now() - startTime
    console.log(`✅ [cronStaysnetPropertiesSync] Completed in ${duration}ms. Imported: ${result.imported}`)

    return c.json(successResponse(result, `Sync concluído: ${result.imported} propriedades importadas`))
  } catch (error: any) {
    console.error('❌ [cronStaysnetPropertiesSync] Error:', error)
    return c.json(errorResponse('Erro no sync de propriedades', { details: error.message }), 500)
  }
}

// ============================================================================
// CRON: Processar Webhooks Pendentes
// ============================================================================

/**
 * POST /cron/staysnet-webhooks
 * 
 * Processa webhooks pendentes da Stays.net.
 * Chamado a cada 5 minutos via pg_cron.
 * 
 * ✅ Também reprocessa webhooks com erro (retry até 3x)
 */
export async function cronStaysnetWebhooks(c: Context) {
  const startTime = Date.now()
  
  try {
    // Verificar autenticação
    const authHeader = c.req.header('Authorization') || ''
    const cronSecret = c.req.header('x-cron-secret')
    const expectedSecret = Deno.env.get('CRON_SECRET')
    
    const isServiceRole = authHeader.includes('service_role') || authHeader.includes('eyJ')
    const isValidCronSecret = cronSecret && expectedSecret && cronSecret === expectedSecret
    
    if (!isServiceRole && !isValidCronSecret) {
      console.warn('⚠️ [cronStaysnetWebhooks] Unauthorized request')
      return c.json(errorResponse('Unauthorized'), 401)
    }

    const organizationId = DEFAULT_ORG_ID
    console.log(`🔄 [cronStaysnetWebhooks] Processing pending webhooks for org: ${organizationId}`)

    // 1. Processar webhooks pendentes
    const result = await processPendingStaysNetWebhooksForOrg(organizationId)

    // 2. Retry: reprocessar webhooks com erro (max 3 tentativas)
    let retryCount = 0
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)
        
        // Buscar webhooks com erro que podem ser reprocessados
        // (erro há mais de 5 minutos e menos de 3 tentativas)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
        
        const { data: failedWebhooks } = await supabase
          .from('staysnet_webhooks')
          .select('id, retry_count')
          .eq('organization_id', organizationId)
          .not('error_message', 'is', null)
          .lt('retry_count', 3)
          .lt('processed_at', fiveMinutesAgo)
          .order('processed_at', { ascending: true })
          .limit(10)

        if (failedWebhooks && failedWebhooks.length > 0) {
          console.log(`🔁 [cronStaysnetWebhooks] Found ${failedWebhooks.length} webhooks for retry`)
          
          for (const wh of failedWebhooks) {
            // Resetar para reprocessar
            await supabase
              .from('staysnet_webhooks')
              .update({ 
                processed_at: null, 
                error_message: null,
                retry_count: (wh.retry_count || 0) + 1,
              })
              .eq('id', wh.id)
            retryCount++
          }
          
          // Reprocessar
          if (retryCount > 0) {
            console.log(`🔁 [cronStaysnetWebhooks] Reprocessing ${retryCount} failed webhooks...`)
            await processPendingStaysNetWebhooksForOrg(organizationId, retryCount)
          }
        }
      }
    } catch (retryErr: any) {
      console.warn(`⚠️ [cronStaysnetWebhooks] Retry failed: ${retryErr.message}`)
    }

    const duration = Date.now() - startTime
    console.log(`✅ [cronStaysnetWebhooks] Completed in ${duration}ms (retried: ${retryCount})`)

    return c.json(successResponse({ ...result, retriedCount: retryCount }))
  } catch (error: any) {
    console.error('❌ [cronStaysnetWebhooks] Error:', error)
    return c.json(errorResponse('Erro ao processar webhooks', { details: error.message }), 500)
  }
}
