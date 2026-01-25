/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                         MESSAGE QUEUE                                      ║
 * ║                                                                            ║
 * ║  🔒 ZONA_CRITICA_CHAT - Sistema de fila para mensagens offline            ║
 * ║  📱 OFFLINE_SUPPORT - Salva em localStorage e reenvia quando online       ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Sistema de fila de mensagens para suporte offline.
 * Quando o usuário tenta enviar uma mensagem e está offline ou a API falha,
 * a mensagem é salva em localStorage e reenviada automaticamente.
 * 
 * @version 1.0.0
 * @date 2026-01-25
 * @see /docs/ROADMAP-CHAT.md
 */

// ============================================
// TYPES
// ============================================

export type QueuedMessageStatus = 'pending' | 'sending' | 'sent' | 'failed';

export interface QueuedMessage {
  /** ID único da mensagem na fila */
  id: string;
  /** ChatId no formato JID (ex: 5521999999999@c.us) */
  chatId: string;
  /** Texto da mensagem */
  text: string;
  /** Timestamp de criação */
  createdAt: number;
  /** Status atual */
  status: QueuedMessageStatus;
  /** Número de tentativas de envio */
  retryCount: number;
  /** Timestamp da última tentativa */
  lastRetryAt?: number;
  /** Erro da última tentativa */
  lastError?: string;
  /** Provider a usar (waha ou evolution) */
  provider?: 'waha' | 'evolution';
  /** Anexos (URLs) */
  attachments?: string[];
}

export interface MessageQueueState {
  /** Mensagens na fila */
  messages: QueuedMessage[];
  /** Se está processando a fila */
  isProcessing: boolean;
  /** Se está online */
  isOnline: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEY = 'rendizy-message-queue';
const MAX_QUEUE_SIZE = 50;
const MAX_RETRY_COUNT = 5;
const RETRY_DELAYS = [3000, 6000, 12000, 24000, 48000]; // Backoff exponencial

// ============================================
// STORAGE HELPERS
// ============================================

/**
 * Carrega a fila do localStorage
 */
export function loadQueue(): QueuedMessage[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[MessageQueue] Erro ao carregar fila:', error);
    return [];
  }
}

/**
 * Salva a fila no localStorage
 */
export function saveQueue(messages: QueuedMessage[]): void {
  try {
    // Limitar tamanho da fila
    const trimmed = messages.slice(-MAX_QUEUE_SIZE);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('[MessageQueue] Erro ao salvar fila:', error);
  }
}

/**
 * Limpa a fila do localStorage
 */
export function clearQueue(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[MessageQueue] Erro ao limpar fila:', error);
  }
}

// ============================================
// QUEUE OPERATIONS
// ============================================

/**
 * Gera um ID único para mensagem na fila
 */
