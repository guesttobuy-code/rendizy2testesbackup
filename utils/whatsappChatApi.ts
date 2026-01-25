/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                       WHATSAPP CHAT API                                    ║
 * ║                                                                            ║
 * ║  🔒 ZONA_CRITICA_CHAT - NÃO MODIFICAR SEM REVISAR ADR-007                 ║
 * ║  ⚠️  WAHA_INTEGRATION - Comunicação direta com WAHA API                   ║
 * ║  🔑 API_KEY_REQUIRED - Todas as chamadas precisam de X-Api-Key            ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Camada de API para comunicação com WAHA (WhatsApp HTTP API).
 * 
 * @version 2.0.8
 * @date 2026-01-24
 * @see /docs/adr/ADR-007-CHAT-MODULE-WAHA-INTEGRATION.md
 * 
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ ENDPOINTS WAHA UTILIZADOS:                                      │
 * │                                                                 │
 * │ GET  /api/{session}/chats                    → Lista conversas  │
 * │ GET  /api/{session}/chats/{chatId}/messages  → Lista mensagens  │
 * │ POST /api/sendText                           → Envia texto      │
 * │ POST /api/sendImage                          → Envia imagem     │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * ⚠️ LIMITAÇÕES DO WAHA CORE (versão gratuita):
 * - Mídia: Só retorna thumbnails Base64 (~700-800 bytes)
 * - URLs de mídia requerem API Key no header
 * - Browsers não conseguem enviar headers em <img src>
 * 
 * SOLUÇÃO: Usar Base64 thumbnail quando disponível em _data.body
 * 
 * CHANGELOG:
 * - v2.0.8 (2026-01-24): Base64 thumbnails como solução para mídia
 * - v2.0.5 (2026-01-24): Formato correto do chatId para WAHA
 * - v2.0.3 (2026-01-24): Fallback direto para WAHA quando backend offline
 * 
 * CONFIGURAÇÃO:
 * - WAHA_API_URL: http://76.13.82.60:3001
 * - WAHA_API_KEY: rendizy-waha-secret-2026
 * - WAHA_SESSION: default
 */

import { projectId, publicAnonKey } from './supabase/info';
import { fetchChatMessages as fetchEvolutionMessages } from './chat/unifiedChatService';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/rendizy-server`;

// ✅ v2.0.3: WAHA Direct API Config (fallback quando backend offline)
const WAHA_API_URL = import.meta.env.VITE_WAHA_API_URL || 'http://76.13.82.60:3001';
const WAHA_API_KEY = import.meta.env.VITE_WAHA_API_KEY || 'rendizy-waha-secret-2026';
const WAHA_SESSION = 'default';

/**
 * Obtém o organizationId do localStorage (cache do AuthContext)
 * Usado como fallback quando sessão expira mas usuário ainda está "logado" localmente
 */
function getCachedOrganizationId(): string | null {
  try {
    const userJson = localStorage.getItem('rendizy-user');
    if (userJson) {
      const user = JSON.parse(userJson);
      return user.organizationId || null;
    }
  } catch {
    // Ignorar erro de parse
  }
  return null;
}

/**
 * Cria headers padrão para requisições à API
 * Inclui token de autenticação e organizationId como fallback
 */
function getApiHeaders(): HeadersInit {
  const token = localStorage.getItem('rendizy-token');
  const orgId = getCachedOrganizationId();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`, // Necessário para Supabase
  };
  
  if (token) {
    (headers as Record<string, string>)['X-Auth-Token'] = token;
  }
  
  // ✅ v2.0.2: Enviar organizationId como header de fallback
  if (orgId) {
    (headers as Record<string, string>)['x-organization-id'] = orgId;
  }
  
  return headers;
}

export interface WhatsAppStatus {
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'ERROR';
  state?: string;
  message?: string;
}

/**
 * Verificar status da conexão WhatsApp
 */
