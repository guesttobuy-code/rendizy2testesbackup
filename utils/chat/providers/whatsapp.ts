/**
 * WHATSAPP CHAT PROVIDER
 * 
 * Implementação de IChatProvider para WhatsApp
 * Usa a factory existente (Evolution/WAHA) internamente
 * 
 * @version 1.0.0
 * @date 2026-01-22
 * @see ADR-007
 */

import type {
  IChatProvider,
  ChatChannel,
  ChatConversation,
  ChatMessage,
  GetConversationsOptions,
  GetMessagesOptions,
  ParsedExternalId,
} from '../types';
import { getSupabaseClient } from '../../supabase/client';
import { fetchWhatsAppChats, fetchWhatsAppMessages, sendWhatsAppMessage } from '../../whatsappChatApi';

// ============================================================
// CONSTANTS
// ============================================================

/** Formatos de JID do WhatsApp */
const JID_PATTERNS = {
  USER: /@s\.whatsapp\.net$/,           // Usuário normal
  GROUP: /@g\.us$/,                      // Grupo
  LEAD: /@lid$/,                         // Lead do Meta Ads
  BROADCAST: /@broadcast$/,              // Lista de transmissão
  STATUS: /status@broadcast$/,           // Status/Stories
};

// ============================================================
// PROVIDER IMPLEMENTATION
// ============================================================

export class WhatsAppChatProvider implements IChatProvider {
  readonly channel: ChatChannel = 'whatsapp';
  readonly displayName = 'WhatsApp';

  async isEnabled(): Promise<boolean> {
    // Por enquanto sempre habilitado
    // Futuramente: verificar status da conexão Evolution/WAHA
    return true;
  }

  async getConversations(
    organizationId: string,
    options?: GetConversationsOptions
  ): Promise<ChatConversation[]> {
    // Buscar conversas de AMBAS as fontes em paralelo
    const [evolutionChats, dbConversations] = await Promise.all([
      this.fetchEvolutionChats(),
      this.fetchDatabaseConversations(organizationId),
    ]);

    // Criar mapa do banco por external_conversation_id para lookup O(1)
    const dbMap = new Map<string, (typeof dbConversations)[number]>();
    for (const conv of dbConversations) {
      if (conv.external_conversation_id) {
        dbMap.set(conv.external_conversation_id, conv);
      }
    }

    // Converter chats da Evolution para formato unificado
    const conversations: ChatConversation[] = [];
    const processedIds = new Set<string>();

    // 1. Processar chats da Evolution API (enriquecendo com dados do banco)
    for (const chat of evolutionChats) {
      const externalId = (chat as any).remoteJid || chat.id || '';
      
      // Pular grupos e status
      if (this.isGroupOrStatus(externalId)) continue;
      
      processedIds.add(externalId);
      const dbData = dbMap.get(externalId);
      
      conversations.push(this.mergeConversation(chat, dbData, organizationId));
    }

    // 2. Adicionar conversas do banco que NÃO estão na Evolution
    // (ex: leads do Meta Ads @lid, conversas antigas)
    for (const dbConv of dbConversations) {
      const extId = dbConv.external_conversation_id;
      if (!extId || processedIds.has(extId)) continue;
      if (this.isGroupOrStatus(extId)) continue;
      
      conversations.push(this.dbToConversation(dbConv, organizationId));
    }

    // Ordenar por última mensagem (mais recente primeiro)
    conversations.sort((a, b) => {
      const aTime = a.lastMessageAt?.getTime() || 0;
      const bTime = b.lastMessageAt?.getTime() || 0;
      return bTime - aTime;
    });

    // Aplicar limit se especificado
    if (options?.limit) {
      return conversations.slice(0, options.limit);
    }

    return conversations;
  }

  async getMessages(
    conversationId: string,
    _options?: GetMessagesOptions
  ): Promise<ChatMessage[]> {
    // Usar API existente
    const messages = await fetchWhatsAppMessages(conversationId);
    
    return messages.map((msg: any) => this.toUnifiedMessage(msg, conversationId));
  }

  async sendTextMessage(
    conversationId: string,
    text: string
  ): Promise<ChatMessage> {
    // Extrair número do JID
    const parsed = this.parseExternalId(conversationId);
    const phone = parsed.phone || conversationId;
    
    const result = await sendWhatsAppMessage(phone, text);
    
    return {
      id: result.key?.id || crypto.randomUUID(),
      conversationId,
      externalId: result.key?.id,
      channel: 'whatsapp',
      direction: 'outbound',
      type: 'text',
      content: text,
      status: 'sent',
      sentAt: new Date(),
    };
  }

