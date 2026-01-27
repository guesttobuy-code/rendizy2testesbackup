/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║               TIPOS - AUTOMAÇÕES CRM RENDIZY                              ║
 * ║                                                                           ║
 * ║  Definições de tipos para o sistema de automações em cápsulas.           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * @version 1.0.0
 * @date 2026-01-26
 */

// ============================================================================
// ENUMS E CONSTANTES
// ============================================================================

export type AutomationStatus = 'draft' | 'active' | 'paused' | 'error';
export type CapsuleType = 'trigger' | 'condition' | 'action';
export type TriggerCategory = 'reservas' | 'comunicacao' | 'financeiro' | 'operacional' | 'reviews';

// ============================================================================
// TRIGGER (EVENTO)
// ============================================================================

export interface TriggerField {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'select';
  label: string;
}

export interface TriggerConfig {
  id: string;
  type: string;
  name: string;
  icon: string;
  category: string;
  config: Record<string, any>;
  fields?: TriggerField[];
}

// ============================================================================
// CONDITION (FILTRO)
// ============================================================================

export interface ConditionConfig {
  id: string;
  field: string;
  operator: string;
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface ConditionGroup {
  id: string;
  conditions: ConditionConfig[];
  logicalOperator: 'AND' | 'OR';
}

// ============================================================================
// ACTION (AÇÃO)
// ============================================================================

export interface ActionConfig {
  id: string;
  type: string;
  name: string;
  icon: string;
  category: string;
  config: Record<string, any>;
  delay?: {
    enabled: boolean;
    duration: number;
    unit: 'minutes' | 'hours' | 'days';
  };
}

// ============================================================================
// AUTOMAÇÃO COMPLETA
// ============================================================================

export interface Automation {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  status: AutomationStatus;
  isActive: boolean;
  category: TriggerCategory;
  
  // Cápsulas
  trigger: TriggerConfig;
  conditions: ConditionGroup[];
  actions: ActionConfig[];
  
  // Metadata
  module: 'crm' | 'reservas' | 'financeiro' | 'comunicacao' | 'sistema';
  tags: string[];
  priority: 'baixa' | 'media' | 'alta';
  
  // Estatísticas
  stats: {
    totalRuns: number;
    successRuns: number;
    failedRuns: number;
    lastRun?: string;
    avgDuration?: number;
  };
  
  // Timestamps
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// ============================================================================
// EXECUÇÃO
// ============================================================================

export interface AutomationExecution {
  id: string;
  automation_id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  trigger_data: Record<string, any>;
  actions_executed: {
    action_id: string;
    status: 'success' | 'failed' | 'skipped';
    output?: any;
    error?: string;
    duration: number;
  }[];
  started_at: string;
  completed_at?: string;
  error?: string;
}

// ============================================================================
// DRAFT (RASCUNHO PARA BUILDER)
// ============================================================================

export interface AutomationDraft {
  name: string;
  description: string;
  trigger: TriggerConfig | null;
  conditions: ConditionGroup[];
  actions: ActionConfig[];
  category: TriggerCategory;
  module: Automation['module'];
  tags: string[];
  priority: Automation['priority'];
  isActive: boolean;
}

export const EMPTY_DRAFT: AutomationDraft = {
  name: '',
  description: '',
  trigger: null,
  conditions: [],
  actions: [],
  category: 'reservas',
  module: 'crm',
  tags: [],
  priority: 'media',
  isActive: true,
};

// ============================================================================
// HELPERS
// ============================================================================

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createEmptyConditionGroup(): ConditionGroup {
  return {
    id: generateId(),
    conditions: [],
    logicalOperator: 'AND',
  };
}

export function createEmptyCondition(): ConditionConfig {
  return {
    id: generateId(),
    field: '',
    operator: 'equals',
    value: '',
  };
}
