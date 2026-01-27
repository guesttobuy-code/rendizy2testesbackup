/**
 * ============================================================================
 * MÓDULO: CRM TASKS (Tarefas/Atividades) - CRM Modular Multi-Tenant
 * ============================================================================
 * 
 * 📚 DOCUMENTAÇÃO: docs/ROADMAP_CRM_AUTOMACOES_2026.md
 * 🗃️ TABELAS:      crm_tasks
 * 🔐 MULTI-TENANT: Filtro por organization_id em TODAS as queries
 * 
 * ROTAS EXPOSTAS:
 * - GET    /crm/tasks              → listTasks
 * - GET    /crm/tasks/my           → getMyTasks
 * - GET    /crm/tasks/stats        → getTaskStats
 * - GET    /crm/tasks/:id          → getTask
 * - POST   /crm/tasks              → createTask
 * - PUT    /crm/tasks/:id          → updateTask
 * - DELETE /crm/tasks/:id          → deleteTask
 * - PATCH  /crm/tasks/:id/complete → completeTask
 * 
 * ============================================================================
 */

import { Context } from 'https://deno.land/x/hono@v3.4.1/mod.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from './utils-env.ts';
import { getOrganizationIdForRequest, getUserIdForRequest } from './utils-multi-tenant.ts';

// Helper: Obter cliente Supabase com SERVICE_ROLE_KEY (bypassa RLS)
function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// =============================================================================
// LISTAR TAREFAS
// =============================================================================

/**
 * Lista todas as tarefas da organização com paginação e filtros
 * 
 * Query params:
 * - status: pending,in_progress,completed,cancelled
 * - priority: low,medium,high,urgent
 * - assignee_id: UUID
 * - sales_deal_id: UUID
 * - service_ticket_id: UUID
 * - contact_id: UUID
 * - property_id: UUID
 * - reservation_id: UUID
 * - due_date_from: ISO date
 * - due_date_to: ISO date
 * - overdue: true/false
 * - search: texto
 * - task_type: task,call,meeting,email,follow_up
 * - limit: número (default 50)
 * - offset: número (default 0)
 * - sort: campo (default due_date)
 * - order: asc/desc
 */
export async function listTasks(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const supabase = getSupabaseAdmin();
    const url = new URL(c.req.url);
    
    // Parâmetros de filtro
    const status = url.searchParams.get('status');
    const priority = url.searchParams.get('priority');
    const assigneeId = url.searchParams.get('assignee_id');
    const salesDealId = url.searchParams.get('sales_deal_id');
    const serviceTicketId = url.searchParams.get('service_ticket_id');
    const contactId = url.searchParams.get('contact_id');
    const propertyId = url.searchParams.get('property_id');
    const reservationId = url.searchParams.get('reservation_id');
    const dueDateFrom = url.searchParams.get('due_date_from');
    const dueDateTo = url.searchParams.get('due_date_to');
    const overdue = url.searchParams.get('overdue');
    const search = url.searchParams.get('search');
    const taskType = url.searchParams.get('task_type');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const sort = url.searchParams.get('sort') || 'due_date';
    const order = url.searchParams.get('order') || 'asc';
    
    // Query base
    let query = supabase
      .from('crm_tasks')
      .select(`
        *,
        assignee:users!crm_tasks_assignee_id_fkey(id, name, email, avatar_url),
        creator:users!crm_tasks_created_by_fkey(id, name, email),
        deal:sales_deals(id, title, value, status),
        ticket:service_tickets(id, title, status)
      `, { count: 'exact' })
      .eq('organization_id', organizationId);
    
    // Aplicar filtros
    if (status) {
      const statuses = status.split(',');
      query = query.in('status', statuses);
    }
    
    if (priority) {
      const priorities = priority.split(',');
      query = query.in('priority', priorities);
    }
    
    if (assigneeId) {
      query = query.eq('assignee_id', assigneeId);
    }
    
    if (salesDealId) {
      query = query.eq('sales_deal_id', salesDealId);
    }
    
    if (serviceTicketId) {
      query = query.eq('service_ticket_id', serviceTicketId);
    }
    
    if (contactId) {
      query = query.eq('contact_id', contactId);
    }
    
    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }
    
    if (reservationId) {
      query = query.eq('reservation_id', reservationId);
    }
    
    if (dueDateFrom) {
      query = query.gte('due_date', dueDateFrom);
    }
    
    if (dueDateTo) {
      query = query.lte('due_date', dueDateTo);
    }
    
    if (overdue === 'true') {
      query = query
        .lt('due_date', new Date().toISOString())
        .neq('status', 'completed')
        .neq('status', 'cancelled');
    }
    
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    if (taskType) {
      const types = taskType.split(',');
      query = query.in('task_type', types);
    }
    
    // Ordenação
    const ascending = order === 'asc';
    query = query.order(sort, { ascending, nullsFirst: false });
    
    // Paginação
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('[CRM Tasks] Erro ao listar:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({
      success: true,
      data,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
    
  } catch (error) {
    console.error('[CRM Tasks] Erro inesperado:', error);
    return c.json({ success: false, error: 'Erro interno do servidor' }, 500);
  }
}

