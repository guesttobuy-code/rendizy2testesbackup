/**
 * ============================================================================
 * MÓDULO: CRM NOTES (Observações/Notas) - CRM Modular Multi-Tenant
 * ============================================================================
 * 
 * 📚 DOCUMENTAÇÃO: docs/estudos/pipedrive-vs-rendizy-data-model.md
 * 🗃️ TABELAS:      crm_notes
 * 🔐 MULTI-TENANT: Filtro por organization_id em TODAS as queries
 * 
 * ROTAS EXPOSTAS:
 * - GET    /crm/notes              → listNotes
 * - GET    /crm/notes/:id          → getNote
 * - POST   /crm/notes              → createNote
 * - PUT    /crm/notes/:id          → updateNote
 * - DELETE /crm/notes/:id          → deleteNote
 * 
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
// LISTAR NOTAS
// =============================================================================

/**
 * Lista notas com filtros por entidade (deal, contact, company, task)
 */
export async function listNotes(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    // Query params
    const url = new URL(c.req.url);
    const dealId = url.searchParams.get('deal_id');
    const contactId = url.searchParams.get('contact_id');
    const companyId = url.searchParams.get('company_id');
    const taskId = url.searchParams.get('task_id');
    const ticketId = url.searchParams.get('ticket_id');
    const noteType = url.searchParams.get('note_type');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    let query = getSupabaseAdmin()
      .from('crm_notes')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filtros - pelo menos um deve ser fornecido
    if (dealId) query = query.eq('deal_id', dealId);
    if (contactId) query = query.eq('contact_id', contactId);
    if (companyId) query = query.eq('company_id', companyId);
    if (taskId) query = query.eq('task_id', taskId);
    if (ticketId) query = query.eq('ticket_id', ticketId);
    if (noteType) query = query.eq('note_type', noteType);

    const { data: notes, error } = await query;

    if (error) {
      console.error('[CRM_NOTES] Error listing notes:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data: notes || [] });
  } catch (err) {
    console.error('[CRM_NOTES] Exception listing notes:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

// =============================================================================
// OBTER NOTA
// =============================================================================

/**
 * Obtém uma nota específica
 */
export async function getNote(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const noteId = c.req.param('id');
    
    const { data: note, error } = await getSupabaseAdmin()
      .from('crm_notes')
      .select('*')
      .eq('id', noteId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !note) {
      return c.json({ success: false, error: 'Note not found' }, 404);
    }

    return c.json({ success: true, data: note });
  } catch (err) {
    console.error('[CRM_NOTES] Exception getting note:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

// =============================================================================
// CRIAR NOTA
// =============================================================================

/**
 * Cria uma nova nota
 */
export async function createNote(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const body = await c.req.json();
    const {
      content,
      deal_id,
      contact_id,
      company_id,
      task_id,
      ticket_id,
      note_type,
      created_by,
      created_by_name
    } = body;

    // Validação básica
    if (!content) {
      return c.json({ success: false, error: 'Note content is required' }, 400);
    }

    // Deve ter pelo menos um vínculo
    if (!deal_id && !contact_id && !company_id && !task_id && !ticket_id) {
      return c.json({ 
        success: false, 
        error: 'Note must be linked to at least one entity (deal, contact, company, task or ticket)' 
      }, 400);
    }

    const { data: note, error } = await getSupabaseAdmin()
      .from('crm_notes')
      .insert({
        organization_id: organizationId,
        content,
        deal_id,
        contact_id,
        company_id,
        task_id,
        ticket_id,
        note_type: note_type || 'general',
        created_by,
        created_by_name
      })
      .select()
      .single();

    if (error) {
      console.error('[CRM_NOTES] Error creating note:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data: note }, 201);
  } catch (err) {
    console.error('[CRM_NOTES] Exception creating note:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

// =============================================================================
// ATUALIZAR NOTA
// =============================================================================

/**
 * Atualiza uma nota existente
 */
export async function updateNote(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const noteId = c.req.param('id');
    const body = await c.req.json();

    // Apenas content e note_type podem ser atualizados
    const updateData: Record<string, any> = {};
    if (body.content !== undefined) updateData.content = body.content;
    if (body.note_type !== undefined) updateData.note_type = body.note_type;

    if (Object.keys(updateData).length === 0) {
      return c.json({ success: false, error: 'No fields to update' }, 400);
    }

    const { data: note, error } = await getSupabaseAdmin()
      .from('crm_notes')
      .update(updateData)
      .eq('id', noteId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      console.error('[CRM_NOTES] Error updating note:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    if (!note) {
      return c.json({ success: false, error: 'Note not found' }, 404);
    }

    return c.json({ success: true, data: note });
  } catch (err) {
    console.error('[CRM_NOTES] Exception updating note:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

// =============================================================================
// DELETAR NOTA
// =============================================================================

/**
 * Deleta uma nota
 */
export async function deleteNote(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const noteId = c.req.param('id');

    const { error } = await getSupabaseAdmin()
      .from('crm_notes')
      .delete()
      .eq('id', noteId)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('[CRM_NOTES] Error deleting note:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, message: 'Note deleted' });
  } catch (err) {
    console.error('[CRM_NOTES] Exception deleting note:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}
