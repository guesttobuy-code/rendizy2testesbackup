/**
 * ============================================================================
 * MÓDULO: CRM COMPANIES (Empresas) - CRM Modular Multi-Tenant
 * ============================================================================
 * 
 * 📚 DOCUMENTAÇÃO: docs/estudos/pipedrive-vs-rendizy-data-model.md
 * 🗃️ TABELAS:      crm_companies
 * 🔐 MULTI-TENANT: Filtro por organization_id em TODAS as queries
 * 
 * ROTAS EXPOSTAS:
 * - GET    /crm/companies              → listCompanies
 * - GET    /crm/companies/search       → searchCompanies (autocomplete)
 * - GET    /crm/companies/:id          → getCompany
 * - POST   /crm/companies              → createCompany
 * - PUT    /crm/companies/:id          → updateCompany
 * - DELETE /crm/companies/:id          → deleteCompany
 * - GET    /crm/companies/:id/contacts → getCompanyContacts
 * - GET    /crm/companies/:id/deals    → getCompanyDeals
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
// LISTAR EMPRESAS
// =============================================================================

/**
 * Lista todas as empresas da organização com paginação e filtros
 */
export async function listCompanies(c: Context) {
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
    const industry = url.searchParams.get('industry');
    const companyType = url.searchParams.get('company_type');
    const ownerId = url.searchParams.get('owner_id');
    
    const offset = (page - 1) * limit;

    let query = getSupabaseAdmin()
      .from('crm_companies')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filtros
    if (search) {
      query = query.or(`name.ilike.%${search}%,trading_name.ilike.%${search}%,cnpj.ilike.%${search}%`);
    }
    if (industry) {
      query = query.eq('industry', industry);
    }
    if (companyType) {
      query = query.eq('company_type', companyType);
    }
    if (ownerId) {
      query = query.eq('owner_id', ownerId);
    }

    const { data: companies, error, count } = await query;

    if (error) {
      console.error('[CRM_COMPANIES] Error listing companies:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ 
      success: true, 
      data: companies || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (err) {
    console.error('[CRM_COMPANIES] Exception listing companies:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

// =============================================================================
// BUSCAR EMPRESAS (AUTOCOMPLETE)
// =============================================================================

/**
 * Busca empresas para autocomplete (retorna máx. 10 resultados)
 */
export async function searchCompanies(c: Context) {
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

    const { data: companies, error } = await getSupabaseAdmin()
      .from('crm_companies')
      .select('id, name, trading_name, cnpj, industry, phone')
      .eq('organization_id', organizationId)
      .or(`name.ilike.%${q}%,trading_name.ilike.%${q}%,cnpj.ilike.%${q}%`)
      .limit(10);

    if (error) {
      console.error('[CRM_COMPANIES] Error searching companies:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data: companies || [] });
  } catch (err) {
    console.error('[CRM_COMPANIES] Exception searching companies:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

// =============================================================================
// OBTER EMPRESA
// =============================================================================

/**
 * Obtém uma empresa específica
 */
export async function getCompany(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const companyId = c.req.param('id');
    
    const { data: company, error } = await getSupabaseAdmin()
      .from('crm_companies')
      .select('*')
      .eq('id', companyId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !company) {
      return c.json({ success: false, error: 'Company not found' }, 404);
    }

    return c.json({ success: true, data: company });
  } catch (err) {
    console.error('[CRM_COMPANIES] Exception getting company:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

// =============================================================================
// CRIAR EMPRESA
// =============================================================================

/**
 * Cria uma nova empresa
 */
export async function createCompany(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const body = await c.req.json();
    const {
      name,
      trading_name,
      cnpj,
      state_registration,
      address_street,
      address_number,
      address_complement,
      address_neighborhood,
      address_city,
      address_state,
      address_country,
      address_zip,
      phone,
      email,
      website,
      linkedin_url,
      instagram_url,
      facebook_url,
      industry,
      annual_revenue,
      employee_count,
      owner_id,
      owner_name,
      labels,
      company_type,
      custom_fields,
      notes
    } = body;

    // Validação básica
    if (!name) {
      return c.json({ success: false, error: 'Company name is required' }, 400);
    }

    const { data: company, error } = await getSupabaseAdmin()
      .from('crm_companies')
      .insert({
        organization_id: organizationId,
        name,
        trading_name,
        cnpj,
        state_registration,
        address_street,
        address_number,
        address_complement,
        address_neighborhood,
        address_city,
        address_state,
        address_country: address_country || 'Brasil',
        address_zip,
        phone,
        email: email?.toLowerCase(),
        website,
        linkedin_url,
        instagram_url,
        facebook_url,
        industry,
        annual_revenue,
        employee_count,
        owner_id,
        owner_name,
        labels: labels || [],
        company_type,
        custom_fields: custom_fields || {},
        notes
      })
      .select()
      .single();

    if (error) {
      console.error('[CRM_COMPANIES] Error creating company:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data: company }, 201);
  } catch (err) {
    console.error('[CRM_COMPANIES] Exception creating company:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

// =============================================================================
// ATUALIZAR EMPRESA
// =============================================================================

/**
 * Atualiza uma empresa existente
 */
export async function updateCompany(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const companyId = c.req.param('id');
    const body = await c.req.json();

    // Campos atualizáveis
    const updateData: Record<string, any> = {};
    const allowedFields = [
      'name', 'trading_name', 'cnpj', 'state_registration',
      'address_street', 'address_number', 'address_complement', 'address_neighborhood',
      'address_city', 'address_state', 'address_country', 'address_zip',
      'phone', 'email', 'website',
      'linkedin_url', 'instagram_url', 'facebook_url',
      'industry', 'annual_revenue', 'employee_count',
      'owner_id', 'owner_name', 'labels', 'company_type',
      'custom_fields', 'notes'
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

    const { data: company, error } = await getSupabaseAdmin()
      .from('crm_companies')
      .update(updateData)
      .eq('id', companyId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      console.error('[CRM_COMPANIES] Error updating company:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    if (!company) {
      return c.json({ success: false, error: 'Company not found' }, 404);
    }

    return c.json({ success: true, data: company });
  } catch (err) {
    console.error('[CRM_COMPANIES] Exception updating company:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

// =============================================================================
// DELETAR EMPRESA
// =============================================================================

/**
 * Deleta uma empresa
 */
export async function deleteCompany(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const companyId = c.req.param('id');

    const { error } = await getSupabaseAdmin()
      .from('crm_companies')
      .delete()
      .eq('id', companyId)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('[CRM_COMPANIES] Error deleting company:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, message: 'Company deleted' });
  } catch (err) {
    console.error('[CRM_COMPANIES] Exception deleting company:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

// =============================================================================
// CONTATOS DA EMPRESA
// =============================================================================

/**
 * Lista todos os contatos de uma empresa
 */
export async function getCompanyContacts(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const companyId = c.req.param('id');

    const { data: contacts, error } = await getSupabaseAdmin()
      .from('crm_contacts')
      .select('id, full_name, first_name, last_name, email, phone, job_title, department')
      .eq('organization_id', organizationId)
      .eq('company_id', companyId)
      .order('full_name', { ascending: true });

    if (error) {
      console.error('[CRM_COMPANIES] Error getting company contacts:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data: contacts || [] });
  } catch (err) {
    console.error('[CRM_COMPANIES] Exception getting company contacts:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}

// =============================================================================
// DEALS DA EMPRESA
// =============================================================================

/**
 * Lista todos os deals de uma empresa
 */
export async function getCompanyDeals(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json({ success: false, error: 'Organization not found' }, 401);
    }

    const companyId = c.req.param('id');

    const { data: deals, error } = await getSupabaseAdmin()
      .from('sales_deals')
      .select(`
        id, title, value, status, created_at,
        stage:sales_funnel_stages(id, name, color),
        funnel:sales_funnels(id, name),
        contact:crm_contacts(id, full_name)
      `)
      .eq('organization_id', organizationId)
      .eq('crm_company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[CRM_COMPANIES] Error getting company deals:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data: deals || [] });
  } catch (err) {
    console.error('[CRM_COMPANIES] Exception getting company deals:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
}
