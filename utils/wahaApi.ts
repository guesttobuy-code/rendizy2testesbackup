/**
 * WAHA (WhatsApp HTTP API) Client para RENDIZY
 * 
 * API alternativa à Evolution API - mais estável e open-source
 * Docs: https://waha.devlike.pro/docs/
 * 
 * Deploy: whatsapp.suacasaavenda.com.br
 */

// Configuração da API WAHA
const WAHA_BASE_URL = 'https://whatsapp.suacasaavenda.com.br';
const WAHA_API_KEY = 'rendizy_waha_2025_super_secret_key_change_this'; // ALTERE ISSO!
const DEFAULT_SESSION = 'rendizy-default';

// Headers padrão para todas as requisições
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Api-Key': WAHA_API_KEY,
});

// ============================================================
// 1. SESSÕES (CONEXÕES WHATSAPP)
// ============================================================

/**
 * Listar todas as sessões ativas
 */
export async function listSessions() {
  const response = await fetch(`${WAHA_BASE_URL}/api/sessions`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Erro ao listar sessões: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Criar ou obter sessão do WhatsApp
 */
export async function getOrCreateSession(sessionName: string = DEFAULT_SESSION) {
  try {
    // Tentar obter sessão existente
    const sessions = await listSessions();
    const existingSession = sessions.find((s: any) => s.name === sessionName);

    if (existingSession) {
      console.log('[WAHA] Sessão já existe:', sessionName);
      return existingSession;
    }

    // Criar nova sessão
    console.log('[WAHA] Criando nova sessão:', sessionName);
    const response = await fetch(`${WAHA_BASE_URL}/api/sessions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        name: sessionName,
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
export async function getQRCode(sessionName: string = DEFAULT_SESSION) {
  try {
    // Garantir que sessão existe
    await getOrCreateSession(sessionName);

    // Obter QR Code
    const response = await fetch(
      `${WAHA_BASE_URL}/api/sessions/${sessionName}/auth/qr`,
      {
        headers: getHeaders(),
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
export async function getSessionStatus(sessionName: string = DEFAULT_SESSION) {
  try {
    const response = await fetch(
      `${WAHA_BASE_URL}/api/sessions/${sessionName}`,
      {
        headers: getHeaders(),
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
export async function disconnectSession(sessionName: string = DEFAULT_SESSION) {
  const response = await fetch(
    `${WAHA_BASE_URL}/api/sessions/${sessionName}/stop`,
    {
      method: 'POST',
      headers: getHeaders(),
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
 * Enviar mensagem de texto
 */
export async function sendTextMessage(
  to: string, // Número com código do país: 5511999999999
  message: string,
  sessionName: string = DEFAULT_SESSION
) {
  const response = await fetch(
    `${WAHA_BASE_URL}/api/sendText`,
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        session: sessionName,
        chatId: `${to}@c.us`, // Formato WhatsApp
        text: message,
      }),
    }
  );

  if (!response.ok) {
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
  sessionName: string = DEFAULT_SESSION
) {
  const response = await fetch(
    `${WAHA_BASE_URL}/api/sendImage`,
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        session: sessionName,
        chatId: `${to}@c.us`,
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
 * Enviar arquivo
 */
export async function sendFile(
  to: string,
  fileUrl: string,
  caption?: string,
  sessionName: string = DEFAULT_SESSION
) {
  const response = await fetch(
    `${WAHA_BASE_URL}/api/sendFile`,
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        session: sessionName,
        chatId: `${to}@c.us`,
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

// ============================================================
// 3. RECEBER MENSAGENS
// ============================================================

/**
 * Listar chats
 */
export async function getChats(sessionName: string = DEFAULT_SESSION) {
  const response = await fetch(
    `${WAHA_BASE_URL}/api/sessions/${sessionName}/chats`,
    {
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error(`Erro ao listar chats: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Obter mensagens de um chat
 */
export async function getChatMessages(
  chatId: string,
  limit: number = 100,
  sessionName: string = DEFAULT_SESSION
) {
  const response = await fetch(
    `${WAHA_BASE_URL}/api/sessions/${sessionName}/chats/${chatId}/messages?limit=${limit}`,
    {
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error(`Erro ao obter mensagens: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================
// 4. UTILITÁRIOS
// ============================================================

/**
 * Verificar se número está no WhatsApp
 */
export async function checkNumber(
  phoneNumber: string,
  sessionName: string = DEFAULT_SESSION
) {
  const response = await fetch(
    `${WAHA_BASE_URL}/api/contacts/check-exists`,
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        session: sessionName,
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
  sessionName: string = DEFAULT_SESSION
) {
  const response = await fetch(
    `${WAHA_BASE_URL}/api/contacts/${phoneNumber}@c.us`,
    {
      headers: getHeaders(),
      method: 'GET',
    }
  );

  if (!response.ok) {
    throw new Error(`Erro ao obter informações do contato: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Health check da API
 */
export async function healthCheck() {
  try {
    const response = await fetch(`${WAHA_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
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
  hasMedia: boolean;
  ack: number; // 0=Erro, 1=Pendente, 2=Enviado, 3=Entregue, 4=Lido
}

export interface WAHAChat {
  id: string;
  name: string;
  isGroup: boolean;
  unreadCount: number;
  timestamp: number;
}

// ============================================================
// 6. CONFIGURAÇÃO
// ============================================================

/**
 * Atualizar configuração (use antes de iniciar)
 */
export function configureWAHA(config: {
  baseUrl?: string;
  apiKey?: string;
  sessionName?: string;
}) {
  if (config.baseUrl) {
    (WAHA_BASE_URL as any) = config.baseUrl;
  }
  if (config.apiKey) {
    (WAHA_API_KEY as any) = config.apiKey;
  }
  if (config.sessionName) {
    (DEFAULT_SESSION as any) = config.sessionName;
  }
}

// Log de inicialização
console.log('[WAHA] Cliente inicializado');
console.log('[WAHA] Base URL:', WAHA_BASE_URL);
console.log('[WAHA] Session:', DEFAULT_SESSION);
