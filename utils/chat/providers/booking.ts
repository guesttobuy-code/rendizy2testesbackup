/**
 * BOOKING.COM CHAT PROVIDER (STUB)
 * 
 * Implementação futura de IChatProvider para Booking.com
 * 
 * @version 1.0.0
 * @date 2026-01-22
 * @see ADR-007
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

export class BookingChatProvider implements IChatProvider {
  readonly channel: ChatChannel = 'booking';
  readonly displayName = 'Booking.com';

  async isEnabled(): Promise<boolean> {
    return false; // Desabilitado até implementar
  }

  async getConversations(
    _organizationId: string,
    _options?: GetConversationsOptions
  ): Promise<ChatConversation[]> {
    console.warn('[BookingChatProvider] Não implementado ainda');
    return [];
  }

  async getMessages(
    _conversationId: string,
    _options?: GetMessagesOptions
  ): Promise<ChatMessage[]> {
    console.warn('[BookingChatProvider] Não implementado ainda');
    return [];
  }

  async sendTextMessage(
    _conversationId: string,
    _text: string
  ): Promise<ChatMessage> {
    throw new Error('BookingChatProvider.sendTextMessage não implementado');
  }

  async markAsRead(_conversationId: string): Promise<void> {
    console.warn('[BookingChatProvider] markAsRead não implementado');
  }

  parseExternalId(externalId: string): ParsedExternalId {
    return { type: 'user', raw: externalId };
  }

  formatDisplayName(conversation: Partial<ChatConversation>): string {
    return conversation.guestName || 'Hóspede Booking';
  }
}

let instance: BookingChatProvider | null = null;

export function getBookingChatProvider(): BookingChatProvider {
  if (!instance) {
    instance = new BookingChatProvider();
  }
  return instance;
}
