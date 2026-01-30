/**
 * ============================================================================
 * CRON ROUTE: Reconciliação de Reservas Stays.net
 * ============================================================================
 * 
 * Job diário que:
 * 1. Verifica se reservas locais ainda existem na Stays.net
 * 2. Detecta alterações (status, datas, hóspede)
 * 3. IMPORTA reservas faltantes (existem no Stays mas não no Rendizy)
 * 
 * ESTRATÉGIA MULTI-CAMADA (Cobrindo todas as brechas):
 * 
 * PARTE 1: Verificação de reservas existentes (original)
 * - Detecta reservas deletadas na Stays (cancela localmente)
 * - Detecta alterações de status, datas, hóspede (atualiza localmente)
 * 
 * PARTE 2: Importação de reservas faltantes (NOVO)
 * - Por DATA DE CHECK-IN (arrival): Próximos 14 dias
 * - Por DATA DE CRIAÇÃO (creation): Últimas 72h
 * - Garante que reservas de última hora sejam capturadas
 * 
 * PROBLEMA RESOLVIDO:
 * - Reservas deletadas na Stays.net não são notificadas via webhook
 * - Alterações podem ser perdidas se webhook falhar
 * - Reservas criadas podem falhar no webhook e nunca chegar
 * - Bug do status 'cancelled' vs 'canceled' corrigido
 * 
 * EXECUÇÃO:
 * - Cron: 05:00 BRT (08:00 UTC) diariamente
 * - POST /cron/staysnet-reservations-reconcile
 * 
 * @version 2.0.0 - 2026-01-30 (Adicionada importação de faltantes)
 */

import type { Context } from 'npm:hono@4'
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { successResponse, errorResponse } from './utils-response.ts'
import { loadStaysNetRuntimeConfigOrThrow } from './utils-staysnet-config.ts'

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000'

// Configurações
const BATCH_SIZE = 50          // Reservas por lote (evita timeout na API)
const API_DELAY_MS = 200       // Delay entre chamadas (rate limiting)
const MAX_RESERVATIONS = 500   // Máximo de reservas por execução

interface ReconciliationConfig {
  baseUrl: string
  apiKey: string
  apiSecret?: string
}

interface ReconciliationStats {
  totalChecked: number
  foundDeleted: number
  foundModified: number
  foundOrphan: number
  actionCancelled: number
  actionUpdated: number
  actionSkipped: number
  errors: string[]
}

interface ReservationToCheck {
  id: string
  external_id: string
  property_id: string | null
  check_in: string
  check_out: string
  status: string
  platform: string
}

/**
 * Busca detalhes de uma reserva na API da Stays.net
 */
async function fetchStaysReservation(
  externalId: string,
  config: ReconciliationConfig
): Promise<{ found: boolean; data?: any; error?: string }> {
  try {
    const auth = btoa(`${config.apiKey}:${config.apiSecret || ''}`)
    const url = `${config.baseUrl}/booking/content?_id=${externalId}`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (response.status === 404) {
      return { found: false }
    }
    
    if (!response.ok) {
      const errText = await response.text()
      return { found: false, error: `API error ${response.status}: ${errText}` }
    }
    
    const data = await response.json()
    
    // Verifica se retornou "not found" no body
    if (data.message === 'not found' || data.error === 'not found') {
      return { found: false }
    }
    
    return { found: true, data }
  } catch (err: any) {
    return { found: false, error: err.message }
  }
}

/**
 * Mapeia status da Stays para status local
 */
function mapStaysStatus(staysType: string): string {
  const map: Record<string, string> = {
    booked: 'confirmed',
    confirmed: 'confirmed',
    new: 'confirmed',
    pending: 'pending',
    inquiry: 'pending',
    cancelled: 'cancelled',
    canceled: 'cancelled',
    checked_in: 'checked_in',
    checkedin: 'checked_in',
    checked_out: 'checked_out',
    checkedout: 'checked_out',
  }
  return map[staysType?.toLowerCase()] || 'pending'
}

/**
 * Verifica se a data de checkout é passada (reserva já encerrada)
 */
function isReservationPast(checkOut: string): boolean {
  const checkOutDate = new Date(checkOut)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return checkOutDate < today
}

/**
 * Processa uma reserva e detecta divergências
 */
