/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                         USE REACTIONS HOOK                                 ║
 * ║                                                                            ║
 * ║  🎯 PHASE 3.1 - Reações a Mensagens via WAHA                              ║
 * ║  📱 WAHA_INTEGRATION - PUT /api/reaction                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Hook para gerenciar reações a mensagens WhatsApp.
 * Suporta enviar e remover reações via WAHA API.
 * 
 * @version 1.0.0
 * @date 2026-01-25
 * @see /docs/ROADMAP-CHAT.md
 * 
 * WAHA API:
 * ```
 * PUT /api/reaction
 * Body: { 
 *   session: "default",
 *   chatId: "123@c.us",
 *   messageId: "true_123@c.us_ABC123",
 *   reaction: "👍" // ou "" para remover
 * }
 * ```
 * 
 * USAGE:
 * ```tsx
 * const { sendReaction, removeReaction, isReacting } = useReactions({
 *   session: 'default',
 *   chatId: '5521999999999@c.us'
 * });
 * 
 * await sendReaction('true_5521..._ABC123', '👍');
 * await removeReaction('true_5521..._ABC123');
 * ```
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

export interface UseReactionsOptions {
  /** WAHA session name */
  session?: string;
  /** Chat ID (JID) where reactions are sent */
  chatId: string;
  /** WAHA API base URL */
  wahaBaseUrl?: string;
  /** WAHA API key */
  wahaApiKey?: string;
  /** Callback when reaction is sent successfully */
  onReactionSent?: (messageId: string, emoji: string) => void;
  /** Callback when reaction fails */
  onReactionError?: (error: Error, messageId: string) => void;
}

export interface UseReactionsReturn {
  /** Send a reaction to a message */
  sendReaction: (messageId: string, emoji: string) => Promise<boolean>;
  /** Remove reaction from a message (send empty string) */
  removeReaction: (messageId: string) => Promise<boolean>;
  /** Whether a reaction is being sent */
  isReacting: boolean;
  /** Last error if any */
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

export function useReactions({
  session = 'default',
  chatId,
  wahaBaseUrl = DEFAULT_WAHA_URL,
  wahaApiKey = DEFAULT_WAHA_API_KEY,
  onReactionSent,
  onReactionError
}: UseReactionsOptions): UseReactionsReturn {
  const [isReacting, setIsReacting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Envia uma reação para uma mensagem
   * @param messageId - ID da mensagem WAHA (ex: "true_123@c.us_ABC123")
   * @param emoji - Emoji da reação (ex: "👍", "❤️")
   * @returns true se sucesso, false se erro
   */
  const sendReaction = useCallback(async (
    messageId: string,
    emoji: string
  ): Promise<boolean> => {
    if (!chatId || !messageId) {
      console.error('[useReactions] chatId e messageId são obrigatórios');
      return false;
    }

    setIsReacting(true);
    setError(null);

    try {
      console.log('[useReactions] 📤 Enviando reação:', {
        session,
        chatId,
        messageId,
        emoji
      });

      const response = await fetch(`${wahaBaseUrl}/api/reaction`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': wahaApiKey
        },
        body: JSON.stringify({
          session,
          chatId,
          messageId,
          reaction: emoji
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WAHA API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[useReactions] ✅ Reação enviada:', data);

      // Callback de sucesso
      onReactionSent?.(messageId, emoji);

      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[useReactions] ❌ Erro ao enviar reação:', error);
      
      setError(error);
      onReactionError?.(error, messageId);

      // Feedback visual
      toast.error('Não foi possível reagir à mensagem');

      return false;
    } finally {
      setIsReacting(false);
    }
  }, [chatId, session, wahaBaseUrl, wahaApiKey, onReactionSent, onReactionError]);

  /**
   * Remove uma reação de uma mensagem (envia reaction vazia)
   * @param messageId - ID da mensagem WAHA
   * @returns true se sucesso, false se erro
   */
  const removeReaction = useCallback(async (
    messageId: string
  ): Promise<boolean> => {
    return sendReaction(messageId, '');
  }, [sendReaction]);

  return {
    sendReaction,
    removeReaction,
    isReacting,
    error
  };
}

export default useReactions;
