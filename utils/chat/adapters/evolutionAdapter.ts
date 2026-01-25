/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    EVOLUTION API ADAPTER                                   ║
 * ║                                                                            ║
 * ║  Adapter para comunicação com Evolution API v2                            ║
 * ║  JID Format: 5521999887766@s.whatsapp.net                                 ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * @version 1.0.0
 * @date 2026-01-24
 * @see ADR-010-CHAT-MULTI-PROVIDER-ARCHITECTURE.md
 * 
 * ENDPOINTS UTILIZADOS:
 * - GET  /chat/findChats/{instance}              → Lista conversas
 * - POST /chat/findMessages/{instance}           → Lista mensagens
 * - POST /message/sendText/{instance}            → Envia texto
 * - POST /message/sendMedia/{instance}           → Envia mídia
 * - PUT  /chat/markMessageAsRead/{instance}      → Marca como lido
 */

import type {
  IWhatsAppAdapter,
  WhatsAppAdapterConfig,
  NormalizedWhatsAppMessage,
  NormalizedWhatsAppChat,
  SendMessageResult,
} from './types';

// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_MESSAGE_LIMIT = 50;

// ============================================================
// EVOLUTION ADAPTER
// ============================================================

export class EvolutionAdapter implements IWhatsAppAdapter {
  readonly provider = 'evolution' as const;
  readonly displayName = 'Evolution API';
  
  private config: WhatsAppAdapterConfig;
  
  constructor(config: WhatsAppAdapterConfig) {
    this.config = config;
    console.log(`[EvolutionAdapter] ✅ Initialized for instance: ${config.instanceName}`);
  }
  
  // ============================================================
  // JID HANDLING
  // ============================================================
  
  /**
   * Normaliza para formato Evolution: numero@s.whatsapp.net
   */
  normalizeJid(input: string): string {
    if (!input) return '';
    
    // Se já está no formato correto
    if (input.endsWith('@s.whatsapp.net')) {
      return input;
    }
    
    // Se está no formato WAHA (@c.us), converter
    if (input.endsWith('@c.us')) {
      return input.replace('@c.us', '@s.whatsapp.net');
    }
    
    // Se é grupo, manter @g.us
    if (input.endsWith('@g.us')) {
      return input;
    }
    
    // Se é lead do Meta Ads, manter @lid
    if (input.endsWith('@lid')) {
      return input;
    }
    
    // Se é apenas número, adicionar sufixo
    const cleanNumber = input.replace(/\D/g, '');
    if (cleanNumber.length >= 10) {
      return `${cleanNumber}@s.whatsapp.net`;
    }
    
    console.warn(`[EvolutionAdapter] ⚠️ Could not normalize JID: ${input}`);
    return input;
  }
  
  /**
   * Extrai número limpo do JID
   */
  extractPhone(jid: string): string {
    return jid
      .replace('@s.whatsapp.net', '')
      .replace('@c.us', '')
      .replace('@g.us', '')
      .replace('@lid', '')
      .replace(/\D/g, '');
  }
  
