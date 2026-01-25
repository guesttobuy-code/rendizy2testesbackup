/**
 * ============================================================================
 * @ARCHITECTURE: WHATSAPP-MULTI-PROVIDER
 * @ADR: docs/ADR/ADR-009-WHATSAPP-MULTI-PROVIDER.md
 * @PROTECTED v1.0.104
 * ============================================================================
 * 
 * Chat Unified API - Abstração sobre Evolution API e WAHA
 * 
 * ARQUITETURA DE CÁPSULAS SEPARADAS:
 * - Detecta automaticamente qual provider usar (WAHA ou Evolution)
 * - Fornece interface unificada para o frontend
 * - Prioriza dados do banco `conversations` (alimentado por webhooks de ambos providers)
 * 
 * ⚠️ REGRAS PARA IAs:
 * 1. NUNCA assumir que só existe Evolution API
 * 2. SEMPRE usar detectProvider() antes de qualquer operação
 * 3. NUNCA criar endpoints duplicados para WAHA/Evolution
 * 
 * @version 1.0.1
 * @date 2026-01-23
 */

import { getSupabaseClient } from './supabase/client';

// ===================================================
// TYPES
// ===================================================

export type ChannelProvider = 'evolution' | 'waha' | 'unknown';

export interface UnifiedConversation {
  id: string;
  externalId: string;
  contactName: string;
  contactPhone: string;
  lastMessage: string;
  lastMessageAt: Date | null;
  unreadCount: number;
  category: 'pinned' | 'unread' | 'normal';
  isPinned: boolean;
  provider: ChannelProvider;
  instanceId: string | null;
  profilePicUrl?: string;
}

export interface UnifiedMessage {
  id: string;
  conversationId: string;
  content: string;
  fromMe: boolean;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read' | 'pending' | 'failed';
  mediaType?: 'text' | 'image' | 'video' | 'audio' | 'document';
  mediaUrl?: string;
}

export interface ProviderInstance {
  id: string;
  instanceName: string;
  provider: ChannelProvider;
  status: string;
  phoneNumber?: string;
  wahaBaseUrl?: string;
  wahaApiKey?: string;
  evolutionBaseUrl?: string;
  evolutionApiKey?: string;
}

// ===================================================
// DATABASE TYPES
// ===================================================

interface DbChannelInstance {
  id: string;
  organization_id: string;
  channel_type: string;
  provider: string;
  instance_name: string;
  status: string;
  phone_number?: string;
  waha_base_url?: string;
  waha_api_key?: string;
  evolution_base_url?: string;
  evolution_api_key?: string;
  api_url?: string;
  api_key?: string;
  created_at: string;
}

interface DbConversation {
  id: string;
  organization_id: string;
  external_conversation_id: string;
  guest_name?: string;
  guest_phone?: string;
  last_message?: unknown;
  last_message_at?: string;
  unread_count?: number;
  category?: string;
  is_pinned?: boolean;
  instance_id?: string;
}

interface DbMessage {
  id: string;
  conversation_id: string;
  content?: string;
  direction?: string;
  sent_at: string;
  status?: string;
  media_type?: string;
  media_url?: string;
}

// ===================================================
// HELPERS
// ===================================================

function getOrganizationId(): string | null {
  try {
    const userJson = localStorage.getItem('rendizy-user');
    if (userJson) {
      const user = JSON.parse(userJson);
      return user.organizationId || null;
    }
  } catch {
    // Ignore
  }
  return null;
}

function extractLastMessage(lastMessage: unknown): string {
  if (!lastMessage) return '';
  if (typeof lastMessage === 'string') return lastMessage;
  if (typeof lastMessage === 'object') {
    const msg = lastMessage as Record<string, unknown>;
    return (msg.message as string) || (msg.text as string) || (msg.content as string) || '';
  }
  return '';
}

function mapMessageStatus(status: string | null): UnifiedMessage['status'] {
  if (!status) return 'sent';
  const statusLower = status.toLowerCase();
  if (statusLower === 'delivered' || statusLower === 'server_ack') return 'delivered';
  if (statusLower === 'read' || statusLower === 'read_ack') return 'read';
  if (statusLower === 'pending') return 'pending';
  if (statusLower === 'failed' || statusLower === 'error') return 'failed';
  return 'sent';
}

