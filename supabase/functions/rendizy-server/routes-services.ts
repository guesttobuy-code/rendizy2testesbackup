/**
 * ============================================================================
 * MÓDULO: SERVICES (Serviços) - CRM Modular Multi-Tenant
 * ============================================================================
 * 
 * 📚 DOCUMENTAÇÃO: docs/adr/ADR-001-CRM-MODULAR-ARCHITECTURE.md
 * 📝 CHANGELOG:    docs/changelogs/2026-01-26-CRM-MODULAR-MULTI-TENANT.md
 * 🗃️ TABELAS:      service_funnels, service_funnel_stages, service_tickets, service_ticket_activities
 * 🔐 MULTI-TENANT: Filtro por organization_id em TODAS as queries
 * 
 * ROTAS EXPOSTAS:
 * - GET    /crm/services/funnels          → listServiceFunnels
 * - GET    /crm/services/funnels/:id      → getServiceFunnel
 * - POST   /crm/services/funnels          → createServiceFunnel
 * - PUT    /crm/services/funnels/:id      → updateServiceFunnel
 * - DELETE /crm/services/funnels/:id      → deleteServiceFunnel
 * - GET    /crm/services/tickets          → listServiceTickets
 * - GET    /crm/services/tickets/:id      → getServiceTicket
 * - POST   /crm/services/tickets          → createServiceTicket
 * - PUT    /crm/services/tickets/:id      → updateServiceTicket
 * - DELETE /crm/services/tickets/:id      → deleteServiceTicket
 * - POST   /crm/services/tickets/:id/move → moveServiceTicket
 * - GET    /crm/services/stats            → getServiceStats
 * 
 * FRONTEND API: utils/api-crm-services.ts (crmServicesApi)
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
// FUNIS DE SERVIÇOS
// =============================================================================

/**
 * Lista todos os funis de serviços da organização
 */
