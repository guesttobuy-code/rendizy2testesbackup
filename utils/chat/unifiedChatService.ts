/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    UNIFIED CHAT SERVICE                                    ║
 * ║                                                                            ║
 * ║  Serviço unificado para buscar mensagens de qualquer provider             ║
 * ║  Suporta MÚLTIPLAS INSTÂNCIAS simultâneas (Evolution + WAHA)              ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * @version 2.1.0
 * @date 2026-01-24
 * @see ADR-010-CHAT-MULTI-PROVIDER-ARCHITECTURE.md
 * 
 * FEATURES v2.1.0:
 * - Suporte a múltiplas instâncias (Evolution + WAHA simultâneos)
 * - fetchAllChatsFromAllInstances() para agregar conversas
 * - Cada conversa sabe de qual instância veio
 * 
 * @example
 * ```typescript
 * import { fetchChatMessages, sendChatMessage, fetchAllChatsFromAllInstances } from './unifiedChatService';
 * 
 * // Buscar conversas de TODAS as instâncias conectadas
 * const allChats = await fetchAllChatsFromAllInstances();
 * 
 * // Enviar mensagem (auto-detecta provider pelo JID)
 * const result = await sendChatMessage('5521999887766', 'Olá!');
 * ```
 */

import { 
  getWhatsAppAdapter, 
  detectWhatsAppProvider, 
  getAllWhatsAppAdapters,
  getAdapterByProvider,
  type ActiveInstance,
} from './adapters';
import type {
  NormalizedWhatsAppMessage,
  NormalizedWhatsAppChat,
  SendMessageResult,
} from './adapters/types';

// ============================================================
// RE-EXPORT TYPES
// ============================================================

export type {
  NormalizedWhatsAppMessage,
  NormalizedWhatsAppChat,
  SendMessageResult,
};

// Alias para hooks usarem tipo mais simples
export interface NormalizedMessage {
  id: string;
  text: string;
  fromMe: boolean;
  timestamp: number;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  mediaType?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location';
  mediaUrl?: string;
}

// Extended chat with instance info
export interface ChatWithInstance extends NormalizedWhatsAppChat {
  instanceId?: string;
  provider?: 'evolution' | 'waha';
  phoneNumber?: string; // Phone of the WhatsApp instance (our number)
}

// ============================================================
// MULTI-INSTANCE FUNCTIONS (v2.1.0)
// ============================================================

/**
 * Busca conversas de TODAS as instâncias WhatsApp conectadas
 * Útil quando há múltiplos números conectados (ex: Evolution + WAHA)
 * 
 * @param limit - Limite de chats por instância
 * @returns Lista de chats de todas as instâncias, com metadados
 */
export async function fetchAllChatsFromAllInstances(
  limit = 50
): Promise<ChatWithInstance[]> {
  console.log('[UnifiedChatService] 📥 fetchAllChatsFromAllInstances');
  
  const instances = await getAllWhatsAppAdapters();
  
  if (instances.length === 0) {
    console.warn('[UnifiedChatService] ⚠️ No WhatsApp instances available');
    return [];
  }
  
  console.log(`[UnifiedChatService] 🔌 Found ${instances.length} active instances`);
  
  const allChats: ChatWithInstance[] = [];
  
  // Buscar de todas as instâncias em paralelo
  const results = await Promise.allSettled(
    instances.map(async (inst) => {
      try {
        const chats = await inst.adapter.fetchChats(limit);
        return { instance: inst, chats };
      } catch (error) {
        console.error(`[UnifiedChatService] ❌ Error fetching from ${inst.provider}:`, error);
        return { instance: inst, chats: [] };
      }
    })
  );
  
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.chats.length > 0) {
      const { instance, chats } = result.value;
      
      for (const chat of chats) {
        allChats.push({
          ...chat,
          instanceId: instance.instanceId,
          provider: instance.provider,
          phoneNumber: instance.phoneNumber,
        });
      }
      
      console.log(`[UnifiedChatService] ✅ ${instance.provider}: ${chats.length} chats`);
    }
  }
  
  // Ordenar por última mensagem (mais recente primeiro)
  allChats.sort((a, b) => {
    const aTime = a.lastMessage?.timestamp || 0;
    const bTime = b.lastMessage?.timestamp || 0;
    return bTime - aTime;
  });
  
  console.log(`[UnifiedChatService] 📊 Total chats from all instances: ${allChats.length}`);
  
  return allChats;
}

/**
 * Obtém lista de instâncias ativas
 */
export async function getActiveInstances(): Promise<ActiveInstance[]> {
  return getAllWhatsAppAdapters();
}

// ============================================================
// UNIFIED FUNCTIONS
// ============================================================

/**
 * Busca mensagens de um chat WhatsApp
 * Auto-detecta se deve usar Evolution ou WAHA baseado no formato do JID
 * 
 * @param chatId - JID ou número de telefone
 * @param limit - Limite de mensagens (default: 50)
 * @param preferredProvider - Forçar provider específico (opcional)
 * @returns Lista de mensagens normalizadas
 */