// ===================================================
// CÁPSULA 1: DETECT PROVIDER
// ===================================================

export async function detectProvider(): Promise<{ provider: ChannelProvider; instance: ProviderInstance | null }> {
  const organizationId = getOrganizationId();
  
  if (!organizationId) {
    console.warn('[chatUnifiedApi] ⚠️ No organization ID found');
    return { provider: 'unknown', instance: null };
  }
  
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('channel_instances')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('channel', 'whatsapp')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[chatUnifiedApi] ❌ Error fetching instances:', error);
      return { provider: 'unknown', instance: null };
    }
    
    const instances = data as DbChannelInstance[] | null;
    
    if (!instances || instances.length === 0) {
      console.log('[chatUnifiedApi] ℹ️ No WhatsApp instances configured');
      return { provider: 'unknown', instance: null };
    }
    
    const connectedInstance = instances.find(i => i.status === 'connected');
    const activeInstance = connectedInstance || instances[0];
    const provider = (activeInstance.provider as ChannelProvider) || 'unknown';
    
    console.log(`[chatUnifiedApi] ✅ Detected provider: ${provider}, instance: ${activeInstance.instance_name}`);
    
    return {
      provider,
      instance: {
        id: activeInstance.id,
        instanceName: activeInstance.instance_name,
        provider,
        status: activeInstance.status,
        phoneNumber: activeInstance.phone_number,
        wahaBaseUrl: activeInstance.waha_base_url || activeInstance.api_url || import.meta.env.VITE_WAHA_API_URL,
        wahaApiKey: activeInstance.waha_api_key || activeInstance.api_key || import.meta.env.VITE_WAHA_API_KEY,
        evolutionBaseUrl: activeInstance.evolution_base_url || activeInstance.api_url,
        evolutionApiKey: activeInstance.evolution_api_key || activeInstance.api_key,
      }
    };
  } catch (error) {
    console.error('[chatUnifiedApi] ❌ Exception:', error);
    return { provider: 'unknown', instance: null };
  }
}

// ===================================================
// CÁPSULA 2: FETCH CONVERSATIONS
// ===================================================

export async function fetchConversations(): Promise<UnifiedConversation[]> {
  const organizationId = getOrganizationId();
  
  if (!organizationId) {
    console.warn('[chatUnifiedApi] ⚠️ No organization ID');
    return [];
  }
  
  try {
    const supabase = getSupabaseClient();
    const { provider } = await detectProvider();
    
    console.log(`[chatUnifiedApi] 📥 Fetching conversations for provider: ${provider}`);
    
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('is_pinned', { ascending: false })
      .order('last_message_at', { ascending: false });

    let conversationsData = data;
    if (error) {
      console.warn('[chatUnifiedApi] ⚠️ Query com is_pinned falhou, usando fallback:', error);
      const fallback = await supabase
        .from('conversations')
        .select('*')
        .eq('organization_id', organizationId)
        .order('last_message_at', { ascending: false });
      conversationsData = fallback.data;
    }
    
    const conversations = conversationsData as DbConversation[] | null;
    
    if (!conversations || conversations.length === 0) {
      console.log('[chatUnifiedApi] ℹ️ No conversations found');
      return [];
    }
    
    console.log(`[chatUnifiedApi] ✅ Found ${conversations.length} conversations`);
    
    return conversations.map(conv => ({
      id: conv.id,
      externalId: conv.external_conversation_id || '',
      contactName: conv.guest_name || 'Contato',
      contactPhone: conv.guest_phone || '',
      lastMessage: extractLastMessage(conv.last_message),
      lastMessageAt: conv.last_message_at ? new Date(conv.last_message_at) : null,
      unreadCount: conv.unread_count || 0,
      category: conv.is_pinned ? 'pinned' : ((conv.unread_count || 0) > 0 ? 'unread' : 'normal'),
      isPinned: conv.is_pinned || false,
      provider,
      instanceId: conv.instance_id || null,
    }));
  } catch (error) {
    console.error('[chatUnifiedApi] ❌ Exception:', error);
    return [];
  }
}

// ===================================================
// CÁPSULA 3: FETCH MESSAGES
// ===================================================