export async function listServiceFunnels(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const { data: funnels, error } = await getSupabaseAdmin()
      .from('service_funnels')
      .select(`
        *,
        stages:service_funnel_stages(*)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SERVICES] Error listing funnels:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    const funnelsWithSortedStages = (funnels || []).map(funnel => ({
      ...funnel,
      stages: (funnel.stages || []).sort((a: any, b: any) => a.order - b.order)
    }));

    return c.json({ success: true, data: funnelsWithSortedStages });
  } catch (err) {
    console.error('[SERVICES] Exception listing funnels:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Obtém um funil de serviços específico
 */
export async function getServiceFunnel(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const funnelId = c.req.param('id');
    
    const { data: funnel, error } = await getSupabaseAdmin()
      .from('service_funnels')
      .select(`
        *,
        stages:service_funnel_stages(*)
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
    console.error('[SERVICES] Exception getting funnel:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Cria um novo funil de serviços
 */
export async function createServiceFunnel(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const body = await c.req.json();
    const { name, description, is_default, status_config, sla_config, stages } = body;

    if (!name) {
      return c.json({ success: false, error: 'Name is required' }, 400);
    }

    // Criar funil
    const { data: funnel, error: funnelError } = await getSupabaseAdmin()
      .from('service_funnels')
      .insert({
        organization_id: organizationId,
        name,
        description,
        is_default: is_default || false,
        status_config,
        sla_config
      })
      .select()
      .single();

    if (funnelError) {
      console.error('[SERVICES] Error creating funnel:', funnelError);
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
        is_resolved: stage.is_resolved || false
      }));

      await getSupabaseAdmin().from('service_funnel_stages').insert(stagesToInsert);
    } else {
      // Criar stages padrão
      const defaultStages = [
        { funnel_id: funnel.id, name: 'Triagem', color: '#3b82f6', order: 1, is_resolved: false },
        { funnel_id: funnel.id, name: 'Em Análise', color: '#f59e0b', order: 2, is_resolved: false },
        { funnel_id: funnel.id, name: 'Em Resolução', color: '#8b5cf6', order: 3, is_resolved: false },
        { funnel_id: funnel.id, name: 'Resolvido', color: '#10b981', order: 4, is_resolved: true }
      ];
      
      await getSupabaseAdmin().from('service_funnel_stages').insert(defaultStages);
    }

    // Buscar funil completo
    const { data: completeFunnel } = await getSupabaseAdmin()
      .from('service_funnels')
      .select(`*, stages:service_funnel_stages(*)`)
      .eq('id', funnel.id)
      .single();

    if (completeFunnel) {
      completeFunnel.stages = (completeFunnel.stages || []).sort((a: any, b: any) => a.order - b.order);
    }

    return c.json({ success: true, data: completeFunnel || funnel }, 201);
  } catch (err) {
    console.error('[SERVICES] Exception creating funnel:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Atualiza um funil de serviços
 */
export async function updateServiceFunnel(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const funnelId = c.req.param('id');
    const body = await c.req.json();
    const { name, description, is_default, status_config, sla_config, stages } = body;

    // Verificar se funil existe
    const { data: existing } = await getSupabaseAdmin()
      .from('service_funnels')
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
    if (sla_config !== undefined) updateData.sla_config = sla_config;

    await getSupabaseAdmin().from('service_funnels').update(updateData).eq('id', funnelId);

    // Atualizar stages se fornecidas
    if (stages && Array.isArray(stages)) {
      await getSupabaseAdmin().from('service_funnel_stages').delete().eq('funnel_id', funnelId);

      const stagesToInsert = stages.map((stage: any, index: number) => ({
        funnel_id: funnelId,
        name: stage.name,
        description: stage.description,
        color: stage.color || '#3b82f6',
        order: stage.order ?? (index + 1),
        is_resolved: stage.is_resolved || false
      }));

      await getSupabaseAdmin().from('service_funnel_stages').insert(stagesToInsert);
    }

    // Buscar funil atualizado
    const { data: updatedFunnel } = await getSupabaseAdmin()
      .from('service_funnels')
      .select(`*, stages:service_funnel_stages(*)`)
      .eq('id', funnelId)
      .single();

    if (updatedFunnel) {
      updatedFunnel.stages = (updatedFunnel.stages || []).sort((a: any, b: any) => a.order - b.order);
    }

    return c.json({ success: true, data: updatedFunnel });
  } catch (err) {
    console.error('[SERVICES] Exception updating funnel:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Deleta um funil de serviços
 */
export async function deleteServiceFunnel(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const funnelId = c.req.param('id');

    // Verificar se existem tickets vinculados
    const { count } = await getSupabaseAdmin()
      .from('service_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('funnel_id', funnelId);

    if (count && count > 0) {
      return c.json({ 
        success: false, 
        error: `Cannot delete funnel with ${count} active tickets. Move or delete tickets first.` 
      }, 400);
    }

    const { error } = await getSupabaseAdmin()
      .from('service_funnels')
      .delete()
      .eq('id', funnelId)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('[SERVICES] Error deleting funnel:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, message: 'Funnel deleted successfully' });
  } catch (err) {
    console.error('[SERVICES] Exception deleting funnel:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

// =============================================================================
// TICKETS (Cards de Serviços)
// =============================================================================

/**
 * Lista tickets de serviços
 */
export async function listServiceTickets(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const funnelId = c.req.query('funnel_id');
    const stageId = c.req.query('stage_id');
    const status = c.req.query('status');
    const priority = c.req.query('priority');
    const assigneeId = c.req.query('assignee_id');
    const propertyId = c.req.query('property_id');
    const limit = parseInt(c.req.query('limit') || '100');
    const offset = parseInt(c.req.query('offset') || '0');

    let query = getSupabaseAdmin()
      .from('service_tickets')
      .select(`
        *,
        stage:service_funnel_stages(id, name, color, is_resolved),
        funnel:service_funnels(id, name)
      `)
      .eq('organization_id', organizationId);

    if (funnelId) query = query.eq('funnel_id', funnelId);
    if (stageId) query = query.eq('stage_id', stageId);
    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);
    if (assigneeId) query = query.eq('assignee_id', assigneeId);
    if (propertyId) query = query.eq('property_id', propertyId);

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: tickets, error } = await query;

    if (error) {
      console.error('[SERVICES] Error listing tickets:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data: tickets || [] });
  } catch (err) {
    console.error('[SERVICES] Exception listing tickets:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Obtém um ticket específico
 */
export async function getServiceTicket(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const ticketId = c.req.param('id');

    const { data: ticket, error } = await getSupabaseAdmin()
      .from('service_tickets')
      .select(`
        *,
        stage:service_funnel_stages(id, name, color, is_resolved),
        funnel:service_funnels(id, name),
        activities:service_ticket_activities(*)
      `)
      .eq('id', ticketId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !ticket) {
      return c.json({ success: false, error: 'Ticket not found' }, 404);
    }

    ticket.activities = (ticket.activities || []).sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return c.json({ success: true, data: ticket });
  } catch (err) {
    console.error('[SERVICES] Exception getting ticket:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Cria um novo ticket
 */
export async function createServiceTicket(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const body = await c.req.json();
    const { 
      funnel_id, stage_id, title, description, priority, category,
      property_id, reservation_id, guest_id, requester_type, requester_name,
      requester_email, requester_phone, assignee_id, assignee_name,
      sla_due_at, tags, custom_fields
    } = body;

    if (!funnel_id || !stage_id || !title) {
      return c.json({ success: false, error: 'funnel_id, stage_id and title are required' }, 400);
    }

    const { data: ticket, error } = await getSupabaseAdmin()
      .from('service_tickets')
      .insert({
        organization_id: organizationId,
        funnel_id,
        stage_id,
        title,
        description,
        priority: priority || 'medium',
        category,
        property_id,
        reservation_id,
        guest_id,
        requester_type: requester_type || 'guest',
        requester_name,
        requester_email,
        requester_phone,
        assignee_id,
        assignee_name,
        sla_due_at,
        tags,
        custom_fields
      })
      .select()
      .single();

    if (error) {
      console.error('[SERVICES] Error creating ticket:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    // Registrar atividade
    await getSupabaseAdmin().from('service_ticket_activities').insert({
      ticket_id: ticket.id,
      type: 'created',
      description: 'Ticket criado'
    });

    return c.json({ success: true, data: ticket }, 201);
  } catch (err) {
    console.error('[SERVICES] Exception creating ticket:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Atualiza um ticket
 */
export async function updateServiceTicket(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const ticketId = c.req.param('id');
    const body = await c.req.json();

    const { data: existing } = await getSupabaseAdmin()
      .from('service_tickets')
      .select('*')
      .eq('id', ticketId)
      .eq('organization_id', organizationId)
      .single();

    if (!existing) {
      return c.json({ success: false, error: 'Ticket not found' }, 404);
    }

    const updateData: any = {};
    const allowedFields = [
      'stage_id', 'title', 'description', 'priority', 'category',
      'assignee_id', 'assignee_name', 'status', 'resolution_notes',
      'sla_due_at', 'tags', 'custom_fields'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Tratar resolução
    if (body.status === 'resolved' && existing.status !== 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    }

    const { data: ticket, error } = await getSupabaseAdmin()
      .from('service_tickets')
      .update(updateData)
      .eq('id', ticketId)
      .select()
      .single();

    if (error) {
      console.error('[SERVICES] Error updating ticket:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    // Registrar mudanças
    if (body.stage_id && body.stage_id !== existing.stage_id) {
      await getSupabaseAdmin().from('service_ticket_activities').insert({
        ticket_id: ticketId,
        type: 'stage_change',
        description: 'Ticket movido para nova etapa',
        metadata: { from_stage: existing.stage_id, to_stage: body.stage_id }
      });
    }

    return c.json({ success: true, data: ticket });
  } catch (err) {
    console.error('[SERVICES] Exception updating ticket:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Deleta um ticket
 */
export async function deleteServiceTicket(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const ticketId = c.req.param('id');

    const { error } = await getSupabaseAdmin()
      .from('service_tickets')
      .delete()
      .eq('id', ticketId)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('[SERVICES] Error deleting ticket:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, message: 'Ticket deleted successfully' });
  } catch (err) {
    console.error('[SERVICES] Exception deleting ticket:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Move ticket para outro estágio
 */
export async function moveServiceTicket(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const ticketId = c.req.param('id');
    const { stage_id } = await c.req.json();

    if (!stage_id) {
      return c.json({ success: false, error: 'stage_id is required' }, 400);
    }

    const { data: existing } = await getSupabaseAdmin()
      .from('service_tickets')
      .select('stage_id')
      .eq('id', ticketId)
      .eq('organization_id', organizationId)
      .single();

    if (!existing) {
      return c.json({ success: false, error: 'Ticket not found' }, 404);
    }

    // Verificar se novo estágio é de resolução
    const { data: newStage } = await getSupabaseAdmin()
      .from('service_funnel_stages')
      .select('is_resolved')
      .eq('id', stage_id)
      .single();

    const updateData: any = { stage_id };
    if (newStage?.is_resolved) {
      updateData.status = 'resolved';
      updateData.resolved_at = new Date().toISOString();
    }

    const { data: ticket, error } = await getSupabaseAdmin()
      .from('service_tickets')
      .update(updateData)
      .eq('id', ticketId)
      .select()
      .single();

    if (error) {
      console.error('[SERVICES] Error moving ticket:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    if (existing.stage_id !== stage_id) {
      await getSupabaseAdmin().from('service_ticket_activities').insert({
        ticket_id: ticketId,
        type: 'stage_change',
        description: 'Ticket movido',
        metadata: { from_stage: existing.stage_id, to_stage: stage_id }
      });
    }

    return c.json({ success: true, data: ticket });
  } catch (err) {
    console.error('[SERVICES] Exception moving ticket:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

// =============================================================================
// ESTATÍSTICAS DE SERVIÇOS
// =============================================================================

export async function getServiceStats(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const funnelId = c.req.query('funnel_id');

    let baseQuery = getSupabaseAdmin()
      .from('service_tickets')
      .select('*')
      .eq('organization_id', organizationId);

    if (funnelId) {
      baseQuery = baseQuery.eq('funnel_id', funnelId);
    }

    const { data: tickets } = await baseQuery;
    const allTickets = tickets || [];

    const now = new Date();
    const stats = {
      total: allTickets.length,
      open: allTickets.filter(t => t.status === 'open').length,
      inProgress: allTickets.filter(t => t.status === 'in_progress').length,
      resolved: allTickets.filter(t => t.status === 'resolved').length,
      closed: allTickets.filter(t => t.status === 'closed').length,
      byPriority: {
        low: allTickets.filter(t => t.priority === 'low').length,
        medium: allTickets.filter(t => t.priority === 'medium').length,
        high: allTickets.filter(t => t.priority === 'high').length,
        urgent: allTickets.filter(t => t.priority === 'urgent').length
      },
      slaBreached: allTickets.filter(t => t.sla_breached).length,
      slaDueSoon: allTickets.filter(t => {
        if (!t.sla_due_at || t.status === 'resolved' || t.status === 'closed') return false;
        const dueDate = new Date(t.sla_due_at);
        const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursUntilDue > 0 && hoursUntilDue <= 24;
      }).length
    };

    return c.json({ success: true, data: stats });
  } catch (err) {
    console.error('[SERVICES] Exception getting stats:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}
