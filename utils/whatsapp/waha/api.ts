/**
 * WAHA - Provider Implementation
 * 
 * Implementação completa do provider WAHA para RENDIZY
 * Docs: https://waha.devlike.pro/docs/
 */

import type {
  IWhatsAppProvider,
  WhatsAppProviderConfig,
  SessionStatus,
  QRCodeData,
  WhatsAppMessage,
  WhatsAppChat,
  WhatsAppContact,
  SendMediaRequest,
  HealthCheckResponse,
} from '../types';
import {
  WhatsAppError,
  ConnectionError,
  AuthenticationError,
  MessageError,
} from '../types';
import {
  WAHA_CONFIG,
  WAHA_ENDPOINTS,
  getWAHAHeaders,
  formatPhoneForWAHA,
  cleanPhoneFromWAHA,
  WAHA_STATUS_MAP,
} from './config';

/**
 * WAHA Provider
 * 
 * Provider alternativo ao Evolution - mais estável
 */
export class WAHAProvider implements IWhatsAppProvider {
  readonly provider = 'waha' as const;
  readonly config: WhatsAppProviderConfig;

  constructor(config?: Partial<WhatsAppProviderConfig>) {
    this.config = { ...WAHA_CONFIG, ...config };
  }

  // ============================================================
  // SESSION MANAGEMENT
  // ============================================================

  async connect(): Promise<void> {
    try {
      console.log('[WAHA] Conectando...');
      
      // Criar ou obter sessão
      await this.getOrCreateSession();
      
      // Iniciar sessão
      const response = await this.request(
        this.buildUrl(WAHA_ENDPOINTS.sessionStart, { session: this.getSessionName() }),
        { method: 'POST' }
      );

      console.log('[WAHA] Sessão iniciada:', response);
    } catch (error) {
      throw new ConnectionError('waha', error);
    }
  }

  async disconnect(): Promise<void> {
    try {
      console.log('[WAHA] Desconectando...');
      
      await this.request(
        this.buildUrl(WAHA_ENDPOINTS.sessionLogout, { session: this.getSessionName() }),
        { method: 'POST' }
      );

      console.log('[WAHA] Desconectado com sucesso');
    } catch (error) {
      throw new ConnectionError('waha', error);
    }
  }

  async getStatus(): Promise<SessionStatus> {
    try {
      const sessions = await this.listSessions();
      const currentSession = sessions.find((s: any) => s.name === this.getSessionName());

      if (!currentSession) {
        return 'DISCONNECTED';
      }

      // Mapear status WAHA → Status padrão
      const wahaStatus = currentSession.status as keyof typeof WAHA_STATUS_MAP;
      return WAHA_STATUS_MAP[wahaStatus] || 'ERROR';
    } catch (error) {
      console.error('[WAHA] Erro ao obter status:', error);
      return 'ERROR';
    }
  }

  async getQRCode(): Promise<QRCodeData> {
    try {
      // Garantir que sessão existe
      await this.getOrCreateSession();

      // Obter QR Code
      const response = await this.request(
        this.buildUrl(WAHA_ENDPOINTS.sessionQR, { session: this.getSessionName() })
      );

      if (!response.qr) {
        throw new Error('QR Code não disponível');
      }

      return {
        qrCode: response.qr, // Base64 image
        expiresAt: new Date(Date.now() + 45000), // 45 segundos
      };
    } catch (error) {
      throw new AuthenticationError('waha', error);
    }
  }

  // ============================================================
  // MESSAGES
  // ============================================================

  async sendTextMessage(to: string, message: string): Promise<WhatsAppMessage> {
    try {
      const response = await this.request(WAHA_ENDPOINTS.sendText, {
        method: 'POST',
        body: JSON.stringify({
          session: this.getSessionName(),
          chatId: formatPhoneForWAHA(to),
          text: message,
        }),
      });

      return this.mapToWhatsAppMessage(response);
    } catch (error) {
      throw new MessageError('waha', error);
    }
  }

