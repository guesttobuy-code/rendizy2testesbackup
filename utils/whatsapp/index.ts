/**
 * WHATSAPP MULTI-PROVIDER - Entry Point
 * 
 * Sistema unificado de integração WhatsApp com múltiplos providers
 * 
 * Providers disponíveis:
 * - Evolution API (desabilitado - erro 401)
 * - WAHA (habilitado - alternativa estável)
 * 
 * @example
 * ```typescript
 * import { getDefaultProvider } from './utils/whatsapp';
 * 
 * const whatsapp = getDefaultProvider();
 * const qr = await whatsapp.getQRCode();
 * await whatsapp.sendTextMessage('5511999999999', 'Olá!');
 * ```
 */

// ============================================================
// EXPORTS - TYPES
// ============================================================

export type {
  // Main Types
  WhatsAppProvider,
  WhatsAppProviderConfig,
  IWhatsAppProvider,
  
  // Session
  SessionStatus,
  WhatsAppSession,
  QRCodeData,
  
  // Messages
  MessageType,
  MessageStatus,
  WhatsAppMessage,
  SendMessageRequest,
  SendMediaRequest,
  
  // Contacts & Chats
  WhatsAppContact,
  WhatsAppChat,
  
  // Webhooks
  WebhookEvent,
  WebhookConfig,
  WebhookPayload,
  
  // API
  ApiResponse,
  HealthCheckResponse,
} from './types';

// ============================================================
// EXPORTS - ERRORS
// ============================================================

export {
  WhatsAppError,
  ConnectionError,
  AuthenticationError,
  MessageError,
} from './types';

// ============================================================
// EXPORTS - FACTORY
// ============================================================

export {
  WhatsAppProviderFactory,
  getDefaultProvider,
  getProvider,
  getProviderWithFallback,
  switchProvider,
} from './factory';

// ============================================================
// EXPORTS - PROVIDERS
// ============================================================

export { EvolutionProvider, evolutionProvider } from './evolution/api';
export { WAHAProvider, wahaProvider } from './waha/api';

// ============================================================
// EXPORTS - CONFIGS
// ============================================================

export { EVOLUTION_CONFIG, EVOLUTION_ENDPOINTS } from './evolution/config';
export { WAHA_CONFIG, WAHA_ENDPOINTS } from './waha/config';

// ============================================================
// CONVENIENCE EXPORTS
// ============================================================

import { getDefaultProvider } from './factory';

/**
 * Instância padrão do WhatsApp (auto-seleciona provider)
 * 
 * Use esta para a maioria dos casos!
 */
export const whatsapp = getDefaultProvider();

/**
 * Status dos providers
 */
export async function getProvidersStatus() {
  const { WhatsAppProviderFactory } = await import('./factory');
  const providers = WhatsAppProviderFactory.listProviders();
  
  const status = await Promise.all(
    providers.map(async (p) => {
      try {
        const instance = WhatsAppProviderFactory.getInstance(p.name);
        const health = await instance.healthCheck();
        return {
          ...p,
          healthy: health.healthy,
          status: await instance.getStatus(),
        };
      } catch (error) {
        return {
          ...p,
          healthy: false,
          status: 'ERROR' as const,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        };
      }
    })
  );

  return status;
}

/**
 * Informações do sistema
 */
export function getSystemInfo() {
  return {
    version: '1.0.103.76',
    providers: {
      evolution: {
        enabled: false,
        reason: 'Erro 401 persistente - desabilitado temporariamente',
      },
      waha: {
        enabled: true,
        reason: 'Alternativa estável - deploy na VPS',
      },
    },
    defaultProvider: 'waha',
    architecture: 'multi-provider-factory-pattern',
  };
}
