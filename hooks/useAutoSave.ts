/**
 * RENDIZY - Auto Save Hook
 * 
 * Hook customizado para auto-save automático com debounce
 * Salva automaticamente quando:
 * - Usuário preenche campos (após 2 segundos de inatividade)
 * - Usuário muda de step
 * - Usuário clica em "Próximo"
 * 
 * @version 1.0.103.122
 * @date 2025-10-30
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions {
  onSave: (data: any) => Promise<void>;
  debounceMs?: number;
  showToasts?: boolean;
}

interface UseAutoSaveReturn {
  saveStatus: SaveStatus;
  triggerSave: () => Promise<void>;
  resetStatus: () => void;
}

export function useAutoSave(
  data: any,
  options: UseAutoSaveOptions
): UseAutoSaveReturn {
  const {
    onSave,
    debounceMs = 2000,
    showToasts = true,
  } = options;

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>('');
  const isFirstRender = useRef(true);

  // Função para salvar os dados
  const performSave = useCallback(async () => {
    try {
      setSaveStatus('saving');
      
      // Salvar no backend
      await onSave(data);
      
      // Salvar no localStorage como fallback
      const propertyId = data.id || 'draft';
      localStorage.setItem(`property_draft_${propertyId}`, JSON.stringify(data));
      
      setSaveStatus('saved');
      
      if (showToasts) {
        toast.success('Dados salvos automaticamente', {
          duration: 2000,
        });
      }

      // Atualizar referência dos últimos dados salvos
      lastSavedDataRef.current = JSON.stringify(data);

      // Reset para idle após 3 segundos
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
      
    } catch (error) {
      console.error('Erro ao salvar automaticamente:', error);
      setSaveStatus('error');
      
      if (showToasts) {
        toast.error('Erro ao salvar. Os dados estão sendo mantidos localmente.', {
          duration: 5000,
        });
      }

      // Reset para idle após 5 segundos
      setTimeout(() => {
        setSaveStatus('idle');
      }, 5000);
    }
  }, [data, onSave, showToasts]);

  // Trigger manual de salvamento (para quando mudar de step ou clicar em próximo)
  const triggerSave = useCallback(async () => {
    // Cancelar qualquer salvamento pendente
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Verificar se há mudanças
    const currentDataStr = JSON.stringify(data);
    if (currentDataStr === lastSavedDataRef.current) {
      return; // Sem mudanças, não precisa salvar
    }

    await performSave();
  }, [data, performSave]);

  // Reset do status
  const resetStatus = useCallback(() => {
    setSaveStatus('idle');
  }, []);

  // Auto-save com debounce quando os dados mudam
  useEffect(() => {
    // Não executar no primeiro render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      lastSavedDataRef.current = JSON.stringify(data);
      return;
    }

    // Verificar se há mudanças reais
    const currentDataStr = JSON.stringify(data);
    if (currentDataStr === lastSavedDataRef.current) {
      return; // Sem mudanças, não agendar salvamento
    }

    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Agendar novo salvamento
    timeoutRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, debounceMs, performSave]);

  // Salvar quando o componente for desmontado (fechou o wizard)
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Salvar dados no localStorage ao sair
      try {
        const propertyId = data.id || 'draft';
        localStorage.setItem(`property_draft_${propertyId}`, JSON.stringify(data));
      } catch (error) {
        console.error('Erro ao salvar no localStorage:', error);
      }
    };
  }, [data]);

  return {
    saveStatus,
    triggerSave,
    resetStatus,
  };
}

/**
 * Hook para recuperar dados salvos do draft
 */
export function useRestoreDraft(propertyId?: string): any | null {
  const [draft, setDraft] = useState<any | null>(null);

  useEffect(() => {
    try {
      const id = propertyId || 'draft';
      const savedData = localStorage.getItem(`property_draft_${id}`);
      
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setDraft(parsed);
      }
    } catch (error) {
      console.error('Erro ao recuperar draft:', error);
    }
  }, [propertyId]);

  return draft;
}

/**
 * Hook para limpar draft após salvamento final
 */
export function useClearDraft() {
  return useCallback((propertyId?: string) => {
    try {
      const id = propertyId || 'draft';
      localStorage.removeItem(`property_draft_${id}`);
    } catch (error) {
      console.error('Erro ao limpar draft:', error);
    }
  }, []);
}
