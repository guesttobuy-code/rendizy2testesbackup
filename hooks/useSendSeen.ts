/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                         USE SEND SEEN HOOK                                 ║
 * ║                                                                            ║
 * ║  🔒 ZONA_CRITICA_CHAT - Hook para marcar mensagens como lidas             ║
 * ║  👁️  WAHA_SEEN - Integra com API sendSeen do WAHA                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Hook para enviar "visto" (blue ticks) quando o usuário visualiza mensagens.
 * Importante para UX - mostra ao contato que a mensagem foi lida.
 * 
 * WAHA API:
 * - POST /api/sendSeen
 * - POST /api/{session}/chats/{chatId}/messages/read (WAHA Plus)
 * 
 * @version 1.0.0
 * @date 2026-01-25
 * @see /docs/ROADMAP-CHAT.md
 */

import { useCallback, useRef, useEffect } from 'react';

// ============================================
// TYPES
// ============================================

export interface UseSendSeenOptions {
  /** ChatId no formato JID (ex: 5521999999999@c.us) */
  chatId: string;
  /** URL da API WAHA */
  wahaBaseUrl?: string;
  /** API Key do WAHA */
  wahaApiKey?: string;
  /** Session do WAHA */
  session?: string;
  /** Debounce para enviar seen (ms) - default 1000 */
  debounceMs?: number;
  /** Habilitar envio de seen */
  enabled?: boolean;
}

export interface UseSendSeenReturn {
  /** Marcar conversa como lida */
  markAsRead: () => Promise<boolean>;
  /** Marcar mensagem específica como lida */
  markMessageAsRead: (messageId: string) => Promise<boolean>;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_WAHA_URL = 'http://76.13.82.60:3001';
const DEFAULT_API_KEY = 'rendizy-waha-secret-2026';
const DEFAULT_SESSION = 'default';

// ============================================
// HOOK
// ============================================

export function useSendSeen(options: UseSendSeenOptions): UseSendSeenReturn {
  const {
    chatId,
    wahaBaseUrl = DEFAULT_WAHA_URL,
    wahaApiKey = DEFAULT_API_KEY,
    session = DEFAULT_SESSION,
    debounceMs = 1000,
    enabled = true,
  } = options;
  
  // Ref para debounce
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentRef = useRef<string | null>(null);
  
  // ============================================
  // MARK AS READ (Chat Level)
  // ============================================
  
  const markAsRead = useCallback(async (): Promise<boolean> => {
    if (!enabled || !chatId) return false;
    
    // Evitar spam - não reenviar para o mesmo chat em menos de X ms
    if (lastSentRef.current === chatId) {
      console.log('[useSendSeen] ⏭️ Já enviou seen para este chat recentemente');
      return true;
    }
    
    // Debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    return new Promise((resolve) => {
      debounceTimerRef.current = setTimeout(async () => {
        try {
          console.log(`[useSendSeen] 👁️ Enviando seen para ${chatId}`);
          
          // WAHA API: POST /api/sendSeen
          const response = await fetch(`${wahaBaseUrl}/api/sendSeen`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Api-Key': wahaApiKey,
            },
            body: JSON.stringify({
              session,
              chatId,
            }),
          });
          
          if (!response.ok) {
            // Tentar endpoint alternativo (WAHA Plus)
            const altResponse = await fetch(
              `${wahaBaseUrl}/api/${session}/chats/${encodeURIComponent(chatId)}/messages/read`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Api-Key': wahaApiKey,
                },
                body: JSON.stringify({}),
              }
            );
            
            if (!altResponse.ok) {
              console.warn('[useSendSeen] ⚠️ Falha ao enviar seen:', response.status);
              resolve(false);
              return;
            }
          }
          
          lastSentRef.current = chatId;
          console.log('[useSendSeen] ✅ Seen enviado com sucesso');
          resolve(true);
          
          // Resetar após 5 segundos para permitir reenvio
          setTimeout(() => {
            if (lastSentRef.current === chatId) {
              lastSentRef.current = null;
            }
          }, 5000);
        } catch (error) {
          console.warn('[useSendSeen] ⚠️ Erro ao enviar seen:', error);
          resolve(false);
        }
      }, debounceMs);
    });
  }, [chatId, wahaBaseUrl, wahaApiKey, session, debounceMs, enabled]);
  
  // ============================================
  // MARK MESSAGE AS READ (Message Level)
  // ============================================
  
  const markMessageAsRead = useCallback(async (messageId: string): Promise<boolean> => {
    if (!enabled || !chatId || !messageId) return false;
    
    try {
      console.log(`[useSendSeen] 👁️ Marcando mensagem ${messageId} como lida`);
      
      // WAHA API: POST /api/sendSeen com messageId
      const response = await fetch(`${wahaBaseUrl}/api/sendSeen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': wahaApiKey,
        },
        body: JSON.stringify({
          session,
          chatId,
          messageId,
        }),
      });
      
      if (!response.ok) {
        console.warn('[useSendSeen] ⚠️ Falha ao marcar mensagem como lida:', response.status);
        return false;
      }
      
      console.log('[useSendSeen] ✅ Mensagem marcada como lida');
      return true;
    } catch (error) {
      console.warn('[useSendSeen] ⚠️ Erro ao marcar mensagem como lida:', error);
      return false;
    }
  }, [chatId, wahaBaseUrl, wahaApiKey, session, enabled]);
  
  // ============================================
  // CLEANUP
  // ============================================
  
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
  
  // ============================================
  // RETURN
  // ============================================
  
  return {
    markAsRead,
    markMessageAsRead,
  };
}

// ============================================
// AUTO MARK AS READ HOOK
// ============================================

export interface UseAutoMarkAsReadOptions extends UseSendSeenOptions {
  /** Se o chat está visível/focado */
  isVisible?: boolean;
  /** Se deve marcar automaticamente quando visível */
  autoMark?: boolean;
}

/**
 * Hook que marca automaticamente como lido quando o chat está visível
 */
export function useAutoMarkAsRead(options: UseAutoMarkAsReadOptions): UseSendSeenReturn {
  const {
    isVisible = true,
    autoMark = true,
    ...sendSeenOptions
  } = options;
  
  const { markAsRead, markMessageAsRead } = useSendSeen(sendSeenOptions);
  
  // Auto-mark quando visível
  useEffect(() => {
    if (autoMark && isVisible && sendSeenOptions.chatId) {
      markAsRead();
    }
  }, [autoMark, isVisible, sendSeenOptions.chatId, markAsRead]);
  
  return {
    markAsRead,
    markMessageAsRead,
  };
}

export default useSendSeen;
