/**
 * ============================================================================
 * RENDIZY - Chat Adapters - Booking.com Messaging
 * ============================================================================
 * 
 * Adapter para mensagens do Booking.com via Stays.net webhook
 * As mensagens do Booking chegam via Stays.net e são redirecionadas
 * 
 * @version v2.0.0
 * @date 2026-01-22
 * ============================================================================
 */

import {
  IChatAdapter,
  ChannelType,
  ChannelInstance,
  UnifiedContact,
  UnifiedMessage,
  WebhookPayload,
  SendMessageResult,
  MessageAttachment,
  ContactType,
  MediaType,
} from './types.ts';

// ============================================================================
// TIPOS ESPECÍFICOS BOOKING/STAYS.NET
// ============================================================================

interface BookingStaysMessage {
  type: 'MESSAGE_RECEIVED' | 'MESSAGE_SENT';
  reservation_id?: string;
  reservation_locator?: string;
  guest_id?: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  property_id?: string;
  property_name?: string;
  booking_number?: string; // Específico do Booking.com
  message: {
    id: string;
    text: string;
    sent_at: string;
    sender: 'guest' | 'host';
    read?: boolean;
  };
  channel?: string; // 'booking'
  organization_id?: string;
}

// ============================================================================
// BOOKING ADAPTER
// ============================================================================

export class BookingAdapter implements IChatAdapter {
  readonly name = 'Booking.com Messaging';
  readonly channel: ChannelType = 'booking';
  readonly provider = 'stays.net';

  // ========== PARSING ==========

  parseWebhook(payload: unknown): WebhookPayload | null {
    if (!payload || typeof payload !== 'object') return null;
    
    const p = payload as BookingStaysMessage;
    
    // Verificar se é um evento de mensagem Booking
    if (!p.type || !p.type.includes('MESSAGE')) return null;
    if (p.channel !== 'booking') return null;
    
    return {
      event: p.type.toLowerCase(),
      instanceName: `booking-${p.property_id || 'default'}`,
      provider: this.provider,
      data: p,
      timestamp: new Date(),
      raw: payload,
    };
  }

  parseContact(data: unknown): Partial<UnifiedContact> | null {
    if (!data || typeof data !== 'object') return null;
    
    const msg = data as BookingStaysMessage;
    
    if (!msg.guest_id) return null;
    
    return {
      externalId: msg.guest_id,
      contactType: 'user' as ContactType,
      phoneNumber: msg.guest_phone || undefined,
      email: msg.guest_email || undefined,
      displayName: msg.guest_name || 'Hóspede Booking.com',
      metadata: {
        reservationId: msg.reservation_id,
        reservationLocator: msg.reservation_locator,
        bookingNumber: msg.booking_number,
        propertyId: msg.property_id,
        propertyName: msg.property_name,
        channel: 'booking',
      },
    };
  }

  parseMessage(data: unknown): Partial<UnifiedMessage> | null {
    if (!data || typeof data !== 'object') return null;
    
    const p = data as BookingStaysMessage;
    
    if (!p.message?.id) return null;
    
    return {
      externalId: p.message.id,
      direction: p.message.sender === 'guest' ? 'incoming' : 'outgoing',
      senderId: p.message.sender === 'guest' ? p.guest_id : undefined,
      senderName: p.message.sender === 'guest' ? p.guest_name : undefined,
      content: p.message.text || '',
      mediaType: 'text' as MediaType,
      status: p.message.read ? 'read' : 'delivered',
      sentAt: new Date(p.message.sent_at),
      metadata: {
        reservationId: p.reservation_id,
        reservationLocator: p.reservation_locator,
        bookingNumber: p.booking_number,
        channel: 'booking',
      },
    };
  }

  // ========== VALIDAÇÃO ==========

  isValidContact(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    
    const msg = data as BookingStaysMessage;
    
    return !!msg.guest_id;
  }

  shouldProcessMessage(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    
    const msg = data as BookingStaysMessage;
    
    if (!msg.message?.id || !msg.message?.text) return false;
    
    // Só processar mensagens recebidas (do hóspede)
    if (msg.message.sender !== 'guest') return false;
    
    return true;
  }

  extractPhoneNumber(identifier: string): string | null {
    // Booking não usa identificador por telefone
    return null;
  }

  // ========== ENVIO ==========

  async sendText(
    instance: ChannelInstance,
    recipientId: string,
    text: string,
    _options?: { replyTo?: string }
  ): Promise<SendMessageResult> {
    // Booking.com: envio via Stays.net API ou diretamente na plataforma
    
    console.log('[BookingAdapter] Envio de mensagem para Booking ainda não implementado', {
      instance: instance.instanceName,
      recipientId,
      textLength: text.length,
    });
    
    return {
      success: false,
      error: 'Envio de mensagens Booking.com via sistema não suportado. Use a plataforma Booking diretamente.',
    };
  }

  async sendMedia(
    _instance: ChannelInstance,
    _recipientId: string,
    _attachment: MessageAttachment,
    _caption?: string
  ): Promise<SendMessageResult> {
    return {
      success: false,
      error: 'Booking.com não suporta envio de mídia via API.',
    };
  }

  // ========== STATUS ==========

  async checkConnection(instance: ChannelInstance): Promise<{
    connected: boolean;
    phoneNumber?: string;
    profileName?: string;
    error?: string;
  }> {
    return {
      connected: true,
      profileName: instance.instanceName,
    };
  }

  getQrCode = undefined;
  setupWebhook = undefined;
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const bookingAdapter = new BookingAdapter();
