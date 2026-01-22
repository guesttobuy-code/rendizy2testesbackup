/**
 * ============================================================================
 * RENDIZY - Chat Adapters - WAHA (WhatsApp HTTP API)
 * ============================================================================
 * 
 * Adapter para WAHA - WhatsApp HTTP API
 * Documentação: https://waha.devlike.pro/docs
 * 
 * Diferenças principais do Evolution API:
 * - Usa "session" ao invés de "instance"
 * - Header de auth: X-Api-Key ao invés de apikey
 * - Endpoint base: /api/sendText ao invés de /message/sendText
 * - chatId usa @c.us para contatos e @g.us para grupos
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
// TIPOS ESPECÍFICOS WAHA
// ============================================================================

interface WahaWebhookMessage {
  id: string;
  timestamp: number;
  from: string;
  to: string;
  fromMe: boolean;
  body?: string;
  hasMedia?: boolean;
  mediaUrl?: string;
  type?: string;
  // Para mensagens com mídia
  caption?: string;
  mimetype?: string;
  filename?: string;
  // Metadados do contato
  _data?: {
    notifyName?: string;
    pushname?: string;
  };
  // Para replies
  quotedMsgId?: string;
  quotedMsg?: unknown;
}

interface WahaWebhookPayload {
  event: string;
  session: string;
  payload?: WahaWebhookMessage | WahaWebhookMessage[];
  me?: {
    id: string;
    pushName?: string;
  };
}

// ============================================================================
// WAHA ADAPTER
// ============================================================================

export class WahaAdapter implements IChatAdapter {
  readonly name = 'WAHA (WhatsApp HTTP API)';
  readonly channel: ChannelType = 'whatsapp';
  readonly provider = 'waha';

  // ========== PARSING ==========

  parseWebhook(payload: unknown): WebhookPayload | null {
    if (!payload || typeof payload !== 'object') return null;
    
    const p = payload as WahaWebhookPayload;
    
    // Eventos relevantes do WAHA
    const relevantEvents = [
      'message',
      'message.any',
      'message.ack',
      'session.status',
      'state.change',
    ];
    
    if (!p.event || !relevantEvents.includes(p.event)) {
      return null;
    }
    
    return {
      event: p.event,
      instanceName: p.session,
      provider: this.provider,
      data: p.payload,
      timestamp: new Date(),
      raw: payload,
    };
  }

  parseContact(data: unknown): Partial<UnifiedContact> | null {
    if (!data || typeof data !== 'object') return null;
    
    const msg = data as WahaWebhookMessage;
    const chatId = msg.fromMe ? msg.to : msg.from;
    
    if (!chatId) return null;
    
    const contactType = this.detectContactType(chatId);
    const phoneNumber = this.extractPhoneNumber(chatId);
    
    // WAHA usa _data.notifyName ou _data.pushname
    const displayName = msg._data?.notifyName 
      || msg._data?.pushname 
      || phoneNumber 
      || chatId.split('@')[0];
    
    return {
      externalId: chatId,
      contactType,
      phoneNumber: phoneNumber || undefined,
      displayName,
    };
  }

  parseMessage(data: unknown): Partial<UnifiedMessage> | null {
    if (!data || typeof data !== 'object') return null;
    
    const msg = data as WahaWebhookMessage;
    
    if (!msg.id) return null;
    
    // Extrair conteúdo
    const { content, mediaType, attachments } = this.extractMessageContent(msg);
    
    return {
      externalId: msg.id,
      direction: msg.fromMe ? 'outgoing' : 'incoming',
      senderId: msg.fromMe ? undefined : msg.from,
      senderName: msg._data?.notifyName || msg._data?.pushname,
      content,
      mediaType,
      attachments,
      replyTo: msg.quotedMsgId,
      status: 'sent', // WAHA não envia status no webhook de mensagem
      sentAt: msg.timestamp ? new Date(msg.timestamp * 1000) : new Date(),
      metadata: {
        wahaType: msg.type,
        from: msg.from,
        to: msg.to,
      },
    };
  }

  // ========== VALIDAÇÃO ==========

  isValidContact(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    
    const msg = data as WahaWebhookMessage;
    const chatId = msg.fromMe ? msg.to : msg.from;
    
    if (!chatId) return false;
    
    // WAHA usa @c.us para contatos individuais
    // @g.us para grupos
    // @lid para IDs internos
    // status@broadcast para status
    
    // Rejeitar grupos e broadcasts
    if (chatId.endsWith('@g.us')) return false;
    if (chatId === 'status@broadcast') return false;
    if (chatId.endsWith('@newsletter')) return false;
    
    return true;
  }

  shouldProcessMessage(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    
    const msg = data as WahaWebhookMessage;
    
    // Precisa ter ID
    if (!msg.id) return false;
    
    // Não processar mensagens enviadas por nós
    if (msg.fromMe) return false;
    
    // Validar contato
    if (!this.isValidContact(data)) return false;
    
    // Precisa ter conteúdo (body ou mídia)
    if (!msg.body && !msg.hasMedia) return false;
    
    return true;
  }

  extractPhoneNumber(identifier: string): string | null {
    if (!identifier) return null;
    
    // WAHA usa formatos:
    // 5511999999999@c.us (contato)
    // 5511999999999@lid (link ID)
    // 5511999999999@s.whatsapp.net (interno)
    
    let phone = identifier
      .replace('@c.us', '')
      .replace('@s.whatsapp.net', '')
      .replace('@lid', '');
    
    // Se ainda tem @, é outro tipo
    if (phone.includes('@')) return null;
    
    // Limpar caracteres não numéricos
    phone = phone.replace(/\D/g, '');
    
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
      const url = `${instance.apiUrl}/api/sendText`;
      
      const body: Record<string, unknown> = {
        session: instance.instanceName,
        chatId: this.normalizeChatId(recipientId),
        text,
      };
      
      if (options?.replyTo) {
        body.reply_to = options.replyTo;
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': instance.apiKey,
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
        externalId: result.id || result.messageId,
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
      const url = `${instance.apiUrl}${endpoint}`;
      
      const body: Record<string, unknown> = {
        session: instance.instanceName,
        chatId: this.normalizeChatId(recipientId),
        caption,
      };
      
      // WAHA aceita URL direta ou base64
      if (attachment.url) {
        body.file = { url: attachment.url };
      } else if (attachment.data) {
        body.file = {
          mimetype: attachment.mimeType,
          data: attachment.data,
          filename: attachment.filename,
        };
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': instance.apiKey,
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
        externalId: result.id || result.messageId,
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
      // WAHA usa /api/sessions/{session} para verificar status
      const url = `${instance.apiUrl}/api/sessions/${instance.instanceName}`;
      
      const response = await fetch(url, {
        headers: { 'X-Api-Key': instance.apiKey },
      });
      
      if (!response.ok) {
        const error = await response.text();
        return { connected: false, error };
      }
      
      const result = await response.json();
      
      // WAHA retorna status como "WORKING", "SCAN_QR_CODE", etc.
      const isConnected = result.status === 'WORKING';
      
      return {
        connected: isConnected,
        phoneNumber: result.me?.id?.split('@')[0],
        profileName: result.me?.pushName,
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
      // WAHA: POST /api/sessions/{session}/auth/qr
      const url = `${instance.apiUrl}/api/sessions/${instance.instanceName}/auth/qr`;
      
      const response = await fetch(url, {
        method: 'GET', // WAHA usa GET para obter QR
        headers: { 'X-Api-Key': instance.apiKey },
      });
      
      if (!response.ok) {
        const error = await response.text();
        return { error };
      }
      
      const result = await response.json();
      
      return {
        qrCode: result.value, // WAHA retorna em result.value
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
      // WAHA: PUT /api/sessions/{session}
      const url = `${instance.apiUrl}/api/sessions/${instance.instanceName}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': instance.apiKey,
        },
        body: JSON.stringify({
          config: {
            webhooks: [{
              url: webhookUrl,
              events: events.length > 0 ? events : ['message', 'message.ack'],
            }],
          },
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

  // ========== MÉTODOS ESPECÍFICOS WAHA ==========

  /**
   * Criar uma nova sessão WAHA
   */
  async createSession(
    baseUrl: string,
    apiKey: string,
    sessionName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `${baseUrl}/api/sessions`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
        },
        body: JSON.stringify({
          name: sessionName,
          start: true, // Iniciar imediatamente
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
        error: error instanceof Error ? error.message : 'Erro ao criar sessão',
      };
    }
  }

  /**
   * Deletar sessão WAHA
   */
  async deleteSession(
    baseUrl: string,
    apiKey: string,
    sessionName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `${baseUrl}/api/sessions/${sessionName}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'X-Api-Key': apiKey },
      });
      
      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao deletar sessão',
      };
    }
  }

  // ========== HELPERS PRIVADOS ==========

  private detectContactType(chatId: string): ContactType {
    if (chatId.endsWith('@g.us')) return 'group';
    if (chatId.endsWith('@newsletter')) return 'channel';
    if (chatId === 'status@broadcast') return 'broadcast';
    if (chatId.endsWith('@lid')) return 'lid';
    // WAHA usa @c.us para contatos individuais
    return 'user';
  }

  private extractMessageContent(msg: WahaWebhookMessage): {
    content: string;
    mediaType: MediaType;
    attachments?: MessageAttachment[];
  } {
    // Texto simples
    if (msg.body && !msg.hasMedia) {
      return { content: msg.body, mediaType: 'text' };
    }
    
    // Mensagem com mídia
    if (msg.hasMedia && msg.mediaUrl) {
      const type = this.detectMediaType(msg.type, msg.mimetype);
      
      return {
        content: msg.caption || msg.body || '',
        mediaType: type,
        attachments: [{
          type,
          url: msg.mediaUrl,
          mimeType: msg.mimetype,
          filename: msg.filename,
        }],
      };
    }
    
    // Mensagem com mídia mas sem URL ainda (pode precisar baixar)
    if (msg.hasMedia) {
      const type = this.detectMediaType(msg.type, msg.mimetype);
      
      return {
        content: msg.caption || `[${type}]`,
        mediaType: type,
        attachments: [{
          type,
          mimeType: msg.mimetype,
          filename: msg.filename,
        }],
      };
    }
    
    // Fallback
    return { content: msg.body || '[Mensagem vazia]', mediaType: 'text' };
  }

  private detectMediaType(type?: string, mimetype?: string): MediaType {
    // Por tipo do WAHA
    switch (type) {
      case 'image': return 'image';
      case 'video': return 'video';
      case 'audio':
      case 'ptt': return 'audio'; // ptt = push-to-talk (áudio de voz)
      case 'document': return 'document';
      case 'sticker': return 'sticker';
      case 'location': return 'location';
      case 'vcard':
      case 'contact': return 'contact';
    }
    
    // Por mimetype
    if (mimetype) {
      if (mimetype.startsWith('image/')) return 'image';
      if (mimetype.startsWith('video/')) return 'video';
      if (mimetype.startsWith('audio/')) return 'audio';
    }
    
    return 'document';
  }

  private normalizeChatId(recipient: string): string {
    // Se já tem sufixo, retornar como está
    if (recipient.includes('@')) {
      return recipient;
    }
    
    // Limpar e adicionar @c.us
    const cleaned = recipient.replace(/\D/g, '');
    return `${cleaned}@c.us`;
  }

  private getMediaEndpoint(type: MediaType): string {
    switch (type) {
      case 'image': return '/api/sendImage';
      case 'video': return '/api/sendVideo';
      case 'audio':
      case 'voice': return '/api/sendVoice';
      case 'document': return '/api/sendFile';
      case 'sticker': return '/api/sendImage'; // WAHA não tem endpoint específico para sticker
      default: return '/api/sendFile';
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const wahaAdapter = new WahaAdapter();