// =============================================================================
// MINHAS TAREFAS
// =============================================================================

/**
 * Lista tarefas atribuídas ao usuário logado, categorizadas por prazo
 */
export async function getMyTasks(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const userId = await getUserIdForRequest(c);
    
    if (!organizationId || !userId) {
      return c.json({ success: false, error: 'Autenticação necessária' }, 401);
    }
    
    const supabase = getSupabaseAdmin();
    const url = new URL(c.req.url);
    const status = url.searchParams.get('status') || 'pending,in_progress';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    const statuses = status.split(',');
    
    const { data, error, count } = await supabase
      .from('crm_tasks')
      .select(`
        *,
        deal:sales_deals(id, title, value, status),
        ticket:service_tickets(id, title, status)
      `, { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('assignee_id', userId)
      .in('status', statuses)
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(limit);
    
    if (error) {
      console.error('[CRM Tasks] Erro ao buscar minhas tarefas:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    // Separar por categoria
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    interface CRMTask {
      id: string;
      due_date?: string;
      [key: string]: unknown;
    }
    
    const categorized = {
      overdue: [] as CRMTask[],
      today: [] as CRMTask[],
      tomorrow: [] as CRMTask[],
      thisWeek: [] as CRMTask[],
      later: [] as CRMTask[],
      noDueDate: [] as CRMTask[],
    };
    
    (data || []).forEach((task: CRMTask) => {
      if (!task.due_date) {
        categorized.noDueDate.push(task);
      } else {
        const dueDate = new Date(task.due_date);
        if (dueDate < today) {
          categorized.overdue.push(task);
        } else if (dueDate < tomorrow) {
          categorized.today.push(task);
        } else if (dueDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)) {
          categorized.tomorrow.push(task);
        } else if (dueDate < nextWeek) {
          categorized.thisWeek.push(task);
        } else {
          categorized.later.push(task);
        }
      }
    });
    
    return c.json({
      success: true,
      data,
      categorized,
      total: count || 0,
    });
    
  } catch (error) {
    console.error('[CRM Tasks] Erro inesperado:', error);
    return c.json({ success: false, error: 'Erro interno do servidor' }, 500);
  }
}

// =============================================================================
// ESTATÍSTICAS DE TAREFAS
// =============================================================================

/**
 * Retorna estatísticas de tarefas (contadores por status, prioridade, etc)
 */
export async function getTaskStats(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization ID não encontrado' }, 401);
    }
    
    const supabase = getSupabaseAdmin();
    const url = new URL(c.req.url);
    const assigneeId = url.searchParams.get('assignee_id');
    
    // Buscar todas as tarefas para calcular estatísticas
    let query = supabase
      .from('crm_tasks')
      .select('id, status, priority, due_date, assignee_id, task_type, completed_at, created_at')
      .eq('organization_id', organizationId);
    
    if (assigneeId) {
      query = query.eq('assignee_id', assigneeId);
    }
    
    const { data: tasks, error } = await query;
    
    if (error) {
      console.error('[CRM Tasks] Erro ao buscar stats:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const stats = {
      total: tasks?.length || 0,
      byStatus: {
        pending: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
      },
      byPriority: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0,
      },
      byType: {} as Record<string, number>,
      overdue: 0,
      dueToday: 0,
      dueThisWeek: 0,
      completedThisWeek: 0,
      averageCompletionDays: 0,
    };
    
    let totalCompletionDays = 0;
    let completedCount = 0;
    
    interface TaskRow {
      status?: string;
      priority?: string;
      task_type?: string;
      due_date?: string;
      completed_at?: string;
      created_at?: string;
    }
    
    (tasks || []).forEach((task: TaskRow) => {
      // Por status
      if (task.status && stats.byStatus[task.status as keyof typeof stats.byStatus] !== undefined) {
        stats.byStatus[task.status as keyof typeof stats.byStatus]++;
      }
      
      // Por prioridade
      if (task.priority && stats.byPriority[task.priority as keyof typeof stats.byPriority] !== undefined) {
        stats.byPriority[task.priority as keyof typeof stats.byPriority]++;
      }
      
      // Por tipo
      const taskType = task.task_type || 'task';
      stats.byType[taskType] = (stats.byType[taskType] || 0) + 1;
      
      // Datas
      if (task.due_date && task.status !== 'completed' && task.status !== 'cancelled') {
        const dueDate = new Date(task.due_date);
        if (dueDate < today) {
          stats.overdue++;
        } else if (dueDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)) {
          stats.dueToday++;
        } else if (dueDate < thisWeekEnd) {
          stats.dueThisWeek++;
        }
      }
      
      // Completadas esta semana
      if (task.status === 'completed' && task.completed_at) {
        const completedDate = new Date(task.completed_at);
        if (completedDate >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
          stats.completedThisWeek++;
        }
        
        // Calcular tempo médio de conclusão
        if (task.created_at) {
          const createdDate = new Date(task.created_at);
          const days = (completedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
          totalCompletionDays += days;
          completedCount++;
        }
      }
    });
    
    if (completedCount > 0) {
      stats.averageCompletionDays = Math.round((totalCompletionDays / completedCount) * 10) / 10;
    }
    
    return c.json({
      success: true,
      data: stats,
    });
    
  } catch (error) {
    console.error('[CRM Tasks] Erro inesperado:', error);
    return c.json({ success: false, error: 'Erro interno do servidor' }, 500);
  }
}

