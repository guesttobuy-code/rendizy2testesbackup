/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                         USE CHAT POLLING                                   ║
 * ║                                                                            ║
 * ║  🔒 ZONA_CRITICA_CHAT - NÃO MODIFICAR SEM REVISAR ADR-007                 ║
 * ║  ⚠️  MULTI-PROVIDER - Polling para Evolution + WAHA                       ║
 * ║  📱 WHATSAPP_JID - Verifica novas mensagens periodicamente                ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Hook UNIFICADO para polling de mensagens de QUALQUER provider (Evolution/WAHA).
 * 
 * @version 1.0.0
 * @date 2026-01-25
 * @see /docs/adr/ADR-010-MULTI-PROVIDER-CHAT.md
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { fetchMessagesForChat, type NormalizedMessage } from '../utils/chat/unifiedChatService';

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_POLL_INTERVAL_MS = 3000; // 3 segundos

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
  provider?: 'evolution' | 'waha';
}

export interface UseChatPollingOptions {
  /** Chat ID no formato JID (ex: 5521999999999@c.us ou 5521999999999@s.whatsapp.net) */
  chatId: string;
  
  /** Provider a usar (auto-detect se não especificado) */
  provider?: 'evolution' | 'waha';
  
  /** Habilitar/desabilitar polling */
  enabled?: boolean;
  
  /** Intervalo de polling em ms (default: 3000) */
  intervalMs?: number;
  
  /** Callback quando detectar nova mensagem */
  onNewMessage?: (message: PolledMessage) => void;
  
  /** Número máximo de mensagens a buscar por poll */
  limit?: number;
}

export interface UseChatPollingReturn {
  /** Lista de mensagens */
  messages: PolledMessage[];
  
  /** Se está fazendo polling ativo */
  isPolling: boolean;
  
  /** Timestamp da última atualização */
  lastUpdate: Date | null;
  
  /** Erro da última requisição (se houver) */
  lastError: string | null;
  
