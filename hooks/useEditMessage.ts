/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                        USE EDIT MESSAGE HOOK                               ║
 * ║                                                                            ║
 * ║  🎯 PHASE 3.4 - Editar Mensagem Enviada                                   ║
 * ║  📱 WAHA_INTEGRATION - PUT /api/{session}/chats/{chatId}/messages/{msgId} ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Hook para editar mensagens já enviadas no WhatsApp.
 * Nota: Só funciona para mensagens enviadas por você (fromMe: true)
 * e dentro de um limite de tempo (geralmente 15 minutos).
 * 
 * @version 1.0.0
 * @date 2026-01-25
 * @see /docs/ROADMAP-CHAT.md
 * 
 * WAHA API:
 * ```
 * PUT /api/{session}/chats/{chatId}/messages/{messageId}
 * Body: { text: "Novo texto da mensagem" }
 * ```
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

export interface UseEditMessageOptions {
  /** WAHA session name */
  session?: string;
  /** Chat ID (JID) */
  chatId: string;
  /** WAHA API base URL */
  wahaBaseUrl?: string;
  /** WAHA API key */
  wahaApiKey?: string;
  /** Callback on success */
  onSuccess?: (messageId: string, newText: string) => void;
  /** Callback on error */
  onError?: (error: Error, messageId: string) => void;
}

export interface UseEditMessageReturn {
  /** Edit a message */
  editMessage: (messageId: string, newText: string) => Promise<boolean>;
  /** Whether edit is in progress */
  isEditing: boolean;
  /** Last error */
  error: Error | null;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_WAHA_URL = 'http://76.13.82.60:3001';
const DEFAULT_WAHA_API_KEY = 'rendizy-waha-secret-2026';

// ============================================
// HOOK
// ============================================

export function useEditMessage({
  session = 'default',
  chatId,
  wahaBaseUrl = DEFAULT_WAHA_URL,
  wahaApiKey = DEFAULT_WAHA_API_KEY,
  onSuccess,
  onError
}: UseEditMessageOptions): UseEditMessageReturn {
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Edita uma mensagem já enviada
   * @param messageId - ID da mensagem WAHA (ex: "true_123@c.us_ABC123")
   * @param newText - Novo texto da mensagem
   * @returns true se sucesso, false se erro
   * 
   * Limitações:
   * - Só funciona para mensagens fromMe: true
   * - Geralmente só dentro de 15 minutos após envio
   * - Não funciona para mensagens de mídia
   */
  const editMessage = useCallback(async (
    messageId: string,
    newText: string
  ): Promise<boolean> => {
    if (!chatId || !messageId || !newText.trim()) {
      console.error('[useEditMessage] chatId, messageId e newText são obrigatórios');
      return false;
    }

    setIsEditing(true);
    setError(null);

    try {
      console.log('[useEditMessage] ✏️ Editando mensagem:', {
        session,
        chatId,
        messageId,
        newText: newText.substring(0, 50) + '...'
      });

      // WAHA API: PUT /api/{session}/chats/{chatId}/messages/{messageId}
      const response = await fetch(
        `${wahaBaseUrl}/api/${session}/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': wahaApiKey
          },
          body: JSON.stringify({
            text: newText
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        
        // Verificar erros comuns
        if (response.status === 404) {
          throw new Error('Mensagem não encontrada ou muito antiga para editar');
        }
        if (response.status === 403) {
          throw new Error('Você só pode editar suas próprias mensagens');
        }
        if (response.status === 400) {
          throw new Error('Não é possível editar esta mensagem (pode ser mídia ou muito antiga)');
        }
        
        throw new Error(`WAHA error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[useEditMessage] ✅ Mensagem editada:', data);

      onSuccess?.(messageId, newText);
      toast.success('Mensagem editada');

      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[useEditMessage] ❌ Erro:', error);
      
      setError(error);
      onError?.(error, messageId);
      toast.error(error.message || 'Não foi possível editar a mensagem');

      return false;
    } finally {
      setIsEditing(false);
    }
  }, [chatId, session, wahaBaseUrl, wahaApiKey, onSuccess, onError]);

  return {
    editMessage,
    isEditing,
    error
  };
}

export default useEditMessage;
