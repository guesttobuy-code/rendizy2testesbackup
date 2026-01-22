/**
 * ============================================================================
 * RENDIZY - Chat Adapters - SMS (Twilio, Vonage, etc)
 * ============================================================================
 * 
 * Adapter para mensagens SMS via Twilio ou Vonage
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
// TIPOS ESPECÍFICOS SMS
// ============================================================================

// Twilio Webhook
interface TwilioSmsWebhook {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
  SmsStatus?: string;
  SmsSid?: string;
}

// Vonage Webhook (estrutura similar)
interface VonageSmsWebhook {
  messageId: string;
  from: string;
  to: string;
  text: string;
  timestamp?: string;
  type?: 'text' | 'image' | 'audio';
}

// ============================================================================
// SMS ADAPTER (TWILIO)
// ============================================================================

export class SmsAdapter implements IChatAdapter {
  readonly name = 'SMS (Twilio)';
  readonly channel: ChannelType = 'sms';
  readonly provider = 'twilio';

  // ========== PARSING ==========

  parseWebhook(payload: unknown): WebhookPayload | null {
    if (!payload || typeof payload !== 'object') return null;
    
    const p = payload as TwilioSmsWebhook | VonageSmsWebhook;
    
    // Detectar se é Twilio ou Vonage
    if ('MessageSid' in p) {
      return this.parseTwilioWebhook(p as TwilioSmsWebhook);
    }
    
    if ('messageId' in p) {
      return this.parseVonageWebhook(p as VonageSmsWebhook);
    }
    
    return null;
  }

  private parseTwilioWebhook(p: TwilioSmsWebhook): WebhookPayload {
    return {
      event: 'message.received',
      instanceName: p.To || 'default',
      provider: 'twilio',
      data: p,
      timestamp: new Date(),
      raw: p,
    };
  }

  private parseVonageWebhook(p: VonageSmsWebhook): WebhookPayload {
    return {
      event: 'message.received',
      instanceName: p.to || 'default',
      provider: 'vonage',
      data: p,
      timestamp: new Date(),
      raw: p,
    };
  }

  parseContact(data: unknown): Partial<UnifiedContact> | null {
    if (!data || typeof data !== 'object') return null;
    
    // Twilio
    if ('From' in data) {
      const p = data as TwilioSmsWebhook;
      const phone = this.extractPhoneNumber(p.From);
      
      return {
        externalId: p.From,
        contactType: 'user' as ContactType,
        phoneNumber: phone || undefined,
        displayName: phone || p.From,
      };
    }
    
    // Vonage
    if ('from' in data) {
      const p = data as VonageSmsWebhook;
      const phone = this.extractPhoneNumber(p.from);
      
      return {
        externalId: p.from,
        contactType: 'user' as ContactType,
        phoneNumber: phone || undefined,
        displayName: phone || p.from,
      };
    }
    
    return null;
  }

  parseMessage(data: unknown): Partial<UnifiedMessage> | null {
    if (!data || typeof data !== 'object') return null;
    
    // Twilio
    if ('MessageSid' in data) {
      const p = data as TwilioSmsWebhook;
      const hasMedia = parseInt(p.NumMedia || '0') > 0;
      
      return {
        externalId: p.MessageSid,
        direction: 'incoming',
        senderId: p.From,
        content: p.Body || '',
        mediaType: hasMedia ? 'image' : 'text',
        attachments: hasMedia && p.MediaUrl0 ? [{
          type: 'image' as MediaType,
          url: p.MediaUrl0,
          mimeType: p.MediaContentType0,
        }] : undefined,
        status: 'delivered',
        sentAt: new Date(),
        metadata: {
          accountSid: p.AccountSid,
          provider: 'twilio',
        },
      };
    }
    
    // Vonage
    if ('messageId' in data) {
      const p = data as VonageSmsWebhook;
      
      return {
        externalId: p.messageId,
        direction: 'incoming',
        senderId: p.from,
        content: p.text || '',
        mediaType: (p.type as MediaType) || 'text',
        status: 'delivered',
        sentAt: p.timestamp ? new Date(p.timestamp) : new Date(),
        metadata: {
          provider: 'vonage',
        },
      };
    }
    
    return null;
  }

  // ========== VALIDAÇÃO ==========

  isValidContact(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    
    // Twilio
    if ('From' in data) {
      return !!(data as TwilioSmsWebhook).From;
    }
    
    // Vonage
    if ('from' in data) {
      return !!(data as VonageSmsWebhook).from;
    }
    
    return false;
  }

  shouldProcessMessage(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    
    // Twilio
    if ('MessageSid' in data) {
      const p = data as TwilioSmsWebhook;
      return !!p.MessageSid && !!p.From && !!p.Body;
    }
    
    // Vonage
    if ('messageId' in data) {
      const p = data as VonageSmsWebhook;
      return !!p.messageId && !!p.from && !!p.text;
    }
    
    return false;
  }

  extractPhoneNumber(identifier: string): string | null {
    if (!identifier) return null;
    
    // Remover "whatsapp:" prefix se existir
    let phone = identifier.replace('whatsapp:', '');
    
    // Remover caracteres não numéricos (exceto +)
    phone = phone.replace(/[^\d+]/g, '');
    
    // Remover + inicial
    phone = phone.replace(/^\+/, '');
    
    if (phone.length < 8) return null;
    
    return phone;
  }

  // ========== ENVIO ==========

  async sendText(
    instance: ChannelInstance,
    recipientId: string,
    text: string,
    _options?: { replyTo?: string }
  ): Promise<SendMessageResult> {
    try {
      // Twilio requer Account SID e Auth Token
      const credentials = instance.settings as {
        accountSid?: string;
        authToken?: string;
        fromNumber?: string;
      };
      
      if (!credentials?.accountSid || !credentials?.authToken) {
        return {
          success: false,
          error: 'Credenciais Twilio não configuradas',
        };
      }
      
      const url = `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json`;
      
      const formData = new URLSearchParams();
      formData.append('To', recipientId);
      formData.append('From', credentials.fromNumber || instance.connectedIdentifier || '');
      formData.append('Body', text);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${credentials.accountSid}:${credentials.authToken}`),
        },
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }
      
      const result = await response.json();
      
      return {
        success: true,
        externalId: result.sid,
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
      const credentials = instance.settings as {
        accountSid?: string;
        authToken?: string;
        fromNumber?: string;
      };
      
      if (!credentials?.accountSid || !credentials?.authToken) {
        return {
          success: false,
          error: 'Credenciais Twilio não configuradas',
        };
      }
      
      const url = `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json`;
      
      const formData = new URLSearchParams();
      formData.append('To', recipientId);
      formData.append('From', credentials.fromNumber || instance.connectedIdentifier || '');
      if (caption) formData.append('Body', caption);
      if (attachment.url) formData.append('MediaUrl', attachment.url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${credentials.accountSid}:${credentials.authToken}`),
        },
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }
      
      const result = await response.json();
      
      return {
        success: true,
        externalId: result.sid,
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
    // SMS não tem "conexão" como WhatsApp
    // Podemos verificar se as credenciais são válidas
    
    const credentials = instance.settings as {
      accountSid?: string;
      authToken?: string;
      fromNumber?: string;
    };
    
    if (!credentials?.accountSid || !credentials?.authToken) {
      return {
        connected: false,
        error: 'Credenciais Twilio não configuradas',
      };
    }
    
    return {
      connected: true,
      phoneNumber: credentials.fromNumber,
      profileName: 'Twilio SMS',
    };
  }

  // Não aplicável para SMS
  getQrCode = undefined;
  setupWebhook = undefined;
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const smsAdapter = new SmsAdapter();
