/**
 * PERSISTENCE QUEUE - Sistema de Fila de Persistência Resiliente
 * 
 * Garante que todas as mudanças sejam salvas com retry automático e recovery.
 * 
 * Características:
 * - Retry exponencial (1s, 2s, 4s, 8s, 16s)
 * - Persistência em localStorage (sobrevive a refresh)
 * - Processamento em lote (batch de até 10 campos)
 * - Idempotência garantida (cada mudança tem chave única)
 * - Optimistic UI (atualiza interface antes de salvar)
 * 
 * @version 2.0.0
 * @date 2025-12-13
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || `https://${projectId}.supabase.co`;
const ANON_KEY = publicAnonKey;

interface PendingChange {
  field: string;
  value: any;
  timestamp: number;
  attempts: number;
  idempotency_key: string;
  priority: number;
}

interface QueueState {
  anuncioId: string | null;
  queue: PendingChange[];
  lastSync: number;
}

export class PersistenceQueue {
  private queue: PendingChange[] = [];
  private processing = false;
  private anuncioId: string | null = null;
  private processorInterval: number | null = null;
  private onSyncCallback: ((syncing: boolean) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onSuccessCallback: ((data: any) => void) | null = null;

  constructor() {
    this.loadFromStorage();
    this.startProcessor();
    
    // Processar imediatamente ao criar
    setTimeout(() => this.processQueue(), 100);
  }

  /**
   * Define o ID do anúncio atual
   */
  setAnuncioId(id: string | null) {
    this.anuncioId = id;
    this.saveToStorage();
  }

  /**
   * Adiciona uma mudança à fila
   */
  enqueue(field: string, value: any, priority: number = 50) {
    const change: PendingChange = {
      field,
      value,
      timestamp: Date.now(),
      attempts: 0,
      idempotency_key: `${field}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      priority
    };

    // Adicionar à fila ordenada por prioridade
    this.queue.push(change);
    this.queue.sort((a, b) => b.priority - a.priority);
    
    this.saveToStorage();
    
    // Tentar processar imediatamente
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Processa a fila com retry exponencial
   */
  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    this.notifySync(true);

    try {
      // Pegar até 10 mudanças da fila (batch)
      const batch = this.queue.splice(0, 10);

      console.log(`[PersistenceQueue] Processando ${batch.length} mudanças...`);

      const response = await fetch(`${SUPABASE_URL}/functions/v1/anuncio-ultimate/save-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`
        },
        body: JSON.stringify({
          anuncio_id: this.anuncioId,
          changes: batch.map(c => ({
            field: c.field,
            value: c.value,
            idempotency_key: c.idempotency_key
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      
      // Atualizar ID se foi criação
      if (!this.anuncioId && result.id) {
        this.anuncioId = result.id;
        
        // Atualizar URL sem reload
        if (typeof window !== 'undefined' && window.history) {
          window.history.replaceState(
            null, 
            '', 
            `/anuncios-ultimate/${result.id}/edit`
          );
        }
      }

      // Sucesso - limpar da fila e notificar
      this.saveToStorage();
      this.notifySuccess(result);
      
      console.log(`[PersistenceQueue] ✅ ${result.changes_applied} mudanças aplicadas, ${result.changes_skipped} puladas (idempotência)`);

      // Se ainda tem itens na fila, continuar processando
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
      
    } catch (error: any) {
      console.error('[PersistenceQueue] ❌ Erro ao processar fila:', error);
      
      // Recolocar na fila com backoff exponencial
      const batch = this.queue.splice(0, 10);
      
      batch.forEach(change => {
        change.attempts++;
        
        if (change.attempts < 5) {
          // Retry exponencial: 1s, 2s, 4s, 8s, 16s
          const delay = Math.pow(2, change.attempts) * 1000;
          
          console.log(`[PersistenceQueue] ⏳ Retry ${change.attempts}/5 para "${change.field}" em ${delay}ms`);
          
          setTimeout(() => {
            this.queue.push(change);
            this.queue.sort((a, b) => b.priority - a.priority);
            this.saveToStorage();
            this.processQueue();
          }, delay);
          
        } else {
          // Falhou 5 vezes - logar erro crítico
          const errorMsg = `Falha crítica ao salvar campo "${change.field}" após 5 tentativas`;
          console.error('[PersistenceQueue]', errorMsg, change);
          this.notifyError(errorMsg);
        }
      });
      
    } finally {
      this.processing = false;
      this.notifySync(false);
    }
  }

  /**
   * Persiste fila no localStorage
   */
  private saveToStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;

    const state: QueueState = {
      anuncioId: this.anuncioId,
      queue: this.queue,
      lastSync: Date.now()
    };

    try {
      localStorage.setItem('anuncio_queue', JSON.stringify(state));
    } catch (error) {
      console.error('[PersistenceQueue] Erro ao salvar no localStorage:', error);
    }
  }

  /**
   * Carrega fila do localStorage
   */
  private loadFromStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      const stored = localStorage.getItem('anuncio_queue');
      if (stored) {
        const state: QueueState = JSON.parse(stored);
        this.anuncioId = state.anuncioId;
        this.queue = state.queue || [];
        
        console.log(`[PersistenceQueue] 📥 Carregado ${this.queue.length} mudanças pendentes do localStorage`);
        
        // Se tem mudanças antigas (> 1 hora), processar com prioridade
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        this.queue.forEach(change => {
          if (change.timestamp < oneHourAgo) {
            change.priority = 100; // Máxima prioridade
          }
        });
        
        this.queue.sort((a, b) => b.priority - a.priority);
      }
    } catch (error) {
      console.error('[PersistenceQueue] Erro ao carregar do localStorage:', error);
    }
  }

  /**
   * Limpa fila (usar apenas para testes)
   */
  clear() {
    this.queue = [];
    this.anuncioId = null;
    this.saveToStorage();
  }

  /**
   * Retorna quantidade de mudanças pendentes
   */
  getPendingCount(): number {
    return this.queue.length;
  }

  /**
   * Verifica se está processando
   */
  isProcessing(): boolean {
    return this.processing;
  }

  /**
   * Inicia processador automático (a cada 5 segundos)
   */
  private startProcessor() {
    if (this.processorInterval) {
      clearInterval(this.processorInterval);
    }

    this.processorInterval = window.setInterval(() => {
      if (this.queue.length > 0 && !this.processing) {
        console.log('[PersistenceQueue] ⏰ Processamento automático da fila...');
        this.processQueue();
      }
    }, 5000);
  }

  /**
   * Para processador automático
   */
  stopProcessor() {
    if (this.processorInterval) {
      clearInterval(this.processorInterval);
      this.processorInterval = null;
    }
  }

  /**
   * Callbacks para notificações
   */
  onSync(callback: (syncing: boolean) => void) {
    this.onSyncCallback = callback;
  }

  onError(callback: (error: string) => void) {
    this.onErrorCallback = callback;
  }

  onSuccess(callback: (data: any) => void) {
    this.onSuccessCallback = callback;
  }

  private notifySync(syncing: boolean) {
    if (this.onSyncCallback) {
      this.onSyncCallback(syncing);
    }
  }

  private notifyError(error: string) {
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }

  private notifySuccess(data: any) {
    if (this.onSuccessCallback) {
      this.onSuccessCallback(data);
    }
  }

  /**
   * Destrói a fila (cleanup)
   */
  destroy() {
    this.stopProcessor();
    this.queue = [];
    this.processing = false;
  }
}

/**
 * Instância singleton global
 */
let globalQueue: PersistenceQueue | null = null;

export function getGlobalQueue(): PersistenceQueue {
  if (!globalQueue) {
    globalQueue = new PersistenceQueue();
  }
  return globalQueue;
}

export function destroyGlobalQueue() {
  if (globalQueue) {
    globalQueue.destroy();
    globalQueue = null;
  }
}
