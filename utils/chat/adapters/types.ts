/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    WHATSAPP ADAPTER - BASE TYPES                           ║
 * ║                                                                            ║
 * ║  Interface comum para todos os adapters de WhatsApp                        ║
 * ║  (Evolution, WAHA, Cloud API)                                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * @version 1.0.0
 * @date 2026-01-24
 * @see ADR-010-CHAT-MULTI-PROVIDER-ARCHITECTURE.md
 */

// ============================================================
// ADAPTER CONFIGURATION
// ============================================================

/**
 * Configuração base para qualquer adapter WhatsApp
 */
export interface WhatsAppAdapterConfig {
  /** URL base da API */
  apiUrl: string;
  
  /** Chave de autenticação */
  apiKey: string;
  
  /** Nome/ID da instância */
  instanceName: string;
  
  /** ID da organização */
  organizationId: string;
  
  /** Metadados extras (específicos do provider) */
  metadata?: Record<string, unknown>;
}

// ============================================================
// MESSAGE TYPES
// ============================================================

/**
 * Mensagem normalizada do WhatsApp
 * Formato único independente do provider (Evolution/WAHA)
 */
export interface NormalizedWhatsAppMessage {
  /** ID único da mensagem */
  id: string;
  
  /** JID do remetente/destinatário */
  remoteJid: string;
  
  /** Se foi enviada por nós */
  fromMe: boolean;
  
  /** Conteúdo textual */
  text: string;
  
  /** Timestamp Unix (segundos) */
  timestamp: number;
  
  /** Status da mensagem */
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  
  /** Tipo de mídia */
  mediaType?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location';
  
  /** URL da mídia (se houver) */
  mediaUrl?: string;
  
  /** Base64 da mídia (thumbnails WAHA) */
  mediaBase64?: string;
  
  /** Mimetype da mídia */
  mediaMimetype?: string;
  
  /** Nome do remetente (pushName) */
  pushName?: string;
  
  /** Dados crus do provider (para debug) */
  raw?: unknown;
}

/**
 * Chat/Conversa normalizada
 */
export interface NormalizedWhatsAppChat {
  /** JID do chat */
  id: string;
  
  /** Nome do contato/grupo */
  name: string;
  
  /** URL da foto de perfil */
  profilePicUrl?: string;
  
  /** Última mensagem (preview) */
  lastMessage?: {
    text: string;
    timestamp: number;
    fromMe: boolean;
  };
  
  /** Quantidade de não lidas */
  unreadCount: number;
  
  /** Se é grupo */
  isGroup: boolean;
  
  /** Timestamp da última atualização */
  updatedAt?: number;
}

/**
 * Resultado de envio de mensagem
 */
export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  raw?: unknown;
}

// ============================================================
// ADAPTER INTERFACE
// ============================================================

/**
 * Interface que TODOS os adapters de WhatsApp devem implementar
 * 
 * @example
 * ```typescript
 * const adapter = await getWhatsAppAdapter(orgId);
 * const messages = await adapter.fetchMessages('5521999887766');
 * ```
 */
export interface IWhatsAppAdapter {
  /** Identificador do provider */
  readonly provider: 'evolution' | 'waha' | 'cloud_api';
  
  /** Nome amigável para logs */
  readonly displayName: string;
  
  /**
   * Normaliza qualquer input para o formato JID correto do provider
   * 
   * @example
   * // Evolution
   * normalizeJid('5521999887766') → '5521999887766@s.whatsapp.net'
   * normalizeJid('5521999887766@c.us') → '5521999887766@s.whatsapp.net'
   * 
   * // WAHA
   * normalizeJid('5521999887766') → '5521999887766@c.us'
   * normalizeJid('5521999887766@s.whatsapp.net') → '5521999887766@c.us'
   */
  normalizeJid(input: string): string;
  
  /**
   * Extrai número limpo de qualquer formato de JID
   * 
   * @example
   * extractPhone('5521999887766@s.whatsapp.net') → '5521999887766'
   * extractPhone('5521999887766@c.us') → '5521999887766'
   */
  extractPhone(jid: string): string;
  
  /**
   * Verifica se a conexão está ativa
   */
  isConnected(): Promise<boolean>;
  
  /**
   * Busca lista de chats/conversas
   */
  fetchChats(limit?: number): Promise<NormalizedWhatsAppChat[]>;
  
  /**
   * Busca mensagens de um chat específico
   * 
   * @param chatId - JID ou número (será normalizado internamente)
   * @param limit - Quantidade máxima de mensagens
   */
  fetchMessages(chatId: string, limit?: number): Promise<NormalizedWhatsAppMessage[]>;
  
  /**
   * Envia mensagem de texto
   * 
   * @param chatId - JID ou número (será normalizado internamente)
   * @param text - Texto da mensagem
   */
  sendText(chatId: string, text: string): Promise<SendMessageResult>;
  
  /**
   * Envia mídia (imagem, vídeo, documento, áudio)
   * 
   * @param chatId - JID ou número
   * @param mediaUrl - URL pública da mídia
   * @param mediaType - Tipo de mídia
   * @param caption - Legenda opcional
   */
  sendMedia(
    chatId: string,
    mediaUrl: string,
    mediaType: 'image' | 'video' | 'audio' | 'document',
    caption?: string
  ): Promise<SendMessageResult>;
  
  /**
   * Marca mensagens como lidas
   * 
   * @param chatId - JID do chat
   * @param messageIds - IDs das mensagens (opcional, marca todas se vazio)
   */
  markAsRead(chatId: string, messageIds?: string[]): Promise<void>;
}

// ============================================================
// FACTORY TYPES
// ============================================================

/**
 * Opções para criar adapter
 */
export interface CreateAdapterOptions {
  /** Forçar provider específico (ignora auto-detecção) */
  forceProvider?: 'evolution' | 'waha';
  
  /** Usar cache de instância */
  useCache?: boolean;
}

/**
 * Resultado da detecção de provider
 */
export interface DetectedProvider {
  provider: 'evolution' | 'waha' | 'unknown';
  config: WhatsAppAdapterConfig | null;
  instanceId: string | null;
  status: string;
}
