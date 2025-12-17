import type { Context } from 'npm:hono';
import { getSupabaseClient } from './kv_store.tsx';
import { getOrganizationIdForRequest } from './utils-multi-tenant.ts';
import { successResponse, errorResponse, validationErrorResponse, logInfo, logError } from './utils.ts';

// ============================================================================
// GET /crm/deals - Listar deals
// ============================================================================
export async function listDeals(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      logError('[Deals] Erro ao listar deals', error);
      return c.json(errorResponse('Erro ao buscar deals', { details: error.message }), 500);
    }

    return c.json(successResponse(data || []));
  } catch (error: any) {
    logError('[Deals] Erro inesperado ao listar', error);
    return c.json(errorResponse('Erro inesperado ao listar deals', { details: error?.message }), 500);
  }
}

// ============================================================================
// GET /crm/deals/:id - Buscar deal específico
// ============================================================================
export async function getDeal(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const dealId = c.req.param('id');
    const supabase = getSupabaseClient();

    if (!dealId) {
      return c.json(validationErrorResponse('ID do deal é obrigatório'), 400);
    }

    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      logError('[Deals] Erro ao buscar deal', error);
      return c.json(errorResponse('Erro ao buscar deal', { details: error.message }), 500);
    }

    if (!data) {
      return c.json(errorResponse('Deal não encontrado'), 404);
    }

    return c.json(successResponse(data));
  } catch (error: any) {
    logError('[Deals] Erro inesperado ao buscar', error);
    return c.json(errorResponse('Erro inesperado ao buscar deal', { details: error?.message }), 500);
  }
}

// ============================================================================
// POST /crm/deals - Criar deal
// ============================================================================
export async function createDeal(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const body = await c.req.json();
    const supabase = getSupabaseClient();

    // Validação básica
    if (!body.title || !body.value || !body.stage || !body.source) {
      return c.json(validationErrorResponse('Título, valor, estágio e fonte são obrigatórios'), 400);
    }

    // Buscar usuário atual (para created_by)
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
      .from('deals')
      .insert({
        organization_id: organizationId,
        title: body.title,
        value: body.value,
        currency: body.currency || 'BRL',
        stage: body.stage,
        source: body.source,
        probability: body.probability || 50,
        contact_id: body.contactId || null,
        contact_name: body.contactName,
        owner_id: body.ownerId || createdBy,
        owner_name: body.ownerName,
        expected_close_date: body.expectedCloseDate || null,
        notes: body.notes || null,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) {
      logError('[Deals] Erro ao criar deal', error);
      return c.json(errorResponse('Erro ao criar deal', { details: error.message }), 500);
    }

    return c.json(successResponse(data), 201);
  } catch (error: any) {
    logError('[Deals] Erro inesperado ao criar', error);
    return c.json(errorResponse('Erro inesperado ao criar deal', { details: error?.message }), 500);
  }
}

// ============================================================================
// PUT /crm/deals/:id - Atualizar deal
// ============================================================================
export async function updateDeal(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const dealId = c.req.param('id');
    const body = await c.req.json();
    const supabase = getSupabaseClient();

    if (!dealId) {
      return c.json(validationErrorResponse('ID do deal é obrigatório'), 400);
    }

    // Verificar se deal existe e pertence à organização
    const { data: existingDeal, error: checkError } = await supabase
      .from('deals')
      .select('id')
      .eq('id', dealId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (checkError || !existingDeal) {
      return c.json(errorResponse('Deal não encontrado'), 404);
    }

    // Preparar dados para atualização
    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.value !== undefined) updateData.value = body.value;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.stage !== undefined) updateData.stage = body.stage;
    if (body.source !== undefined) updateData.source = body.source;
    if (body.probability !== undefined) updateData.probability = body.probability;
    if (body.contactId !== undefined) updateData.contact_id = body.contactId;
    if (body.contactName !== undefined) updateData.contact_name = body.contactName;
    if (body.ownerId !== undefined) updateData.owner_id = body.ownerId;
    if (body.ownerName !== undefined) updateData.owner_name = body.ownerName;
    if (body.expectedCloseDate !== undefined) updateData.expected_close_date = body.expectedCloseDate;
    if (body.notes !== undefined) updateData.notes = body.notes;

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('deals')
      .update(updateData)
      .eq('id', dealId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      logError('[Deals] Erro ao atualizar deal', error);
      return c.json(errorResponse('Erro ao atualizar deal', { details: error.message }), 500);
    }

    return c.json(successResponse(data));
  } catch (error: any) {
    logError('[Deals] Erro inesperado ao atualizar', error);
    return c.json(errorResponse('Erro inesperado ao atualizar deal', { details: error?.message }), 500);
  }
}

