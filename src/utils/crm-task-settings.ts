/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║       CRM Task Settings - Configurações Compartilhadas de Tarefas         ║
 * ║                                                                           ║
 * ║  Serviço para gerenciar tipos de tarefa, prioridades e templates          ║
 * ║  que são usados tanto na página de configurações quanto nos modais.       ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * @version 1.0.0
 * @date 2026-01-27
 */

// ============================================================================
// TIPOS
// ============================================================================

export interface ConfigurableTaskType {
  id: string;
  name: string;
  icon: string;
  color: string;
  defaultPriority: string;
  estimatedDuration?: number;
  requiresApproval: boolean;
  autoAssign: boolean;
  assigneeRole?: string;
  isActive: boolean;
}

export interface ConfigurablePriority {
  id: string;
  name: string;
  color: string;
  order: number;
  slaHours?: number;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  taskType: string;
  checklist: string[];
  tags: string[];
}

// ============================================================================
// VALORES PADRÃO
// ============================================================================

export const DEFAULT_TASK_TYPES: ConfigurableTaskType[] = [
  {
    id: 'task',
    name: 'Tarefa',
    icon: '📋',
    color: '#6366f1',
    defaultPriority: 'medium',
    estimatedDuration: 30,
    requiresApproval: false,
    autoAssign: false,
    isActive: true,
  },
  {
    id: 'call',
    name: 'Ligação',
    icon: '📞',
    color: '#22c55e',
    defaultPriority: 'medium',
    estimatedDuration: 15,
    requiresApproval: false,
    autoAssign: false,
    isActive: true,
  },
  {
    id: 'meeting',
    name: 'Reunião',
    icon: '🤝',
    color: '#f59e0b',
    defaultPriority: 'medium',
    estimatedDuration: 60,
    requiresApproval: false,
    autoAssign: false,
    isActive: true,
  },
  {
    id: 'email',
    name: 'E-mail',
    icon: '📧',
    color: '#3b82f6',
    defaultPriority: 'low',
    estimatedDuration: 15,
    requiresApproval: false,
    autoAssign: false,
    isActive: true,
  },
  {
    id: 'follow_up',
    name: 'Follow-up',
    icon: '🔄',
    color: '#8b5cf6',
    defaultPriority: 'medium',
    estimatedDuration: 15,
    requiresApproval: false,
    autoAssign: false,
    isActive: true,
  },
  {
    id: 'limpeza',
    name: 'Limpeza',
    icon: '🧹',
    color: '#14b8a6',
    defaultPriority: 'medium',
    estimatedDuration: 120,
    requiresApproval: false,
    autoAssign: true,
    assigneeRole: 'housekeeping',
    isActive: true,
  },
  {
    id: 'manutencao',
    name: 'Manutenção',
    icon: '🔧',
    color: '#f97316',
    defaultPriority: 'high',
    estimatedDuration: 60,
    requiresApproval: true,
    autoAssign: false,
    isActive: true,
  },
  {
    id: 'checkin',
    name: 'Check-in',
    icon: '🚪',
    color: '#06b6d4',
    defaultPriority: 'high',
    estimatedDuration: 30,
    requiresApproval: false,
    autoAssign: true,
    assigneeRole: 'reception',
    isActive: true,
  },
  {
    id: 'checkout',
    name: 'Check-out',
    icon: '👋',
    color: '#a855f7',
    defaultPriority: 'medium',
    estimatedDuration: 15,
    requiresApproval: false,
    autoAssign: true,
    assigneeRole: 'reception',
    isActive: true,
  },
  {
    id: 'vistoria',
    name: 'Vistoria',
    icon: '📋',
    color: '#ec4899',
    defaultPriority: 'medium',
    estimatedDuration: 45,
    requiresApproval: true,
    autoAssign: false,
    isActive: true,
  },
  {
    id: 'compras',
    name: 'Compras/Reposição',
    icon: '🛒',
    color: '#84cc16',
    defaultPriority: 'low',
    estimatedDuration: 90,
    requiresApproval: true,
    autoAssign: false,
    isActive: true,
  },
  {
    id: 'other',
    name: 'Outros',
    icon: '📌',
    color: '#64748b',
    defaultPriority: 'low',
    estimatedDuration: 30,
    requiresApproval: false,
    autoAssign: false,
    isActive: true,
  },
];

