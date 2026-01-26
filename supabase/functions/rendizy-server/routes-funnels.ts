import type { Context } from 'npm:hono';
import { getSupabaseClient } from './kv_store.tsx';
import { getOrganizationIdForRequest } from './utils-multi-tenant.ts';
import { successResponse, errorResponse, validationErrorResponse, logInfo, logError } from './utils.ts';

// ============================================================================
// TYPES
// ============================================================================
interface FunnelStage {
  id?: string;
  funnel_id?: string;
  name: string;
  description?: string;
  color: string;
  order: number;
}

interface CreateFunnelRequest {
  name: string;
  type: 'SALES' | 'SERVICES' | 'PREDETERMINED';
  description?: string;
  is_default?: boolean;
  status_config?: {
    resolvedStatus: string;
    unresolvedStatus: string;
    inProgressStatus: string;
  };
  stages?: FunnelStage[];
}

// ============================================================================
// GET /crm/funnels - Listar funis
// ============================================================================
export async function listFunnels(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const supabase = getSupabaseClient();
    const type = c.req.query('type'); // Filtro opcional por tipo

    logInfo('[Funnels] Listando funis', { organizationId, type });

    let query = supabase
      .from('crm_funnels')
      .select(`
        *,
        stages:crm_funnel_stages(*)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      logError('[Funnels] Erro ao listar funis', error);
      return c.json(errorResponse('Erro ao buscar funis', { details: error.message }), 500);
    }

    // Ordenar stages por order
    const funnelsWithSortedStages = (data || []).map(funnel => ({
      ...funnel,
      stages: (funnel.stages || []).sort((a: FunnelStage, b: FunnelStage) => a.order - b.order)
    }));

    logInfo('[Funnels] Funis encontrados', { count: funnelsWithSortedStages.length });
    return c.json(successResponse(funnelsWithSortedStages));
  } catch (error: any) {
    logError('[Funnels] Erro inesperado ao listar', error);
    return c.json(errorResponse('Erro inesperado ao listar funis', { details: error?.message }), 500);
  }
}

// ============================================================================
// GET /crm/funnels/:id - Buscar funil específico
// ============================================================================
export async function getFunnel(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const funnelId = c.req.param('id');
    const supabase = getSupabaseClient();

    if (!funnelId) {
      return c.json(validationErrorResponse('ID do funil é obrigatório'), 400);
    }

    const { data, error } = await supabase
      .from('crm_funnels')
      .select(`
        *,
        stages:crm_funnel_stages(*)
      `)
      .eq('id', funnelId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      logError('[Funnels] Erro ao buscar funil', error);
      return c.json(errorResponse('Erro ao buscar funil', { details: error.message }), 500);
    }

    if (!data) {
      return c.json(errorResponse('Funil não encontrado'), 404);
    }

    // Ordenar stages
    data.stages = (data.stages || []).sort((a: FunnelStage, b: FunnelStage) => a.order - b.order);

    return c.json(successResponse(data));
  } catch (error: any) {
    logError('[Funnels] Erro inesperado ao buscar', error);
    return c.json(errorResponse('Erro inesperado ao buscar funil', { details: error?.message }), 500);
  }
}

// ============================================================================
// POST /crm/funnels - Criar funil
// ============================================================================
export async function createFunnel(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const body: CreateFunnelRequest = await c.req.json();
    const supabase = getSupabaseClient();

    logInfo('[Funnels] Criando funil', { organizationId, name: body.name, type: body.type });

    // Validação básica
    if (!body.name || !body.type) {
      return c.json(validationErrorResponse('Nome e tipo são obrigatórios'), 400);
    }

    if (!['SALES', 'SERVICES', 'PREDETERMINED'].includes(body.type)) {
      return c.json(validationErrorResponse('Tipo inválido. Use: SALES, SERVICES ou PREDETERMINED'), 400);
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

    // Se for marcado como default, desmarcar outros do mesmo tipo
    if (body.is_default) {
      await supabase
        .from('crm_funnels')
        .update({ is_default: false })
        .eq('organization_id', organizationId)
        .eq('type', body.type);
    }

    // Criar funil
    const { data: funnel, error: funnelError } = await supabase
      .from('crm_funnels')
      .insert({
        organization_id: organizationId,
        name: body.name,
        type: body.type,
        description: body.description || null,
        is_default: body.is_default || false,
        status_config: body.status_config || {
          resolvedStatus: 'Concluído',
          unresolvedStatus: 'Cancelado',
          inProgressStatus: 'Em Andamento'
        },
        created_by: createdBy,
      })
      .select()
      .single();

    if (funnelError) {
      logError('[Funnels] Erro ao criar funil', funnelError);
      return c.json(errorResponse('Erro ao criar funil', { details: funnelError.message }), 500);
    }

    // Criar estágios se fornecidos
    if (body.stages && body.stages.length > 0) {
      const stagesToInsert = body.stages.map((stage, index) => ({
        funnel_id: funnel.id,
        name: stage.name,
        description: stage.description || null,
        color: stage.color || '#3b82f6',
        order: stage.order || index + 1,
      }));

      const { error: stagesError } = await supabase
        .from('crm_funnel_stages')
        .insert(stagesToInsert);

      if (stagesError) {
        logError('[Funnels] Erro ao criar estágios', stagesError);
        // Não falhar a criação do funil por causa dos estágios
      }
    }

    // Buscar funil completo com stages
    const { data: completeFunnel } = await supabase
      .from('crm_funnels')
      .select(`
        *,
        stages:crm_funnel_stages(*)
      `)
      .eq('id', funnel.id)
      .single();

    if (completeFunnel) {
      completeFunnel.stages = (completeFunnel.stages || []).sort((a: FunnelStage, b: FunnelStage) => a.order - b.order);
    }

    logInfo('[Funnels] Funil criado com sucesso', { id: funnel.id });
    return c.json(successResponse(completeFunnel || funnel), 201);
  } catch (error: any) {
    logError('[Funnels] Erro inesperado ao criar', error);
    return c.json(errorResponse('Erro inesperado ao criar funil', { details: error?.message }), 500);
  }
}

// ============================================================================
// PUT /crm/funnels/:id - Atualizar funil (incluindo stages)
// ============================================================================
export async function updateFunnel(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const funnelId = c.req.param('id');
    const body = await c.req.json();
    const supabase = getSupabaseClient();

    logInfo('[Funnels] Atualizando funil', { funnelId, organizationId });

    if (!funnelId) {
      return c.json(validationErrorResponse('ID do funil é obrigatório'), 400);
    }

    // Verificar se funil existe e pertence à organização
    const { data: existingFunnel, error: checkError } = await supabase
      .from('crm_funnels')
      .select('id, type')
      .eq('id', funnelId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (checkError || !existingFunnel) {
      return c.json(errorResponse('Funil não encontrado'), 404);
    }

    // Preparar dados para atualização
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status_config !== undefined) updateData.status_config = body.status_config;
    if (body.is_default !== undefined) {
      updateData.is_default = body.is_default;
      // Se marcando como default, desmarcar outros
      if (body.is_default) {
        await supabase
          .from('crm_funnels')
          .update({ is_default: false })
          .eq('organization_id', organizationId)
          .eq('type', existingFunnel.type)
          .neq('id', funnelId);
      }
    }

    // Atualizar funil
    const { error: updateError } = await supabase
      .from('crm_funnels')
      .update(updateData)
      .eq('id', funnelId);

    if (updateError) {
      logError('[Funnels] Erro ao atualizar funil', updateError);
      return c.json(errorResponse('Erro ao atualizar funil', { details: updateError.message }), 500);
    }

    // Atualizar estágios se fornecidos
    if (body.stages !== undefined) {
      // Deletar estágios existentes
      await supabase
        .from('crm_funnel_stages')
        .delete()
        .eq('funnel_id', funnelId);

      // Inserir novos estágios
      if (body.stages.length > 0) {
        const stagesToInsert = body.stages.map((stage: FunnelStage, index: number) => ({
          funnel_id: funnelId,
          name: stage.name,
          description: stage.description || null,
          color: stage.color || '#3b82f6',
          order: stage.order || index + 1,
        }));

        const { error: stagesError } = await supabase
          .from('crm_funnel_stages')
          .insert(stagesToInsert);

        if (stagesError) {
          logError('[Funnels] Erro ao atualizar estágios', stagesError);
        }
      }
    }

    // Buscar funil atualizado
    const { data: updatedFunnel } = await supabase
      .from('crm_funnels')
      .select(`
        *,
        stages:crm_funnel_stages(*)
      `)
      .eq('id', funnelId)
      .single();

    if (updatedFunnel) {
      updatedFunnel.stages = (updatedFunnel.stages || []).sort((a: FunnelStage, b: FunnelStage) => a.order - b.order);
    }

    logInfo('[Funnels] Funil atualizado com sucesso', { id: funnelId });
    return c.json(successResponse(updatedFunnel));
  } catch (error: any) {
    logError('[Funnels] Erro inesperado ao atualizar', error);
    return c.json(errorResponse('Erro inesperado ao atualizar funil', { details: error?.message }), 500);
  }
}

// ============================================================================
// DELETE /crm/funnels/:id - Excluir funil
// ============================================================================
export async function deleteFunnel(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const funnelId = c.req.param('id');
    const supabase = getSupabaseClient();

    logInfo('[Funnels] Excluindo funil', { funnelId, organizationId });

    if (!funnelId) {
      return c.json(validationErrorResponse('ID do funil é obrigatório'), 400);
    }

    // Verificar se funil existe e pertence à organização
    const { data: existingFunnel, error: checkError } = await supabase
      .from('crm_funnels')
      .select('id, is_global_default')
      .eq('id', funnelId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (checkError || !existingFunnel) {
      return c.json(errorResponse('Funil não encontrado'), 404);
    }

    // Não permitir excluir funil global
    if (existingFunnel.is_global_default) {
      return c.json(errorResponse('Não é possível excluir funis globais'), 403);
    }

    // Verificar se há deals vinculados
    const { count: dealsCount } = await supabase
      .from('deals')
      .select('id', { count: 'exact', head: true })
      .eq('funnel_id', funnelId);

    if (dealsCount && dealsCount > 0) {
      return c.json(errorResponse(`Não é possível excluir o funil. Existem ${dealsCount} deals vinculados.`), 400);
    }

    // Deletar estágios primeiro (cascade deve fazer isso, mas por segurança)
    await supabase
      .from('crm_funnel_stages')
      .delete()
      .eq('funnel_id', funnelId);

    // Deletar funil
    const { error: deleteError } = await supabase
      .from('crm_funnels')
      .delete()
      .eq('id', funnelId);

    if (deleteError) {
      logError('[Funnels] Erro ao excluir funil', deleteError);
      return c.json(errorResponse('Erro ao excluir funil', { details: deleteError.message }), 500);
    }

    logInfo('[Funnels] Funil excluído com sucesso', { id: funnelId });
    return c.json(successResponse({ message: 'Funil excluído com sucesso' }));
  } catch (error: any) {
    logError('[Funnels] Erro inesperado ao excluir', error);
    return c.json(errorResponse('Erro inesperado ao excluir funil', { details: error?.message }), 500);
  }
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

// Criar funil padrão para uma organização
export async function createDefaultFunnel(organizationId: string, type: 'SALES' | 'SERVICES' | 'PREDETERMINED') {
  const supabase = getSupabaseClient();

  const defaultStages: Record<string, FunnelStage[]> = {
    SALES: [
      { name: 'Qualificado', color: '#3b82f6', order: 1 },
      { name: 'Contato Feito', color: '#f59e0b', order: 2 },
      { name: 'Reunião Agendada', color: '#ef4444', order: 3 },
      { name: 'Proposta Enviada', color: '#8b5cf6', order: 4 },
      { name: 'Negociação', color: '#6366f1', order: 5 },
    ],
    SERVICES: [
      { name: 'Triagem', color: '#3b82f6', order: 1 },
      { name: 'Em Análise', color: '#f59e0b', order: 2 },
      { name: 'Em Resolução', color: '#8b5cf6', order: 3 },
      { name: 'Resolvido', color: '#10b981', order: 4 },
    ],
    PREDETERMINED: [
      { name: 'Início', color: '#3b82f6', order: 1 },
      { name: 'Em Progresso', color: '#f59e0b', order: 2 },
      { name: 'Conclusão', color: '#10b981', order: 3 },
    ],
  };

  const names: Record<string, string> = {
    SALES: 'Funil Principal',
    SERVICES: 'Funil de Serviços',
    PREDETERMINED: 'Funil Pré-determinado',
  };

  try {
    // Criar funil
    const { data: funnel, error: funnelError } = await supabase
      .from('crm_funnels')
      .insert({
        organization_id: organizationId,
        name: names[type],
        type,
        description: `Pipeline padrão de ${type.toLowerCase()}`,
        is_default: true,
      })
      .select()
      .single();

    if (funnelError || !funnel) {
      logError('[Funnels] Erro ao criar funil padrão', funnelError);
      return null;
    }

    // Criar estágios
    const stages = defaultStages[type].map(stage => ({
      funnel_id: funnel.id,
      ...stage,
    }));

    await supabase.from('crm_funnel_stages').insert(stages);

    logInfo('[Funnels] Funil padrão criado', { id: funnel.id, type });
    return funnel;
  } catch (error) {
    logError('[Funnels] Erro ao criar funil padrão', error);
    return null;
  }
}
