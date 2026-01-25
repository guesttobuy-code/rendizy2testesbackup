/**
 * WAHA (WhatsApp HTTP API) Client para RENDIZY
 * 
 * API alternativa à Evolution API - mais estável e open-source
 * Docs: https://waha.devlike.pro/docs/
 * 
 * @version 2.0.0
 * @date 2026-01-24
 * 
 * REFATORAÇÃO:
 * - ✅ Usa variáveis de ambiente (VITE_WAHA_API_URL, VITE_WAHA_API_KEY)
 * - ✅ Fallback para configuração do banco (channel_instances)
 * - ✅ Suporte a envio de vídeo e áudio
 * - ✅ Busca mensagens históricas
 */

import { getSupabaseClient } from './supabase/client';

// ============================================================
// CONFIGURAÇÃO - Hierarquia de fallback
// ============================================================
// 1. Configuração dinâmica (setWahaConfig)
// 2. Variáveis de ambiente (VITE_WAHA_*)
// 3. Configuração do banco (channel_instances)
// 4. Valores padrão de desenvolvimento
// ============================================================

interface WahaConfig {
  baseUrl: string;
  apiKey: string;
  sessionName: string;
}

// Configuração dinâmica (sobrescreve tudo)
let dynamicConfig: Partial<WahaConfig> = {};

/**
 * Obtém configuração WAHA da hierarquia de fallback
 */
async function getWahaConfig(): Promise<WahaConfig> {
  // 1. Configuração dinâmica tem prioridade
  if (dynamicConfig.baseUrl && dynamicConfig.apiKey) {
    return {
      baseUrl: dynamicConfig.baseUrl,
      apiKey: dynamicConfig.apiKey,
      sessionName: dynamicConfig.sessionName || 'default',
    };
  }

  // 2. Variáveis de ambiente
  const envUrl = import.meta.env.VITE_WAHA_API_URL;
  const envKey = import.meta.env.VITE_WAHA_API_KEY;
  
  if (envUrl && envKey) {
    return {
      baseUrl: envUrl,
      apiKey: envKey,
      sessionName: import.meta.env.VITE_WAHA_SESSION || 'default',
    };
  }

  // 3. Buscar do banco de dados
  const dbConfig = await getWahaConfigFromDatabase();
  if (dbConfig) {
    return dbConfig;
  }

  // 4. Fallback de desenvolvimento (VPS padrão Rendizy)
  console.warn('[WAHA] ⚠️ Usando configuração de fallback. Configure VITE_WAHA_API_URL e VITE_WAHA_API_KEY');
  return {
    baseUrl: 'http://76.13.82.60:3001',
    apiKey: '', // Sem key = vai falhar
    sessionName: 'default',
  };
}

/**
 * Busca configuração WAHA do banco (channel_instances)
 */
