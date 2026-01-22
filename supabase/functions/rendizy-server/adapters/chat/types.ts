/**
 * ============================================================================
 * RENDIZY - Chat Adapters - Unified Types
 * ============================================================================
 * 
 * Tipos unificados para todos os canais de comunicação.
 * Cada adapter deve converter seus dados para esses tipos.
 * 
 * @version v2.0.0
 * @date 2026-01-22
 * 
 * Canais suportados:
 * - WhatsApp (Evolution API, WAHA)
 * - Airbnb
 * - Booking.com
 * - SMS (Twilio, Vonage)
 * - Email (SMTP/IMAP)
 * - Site (Chat interno)
 * ============================================================================
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Canais de comunicação suportados
 */
export type ChannelType = 
  | 'whatsapp' 
  | 'airbnb' 
  | 'booking' 
  | 'sms' 
  | 'email' 
  | 'site' 
  | 'system';

/**
 * Providers de WhatsApp suportados
 */
export type WhatsAppProvider = 
  | 'evolution'  // Evolution API v2
  | 'waha'       // WAHA (WhatsApp HTTP API)
  | 'zapi'       // Z-API (futuro)
  | 'twilio';    // Twilio WhatsApp (futuro)

/**
 * Providers de SMS suportados
 */
export type SmsProvider = 
  | 'twilio' 
  | 'vonage' 
  | 'aws_sns';

/**
 * Tipo de contato
 */
export type ContactType = 
  | 'user'       // Contato individual
  | 'group'      // Grupo
  | 'broadcast'  // Lista de transmissão
  | 'channel'    // Canal (WhatsApp Channels)
  | 'lid'        // Link ID (WhatsApp interno)
  | 'unknown';

/**
 * Direção da mensagem
 */
export type MessageDirection = 'incoming' | 'outgoing';

/**
 * Tipo de mídia
 */
export type MediaType = 
  | 'text' 
  | 'image' 
  | 'video' 
  | 'audio' 
  | 'voice' 
  | 'document' 
  | 'sticker' 
  | 'location' 
  | 'contact' 
  | 'poll';

/**
 * Status de entrega da mensagem
 */
export type DeliveryStatus = 
  | 'pending'    // Aguardando envio
  | 'sent'       // Enviada
  | 'delivered'  // Entregue
  | 'read'       // Lida
  | 'failed'     // Falhou
  | 'deleted';   // Deletada

// ============================================================================
// INTERFACES - CONTATO
// ============================================================================

/**
 * Contato unificado
 * Representa um contato de qualquer canal
 */
export interface UnifiedContact {
  /** ID único no Rendizy */
  id: string;
  
  /** ID da instância/conexão do canal */
  instanceId: string;
  
  /** ID da organização */
  organizationId: string;
  
  /** Canal de origem */
  channel: ChannelType;
  
  /** Identificador externo (JID, email, phone, etc) */
  externalId: string;
  
  /** Tipo de contato */
  contactType: ContactType;
  
  /** Número de telefone (se aplicável) */
  phoneNumber?: string;
  
  /** Email (se aplicável) */
  email?: string;
  
  /** Nome exibido (pushName, displayName, etc) */
  displayName: string;
  
  /** Nome salvo pelo usuário */
  savedName?: string;
  
  /** URL da foto de perfil */
  profilePictureUrl?: string;
  
  /** É conta business? */
  isBusiness?: boolean;
  
  /** Está bloqueado? */
  isBlocked?: boolean;
  
  /** Metadados específicos do canal */
  metadata?: Record<string, unknown>;
  
  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt?: Date;
}

// ============================================================================
// INTERFACES - MENSAGEM
// ============================================================================

/**
 * Anexo de mensagem
 */
export interface MessageAttachment {
  /** Tipo de mídia */
  type: MediaType;
  
  /** URL do arquivo */
  url?: string;
  
  /** Conteúdo base64 */
  data?: string;
  
  /** MIME type */
  mimeType?: string;
  
  /** Nome do arquivo */
  filename?: string;
  
  /** Tamanho em bytes */
  size?: number;
  
  /** Duração (para áudio/vídeo) */
  duration?: number;
  
