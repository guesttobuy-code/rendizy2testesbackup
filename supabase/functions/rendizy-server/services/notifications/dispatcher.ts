// ============================================================================
// NOTIFICATION DISPATCHER - Orquestrador central de notificações
// ============================================================================
// Responsável por:
// - Rotear notificações para o provider correto
// - Fallback entre providers do mesmo canal
// - Logging centralizado
// - Rate limiting (futuro)
// ============================================================================

import { logInfo, logError, logWarning } from '../../utils.ts';
import { getSupabaseClient } from '../../kv_store.tsx';
import type { 
  NotificationChannel, 
  AnyNotificationPayload, 
  SendResult,
  NotificationProvider 
} from './types.ts';

// Import providers
import { resendProvider } from './providers/resend-provider.ts';
import { brevoEmailProvider } from './providers/brevo-email-provider.ts';
import { brevoSmsProvider } from './providers/brevo-sms-provider.ts';
import { evolutionWhatsAppProvider } from './providers/evolution-whatsapp-provider.ts';
import { inAppProvider } from './providers/in-app-provider.ts';
import { MockProvider } from './base-provider.ts';

/**
 * Mapeamento de canal -> providers disponíveis (em ordem de prioridade)
 */
const CHANNEL_PROVIDERS: Record<NotificationChannel, NotificationProvider[]> = {
  email: [resendProvider, brevoEmailProvider],
  sms: [brevoSmsProvider],
  whatsapp: [evolutionWhatsAppProvider],
  push: [], // Firebase/OneSignal (futuro)
  in_app: [inAppProvider],
};

/**
 * Providers mock para desenvolvimento
 */
const MOCK_PROVIDERS: Record<NotificationChannel, NotificationProvider> = {
  email: new MockProvider('email'),
  sms: new MockProvider('sms'),
  whatsapp: new MockProvider('whatsapp'),
  push: new MockProvider('push'),
  in_app: inAppProvider, // In-app sempre real
};

/**
 * Configuração do dispatcher
 */
interface DispatcherConfig {
  /** Usar mocks em desenvolvimento */
  useMocks?: boolean;
  /** Tentar fallback se primeiro provider falhar */
  enableFallback?: boolean;
  /** Máximo de retentativas por provider */
  maxRetries?: number;
}

const DEFAULT_CONFIG: DispatcherConfig = {
  useMocks: false,
  enableFallback: true,
  maxRetries: 1,
};

/**
 * Dispatcher de notificações
 */
class NotificationDispatcher {
  private config: DispatcherConfig;

  constructor(config: Partial<DispatcherConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Envia notificação para o canal especificado
   */
  async send(payload: AnyNotificationPayload): Promise<SendResult> {
    const { channel, organizationId } = payload;
    
    logInfo(`[Dispatcher] 📤 Enviando notificação`, {
      channel,
      organizationId,
      priority: payload.priority,
    });

    // Modo mock
    if (this.config.useMocks && channel !== 'in_app') {
      logWarning(`[Dispatcher] ⚠️ Usando MockProvider para ${channel}`);
      return MOCK_PROVIDERS[channel].send(payload);
    }

    // Busca providers disponíveis para o canal
    const providers = CHANNEL_PROVIDERS[channel];
    
    if (!providers || providers.length === 0) {
      logError(`[Dispatcher] Nenhum provider configurado para canal: ${channel}`);
      return {
        success: false,
        channel,
        provider: 'none',
        status: 'failed',
        error: {
          code: 'NO_PROVIDER',
          message: `Nenhum provider disponível para canal ${channel}`,
        },
      };
    }

    // Tenta cada provider até um funcionar
    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      
      // Verifica se está configurado
      const isConfigured = await provider.isConfigured(organizationId);
      
      if (!isConfigured) {
        logInfo(`[Dispatcher] Provider ${provider.name} não configurado, tentando próximo...`);
        continue;
      }

      // Tenta enviar
      try {
        const result = await provider.send(payload);
        
        if (result.success) {
          logInfo(`[Dispatcher] ✅ Enviado com sucesso via ${provider.name}`);
          return result;
        }

        // Falhou, tenta fallback se habilitado
        if (this.config.enableFallback && i < providers.length - 1) {
          logWarning(`[Dispatcher] Provider ${provider.name} falhou, tentando fallback...`, {
            error: result.error,
          });
          continue;
        }

        return result;

      } catch (error: any) {
        logError(`[Dispatcher] Erro no provider ${provider.name}:`, error);
        
        if (this.config.enableFallback && i < providers.length - 1) {
          continue;
        }

        return {
          success: false,
          channel,
          provider: provider.name,
          status: 'failed',
          error: {
            code: 'SEND_ERROR',
            message: error.message || 'Erro ao enviar notificação',
          },
        };
      }
    }

    // Nenhum provider funcionou
    return {
      success: false,
      channel,
      provider: 'none',
      status: 'failed',
      error: {
        code: 'ALL_PROVIDERS_FAILED',
        message: 'Todos os providers falharam',
      },
    };
  }

