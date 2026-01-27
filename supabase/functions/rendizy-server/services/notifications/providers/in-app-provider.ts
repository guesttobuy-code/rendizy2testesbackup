// ============================================================================
// IN-APP NOTIFICATION PROVIDER - Cápsula de notificações do dashboard
// ============================================================================
// Provider: Interno (Supabase)
// Canal: in_app
// Preço: Gratuito (usa banco existente)
// ============================================================================

import { BaseProvider } from '../base-provider.ts';
import { getSupabaseClient } from '../../../kv_store.tsx';
import type { AnyNotificationPayload, SendResult, InAppPayload } from '../types.ts';
import { logInfo, logError } from '../../../utils.ts';

/**
 * Provider de notificações in-app (dashboard)
 */
export class InAppProvider extends BaseProvider {
  name = 'in_app';
  channel = 'in_app' as const;

  /**
   * In-app sempre está configurado (usa banco interno)
   */
  async isConfigured(_organizationId: string): Promise<boolean> {
    return true;
  }

  async send(payload: AnyNotificationPayload): Promise<SendResult> {
    if (payload.channel !== 'in_app') {
      return this.errorResult('INVALID_CHANNEL', 'InAppProvider só aceita canal in_app');
    }

    const inAppPayload = payload as InAppPayload;
    const recipient = inAppPayload.userId || 'all';
    
    this.logStart(recipient, payload);

    try {
      const supabase = getSupabaseClient();

      // Mapeia tipo para priority
      const priorityMap: Record<string, string> = {
        'info': 'normal',
        'success': 'low',
        'warning': 'high',
        'error': 'urgent',
      };

      // Insere na tabela notifications
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          organization_id: payload.organizationId,
          type: inAppPayload.type || 'system',
          source: payload.metadata?.source || 'automation',
          title: inAppPayload.title,
          message: inAppPayload.message,
          priority: priorityMap[inAppPayload.type || 'info'] || payload.priority || 'normal',
          read: false,
          metadata: {
            ...payload.metadata,
            actionUrl: inAppPayload.actionUrl,
            actionLabel: inAppPayload.actionLabel,
            userId: inAppPayload.userId,
          },
        })
        .select('id')
        .single();

      if (error) {
        this.logFailure(recipient, error);
        return this.errorResult('DB_ERROR', error.message, error);
      }

      const messageId = data.id;
      this.logSuccess(recipient, messageId);

      return this.successResult(messageId, { insertedId: messageId });

    } catch (error: any) {
      this.logFailure(recipient, error);
      return this.errorResult('SEND_ERROR', error.message || 'Erro ao criar notificação');
    }
  }

  /**
   * Marca notificação como lida
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Busca notificações não lidas
   */
  async getUnreadCount(organizationId: string, userId?: string): Promise<number> {
    try {
      const supabase = getSupabaseClient();
      
      let query = supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('read', false);

      // Se userId especificado, filtra
      if (userId) {
        query = query.or(`metadata->>userId.eq.${userId},metadata->>userId.is.null`);
      }

      const { count } = await query;
      return count || 0;
    } catch {
      return 0;
    }
  }
}

// Singleton export
export const inAppProvider = new InAppProvider();
