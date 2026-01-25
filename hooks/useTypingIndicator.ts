/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                        USE TYPING INDICATOR HOOK                           ║
 * ║                                                                            ║
 * ║  🔒 ZONA_CRITICA_CHAT - Hook para gerenciar status "digitando"            ║
 * ║  📡 WAHA_PRESENCE - Integra com API de presença do WAHA                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Hook para:
 * 1. Detectar quando o contato está digitando (via polling/webhook)
 * 2. Enviar status "digitando" quando o usuário está digitando
 * 
 * WAHA API:
 * - POST /api/{session}/presence - Set presence (typing, available, etc)
 * - Webhook event: "message.typing" com { typing: true/false }
 * 
 * @version 1.0.0
 * @date 2026-01-25
 * @see /docs/ROADMAP-CHAT.md
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================
// TYPES
// ============================================

export interface UseTypingIndicatorOptions {
  /** ChatId no formato JID (ex: 5521999999999@c.us) */
  chatId: string;
  /** URL da API WAHA */
  wahaBaseUrl?: string;
  /** API Key do WAHA */
  wahaApiKey?: string;
  /** Session do WAHA */
  session?: string;
  /** Debounce para enviar "digitando" (ms) - default 1000 */
  debounceMs?: number;
  /** Timeout para "parou de digitar" (ms) - default 5000 */
  timeoutMs?: number;
  /** Habilitar envio de "digitando" */
  enableSendTyping?: boolean;
}

export interface UseTypingIndicatorReturn {
  /** Se o contato está digitando */
  isContactTyping: boolean;
  /** Notificar que o usuário começou a digitar */
  notifyTyping: () => void;
  /** Notificar que o usuário parou de digitar */
  notifyStoppedTyping: () => void;
  /** Atualizar status do contato (chamado por webhook/polling) */
  setContactTyping: (isTyping: boolean) => void;
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

export function useTypingIndicator(
  options: UseTypingIndicatorOptions
): UseTypingIndicatorReturn {
  const {
    chatId,
    wahaBaseUrl = DEFAULT_WAHA_URL,
    wahaApiKey = DEFAULT_API_KEY,
    session = DEFAULT_SESSION,
    debounceMs = 1000,
    timeoutMs = 5000,
    enableSendTyping = true,
  } = options;
  
  // State
  const [isContactTyping, setIsContactTyping] = useState(false);
  
  // Refs
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const contactTypingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentRef = useRef<number>(0);
  
  // ============================================
  // SEND TYPING STATUS TO WAHA
  // ============================================
  
  const sendTypingStatus = useCallback(async (typing: boolean) => {
    if (!enableSendTyping || !chatId) return;
    
    // Evitar spam - não enviar mais de 1 vez por segundo
    const now = Date.now();
    if (typing && now - lastSentRef.current < 1000) {
      return;
    }
    lastSentRef.current = now;
    
    try {
      // WAHA API: POST /api/{session}/presence
      const response = await fetch(`${wahaBaseUrl}/api/${session}/presence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': wahaApiKey,
        },
        body: JSON.stringify({
          chatId,
          presence: typing ? 'composing' : 'available',
        }),
      });
      
      if (!response.ok) {
        console.warn('[useTypingIndicator] ⚠️ Falha ao enviar status typing:', response.status);
      } else {
        console.log(`[useTypingIndicator] ✅ Status ${typing ? 'composing' : 'available'} enviado`);
      }
    } catch (error) {
      // Silenciar erros - typing não é crítico
      console.warn('[useTypingIndicator] ⚠️ Erro ao enviar typing:', error);
    }
  }, [chatId, wahaBaseUrl, wahaApiKey, session, enableSendTyping]);
  
  // ============================================
  // NOTIFY USER TYPING
  // ============================================
  
  const notifyTyping = useCallback(() => {
    // Cancelar timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Enviar typing imediatamente (debounce só pro stop)
    sendTypingStatus(true);
    
    // Agendar "parou de digitar" após timeout
    debounceTimerRef.current = setTimeout(() => {
      sendTypingStatus(false);
    }, debounceMs);
  }, [sendTypingStatus, debounceMs]);
  
  const notifyStoppedTyping = useCallback(() => {
    // Cancelar timer de debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    // Enviar "parou de digitar"
    sendTypingStatus(false);
  }, [sendTypingStatus]);
  
  // ============================================
  // SET CONTACT TYPING (from webhook/polling)
  // ============================================
  
  const setContactTyping = useCallback((isTyping: boolean) => {
    // Cancelar timer anterior
    if (contactTypingTimerRef.current) {
      clearTimeout(contactTypingTimerRef.current);
      contactTypingTimerRef.current = null;
    }
    
    setIsContactTyping(isTyping);
    
    // Se está digitando, agendar timeout para "parou de digitar"
    if (isTyping) {
      contactTypingTimerRef.current = setTimeout(() => {
        setIsContactTyping(false);
      }, timeoutMs);
    }
  }, [timeoutMs]);
  
  // ============================================
  // CLEANUP
  // ============================================
  
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (contactTypingTimerRef.current) {
        clearTimeout(contactTypingTimerRef.current);
      }
    };
  }, []);
  
  // ============================================
  // RETURN
  // ============================================
  
  return {
    isContactTyping,
    notifyTyping,
    notifyStoppedTyping,
    setContactTyping,
  };
}

export default useTypingIndicator;
