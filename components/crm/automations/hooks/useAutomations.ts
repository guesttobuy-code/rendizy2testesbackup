/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║               HOOK useAutomations - PERSISTÊNCIA ATÔMICA                  ║
 * ║                                                                           ║
 * ║  Hook para gerenciar automações seguindo o padrão de persistência        ║
 * ║  atômica do Rendizy (otimista + rollback + dirty tracking).              ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * @version 1.0.0
 * @date 2026-01-26
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../../../contexts/AuthContext';
import { 
  Automation, 
  AutomationDraft, 
  AutomationExecution,
  generateId,
  ConditionGroup,
  ActionConfig,
} from '../types';

// ============================================================================
// TIPOS DO HOOK
// ============================================================================

interface UseAutomationsState {
  automations: Automation[];
  executions: AutomationExecution[];
  loading: boolean;
  error: string | null;
  syncing: boolean;
  saving: boolean;
}

interface UseAutomationsReturn {
  automations: Automation[];
  executions: AutomationExecution[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  syncing: boolean;
  
  // CRUD
  createAutomation: (draft: AutomationDraft) => Promise<Automation | null>;
  updateAutomation: (id: string, updates: Partial<Automation>) => Promise<boolean>;
  deleteAutomation: (id: string) => Promise<boolean>;
  duplicateAutomation: (id: string) => Promise<Automation | null>;
  
  // Status
  toggleAutomation: (id: string, active?: boolean) => Promise<boolean>;
  pauseAutomation: (id: string) => Promise<boolean>;
  activateAutomation: (id: string) => Promise<boolean>;
  
  // Execução
  testAutomation: (id: string, testPayload?: Record<string, any>) => Promise<AutomationExecution | null>;
  getExecutions: (automationId: string, limit?: number) => Promise<AutomationExecution[]>;
  
  // Refresh
  refresh: () => Promise<void>;
}

// ============================================================================
// API HELPERS
// ============================================================================

const API_BASE = '/api';

async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Erro na requisição' };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error(`[useAutomations] API Error:`, error);
    return { success: false, error: error.message || 'Erro de conexão' };
  }
}

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

