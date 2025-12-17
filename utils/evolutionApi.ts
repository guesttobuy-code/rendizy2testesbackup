/**
 * RENDIZY - Evolution API Integration (v2)
 * 
 * Utility para integração com Evolution API (WhatsApp não oficial)
 * Documentação: https://doc.evolution-api.com/v2/api-reference/get-information
 * 
 * @version v1.0.102
 * @date 2025-10-28
 */

// ============================================
// TYPES
// ============================================

export interface EvolutionAPIConfig {
  apiUrl: string;
  instanceName: string;
  apiKey: string;
}

export interface InstanceInfo {
  instance: {
    instanceName: string;
    instanceId: string;
    status: 'open' | 'close' | 'connecting';
  };
  connectionStatus: string;
  ownerJid?: string;
  profileName?: string;
  profilePictureUrl?: string;
  phoneNumber?: string;
}

export interface QRCodeResponse {
  pairingCode?: string;
  code?: string;
  base64?: string;
}

export interface SendMessagePayload {
  number: string; // Format: 5511999999999@s.whatsapp.net or 5511999999999
  text?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  mediaCaption?: string;
  delay?: number;
}

export interface SendMessageResponse {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: any;
  messageTimestamp: number;
  status: 'PENDING' | 'SERVER_ACK' | 'DELIVERY_ACK' | 'READ' | 'PLAYED';
}

export interface WebhookMessage {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text: string;
      };
      imageMessage?: any;
      videoMessage?: any;
      audioMessage?: any;
      documentMessage?: any;
    };
    messageType: 'conversation' | 'extendedTextMessage' | 'imageMessage' | 'videoMessage' | 'audioMessage' | 'documentMessage';
    messageTimestamp: number;
    status?: 'PENDING' | 'SERVER_ACK' | 'DELIVERY_ACK' | 'READ' | 'PLAYED';
  };
}

// ============================================
// EVOLUTION API CLIENT
// ============================================

export class EvolutionAPIClient {
  private config: EvolutionAPIConfig;

  constructor(config: EvolutionAPIConfig) {
    this.config = config;
  }

  /**
   * Make request to Evolution API
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T> {
    const url = `${this.config.apiUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': this.config.apiKey,
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    console.log(`📡 Evolution API Request: ${method} ${url}`);

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Evolution API Error: ${response.status}`, errorText);
      throw new Error(`Evolution API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ Evolution API Response:`, data);
    
    return data;
  }

  /**
   * Create or connect instance
   */
  async createInstance(): Promise<InstanceInfo> {
    return this.request<InstanceInfo>(
      `/instance/create`,
      'POST',
      {
        instanceName: this.config.instanceName,
        token: this.config.apiKey,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      }
    );
  }

  /**
   * Get instance connection info
   */
  async getConnectionState(): Promise<InstanceInfo> {
    return this.request<InstanceInfo>(
      `/instance/connectionState/${this.config.instanceName}`
    );
  }

  /**
   * Connect instance (generates QR Code)
   */
  async connect(): Promise<QRCodeResponse> {
    return this.request<QRCodeResponse>(
      `/instance/connect/${this.config.instanceName}`,
      'GET'
    );
  }

  /**
   * Get QR Code (base64)
   */
  async fetchQRCode(): Promise<QRCodeResponse> {
    return this.request<QRCodeResponse>(
      `/instance/qrcode/${this.config.instanceName}`
    );
  }

  /**
   * Logout instance
   */
  async logout(): Promise<{ status: string }> {
    return this.request<{ status: string }>(
      `/instance/logout/${this.config.instanceName}`,
      'DELETE'
    );
  }

  /**
   * Delete instance
   */
  async deleteInstance(): Promise<{ status: string }> {
    return this.request<{ status: string }>(
      `/instance/delete/${this.config.instanceName}`,
      'DELETE'
    );
  }

  /**
   * Send text message
   */
  async sendTextMessage(
    number: string,
    text: string,
    delay?: number
  ): Promise<SendMessageResponse> {
    // Normalize phone number
    const normalizedNumber = this.normalizePhoneNumber(number);
    
    return this.request<SendMessageResponse>(
      `/message/sendText/${this.config.instanceName}`,
      'POST',
      {
        number: normalizedNumber,
        text,
        delay: delay || 0
      }
    );
  }