export async function fetchMessages(conversationId: string): Promise<UnifiedMessage[]> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: true });
    
    if (error) {
      console.error('[chatUnifiedApi] ❌ Error fetching messages:', error);
      return [];
    }
    
    const messages = data as DbMessage[] | null;
    if (!messages) return [];
    
    return messages.map(msg => ({
      id: msg.id,
      conversationId: msg.conversation_id,
      content: msg.content || '',
      fromMe: msg.direction === 'outbound',
      timestamp: new Date(msg.sent_at),
      status: mapMessageStatus(msg.status || null),
      mediaType: (msg.media_type as UnifiedMessage['mediaType']) || 'text',
      mediaUrl: msg.media_url,
    }));
  } catch (error) {
    console.error('[chatUnifiedApi] ❌ Exception:', error);
    return [];
  }
}

// ===================================================
// CÁPSULA 4: SEND MESSAGE
// ===================================================

export type MediaType = 'text' | 'image' | 'video' | 'audio' | 'document';

export interface SendMessageOptions {
  mediaUrl?: string;
  mediaType?: MediaType;
  caption?: string;
}

export async function sendMessage(
  conversationId: string,
  content: string,
  options?: SendMessageOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { provider, instance } = await detectProvider();
  
  if (!instance) {
    return { success: false, error: 'No WhatsApp instance configured' };
  }
  
  console.log(`[chatUnifiedApi] 📤 Sending message via ${provider}`, {
    hasMedia: !!options?.mediaUrl,
    mediaType: options?.mediaType,
  });
  
  if (provider === 'waha') {
    return await sendMessageViaWaha(instance, conversationId, content, options);
  } else if (provider === 'evolution') {
    return await sendMessageViaEvolution(instance, conversationId, content, options);
  }
  
  return { success: false, error: 'Unknown provider' };
}

