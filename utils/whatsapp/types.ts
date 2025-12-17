/**
 * TIPOS COMPARTILHADOS - WhatsApp Multi-Provider
 * 
 * Tipos usados por TODOS os providers (Evolution, WAHA, etc)
 * para garantir interface unificada
 */

// ============================================================
// PROVIDER TYPES
// ============================================================

export type WhatsAppProvider = 'evolution' | 'waha';

export interface WhatsAppProviderConfig {
  provider: WhatsAppProvider;
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  instanceName?: string; // Apenas Evolution
  sessionName?: string;  // Apenas WAHA
}

// ============================================================
// SESSION & CONNECTION
// ============================================================

export type SessionStatus = 
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'SCAN_QR_CODE'
  | 'CONNECTED'
  | 'ERROR';

export interface WhatsAppSession {
  id: string;
  name: string;
  status: SessionStatus;
  connectedPhone?: string;
  connectedName?: string;
  qrCode?: string;
  lastActivity?: Date;
  provider: WhatsAppProvider;
}

export interface QRCodeData {
  qrCode: string; // Base64 ou URL
  expiresAt?: Date;
}

// ============================================================
// MESSAGES
// ============================================================

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document';

export type MessageStatus = 
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'error';

export interface WhatsAppMessage {
  id: string;
  chatId: string;
  from: string;
  to: string;
  body: string;
  type: MessageType;
  timestamp: number;
  status: MessageStatus;
  isFromMe: boolean;
  hasMedia: boolean;
  mediaUrl?: string;
}

export interface SendMessageRequest {
  to: string;
  message: string;
}

export interface SendMediaRequest {
  to: string;
  mediaUrl: string;
  caption?: string;
  type: MessageType;
}

// ============================================================
// CONTACTS & CHATS
// ============================================================

export interface WhatsAppContact {
  id: string;
  name?: string;
  phone: string;
  profilePicUrl?: string;
  isGroup: boolean;
  isBlocked?: boolean;
}

export interface WhatsAppChat {
  id: string;
  name: string;
  isGroup: boolean;
  unreadCount: number;
  lastMessage?: WhatsAppMessage;
  timestamp: number;
  participants?: string[];
}

// ============================================================
// WEBHOOKS
// ============================================================

export type WebhookEvent = 
  | 'message'
  | 'message.any'
  | 'state.change'
  | 'connection.update'
  | 'qr.code'
  | 'group.join'
  | 'presence.update';

export interface WebhookConfig {
  url: string;
  events: WebhookEvent[];
  enabled: boolean;
}

export interface WebhookPayload {
  event: WebhookEvent;
  data: any;
  timestamp: number;
  provider: WhatsAppProvider;
}

// ============================================================
// API RESPONSES
// ============================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  provider: WhatsAppProvider;
  timestamp: number;
}

export interface HealthCheckResponse {
  healthy: boolean;
  provider: WhatsAppProvider;
  version?: string;
  uptime?: number;
}

// ============================================================
// PROVIDER INTERFACE (Abstract)
// ============================================================

export interface IWhatsAppProvider {
  readonly provider: WhatsAppProvider;
  readonly config: WhatsAppProviderConfig;

  // Session Management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): Promise<SessionStatus>;
  getQRCode(): Promise<QRCodeData>;
  
  // Messages
  sendTextMessage(to: string, message: string): Promise<WhatsAppMessage>;
  sendMediaMessage(request: SendMediaRequest): Promise<WhatsAppMessage>;
  getMessages(chatId: string, limit?: number): Promise<WhatsAppMessage[]>;
  
  // Contacts & Chats
  getChats(): Promise<WhatsAppChat[]>;
  getContact(phone: string): Promise<WhatsAppContact>;
  checkNumber(phone: string): Promise<boolean>;
  
  // Health & Utilities
  healthCheck(): Promise<HealthCheckResponse>;
  isConnected(): Promise<boolean>;
}

// ============================================================
// ERROR TYPES
// ============================================================

export class WhatsAppError extends Error {
  constructor(
    message: string,
    public provider: WhatsAppProvider,
    public code?: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'WhatsAppError';
  }
}

export class ConnectionError extends WhatsAppError {
  constructor(provider: WhatsAppProvider, originalError?: any) {
    super('Falha ao conectar com WhatsApp', provider, 'CONNECTION_ERROR', originalError);
    this.name = 'ConnectionError';
  }
}

export class AuthenticationError extends WhatsAppError {
  constructor(provider: WhatsAppProvider, originalError?: any) {
    super('Erro de autenticação', provider, 'AUTH_ERROR', originalError);
    this.name = 'AuthenticationError';
  }
}

export class MessageError extends WhatsAppError {
  constructor(provider: WhatsAppProvider, originalError?: any) {
    super('Erro ao enviar mensagem', provider, 'MESSAGE_ERROR', originalError);
    this.name = 'MessageError';
  }
}
