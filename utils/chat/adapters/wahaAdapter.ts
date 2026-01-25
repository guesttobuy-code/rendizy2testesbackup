/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                         WAHA ADAPTER                                       ║
 * ║                                                                            ║
 * ║  Adapter para comunicação com WAHA (WhatsApp HTTP API)                    ║
 * ║  JID Format: 5521999887766@c.us                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * @version 1.0.0
 * @date 2026-01-24
 * @see ADR-010-CHAT-MULTI-PROVIDER-ARCHITECTURE.md
 * 
 * ENDPOINTS UTILIZADOS:
 * - GET  /api/{session}/chats                    → Lista conversas
 * - GET  /api/{session}/chats/{chatId}/messages  → Lista mensagens
 * - POST /api/sendText                           → Envia texto
 * - POST /api/sendImage                          → Envia imagem
 * - POST /api/sendFile                           → Envia documento
 * - POST /api/sendVoice                          → Envia áudio
 * 
 * ⚠️ LIMITAÇÕES WAHA CORE (versão gratuita):
 * - Mídia: Retorna apenas thumbnails Base64 (~700-800 bytes)
 * - URLs de mídia requerem API Key no header
 * - Browsers não conseguem enviar headers em <img src>
 * - SOLUÇÃO: Usar Base64 thumbnail quando disponível
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
const DEFAULT_SESSION = 'default';

// ============================================================
// WAHA ADAPTER
// ============================================================

export class WahaAdapter implements IWhatsAppAdapter {
  readonly provider = 'waha' as const;
  readonly displayName = 'WAHA';
  
  private config: WhatsAppAdapterConfig;
  private sessionName: string;
  
  constructor(config: WhatsAppAdapterConfig) {
    this.config = config;
    // WAHA usa "session" em vez de "instance"
    this.sessionName = config.instanceName || DEFAULT_SESSION;
    console.log(`[WahaAdapter] ✅ Initialized for session: ${this.sessionName}`);
  }
  
  // ============================================================
  // JID HANDLING
  // ============================================================
  
