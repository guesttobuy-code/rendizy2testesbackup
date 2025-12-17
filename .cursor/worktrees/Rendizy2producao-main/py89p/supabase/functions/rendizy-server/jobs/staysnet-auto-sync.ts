/**
 * ⏰ JOB: Sincronização Automática Stays.net
 * 
 * Executa sincronização automática a cada 1 minuto
 * Verifica reservas novas, canceladas e atualiza calendário
 * 
 * @version 1.0.0
 * @updated 2025-11-22
 */

import * as kv from '../kv_store.tsx';
import { StaysNetClient } from '../routes-staysnet.ts';
import { fullSyncStaysNet } from '../sync/staysnet-full-sync.ts';
import { syncStaysNetCalendar } from '../sync/staysnet-sync-calendar.ts';

interface StaysNetConfig {
  apiKey: string;
  apiSecret?: string;
  baseUrl: string;
  enabled: boolean;
  autoSyncEnabled?: boolean;
  lastSync?: string;
}

/**
 * Executa sincronização automática para uma organização
 */
export async function executeAutoSync(organizationId: string): Promise<{
  success: boolean;
  stats: any;
}> {
  try {
    console.log(`[StaysNet Auto Sync] 🚀 Iniciando sincronização automática para org: ${organizationId}`);

    // Buscar configuração
    const config = await kv.get<StaysNetConfig>('settings:staysnet');
    if (!config || !config.apiKey || !config.enabled) {
      console.log('[StaysNet Auto Sync] ⚠️ Stays.net não configurado ou desabilitado');
      return {
        success: false,
        stats: { error: 'Stays.net not configured or disabled' },
      };
    }

    // Verificar se auto-sync está habilitado
    if (config.autoSyncEnabled === false) {
      console.log('[StaysNet Auto Sync] ⚠️ Auto-sync desabilitado');
      return {
        success: false,
        stats: { error: 'Auto-sync disabled' },
      };
    }

    const client = new StaysNetClient(config.apiKey, config.baseUrl, config.apiSecret);

    // Buscar reservas dos últimos 7 dias e próximos 30 dias
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`[StaysNet Auto Sync] 📅 Período: ${startDateStr} até ${endDateStr}`);

    // 1. Sincronizar reservas (novas e atualizadas)
    console.log('[StaysNet Auto Sync] 📥 Sincronizando reservas...');
    const reservationsResult = await fullSyncStaysNet(
      client,
      organizationId,
      [], // Todas as propriedades
      startDateStr,
      endDateStr
    );

    // 2. Sincronizar calendário
    console.log('[StaysNet Auto Sync] 📅 Sincronizando calendário...');
    const calendarResult = await syncStaysNetCalendar(
      client,
      organizationId,
      undefined, // Todas as propriedades
      startDateStr,
      endDateStr
    );

    // Atualizar lastSync
    await kv.set('settings:staysnet', {
      ...config,
      lastSync: new Date().toISOString(),
    });

    console.log('[StaysNet Auto Sync] ✅ Sincronização automática concluída!');

    return {
      success: reservationsResult.success && calendarResult.success,
      stats: {
        reservations: reservationsResult.stats,
        calendar: calendarResult.stats,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('[StaysNet Auto Sync] ❌ Erro na sincronização automática:', error);
    return {
      success: false,
      stats: {
        error: error.message,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Inicia o job de sincronização automática
 * Deve ser chamado por um cron job ou scheduler externo
 */
export async function startAutoSyncJob() {
  console.log('[StaysNet Auto Sync] ⏰ Job de sincronização automática iniciado');

  // Buscar todas as organizações ativas
  // Por enquanto, usar organização padrão
  const defaultOrgId = 'org_default';

  try {
    const result = await executeAutoSync(defaultOrgId);
    console.log('[StaysNet Auto Sync] 📊 Resultado:', result);
    return result;
  } catch (error: any) {
    console.error('[StaysNet Auto Sync] ❌ Erro no job:', error);
    return {
      success: false,
      stats: { error: error.message },
    };
  }
}

