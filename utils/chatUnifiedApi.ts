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
      .eq('channel_type', 'whatsapp')
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
        wahaBaseUrl: activeInstance.waha_base_url,
        wahaApiKey: activeInstance.waha_api_key,
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
    
    if (error) {
      console.error('[chatUnifiedApi] ❌ Error fetching conversations:', error);
      return [];
    }
    
    const conversations = data as DbConversation[] | null;
    
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

export async function sendMessage(
  conversationId: string,
  content: string,
  options?: { mediaUrl?: string; mediaType?: string }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { provider, instance } = await detectProvider();
  
  if (!instance) {
    return { success: false, error: 'No WhatsApp instance configured' };
  }
  
  console.log(`[chatUnifiedApi] 📤 Sending message via ${provider}`);
  
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
  _options?: { mediaUrl?: string; mediaType?: string }
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
    const sessionName = instance.instanceName || 'default';
    
    const response = await fetch(`${wahaUrl}/api/sendText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': instance.wahaApiKey || '',
      },
      body: JSON.stringify({ session: sessionName, chatId, text: content }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[chatUnifiedApi] ❌ WAHA send error:', errorText);
      return { success: false, error: `WAHA error: ${response.status}` };
    }
    
    const result = await response.json();
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error('[chatUnifiedApi] ❌ WAHA exception:', error);
    return { success: false, error: String(error) };
  }
}

async function sendMessageViaEvolution(
  instance: ProviderInstance,
  conversationId: string,
  content: string,
  _options?: { mediaUrl?: string; mediaType?: string }
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
    
    const response = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': instance.evolutionApiKey || '',
      },
      body: JSON.stringify({ number: remoteJid, text: content }),
    });
    
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

// ===================================================
// RE-EXPORTS
// ===================================================

export { getOrganizationId };