export async function fetchWhatsAppStatus(): Promise<WhatsAppStatus> {
  try {
    const token = localStorage.getItem('rendizy-token');
    
    if (!token) {
      console.error('[WhatsApp Chat API] ❌ Token não encontrado - usuário não autenticado');
      return { status: 'ERROR', message: 'Usuário não autenticado' };
    }

    console.log('[WhatsApp Chat API] 🔍 Verificando status da conexão WhatsApp...');

    const response = await fetch(`${BASE_URL}/whatsapp/status`, {
      method: 'GET',
      headers: getApiHeaders()
    });

    console.log('[WhatsApp Chat API] 📡 Status response:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[WhatsApp Chat API] ❌ Erro ao verificar status:', errorText);
      return { status: 'ERROR', message: 'Erro ao verificar status' };
    }

    const result = await response.json();
    console.log('[WhatsApp Chat API] 📊 Status recebido:', result);

    if (result.success && result.data) {
      const status = result.data.status || 'DISCONNECTED';
      return {
        status: status as WhatsAppStatus['status'],
        state: result.data.state,
        message: result.data.message
      };
    }

    return { status: 'ERROR', message: 'Resposta inválida do servidor' };
  } catch (error) {
    console.error('[WhatsApp Chat API] ❌ Erro:', error);
    return { status: 'ERROR', message: 'Erro ao verificar status' };
  }
}

/**
 * Interface de Chat do WhatsApp
 * Reflete estrutura da Evolution API v2
 */
interface WhatsAppChat {
  id: string;           // ID interno do banco
  remoteJid?: string;   // JID do WhatsApp (ex: 5521999887766@s.whatsapp.net)
  name?: string;        // Nome salvo na agenda
  pushName?: string;    // Nome do perfil WhatsApp
  profilePictureUrl?: string;
  profilePicUrl?: string;
  lastMessageTimestamp?: number;
  updatedAt?: string;   // Timestamp ISO
  unreadCount?: number;
  lastMessage?: {
    fromMe: boolean;
    message: string;
  };
}

interface WhatsAppMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message?: {
    conversation?: string;
    extendedTextMessage?: {
      text: string;
    };
    imageMessage?: any;
    videoMessage?: any;
    audioMessage?: any;
    documentMessage?: any;
  };
  messageTimestamp: number;
  pushName?: string;
  status?: string;
}

/**
 * Buscar todas as conversas do WhatsApp
 * v2.0.3: Fallback direto para WAHA quando backend offline
 */
export async function fetchWhatsAppChats(): Promise<WhatsAppChat[]> {
  try {
    const token = localStorage.getItem('rendizy-token');
    
    if (!token) {
      console.error('[WhatsApp Chat API] ❌ Token não encontrado - usuário não autenticado');
      return [];
    }
    
    console.log('[WhatsApp Chat API] 📥 Buscando conversas...');
    
    // Tentar backend primeiro
    try {
      const response = await fetch(`${BASE_URL}/whatsapp/chats`, {
        method: 'GET',
        headers: getApiHeaders(),
      });

      if (response.ok) {
        const result = await response.json();
        const backendChats = result.data || [];
        console.log('[WhatsApp Chat API] ✅ Conversas via backend:', backendChats.length);
        
        // ✅ v2.0.5: Se backend retornou 0 conversas, usar WAHA direto
        if (backendChats.length === 0) {
          console.warn('[WhatsApp Chat API] ⚠️ Backend retornou 0 conversas, usando WAHA direto...');
          return await fetchWhatsAppChatsDirect();
        }
        
        return backendChats;
      }
      
      // Se backend falhou, tentar WAHA direto
      console.warn('[WhatsApp Chat API] ⚠️ Backend offline, tentando WAHA direto...');
    } catch (backendError) {
      console.warn('[WhatsApp Chat API] ⚠️ Backend não disponível:', backendError);
    }
    
    // ✅ v2.0.3: FALLBACK - Buscar direto do WAHA
    return await fetchWhatsAppChatsDirect();
  } catch (error) {
    console.error('[WhatsApp Chat API] ❌ Erro:', error);
    return [];
  }
}

/**
 * v2.0.3: Busca DIRETA do WAHA (sem passar pelo backend)
 */