export const DEFAULT_PRIORITIES: ConfigurablePriority[] = [
  { id: 'urgent', name: 'Urgente', color: '#ef4444', order: 1, slaHours: 2 },
  { id: 'high', name: 'Alta', color: '#f97316', order: 2, slaHours: 8 },
  { id: 'medium', name: 'Média', color: '#eab308', order: 3, slaHours: 24 },
  { id: 'low', name: 'Baixa', color: '#22c55e', order: 4, slaHours: 72 },
];

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  TASK_TYPES: 'rendizy_crm_task_types',
  PRIORITIES: 'rendizy_crm_priorities',
  TEMPLATES: 'rendizy_crm_task_templates',
};

// ============================================================================
// SERVICE
// ============================================================================

class CrmTaskSettingsService {
  // Tipos de Tarefa
  getTaskTypes(): ConfigurableTaskType[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TASK_TYPES);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge com defaults para garantir que novos tipos sejam incluídos
        const storedIds = new Set(parsed.map((t: ConfigurableTaskType) => t.id));
        const missingDefaults = DEFAULT_TASK_TYPES.filter(t => !storedIds.has(t.id));
        return [...parsed, ...missingDefaults];
      }
      return DEFAULT_TASK_TYPES;
    } catch (error) {
      console.error('Erro ao carregar tipos de tarefa:', error);
      return DEFAULT_TASK_TYPES;
    }
  }

  getActiveTaskTypes(): ConfigurableTaskType[] {
    return this.getTaskTypes().filter(t => t.isActive !== false);
  }

  saveTaskTypes(types: ConfigurableTaskType[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TASK_TYPES, JSON.stringify(types));
      // Dispatch event para notificar outros componentes
      window.dispatchEvent(new CustomEvent('crm-task-types-updated', { detail: types }));
    } catch (error) {
      console.error('Erro ao salvar tipos de tarefa:', error);
    }
  }

  addTaskType(type: ConfigurableTaskType): void {
    const types = this.getTaskTypes();
    types.push(type);
    this.saveTaskTypes(types);
  }

  updateTaskType(id: string, updates: Partial<ConfigurableTaskType>): void {
    const types = this.getTaskTypes();
    const index = types.findIndex(t => t.id === id);
    if (index >= 0) {
      types[index] = { ...types[index], ...updates };
      this.saveTaskTypes(types);
    }
  }

  deleteTaskType(id: string): void {
    const types = this.getTaskTypes().filter(t => t.id !== id);
    this.saveTaskTypes(types);
  }

  // Prioridades
  getPriorities(): ConfigurablePriority[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PRIORITIES);
      if (stored) {
        return JSON.parse(stored);
      }
      return DEFAULT_PRIORITIES;
    } catch (error) {
      console.error('Erro ao carregar prioridades:', error);
      return DEFAULT_PRIORITIES;
    }
  }

  savePriorities(priorities: ConfigurablePriority[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PRIORITIES, JSON.stringify(priorities));
      window.dispatchEvent(new CustomEvent('crm-priorities-updated', { detail: priorities }));
    } catch (error) {
      console.error('Erro ao salvar prioridades:', error);
    }
  }

  // Templates
  getTemplates(): TaskTemplate[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      return [];
    }
  }

  saveTemplates(templates: TaskTemplate[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
      window.dispatchEvent(new CustomEvent('crm-templates-updated', { detail: templates }));
    } catch (error) {
      console.error('Erro ao salvar templates:', error);
    }
  }

  // Helpers para o modal
  getTaskTypeOptions(): Array<{ value: string; label: string; icon: string; color: string }> {
    return this.getActiveTaskTypes().map(type => ({
      value: type.id,
      label: `${type.icon} ${type.name}`,
      icon: type.icon,
      color: type.color,
    }));
  }

  getPriorityOptions(): Array<{ value: string; label: string; color: string }> {
    return this.getPriorities()
      .sort((a, b) => a.order - b.order)
      .map(p => ({
        value: p.id,
        label: p.name,
        color: p.color,
      }));
  }

  // Obter informações de um tipo específico
  getTaskTypeInfo(id: string): ConfigurableTaskType | undefined {
    return this.getTaskTypes().find(t => t.id === id);
  }

  getPriorityInfo(id: string): ConfigurablePriority | undefined {
    return this.getPriorities().find(p => p.id === id);
  }
}

// Singleton export
export const crmTaskSettings = new CrmTaskSettingsService();