// ============================================================================
// PATCH /crm/deals/:id/stage - Atualizar estágio do deal
// ============================================================================
export async function updateDealStage(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const dealId = c.req.param('id');
    const body = await c.req.json();
    const supabase = getSupabaseClient();

    if (!dealId) {
      return c.json(validationErrorResponse('ID do deal é obrigatório'), 400);
    }

    if (!body.stage) {
      return c.json(validationErrorResponse('Novo estágio é obrigatório'), 400);
    }

    // Verificar se deal existe
    const { data: existingDeal, error: checkError } = await supabase
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (checkError || !existingDeal) {
      return c.json(errorResponse('Deal não encontrado'), 404);
    }

    // Atualizar estágio
    const { data, error } = await supabase
      .from('deals')
      .update({
        stage: body.stage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dealId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      logError('[Deals] Erro ao atualizar estágio', error);
      return c.json(errorResponse('Erro ao atualizar estágio', { details: error.message }), 500);
    }

    // Criar atividade de mudança de estágio se houver nota
    if (body.note) {
      const token = c.req.header('X-Auth-Token');
      let userId = null;
      if (token) {
        const { data: session } = await supabase
          .from('sessions')
          .select('user_id')
          .or(`token.eq.${token},access_token.eq.${token}`)
          .maybeSingle();
        if (session) {
          userId = session.user_id;
        }
      }

      if (userId) {
        await supabase.from('deal_activities').insert({
          organization_id: organizationId,
          deal_id: dealId,
          type: 'STAGE_CHANGE',
          title: `Stage Changed to ${body.stage}`,
          description: body.note,
          user_id: userId,
        });
      }
    }

    return c.json(successResponse(data));
  } catch (error: any) {
    logError('[Deals] Erro inesperado ao atualizar estágio', error);
    return c.json(errorResponse('Erro inesperado ao atualizar estágio', { details: error?.message }), 500);
  }
}

// ============================================================================
// DELETE /crm/deals/:id - Deletar deal
// ============================================================================
export async function deleteDeal(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const dealId = c.req.param('id');
    const supabase = getSupabaseClient();

    if (!dealId) {
      return c.json(validationErrorResponse('ID do deal é obrigatório'), 400);
    }

    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', dealId)
      .eq('organization_id', organizationId);

    if (error) {
      logError('[Deals] Erro ao deletar deal', error);
      return c.json(errorResponse('Erro ao deletar deal', { details: error.message }), 500);
    }

    return c.json(successResponse({ message: 'Deal deletado com sucesso' }));
  } catch (error: any) {
    logError('[Deals] Erro inesperado ao deletar', error);
    return c.json(errorResponse('Erro inesperado ao deletar deal', { details: error?.message }), 500);
  }
}

// ============================================================================
// GET /crm/deals/:id/activities - Listar atividades do deal
// ============================================================================
export async function listDealActivities(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const dealId = c.req.param('id');
    const supabase = getSupabaseClient();

    if (!dealId) {
      return c.json(validationErrorResponse('ID do deal é obrigatório'), 400);
    }

    const { data, error } = await supabase
      .from('deal_activities')
      .select('*')
      .eq('deal_id', dealId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      logError('[Deals] Erro ao listar atividades', error);
      return c.json(errorResponse('Erro ao buscar atividades', { details: error.message }), 500);
    }

    return c.json(successResponse(data || []));
  } catch (error: any) {
    logError('[Deals] Erro inesperado ao listar atividades', error);
    return c.json(errorResponse('Erro inesperado ao listar atividades', { details: error?.message }), 500);
  }
}

