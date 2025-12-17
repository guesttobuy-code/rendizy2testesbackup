/**
 * RENDIZY - Evolution API Service
 * 
 * Camada de serviço completa para Evolution API
 * Todas as requisições passam pelo backend (proxy seguro)
 * 
 * Funções principais:
 * - sendMessage(number, text)
 * - getMessages()
 * - getStatus()
 * - healthCheck()
 * 
 * @version 1.0.103.84
 * @date 2025-10-30
 */

import { publicAnonKey } from '../supabase/info';
import { API_BASE_URL } from '../apiBase';

// ============================================================================
// TYPES
// ============================================================================

export type SessionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'ERROR';

export interface EvolutionMessage {
  id: string;
  chatId: string;
  from: string;
  to: string;
  body: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
  timestamp: number;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'error';
  isFromMe: boolean;
  hasMedia: boolean;
  mediaUrl?: string;
}

export interface SendMessageRequest {
  number: string;
  text: string;
}

export interface SendMediaRequest {
  number: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'audio' | 'document';
  caption?: string;
}

export interface InstanceStatus {
  status: SessionStatus;
  phone?: string;
  profilePictureUrl?: string;
  profileName?: string;
}

export interface HealthCheckResponse {
  healthy: boolean;
  version?: string;
  uptime?: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const getHeaders = () => ({
  'Authorization': `Bearer ${publicAnonKey}`,
  'Content-Type': 'application/json',
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Formatar número de telefone para padrão Evolution
 * +5511999999999 → 5511999999999@s.whatsapp.net
 */
function formatPhoneForEvolution(phone: string): string {
  // Remover caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '');
  
  // Adicionar sufixo WhatsApp
  return `${cleaned}@s.whatsapp.net`;
}

/**
 * Tratar erros de API
 */
function handleApiError(error: any, context: string): never {
  console.error(`[Evolution Service] ${context}:`, error);
  
  if (error.response) {
    throw new Error(`${context}: ${error.response.statusText || 'Erro desconhecido'}`);
  }
  
  if (error.message) {
    throw new Error(`${context}: ${error.message}`);
  }
  
  throw new Error(`${context}: Erro desconhecido`);
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class EvolutionService {
  
  /**
   * Enviar mensagem de texto
   */
  async sendMessage(number: string, text: string): Promise<EvolutionMessage> {
    try {
      const response = await fetch(`${API_BASE_URL}/whatsapp/send-message`, {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'omit', // ✅ EXPLÍCITO: não enviar credentials (resolve CORS com origin: "*")
        body: JSON.stringify({
          number: formatPhoneForEvolution(number),
          text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      return handleApiError(error, 'Erro ao enviar mensagem');
    }
  }

  /**
   * Enviar mensagem com mídia
   */
  async sendMediaMessage(request: SendMediaRequest): Promise<EvolutionMessage> {
    try {
      const response = await fetch(`${API_BASE_URL}/whatsapp/send-media`, {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'omit', // ✅ EXPLÍCITO: não enviar credentials (resolve CORS com origin: "*")
        body: JSON.stringify({
          number: formatPhoneForEvolution(request.number),
          mediaUrl: request.mediaUrl,
          mediaType: request.mediaType,
          caption: request.caption,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      return handleApiError(error, 'Erro ao enviar mídia');
    }
  }

  /**
   * Buscar mensagens de um chat
   */
  async getMessages(chatId?: string, limit: number = 50): Promise<EvolutionMessage[]> {
    try {
      const params = new URLSearchParams();
      if (chatId) params.append('chatId', chatId);
      params.append('limit', limit.toString());

      const response = await fetch(
        `${API_BASE_URL}/whatsapp/messages?${params.toString()}`,
        {
          method: 'GET',
          headers: getHeaders(),
          credentials: 'omit', // ✅ EXPLÍCITO: não enviar credentials (resolve CORS com origin: "*")
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('[Evolution Service] Erro ao buscar mensagens:', error);
      // Retornar array vazio em caso de erro (não crítico)
      return [];
    }
  }

  /**
   * Obter status da instância WhatsApp
   */
  async getStatus(organizationId?: string): Promise<SessionStatus> {
    try {
      // ✅ Passar organization_id como query param se fornecido
      const url = organizationId 
        ? `${API_BASE_URL}/whatsapp/status?organization_id=${organizationId}`
        : `${API_BASE_URL}/whatsapp/status`;
        
      const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
        credentials: 'omit', // ✅ EXPLÍCITO: não enviar credentials (resolve CORS com origin: "*")
      });

      if (!response.ok) {
        console.error('[Evolution Service] Erro ao buscar status:', response.status);
        return 'ERROR';
      }

      const data = await response.json();
      
      // ✅ Verificar se a resposta tem sucesso e dados
      if (!data.success) {
        console.error('[Evolution Service] Resposta sem sucesso:', data);
        return 'ERROR';
      }
      
      return data.data?.status || 'DISCONNECTED';
    } catch (error) {
      console.error('[Evolution Service] Erro ao buscar status:', error);
      return 'ERROR';
    }
  }

  /**
   * Obter informações detalhadas da instância
   */
  async getInstanceInfo(): Promise<InstanceStatus> {
    try {
      const response = await fetch(`${API_BASE_URL}/whatsapp/instance-info`, {
        method: 'GET',
        headers: getHeaders(),
        credentials: 'omit', // ✅ EXPLÍCITO: não enviar credentials (resolve CORS com origin: "*")
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      return handleApiError(error, 'Erro ao buscar informações da instância');
    }
  }

  /**
   * Obter QR Code para conexão
   */
  async getQRCode(): Promise<{ qrCode: string; expiresAt: Date }> {
    try {
      const response = await fetch(`${API_BASE_URL}/whatsapp/qr-code`, {
        method: 'GET',
        headers: getHeaders(),
        credentials: 'omit', // ✅ EXPLÍCITO: não enviar credentials (resolve CORS com origin: "*")
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        qrCode: data.data.qrCode,
        expiresAt: new Date(data.data.expiresAt),
      };
    } catch (error) {
      return handleApiError(error, 'Erro ao obter QR Code');
    }
  }

  /**
   * Verificar se número existe no WhatsApp
   */
  async checkNumber(phone: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/whatsapp/check-number`, {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'omit', // ✅ EXPLÍCITO: não enviar credentials (resolve CORS com origin: "*")
        body: JSON.stringify({
          number: formatPhoneForEvolution(phone),
        }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.data?.exists || false;
    } catch (error) {
      console.error('[Evolution Service] Erro ao verificar número:', error);
      return false;
    }
  }

  /**
   * Health check da API
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/whatsapp/health`, {
        method: 'GET',
        headers: getHeaders(),
        credentials: 'omit', // ✅ EXPLÍCITO: não enviar credentials (resolve CORS com origin: "*")
      });

      if (!response.ok) {
        return { healthy: false };
      }

      const data = await response.json();
      return {
        healthy: true,
        version: data.data?.version,
        uptime: data.data?.uptime,
      };
    } catch (error) {
      console.error('[Evolution Service] Health check falhou:', error);
      return { healthy: false };
    }
  }

  /**
   * Desconectar instância
   */
  async disconnect(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/whatsapp/disconnect`, {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'omit', // ✅ EXPLÍCITO: não enviar credentials (resolve CORS com origin: "*")
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      return handleApiError(error, 'Erro ao desconectar');
    }
  }

  /**
   * Reconectar instância
   */
  async reconnect(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/whatsapp/reconnect`, {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'omit', // ✅ EXPLÍCITO: não enviar credentials (resolve CORS com origin: "*")
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      return handleApiError(error, 'Erro ao reconectar');
    }
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const evolutionService = new EvolutionService();
export default evolutionService;