export function useAutomations(): UseAutomationsReturn {
  const { organization, user } = useAuth();
  const organizationId = organization?.id || user?.organizationId;

  // Estado
  const [state, setState] = useState<UseAutomationsState>({
    automations: [],
    executions: [],
    loading: true,
    error: null,
    syncing: false,
    saving: false,
  });

  // Ref para controle de dirty state
  const dirtyRef = useRef<Set<string>>(new Set());
  const rollbackRef = useRef<Map<string, Automation>>(new Map());

  // ──────────────────────────────────────────────────────────────────────────
  // LOAD INICIAL
  // ──────────────────────────────────────────────────────────────────────────
  
  const loadAutomations = useCallback(async () => {
    if (!organizationId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Tentar carregar do backend
      const response = await apiCall<Automation[]>(
        `/automations?organizationId=${organizationId}`
      );

      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          automations: response.data!,
          loading: false,
        }));
      } else {
        // Fallback: localStorage
        const cached = localStorage.getItem(`rendizy_automations_${organizationId}`);
        if (cached) {
          setState(prev => ({
            ...prev,
            automations: JSON.parse(cached),
            loading: false,
          }));
        } else {
          setState(prev => ({ ...prev, automations: [], loading: false }));
        }
      }
    } catch (error: any) {
      console.error('[useAutomations] Load error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Erro ao carregar automações',
      }));
    }
  }, [organizationId]);

  useEffect(() => {
    loadAutomations();
  }, [loadAutomations]);

  // ──────────────────────────────────────────────────────────────────────────
  // PERSISTÊNCIA LOCAL (BACKUP)
  // ──────────────────────────────────────────────────────────────────────────
  
  const persistLocal = useCallback((automations: Automation[]) => {
    if (organizationId) {
      localStorage.setItem(
        `rendizy_automations_${organizationId}`,
        JSON.stringify(automations)
      );
    }
  }, [organizationId]);

  // ──────────────────────────────────────────────────────────────────────────
  // SYNC COM BACKEND (DEBOUNCED)
  // ──────────────────────────────────────────────────────────────────────────
  
  const syncToBackend = useCallback(async (automation: Automation, action: 'create' | 'update' | 'delete') => {
    setState(prev => ({ ...prev, syncing: true }));

    try {
      let response;

      switch (action) {
        case 'create':
          response = await apiCall<Automation>('/automations', {
            method: 'POST',
            body: JSON.stringify(automation),
          });
          break;

        case 'update':
          response = await apiCall<Automation>(`/automations/${automation.id}`, {
            method: 'PUT',
            body: JSON.stringify(automation),
          });
          break;

        case 'delete':
          response = await apiCall(`/automations/${automation.id}`, {
            method: 'DELETE',
          });
          break;
      }

      if (!response?.success) {
        throw new Error(response?.error || 'Erro ao sincronizar');
      }

      // Limpar dirty state
      dirtyRef.current.delete(automation.id);
      rollbackRef.current.delete(automation.id);

      return true;
    } catch (error: any) {
      console.error('[useAutomations] Sync error:', error);
      
      // Rollback se necessário
      const rollbackData = rollbackRef.current.get(automation.id);
      if (rollbackData && action !== 'create') {
        setState(prev => ({
          ...prev,
          automations: prev.automations.map(a => 
            a.id === automation.id ? rollbackData : a
          ),
        }));
        toast.error('Erro ao salvar. Alterações revertidas.');
      }

      return false;
    } finally {
      setState(prev => ({ ...prev, syncing: false }));
    }
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────────────────────────────────────
  
  const createAutomation = useCallback(async (draft: AutomationDraft): Promise<Automation | null> => {
    if (!organizationId || !draft.trigger) {
      toast.error('Dados incompletos para criar automação');
      return null;
    }

    const now = new Date().toISOString();
    const newAutomation: Automation = {
      id: generateId(),
      organization_id: organizationId,
      name: draft.name || 'Nova Automação',
      description: draft.description,
      status: draft.isActive ? 'active' : 'draft',
      isActive: draft.isActive,
      category: draft.category,
      trigger: draft.trigger,
      conditions: draft.conditions,
      actions: draft.actions,
      module: draft.module,
      tags: draft.tags,
      priority: draft.priority,
      stats: {
        totalRuns: 0,
        successRuns: 0,
        failedRuns: 0,
      },
      created_at: now,
      updated_at: now,
      created_by: user?.id,
    };

    // Otimista: atualiza UI imediatamente
    setState(prev => {
      const updated = [...prev.automations, newAutomation];
      persistLocal(updated);
      return { ...prev, automations: updated };
    });

    toast.success('Automação criada!');

    // Sync com backend em background
    const synced = await syncToBackend(newAutomation, 'create');
    if (!synced) {
      toast.warning('Salvo localmente. Sincronização pendente.');
    }

    return newAutomation;
  }, [organizationId, user, persistLocal, syncToBackend]);

  // ──────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────────────────────────────────────
  
  const updateAutomation = useCallback(async (
    id: string, 
    updates: Partial<Automation>
  ): Promise<boolean> => {
    const current = state.automations.find(a => a.id === id);
    if (!current) {
      toast.error('Automação não encontrada');
      return false;
    }

    // Guardar para rollback
    rollbackRef.current.set(id, { ...current });
    dirtyRef.current.add(id);

    const updated: Automation = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Otimista: atualiza UI imediatamente
    setState(prev => {
      const newList = prev.automations.map(a => a.id === id ? updated : a);
      persistLocal(newList);
      return { ...prev, automations: newList };
    });

    // Sync com backend
    const synced = await syncToBackend(updated, 'update');
    if (synced) {
      toast.success('Automação atualizada!');
    }

    return synced;
  }, [state.automations, persistLocal, syncToBackend]);

  // ──────────────────────────────────────────────────────────────────────────
  // DELETE
  // ──────────────────────────────────────────────────────────────────────────
  
  const deleteAutomation = useCallback(async (id: string): Promise<boolean> => {
    const current = state.automations.find(a => a.id === id);
    if (!current) {
      toast.error('Automação não encontrada');
      return false;
    }

    // Guardar para rollback
    rollbackRef.current.set(id, { ...current });

    // Otimista: remove da UI
    setState(prev => {
      const newList = prev.automations.filter(a => a.id !== id);
      persistLocal(newList);
      return { ...prev, automations: newList };
    });

    toast.success('Automação excluída!');

    // Sync com backend
    const synced = await syncToBackend(current, 'delete');
    if (!synced) {
      // Rollback
      setState(prev => ({
        ...prev,
        automations: [...prev.automations, current],
      }));
      toast.error('Erro ao excluir. Automação restaurada.');
      return false;
    }

    rollbackRef.current.delete(id);
    return true;
  }, [state.automations, persistLocal, syncToBackend]);

  // ──────────────────────────────────────────────────────────────────────────
  // DUPLICATE
  // ──────────────────────────────────────────────────────────────────────────
  
  const duplicateAutomation = useCallback(async (id: string): Promise<Automation | null> => {
    const original = state.automations.find(a => a.id === id);
    if (!original) {
      toast.error('Automação não encontrada');
      return null;
    }

    const draft: AutomationDraft = {
      name: `${original.name} (Cópia)`,
      description: original.description || '',
      trigger: { ...original.trigger, id: generateId() },
      conditions: original.conditions.map((g: ConditionGroup) => ({
        ...g,
        id: generateId(),
        conditions: g.conditions.map((c) => ({ ...c, id: generateId() })),
      })),
      actions: original.actions.map((a: ActionConfig) => ({ ...a, id: generateId() })),
      module: original.module,
      tags: [...original.tags],
      priority: original.priority,
      category: original.category,
      isActive: false, // Cópia inicia desativada
    };

    return createAutomation(draft);
  }, [state.automations, createAutomation]);

  // ──────────────────────────────────────────────────────────────────────────
  // STATUS MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────
  
  const toggleAutomation = useCallback(async (id: string, active?: boolean): Promise<boolean> => {
    const current = state.automations.find(a => a.id === id);
    if (!current) return false;

    const newActive = active !== undefined ? active : !current.isActive;
    const newStatus: Automation['status'] = newActive ? 'active' : 'paused';

    return updateAutomation(id, { status: newStatus, isActive: newActive });
  }, [state.automations, updateAutomation]);

  const pauseAutomation = useCallback(async (id: string): Promise<boolean> => {
    return updateAutomation(id, { status: 'paused' });
  }, [updateAutomation]);

  const activateAutomation = useCallback(async (id: string): Promise<boolean> => {
    const current = state.automations.find(a => a.id === id);
    if (!current) return false;

    // Validar se pode ativar
    if (!current.trigger || current.actions.length === 0) {
      toast.error('Configure trigger e pelo menos uma ação para ativar');
      return false;
    }

    return updateAutomation(id, { status: 'active' });
  }, [state.automations, updateAutomation]);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST / EXECUTE
  // ──────────────────────────────────────────────────────────────────────────
  
  const testAutomation = useCallback(async (
    id: string, 
    testPayload?: Record<string, any>
  ): Promise<AutomationExecution | null> => {
    const automation = state.automations.find(a => a.id === id);
    if (!automation) {
      toast.error('Automação não encontrada');
      return null;
    }

    toast.loading('Testando automação...', { id: 'test-automation' });

    try {
      const response = await apiCall<AutomationExecution>(`/automations/${id}/test`, {
        method: 'POST',
        body: JSON.stringify({ payload: testPayload || {} }),
      });

      if (response.success && response.data) {
        toast.success('Teste executado!', { id: 'test-automation' });
        return response.data;
      } else {
        toast.error(response.error || 'Erro ao testar', { id: 'test-automation' });
        return null;
      }
    } catch (error: any) {
      toast.error('Erro ao testar automação', { id: 'test-automation' });
      return null;
    }
  }, [state.automations]);

  const getExecutions = useCallback(async (
    automationId: string, 
    limit = 10
  ): Promise<AutomationExecution[]> => {
    try {
      const response = await apiCall<AutomationExecution[]>(
        `/automations/${automationId}/executions?limit=${limit}`
      );

      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch {
      return [];
    }
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // REFRESH
  // ──────────────────────────────────────────────────────────────────────────
  
  const refresh = useCallback(async () => {
    await loadAutomations();
  }, [loadAutomations]);

  // ──────────────────────────────────────────────────────────────────────────
  // RETURN
  // ──────────────────────────────────────────────────────────────────────────
  
  return {
    automations: state.automations,
    executions: state.executions,
    isLoading: state.loading,
    isSaving: state.saving,
    error: state.error,
    syncing: state.syncing,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    duplicateAutomation,
    toggleAutomation,
    pauseAutomation,
    activateAutomation,
    testAutomation,
    getExecutions,
    refresh,
  };
}

export default useAutomations;