  /**
   * Send media message (image, video, audio, document)
   */
  async sendMediaMessage(
    number: string,
    mediaUrl: string,
    mediaType: 'image' | 'video' | 'audio' | 'document',
    caption?: string,
    fileName?: string
  ): Promise<SendMessageResponse> {
    const normalizedNumber = this.normalizePhoneNumber(number);
    
    const endpoint = mediaType === 'image' 
      ? '/message/sendMedia'
      : mediaType === 'video'
      ? '/message/sendMedia'
      : mediaType === 'audio'
      ? '/message/sendAudio'
      : '/message/sendMedia';

    return this.request<SendMessageResponse>(
      `${endpoint}/${this.config.instanceName}`,
      'POST',
      {
        number: normalizedNumber,
        mediatype: mediaType,
        media: mediaUrl,
        caption: caption || '',
        fileName: fileName || 'file'
      }
    );
  }

  /**
   * Set webhook URL
   */
  async setWebhook(webhookUrl: string, events?: string[]): Promise<any> {
    return this.request(
      `/webhook/set/${this.config.instanceName}`,
      'POST',
      {
        url: webhookUrl,
        webhook_by_events: false,
        events: events || [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'MESSAGES_DELETE',
          'SEND_MESSAGE',
          'CONNECTION_UPDATE',
          'CALL'
        ]
      }
    );
  }

  /**
   * Get webhook info
   */
  async getWebhook(): Promise<any> {
    return this.request(
      `/webhook/find/${this.config.instanceName}`
    );
  }

  /**
   * Normalize phone number to WhatsApp format
   * Input: +55 11 99999-9999 or 5511999999999
   * Output: 5511999999999@s.whatsapp.net
   */
  private normalizePhoneNumber(number: string): string {
    // Remove all non-numeric characters
    let normalized = number.replace(/\D/g, '');
    
    // If already has @s.whatsapp.net, return as is
    if (number.includes('@s.whatsapp.net')) {
      return number;
    }
    
    // Add country code if missing (assume Brazil +55)
    if (!normalized.startsWith('55') && normalized.length === 11) {
      normalized = '55' + normalized;
    }
    
    // Add WhatsApp suffix
    return `${normalized}@s.whatsapp.net`;
  }

  /**
   * Extract phone number from WhatsApp JID
   * Input: 5511999999999@s.whatsapp.net
   * Output: +55 11 99999-9999
   */
  static extractPhoneNumber(jid: string): string {
    const number = jid.split('@')[0];
    
    // Format Brazilian number: +55 11 99999-9999
    if (number.startsWith('55') && number.length === 13) {
      return `+55 ${number.substr(2, 2)} ${number.substr(4, 5)}-${number.substr(9, 4)}`;
    }
    
    // Default: just add +
    return `+${number}`;
  }

  /**
   * Extract message text from webhook
   */
  static extractMessageText(webhookData: WebhookMessage): string | null {
    const message = webhookData.data.message;
    
    if (!message) return null;
    
    // Text message
    if (message.conversation) {
      return message.conversation;
    }
    
    // Extended text (reply, etc)
    if (message.extendedTextMessage?.text) {
      return message.extendedTextMessage.text;
    }
    
    // Media with caption
    if (message.imageMessage?.caption) {
      return message.imageMessage.caption;
    }
    
    if (message.videoMessage?.caption) {
      return message.videoMessage.caption;
    }
    
    return null;
  }

  /**
   * Check if message is from guest (not from us)
   */
  static isIncomingMessage(webhookData: WebhookMessage): boolean {
    return !webhookData.data.key.fromMe;
  }

  /**
   * Map Evolution API status to our internal status
   */
  static mapMessageStatus(
    status?: 'PENDING' | 'SERVER_ACK' | 'DELIVERY_ACK' | 'READ' | 'PLAYED'
  ): 'pending' | 'sent' | 'delivered' | 'read' | 'failed' {
    if (!status) return 'pending';
    
    switch (status) {
      case 'PENDING':
        return 'pending';
      case 'SERVER_ACK':
        return 'sent';
      case 'DELIVERY_ACK':
        return 'delivered';
      case 'READ':
      case 'PLAYED':
        return 'read';
      default:
        return 'pending';
    }
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create Evolution API client from config
 */
export function createEvolutionClient(config: EvolutionAPIConfig): EvolutionAPIClient {
  return new EvolutionAPIClient(config);
}

/**
 * Test connection to Evolution API
 */
export async function testEvolutionConnection(config: EvolutionAPIConfig): Promise<boolean> {
  try {
    const client = createEvolutionClient(config);
    const info = await client.getConnectionState();
    return info.instance.status === 'open';
  } catch (error) {
    console.error('Error testing Evolution API connection:', error);
    return false;
  }
}