// =============================================================================
// BUSCAR TAREFA POR ID
// =============================================================================

export async function getTask(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const taskId = c.req.param('id');
    
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization ID não encontrado' }, 401);
    }
    
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from('crm_tasks')
      .select(`
        *,
        assignee:users!crm_tasks_assignee_id_fkey(id, name, email, avatar_url),
        creator:users!crm_tasks_created_by_fkey(id, name, email),
        completer:users!crm_tasks_completed_by_fkey(id, name, email),
        deal:sales_deals(id, title, value, status),
        ticket:service_tickets(id, title, status, priority)
      `)
      .eq('id', taskId)
      .eq('organization_id', organizationId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return c.json({ success: false, error: 'Tarefa não encontrada' }, 404);
      }
      console.error('[CRM Tasks] Erro ao buscar:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({
      success: true,
      data,
    });
    
  } catch (error) {
    console.error('[CRM Tasks] Erro inesperado:', error);
    return c.json({ success: false, error: 'Erro interno do servidor' }, 500);
  }
}

// =============================================================================
// CRIAR TAREFA
// =============================================================================

interface TaskInput {
  title: string;
  description?: string;
  task_type?: string;
  sales_deal_id?: string;
  service_ticket_id?: string;
  predetermined_item_id?: string;
  property_id?: string;
  reservation_id?: string;
  contact_id?: string;
  due_date?: string;
  due_time?: string;
  duration_minutes?: number;
  reminder_at?: string;
  assignee_id?: string;
  assignee_name?: string;
  status?: string;
  priority?: string;
  is_recurring?: boolean;
  recurrence_rule?: Record<string, unknown>;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
  notes?: string;
}

