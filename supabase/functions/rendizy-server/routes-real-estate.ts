/**
 * 🏗️ REAL ESTATE MODULE - Backend Routes
 * 
 * Rotas específicas do módulo Real Estate.
 * Completamente encapsulado - pode ser removido sem afetar o Rendizy.
 * 
 * Prefixo: /rendizy-server/realestate
 */

import { Hono } from "npm:hono";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "./utils-env.ts";

// Criar app Hono para este módulo
const realEstateApp = new Hono();

// Helper para pegar cliente Supabase
function getSupabaseClient(req: Request) {
  const authHeader = req.headers.get('Authorization');
  
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
}

// Helper para extrair organization_id do usuário autenticado
async function getOrganizationId(supabase: any): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();
    
  return profile?.organization_id || null;
}

// ============================================================================
// COMPANIES (Construtoras e Imobiliárias)
// ============================================================================

// GET /realestate/companies
realEstateApp.get('/companies', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const { searchParams } = new URL(c.req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    
    let query = supabase
      .from('re_companies')
      .select('*', { count: 'exact' })
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
      
    if (type) {
      query = query.eq('type', type);
    }
    
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return c.json({ data: data || [], total: count || 0 });
  } catch (error: any) {
    console.error('[RE] Error listing companies:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /realestate/companies/:id
realEstateApp.get('/companies/:id', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    const id = c.req.param('id');
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const { data, error } = await supabase
      .from('re_companies')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();
      
    if (error) throw error;
    if (!data) return c.json({ error: 'Empresa não encontrada' }, 404);
    
    return c.json(data);
  } catch (error: any) {
    console.error('[RE] Error getting company:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /realestate/companies
realEstateApp.post('/companies', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const body = await c.req.json();
    
    const { data, error } = await supabase
      .from('re_companies')
      .insert({
        ...body,
        organization_id: orgId,
      })
      .select()
      .single();
      
    if (error) throw error;
    
    return c.json(data, 201);
  } catch (error: any) {
    console.error('[RE] Error creating company:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PUT /realestate/companies/:id
realEstateApp.put('/companies/:id', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    const id = c.req.param('id');
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const body = await c.req.json();
    delete body.id;
    delete body.organization_id;
    delete body.created_at;
    
    const { data, error } = await supabase
      .from('re_companies')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();
      
    if (error) throw error;
    if (!data) return c.json({ error: 'Empresa não encontrada' }, 404);
    
    return c.json(data);
  } catch (error: any) {
    console.error('[RE] Error updating company:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// DEVELOPMENTS (Empreendimentos)
// ============================================================================

// GET /realestate/developments
realEstateApp.get('/developments', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const { searchParams } = new URL(c.req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const companyId = searchParams.get('company_id');
    
    let query = supabase
      .from('re_developments')
      .select(`
        *,
        company:re_companies(id, name, logo_url, type)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
      
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return c.json({ data: data || [], total: count || 0 });
  } catch (error: any) {
    console.error('[RE] Error listing developments:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /realestate/developments/:id
realEstateApp.get('/developments/:id', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const id = c.req.param('id');
    
    const { data, error } = await supabase
      .from('re_developments')
      .select(`
        *,
        company:re_companies(id, name, logo_url, type)
      `)
      .eq('id', id)
      .single();
      
    if (error) throw error;
    if (!data) return c.json({ error: 'Empreendimento não encontrado' }, 404);
    
    return c.json(data);
  } catch (error: any) {
    console.error('[RE] Error getting development:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /realestate/developments
realEstateApp.post('/developments', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const body = await c.req.json();
    
    const { data, error } = await supabase
      .from('re_developments')
      .insert(body)
      .select()
      .single();
      
    if (error) throw error;
    
    return c.json(data, 201);
  } catch (error: any) {
    console.error('[RE] Error creating development:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// UNITS (Unidades)
// ============================================================================

// GET /realestate/units
realEstateApp.get('/units', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    
    const { searchParams } = new URL(c.req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const developmentId = searchParams.get('development_id');
    const status = searchParams.get('status');
    
    let query = supabase
      .from('re_units')
      .select('*', { count: 'exact' })
      .order('floor', { ascending: true })
      .order('unit_number', { ascending: true })
      .range((page - 1) * limit, page * limit - 1);
      
    if (developmentId) {
      query = query.eq('development_id', developmentId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return c.json({ data: data || [], total: count || 0 });
  } catch (error: any) {
    console.error('[RE] Error listing units:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /realestate/units/:id/status
realEstateApp.patch('/units/:id/status', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    const id = c.req.param('id');
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const { status } = await c.req.json();
    
    const { data, error } = await supabase
      .from('re_units')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    
    return c.json(data);
  } catch (error: any) {
    console.error('[RE] Error updating unit status:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// PARTNERSHIPS (Parcerias)
// ============================================================================

// GET /realestate/partnerships
realEstateApp.get('/partnerships', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const { searchParams } = new URL(c.req.url);
    const status = searchParams.get('status');
    
    let query = supabase
      .from('re_partnerships')
      .select(`
        *,
        company_a:re_companies!company_a_id(id, name, logo_url, type),
        company_b:re_companies!company_b_id(id, name, logo_url, type)
      `)
      .order('created_at', { ascending: false });
      
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return c.json({ data: data || [], total: data?.length || 0 });
  } catch (error: any) {
    console.error('[RE] Error listing partnerships:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /realestate/partnerships
realEstateApp.post('/partnerships', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const body = await c.req.json();
    
    const { data, error } = await supabase
      .from('re_partnerships')
      .insert({
        ...body,
        status: 'pending',
      })
      .select()
      .single();
      
    if (error) throw error;
    
    return c.json(data, 201);
  } catch (error: any) {
    console.error('[RE] Error creating partnership:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// RESERVATIONS (Reservas)
// ============================================================================

// GET /realestate/reservations
realEstateApp.get('/reservations', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const { data, error } = await supabase
      .from('re_reservations')
      .select(`
        *,
        unit:re_units(*),
        agency:re_companies(id, name, logo_url)
      `)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return c.json({ data: data || [], total: data?.length || 0 });
  } catch (error: any) {
    console.error('[RE] Error listing reservations:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /realestate/reservations
realEstateApp.post('/reservations', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const body = await c.req.json();
    
    // Verificar se unidade está disponível
    const { data: unit } = await supabase
      .from('re_units')
      .select('status')
      .eq('id', body.unit_id)
      .single();
      
    if (unit?.status !== 'available') {
      return c.json({ error: 'Unidade não está disponível' }, 400);
    }
    
    // Criar reserva
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // 48h para pagar sinal
    
    const { data, error } = await supabase
      .from('re_reservations')
      .insert({
        ...body,
        signal_status: 'pending',
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();
      
    if (error) throw error;
    
    // Atualizar status da unidade
    await supabase
      .from('re_units')
      .update({ 
        status: 'reserved',
        reserved_at: new Date().toISOString(),
        reservation_expires_at: expiresAt.toISOString(),
      })
      .eq('id', body.unit_id);
    
    return c.json(data, 201);
  } catch (error: any) {
    console.error('[RE] Error creating reservation:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// DEMANDS (Demandas)
// ============================================================================

// GET /realestate/demands
realEstateApp.get('/demands', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    
    const { searchParams } = new URL(c.req.url);
    const status = searchParams.get('status');
    const urgency = searchParams.get('urgency');
    
    let query = supabase
      .from('re_demands')
      .select(`
        *,
        agency:re_companies(id, name, logo_url)
      `)
      .order('created_at', { ascending: false });
      
    if (status) {
      query = query.eq('status', status);
    }
    
    if (urgency) {
      query = query.eq('urgency', urgency);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return c.json({ data: data || [], total: data?.length || 0 });
  } catch (error: any) {
    console.error('[RE] Error listing demands:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /realestate/demands
realEstateApp.post('/demands', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const body = await c.req.json();
    
    const { data, error } = await supabase
      .from('re_demands')
      .insert({
        ...body,
        status: 'open',
      })
      .select()
      .single();
      
    if (error) throw error;
    
    return c.json(data, 201);
  } catch (error: any) {
    console.error('[RE] Error creating demand:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// BROKERS (Corretores)
// ============================================================================

// GET /realestate/brokers
realEstateApp.get('/brokers', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const { searchParams } = new URL(c.req.url);
    const available = searchParams.get('available');
    
    let query = supabase
      .from('re_brokers')
      .select('*', { count: 'exact' })
      .eq('organization_id', orgId)
      .order('rating', { ascending: false });
      
    if (available !== null) {
      query = query.eq('available', available === 'true');
    }
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return c.json({ data: data || [], total: count || 0 });
  } catch (error: any) {
    console.error('[RE] Error listing brokers:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /realestate/brokers
realEstateApp.post('/brokers', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const body = await c.req.json();
    
    const { data, error } = await supabase
      .from('re_brokers')
      .insert({
        ...body,
        organization_id: orgId,
      })
      .select()
      .single();
      
    if (error) throw error;
    
    return c.json(data, 201);
  } catch (error: any) {
    console.error('[RE] Error creating broker:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /realestate/brokers/:id
realEstateApp.get('/brokers/:id', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    const id = c.req.param('id');
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const { data, error } = await supabase
      .from('re_brokers')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();
      
    if (error) throw error;
    if (!data) return c.json({ error: 'Corretor não encontrado' }, 404);
    
    return c.json(data);
  } catch (error: any) {
    console.error('[RE] Error getting broker:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PUT /realestate/brokers/:id
realEstateApp.put('/brokers/:id', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    const id = c.req.param('id');
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const body = await c.req.json();
    delete body.id;
    delete body.organization_id;
    delete body.created_at;
    
    const { data, error } = await supabase
      .from('re_brokers')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();
      
    if (error) throw error;
    if (!data) return c.json({ error: 'Corretor não encontrado' }, 404);
    
    return c.json(data);
  } catch (error: any) {
    console.error('[RE] Error updating broker:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /realestate/brokers/:id/availability
realEstateApp.patch('/brokers/:id/availability', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    const id = c.req.param('id');
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const { available } = await c.req.json();
    
    const { data, error } = await supabase
      .from('re_brokers')
      .update({
        available,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();
      
    if (error) throw error;
    
    return c.json(data);
  } catch (error: any) {
    console.error('[RE] Error updating broker availability:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// DEVELOPMENTS - Endpoints adicionais
// ============================================================================

// PUT /realestate/developments/:id
realEstateApp.put('/developments/:id', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    const id = c.req.param('id');
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const body = await c.req.json();
    delete body.id;
    delete body.company_id;
    delete body.created_at;
    
    const { data, error } = await supabase
      .from('re_developments')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    if (!data) return c.json({ error: 'Empreendimento não encontrado' }, 404);
    
    return c.json(data);
  } catch (error: any) {
    console.error('[RE] Error updating development:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// UNITS - Endpoints adicionais
// ============================================================================

// GET /realestate/units/:id
realEstateApp.get('/units/:id', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const id = c.req.param('id');
    
    const { data, error } = await supabase
      .from('re_units')
      .select(`
        *,
        development:re_developments(id, name, company_id)
      `)
      .eq('id', id)
      .single();
      
    if (error) throw error;
    if (!data) return c.json({ error: 'Unidade não encontrada' }, 404);
    
    return c.json(data);
  } catch (error: any) {
    console.error('[RE] Error getting unit:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /realestate/units
realEstateApp.post('/units', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const body = await c.req.json();
    
    const { data, error } = await supabase
      .from('re_units')
      .insert({
        ...body,
        status: body.status || 'available',
      })
      .select()
      .single();
      
    if (error) throw error;
    
    return c.json(data, 201);
  } catch (error: any) {
    console.error('[RE] Error creating unit:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PUT /realestate/units/:id
realEstateApp.put('/units/:id', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    const id = c.req.param('id');
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const body = await c.req.json();
    delete body.id;
    delete body.development_id;
    delete body.created_at;
    
    const { data, error } = await supabase
      .from('re_units')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    if (!data) return c.json({ error: 'Unidade não encontrada' }, 404);
    
    return c.json(data);
  } catch (error: any) {
    console.error('[RE] Error updating unit:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /realestate/units/bulk - Importar múltiplas unidades
realEstateApp.post('/units/bulk', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const { development_id, units } = await c.req.json();
    
    if (!development_id || !units || !Array.isArray(units)) {
      return c.json({ error: 'development_id e units[] são obrigatórios' }, 400);
    }
    
    // Preparar unidades com development_id
    const unitsToInsert = units.map((unit: any) => ({
      ...unit,
      development_id,
      status: unit.status || 'available',
    }));
    
    const { data, error } = await supabase
      .from('re_units')
      .insert(unitsToInsert)
      .select();
      
    if (error) throw error;
    
    // Atualizar contadores do empreendimento
    const { count: totalCount } = await supabase
      .from('re_units')
      .select('*', { count: 'exact', head: true })
      .eq('development_id', development_id);
      
    const { count: availableCount } = await supabase
      .from('re_units')
      .select('*', { count: 'exact', head: true })
      .eq('development_id', development_id)
      .eq('status', 'available');
    
    // Calcular percentual vendido
    const soldCount = (totalCount || 0) - (availableCount || 0);
    const soldPercentage = totalCount ? (soldCount / totalCount) * 100 : 0;
    
    await supabase
      .from('re_developments')
      .update({
        total_units: totalCount,
        available_units: availableCount,
        sold_percentage: Math.round(soldPercentage * 10) / 10,
        updated_at: new Date().toISOString(),
      })
      .eq('id', development_id);
    
    return c.json({ 
      data: data || [], 
      imported: data?.length || 0,
      total_units: totalCount,
      available_units: availableCount,
    }, 201);
  } catch (error: any) {
    console.error('[RE] Error bulk importing units:', error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /realestate/units/:id
realEstateApp.delete('/units/:id', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    const id = c.req.param('id');
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    // Buscar unidade para pegar development_id
    const { data: unit } = await supabase
      .from('re_units')
      .select('development_id')
      .eq('id', id)
      .single();
    
    const { error } = await supabase
      .from('re_units')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    
    // Atualizar contadores se tinha development_id
    if (unit?.development_id) {
      const { count: totalCount } = await supabase
        .from('re_units')
        .select('*', { count: 'exact', head: true })
        .eq('development_id', unit.development_id);
        
      const { count: availableCount } = await supabase
        .from('re_units')
        .select('*', { count: 'exact', head: true })
        .eq('development_id', unit.development_id)
        .eq('status', 'available');
      
      await supabase
        .from('re_developments')
        .update({
          total_units: totalCount || 0,
          available_units: availableCount || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', unit.development_id);
    }
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('[RE] Error deleting unit:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// PARTNERSHIPS - Endpoints adicionais
// ============================================================================

// GET /realestate/partnerships/:id
realEstateApp.get('/partnerships/:id', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const id = c.req.param('id');
    
    const { data, error } = await supabase
      .from('re_partnerships')
      .select(`
        *,
        company_a:re_companies!company_a_id(id, name, logo_url, type),
        company_b:re_companies!company_b_id(id, name, logo_url, type)
      `)
      .eq('id', id)
      .single();
      
    if (error) throw error;
    if (!data) return c.json({ error: 'Parceria não encontrada' }, 404);
    
    return c.json(data);
  } catch (error: any) {
    console.error('[RE] Error getting partnership:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /realestate/partnerships/:id/status
realEstateApp.patch('/partnerships/:id/status', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    const id = c.req.param('id');
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const { status, rejection_reason } = await c.req.json();
    
    if (!['approved', 'rejected', 'cancelled'].includes(status)) {
      return c.json({ error: 'Status inválido' }, 400);
    }
    
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };
    
    if (status === 'approved') {
      updateData.approved_at = new Date().toISOString();
    } else if (status === 'rejected' && rejection_reason) {
      updateData.rejection_reason = rejection_reason;
    }
    
    const { data, error } = await supabase
      .from('re_partnerships')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    
    return c.json(data);
  } catch (error: any) {
    console.error('[RE] Error updating partnership status:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// RESERVATIONS - Endpoints adicionais
// ============================================================================

// GET /realestate/reservations/:id
realEstateApp.get('/reservations/:id', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const id = c.req.param('id');
    
    const { data, error } = await supabase
      .from('re_reservations')
      .select(`
        *,
        unit:re_units(*),
        agency:re_companies(id, name, logo_url)
      `)
      .eq('id', id)
      .single();
      
    if (error) throw error;
    if (!data) return c.json({ error: 'Reserva não encontrada' }, 404);
    
    return c.json(data);
  } catch (error: any) {
    console.error('[RE] Error getting reservation:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /realestate/reservations/:id/cancel
realEstateApp.patch('/reservations/:id/cancel', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    const id = c.req.param('id');
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const { reason } = await c.req.json();
    
    // Buscar reserva para pegar unit_id
    const { data: reservation } = await supabase
      .from('re_reservations')
      .select('unit_id')
      .eq('id', id)
      .single();
    
    // Atualizar reserva
    const { data, error } = await supabase
      .from('re_reservations')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    
    // Liberar unidade
    if (reservation?.unit_id) {
      await supabase
        .from('re_units')
        .update({
          status: 'available',
          reserved_by: null,
          reserved_at: null,
          reservation_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reservation.unit_id);
    }
    
    return c.json(data);
  } catch (error: any) {
    console.error('[RE] Error cancelling reservation:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /realestate/reservations/:id/confirm
realEstateApp.patch('/reservations/:id/confirm', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    const id = c.req.param('id');
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const { signal_amount, signal_proof_url } = await c.req.json();
    
    // Buscar reserva para pegar unit_id
    const { data: reservation } = await supabase
      .from('re_reservations')
      .select('unit_id')
      .eq('id', id)
      .single();
    
    // Atualizar reserva
    const { data, error } = await supabase
      .from('re_reservations')
      .update({
        status: 'confirmed',
        signal_status: 'paid',
        signal_amount,
        signal_proof_url,
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    
    // Marcar unidade como vendida
    if (reservation?.unit_id) {
      await supabase
        .from('re_units')
        .update({
          status: 'sold',
          updated_at: new Date().toISOString(),
        })
        .eq('id', reservation.unit_id);
    }
    
    return c.json(data);
  } catch (error: any) {
    console.error('[RE] Error confirming reservation:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /realestate/reservations/:id/extend
realEstateApp.post('/reservations/:id/extend', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    const id = c.req.param('id');
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const { hours = 24 } = await c.req.json();
    
    // Buscar reserva atual
    const { data: reservation } = await supabase
      .from('re_reservations')
      .select('expires_at, unit_id')
      .eq('id', id)
      .single();
    
    if (!reservation) {
      return c.json({ error: 'Reserva não encontrada' }, 404);
    }
    
    const currentExpiry = new Date(reservation.expires_at);
    const newExpiry = new Date(currentExpiry.getTime() + hours * 60 * 60 * 1000);
    
    // Atualizar reserva
    const { data, error } = await supabase
      .from('re_reservations')
      .update({
        expires_at: newExpiry.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    
    // Atualizar unidade também
    if (reservation.unit_id) {
      await supabase
        .from('re_units')
        .update({
          reservation_expires_at: newExpiry.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reservation.unit_id);
    }
    
    return c.json(data);
  } catch (error: any) {
    console.error('[RE] Error extending reservation:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// DEMANDS - Endpoints adicionais
// ============================================================================

// GET /realestate/demands/:id
realEstateApp.get('/demands/:id', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const id = c.req.param('id');
    
    const { data, error } = await supabase
      .from('re_demands')
      .select(`
        *,
        agency:re_companies(id, name, logo_url)
      `)
      .eq('id', id)
      .single();
      
    if (error) throw error;
    if (!data) return c.json({ error: 'Demanda não encontrada' }, 404);
    
    return c.json(data);
  } catch (error: any) {
    console.error('[RE] Error getting demand:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PUT /realestate/demands/:id
realEstateApp.put('/demands/:id', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    const id = c.req.param('id');
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const body = await c.req.json();
    delete body.id;
    delete body.agency_id;
    delete body.created_at;
    
    const { data, error } = await supabase
      .from('re_demands')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    if (!data) return c.json({ error: 'Demanda não encontrada' }, 404);
    
    return c.json(data);
  } catch (error: any) {
    console.error('[RE] Error updating demand:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /realestate/demands/:id/close
realEstateApp.patch('/demands/:id/close', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    const id = c.req.param('id');
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const { reason, matched_unit_id } = await c.req.json();
    
    const { data, error } = await supabase
      .from('re_demands')
      .update({
        status: 'closed',
        closed_reason: reason,
        matched_unit_id,
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    
    return c.json(data);
  } catch (error: any) {
    console.error('[RE] Error closing demand:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /realestate/demands/:id/interest
realEstateApp.post('/demands/:id/interest', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    const id = c.req.param('id');
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const { company_id, development_id, message } = await c.req.json();
    
    // Buscar demanda atual
    const { data: demand } = await supabase
      .from('re_demands')
      .select('interested_companies')
      .eq('id', id)
      .single();
    
    if (!demand) {
      return c.json({ error: 'Demanda não encontrada' }, 404);
    }
    
    // Adicionar interesse
    const interests = demand.interested_companies || [];
    interests.push({
      company_id,
      development_id,
      message,
      expressed_at: new Date().toISOString(),
    });
    
    const { data, error } = await supabase
      .from('re_demands')
      .update({
        interested_companies: interests,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    
    return c.json(data);
  } catch (error: any) {
    console.error('[RE] Error expressing interest:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// MESSAGES (Chat entre parceiros)
// ============================================================================

// GET /realestate/messages/:partnership_id
realEstateApp.get('/messages/:partnership_id', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    const partnershipId = c.req.param('partnership_id');
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const { data, error } = await supabase
      .from('re_messages')
      .select('*')
      .eq('partnership_id', partnershipId)
      .order('created_at', { ascending: true });
      
    if (error) throw error;
    
    return c.json({ data: data || [] });
  } catch (error: any) {
    console.error('[RE] Error listing messages:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /realestate/messages
realEstateApp.post('/messages', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const body = await c.req.json();
    
    const { data, error } = await supabase
      .from('re_messages')
      .insert({
        ...body,
        read: false,
      })
      .select()
      .single();
      
    if (error) throw error;
    
    return c.json(data, 201);
  } catch (error: any) {
    console.error('[RE] Error creating message:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /realestate/messages/:id/read
realEstateApp.patch('/messages/:id/read', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const id = c.req.param('id');
    
    const { data, error } = await supabase
      .from('re_messages')
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    
    return c.json(data);
  } catch (error: any) {
    console.error('[RE] Error marking message as read:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// TRANSACTIONS (Financeiro)
// ============================================================================

// GET /realestate/transactions
realEstateApp.get('/transactions', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const { searchParams } = new URL(c.req.url);
    const status = searchParams.get('status');
    
    let query = supabase
      .from('re_transactions')
      .select(`
        *,
        reservation:re_reservations(id, client_name),
        unit:re_units(id, unit_number)
      `)
      .order('created_at', { ascending: false });
      
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return c.json({ data: data || [] });
  } catch (error: any) {
    console.error('[RE] Error listing transactions:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /realestate/transactions
realEstateApp.post('/transactions', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    const body = await c.req.json();
    
    const { data, error } = await supabase
      .from('re_transactions')
      .insert({
        ...body,
        status: 'pending',
      })
      .select()
      .single();
      
    if (error) throw error;
    
    return c.json(data, 201);
  } catch (error: any) {
    console.error('[RE] Error creating transaction:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /realestate/transactions/stats
realEstateApp.get('/transactions/stats', async (c) => {
  try {
    const supabase = getSupabaseClient(c.req.raw);
    const orgId = await getOrganizationId(supabase);
    
    if (!orgId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }
    
    // Buscar todas as transações para calcular stats
    const { data: transactions } = await supabase
      .from('re_transactions')
      .select('amount, commission_amount, status');
    
    const stats = {
      total_transactions: transactions?.length || 0,
      total_volume: 0,
      total_commission: 0,
      pending_commission: 0,
      paid_commission: 0,
    };
    
    transactions?.forEach((t: any) => {
      stats.total_volume += t.amount || 0;
      stats.total_commission += t.commission_amount || 0;
      if (t.status === 'pending') {
        stats.pending_commission += t.commission_amount || 0;
      } else if (t.status === 'paid') {
        stats.paid_commission += t.commission_amount || 0;
      }
    });
    
    return c.json(stats);
  } catch (error: any) {
    console.error('[RE] Error getting transaction stats:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

realEstateApp.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    module: 'real-estate',
    version: '2.0.0',
    endpoints: 45,
    timestamp: new Date().toISOString()
  });
});

// Exportar o app
export { realEstateApp as realEstateRoutes };
export default realEstateApp;