async function fetchWhatsAppChatsDirect(): Promise<WhatsAppChat[]> {
  try {
    console.log('[WhatsApp Chat API] 🔄 Buscando direto do WAHA:', WAHA_API_URL);
    
    const response = await fetch(`${WAHA_API_URL}/api/${WAHA_SESSION}/chats`, {
      method: 'GET',
      headers: {
        'X-Api-Key': WAHA_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[WhatsApp Chat API] ❌ WAHA retornou erro:', response.status);
      return [];
    }

    const chats = await response.json();
    console.log('[WhatsApp Chat API] ✅ Chats WAHA direto:', chats?.length || 0);
    
    // Converter formato WAHA para o formato esperado
    return (chats || []).map((chat: any) => ({
      id: chat.id,
      remoteJid: chat.id,
      name: chat.name || chat.pushName,
      pushName: chat.pushName,
      profilePictureUrl: chat.picture,
      lastMessageTimestamp: chat.timestamp,
      unreadCount: chat.unreadCount || 0,
      lastMessage: chat.lastMessage ? {
        fromMe: chat.lastMessage.fromMe || false,
        message: chat.lastMessage.body || chat.lastMessage.text || '',
      } : undefined,
    }));
  } catch (error) {
    console.error('[WhatsApp Chat API] ❌ Erro ao buscar do WAHA direto:', error);
    return [];
  }
}

/**
 * Buscar mensagens de uma conversa específica
 * v2.0.5: Fallback direto para WAHA quando backend offline ou retorna 0 mensagens
 * v2.6.0: Suporte a Evolution API via unifiedChatService
 * v2.8.0: Aumentar limit default para 100 (WAHA suporta até ~155 mensagens)
 */
export async function fetchWhatsAppMessages(chatId: string, limit: number = 100): Promise<WhatsAppMessage[]> {
  try {
    const token = localStorage.getItem('rendizy-token');
    
    if (!token) {
      console.error('[WhatsApp Chat API] ❌ Token não encontrado - usuário não autenticado');
      return [];
    }
    
    // ✅ v2.6.0: Detectar provider pelo formato do JID
    const isEvolution = chatId.includes('@s.whatsapp.net');
    const isWaha = chatId.includes('@c.us') || chatId.includes('@lid');
    
    // ✅ v2.6.0: Se for Evolution, usar o adapter diretamente
    if (isEvolution) {
      console.log('[WhatsApp Chat API] 📥 Detectado Evolution, usando unifiedChatService para:', chatId);
      try {
        const messages = await fetchEvolutionMessages(chatId, limit);
        console.log('[WhatsApp Chat API] ✅ Mensagens via Evolution:', messages.length);
        if (messages.length > 0) {
          console.log('[WhatsApp Chat API] 📦 Primeira msg Evolution:', messages[0]?.id, messages[0]?.text?.substring(0, 30));
        }
        // Converter para formato WhatsAppMessage
        return messages.map((msg: any) => ({
          key: { id: msg.id, fromMe: msg.fromMe, remoteJid: msg.remoteJid },
          id: msg.id,
          body: msg.text,
          message: { conversation: msg.text },
          messageTimestamp: msg.timestamp,
          fromMe: msg.fromMe,
          hasMedia: msg.mediaType && msg.mediaType !== 'text',
          type: msg.mediaType || 'text',
          media: msg.mediaUrl ? { url: msg.mediaUrl, mimetype: msg.mediaMimetype } : undefined,
        }));
      } catch (evoError) {
        console.error('[WhatsApp Chat API] ❌ Erro Evolution:', evoError);
        return [];
      }
    }
    
    // ✅ v2.0.5: Garantir formato correto do chatId para WAHA
    let wahaChatId = chatId;
    if (!chatId.includes('@')) {
      // Se for apenas número, adicionar sufixo WAHA
      const cleanNumber = chatId.replace(/\D/g, '');
      wahaChatId = `${cleanNumber}@c.us`;
    }
    
    console.log('[WhatsApp Chat API] 📥 Buscando mensagens WAHA:', wahaChatId);
    
    // Tentar backend primeiro
    try {
      const response = await fetch(`${BASE_URL}/whatsapp/messages/${encodeURIComponent(wahaChatId)}?limit=${limit}`, {
        method: 'GET',
        headers: getApiHeaders(),
      });

      if (response.ok) {
        const result = await response.json();
        const backendMessages = result.data || [];
        console.log('[WhatsApp Chat API] ✅ Mensagens via backend:', backendMessages.length);
        
        // ✅ v2.0.5: Se backend retornou 0 mensagens, usar WAHA direto
        if (backendMessages.length === 0) {
          console.warn('[WhatsApp Chat API] ⚠️ Backend retornou 0 mensagens, usando WAHA direto...');
          return await fetchWhatsAppMessagesDirect(wahaChatId, limit);
        }
        
        return backendMessages;
      }
      
      console.warn('[WhatsApp Chat API] ⚠️ Backend offline para mensagens, tentando WAHA direto...');
    } catch (backendError) {
      console.warn('[WhatsApp Chat API] ⚠️ Backend não disponível:', backendError);
    }
    
    // ✅ v2.0.3: FALLBACK - Buscar direto do WAHA
    return await fetchWhatsAppMessagesDirect(wahaChatId, limit);
  } catch (error) {
    console.error('[WhatsApp Chat API] ❌ Erro:', error);
    return [];
  }
}

/**
 * v2.0.7: Busca mensagens DIRETA do WAHA (sem passar pelo backend)
 * SOLUÇÃO: Usa Base64 thumbnail que vem em _data.body (funciona imediatamente no navegador)
 * O WAHA exige API Key para baixar arquivos, então URLs diretas não funcionam no browser
 */
async function fetchWhatsAppMessagesDirect(chatId: string, limit: number = 50): Promise<WhatsAppMessage[]> {
  try {
    console.log('[WhatsApp Chat API] 🔄 Buscando mensagens direto do WAHA:', chatId);
    
    const response = await fetch(`${WAHA_API_URL}/api/${WAHA_SESSION}/chats/${encodeURIComponent(chatId)}/messages?limit=${limit}&downloadMedia=true`, {
      method: 'GET',
      headers: {
        'X-Api-Key': WAHA_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[WhatsApp Chat API] ❌ WAHA mensagens retornou erro:', response.status);
      return [];
    }

    const messages = await response.json();
    console.log('[WhatsApp Chat API] ✅ Mensagens WAHA direto:', messages?.length || 0);
    
    // Converter formato WAHA para o formato esperado
    return (messages || []).map((msg: any) => {
      // ✅ v2.0.8: Usar Base64 thumbnail como ÚNICA solução confiável
      // URLs do WAHA requerem API Key no header, browsers não conseguem enviar isso em <img src>
      // Base64 funciona diretamente no navegador sem necessidade de proxy
      let mediaUrl: string | null = null;
      
      const mimetype = msg.media?.mimetype || msg._data?.mimetype || '';
      const base64Body = msg._data?.body || null;
      const dataType = msg._data?.type || '';
      
      // ✅ v2.0.8: Sempre usar Base64 - é o único método que funciona sem backend proxy
      if (msg.hasMedia && base64Body && typeof base64Body === 'string' && base64Body.length > 50) {
        let mimeForDataUrl = mimetype;
        if (!mimeForDataUrl) {
          if (dataType === 'image' || msg.type === 'image') mimeForDataUrl = 'image/jpeg';
          else if (dataType === 'video' || msg.type === 'video') mimeForDataUrl = 'video/mp4';
          else if (dataType === 'audio' || dataType === 'ptt' || msg.type === 'audio' || msg.type === 'ptt') mimeForDataUrl = 'audio/ogg';
          else mimeForDataUrl = 'application/octet-stream';
        }
        mediaUrl = `data:${mimeForDataUrl};base64,${base64Body}`;
        console.log('[WhatsApp Chat API] 📎 Mídia Base64:', msg.id?.substring(0, 30), mimeForDataUrl, `${base64Body.length} chars`);
      }
      
      // Determinar tipo de mídia
      let mediaType: string | undefined;
      if (msg.hasMedia || msg.media) {
        if (mimetype.startsWith('image/') || dataType === 'image') mediaType = 'image';
        else if (mimetype.startsWith('video/') || dataType === 'video') mediaType = 'video';
        else if (mimetype.startsWith('audio/') || dataType === 'audio' || dataType === 'ptt') mediaType = 'audio';
        else if (dataType === 'document') mediaType = 'document';
        else if (msg.hasMedia) mediaType = 'document';
      }
      
      return {
        key: {
          remoteJid: msg.from || chatId,
          fromMe: msg.fromMe || false,
          id: msg.id,
        },
        message: {
          conversation: msg.body || msg.text,
          extendedTextMessage: msg.body ? { text: msg.body } : undefined,
          imageMessage: mediaType === 'image' ? { url: mediaUrl } : undefined,
          videoMessage: mediaType === 'video' ? { url: mediaUrl } : undefined,
          audioMessage: mediaType === 'audio' ? { url: mediaUrl } : undefined,
          documentMessage: mediaType === 'document' ? { url: mediaUrl } : undefined,
        },
        messageTimestamp: msg.timestamp || Math.floor(Date.now() / 1000),
        pushName: msg.pushName,
        status: msg.ack ? String(msg.ack) : undefined,
        // ✅ v2.0.7: Campos de mídia
        hasMedia: msg.hasMedia || !!msg.media,
        type: mediaType || 'chat',
        mediaUrl,
        media: mediaUrl ? {
          url: mediaUrl,
          mimetype: mimetype,
        } : undefined,
      };
    });
  } catch (error) {
    console.error('[WhatsApp Chat API] ❌ Erro ao buscar mensagens do WAHA direto:', error);
    return [];
  }
}

/**
 * Enviar mensagem de texto
 */
export async function sendWhatsAppMessage(number: string, text: string, options?: { isInternal?: boolean; attachments?: string[] }): Promise<any> {
  try {
    // ✅ ARQUITETURA SQL v1.0.103.950 - Usar token do usuário autenticado
    const token = localStorage.getItem('rendizy-token');
    
    if (!token) {
      console.error('[WhatsApp Chat API] ❌ Token não encontrado - usuário não autenticado');
      throw new Error('Usuário não autenticado');
    }
    
    console.log('[WhatsApp Chat API] 📤 Enviando mensagem para:', number);
    
    const payload: any = { number, text };
    if (options) {
      if (typeof options.isInternal !== 'undefined') payload.isInternal = !!options.isInternal;
      if (Array.isArray(options.attachments) && options.attachments.length > 0) payload.attachments = options.attachments;
    }

    const response = await fetch(`${BASE_URL}/whatsapp/send-message`, {
      method: 'POST',
      headers: getApiHeaders(), // ✅ v2.0.2: Headers centralizados com x-organization-id
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[WhatsApp Chat API] ❌ Erro ao enviar mensagem:', error);
      throw new Error('Erro ao enviar mensagem do WhatsApp');
    }

    const result = await response.json();
    console.log('[WhatsApp Chat API] ✅ Mensagem enviada com sucesso');
    
    return result.data;
  } catch (error) {
    console.error('[WhatsApp Chat API] ❌ Erro:', error);
    throw error;
  }
}

/**
 * Upload a single file to the photos upload endpoint and return the signed URL
 */
export async function uploadChatAttachment(
  file: File,
  propertyId: string,
  room: string = 'chat',
  onProgress?: (percent: number) => void
): Promise<{ success: boolean; url?: string; error?: any }> {
  return new Promise((resolve) => {
    try {
      const token = localStorage.getItem('rendizy-token');
      if (!token) return resolve({ success: false, error: 'Usuário não autenticado' });

      const url = `https://${projectId}.supabase.co/functions/v1/rendizy-server/photos/upload`;

      const form = new FormData();
      form.append('file', file);
      form.append('propertyId', propertyId);
      form.append('room', room);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      // set headers that are not related to multipart body
      try {
        xhr.setRequestHeader('Authorization', `Bearer ${publicAnonKey}`);
        xhr.setRequestHeader('X-Auth-Token', token);
      } catch (e) {
        // some browsers may restrict setting certain headers for FormData; ignore
      }

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) return;
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            if (result && result.success && result.photo && result.photo.url) {
              return resolve({ success: true, url: result.photo.url });
            }
            return resolve({ success: false, error: result });
          } catch (err) {
            return resolve({ success: false, error: xhr.responseText || err });
          }
        }
        return resolve({ success: false, error: xhr.responseText || `status ${xhr.status}` });
      };

      xhr.onerror = () => resolve({ success: false, error: 'Network error' });
      xhr.send(form);
    } catch (error) {
      console.error('[uploadChatAttachment] exception', error);
      return resolve({ success: false, error });
    }
  });
}

/**
 * Formatar número para o padrão WhatsApp (55DDDNÚMERO@s.whatsapp.net)
 */
export function formatWhatsAppNumber(phone: string | null | undefined): string {
  // ✅ CORREÇÃO: Verificar null/undefined antes de usar replace
  if (!phone) {
    return '';
  }
  
  // ✅ CORREÇÃO: Remover prefixo whatsapp- se existir (formato do ChatInbox)
  let cleaned = phone;
  if (cleaned.startsWith('whatsapp-')) {
    cleaned = cleaned.replace('whatsapp-', '');
  }
  
  // Se já está no formato correto com @s.whatsapp.net, apenas retornar
  if (cleaned.includes('@s.whatsapp.net') || cleaned.includes('@c.us')) {
    // Extrair apenas o número e reformatar
    const numberOnly = cleaned.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/\D/g, '');
    // Validar que é um número válido (pelo menos 10 dígitos)
    if (numberOnly.length < 10 || numberOnly.length > 15) {
      console.warn('[formatWhatsAppNumber] Número inválido (tamanho):', numberOnly, 'length:', numberOnly.length);
      return '';
    }
    const withCountry = numberOnly.startsWith('55') ? numberOnly : `55${numberOnly}`;
    return `${withCountry}@s.whatsapp.net`;
  }
  
  // Remove tudo que não for número
  cleaned = cleaned.replace(/\D/g, '');
  
  // Validar que é um número válido (pelo menos 10 dígitos)
  if (cleaned.length < 10 || cleaned.length > 15) {
    console.warn('[formatWhatsAppNumber] Número inválido (tamanho):', cleaned, 'length:', cleaned.length);
    return '';
  }
  
  // Se não tiver código do país, adiciona 55 (Brasil)
  const withCountry = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
  
  return `${withCountry}@s.whatsapp.net`;
}

