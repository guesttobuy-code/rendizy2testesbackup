/**
 * WhatsApp Chat API - Integração com Evolution API
 * Busca conversas e mensagens do WhatsApp para exibir no Chat
 */

import { projectId, publicAnonKey } from './supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/rendizy-server`;

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
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`, // Necessário para Supabase
        'X-Auth-Token': token // ✅ Token do usuário (evita validação JWT automática)
      }
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

interface WhatsAppChat {
  id: string;
  name?: string;
  profilePictureUrl?: string;
  lastMessageTimestamp?: number;
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
 */
export async function fetchWhatsAppChats(): Promise<WhatsAppChat[]> {
  try {
    // ✅ ARQUITETURA SQL v1.0.103.950 - Usar token do usuário autenticado
    const token = localStorage.getItem('rendizy-token');
    
    if (!token) {
      console.error('[WhatsApp Chat API] ❌ Token não encontrado - usuário não autenticado');
      return [];
    }
    
    console.log('[WhatsApp Chat API] 📥 Buscando conversas...');
    console.log('[WhatsApp Chat API] 🌐 URL:', `${BASE_URL}/whatsapp/chats`);
    console.log('[WhatsApp Chat API] 🔑 Token:', token ? `${token.substring(0, 20)}...` : 'NONE');
    
    const response = await fetch(`${BASE_URL}/whatsapp/chats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`, // Necessário para Supabase
        'X-Auth-Token': token // ✅ Token do usuário (evita validação JWT automática)
      },
    });

    console.log('[WhatsApp Chat API] 📡 Status:', response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error('[WhatsApp Chat API] ❌ Erro ao buscar conversas:', error);
      console.error('[WhatsApp Chat API] ❌ Status:', response.status);
      
      // Se o backend não está disponível, retorna array vazio
      if (response.status === 404 || response.status === 500) {
        console.warn('[WhatsApp Chat API] ⚠️ Backend não disponível, retornando array vazio');
        return [];
      }
      
      throw new Error(`Erro ao buscar conversas: ${response.status} - ${error}`);
    }

    const result = await response.json();
    console.log('[WhatsApp Chat API] ✅ Conversas recebidas:', result.data?.length || 0);
    
    return result.data || [];
  } catch (error) {
    console.error('[WhatsApp Chat API] ❌ Erro:', error);
    // Retorna array vazio em caso de erro para não quebrar a UI
    return [];
  }
}

/**
 * Buscar mensagens de uma conversa específica
 */
export async function fetchWhatsAppMessages(chatId: string, limit: number = 50): Promise<WhatsAppMessage[]> {
  try {
    // ✅ ARQUITETURA SQL v1.0.103.950 - Usar token do usuário autenticado
    const token = localStorage.getItem('rendizy-token');
    
    if (!token) {
      console.error('[WhatsApp Chat API] ❌ Token não encontrado - usuário não autenticado');
      throw new Error('Usuário não autenticado');
    }
    
    console.log('[WhatsApp Chat API] 📥 Buscando mensagens do chat:', chatId);
    
    const response = await fetch(`${BASE_URL}/whatsapp/messages/${encodeURIComponent(chatId)}?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`, // Necessário para Supabase
        'X-Auth-Token': token // ✅ Token do usuário (evita validação JWT automática)
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[WhatsApp Chat API] ❌ Erro ao buscar mensagens:', error);
      throw new Error('Erro ao buscar mensagens do WhatsApp');
    }

    const result = await response.json();
    console.log('[WhatsApp Chat API] ✅ Mensagens recebidas:', result.data?.length || 0);
    
    // ✅ CORREÇÃO: Garantir que sempre retorna um array
    if (!result.data || !Array.isArray(result.data)) {
      console.warn('[WhatsApp Chat API] ⚠️ Resposta não é um array, retornando array vazio');
      return [];
    }
    
    return result.data;
  } catch (error) {
    console.error('[WhatsApp Chat API] ❌ Erro:', error);
    // ✅ CORREÇÃO: Retornar array vazio ao invés de lançar erro
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
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`, // Necessário para Supabase
        'X-Auth-Token': token // ✅ Token do usuário (evita validação JWT automática)
      },
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
  // Remove tudo que não for número
  const cleaned = phone.replace(/\D/g, '');
  
  // Se não tiver código do país, adiciona 55 (Brasil)
  const withCountry = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
  
  // Adiciona @s.whatsapp.net se não tiver
  return withCountry.includes('@') ? withCountry : `${withCountry}@s.whatsapp.net`;
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
