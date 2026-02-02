/**
 * MARKETPLACE CHAT PROVIDER
 * 
 * Provider para conversas B2B entre organizações diferentes
 * no marketplace de Real Estate.
 * 
 * Exemplos de uso:
 * - Corretor Solo ↔ Construtora (propor parceria)
 * - Imobiliária ↔ Construtora (negociar termos)
 * - Corretor ↔ Imobiliária de outra org
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

interface MarketplaceConversationRow {
  id: string;
  org_a_id: string;
  org_b_id: string;
  related_type: string | null;
  related_id: string | null;
  title: string | null;
  status: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_sender_id: string | null;
  unread_count_org_a: number;
  unread_count_org_b: number;
  created_at: string;
  org_a: { id: string; name: string; logo_url: string | null } | null;
  org_b: { id: string; name: string; logo_url: string | null } | null;
}

interface MarketplaceMessageRow {
  id: string;
  conversation_id: string;
  sender_profile_id: string;
  sender_org_id: string;
  content: string;
  content_type: string;
  attachments: Array<{ url: string; type: string }> | null;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  deleted_at: string | null;
  created_at: string;
  sender: { id: string; name: string; avatar_url: string | null } | null;
}

// ============================================================
// MARKETPLACE PROVIDER
// ============================================================

class MarketplaceChatProvider implements IChatProvider {
  readonly channel = 'marketplace' as const;
  readonly displayName = '🏢 Marketplace B2B';

  /**
   * Verifica se o provider está habilitado
   * Marketplace está sempre habilitado para orgs com módulo Real Estate
   */
  async isEnabled(): Promise<boolean> {
    // TODO: Verificar se a org tem módulo real-estate ativo
    // Por enquanto, sempre habilitado
    return true;
  }

  /**
   * Buscar conversas do marketplace para a organização
   */
  async getConversations(
    organizationId: string,
    options?: GetConversationsOptions
  ): Promise<ChatConversation[]> {
    const supabase = getSupabaseClient();

    const query = supabase
      .from('re_marketplace_conversations')
      .select(`
        id,
        org_a_id,
        org_b_id,
        related_type,
        related_id,
        title,
        status,
        last_message_at,
        last_message_preview,
        last_message_sender_id,
        unread_count_org_a,
        unread_count_org_b,
        created_at,
        org_a:organizations!org_a_id(id, name, logo_url),
        org_b:organizations!org_b_id(id, name, logo_url)
      `)
      .or(`org_a_id.eq.${organizationId},org_b_id.eq.${organizationId}`)
      .eq('status', options?.includeArchived ? 'status' : 'active') // Workaround para not filter
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (!options?.includeArchived) {
      query.eq('status', 'active');
    }

    if (options?.limit) {
      query.limit(options.limit);
    }

    if (options?.offset) {
      query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[MarketplaceProvider] Erro ao buscar conversas:', error);
      throw error;
    }

    return (data || []).map((conv: MarketplaceConversationRow) => this.mapToConversation(conv, organizationId));
  }

  /**
   * Buscar mensagens de uma conversa
   */
  async getMessages(
    conversationId: string,
    options?: GetMessagesOptions
  ): Promise<ChatMessage[]> {
    const supabase = getSupabaseClient();

    let query = supabase
      .from('re_marketplace_messages')
      .select(`
        id,
        conversation_id,
        sender_profile_id,
        sender_org_id,
        content,
        content_type,
        attachments,
        metadata,
        read_at,
        deleted_at,
        created_at,
        sender:profiles!sender_profile_id(id, name, avatar_url)
      `)
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
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
      console.error('[MarketplaceProvider] Erro ao buscar mensagens:', error);
      throw error;
    }

    // Reverter para ordem cronológica
    return (data || []).reverse().map((msg: MarketplaceMessageRow) => this.mapToMessage(msg));
  }

  /**
   * Enviar mensagem de texto
   */
  async sendTextMessage(
    conversationId: string,
    text: string
  ): Promise<ChatMessage> {
    const supabase = getSupabaseClient();

    // Obter perfil e org do usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, organization_id, name, avatar_url')
      .eq('id', user.id)
      .single();

    if (!profile) throw new Error('Perfil não encontrado');

    const { data: message, error } = await supabase
      .from('re_marketplace_messages')
      .insert({
        conversation_id: conversationId,
        sender_profile_id: profile.id,
        sender_org_id: profile.organization_id,
        content: text,
        content_type: 'text',
      })
      .select(`
        id,
        conversation_id,
        sender_profile_id,
        sender_org_id,
        content,
        content_type,
        attachments,
        metadata,
        read_at,
        created_at
      `)
      .single();

    if (error) {
      console.error('[MarketplaceProvider] Erro ao enviar mensagem:', error);
      throw error;
    }

    return this.mapToMessage({
      ...message,
      sender: { id: profile.id, name: profile.name, avatar_url: profile.avatar_url }
    });
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, organization_id, name, avatar_url')
      .eq('id', user.id)
      .single();

    if (!profile) throw new Error('Perfil não encontrado');

    const { data: message, error } = await supabase
      .from('re_marketplace_messages')
      .insert({
        conversation_id: conversationId,
        sender_profile_id: profile.id,
        sender_org_id: profile.organization_id,
        content: caption || '',
        content_type: type,
        attachments: [{ url: mediaUrl, type }],
      })
      .select()
      .single();

    if (error) throw error;

    return this.mapToMessage({
      ...message,
      sender: { id: profile.id, name: profile.name, avatar_url: profile.avatar_url }
    } as MarketplaceMessageRow);
  }

  /**
   * Marcar conversa como lida
   */
  async markAsRead(conversationId: string): Promise<void> {
    const supabase = getSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Usar a função RPC criada na migration
    await supabase.rpc('mark_marketplace_conversation_as_read', {
      p_conversation_id: conversationId,
      p_profile_id: user.id,
    });
  }

  /**
   * Parsear ID externo
   */
  parseExternalId(externalId: string): ParsedExternalId {
    return {
      type: 'unknown',
      raw: externalId,
    };
  }

  /**
   * Formatar nome de exibição
   */
  formatDisplayName(conversation: Partial<ChatConversation>): string {
    return conversation.guestName || 'Organização';
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private mapToConversation(conv: any, myOrgId: string): ChatConversation {
    const isOrgA = conv.org_a_id === myOrgId;
    const otherOrg = isOrgA ? conv.org_b : conv.org_a;
    const unreadCount = isOrgA ? conv.unread_count_org_a : conv.unread_count_org_b;

    return {
      id: conv.id,
      externalId: conv.id,
      channel: 'marketplace',
      guestName: otherOrg?.name || 'Organização',
      avatarUrl: otherOrg?.logo_url || undefined,
      lastMessage: conv.last_message_preview || undefined,
      lastMessageAt: conv.last_message_at ? new Date(conv.last_message_at) : undefined,
      unreadCount: unreadCount || 0,
      organizationId: myOrgId,
      metadata: {
        relatedType: conv.related_type,
        relatedId: conv.related_id,
        title: conv.title,
        otherOrgId: otherOrg?.id,
      },
    };
  }

  private mapToMessage(msg: any): ChatMessage {
    const status: MessageStatus = msg.read_at ? 'read' : 'delivered';

    return {
      id: msg.id,
      conversationId: msg.conversation_id,
      externalId: msg.id,
      channel: 'marketplace',
      direction: 'outbound', // Será ajustado no componente baseado no sender
      type: msg.content_type || 'text',
      content: msg.content,
      mediaUrl: msg.attachments?.[0]?.url,
      mediaMimeType: undefined,
      status,
      sentAt: new Date(msg.created_at),
      readAt: msg.read_at ? new Date(msg.read_at) : undefined,
      senderName: msg.sender?.name || 'Usuário',
      metadata: {
        senderProfileId: msg.sender_profile_id,
        senderOrgId: msg.sender_org_id,
        senderAvatar: msg.sender?.avatar_url,
      },
    };
  }
}