async function processReservation(
  reservation: ReservationToCheck,
  config: ReconciliationConfig,
  supabase: SupabaseClient,
  runId: string,
  stats: ReconciliationStats
): Promise<void> {
  const { found, data, error } = await fetchStaysReservation(reservation.external_id, config)
  
  // CASO 1: Reserva não existe mais na Stays
  if (!found && !error) {
    stats.foundDeleted++
    
    // Só cancela se checkout é futuro (preserva histórico)
    if (isReservationPast(reservation.check_out)) {
      // Reserva passada - apenas registra, não altera
      await logReconciliationItem(supabase, {
        runId,
        reservationId: reservation.id,
        externalId: reservation.external_id,
        propertyId: reservation.property_id,
        issueType: 'deleted',
        localStatus: reservation.status,
        apiStatus: null,
        localData: { check_in: reservation.check_in, check_out: reservation.check_out },
        apiData: null,
        actionTaken: 'skipped',
        actionReason: 'Reserva passada - mantendo histórico',
      })
      stats.actionSkipped++
    } else {
      // Reserva futura - cancela
      const { error: updateErr } = await supabase
        .from('reservations')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Reserva deletada na Stays.net - cancelada automaticamente por reconciliação',
          updated_at: new Date().toISOString(),
        })
        .eq('id', reservation.id)
      
      await logReconciliationItem(supabase, {
        runId,
        reservationId: reservation.id,
        externalId: reservation.external_id,
        propertyId: reservation.property_id,
        issueType: 'deleted',
        localStatus: reservation.status,
        apiStatus: null,
        localData: { check_in: reservation.check_in, check_out: reservation.check_out },
        apiData: null,
        actionTaken: updateErr ? 'error' : 'cancelled',
        actionReason: updateErr ? updateErr.message : 'Reserva deletada na Stays - cancelada localmente',
      })
      
      if (updateErr) {
        stats.errors.push(`Erro ao cancelar ${reservation.external_id}: ${updateErr.message}`)
      } else {
        stats.actionCancelled++
        console.log(`🗑️ [Reconcile] Cancelled deleted reservation: ${reservation.external_id}`)
      }
    }
    return
  }
  
  // CASO 2: Erro na API (não conseguimos verificar)
  if (error) {
    stats.errors.push(`API error for ${reservation.external_id}: ${error}`)
    return
  }
  
  // CASO 3: Reserva existe - verificar se há alterações
  if (data) {
    const apiStatus = mapStaysStatus(data.type)
    let hasChanges = false
    const changes: string[] = []
    
    // Verifica status
    if (reservation.status !== apiStatus) {
      hasChanges = true
      changes.push(`status: ${reservation.status} → ${apiStatus}`)
    }
    
    // Verifica datas (formato YYYY-MM-DD)
    const apiCheckIn = data.checkIn?.split('T')[0] || data.checkIn
    const apiCheckOut = data.checkOut?.split('T')[0] || data.checkOut
    
    if (reservation.check_in !== apiCheckIn) {
      hasChanges = true
      changes.push(`check_in: ${reservation.check_in} → ${apiCheckIn}`)
    }
    
    if (reservation.check_out !== apiCheckOut) {
      hasChanges = true
      changes.push(`check_out: ${reservation.check_out} → ${apiCheckOut}`)
    }
    
    if (!hasChanges) {
      // Tudo OK
      return
    }
    
    stats.foundModified++
    
    // Determinar tipo de mudança
    let issueType: 'status_changed' | 'dates_changed' | 'guest_changed' = 'status_changed'
    if (apiCheckIn !== reservation.check_in || apiCheckOut !== reservation.check_out) {
      issueType = 'dates_changed'
    }
    
    // Aplicar atualização
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }
    
    // Atualiza status se mudou para cancelado
    if (apiStatus === 'cancelled' && reservation.status !== 'cancelled') {
      updateData.status = 'cancelled'
    } else if (apiStatus !== 'cancelled') {
      updateData.status = apiStatus
    }
    
    // Atualiza datas se mudaram
    if (apiCheckIn && apiCheckIn !== reservation.check_in) {
      updateData.check_in = apiCheckIn
    }
    if (apiCheckOut && apiCheckOut !== reservation.check_out) {
      updateData.check_out = apiCheckOut
    }
    
    const { error: updateErr } = await supabase
      .from('reservations')
      .update(updateData)
      .eq('id', reservation.id)
    
    await logReconciliationItem(supabase, {
      runId,
      reservationId: reservation.id,
      externalId: reservation.external_id,
      propertyId: reservation.property_id,
      issueType,
      localStatus: reservation.status,
      apiStatus: data.type,
      localData: { check_in: reservation.check_in, check_out: reservation.check_out, status: reservation.status },
      apiData: { checkIn: apiCheckIn, checkOut: apiCheckOut, type: data.type, guest: data.guest?.name },
      actionTaken: updateErr ? 'error' : 'updated',
      actionReason: updateErr ? updateErr.message : `Atualizado: ${changes.join(', ')}`,
    })
    
    if (updateErr) {
      stats.errors.push(`Erro ao atualizar ${reservation.external_id}: ${updateErr.message}`)
    } else {
      stats.actionUpdated++
      console.log(`🔄 [Reconcile] Updated reservation ${reservation.external_id}: ${changes.join(', ')}`)
    }
  }
}