export async function createTask(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const userId = await getUserIdForRequest(c);
    
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization ID não encontrado' }, 401);
    }
    
    const body = await c.req.json() as TaskInput;
    
    // Validações
    if (!body.title?.trim()) {
      return c.json({ success: false, error: 'Título é obrigatório' }, 400);
    }
    
    const supabase = getSupabaseAdmin();
    
    // Buscar nome do assignee se não fornecido
    let assigneeName = body.assignee_name;
    if (body.assignee_id && !assigneeName) {
      const { data: assigneeData } = await supabase
        .from('users')
        .select('name')
        .eq('id', body.assignee_id)
        .single();
      assigneeName = assigneeData?.name;
    }
    
    const taskData = {
      organization_id: organizationId,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      task_type: body.task_type || 'task',
      sales_deal_id: body.sales_deal_id || null,
      service_ticket_id: body.service_ticket_id || null,
      predetermined_item_id: body.predetermined_item_id || null,
      property_id: body.property_id || null,
      reservation_id: body.reservation_id || null,
      contact_id: body.contact_id || null,
      due_date: body.due_date || null,
      due_time: body.due_time || null,
      duration_minutes: body.duration_minutes || null,
      reminder_at: body.reminder_at || null,
      assignee_id: body.assignee_id || null,
      assignee_name: assigneeName || null,
      created_by: userId,
      status: body.status || 'pending',
      priority: body.priority || 'medium',
      is_recurring: body.is_recurring || false,
      recurrence_rule: body.recurrence_rule || null,
      tags: body.tags || [],
      custom_fields: body.custom_fields || {},
      notes: body.notes || null,
    };
    
    const { data, error } = await supabase
      .from('crm_tasks')
      .insert(taskData)
      .select(`
        *,
        assignee:users!crm_tasks_assignee_id_fkey(id, name, email, avatar_url),
        creator:users!crm_tasks_created_by_fkey(id, name, email)
      `)
      .single();
    
    if (error) {
      console.error('[CRM Tasks] Erro ao criar:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    console.log(`[CRM Tasks] Tarefa criada: ${data.id} - ${data.title}`);
    
    return c.json({
      success: true,
      data,
    }, 201);
    
  } catch (error) {
    console.error('[CRM Tasks] Erro inesperado:', error);
    return c.json({ success: false, error: 'Erro interno do servidor' }, 500);
  }
}

// =============================================================================
// ATUALIZAR TAREFA
// =============================================================================

