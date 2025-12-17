import type { Context } from 'npm:hono';
import { getSupabaseClient } from './kv_store.tsx';
import { getOrganizationIdForRequest } from './utils-multi-tenant.ts';
import { successResponse, errorResponse, validationErrorResponse, logInfo, logError } from './utils.ts';

// ============================================================================
// GET /crm/services/templates - Listar templates
// ============================================================================
export async function listServiceTemplates(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('service_ticket_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_template', true)
      .order('created_at', { ascending: false });

    if (error) {
      logError('[Templates] Erro ao listar templates', error);
      return c.json(errorResponse('Erro ao buscar templates', { details: error.message }), 500);
    }

    return c.json(successResponse(data || []));
  } catch (error: any) {
    logError('[Templates] Erro inesperado ao listar templates', error);
    return c.json(errorResponse('Erro inesperado ao listar templates', { details: error?.message }), 500);
  }
}

// ============================================================================
// GET /crm/services/templates/:id - Buscar template específico
// ============================================================================
export async function getServiceTemplate(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const templateId = c.req.param('id');
    const supabase = getSupabaseClient();

    if (!templateId) {
      return c.json(validationErrorResponse('ID do template é obrigatório'), 400);
    }

    const { data, error } = await supabase
      .from('service_ticket_templates')
      .select('*')
      .eq('id', templateId)
      .eq('organization_id', organizationId)
      .eq('is_template', true)
      .single();

    if (error) {
      logError('[Templates] Erro ao buscar template', error);
      return c.json(errorResponse('Template não encontrado', { details: error.message }), 404);
    }

    return c.json(successResponse(data));
  } catch (error: any) {
    logError('[Templates] Erro inesperado ao buscar template', error);
    return c.json(errorResponse('Erro inesperado ao buscar template', { details: error?.message }), 500);
  }
}

// ============================================================================
// POST /crm/services/templates - Criar template
// ============================================================================
export async function createServiceTemplate(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const body = await c.req.json();
    const supabase = getSupabaseClient();

    // Validação básica
    if (!body.name || !body.funnel_id) {
      return c.json(validationErrorResponse('Nome e funnel_id são obrigatórios'), 400);
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

    const templateData = {
      organization_id: organizationId,
      name: body.name,
      description: body.description || null,
      funnel_id: body.funnel_id,
      is_template: true,
      created_by: createdBy,
      stages: body.stages || [],
      tasks: body.tasks || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('service_ticket_templates')
      .insert(templateData)
      .select()
      .single();

    if (error) {
      logError('[Templates] Erro ao criar template', error);
      return c.json(errorResponse('Erro ao criar template', { details: error.message }), 500);
    }

    logInfo('[Templates] Template criado com sucesso', { id: data.id });
    return c.json(successResponse(data));
  } catch (error: any) {
    logError('[Templates] Erro inesperado ao criar template', error);
    return c.json(errorResponse('Erro inesperado ao criar template', { details: error?.message }), 500);
  }
}

// ============================================================================
// PUT /crm/services/templates/:id - Atualizar template
// ============================================================================
export async function updateServiceTemplate(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const templateId = c.req.param('id');
    const body = await c.req.json();
    const supabase = getSupabaseClient();

    if (!templateId) {
      return c.json(validationErrorResponse('ID do template é obrigatório'), 400);
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.name) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.stages) updateData.stages = body.stages;
    if (body.tasks) updateData.tasks = body.tasks;

    const { data, error } = await supabase
      .from('service_ticket_templates')
      .update(updateData)
      .eq('id', templateId)
      .eq('organization_id', organizationId)
      .eq('is_template', true)
      .select()
      .single();

    if (error) {
      logError('[Templates] Erro ao atualizar template', error);
      return c.json(errorResponse('Erro ao atualizar template', { details: error.message }), 500);
    }

    if (!data) {
      return c.json(errorResponse('Template não encontrado'), 404);
    }

    logInfo('[Templates] Template atualizado com sucesso', { id: templateId });
    return c.json(successResponse(data));
  } catch (error: any) {
    logError('[Templates] Erro inesperado ao atualizar template', error);
    return c.json(errorResponse('Erro inesperado ao atualizar template', { details: error?.message }), 500);
  }
}

// ============================================================================
// DELETE /crm/services/templates/:id - Deletar template
// ============================================================================
export async function deleteServiceTemplate(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const templateId = c.req.param('id');
    const supabase = getSupabaseClient();

    if (!templateId) {
      return c.json(validationErrorResponse('ID do template é obrigatório'), 400);
    }

    const { error } = await supabase
      .from('service_ticket_templates')
      .delete()
      .eq('id', templateId)
      .eq('organization_id', organizationId)
      .eq('is_template', true);

    if (error) {
      logError('[Templates] Erro ao deletar template', error);
      return c.json(errorResponse('Erro ao deletar template', { details: error.message }), 500);
    }

    logInfo('[Templates] Template deletado com sucesso', { id: templateId });
    return c.json(successResponse({ message: 'Template deletado com sucesso' }));
  } catch (error: any) {
    logError('[Templates] Erro inesperado ao deletar template', error);
    return c.json(errorResponse('Erro inesperado ao deletar template', { details: error?.message }), 500);
  }
}

// ============================================================================
// POST /crm/services/templates/:id/create-ticket - Criar ticket a partir de template
// ============================================================================
export async function createTicketFromTemplate(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const templateId = c.req.param('id');
    const body = await c.req.json();
    const supabase = getSupabaseClient();

    if (!templateId) {
      return c.json(validationErrorResponse('ID do template é obrigatório'), 400);
    }

    // Buscar template
    const { data: template, error: templateError } = await supabase
      .from('service_ticket_templates')
      .select('*')
      .eq('id', templateId)
      .eq('organization_id', organizationId)
      .eq('is_template', true)
      .single();

    if (templateError || !template) {
      return c.json(errorResponse('Template não encontrado'), 404);
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

    // Criar ticket a partir do template
    const ticketData = {
      organization_id: organizationId,
      funnel_id: template.funnel_id || body.funnelId,
      stage_id: body.stageId || (template.stages && template.stages[0]?.id) || null,
      title: body.title || template.name,
      description: body.description || template.description || null,
      status: 'PENDING',
      priority: body.priority || 'medium',
      assigned_to: body.assignedTo || null,
      template_id: templateId,
      progress: 0,
      tasks: template.tasks || [],
      created_by: createdBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: ticket, error: ticketError } = await supabase
      .from('service_tickets')
      .insert(ticketData)
      .select()
      .single();

    if (ticketError) {
      logError('[Templates] Erro ao criar ticket do template', ticketError);
      return c.json(errorResponse('Erro ao criar ticket', { details: ticketError.message }), 500);
    }

    logInfo('[Templates] Ticket criado do template com sucesso', { templateId, ticketId: ticket.id });
    return c.json(successResponse(ticket));
  } catch (error: any) {
    logError('[Templates] Erro inesperado ao criar ticket do template', error);
    return c.json(errorResponse('Erro inesperado ao criar ticket', { details: error?.message }), 500);
  }
}