/**
 * Registra item de reconciliação
 */
async function logReconciliationItem(
  supabase: SupabaseClient,
  item: {
    runId: string
    reservationId: string
    externalId: string
    propertyId: string | null
    issueType: string
    localStatus: string
    apiStatus: string | null
    localData: any
    apiData: any
    actionTaken: string
    actionReason: string
  }
): Promise<void> {
  try {
    await supabase.from('reconciliation_items').insert({
      run_id: item.runId,
      reservation_id: item.reservationId,
      external_id: item.externalId,
      property_id: item.propertyId,
      issue_type: item.issueType,
      local_status: item.localStatus,
      api_status: item.apiStatus,
      local_data: item.localData,
      api_data: item.apiData,
      action_taken: item.actionTaken,
      action_reason: item.actionReason,
    })
  } catch (err) {
    console.warn(`[Reconcile] Failed to log item: ${err}`)
  }
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * POST /cron/staysnet-reservations-reconcile
 * 
 * Job de reconciliação diário que:
 * 1. Busca reservas ativas (confirmed, pending, checked_in) dos últimos 90 dias
 * 2. Para cada reserva, verifica se ainda existe na Stays.net
 * 3. Detecta alterações de status, datas, hóspede
 * 4. Aplica correções automaticamente
 * 5. Registra log detalhado para auditoria
 * 
 * Query params:
 * - dryRun: boolean (default: false) - se true, apenas simula sem aplicar
 * - limit: number (default: 500) - máximo de reservas a verificar
 */
export async function cronStaysnetReservationsReconcile(c: Context) {
  const startTime = Date.now()
  const organizationId = DEFAULT_ORG_ID
  
  // Inicializar Supabase
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  // Criar registro de execução
  const { data: runData, error: runError } = await supabase
    .from('reconciliation_runs')
    .insert({
      organization_id: organizationId,
      status: 'running',
    })
    .select('id')
    .single()
  
  const runId = runData?.id || crypto.randomUUID()
  
  if (runError) {
    console.warn(`[Reconcile] Could not create run log: ${runError.message}`)
  }
  
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`🔄 RECONCILIAÇÃO DE RESERVAS - ${new Date().toISOString()}`)
  console.log(`${'═'.repeat(60)}`)
  console.log(`Run ID: ${runId}`)
  console.log(`Organization: ${organizationId}`)
  
  const stats: ReconciliationStats = {
    totalChecked: 0,
    foundDeleted: 0,
    foundModified: 0,
    foundOrphan: 0,
    actionCancelled: 0,
    actionUpdated: 0,
    actionSkipped: 0,
    errors: [],
  }
  
  try {
    // Verificar autenticação
    const authHeader = c.req.header('Authorization') || ''
    const cronSecret = c.req.header('x-cron-secret')
    const expectedSecret = Deno.env.get('CRON_SECRET')
    
    const isServiceRole = authHeader.includes('service_role') || authHeader.includes('eyJ')
    const isValidCronSecret = cronSecret && expectedSecret && cronSecret === expectedSecret
    
    if (!isServiceRole && !isValidCronSecret) {
      console.warn('⚠️ [Reconcile] Unauthorized request')
      await updateRunStatus(supabase, runId, 'failed', stats, 'Unauthorized')
      return c.json(errorResponse('Unauthorized'), 401)
    }
    
    // Parâmetros
    const dryRun = c.req.query('dryRun') === 'true'
    const limit = Math.min(parseInt(c.req.query('limit') || `${MAX_RESERVATIONS}`), MAX_RESERVATIONS)
    
    console.log(`Mode: ${dryRun ? 'DRY RUN (simulação)' : 'PRODUCTION'}`)
    console.log(`Limit: ${limit} reservations`)
    
    // Carregar configuração Stays.net
    const config = await loadStaysNetRuntimeConfigOrThrow(organizationId)
    console.log(`✅ Stays.net config loaded: ${config.baseUrl}`)
    
    // Buscar reservas para reconciliar
    // - Status: confirmed, pending, checked_in (não canceladas ou finalizadas)
    // - Checkout: últimos 7 dias até 90 dias no futuro
    // - external_id NOT NULL (reservas importadas da Stays.net)
    const today = new Date()
    const pastDate = new Date(today)
    pastDate.setDate(pastDate.getDate() - 7) // 7 dias atrás
    const futureDate = new Date(today)
    futureDate.setDate(futureDate.getDate() + 90) // 90 dias no futuro
    
    const { data: reservations, error: fetchError } = await supabase
      .from('reservations')
      .select('id, external_id, property_id, check_in, check_out, status, platform')
      .eq('organization_id', organizationId)
      .in('status', ['confirmed', 'pending', 'checked_in'])
      .not('external_id', 'is', null)
      .neq('external_id', '')
      .gte('check_out', pastDate.toISOString().split('T')[0])
      .lte('check_out', futureDate.toISOString().split('T')[0])
      .order('check_in', { ascending: true })
      .limit(limit)
    
    if (fetchError) {
      throw new Error(`Failed to fetch reservations: ${fetchError.message}`)
    }
    
    if (!reservations || reservations.length === 0) {
      console.log('✅ Nenhuma reserva para reconciliar')
      await updateRunStatus(supabase, runId, 'completed', stats)
      return c.json(successResponse({ runId, stats, message: 'Nenhuma reserva para reconciliar' }))
    }
    
    console.log(`📊 Found ${reservations.length} reservations to check`)
    console.log(`${'─'.repeat(60)}`)
    
    // Processar em batches
    for (let i = 0; i < reservations.length; i += BATCH_SIZE) {
      const batch = reservations.slice(i, i + BATCH_SIZE) as ReservationToCheck[]
      
      console.log(`\n🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(reservations.length / BATCH_SIZE)} (${batch.length} reservations)`)
      
      for (const reservation of batch) {
        stats.totalChecked++
        
        if (dryRun) {
          // Em dry run, apenas verifica sem aplicar
          const { found, data, error } = await fetchStaysReservation(reservation.external_id, config)
          
          if (!found && !error) {
            stats.foundDeleted++
            console.log(`🔍 [DRY RUN] Would cancel: ${reservation.external_id} (deleted from Stays)`)
          } else if (data) {
            const apiStatus = mapStaysStatus(data.type)
            if (reservation.status !== apiStatus) {
              stats.foundModified++
              console.log(`🔍 [DRY RUN] Would update: ${reservation.external_id} (${reservation.status} → ${apiStatus})`)
            }
          }
        } else {
          await processReservation(reservation, config, supabase, runId, stats)
        }
        
        // Rate limiting
        await delay(API_DELAY_MS)
      }
    }
    
    // Finalizar
    const duration = Date.now() - startTime
    const status = stats.errors.length > 0 ? 'partial' : 'completed'
    
    await updateRunStatus(supabase, runId, status, stats, undefined, duration)
    
    console.log(`\n${'═'.repeat(60)}`)
    console.log(`✅ RECONCILIAÇÃO CONCLUÍDA`)
    console.log(`${'═'.repeat(60)}`)
    console.log(`Total verificadas: ${stats.totalChecked}`)
    console.log(`Deletadas encontradas: ${stats.foundDeleted}`)
    console.log(`Modificadas encontradas: ${stats.foundModified}`)
    console.log(`Ações: ${stats.actionCancelled} canceladas, ${stats.actionUpdated} atualizadas, ${stats.actionSkipped} ignoradas`)
    console.log(`Erros: ${stats.errors.length}`)
    console.log(`Duração: ${duration}ms`)
    console.log(`${'═'.repeat(60)}\n`)
    
    return c.json(successResponse({
      runId,
      stats,
      duration,
      dryRun,
      message: `Reconciliação ${dryRun ? 'simulada' : 'concluída'}: ${stats.actionCancelled} canceladas, ${stats.actionUpdated} atualizadas`,
    }))
    
  } catch (error: any) {
    console.error('❌ [Reconcile] Error:', error)
    await updateRunStatus(supabase, runId, 'failed', stats, error.message)
    return c.json(errorResponse('Erro na reconciliação', { details: error.message }), 500)
  }
}

