/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                         USE WAHA POLLING                                   ║
 * ║                                                                            ║
 * ║  🔒 ZONA_CRITICA_CHAT - NÃO MODIFICAR SEM REVISAR ADR-007                 ║
 * ║  ⚠️  WAHA_INTEGRATION - Polling para mensagens em tempo real              ║
 * ║  📱 WHATSAPP_JID - Verifica novas mensagens periodicamente                ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Hook para polling de mensagens do WAHA API.
 * Usado como fallback quando WebSocket não está disponível (WAHA CORE).
 * 
 * @version 1.0.0
 * @date 2026-01-18
 * 
 * USO:
 * ```tsx
 * const { messages, isPolling, lastUpdate } = useWahaPolling({
 *   chatId: '5521999999999@c.us',
 *   enabled: true,
 *   intervalMs: 3000, // 3 segundos
 *   onNewMessage: (msg) => console.log('Nova mensagem!', msg)
 * });
 * ```
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { fetchWhatsAppMessages, extractMessageText } from '../utils/whatsappChatApi';

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_POLL_INTERVAL_MS = 3000; // 3 segundos
const MIN_POLL_INTERVAL_MS = 1000; // 1 segundo mínimo

// ============================================
// TYPES
// ============================================

export interface PolledMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  fromMe: boolean;
  hasMedia: boolean;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  mediaUrl?: string;
}

export interface UseWahaPollingOptions {
  /** Chat ID no formato JID (ex: 5521999999999@c.us) */
  chatId: string;
  
  /** Habilitar/desabilitar polling */
  enabled?: boolean;
  
  /** Intervalo de polling em ms (default: 3000) */
  intervalMs?: number;
  
  /** Callback quando detectar nova mensagem */
  onNewMessage?: (message: PolledMessage) => void;
  
  /** Número máximo de mensagens a buscar por poll */
  limit?: number;
}

export interface UseWahaPollingReturn {
  /** Lista de mensagens */
  messages: PolledMessage[];
  
  /** Se está fazendo polling ativo */
  isPolling: boolean;
  
  /** Timestamp da última atualização */
  lastUpdate: Date | null;
  
  /** Erro da última requisição (se houver) */
  lastError: string | null;
  
  /** Forçar refresh imediato */
  refresh: () => Promise<void>;
  
  /** Parar polling */
  stop: () => void;
  
  /** Iniciar polling */
  start: () => void;
}

// ============================================
// HOOK
// ============================================

