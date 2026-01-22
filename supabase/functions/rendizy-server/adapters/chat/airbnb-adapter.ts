/**
 * ============================================================================
 * RENDIZY - Chat Adapters - Airbnb Messaging
 * ============================================================================
 * 
 * Adapter para mensagens da Airbnb via Stays.net webhook
 * As mensagens da Airbnb chegam via Stays.net e são redirecionadas
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
// TIPOS ESPECÍFICOS AIRBNB/STAYS.NET
// ============================================================================

interface AirbnbStaysMessage {
  type: 'MESSAGE_RECEIVED' | 'MESSAGE_SENT';
  reservation_id?: string;
  reservation_locator?: string;
  guest_id?: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  property_id?: string;
  property_name?: string;
  message: {
    id: string;
    text: string;
    sent_at: string;
    sender: 'guest' | 'host';
    read?: boolean;
  };
  channel?: string; // 'airbnb', 'booking', etc
  organization_id?: string;
}

// ============================================================================
// AIRBNB ADAPTER
// ============================================================================

export class AirbnbAdapter implements IChatAdapter {
  readonly name = 'Airbnb Messaging';
  readonly channel: ChannelType = 'airbnb';
  readonly provider = 'stays.net';

  // ========== PARSING ==========

  parseWebhook(payload: unknown): WebhookPayload | null {
    if (!payload || typeof payload !== 'object') return null;
    
    const p = payload as AirbnbStaysMessage;
    
    // Verificar se é um evento de mensagem Airbnb
    if (!p.type || !p.type.includes('MESSAGE')) return null;
    if (p.channel !== 'airbnb') return null;
    
    return {
      event: p.type.toLowerCase(),
      instanceName: `airbnb-${p.property_id || 'default'}`,
      provider: this.provider,
      data: p,
      timestamp: new Date(),
      raw: payload,
    };
  }

  parseContact(data: unknown): Partial<UnifiedContact> | null {
    if (!data || typeof data !== 'object') return null;
    
    const msg = data as AirbnbStaysMessage;
    
    if (!msg.guest_id) return null;
    
    return {
      externalId: msg.guest_id,
      contactType: 'user' as ContactType,
      phoneNumber: msg.guest_phone || undefined,
      email: msg.guest_email || undefined,
      displayName: msg.guest_name || 'Hóspede Airbnb',
      metadata: {
        reservationId: msg.reservation_id,
        reservationLocator: msg.reservation_locator,
        propertyId: msg.property_id,
        propertyName: msg.property_name,
        channel: 'airbnb',
      },
    };
  }

  parseMessage(data: unknown): Partial<UnifiedMessage> | null {
    if (!data || typeof data !== 'object') return null;
    
    const p = data as AirbnbStaysMessage;
    
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
        channel: 'airbnb',
      },
    };
  }

  // ========== VALIDAÇÃO ==========

  isValidContact(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    
    const msg = data as AirbnbStaysMessage;
    
    // Precisa ter guest_id
    return !!msg.guest_id;
  }

  shouldProcessMessage(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    
    const msg = data as AirbnbStaysMessage;
    
    // Precisa ter mensagem
    if (!msg.message?.id || !msg.message?.text) return false;
    
    // Só processar mensagens recebidas (do hóspede)
    if (msg.message.sender !== 'guest') return false;
    
    return true;
  }

  extractPhoneNumber(identifier: string): string | null {
    // Airbnb não usa identificador por telefone
    // mas podemos ter o telefone do hóspede nos metadados
    return null;
  }

  // ========== ENVIO ==========

  async sendText(
    instance: ChannelInstance,
    recipientId: string,
    text: string,
    _options?: { replyTo?: string }
  ): Promise<SendMessageResult> {
    // Airbnb: envio via Stays.net API
    // O recipientId aqui seria o reservation_id ou guest_id
    
    // TODO: Implementar quando tivermos a API do Stays.net para envio
    
    console.log('[AirbnbAdapter] Envio de mensagem para Airbnb ainda não implementado', {
      instance: instance.instanceName,
      recipientId,
      textLength: text.length,
    });
    
    return {
      success: false,
      error: 'Envio de mensagens Airbnb via sistema não suportado. Use a plataforma Airbnb diretamente.',
    };
  }

  async sendMedia(
    _instance: ChannelInstance,
    _recipientId: string,
    _attachment: MessageAttachment,
    _caption?: string
  ): Promise<SendMessageResult> {
    // Airbnb não suporta envio de mídia via API
    return {
      success: false,
      error: 'Airbnb não suporta envio de mídia via API.',
    };
  }

  // ========== STATUS ==========

  async checkConnection(instance: ChannelInstance): Promise<{
    connected: boolean;
    phoneNumber?: string;
    profileName?: string;
    error?: string;
  }> {
    // Para Airbnb, a "conexão" é baseada no webhook da Stays.net
    // Não há um status de conexão em tempo real
    return {
      connected: true, // Assume conectado se a instância existe
      profileName: instance.instanceName,
    };
  }

  // WAHA/Evolution específicos - não aplicável para Airbnb
  getQrCode = undefined;
  setupWebhook = undefined;
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const airbnbAdapter = new AirbnbAdapter();