// ============================================================================
// POST /crm/deals/:id/activities - Criar atividade
// ============================================================================
export async function createDealActivity(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const dealId = c.req.param('id');
    const body = await c.req.json();
    const supabase = getSupabaseClient();

    if (!dealId) {
      return c.json(validationErrorResponse('ID do deal é obrigatório'), 400);
    }

    if (!body.type || !body.title) {
      return c.json(validationErrorResponse('Tipo e título são obrigatórios'), 400);
    }

    // Buscar usuário atual
    const token = c.req.header('X-Auth-Token');
    let userId = null;
    if (token) {
      const { data: session } = await supabase
        .from('sessions')
        .select('user_id')
        .or(`token.eq.${token},access_token.eq.${token}`)
        .maybeSingle();
      if (session) {
        userId = session.user_id;
      }
    }

    if (!userId) {
      return c.json(errorResponse('Usuário não autenticado'), 401);
    }

    const { data, error } = await supabase
      .from('deal_activities')
      .insert({
        organization_id: organizationId,
        deal_id: dealId,
        type: body.type,
        title: body.title,
        description: body.description || null,
        metadata: body.metadata || null,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      logError('[Deals] Erro ao criar atividade', error);
      return c.json(errorResponse('Erro ao criar atividade', { details: error.message }), 500);
    }

    return c.json(successResponse(data), 201);
  } catch (error: any) {
    logError('[Deals] Erro inesperado ao criar atividade', error);
    return c.json(errorResponse('Erro inesperado ao criar atividade', { details: error?.message }), 500);
  }
}

// ============================================================================
// GET /crm/deals/:id/messages - Listar mensagens do deal
// ============================================================================
export async function listDealMessages(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const dealId = c.req.param('id');
    const supabase = getSupabaseClient();

    if (!dealId) {
      return c.json(validationErrorResponse('ID do deal é obrigatório'), 400);
    }

    const { data, error } = await supabase
      .from('deal_messages')
      .select('*')
      .eq('deal_id', dealId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (error) {
      logError('[Deals] Erro ao listar mensagens', error);
      return c.json(errorResponse('Erro ao buscar mensagens', { details: error.message }), 500);
    }

    return c.json(successResponse(data || []));
  } catch (error: any) {
    logError('[Deals] Erro inesperado ao listar mensagens', error);
    return c.json(errorResponse('Erro inesperado ao listar mensagens', { details: error?.message }), 500);
  }
}

// ============================================================================
// POST /crm/deals/:id/messages - Enviar mensagem
// ============================================================================
export async function sendDealMessage(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const dealId = c.req.param('id');
    const body = await c.req.json();
    const supabase = getSupabaseClient();

    if (!dealId) {
      return c.json(validationErrorResponse('ID do deal é obrigatório'), 400);
    }

    if (!body.content || !body.contactId || !body.source) {
      return c.json(validationErrorResponse('Conteúdo, contato e fonte são obrigatórios'), 400);
    }

    const { data, error } = await supabase
      .from('deal_messages')
      .insert({
        organization_id: organizationId,
        deal_id: dealId,
        contact_id: body.contactId,
        content: body.content,
        sender: 'USER',
        source: body.source,
        read: false,
      })
      .select()
      .single();

    if (error) {
      logError('[Deals] Erro ao enviar mensagem', error);
      return c.json(errorResponse('Erro ao enviar mensagem', { details: error.message }), 500);
    }

    return c.json(successResponse(data), 201);
  } catch (error: any) {
    logError('[Deals] Erro inesperado ao enviar mensagem', error);
    return c.json(errorResponse('Erro inesperado ao enviar mensagem', { details: error?.message }), 500);
  }
}

