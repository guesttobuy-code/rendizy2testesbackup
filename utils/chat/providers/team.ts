/**
 * TEAM CHAT PROVIDER
 * 
 * Provider para chat interno da equipe (corretores vinculados a uma imobiliária).
 * 
 * Exemplos de uso:
 * - Canal #geral da ABC Imóveis
 * - Canal #vendas para estratégias
 * - DM entre corretores da mesma imobiliária
 * 
 * @version 1.0.0
 * @date 2026-02-02
 * @see ADR-010
 */

import { getSupabaseClient } from '../../supabase/client';
import type {
  IChatProvider,
  ChatConversation,
  ChatMessage,
  GetConversationsOptions,
  GetMessagesOptions,
  ParsedExternalId,
  MessageStatus,
} from '../types';

// ============================================================
// TYPES
// ============================================================

interface BrokerChatChannelRow {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  type: string;
  created_at: string;
  updated_at: string;
  company: { id: string; name: string; logo_url: string | null } | null;
  lastMessage?: { content: string; created_at: string; broker: { name: string } | null } | null;
  unreadCount?: number;
}

interface BrokerChatMessageRow {
  id: string;
  channel_id: string;
  broker_id: string;
  content: string;
  attachments: Array<{ url: string; type: string }> | null;
  read_by: string[] | null;
  created_at: string;
  broker: { id: string; name: string; photo_url: string | null } | null;
}

// ============================================================
// TEAM CHAT PROVIDER
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any; // Temporário até regenerar tipos do Supabase

class TeamChatProvider implements IChatProvider {
  readonly channel = 'team' as const;
  readonly displayName = '👥 Equipe';

  /**
   * Verifica se o provider está habilitado
   * Só está habilitado se o usuário é um corretor vinculado
   */
  async isEnabled(): Promise<boolean> {
    const supabase = getSupabaseClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Verificar se usuário é corretor vinculado com permissão de chat
    const { data } = await supabase
      .from('re_brokers')
      .select('id, broker_type, linked_company_id, permissions')
      .eq('organization_id', user.user_metadata?.organization_id)
      .single();

    const broker = data as AnyRow;
    if (!broker) return false;
    if (broker.broker_type !== 'linked') return false;
    if (!broker.linked_company_id) return false;

    // Verificar permissão de chat
    const permissions = broker.permissions as { can_see_chat?: boolean } | null;
    return permissions?.can_see_chat === true;
  }

