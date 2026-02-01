/**
 * RENDIZY - CRM Tasks Service
 * 
 * Camada de serviço para o sistema de tarefas CRM v2
 * Integração com Supabase para todas as operações CRUD
 * 
 * Tabelas (conforme migration 2026012706):
 * - teams, team_members
 * - crm_tasks, task_dependencies, task_comments
 * - custom_fields, custom_field_values
 * - operational_task_templates, operational_tasks
 * - crm_projects, task_activities
 * 
 * @version 2.1.0
 * @date 2026-01-28
 */

import { getSupabaseClient } from '../supabase/client';
import { createClient } from '@supabase/supabase-js';
import { projectId } from '../supabase/info';

// Re-export getSupabaseClient para uso em hooks
export { getSupabaseClient };

// NOTE: Usamos type assertions (as any) porque essas tabelas foram criadas 
// manualmente via SQL e não estão no tipo gerado do Supabase.
// Em produção, ideal é regenerar os tipos do Supabase com `supabase gen types typescript`

// Service Role Key para operações que requerem bypass de RLS
// IMPORTANTE: Em produção, o ideal é criar policies RLS adequadas
// ou mover essas operações para o backend (Edge Functions)
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM1NDE3MSwiZXhwIjoyMDc3OTMwMTcxfQ.VHFenB49fLdgSUH-j9DUKgNgrWbcNjhCodhMtEa-rfE';

// Cliente admin com service_role para CRM (bypass RLS)
const supabaseAdmin = createClient(
  `https://${projectId}.supabase.co`,
  SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
) as any;

// Cliente normal para leituras (usa sessão do usuário)
const supabase = supabaseAdmin; // Usando admin para todas as operações por enquanto

// ============================================================================
// TYPES (Alinhados com a migration)
// ============================================================================

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'skipped';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskType = 'task' | 'form' | 'attachment';

export interface Team {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  notification_on_task_created?: boolean;
  notification_on_sla_approaching?: boolean;
  notification_on_task_overdue?: boolean;
  notification_on_any_update?: boolean;
  notification_channels?: string[];
  assignment_rule?: string;
  fixed_assignee_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id?: string;
  external_name?: string;
  external_phone?: string;
  external_email?: string;
  role: 'leader' | 'member';
  is_active: boolean;
  created_at: string;
  // Joined fields
  user_name?: string;
  user_email?: string;
  user_avatar?: string;
}

export interface CRMTask {
  id: string;
  organization_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  task_type?: TaskType;
  parent_id?: string;
  depth?: number;
  path?: string;
  assignee_id?: string;
  team_id?: string;
  due_date?: string;
  start_date?: string;
  completed_at?: string;
  estimated_minutes?: number;
  actual_minutes?: number;
  project_id?: string;
  deal_id?: string;
  ticket_id?: string;
  property_id?: string;
  reservation_id?: string;
  display_order?: number;
  section_name?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  assignee_name?: string;
  team_name?: string;
  project_name?: string;
  subtask_count?: number;
  completed_subtask_count?: number;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  mentions?: string[];
  attachments?: any[];
  parent_comment_id?: string;
  is_edited?: boolean;
  edited_at?: string;
  created_at: string;
  // Joined fields
  user_name?: string;
  user_avatar?: string;
}

export interface OperationalTask {
  id: string;
  organization_id: string;
  template_id?: string;
  title: string;
  description?: string;
  instructions?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id?: string;
  team_id?: string;
  scheduled_date: string;
  scheduled_time?: string;
  due_datetime?: string;
  completed_at?: string;
  property_id?: string;
  reservation_id?: string;
  triggered_by_event?: string;
  triggered_by_entity_id?: string;
  original_scheduled_date?: string;
  postpone_reason?: string;
  metadata?: Record<string, any>;
  created_by?: string;
  completed_by?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  property_name?: string;
  guest_name?: string;
  guest_phone?: string;
  assignee_name?: string;
  team_name?: string;
  template_name?: string;
  template_icon?: string;
  template_color?: string;
}

export interface CRMProject {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  project_type?: 'project' | 'template';
  template_id?: string;
  status: 'active' | 'completed' | 'archived';
  client_name?: string;
  client_id?: string;
  total_tasks?: number;
  completed_tasks?: number;
  color?: string;
  icon?: string;
  metadata?: Record<string, any>;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Computed
  progress_percentage?: number;
}