/**
 * Atualiza status da execução
 */
async function updateRunStatus(
  supabase: SupabaseClient,
  runId: string,
  status: string,
  stats: ReconciliationStats,
  errorMessage?: string,
  duration?: number
): Promise<void> {
  try {
    await supabase
      .from('reconciliation_runs')
      .update({
        status,
        finished_at: new Date().toISOString(),
        duration_ms: duration || 0,
        total_checked: stats.totalChecked,
        found_deleted: stats.foundDeleted,
        found_modified: stats.foundModified,
        found_orphan: stats.foundOrphan,
        action_cancelled: stats.actionCancelled,
        action_updated: stats.actionUpdated,
        action_skipped: stats.actionSkipped,
        error_message: errorMessage,
        summary: {
          errors: stats.errors,
          timestamp: new Date().toISOString(),
        },
      })
      .eq('id', runId)
  } catch (err) {
    console.warn(`[Reconcile] Failed to update run status: ${err}`)
  }
}

// ============================================================================
// PARTE 2: IMPORTAÇÃO DE RESERVAS FALTANTES
// ============================================================================
// Busca reservas no Stays.net que NÃO existem no Rendizy e importa

interface ImportStats {
  staysCount: number
  rendizyCount: number
  missing: number
  imported: number
  skipped: number
  errors: string[]
}

