/**
 * ============================================================================
 * MÓDULO: PREDETERMINED (Pré-determinados) - CRM Modular Multi-Tenant
 * ============================================================================
 * 
 * 📚 DOCUMENTAÇÃO: docs/adr/ADR-001-CRM-MODULAR-ARCHITECTURE.md
 * 📝 CHANGELOG:    docs/changelogs/2026-01-26-CRM-MODULAR-MULTI-TENANT.md
 * 🗃️ TABELAS:      predetermined_funnels, predetermined_funnel_stages, predetermined_items, predetermined_item_activities
 * 🔐 MULTI-TENANT: Filtro por organization_id em TODAS as queries
 * 
 * ROTAS EXPOSTAS:
 * - GET    /crm/predetermined/funnels          → listPredeterminedFunnels
 * - GET    /crm/predetermined/funnels/:id      → getPredeterminedFunnel
 * - POST   /crm/predetermined/funnels          → createPredeterminedFunnel
 * - PUT    /crm/predetermined/funnels/:id      → updatePredeterminedFunnel
 * - DELETE /crm/predetermined/funnels/:id      → deletePredeterminedFunnel
 * - GET    /crm/predetermined/items            → listPredeterminedItems
 * - GET    /crm/predetermined/items/:id        → getPredeterminedItem
 * - POST   /crm/predetermined/items            → createPredeterminedItem
 * - PUT    /crm/predetermined/items/:id        → updatePredeterminedItem
 * - DELETE /crm/predetermined/items/:id        → deletePredeterminedItem
 * - POST   /crm/predetermined/items/:id/move   → movePredeterminedItem
 * - GET    /crm/predetermined/stats            → getPredeterminedStats
 * 
 * FRONTEND API: utils/api-crm-predetermined.ts (crmPredeterminedApi)
 * ============================================================================
 */

import { Context } from 'https://deno.land/x/hono@v3.4.1/mod.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from './utils-env.ts';
import { getOrganizationIdForRequest } from './utils-multi-tenant.ts';

// Helper: Obter cliente Supabase com SERVICE_ROLE_KEY (bypassa RLS)
function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// =============================================================================
// FUNIS PRÉ-DETERMINADOS
// =============================================================================

/**
 * Lista todos os funis pré-determinados da organização
 */