export interface CustomField {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  field_type: 'text' | 'number' | 'single_select' | 'multi_select' | 'date' | 'user' | 'currency';
  options?: any[];
  is_required?: boolean;
  is_visible_in_list?: boolean;
  default_value?: string;
  scope?: string;
  display_order?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id?: string;
  activity_type: string;
  old_value?: any;
  new_value?: any;
  description?: string;
  created_at: string;
  // Joined fields
  user_name?: string;
}

// ============================================================================
// TEAMS SERVICE
// ============================================================================

export const teamsService = {
  async getAll(orgId: string): Promise<Team[]> {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Team | null> {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(team: Omit<Team, 'id' | 'created_at' | 'updated_at'>): Promise<Team> {
    const { data, error } = await supabase
      .from('teams')
      .insert(team)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Team>): Promise<Team> {
    const { data, error } = await supabase
      .from('teams')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('teams')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
  },

  async getMembers(teamId: string): Promise<TeamMember[]> {
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        *,
        users:user_id (
          name,
          email,
          avatar
        )
      `)
      .eq('team_id', teamId)
      .eq('is_active', true);
    
    if (error) throw error;
    
    return (data || []).map((member: any) => ({
      ...member,
      user_name: member.users?.name || member.external_name,
      user_email: member.users?.email || member.external_email,
      user_avatar: member.users?.avatar,
    }));
  },

  async addMember(teamId: string, userId: string, role: 'leader' | 'member' = 'member'): Promise<TeamMember> {
    const { data, error } = await supabase
      .from('team_members')
      .insert({ team_id: teamId, user_id: userId, role, is_active: true })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async removeMember(teamId: string, memberId: string): Promise<void> {
    const { error } = await supabase
      .from('team_members')
      .update({ is_active: false })
      .eq('team_id', teamId)
      .eq('id', memberId);
    
    if (error) throw error;
  },
};

// ============================================================================
// TASKS SERVICE
// ============================================================================

export const tasksService = {
  async getAll(orgId: string, filters?: {
    status?: TaskStatus[];
    priority?: TaskPriority[];
    assigneeId?: string;
    teamId?: string;
    projectId?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
    search?: string;
  }): Promise<CRMTask[]> {
    // Query simplificada sem joins problemáticos
    let query = supabase
      .from('crm_tasks')
      .select('*')
      .eq('organization_id', orgId)
      .is('parent_id', null) // Only top-level tasks
      .order('created_at', { ascending: false });
    
    if (filters?.status?.length) {
      query = query.in('status', filters.status);
    }
    if (filters?.priority?.length) {
      query = query.in('priority', filters.priority);
    }
    if (filters?.assigneeId) {
      query = query.eq('assignee_id', filters.assigneeId);
    }
    if (filters?.teamId) {
      query = query.eq('team_id', filters.teamId);
    }
    if (filters?.projectId) {
      query = query.eq('project_id', filters.projectId);
    }
    if (filters?.dueDateFrom) {
      query = query.gte('due_date', filters.dueDateFrom);
    }
    if (filters?.dueDateTo) {
      query = query.lte('due_date', filters.dueDateTo);
    }
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('[tasksService.getAll] Error:', error);
      throw error;
    }
    
    return data || [];
  },

  async getById(id: string): Promise<CRMTask | null> {
    const { data, error } = await supabase
      .from('crm_tasks')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('[tasksService.getById] Error:', error);
      throw error;
    }
    
    return data || null;
  },

  /**
   * Busca todas as subtarefas de uma tarefa, incluindo sub-subtarefas (hierarquia completa).
   * Usa uma abordagem iterativa para buscar todos os níveis.
   */
  async getSubtasks(parentId: string): Promise<CRMTask[]> {
    // Primeiro, busca filhos diretos
    const { data: directChildren, error: error1 } = await supabase
      .from('crm_tasks')
      .select('*')
      .eq('parent_id', parentId)
      .order('display_order')
      .order('created_at');
    
    if (error1) {
      console.error('[tasksService.getSubtasks] Error fetching direct children:', error1);
      throw error1;
    }

    if (!directChildren || directChildren.length === 0) {
      return [];
    }

    // Agora busca filhos dos filhos (sub-subtarefas)
    const childIds = directChildren.map(c => c.id);
    const { data: grandChildren, error: error2 } = await supabase
      .from('crm_tasks')
      .select('*')
      .in('parent_id', childIds)
      .order('display_order')
      .order('created_at');
    
    if (error2) {
      console.error('[tasksService.getSubtasks] Error fetching grandchildren:', error2);
      // Não é fatal, retorna só os filhos diretos
      return directChildren;
    }

    // Combina tudo
    return [...directChildren, ...(grandChildren || [])];
  },

  async create(task: Omit<CRMTask, 'id' | 'created_at' | 'updated_at'>): Promise<CRMTask> {
    const { data, error } = await supabase
      .from('crm_tasks')
      .insert(task)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<CRMTask>): Promise<CRMTask> {
    // Se estiver completando a tarefa, setar completed_at
    if (updates.status === 'completed' && !updates.completed_at) {
      updates.completed_at = new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from('crm_tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('crm_tasks')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getByDateRange(orgId: string, startDate: string, endDate: string): Promise<CRMTask[]> {
    const { data, error } = await supabase
      .from('crm_tasks')
      .select('*')
      .eq('organization_id', orgId)
      .gte('due_date', startDate)
      .lte('due_date', endDate)
      .order('due_date');
    
    if (error) {
      console.error('[tasksService.getByDateRange] Error:', error);
      throw error;
    }
    
    return data || [];
  },

  async getMyTasks(userId: string): Promise<CRMTask[]> {
    const { data, error } = await supabase
      .from('crm_tasks')
      .select('*')
      .eq('assignee_id', userId)
      .in('status', ['pending', 'in_progress'])
      .order('due_date', { ascending: true, nullsFirst: false });
    
    if (error) {
      console.error('[tasksService.getMyTasks] Error:', error);
      throw error;
    }
    
    return data || [];
  },
};

// ============================================================================
// TASK COMMENTS SERVICE
// ============================================================================

export const taskCommentsService = {
  async getByTask(taskId: string): Promise<TaskComment[]> {
    const { data, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('[taskCommentsService.getByTask] Error:', error);
      throw error;
    }
    
    return data || [];
  },

  async create(comment: { task_id: string; user_id: string; content: string; mentions?: string[] }): Promise<TaskComment> {
    const { data, error } = await supabase
      .from('task_comments')
      .insert(comment)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, content: string): Promise<TaskComment> {
    const { data, error } = await supabase
      .from('task_comments')
      .update({ content, is_edited: true, edited_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('task_comments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// ============================================================================
// OPERATIONAL TASKS SERVICE (Check-ins, Check-outs, Limpezas, Manutenções)
// ============================================================================

export const operationalTasksService = {
  async getAll(orgId: string, filters?: {
    triggeredByEvent?: string;
    status?: TaskStatus[];
    scheduledDate?: string;
    propertyId?: string;
    assigneeId?: string;
    teamId?: string;
  }): Promise<OperationalTask[]> {
    let query = supabase
      .from('operational_tasks')
      .select(`
        *,
        users:assignee_id (name),
        teams:team_id (name),
        operational_task_templates:template_id (name, icon, color)
      `)
      .eq('organization_id', orgId)
      .order('scheduled_date')
      .order('scheduled_time');
    
    if (filters?.triggeredByEvent) {
      query = query.eq('triggered_by_event', filters.triggeredByEvent);
    }
    if (filters?.status?.length) {
      query = query.in('status', filters.status);
    }
    if (filters?.scheduledDate) {
      query = query.eq('scheduled_date', filters.scheduledDate);
    }
    if (filters?.propertyId) {
      query = query.eq('property_id', filters.propertyId);
    }
    if (filters?.assigneeId) {
      query = query.eq('assignee_id', filters.assigneeId);
    }
    if (filters?.teamId) {
      query = query.eq('team_id', filters.teamId);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    
    return (data || []).map(task => ({
      ...task,
      assignee_name: task.users?.name,
      team_name: task.teams?.name,
      template_name: task.operational_task_templates?.name,
      template_icon: task.operational_task_templates?.icon,
      template_color: task.operational_task_templates?.color,
    }));
  },

  async getCheckIns(orgId: string, date: string): Promise<OperationalTask[]> {
    return this.getAll(orgId, {
      triggeredByEvent: 'checkin_day',
      scheduledDate: date,
    });
  },

  async getCheckOuts(orgId: string, date: string): Promise<OperationalTask[]> {
    return this.getAll(orgId, {
      triggeredByEvent: 'checkout_day',
      scheduledDate: date,
    });
  },

  async getCleanings(orgId: string, filters?: {
    status?: TaskStatus[];
    date?: string;
  }): Promise<OperationalTask[]> {
    let query = supabase
      .from('operational_tasks')
      .select(`
        *,
        users:assignee_id (name),
        teams:team_id (name),
        operational_task_templates:template_id (name, icon, color)
      `)
      .eq('organization_id', orgId)
      .or('triggered_by_event.eq.cleaning,title.ilike.%limpeza%,title.ilike.%cleaning%')
      .order('scheduled_date')
      .order('scheduled_time');
    
    if (filters?.status?.length) {
      query = query.in('status', filters.status);
    }
    if (filters?.date) {
      query = query.eq('scheduled_date', filters.date);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    
    return (data || []).map(task => ({
      ...task,
      assignee_name: task.users?.name,
      team_name: task.teams?.name,
      template_name: task.operational_task_templates?.name,
      template_icon: task.operational_task_templates?.icon,
      template_color: task.operational_task_templates?.color,
    }));
  },

  async getMaintenances(orgId: string, filters?: {
    status?: TaskStatus[];
    priority?: TaskPriority;
  }): Promise<OperationalTask[]> {
    let query = supabase
      .from('operational_tasks')
      .select(`
        *,
        users:assignee_id (name),
        teams:team_id (name),
        operational_task_templates:template_id (name, icon, color)
      `)
      .eq('organization_id', orgId)
      .or('triggered_by_event.eq.maintenance,title.ilike.%manutenção%,title.ilike.%maintenance%')
      .order('priority', { ascending: false })
      .order('scheduled_date');
    
    if (filters?.status?.length) {
      query = query.in('status', filters.status);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    
    return (data || []).map(task => ({
      ...task,
      assignee_name: task.users?.name,
      team_name: task.teams?.name,
      template_name: task.operational_task_templates?.name,
      template_icon: task.operational_task_templates?.icon,
      template_color: task.operational_task_templates?.color,
    }));
  },

  async create(task: Omit<OperationalTask, 'id' | 'created_at' | 'updated_at'>): Promise<OperationalTask> {
    const { data, error } = await supabase
      .from('operational_tasks')
      .insert(task)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<OperationalTask>): Promise<OperationalTask> {
    // Se estiver completando, setar completed_at
    if (updates.status === 'completed' && !updates.completed_at) {
      updates.completed_at = new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from('operational_tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('operational_tasks')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async markAsStarted(id: string): Promise<OperationalTask> {
    return this.update(id, {
      status: 'in_progress',
    });
  },

  async markAsCompleted(id: string, completedBy?: string): Promise<OperationalTask> {
    return this.update(id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_by: completedBy,
    });
  },
};

// ============================================================================
// PROJECTS SERVICE
// ============================================================================

export const projectsService = {
  async getAll(orgId: string): Promise<CRMProject[]> {
    const { data, error } = await supabase
      .from('crm_projects')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<CRMProject | null> {
    const { data, error } = await supabase
      .from('crm_projects')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(project: Omit<CRMProject, 'id' | 'created_at' | 'updated_at'>): Promise<CRMProject> {
    const { data, error } = await supabase
      .from('crm_projects')
      .insert(project)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<CRMProject>): Promise<CRMProject> {
    const { data, error } = await supabase
      .from('crm_projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('crm_projects')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getWithStats(orgId: string): Promise<CRMProject[]> {
    // A migration já tem total_tasks e completed_tasks na tabela crm_projects
    // E o trigger update_project_progress() mantém atualizado
    const { data, error } = await supabase
      .from('crm_projects')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(project => ({
      ...project,
      progress_percentage: project.total_tasks > 0 
        ? Math.round((project.completed_tasks / project.total_tasks) * 100) 
        : 0,
    }));
  },
};

// ============================================================================
// CUSTOM FIELDS SERVICE
// ============================================================================

export const customFieldsService = {
  async getByScope(orgId: string, scope: string): Promise<CustomField[]> {
    const { data, error } = await supabase
      .from('custom_fields')
      .select('*')
      .eq('organization_id', orgId)
      .eq('scope', scope)
      .eq('is_active', true)
      .order('display_order');
    
    if (error) throw error;
    return data || [];
  },

  async create(field: Omit<CustomField, 'id' | 'created_at' | 'updated_at'>): Promise<CustomField> {
    const { data, error } = await supabase
      .from('custom_fields')
      .insert(field)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<CustomField>): Promise<CustomField> {
    const { data, error } = await supabase
      .from('custom_fields')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('custom_fields')
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) throw error;
  },
};

// ============================================================================
// TASK ACTIVITIES SERVICE
// ============================================================================

export const taskActivitiesService = {
  async getByTask(taskId: string): Promise<TaskActivity[]> {
    const { data, error } = await supabase
      .from('task_activities')
      .select(`
        *,
        users:user_id (name)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(activity => ({
      ...activity,
      user_name: activity.users?.name,
    }));
  },

  async log(taskId: string, userId: string, activityType: string, oldValue?: any, newValue?: any, description?: string): Promise<void> {
    const { error } = await supabase
      .from('task_activities')
      .insert({
        task_id: taskId,
        user_id: userId,
        activity_type: activityType,
        old_value: oldValue,
        new_value: newValue,
        description,
      });
    
    if (error) throw error;
  },
};

// ============================================================================
// DASHBOARD STATS
// ============================================================================

export const tasksDashboardService = {
  async getStats(orgId: string): Promise<{
    totalTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
    completedTasks: number;
    overdueTasks: number;
    todayTasks: number;
    urgentTasks: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: tasks, error } = await supabase
      .from('crm_tasks')
      .select('id, status, priority, due_date')
      .eq('organization_id', orgId);
    
    if (error) throw error;
    
    const allTasks = tasks || [];
    
    return {
      totalTasks: allTasks.length,
      pendingTasks: allTasks.filter(t => t.status === 'pending').length,
      inProgressTasks: allTasks.filter(t => t.status === 'in_progress').length,
      completedTasks: allTasks.filter(t => t.status === 'completed').length,
      overdueTasks: allTasks.filter(t => t.due_date && t.due_date < today && !['completed', 'cancelled'].includes(t.status)).length,
      todayTasks: allTasks.filter(t => t.due_date?.startsWith(today)).length,
      urgentTasks: allTasks.filter(t => t.priority === 'urgent' && !['completed', 'cancelled'].includes(t.status)).length,
    };
  },

  async getOperationalStats(orgId: string, date: string): Promise<{
    checkIns: { pending: number; completed: number };
    checkOuts: { pending: number; completed: number; late: number };
    cleanings: { pending: number; inProgress: number; completed: number };
    maintenances: { urgent: number; pending: number; inProgress: number };
  }> {
    const { data: tasks, error } = await supabase
      .from('operational_tasks')
      .select('id, triggered_by_event, title, status, priority, scheduled_date, scheduled_time')
      .eq('organization_id', orgId);
    
    if (error) throw error;
    
    const allTasks = tasks || [];
    const todayTasks = allTasks.filter(t => t.scheduled_date === date);
    
    // Check-ins/Check-outs são por triggered_by_event
    const checkIns = todayTasks.filter(t => t.triggered_by_event === 'checkin_day');
    const checkOuts = todayTasks.filter(t => t.triggered_by_event === 'checkout_day');
    
    // Limpezas e manutenções podem ser por event ou título
    const cleanings = allTasks.filter(t => 
      t.triggered_by_event === 'cleaning' || 
      t.title?.toLowerCase().includes('limpeza') ||
      t.title?.toLowerCase().includes('cleaning')
    );
    const maintenances = allTasks.filter(t => 
      t.triggered_by_event === 'maintenance' ||
      t.title?.toLowerCase().includes('manutenção') ||
      t.title?.toLowerCase().includes('maintenance')
    );
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return {
      checkIns: {
        pending: checkIns.filter(t => t.status === 'pending').length,
        completed: checkIns.filter(t => t.status === 'completed').length,
      },
      checkOuts: {
        pending: checkOuts.filter(t => t.status === 'pending').length,
        completed: checkOuts.filter(t => t.status === 'completed').length,
        late: checkOuts.filter(t => t.status === 'pending' && t.scheduled_time && t.scheduled_time < currentTime).length,
      },
      cleanings: {
        pending: cleanings.filter(t => t.status === 'pending').length,
        inProgress: cleanings.filter(t => t.status === 'in_progress').length,
        completed: cleanings.filter(t => t.status === 'completed').length,
      },
      maintenances: {
        urgent: maintenances.filter(t => t.priority === 'urgent' && t.status !== 'completed').length,
        pending: maintenances.filter(t => t.status === 'pending').length,
        inProgress: maintenances.filter(t => t.status === 'in_progress').length,
      },
    };
  },
};

// ============================================================================
// OPERATIONAL TASK TEMPLATES SERVICE
// ============================================================================

export interface OperationalTaskTemplate {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  instructions?: string;
  priority?: string; // high, medium, low
  estimated_duration_minutes?: number;
  trigger_type: 'event' | 'scheduled' | 'manual';
  event_trigger?: {
    event: string;
    time_mode?: string;
    fixed_time?: string;
    days_offset?: number;
    offset_direction?: string;
  };
  schedule_config?: any;
  assignment_type?: 'user' | 'team';
  assigned_user_id?: string;
  assigned_team_id?: string;
  property_scope: 'all' | 'selected';
  property_ids: string[];
  property_tag?: string;
  property_owner_id?: string;
  color?: string;
  icon?: string;
  is_active: boolean;
  responsibility_filter?: 'all' | 'company' | 'owner';
  operation_category?: string;
  created_at: string;
  updated_at: string;
}

export const operationalTaskTemplatesService = {
  async getAll(orgId: string): Promise<OperationalTaskTemplate[]> {
    const { data, error } = await supabase
      .from('operational_task_templates')
      .select('*')
      .eq('organization_id', orgId)
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<OperationalTaskTemplate | null> {
    const { data, error } = await supabase
      .from('operational_task_templates')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(template: Omit<OperationalTaskTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<OperationalTaskTemplate> {
    const { data, error } = await supabase
      .from('operational_task_templates')
      .insert(template as any)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao criar template:', error);
      throw error;
    }
    return data;
  },

  async update(id: string, updates: Partial<OperationalTaskTemplate>): Promise<OperationalTaskTemplate> {
    const { data, error } = await supabase
      .from('operational_task_templates')
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao atualizar template:', error);
      throw error;
    }
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('operational_task_templates')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('❌ Erro ao deletar template:', error);
      throw error;
    }
  },

  async toggleActive(id: string, isActive: boolean): Promise<OperationalTaskTemplate> {
    return this.update(id, { is_active: isActive });
  },

  async duplicate(id: string): Promise<OperationalTaskTemplate> {
    const original = await this.getById(id);
    if (!original) throw new Error('Template não encontrado');
    
    const { id: _id, created_at, updated_at, ...templateData } = original;
    
    return this.create({
      ...templateData,
      name: `${original.name} (Cópia)`,
    });
  },

  /**
   * Busca templates de limpeza ativos para uma organização
   */
  async getCleaningTemplates(orgId: string): Promise<OperationalTaskTemplate[]> {
    const { data, error } = await supabase
      .from('operational_task_templates')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .eq('operation_category', 'cleaning')
      .order('name');
    
    if (error) {
      console.error('❌ Erro ao buscar templates de limpeza:', error);
      throw error;
    }
    return data || [];
  },

  /**
   * Verifica se um template se aplica a uma propriedade específica
   */
  templateAppliesToProperty(template: OperationalTaskTemplate, propertyId: string): boolean {
    if (template.property_scope === 'all') {
      return true;
    }
    if (template.property_scope === 'selected' && template.property_ids) {
      return template.property_ids.includes(propertyId);
    }
    return false;
  },

  /**
   * Gera tarefas de limpeza virtuais baseadas nos templates e checkouts do dia
   * Útil para mostrar na tela de operações quais limpezas serão/deverão ser feitas
   */
  async generateCleaningTasksFromCheckouts(
    orgId: string,
    checkouts: Array<{ 
      id: string; 
      propertyId: string; 
      propertyName?: string;
      checkOut: string;
      guestName?: string;
    }>
  ): Promise<OperationalTask[]> {
    // Buscar templates de limpeza ativos
    const templates = await this.getCleaningTemplates(orgId);
    
    console.log(`📋 [generateCleaningTasksFromCheckouts] ${templates.length} templates encontrados, ${checkouts.length} checkouts`);
    
    if (templates.length === 0) {
      console.log('ℹ️ Nenhum template de limpeza ativo encontrado');
      return [];
    }

    const generatedTasks: OperationalTask[] = [];

    for (const checkout of checkouts) {
      // Encontrar templates aplicáveis a esta propriedade
      const applicableTemplates = templates.filter(t => 
        this.templateAppliesToProperty(t, checkout.propertyId)
      );

      for (const template of applicableTemplates) {
        // Extrair metadata do template (se for JSON no instructions)
        let meta: any = {};
        try {
          meta = JSON.parse(template.instructions || '{}');
        } catch {
          meta = {};
        }

        // Só gerar se for vinculado a checkout ou both
        // Relaxamos a condição _type para templates que podem não ter esse campo
        const linkedTo = meta.linked_to || 'checkout';
        const shouldGenerate = linkedTo === 'checkout' || linkedTo === 'both';
        
        console.log(`🔍 Template "${template.name}" - linkedTo: ${linkedTo}, shouldGenerate: ${shouldGenerate}`);
        
        if (shouldGenerate) {
          const task: OperationalTask = {
            id: `generated-${checkout.id}-${template.id}`,
            organization_id: orgId,
            template_id: template.id,
            title: template.name,
            description: template.description,
            instructions: template.instructions,
            status: 'pending',
            priority: (template.priority as any) || 'medium',
            scheduled_date: checkout.checkOut,
            scheduled_time: template.event_trigger?.fixed_time || '10:00',
            property_id: checkout.propertyId,
            reservation_id: checkout.id,
            triggered_by_event: 'checkout_day',
            metadata: {
              property_name: checkout.propertyName,
              guest_name: checkout.guestName,
              template_name: template.name,
              template_color: template.color,
              template_icon: template.icon,
              subtasks: meta.subtasks || [],
              sla_hours: meta.sla_hours || 4,
              include_vistoria: meta.include_vistoria || false,
              _generated: true, // Flag para indicar que é gerado dinamicamente
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // Campos de join
            template_name: template.name,
            template_icon: template.icon,
            template_color: template.color,
          };
          
          generatedTasks.push(task);
        }
      }
    }

    console.log(`✅ ${generatedTasks.length} tarefas de limpeza geradas a partir de ${checkouts.length} checkouts`);
    return generatedTasks;
  },

  /**
   * Gera tarefas de limpeza virtuais baseadas nos templates e check-ins do dia
   */
  async generateCleaningTasksFromCheckins(
    orgId: string,
    checkins: Array<{ 
      id: string; 
      propertyId: string; 
      propertyName?: string;
      checkIn: string;
      guestName?: string;
    }>
  ): Promise<OperationalTask[]> {
    // Buscar templates de limpeza ativos
    const templates = await this.getCleaningTemplates(orgId);
    
    if (templates.length === 0) {
      return [];
    }

    const generatedTasks: OperationalTask[] = [];

    for (const checkin of checkins) {
      // Encontrar templates aplicáveis a esta propriedade
      const applicableTemplates = templates.filter(t => 
        this.templateAppliesToProperty(t, checkin.propertyId)
      );

      for (const template of applicableTemplates) {
        let meta: any = {};
        try {
          meta = JSON.parse(template.instructions || '{}');
        } catch {
          meta = {};
        }

        // Só gerar se for vinculado a checkin ou both
        const linkedTo = meta.linked_to || 'checkout';
        const shouldGenerate = linkedTo === 'checkin' || linkedTo === 'both';
        
        if (shouldGenerate) {
          const task: OperationalTask = {
            id: `generated-checkin-${checkin.id}-${template.id}`,
            organization_id: orgId,
            template_id: template.id,
            title: `${template.name} (Check-in)`,
            description: template.description,
            instructions: template.instructions,
            status: 'pending',
            priority: (template.priority as any) || 'medium',
            scheduled_date: checkin.checkIn,
            scheduled_time: template.event_trigger?.fixed_time || '10:00',
            property_id: checkin.propertyId,
            reservation_id: checkin.id,
            triggered_by_event: 'checkin_day',
            metadata: {
              property_name: checkin.propertyName,
              guest_name: checkin.guestName,
              template_name: template.name,
              template_color: template.color,
              template_icon: template.icon,
              subtasks: meta.subtasks || [],
              sla_hours: meta.sla_hours || 4,
              include_vistoria: meta.include_vistoria || false,
              _generated: true,
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            template_name: template.name,
            template_icon: template.icon,
            template_color: template.color,
          };
          
          generatedTasks.push(task);
        }
      }
    }

    console.log(`✅ ${generatedTasks.length} tarefas de limpeza geradas a partir de ${checkins.length} check-ins`);
    return generatedTasks;
  },
};
