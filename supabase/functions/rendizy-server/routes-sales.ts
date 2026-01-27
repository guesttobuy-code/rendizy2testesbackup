/**
 * ============================================================================
 * MÓDULO: SALES (Vendas) - CRM Modular Multi-Tenant
 * ============================================================================
 * 
 * 📚 DOCUMENTAÇÃO: docs/adr/ADR-001-CRM-MODULAR-ARCHITECTURE.md
 * 📝 CHANGELOG:    docs/changelogs/2026-01-26-CRM-MODULAR-MULTI-TENANT.md
 * 🗃️ TABELAS:      sales_funnels, sales_funnel_stages, sales_deals, sales_deal_activities
 * 🔐 MULTI-TENANT: Filtro por organization_id em TODAS as queries
 * 
 * ROTAS EXPOSTAS:
 * - GET    /crm/sales/funnels          → listSalesFunnels
 * - GET    /crm/sales/funnels/:id      → getSalesFunnel
 * - POST   /crm/sales/funnels          → createSalesFunnel
 * - PUT    /crm/sales/funnels/:id      → updateSalesFunnel
 * - DELETE /crm/sales/funnels/:id      → deleteSalesFunnel
 * - GET    /crm/sales/deals            → listSalesDeals
 * - GET    /crm/sales/deals/:id        → getSalesDeal
 * - POST   /crm/sales/deals            → createSalesDeal
 * - PUT    /crm/sales/deals/:id        → updateSalesDeal
 * - DELETE /crm/sales/deals/:id        → deleteSalesDeal
 * - POST   /crm/sales/deals/:id/move   → moveSalesDeal
 * - GET    /crm/sales/stats            → getSalesStats
 * 
 * FRONTEND API: utils/api-crm-sales.ts (crmSalesApi)
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
// FUNIS DE VENDAS
// =============================================================================

/**
 * Lista todos os funis de vendas da organização
 */