export async function listPredeterminedFunnels(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const { data: funnels, error } = await getSupabaseAdmin()
      .from('predetermined_funnels')
      .select(`
        *,
        stages:predetermined_funnel_stages(*)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[PREDETERMINED] Error listing funnels:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    const funnelsWithSortedStages = (funnels || []).map(funnel => ({
      ...funnel,
      stages: (funnel.stages || []).sort((a: any, b: any) => a.order - b.order)
    }));

    return c.json({ success: true, data: funnelsWithSortedStages });
  } catch (err) {
    console.error('[PREDETERMINED] Exception listing funnels:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Obtém um funil pré-determinado específico
 */
export async function getPredeterminedFunnel(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const funnelId = c.req.param('id');
    
    const { data: funnel, error } = await getSupabaseAdmin()
      .from('predetermined_funnels')
      .select(`
        *,
        stages:predetermined_funnel_stages(*)
      `)
      .eq('id', funnelId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !funnel) {
      return c.json({ success: false, error: 'Funnel not found' }, 404);
    }

    funnel.stages = (funnel.stages || []).sort((a: any, b: any) => a.order - b.order);

    return c.json({ success: true, data: funnel });
  } catch (err) {
    console.error('[PREDETERMINED] Exception getting funnel:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Cria um novo funil pré-determinado
 */
export async function createPredeterminedFunnel(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const body = await c.req.json();
    const { name, description, is_default, trigger_type, auto_create, status_config, stages } = body;

    if (!name) {
      return c.json({ success: false, error: 'Name is required' }, 400);
    }

    // Criar funil
    const { data: funnel, error: funnelError } = await getSupabaseAdmin()
      .from('predetermined_funnels')
      .insert({
        organization_id: organizationId,
        name,
        description,
        is_default: is_default || false,
        trigger_type,
        auto_create: auto_create || false,
        status_config
      })
      .select()
      .single();

    if (funnelError) {
      console.error('[PREDETERMINED] Error creating funnel:', funnelError);
      return c.json({ success: false, error: funnelError.message }, 500);
    }

    // Criar stages se fornecidas
    if (stages && Array.isArray(stages) && stages.length > 0) {
      const stagesToInsert = stages.map((stage: any, index: number) => ({
        funnel_id: funnel.id,
        name: stage.name,
        description: stage.description,
        color: stage.color || '#3b82f6',
        order: stage.order ?? (index + 1),
        auto_actions: stage.auto_actions,
        required_fields: stage.required_fields
      }));

      await getSupabaseAdmin().from('predetermined_funnel_stages').insert(stagesToInsert);
    } else {
      // Criar stages padrão
      const defaultStages = [
        { funnel_id: funnel.id, name: 'Aguardando', color: '#3b82f6', order: 1 },
        { funnel_id: funnel.id, name: 'Em Preparação', color: '#f59e0b', order: 2 },
        { funnel_id: funnel.id, name: 'Pronto', color: '#10b981', order: 3 }
      ];
      
      await getSupabaseAdmin().from('predetermined_funnel_stages').insert(defaultStages);
    }

    // Buscar funil completo
    const { data: completeFunnel } = await getSupabaseAdmin()
      .from('predetermined_funnels')
      .select(`*, stages:predetermined_funnel_stages(*)`)
      .eq('id', funnel.id)
      .single();

    if (completeFunnel) {
      completeFunnel.stages = (completeFunnel.stages || []).sort((a: any, b: any) => a.order - b.order);
    }

    return c.json({ success: true, data: completeFunnel || funnel }, 201);
  } catch (err) {
    console.error('[PREDETERMINED] Exception creating funnel:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Atualiza um funil pré-determinado
 */
export async function updatePredeterminedFunnel(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const funnelId = c.req.param('id');
    const body = await c.req.json();
    const { name, description, is_default, trigger_type, auto_create, status_config, stages } = body;

    // Verificar se funil existe
    const { data: existing } = await getSupabaseAdmin()
      .from('predetermined_funnels')
      .select('id')
      .eq('id', funnelId)
      .eq('organization_id', organizationId)
      .single();

    if (!existing) {
      return c.json({ success: false, error: 'Funnel not found' }, 404);
    }

    // Atualizar funil
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (is_default !== undefined) updateData.is_default = is_default;
    if (trigger_type !== undefined) updateData.trigger_type = trigger_type;
    if (auto_create !== undefined) updateData.auto_create = auto_create;
    if (status_config !== undefined) updateData.status_config = status_config;

    await getSupabaseAdmin().from('predetermined_funnels').update(updateData).eq('id', funnelId);

    // Atualizar stages se fornecidas
    if (stages && Array.isArray(stages)) {
      await getSupabaseAdmin().from('predetermined_funnel_stages').delete().eq('funnel_id', funnelId);

      const stagesToInsert = stages.map((stage: any, index: number) => ({
        funnel_id: funnelId,
        name: stage.name,
        description: stage.description,
        color: stage.color || '#3b82f6',
        order: stage.order ?? (index + 1),
        auto_actions: stage.auto_actions,
        required_fields: stage.required_fields
      }));

      await getSupabaseAdmin().from('predetermined_funnel_stages').insert(stagesToInsert);
    }

    // Buscar funil atualizado
    const { data: updatedFunnel } = await getSupabaseAdmin()
      .from('predetermined_funnels')
      .select(`*, stages:predetermined_funnel_stages(*)`)
      .eq('id', funnelId)
      .single();

    if (updatedFunnel) {
      updatedFunnel.stages = (updatedFunnel.stages || []).sort((a: any, b: any) => a.order - b.order);
    }

    return c.json({ success: true, data: updatedFunnel });
  } catch (err) {
    console.error('[PREDETERMINED] Exception updating funnel:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Deleta um funil pré-determinado
 */
export async function deletePredeterminedFunnel(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const funnelId = c.req.param('id');

    // Verificar se existem items vinculados
    const { count } = await getSupabaseAdmin()
      .from('predetermined_items')
      .select('id', { count: 'exact', head: true })
      .eq('funnel_id', funnelId);

    if (count && count > 0) {
      return c.json({ 
        success: false, 
        error: `Cannot delete funnel with ${count} active items. Move or delete items first.` 
      }, 400);
    }

    const { error } = await getSupabaseAdmin()
      .from('predetermined_funnels')
      .delete()
      .eq('id', funnelId)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('[PREDETERMINED] Error deleting funnel:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, message: 'Funnel deleted successfully' });
  } catch (err) {
    console.error('[PREDETERMINED] Exception deleting funnel:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

// =============================================================================
// ITEMS (Cards de Workflow Pré-determinado)
// =============================================================================

/**
 * Lista items pré-determinados
 */
export async function listPredeterminedItems(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const funnelId = c.req.query('funnel_id');
    const stageId = c.req.query('stage_id');
    const status = c.req.query('status');
    const propertyId = c.req.query('property_id');
    const reservationId = c.req.query('reservation_id');
    const limit = parseInt(c.req.query('limit') || '100');
    const offset = parseInt(c.req.query('offset') || '0');

    let query = getSupabaseAdmin()
      .from('predetermined_items')
      .select(`
        *,
        stage:predetermined_funnel_stages(id, name, color),
        funnel:predetermined_funnels(id, name, trigger_type)
      `)
      .eq('organization_id', organizationId);

    if (funnelId) query = query.eq('funnel_id', funnelId);
    if (stageId) query = query.eq('stage_id', stageId);
    if (status) query = query.eq('status', status);
    if (propertyId) query = query.eq('property_id', propertyId);
    if (reservationId) query = query.eq('reservation_id', reservationId);

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: items, error } = await query;

    if (error) {
      console.error('[PREDETERMINED] Error listing items:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data: items || [] });
  } catch (err) {
    console.error('[PREDETERMINED] Exception listing items:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Obtém um item específico
 */
export async function getPredeterminedItem(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const itemId = c.req.param('id');

    const { data: item, error } = await getSupabaseAdmin()
      .from('predetermined_items')
      .select(`
        *,
        stage:predetermined_funnel_stages(id, name, color),
        funnel:predetermined_funnels(id, name, trigger_type),
        activities:predetermined_item_activities(*)
      `)
      .eq('id', itemId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !item) {
      return c.json({ success: false, error: 'Item not found' }, 404);
    }

    item.activities = (item.activities || []).sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return c.json({ success: true, data: item });
  } catch (err) {
    console.error('[PREDETERMINED] Exception getting item:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Cria um novo item
 */
export async function createPredeterminedItem(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const body = await c.req.json();
    const { 
      funnel_id, stage_id, title, description, property_id, reservation_id,
      guest_id, assignee_id, assignee_name, due_date, form_data, checklist,
      tags, custom_fields, notes
    } = body;

    if (!funnel_id || !stage_id || !title) {
      return c.json({ success: false, error: 'funnel_id, stage_id and title are required' }, 400);
    }

    const { data: item, error } = await getSupabaseAdmin()
      .from('predetermined_items')
      .insert({
        organization_id: organizationId,
        funnel_id,
        stage_id,
        title,
        description,
        property_id,
        reservation_id,
        guest_id,
        assignee_id,
        assignee_name,
        due_date,
        form_data,
        checklist,
        tags,
        custom_fields,
        notes
      })
      .select()
      .single();

    if (error) {
      console.error('[PREDETERMINED] Error creating item:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    // Registrar atividade
    await getSupabaseAdmin().from('predetermined_item_activities').insert({
      item_id: item.id,
      type: 'created',
      description: 'Item criado'
    });

    return c.json({ success: true, data: item }, 201);
  } catch (err) {
    console.error('[PREDETERMINED] Exception creating item:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Atualiza um item
 */
export async function updatePredeterminedItem(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const itemId = c.req.param('id');
    const body = await c.req.json();

    const { data: existing } = await getSupabaseAdmin()
      .from('predetermined_items')
      .select('*')
      .eq('id', itemId)
      .eq('organization_id', organizationId)
      .single();

    if (!existing) {
      return c.json({ success: false, error: 'Item not found' }, 404);
    }

    const updateData: any = {};
    const allowedFields = [
      'stage_id', 'title', 'description', 'status', 'assignee_id', 
      'assignee_name', 'due_date', 'form_data', 'checklist', 
      'tags', 'custom_fields', 'notes'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Tratar conclusão
    if (body.status === 'completed' && existing.status !== 'completed') {
      updateData.completed_at = new Date().toISOString();
    }
    if (body.status === 'in_progress' && existing.status === 'pending') {
      updateData.started_at = new Date().toISOString();
    }

    const { data: item, error } = await getSupabaseAdmin()
      .from('predetermined_items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      console.error('[PREDETERMINED] Error updating item:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    // Registrar mudanças
    if (body.stage_id && body.stage_id !== existing.stage_id) {
      await getSupabaseAdmin().from('predetermined_item_activities').insert({
        item_id: itemId,
        type: 'stage_change',
        description: 'Item movido para nova etapa',
        metadata: { from_stage: existing.stage_id, to_stage: body.stage_id }
      });
    }

    return c.json({ success: true, data: item });
  } catch (err) {
    console.error('[PREDETERMINED] Exception updating item:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Deleta um item
 */
export async function deletePredeterminedItem(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const itemId = c.req.param('id');

    const { error } = await getSupabaseAdmin()
      .from('predetermined_items')
      .delete()
      .eq('id', itemId)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('[PREDETERMINED] Error deleting item:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, message: 'Item deleted successfully' });
  } catch (err) {
    console.error('[PREDETERMINED] Exception deleting item:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Move item para outro estágio
 */
export async function movePredeterminedItem(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const itemId = c.req.param('id');
    const { stage_id } = await c.req.json();

    if (!stage_id) {
      return c.json({ success: false, error: 'stage_id is required' }, 400);
    }

    const { data: existing } = await getSupabaseAdmin()
      .from('predetermined_items')
      .select('stage_id, status')
      .eq('id', itemId)
      .eq('organization_id', organizationId)
      .single();

    if (!existing) {
      return c.json({ success: false, error: 'Item not found' }, 404);
    }

    const updateData: any = { stage_id };
    
    // Auto-iniciar se estava pendente
    if (existing.status === 'pending') {
      updateData.status = 'in_progress';
      updateData.started_at = new Date().toISOString();
    }

    const { data: item, error } = await getSupabaseAdmin()
      .from('predetermined_items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      console.error('[PREDETERMINED] Error moving item:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    if (existing.stage_id !== stage_id) {
      await getSupabaseAdmin().from('predetermined_item_activities').insert({
        item_id: itemId,
        type: 'stage_change',
        description: 'Item movido',
        metadata: { from_stage: existing.stage_id, to_stage: stage_id }
      });
    }

    return c.json({ success: true, data: item });
  } catch (err) {
    console.error('[PREDETERMINED] Exception moving item:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Atualiza checklist de um item
 */
export async function updatePredeterminedItemChecklist(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const itemId = c.req.param('id');
    const { checklist } = await c.req.json();

    const { data: item, error } = await getSupabaseAdmin()
      .from('predetermined_items')
      .update({ checklist })
      .eq('id', itemId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      console.error('[PREDETERMINED] Error updating checklist:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    // Registrar atividade
    await getSupabaseAdmin().from('predetermined_item_activities').insert({
      item_id: itemId,
      type: 'checklist_update',
      description: 'Checklist atualizado',
      metadata: { checklist }
    });

    return c.json({ success: true, data: item });
  } catch (err) {
    console.error('[PREDETERMINED] Exception updating checklist:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

// =============================================================================
// ESTATÍSTICAS DE PRÉ-DETERMINADOS
// =============================================================================

export async function getPredeterminedStats(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const funnelId = c.req.query('funnel_id');

    let baseQuery = getSupabaseAdmin()
      .from('predetermined_items')
      .select('*')
      .eq('organization_id', organizationId);

    if (funnelId) {
      baseQuery = baseQuery.eq('funnel_id', funnelId);
    }

    const { data: items } = await baseQuery;
    const allItems = items || [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = {
      total: allItems.length,
      pending: allItems.filter(i => i.status === 'pending').length,
      inProgress: allItems.filter(i => i.status === 'in_progress').length,
      completed: allItems.filter(i => i.status === 'completed').length,
      cancelled: allItems.filter(i => i.status === 'cancelled').length,
      skipped: allItems.filter(i => i.status === 'skipped').length,
      dueToday: allItems.filter(i => {
        if (!i.due_date) return false;
        const dueDate = new Date(i.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime() && !['completed', 'cancelled', 'skipped'].includes(i.status);
      }).length,
      overdue: allItems.filter(i => {
        if (!i.due_date) return false;
        const dueDate = new Date(i.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() < today.getTime() && !['completed', 'cancelled', 'skipped'].includes(i.status);
      }).length,
      completionRate: allItems.filter(i => !['pending', 'in_progress'].includes(i.status)).length > 0
        ? (allItems.filter(i => i.status === 'completed').length / 
           allItems.filter(i => !['pending', 'in_progress'].includes(i.status)).length) * 100
        : 0
    };

    return c.json({ success: true, data: stats });
  } catch (err) {
    console.error('[PREDETERMINED] Exception getting stats:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}