  async sendMediaMessage(request: SendMediaRequest): Promise<WhatsAppMessage> {
    try {
      let endpoint = WAHA_ENDPOINTS.sendFile;
      
      // Escolher endpoint baseado no tipo
      switch (request.type) {
        case 'image':
          endpoint = WAHA_ENDPOINTS.sendImage;
          break;
        case 'video':
          endpoint = WAHA_ENDPOINTS.sendVideo;
          break;
        case 'audio':
          endpoint = WAHA_ENDPOINTS.sendAudio;
          break;
        default:
          endpoint = WAHA_ENDPOINTS.sendFile;
      }

      const response = await this.request(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          session: this.getSessionName(),
          chatId: formatPhoneForWAHA(request.to),
          file: {
            url: request.mediaUrl,
          },
          caption: request.caption || '',
        }),
      });

      return this.mapToWhatsAppMessage(response);
    } catch (error) {
      throw new MessageError('waha', error);
    }
  }

  async getMessages(chatId: string, limit: number = 100): Promise<WhatsAppMessage[]> {
    try {
      const response = await this.request(
        this.buildUrl(WAHA_ENDPOINTS.chatMessages, {
          session: this.getSessionName(),
          chatId: formatPhoneForWAHA(chatId),
        }) + `?limit=${limit}`
      );

      if (!Array.isArray(response)) {
        return [];
      }

      return response.map((msg: any) => this.mapToWhatsAppMessage(msg));
    } catch (error) {
      console.error('[WAHA] Erro ao buscar mensagens:', error);
      return [];
    }
  }

  // ============================================================
  // CONTACTS & CHATS
  // ============================================================

  async getChats(): Promise<WhatsAppChat[]> {
    try {
      const response = await this.request(
        this.buildUrl(WAHA_ENDPOINTS.chats, { session: this.getSessionName() })
      );

      if (!Array.isArray(response)) {
        return [];
      }

      return response.map((chat: any) => ({
        id: chat.id,
        name: chat.name || cleanPhoneFromWAHA(chat.id),
        isGroup: chat.id.includes('@g.us'),
        unreadCount: chat.unreadCount || 0,
        timestamp: chat.timestamp || Date.now(),
      }));
    } catch (error) {
      console.error('[WAHA] Erro ao buscar chats:', error);
      return [];
    }
  }

  async getContact(phone: string): Promise<WhatsAppContact> {
    try {
      const formattedPhone = formatPhoneForWAHA(phone);
      
      const response = await this.request(
        `${WAHA_ENDPOINTS.contacts}/${formattedPhone}`,
        { method: 'GET' }
      );

      return {
        id: formattedPhone,
        phone: cleanPhoneFromWAHA(formattedPhone),
        name: response.name || response.pushname,
        profilePicUrl: response.profilePictureURL,
        isGroup: formattedPhone.includes('@g.us'),
      };
    } catch (error) {
      // Se falhar, retornar contato básico
      return {
        id: phone,
        phone,
        isGroup: false,
      };
    }
  }

  async checkNumber(phone: string): Promise<boolean> {
    try {
      const response = await this.request(WAHA_ENDPOINTS.contactCheck, {
        method: 'POST',
        body: JSON.stringify({
          session: this.getSessionName(),
          phone: cleanPhoneFromWAHA(formatPhoneForWAHA(phone)),
        }),
      });

      return response.exists === true;
    } catch (error) {
      console.error('[WAHA] Erro ao verificar número:', error);
      return false;
    }
  }

  // ============================================================
  // HEALTH & UTILITIES
  // ============================================================

  async healthCheck(): Promise<HealthCheckResponse> {
    try {
      const response = await fetch(`${this.config.baseUrl}${WAHA_ENDPOINTS.health}`);
      
      return {
        healthy: response.ok,
        provider: 'waha',
        version: 'latest',
      };
    } catch (error) {
      return {
        healthy: false,
        provider: 'waha',
      };
    }
  }

  async isConnected(): Promise<boolean> {
    const status = await this.getStatus();
    return status === 'CONNECTED';
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private async getOrCreateSession(): Promise<any> {
    try {
      // Tentar obter sessão existente
      const sessions = await this.listSessions();
      const existingSession = sessions.find((s: any) => s.name === this.getSessionName());

      if (existingSession) {
        console.log('[WAHA] Sessão já existe:', this.getSessionName());
        return existingSession;
      }

      // Criar nova sessão
      console.log('[WAHA] Criando nova sessão:', this.getSessionName());
      const response = await this.request(WAHA_ENDPOINTS.sessions, {
        method: 'POST',
        body: JSON.stringify({
          name: this.getSessionName(),
          config: {
            webhooks: [],
          },
        }),
      });

      return response;
    } catch (error) {
      console.error('[WAHA] Erro ao gerenciar sessão:', error);
      throw error;
    }
  }

  private async listSessions(): Promise<any[]> {
    try {
      const response = await this.request(WAHA_ENDPOINTS.sessions);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('[WAHA] Erro ao listar sessões:', error);
      return [];
    }
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.config.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getWAHAHeaders(this.config.apiKey),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WAHA API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  private buildUrl(template: string, params: Record<string, string>): string {
    let url = template;
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, value);
    });
    return url;
  }

  private getSessionName(): string {
    return this.config.sessionName || 'rendizy-default';
  }

  private mapToWhatsAppMessage(wahaResponse: any): WhatsAppMessage {
    return {
      id: wahaResponse.id || '',
      chatId: wahaResponse.chatId || wahaResponse.from || '',
      from: wahaResponse.from || '',
      to: wahaResponse.to || wahaResponse.chatId || '',
      body: wahaResponse.body || wahaResponse.text || '',
      type: this.detectMessageType(wahaResponse),
      timestamp: wahaResponse.timestamp || Date.now(),
      status: this.mapStatus(wahaResponse.ack),
      isFromMe: wahaResponse.fromMe || false,
      hasMedia: wahaResponse.hasMedia || false,
      mediaUrl: wahaResponse.mediaUrl,
    };
  }

  private detectMessageType(msg: any): 'text' | 'image' | 'video' | 'audio' | 'document' {
    if (msg.type) return msg.type;
    if (msg.hasMedia) {
      // Tentar detectar pelo MIME type se disponível
      return 'image'; // Default para mídia
    }
    return 'text';
  }

  private mapStatus(ack?: number): 'pending' | 'sent' | 'delivered' | 'read' | 'error' {
    switch (ack) {
      case 0:
        return 'error';
      case 1:
        return 'pending';
      case 2:
        return 'sent';
      case 3:
        return 'delivered';
      case 4:
        return 'read';
      default:
        return 'pending';
    }
  }
}

// ============================================================
// EXPORT DEFAULT INSTANCE
// ============================================================

export const wahaProvider = new WAHAProvider();
