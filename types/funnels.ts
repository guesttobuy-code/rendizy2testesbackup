/**
 * Tipos e Interfaces para o sistema de Funis (Sales e Services)
 */

// ============================================================================
// TIPOS DE FUNIL
// ============================================================================

export type FunnelType = 'SALES' | 'SERVICES' | 'PREDETERMINED';

export interface Funnel {
  id: string;
  organizationId: string;
  name: string;
  type: FunnelType;
  description?: string;
  stages: FunnelStage[];
  statusConfig: StatusConfig;
  isDefault: boolean;
  isGlobalDefault?: boolean; // ✅ NOVO: Funil padrão global (apenas super_admin pode criar/editar)
  globalDefaultNote?: string; // ✅ NOVO: Observação sobre o funil global
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface FunnelStage {
  id: string;
  funnelId: string;
  name: string;
  order: number;
  color: string;
  description?: string;
  createdAt: string;
}

export interface StatusConfig {
  resolvedStatus: string; // Ex: "Resolvido"
  unresolvedStatus: string; // Ex: "Não Resolvido"
  inProgressStatus: string; // Ex: "Em Análise"
  customStatuses?: CustomStatus[];
}

export interface CustomStatus {
  id: string;
  label: string;
  color: string;
  icon?: string;
}

// ============================================================================
// FUNIL DE SERVIÇOS (SERVICES FUNNEL)
// ============================================================================

// Tipos para relacionamentos de tickets
export type PersonType = 'user' | 'contact' | 'guest' | 'buyer' | 'seller';

export interface TicketPerson {
  id: string;
  type: PersonType;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

export interface TicketProperty {
  id: string;
  name: string;
  code?: string;
  address?: string;
  type?: string;
}

export interface TicketAutomation {
  id: string;
  name: string;
  description?: string;
}

export interface ServiceTicketProduct {
  id: string;
  name: string;
  quantity: number;
  price: number;
  description?: string;
}

export interface ServiceTicket {
  id: string;
  organizationId: string;
  funnelId: string;
  stageId: string;
  title: string;
  description?: string;
  status: ServiceTicketStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  assignedToName?: string;
  assignedToAvatar?: string;
  createdBy: string;
  createdByName: string;
  productId?: string;
  productName?: string;
  value?: number;
  currency?: 'BRL' | 'USD' | 'EUR';
  dueDate?: string;
  resolvedAt?: string;
  progress: number; // 0-100, calculado automaticamente
  templateId?: string; // Se foi criado de um template
  tasks: ServiceTask[];
  tags?: string[];
  metadata?: Record<string, any>;
  // Relacionamentos
  relatedPeople?: TicketPerson[]; // N pessoas (usuários, contatos, hóspedes, compradores, vendedores)
  relatedProperties?: TicketProperty[]; // N imóveis
  relatedAutomations?: TicketAutomation[]; // N automações
  // Produtos e orçamento
  products?: ServiceTicketProduct[];
  hideProducts?: boolean; // Ocultar produtos/orçamentos (útil para cards não remunerados ou quando cliente não deve ver valores)
  createdAt: string;
  updatedAt: string;
}

export type ServiceTicketStatus = 
  | 'RESOLVED' 
  | 'UNRESOLVED' 
  | 'IN_ANALYSIS' 
  | 'PENDING' 
  | 'CANCELLED';

// Tipos de tarefa simplificados
export type TaskType = 'STANDARD' | 'FORM' | 'ATTACHMENT';

export interface ServiceTask {
  id: string;
  ticketId: string;
  stageId: string; // ✅ VINCULADO À ETAPA DO FUNIL
  type: TaskType; // ✅ TIPO SIMPLES
  title: string;
  description?: string;
  status: TaskStatus;
  assignedTo?: string;
  assignedToName?: string;
  assignedToAvatar?: string;
  dueDate?: string;
  completedAt?: string;
  estimatedHours?: number; // Estimativa de tempo em horas
  actualHours?: number; // Tempo real gasto
  
  // Dados específicos por tipo
  formData?: {
    formId?: string;
    responseUrl?: string;
    completed?: boolean;
  };
  attachments?: {
    files: Array<{
      id: string;
      name: string;
      url: string;
      type: 'image' | 'document';
      uploadedAt: string;
    }>;
  };
  