  /** Thumbnail base64 */
  thumbnail?: string;
}

/**
 * Mensagem unificada
 * Representa uma mensagem de qualquer canal
 */
export interface UnifiedMessage {
  /** ID único no Rendizy */
  id: string;
  
  /** ID da conversa */
  conversationId: string;
  
  /** ID da organização */
  organizationId: string;
  
  /** Canal de origem */
  channel: ChannelType;
  
  /** ID externo da mensagem */
  externalId: string;
  
  /** Direção */
  direction: MessageDirection;
  
  /** ID do remetente (para mensagens incoming) */
  senderId?: string;
  
  /** Nome do remetente */
  senderName?: string;
  
  /** Conteúdo de texto */
  content: string;
  
  /** Tipo de mídia principal */
  mediaType: MediaType;
  
  /** Anexos */
  attachments?: MessageAttachment[];
  
  /** É resposta a outra mensagem? */
  replyTo?: string;
  
  /** Status de entrega */
  status: DeliveryStatus;
  
  /** Erro (se falhou) */
  error?: string;
  
  /** É mensagem interna (nota)? */
  isInternal?: boolean;
  
  /** Metadados específicos do canal */
  metadata?: Record<string, unknown>;
  
  /** Timestamps */
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  createdAt: Date;
}

// ============================================================================
// INTERFACES - CONVERSA
// ============================================================================

/**
 * Conversa unificada
 */
export interface UnifiedConversation {
  /** ID único no Rendizy */
  id: string;
  
  /** ID da organização */
  organizationId: string;
  
  /** ID da instância do canal */
  instanceId: string;
  
  /** Canal */
  channel: ChannelType;
  
  /** ID do contato */
  contactId: string;
  
  /** Contato (populated) */
  contact?: UnifiedContact;
  
  /** ID externo da conversa */
  externalId: string;
  
  /** Tipo de contato */
  contactType: ContactType;
  
  /** Status da conversa */
  status: 'active' | 'archived' | 'resolved';
  
  /** Categoria */
  category: 'pinned' | 'urgent' | 'normal' | 'resolved';
  
  /** Última mensagem (resumo) */
  lastMessage?: string;
  
  /** Timestamp da última mensagem */
  lastMessageAt?: Date;
  
  /** Contagem de não lidas */
  unreadCount: number;
  
  /** Está fixada? */
  isPinned?: boolean;
  
  /** Tags */
  tags?: string[];
  
  /** Reserva associada (se houver) */
  reservationId?: string;
  reservationCode?: string;
  propertyId?: string;
  propertyName?: string;
  
  /** Metadados */
  metadata?: Record<string, unknown>;
  
  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// INTERFACES - INSTÂNCIA/CONEXÃO
// ============================================================================

/**
 * Instância de canal (conexão)
 * Representa uma conexão com um provedor
 */
export interface ChannelInstance {
  /** ID único no Rendizy */
  id: string;
  
  /** ID da organização */
  organizationId: string;
  
  /** Canal */
  channel: ChannelType;
  
  /** Provider específico */
  provider: WhatsAppProvider | SmsProvider | string;
  
  /** Nome da instância (único) */
  instanceName: string;
  
  /** URL da API */
  apiUrl: string;
  
  /** API Key */
  apiKey: string;
  
  /** Token adicional (se necessário) */
  instanceToken?: string;
  
  /** Status da conexão */
  status: 'connected' | 'disconnected' | 'qr_pending' | 'error';
  
  /** Número/identificador conectado */
  connectedIdentifier?: string;
  
  /** Nome do perfil */
  profileName?: string;
  
  /** URL da foto do perfil */
  profilePictureUrl?: string;
  
  /** URL do webhook */
  webhookUrl?: string;
  
  /** Eventos do webhook */
  webhookEvents?: string[];
  
  /** QR Code (base64) se pendente */
  qrCode?: string;
  
  /** Mensagem de erro (se houver) */
  errorMessage?: string;
  