export function generateQueueId(): string {
  return `queue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Adiciona uma mensagem à fila
 */
export function addToQueue(
  chatId: string,
  text: string,
  options?: {
    provider?: 'waha' | 'evolution';
    attachments?: string[];
  }
): QueuedMessage {
  const queue = loadQueue();
  
  const message: QueuedMessage = {
    id: generateQueueId(),
    chatId,
    text,
    createdAt: Date.now(),
    status: 'pending',
    retryCount: 0,
    provider: options?.provider,
    attachments: options?.attachments,
  };
  
  queue.push(message);
  saveQueue(queue);
  
  console.log('[MessageQueue] ➕ Mensagem adicionada à fila:', message.id);
  return message;
}

/**
 * Atualiza o status de uma mensagem na fila
 */
export function updateQueueMessage(
  id: string,
  updates: Partial<QueuedMessage>
): QueuedMessage | null {
  const queue = loadQueue();
  const index = queue.findIndex(m => m.id === id);
  
  if (index === -1) {
    console.warn('[MessageQueue] Mensagem não encontrada:', id);
    return null;
  }
  
  queue[index] = { ...queue[index], ...updates };
  saveQueue(queue);
  
  return queue[index];
}

/**
 * Remove uma mensagem da fila
 */
export function removeFromQueue(id: string): boolean {
  const queue = loadQueue();
  const filtered = queue.filter(m => m.id !== id);
  
  if (filtered.length === queue.length) {
    return false;
  }
  
  saveQueue(filtered);
  console.log('[MessageQueue] ➖ Mensagem removida da fila:', id);
  return true;
}

/**
 * Obtém mensagens pendentes de um chat específico
 */
export function getPendingMessages(chatId?: string): QueuedMessage[] {
  const queue = loadQueue();
  return queue.filter(m => {
    const isPending = m.status === 'pending' || m.status === 'failed';
    const matchesChat = !chatId || m.chatId === chatId;
    return isPending && matchesChat;
  });
}

/**
 * Obtém o delay de retry baseado no número de tentativas
 */
export function getRetryDelay(retryCount: number): number {
  const index = Math.min(retryCount, RETRY_DELAYS.length - 1);
  return RETRY_DELAYS[index];
}

/**
 * Verifica se uma mensagem pode ser reenviada
 */
export function canRetry(message: QueuedMessage): boolean {
  if (message.retryCount >= MAX_RETRY_COUNT) {
    return false;
  }
  
  if (message.lastRetryAt) {
    const delay = getRetryDelay(message.retryCount);
    const elapsed = Date.now() - message.lastRetryAt;
    return elapsed >= delay;
  }
  
  return true;
}

/**
 * Marca uma mensagem como enviando
 */
export function markAsSending(id: string): QueuedMessage | null {
  return updateQueueMessage(id, {
    status: 'sending',
    lastRetryAt: Date.now(),
  });
}

/**
 * Marca uma mensagem como enviada (sucesso)
 */
export function markAsSent(id: string): boolean {
  // Remove da fila quando enviada com sucesso
  return removeFromQueue(id);
}

/**
 * Marca uma mensagem como falha
 */
export function markAsFailed(id: string, error: string): QueuedMessage | null {
  const queue = loadQueue();
  const message = queue.find(m => m.id === id);
  
  if (!message) return null;
  
  return updateQueueMessage(id, {
    status: 'failed',
    retryCount: message.retryCount + 1,
    lastError: error,
    lastRetryAt: Date.now(),
  });
}

// ============================================
// QUEUE PROCESSOR
// ============================================

export type SendMessageFn = (
  chatId: string,
  text: string,
  options?: { attachments?: string[] }
) => Promise<{ success: boolean; error?: string }>;

/**
 * Processa a fila de mensagens pendentes
 */
export async function processQueue(
  sendMessage: SendMessageFn,
  options?: {
    chatId?: string;
    onProgress?: (processed: number, total: number) => void;
    onMessageSent?: (message: QueuedMessage) => void;
    onMessageFailed?: (message: QueuedMessage, error: string) => void;
  }
): Promise<{ sent: number; failed: number }> {
  const pending = getPendingMessages(options?.chatId);
  
  if (pending.length === 0) {
    return { sent: 0, failed: 0 };
  }
  
  console.log(`[MessageQueue] 🔄 Processando ${pending.length} mensagens pendentes`);
  
  let sent = 0;
  let failed = 0;
  
  for (let i = 0; i < pending.length; i++) {
    const message = pending[i];
    
    // Verificar se pode reenviar
    if (!canRetry(message)) {
      console.log(`[MessageQueue] ⏭️ Mensagem ${message.id} atingiu limite de retries`);
      failed++;
      continue;
    }
    
    // Marcar como enviando
    markAsSending(message.id);
    
    try {
      // Tentar enviar
      const result = await sendMessage(message.chatId, message.text, {
        attachments: message.attachments,
      });
      
      if (result.success) {
        markAsSent(message.id);
        sent++;
        options?.onMessageSent?.(message);
        console.log(`[MessageQueue] ✅ Mensagem ${message.id} enviada com sucesso`);
      } else {
        markAsFailed(message.id, result.error || 'Erro desconhecido');
        failed++;
        options?.onMessageFailed?.(message, result.error || 'Erro desconhecido');
        console.log(`[MessageQueue] ❌ Mensagem ${message.id} falhou:`, result.error);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      markAsFailed(message.id, errorMsg);
      failed++;
      options?.onMessageFailed?.(message, errorMsg);
      console.error(`[MessageQueue] ❌ Erro ao enviar mensagem ${message.id}:`, error);
    }
    
    // Callback de progresso
    options?.onProgress?.(i + 1, pending.length);
    
    // Pequeno delay entre envios para não sobrecarregar a API
    if (i < pending.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`[MessageQueue] 📊 Resultado: ${sent} enviadas, ${failed} falharam`);
  return { sent, failed };
}

// ============================================
// ONLINE/OFFLINE DETECTION
// ============================================

/**
 * Verifica se está online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Adiciona listeners para eventos online/offline
 */
export function addOnlineListeners(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  
  // Retorna função de cleanup
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

// ============================================
// EXPORTS
// ============================================

export const MessageQueue = {
  load: loadQueue,
  save: saveQueue,
  clear: clearQueue,
  add: addToQueue,
  update: updateQueueMessage,
  remove: removeFromQueue,
  getPending: getPendingMessages,
  process: processQueue,
  markAsSending,
  markAsSent,
  markAsFailed,
  canRetry,
  getRetryDelay,
  isOnline,
  addOnlineListeners,
};

export default MessageQueue;