export function useWahaPolling(options: UseWahaPollingOptions): UseWahaPollingReturn {
  const {
    chatId,
    enabled = true,
    intervalMs = DEFAULT_POLL_INTERVAL_MS,
    onNewMessage,
    limit = 20,
  } = options;

  // State
  const [messages, setMessages] = useState<PolledMessage[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // Refs
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const isActiveRef = useRef(false);
  const messagesRef = useRef<PolledMessage[]>([]); // Para evitar stale closure

  // Manter messagesRef atualizado
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // ============================================
  // FETCH MESSAGES
  // ============================================

  const fetchMessages = useCallback(async () => {
    if (!chatId || chatId.length < 5) return;

    try {
      // Normalizar chatId para formato JID
      const normalizedChatId = chatId.includes('@') 
        ? chatId 
        : `${chatId.replace(/\D/g, '')}@c.us`;

      console.log('[WahaPolling] 🔄 Buscando mensagens para:', normalizedChatId);

      const rawMessages = await fetchWhatsAppMessages(normalizedChatId, limit);
      
      if (!rawMessages || rawMessages.length === 0) {
        console.log('[WahaPolling] ⚠️ Nenhuma mensagem retornada');
        return;
      }

      console.log('[WahaPolling] 📦 Recebidas', rawMessages.length, 'mensagens');

      // Converter para formato interno
      const converted: PolledMessage[] = rawMessages.map((msg: any) => {
        let mediaType: PolledMessage['mediaType'];
        let mediaUrl: string | undefined;

        if (msg.hasMedia) {
          mediaUrl = msg.mediaUrl || msg.media?.url;
          const mimetype = msg.media?.mimetype || '';
          
          if (mimetype.startsWith('image/') || msg.type === 'image') mediaType = 'image';
          else if (mimetype.startsWith('video/') || msg.type === 'video') mediaType = 'video';
          else if (mimetype.startsWith('audio/') || msg.type === 'audio' || msg.type === 'ptt') mediaType = 'audio';
          else mediaType = 'document';
        }

        // ✅ v1.0.1: Extrair fromMe corretamente
        const resolvedFromMe = msg.key?.fromMe ?? msg.fromMe ?? false;
        const msgBody = extractMessageText(msg) || '';

        return {
          id: msg.key?.id || msg.id || '',
          from: msg.key?.remoteJid || msg.from || '',
          to: msg.to || '',
          body: msgBody,
          timestamp: msg.messageTimestamp || msg.timestamp || Date.now() / 1000,
          fromMe: resolvedFromMe,
          hasMedia: !!msg.hasMedia,
          mediaType,
          mediaUrl,
        };
      });

      // Ordenar por timestamp (mais antigas primeiro)
      converted.sort((a, b) => a.timestamp - b.timestamp);

      // Verificar se há novas mensagens (usando ref para evitar stale closure)
      const currentMessages = messagesRef.current;
      const lastMsg = converted[converted.length - 1];
      
      if (lastMsg && lastMsg.id !== lastMessageIdRef.current) {
        // Detectar quais são novas (que não estavam antes)
        const oldIds = new Set(currentMessages.map(m => m.id));
        const newMessages = converted.filter(m => !oldIds.has(m.id));
        
        console.log('[WahaPolling] 📊 Comparação:', {
          oldCount: currentMessages.length,
          newCount: converted.length,
          newMsgsCount: newMessages.length,
          lastMsgIdBefore: lastMessageIdRef.current,
          lastMsgIdNow: lastMsg.id,
        });
        
        // Só notificar se não for primeira carga (lastMessageIdRef já tinha valor)
        if (newMessages.length > 0 && lastMessageIdRef.current !== null) {
          // Chamar callback para cada nova mensagem
          for (const newMsg of newMessages) {
            console.log('[WahaPolling] 📬 Nova mensagem detectada:', {
              from: newMsg.from?.substring(0, 15) || 'desconhecido',
              body: newMsg.body?.substring(0, 30) || '(vazio)',
              fromMe: newMsg.fromMe,
            });
            onNewMessage?.(newMsg);
          }
        }

        lastMessageIdRef.current = lastMsg.id;
      }

      setMessages(converted);
      setLastUpdate(new Date());
      setLastError(null);

    } catch (error) {
      console.error('[WahaPolling] ❌ Erro ao buscar mensagens:', error);
      setLastError(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }, [chatId, limit, onNewMessage]); // Removido 'messages' das dependências

  // ============================================
  // START/STOP POLLING
  // ============================================

  const start = useCallback(() => {
    if (intervalRef.current || !chatId) return;

    console.log('[WahaPolling] ▶️ Iniciando polling para:', chatId);
    isActiveRef.current = true;
    setIsPolling(true);

    // Primeira busca imediata
    fetchMessages();

    // Iniciar intervalo
    const effectiveInterval = Math.max(intervalMs, MIN_POLL_INTERVAL_MS);
    intervalRef.current = setInterval(() => {
      if (isActiveRef.current) {
        fetchMessages();
      }
    }, effectiveInterval);
  }, [chatId, intervalMs, fetchMessages]);

  const stop = useCallback(() => {
    console.log('[WahaPolling] ⏹️ Parando polling');
    isActiveRef.current = false;
    setIsPolling(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const refresh = useCallback(async () => {
    console.log('[WahaPolling] 🔄 Refresh manual');
    await fetchMessages();
  }, [fetchMessages]);

  // ============================================
  // EFFECTS
  // ============================================

  // Iniciar/parar baseado em enabled e chatId
  useEffect(() => {
    if (enabled && chatId) {
      // Reset do lastMessageId quando mudar de chat
      lastMessageIdRef.current = null;
      setMessages([]);
      start();
    } else {
      stop();
    }

    return () => {
      stop();
    };
  }, [enabled, chatId]); // Não incluir start/stop para evitar loops

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  // ============================================
  // RETURN
  // ============================================

  return {
    messages,
    isPolling,
    lastUpdate,
    lastError,
    refresh,
    stop,
    start,
  };
}

export default useWahaPolling;
