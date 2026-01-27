/**
 * CRM API - Módulo TASKS (Tarefas/Atividades)
 * API para gestão de tarefas do CRM
 * Vinculadas a deals, tickets, contatos, reservas, propriedades
 * 
 * @version 1.0.0
 * @date 2026-01-27
 */

import { apiRequest, type ApiResponse } from '../../utils/api';

// =============================================================================
// TYPES
// =============================================================================

/** Tipos de tarefa disponíveis */
export type TaskType = 'task' | 'call' | 'meeting' | 'email' | 'follow_up' | 'other';

/** Status da tarefa */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

/** Prioridade da tarefa */
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

/** Regra de recorrência */
export interface RecurrenceRule {
  type: 'daily' | 'weekly' | 'monthly';
  interval: number;
  endDate?: string;
  daysOfWeek?: number[]; // 0=Dom, 1=Seg, etc
}

/** Usuário resumido para relacionamentos */
export interface TaskUser {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string;
}

/** Deal resumido */
export interface TaskDeal {
  id: string;
  title: string;
  value?: number;
  stage?: string;
  status?: string;
}

/** Ticket resumido */
export interface TaskTicket {
  id: string;
  title: string;
  status?: string;
  priority?: string;
}

/** Contato resumido */
export interface TaskContact {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
}

/** Tarefa completa */
export interface CrmTask {
  id: string;
  organization_id: string;
  
  // Dados principais
  title: string;
  description?: string;
  task_type: TaskType;
  
  // Vínculos
  sales_deal_id?: string;
  service_ticket_id?: string;
  predetermined_item_id?: string;
  property_id?: string;
  reservation_id?: string;
  contact_id?: string;
  
  // Agendamento
  due_date?: string;
  due_time?: string;
  duration_minutes?: number;
  reminder_at?: string;
  
  // Responsável
  assignee_id?: string;
  assignee_name?: string;
  created_by?: string;
  
  // Status e prioridade
  status: TaskStatus;
  priority: TaskPriority;
  completed_at?: string;
  completed_by?: string;
  
  // Recorrência
  is_recurring: boolean;
  recurrence_rule?: RecurrenceRule;
  parent_task_id?: string;
  
  // Metadados
  tags?: string[];
  custom_fields?: Record<string, unknown>;
  notes?: string;
  
  // Resultado
  outcome?: string;
  outcome_notes?: string;
  
  // Audit
  created_at: string;
  updated_at: string;
  
  // Relacionamentos expandidos (via JOIN)
  assignee?: TaskUser;
  creator?: TaskUser;
  completer?: TaskUser;
  deal?: TaskDeal;
  ticket?: TaskTicket;
  contact?: TaskContact;
}

/** Input para criar tarefa */
export interface CrmTaskCreate {
  title: string;
  description?: string;
  task_type?: TaskType;
  
  // Vínculos
  sales_deal_id?: string;
  service_ticket_id?: string;
  predetermined_item_id?: string;
  property_id?: string;
  reservation_id?: string;
  contact_id?: string;
  
  // Agendamento
  due_date?: string;
  due_time?: string;
  duration_minutes?: number;
  reminder_at?: string;
  
  // Responsável
  assignee_id?: string;
  assignee_name?: string;
  
  // Status e prioridade
  status?: TaskStatus;
  priority?: TaskPriority;
  
  // Recorrência
  is_recurring?: boolean;
  recurrence_rule?: RecurrenceRule;
  
  // Metadados
  tags?: string[];
  custom_fields?: Record<string, unknown>;
  notes?: string;
}

/** Input para atualizar tarefa */
export type CrmTaskUpdate = Partial<CrmTaskCreate>;

