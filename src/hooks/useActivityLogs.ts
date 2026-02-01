/**
 * USE ACTIVITY LOGS
 * 
 * Hook para gerenciar histórico de atividades/ações em conversas
 * Cada ação (cotação, check-in, observação) é registrada com dados específicos
 * 
 * @version 1.1.0
 * @date 2026-01-30
 * 
 * MUDANÇAS v1.1.0:
 * - Adicionado sistema de eventos para sincronização entre instâncias
 * - Quando um log é adicionado, outras instâncias são notificadas
 */

import { useState, useCallback, useEffect } from 'react';
import { getSupabaseClient } from '@/utils/supabase/client';
import { useAuth } from '../contexts/AuthContext';

// ============================================
// EVENT SYSTEM - Sincronização entre instâncias
// ============================================

type ActivityLogEventCallback = (contactPhone: string, log: ActivityLog) => void;

// Mapa de listeners por evento
const activityLogListeners: Set<ActivityLogEventCallback> = new Set();

/**
 * Notifica todas as instâncias que um novo log foi adicionado
 */
function notifyActivityLogAdded(contactPhone: string, log: ActivityLog) {
  activityLogListeners.forEach(callback => {
    try {
      callback(contactPhone, log);
    } catch (err) {
      console.error('[useActivityLogs] Erro no listener:', err);
    }
  });
}

/**
 * Registra um listener para novos logs
 */
function subscribeToActivityLogs(callback: ActivityLogEventCallback): () => void {
  activityLogListeners.add(callback);
  return () => {
    activityLogListeners.delete(callback);
  };
}

// ============================================
// TYPES
// ============================================

export type ActivityActionType = 
  | 'quotation'        // Cotação enviada
  | 'checkin_status'   // Status de check-in alterado
  | 'observation'      // Observação/nota adicionada
  | 'reservation'      // Reserva criada
  | 'deal_created'     // Deal/negociação criado
  | 'block_created'    // Bloqueio criado
  | 'message_sent';    // Mensagem template enviada

export interface QuotationData {
  property_id: string;
  property_name: string;
  check_in: string;
  check_out: string;
  nights: number;
  total_value: number;
  currency?: string;
  guests?: number;
}

export interface CheckinStatusData {
  property_id: string;
  property_name: string;
  reservation_code?: string;
  guest_name?: string;
  old_status?: string;
  new_status: string;
  instructions_sent?: boolean;
}

export interface ObservationData {
  text: string;
  category?: string;
}

export interface ReservationData {
  property_id: string;
  property_name: string;
  reservation_code: string;
  check_in: string;
  check_out: string;
  guest_name: string;
  total_value?: number;
}

export interface DealData {
  deal_id: string;
  deal_name: string;
  stage?: string;
  value?: number;
}

export interface BlockData {
  property_id: string;
  property_name: string;
  start_date: string;
  end_date: string;
  reason?: string;
}

export interface MessageData {
  template_name?: string;
  message_preview: string;
}

export type ActivityData = 
  | QuotationData 
  | CheckinStatusData 
  | ObservationData 
  | ReservationData 
  | DealData 
  | BlockData
  | MessageData;

export interface ActivityLog {
  id: string;
  organization_id: string;
  contact_phone: string;
  action_type: ActivityActionType;
  action_data: ActivityData;
  user_id: string | null;
  user_name: string | null;
  created_at: string;
}

