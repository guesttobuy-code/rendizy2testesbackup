// ============================================================================
// STAYS.NET DATABASE HELPERS
// Acesso direto ao banco de dados Supabase para Stays.net
// ============================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";
import { SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, SUPABASE_PROJECT_REF } from './utils-env.ts';

interface StaysNetConfig {
  apiKey: string;
  apiSecret?: string;
  baseUrl: string;
  accountName?: string;
  notificationWebhookUrl?: string;
  scope?: 'global' | 'individual';
  enabled: boolean;
  lastSync?: string;
}

interface StaysNetConfigDB {
  id?: string;
  organization_id: string;
  api_key: string;
  api_secret?: string;
  base_url: string;
  account_name?: string;
  notification_webhook_url?: string;
  scope: 'global' | 'individual';
  enabled: boolean;
  last_sync?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

function getSupabaseClient() {
  const url = SUPABASE_URL ?? '';
  const key = SUPABASE_SERVICE_ROLE_KEY ?? '';
  
  console.log('[StaysNet DB] 🔧 Creating client with URL:', url ? url.substring(0, 30) + '...' : 'EMPTY');
  console.log('[StaysNet DB] 🔧 Key available:', key ? 'YES (' + key.length + ' chars)' : 'NO');
  
  if (!url || !key) {
    console.error('[StaysNet DB] ❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY!');
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(url, key);
}

// ============================================================================
// CONFIG FUNCTIONS
// ============================================================================

/**
 * Salva configuração do Stays.net no banco de dados
 */
export async function saveStaysNetConfigDB(
  config: StaysNetConfig,
  organizationId: string = 'global'
): Promise<{ success: boolean; data?: StaysNetConfigDB; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    
    const configDB: Omit<StaysNetConfigDB, 'id' | 'created_at' | 'updated_at'> = {
      organization_id: organizationId,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      base_url: config.baseUrl,
      account_name: config.accountName,
      notification_webhook_url: config.notificationWebhookUrl,
      scope: config.scope || 'global',
      enabled: config.enabled || false,
      last_sync: config.lastSync ? new Date(config.lastSync).toISOString() : undefined,
    };

    const { data, error } = await supabase
      .from('staysnet_config')
      .upsert(configDB, {
        onConflict: 'organization_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('[StaysNet DB] ❌ Erro ao salvar configuração:', error);
      return { success: false, error: error.message };
    }

    console.log('[StaysNet DB] ✅ Configuração salva no banco de dados');
    return { success: true, data: data as StaysNetConfigDB };
  } catch (error) {
    console.error('[StaysNet DB] ❌ Erro ao salvar configuração:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Carrega configuração do Stays.net do banco de dados
 */
export async function loadStaysNetConfigDB(
  organizationId: string = 'global'
): Promise<{ success: boolean; data?: StaysNetConfig; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('staysnet_config')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      console.error('[StaysNet DB] ❌ Erro ao carregar configuração:', error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: true, data: undefined };
    }

    // Converter formato do banco para formato da interface
    const config: StaysNetConfig = {
      apiKey: data.api_key,
      apiSecret: data.api_secret,
      baseUrl: data.base_url,
      accountName: data.account_name,
      notificationWebhookUrl: data.notification_webhook_url,
      scope: data.scope,
      enabled: data.enabled,
      lastSync: data.last_sync,
    };

    console.log('[StaysNet DB] ✅ Configuração carregada do banco de dados');
    return { success: true, data: config };
  } catch (error) {
    console.error('[StaysNet DB] ❌ Erro ao carregar configuração:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// WEBHOOK FUNCTIONS
// ============================================================================

/**
 * Salva webhook recebido no banco de dados
 */
export async function saveStaysNetWebhookDB(
  organizationId: string,
  action: string,
  payload: any,
  metadata?: any
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('staysnet_webhooks')
      .insert({
        organization_id: organizationId,
        action,
        payload,
        metadata,
        received_at: new Date().toISOString(),
        processed: false,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[StaysNet DB] ❌ Erro ao salvar webhook:', error);
      return { success: false, error: error.message };
    }

    console.log('[StaysNet DB] ✅ Webhook salvo no banco de dados:', data.id);
    return { success: true, id: data.id };
  } catch (error) {
    console.error('[StaysNet DB] ❌ Erro ao salvar webhook:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Marca webhook como processado
 */
export async function markWebhookProcessedDB(
  webhookId: string,
  errorMessage?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('staysnet_webhooks')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq('id', webhookId);

    if (error) {
      console.error('[StaysNet DB] ❌ Erro ao marcar webhook como processado:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('[StaysNet DB] ❌ Erro ao marcar webhook como processado:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export interface StaysNetWebhookRow {
  id: string;
  organization_id: string;
  action: string;
  payload: any;
  metadata?: any;
  received_at: string;
  processed: boolean;
}

/**
 * Lista webhooks pendentes (processed=false), em ordem de chegada.
 */
export async function listPendingWebhooksDB(
  organizationId: string,
  limit: number = 25,
): Promise<{ success: boolean; data?: StaysNetWebhookRow[]; error?: string }> {
  try {
    const supabase = getSupabaseClient();

    const safeLimit = Math.max(1, Math.min(200, Number(limit) || 25));
    const { data, error } = await supabase
      .from('staysnet_webhooks')
      .select('id, organization_id, action, payload, metadata, received_at, processed')
      .eq('organization_id', organizationId)
      .eq('processed', false)
      .order('received_at', { ascending: true })
      .limit(safeLimit);

    if (error) {
      console.error('[StaysNet DB] ❌ Erro ao listar webhooks pendentes:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: (data || []) as any };
  } catch (error) {
    console.error('[StaysNet DB] ❌ Erro ao listar webhooks pendentes:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// SYNC LOG FUNCTIONS
// ============================================================================

/**
 * Cria log de sincronização
 */
export async function createSyncLogDB(
  organizationId: string,
  syncType: 'properties' | 'reservations' | 'calendar' | 'prices' | 'clients' | 'full',
  metadata?: any
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('staysnet_sync_log')
      .insert({
        organization_id: organizationId,
        sync_type: syncType,
        status: 'pending',
        started_at: new Date().toISOString(),
        metadata,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[StaysNet DB] ❌ Erro ao criar log de sincronização:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data.id };
  } catch (error) {
    console.error('[StaysNet DB] ❌ Erro ao criar log de sincronização:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Atualiza log de sincronização
 */
export async function updateSyncLogDB(
  logId: string,
  status: 'running' | 'success' | 'error' | 'partial',
  stats?: {
    itemsSynced?: number;
    itemsCreated?: number;
    itemsUpdated?: number;
    itemsFailed?: number;
  },
  errorMessage?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    
    const updateData: any = {
      status,
      completed_at: new Date().toISOString(),
    };

    if (stats) {
      updateData.items_synced = stats.itemsSynced || 0;
      updateData.items_created = stats.itemsCreated || 0;
      updateData.items_updated = stats.itemsUpdated || 0;
      updateData.items_failed = stats.itemsFailed || 0;
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    const { error } = await supabase
      .from('staysnet_sync_log')
      .update(updateData)
      .eq('id', logId);

    if (error) {
      console.error('[StaysNet DB] ❌ Erro ao atualizar log de sincronização:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('[StaysNet DB] ❌ Erro ao atualizar log de sincronização:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// CACHE FUNCTIONS
// ============================================================================

/**
 * Salva reserva no cache
 */
export async function saveReservationCacheDB(
  organizationId: string,
  staysnetReservationId: string,
  reservationData: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('staysnet_reservations_cache')
      .upsert({
        organization_id: organizationId,
        staysnet_reservation_id: staysnetReservationId,
        reservation_data: reservationData,
        synced_at: new Date().toISOString(),
        last_updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id,staysnet_reservation_id',
      });

    if (error) {
      console.error('[StaysNet DB] ❌ Erro ao salvar reserva no cache:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('[StaysNet DB] ❌ Erro ao salvar reserva no cache:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Salva propriedade no cache
 */
export async function savePropertyCacheDB(
  organizationId: string,
  staysnetPropertyId: string,
  propertyData: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('staysnet_properties_cache')
      .upsert({
        organization_id: organizationId,
        staysnet_property_id: staysnetPropertyId,
        property_data: propertyData,
        synced_at: new Date().toISOString(),
        last_updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id,staysnet_property_id',
      });

    if (error) {
      console.error('[StaysNet DB] ❌ Erro ao salvar propriedade no cache:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('[StaysNet DB] ❌ Erro ao salvar propriedade no cache:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