  // ============================================================
  // API HELPERS
  // ============================================================
  
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'apikey': this.config.apiKey,
    };
  }
  
  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.config.apiUrl}${endpoint}`;
    
    console.log(`[EvolutionAdapter] 📡 ${options?.method || 'GET'} ${endpoint}`);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[EvolutionAdapter] ❌ API Error ${response.status}:`, errorText);
      throw new Error(`Evolution API error: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  }
  
  // ============================================================
  // INTERFACE IMPLEMENTATION
  // ============================================================
  
  async isConnected(): Promise<boolean> {
    try {
      const instances = await this.fetch<any[]>('/instance/fetchInstances');
      const instance = instances.find(i => i.name === this.config.instanceName);
      return instance?.connectionStatus === 'open';
    } catch (error) {
      console.error('[EvolutionAdapter] ❌ Connection check failed:', error);
      return false;
    }
  }
  
  async fetchChats(limit = 50): Promise<NormalizedWhatsAppChat[]> {
    try {
      // ✅ v2.1.1: Evolution API usa POST para findChats
      const chats = await this.fetch<any[]>(
        `/chat/findChats/${this.config.instanceName}`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      );
      
      console.log(`[EvolutionAdapter] ✅ Fetched ${chats?.length || 0} chats`);
      
      return (chats || []).slice(0, limit).map(chat => this.normalizeChat(chat));
    } catch (error) {
      console.error('[EvolutionAdapter] ❌ fetchChats failed:', error);
      return [];
    }
  }
  
  async fetchMessages(
    chatId: string,
    limit = DEFAULT_MESSAGE_LIMIT
  ): Promise<NormalizedWhatsAppMessage[]> {
    try {
      const normalizedJid = this.normalizeJid(chatId);
      
      console.log(`[EvolutionAdapter] 📥 Fetching messages for: ${normalizedJid}`);
      
      // Evolution API usa POST para buscar mensagens
      const response = await this.fetch<any>(
        `/chat/findMessages/${this.config.instanceName}`,
        {
          method: 'POST',
          body: JSON.stringify({
            where: {
              key: {
                remoteJid: normalizedJid,
              },
            },
            limit,
          }),
        }
      );
      
      // ✅ v2.5.1: Evolution retorna { messages: { records: [...] } } ou array direto
      let messages: any[] = [];
      if (Array.isArray(response)) {
        messages = response;
      } else if (response.messages?.records) {
        // Formato: { messages: { total, pages, records: [...] } }
        messages = response.messages.records;
      } else if (Array.isArray(response.messages)) {
        // Formato: { messages: [...] }
        messages = response.messages;
      }
      
      console.log(`[EvolutionAdapter] ✅ Fetched ${messages.length} messages`);
      
      return messages.map((msg: any) => this.normalizeMessage(msg, normalizedJid));
    } catch (error) {
      console.error('[EvolutionAdapter] ❌ fetchMessages failed:', error);
      return [];
    }
  }
  
  async sendText(chatId: string, text: string): Promise<SendMessageResult> {
    try {
      const normalizedJid = this.normalizeJid(chatId);
      
      console.log(`[EvolutionAdapter] 📤 Sending text to: ${normalizedJid}`);
      
      const response = await this.fetch<any>(
        `/message/sendText/${this.config.instanceName}`,
        {
          method: 'POST',
          body: JSON.stringify({
            number: normalizedJid,
            text,
          }),
        }
      );
      
      console.log('[EvolutionAdapter] ✅ Message sent:', response?.key?.id);
      
      return {
        success: true,
        messageId: response?.key?.id,
        raw: response,
      };
    } catch (error) {
      console.error('[EvolutionAdapter] ❌ sendText failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  async sendMedia(
    chatId: string,
    mediaUrl: string,
    mediaType: 'image' | 'video' | 'audio' | 'document',
    caption?: string
  ): Promise<SendMessageResult> {
    try {
      const normalizedJid = this.normalizeJid(chatId);
      
      // Mapear tipo para endpoint Evolution
      const endpointMap = {
        image: 'sendMedia',
        video: 'sendMedia',
        audio: 'sendWhatsAppAudio',
        document: 'sendMedia',
      };
      
      const endpoint = endpointMap[mediaType] || 'sendMedia';
      
      const response = await this.fetch<any>(
        `/message/${endpoint}/${this.config.instanceName}`,
        {
          method: 'POST',
          body: JSON.stringify({
            number: normalizedJid,
            mediatype: mediaType,
            media: mediaUrl,
            caption: caption || '',
          }),
        }
      );
      
      return {
        success: true,
        messageId: response?.key?.id,
        raw: response,
      };
    } catch (error) {
      console.error('[EvolutionAdapter] ❌ sendMedia failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  async markAsRead(chatId: string, messageIds?: string[]): Promise<void> {
    try {
      const normalizedJid = this.normalizeJid(chatId);
      
      await this.fetch(
        `/chat/markMessageAsRead/${this.config.instanceName}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            readMessages: [{
              remoteJid: normalizedJid,
              // Se tiver IDs específicos, usar; senão marcar último
              id: messageIds?.[0],
            }],
          }),
        }
      );
      
      console.log('[EvolutionAdapter] ✅ Marked as read:', normalizedJid);
    } catch (error) {
      console.error('[EvolutionAdapter] ⚠️ markAsRead failed:', error);
      // Não lançar erro, apenas logar
    }
  }
  
  // ============================================================
  // NORMALIZERS
  // ============================================================
  
  private normalizeChat(raw: any): NormalizedWhatsAppChat {
    // ✅ v2.5.1: Evolution API retorna remoteJid como identificador principal do chat
    // O campo "id" é um ID interno do banco de dados, não o JID do WhatsApp
    const id = raw.remoteJid || raw.id || '';
    const isGroup = id.endsWith('@g.us');
    
    return {
      id,
      name: raw.name || raw.pushName || raw.notify || this.extractPhone(id),
      profilePicUrl: raw.profilePictureUrl || raw.profilePicUrl,
      lastMessage: raw.lastMessage ? {
        text: this.extractTextFromMessage(raw.lastMessage),
        timestamp: raw.lastMessage.messageTimestamp || Math.floor(Date.now() / 1000),
        fromMe: raw.lastMessage.key?.fromMe || false,
      } : undefined,
      unreadCount: raw.unreadCount || 0,
      isGroup,
      updatedAt: raw.updatedAt ? new Date(raw.updatedAt).getTime() / 1000 : undefined,
    };
  }
  
  private normalizeMessage(raw: any, chatId: string): NormalizedWhatsAppMessage {
    const key = raw.key || {};
    const message = raw.message || {};
    
    // Extrair texto de diferentes formatos Evolution
    let text = '';
    if (message.conversation) {
      text = message.conversation;
    } else if (message.extendedTextMessage?.text) {
      text = message.extendedTextMessage.text;
    } else if (message.imageMessage?.caption) {
      text = message.imageMessage.caption;
    } else if (message.videoMessage?.caption) {
      text = message.videoMessage.caption;
    } else if (message.documentMessage?.caption) {
      text = message.documentMessage.caption;
    }
    
    // Determinar tipo de mídia
    let mediaType: NormalizedWhatsAppMessage['mediaType'] = 'text';
    let mediaUrl: string | undefined;
    let mediaMimetype: string | undefined;
    
    if (message.imageMessage) {
      mediaType = 'image';
      mediaUrl = message.imageMessage.url;
      mediaMimetype = message.imageMessage.mimetype;
    } else if (message.videoMessage) {
      mediaType = 'video';
      mediaUrl = message.videoMessage.url;
      mediaMimetype = message.videoMessage.mimetype;
    } else if (message.audioMessage) {
      mediaType = 'audio';
      mediaUrl = message.audioMessage.url;
      mediaMimetype = message.audioMessage.mimetype;
    } else if (message.documentMessage) {
      mediaType = 'document';
      mediaUrl = message.documentMessage.url;
      mediaMimetype = message.documentMessage.mimetype;
    }
    
    // Mapear status
    const statusMap: Record<string, NormalizedWhatsAppMessage['status']> = {
      'PENDING': 'pending',
      'SERVER_ACK': 'sent',
      'DELIVERY_ACK': 'delivered',
      'READ': 'read',
      'PLAYED': 'read',
      'ERROR': 'failed',
    };
    
    return {
      id: key.id || raw.id || crypto.randomUUID(),
      remoteJid: key.remoteJid || chatId,
      fromMe: key.fromMe || false,
      text,
      timestamp: raw.messageTimestamp || Math.floor(Date.now() / 1000),
      status: statusMap[raw.status] || 'sent',
      mediaType,
      mediaUrl,
      mediaMimetype,
      pushName: raw.pushName,
      raw,
    };
  }
  
  private extractTextFromMessage(msg: any): string {
    if (!msg) return '';
    
    const message = msg.message || msg;
    
    if (typeof message === 'string') return message;
    if (message.conversation) return message.conversation;
    if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
    if (message.imageMessage?.caption) return `📷 ${message.imageMessage.caption}`;
    if (message.videoMessage?.caption) return `🎥 ${message.videoMessage.caption}`;
    if (message.audioMessage) return '🎵 Áudio';
    if (message.documentMessage) return `📄 ${message.documentMessage.fileName || 'Documento'}`;
    
    return '';
  }
}

// ============================================================
// FACTORY
// ============================================================

/**
 * Cria instância do EvolutionAdapter
 */
export function createEvolutionAdapter(config: WhatsAppAdapterConfig): EvolutionAdapter {
  return new EvolutionAdapter(config);
}