  /**
   * Envia para múltiplos canais
   */
  async sendMultiple(
    payloads: AnyNotificationPayload[]
  ): Promise<SendResult[]> {
    return Promise.all(payloads.map(p => this.send(p)));
  }

  /**
   * Verifica quais providers estão configurados para uma organização
   */
  async getConfiguredProviders(
    organizationId: string
  ): Promise<Record<NotificationChannel, string[]>> {
    const result: Record<NotificationChannel, string[]> = {
      email: [],
      sms: [],
      whatsapp: [],
      push: [],
      in_app: ['in_app'], // Sempre disponível
    };

    for (const [channel, providers] of Object.entries(CHANNEL_PROVIDERS)) {
      for (const provider of providers) {
        if (await provider.isConfigured(organizationId)) {
          result[channel as NotificationChannel].push(provider.name);
        }
      }
    }

    return result;
  }
}

// Singleton export
export const notificationDispatcher = new NotificationDispatcher();

// Export para criar dispatcher customizado
export { NotificationDispatcher };

// ============================================================================
// FUNÇÕES HELPER (para uso no actions-service)
// ============================================================================

/**
 * Envia email
 */
export async function sendEmail(
  organizationId: string,
  to: string | string[],
  subject: string,
  html: string,
  options?: Partial<import('./types.ts').EmailPayload>
): Promise<SendResult> {
  return notificationDispatcher.send({
    channel: 'email',
    organizationId,
    to,
    subject,
    html,
    ...options,
  } as import('./types.ts').EmailPayload);
}

/**
 * Envia SMS
 */
export async function sendSms(
  organizationId: string,
  to: string,
  message: string,
  options?: Partial<import('./types.ts').SmsPayload>
): Promise<SendResult> {
  return notificationDispatcher.send({
    channel: 'sms',
    organizationId,
    to,
    message,
    ...options,
  } as import('./types.ts').SmsPayload);
}

/**
 * Envia WhatsApp
 */
export async function sendWhatsApp(
  organizationId: string,
  to: string,
  message: string,
  options?: Partial<import('./types.ts').WhatsAppPayload>
): Promise<SendResult> {
  return notificationDispatcher.send({
    channel: 'whatsapp',
    organizationId,
    to,
    message,
    ...options,
  } as import('./types.ts').WhatsAppPayload);
}

/**
 * Envia notificação in-app
 */
export async function sendInApp(
  organizationId: string,
  title: string,
  message: string,
  options?: Partial<import('./types.ts').InAppPayload>
): Promise<SendResult> {
  return notificationDispatcher.send({
    channel: 'in_app',
    organizationId,
    title,
    message,
    ...options,
  } as import('./types.ts').InAppPayload);
}
