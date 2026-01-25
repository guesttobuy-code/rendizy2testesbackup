/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                       USE DELETE MESSAGE HOOK                              ║
 * ║                                                                            ║
 * ║  🎯 PHASE 3.5 - Deletar Mensagem ("Apagar para todos")                    ║
 * ║  📱 WAHA_INTEGRATION - DELETE /api/{session}/chats/{chatId}/messages/{id} ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Hook para deletar mensagens no WhatsApp.
 * Suporta "apagar para mim" e "apagar para todos".
 * 
 * @version 1.0.0
 * @date 2026-01-25
 * @see /docs/ROADMAP-CHAT.md
 * 
 * WAHA API:
 * ```
 * DELETE /api/{session}/chats/{chatId}/messages/{messageId}
 * Query params: ?forEveryone=true  (para apagar para todos)
 * ```
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

export interface UseDeleteMessageOptions {
  /** WAHA session name */
  session?: string;
  /** Chat ID (JID) */
  chatId: string;
  /** WAHA API base URL */
  wahaBaseUrl?: string;
  /** WAHA API key */
  wahaApiKey?: string;
  /** Callback on success */
  onSuccess?: (messageId: string, forEveryone: boolean) => void;
  /** Callback on error */
  onError?: (error: Error, messageId: string) => void;
}

export interface UseDeleteMessageReturn {
  /** Delete a message */
  deleteMessage: (messageId: string, forEveryone?: boolean) => Promise<boolean>;
  /** Delete for me only */
  deleteForMe: (messageId: string) => Promise<boolean>;
  /** Delete for everyone */
  deleteForEveryone: (messageId: string) => Promise<boolean>;
  /** Whether delete is in progress */
  isDeleting: boolean;
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

export function useDeleteMessage({
  session = 'default',
  chatId,
  wahaBaseUrl = DEFAULT_WAHA_URL,
  wahaApiKey = DEFAULT_WAHA_API_KEY,
  onSuccess,
  onError
}: UseDeleteMessageOptions): UseDeleteMessageReturn {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Deleta uma mensagem
   * @param messageId - ID da mensagem WAHA
   * @param forEveryone - Se true, apaga para todos. Se false, só para mim.
   * @returns true se sucesso, false se erro
   * 
   * Limitações para "apagar para todos":
   * - Só funciona para mensagens fromMe: true
   * - Geralmente só dentro de ~1 hora após envio
   * - Após o limite, só "apagar para mim" funciona
   */
  const deleteMessage = useCallback(async (
    messageId: string,
    forEveryone: boolean = true
  ): Promise<boolean> => {
    if (!chatId || !messageId) {
      console.error('[useDeleteMessage] chatId e messageId são obrigatórios');
      return false;
    }

    setIsDeleting(true);
    setError(null);

    try {
      console.log('[useDeleteMessage] 🗑️ Deletando mensagem:', {
        session,
        chatId,
        messageId,
        forEveryone
      });

      // WAHA API: DELETE /api/{session}/chats/{chatId}/messages/{messageId}
      const url = new URL(
        `${wahaBaseUrl}/api/${session}/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}`
      );
      
      // Adicionar query param para "apagar para todos"
      if (forEveryone) {
        url.searchParams.set('forEveryone', 'true');
      }

      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': wahaApiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Verificar erros comuns
        if (response.status === 404) {
          throw new Error('Mensagem não encontrada');
        }
        if (response.status === 403) {
          throw new Error('Sem permissão para deletar esta mensagem');
        }
        if (response.status === 400) {
          throw new Error('Não é possível apagar para todos (mensagem muito antiga?)');
        }
        
        throw new Error(`WAHA error: ${response.status} - ${errorText}`);
      }

      // Pode não retornar corpo, verificar
      let data = null;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      }

      console.log('[useDeleteMessage] ✅ Mensagem deletada:', data || 'OK');

      onSuccess?.(messageId, forEveryone);
      toast.success(forEveryone ? 'Mensagem apagada para todos' : 'Mensagem apagada');

      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[useDeleteMessage] ❌ Erro:', error);
      
      setError(error);
      onError?.(error, messageId);
      toast.error(error.message || 'Não foi possível apagar a mensagem');

      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [chatId, session, wahaBaseUrl, wahaApiKey, onSuccess, onError]);

  /**
   * Atalho para deletar apenas para mim
   */
  const deleteForMe = useCallback(async (messageId: string): Promise<boolean> => {
    return deleteMessage(messageId, false);
  }, [deleteMessage]);

  /**
   * Atalho para deletar para todos
   */
  const deleteForEveryone = useCallback(async (messageId: string): Promise<boolean> => {
    return deleteMessage(messageId, true);
  }, [deleteMessage]);

  return {
    deleteMessage,
    deleteForMe,
    deleteForEveryone,
    isDeleting,
    error
  };
}

export default useDeleteMessage;
