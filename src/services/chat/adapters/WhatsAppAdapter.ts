/**
 * RENDIZY - WhatsApp Chat Adapter
 * 
 * Implementação do IChatAdapter para WhatsApp via Evolution API
 * 
 * @version 2.0.0
 * @date 2026-01-22
 */

import {
  IChatAdapter,
  ChannelType,
  ChatConversation,
  ChatMessage,
  SendMessagePayload,
  SendMessageResult,
  ConversationStatus,
  MessageDirection,
  MessageContentType,
  MessageStatus,
  ChatContact,
} from './types';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/rendizy-server`;

// ============================================
// HELPERS
// ============================================

/**
 * Obtém headers para requisições autenticadas
 */
function getApiHeaders(): HeadersInit {
  const token = localStorage.getItem('rendizy-token');
  const orgId = getCachedOrganizationId();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`,
  };
  
  if (token) {
    headers['X-Auth-Token'] = token;
  }
  
  if (orgId) {
    headers['x-organization-id'] = orgId;
  }
  
  return headers;
}

/**
 * Obtém organizationId do cache local
 */
function getCachedOrganizationId(): string | null {
  try {
    const userJson = localStorage.getItem('rendizy-user');
    if (userJson) {
      const user = JSON.parse(userJson);
      return user.organizationId || null;
    }
  } catch {
    // Ignorar erro
  }
  return null;
}

/**
 * Formata número de telefone para exibição
 */
function formatPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length < 10) return '';
  
  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    const ddd = cleaned.substring(2, 4);
    const rest = cleaned.substring(4);
    if (rest.length === 9) {
      return `+55 ${ddd} ${rest.substring(0, 5)}-${rest.substring(5)}`;
    } else if (rest.length === 8) {
      return `+55 ${ddd} ${rest.substring(0, 4)}-${rest.substring(4)}`;
    }
  }
  
  return `+${cleaned}`;
}

/**
 * Extrai número de telefone do JID do WhatsApp
 */
function extractPhoneFromJid(jid: string): string {
  if (!jid) return '';
  
  if (jid.includes('@g.us') || jid.includes('@lid') || jid.includes('status@')) {
    return '';
  }
  
  return jid
    .replace('whatsapp-', '')
    .replace('@s.whatsapp.net', '')
    .replace('@c.us', '')
    .replace(/\D/g, '');
}

/**
 * Gera iniciais do nome
 */