  /**
   * Buscar canais de chat da imobiliária
   */
  async getConversations(
    organizationId: string,
    options?: GetConversationsOptions
  ): Promise<ChatConversation[]> {
    const supabase = getSupabaseClient();

    // Primeiro, pegar o broker e sua empresa vinculada
    const { data: brokerData } = await supabase
      .from('re_brokers')
      .select('id, linked_company_id, permissions')
      .eq('organization_id', organizationId)
      .eq('broker_type', 'linked')
      .single();

    const broker = brokerData as AnyRow;
    if (!broker?.linked_company_id) {
      return []; // Não é corretor vinculado
    }

    const permissions = broker.permissions as { can_see_chat?: boolean } | null;
    if (!permissions?.can_see_chat) {
      return []; // Sem permissão de chat
    }

    // Buscar canais da empresa
    const query = supabase
      .from('re_broker_chat_channels')
      .select(`
        id,
        company_id,
        name,
        description,
        type,
        created_at,
        updated_at,
        company:re_companies!company_id(id, name, logo_url)
      `)
      .eq('company_id', broker.linked_company_id)
      .order('updated_at', { ascending: false, nullsFirst: false });

    if (options?.limit) {
      query.limit(options.limit);
    }

    const { data: channels, error } = await query;

    if (error) {
      console.error('[TeamChatProvider] Erro ao buscar canais:', error);
      throw error;
    }

    // Para cada canal, buscar última mensagem
    const conversationsWithLastMessage = await Promise.all(
      ((channels || []) as AnyRow[]).map(async (channel) => {
        const { data: lastMsg } = await supabase
          .from('re_broker_chat_messages')
          .select('content, created_at, broker:re_brokers!broker_id(name)')
          .eq('channel_id', channel.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Contar não lidas (mensagens onde o usuário não está no read_by)
        const { data: { user } } = await supabase.auth.getUser();
        const { count } = await supabase
          .from('re_broker_chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('channel_id', channel.id)
          .not('read_by', 'cs', `{${user?.id}}`);

        return {
          ...channel,
          lastMessage: lastMsg,
          unreadCount: count || 0,
        };
      })
    );

    return conversationsWithLastMessage.map((ch) => this.mapToConversation(ch as BrokerChatChannelRow, organizationId));
  }

  /**
   * Buscar mensagens de um canal
   */
  async getMessages(
    conversationId: string, // channel_id
    options?: GetMessagesOptions
  ): Promise<ChatMessage[]> {
    const supabase = getSupabaseClient();

    let query = supabase
      .from('re_broker_chat_messages')
      .select(`
        id,
        channel_id,
        broker_id,
        content,
        attachments,
        read_by,
        created_at,
        broker:re_brokers!broker_id(id, name, photo_url)
      `)
      .eq('channel_id', conversationId)
      .order('created_at', { ascending: false });

    if (options?.before) {
      query = query.lt('created_at', options.before.toISOString());
    }

    if (options?.after) {
      query = query.gt('created_at', options.after.toISOString());
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[TeamChatProvider] Erro ao buscar mensagens:', error);
      throw error;
    }

    // Reverter para ordem cronológica
    return ((data || []) as AnyRow[]).reverse().map((msg) => this.mapToMessage(msg as BrokerChatMessageRow));
  }

  /**
   * Enviar mensagem de texto
   */
  async sendTextMessage(
    conversationId: string, // channel_id
    text: string
  ): Promise<ChatMessage> {
    const supabase = getSupabaseClient();

    // Obter broker do usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data: brokerData } = await supabase
      .from('re_brokers')
      .select('id, name, photo_url, organization_id')
      .eq('organization_id', user.user_metadata?.organization_id)
      .single();

    const broker = brokerData as AnyRow;
    if (!broker) throw new Error('Corretor não encontrado');

    const { data: message, error } = await (supabase
      .from('re_broker_chat_messages') as AnyRow)
      .insert({
        channel_id: conversationId,
        broker_id: broker.id,
        content: text,
        read_by: [broker.id], // Já marca como lida para quem enviou
      })
      .select(`
        id,
        channel_id,
        broker_id,
        content,
        attachments,
        read_by,
        created_at
      `)
      .single();

    if (error) {
      console.error('[TeamChatProvider] Erro ao enviar mensagem:', error);
      throw error;
    }

    return this.mapToMessage({
      ...message,
      broker: { id: broker.id, name: broker.name, photo_url: broker.photo_url }
    } as BrokerChatMessageRow);
  }

  /**
   * Enviar mídia
   */
  async sendMedia(
    conversationId: string,
    mediaUrl: string,
    type: 'image' | 'video' | 'audio' | 'document',
    caption?: string
  ): Promise<ChatMessage> {
    const supabase = getSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data: brokerData } = await supabase
      .from('re_brokers')
      .select('id, name, photo_url, organization_id')
      .eq('organization_id', user.user_metadata?.organization_id)
      .single();

    const broker = brokerData as AnyRow;
    if (!broker) throw new Error('Corretor não encontrado');

    const { data: message, error } = await (supabase
      .from('re_broker_chat_messages') as AnyRow)
      .insert({
        channel_id: conversationId,
        broker_id: broker.id,
        content: caption || '',
        attachments: [{ url: mediaUrl, type }],
        read_by: [broker.id],
      })
      .select()
      .single();

    if (error) throw error;

    return this.mapToMessage({
      ...message,
      broker: { id: broker.id, name: broker.name, photo_url: broker.photo_url }
    } as BrokerChatMessageRow);
  }

  /**
   * Marcar canal como lido
   */
  async markAsRead(conversationId: string): Promise<void> {
    const supabase = getSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Obter broker do usuário
    const { data: brokerData } = await supabase
      .from('re_brokers')
      .select('id')
      .eq('organization_id', user.user_metadata?.organization_id)
      .single();

    const broker = brokerData as AnyRow;
    if (!broker) return;

    // Atualizar read_by em todas as mensagens não lidas
    // Isso é feito via uma query que adiciona o broker_id ao array read_by
    const { data: unreadMessages } = await (supabase
      .from('re_broker_chat_messages') as AnyRow)
      .select('id, read_by')
      .eq('channel_id', conversationId)
      .not('read_by', 'cs', `{${broker.id}}`);

    if (unreadMessages && unreadMessages.length > 0) {
      await Promise.all(
        (unreadMessages as AnyRow[]).map((msg: { id: string; read_by: string[] | null }) => 
          (supabase.from('re_broker_chat_messages') as AnyRow)
            .update({ read_by: [...(msg.read_by || []), broker.id] })
            .eq('id', msg.id)
        )
      );
    }
  }

  /**
   * Parsear ID externo
   */
  parseExternalId(externalId: string): ParsedExternalId {
    return {
      type: 'group',
      raw: externalId,
    };
  }

  /**
   * Formatar nome de exibição
   */
  formatDisplayName(conversation: Partial<ChatConversation>): string {
    return conversation.guestName || 'Canal';
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private mapToConversation(channel: BrokerChatChannelRow, orgId: string): ChatConversation {
    const icon = channel.type === 'announcement' ? '📢' : 
                 channel.type === 'direct' ? '💬' : '#';

    return {
      id: channel.id,
      externalId: channel.id,
      channel: 'team',
      guestName: `${icon} ${channel.name}`,
      avatarUrl: channel.company?.logo_url || undefined,
      lastMessage: channel.lastMessage?.content || undefined,
      lastMessageAt: channel.lastMessage?.created_at 
        ? new Date(channel.lastMessage.created_at) 
        : new Date(channel.updated_at),
      unreadCount: channel.unreadCount || 0,
      organizationId: orgId,
      metadata: {
        channelType: channel.type,
        description: channel.description,
        companyId: channel.company_id,
        companyName: channel.company?.name,
      },
    };
  }

  private mapToMessage(msg: BrokerChatMessageRow): ChatMessage {
    const isRead = msg.read_by?.includes(msg.broker_id);
    const status: MessageStatus = isRead ? 'read' : 'delivered';

    return {
      id: msg.id,
      conversationId: msg.channel_id,
      externalId: msg.id,
      channel: 'team',
      direction: 'outbound', // Será ajustado no componente
      type: msg.attachments?.[0]?.type || 'text',
      content: msg.content,
      mediaUrl: msg.attachments?.[0]?.url,
      mediaMimeType: undefined,
      status,
      sentAt: new Date(msg.created_at),
      readAt: undefined,
      senderName: msg.broker?.name || 'Corretor',
      metadata: {
        brokerId: msg.broker_id,
        brokerAvatar: msg.broker?.photo_url,
        readBy: msg.read_by,
      },
    };
  }
}

// ============================================================
// SINGLETON
// ============================================================

let instance: TeamChatProvider | null = null;

export function getTeamChatProvider(): IChatProvider {
  if (!instance) {
    instance = new TeamChatProvider();
  }
  return instance;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Criar novo canal de chat na imobiliária
 */
export async function createTeamChannel(
  companyId: string,
  name: string,
  options?: {
    description?: string;
    type?: 'group' | 'direct' | 'announcement';
  }
): Promise<string> {
  const supabase = getSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await (supabase
    .from('re_broker_chat_channels') as AnyRow)
    .insert({
      company_id: companyId,
      name,
      description: options?.description,
      type: options?.type || 'group',
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Listar canais de uma imobiliária
 */
export async function listTeamChannels(companyId: string) {
  const supabase = getSupabaseClient();

  const { data, error } = await (supabase
    .from('re_broker_chat_channels') as AnyRow)
    .select('*')
    .eq('company_id', companyId)
    .order('name');

  if (error) throw error;
  return data;
}
