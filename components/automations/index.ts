/**
 * RENDIZY - Automations Module Exports
 * 
 * Exporta todos os componentes e hooks do módulo de automações
 * para uso em qualquer parte do sistema.
 */

// Modal Principal
export { AutomationCreatorModal, type AutomationCreatorModalProps, type AutomationContext } from './AutomationCreatorModal';

// Botão Reutilizável
export { 
  AutomationTriggerButton, 
  ChatAutomationButton,
  ReservasAutomationButton,
  CRMAutomationButton,
  AutomationIconButton,
  type AutomationTriggerButtonProps 
} from './AutomationTriggerButton';

// Hook (arquivo .tsx porque contém JSX)
export { 
  useAutomationModal,
  useChatAutomationModal,
  useReservasAutomationModal,
  useCRMAutomationModal,
  useFinanceiroAutomationModal,
  type UseAutomationModalOptions,
  type UseAutomationModalReturn
} from './useAutomationModal';

// Interpretador Local (funciona sem API de IA externa)
export { 
  interpretLocalAutomation,
  USE_LOCAL_INTERPRETER,
  isLocalInterpreterEnabled
} from './localAutomationInterpreter';

// Componentes existentes
export { default as AutomationsNaturalLanguageLab } from './AutomationsNaturalLanguageLab';
export { default as AutomationsList } from './AutomationsList';
export { default as AutomationDetails } from './AutomationDetails';
export { default as AutomationsModule } from './AutomationsModule';
export { default as AutomationsChatLab } from './AutomationsChatLab';
export { default as ModuleSelector } from './ModuleSelector';
export { default as PropertySelector } from './PropertySelector';
