/**
 * AIRBNB CHAT PROVIDER (STUB)
 * 
 * Implementação futura de IChatProvider para Airbnb
 * Placeholder para quando integrar com API de mensagens Airbnb
 * 
 * @version 1.0.0
 * @date 2026-01-22
 * @see ADR-007
 * 
 * TODO:
 * - Integrar com Airbnb Messaging API
 * - Mapear threads Airbnb para conversas unificadas
 * - Implementar envio de mensagens
 */

import type {
  IChatProvider,
  ChatChannel,
  ChatConversation,
  ChatMessage,
  GetConversationsOptions,
  GetMessagesOptions,
  ParsedExternalId,
} from '../types';

export class AirbnbChatProvider implements IChatProvider {
  readonly channel: ChatChannel = 'airbnb';
  readonly displayName = 'Airbnb';

  async isEnabled(): Promise<boolean> {
    // TODO: Verificar se integração Airbnb está configurada
    return false; // Desabilitado por padrão até implementar
  }

  async getConversations(
    _organizationId: string,
    _options?: GetConversationsOptions
  ): Promise<ChatConversation[]> {
    // TODO: Buscar threads do Airbnb
    console.warn('[AirbnbChatProvider] Não implementado ainda');
    return [];
  }

  async getMessages(
    _conversationId: string,
    _options?: GetMessagesOptions
  ): Promise<ChatMessage[]> {
    // TODO: Buscar mensagens do thread Airbnb
    console.warn('[AirbnbChatProvider] Não implementado ainda');
    return [];
  }

  async sendTextMessage(
    _conversationId: string,
    _text: string
  ): Promise<ChatMessage> {
    // TODO: Enviar mensagem via Airbnb API
    throw new Error('AirbnbChatProvider.sendTextMessage não implementado');
  }

  async markAsRead(_conversationId: string): Promise<void> {
    // TODO: Marcar thread como lido
    console.warn('[AirbnbChatProvider] markAsRead não implementado');
  }

  parseExternalId(externalId: string): ParsedExternalId {
    // Airbnb threads têm formato diferente
    // Ex: "thread_123456789"
    return {
      type: 'user',
      raw: externalId,
    };
  }

  formatDisplayName(conversation: Partial<ChatConversation>): string {
    if (conversation.guestName) {
      return conversation.guestName;
    }
    return 'Hóspede Airbnb';
  }
}

// ============================================================
// SINGLETON EXPORT
// ============================================================

let instance: AirbnbChatProvider | null = null;

export function getAirbnbChatProvider(): AirbnbChatProvider {
  if (!instance) {
    instance = new AirbnbChatProvider();
  }
  return instance;
}
