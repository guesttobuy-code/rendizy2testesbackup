// ============================================================================
// NOTIFICATION TYPES - Tipos centrais para o sistema de notificações
// ============================================================================
// Arquitetura: Cápsulas independentes por canal
// Cada provider implementa NotificationProvider interface
// ============================================================================

/**
 * Canais de notificação disponíveis
 */
export type NotificationChannel = 
  | 'email'
  | 'sms'
  | 'whatsapp'
  | 'push'
  | 'in_app';

/**
 * Prioridade da notificação
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Status de entrega
 */
export type DeliveryStatus = 
  | 'pending'
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced';

/**
 * Payload base para todas as notificações
 */
export interface NotificationPayload {
  /** ID único da notificação */
  id?: string;
  /** ID da organização */
  organizationId: string;
  /** Canal de envio */
  channel: NotificationChannel;
  /** Prioridade */
  priority?: NotificationPriority;
  /** Template ID (opcional) */
  templateId?: string;
  /** Variáveis para substituição no template */
  variables?: Record<string, any>;
  /** Metadados extras */
  metadata?: Record<string, any>;
}

/**
 * Payload específico para EMAIL
 */
export interface EmailPayload extends NotificationPayload {
  channel: 'email';
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  /** Corpo em texto simples */
  text?: string;
  /** Corpo em HTML */
  html?: string;
  /** Nome do remetente */
  fromName?: string;
  /** Email do remetente (deve estar verificado no provider) */
  fromEmail?: string;
  /** Reply-to */
  replyTo?: string;
  /** Anexos */
  attachments?: Array<{
    filename: string;
    content: string; // Base64
    contentType: string;
  }>;
}

/**
 * Payload específico para SMS
 */
export interface SmsPayload extends NotificationPayload {
  channel: 'sms';
  to: string; // Telefone com código do país (+55...)
  message: string;
  /** Nome do remetente (se suportado pelo provider) */
  sender?: string;
}

/**
 * Payload específico para WHATSAPP
 */
export interface WhatsAppPayload extends NotificationPayload {
  channel: 'whatsapp';
  to: string; // Número com código do país
  message: string;
  /** Instance name (Evolution API) */
  instanceName?: string;
  /** Template aprovado do WhatsApp Business */
  templateName?: string;
  /** Parâmetros do template */
  templateParams?: string[];
  /** URL de mídia a anexar */
  mediaUrl?: string;
  /** Tipo de mídia */
  mediaType?: 'image' | 'video' | 'audio' | 'document';
}

/**
 * Payload específico para PUSH NOTIFICATION
 */
export interface PushPayload extends NotificationPayload {
  channel: 'push';
  /** User ID ou Device Token */
  to: string;
  title: string;
  body: string;
  /** Ícone */
  icon?: string;
  /** Imagem */
  image?: string;
  /** URL ao clicar */
  clickAction?: string;
  /** Dados extras */
  data?: Record<string, any>;
}

/**
 * Payload específico para IN-APP (Dashboard)
 */
export interface InAppPayload extends NotificationPayload {
  channel: 'in_app';
  /** User ID (opcional - se vazio, vai para todos da org) */
  userId?: string;
  title: string;
  message: string;
  /** Tipo visual */
  type?: 'info' | 'success' | 'warning' | 'error';
  /** URL de ação */
  actionUrl?: string;
  /** Label do botão de ação */
  actionLabel?: string;
}

/**
 * Union type de todos os payloads
 */
export type AnyNotificationPayload = 
  | EmailPayload 
  | SmsPayload 
  | WhatsAppPayload 
  | PushPayload 
  | InAppPayload;

/**
 * Resultado do envio
 */
export interface SendResult {
  success: boolean;
  channel: NotificationChannel;
  provider: string;
  /** ID da mensagem no provider */
  messageId?: string;
  /** Status de entrega */
  status: DeliveryStatus;
  /** Timestamp do envio */
  sentAt?: string;
  /** Erro (se houver) */
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  /** Dados extras do provider */
  providerResponse?: any;
}

/**
 * Interface que todo provider deve implementar
 */
export interface NotificationProvider {
  /** Nome do provider (ex: 'resend', 'brevo', 'evolution') */
  name: string;
  /** Canal que este provider atende */
  channel: NotificationChannel;
  /** Verifica se o provider está configurado */
  isConfigured(organizationId: string): Promise<boolean>;
  /** Envia a notificação */
  send(payload: AnyNotificationPayload): Promise<SendResult>;
  /** Verifica status de entrega (se suportado) */
  checkDeliveryStatus?(messageId: string): Promise<DeliveryStatus>;
}

/**
 * Configuração de um provider (salva no banco)
 */
export interface ProviderConfig {
  provider: string;
  channel: NotificationChannel;
  enabled: boolean;
  apiKey?: string;
  apiSecret?: string;
  fromEmail?: string;
  fromName?: string;
  webhookUrl?: string;
  customConfig?: Record<string, any>;
}

/**
 * Log de entrega (para histórico)
 */
export interface DeliveryLog {
  id: string;
  organizationId: string;
  notificationId?: string;
  channel: NotificationChannel;
  provider: string;
  recipient: string;
  status: DeliveryStatus;
  messageId?: string;
  error?: string;
  sentAt: string;
  deliveredAt?: string;
  metadata?: Record<string, any>;
}
