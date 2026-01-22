/**
 * ============================================================================
 * RENDIZY - Chat Adapters - Evolution API v2
 * ============================================================================
 * 
 * Adapter para Evolution API v2
 * Documentação: https://doc.evolution-api.com/v2
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
  DeliveryStatus,
} from './types.ts';

// ============================================================================
// TIPOS ESPECÍFICOS EVOLUTION API
// ============================================================================

interface EvolutionWebhookMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  pushName?: string;
  message?: {
    conversation?: string;
    extendedTextMessage?: {
      text?: string;
      contextInfo?: {
        stanzaId?: string;
        participant?: string;
        quotedMessage?: unknown;
      };
    };
    imageMessage?: {
      url?: string;
      mimetype?: string;
      caption?: string;
      jpegThumbnail?: string;
    };
    audioMessage?: {
      url?: string;
      mimetype?: string;
      seconds?: number;
    };
    videoMessage?: {
      url?: string;
      mimetype?: string;
      caption?: string;
      seconds?: number;
    };
    documentMessage?: {
      url?: string;
      mimetype?: string;
      title?: string;
      fileName?: string;
    };
    stickerMessage?: {
      url?: string;
      mimetype?: string;
    };
    locationMessage?: {
      degreesLatitude?: number;
      degreesLongitude?: number;
      name?: string;
      address?: string;
    };
    contactMessage?: {
      displayName?: string;
      vcard?: string;
    };
  };
  messageType?: string;
  messageTimestamp?: number;
  status?: string;
}

interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data?: EvolutionWebhookMessage;
  sender?: string;
  apikey?: string;
}

// ============================================================================
// EVOLUTION ADAPTER
// ============================================================================

export class EvolutionAdapter implements IChatAdapter {
  readonly name = 'Evolution API v2';
  readonly channel: ChannelType = 'whatsapp';
  readonly provider = 'evolution';

  // ========== PARSING ==========

  parseWebhook(payload: unknown): WebhookPayload | null {
    if (!payload || typeof payload !== 'object') return null;
    
    const p = payload as EvolutionWebhookPayload;
    
    // Ignorar eventos que não nos interessam
    const relevantEvents = [
      'messages.upsert',
      'messages.update', 
      'message.ack',
      'send.message',
      'connection.update',
      'qrcode.updated',
    ];
    
    if (!p.event || !relevantEvents.includes(p.event)) {
      return null;
    }
    
    return {
      event: p.event,
      instanceName: p.instance,
      provider: this.provider,
      data: p.data,
      timestamp: new Date(),
      raw: payload,
    };
  }

  parseContact(data: unknown): Partial<UnifiedContact> | null {
    if (!data || typeof data !== 'object') return null;
    
    const msg = data as EvolutionWebhookMessage;
    const remoteJid = msg?.key?.remoteJid;
    
    if (!remoteJid) return null;
    
    const contactType = this.detectContactType(remoteJid);
    const phoneNumber = this.extractPhoneNumber(remoteJid);
    
    return {
      externalId: remoteJid,
      contactType,
      phoneNumber: phoneNumber || undefined,
      displayName: msg.pushName || phoneNumber || remoteJid.split('@')[0],
    };
  }

  parseMessage(data: unknown): Partial<UnifiedMessage> | null {
    if (!data || typeof data !== 'object') return null;
    
    const msg = data as EvolutionWebhookMessage;
    
    if (!msg.key?.id || !msg.key?.remoteJid) return null;
    
    // Extrair conteúdo
    const { content, mediaType, attachments } = this.extractMessageContent(msg);
    
    // Extrair replyTo
    const replyTo = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
    
    return {
      externalId: msg.key.id,
      direction: msg.key.fromMe ? 'outgoing' : 'incoming',
      senderId: msg.key.fromMe ? undefined : msg.key.remoteJid,
      senderName: msg.pushName,
      content,
      mediaType,
      attachments,
      replyTo,
      status: this.mapStatus(msg.status),
      sentAt: msg.messageTimestamp 
        ? new Date(msg.messageTimestamp * 1000) 
        : new Date(),
      metadata: {
        messageType: msg.messageType,
        originalKey: msg.key,
      },
    };
  }

  // ========== VALIDAÇÃO ==========

  isValidContact(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    
    const msg = data as EvolutionWebhookMessage;
    const remoteJid = msg?.key?.remoteJid;
    
    if (!remoteJid) return false;
    
    // Aceitar contatos normais, @lid e @s.whatsapp.net
    // Rejeitar grupos e broadcasts
    if (remoteJid.endsWith('@g.us')) return false;
    if (remoteJid === 'status@broadcast') return false;
    if (remoteJid.endsWith('@newsletter')) return false;
    
    return true;
  }

  shouldProcessMessage(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    
    const msg = data as EvolutionWebhookMessage;
    
    // Precisa ter ID e JID
    if (!msg.key?.id || !msg.key?.remoteJid) return false;
    
    // Não processar mensagens do próprio sistema
    if (msg.key.fromMe) return false;
    
    // Validar contato
    if (!this.isValidContact(data)) return false;
    
    // Precisa ter conteúdo
    if (!msg.message) return false;
    
    return true;
  }

  extractPhoneNumber(identifier: string): string | null {
    if (!identifier) return null;
    
    // Remover sufixos
    let phone = identifier
      .replace('@s.whatsapp.net', '')
      .replace('@c.us', '')
      .replace('@lid', '');
    
    // Se ainda tem @, provavelmente é grupo/outro
    if (phone.includes('@')) return null;
    
    // Limpar caracteres não numéricos
    phone = phone.replace(/\D/g, '');
    
    // Validar mínimo de dígitos
    if (phone.length < 8) return null;
    
    return phone;
  }

  // ========== ENVIO ==========

  async sendText(
    instance: ChannelInstance,
    recipientId: string,
    text: string,
    options?: { replyTo?: string }
  ): Promise<SendMessageResult> {
    try {
      const url = `${instance.apiUrl}/message/sendText/${instance.instanceName}`;
      
      const body: Record<string, unknown> = {
        number: this.normalizeRecipient(recipientId),
        text,
      };
      
      if (options?.replyTo) {
        body.quoted = { key: { id: options.replyTo } };
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': instance.apiKey,
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }
      
      const result = await response.json();
      
      return {
        success: true,
        externalId: result.key?.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  async sendMedia(
    instance: ChannelInstance,
    recipientId: string,
    attachment: MessageAttachment,
    caption?: string
  ): Promise<SendMessageResult> {
    try {
      const endpoint = this.getMediaEndpoint(attachment.type);
      const url = `${instance.apiUrl}/${endpoint}/${instance.instanceName}`;
      
      const body: Record<string, unknown> = {
        number: this.normalizeRecipient(recipientId),
        caption,
      };
      
      // Adicionar mídia (URL ou base64)
      if (attachment.url) {
        body.mediaUrl = attachment.url;
      } else if (attachment.data) {
        body.media = attachment.data;
      }
      
      if (attachment.filename) {
        body.fileName = attachment.filename;
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': instance.apiKey,
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }
      
      const result = await response.json();
      
      return {
        success: true,
        externalId: result.key?.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  // ========== STATUS ==========

  async checkConnection(instance: ChannelInstance): Promise<{
    connected: boolean;
    phoneNumber?: string;
    profileName?: string;
    error?: string;
  }> {
    try {
      const url = `${instance.apiUrl}/instance/connectionState/${instance.instanceName}`;
      
      const response = await fetch(url, {
        headers: { 'apikey': instance.apiKey },
      });
      
      if (!response.ok) {
        const error = await response.text();
        return { connected: false, error };
      }
      
      const result = await response.json();
      
      return {
        connected: result.instance?.state === 'open',
        phoneNumber: result.instance?.phoneNumber,
        profileName: result.instance?.profileName,
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Erro de conexão',
      };
    }
  }

  async getQrCode(instance: ChannelInstance): Promise<{
    qrCode?: string;
    pairingCode?: string;
    error?: string;
  }> {
    try {
      const url = `${instance.apiUrl}/instance/connect/${instance.instanceName}`;
      
      const response = await fetch(url, {
        headers: { 'apikey': instance.apiKey },
      });
      
      if (!response.ok) {
        const error = await response.text();
        return { error };
      }
      
      const result = await response.json();
      
      return {
        qrCode: result.qrcode?.base64 || result.base64,
        pairingCode: result.pairingCode,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Erro ao obter QR Code',
      };
    }
  }

  async setupWebhook(
    instance: ChannelInstance,
    webhookUrl: string,
    events: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `${instance.apiUrl}/webhook/set/${instance.instanceName}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': instance.apiKey,
        },
        body: JSON.stringify({
          url: webhookUrl,
          webhook_by_events: false,
          webhook_base64: false,
          events,
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao configurar webhook',
      };
    }
  }

  // ========== HELPERS PRIVADOS ==========

  private detectContactType(jid: string): ContactType {
    if (jid.endsWith('@g.us')) return 'group';
    if (jid.endsWith('@newsletter')) return 'channel';
    if (jid === 'status@broadcast') return 'broadcast';
    if (jid.endsWith('@lid')) return 'lid';
    return 'user';
  }

  private extractMessageContent(msg: EvolutionWebhookMessage): {
    content: string;
    mediaType: MediaType;
    attachments?: MessageAttachment[];
  } {
    const m = msg.message;
    
    // Texto simples
    if (m?.conversation) {
      return { content: m.conversation, mediaType: 'text' };
    }
    
    // Texto estendido (com quote)
    if (m?.extendedTextMessage?.text) {
      return { content: m.extendedTextMessage.text, mediaType: 'text' };
    }
    
    // Imagem
    if (m?.imageMessage) {
      return {
        content: m.imageMessage.caption || '',
        mediaType: 'image',
        attachments: [{
          type: 'image',
          url: m.imageMessage.url,
          mimeType: m.imageMessage.mimetype,
          thumbnail: m.imageMessage.jpegThumbnail,
        }],
      };
    }
    
    // Áudio
    if (m?.audioMessage) {
      return {
        content: '',
        mediaType: 'audio',
        attachments: [{
          type: 'audio',
          url: m.audioMessage.url,
          mimeType: m.audioMessage.mimetype,
          duration: m.audioMessage.seconds,
        }],
      };
    }
    
    // Vídeo
    if (m?.videoMessage) {
      return {
        content: m.videoMessage.caption || '',
        mediaType: 'video',
        attachments: [{
          type: 'video',
          url: m.videoMessage.url,
          mimeType: m.videoMessage.mimetype,
          duration: m.videoMessage.seconds,
        }],
      };
    }
    
    // Documento
    if (m?.documentMessage) {
      return {
        content: m.documentMessage.title || m.documentMessage.fileName || '',
        mediaType: 'document',
        attachments: [{
          type: 'document',
          url: m.documentMessage.url,
          mimeType: m.documentMessage.mimetype,
          filename: m.documentMessage.fileName,
        }],
      };
    }
    
    // Sticker
    if (m?.stickerMessage) {
      return {
        content: '🏷️ Sticker',
        mediaType: 'sticker',
        attachments: [{
          type: 'sticker',
          url: m.stickerMessage.url,
          mimeType: m.stickerMessage.mimetype,
        }],
      };
    }
    
    // Localização
    if (m?.locationMessage) {
      return {
        content: m.locationMessage.name || m.locationMessage.address || '📍 Localização',
        mediaType: 'location',
        attachments: [{
          type: 'location',
          data: JSON.stringify({
            latitude: m.locationMessage.degreesLatitude,
            longitude: m.locationMessage.degreesLongitude,
            name: m.locationMessage.name,
            address: m.locationMessage.address,
          }),
        }],
      };
    }
    
    // Contato
    if (m?.contactMessage) {
      return {
        content: m.contactMessage.displayName || '👤 Contato',
        mediaType: 'contact',
        attachments: [{
          type: 'contact',
          data: m.contactMessage.vcard,
        }],
      };
    }
    
    // Fallback
    return { content: '[Mensagem não suportada]', mediaType: 'text' };
  }

  private mapStatus(status?: string): DeliveryStatus {
    switch (status?.toUpperCase()) {
      case 'PENDING': return 'pending';
      case 'SERVER_ACK':
      case 'SENT': return 'sent';
      case 'DELIVERY_ACK':
      case 'DELIVERED': return 'delivered';
      case 'READ': return 'read';
      case 'DELETED': return 'deleted';
      case 'ERROR':
      case 'FAILED': return 'failed';
      default: return 'sent';
    }
  }

  private normalizeRecipient(recipient: string): string {
    // Se já é um JID completo, extrair apenas o número
    if (recipient.includes('@')) {
      return recipient.split('@')[0];
    }
    return recipient.replace(/\D/g, '');
  }

  private getMediaEndpoint(type: MediaType): string {
    switch (type) {
      case 'image': return 'message/sendImage';
      case 'video': return 'message/sendVideo';
      case 'audio': 
      case 'voice': return 'message/sendAudio';
      case 'document': return 'message/sendDocument';
      case 'sticker': return 'message/sendSticker';
      default: return 'message/sendDocument';
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const evolutionAdapter = new EvolutionAdapter();