  /** Provider ativo detectado */
  activeProvider: 'evolution' | 'waha' | null;
  
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

export function useChatPolling(options: UseChatPollingOptions): UseChatPollingReturn {
  const {
    chatId,
    provider,
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
  const [activeProvider, setActiveProvider] = useState<'evolution' | 'waha' | null>(null);

  // Refs
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const isActiveRef = useRef(false);
  const messagesRef = useRef<PolledMessage[]>([]);

  // Manter messagesRef atualizado
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // ============================================
  // DETECT PROVIDER FROM JID
  // ============================================
  
  const detectProvider = useCallback((jid: string): 'evolution' | 'waha' => {
    // @s.whatsapp.net = Evolution API
    // @c.us ou @lid = WAHA
    if (jid.includes('@s.whatsapp.net')) return 'evolution';
    return 'waha';
  }, []);

  // ============================================
  // NORMALIZE CHAT ID
  // ============================================
  
  const normalizeJid = useCallback((jid: string, targetProvider: 'evolution' | 'waha'): string => {
    // Extrair apenas números
    const phone = jid.replace(/[^0-9]/g, '');
    if (!phone || phone.length < 10) return jid;
    
    // Adicionar sufixo correto
    if (targetProvider === 'evolution') {
      return `${phone}@s.whatsapp.net`;
    } else {
      return `${phone}@c.us`;
    }
  }, []);

  // ============================================
  // FETCH MESSAGES
  // ============================================

  const fetchMessages = useCallback(async () => {
    if (!chatId || chatId.length < 5) return;

    try {
      // Detectar provider
      const detectedProvider = provider || detectProvider(chatId);
      setActiveProvider(detectedProvider);
      
      // Normalizar JID para o provider correto
      const normalizedChatId = normalizeJid(chatId, detectedProvider);
      
      console.log(`[ChatPolling] 🔄 Polling ${detectedProvider}: ${normalizedChatId}`);

      // Usar serviço unificado
      const result = await fetchMessagesForChat(normalizedChatId, limit);
      
      if (!result || result.length === 0) {
        console.log('[ChatPolling] ⚠️ Nenhuma mensagem retornada');
        return;
      }

      console.log(`[ChatPolling] 📦 Recebidas ${result.length} mensagens via ${detectedProvider}`);

      // Converter para formato interno
      const converted: PolledMessage[] = result.map((msg: NormalizedMessage) => ({
        id: msg.id,
        from: msg.fromMe ? 'me' : normalizedChatId,
        to: msg.fromMe ? normalizedChatId : 'me',
        body: msg.text || '',
        timestamp: msg.timestamp,
        fromMe: msg.fromMe,
        hasMedia: !!msg.mediaType && msg.mediaType !== 'text',
        mediaType: msg.mediaType === 'text' ? undefined : msg.mediaType,
        mediaUrl: msg.mediaUrl,
        provider: detectedProvider,
      }));

      // Atualizar estado
      setLastUpdate(new Date());
      setLastError(null);
      setIsPolling(true);

      // Detectar novas mensagens
      const currentIds = new Set(messagesRef.current.map(m => m.id));
      const newMessages = converted.filter(m => !currentIds.has(m.id));

      if (newMessages.length > 0) {
        console.log(`[ChatPolling] 🆕 ${newMessages.length} novas mensagens`);
        
        // Notificar callback
        if (onNewMessage) {
          // Ordenar por timestamp e pegar a mais recente não-fromMe
          const sortedNew = newMessages.sort((a, b) => b.timestamp - a.timestamp);
          const latestReceived = sortedNew.find(m => !m.fromMe);
          if (latestReceived) {
            onNewMessage(latestReceived);
          }
        }
      }

      // Mesclar mensagens (evitar duplicatas)
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const truly_new = converted.filter(m => !existingIds.has(m.id));
        
        if (truly_new.length === 0) return prev;
        
        // Adicionar novas e ordenar por timestamp
        const merged = [...prev, ...truly_new].sort((a, b) => a.timestamp - b.timestamp);
        return merged;
      });

      // Atualizar último ID
      if (converted.length > 0) {
        lastMessageIdRef.current = converted[converted.length - 1].id;
      }

    } catch (error) {
      console.error('[ChatPolling] ❌ Erro:', error);
      setLastError(error instanceof Error ? error.message : 'Erro desconhecido');
      setIsPolling(false);
    }
  }, [chatId, provider, limit, onNewMessage, detectProvider, normalizeJid]);

  // ============================================
  // START/STOP
  // ============================================

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isActiveRef.current = false;
    setIsPolling(false);
    console.log('[ChatPolling] ⏹️ Polling parado');
  }, []);

  const start = useCallback(() => {
    if (isActiveRef.current) return;
    
    isActiveRef.current = true;
    setIsPolling(true);
    
    // Buscar imediatamente
    fetchMessages();
    
    // Iniciar intervalo
    intervalRef.current = setInterval(fetchMessages, intervalMs);
    console.log(`[ChatPolling] ▶️ Polling iniciado (${intervalMs}ms)`);
  }, [fetchMessages, intervalMs]);

  const refresh = useCallback(async () => {
    console.log('[ChatPolling] 🔄 Refresh manual');
    await fetchMessages();
  }, [fetchMessages]);

  // ============================================
  // EFFECTS
  // ============================================

  // Iniciar/parar baseado em enabled
  useEffect(() => {
    if (enabled && chatId && chatId.length > 5) {
      start();
    } else {
      stop();
    }
    
    return () => stop();
  }, [enabled, chatId, start, stop]);

  // Limpar ao desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Reset quando chatId muda
  useEffect(() => {
    setMessages([]);
    lastMessageIdRef.current = null;
    setLastUpdate(null);
    setLastError(null);
  }, [chatId]);

  return {
    messages,
    isPolling,
    lastUpdate,
    lastError,
    activeProvider,
    refresh,
    stop,
    start,
  };
}

export default useChatPolling;
