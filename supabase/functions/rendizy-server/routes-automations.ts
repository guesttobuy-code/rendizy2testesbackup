import type { Context } from 'npm:hono';
import { getSupabaseClient } from './kv_store.tsx';
import { getOrganizationIdForRequest } from './utils-multi-tenant.ts';
import { successResponse, errorResponse, validationErrorResponse, logInfo, logError } from './utils.ts';

// ============================================================================
// GET /automations - Listar automações
// ============================================================================
export async function listAutomations(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('automations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      logError('[Automations] Erro ao listar automações', error);
      return c.json(errorResponse('Erro ao buscar automações', { details: error.message }), 500);
    }

    return c.json(successResponse(data || []));
  } catch (error: any) {
    logError('[Automations] Erro inesperado ao listar', error);
    return c.json(errorResponse('Erro inesperado ao listar automações', { details: error?.message }), 500);
  }
}

// ============================================================================
// GET /automations/:id - Buscar automação específica
// ============================================================================
export async function getAutomation(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const automationId = c.req.param('id');
    const supabase = getSupabaseClient();

    if (!automationId) {
      return c.json(validationErrorResponse('ID da automação é obrigatório'), 400);
    }

    const { data, error } = await supabase
      .from('automations')
      .select('*')
      .eq('id', automationId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      logError('[Automations] Erro ao buscar automação', error);
      return c.json(errorResponse('Erro ao buscar automação', { details: error.message }), 500);
    }

    if (!data) {
      return c.json(errorResponse('Automação não encontrada'), 404);
    }

    return c.json(successResponse(data));
  } catch (error: any) {
    logError('[Automations] Erro inesperado ao buscar', error);
    return c.json(errorResponse('Erro inesperado ao buscar automação', { details: error?.message }), 500);
  }
}

// ============================================================================
// POST /automations - Criar automação
// ============================================================================
export async function createAutomation(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const body = await c.req.json();
    const supabase = getSupabaseClient();

    // Validação básica
    if (!body.name || !body.definition) {
      return c.json(validationErrorResponse('Nome e definição são obrigatórios'), 400);
    }

    // Validar estrutura do definition
    if (!body.definition.trigger || !body.definition.actions || !Array.isArray(body.definition.actions)) {
      return c.json(validationErrorResponse('Definição inválida: deve conter trigger e actions'), 400);
    }

    // Buscar usuário atual (para created_by)
    const token = c.req.header('X-Auth-Token');
    let createdBy = null;
    if (token) {
      const { data: session } = await supabase
        .from('sessions')
        .select('user_id')
        .eq('access_token', token)
        .maybeSingle();
      if (session) {
        createdBy = session.user_id;
      }
    }

    const { data, error } = await supabase
      .from('automations')
      .insert({
        organization_id: organizationId,
        name: body.name,
        description: body.description || null,
        definition: body.definition,
        status: body.status || 'draft',
        module: body.module || null, // Mantido para compatibilidade
        modules: body.modules || null, // NOVO: Array de módulos
        properties: body.properties || null, // NOVO: Array de IDs de imóveis
        ai_interpretation_summary: body.ai_interpretation_summary || null, // NOVO: Resumo da IA
        impact_description: body.impact_description || null, // NOVO: Descrição do impacto
        channel: body.channel || null,
        priority: body.priority || 'media',
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) {
      logError('[Automations] Erro ao criar automação', error);
      // Verificar se é erro de duplicata
      if (error.code === '23505') {
        return c.json(validationErrorResponse('Já existe uma automação com este nome'), 409);
      }
      return c.json(errorResponse('Erro ao criar automação', { details: error.message }), 500);
    }

    logInfo(`[Automations] Automação criada: ${data.id} (${data.name})`);
    return c.json(successResponse(data), 201);
  } catch (error: any) {
    logError('[Automations] Erro inesperado ao criar', error);
    return c.json(errorResponse('Erro inesperado ao criar automação', { details: error?.message }), 500);
  }
}

