import type { Context } from 'npm:hono';
import { getSupabaseClient } from './kv_store.tsx';
import { getOrganizationIdForRequest } from './utils-multi-tenant.ts';
import { successResponse, errorResponse, validationErrorResponse, logInfo, logError } from './utils.ts';

// ============================================================================
// GET /crm/services/tickets - Listar tickets
// ============================================================================
export async function listServiceTickets(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const funnelId = c.req.query('funnelId');
    const supabase = getSupabaseClient();

    let query = supabase
      .from('service_tickets')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (funnelId) {
      query = query.eq('funnel_id', funnelId);
    }

    const { data, error } = await query;

    if (error) {
      logError('[Services] Erro ao listar tickets', error);
      return c.json(errorResponse('Erro ao buscar tickets', { details: error.message }), 500);
    }

    return c.json(successResponse(data || []));
  } catch (error: any) {
    logError('[Services] Erro inesperado ao listar tickets', error);
    return c.json(errorResponse('Erro inesperado ao listar tickets', { details: error?.message }), 500);
  }
}

// ============================================================================
// GET /crm/services/tickets/:id - Buscar ticket específico
// ============================================================================
export async function getServiceTicket(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const ticketId = c.req.param('id');
    const supabase = getSupabaseClient();

    if (!ticketId) {
      return c.json(validationErrorResponse('ID do ticket é obrigatório'), 400);
    }

    const { data, error } = await supabase
      .from('service_tickets')
      .select('*')
      .eq('id', ticketId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      logError('[Services] Erro ao buscar ticket', error);
      return c.json(errorResponse('Erro ao buscar ticket', { details: error.message }), 500);
    }

    if (!data) {
      return c.json(errorResponse('Ticket não encontrado'), 404);
    }

    // Buscar tarefas do ticket
    const { data: tasks } = await supabase
      .from('service_tasks')
      .select('*')
      .eq('ticket_id', ticketId)
      .eq('organization_id', organizationId)
      .order('order', { ascending: true });

    return c.json(successResponse({
      ...data,
      tasks: tasks || [],
    }));
  } catch (error: any) {
    logError('[Services] Erro inesperado ao buscar ticket', error);
    return c.json(errorResponse('Erro inesperado ao buscar ticket', { details: error?.message }), 500);
  }
}

// ============================================================================
// POST /crm/services/tickets - Criar ticket
// ============================================================================
export async function createServiceTicket(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const body = await c.req.json();
    const supabase = getSupabaseClient();

    if (!body.title || !body.funnelId || !body.stageId) {
      return c.json(validationErrorResponse('Título, funil e estágio são obrigatórios'), 400);
    }

    // Buscar usuário atual
    const token = c.req.header('X-Auth-Token');
    let createdBy = null;
    if (token) {
      const { data: session } = await supabase
        .from('sessions')
        .select('user_id')
        .or(`token.eq.${token},access_token.eq.${token}`)
        .maybeSingle();
      if (session) {
        createdBy = session.user_id;
      }
    }

    const { data, error } = await supabase
      .from('service_tickets')
      .insert({
        organization_id: organizationId,
        funnel_id: body.funnelId,
        stage_id: body.stageId,
        title: body.title,
        description: body.description || null,
        status: body.status || 'PENDING',
        priority: body.priority || 'medium',
        assigned_to: body.assignedTo || null,
        product_id: body.productId || null,
        value: body.value || null,
        currency: body.currency || 'BRL',
        due_date: body.dueDate || null,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) {
      logError('[Services] Erro ao criar ticket', error);
      return c.json(errorResponse('Erro ao criar ticket', { details: error.message }), 500);
    }

    return c.json(successResponse(data), 201);
  } catch (error: any) {
    logError('[Services] Erro inesperado ao criar ticket', error);
    return c.json(errorResponse('Erro inesperado ao criar ticket', { details: error?.message }), 500);
  }
}

// ============================================================================
// PUT /crm/services/tickets/:id - Atualizar ticket
// ============================================================================
export async function updateServiceTicket(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const ticketId = c.req.param('id');
    const body = await c.req.json();
    const supabase = getSupabaseClient();

    if (!ticketId) {
      return c.json(validationErrorResponse('ID do ticket é obrigatório'), 400);
    }

    // Verificar se ticket existe
    const { data: existingTicket, error: checkError } = await supabase
      .from('service_tickets')
      .select('id')
      .eq('id', ticketId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (checkError || !existingTicket) {
      return c.json(errorResponse('Ticket não encontrado'), 404);
    }

    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.assignedTo !== undefined) updateData.assigned_to = body.assignedTo;
    if (body.stageId !== undefined) updateData.stage_id = body.stageId;
    if (body.productId !== undefined) updateData.product_id = body.productId;
    if (body.value !== undefined) updateData.value = body.value;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.dueDate !== undefined) updateData.due_date = body.dueDate;

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('service_tickets')
      .update(updateData)
      .eq('id', ticketId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      logError('[Services] Erro ao atualizar ticket', error);
      return c.json(errorResponse('Erro ao atualizar ticket', { details: error.message }), 500);
    }

    return c.json(successResponse(data));
  } catch (error: any) {
    logError('[Services] Erro inesperado ao atualizar ticket', error);
    return c.json(errorResponse('Erro inesperado ao atualizar ticket', { details: error?.message }), 500);
  }
}

