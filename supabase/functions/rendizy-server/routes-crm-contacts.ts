/**
 * ============================================================================
 * MÓDULO: CRM CONTACTS (Contatos/Pessoas) - CRM Modular Multi-Tenant
 * ============================================================================
 * 
 * 📚 DOCUMENTAÇÃO: docs/estudos/pipedrive-vs-rendizy-data-model.md
 * 🗃️ TABELAS:      crm_contacts, crm_companies (FK)
 * 🔐 MULTI-TENANT: Filtro por organization_id em TODAS as queries
 * 
 * ROTAS EXPOSTAS:
 * - GET    /crm/contacts              → listContacts
 * - GET    /crm/contacts/search       → searchContacts (autocomplete)
 * - GET    /crm/contacts/:id          → getContact
 * - POST   /crm/contacts              → createContact
 * - PUT    /crm/contacts/:id          → updateContact
 * - DELETE /crm/contacts/:id          → deleteContact
 * - GET    /crm/contacts/:id/deals    → getContactDeals
 * - GET    /crm/contacts/:id/notes    → getContactNotes
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
// LISTAR CONTATOS
// =============================================================================

/**
 * Lista todos os contatos da organização com paginação e filtros
 */
export async function listContacts(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    // Query params
    const url = new URL(c.req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const search = url.searchParams.get('search') || '';
    const companyId = url.searchParams.get('company_id');
    const contactType = url.searchParams.get('contact_type');
    const ownerId = url.searchParams.get('owner_id');
    
    const offset = (page - 1) * limit;

    let query = getSupabaseAdmin()
      .from('crm_contacts')
      .select(`
        *,
        company:crm_companies(id, name)
      `, { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filtros
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    if (contactType) {
      query = query.eq('contact_type', contactType);
    }
    if (ownerId) {
      query = query.eq('owner_id', ownerId);
    }

    const { data: contacts, error, count } = await query;

    if (error) {
      console.error('[CRM_CONTACTS] Error listing contacts:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ 
      success: true, 
      data: contacts || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (err) {
    console.error('[CRM_CONTACTS] Exception listing contacts:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

// =============================================================================
// BUSCAR CONTATOS (AUTOCOMPLETE)
// =============================================================================

/**
 * Busca contatos para autocomplete (retorna máx. 10 resultados)
 */
export async function searchContacts(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const url = new URL(c.req.url);
    const q = url.searchParams.get('q') || '';

    if (!q || q.length < 2) {
      return c.json({ success: true, data: [] });
    }

    const { data: contacts, error } = await getSupabaseAdmin()
      .from('crm_contacts')
      .select('id, full_name, first_name, last_name, email, phone, company_id')
      .eq('organization_id', organizationId)
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(10);

    if (error) {
      console.error('[CRM_CONTACTS] Error searching contacts:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data: contacts || [] });
  } catch (err) {
    console.error('[CRM_CONTACTS] Exception searching contacts:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

// =============================================================================
// OBTER CONTATO
// =============================================================================

/**
 * Obtém um contato específico
 */
export async function getContact(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const contactId = c.req.param('id');
    
    const { data: contact, error } = await getSupabaseAdmin()
      .from('crm_contacts')
      .select(`
        *,
        company:crm_companies(id, name, cnpj, industry, phone, email)
      `)
      .eq('id', contactId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !contact) {
      return c.json({ success: false, error: 'Contact not found' }, 404);
    }

    return c.json({ success: true, data: contact });
  } catch (err) {
    console.error('[CRM_CONTACTS] Exception getting contact:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

// =============================================================================
// CRIAR CONTATO
// =============================================================================

/**
 * Cria um novo contato
 */
export async function createContact(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const body = await c.req.json();
    const {
      first_name,
      last_name,
      email,
      phone,
      mobile,
      whatsapp_jid,
      company_id,
      job_title,
      department,
      // Endereço completo
      address_street,
      address_number,
      address_complement,
      address_neighborhood,
      address_city,
      address_state,
      address_country,
      address_zip,
      // Social
      linkedin_url,
      instagram_url,
      // Classificação
      source,
      source_detail,
      labels,
      tags,
      contact_type,
      is_type_locked,
      birth_date,
      gender,
      owner_id,
      owner_name,
      visible_to,
      custom_fields,
      notes,
      // Campos de hóspede (guest)
      cpf,
      passport,
      rg,
      document_number,
      nationality,
      language,
      preferences,
      is_blacklisted,
      blacklist_reason,
      staysnet_client_id,
      staysnet_raw,
      // Campos de proprietário (owner)
      contract_type,
      contract_start_date,
      contract_end_date,
      contract_status,
      bank_data,
      taxa_comissao,
      forma_pagamento_comissao,
      is_premium,
      profissao,
      renda_mensal,
      property_ids,
    } = body;

    // Validação básica
    if (!first_name && !email && !phone) {
      return c.json({ 
        success: false, 
        error: 'At least one of first_name, email or phone is required' 
      }, 400);
    }

    const { data: contact, error } = await getSupabaseAdmin()
      .from('crm_contacts')
      .insert({
        organization_id: organizationId,
        first_name,
        last_name,
        email: email?.toLowerCase(),
        phone,
        mobile,
        whatsapp_jid,
        company_id,
        job_title,
        department,
        // Endereço
        address_street,
        address_number,
        address_complement,
        address_neighborhood,
        address_city,
        address_state,
        address_country: address_country || 'Brasil',
        address_zip,
        // Social
        linkedin_url,
        instagram_url,
        // Classificação
        source: source || 'MANUAL',
        source_detail,
        labels: labels || [],
        tags: tags || [],
        contact_type: contact_type || 'lead',
        is_type_locked: is_type_locked || false,
        birth_date,
        gender,
        owner_id,
        owner_name,
        visible_to: visible_to || 'everyone',
        custom_fields: custom_fields || {},
        notes,
        // Campos de hóspede
        cpf,
        passport,
        rg,
        document_number,
        nationality,
        language: language || 'pt-BR',
        preferences: preferences || {},
        is_blacklisted: is_blacklisted || false,
        blacklist_reason,
        staysnet_client_id,
        staysnet_raw,
        // Campos de proprietário
        contract_type,
        contract_start_date,
        contract_end_date,
        contract_status: contract_status || 'active',
        bank_data: bank_data || {},
        taxa_comissao,
        forma_pagamento_comissao,
        is_premium: is_premium || false,
        profissao,
        renda_mensal,
        property_ids: property_ids || [],
      })
      .select(`
        *,
        company:crm_companies(id, name)
      `)
      .single();

    if (error) {
      console.error('[CRM_CONTACTS] Error creating contact:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data: contact }, 201);
  } catch (err) {
    console.error('[CRM_CONTACTS] Exception creating contact:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

// =============================================================================
// ATUALIZAR CONTATO
// =============================================================================

/**
 * Atualiza um contato existente
 */
export async function updateContact(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const contactId = c.req.param('id');
    const body = await c.req.json();

    // Campos atualizáveis
    const updateData: Record<string, any> = {};
    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 'mobile', 'whatsapp_jid',
      'company_id', 'job_title', 'department',
      // Endereço
      'address_street', 'address_number', 'address_complement', 'address_neighborhood',
      'address_city', 'address_state', 'address_country', 'address_zip',
      // Social
      'linkedin_url', 'instagram_url', 'facebook_url', 'twitter_url',
      // Classificação
      'source', 'source_detail', 'labels', 'tags', 'contact_type', 'is_type_locked',
      'birth_date', 'gender', 'owner_id', 'owner_name', 'visible_to',
      'custom_fields', 'notes',
      // Campos de hóspede
      'cpf', 'passport', 'rg', 'document_number', 'nationality', 'language',
      'preferences', 'is_blacklisted', 'blacklist_reason',
      'staysnet_client_id', 'staysnet_raw',
      'stats_total_reservations', 'stats_total_nights', 'stats_total_spent',
      'stats_average_rating', 'stats_last_stay_date',
      // Campos de proprietário
      'contract_type', 'contract_start_date', 'contract_end_date', 'contract_status',
      'bank_data', 'taxa_comissao', 'forma_pagamento_comissao',
      'is_premium', 'profissao', 'renda_mensal', 'property_ids',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Normalizar email
    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase();
    }

    const { data: contact, error } = await getSupabaseAdmin()
      .from('crm_contacts')
      .update(updateData)
      .eq('id', contactId)
      .eq('organization_id', organizationId)
      .select(`
        *,
        company:crm_companies(id, name)
      `)
      .single();

    if (error) {
      console.error('[CRM_CONTACTS] Error updating contact:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    if (!contact) {
      return c.json({ success: false, error: 'Contact not found' }, 404);
    }

    return c.json({ success: true, data: contact });
  } catch (err) {
    console.error('[CRM_CONTACTS] Exception updating contact:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

// =============================================================================
// DELETAR CONTATO
// =============================================================================

/**
 * Deleta um contato
 */
export async function deleteContact(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const contactId = c.req.param('id');

    const { error } = await getSupabaseAdmin()
      .from('crm_contacts')
      .delete()
      .eq('id', contactId)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('[CRM_CONTACTS] Error deleting contact:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, message: 'Contact deleted' });
  } catch (err) {
    console.error('[CRM_CONTACTS] Exception deleting contact:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

// =============================================================================
// DEALS DO CONTATO
// =============================================================================

/**
 * Lista todos os deals de um contato
 */
export async function getContactDeals(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const contactId = c.req.param('id');

    const { data: deals, error } = await getSupabaseAdmin()
      .from('sales_deals')
      .select(`
        id, title, value, status, created_at,
        stage:sales_funnel_stages(id, name, color),
        funnel:sales_funnels(id, name)
      `)
      .eq('organization_id', organizationId)
      .eq('crm_contact_id', contactId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[CRM_CONTACTS] Error getting contact deals:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data: deals || [] });
  } catch (err) {
    console.error('[CRM_CONTACTS] Exception getting contact deals:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

// =============================================================================
// NOTAS DO CONTATO
// =============================================================================

/**
 * Lista todas as notas de um contato
 */
export async function getContactNotes(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const contactId = c.req.param('id');

    const { data: notes, error } = await getSupabaseAdmin()
      .from('crm_notes')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[CRM_CONTACTS] Error getting contact notes:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data: notes || [] });
  } catch (err) {
    console.error('[CRM_CONTACTS] Exception getting contact notes:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}