async function sendMessageViaWaha(
  instance: ProviderInstance,
  conversationId: string,
  content: string,
  options?: SendMessageOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('conversations')
      .select('external_conversation_id')
      .eq('id', conversationId)
      .single();
    
    const conv = data as { external_conversation_id: string } | null;
    if (!conv?.external_conversation_id) {
      return { success: false, error: 'Conversation not found' };
    }
    
    const chatId = conv.external_conversation_id;
    const wahaUrl = instance.wahaBaseUrl || 'http://76.13.82.60:3001';
    const apiKey = instance.wahaApiKey || '';
    if (!apiKey) {
      return { success: false, error: 'WAHA API key não configurada. Configure em Configurações > WhatsApp' };
    }
    const sessionName = instance.instanceName || 'default';

    console.log('[chatUnifiedApi] 🔑 WAHA session:', sessionName, 'url:', wahaUrl);
    
    let response: Response;
    let messageContent = content;

    // Determinar endpoint baseado no tipo de mídia
    if (options?.mediaUrl && options?.mediaType && options.mediaType !== 'text') {
      const endpoint = getWahaMediaEndpoint(options.mediaType);
      console.log(`[chatUnifiedApi] 📎 Enviando mídia: ${options.mediaType} via ${endpoint}`);
      
      response = await fetch(`${wahaUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
        },
        body: JSON.stringify({
          session: sessionName,
          chatId,
          file: { url: options.mediaUrl },
          caption: options.caption || content || '',
        }),
      });
      
      messageContent = options.caption || content || `[${options.mediaType}]`;
    } else {
      // Mensagem de texto simples
      response = await fetch(`${wahaUrl}/api/sendText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
        },
        body: JSON.stringify({ session: sessionName, chatId, text: content }),
      });
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[chatUnifiedApi] ❌ WAHA send error:', errorText);
      return { success: false, error: `WAHA error: ${response.status} - ${errorText}` };
    }
    
    const result = await response.json();

    // Persistir mensagem no DB para histórico
    try {
      const organizationId = getOrganizationId();
      const now = new Date().toISOString();
      const externalId = result?.id || result?.messageId || null;

      if (organizationId) {
        const { error: insertError } = await supabase.from('messages').insert({
          organization_id: organizationId,
          conversation_id: conversationId,
          sender_type: 'staff',
          sender_name: 'system',
          sender_id: null,
          content: messageContent,
          channel: 'whatsapp',
          direction: 'outgoing',
          external_id: externalId,
          external_status: 'sent',
          sent_at: now,
          media_type: options?.mediaType || 'text',
          media_url: options?.mediaUrl || null,
          metadata: { provider: 'waha' },
        });

        if (insertError) {
          console.warn('[chatUnifiedApi] ⚠️ Falha ao inserir mensagem no DB:', insertError);
        }

        const { error: updateError } = await supabase
          .from('conversations')
          .update({
            last_message: messageContent.substring(0, 500),
            last_message_at: now,
          })
          .eq('id', conversationId);

        if (updateError) {
          console.warn('[chatUnifiedApi] ⚠️ Falha ao atualizar conversa:', updateError);
        }
      }
    } catch (persistError) {
      console.warn('[chatUnifiedApi] ⚠️ Falha ao persistir mensagem WAHA:', persistError);
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    console.error('[chatUnifiedApi] ❌ WAHA exception:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Retorna o endpoint WAHA correto para cada tipo de mídia
 */
function getWahaMediaEndpoint(mediaType: MediaType): string {
  switch (mediaType) {
    case 'image':
      return '/api/sendImage';
    case 'video':
      return '/api/sendVideo';
    case 'audio':
      return '/api/sendVoice';
    case 'document':
    default:
      return '/api/sendFile';
  }
}

async function sendMessageViaEvolution(
  instance: ProviderInstance,
  conversationId: string,
  content: string,
  options?: SendMessageOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('conversations')
      .select('external_conversation_id')
      .eq('id', conversationId)
      .single();
    
    const conv = data as { external_conversation_id: string } | null;
    if (!conv?.external_conversation_id) {
      return { success: false, error: 'Conversation not found' };
    }
    
    const remoteJid = conv.external_conversation_id;
    const evolutionUrl = instance.evolutionBaseUrl || 'http://76.13.82.60:8080';
    const instanceName = instance.instanceName;
    
    let response: Response;
    
    // Determinar endpoint baseado no tipo de mídia
    if (options?.mediaUrl && options?.mediaType && options.mediaType !== 'text') {
      const endpoint = getEvolutionMediaEndpoint(options.mediaType);
      console.log(`[chatUnifiedApi] 📎 Enviando mídia via Evolution: ${options.mediaType}`);
      
      response = await fetch(`${evolutionUrl}${endpoint}/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': instance.evolutionApiKey || '',
        },
        body: JSON.stringify({
          number: remoteJid,
          mediatype: options.mediaType,
          media: options.mediaUrl,
          caption: options.caption || content || '',
        }),
      });
    } else {
      response = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': instance.evolutionApiKey || '',
        },
        body: JSON.stringify({ number: remoteJid, text: content }),
      });
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[chatUnifiedApi] ❌ Evolution send error:', errorText);
      return { success: false, error: `Evolution error: ${response.status}` };
    }
    
    const result = await response.json();
    return { success: true, messageId: result.key?.id };
  } catch (error) {
    console.error('[chatUnifiedApi] ❌ Evolution exception:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Retorna o endpoint Evolution correto para cada tipo de mídia
 */
function getEvolutionMediaEndpoint(mediaType: MediaType): string {
  switch (mediaType) {
    case 'image':
      return '/message/sendMedia';
    case 'video':
      return '/message/sendMedia';
    case 'audio':
      return '/message/sendWhatsAppAudio';
    case 'document':
    default:
      return '/message/sendMedia';
  }
}

// ===================================================
// CÁPSULA 5: SYNC HISTORY (NOVO)
// ===================================================

/**
 * Sincroniza mensagens antigas do WAHA para o banco de dados
 * Aceita tanto conversationId (UUID) quanto telefone/chatId
 */
export async function syncConversationHistory(
  phoneOrConversationId: string,
  limit: number = 50
): Promise<{ success: boolean; syncedCount: number; error?: string }> {
  const { provider, instance } = await detectProvider();
  
  if (provider !== 'waha' || !instance) {
    return { success: false, syncedCount: 0, error: 'Sync only available for WAHA provider' };
  }
  
  const supabase = getSupabaseClient();
  const organizationId = getOrganizationId();
  
  if (!organizationId) {
    return { success: false, syncedCount: 0, error: 'Organization not found' };
  }
  
  // Determinar chatId e conversationId
  let chatId: string;
  let conversationId: string | null = null;
  
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(phoneOrConversationId);
  
  if (isUuid) {
    // É um UUID - buscar external_conversation_id
    conversationId = phoneOrConversationId;
    const { data: conv } = await supabase
      .from('conversations')
      .select('external_conversation_id')
      .eq('id', conversationId)
      .single();
    
    if (!conv?.external_conversation_id) {
      return { success: false, syncedCount: 0, error: 'Conversation not found' };
    }
    chatId = conv.external_conversation_id;
  } else {
    // É telefone/chatId
    const cleanPhone = phoneOrConversationId.replace(/\D/g, '');
    chatId = phoneOrConversationId.includes('@') ? phoneOrConversationId : `${cleanPhone}@c.us`;
    
    // Tentar encontrar conversationId existente
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('organization_id', organizationId)
      .or(`external_conversation_id.eq.${chatId},external_conversation_id.eq.${cleanPhone}`)
      .maybeSingle();
    
    conversationId = conv?.id || null;
  }
  const wahaUrl = instance.wahaBaseUrl || 'http://76.13.82.60:3001';
  const apiKey = instance.wahaApiKey || '';
  const sessionName = instance.instanceName || 'default';
  
  if (!apiKey) {
    return { success: false, syncedCount: 0, error: 'WAHA API key not configured' };
  }
  
  try {
    // Buscar mensagens do WAHA
    const response = await fetch(
      `${wahaUrl}/api/sessions/${sessionName}/chats/${encodeURIComponent(chatId)}/messages?limit=${limit}&downloadMedia=true`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
        },
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[chatUnifiedApi] ❌ WAHA fetch messages error:', errorText);
      return { success: false, syncedCount: 0, error: `Failed to fetch messages: ${response.status}` };
    }
    
    const messages = await response.json();
    
    if (!Array.isArray(messages)) {
      return { success: false, syncedCount: 0, error: 'Invalid response from WAHA' };
    }
    
    console.log(`[chatUnifiedApi] 📥 Sincronizando ${messages.length} mensagens`);
    
    // Se não temos conversationId, criar conversa
    if (!conversationId && messages.length > 0) {
      const firstMsg = messages[0];
      const contactPhone = chatId.includes('@') ? chatId.split('@')[0] : chatId;
      const contactName = firstMsg._data?.notifyName || firstMsg._data?.pushname || contactPhone;
      
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          organization_id: organizationId,
          external_conversation_id: chatId,
          guest_phone: contactPhone,
          guest_name: contactName,
          channel: 'whatsapp',
          status: 'active',
        })
        .select('id')
        .single();
      
      if (createError) {
        console.error('[chatUnifiedApi] ❌ Error creating conversation:', createError);
        return { success: false, syncedCount: 0, error: 'Failed to create conversation' };
      }
      
      conversationId = newConv?.id || null;
    }
    
    if (!conversationId) {
      return { success: false, syncedCount: 0, error: 'Could not resolve conversation' };
    }
    
    let synced = 0;
    
    for (const msg of messages) {
      // Verificar se já existe
      const { data: existing } = await supabase
        .from('messages')
        .select('id')
        .eq('external_id', msg.id)
        .maybeSingle();
      
      if (existing) continue;
      
      // Inserir mensagem
      const { error } = await supabase.from('messages').insert({
        organization_id: organizationId,
        conversation_id: conversationId,
        external_id: msg.id,
        content: msg.body || msg.caption || '',
        direction: msg.fromMe ? 'outbound' : 'inbound',
        sender_type: msg.fromMe ? 'staff' : 'guest',
        sender_name: msg._data?.notifyName || msg._data?.pushname || 'Contato',
        channel: 'whatsapp',
        media_type: msg.hasMedia ? (msg.type || 'document') : 'text',
        media_url: msg.mediaUrl || null,
        sent_at: msg.timestamp ? new Date(msg.timestamp * 1000).toISOString() : new Date().toISOString(),
        status: 'delivered',
        metadata: { provider: 'waha', from: msg.from, to: msg.to },
      });
      
      if (!error) synced++;
    }
    
    console.log(`[chatUnifiedApi] ✅ Sincronizado ${synced} mensagens`);
    return { success: true, syncedCount: synced };
  } catch (error) {
    console.error('[chatUnifiedApi] ❌ Sync exception:', error);
    return { success: false, syncedCount: 0, error: String(error) };
  }
}

// ===================================================
// RE-EXPORTS
// ===================================================

export { getOrganizationId };

// ===================================================
// CÁPSULA 6: SEND MEDIA (NOVO)
// ===================================================

export interface SendMediaOptions {
  type: MediaType;
  base64: string;
  filename: string;
  mimetype: string;
  caption?: string;
}

/**
 * Envia mídia (imagem, video, audio, documento) via WhatsApp
 * Suporta envio por telefone (sem precisar de conversationId do banco)
 */
export async function sendUnifiedMedia(
  phoneOrConversationId: string,
  options: SendMediaOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { provider, instance } = await detectProvider();
  
  if (!instance) {
    return { success: false, error: 'No WhatsApp instance configured' };
  }
  
  console.log(`[chatUnifiedApi] 📤 Sending media via ${provider}`, {
    type: options.type,
    filename: options.filename,
    hasCaption: !!options.caption,
  });
  
  // Determinar chatId
  let chatId = phoneOrConversationId;
  
  // Se for UUID, buscar external_conversation_id
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(phoneOrConversationId);
  if (isUuid) {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('conversations')
      .select('external_conversation_id')
      .eq('id', phoneOrConversationId)
      .single();
    
    const conv = data as { external_conversation_id: string } | null;
    if (!conv?.external_conversation_id) {
      return { success: false, error: 'Conversation not found' };
    }
    chatId = conv.external_conversation_id;
  } else {
    // É telefone - formatar como chatId
    const cleanPhone = phoneOrConversationId.replace(/\D/g, '');
    chatId = chatId.includes('@') ? chatId : `${cleanPhone}@c.us`;
  }
  
  if (provider === 'waha') {
    return await sendMediaViaWaha(instance, chatId, options);
  } else if (provider === 'evolution') {
    return await sendMediaViaEvolution(instance, chatId, options);
  }
  
  return { success: false, error: 'Unknown provider' };
}

async function sendMediaViaWaha(
  instance: ProviderInstance,
  chatId: string,
  options: SendMediaOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const wahaUrl = instance.wahaBaseUrl || 'http://76.13.82.60:3001';
  const apiKey = instance.wahaApiKey || '';
  const sessionName = instance.instanceName || 'default';
  
  if (!apiKey) {
    return { success: false, error: 'WAHA API key not configured' };
  }
  
  const endpoint = getWahaMediaEndpoint(options.type);
  
  try {
    const response = await fetch(`${wahaUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({
        session: sessionName,
        chatId,
        file: {
          mimetype: options.mimetype,
          filename: options.filename,
          data: options.base64,
        },
        caption: options.caption || '',
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[chatUnifiedApi] ❌ WAHA media error:', errorText);
      return { success: false, error: `WAHA error: ${response.status}` };
    }
    
    const result = await response.json();
    return { success: true, messageId: result?.id };
  } catch (error) {
    console.error('[chatUnifiedApi] ❌ WAHA media exception:', error);
    return { success: false, error: String(error) };
  }
}

async function sendMediaViaEvolution(
  instance: ProviderInstance,
  chatId: string,
  options: SendMediaOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const evolutionUrl = instance.evolutionBaseUrl || 'http://76.13.82.60:8080';
  const instanceName = instance.instanceName;
  
  // Evolution precisa do número sem @c.us
  const number = chatId.includes('@') ? chatId.split('@')[0] : chatId;
  
  try {
    const response = await fetch(`${evolutionUrl}/message/sendMedia/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': instance.evolutionApiKey || '',
      },
      body: JSON.stringify({
        number,
        mediatype: options.type,
        mimetype: options.mimetype,
        media: `data:${options.mimetype};base64,${options.base64}`,
        fileName: options.filename,
        caption: options.caption || '',
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[chatUnifiedApi] ❌ Evolution media error:', errorText);
      return { success: false, error: `Evolution error: ${response.status}` };
    }
    
    const result = await response.json();
    return { success: true, messageId: result.key?.id };
  } catch (error) {
    console.error('[chatUnifiedApi] ❌ Evolution media exception:', error);
    return { success: false, error: String(error) };
  }
}