async function getWahaConfigFromDatabase(): Promise<WahaConfig | null> {
  try {
    // Obter organizationId do localStorage
    const userJson = localStorage.getItem('rendizy-user');
    if (!userJson) return null;
    
    const user = JSON.parse(userJson);
    const organizationId = user.organizationId;
    if (!organizationId) return null;

    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('channel_instances')
      .select('waha_base_url, waha_api_key, api_url, api_key, instance_name')
      .eq('organization_id', organizationId)
      .eq('channel', 'whatsapp')
      .eq('provider', 'waha')
      .eq('is_enabled', true)
      .is('deleted_at', null)
      .order('is_default', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      const baseUrl = data.waha_base_url || data.api_url;
      const apiKey = data.waha_api_key || data.api_key;
      
      if (baseUrl && apiKey) {
        console.log('[WAHA] ✅ Configuração carregada do banco');
        return {
          baseUrl: baseUrl.replace(/\/+$/, ''),
          apiKey,
          sessionName: data.instance_name || 'default',
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('[WAHA] Erro ao buscar config do banco:', error);
    return null;
  }
}

/**
 * Configura WAHA dinamicamente (prioridade máxima)
 */
export function setWahaConfig(config: Partial<WahaConfig>) {
  dynamicConfig = { ...dynamicConfig, ...config };
  console.log('[WAHA] Configuração atualizada:', { 
    baseUrl: config.baseUrl, 
    hasApiKey: !!config.apiKey,
    sessionName: config.sessionName,
  });
}

/**
 * Headers padrão para requisições WAHA
 */
async function getHeaders(): Promise<HeadersInit> {
  const config = await getWahaConfig();
  return {
    'Content-Type': 'application/json',
    'X-Api-Key': config.apiKey,
  };
}

/**
 * Obtém URL base da API
 */
async function getBaseUrl(): Promise<string> {
  const config = await getWahaConfig();
  return config.baseUrl;
}

/**
 * Obtém nome da sessão padrão
 */
async function getDefaultSession(): Promise<string> {
  const config = await getWahaConfig();
  return config.sessionName;
}

// ============================================================
// 1. SESSÕES (CONEXÕES WHATSAPP)
// ============================================================

/**
 * Listar todas as sessões ativas
 */
export async function listSessions() {
  const baseUrl = await getBaseUrl();
  const headers = await getHeaders();
  
  const response = await fetch(`${baseUrl}/api/sessions`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`Erro ao listar sessões: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Criar ou obter sessão do WhatsApp
 */
export async function getOrCreateSession(sessionName?: string) {
  const defaultSession = await getDefaultSession();
  const session = sessionName || defaultSession;
  const baseUrl = await getBaseUrl();
  const headers = await getHeaders();
  
  try {
    // Tentar obter sessão existente
    const sessions = await listSessions();
    const existingSession = sessions.find((s: any) => s.name === session);

    if (existingSession) {
      console.log('[WAHA] Sessão já existe:', session);
      return existingSession;
    }

    // Criar nova sessão
    console.log('[WAHA] Criando nova sessão:', session);
    const response = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: session,
        config: {
          webhooks: [
            {
              url: 'https://seu-rendizy-url.supabase.co/functions/v1/rendizy-server/chat/webhook',
              events: ['message', 'message.any', 'state.change'],
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Erro ao criar sessão: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('[WAHA] Erro ao gerenciar sessão:', error);
    throw error;
  }
}

/**
 * Obter QR Code para conectar WhatsApp
 */
export async function getQRCode(sessionName?: string) {
  const defaultSession = await getDefaultSession();
  const session = sessionName || defaultSession;
  const baseUrl = await getBaseUrl();
  const headers = await getHeaders();
  
  try {
    // Garantir que sessão existe
    await getOrCreateSession(session);

    // Obter QR Code
    const response = await fetch(
      `${baseUrl}/api/sessions/${session}/auth/qr`,
      {
        headers,
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ao obter QR Code: ${response.statusText}`);
    }

    const data = await response.json();
    return data.qr; // Base64 image
  } catch (error) {
    console.error('[WAHA] Erro ao obter QR Code:', error);
    throw error;
  }
}

/**
 * Verificar status da sessão
 */
export async function getSessionStatus(sessionName?: string) {
  const defaultSession = await getDefaultSession();
  const session = sessionName || defaultSession;
  const baseUrl = await getBaseUrl();
  const headers = await getHeaders();
  
  try {
    const response = await fetch(
      `${baseUrl}/api/sessions/${session}`,
      {
        headers,
      }
    );

    if (!response.ok) {
      return { status: 'DISCONNECTED', message: 'Sessão não encontrada' };
    }

    const data = await response.json();
    return {
      status: data.status, // STARTING, SCAN_QR_CODE, WORKING, FAILED, STOPPED
      me: data.me, // Dados do número conectado
    };
  } catch (error) {
    console.error('[WAHA] Erro ao verificar status:', error);
    return { status: 'ERROR', message: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

/**
 * Desconectar sessão
 */
export async function disconnectSession(sessionName?: string) {
  const defaultSession = await getDefaultSession();
  const session = sessionName || defaultSession;
  const baseUrl = await getBaseUrl();
  const headers = await getHeaders();
  
  const response = await fetch(
    `${baseUrl}/api/sessions/${session}/stop`,
    {
      method: 'POST',
      headers,
    }
  );

  if (!response.ok) {
    throw new Error(`Erro ao desconectar sessão: ${response.statusText}`);
  }

  return { success: true };
}

// ============================================================
// 2. ENVIAR MENSAGENS
// ============================================================

/**
 * Formata chatId para o padrão WhatsApp
 * - Contato individual: numero@c.us
 * - Grupo: id@g.us
 */
function formatChatId(to: string): string {
  // Se já tem @, está formatado
  if (to.includes('@')) return to;
  // Remove caracteres não numéricos
  const cleaned = to.replace(/\D/g, '');
  return `${cleaned}@c.us`;
}

/**
 * Enviar mensagem de texto
 */
export async function sendTextMessage(
  to: string, // Número com código do país: 5511999999999
  message: string,
  sessionName?: string
) {
  const defaultSession = await getDefaultSession();
  const session = sessionName || defaultSession;
  const baseUrl = await getBaseUrl();
  const headers = await getHeaders();
  
  const response = await fetch(
    `${baseUrl}/api/sendText`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        session,
        chatId: formatChatId(to),
        text: message,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[WAHA] Erro ao enviar mensagem:', errorText);
    throw new Error(`Erro ao enviar mensagem: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Enviar imagem
 */
export async function sendImage(
  to: string,
  imageUrl: string,
  caption?: string,
  sessionName?: string
) {
  const defaultSession = await getDefaultSession();
  const session = sessionName || defaultSession;
  const baseUrl = await getBaseUrl();
  const headers = await getHeaders();
  
  const response = await fetch(
    `${baseUrl}/api/sendImage`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        session,
        chatId: formatChatId(to),
        file: {
          url: imageUrl,
        },
        caption: caption || '',
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Erro ao enviar imagem: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Enviar vídeo
 */
export async function sendVideo(
  to: string,
  videoUrl: string,
  caption?: string,
  sessionName?: string
) {
  const defaultSession = await getDefaultSession();
  const session = sessionName || defaultSession;
  const baseUrl = await getBaseUrl();
  const headers = await getHeaders();
  
  const response = await fetch(
    `${baseUrl}/api/sendVideo`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        session,
        chatId: formatChatId(to),
        file: {
          url: videoUrl,
        },
        caption: caption || '',
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Erro ao enviar vídeo: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Enviar áudio/voz
 */
export async function sendVoice(
  to: string,
  audioUrl: string,
  sessionName?: string
) {
  const defaultSession = await getDefaultSession();
  const session = sessionName || defaultSession;
  const baseUrl = await getBaseUrl();
  const headers = await getHeaders();
  
  const response = await fetch(
    `${baseUrl}/api/sendVoice`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        session,
        chatId: formatChatId(to),
        file: {
          url: audioUrl,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Erro ao enviar áudio: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Enviar arquivo/documento
 */
export async function sendFile(
  to: string,
  fileUrl: string,
  caption?: string,
  sessionName?: string
) {
  const defaultSession = await getDefaultSession();
  const session = sessionName || defaultSession;
  const baseUrl = await getBaseUrl();
  const headers = await getHeaders();
  
  const response = await fetch(
    `${baseUrl}/api/sendFile`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        session,
        chatId: formatChatId(to),
        file: {
          url: fileUrl,
        },
        caption: caption || '',
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Erro ao enviar arquivo: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Enviar mídia genérica (detecta tipo automaticamente)
 */
export async function sendMedia(
  to: string,
  mediaUrl: string,
  mediaType: 'image' | 'video' | 'audio' | 'document',
  caption?: string,
  sessionName?: string
) {
  switch (mediaType) {
    case 'image':
      return sendImage(to, mediaUrl, caption, sessionName);
    case 'video':
      return sendVideo(to, mediaUrl, caption, sessionName);
    case 'audio':
      return sendVoice(to, mediaUrl, sessionName);
    case 'document':
    default:
      return sendFile(to, mediaUrl, caption, sessionName);
  }
}

// ============================================================
// 3. RECEBER MENSAGENS E HISTÓRICO
// ============================================================

/**
 * Listar todos os chats
 */
export async function getChats(sessionName?: string) {
  const defaultSession = await getDefaultSession();
  const session = sessionName || defaultSession;
  const baseUrl = await getBaseUrl();
  const headers = await getHeaders();
  
  const response = await fetch(
    `${baseUrl}/api/sessions/${session}/chats`,
    {
      headers,
    }
  );

  if (!response.ok) {
    throw new Error(`Erro ao listar chats: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Obter mensagens de um chat (histórico)
 * @param chatId - ID do chat (ex: 5511999999999@c.us)
 * @param limit - Número máximo de mensagens (padrão: 100)
 * @param downloadMedia - Se deve baixar mídia (padrão: true)
 */
export async function getChatMessages(
  chatId: string,
  limit: number = 100,
  sessionName?: string,
  downloadMedia: boolean = true
) {
  const defaultSession = await getDefaultSession();
  const session = sessionName || defaultSession;
  const baseUrl = await getBaseUrl();
  const headers = await getHeaders();
  
  // Formatar chatId se necessário
  const formattedChatId = chatId.includes('@') ? chatId : formatChatId(chatId);
  
  const response = await fetch(
    `${baseUrl}/api/sessions/${session}/chats/${encodeURIComponent(formattedChatId)}/messages?limit=${limit}&downloadMedia=${downloadMedia}`,
    {
      headers,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[WAHA] Erro ao obter mensagens:', errorText);
    throw new Error(`Erro ao obter mensagens: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Sincronizar mensagens antigas para o banco de dados
 * Útil para popular o histórico de conversas
 */
export async function syncChatHistory(
  chatId: string,
  organizationId: string,
  conversationId: string,
  limit: number = 50,
  sessionName?: string
): Promise<{ synced: number; errors: number }> {
  const supabase = getSupabaseClient();
  let synced = 0;
  let errors = 0;

  try {
    const messages = await getChatMessages(chatId, limit, sessionName);
    
    if (!Array.isArray(messages)) {
      console.warn('[WAHA] Resposta de mensagens não é array:', messages);
      return { synced: 0, errors: 0 };
    }

    for (const msg of messages) {
      try {
        // Verificar se mensagem já existe
        const { data: existing } = await supabase
          .from('messages')
          .select('id')
          .eq('external_id', msg.id)
          .maybeSingle();

        if (existing) continue; // Já existe

        // Inserir nova mensagem
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
          metadata: {
            from: msg.from,
            to: msg.to,
            ack: msg.ack,
          },
        });

        if (error) {
          console.warn('[WAHA] Erro ao inserir mensagem:', error);
          errors++;
        } else {
          synced++;
        }
      } catch (e) {
        console.warn('[WAHA] Erro ao processar mensagem:', e);
        errors++;
      }
    }

    console.log(`[WAHA] Sincronização concluída: ${synced} mensagens, ${errors} erros`);
  } catch (error) {
    console.error('[WAHA] Erro ao sincronizar histórico:', error);
  }

  return { synced, errors };
}

// ============================================================
// 4. UTILITÁRIOS
// ============================================================

/**
 * Verificar se número está no WhatsApp
 */
export async function checkNumber(
  phoneNumber: string,
  sessionName?: string
) {
  const defaultSession = await getDefaultSession();
  const session = sessionName || defaultSession;
  const baseUrl = await getBaseUrl();
  const headers = await getHeaders();
  
  const response = await fetch(
    `${baseUrl}/api/contacts/check-exists`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        session,
        phone: phoneNumber,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Erro ao verificar número: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Obter informações do contato
 */
export async function getContactInfo(
  phoneNumber: string,
  sessionName?: string
) {
  const defaultSession = await getDefaultSession();
  const session = sessionName || defaultSession;
  const baseUrl = await getBaseUrl();
  const headers = await getHeaders();
  
  const formattedId = formatChatId(phoneNumber);
  
  const response = await fetch(
    `${baseUrl}/api/contacts/${encodeURIComponent(formattedId)}`,
    {
      headers,
      method: 'GET',
    }
  );

  if (!response.ok) {
    throw new Error(`Erro ao obter informações do contato: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Obter foto de perfil do contato
 */
export async function getContactProfilePic(
  phoneNumber: string,
  sessionName?: string
) {
  const defaultSession = await getDefaultSession();
  const session = sessionName || defaultSession;
  const baseUrl = await getBaseUrl();
  const headers = await getHeaders();
  
  const formattedId = formatChatId(phoneNumber);
  
  const response = await fetch(
    `${baseUrl}/api/contacts/${encodeURIComponent(formattedId)}/profile-picture`,
    {
      headers,
    }
  );

  if (!response.ok) {
    return null; // Foto não disponível
  }

  const data = await response.json();
  return data.profilePictureUrl || null;
}

/**
 * Health check da API
 */
export async function healthCheck() {
  try {
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Marcar mensagens como lidas
 */
export async function markAsRead(
  chatId: string,
  sessionName?: string
) {
  const defaultSession = await getDefaultSession();
  const session = sessionName || defaultSession;
  const baseUrl = await getBaseUrl();
  const headers = await getHeaders();
  
  const formattedChatId = chatId.includes('@') ? chatId : formatChatId(chatId);
  
  const response = await fetch(
    `${baseUrl}/api/sendSeen`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        session,
        chatId: formattedChatId,
      }),
    }
  );

  if (!response.ok) {
    console.warn('[WAHA] Erro ao marcar como lido:', response.statusText);
  }

  return response.ok;
}

// ============================================================
// 5. TIPOS
// ============================================================

export interface WAHASession {
  name: string;
  status: 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED' | 'STOPPED';
  me?: {
    id: string;
    pushName: string;
  };
}

export interface WAHAMessage {
  id: string;
  timestamp: number;
  from: string;
  to: string;
  body: string;
  caption?: string;
  hasMedia: boolean;
  mediaUrl?: string;
  type?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker';
  ack: number; // 0=Erro, 1=Pendente, 2=Enviado, 3=Entregue, 4=Lido
  _data?: {
    notifyName?: string;
    pushname?: string;
  };
}

export interface WAHAChat {
  id: string;
  name: string;
  isGroup: boolean;
  unreadCount: number;
  timestamp: number;
}

export interface WAHASendResult {
  id: string;
  timestamp: number;
  ack: number;
}

// ============================================================
// 6. CONFIGURAÇÃO LEGADA (compatibilidade)
// ============================================================

/**
 * @deprecated Use setWahaConfig() ao invés
 */
export function configureWAHA(config: {
  baseUrl?: string;
  apiKey?: string;
  sessionName?: string;
}) {
  setWahaConfig({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    sessionName: config.sessionName,
  });
}

// Log de inicialização
console.log('[WAHA] Cliente v2.0 inicializado');
console.log('[WAHA] Configuração será carregada dinamicamente do banco ou variáveis de ambiente');