  // Hierarquia
  subtasks: ServiceSubtask[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 
  | 'TODO' 
  | 'IN_PROGRESS' 
  | 'BLOCKED' 
  | 'COMPLETED' 
  | 'CANCELLED';

export interface ServiceSubtask {
  id: string;
  taskId: string;
  title: string;
  status: TaskStatus;
  assignedTo?: string;
  assignedToName?: string;
  dueDate?: string;
  completedAt?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CHAT IA PARA TAREFAS E AUTOMAÇÕES
// ============================================================================

export interface AITaskCommand {
  type: 'CREATE_TASK' | 'UPDATE_TASK' | 'ASSIGN_TASK' | 'MOVE_STAGE' | 'CREATE_AUTOMATION' | 'UPDATE_STATUS' | 'COMPLETE_TASK';
  payload: Record<string, any>;
  ticketId?: string;
  taskId?: string;
}

export interface AITaskMessage {
  id: string;
  ticketId?: string;
  taskId?: string;
  role: 'user' | 'assistant';
  content: string;
  command?: AITaskCommand;
  createdAt: string;
}

// ============================================================================
// AUTOMAÇÕES PARA FUNIL DE SERVIÇOS
// ============================================================================

export interface ServiceAutomation {
  id: string;
  organizationId: string;
  funnelId?: string;
  name: string;
  description?: string;
  trigger: {
    type: 'STAGE_CHANGE' | 'STATUS_CHANGE' | 'TASK_COMPLETED' | 'TICKET_CREATED' | 'CUSTOM';
    conditions?: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
  };
  actions: Array<{
    type: 'NOTIFY' | 'CREATE_TASK' | 'UPDATE_STATUS' | 'SEND_MESSAGE' | 'ASSIGN_USER';
    payload: Record<string, any>;
  }>;
  status: 'draft' | 'active' | 'paused';
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// TEMPLATES DE CARDS (MODELOS)
// ============================================================================

export interface ServiceTicketTemplate {
  id: string;
  organizationId: string;
  name: string; // "Modelo Implantação"
  description?: string;
  funnelId: string;
  stages: FunnelStage[]; // Etapas do funil
  tasks: ServiceTask[]; // Tarefas padrão (todas as etapas)
  isTemplate: true;
  isGlobalDefault?: boolean; // ✅ NOVO: Template padrão global (apenas super_admin pode criar/editar)
  globalDefaultNote?: string; // ✅ NOVO: Observação sobre o template global
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// VISUALIZAÇÃO DE TAREFAS EM LISTA (ESTILO ASANA)
// ============================================================================

export interface TaskListItem {
  id: string;
  title: string;
  status: TaskStatus;
  type: TaskType;
  ticketId: string;
  ticketTitle: string; // "Problema Check-in"
  stageId: string;
  stageName: string; // "Triagem"
  clientName?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  assignedToName?: string;
  canComplete: boolean; // Se usuário pode marcar como completo
  createdAt: string;
}

export type TaskGrouping = 'client' | 'date' | 'type' | 'stage' | 'ticket' | 'none';
export type TaskFilter = 'all' | 'pending' | 'completed' | 'overdue';
export type TaskSortBy = 'dueDate' | 'priority' | 'createdAt' | 'title';

// ============================================================================
// FUNIL PRÉ-DETERMINADO (PREDETERMINED FUNNEL)
// ============================================================================

export interface PredeterminedFunnelConfig {
  isSequential: boolean; // true = só avança sequencialmente
  allowSkip: boolean; // false = não pode pular etapas
  requireValidation: boolean; // true = precisa validar requisitos
  visibility: 'internal' | 'shared' | 'public'; // Quem pode ver
  stageRequirements?: StageRequirement[]; // Requisitos por etapa
}

export interface StageRequirement {
  stageId: string;
  requiredTasks?: string[]; // IDs de tarefas obrigatórias
  requiredFields?: string[]; // Campos obrigatórios
  requiredApproval?: boolean; // Precisa aprovação
  requiredProducts?: boolean; // Precisa ter produtos/orçamento
  minProgress?: number; // Progresso mínimo (0-100)
}

export interface PredeterminedStage extends FunnelStage {
  responsibleType?: 'internal' | 'client' | 'agency' | 'dynamic' | 'multiple';
  responsibleIds?: string[]; // IDs de usuários/pessoas
  requirements?: StageRequirement;
  visibility?: {
    agency: boolean;
    internal: boolean;
    client: boolean;
  };
  actions?: StageAction[]; // Ações ao concluir
}

export interface StageAction {
  type: 'notify' | 'email' | 'create_task' | 'trigger_automation' | 'create_bill';
  config: Record<string, any>;
}

export interface ProcessTrigger {
  type: 'contract_signed' | 'reservation_confirmed' | 'manual' | 'date' | 'automation';
  config: Record<string, any>;
}