export interface UseActivityLogsReturn {
  logs: ActivityLog[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  currentPhone: string | null;
  
  // Actions
  loadLogs: (contactPhone: string, reset?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  addLog: (contactPhone: string, actionType: ActivityActionType, actionData: ActivityData) => Promise<ActivityLog | null>;
  clearLogs: () => void;
  /** Define o telefone a ser observado (para receber atualizações em tempo real) */
  setWatchPhone: (contactPhone: string | null) => void;
}

const PAGE_SIZE = 20;

// ============================================
// HOOK
// ============================================

export function useActivityLogs(): UseActivityLogsReturn {
  const { user, organization } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPhone, setCurrentPhone] = useState<string | null>(null);

  // Subscrever para atualizações de outras instâncias
  useEffect(() => {
    const unsubscribe = subscribeToActivityLogs((contactPhone, newLog) => {
      // Se o log é do mesmo contato que estamos mostrando, adicionar à lista
      if (contactPhone === currentPhone) {
        setLogs(prev => {
          // Verificar se já não existe (evitar duplicatas)
          if (prev.some(log => log.id === newLog.id)) {
            return prev;
          }
          return [newLog, ...prev];
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentPhone]);

  /**
   * Carregar logs de um contato
   */
  const loadLogs = useCallback(async (contactPhone: string, reset = true) => {
    if (!organization?.id) {
      console.warn('[useActivityLogs] No organization');
      return;
    }

    // Normalizar telefone (remover prefixo whatsapp- e sufixos JID)
    const normalizedPhone = contactPhone
      .replace(/^whatsapp-/, '')
      .replace(/@s\.whatsapp\.net$/, '')
      .replace(/@c\.us$/, '')
      .replace(/@lid$/, '');

    if (reset) {
      setLogs([]);
      setHasMore(true);
    }

    setCurrentPhone(normalizedPhone);
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      
      // Note: Using 'as any' because the table might not exist in generated types yet
      const { data, error: fetchError } = await (supabase as any)
        .from('conversation_activity_logs')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('contact_phone', normalizedPhone)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (fetchError) {
        // Se tabela não existe, não mostrar erro
        if (fetchError.code === '42P01') {
          console.warn('[useActivityLogs] Tabela não existe ainda');
          setLogs([]);
          setHasMore(false);
          return;
        }
        throw fetchError;
      }

      setLogs((data as ActivityLog[]) || []);
      setHasMore((data?.length || 0) >= PAGE_SIZE);
    } catch (err) {
      console.error('[useActivityLogs] Erro ao carregar:', err);
      setError('Erro ao carregar histórico');
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id]);

  /**
   * Carregar mais logs (paginação)
   */
  const loadMore = useCallback(async () => {
    if (!organization?.id || !currentPhone || isLoading || !hasMore) {
      return;
    }

    const lastLog = logs[logs.length - 1];
    if (!lastLog) return;

    setIsLoading(true);

    try {
      const supabase = getSupabaseClient();
      
      // Note: Using 'as any' because the table might not exist in generated types yet
      const { data, error: fetchError } = await (supabase as any)
        .from('conversation_activity_logs')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('contact_phone', currentPhone)
        .lt('created_at', lastLog.created_at)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (fetchError) throw fetchError;

      const newLogs = (data as ActivityLog[]) || [];
      setLogs(prev => [...prev, ...newLogs]);
      setHasMore(newLogs.length >= PAGE_SIZE);
    } catch (err) {
      console.error('[useActivityLogs] Erro ao carregar mais:', err);
      setError('Erro ao carregar mais itens');
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id, currentPhone, logs, isLoading, hasMore]);

  /**
   * Adicionar novo log de atividade
   */
  const addLog = useCallback(async (
    contactPhone: string,
    actionType: ActivityActionType,
    actionData: ActivityData
  ): Promise<ActivityLog | null> => {
    if (!organization?.id) {
      console.warn('[useActivityLogs] No organization');
      return null;
    }

    // Normalizar telefone
    const normalizedPhone = contactPhone
      .replace(/^whatsapp-/, '')
      .replace(/@s\.whatsapp\.net$/, '')
      .replace(/@c\.us$/, '')
      .replace(/@lid$/, '');

    try {
      const supabase = getSupabaseClient();
      
      const newLog = {
        organization_id: organization.id,
        contact_phone: normalizedPhone,
        action_type: actionType,
        action_data: actionData,
        user_id: user?.id || null,
        user_name: (user as any)?.user_metadata?.full_name || user?.email || null,
      };

      // Note: Using 'as any' because the table might not exist in generated types yet
      const { data, error: insertError } = await (supabase as any)
        .from('conversation_activity_logs')
        .insert(newLog)
        .select()
        .single();

      if (insertError) {
        // Se tabela não existe, apenas logar
        if (insertError.code === '42P01') {
          console.warn('[useActivityLogs] Tabela não existe, log não salvo');
          return null;
        }
        throw insertError;
      }

      const savedLog = data as ActivityLog;

      // Notificar TODAS as instâncias do hook (incluindo a nossa)
      // Isso garante que o ActivityLogSection seja atualizado mesmo quando
      // o addLog é chamado de outro componente (ex: CheckinManagementModal)
      notifyActivityLogAdded(normalizedPhone, savedLog);

      console.log('[useActivityLogs] ✅ Log adicionado:', actionType, savedLog.id);
      return savedLog;
    } catch (err) {
      console.error('[useActivityLogs] Erro ao adicionar log:', err);
      return null;
    }
  }, [organization?.id, user]);

  /**
   * Limpar logs (ao trocar conversa)
   */
  const clearLogs = useCallback(() => {
    setLogs([]);
    setCurrentPhone(null);
    setHasMore(true);
    setError(null);
  }, []);

  /**
   * Define o telefone a ser observado para receber atualizações em tempo real
   * Útil quando a seção está colapsada mas queremos receber novos logs
   */
  const setWatchPhone = useCallback((contactPhone: string | null) => {
    if (!contactPhone) {
      setCurrentPhone(null);
      return;
    }
    
    // Normalizar telefone
    const normalizedPhone = contactPhone
      .replace(/^whatsapp-/, '')
      .replace(/@s\.whatsapp\.net$/, '')
      .replace(/@c\.us$/, '')
      .replace(/@lid$/, '');
    
    setCurrentPhone(normalizedPhone);
  }, []);

  return {
    logs,
    isLoading,
    hasMore,
    error,
    currentPhone,
    loadLogs,
    loadMore,
    addLog,
    clearLogs,
    setWatchPhone,
  };
}

export default useActivityLogs;