/** Filtros para listagem de tarefas */
export interface TaskListFilters {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  assignee_id?: string;
  sales_deal_id?: string;
  service_ticket_id?: string;
  contact_id?: string;
  property_id?: string;
  reservation_id?: string;
  due_date_from?: string;
  due_date_to?: string;
  overdue?: boolean;
  search?: string;
  task_type?: TaskType | TaskType[];
  limit?: number;
  offset?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/** Resposta de listagem com paginação */
export interface TaskListResponse {
  data: CrmTask[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/** Tarefas categorizadas por prazo */
export interface CategorizedTasks {
  overdue: CrmTask[];
  today: CrmTask[];
  tomorrow: CrmTask[];
  thisWeek: CrmTask[];
  later: CrmTask[];
  noDueDate: CrmTask[];
}

/** Resposta de "minhas tarefas" */
export interface MyTasksResponse {
  data: CrmTask[];
  categorized: CategorizedTasks;
  total: number;
}

/** Estatísticas de tarefas */
export interface TaskStats {
  total: number;
  byStatus: {
    pending: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  };
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  byType: Record<string, number>;
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  completedThisWeek: number;
  averageCompletionDays: number;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Lista todas as tarefas da organização com filtros
 */
export async function listTasks(filters?: TaskListFilters): Promise<ApiResponse<TaskListResponse>> {
  const params = new URLSearchParams();
  
  if (filters) {
    if (filters.status) {
      params.set('status', Array.isArray(filters.status) ? filters.status.join(',') : filters.status);
    }
    if (filters.priority) {
      params.set('priority', Array.isArray(filters.priority) ? filters.priority.join(',') : filters.priority);
    }
    if (filters.assignee_id) params.set('assignee_id', filters.assignee_id);
    if (filters.sales_deal_id) params.set('sales_deal_id', filters.sales_deal_id);
    if (filters.service_ticket_id) params.set('service_ticket_id', filters.service_ticket_id);
    if (filters.contact_id) params.set('contact_id', filters.contact_id);
    if (filters.property_id) params.set('property_id', filters.property_id);
    if (filters.reservation_id) params.set('reservation_id', filters.reservation_id);
    if (filters.due_date_from) params.set('due_date_from', filters.due_date_from);
    if (filters.due_date_to) params.set('due_date_to', filters.due_date_to);
    if (filters.overdue !== undefined) params.set('overdue', String(filters.overdue));
    if (filters.search) params.set('search', filters.search);
    if (filters.task_type) {
      params.set('task_type', Array.isArray(filters.task_type) ? filters.task_type.join(',') : filters.task_type);
    }
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.offset) params.set('offset', String(filters.offset));
    if (filters.sort) params.set('sort', filters.sort);
    if (filters.order) params.set('order', filters.order);
  }
  
  const queryString = params.toString();
  const url = queryString ? `/crm/tasks?${queryString}` : '/crm/tasks';
  
  return apiRequest<TaskListResponse>(url, 'GET');
}

/**
 * Busca minhas tarefas (atribuídas ao usuário logado)
 */
export async function getMyTasks(options?: { status?: string; limit?: number }): Promise<ApiResponse<MyTasksResponse>> {
  const params = new URLSearchParams();
  if (options?.status) params.set('status', options.status);
  if (options?.limit) params.set('limit', String(options.limit));
  
  const queryString = params.toString();
  const url = queryString ? `/crm/tasks/my?${queryString}` : '/crm/tasks/my';
  
  return apiRequest<MyTasksResponse>(url, 'GET');
}

/**
 * Busca estatísticas de tarefas
 */
export async function getTaskStats(assigneeId?: string): Promise<ApiResponse<{ data: TaskStats }>> {
  const url = assigneeId ? `/crm/tasks/stats?assignee_id=${assigneeId}` : '/crm/tasks/stats';
  return apiRequest<{ data: TaskStats }>(url, 'GET');
}

/**
 * Busca uma tarefa por ID
 */
export async function getTask(id: string): Promise<ApiResponse<{ data: CrmTask }>> {
  return apiRequest<{ data: CrmTask }>(`/crm/tasks/${id}`, 'GET');
}

/**
 * Cria uma nova tarefa
 */
export async function createTask(data: CrmTaskCreate): Promise<ApiResponse<{ data: CrmTask }>> {
  return apiRequest<{ data: CrmTask }>('/crm/tasks', 'POST', data);
}

/**
 * Atualiza uma tarefa existente
 */
export async function updateTask(id: string, data: CrmTaskUpdate): Promise<ApiResponse<{ data: CrmTask }>> {
  return apiRequest<{ data: CrmTask }>(`/crm/tasks/${id}`, 'PUT', data);
}

/**
 * Marca uma tarefa como concluída
 */
export async function completeTask(id: string, options?: { outcome?: string; outcome_notes?: string }): Promise<ApiResponse<{ data: CrmTask }>> {
  return apiRequest<{ data: CrmTask }>(`/crm/tasks/${id}/complete`, 'PATCH', options || {});
}

/**
 * Deleta uma tarefa
 */
export async function deleteTask(id: string): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/crm/tasks/${id}`, 'DELETE');
}

// =============================================================================
// OBJETO EXPORTADO (para compatibilidade)
// =============================================================================

export const crmTasksApi = {
  list: listTasks,
  getMyTasks,
  getStats: getTaskStats,
  get: getTask,
  create: createTask,
  update: updateTask,
  complete: completeTask,
  delete: deleteTask,
};

export default crmTasksApi;
