/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                       USE MESSAGE QUEUE HOOK                               ║
 * ║                                                                            ║
 * ║  🔒 ZONA_CRITICA_CHAT - Hook React para fila de mensagens offline         ║
 * ║  📱 OFFLINE_SUPPORT - Gerencia estado e auto-processamento                ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Hook para integrar o sistema de fila de mensagens em componentes React.
 * Gerencia estado, detecta online/offline e processa automaticamente.
 * 
 * @version 1.0.0
 * @date 2026-01-25
 * @see /docs/ROADMAP-CHAT.md
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageQueue,
  QueuedMessage,
  SendMessageFn,
  loadQueue,
} from '../utils/chat/messageQueue';

// ============================================
// TYPES
// ============================================

export interface UseMessageQueueOptions {
  /** Função para enviar mensagem (chamada pelo processador) */
  sendMessage: SendMessageFn;
  /** ChatId específico para filtrar (opcional) */
  chatId?: string;
  /** Processar automaticamente quando ficar online */
  autoProcess?: boolean;
  /** Intervalo de verificação (ms) - default 5000 */
  checkInterval?: number;
}

export interface UseMessageQueueReturn {
  /** Mensagens pendentes na fila */
  pendingMessages: QueuedMessage[];
  /** Se está processando a fila */
  isProcessing: boolean;
  /** Se está online */
  isOnline: boolean;
  /** Número de mensagens pendentes */
  pendingCount: number;
  /** Adiciona uma mensagem à fila */
  enqueue: (chatId: string, text: string, attachments?: string[]) => QueuedMessage;
  /** Processa a fila manualmente */
  process: () => Promise<{ sent: number; failed: number }>;
  /** Remove uma mensagem da fila */
  remove: (id: string) => void;
  /** Limpa toda a fila */
  clear: () => void;
  /** Recarrega a fila do localStorage */
  refresh: () => void;
}

// ============================================
// HOOK
// ============================================

export function useMessageQueue(
  options: UseMessageQueueOptions
): UseMessageQueueReturn {
  const {
    sendMessage,
    chatId,
    autoProcess = true,
    checkInterval = 5000,
  } = options;
  
  // State
  const [pendingMessages, setPendingMessages] = useState<QueuedMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(() => MessageQueue.isOnline());
  
  // Refs para callbacks
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;
  
  // Ref para evitar processamento duplicado
  const processingRef = useRef(false);
  
  // ============================================
  // LOAD / REFRESH
  // ============================================
  
  const refresh = useCallback(() => {
    const pending = MessageQueue.getPending(chatId);
    setPendingMessages(pending);
  }, [chatId]);
  
  // Carregar na inicialização
  useEffect(() => {
    refresh();
  }, [refresh]);
  
  // ============================================
  // ONLINE/OFFLINE DETECTION
  // ============================================
  
  useEffect(() => {
    const handleOnline = () => {
      console.log('[useMessageQueue] 🌐 Ficou online');
      setIsOnline(true);
    };
    
    const handleOffline = () => {
      console.log('[useMessageQueue] 📴 Ficou offline');
      setIsOnline(false);
    };
    
    return MessageQueue.addOnlineListeners(handleOnline, handleOffline);
  }, []);
  
  // ============================================
  // PROCESS QUEUE
  // ============================================
  
  const process = useCallback(async (): Promise<{ sent: number; failed: number }> => {
    // Evitar processamento duplicado
    if (processingRef.current) {
      console.log('[useMessageQueue] ⏭️ Já está processando, ignorando');
      return { sent: 0, failed: 0 };
    }
    
    // Verificar se tem mensagens pendentes
    const pending = MessageQueue.getPending(chatId);
    if (pending.length === 0) {
      return { sent: 0, failed: 0 };
    }
    
    processingRef.current = true;
    setIsProcessing(true);
    
    try {
      const result = await MessageQueue.process(sendMessageRef.current, {
        chatId,
        onMessageSent: () => refresh(),
        onMessageFailed: () => refresh(),
      });
      
      return result;
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
      refresh();
    }
  }, [chatId, refresh]);
  
  // Auto-process quando ficar online
  useEffect(() => {
    if (autoProcess && isOnline && pendingMessages.length > 0) {
      console.log('[useMessageQueue] 🔄 Auto-processando fila após ficar online');
      process();
    }
  }, [autoProcess, isOnline, pendingMessages.length, process]);
  
  // ============================================
  // PERIODIC CHECK
  // ============================================
  
  useEffect(() => {
    if (!autoProcess) return;
    
    const interval = setInterval(() => {
      // Atualizar lista de pendentes
      refresh();
      
      // Se online e tem pendentes, tentar processar
      if (isOnline && !processingRef.current) {
        const pending = MessageQueue.getPending(chatId);
        if (pending.some(m => MessageQueue.canRetry(m))) {
          process();
        }
      }
    }, checkInterval);
    
    return () => clearInterval(interval);
  }, [autoProcess, chatId, checkInterval, isOnline, process, refresh]);
  
  // ============================================
  // ENQUEUE
  // ============================================
  
  const enqueue = useCallback((
    targetChatId: string,
    text: string,
    attachments?: string[]
  ): QueuedMessage => {
    const message = MessageQueue.add(targetChatId, text, { attachments });
    refresh();
    return message;
  }, [refresh]);
  
  // ============================================
  // REMOVE / CLEAR
  // ============================================
  
  const remove = useCallback((id: string) => {
    MessageQueue.remove(id);
    refresh();
  }, [refresh]);
  
  const clear = useCallback(() => {
    MessageQueue.clear();
    setPendingMessages([]);
  }, []);
  
  // ============================================
  // RETURN
  // ============================================
  
  return {
    pendingMessages,
    isProcessing,
    isOnline,
    pendingCount: pendingMessages.length,
    enqueue,
    process,
    remove,
    clear,
    refresh,
  };
}

export default useMessageQueue;