export async function listSalesFunnels(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const { data: funnels, error } = await getSupabaseAdmin()
      .from('sales_funnels')
      .select(`
        *,
        stages:sales_funnel_stages(*)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SALES] Error listing funnels:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    // Ordenar stages por order
    const funnelsWithSortedStages = (funnels || []).map(funnel => ({
      ...funnel,
      stages: (funnel.stages || []).sort((a: any, b: any) => a.order - b.order)
    }));

    return c.json({ success: true, data: funnelsWithSortedStages });
  } catch (err) {
    console.error('[SALES] Exception listing funnels:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Obtém um funil de vendas específico
 */
export async function getSalesFunnel(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const funnelId = c.req.param('id');
    
    const { data: funnel, error } = await getSupabaseAdmin()
      .from('sales_funnels')
      .select(`
        *,
        stages:sales_funnel_stages(*)
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
    console.error('[SALES] Exception getting funnel:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Cria um novo funil de vendas
 */
export async function createSalesFunnel(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const body = await c.req.json();
    const { name, description, is_default, status_config, stages } = body;

    if (!name) {
      return c.json({ success: false, error: 'Name is required' }, 400);
    }

    // Criar funil
    const { data: funnel, error: funnelError } = await getSupabaseAdmin()
      .from('sales_funnels')
      .insert({
        organization_id: organizationId,
        name,
        description,
        is_default: is_default || false,
        status_config
      })
      .select()
      .single();

    if (funnelError) {
      console.error('[SALES] Error creating funnel:', funnelError);
      return c.json({ success: false, error: funnelError.message }, 500);
    }

    // Criar stages se fornecidas
    if (stages && Array.isArray(stages) && stages.length > 0) {
      const stagesToInsert = stages.map((stage: any, index: number) => ({
        funnel_id: funnel.id,
        name: stage.name,
        description: stage.description,
        color: stage.color || '#3b82f6',
        order: stage.order ?? (index + 1)
      }));

      const { error: stagesError } = await getSupabaseAdmin()
        .from('sales_funnel_stages')
        .insert(stagesToInsert);

      if (stagesError) {
        console.error('[SALES] Error creating stages:', stagesError);
      }
    } else {
      // Criar stages padrão
      const defaultStages = [
        { funnel_id: funnel.id, name: 'Qualificado', color: '#3b82f6', order: 1 },
        { funnel_id: funnel.id, name: 'Contato Feito', color: '#f59e0b', order: 2 },
        { funnel_id: funnel.id, name: 'Proposta Enviada', color: '#8b5cf6', order: 3 },
        { funnel_id: funnel.id, name: 'Negociação', color: '#6366f1', order: 4 }
      ];
      
      await getSupabaseAdmin().from('sales_funnel_stages').insert(defaultStages);
    }

    // Buscar funil completo com stages
    const { data: completeFunnel } = await getSupabaseAdmin()
      .from('sales_funnels')
      .select(`*, stages:sales_funnel_stages(*)`)
      .eq('id', funnel.id)
      .single();

    if (completeFunnel) {
      completeFunnel.stages = (completeFunnel.stages || []).sort((a: any, b: any) => a.order - b.order);
    }

    return c.json({ success: true, data: completeFunnel || funnel }, 201);
  } catch (err) {
    console.error('[SALES] Exception creating funnel:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Atualiza um funil de vendas
 */
export async function updateSalesFunnel(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const funnelId = c.req.param('id');
    const body = await c.req.json();
    const { name, description, is_default, status_config, stages } = body;

    // Verificar se funil existe
    const { data: existing } = await getSupabaseAdmin()
      .from('sales_funnels')
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
    if (status_config !== undefined) updateData.status_config = status_config;

    const { error: updateError } = await getSupabaseAdmin()
      .from('sales_funnels')
      .update(updateData)
      .eq('id', funnelId);

    if (updateError) {
      console.error('[SALES] Error updating funnel:', updateError);
      return c.json({ success: false, error: updateError.message }, 500);
    }

    // Atualizar stages se fornecidas
    if (stages && Array.isArray(stages)) {
      // Deletar stages antigas
      await getSupabaseAdmin()
        .from('sales_funnel_stages')
        .delete()
        .eq('funnel_id', funnelId);

      // Inserir novas stages
      const stagesToInsert = stages.map((stage: any, index: number) => ({
        funnel_id: funnelId,
        name: stage.name,
        description: stage.description,
        color: stage.color || '#3b82f6',
        order: stage.order ?? (index + 1)
      }));

      await getSupabaseAdmin().from('sales_funnel_stages').insert(stagesToInsert);
    }

    // Buscar funil atualizado
    const { data: updatedFunnel } = await getSupabaseAdmin()
      .from('sales_funnels')
      .select(`*, stages:sales_funnel_stages(*)`)
      .eq('id', funnelId)
      .single();

    if (updatedFunnel) {
      updatedFunnel.stages = (updatedFunnel.stages || []).sort((a: any, b: any) => a.order - b.order);
    }

    return c.json({ success: true, data: updatedFunnel });
  } catch (err) {
    console.error('[SALES] Exception updating funnel:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Deleta um funil de vendas
 */
export async function deleteSalesFunnel(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const funnelId = c.req.param('id');

    // Verificar se existem deals vinculados
    const { count } = await getSupabaseAdmin()
      .from('sales_deals')
      .select('id', { count: 'exact', head: true })
      .eq('funnel_id', funnelId);

    if (count && count > 0) {
      return c.json({ 
        success: false, 
        error: `Cannot delete funnel with ${count} active deals. Move or delete deals first.` 
      }, 400);
    }

    const { error } = await getSupabaseAdmin()
      .from('sales_funnels')
      .delete()
      .eq('id', funnelId)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('[SALES] Error deleting funnel:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, message: 'Funnel deleted successfully' });
  } catch (err) {
    console.error('[SALES] Exception deleting funnel:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

// =============================================================================
// DEALS (Cards de Vendas)
// =============================================================================

/**
 * Lista deals de vendas
 */
export async function listSalesDeals(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const funnelId = c.req.query('funnel_id');
    const stageId = c.req.query('stage_id');
    const status = c.req.query('status');
    const ownerId = c.req.query('owner_id');
    const limit = parseInt(c.req.query('limit') || '100');
    const offset = parseInt(c.req.query('offset') || '0');

    let query = getSupabaseAdmin()
      .from('sales_deals')
      .select(`
        *,
        stage:sales_funnel_stages(id, name, color),
        funnel:sales_funnels(id, name)
      `)
      .eq('organization_id', organizationId);

    if (funnelId) query = query.eq('funnel_id', funnelId);
    if (stageId) query = query.eq('stage_id', stageId);
    if (status) query = query.eq('status', status);
    if (ownerId) query = query.eq('owner_id', ownerId);

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: deals, error } = await query;

    if (error) {
      console.error('[SALES] Error listing deals:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data: deals || [] });
  } catch (err) {
    console.error('[SALES] Exception listing deals:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Obtém um deal específico
 */
export async function getSalesDeal(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const dealId = c.req.param('id');

    const { data: deal, error } = await getSupabaseAdmin()
      .from('sales_deals')
      .select(`
        *,
        stage:sales_funnel_stages(id, name, color),
        funnel:sales_funnels(id, name),
        activities:sales_deal_activities(*)
      `)
      .eq('id', dealId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !deal) {
      return c.json({ success: false, error: 'Deal not found' }, 404);
    }

    // Ordenar atividades por data
    deal.activities = (deal.activities || []).sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return c.json({ success: true, data: deal });
  } catch (err) {
    console.error('[SALES] Exception getting deal:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Cria um novo deal
 */
export async function createSalesDeal(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const body = await c.req.json();
    const { 
      funnel_id, stage_id, title, description, value, currency,
      probability, expected_close_date, contact_name, contact_email,
      contact_phone, contact_whatsapp_jid, source, source_metadata,
      owner_id, owner_name, tags, custom_fields, notes
    } = body;

    if (!funnel_id || !stage_id || !title) {
      return c.json({ success: false, error: 'funnel_id, stage_id and title are required' }, 400);
    }

    // Verificar se funil e stage existem
    const { data: stage } = await getSupabaseAdmin()
      .from('sales_funnel_stages')
      .select('id, funnel_id')
      .eq('id', stage_id)
      .eq('funnel_id', funnel_id)
      .single();

    if (!stage) {
      return c.json({ success: false, error: 'Invalid funnel_id or stage_id' }, 400);
    }

    const { data: deal, error } = await getSupabaseAdmin()
      .from('sales_deals')
      .insert({
        organization_id: organizationId,
        funnel_id,
        stage_id,
        title,
        description,
        value: value || 0,
        currency: currency || 'BRL',
        probability: probability || 50,
        expected_close_date,
        contact_name,
        contact_email,
        contact_phone,
        contact_whatsapp_jid,
        source: source || 'MANUAL',
        source_metadata,
        owner_id,
        owner_name,
        tags,
        custom_fields,
        notes
      })
      .select()
      .single();

    if (error) {
      console.error('[SALES] Error creating deal:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    // Registrar atividade de criação
    await getSupabaseAdmin().from('sales_deal_activities').insert({
      deal_id: deal.id,
      type: 'created',
      description: 'Deal criado'
    });

    return c.json({ success: true, data: deal }, 201);
  } catch (err) {
    console.error('[SALES] Exception creating deal:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Atualiza um deal
 */
export async function updateSalesDeal(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const dealId = c.req.param('id');
    const body = await c.req.json();

    // Buscar deal atual
    const { data: existing } = await getSupabaseAdmin()
      .from('sales_deals')
      .select('*')
      .eq('id', dealId)
      .eq('organization_id', organizationId)
      .single();

    if (!existing) {
      return c.json({ success: false, error: 'Deal not found' }, 404);
    }

    const updateData: any = {};
    const allowedFields = [
      'stage_id', 'title', 'description', 'value', 'currency', 'probability',
      'expected_close_date', 'contact_name', 'contact_email', 'contact_phone',
      'contact_whatsapp_jid', 'owner_id', 'owner_name', 'status', 'lost_reason',
      'tags', 'custom_fields', 'notes'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Tratar mudanças de status
    if (body.status === 'won' && existing.status !== 'won') {
      updateData.won_at = new Date().toISOString();
    }
    if (body.status === 'lost' && existing.status !== 'lost') {
      updateData.lost_at = new Date().toISOString();
    }

    const { data: deal, error } = await getSupabaseAdmin()
      .from('sales_deals')
      .update(updateData)
      .eq('id', dealId)
      .select()
      .single();

    if (error) {
      console.error('[SALES] Error updating deal:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    // Registrar mudança de stage
    if (body.stage_id && body.stage_id !== existing.stage_id) {
      await getSupabaseAdmin().from('sales_deal_activities').insert({
        deal_id: dealId,
        type: 'stage_change',
        description: 'Deal movido para nova etapa',
        metadata: { from_stage: existing.stage_id, to_stage: body.stage_id }
      });
    }

    return c.json({ success: true, data: deal });
  } catch (err) {
    console.error('[SALES] Exception updating deal:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Deleta um deal
 */
export async function deleteSalesDeal(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const dealId = c.req.param('id');

    const { error } = await getSupabaseAdmin()
      .from('sales_deals')
      .delete()
      .eq('id', dealId)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('[SALES] Error deleting deal:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, message: 'Deal deleted successfully' });
  } catch (err) {
    console.error('[SALES] Exception deleting deal:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Move deal para outro estágio (drag & drop)
 */
export async function moveSalesDeal(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const dealId = c.req.param('id');
    const { stage_id } = await c.req.json();

    if (!stage_id) {
      return c.json({ success: false, error: 'stage_id is required' }, 400);
    }

    // Buscar deal atual
    const { data: existing } = await getSupabaseAdmin()
      .from('sales_deals')
      .select('stage_id')
      .eq('id', dealId)
      .eq('organization_id', organizationId)
      .single();

    if (!existing) {
      return c.json({ success: false, error: 'Deal not found' }, 404);
    }

    // Atualizar stage
    const { data: deal, error } = await getSupabaseAdmin()
      .from('sales_deals')
      .update({ stage_id })
      .eq('id', dealId)
      .select()
      .single();

    if (error) {
      console.error('[SALES] Error moving deal:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    // Registrar atividade
    if (existing.stage_id !== stage_id) {
      await getSupabaseAdmin().from('sales_deal_activities').insert({
        deal_id: dealId,
        type: 'stage_change',
        description: 'Deal movido',
        metadata: { from_stage: existing.stage_id, to_stage: stage_id }
      });
    }

    return c.json({ success: true, data: deal });
  } catch (err) {
    console.error('[SALES] Exception moving deal:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

// =============================================================================
// ESTATÍSTICAS DE VENDAS
// =============================================================================

export async function getSalesStats(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const funnelId = c.req.query('funnel_id');

    let baseQuery = supabaseAdmin
      .from('sales_deals')
      .select('*')
      .eq('organization_id', organizationId);

    if (funnelId) {
      baseQuery = baseQuery.eq('funnel_id', funnelId);
    }

    const { data: deals } = await baseQuery;
    const allDeals = deals || [];

    const stats = {
      total: allDeals.length,
      active: allDeals.filter(d => d.status === 'active').length,
      won: allDeals.filter(d => d.status === 'won').length,
      lost: allDeals.filter(d => d.status === 'lost').length,
      totalValue: allDeals.reduce((sum, d) => sum + (parseFloat(d.value) || 0), 0),
      wonValue: allDeals.filter(d => d.status === 'won').reduce((sum, d) => sum + (parseFloat(d.value) || 0), 0),
      avgValue: allDeals.length > 0 ? allDeals.reduce((sum, d) => sum + (parseFloat(d.value) || 0), 0) / allDeals.length : 0,
      winRate: allDeals.filter(d => d.status !== 'active').length > 0
        ? (allDeals.filter(d => d.status === 'won').length / allDeals.filter(d => d.status !== 'active').length) * 100
        : 0
    };

    return c.json({ success: true, data: stats });
  } catch (err) {
    console.error('[SALES] Exception getting stats:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}