// ============================================================================
// PATCH /crm/services/tickets/:id/stage - Atualizar estágio do ticket
// ============================================================================
export async function updateServiceTicketStage(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const ticketId = c.req.param('id');
    const body = await c.req.json();
    const supabase = getSupabaseClient();

    if (!ticketId) {
      return c.json(validationErrorResponse('ID do ticket é obrigatório'), 400);
    }

    if (!body.stageId) {
      return c.json(validationErrorResponse('Novo estágio é obrigatório'), 400);
    }

    const { data, error } = await supabase
      .from('service_tickets')
      .update({
        stage_id: body.stageId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      logError('[Services] Erro ao atualizar estágio', error);
      return c.json(errorResponse('Erro ao atualizar estágio', { details: error.message }), 500);
    }

    return c.json(successResponse(data));
  } catch (error: any) {
    logError('[Services] Erro inesperado ao atualizar estágio', error);
    return c.json(errorResponse('Erro inesperado ao atualizar estágio', { details: error?.message }), 500);
  }
}

// ============================================================================
// DELETE /crm/services/tickets/:id - Deletar ticket
// ============================================================================
export async function deleteServiceTicket(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const ticketId = c.req.param('id');
    const supabase = getSupabaseClient();

    if (!ticketId) {
      return c.json(validationErrorResponse('ID do ticket é obrigatório'), 400);
    }

    const { error } = await supabase
      .from('service_tickets')
      .delete()
      .eq('id', ticketId)
      .eq('organization_id', organizationId);

    if (error) {
      logError('[Services] Erro ao deletar ticket', error);
      return c.json(errorResponse('Erro ao deletar ticket', { details: error.message }), 500);
    }

    return c.json(successResponse({ message: 'Ticket deletado com sucesso' }));
  } catch (error: any) {
    logError('[Services] Erro inesperado ao deletar ticket', error);
    return c.json(errorResponse('Erro inesperado ao deletar ticket', { details: error?.message }), 500);
  }
}

// ============================================================================
// POST /crm/services/tickets/:id/tasks - Criar tarefa
// ============================================================================
export async function createServiceTask(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const ticketId = c.req.param('id');
    const body = await c.req.json();
    const supabase = getSupabaseClient();

    if (!ticketId) {
      return c.json(validationErrorResponse('ID do ticket é obrigatório'), 400);
    }

    if (!body.title) {
      return c.json(validationErrorResponse('Título da tarefa é obrigatório'), 400);
    }

    // Buscar ordem máxima
    const { data: maxOrder } = await supabase
      .from('service_tasks')
      .select('order')
      .eq('ticket_id', ticketId)
      .order('order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data, error } = await supabase
      .from('service_tasks')
      .insert({
        organization_id: organizationId,
        ticket_id: ticketId,
        title: body.title,
        description: body.description || null,
        status: body.status || 'TODO',
        assigned_to: body.assignedTo || null,
        due_date: body.dueDate || null,
        order: (maxOrder?.order || 0) + 1,
      })
      .select()
      .single();

    if (error) {
      logError('[Services] Erro ao criar tarefa', error);
      return c.json(errorResponse('Erro ao criar tarefa', { details: error.message }), 500);
    }

    return c.json(successResponse(data), 201);
  } catch (error: any) {
    logError('[Services] Erro inesperado ao criar tarefa', error);
    return c.json(errorResponse('Erro inesperado ao criar tarefa', { details: error?.message }), 500);
  }
}

// ============================================================================
// PUT /crm/services/tickets/:id/tasks/:taskId - Atualizar tarefa
// ============================================================================
export async function updateServiceTask(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const ticketId = c.req.param('id');
    const taskId = c.req.param('taskId');
    const body = await c.req.json();
    const supabase = getSupabaseClient();

    if (!ticketId || !taskId) {
      return c.json(validationErrorResponse('IDs são obrigatórios'), 400);
    }

    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.assignedTo !== undefined) updateData.assigned_to = body.assignedTo;
    if (body.dueDate !== undefined) updateData.due_date = body.dueDate;
    if (body.order !== undefined) updateData.order = body.order;

    if (body.status === 'COMPLETED') {
      updateData.completed_at = new Date().toISOString();
    } else if (body.status !== 'COMPLETED') {
      updateData.completed_at = null;
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('service_tasks')
      .update(updateData)
      .eq('id', taskId)
      .eq('ticket_id', ticketId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      logError('[Services] Erro ao atualizar tarefa', error);
      return c.json(errorResponse('Erro ao atualizar tarefa', { details: error.message }), 500);
    }

    return c.json(successResponse(data));
  } catch (error: any) {
    logError('[Services] Erro inesperado ao atualizar tarefa', error);
    return c.json(errorResponse('Erro inesperado ao atualizar tarefa', { details: error?.message }), 500);
  }
}

// ============================================================================
// DELETE /crm/services/tickets/:id/tasks/:taskId - Deletar tarefa
// ============================================================================
export async function deleteServiceTask(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const ticketId = c.req.param('id');
    const taskId = c.req.param('taskId');
    const supabase = getSupabaseClient();

    if (!ticketId || !taskId) {
      return c.json(validationErrorResponse('IDs são obrigatórios'), 400);
    }

    const { error } = await supabase
      .from('service_tasks')
      .delete()
      .eq('id', taskId)
      .eq('ticket_id', ticketId)
      .eq('organization_id', organizationId);

    if (error) {
      logError('[Services] Erro ao deletar tarefa', error);
      return c.json(errorResponse('Erro ao deletar tarefa', { details: error.message }), 500);
    }

    return c.json(successResponse({ message: 'Tarefa deletada com sucesso' }));
  } catch (error: any) {
    logError('[Services] Erro inesperado ao deletar tarefa', error);
    return c.json(errorResponse('Erro inesperado ao deletar tarefa', { details: error?.message }), 500);
  }
}

