/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    CRM TASKS SERVICE - API LAYER                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Serviço completo para operações de tarefas, times, projetos e operações
 * 
 * @version 2.0.0
 * @date 2026-01-27
 */

import { getSupabaseClient } from '../utils/supabase/client';
import type {
  Task,
  Team,
  TeamMember,
  TeamNotificationConfig,
  Project,
  CustomField,
  CustomFieldValue,
  TaskDependency,
  TaskComment,
  TaskActivity,
  OperationalTaskTemplate,
  OperationalTask,
  CreateTaskInput,
  UpdateTaskInput,
  CreateTeamInput,
  CreateOperationalTemplateInput,
  TaskFilter,
  TaskSort,
  TaskStatus,
  TaskPriority,
  AssignmentRule,
  NotificationChannel,
} from '../types/crm-tasks';

// ============================================================================
// TEAMS SERVICE
// ============================================================================

export const TeamsService = {
  /**
   * Lista todos os times da organização
   */
  async list(organizationId: string): Promise<Team[]> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        members:team_members(
          *,
          user:users(id, name, email, avatar_url)
        )
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    
    return (data || []).map(mapTeamFromDb);
  },

  /**
   * Obtém um time por ID
   */
  async getById(id: string): Promise<Team | null> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        members:team_members(
          *,
          user:users(id, name, email, avatar_url)
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return mapTeamFromDb(data);
  },

  /**
   * Cria um novo time
   */
  async create(organizationId: string, input: CreateTeamInput): Promise<Team> {
    const supabase = getSupabaseClient();
    
    // Insere o time
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        organization_id: organizationId,
        name: input.name,
        description: input.description,
        notification_on_task_created: input.notification_config.on_task_created,
        notification_on_sla_approaching: input.notification_config.on_sla_approaching,
        notification_on_task_overdue: input.notification_config.on_task_overdue,
        notification_on_any_update: input.notification_config.on_any_update,
        notification_channels: input.notification_config.channels,
        assignment_rule: input.assignment_rule,
        fixed_assignee_id: input.fixed_assignee_id,
        color: input.color || '#3b82f6',
        icon: input.icon || 'users',
      })
      .select()
      .single();
    
    if (teamError) throw teamError;
    
    // Adiciona membros internos
    if (input.member_ids && input.member_ids.length > 0) {
      const members = input.member_ids.map(userId => ({
        team_id: team.id,
        user_id: userId,
        role: 'member',
      }));
      
      const { error: membersError } = await supabase
        .from('team_members')
        .insert(members);
      
      if (membersError) throw membersError;
    }
    
    // Adiciona membros externos
    if (input.external_members && input.external_members.length > 0) {
      const externalMembers = input.external_members.map(m => ({
        team_id: team.id,
        external_name: m.name,
        external_phone: m.phone,
        external_email: m.email,
        role: 'member',
      }));
      
      const { error: extError } = await supabase
        .from('team_members')
        .insert(externalMembers);
      
      if (extError) throw extError;
    }
    
    return this.getById(team.id) as Promise<Team>;
  },

  /**
   * Atualiza um time
   */
  async update(id: string, updates: Partial<CreateTeamInput>): Promise<Team> {
    const supabase = getSupabaseClient();
    
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.icon !== undefined) updateData.icon = updates.icon;
    if (updates.assignment_rule !== undefined) updateData.assignment_rule = updates.assignment_rule;
    if (updates.fixed_assignee_id !== undefined) updateData.fixed_assignee_id = updates.fixed_assignee_id;
    
    if (updates.notification_config) {
      updateData.notification_on_task_created = updates.notification_config.on_task_created;
      updateData.notification_on_sla_approaching = updates.notification_config.on_sla_approaching;
      updateData.notification_on_task_overdue = updates.notification_config.on_task_overdue;
      updateData.notification_on_any_update = updates.notification_config.on_any_update;
      updateData.notification_channels = updates.notification_config.channels;
    }
    
    const { error } = await supabase
      .from('teams')
      .update(updateData)
      .eq('id', id);
    
    if (error) throw error;
    
    return this.getById(id) as Promise<Team>;
  },

  /**
   * Deleta (soft delete) um time
   */
  async delete(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('teams')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
  },

  /**
   * Adiciona membro a um time
   */
  async addMember(teamId: string, userId?: string, external?: { name: string; phone?: string; email?: string }): Promise<TeamMember> {
    const supabase = getSupabaseClient();
    
    const memberData: Record<string, any> = {
      team_id: teamId,
      role: 'member',
    };
    
    if (userId) {
      memberData.user_id = userId;
    } else if (external) {
      memberData.external_name = external.name;
      memberData.external_phone = external.phone;
      memberData.external_email = external.email;
    }
    
    const { data, error } = await supabase
      .from('team_members')
      .insert(memberData)
      .select(`
        *,
        user:users(id, name, email, avatar_url)
      `)
      .single();
    
    if (error) throw error;
    
    return mapTeamMemberFromDb(data);
  },

  /**
   * Remove membro de um time
   */
  async removeMember(memberId: string): Promise<void> {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId);
    
    if (error) throw error;
  },
};