// ============================================================================
// PUT /automations/:id - Atualizar automação
// ============================================================================
export async function updateAutomation(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const automationId = c.req.param('id');
    const body = await c.req.json();
    const supabase = getSupabaseClient();

    if (!automationId) {
      return c.json(validationErrorResponse('ID da automação é obrigatório'), 400);
    }

    // Verificar se automação existe e pertence à organização
    const { data: existing } = await supabase
      .from('automations')
      .select('id')
      .eq('id', automationId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!existing) {
      return c.json(errorResponse('Automação não encontrada'), 404);
    }

    // Validar definition se fornecida
    if (body.definition) {
      if (!body.definition.trigger || !body.definition.actions || !Array.isArray(body.definition.actions)) {
        return c.json(validationErrorResponse('Definição inválida: deve conter trigger e actions'), 400);
      }
    }

    // Preparar update (apenas campos fornecidos)
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.definition !== undefined) updateData.definition = body.definition;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.module !== undefined) updateData.module = body.module; // Compatibilidade
    if (body.modules !== undefined) updateData.modules = body.modules; // NOVO
    if (body.properties !== undefined) updateData.properties = body.properties; // NOVO
    if (body.ai_interpretation_summary !== undefined) updateData.ai_interpretation_summary = body.ai_interpretation_summary; // NOVO
    if (body.impact_description !== undefined) updateData.impact_description = body.impact_description; // NOVO
    if (body.channel !== undefined) updateData.channel = body.channel;
    if (body.priority !== undefined) updateData.priority = body.priority;

    const { data, error } = await supabase
      .from('automations')
      .update(updateData)
      .eq('id', automationId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      logError('[Automations] Erro ao atualizar automação', error);
      if (error.code === '23505') {
        return c.json(validationErrorResponse('Já existe uma automação com este nome'), 409);
      }
      return c.json(errorResponse('Erro ao atualizar automação', { details: error.message }), 500);
    }

    logInfo(`[Automations] Automação atualizada: ${data.id} (${data.name})`);
    return c.json(successResponse(data));
  } catch (error: any) {
    logError('[Automations] Erro inesperado ao atualizar', error);
    return c.json(errorResponse('Erro inesperado ao atualizar automação', { details: error?.message }), 500);
  }
}

// ============================================================================
// DELETE /automations/:id - Deletar automação
// ============================================================================
export async function deleteAutomation(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const automationId = c.req.param('id');
    const supabase = getSupabaseClient();

    if (!automationId) {
      return c.json(validationErrorResponse('ID da automação é obrigatório'), 400);
    }

    // Verificar se automação existe e pertence à organização
    const { data: existing } = await supabase
      .from('automations')
      .select('id, name')
      .eq('id', automationId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!existing) {
      return c.json(errorResponse('Automação não encontrada'), 404);
    }

    const { error } = await supabase
      .from('automations')
      .delete()
      .eq('id', automationId)
      .eq('organization_id', organizationId);

    if (error) {
      logError('[Automations] Erro ao deletar automação', error);
      return c.json(errorResponse('Erro ao deletar automação', { details: error.message }), 500);
    }

    logInfo(`[Automations] Automação deletada: ${automationId} (${existing.name})`);
    return c.json(successResponse({ message: 'Automação deletada com sucesso' }));
  } catch (error: any) {
    logError('[Automations] Erro inesperado ao deletar', error);
    return c.json(errorResponse('Erro inesperado ao deletar automação', { details: error?.message }), 500);
  }
}

// ============================================================================
// PATCH /automations/:id/status - Ativar/desativar automação
// ============================================================================
export async function updateAutomationStatus(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const automationId = c.req.param('id');
    const body = await c.req.json();
    const supabase = getSupabaseClient();

    if (!automationId) {
      return c.json(validationErrorResponse('ID da automação é obrigatório'), 400);
    }

    if (!body.status || !['draft', 'active', 'paused'].includes(body.status)) {
      return c.json(validationErrorResponse('Status inválido. Use: draft, active ou paused'), 400);
    }

    // Verificar se automação existe e pertence à organização
    const { data: existing } = await supabase
      .from('automations')
      .select('id, name')
      .eq('id', automationId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!existing) {
      return c.json(errorResponse('Automação não encontrada'), 404);
    }

    const { data, error } = await supabase
      .from('automations')
      .update({ status: body.status })
      .eq('id', automationId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      logError('[Automations] Erro ao atualizar status', error);
      return c.json(errorResponse('Erro ao atualizar status', { details: error.message }), 500);
    }

    logInfo(`[Automations] Status atualizado: ${automationId} -> ${body.status}`);
    return c.json(successResponse(data));
  } catch (error: any) {
    logError('[Automations] Erro inesperado ao atualizar status', error);
    return c.json(errorResponse('Erro inesperado ao atualizar status', { details: error?.message }), 500);
  }
}

// ============================================================================
// GET /automations/:id/executions - Histórico de execuções
// ============================================================================
export async function getAutomationExecutions(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const automationId = c.req.param('id');
    const supabase = getSupabaseClient();

    if (!automationId) {
      return c.json(validationErrorResponse('ID da automação é obrigatório'), 400);
    }

    // Verificar se automação existe e pertence à organização
    const { data: existing } = await supabase
      .from('automations')
      .select('id')
      .eq('id', automationId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!existing) {
      return c.json(errorResponse('Automação não encontrada'), 404);
    }

    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    const { data, error } = await supabase
      .from('automation_executions')
      .select('*')
      .eq('automation_id', automationId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logError('[Automations] Erro ao buscar execuções', error);
      return c.json(errorResponse('Erro ao buscar execuções', { details: error.message }), 500);
    }

    return c.json(successResponse(data || []));
  } catch (error: any) {
    logError('[Automations] Erro inesperado ao buscar execuções', error);
    return c.json(errorResponse('Erro inesperado ao buscar execuções', { details: error?.message }), 500);
  }
}