export async function fetchChatMessages(
  chatId: string,
  limit = 50,
  preferredProvider?: 'evolution' | 'waha'
): Promise<NormalizedWhatsAppMessage[]> {
  console.log(`[UnifiedChatService] 📥 fetchChatMessages: ${chatId}`);
  
  // Se preferiu provider específico, usar ele
  let adapter = preferredProvider 
    ? await getAdapterByProvider(preferredProvider)
    : await getWhatsAppAdapter();
  
  // Se não achou pelo preferido, tentar detectar pelo JID
  if (!adapter && !preferredProvider) {
    // Tentar detectar pelo formato do JID
    if (chatId.includes('@s.whatsapp.net')) {
      adapter = await getAdapterByProvider('evolution');
    } else if (chatId.includes('@c.us')) {
      adapter = await getAdapterByProvider('waha');
    }
  }
  
  // Se ainda não tem, tentar qualquer um disponível
  if (!adapter) {
    const all = await getAllWhatsAppAdapters();
    adapter = all[0]?.adapter || null;
  }
  
  if (!adapter) {
    console.warn('[UnifiedChatService] ⚠️ No WhatsApp adapter available');
    return [];
  }
  
  console.log(`[UnifiedChatService] 🔌 Using adapter: ${adapter.displayName}`);
  
  try {
    const messages = await adapter.fetchMessages(chatId, limit);
    console.log(`[UnifiedChatService] ✅ Got ${messages.length} messages`);
    return messages;
  } catch (error) {
    console.error('[UnifiedChatService] ❌ Error fetching messages:', error);
    return [];
  }
}

/**
 * ✅ v2.5.0: Busca mensagens para polling - retorna formato simplificado
 * Usado pelo hook useChatPolling
 * 
 * @param chatId - JID do chat
 * @param limit - Limite de mensagens
 * @returns Lista de mensagens normalizadas
 */
export async function fetchMessagesForChat(
  chatId: string,
  limit = 20
): Promise<NormalizedMessage[]> {
  const messages = await fetchChatMessages(chatId, limit);
  
  return messages.map(msg => ({
    id: msg.id,
    text: msg.text || '',
    fromMe: msg.fromMe,
    timestamp: msg.timestamp,
    status: msg.status,
    mediaType: msg.mediaType,
    mediaUrl: msg.mediaUrl,
  }));
}

/**
 * Busca lista de chats/conversas WhatsApp
 * Para múltiplas instâncias, use fetchAllChatsFromAllInstances()
 * 
 * @param limit - Limite de chats (default: 50)
 * @returns Lista de chats normalizados
 */
export async function fetchChatList(
  limit = 50
): Promise<NormalizedWhatsAppChat[]> {
  console.log('[UnifiedChatService] 📥 fetchChatList');
  
  const adapter = await getWhatsAppAdapter();
  
  if (!adapter) {
    console.warn('[UnifiedChatService] ⚠️ No WhatsApp adapter available');
    return [];
  }
  
  try {
    const chats = await adapter.fetchChats(limit);
    console.log(`[UnifiedChatService] ✅ Got ${chats.length} chats`);
    return chats;
  } catch (error) {
    console.error('[UnifiedChatService] ❌ Error fetching chats:', error);
    return [];
  }
}

/**
 * Envia mensagem de texto
 * Auto-detecta provider ou usa o especificado
 * 
 * @param chatId - JID ou número de telefone
 * @param text - Texto da mensagem
 * @param preferredProvider - Forçar provider específico (opcional)
 * @returns Resultado do envio
 */