// ============================================================
// SINGLETON
// ============================================================

let instance: MarketplaceChatProvider | null = null;

export function getMarketplaceChatProvider(): IChatProvider {
  if (!instance) {
    instance = new MarketplaceChatProvider();
  }
  return instance;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Criar ou obter conversa existente entre duas orgs
 */
export async function getOrCreateMarketplaceConversation(
  myOrgId: string,
  targetOrgId: string,
  options?: {
    relatedType?: string;
    relatedId?: string;
    title?: string;
  }
): Promise<string> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('get_or_create_marketplace_conversation', {
    p_my_org_id: myOrgId,
    p_target_org_id: targetOrgId,
    p_related_type: options?.relatedType || null,
    p_related_id: options?.relatedId || null,
    p_title: options?.title || null,
  });

  if (error) throw error;
  return data;
}

/**
 * Abrir chat do marketplace (navegar para página de chat)
 */
export async function openMarketplaceChat(
  myOrgId: string,
  targetOrgId: string,
  options?: {
    relatedType?: string;
    relatedId?: string;
    title?: string;
  }
): Promise<string> {
  const conversationId = await getOrCreateMarketplaceConversation(
    myOrgId,
    targetOrgId,
    options
  );

  // Navegar para o chat (usar router ou window.location)
  // O componente de chat será responsável por mostrar a conversa
  return conversationId;
}