/**
 * ⚠️ CORREÇÃO BUG CRÍTICO (2026-01-30)
 * Mapeia o campo 'type' do StaysNet para o status correto do Rendizy.
 * 
 * Problema original: O código comparava apenas 'cancelled' (britânico),
 * mas Stays.net também pode enviar 'canceled' (americano), 'cancelada' (PT-BR).
 */
function deriveStatusFromStaysType(staysType?: string): 'cancelled' | 'confirmed' | 'pending' {
  const typeLower = String(staysType || '').trim().toLowerCase();
  
  // Cancelamentos (múltiplos idiomas e ortografias)
  if (['canceled', 'cancelled', 'cancelada', 'cancelado'].includes(typeLower)) {
    return 'cancelled';
  }
  
  // Reservas confirmadas
  if (['booked', 'new', 'contract', 'confirmed'].includes(typeLower)) {
    return 'confirmed';
  }
  
  // Bloqueios - tratados como confirmed (serão filtrados em outro lugar)
  if (['blocked', 'maintenance', 'unavailable', 'owner_block', 'owner'].includes(typeLower)) {
    return 'confirmed';
  }
  
  // Default
  return 'pending';
}

/**
 * Busca todas as reservas da Stays.net por dateType (com paginação)
 */
async function fetchAllStaysReservations(
  config: ReconciliationConfig,
  params: { from: string; to: string; dateType: 'arrival' | 'departure' | 'creation' }
): Promise<any[]> {
  const allReservations: any[] = [];
  let skip = 0;
  const limit = 20; // Stays.net limit max
  let hasMore = true;
  let pages = 0;
  const maxPages = 100;

  while (hasMore && pages < maxPages) {
    const url = new URL(`${config.baseUrl}/booking/reservations`);
    url.searchParams.set('from', params.from);
    url.searchParams.set('to', params.to);
    url.searchParams.set('dateType', params.dateType);
    url.searchParams.set('limit', limit.toString());
    url.searchParams.set('skip', skip.toString());

    const response = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${config.apiKey}:${config.apiSecret || ''}`)}`,
      },
    });
    
    if (!response.ok) {
      console.error(`[ImportFaltantes] API error: ${response.status}`);
      break;
    }

    const data = await response.json();
    
    // API pode retornar array direto ou { data: [...] }
    let reservations: any[] = [];
    if (Array.isArray(data)) {
      reservations = data;
    } else if (data?.data && Array.isArray(data.data)) {
      reservations = data.data;
    } else if (data?.reservations && Array.isArray(data.reservations)) {
      reservations = data.reservations;
    }

    allReservations.push(...reservations);
    
    hasMore = reservations.length === limit;
    skip += limit;
    pages++;
  }

  return allReservations;
}

/**
 * Importa uma reserva única da Stays.net para o Rendizy
 */