// ============================================================================
// TASKS SERVICE
// ============================================================================

export const TasksService = {
  /**
   * Lista tarefas com filtros e paginação
   */
  async list(
    organizationId: string,
    filters?: TaskFilter,
    sort?: TaskSort,
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ tasks: Task[]; total: number }> {
    const supabase = getSupabaseClient();
    
    let query = supabase
      .from('crm_tasks')
      .select(`
        *,
        assignee:users!crm_tasks_assignee_id_fkey(id, name, email, avatar_url),
        team:teams(id, name, color, icon),
        project:crm_projects(id, name, color),
        property:properties(id, name, code)
      `, { count: 'exact' })
      .eq('organization_id', organizationId);
    
    // Aplicar filtros
    if (filters) {
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters.priority && filters.priority.length > 0) {
        query = query.in('priority', filters.priority);
      }
      if (filters.assignee_ids && filters.assignee_ids.length > 0) {
        query = query.in('assignee_id', filters.assignee_ids);
      }
      if (filters.team_ids && filters.team_ids.length > 0) {
        query = query.in('team_id', filters.team_ids);
      }
      if (filters.project_ids && filters.project_ids.length > 0) {
        query = query.in('project_id', filters.project_ids);
      }
      if (filters.property_ids && filters.property_ids.length > 0) {
        query = query.in('property_id', filters.property_ids);
      }
      if (filters.due_date_from) {
        query = query.gte('due_date', filters.due_date_from);
      }
      if (filters.due_date_to) {
        query = query.lte('due_date', filters.due_date_to);
      }
      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }
      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }
    }
    
    // Ordenação
    if (sort) {
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });
    } else {
      query = query.order('display_order').order('created_at', { ascending: false });
    }
    
    // Paginação
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return {
      tasks: (data || []).map(mapTaskFromDb),
      total: count || 0,
    };
  },

  /**
   * Obtém uma tarefa por ID com todos os relacionamentos
   */
  async getById(id: string): Promise<Task | null> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('crm_tasks')
      .select(`
        *,
        assignee:users!crm_tasks_assignee_id_fkey(id, name, email, avatar_url),
        team:teams(id, name, color, icon),
        project:crm_projects(id, name, color),
        property:properties(id, name, code),
        subtasks:crm_tasks!crm_tasks_parent_id_fkey(
          id, title, status, priority, assignee_id, due_date, display_order
        ),
        dependencies:task_dependencies!task_dependencies_task_id_fkey(
          id, depends_on_task_id, dependency_type,
          depends_on_task:crm_tasks!task_dependencies_depends_on_task_id_fkey(id, title, status)
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return mapTaskFromDb(data);
  },

  /**
   * Cria uma nova tarefa
   */
  async create(organizationId: string, userId: string, input: CreateTaskInput): Promise<Task> {
    const supabase = getSupabaseClient();
    
    // Calcula depth e path se for subtarefa
    let depth = 0;
    let path = '';
    
    if (input.parent_id) {
      const parent = await this.getById(input.parent_id);
      if (parent) {
        depth = parent.depth + 1;
        path = parent.path ? `${parent.path}/${input.parent_id}` : input.parent_id;
      }
    }
    
    const { data, error } = await supabase
      .from('crm_tasks')
      .insert({
        organization_id: organizationId,
        title: input.title,
        description: input.description,
        status: input.status || 'pending',
        priority: input.priority || 'medium',
        task_type: input.task_type || 'task',
        parent_id: input.parent_id,
        depth,
        path: path || undefined,
        assignee_id: input.assignee_id,
        team_id: input.team_id,
        due_date: input.due_date,
        start_date: input.start_date,
        estimated_minutes: input.estimated_minutes,
        project_id: input.project_id,
        deal_id: input.deal_id,
        ticket_id: input.ticket_id,
        property_id: input.property_id,
        reservation_id: input.reservation_id,
        section_name: input.section_name,
        tags: input.tags || [],
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Registra atividade
    await this.logActivity(data.id, userId, 'created', null, { title: input.title });
    
    // Salva custom fields se fornecidos
    if (input.custom_fields) {
      await this.setCustomFieldValues(data.id, 'task', input.custom_fields);
    }
    
    return this.getById(data.id) as Promise<Task>;
  },

  /**
   * Atualiza uma tarefa
   */
  async update(id: string, userId: string, input: UpdateTaskInput): Promise<Task> {
    const supabase = getSupabaseClient();
    
    // Busca tarefa atual para log
    const currentTask = await this.getById(id);
    
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };
    
    // Mapeia campos
    const fields = [
      'title', 'description', 'status', 'priority', 'task_type',
      'assignee_id', 'team_id', 'due_date', 'start_date', 'completed_at',
      'estimated_minutes', 'actual_minutes', 'project_id', 'deal_id',
      'ticket_id', 'property_id', 'reservation_id', 'section_name', 'tags'
    ];
    
    for (const field of fields) {
      if ((input as any)[field] !== undefined) {
        updateData[field] = (input as any)[field];
      }
    }
    
    // Se status mudou para completed, registra completed_at
    if (input.status === 'completed' && currentTask?.status !== 'completed') {
      updateData.completed_at = new Date().toISOString();
    }
    
    const { error } = await supabase
      .from('crm_tasks')
      .update(updateData)
      .eq('id', id);
    
    if (error) throw error;
    
    // Log de atividade para mudanças importantes
    if (input.status && input.status !== currentTask?.status) {
      await this.logActivity(id, userId, 'status_changed', 
        { status: currentTask?.status }, 
        { status: input.status }
      );
    }
    if (input.assignee_id && input.assignee_id !== currentTask?.assignee_id) {
      await this.logActivity(id, userId, 'assigned', 
        { assignee_id: currentTask?.assignee_id }, 
        { assignee_id: input.assignee_id }
      );
    }
    
    // Atualiza custom fields se fornecidos
    if (input.custom_fields) {
      await this.setCustomFieldValues(id, 'task', input.custom_fields);
    }
    
    return this.getById(id) as Promise<Task>;
  },

  /**
   * Deleta uma tarefa
   */
  async delete(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('crm_tasks')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  /**
   * Move tarefa (reordenação)
   */
  async move(
    id: string, 
    userId: string,
    newOrder: number, 
    newSection?: string, 
    newParentId?: string | null
  ): Promise<Task> {
    const supabase = getSupabaseClient();
    
    const updateData: Record<string, any> = {
      display_order: newOrder,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };
    
    if (newSection !== undefined) {
      updateData.section_name = newSection;
    }
    
    if (newParentId !== undefined) {
      updateData.parent_id = newParentId;
      // Recalcula depth se necessário
      if (newParentId) {
        const parent = await this.getById(newParentId);
        if (parent) {
          updateData.depth = parent.depth + 1;
          updateData.path = parent.path ? `${parent.path}/${newParentId}` : newParentId;
        }
      } else {
        updateData.depth = 0;
        updateData.path = null;
      }
    }
    
    const { error } = await supabase
      .from('crm_tasks')
      .update(updateData)
      .eq('id', id);
    
    if (error) throw error;
    
    return this.getById(id) as Promise<Task>;
  },

  /**
   * Obtém tarefas com hierarquia (subtarefas aninhadas)
   */
  async getWithHierarchy(organizationId: string, parentId?: string): Promise<Task[]> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .rpc('get_tasks_with_hierarchy', {
        p_organization_id: organizationId,
        p_parent_id: parentId || null,
      });
    
    if (error) throw error;
    
    // Reconstrói hierarquia em memória
    return buildTaskHierarchy(data || []);
  },

  /**
   * Registra atividade
   */
  async logActivity(
    taskId: string, 
    userId: string, 
    activityType: string, 
    oldValue?: any, 
    newValue?: any,
    description?: string
  ): Promise<void> {
    const supabase = getSupabaseClient();
    
    await supabase
      .from('task_activities')
      .insert({
        task_id: taskId,
        user_id: userId,
        activity_type: activityType,
        old_value: oldValue,
        new_value: newValue,
        description,
      });
  },

  /**
   * Define valores de campos customizados
   */
  async setCustomFieldValues(
    entityId: string, 
    entityType: string, 
    values: Record<string, any>
  ): Promise<void> {
    const supabase = getSupabaseClient();
    
    for (const [fieldId, value] of Object.entries(values)) {
      // Determina qual coluna usar baseado no tipo de valor
      const valueData: Record<string, any> = {
        custom_field_id: fieldId,
        entity_id: entityId,
        entity_type: entityType,
        updated_at: new Date().toISOString(),
      };
      
      if (typeof value === 'string') {
        valueData.value_text = value;
      } else if (typeof value === 'number') {
        valueData.value_number = value;
      } else if (value instanceof Date) {
        valueData.value_date = value.toISOString().split('T')[0];
      } else {
        valueData.value_json = value;
      }
      
      // Upsert
      await supabase
        .from('custom_field_values')
        .upsert(valueData, { onConflict: 'custom_field_id,entity_id' });
    }
  },
};

// ============================================================================
// DEPENDENCIES SERVICE
// ============================================================================

export const DependenciesService = {
  /**
   * Adiciona dependência entre tarefas
   */
  async add(
    taskId: string, 
    dependsOnTaskId: string, 
    dependencyType: string = 'finish_to_start'
  ): Promise<TaskDependency> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('task_dependencies')
      .insert({
        task_id: taskId,
        depends_on_task_id: dependsOnTaskId,
        dependency_type: dependencyType,
      })
      .select(`
        *,
        depends_on_task:crm_tasks!task_dependencies_depends_on_task_id_fkey(id, title, status)
      `)
      .single();
    
    if (error) throw error;
    
    return mapDependencyFromDb(data);
  },

  /**
   * Remove dependência
   */
  async remove(dependencyId: string): Promise<void> {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('task_dependencies')
      .delete()
      .eq('id', dependencyId);
    
    if (error) throw error;
  },

  /**
   * Lista dependências de uma tarefa
   */
  async listForTask(taskId: string): Promise<{ dependencies: TaskDependency[]; dependents: TaskDependency[] }> {
    const supabase = getSupabaseClient();
    
    // Tarefas das quais esta depende
    const { data: dependencies, error: depError } = await supabase
      .from('task_dependencies')
      .select(`
        *,
        depends_on_task:crm_tasks!task_dependencies_depends_on_task_id_fkey(id, title, status)
      `)
      .eq('task_id', taskId);
    
    if (depError) throw depError;
    
    // Tarefas que dependem desta
    const { data: dependents, error: deptsError } = await supabase
      .from('task_dependencies')
      .select(`
        *,
        task:crm_tasks!task_dependencies_task_id_fkey(id, title, status)
      `)
      .eq('depends_on_task_id', taskId);
    
    if (deptsError) throw deptsError;
    
    return {
      dependencies: (dependencies || []).map(mapDependencyFromDb),
      dependents: (dependents || []).map(mapDependencyFromDb),
    };
  },
};

// ============================================================================
// COMMENTS SERVICE
// ============================================================================

export const CommentsService = {
  /**
   * Lista comentários de uma tarefa
   */
  async listForTask(taskId: string): Promise<TaskComment[]> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('task_comments')
      .select(`
        *,
        user:users(id, name, avatar_url)
      `)
      .eq('task_id', taskId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    // Busca replies para cada comentário
    const comments = await Promise.all(
      (data || []).map(async (comment) => {
        const { data: replies } = await supabase
          .from('task_comments')
          .select(`
            *,
            user:users(id, name, avatar_url)
          `)
          .eq('parent_comment_id', comment.id)
          .order('created_at', { ascending: true });
        
        return {
          ...mapCommentFromDb(comment),
          replies: (replies || []).map(mapCommentFromDb),
        };
      })
    );
    
    return comments;
  },

  /**
   * Adiciona comentário
   */
  async add(
    taskId: string, 
    userId: string, 
    content: string, 
    mentions?: string[],
    attachments?: any[],
    parentCommentId?: string
  ): Promise<TaskComment> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: taskId,
        user_id: userId,
        content,
        mentions: mentions || [],
        attachments: attachments || [],
        parent_comment_id: parentCommentId,
      })
      .select(`
        *,
        user:users(id, name, avatar_url)
      `)
      .single();
    
    if (error) throw error;
    
    // Log atividade
    await TasksService.logActivity(taskId, userId, 'commented', null, { content });
    
    return mapCommentFromDb(data);
  },

  /**
   * Edita comentário
   */
  async update(commentId: string, content: string): Promise<TaskComment> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('task_comments')
      .update({
        content,
        is_edited: true,
        edited_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .select(`
        *,
        user:users(id, name, avatar_url)
      `)
      .single();
    
    if (error) throw error;
    
    return mapCommentFromDb(data);
  },

  /**
   * Deleta comentário
   */
  async delete(commentId: string): Promise<void> {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('task_comments')
      .delete()
      .eq('id', commentId);
    
    if (error) throw error;
  },
};

// ============================================================================
// PROJECTS SERVICE
// ============================================================================

export const ProjectsService = {
  /**
   * Lista projetos
   */
  async list(
    organizationId: string, 
    type?: 'project' | 'template',
    status?: string
  ): Promise<Project[]> {
    const supabase = getSupabaseClient();
    
    let query = supabase
      .from('crm_projects')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (type) query = query.eq('project_type', type);
    if (status) query = query.eq('status', status);
    
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return (data || []).map(mapProjectFromDb);
  },

  /**
   * Obtém projeto com tarefas
   */
  async getById(id: string): Promise<Project | null> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('crm_projects')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    // Busca tarefas do projeto
    const { data: tasks } = await supabase
      .from('crm_tasks')
      .select(`
        *,
        assignee:users!crm_tasks_assignee_id_fkey(id, name, avatar_url),
        subtasks:crm_tasks!crm_tasks_parent_id_fkey(id, title, status)
      `)
      .eq('project_id', id)
      .is('parent_id', null)
      .order('section_name', { nullsFirst: true })
      .order('display_order');
    
    const project = mapProjectFromDb(data);
    project.tasks = (tasks || []).map(mapTaskFromDb);
    
    // Agrupa por seção
    project.sections = groupTasksBySections(project.tasks);
    
    return project;
  },

  /**
   * Cria projeto
   */
  async create(
    organizationId: string, 
    userId: string, 
    input: { 
      name: string; 
      description?: string; 
      project_type?: 'project' | 'template';
      client_name?: string;
      color?: string;
      icon?: string;
    }
  ): Promise<Project> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('crm_projects')
      .insert({
        organization_id: organizationId,
        name: input.name,
        description: input.description,
        project_type: input.project_type || 'project',
        client_name: input.client_name,
        color: input.color || '#3b82f6',
        icon: input.icon || 'folder',
        created_by: userId,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return mapProjectFromDb(data);
  },

  /**
   * Duplica template para novo projeto
   */
  async createFromTemplate(
    templateId: string, 
    organizationId: string, 
    userId: string,
    projectName: string,
    clientName?: string
  ): Promise<Project> {
    const template = await this.getById(templateId);
    if (!template) throw new Error('Template not found');
    
    // Cria novo projeto
    const newProject = await this.create(organizationId, userId, {
      name: projectName,
      description: template.description,
      project_type: 'project',
      client_name: clientName,
      color: template.color,
      icon: template.icon,
    });
    
    // Copia tarefas do template
    if (template.tasks && template.tasks.length > 0) {
      await this.copyTasks(template.tasks, newProject.id, organizationId, userId);
    }
    
    return this.getById(newProject.id) as Promise<Project>;
  },

  /**
   * Copia tarefas recursivamente
   */
  async copyTasks(
    tasks: Task[], 
    projectId: string, 
    organizationId: string, 
    userId: string,
    parentId?: string
  ): Promise<void> {
    for (const task of tasks) {
      const newTask = await TasksService.create(organizationId, userId, {
        title: task.title,
        description: task.description,
        priority: task.priority,
        task_type: task.task_type,
        parent_id: parentId,
        project_id: projectId,
        section_name: task.section_name,
        tags: task.tags,
      });
      
      // Copia subtarefas
      if (task.subtasks && task.subtasks.length > 0) {
        await this.copyTasks(task.subtasks, projectId, organizationId, userId, newTask.id);
      }
    }
  },

  /**
   * Atualiza projeto
   */
  async update(id: string, updates: Partial<Project>): Promise<Project> {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('crm_projects')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    
    if (error) throw error;
    
    return this.getById(id) as Promise<Project>;
  },

  /**
   * Deleta projeto (arquiva)
   */
  async delete(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('crm_projects')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
  },
};

// ============================================================================
// OPERATIONAL TASKS SERVICE
// ============================================================================

export const OperationalTasksService = {
  /**
   * Lista templates de tarefas operacionais
   */
  async listTemplates(organizationId: string): Promise<OperationalTaskTemplate[]> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('operational_task_templates')
      .select(`
        *,
        assigned_user:users!operational_task_templates_assigned_user_id_fkey(id, name),
        assigned_team:teams(id, name, color)
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    
    return (data || []).map(mapOperationalTemplateFromDb);
  },

  /**
   * Cria template de tarefa operacional
   */
  async createTemplate(
    organizationId: string, 
    input: CreateOperationalTemplateInput
  ): Promise<OperationalTaskTemplate> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('operational_task_templates')
      .insert({
        organization_id: organizationId,
        name: input.name,
        description: input.description,
        instructions: input.instructions,
        priority: input.priority || 'medium',
        estimated_duration_minutes: input.estimated_duration_minutes || 30,
        trigger_type: input.trigger_type,
        event_trigger: input.event_trigger,
        schedule_config: input.schedule_config,
        assignment_type: input.assignment_type,
        assigned_user_id: input.assigned_user_id,
        assigned_team_id: input.assigned_team_id,
        property_scope: input.property_scope,
        property_ids: input.property_ids || [],
        property_tag: input.property_tag,
        property_owner_id: input.property_owner_id,
        color: input.color || '#3b82f6',
        icon: input.icon || 'clipboard-list',
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return mapOperationalTemplateFromDb(data);
  },

  /**
   * Atualiza template
   */
  async updateTemplate(id: string, updates: Partial<CreateOperationalTemplateInput>): Promise<OperationalTaskTemplate> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('operational_task_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return mapOperationalTemplateFromDb(data);
  },

  /**
   * Deleta template (soft delete)
   */
  async deleteTemplate(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('operational_task_templates')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
  },

  /**
   * Lista tarefas operacionais por data
   */
  async listByDate(organizationId: string, date: string): Promise<OperationalTask[]> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('operational_tasks')
      .select(`
        *,
        template:operational_task_templates(id, name, icon, color),
        assignee:users!operational_tasks_assignee_id_fkey(id, name, avatar_url, phone),
        team:teams(id, name, color),
        property:properties(id, name, code, address)
      `)
      .eq('organization_id', organizationId)
      .eq('scheduled_date', date)
      .order('scheduled_time', { nullsFirst: false })
      .order('priority', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(mapOperationalTaskFromDb);
  },

  /**
   * Lista tarefas operacionais pendentes
   */
  async listPending(organizationId: string, limit: number = 50): Promise<OperationalTask[]> {
    const supabase = getSupabaseClient();
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('operational_tasks')
      .select(`
        *,
        template:operational_task_templates(id, name, icon, color),
        assignee:users!operational_tasks_assignee_id_fkey(id, name, avatar_url),
        team:teams(id, name, color),
        property:properties(id, name, code)
      `)
      .eq('organization_id', organizationId)
      .in('status', ['pending', 'in_progress'])
      .lte('scheduled_date', today)
      .order('scheduled_date')
      .order('scheduled_time')
      .limit(limit);
    
    if (error) throw error;
    
    return (data || []).map(mapOperationalTaskFromDb);
  },

  /**
   * Cria tarefa operacional manualmente
   */
  async create(
    organizationId: string,
    userId: string,
    input: {
      title: string;
      template_id?: string;
      scheduled_date: string;
      scheduled_time?: string;
      property_id?: string;
      reservation_id?: string;
      assignee_id?: string;
      team_id?: string;
      priority?: TaskPriority;
      description?: string;
      instructions?: string;
    }
  ): Promise<OperationalTask> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('operational_tasks')
      .insert({
        organization_id: organizationId,
        template_id: input.template_id,
        title: input.title,
        description: input.description,
        instructions: input.instructions,
        priority: input.priority || 'medium',
        scheduled_date: input.scheduled_date,
        scheduled_time: input.scheduled_time,
        property_id: input.property_id,
        reservation_id: input.reservation_id,
        assignee_id: input.assignee_id,
        team_id: input.team_id,
        created_by: userId,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return mapOperationalTaskFromDb(data);
  },

  /**
   * Atualiza status de tarefa operacional
   */
  async updateStatus(
    id: string, 
    userId: string, 
    status: TaskStatus | 'skipped'
  ): Promise<OperationalTask> {
    const supabase = getSupabaseClient();
    
    const updateData: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };
    
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
      updateData.completed_by = userId;
    }
    
    const { data, error } = await supabase
      .from('operational_tasks')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        template:operational_task_templates(id, name, icon, color),
        property:properties(id, name, code)
      `)
      .single();
    
    if (error) throw error;
    
    return mapOperationalTaskFromDb(data);
  },

  /**
   * Gera tarefas agendadas para uma data
   */
  async generateScheduledTasks(organizationId: string, date: string): Promise<number> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .rpc('generate_scheduled_operational_tasks', {
        p_organization_id: organizationId,
        p_date: date,
      });
    
    if (error) throw error;
    
    return data || 0;
  },

  /**
   * Dispara tarefas baseadas em evento
   */
  async triggerByEvent(
    organizationId: string,
    event: string,
    entityId: string,
    propertyId: string,
    reservationId?: string,
    metadata?: Record<string, any>
  ): Promise<OperationalTask[]> {
    const supabase = getSupabaseClient();
    
    // Busca templates que respondem a este evento
    const { data: templates, error: templatesError } = await supabase
      .from('operational_task_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .eq('trigger_type', 'event')
      .contains('event_trigger', { event });
    
    if (templatesError) throw templatesError;
    
    const createdTasks: OperationalTask[] = [];
    
    for (const template of templates || []) {
      // Verifica se imóvel está no escopo
      const isInScope = await this.checkPropertyScope(template, propertyId);
      if (!isInScope) continue;
      
      // Verifica condições adicionais
      const eventConfig = template.event_trigger as any;
      if (eventConfig.conditions) {
        // TODO: implementar verificação de condições (tags, min_stay, etc)
      }
      
      // Calcula data da tarefa
      const baseDate = new Date();
      const daysOffset = eventConfig.days_offset || 0;
      const scheduledDate = new Date(baseDate);
      if (eventConfig.offset_direction === 'before') {
        scheduledDate.setDate(scheduledDate.getDate() - daysOffset);
      } else {
        scheduledDate.setDate(scheduledDate.getDate() + daysOffset);
      }
      
      // Cria a tarefa
      const task = await this.create(organizationId, 'system', {
        title: template.name,
        template_id: template.id,
        scheduled_date: scheduledDate.toISOString().split('T')[0],
        scheduled_time: eventConfig.fixed_time,
        property_id: propertyId,
        reservation_id: reservationId,
        assignee_id: template.assigned_user_id,
        team_id: template.assigned_team_id,
        priority: template.priority,
        description: template.description,
        instructions: template.instructions,
      });
      
      // Atualiza com info do trigger
      await supabase
        .from('operational_tasks')
        .update({
          triggered_by_event: event,
          triggered_by_entity_id: entityId,
        })
        .eq('id', task.id);
      
      createdTasks.push(task);
    }
    
    return createdTasks;
  },

  /**
   * Verifica se imóvel está no escopo do template
   */
  async checkPropertyScope(template: any, propertyId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    
    if (template.property_scope === 'all') return true;
    
    if (template.property_scope === 'selected') {
      return (template.property_ids || []).includes(propertyId);
    }
    
    if (template.property_scope === 'by_tag') {
      const { data: property } = await supabase
        .from('properties')
        .select('tags')
        .eq('id', propertyId)
        .single();
      
      return property?.tags?.includes(template.property_tag);
    }
    
    if (template.property_scope === 'by_owner') {
      const { data: property } = await supabase
        .from('properties')
        .select('owner_id')
        .eq('id', propertyId)
        .single();
      
      return property?.owner_id === template.property_owner_id;
    }
    
    return false;
  },
};

// ============================================================================
// CUSTOM FIELDS SERVICE
// ============================================================================

export const CustomFieldsService = {
  /**
   * Lista campos customizados
   */
  async list(organizationId: string, scope?: string): Promise<CustomField[]> {
    const supabase = getSupabaseClient();
    
    let query = supabase
      .from('custom_fields')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);
    
    if (scope) query = query.eq('scope', scope);
    
    query = query.order('display_order');
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return (data || []).map(mapCustomFieldFromDb);
  },

  /**
   * Cria campo customizado
   */
  async create(
    organizationId: string,
    input: {
      name: string;
      description?: string;
      field_type: string;
      options?: { label: string; color: string }[];
      is_required?: boolean;
      is_visible_in_list?: boolean;
      default_value?: string;
      scope: string;
    }
  ): Promise<CustomField> {
    const supabase = getSupabaseClient();
    
    // Gera IDs para opções
    const options = (input.options || []).map(opt => ({
      id: crypto.randomUUID(),
      ...opt,
    }));
    
    // Obtém próxima ordem
    const { data: existing } = await supabase
      .from('custom_fields')
      .select('display_order')
      .eq('organization_id', organizationId)
      .eq('scope', input.scope)
      .order('display_order', { ascending: false })
      .limit(1);
    
    const nextOrder = (existing?.[0]?.display_order || 0) + 1;
    
    const { data, error } = await supabase
      .from('custom_fields')
      .insert({
        organization_id: organizationId,
        name: input.name,
        description: input.description,
        field_type: input.field_type,
        options,
        is_required: input.is_required || false,
        is_visible_in_list: input.is_visible_in_list !== false,
        default_value: input.default_value,
        scope: input.scope,
        display_order: nextOrder,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return mapCustomFieldFromDb(data);
  },

  /**
   * Atualiza campo customizado
   */
  async update(id: string, updates: Partial<CustomField>): Promise<CustomField> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('custom_fields')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return mapCustomFieldFromDb(data);
  },

  /**
   * Deleta campo customizado (soft delete)
   */
  async delete(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('custom_fields')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
  },

  /**
   * Reordena campos
   */
  async reorder(fieldIds: string[]): Promise<void> {
    const supabase = getSupabaseClient();
    
    for (let i = 0; i < fieldIds.length; i++) {
      await supabase
        .from('custom_fields')
        .update({ display_order: i + 1 })
        .eq('id', fieldIds[i]);
    }
  },
};

// ============================================================================
// MAPPERS (DB -> TypeScript)
// ============================================================================

function mapTeamFromDb(data: any): Team {
  return {
    id: data.id,
    organization_id: data.organization_id,
    name: data.name,
    description: data.description,
    notification_config: {
      on_task_created: data.notification_on_task_created,
      on_sla_approaching: data.notification_on_sla_approaching,
      on_task_overdue: data.notification_on_task_overdue,
      on_any_update: data.notification_on_any_update,
      channels: data.notification_channels || [],
    },
    assignment_rule: data.assignment_rule,
    fixed_assignee_id: data.fixed_assignee_id,
    color: data.color,
    icon: data.icon,
    members: data.members?.map(mapTeamMemberFromDb) || [],
    is_active: data.is_active,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

function mapTeamMemberFromDb(data: any): TeamMember {
  return {
    id: data.id,
    team_id: data.team_id,
    user_id: data.user_id,
    user: data.user,
    external_name: data.external_name,
    external_phone: data.external_phone,
    external_email: data.external_email,
    role: data.role,
    is_active: data.is_active,
    created_at: data.created_at,
  };
}

function mapTaskFromDb(data: any): Task {
  return {
    id: data.id,
    organization_id: data.organization_id,
    title: data.title,
    description: data.description,
    status: data.status,
    priority: data.priority,
    task_type: data.task_type,
    parent_id: data.parent_id,
    depth: data.depth,
    path: data.path,
    subtasks: data.subtasks?.map(mapTaskFromDb),
    subtask_count: data.subtask_count,
    completed_subtask_count: data.completed_subtask_count,
    assignee_id: data.assignee_id,
    assignee: data.assignee,
    team_id: data.team_id,
    team: data.team,
    due_date: data.due_date,
    start_date: data.start_date,
    completed_at: data.completed_at,
    estimated_minutes: data.estimated_minutes,
    actual_minutes: data.actual_minutes,
    project_id: data.project_id,
    project: data.project,
    deal_id: data.deal_id,
    ticket_id: data.ticket_id,
    property_id: data.property_id,
    property: data.property,
    reservation_id: data.reservation_id,
    display_order: data.display_order,
    section_name: data.section_name,
    tags: data.tags || [],
    metadata: data.metadata,
    dependencies: data.dependencies?.map(mapDependencyFromDb),
    created_by: data.created_by,
    updated_by: data.updated_by,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

function mapDependencyFromDb(data: any): TaskDependency {
  return {
    id: data.id,
    task_id: data.task_id,
    depends_on_task_id: data.depends_on_task_id,
    dependency_type: data.dependency_type,
    depends_on_task: data.depends_on_task,
    created_at: data.created_at,
  };
}

function mapCommentFromDb(data: any): TaskComment {
  return {
    id: data.id,
    task_id: data.task_id,
    user_id: data.user_id,
    user: data.user,
    content: data.content,
    mentions: data.mentions || [],
    attachments: data.attachments || [],
    parent_comment_id: data.parent_comment_id,
    replies: data.replies,
    is_edited: data.is_edited,
    edited_at: data.edited_at,
    created_at: data.created_at,
  };
}

function mapProjectFromDb(data: any): Project {
  return {
    id: data.id,
    organization_id: data.organization_id,
    name: data.name,
    description: data.description,
    project_type: data.project_type,
    template_id: data.template_id,
    status: data.status,
    client_name: data.client_name,
    client_id: data.client_id,
    total_tasks: data.total_tasks,
    completed_tasks: data.completed_tasks,
    progress_percentage: data.total_tasks > 0 
      ? Math.round((data.completed_tasks / data.total_tasks) * 100) 
      : 0,
    color: data.color,
    icon: data.icon,
    metadata: data.metadata,
    created_by: data.created_by,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

function mapOperationalTemplateFromDb(data: any): OperationalTaskTemplate {
  return {
    id: data.id,
    organization_id: data.organization_id,
    name: data.name,
    description: data.description,
    instructions: data.instructions,
    priority: data.priority,
    estimated_duration_minutes: data.estimated_duration_minutes,
    trigger_type: data.trigger_type,
    event_trigger: data.event_trigger,
    schedule_config: data.schedule_config,
    assignment_type: data.assignment_type,
    assigned_user_id: data.assigned_user_id,
    assigned_user: data.assigned_user,
    assigned_team_id: data.assigned_team_id,
    assigned_team: data.assigned_team,
    property_scope: data.property_scope,
    property_ids: data.property_ids,
    property_tag: data.property_tag,
    property_owner_id: data.property_owner_id,
    color: data.color,
    icon: data.icon,
    is_active: data.is_active,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

function mapOperationalTaskFromDb(data: any): OperationalTask {
  return {
    id: data.id,
    organization_id: data.organization_id,
    template_id: data.template_id,
    template: data.template,
    title: data.title,
    description: data.description,
    instructions: data.instructions,
    status: data.status,
    priority: data.priority,
    assignee_id: data.assignee_id,
    assignee: data.assignee,
    team_id: data.team_id,
    team: data.team,
    scheduled_date: data.scheduled_date,
    scheduled_time: data.scheduled_time,
    due_datetime: data.due_datetime,
    completed_at: data.completed_at,
    property_id: data.property_id,
    property: data.property,
    reservation_id: data.reservation_id,
    triggered_by_event: data.triggered_by_event,
    triggered_by_entity_id: data.triggered_by_entity_id,
    original_scheduled_date: data.original_scheduled_date,
    postpone_reason: data.postpone_reason,
    metadata: data.metadata,
    created_by: data.created_by,
    completed_by: data.completed_by,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

function mapCustomFieldFromDb(data: any): CustomField {
  return {
    id: data.id,
    organization_id: data.organization_id,
    name: data.name,
    description: data.description,
    field_type: data.field_type,
    options: data.options || [],
    is_required: data.is_required,
    is_visible_in_list: data.is_visible_in_list,
    default_value: data.default_value,
    scope: data.scope,
    display_order: data.display_order,
    is_active: data.is_active,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function buildTaskHierarchy(flatTasks: any[]): Task[] {
  const taskMap = new Map<string, Task>();
  const rootTasks: Task[] = [];
  
  // Primeiro passo: cria mapa de todas as tarefas
  for (const task of flatTasks) {
    const mappedTask = {
      ...task,
      subtasks: [],
    } as Task;
    taskMap.set(task.id, mappedTask);
  }
  
  // Segundo passo: constrói hierarquia
  for (const task of flatTasks) {
    const mappedTask = taskMap.get(task.id)!;
    if (task.parent_id && taskMap.has(task.parent_id)) {
      const parent = taskMap.get(task.parent_id)!;
      parent.subtasks = parent.subtasks || [];
      parent.subtasks.push(mappedTask);
    } else {
      rootTasks.push(mappedTask);
    }
  }
  
  return rootTasks;
}

function groupTasksBySections(tasks: Task[]): { name: string; tasks: Task[] }[] {
  const sections = new Map<string, Task[]>();
  
  for (const task of tasks) {
    const sectionName = task.section_name || 'Sem seção';
    if (!sections.has(sectionName)) {
      sections.set(sectionName, []);
    }
    sections.get(sectionName)!.push(task);
  }
  
  return Array.from(sections.entries()).map(([name, tasks]) => ({
    name,
    tasks,
  }));
}
