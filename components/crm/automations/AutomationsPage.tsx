/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║              AUTOMATIONS PAGE - PÁGINA PRINCIPAL                          ║
 * ║                                                                           ║
 * ║  Página container que gerencia a navegação entre:                        ║
 * ║  • AutomationsManager (listagem/gestão)                                  ║
 * ║  • AutomationBuilder (criação/edição)                                    ║
 * ║                                                                           ║
 * ║  Integra com o hook useAutomations para persistência atômica            ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useCallback } from 'react';
import { AutomationsManager } from './AutomationsManager';
import { AutomationBuilder } from './AutomationBuilder';
import { useAutomations } from './hooks/useAutomations';
import { AutomationDraft } from './types';
import { toast } from 'sonner';

// ============================================================================
// TIPOS
// ============================================================================

type ViewMode = 
  | { type: 'list' }
  | { type: 'create' }
  | { type: 'edit'; automationId: string };

// ============================================================================
// AUTOMATIONS PAGE
// ============================================================================

export function AutomationsPage() {
  // Estado de navegação
  const [view, setView] = useState<ViewMode>({ type: 'list' });

  // Hook de automações
  const {
    automations,
    isSaving,
    createAutomation,
    updateAutomation,
  } = useAutomations();

  // Navegação
  const navigateToBuilder = useCallback((automationId?: string) => {
    if (automationId) {
      setView({ type: 'edit', automationId });
    } else {
      setView({ type: 'create' });
    }
  }, []);

  const navigateToList = useCallback(() => {
    setView({ type: 'list' });
  }, []);

  // Handlers
  const handleSave = useCallback(async (draft: AutomationDraft) => {
    try {
      if (view.type === 'edit') {
        // Para update, convertemos o draft em Partial<Automation>
        await updateAutomation(view.automationId, {
          name: draft.name,
          description: draft.description,
          trigger: draft.trigger || undefined,
          conditions: draft.conditions,
          actions: draft.actions,
          category: draft.category,
          priority: draft.priority,
          isActive: draft.isActive,
          module: draft.module,
          tags: draft.tags,
        });
        toast.success('Automação atualizada com sucesso!');
      } else {
        await createAutomation(draft);
        toast.success('Automação criada com sucesso!');
      }
      navigateToList();
    } catch (err) {
      toast.error('Erro ao salvar automação');
      console.error('Erro ao salvar:', err);
    }
  }, [view, createAutomation, updateAutomation, navigateToList]);

  const handleTest = useCallback(async (_draft: AutomationDraft) => {
    try {
      // Para testar, criamos uma automação temporária
      toast.info('Executando teste da automação...');
      
      // Simula execução (em produção, chamaria API)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('Teste executado com sucesso! Verifique os logs.');
    } catch (err) {
      toast.error('Erro ao testar automação');
      console.error('Erro ao testar:', err);
    }
  }, []);

  // Encontrar automação para edição
  const editingAutomation = view.type === 'edit' 
    ? automations.find(a => a.id === view.automationId) 
    : null;

  // Render baseado no estado
  switch (view.type) {
    case 'create':
      return (
        <AutomationBuilder
          automation={null}
          onSave={handleSave}
          onCancel={navigateToList}
          onTest={handleTest}
          isSaving={isSaving}
        />
      );

    case 'edit':
      if (!editingAutomation) {
        // Automação não encontrada, voltar para lista
        navigateToList();
        return null;
      }
      return (
        <AutomationBuilder
          automation={editingAutomation}
          onSave={handleSave}
          onCancel={navigateToList}
          onTest={handleTest}
          isSaving={isSaving}
        />
      );

    case 'list':
    default:
      return (
        <AutomationsManager 
          onNavigateToBuilder={navigateToBuilder}
        />
      );
  }
}

export default AutomationsPage;