async function importMissingReservation(
  supabase: SupabaseClient,
  staysRes: any,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  const code = staysRes.code || staysRes.localizator || staysRes._localizator;
  const mongoId = staysRes._id || staysRes.id;
  
  if (!code && !mongoId) {
    return { success: false, error: 'Reserva sem identificador' };
  }

  // Buscar propriedade mapeada
  const listingId = staysRes.listing?._id || staysRes.listingId || staysRes._listing;
  
  let propertyId: string | null = null;
  
  if (listingId) {
    // Buscar no JSONB data.externalIds.staysnet_listing_id
    const { data: properties } = await supabase
      .from('properties')
      .select('id, data')
      .eq('organization_id', organizationId);

    for (const prop of (properties || [])) {
      const d = prop.data || {};
      if (
        d?.externalIds?.staysnet_listing_id === listingId ||
        d?.externalIds?.staysnet_property_id === listingId ||
        d?.staysnet_raw?._id === listingId ||
        d?.staysnetListingId === listingId
      ) {
        propertyId = prop.id;
        break;
      }
    }
  }

  if (!propertyId) {
    // Registrar issue de mapeamento
    try {
      await supabase.from('staysnet_import_issues').insert({
        organization_id: organizationId,
        issue_type: 'unmapped_property',
        details: {
          reservation_code: code,
          listing_id: listingId,
          listing_name: staysRes.listing?.internalName,
          source: 'reconciliation-import',
        },
        created_at: new Date().toISOString(),
      });
    } catch {
      // Ignorar erro se tabela não existir
    }
    
    return { success: false, error: `Propriedade não mapeada: ${listingId}` };
  }

  // Buscar ou criar hóspede
  let guestId: string | null = null;
  const guestData = staysRes.client || staysRes.guest;
  
  if (guestData) {
    const guestEmail = guestData.email || guestData._email || null;
    const guestPhone = guestData.phone || guestData._phone || null;
    const guestName = guestData.name || guestData._name || `${guestData.firstName || ''} ${guestData.lastName || ''}`.trim();

    // Tentar encontrar hóspede existente
    if (guestEmail || guestPhone) {
      let query = supabase
        .from('guests')
        .select('id')
        .eq('organization_id', organizationId);
      
      if (guestEmail) {
        query = query.eq('email', guestEmail);
      } else if (guestPhone) {
        query = query.eq('phone', guestPhone);
      }
      
      const { data: existingGuest } = await query.limit(1).single();

      if (existingGuest) {
        guestId = existingGuest.id;
      }
    }

    // Criar hóspede se não existir
    if (!guestId && guestName) {
      const newGuestId = crypto.randomUUID();
      const { error: guestError } = await supabase
        .from('guests')
        .insert({
          id: newGuestId,
          organization_id: organizationId,
          name: guestName,
          email: guestEmail,
          phone: guestPhone,
          external_id: guestData._id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (!guestError) {
        guestId = newGuestId;
      }
    }
  }

  // Determinar status correto (usando a função corrigida)
  const status = deriveStatusFromStaysType(staysRes.type);

  // Extrair datas
  const checkIn = staysRes.checkInDate || staysRes.arrival || staysRes._checkInDate || staysRes.checkIn;
  const checkOut = staysRes.checkOutDate || staysRes.departure || staysRes._checkOutDate || staysRes.checkOut;

  // Criar reserva
  const reservationId = crypto.randomUUID();
  const { error: insertError } = await supabase
    .from('reservations')
    .insert({
      id: reservationId,
      organization_id: organizationId,
      property_id: propertyId,
      guest_id: guestId,
      external_id: mongoId,
      staysnet_reservation_code: code,
      status: status,
      check_in: checkIn?.split('T')[0],
      check_out: checkOut?.split('T')[0],
      nights: staysRes.nights || staysRes._nights,
      total: staysRes.price?.total || staysRes._totalPrice,
      currency: staysRes.price?.currency || 'BRL',
      platform: staysRes.channel?.name || staysRes._mchannel || 'stays.net',
      source_created_at: staysRes.creationDate || staysRes.createdAt || staysRes._createdAt,
      data: {
        staysnet_raw: staysRes,
        importedBy: 'reconciliation-cron-v2',
        importedAt: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  console.log(`   ✅ Importada: ${code} → ${reservationId} (${status})`);
  return { success: true };
}

/**
 * Importa reservas faltantes por dateType
 */
async function importMissingByDateType(
  supabase: SupabaseClient,
  config: ReconciliationConfig,
  organizationId: string,
  dateType: 'arrival' | 'creation',
  from: string,
  to: string
): Promise<ImportStats> {
  const stats: ImportStats = {
    staysCount: 0,
    rendizyCount: 0,
    missing: 0,
    imported: 0,
    skipped: 0,
    errors: [],
  };

  console.log(`\n📊 [Import ${dateType}] ${from} → ${to}`);

  // 1. Buscar reservas da Stays.net
  const staysReservations = await fetchAllStaysReservations(config, { from, to, dateType });
  stats.staysCount = staysReservations.length;
  console.log(`   Stays.net: ${staysReservations.length} reservas`);

  if (staysReservations.length === 0) {
    return stats;
  }

  // 2. Extrair códigos das reservas Stays
  const staysByCode = new Map<string, any>();
  const staysByMongoId = new Map<string, any>();
  
  for (const res of staysReservations) {
    const code = res.code || res.localizator || res._localizator;
    const mongoId = res._id || res.id;
    
    if (code) staysByCode.set(code.toUpperCase(), res);
    if (mongoId) staysByMongoId.set(mongoId, res);
  }
  
  console.log(`   Códigos extraídos: ${staysByCode.size}`);
  console.log(`   MongoIds extraídos: ${staysByMongoId.size}`);
  
  // 3. Buscar TODAS as reservas do Rendizy (para comparação correta)
  // Usar range() para pegar mais que o limite padrão de 1000
  let allExistingReservations: any[] = [];
  let offset = 0;
  const batchSize = 1000;
  
  while (true) {
    const { data: batch, error: fetchError } = await supabase
      .from('reservations')
      .select('id, staysnet_reservation_code, external_id')
      .eq('organization_id', organizationId)
      .range(offset, offset + batchSize - 1);
    
    if (fetchError) {
      console.error(`   ❌ Erro ao buscar reservas (offset ${offset}): ${fetchError.message}`);
      stats.errors.push(`Erro ao buscar reservas: ${fetchError.message}`);
      return stats;
    }
    
    if (!batch || batch.length === 0) break;
    
    allExistingReservations = allExistingReservations.concat(batch);
    console.log(`   Batch ${offset / batchSize + 1}: +${batch.length} reservas (total: ${allExistingReservations.length})`);
    
    if (batch.length < batchSize) break;
    offset += batchSize;
  }

  // 4. Criar set de reservas existentes (filtrar em memória)
  const existingCodes = new Set<string>();
  const existingMongoIds = new Set<string>();
  
  for (const res of allExistingReservations) {
    if (res.staysnet_reservation_code) {
      existingCodes.add(res.staysnet_reservation_code.toUpperCase());
    }
    if (res.external_id) {
      existingMongoIds.add(res.external_id);
    }
  }

  stats.rendizyCount = allExistingReservations.length;
  console.log(`   Rendizy total: ${stats.rendizyCount} reservas`);
  console.log(`   Rendizy com código: ${existingCodes.size}`);
  console.log(`   Rendizy com external_id: ${existingMongoIds.size}`);

  // 5. Identificar e importar reservas faltantes
  for (const [code, staysRes] of staysByCode.entries()) {
    const mongoId = staysRes._id || staysRes.id;
    const exists = existingCodes.has(code) || (mongoId && existingMongoIds.has(mongoId));
    
    if (exists) continue;
    
    stats.missing++;
    
    // Verificar se é bloqueio (não importamos como reserva)
    const typeLower = String(staysRes.type || '').toLowerCase();
    if (['blocked', 'maintenance', 'unavailable', 'owner_block', 'owner'].includes(typeLower)) {
      stats.skipped++;
      continue;
    }
    
    const result = await importMissingReservation(supabase, staysRes, organizationId);
    
    if (result.success) {
      stats.imported++;
    } else {
      stats.errors.push(`${code}: ${result.error}`);
    }
    
    // Rate limiting
    await delay(100);
  }

  console.log(`   Faltantes: ${stats.missing} | Importadas: ${stats.imported} | Erros: ${stats.errors.length}`);
  
  return stats;
}

/**
 * POST /cron/staysnet-import-missing
 * 
 * Endpoint separado para importar reservas faltantes.
 * Pode ser chamado junto com o reconcile ou separadamente.
 * 
 * Query params:
 * - daysAhead: número de dias à frente para check-in (default: 14)
 * - daysBack: número de dias atrás para criação (default: 3)
 * - configOrgId: org_id onde está a configuração Stays (default: busca global ou env)
 */
export async function cronStaysnetImportMissing(c: Context) {
  const startTime = Date.now();
  // Org ID para operações de dados (reservas, properties, guests)
  const dataOrgId = DEFAULT_ORG_ID;
  // Org ID para carregar configuração Stays (pode ser diferente!)
  const configOrgId = c.req.query('configOrgId') || DEFAULT_ORG_ID;
  
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📥 IMPORTAÇÃO DE RESERVAS FALTANTES - ${new Date().toISOString()}`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`   Data Org ID: ${dataOrgId}`);
  console.log(`   Config Org ID: ${configOrgId}`);
  
  try {
    // Verificar autenticação
    const authHeader = c.req.header('Authorization') || '';
    const cronSecret = c.req.header('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    
    const isServiceRole = authHeader.includes('service_role') || authHeader.includes('eyJ');
    const isValidCronSecret = cronSecret && expectedSecret && cronSecret === expectedSecret;
    
    if (!isServiceRole && !isValidCronSecret) {
      console.warn('⚠️ [ImportMissing] Unauthorized request');
      return c.json(errorResponse('Unauthorized'), 401);
    }
    
    // Parâmetros
    const daysAhead = parseInt(c.req.query('daysAhead') || '14', 10);
    const daysBack = parseInt(c.req.query('daysBack') || '3', 10);
    
    console.log(`Days ahead (arrival): ${daysAhead}`);
    console.log(`Days back (creation): ${daysBack}`);
    
    // Conectar Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Carregar configuração Stays.net (pode estar em org diferente!)
    const config = await loadStaysNetRuntimeConfigOrThrow(configOrgId);
    
    // Calcular datas
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const aheadDate = new Date();
    aheadDate.setDate(aheadDate.getDate() + daysAhead);
    const aheadStr = aheadDate.toISOString().split('T')[0];
    
    const backDate = new Date();
    backDate.setDate(backDate.getDate() - daysBack);
    const backStr = backDate.toISOString().split('T')[0];
    
    // Importar por arrival (check-in nos próximos N dias)
    // Usa dataOrgId para operações de banco!
    const arrivalStats = await importMissingByDateType(
      supabase, config, dataOrgId,
      'arrival', todayStr, aheadStr
    );
    
    // Importar por creation (criadas nos últimos N dias)
    const creationStats = await importMissingByDateType(
      supabase, config, dataOrgId,
      'creation', backStr, todayStr
    );
    
    const duration = Date.now() - startTime;
    
    const totalImported = arrivalStats.imported + creationStats.imported;
    const totalErrors = arrivalStats.errors.length + creationStats.errors.length;
    
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`✅ IMPORTAÇÃO CONCLUÍDA em ${duration}ms`);
    console.log(`   Total importadas: ${totalImported}`);
    console.log(`   Erros: ${totalErrors}`);
    console.log(`${'═'.repeat(60)}\n`);
    
    return c.json(successResponse({
      duration,
      byArrival: arrivalStats,
      byCreation: creationStats,
      totalImported,
      totalErrors,
      message: `Importadas ${totalImported} reservas faltantes`,
    }));
    
  } catch (error: any) {
    console.error('❌ [ImportMissing] Error:', error);
    return c.json(errorResponse('Erro na importação', { details: error.message }), 500);
  }
}

/**
 * GET /cron/staysnet-debug-missing?code=EX49J&from=2025-04-01&to=2025-05-31
 * 
 * Endpoint para debug - verifica se uma reserva específica existe na Stays e no Rendizy
 */
export async function debugMissingReservation(c: Context) {
  const code = c.req.query('code');
  const from = c.req.query('from') || '2025-04-01';
  const to = c.req.query('to') || '2025-05-31';
  const configOrgId = c.req.query('configOrgId') || DEFAULT_ORG_ID;
  const dataOrgId = DEFAULT_ORG_ID;
  
  if (!code) {
    return c.json(errorResponse('Parâmetro "code" é obrigatório'), 400);
  }
  
  try {
    // Conectar Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Carregar config Stays
    const config = await loadStaysNetRuntimeConfigOrThrow(configOrgId);
    
    // Verificar no Rendizy
    const { data: rendizyRes, error: rendizyErr } = await supabase
      .from('reservations')
      .select('id, staysnet_reservation_code, external_id, status, check_in, check_out, created_at')
      .or(`staysnet_reservation_code.ilike.${code},external_id.ilike.%${code}%`)
      .eq('organization_id', dataOrgId);
    
    // Buscar na Stays (apenas um período)
    console.log(`Buscando na Stays: ${from} → ${to}`);
    const byArrival = await fetchAllStaysReservations(config, {
      from,
      to,
      dateType: 'arrival'
    });
    
    console.log(`Total da Stays no período: ${byArrival.length}`);
    
    const match = byArrival.find(r => 
      (r.code || r.localizator || '').toUpperCase() === code.toUpperCase()
    );
    
    const staysResult = match ? {
      found: true,
      reservation: {
        code: match.code || match.localizator,
        mongoId: match._id || match.id,
        arrival: match.arrival || match.checkInDate,
        departure: match.departure || match.checkOutDate,
        type: match.type,
        createdAt: match.createdAt || match._createdAt,
      }
    } : { found: false };
    
    return c.json(successResponse({
      searchedCode: code,
      searchPeriod: { from, to },
      rendizy: {
        found: (rendizyRes?.length || 0) > 0,
        count: rendizyRes?.length || 0,
        data: rendizyRes,
        error: rendizyErr?.message,
      },
      stays: staysResult,
      staysTotal: byArrival.length,
      conclusion: (rendizyRes?.length || 0) > 0 
        ? 'Reserva JÁ EXISTE no Rendizy' 
        : staysResult.found 
          ? 'Reserva EXISTE na Stays mas NÃO no Rendizy (faltante)' 
          : 'Reserva NÃO ENCONTRADA na Stays no período especificado'
    }));
    
  } catch (error: any) {
    return c.json(errorResponse('Erro ao debugar', { details: error.message }), 500);
  }
}
