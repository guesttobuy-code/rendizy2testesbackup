/**
 * RENDIZY - Chat Service V2
 * 
 * Serviço centralizado que orquestra múltiplos adapters de chat
 * Provê interface unificada para o frontend
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
  ChatStats,
  ChannelConfig,
} from './types';
import { getWhatsAppAdapter } from './adapters';
import { getSupabaseClient } from '../../../utils/supabase/client';

// ============================================
// CHAT SERVICE
// ============================================

export class ChatService {
  private adapters: Map<ChannelType, IChatAdapter> = new Map();
  private organizationId: string;
  private messageCallbacks: Array<(message: ChatMessage, conversation: ChatConversation) => void> = [];
  private realtimeChannel: any = null;
  
  constructor(organizationId: string) {
    this.organizationId = organizationId;
    this.initializeAdapters();
  }
  
  // ============================================
  // INITIALIZATION
  // ============================================
  
  private initializeAdapters(): void {
    // Por padrão, inicializa WhatsApp adapter
    const whatsApp = getWhatsAppAdapter();
    this.adapters.set('whatsapp', whatsApp);
    
    // Configurar callback de novas mensagens
    whatsApp.onNewMessage?.((message, conversation) => {
      this.handleNewMessage(message, conversation);
    });
    
    console.log('[ChatService] ✅ Inicializado com WhatsApp adapter');
  }
  
  /**
   * Registra um adapter adicional
   */
  registerAdapter(adapter: IChatAdapter): void {
    this.adapters.set(adapter.channelType, adapter);
    
    adapter.onNewMessage?.((message, conversation) => {
      this.handleNewMessage(message, conversation);
    });
    
    console.log(`[ChatService] ✅ Adapter registrado: ${adapter.displayName}`);
  }
  
  /**
   * Remove um adapter
   */
  unregisterAdapter(channelType: ChannelType): void {
    this.adapters.delete(channelType);
    console.log(`[ChatService] ❌ Adapter removido: ${channelType}`);
  }
  
  /**
   * Obtém um adapter específico
   */
  getAdapter(channelType: ChannelType): IChatAdapter | undefined {
    return this.adapters.get(channelType);
  }
  
  /**
   * Lista adapters disponíveis
   */
  getAvailableChannels(): ChannelType[] {
    return Array.from(this.adapters.keys());
  }
  
  // ============================================
  // UNIFIED OPERATIONS
  // ============================================
  
  /**
   * Busca todas as conversas de todos os canais
   */
  async getAllConversations(options?: {
    limit?: number;
    status?: ConversationStatus;
    channels?: ChannelType[];
  }): Promise<ChatConversation[]> {
    const channels = options?.channels || Array.from(this.adapters.keys());
    const allConversations: ChatConversation[] = [];
    
    // Buscar de cada adapter em paralelo
    const promises = channels.map(async (channel) => {
      const adapter = this.adapters.get(channel);
      if (!adapter) return [];
      
      try {
        return await adapter.getConversations({
          limit: options?.limit,
          status: options?.status,
        });
      } catch (error) {
        console.error(`[ChatService] Erro ao buscar conversas de ${channel}:`, error);
        return [];
      }
    });
    
    const results = await Promise.all(promises);
    results.forEach(conversations => allConversations.push(...conversations));
    
    // Ordenar por última mensagem
    allConversations.sort((a, b) => {
      const timeA = a.lastMessageAt?.getTime() || 0;
      const timeB = b.lastMessageAt?.getTime() || 0;
      return timeB - timeA;
    });
    
    // Aplicar limit global se fornecido
    if (options?.limit) {
      return allConversations.slice(0, options.limit);
    }
    
    return allConversations;
  }
  
  /**
   * Busca conversas de um canal específico
   */
  async getConversations(channelType: ChannelType, options?: {
    limit?: number;
    offset?: number;
    status?: ConversationStatus;
  }): Promise<ChatConversation[]> {
    const adapter = this.adapters.get(channelType);
    if (!adapter) {
      console.warn(`[ChatService] Adapter não encontrado: ${channelType}`);
      return [];
    }
    
    return adapter.getConversations(options);
  }
  
  /**
   * Busca mensagens de uma conversa
   */
  async getMessages(conversationId: string, channelType: ChannelType, options?: {
    limit?: number;
    before?: Date;
    after?: Date;
  }): Promise<ChatMessage[]> {
    const adapter = this.adapters.get(channelType);
    if (!adapter) {
      console.warn(`[ChatService] Adapter não encontrado: ${channelType}`);
      return [];
    }
    
    return adapter.getMessages(conversationId, options);
  }
  
  /**
   * Envia uma mensagem
   */
  async sendMessage(payload: SendMessagePayload): Promise<SendMessageResult> {
    const adapter = this.adapters.get(payload.channelType);
    if (!adapter) {
      return {
        success: false,
        error: `Canal não disponível: ${payload.channelType}`,
      };
    }
    
    const result = await adapter.sendMessage(payload);
    
    // Se enviou com sucesso, persistir no banco local
    if (result.success && result.message) {
      await this.persistMessage(result.message);
    }
    
    return result;
  }
  
  /**
   * Marca conversa como lida
   */
  async markAsRead(conversationId: string, channelType: ChannelType): Promise<boolean> {
    const adapter = this.adapters.get(channelType);
    if (!adapter) return false;
    
    return adapter.markAsRead(conversationId);
  }
  
  /**
   * Arquiva uma conversa
   */
  async archiveConversation(conversationId: string, channelType: ChannelType): Promise<boolean> {
    const adapter = this.adapters.get(channelType);
    if (!adapter) return false;
    
    return adapter.archiveConversation(conversationId);
  }
  
  // ============================================
  // STATUS
  // ============================================
  
  /**
   * Verifica status de conexão de todos os canais
   */
  async getConnectionStatus(): Promise<Record<ChannelType, {
    connected: boolean;
    status: string;
    details?: Record<string, unknown>;
  }>> {
    const status: Record<string, any> = {};
    
    for (const [channelType, adapter] of this.adapters) {
      try {
        status[channelType] = await adapter.getConnectionStatus();
      } catch (error) {
        status[channelType] = {
          connected: false,
          status: 'ERROR',
          details: { error: String(error) },
        };
      }
    }
    
    return status as any;
  }
  
  /**
   * Obtém estatísticas do chat
   */
  async getStats(): Promise<ChatStats> {
    const stats: ChatStats = {
      totalConversations: 0,
      openConversations: 0,
      unreadMessages: 0,
      byChannel: {} as any,
    };
    
    for (const channelType of this.adapters.keys()) {
      const conversations = await this.getConversations(channelType);
      
      const channelStats = {
        total: conversations.length,
        open: conversations.filter(c => c.status === 'open').length,
        unread: conversations.reduce((sum, c) => sum + c.unreadCount, 0),
      };
      
      stats.byChannel[channelType] = channelStats;
      stats.totalConversations += channelStats.total;
      stats.openConversations += channelStats.open;
      stats.unreadMessages += channelStats.unread;
    }
    
    return stats;
  }
  
  // ============================================
  // REALTIME
  // ============================================
  
  /**
   * Inicia escuta de mensagens em tempo real via Supabase
   */
  startRealtime(): void {
    if (this.realtimeChannel) {
      console.log('[ChatService] Realtime já iniciado');
      return;
    }
    
    const supabase = getSupabaseClient();
    
    this.realtimeChannel = supabase
      .channel(`chat-messages-${this.organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `organization_id=eq.${this.organizationId}`,
        },
        (payload) => {
          console.log('[ChatService] 📩 Nova mensagem via Realtime:', payload);
          this.handleRealtimeMessage(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('[ChatService] Realtime status:', status);
      });
    
    console.log('[ChatService] ✅ Realtime iniciado');
  }
  
  /**
   * Para escuta de mensagens em tempo real
   */
  stopRealtime(): void {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
      this.realtimeChannel = null;
      console.log('[ChatService] ❌ Realtime parado');
    }
  }
  
  /**
   * Registra callback para novas mensagens
   */
  onNewMessage(callback: (message: ChatMessage, conversation: ChatConversation) => void): () => void {
    this.messageCallbacks.push(callback);
    return () => {
      const index = this.messageCallbacks.indexOf(callback);
      if (index > -1) {
        this.messageCallbacks.splice(index, 1);
      }
    };
  }
  
  private handleNewMessage(message: ChatMessage, conversation: ChatConversation): void {
    this.messageCallbacks.forEach(cb => cb(message, conversation));
  }
  
  private handleRealtimeMessage(data: any): void {
    // Converter dados do banco para ChatMessage
    const message: ChatMessage = {
      id: data.id,
      conversationId: data.conversation_id,
      externalId: data.external_id,
      direction: data.direction,
      contentType: data.content_type || 'text',
      content: data.content,
      status: data.status || 'sent',
      sentAt: new Date(data.sent_at),
      deliveredAt: data.delivered_at ? new Date(data.delivered_at) : undefined,
      readAt: data.read_at ? new Date(data.read_at) : undefined,
      senderName: data.sender_name,
      senderIdentifier: data.sender_identifier,
      metadata: data.metadata,
    };
    
    // Buscar conversa (simplificado - em produção buscar do banco)
    const conversation: ChatConversation = {
      id: data.conversation_id,
      organizationId: this.organizationId,
      channelType: data.channel_type || 'whatsapp',
      externalId: data.conversation_id,
      contact: {
        id: data.sender_identifier || '',
        name: data.sender_name || 'Desconhecido',
        identifier: data.sender_identifier || '',
      },
      status: 'open',
      unreadCount: 1,
      lastMessageAt: new Date(data.sent_at),
      lastMessagePreview: message.content,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.handleNewMessage(message, conversation);
  }
  
  // ============================================
  // PERSISTENCE
  // ============================================
  
  /**
   * Persiste uma mensagem no banco local
   */
  private async persistMessage(message: ChatMessage): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      
      await supabase.from('chat_messages').insert({
        id: message.id,
        conversation_id: message.conversationId,
        external_id: message.externalId,
        organization_id: this.organizationId,
        direction: message.direction,
        content_type: message.contentType,
        content: message.content,
        status: message.status,
        sent_at: message.sentAt.toISOString(),
        delivered_at: message.deliveredAt?.toISOString(),
        read_at: message.readAt?.toISOString(),
        sender_name: message.senderName,
        sender_identifier: message.senderIdentifier,
        metadata: message.metadata,
      });
      
      console.log('[ChatService] 💾 Mensagem persistida:', message.id);
    } catch (error) {
      // Não bloquear se falhar persistência
      console.warn('[ChatService] ⚠️ Erro ao persistir mensagem:', error);
    }
  }
  
  // ============================================
  // CLEANUP
  // ============================================
  
  /**
   * Limpa recursos do serviço
   */
  dispose(): void {
    this.stopRealtime();
    this.adapters.clear();
    this.messageCallbacks = [];
    console.log('[ChatService] 🗑️ Recursos liberados');
  }
}

// ============================================
// SINGLETON / FACTORY
// ============================================

let chatServiceInstance: ChatService | null = null;

/**
 * Obtém instância singleton do ChatService
 */
export function getChatService(organizationId: string): ChatService {
  if (!chatServiceInstance || (chatServiceInstance as any).organizationId !== organizationId) {
    if (chatServiceInstance) {
      chatServiceInstance.dispose();
    }
    chatServiceInstance = new ChatService(organizationId);
  }
  return chatServiceInstance;
}

/**
 * Destroi a instância atual do ChatService
 */
export function disposeChatService(): void {
  if (chatServiceInstance) {
    chatServiceInstance.dispose();
    chatServiceInstance = null;
  }
}