  /**
   * Normaliza para formato WAHA: numero@c.us
   */
  normalizeJid(input: string): string {
    if (!input) return '';
    
    // Se já está no formato correto
    if (input.endsWith('@c.us')) {
      return input;
    }
    
    // Se está no formato Evolution (@s.whatsapp.net), converter
    if (input.endsWith('@s.whatsapp.net')) {
      return input.replace('@s.whatsapp.net', '@c.us');
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
      return `${cleanNumber}@c.us`;
    }
    
    console.warn(`[WahaAdapter] ⚠️ Could not normalize JID: ${input}`);
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
      'X-Api-Key': this.config.apiKey,
    };
  }
  
  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.config.apiUrl}${endpoint}`;
    
    console.log(`[WahaAdapter] 📡 ${options?.method || 'GET'} ${endpoint}`);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[WahaAdapter] ❌ API Error ${response.status}:`, errorText);
      throw new Error(`WAHA API error: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  }
  
  // ============================================================
  // INTERFACE IMPLEMENTATION
  // ============================================================
  
  async isConnected(): Promise<boolean> {
    try {
      const status = await this.fetch<any>(`/api/sessions/${this.sessionName}`);
      return status?.status === 'WORKING' || status?.status === 'CONNECTED';
    } catch (error) {
      console.error('[WahaAdapter] ❌ Connection check failed:', error);
      return false;
    }
  }
  
  async fetchChats(limit = 50): Promise<NormalizedWhatsAppChat[]> {
    try {
      const chats = await this.fetch<any[]>(
        `/api/${this.sessionName}/chats`
      );
      
      console.log(`[WahaAdapter] ✅ Fetched ${chats?.length || 0} chats`);
      
      return (chats || []).slice(0, limit).map(chat => this.normalizeChat(chat));
    } catch (error) {
      console.error('[WahaAdapter] ❌ fetchChats failed:', error);
      return [];
    }
  }
  
  async fetchMessages(
    chatId: string,
    limit = DEFAULT_MESSAGE_LIMIT
  ): Promise<NormalizedWhatsAppMessage[]> {
    try {
      const normalizedJid = this.normalizeJid(chatId);
      
      console.log(`[WahaAdapter] 📥 Fetching messages for: ${normalizedJid}`);
      
      // WAHA usa GET com chatId na URL
      const messages = await this.fetch<any[]>(
        `/api/${this.sessionName}/chats/${encodeURIComponent(normalizedJid)}/messages?limit=${limit}&downloadMedia=true`
      );
      
      console.log(`[WahaAdapter] ✅ Fetched ${messages?.length || 0} messages`);
      
      return (messages || []).map(msg => this.normalizeMessage(msg, normalizedJid));
    } catch (error) {
      console.error('[WahaAdapter] ❌ fetchMessages failed:', error);
      return [];
    }
  }
  
  async sendText(chatId: string, text: string): Promise<SendMessageResult> {
    try {
      const normalizedJid = this.normalizeJid(chatId);
      
      console.log(`[WahaAdapter] 📤 Sending text to: ${normalizedJid}`);
      
      const response = await this.fetch<any>('/api/sendText', {
        method: 'POST',
        body: JSON.stringify({
          session: this.sessionName,
          chatId: normalizedJid,
          text,
        }),
      });
      
      console.log('[WahaAdapter] ✅ Message sent:', response?.id);
      
      return {
        success: true,
        messageId: response?.id,
        raw: response,
      };
    } catch (error) {
      console.error('[WahaAdapter] ❌ sendText failed:', error);
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
      
      // Mapear tipo para endpoint WAHA
      const endpointMap = {
        image: '/api/sendImage',
        video: '/api/sendVideo',
        audio: '/api/sendVoice',
        document: '/api/sendFile',
      };
      
      const endpoint = endpointMap[mediaType] || '/api/sendFile';
      
      const response = await this.fetch<any>(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          session: this.sessionName,
          chatId: normalizedJid,
          file: { url: mediaUrl },
          caption: caption || '',
        }),
      });
      
      return {
        success: true,
        messageId: response?.id,
        raw: response,
      };
    } catch (error) {
      console.error('[WahaAdapter] ❌ sendMedia failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  async markAsRead(chatId: string, _messageIds?: string[]): Promise<void> {
    try {
      const normalizedJid = this.normalizeJid(chatId);
      
      // WAHA usa endpoint diferente para marcar como lido
      await this.fetch('/api/sendSeen', {
        method: 'POST',
        body: JSON.stringify({
          session: this.sessionName,
          chatId: normalizedJid,
        }),
      });
      
      console.log('[WahaAdapter] ✅ Marked as read:', normalizedJid);
    } catch (error) {
      console.error('[WahaAdapter] ⚠️ markAsRead failed:', error);
      // Não lançar erro, apenas logar
    }
  }
  
  // ============================================================
  // NORMALIZERS
  // ============================================================
  
  private normalizeChat(raw: any): NormalizedWhatsAppChat {
    // WAHA pode retornar id como número ou objeto, garantir que seja string
    const id = String(raw.id?._serialized || raw.id || '');
    const isGroup = id.endsWith('@g.us');
    
    return {
      id,
      name: raw.name || raw.pushName || this.extractPhone(id),
      profilePicUrl: raw.picture,
      lastMessage: raw.lastMessage ? {
        text: raw.lastMessage.body || raw.lastMessage.text || '',
        timestamp: raw.lastMessage.timestamp || raw.timestamp || Math.floor(Date.now() / 1000),
        fromMe: raw.lastMessage.fromMe || false,
      } : undefined,
      unreadCount: raw.unreadCount || 0,
      isGroup,
      updatedAt: raw.timestamp,
    };
  }
  
  private normalizeMessage(raw: any, chatId: string): NormalizedWhatsAppMessage {
    // Extrair texto
    let text = raw.body || raw.text || '';
    
    // Determinar tipo de mídia e URL
    let mediaType: NormalizedWhatsAppMessage['mediaType'] = 'text';
    let mediaUrl: string | undefined;
    let mediaBase64: string | undefined;
    let mediaMimetype: string | undefined;
    
    // WAHA retorna mídia em _data.body como Base64
    const dataBody = raw._data?.body;
    const dataType = raw._data?.type || raw.type;
    const mimetype = raw.media?.mimetype || raw._data?.mimetype || '';
    
    if (raw.hasMedia && dataBody && typeof dataBody === 'string' && dataBody.length > 50) {
      // Usar Base64 do WAHA (única forma confiável sem proxy)
      let mimeForDataUrl = mimetype;
      if (!mimeForDataUrl) {
        if (dataType === 'image') mimeForDataUrl = 'image/jpeg';
        else if (dataType === 'video') mimeForDataUrl = 'video/mp4';
        else if (dataType === 'audio' || dataType === 'ptt') mimeForDataUrl = 'audio/ogg';
        else mimeForDataUrl = 'application/octet-stream';
      }
      
      mediaBase64 = `data:${mimeForDataUrl};base64,${dataBody}`;
      mediaMimetype = mimeForDataUrl;
      
      // Determinar tipo
      if (mimeForDataUrl.startsWith('image/')) mediaType = 'image';
      else if (mimeForDataUrl.startsWith('video/')) mediaType = 'video';
      else if (mimeForDataUrl.startsWith('audio/')) mediaType = 'audio';
      else mediaType = 'document';
      
      console.log(`[WahaAdapter] 📎 Media Base64: ${raw.id?.substring(0, 20)}... ${mimeForDataUrl}`);
    } else if (raw.hasMedia) {
      // Fallback: usar URL direta (pode não funcionar no browser)
      mediaUrl = raw.media?.url;
      mediaMimetype = mimetype;
      
      if (mimetype.startsWith('image/') || dataType === 'image') mediaType = 'image';
      else if (mimetype.startsWith('video/') || dataType === 'video') mediaType = 'video';
      else if (mimetype.startsWith('audio/') || dataType === 'audio' || dataType === 'ptt') mediaType = 'audio';
      else mediaType = 'document';
    }
    
    // Mapear status WAHA
    const statusMap: Record<number, NormalizedWhatsAppMessage['status']> = {
      0: 'pending',
      1: 'sent',
      2: 'delivered',
      3: 'read',
      4: 'read', // played
    };
    
    return {
      id: raw.id || crypto.randomUUID(),
      remoteJid: raw.from || chatId,
      fromMe: raw.fromMe || false,
      text,
      timestamp: raw.timestamp || Math.floor(Date.now() / 1000),
      status: statusMap[raw.ack] || 'sent',
      mediaType,
      mediaUrl,
      mediaBase64,
      mediaMimetype,
      pushName: raw._data?.notifyName || raw.notifyName,
      raw,
    };
  }
}

// ============================================================
// FACTORY
// ============================================================

/**
 * Cria instância do WahaAdapter
 */
export function createWahaAdapter(config: WhatsAppAdapterConfig): WahaAdapter {
  return new WahaAdapter(config);
}