export async function sendChatMessage(
  chatId: string,
  text: string,
  preferredProvider?: 'evolution' | 'waha'
): Promise<SendMessageResult> {
  console.log(`[UnifiedChatService] 📤 sendChatMessage to: ${chatId}`);
  
  // Se preferiu provider específico, usar ele
  let adapter = preferredProvider 
    ? await getAdapterByProvider(preferredProvider)
    : await getWhatsAppAdapter();
  
  // Se não achou pelo preferido, tentar detectar pelo JID
  if (!adapter && !preferredProvider) {
    if (chatId.includes('@s.whatsapp.net')) {
      adapter = await getAdapterByProvider('evolution');
    } else if (chatId.includes('@c.us')) {
      adapter = await getAdapterByProvider('waha');
    }
  }
  
  // Se ainda não tem, tentar qualquer um disponível
  if (!adapter) {
    const all = await getAllWhatsAppAdapters();
    adapter = all[0]?.adapter || null;
  }
  
  if (!adapter) {
    return {
      success: false,
      error: 'Nenhum provedor WhatsApp configurado',
    };
  }
  
  console.log(`[UnifiedChatService] 🔌 Using adapter: ${adapter.displayName}`);
  
  try {
    const result = await adapter.sendText(chatId, text);
    console.log(`[UnifiedChatService] ✅ Message sent: ${result.success}`);
    return result;
  } catch (error) {
    console.error('[UnifiedChatService] ❌ Error sending message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Envia mídia (imagem, vídeo, áudio, documento)
 * Auto-detecta provider ou usa o especificado
 * 
 * @param chatId - JID ou número de telefone
 * @param mediaUrl - URL pública da mídia
 * @param mediaType - Tipo de mídia
 * @param caption - Legenda opcional
 * @param preferredProvider - Forçar provider específico (opcional)
 * @returns Resultado do envio
 */
export async function sendChatMedia(
  chatId: string,
  mediaUrl: string,
  mediaType: 'image' | 'video' | 'audio' | 'document',
  caption?: string,
  preferredProvider?: 'evolution' | 'waha'
): Promise<SendMessageResult> {
  console.log(`[UnifiedChatService] 📤 sendChatMedia (${mediaType}) to: ${chatId}`);
  
  // Se preferiu provider específico, usar ele
  let adapter = preferredProvider 
    ? await getAdapterByProvider(preferredProvider)
    : await getWhatsAppAdapter();
  
  // Se não achou pelo preferido, tentar detectar pelo JID
  if (!adapter && !preferredProvider) {
    if (chatId.includes('@s.whatsapp.net')) {
      adapter = await getAdapterByProvider('evolution');
    } else if (chatId.includes('@c.us')) {
      adapter = await getAdapterByProvider('waha');
    }
  }
  
  // Se ainda não tem, tentar qualquer um disponível
  if (!adapter) {
    const all = await getAllWhatsAppAdapters();
    adapter = all[0]?.adapter || null;
  }
  
  if (!adapter) {
    return {
      success: false,
      error: 'Nenhum provedor WhatsApp configurado',
    };
  }
  
  console.log(`[UnifiedChatService] 🔌 Using adapter: ${adapter.displayName}`);
  
  try {
    const result = await adapter.sendMedia(chatId, mediaUrl, mediaType, caption);
    console.log(`[UnifiedChatService] ✅ Media sent: ${result.success}`);
    return result;
  } catch (error) {
    console.error('[UnifiedChatService] ❌ Error sending media:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Marca mensagens como lidas
 * 
 * @param chatId - JID ou número de telefone
 * @param messageIds - IDs das mensagens (opcional)
 */
export async function markChatAsRead(
  chatId: string,
  messageIds?: string[]
): Promise<void> {
  console.log(`[UnifiedChatService] ✅ markChatAsRead: ${chatId}`);
  
  const adapter = await getWhatsAppAdapter();
  
  if (!adapter) {
    console.warn('[UnifiedChatService] ⚠️ No adapter to mark as read');
    return;
  }
  
  try {
    await adapter.markAsRead(chatId, messageIds);
  } catch (error) {
    console.error('[UnifiedChatService] ❌ Error marking as read:', error);
  }
}

/**
 * Verifica status da conexão WhatsApp
 * 
 * @returns true se pelo menos uma instância está conectada
 */
export async function isWhatsAppConnected(): Promise<boolean> {
  const instances = await getAllWhatsAppAdapters();
  
  if (instances.length === 0) {
    return false;
  }
  
  // Verificar se pelo menos uma está conectada
  for (const inst of instances) {
    try {
      const connected = await inst.adapter.isConnected();
      if (connected) return true;
    } catch (error) {
      console.error(`[UnifiedChatService] ❌ Error checking ${inst.provider}:`, error);
    }
  }
  
  return false;
}

/**
 * Verifica status de TODAS as conexões WhatsApp
 * 
 * @returns Mapa de provider -> status de conexão
 */
export async function getAllConnectionStatus(): Promise<Map<string, boolean>> {
  const instances = await getAllWhatsAppAdapters();
  const status = new Map<string, boolean>();
  
  for (const inst of instances) {
    try {
      const connected = await inst.adapter.isConnected();
      status.set(inst.instanceId, connected);
    } catch (error) {
      status.set(inst.instanceId, false);
    }
  }
  
  return status;
}

/**
 * Obtém informações do provider atual
 */
export async function getActiveProvider(): Promise<{
  provider: 'evolution' | 'waha' | 'unknown';
  instanceName: string | null;
  status: string;
}> {
  const detected = await detectWhatsAppProvider();
  
  return {
    provider: detected.provider,
    instanceName: detected.config?.instanceName || null,
    status: detected.status,
  };
}

/**
 * Normaliza JID para o formato do provider atual
 * Útil quando você tem um número e precisa do JID correto
 * 
 * @param input - Número ou JID em qualquer formato
 * @returns JID no formato correto para o provider atual
 */
export async function normalizeJidForCurrentProvider(
  input: string
): Promise<string> {
  const adapter = await getWhatsAppAdapter();
  
  if (!adapter) {
    // Fallback para Evolution format
    const cleanNumber = input.replace(/\D/g, '');
    return `${cleanNumber}@s.whatsapp.net`;
  }
  
  return adapter.normalizeJid(input);
}

/**
 * Extrai número de telefone de qualquer formato de JID
 * 
 * @param jid - JID em qualquer formato
 * @returns Número limpo
 */
export function extractPhoneFromJid(jid: string): string {
  return jid
    .replace('@s.whatsapp.net', '')
    .replace('@c.us', '')
    .replace('@g.us', '')
    .replace('@lid', '')
    .replace(/\D/g, '');
}