  async markAsRead(conversationId: string): Promise<void> {
    // TODO: Implementar via Evolution API
    // Por enquanto, só atualiza no banco
    const supabase = getSupabaseClient();
    await supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('external_conversation_id', conversationId);
  }

  parseExternalId(externalId: string): ParsedExternalId {
    const raw = externalId;
    
    // Usuário normal WhatsApp
    if (JID_PATTERNS.USER.test(externalId)) {
      const phone = externalId.replace('@s.whatsapp.net', '');
      return { type: 'user', phone, raw };
    }
    
    // Grupo
    if (JID_PATTERNS.GROUP.test(externalId)) {
      return { type: 'group', raw };
    }
    
    // Lead do Meta Ads
    if (JID_PATTERNS.LEAD.test(externalId)) {
      const leadId = externalId.replace('@lid', '');
      return { type: 'lead', leadId, raw };
    }
    
    // Lista de transmissão
    if (JID_PATTERNS.BROADCAST.test(externalId)) {
      return { type: 'broadcast', raw };
    }
    
    // Status
    if (JID_PATTERNS.STATUS.test(externalId)) {
      return { type: 'broadcast', raw };
    }
    
    return { type: 'unknown', raw };
  }

  formatDisplayName(conversation: Partial<ChatConversation>): string {
    // Se tem nome, usar nome
    if (conversation.guestName && 
        conversation.guestName !== 'Desconhecido' &&
        conversation.guestName !== 'undefined' &&
        conversation.guestName !== 'null') {
      return conversation.guestName;
    }
    
    // Se tem telefone, formatar telefone
    if (conversation.guestPhone) {
      return this.formatPhone(conversation.guestPhone);
    }
    
    // Parsear external ID
    if (conversation.externalId) {
      const parsed = this.parseExternalId(conversation.externalId);
      
      switch (parsed.type) {
        case 'user':
          return parsed.phone ? this.formatPhone(parsed.phone) : 'Contato WhatsApp';
        
        case 'lead':
          // Lead Meta não tem telefone real - mostrar identificador curto
          return `Lead #${parsed.leadId?.slice(0, 6) || '???'}...`;
        
        case 'group':
          return 'Grupo WhatsApp';
        
        default:
          return 'Contato';
      }
    }
    
    return 'Contato';
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private async fetchEvolutionChats(): Promise<any[]> {
    try {
      return await fetchWhatsAppChats();
    } catch (error) {
      console.error('[WhatsAppChatProvider] Erro ao buscar chats Evolution:', error);
      return [];
    }
  }

  private async fetchDatabaseConversations(organizationId: string) {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('conversations')
      .select('id, external_conversation_id, guest_name, guest_phone, last_message, last_message_at, unread_count')
      .eq('organization_id', organizationId)
      .order('last_message_at', { ascending: false });
    
    if (error) {
      console.error('[WhatsAppChatProvider] Erro ao buscar conversas DB:', error);
      return [];
    }
    
    return data || [];
  }

  private isGroupOrStatus(externalId: string): boolean {
    return JID_PATTERNS.GROUP.test(externalId) ||
           JID_PATTERNS.STATUS.test(externalId) ||
           JID_PATTERNS.BROADCAST.test(externalId);
  }

  private mergeConversation(
    evolutionChat: any,
    dbData: any | undefined,
    organizationId: string
  ): ChatConversation {
    const externalId = (evolutionChat as any).remoteJid || evolutionChat.id || '';
    const parsed = this.parseExternalId(externalId);
    
    // Extrair dados do Evolution
    const evolutionName = evolutionChat.pushName || evolutionChat.name;
    const evolutionPhone = parsed.phone || '';
    
    // Priorizar dados do banco (mais atualizados via webhook)
    const guestName = dbData?.guest_name || evolutionName || '';
    const guestPhone = dbData?.guest_phone || evolutionPhone;
    
    // Last message: priorizar banco
    let lastMessage = '';
    if (dbData?.last_message) {
      if (typeof dbData.last_message === 'string') {
        lastMessage = dbData.last_message;
      } else if (typeof dbData.last_message === 'object') {
        lastMessage = (dbData.last_message as any)?.message?.conversation ||
                      (dbData.last_message as any)?.message?.extendedTextMessage?.text ||
                      '';
      }
    }
    if (!lastMessage && evolutionChat.lastMessage?.message) {
      lastMessage = evolutionChat.lastMessage.message;
    }
    
    // Timestamp: priorizar banco
    let lastMessageAt: Date | undefined;
    if (dbData?.last_message_at) {
      lastMessageAt = new Date(dbData.last_message_at);
    } else if (evolutionChat.updatedAt) {
      lastMessageAt = new Date(evolutionChat.updatedAt);
    } else if (evolutionChat.lastMessageTimestamp) {
      lastMessageAt = new Date(evolutionChat.lastMessageTimestamp * 1000);
    }
    
    const conversation: ChatConversation = {
      id: dbData?.id || externalId,
      externalId,
      channel: 'whatsapp',
      subProvider: 'evolution',
      guestName,
      guestPhone,
      avatarUrl: evolutionChat.profilePictureUrl || evolutionChat.profilePicUrl,
      lastMessage,
      lastMessageAt,
      unreadCount: dbData?.unread_count || evolutionChat.unreadCount || 0,
      organizationId,
    };
    
    // Aplicar formatação de nome
    if (!conversation.guestName) {
      conversation.guestName = this.formatDisplayName(conversation);
    }
    
    return conversation;
  }

  private dbToConversation(dbData: any, organizationId: string): ChatConversation {
    const externalId = dbData.external_conversation_id;
    const parsed = this.parseExternalId(externalId);
    
    // Extrair last message
    let lastMessage = '';
    if (dbData.last_message) {
      if (typeof dbData.last_message === 'string') {
        lastMessage = dbData.last_message;
      } else if (typeof dbData.last_message === 'object') {
        lastMessage = (dbData.last_message as any)?.message?.conversation ||
                      (dbData.last_message as any)?.message?.extendedTextMessage?.text ||
                      '';
      }
    }
    
    const conversation: ChatConversation = {
      id: dbData.id,
      externalId,
      channel: 'whatsapp',
      subProvider: 'evolution',
      guestName: dbData.guest_name || '',
      guestPhone: parsed.phone || dbData.guest_phone || '',
      lastMessage,
      lastMessageAt: dbData.last_message_at ? new Date(dbData.last_message_at) : undefined,
      unreadCount: dbData.unread_count || 0,
      organizationId,
    };
    
    // Aplicar formatação de nome se não tiver
    if (!conversation.guestName) {
      conversation.guestName = this.formatDisplayName(conversation);
    }
    
    return conversation;
  }

  private toUnifiedMessage(msg: any, conversationId: string): ChatMessage {
    return {
      id: msg.id || msg.key?.id || crypto.randomUUID(),
      conversationId,
      externalId: msg.key?.id,
      channel: 'whatsapp',
      direction: msg.key?.fromMe ? 'outbound' : 'inbound',
      type: msg.messageType || 'text',
      content: msg.message?.conversation ||
               msg.message?.extendedTextMessage?.text ||
               msg.message?.imageMessage?.caption ||
               '',
      mediaUrl: msg.message?.imageMessage?.url ||
                msg.message?.videoMessage?.url ||
                msg.message?.audioMessage?.url,
      status: this.mapMessageStatus(msg.status),
      sentAt: new Date(msg.messageTimestamp * 1000),
      senderName: msg.pushName,
    };
  }

  private mapMessageStatus(status?: string): ChatMessage['status'] {
    switch (status) {
      case 'PENDING': return 'pending';
      case 'SENT': case 'SERVER_ACK': return 'sent';
      case 'DELIVERY_ACK': return 'delivered';
      case 'READ': case 'PLAYED': return 'read';
      case 'ERROR': return 'failed';
      default: return 'sent';
    }
  }

  private formatPhone(phone: string): string {
    if (!phone) return '';
    
    // Remover caracteres não numéricos
    const digits = phone.replace(/\D/g, '');
    
    // Brasil: 55 + DDD(2) + número(8-9)
    if (digits.startsWith('55') && digits.length >= 12) {
      const ddd = digits.slice(2, 4);
      const number = digits.slice(4);
      
      if (number.length === 9) {
        return `+55 ${ddd} ${number.slice(0, 5)}-${number.slice(5)}`;
      } else if (number.length === 8) {
        return `+55 ${ddd} ${number.slice(0, 4)}-${number.slice(4)}`;
      }
    }
    
    // Internacional genérico
    if (digits.length > 10) {
      return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
    }
    
    return phone;
  }
}

// ============================================================
// SINGLETON EXPORT
// ============================================================

let instance: WhatsAppChatProvider | null = null;

export function getWhatsAppChatProvider(): WhatsAppChatProvider {
  if (!instance) {
    instance = new WhatsAppChatProvider();
  }
  return instance;
}
