/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    CRM TASKS V2 - TYPES & INTERFACES                       ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Sistema completo de tarefas estilo Asana para Rendizy
 * 
 * @version 2.0.0
 * @date 2026-01-27
 */

// ============================================================================
// ENUMS / UNION TYPES
// ============================================================================

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskType = 'task' | 'form' | 'attachment' | 'milestone';

export type DependencyType = 
  | 'finish_to_start'   // Tarefa B só começa quando A terminar
  | 'start_to_start'    // Tarefa B começa quando A começar
  | 'finish_to_finish'  // Tarefa B termina quando A terminar
  | 'start_to_finish';  // Tarefa B termina quando A começar

export type AssignmentRule = 
  | 'notify_all'   // Notifica todos, qualquer um assume
  | 'round_robin'  // Rodízio automático
  | 'least_busy'   // Quem tem menos tarefas
  | 'by_region'    // Por proximidade/região
  | 'fixed';       // Sempre mesma pessoa

export type TriggerType = 'event' | 'scheduled' | 'manual';
export type EventTriggerType = 
  | 'reservation_confirmed'
  | 'checkin_day'
  | 'checkout_day'
  | 'checkin_completed'
  | 'checkout_completed'
  | 'cleaning_completed';

export type ScheduleFrequency = 
  | 'daily' 
  | 'weekly' 
  | 'biweekly' 
  | 'monthly' 
  | 'quarterly' 
  | 'custom';

export type ConflictResolution = 
  | 'create_anyway'  // Cria mesmo com conflito
  | 'postpone'       // Adia para próxima data
  | 'anticipate'     // Antecipa para antes da reserva
  | 'skip'           // Pula esta ocorrência
  | 'notify';        // Apenas notifica para decisão manual

export type PropertyScope = 'all' | 'selected' | 'by_tag' | 'by_owner';

export type CustomFieldType = 
  | 'text' 
  | 'number' 
  | 'single_select' 
  | 'multi_select' 
  | 'date' 
  | 'user' 
  | 'currency';

export type ActivityType = 
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'assigned'
  | 'completed'
  | 'commented'
  | 'attached'
  | 'dependency_added'
  | 'dependency_removed'
  | 'subtask_added'
  | 'subtask_completed';

export type NotificationChannel = 'whatsapp' | 'push' | 'email' | 'sms';

// ============================================================================
// TEAMS (Times/Equipes)
// ============================================================================

export interface Team {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  
  // Configuração de notificação
  notification_config: TeamNotificationConfig;
  
  // Regra de atribuição
  assignment_rule: AssignmentRule;
  fixed_assignee_id?: string;
  
  // Visual
  color: string;
  icon: string;
  
  // Membros (populated)
  members?: TeamMember[];
  
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamNotificationConfig {
  on_task_created: boolean;
  on_sla_approaching: boolean;
  on_task_overdue: boolean;
  on_any_update: boolean;
  channels: NotificationChannel[];
}

export interface TeamMember {
  id: string;
  team_id: string;
  
  // Usuário interno OU externo
  user_id?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  
  // Dados externos
  external_name?: string;
  external_phone?: string;
  external_email?: string;
  
  role: 'leader' | 'member';
  is_active: boolean;
  created_at: string;
}

// ============================================================================
// CUSTOM FIELDS (Campos Customizados)
// ============================================================================

export interface CustomFieldOption {
  id: string;
  label: string;
  color: string;
}

export interface CustomField {
  id: string;
  organization_id: string;
  
  name: string;
  description?: string;
  field_type: CustomFieldType;
  
  // Opções para select
  options: CustomFieldOption[];
  
  // Configurações
  is_required: boolean;
  is_visible_in_list: boolean;
  default_value?: string;
  
