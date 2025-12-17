// ============================================================================
// EVENT BUS - Sistema de Eventos para Automações
// ============================================================================
// Captura eventos do sistema e dispara automações correspondentes
// ============================================================================

import { getSupabaseClient } from '../kv_store.tsx';
import { logInfo, logError } from '../utils.ts';

export type EventType =
  | 'reservation.created'
  | 'reservation.checkin'
  | 'reservation.checkout'
  | 'reservation.cancelled'
  | 'reservation.confirmed'
  | 'financial.daily_revenue_threshold'
  | 'financial.lancamento.created'
  | 'chat.new_message'
  | 'dashboard.kpi_changed'
  | 'cron.daily'
  | 'cron.hourly';

export interface AutomationEvent {
  type: EventType;
  organizationId: string;
  payload: Record<string, any>;
  timestamp: string;
}

/**
 * Publica um evento no Event Bus
 * Isso dispara a verificação de automações que correspondem ao evento
 */
export async function publishEvent(event: AutomationEvent): Promise<void> {
  try {
    logInfo(`[EventBus] Publicando evento: ${event.type}`, { organizationId: event.organizationId });

    // Buscar automações ativas que correspondem a este evento
    const supabase = getSupabaseClient();
    
    const { data: automations, error } = await supabase
      .from('automations')
      .select('*')
      .eq('organization_id', event.organizationId)
      .eq('status', 'active');

    if (error) {
      logError('[EventBus] Erro ao buscar automações', error);
      return;
    }

    if (!automations || automations.length === 0) {
      logInfo(`[EventBus] Nenhuma automação ativa encontrada para org ${event.organizationId}`);
      return;
    }

    // Filtrar automações que correspondem ao tipo de evento
    const matchingAutomations = automations.filter((automation) => {
      const trigger = automation.definition?.trigger;
      if (!trigger) return false;

      // Verificar se o tipo de trigger corresponde ao evento
      return trigger.type === event.type || 
             (event.type.startsWith('reservation.') && trigger.type === 'reservation.*') ||
             (event.type.startsWith('financial.') && trigger.type === 'financial.*');
    });

    if (matchingAutomations.length === 0) {
      logInfo(`[EventBus] Nenhuma automação corresponde ao evento ${event.type}`);
      return;
    }

    logInfo(`[EventBus] ${matchingAutomations.length} automação(ões) correspondem ao evento ${event.type}`);

    // Importar executor dinamicamente para evitar dependência circular
    const { executeAutomation } = await import('./automation-executor.ts');

    // Executar cada automação correspondente
    for (const automation of matchingAutomations) {
      try {
        await executeAutomation(automation, event);
      } catch (error) {
        logError(`[EventBus] Erro ao executar automação ${automation.id}`, error);
        // Continuar com outras automações mesmo se uma falhar
      }
    }
  } catch (error) {
    logError('[EventBus] Erro inesperado ao publicar evento', error);
  }
}

/**
 * Helper para publicar eventos de reserva
 */
export async function publishReservationEvent(
  type: 'created' | 'checkin' | 'checkout' | 'cancelled' | 'confirmed',
  organizationId: string,
  reservation: any
): Promise<void> {
  await publishEvent({
    type: `reservation.${type}` as EventType,
    organizationId,
    payload: {
      reservationId: reservation.id,
      propertyId: reservation.propertyId || reservation.property_id,
      guestId: reservation.guestId || reservation.guest_id,
      checkIn: reservation.checkIn || reservation.check_in,
      checkOut: reservation.checkOut || reservation.check_out,
      status: reservation.status,
      total: reservation.pricing?.total || reservation.total,
      ...reservation,
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Helper para publicar eventos financeiros
 */
export async function publishFinancialEvent(
  type: 'daily_revenue_threshold' | 'lancamento.created',
  organizationId: string,
  payload: Record<string, any>
): Promise<void> {
  await publishEvent({
    type: `financial.${type}` as EventType,
    organizationId,
    payload,
    timestamp: new Date().toISOString(),
  });
}

