// ============================================================================
// BASE PROVIDER - Classe base para todos os providers de notificação
// ============================================================================
// Implementa lógica comum: logging, retry, validação
// Cada provider específico estende esta classe
// ============================================================================

import { logInfo, logError, logWarning } from '../../utils.ts';
import { getSupabaseClient } from '../../kv_store.tsx';
import type { 
  NotificationProvider, 
  NotificationChannel, 
  AnyNotificationPayload, 
  SendResult,
  DeliveryStatus,
  ProviderConfig 
} from './types.ts';

/**
 * Classe base abstrata para providers de notificação
 */
export abstract class BaseProvider implements NotificationProvider {
  abstract name: string;
  abstract channel: NotificationChannel;

  /**
   * Busca configuração do provider no banco
   */
  protected async getConfig(organizationId: string): Promise<ProviderConfig | null> {
    try {
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('organization_settings')
        .select('settings')
        .eq('organization_id', organizationId)
        .single();

      if (error || !data?.settings) {
        return null;
      }

      // Busca config específica do provider
      const providerKey = `notification_${this.channel}_${this.name}`;
      return data.settings[providerKey] || null;
    } catch (err) {
      logError(`[${this.name}] Erro ao buscar config:`, err);
      return null;
    }
  }

  /**
   * Verifica se o provider está configurado
   */
  async isConfigured(organizationId: string): Promise<boolean> {
    const config = await this.getConfig(organizationId);
    return config?.enabled === true && !!config?.apiKey;
  }

  /**
   * Loga o envio no banco de dados
   */
  protected async logDelivery(
    organizationId: string,
    recipient: string,
    result: SendResult,
    notificationId?: string
  ): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      
      await supabase.from('notification_delivery_logs').insert({
        organization_id: organizationId,
        notification_id: notificationId,
        channel: this.channel,
        provider: this.name,
        recipient,
        status: result.status,
        message_id: result.messageId,
        error_message: result.error?.message,
        sent_at: result.sentAt || new Date().toISOString(),
        metadata: {
          providerResponse: result.providerResponse,
        },
      });
    } catch (err) {
      // Não falha o envio se o log falhar
      logWarning(`[${this.name}] Erro ao logar delivery:`, err);
    }
  }

  /**
   * Método abstrato de envio - cada provider implementa
   */
  abstract send(payload: AnyNotificationPayload): Promise<SendResult>;

  /**
   * Método padrão para verificar status (pode ser sobrescrito)
   */
  async checkDeliveryStatus(messageId: string): Promise<DeliveryStatus> {
    // Por padrão, não implementado
    return 'sent';
  }

  /**
   * Cria resultado de sucesso padronizado
   */
  protected successResult(messageId: string, providerResponse?: any): SendResult {
    return {
      success: true,
      channel: this.channel,
      provider: this.name,
      messageId,
      status: 'sent',
      sentAt: new Date().toISOString(),
      providerResponse,
    };
  }

  /**
   * Cria resultado de erro padronizado
   */
  protected errorResult(code: string, message: string, details?: any): SendResult {
    return {
      success: false,
      channel: this.channel,
      provider: this.name,
      status: 'failed',
      error: { code, message, details },
    };
  }

  /**
   * Log de início de envio
   */
  protected logStart(recipient: string, payload: AnyNotificationPayload): void {
    logInfo(`[${this.name}] Enviando ${this.channel} para ${recipient}`, {
      organizationId: payload.organizationId,
      priority: payload.priority,
      templateId: payload.templateId,
    });
  }

  /**
   * Log de sucesso
   */
  protected logSuccess(recipient: string, messageId: string): void {
    logInfo(`[${this.name}] ✅ Enviado com sucesso para ${recipient}`, {
      messageId,
    });
  }

  /**
   * Log de erro
   */
  protected logFailure(recipient: string, error: any): void {
    logError(`[${this.name}] ❌ Falha ao enviar para ${recipient}:`, error);
  }
}

/**
 * Provider mock para desenvolvimento/testes
 */
export class MockProvider extends BaseProvider {
  name = 'mock';
  channel: NotificationChannel;

  constructor(channel: NotificationChannel) {
    super();
    this.channel = channel;
  }

  async isConfigured(_organizationId: string): Promise<boolean> {
    return true; // Sempre configurado
  }

  async send(payload: AnyNotificationPayload): Promise<SendResult> {
    const recipient = this.getRecipient(payload);
    this.logStart(recipient, payload);

    // Simula delay de envio
    await new Promise(resolve => setTimeout(resolve, 100));

    const messageId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logInfo(`[MockProvider] 📧 MOCK ${this.channel.toUpperCase()}:`, {
      recipient,
      payload,
    });

    this.logSuccess(recipient, messageId);
    return this.successResult(messageId, { mock: true });
  }

  private getRecipient(payload: AnyNotificationPayload): string {
    switch (payload.channel) {
      case 'email':
        return Array.isArray((payload as any).to) ? (payload as any).to[0] : (payload as any).to;
      case 'sms':
      case 'whatsapp':
        return (payload as any).to;
      case 'push':
        return (payload as any).to;
      case 'in_app':
        return (payload as any).userId || 'all';
      default:
        return 'unknown';
    }
  }
}