  // Escopo
  scope: 'task' | 'deal' | 'ticket' | 'project';
  
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomFieldValue {
  id: string;
  custom_field_id: string;
  entity_id: string;
  entity_type: string;
  
  // Valores (apenas um é preenchido conforme field_type)
  value_text?: string;
  value_number?: number;
  value_date?: string;
  value_json?: any;
  
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TASKS (Tarefas)
// ============================================================================

export interface Task {
  id: string;
  organization_id: string;
  
  // Informações básicas
  title: string;
  description?: string;
  
  // Status e tipo
  status: TaskStatus;
  priority: TaskPriority;
  task_type: TaskType;
  
  // Hierarquia
  parent_id?: string;
  depth: number;
  path?: string;
  
  // Subtarefas (populated)
  subtasks?: Task[];
  subtask_count?: number;
  completed_subtask_count?: number;
  
  // Atribuição
  assignee_id?: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  team_id?: string;
  team?: Team;
  
  // Datas
  due_date?: string;
  start_date?: string;
  completed_at?: string;
  
  // Estimativa
  estimated_minutes?: number;
  actual_minutes?: number;
  
  // Contexto
  project_id?: string;
  project?: Project;
  deal_id?: string;
  ticket_id?: string;
  property_id?: string;
  property?: {
    id: string;
    name: string;
    code?: string;
  };
  reservation_id?: string;
  
  // Organização visual
  display_order: number;
  section_name?: string;
  
  // Metadados
  tags: string[];
  metadata?: Record<string, any>;
  
  // Custom fields (populated)
  custom_field_values?: CustomFieldValue[];
  
  // Dependencies (populated)
  dependencies?: TaskDependency[];
  dependents?: TaskDependency[];
  
  // Audit
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TASK DEPENDENCIES (Dependências)
// ============================================================================

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: DependencyType;
  
  // Populated
  depends_on_task?: Task;
  
  created_at: string;
}

// ============================================================================
// TASK COMMENTS (Comentários)
// ============================================================================

export interface TaskComment {
  id: string;
  task_id: string;
  
  user_id: string;
  user?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  
  content: string;
  mentions: string[];
  
  attachments: TaskAttachment[];
  
  // Thread
  parent_comment_id?: string;
  replies?: TaskComment[];
  
  is_edited: boolean;
  edited_at?: string;
  
  created_at: string;
}

export interface TaskAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

// ============================================================================
// TASK ACTIVITIES (Histórico)
// ============================================================================

export interface TaskActivity {
  id: string;
  task_id: string;
  
  user_id?: string;
  user?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  
  activity_type: ActivityType;
  
  old_value?: any;
  new_value?: any;
  description?: string;
  
  created_at: string;
}

// ============================================================================
// PROJECTS (Projetos/Templates)
// ============================================================================

export interface Project {
  id: string;
  organization_id: string;
  
  name: string;
  description?: string;
  
  project_type: 'project' | 'template';
  template_id?: string;
  
  status: 'active' | 'completed' | 'archived';
  
  // Cliente
  client_name?: string;
  client_id?: string;
  
  // Progresso
  total_tasks: number;
  completed_tasks: number;
  progress_percentage?: number;
  
  // Visual
  color: string;
  icon: string;
  
  // Tasks (populated)
  tasks?: Task[];
  sections?: ProjectSection[];
  
  metadata?: Record<string, any>;
  
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectSection {
  name: string;
  tasks: Task[];
  collapsed?: boolean;
}

// ============================================================================
// OPERATIONAL TASK TEMPLATES
// ============================================================================

export interface EventTriggerConfig {
  event: EventTriggerType;
  days_offset: number;
  offset_direction: 'before' | 'after';
  time_mode: 'same_as_event' | 'fixed' | 'offset_hours';
  fixed_time?: string; // "08:00"
  offset_hours?: number;
  conditions?: {
    reservation_tag?: string;
    min_stay_days?: number;
    first_booking_only?: boolean;
  };
}

export interface ScheduleConfig {
  frequency: ScheduleFrequency;
  weekly_days?: number[]; // 0-6 (Dom-Sab)
  monthly_day?: number;   // 1-31
  monthly_week?: 'first' | 'second' | 'third' | 'fourth' | 'last';
  monthly_weekday?: number; // 0-6
  time: string;           // "09:00"
  conflict_resolution: ConflictResolution;
  max_postpone_days?: number;
}

export interface OperationalTaskTemplate {
  id: string;
  organization_id: string;
  
  name: string;
  description?: string;
  instructions?: string;
  
  priority: TaskPriority;
  estimated_duration_minutes: number;
  
  // Gatilho
  trigger_type: TriggerType;
  event_trigger?: EventTriggerConfig;
  schedule_config?: ScheduleConfig;
  
  // Atribuição
  assignment_type: 'person' | 'team' | 'manual';
  assigned_user_id?: string;
  assigned_user?: {
    id: string;
    name: string;
  };
  assigned_team_id?: string;
  assigned_team?: Team;
  
  // Escopo
  property_scope: PropertyScope;
  property_ids?: string[];
  property_tag?: string;
  property_owner_id?: string;
  
  // Propriedades incluídas (populated)
  properties?: {
    id: string;
    name: string;
    code?: string;
  }[];
  
  // Visual
  color: string;
  icon: string;
  
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// OPERATIONAL TASKS (Instâncias)
// ============================================================================

export interface OperationalTask {
  id: string;
  organization_id: string;
  template_id?: string;
  template?: OperationalTaskTemplate;
  
  title: string;
  description?: string;
  instructions?: string;
  
  status: TaskStatus | 'skipped';
  priority: TaskPriority;
  
  // Atribuição
  assignee_id?: string;
  assignee?: {
    id: string;
    name: string;
    avatar_url?: string;
    phone?: string;
  };
  team_id?: string;
  team?: Team;
  
  // Datas
  scheduled_date: string;
  scheduled_time?: string;
  due_datetime?: string;
  completed_at?: string;
  
  // Contexto
  property_id?: string;
  property?: {
    id: string;
    name: string;
    code?: string;
    address?: string;
  };
  reservation_id?: string;
  reservation?: {
    id: string;
    guest_name: string;
    check_in: string;
    check_out: string;
    guests_count?: number;
  };
  
  // Evento que disparou
  triggered_by_event?: EventTriggerType;
  triggered_by_entity_id?: string;
  
  // Se foi adiado
  original_scheduled_date?: string;
  postpone_reason?: string;
  
  metadata?: Record<string, any>;
  
  created_by?: string;
  completed_by?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// VIEW / LIST CONFIGURATION
// ============================================================================

export interface ListColumn {
  id: string;
  field: string;           // Campo da tarefa (title, status, due_date, etc)
  label: string;
  type: 'text' | 'status' | 'priority' | 'date' | 'user' | 'custom_field' | 'progress';
  custom_field_id?: string; // Se for campo customizado
  width: number;           // Largura em pixels
  is_visible: boolean;
  is_pinned: boolean;      // Coluna fixa
  sort_order: number;
}

export interface TaskFilter {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assignee_ids?: string[];
  team_ids?: string[];
  project_ids?: string[];
  property_ids?: string[];
  due_date_from?: string;
  due_date_to?: string;
  tags?: string[];
  search?: string;
  custom_fields?: Record<string, any>;
}

export interface TaskSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ViewConfig {
  id: string;
  name: string;
  view_type: 'list' | 'board' | 'calendar' | 'timeline' | 'dashboard';
  columns?: ListColumn[];
  filters?: TaskFilter;
  sort?: TaskSort;
  group_by?: string;
  is_default?: boolean;
}

// ============================================================================
// DASHBOARD WIDGETS
// ============================================================================

export interface DashboardWidget {
  id: string;
  type: 'kpi' | 'bar_chart' | 'pie_chart' | 'line_chart' | 'table' | 'calendar_preview';
  title: string;
  config: WidgetConfig;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface WidgetConfig {
  metric?: 'total' | 'completed' | 'pending' | 'overdue' | 'in_progress';
  group_by?: 'status' | 'priority' | 'assignee' | 'team' | 'project' | 'property';
  date_range?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  date_from?: string;
  date_to?: string;
  filters?: TaskFilter;
}

// ============================================================================
// AUTOMATION INTEGRATION
// ============================================================================

export interface TaskAutomationTrigger {
  trigger_type: 
    | 'task_created'
    | 'task_status_changed'
    | 'task_assigned'
    | 'task_due_date_approaching'
    | 'task_overdue'
    | 'task_completed'
    | 'subtask_completed'
    | 'all_subtasks_completed';
  conditions?: {
    status?: TaskStatus;
    priority?: TaskPriority;
    task_type?: TaskType;
    project_id?: string;
    team_id?: string;
  };
}

export interface TaskAutomationAction {
  action_type:
    | 'change_status'
    | 'change_priority'
    | 'assign_to_user'
    | 'assign_to_team'
    | 'add_comment'
    | 'send_notification'
    | 'create_subtask'
    | 'set_custom_field'
    | 'move_to_project'
    | 'add_tag';
  params: Record<string, any>;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface TasksListResponse {
  tasks: Task[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface OperationsListResponse {
  operations: OperationalTask[];
  total: number;
  date: string;
  summary: {
    pending: number;
    in_progress: number;
    completed: number;
    overdue: number;
  };
}

export interface ProjectsListResponse {
  projects: Project[];
  total: number;
}

// ============================================================================
// FORM TYPES (para criação/edição)
// ============================================================================

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  task_type?: TaskType;
  parent_id?: string;
  assignee_id?: string;
  team_id?: string;
  due_date?: string;
  start_date?: string;
  estimated_minutes?: number;
  project_id?: string;
  deal_id?: string;
  ticket_id?: string;
  property_id?: string;
  reservation_id?: string;
  section_name?: string;
  tags?: string[];
  custom_fields?: Record<string, any>;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  id: string;
  completed_at?: string;
  actual_minutes?: number;
}

export interface CreateTeamInput {
  name: string;
  description?: string;
  notification_config: TeamNotificationConfig;
  assignment_rule: AssignmentRule;
  fixed_assignee_id?: string;
  color?: string;
  icon?: string;
  member_ids?: string[];
  external_members?: Array<{
    name: string;
    phone?: string;
    email?: string;
  }>;
}

export interface CreateOperationalTemplateInput {
  name: string;
  description?: string;
  instructions?: string;
  priority?: TaskPriority;
  estimated_duration_minutes?: number;
  trigger_type: TriggerType;
  event_trigger?: EventTriggerConfig;
  schedule_config?: ScheduleConfig;
  assignment_type: 'person' | 'team' | 'manual';
  assigned_user_id?: string;
  assigned_team_id?: string;
  property_scope: PropertyScope;
  property_ids?: string[];
  property_tag?: string;
  property_owner_id?: string;
  color?: string;
  icon?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type TaskWithRelations = Task & {
  subtasks: Task[];
  dependencies: TaskDependency[];
  comments: TaskComment[];
  activities: TaskActivity[];
  custom_field_values: CustomFieldValue[];
};

export type OperationalTaskWithRelations = OperationalTask & {
  template: OperationalTaskTemplate;
  property: NonNullable<OperationalTask['property']>;
  reservation?: NonNullable<OperationalTask['reservation']>;
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calcula progresso percentual de um projeto
 */
export function calculateProgress(total: number, completed: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/**
 * Verifica se tarefa está atrasada
 */
export function isTaskOverdue(task: Task): boolean {
  if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') {
    return false;
  }
  return new Date(task.due_date) < new Date();
}

/**
 * Verifica se SLA está próximo de vencer
 */
export function isSlaApproaching(dueDate: string, hoursThreshold: number = 2): boolean {
  const due = new Date(dueDate);
  const now = new Date();
  const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
  return diffHours > 0 && diffHours <= hoursThreshold;
}

/**
 * Formata duração em minutos para texto legível
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
}

/**
 * Obtém cor do status
 */
export function getStatusColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    pending: '#94a3b8',      // Slate
    in_progress: '#3b82f6',  // Blue
    completed: '#22c55e',    // Green
    cancelled: '#ef4444',    // Red
  };
  return colors[status] || '#94a3b8';
}

/**
 * Obtém cor da prioridade
 */
export function getPriorityColor(priority: TaskPriority): string {
  const colors: Record<TaskPriority, string> = {
    low: '#94a3b8',       // Slate
    medium: '#f59e0b',    // Amber
    high: '#f97316',      // Orange
    urgent: '#ef4444',    // Red
  };
  return colors[priority] || '#94a3b8';
}
