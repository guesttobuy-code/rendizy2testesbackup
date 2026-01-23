/**
 * CHAT MULTI-CHANNEL - Tipos Base
 * 
 * Define interfaces para sistema de chat multi-canal
 * Cada provider (WhatsApp, Airbnb, Booking, etc) implementa IChatProvider
 * 
 * @version 1.0.0
 * @date 2026-01-22
 * @see ADR-007
 */

// ============================================================
// CHANNEL TYPES
// ============================================================

/**
 * Canais de comunicação suportados
 */
export type ChatChannel = 
  | 'whatsapp'      // WhatsApp via Evolution API
  | 'airbnb'        // Mensagens Airbnb
  | 'booking'       // Mensagens Booking.com
  | 'email'         // Email (futuro)
  | 'internal';     // Chat interno do sistema

/**
 * Sub-provider para WhatsApp (Evolution, WAHA, Cloud API)
 */
export type WhatsAppSubProvider = 'evolution' | 'waha' | 'cloud_api';

// ============================================================
// CONVERSATION
// ============================================================

/**
 * Conversa unificada - independente do canal
 */
export interface ChatConversation {
  /** ID único da conversa (UUID do banco) */
  id: string;
  
  /** ID externo no provider (JID WhatsApp, thread Airbnb, etc) */
  externalId: string;
  
  /** Canal de origem */
  channel: ChatChannel;
  
  /** Sub-provider (ex: 'evolution' para WhatsApp) */
  subProvider?: string;
  
  /** Nome do contato/hóspede */
  guestName: string;
  
  /** Telefone (se aplicável) */
  guestPhone?: string;
  
  /** Email (se aplicável) */
  guestEmail?: string;
  
  /** URL do avatar */
  avatarUrl?: string;
  
  /** Última mensagem (preview) */
  lastMessage?: string;
  
  /** Timestamp da última mensagem */
  lastMessageAt?: Date;
  
  /** Quantidade de mensagens não lidas */
  unreadCount: number;
  
  /** Reserva associada (se houver) */
  reservationId?: string;
  
  /** Propriedade associada */
  propertyId?: string;
  
  /** Organização dona */
  organizationId: string;
  
  /** Metadados específicos do canal */
  metadata?: Record<string, unknown>;
}

// ============================================================
// MESSAGE
// ============================================================

export type MessageType = 
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'location'
  | 'template'    // WhatsApp Business Templates
  | 'system';     // Mensagem do sistema

export type MessageStatus = 
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export type MessageDirection = 'inbound' | 'outbound';

/**
 * Mensagem unificada - independente do canal
 */
export interface ChatMessage {
  /** ID único da mensagem */
  id: string;
  
  /** ID da conversa */
  conversationId: string;
  
  /** ID externo no provider */
  externalId?: string;
  
  /** Canal de origem */
  channel: ChatChannel;
  
  /** Direção da mensagem */
  direction: MessageDirection;
  
  /** Tipo de conteúdo */
  type: MessageType;
  
  /** Conteúdo da mensagem */
  content: string;
  
  /** URL da mídia (se houver) */
  mediaUrl?: string;
  
  /** Tipo MIME da mídia */
  mediaMimeType?: string;
  
  /** Status de entrega */
  status: MessageStatus;
  
  /** Timestamp de envio */
  sentAt: Date;
  
  /** Timestamp de leitura */
  readAt?: Date;
  
  /** Remetente */
  senderName?: string;
  
  /** Metadados específicos do canal */
  metadata?: Record<string, unknown>;
}

// ============================================================
// PROVIDER INTERFACE
// ============================================================

/**
 * Interface que todo provider de chat deve implementar
 */
export interface IChatProvider {
  /** Identificador do canal */
  readonly channel: ChatChannel;
  
  /** Nome legível do provider */
  readonly displayName: string;
  
  /** Se está habilitado/conectado */
  isEnabled(): Promise<boolean>;
  
  /**
   * Buscar conversas do provider
   * @param organizationId ID da organização
   * @param options Opções de filtro
   */
  getConversations(
    organizationId: string,
    options?: GetConversationsOptions
  ): Promise<ChatConversation[]>;
  
  /**
   * Buscar mensagens de uma conversa
   * @param conversationId ID da conversa (externo ou interno)
   * @param options Opções de paginação
   */
  getMessages(
    conversationId: string,
    options?: GetMessagesOptions
  ): Promise<ChatMessage[]>;
  
  /**
   * Enviar mensagem de texto
   */
  sendTextMessage(
    conversationId: string,
    text: string
  ): Promise<ChatMessage>;
  
  /**
   * Enviar mídia
   */
  sendMedia?(
    conversationId: string,
    mediaUrl: string,
    type: MessageType,
    caption?: string
  ): Promise<ChatMessage>;
  
  /**
   * Marcar conversa como lida
   */
  markAsRead(conversationId: string): Promise<void>;
  
  /**
   * Parsear identificador externo para obter informações
   * Ex: "5521999999999@s.whatsapp.net" → { phone: "5521999999999", type: "user" }
   */
  parseExternalId(externalId: string): ParsedExternalId;
  
  /**
   * Formatar nome de exibição quando não há nome salvo
   * Ex: WhatsApp → formata telefone, Airbnb → "Hóspede Airbnb"
   */
  formatDisplayName(conversation: Partial<ChatConversation>): string;
}

// ============================================================
// OPTIONS
// ============================================================

export interface GetConversationsOptions {
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
  onlyUnread?: boolean;
}

export interface GetMessagesOptions {
  limit?: number;
  before?: Date;
  after?: Date;
}

export interface ParsedExternalId {
  /** Tipo de conversa */
  type: 'user' | 'group' | 'lead' | 'broadcast' | 'unknown';
  
  /** Telefone extraído (se aplicável) */
  phone?: string;
  
  /** Email extraído (se aplicável) */
  email?: string;
  
  /** ID do lead (para Meta Ads) */
  leadId?: string;
  
  /** ID original */
  raw: string;
}

// ============================================================
// EVENTS
// ============================================================

export type ChatEventType = 
  | 'message:received'
  | 'message:sent'
  | 'message:status'
  | 'conversation:updated'
  | 'connection:status';

export interface ChatEvent {
  type: ChatEventType;
  channel: ChatChannel;
  timestamp: Date;
  data: unknown;
}

// ============================================================
// REGISTRY
// ============================================================

/**
 * Interface do registry de providers
 */
export interface IChatProviderRegistry {
  /**
   * Registrar um provider
   */
  register(provider: IChatProvider): void;
  
  /**
   * Obter provider por canal
   */
  get(channel: ChatChannel): IChatProvider | undefined;
  
  /**
   * Obter todos providers habilitados
   */
  getEnabled(): Promise<IChatProvider[]>;
  
  /**
   * Buscar conversas de TODOS os providers
   */
  getAllConversations(
    organizationId: string,
    options?: GetConversationsOptions
  ): Promise<ChatConversation[]>;
}