  /** Configurações específicas */
  settings?: Record<string, unknown>;
  
  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
  lastConnectedAt?: Date;
  deletedAt?: Date;
}

// ============================================================================
// INTERFACES - WEBHOOK
// ============================================================================

/**
 * Payload de webhook recebido
 */
export interface WebhookPayload {
  /** Evento */
  event: string;
  
  /** Nome da instância */
  instanceName: string;
  
  /** Provider */
  provider: string;
  
  /** Dados do evento */
  data: unknown;
  
  /** Timestamp */
  timestamp: Date;
  
  /** Raw payload original */
  raw: unknown;
}

/**
 * Resultado do processamento de webhook
 */
export interface WebhookResult {
  /** Sucesso? */
  success: boolean;
  
  /** Mensagem de resultado */
  message: string;
  
  /** ID da organização afetada */
  organizationId?: string;
  
  /** ID da conversa afetada/criada */
  conversationId?: string;
  
  /** ID da mensagem criada */
  messageId?: string;
  
  /** Erro (se houver) */
  error?: string;
}

// ============================================================================
// INTERFACES - ENVIO
// ============================================================================

/**
 * Request para enviar mensagem
 */
export interface SendMessageRequest {
  /** ID da conversa */
  conversationId: string;
  
  /** Conteúdo de texto */
  content: string;
  
  /** Anexos (opcional) */
  attachments?: MessageAttachment[];
  
  /** Responder a (ID da mensagem) */
  replyTo?: string;
  
  /** É nota interna? */
  isInternal?: boolean;
}

/**
 * Resultado do envio
 */
export interface SendMessageResult {
  /** Sucesso? */
  success: boolean;
  
  /** ID da mensagem criada */
  messageId?: string;
  
  /** ID externo da mensagem */
  externalId?: string;
  
  /** Erro (se houver) */
  error?: string;
}

// ============================================================================
// INTERFACE - ADAPTER BASE
// ============================================================================

/**
 * Interface base para todos os adapters de canal
 * Cada provider deve implementar essa interface
 */
export interface IChatAdapter {
  /** Nome do adapter */
  readonly name: string;
  
  /** Canal */
  readonly channel: ChannelType;
  
  /** Provider */
  readonly provider: string;
  
  // ========== PARSING (Webhook -> Unified) ==========
  
  /**
   * Parse payload de webhook para formato unificado
   */
  parseWebhook(payload: unknown): WebhookPayload | null;
  
  /**
   * Extrair contato do payload
   */
  parseContact(data: unknown): Partial<UnifiedContact> | null;
  
  /**
   * Extrair mensagem do payload
   */
  parseMessage(data: unknown): Partial<UnifiedMessage> | null;
  
  // ========== VALIDAÇÃO ==========
  
  /**
   * Verificar se é um contato válido (não grupo, não broadcast, etc)
   */
  isValidContact(data: unknown): boolean;
  
  /**
   * Verificar se é uma mensagem que devemos processar
   */
  shouldProcessMessage(data: unknown): boolean;
  
  /**
   * Extrair telefone do identificador
   */
  extractPhoneNumber(identifier: string): string | null;
  
  // ========== ENVIO ==========
  
  /**
   * Enviar mensagem de texto
   */
  sendText(
    instance: ChannelInstance,
    recipientId: string,
    text: string,
    options?: { replyTo?: string }
  ): Promise<SendMessageResult>;
  
  /**
   * Enviar mídia
   */
  sendMedia(
    instance: ChannelInstance,
    recipientId: string,
    attachment: MessageAttachment,
    caption?: string
  ): Promise<SendMessageResult>;
  
  // ========== STATUS ==========
  
  /**
   * Verificar status da conexão
   */
  checkConnection(instance: ChannelInstance): Promise<{
    connected: boolean;
    phoneNumber?: string;
    profileName?: string;
    error?: string;
  }>;
  
  /**
   * Obter QR Code para conexão
   */
  getQrCode?(instance: ChannelInstance): Promise<{
    qrCode?: string;
    pairingCode?: string;
    error?: string;
  }>;
  
  /**
   * Configurar webhook
   */
  setupWebhook?(
    instance: ChannelInstance,
    webhookUrl: string,
    events: string[]
  ): Promise<{ success: boolean; error?: string }>;
}
