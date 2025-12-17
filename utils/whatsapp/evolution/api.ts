/**
 * EVOLUTION API - Provider Implementation
 * 
 * Adapter do código Evolution existente para a interface unificada
 * Mantém 100% do código original, apenas adapta para nova estrutura
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
  ApiResponse,
} from '../types';
import {
  WhatsAppError,
  ConnectionError,
  AuthenticationError,
  MessageError,
} from '../types';
import { EVOLUTION_CONFIG, EVOLUTION_ENDPOINTS, getEvolutionHeaders, formatPhoneForEvolution } from './config';

// Importar o cliente Evolution original
import { EvolutionAPIClient } from '../../evolutionApi';

/**
 * Evolution API Provider
 * 
 * Wrapper do código Evolution existente para interface unificada
 */
export class EvolutionProvider implements IWhatsAppProvider {
  readonly provider = 'evolution' as const;
  readonly config: WhatsAppProviderConfig;
  private client: EvolutionAPIClient;

  constructor(config?: Partial<WhatsAppProviderConfig>) {
    this.config = { ...EVOLUTION_CONFIG, ...config };
    
    // Criar cliente Evolution com configuração
    this.client = new EvolutionAPIClient({
      apiUrl: this.config.baseUrl,
      instanceName: this.config.instanceName || 'rendizy',
      apiKey: this.config.apiKey,
    });
  }

  // ============================================================
  // SESSION MANAGEMENT
  // ============================================================

  async connect(): Promise<void> {
    try {
      console.log('[Evolution] Conectando...');
      // Evolution conecta automaticamente ao obter QR Code
      await this.getQRCode();
    } catch (error) {
      throw new ConnectionError('evolution', error);
    }
  }

  async disconnect(): Promise<void> {
    try {
      console.log('[Evolution] Desconectando...');
      await this.client.logoutInstance();
    } catch (error) {
      throw new ConnectionError('evolution', error);
    }
  }

  async getStatus(): Promise<SessionStatus> {
    try {
      const info = await this.client.getInstanceInfo();
      
      // Mapear status Evolution → Status padrão
      switch (info.instance.status) {
        case 'open':
          return 'CONNECTED';
        case 'connecting':
          return 'CONNECTING';
        case 'close':
          return 'DISCONNECTED';
        default:
          return 'ERROR';
      }
    } catch (error) {
      console.error('[Evolution] Erro ao obter status:', error);
      return 'ERROR';
    }
  }

  async getQRCode(): Promise<QRCodeData> {
    try {
      const qrResponse = await this.client.connectQR();
      
      if (!qrResponse.base64 && !qrResponse.code) {
        throw new Error('QR Code não disponível');
      }

      return {
        qrCode: qrResponse.base64 || qrResponse.code || '',
        expiresAt: new Date(Date.now() + 60000), // 1 minuto
      };
    } catch (error) {
      throw new AuthenticationError('evolution', error);
    }
  }

  // ============================================================
  // MESSAGES
  // ============================================================

  async sendTextMessage(to: string, message: string): Promise<WhatsAppMessage> {
    try {
      const response = await this.client.sendTextMessage({
        number: formatPhoneForEvolution(to),
        text: message,
      });

      return this.mapToWhatsAppMessage(response);
    } catch (error) {
      throw new MessageError('evolution', error);
    }
  }

  async sendMediaMessage(request: SendMediaRequest): Promise<WhatsAppMessage> {
    try {
      const payload = {
        number: formatPhoneForEvolution(request.to),
        mediaUrl: request.mediaUrl,
        mediaType: request.type,
        mediaCaption: request.caption,
      };

      const response = await this.client.sendMediaMessage(payload);
      return this.mapToWhatsAppMessage(response);
    } catch (error) {
      throw new MessageError('evolution', error);
    }
  }

  async getMessages(chatId: string, limit?: number): Promise<WhatsAppMessage[]> {
    try {
      // Evolution não tem endpoint direto para histórico
      // Retornar vazio por enquanto (webhook recebe mensagens)
      console.warn('[Evolution] getMessages não implementado - use webhooks');
      return [];
    } catch (error) {
      throw new WhatsAppError('Erro ao buscar mensagens', 'evolution', 'GET_MESSAGES_ERROR', error);
    }
  }

  // ============================================================
  // CONTACTS & CHATS
  // ============================================================

  async getChats(): Promise<WhatsAppChat[]> {
    try {
      // Evolution tem fetchChats mas estrutura diferente
      // Implementar quando necessário
      console.warn('[Evolution] getChats não totalmente implementado');
      return [];
    } catch (error) {
      throw new WhatsAppError('Erro ao buscar chats', 'evolution', 'GET_CHATS_ERROR', error);
    }
  }

  async getContact(phone: string): Promise<WhatsAppContact> {
    try {
      const exists = await this.client.checkNumber(formatPhoneForEvolution(phone));
      
      return {
        id: phone,
        phone,
        isGroup: false,
        name: exists ? undefined : 'Número não cadastrado',
      };
    } catch (error) {
      throw new WhatsAppError('Erro ao buscar contato', 'evolution', 'GET_CONTACT_ERROR', error);
    }
  }

  async checkNumber(phone: string): Promise<boolean> {
    try {
      return await this.client.checkNumber(formatPhoneForEvolution(phone));
    } catch (error) {
      console.error('[Evolution] Erro ao verificar número:', error);
      return false;
    }
  }

  // ============================================================
  // HEALTH & UTILITIES
  // ============================================================

  async healthCheck(): Promise<HealthCheckResponse> {
    try {
      const info = await this.client.getInstanceInfo();
      
      return {
        healthy: info.instance.status === 'open',
        provider: 'evolution',
        version: 'v2',
      };
    } catch (error) {
      return {
        healthy: false,
        provider: 'evolution',
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

  private mapToWhatsAppMessage(evolutionResponse: any): WhatsAppMessage {
    return {
      id: evolutionResponse.key?.id || '',
      chatId: evolutionResponse.key?.remoteJid || '',
      from: evolutionResponse.key?.fromMe ? 'me' : evolutionResponse.key?.remoteJid || '',
      to: evolutionResponse.key?.remoteJid || '',
      body: '', // Evolution não retorna corpo na resposta de envio
      type: 'text',
      timestamp: evolutionResponse.messageTimestamp || Date.now(),
      status: this.mapStatus(evolutionResponse.status),
      isFromMe: evolutionResponse.key?.fromMe || true,
      hasMedia: false,
    };
  }

  private mapStatus(evolutionStatus?: string): 'pending' | 'sent' | 'delivered' | 'read' | 'error' {
    switch (evolutionStatus) {
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

// ============================================================
// EXPORT DEFAULT INSTANCE
// ============================================================

export const evolutionProvider = new EvolutionProvider();