export async function updateTask(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const userId = await getUserIdForRequest(c);
    const taskId = c.req.param('id');
    
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization ID não encontrado' }, 401);
    }
    
    const body = await c.req.json() as Partial<TaskInput>;
    
    const supabase = getSupabaseAdmin();
    
    // Verificar se a tarefa existe
    const { data: existing, error: findError } = await supabase
      .from('crm_tasks')
      .select('id')
      .eq('id', taskId)
      .eq('organization_id', organizationId)
      .single();
    
    if (findError || !existing) {
      return c.json({ success: false, error: 'Tarefa não encontrada' }, 404);
    }
    
    // Buscar nome do assignee se mudou
    let assigneeName = body.assignee_name;
    if (body.assignee_id && !assigneeName) {
      const { data: assigneeData } = await supabase
        .from('users')
        .select('name')
        .eq('id', body.assignee_id)
        .single();
      assigneeName = assigneeData?.name;
    }
    
    // Preparar dados para atualização
    const updateData: Record<string, unknown> = {};
    
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.task_type !== undefined) updateData.task_type = body.task_type;
    if (body.sales_deal_id !== undefined) updateData.sales_deal_id = body.sales_deal_id || null;
    if (body.service_ticket_id !== undefined) updateData.service_ticket_id = body.service_ticket_id || null;
    if (body.predetermined_item_id !== undefined) updateData.predetermined_item_id = body.predetermined_item_id || null;
    if (body.property_id !== undefined) updateData.property_id = body.property_id || null;
    if (body.reservation_id !== undefined) updateData.reservation_id = body.reservation_id || null;
    if (body.contact_id !== undefined) updateData.contact_id = body.contact_id || null;
    if (body.due_date !== undefined) updateData.due_date = body.due_date || null;
    if (body.due_time !== undefined) updateData.due_time = body.due_time || null;
    if (body.duration_minutes !== undefined) updateData.duration_minutes = body.duration_minutes;
    if (body.reminder_at !== undefined) updateData.reminder_at = body.reminder_at || null;
    if (body.assignee_id !== undefined) {
      updateData.assignee_id = body.assignee_id || null;
      updateData.assignee_name = assigneeName || null;
    }
    if (body.status !== undefined) {
      updateData.status = body.status;
      // Se marcando como completed, registrar data e usuário
      if (body.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = userId;
      }
    }
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.is_recurring !== undefined) updateData.is_recurring = body.is_recurring;
    if (body.recurrence_rule !== undefined) updateData.recurrence_rule = body.recurrence_rule;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.custom_fields !== undefined) updateData.custom_fields = body.custom_fields;
    if (body.notes !== undefined) updateData.notes = body.notes;
    
    const { data, error } = await supabase
      .from('crm_tasks')
      .update(updateData)
      .eq('id', taskId)
      .eq('organization_id', organizationId)
      .select(`
        *,
        assignee:users!crm_tasks_assignee_id_fkey(id, name, email, avatar_url),
        creator:users!crm_tasks_created_by_fkey(id, name, email)
      `)
      .single();
    
    if (error) {
      console.error('[CRM Tasks] Erro ao atualizar:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({
      success: true,
      data,
    });
    
  } catch (error) {
    console.error('[CRM Tasks] Erro inesperado:', error);
    return c.json({ success: false, error: 'Erro interno do servidor' }, 500);
  }
}

// =============================================================================
// MARCAR TAREFA COMO CONCLUÍDA
// =============================================================================

export async function completeTask(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const userId = await getUserIdForRequest(c);
    const taskId = c.req.param('id');
    
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization ID não encontrado' }, 401);
    }
    
    const body = await c.req.json().catch(() => ({})) as { outcome?: string; outcome_notes?: string };
    
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from('crm_tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: userId,
        outcome: body.outcome || 'completed',
        outcome_notes: body.outcome_notes || null,
      })
      .eq('id', taskId)
      .eq('organization_id', organizationId)
      .select(`
        *,
        assignee:users!crm_tasks_assignee_id_fkey(id, name, email)
      `)
      .single();
    
    if (error) {
      console.error('[CRM Tasks] Erro ao completar:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    console.log(`[CRM Tasks] Tarefa completada: ${taskId}`);
    
    return c.json({
      success: true,
      data,
    });
    
  } catch (error) {
    console.error('[CRM Tasks] Erro inesperado:', error);
    return c.json({ success: false, error: 'Erro interno do servidor' }, 500);
  }
}

// =============================================================================
// DELETAR TAREFA
// =============================================================================

export async function deleteTask(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const taskId = c.req.param('id');
    
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization ID não encontrado' }, 401);
    }
    
    const supabase = getSupabaseAdmin();
    
    const { error } = await supabase
      .from('crm_tasks')
      .delete()
      .eq('id', taskId)
      .eq('organization_id', organizationId);
    
    if (error) {
      console.error('[CRM Tasks] Erro ao deletar:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    console.log(`[CRM Tasks] Tarefa deletada: ${taskId}`);
    
    return c.json({
      success: true,
      message: 'Tarefa deletada com sucesso',
    });
    
  } catch (error) {
    console.error('[CRM Tasks] Erro inesperado:', error);
    return c.json({ success: false, error: 'Erro interno do servidor' }, 500);
  }
}
