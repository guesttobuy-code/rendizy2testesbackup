/**
 * RENDIZY - Chat V2 Types
 * 
 * Tipos centralizados para o sistema de chat multi-canal
 * 
 * @version 2.0.0
 * @date 2026-01-22
 */

// ============================================
// ENUMS
// ============================================

export type ChannelType = 'whatsapp' | 'airbnb' | 'booking' | 'sms' | 'email';

export type ConversationStatus = 'open' | 'closed' | 'archived' | 'spam';

export type MessageDirection = 'inbound' | 'outbound';

export type MessageContentType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contact' | 'sticker';

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

// ============================================
// CORE INTERFACES
// ============================================

/**
 * Representa um contato/participante de uma conversa
 */
export interface ChatContact {
  id: string;
  name: string;
  identifier: string;        // telefone, email, userId de plataforma
  avatar?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Representa uma conversa unificada (independente do canal)
 */
export interface ChatConversation {
  id: string;
  organizationId: string;
  channelType: ChannelType;
  externalId: string;        // ID no sistema externo (JID do WhatsApp, threadId do Airbnb, etc)
  
  // Participante
  contact: ChatContact;
  
  // Contexto
  reservationId?: string;    // Link com reserva (se houver)
  propertyId?: string;       // Link com imóvel (se houver)
  
  // Estado
  status: ConversationStatus;
  unreadCount: number;
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  
  // Metadados
  tags?: string[];
  assignedTo?: string;       // userId do atendente
  metadata?: Record<string, unknown>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Representa uma mensagem unificada (independente do canal)
 */
export interface ChatMessage {
  id: string;
  conversationId: string;
  externalId?: string;       // ID no sistema externo
  
  // Direção e conteúdo
  direction: MessageDirection;
  contentType: MessageContentType;
  content: string;           // Texto ou URL do arquivo
  
  // Mídia (para imagens, áudios, etc)
  media?: {
    url: string;
    mimeType: string;
    fileName?: string;
    fileSize?: number;
    thumbnailUrl?: string;
  };
  
  // Status de entrega
  status: MessageStatus;
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  
  // Remetente
  senderName?: string;
  senderIdentifier?: string;
  
  // Metadados
  metadata?: Record<string, unknown>;
}

/**
 * Payload para criar uma nova mensagem
 */
export interface SendMessagePayload {
  conversationId?: string;   // Se já existe conversa
  recipientIdentifier: string; // telefone, email, etc
  channelType: ChannelType;
  
  contentType: MessageContentType;
  content: string;
  
  // Para mídia
  mediaUrl?: string;
  mediaMimeType?: string;
  
  // Contexto opcional
  reservationId?: string;
  propertyId?: string;
  
  metadata?: Record<string, unknown>;
}

/**
 * Resultado de uma operação de envio
 */
export interface SendMessageResult {
  success: boolean;
  message?: ChatMessage;
  conversation?: ChatConversation;
  error?: string;
}

// ============================================
// ADAPTER INTERFACE
// ============================================

/**
 * Interface que todo adapter de canal deve implementar
 * Abstrai as operações de chat para diferentes plataformas
 */
export interface IChatAdapter {
  // Identificação
  readonly channelType: ChannelType;
  readonly displayName: string;
  
  // Status de conexão
  isConnected(): boolean;
  getConnectionStatus(): Promise<{
    connected: boolean;
    status: string;
    details?: Record<string, unknown>;
  }>;
  
  // Operações de leitura
  getConversations(options?: {
    limit?: number;
    offset?: number;
    status?: ConversationStatus;
  }): Promise<ChatConversation[]>;
  
  getMessages(conversationId: string, options?: {
    limit?: number;
    before?: Date;
    after?: Date;
  }): Promise<ChatMessage[]>;
  
  // Operações de escrita
  sendMessage(payload: SendMessagePayload): Promise<SendMessageResult>;
  
  markAsRead(conversationId: string): Promise<boolean>;
  
  // Operações de estado
  archiveConversation(conversationId: string): Promise<boolean>;
  
  // Eventos (para realtime)
  onNewMessage?(callback: (message: ChatMessage, conversation: ChatConversation) => void): () => void;
  onStatusChange?(callback: (connected: boolean) => void): () => void;
}

// ============================================
// SERVICE TYPES
// ============================================

/**
 * Configuração de um canal
 */
export interface ChannelConfig {
  channelType: ChannelType;
  enabled: boolean;
  config: Record<string, unknown>;
}

/**
 * Estatísticas do chat
 */
export interface ChatStats {
  totalConversations: number;
  openConversations: number;
  unreadMessages: number;
  byChannel: Record<ChannelType, {
    total: number;
    open: number;
    unread: number;
  }>;
}
