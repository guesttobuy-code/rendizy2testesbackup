/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    AUTOMATIONS MODULE - EXPORTS                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

// Página principal
export { AutomationsPage, default } from './AutomationsPage';

// Componentes principais
export { AutomationsManager } from './AutomationsManager';
export { AutomationBuilder } from './AutomationBuilder';

// Cápsulas
export { TriggerCapsule } from './capsules/TriggerCapsule';
export { ConditionCapsule } from './capsules/ConditionCapsule';
export { ActionCapsule } from './capsules/ActionCapsule';

// Hooks
export { useAutomations } from './hooks/useAutomations';

// Tipos
export * from './types';