function getInitials(name: string): string {
  if (!name || name === 'Desconhecido') return '??';
  if (name.startsWith('+')) return name.substring(1, 3);
  
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/**
 * Extrai texto de mensagem WhatsApp
 */
function extractMessageText(message: any): string {
  if (!message) return '';
  
  // Texto simples
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  
  // Mídia com caption
  if (message.imageMessage?.caption) return `📷 ${message.imageMessage.caption}`;
  if (message.videoMessage?.caption) return `🎥 ${message.videoMessage.caption}`;
  if (message.documentMessage?.caption) return `📄 ${message.documentMessage.caption}`;
  
  // Mídia sem caption
  if (message.imageMessage) return '📷 Imagem';
  if (message.videoMessage) return '🎥 Vídeo';
  if (message.audioMessage) return '🎵 Áudio';
  if (message.documentMessage) return `📄 ${message.documentMessage.fileName || 'Documento'}`;
  if (message.stickerMessage) return '🎨 Sticker';
  if (message.locationMessage) return '📍 Localização';
  if (message.contactMessage) return '👤 Contato';
  
  return '';
}

/**
 * Detecta tipo de conteúdo da mensagem
 */
function detectContentType(message: any): MessageContentType {
  if (!message) return 'text';
  
  if (message.imageMessage) return 'image';
  if (message.videoMessage) return 'video';
  if (message.audioMessage) return 'audio';
  if (message.documentMessage) return 'document';
  if (message.stickerMessage) return 'sticker';
  if (message.locationMessage) return 'location';
  if (message.contactMessage) return 'contact';
  
  return 'text';
}

// ============================================
// WHATSAPP ADAPTER
// ============================================

export class WhatsAppAdapter implements IChatAdapter {
  readonly channelType: ChannelType = 'whatsapp';
  readonly displayName = 'WhatsApp';
  
  private connected: boolean = false;
  private messageCallbacks: Array<(message: ChatMessage, conversation: ChatConversation) => void> = [];
  private statusCallbacks: Array<(connected: boolean) => void> = [];
  
  constructor() {
    // Inicializar verificando status
    this.checkConnection();
  }
  
  // ============================================
  // STATUS
  // ============================================
  
  isConnected(): boolean {
    return this.connected;
  }
  
  async getConnectionStatus(): Promise<{
    connected: boolean;
    status: string;
    details?: Record<string, unknown>;
  }> {
    try {
      const response = await fetch(`${BASE_URL}/whatsapp/status`, {
        method: 'GET',
        headers: getApiHeaders(),
      });
      
      if (!response.ok) {
        this.setConnected(false);
        return {
          connected: false,
          status: 'ERROR',
          details: { error: await response.text() }
        };
      }
      
      const result = await response.json();
      const isConnected = result.data?.status === 'CONNECTED';
      this.setConnected(isConnected);
      
      return {
        connected: isConnected,
        status: result.data?.status || 'UNKNOWN',
        details: result.data
      };
    } catch (error) {
      this.setConnected(false);
      return {
        connected: false,
        status: 'ERROR',
        details: { error: String(error) }
      };
    }
  }
  
  private async checkConnection(): Promise<void> {
    await this.getConnectionStatus();
  }
  
  private setConnected(value: boolean): void {
    if (this.connected !== value) {
      this.connected = value;
      this.statusCallbacks.forEach(cb => cb(value));
    }
  }
  
  // ============================================
  // CONVERSATIONS
  // ============================================
  
  async getConversations(options?: {
    limit?: number;
    offset?: number;
    status?: ConversationStatus;
  }): Promise<ChatConversation[]> {
    try {
      console.log('[WhatsAppAdapter] 📥 Buscando conversas...');
      
      const response = await fetch(`${BASE_URL}/whatsapp/chats`, {
        method: 'GET',
        headers: getApiHeaders(),
      });
      
      if (!response.ok) {
        console.error('[WhatsAppAdapter] ❌ Erro ao buscar conversas:', response.status);
        return [];
      }
      
      const result = await response.json();
      const chats = result.data || [];
      
      console.log('[WhatsAppAdapter] ✅ Conversas recebidas:', chats.length);
      
      // Filtrar grupos e broadcasts
      const individualChats = chats.filter((chat: any) => {
        const jid = chat.remoteJid || chat.id || '';
        return !jid.includes('@g.us') && !jid.includes('@lid') && !jid.includes('status@');
      });
      
      // Converter para formato unificado
      const conversations: ChatConversation[] = individualChats.map((chat: any) => {
        const jid = chat.remoteJid || chat.id || '';
        const phone = extractPhoneFromJid(jid);
        const formattedPhone = formatPhone(phone);
        
        let displayName = chat.pushName || chat.name;
        if (!displayName || displayName === 'Desconhecido' || displayName === 'undefined') {
          displayName = formattedPhone || 'Contato sem número';
        }
        
        let lastMessageAt: Date | undefined;
        if (chat.updatedAt) {
          lastMessageAt = new Date(chat.updatedAt);
        } else if (chat.lastMessageTimestamp) {
          lastMessageAt = new Date(chat.lastMessageTimestamp * 1000);
        }
        
        const contact: ChatContact = {
          id: jid,
          name: displayName,
          identifier: phone,
          avatar: chat.profilePictureUrl || chat.profilePicUrl,
        };
        
        const conversation: ChatConversation = {
          id: jid,
          organizationId: getCachedOrganizationId() || '',
          channelType: 'whatsapp',
          externalId: jid,
          contact,
          status: 'open',
          unreadCount: chat.unreadCount || 0,
          lastMessageAt,
          lastMessagePreview: chat.lastMessage?.message 
            ? extractMessageText({ conversation: chat.lastMessage.message })
            : undefined,
          createdAt: lastMessageAt || new Date(),
          updatedAt: lastMessageAt || new Date(),
        };
        
        return conversation;
      });
      
      // Ordenar por última mensagem
      conversations.sort((a, b) => {
        const timeA = a.lastMessageAt?.getTime() || 0;
        const timeB = b.lastMessageAt?.getTime() || 0;
        return timeB - timeA;
      });
      
      // Aplicar limit se fornecido
      if (options?.limit) {
        return conversations.slice(options.offset || 0, (options.offset || 0) + options.limit);
      }
      
      return conversations;
    } catch (error) {
      console.error('[WhatsAppAdapter] ❌ Erro:', error);
      return [];
    }
  }
  
  // ============================================
  // MESSAGES
  // ============================================
  
  async getMessages(conversationId: string, options?: {
    limit?: number;
    before?: Date;
    after?: Date;
  }): Promise<ChatMessage[]> {
    try {
      console.log('[WhatsAppAdapter] 📥 Buscando mensagens:', conversationId);
      
      const limit = options?.limit || 50;
      const response = await fetch(
        `${BASE_URL}/whatsapp/messages/${encodeURIComponent(conversationId)}?limit=${limit}`,
        {
          method: 'GET',
          headers: getApiHeaders(),
        }
      );
      
      if (!response.ok) {
        console.error('[WhatsAppAdapter] ❌ Erro ao buscar mensagens:', response.status);
        return [];
      }
      
      const result = await response.json();
      const rawMessages = result.data || [];
      
      console.log('[WhatsAppAdapter] ✅ Mensagens recebidas:', rawMessages.length);
      
      // Converter para formato unificado
      const messages: ChatMessage[] = rawMessages.map((msg: any) => {
        const key = msg.key || {};
        const messageContent = msg.message || {};
        
        const message: ChatMessage = {
          id: key.id || msg.id || `msg-${Date.now()}-${Math.random()}`,
          conversationId,
          externalId: key.id,
          direction: key.fromMe ? 'outbound' : 'inbound',
          contentType: detectContentType(messageContent),
          content: extractMessageText(messageContent),
          status: this.mapMessageStatus(msg.status),
          sentAt: new Date(msg.messageTimestamp * 1000),
          senderName: msg.pushName,
          senderIdentifier: key.remoteJid,
        };
        
        // Adicionar mídia se houver
        const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'];
        for (const type of mediaTypes) {
          if (messageContent[type]) {
            const media = messageContent[type];
            message.media = {
              url: media.url || '',
              mimeType: media.mimetype || '',
              fileName: media.fileName,
              fileSize: media.fileLength,
              thumbnailUrl: media.jpegThumbnail ? `data:image/jpeg;base64,${media.jpegThumbnail}` : undefined,
            };
            break;
          }
        }
        
        return message;
      });
      
      // Ordenar por timestamp (mais antigas primeiro)
      messages.sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
      
      return messages;
    } catch (error) {
      console.error('[WhatsAppAdapter] ❌ Erro:', error);
      return [];
    }
  }
  
  private mapMessageStatus(status?: string): MessageStatus {
    switch (status?.toUpperCase()) {
      case 'PENDING':
      case 'SERVER_ACK':
        return 'sent';
      case 'DELIVERY_ACK':
        return 'delivered';
      case 'READ':
      case 'PLAYED':
        return 'read';
      case 'ERROR':
      case 'FAILED':
        return 'failed';
      default:
        return 'sent';
    }
  }
  
  // ============================================
  // SEND MESSAGE
  // ============================================
  
  async sendMessage(payload: SendMessagePayload): Promise<SendMessageResult> {
    try {
      console.log('[WhatsAppAdapter] 📤 Enviando mensagem para:', payload.recipientIdentifier);
      
      // Formatar número para WhatsApp
      let number = payload.recipientIdentifier.replace(/\D/g, '');
      if (!number.startsWith('55') && number.length <= 11) {
        number = '55' + number;
      }
      
      const requestBody: any = {
        number,
        text: payload.content,
      };
      
      // Adicionar mídia se houver
      if (payload.mediaUrl) {
        requestBody.mediaUrl = payload.mediaUrl;
        requestBody.mediaType = payload.contentType;
      }
      
      const response = await fetch(`${BASE_URL}/whatsapp/send-message`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error('[WhatsAppAdapter] ❌ Erro ao enviar:', error);
        return {
          success: false,
          error: `Erro ao enviar mensagem: ${error}`,
        };
      }
      
      const result = await response.json();
      console.log('[WhatsAppAdapter] ✅ Mensagem enviada');
      
      // Construir mensagem de retorno
      const sentMessage: ChatMessage = {
        id: result.data?.key?.id || `sent-${Date.now()}`,
        conversationId: payload.conversationId || `${number}@s.whatsapp.net`,
        externalId: result.data?.key?.id,
        direction: 'outbound',
        contentType: payload.contentType,
        content: payload.content,
        status: 'sent',
        sentAt: new Date(),
      };
      
      return {
        success: true,
        message: sentMessage,
      };
    } catch (error) {
      console.error('[WhatsAppAdapter] ❌ Erro:', error);
      return {
        success: false,
        error: String(error),
      };
    }
  }
  
  // ============================================
  // OTHER OPERATIONS
  // ============================================
  
  async markAsRead(conversationId: string): Promise<boolean> {
    // WhatsApp marca como lido automaticamente quando mensagens são buscadas
    // Implementação futura: chamar endpoint específico se Evolution API suportar
    console.log('[WhatsAppAdapter] markAsRead:', conversationId);
    return true;
  }
  
  async archiveConversation(conversationId: string): Promise<boolean> {
    // Implementação futura: integrar com Evolution API se suportar
    console.log('[WhatsAppAdapter] archiveConversation:', conversationId);
    return true;
  }
  
  // ============================================
  // EVENT HANDLERS
  // ============================================
  
  onNewMessage(callback: (message: ChatMessage, conversation: ChatConversation) => void): () => void {
    this.messageCallbacks.push(callback);
    return () => {
      const index = this.messageCallbacks.indexOf(callback);
      if (index > -1) {
        this.messageCallbacks.splice(index, 1);
      }
    };
  }
  
  onStatusChange(callback: (connected: boolean) => void): () => void {
    this.statusCallbacks.push(callback);
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }
  
  // Método para emitir eventos (usado internamente ou por webhooks)
  emitNewMessage(message: ChatMessage, conversation: ChatConversation): void {
    this.messageCallbacks.forEach(cb => cb(message, conversation));
  }
}

// Singleton instance
let whatsAppAdapterInstance: WhatsAppAdapter | null = null;

export function getWhatsAppAdapter(): WhatsAppAdapter {
  if (!whatsAppAdapterInstance) {
    whatsAppAdapterInstance = new WhatsAppAdapter();
  }
  return whatsAppAdapterInstance;
}