/**
 * Extrair número limpo do formato WhatsApp
 */
export function extractPhoneNumber(whatsappId: string | null | undefined): string {
  // ✅ CORREÇÃO: Verificar null/undefined antes de usar replace
  if (!whatsappId) {
    return '';
  }
  // Remove @s.whatsapp.net ou @g.us
  return whatsappId.replace(/@.*/, '');
}

/**
 * Formatar número para exibição (+55 21 99999-9999)
 */
export function formatPhoneDisplay(whatsappId: string | null | undefined): string {
  // ✅ CORREÇÃO: Verificar null/undefined antes de processar
  if (!whatsappId) {
    return 'Número desconhecido';
  }
  const number = extractPhoneNumber(whatsappId);
  
  // ✅ CORREÇÃO: Verificar se number é válido antes de processar
  if (!number || number.length === 0) {
    return 'Número desconhecido';
  }
  
  // Verifica se é número brasileiro (começa com 55)
  if (number.startsWith('55') && number.length >= 12) {
    const ddd = number.substring(2, 4);
    const firstPart = number.substring(4, number.length - 4);
    const lastPart = number.substring(number.length - 4);
    return `+55 ${ddd} ${firstPart}-${lastPart}`;
  }
  
  // Retorna com + na frente se não for Brasil (e number não estiver vazio)
  return `+${number}`;
}

/**
 * Extrair texto da mensagem (suporta vários tipos)
 */
export function extractMessageText(message: WhatsAppMessage): string {
  if (message.message?.conversation) {
    return message.message.conversation;
  }
  
  if (message.message?.extendedTextMessage?.text) {
    return message.message.extendedTextMessage.text;
  }
  
  // Outros tipos de mensagem
  if (message.message?.imageMessage) {
    return '📷 Imagem';
  }
  
  if (message.message?.videoMessage) {
    return '🎥 Vídeo';
  }
  
  if (message.message?.audioMessage) {
    return '🎵 Áudio';
  }
  
  if (message.message?.documentMessage) {
    return '📄 Documento';
  }
  
  return '[Mensagem não suportada]';
}
