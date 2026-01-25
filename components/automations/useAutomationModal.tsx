/**
 * RENDIZY - useAutomationModal Hook
 * 
 * Hook para controlar o modal de automações de forma programática.
 * Útil quando você precisa de mais controle sobre quando/como abrir o modal.
 * 
 * @example
 * function MyComponent() {
 *   const { openModal, closeModal, AutomationModal } = useAutomationModal({
 *     module: 'chat',
 *     onSave: (automation) => console.log('Criada:', automation)
 *   });
 * 
 *   return (
 *     <>
 *       <button onClick={openModal}>Criar automação</button>
 *       <AutomationModal />
 *     </>
 *   );
 * }
 */

import React, { useState, useCallback, useMemo } from 'react';
import { AutomationCreatorModal, type AutomationContext } from './AutomationCreatorModal';
import { type Automation } from '../../utils/api';

// ============================================================================
// TIPOS
// ============================================================================

export interface UseAutomationModalOptions {
  /** Módulo de origem */
  module?: string;
  /** ID do contato */
  contactId?: string;
  /** ID da propriedade */
  propertyId?: string;
  /** ID da reserva */
  reservationId?: string;
  /** Título customizado */
  title?: string;
  /** Descrição customizada */
  description?: string;
  /** Callback após salvar */
  onSave?: (automation: Automation) => void;
  /** Callback ao fechar */
  onClose?: () => void;
}

export interface UseAutomationModalReturn {
  /** Se o modal está aberto */
  isOpen: boolean;
  /** Abrir o modal */
  openModal: (overrideContext?: Partial<AutomationContext>) => void;
  /** Fechar o modal */
  closeModal: () => void;
  /** Toggle do modal */
  toggleModal: () => void;
  /** Contexto atual */
  context: AutomationContext;
  /** Atualizar contexto */
  setContext: (context: Partial<AutomationContext>) => void;
  /** Componente do modal (renderizar no JSX) */
  AutomationModal: React.FC;
}

// ============================================================================
// HOOK
// ============================================================================

export function useAutomationModal(options: UseAutomationModalOptions = {}): UseAutomationModalReturn {
  const {
    module = 'geral',
    contactId,
    propertyId,
    reservationId,
    title,
    description,
    onSave,
    onClose: onCloseCallback,
  } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [context, setContextState] = useState<AutomationContext>({
    module,
    contactId,
    propertyId,
    reservationId,
  });

  const openModal = useCallback((overrideContext?: Partial<AutomationContext>) => {
    if (overrideContext) {
      setContextState(prev => ({ ...prev, ...overrideContext }));
    }
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    onCloseCallback?.();
  }, [onCloseCallback]);

  const toggleModal = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const setContext = useCallback((newContext: Partial<AutomationContext>) => {
    setContextState(prev => ({ ...prev, ...newContext }));
  }, []);

  const handleSave = useCallback((automation: Automation) => {
    onSave?.(automation);
  }, [onSave]);

  // Componente do modal memoizado
  const AutomationModal = useMemo(() => {
    const ModalComponent: React.FC = () => (
      <AutomationCreatorModal
        open={isOpen}
        onClose={closeModal}
        context={context}
        onSave={handleSave}
        title={title}
        description={description}
      />
    );
    ModalComponent.displayName = 'AutomationModal';
    return ModalComponent;
  }, [isOpen, closeModal, context, handleSave, title, description]);

  return {
    isOpen,
    openModal,
    closeModal,
    toggleModal,
    context,
    setContext,
    AutomationModal,
  };
}

// ============================================================================
// HOOKS ESPECIALIZADOS
// ============================================================================

/** Hook pré-configurado para módulo de Chat */
export function useChatAutomationModal(options?: Omit<UseAutomationModalOptions, 'module'>) {
  return useAutomationModal({
    module: 'chat',
    title: 'Automatizar Chat',
    description: 'Crie automações para mensagens e conversas',
    ...options,
  });
}

/** Hook pré-configurado para módulo de Reservas */
export function useReservasAutomationModal(options?: Omit<UseAutomationModalOptions, 'module'>) {
  return useAutomationModal({
    module: 'reservas',
    title: 'Automatizar Reservas',
    description: 'Crie automações para check-in, check-out e acompanhamento',
    ...options,
  });
}

/** Hook pré-configurado para módulo CRM */
export function useCRMAutomationModal(options?: Omit<UseAutomationModalOptions, 'module'>) {
  return useAutomationModal({
    module: 'crm',
    title: 'Automatizar CRM',
    description: 'Crie automações para leads, tarefas e follow-ups',
    ...options,
  });
}

/** Hook pré-configurado para módulo Financeiro */
export function useFinanceiroAutomationModal(options?: Omit<UseAutomationModalOptions, 'module'>) {
  return useAutomationModal({
    module: 'financeiro',
    title: 'Automatizar Financeiro',
    description: 'Crie automações para pagamentos e alertas',
    ...options,
  });
}

export default useAutomationModal;
