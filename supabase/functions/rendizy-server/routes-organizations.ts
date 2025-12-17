import { Hono, Context } from 'npm:hono';
import { ensureOrganizationId } from './utils-organization.ts';
import { successResponse, errorResponse } from './utils-response.ts';
import { safeUpsert } from './utils-db-safe.ts';
import { getSupabaseClient } from './kv_store.tsx';
// ✅ REFATORADO v1.0.103.500 - Helper híbrido para organization_id (UUID)
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';
import { SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, SUPABASE_PROJECT_REF } from './utils-env.ts';

const app = new Hono();

// ✅ EXPORTAR FUNÇÕES INDIVIDUAIS para registro direto (como locationsRoutes)

// Tipos
interface Organization {
  id: string;
  slug: string;
  name: string;
  email: string;
  phone: string;
  plan: 'free' | 'basic' | 'professional' | 'enterprise';
  status: 'active' | 'trial' | 'suspended' | 'cancelled';
  trialEndsAt?: string;
  createdAt: string;
  createdBy: string;
  settings: {
    maxUsers: number;
    maxProperties: number;
    maxReservations: number;
    features: string[];
  };
  billing?: {
    mrr: number;
    billingDate: number;
    paymentMethod?: string;
  };
}

interface User {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'manager' | 'staff' | 'readonly';
  status: 'active' | 'invited' | 'suspended';
  invitedAt?: string;
  joinedAt?: string;
  createdAt: string;
  permissions?: string[];
}

// Helper: Gerar ID único
function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `${prefix}_${timestamp}${random}`;
}

// Helper: Gerar slug válido
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Helper: Validar convenção de naming
function validateSlug(slug: string): { valid: boolean; error?: string } {
  // Master: apenas "rendizy"
  if (slug === 'rendizy') {
    return { valid: false, error: 'Slug "rendizy" é reservado para a organização master' };
  }

  // Clientes: deve começar com "rendizy_"
  if (!slug.startsWith('rendizy_')) {
    return { valid: false, error: 'Slug de cliente deve começar com "rendizy_"' };
  }

  // Validar caracteres
  if (!/^rendizy_[a-z0-9_]+$/.test(slug)) {
    return { valid: false, error: 'Slug deve conter apenas letras minúsculas, números e underscore' };
  }

  return { valid: true };
}

// Helper: Obter limites do plano
function getPlanLimits(plan: string) {
  const limits: Record<string, any> = {
    free: {
      maxUsers: 2,
      maxProperties: 5,
      maxReservations: 50,
      features: ['basic_calendar', 'basic_reports']
    },
    basic: {
      maxUsers: 5,
      maxProperties: 20,
      maxReservations: 500,
      features: ['calendar', 'reports', 'integrations']
    },
    professional: {
      maxUsers: 15,
      maxProperties: 100,
      maxReservations: 5000,
      features: ['calendar', 'advanced_reports', 'integrations', 'api_access', 'custom_branding']
    },
    enterprise: {
      maxUsers: -1, // ilimitado
      maxProperties: -1,
      maxReservations: -1,
      features: ['all']
    }
  };

  return limits[plan] || limits.free;
}

// GET /organizations - Listar todas as organizações
// ✅ CORRIGIDO: Usa SQL direto ao invés de KV Store
// ✅ CORRIGIDO v2: Garantir que service_role está sendo usado e query não está sendo filtrada
export async function listOrganizations(c: Context) {
  try {
    console.log('🔍 [listOrganizations] === INICIANDO BUSCA ===');
    console.log('🔍 [listOrganizations] URL:', c.req.url);
    console.log('🔍 [listOrganizations] Path:', c.req.path);
    
    const client = getSupabaseClient();
    
    // ✅ VERIFICAÇÃO: Confirmar que está usando service_role
    const serviceRoleKey = SUPABASE_SERVICE_ROLE_KEY;
    console.log('🔍 [listOrganizations] Service Role Key presente?', serviceRoleKey ? 'SIM (primeiros 20 chars: ' + serviceRoleKey.substring(0, 20) + '...)' : 'NÃO');
    
    console.log('🔍 [listOrganizations] Client criado, fazendo query...');
    
    // ✅ CORRIGIDO: Query sem filtros, usando service_role que ignora RLS
    const { data: organizations, error } = await client
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('🔍 [listOrganizations] Query executada');
    console.log('🔍 [listOrganizations] Error:', error ? JSON.stringify(error, null, 2) : 'null');
    console.log('🔍 [listOrganizations] Data recebida:', organizations ? `${organizations.length} organizações` : 'null');
    
    // ✅ LOG DETALHADO: Mostrar IDs das organizações encontradas
    if (organizations && organizations.length > 0) {
      console.log('🔍 [listOrganizations] IDs encontrados:', organizations.map((org: any) => org.id).join(', '));
      console.log('🔍 [listOrganizations] Nomes encontrados:', organizations.map((org: any) => org.name).join(', '));
    } else {
      console.log('⚠️ [listOrganizations] NENHUMA ORGANIZAÇÃO ENCONTRADA NO BANCO');
      console.log('⚠️ [listOrganizations] Isso pode indicar:');
      console.log('   1. Não há organizações no banco');
      console.log('   2. RLS está bloqueando mesmo com service_role');
      console.log('   3. Problema com a query SQL');
    }
    
    if (error) {
      console.error('❌ Erro ao buscar organizações:', error);
      console.error('❌ Detalhes do erro:', JSON.stringify(error, null, 2));
      throw error;
    }
    
    console.log('✅ [listOrganizations] Query bem-sucedida, organizações encontradas:', organizations?.length || 0);

    // Converter formato SQL para formato esperado pelo frontend
    const formatted = (organizations || []).map((org: any) => ({
      id: org.id,
      slug: org.slug,
      name: org.name,
      email: org.email,
      phone: org.phone || '',
      plan: org.plan,
      status: org.status,
      trialEndsAt: org.trial_ends_at,
      createdAt: org.created_at,
      // Converter colunas individuais para formato esperado pelo frontend
      settings: {
        maxUsers: org.settings_max_users ?? org.limits_users ?? -1,
        maxProperties: org.settings_max_properties ?? org.limits_properties ?? -1,
        maxReservations: org.limits_reservations ?? -1,
        features: org.plan === 'enterprise' ? ['all'] : []
      },
      billing: {
        email: org.billing_email || org.email,
        cycle: org.billing_cycle || 'monthly',
        nextBillingDate: org.next_billing_date
      }
    }));

    console.log('✅ [listOrganizations] Retornando', formatted.length, 'organizações formatadas');

    return c.json({ 
      success: true, 
      data: formatted,
      total: formatted.length 
    });
  } catch (error) {
    console.error('❌ [listOrganizations] Error fetching organizations:', error);
    console.error('❌ [listOrganizations] Stack:', error instanceof Error ? error.stack : 'N/A');
    return c.json({ 
      success: false, 
      error: 'Failed to fetch organizations',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
}

// GET /organizations/:id - Obter organização por ID
// ✅ CORRIGIDO: Usa SQL direto ao invés de KV Store
export async function getOrganization(c: Context) {
  try {
    const id = c.req.param('id');
    const client = getSupabaseClient();
    
    const { data: organization, error } = await client
      .from('organizations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('❌ Erro ao buscar organização:', error);
      throw error;
    }

    if (!organization) {
      return c.json({ 
        success: false, 
        error: 'Organization not found' 
      }, 404);
    }

    // Converter formato SQL para formato esperado pelo frontend
    const formatted = {
      id: organization.id,
      slug: organization.slug,
      name: organization.name,
      email: organization.email,
      phone: organization.phone || '',
      plan: organization.plan,
      status: organization.status,
      trialEndsAt: organization.trial_ends_at,
      createdAt: organization.created_at,
      // Converter colunas individuais para formato esperado pelo frontend
      settings: {
        maxUsers: organization.settings_max_users ?? organization.limits_users ?? -1,
        maxProperties: organization.settings_max_properties ?? organization.limits_properties ?? -1,
        maxReservations: organization.limits_reservations ?? -1,
        features: organization.plan === 'enterprise' ? ['all'] : []
      },
      billing: {
        email: organization.billing_email || organization.email,
        cycle: organization.billing_cycle || 'monthly',
        nextBillingDate: organization.next_billing_date
      }
    };

    return c.json({ 
      success: true, 
      data: formatted 
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch organization' 
    }, 500);
  }
}

// GET /organizations/slug/:slug - Obter organização por slug
// ✅ CORRIGIDO: Usa SQL direto ao invés de KV Store
export async function getOrganizationBySlug(c: Context) {
  try {
    const slug = c.req.param('slug');
    const client = getSupabaseClient();
    
    const { data: organization, error } = await client
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error('❌ Erro ao buscar organização por slug:', error);
      throw error;
    }

    if (!organization) {
      return c.json({ 
        success: false, 
        error: 'Organization not found' 
      }, 404);
    }

    // Converter formato SQL para formato esperado pelo frontend
    const formatted = {
      id: organization.id,
      slug: organization.slug,
      name: organization.name,
      email: organization.email,
      phone: organization.phone || '',
      plan: organization.plan,
      status: organization.status,
      trialEndsAt: organization.trial_ends_at,
      createdAt: organization.created_at,
      // Converter colunas individuais para formato esperado pelo frontend
      settings: {
        maxUsers: organization.settings_max_users ?? organization.limits_users ?? -1,
        maxProperties: organization.settings_max_properties ?? organization.limits_properties ?? -1,
        maxReservations: organization.limits_reservations ?? -1,
        features: organization.plan === 'enterprise' ? ['all'] : []
      },
      billing: {
        email: organization.billing_email || organization.email,
        cycle: organization.billing_cycle || 'monthly',
        nextBillingDate: organization.next_billing_date
      }
    };

    return c.json({ 
      success: true, 
      data: formatted 
    });
  } catch (error) {
    console.error('Error fetching organization by slug:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch organization by slug' 
    }, 500);
  }
}

// POST /organizations - Criar nova organização
// ✅ CORRIGIDO: Usa SQL direto ao invés de KV Store (seguindo REGRA_KV_STORE_VS_SQL.md)
export async function createOrganization(c: Context) {
  try {
    console.log('🚨 [createOrganization] === FUNÇÃO CHAMADA ===');
    console.log('🚨 [createOrganization] Path:', c.req.path);
    console.log('🚨 [createOrganization] Method:', c.req.method);
    console.log('🚨 [createOrganization] URL:', c.req.url);
    console.log('📥 Recebendo requisição POST /organizations');
    
    const body = await c.req.json();
    console.log('📦 Body recebido:', JSON.stringify(body, null, 2));
    
    const { name, email, phone, plan = 'free', createdBy } = body;

    // Validações
    if (!name || !email || !createdBy) {
      console.log('❌ Validação falhou:', { name, email, createdBy });
      return c.json({ 
        success: false, 
        error: 'Name, email, and createdBy are required' 
      }, 400);
    }
    
    console.log('✅ Validação passou, criando organização...');

    // Gerar slug
    const baseSlug = `rendizy_${generateSlug(name)}`;
    let slug = baseSlug;
    let counter = 1;

    // ✅ CORRIGIDO: Verificar se slug já existe no SQL
    const client = getSupabaseClient();
    let existingOrg = await client
      .from('organizations')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle();
    
    // Se encontrou organização com esse slug, incrementar contador
    while (existingOrg.data) {
      slug = `${baseSlug}_${counter}`;
      counter++;
      existingOrg = await client
        .from('organizations')
        .select('slug')
        .eq('slug', slug)
        .maybeSingle();
    }

    // Validar slug
    const slugValidation = validateSlug(slug);
    if (!slugValidation.valid) {
      return c.json({ 
        success: false, 
        error: slugValidation.error 
      }, 400);
    }

    // Obter limites do plano
    const limits = getPlanLimits(plan);
    const now = new Date().toISOString();
    const trialEndsAt = plan === 'free' 
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() 
      : null;

    // ✅ CORRIGIDO: Criar organização no SQL usando estrutura REAL da tabela
    // A tabela usa colunas individuais, não JSONB para settings/billing
    const { data: organization, error: insertError } = await client
      .from('organizations')
      .insert({
        name,
        slug,
        email,
        phone: phone || null,
        plan,
        status: plan === 'free' ? 'trial' : 'active',
        trial_ends_at: trialEndsAt,
        is_master: false,
        // Limites do plano (usar -1 para ilimitado)
        limits_users: limits.maxUsers === -1 ? -1 : limits.maxUsers,
        limits_properties: limits.maxProperties === -1 ? -1 : limits.maxProperties,
        limits_reservations: limits.maxReservations === -1 ? -1 : limits.maxReservations,
        limits_storage: -1, // Ilimitado por padrão
        // Settings individuais
        settings_max_users: limits.maxUsers === -1 ? -1 : limits.maxUsers,
        settings_max_properties: limits.maxProperties === -1 ? -1 : limits.maxProperties,
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erro ao inserir no SQL:', insertError);
      throw new Error(insertError.message || 'Failed to create organization in database');
    }

    console.log(`✅ Organization created: ${slug} (${organization.id})`);

    // Converter formato SQL para formato esperado pelo frontend
    const responseData = {
      id: organization.id,
      slug: organization.slug,
      name: organization.name,
      email: organization.email,
      phone: organization.phone || '',
      plan: organization.plan,
      status: organization.status,
      trialEndsAt: organization.trial_ends_at,
      createdAt: organization.created_at,
      // Converter colunas individuais para formato esperado pelo frontend
      settings: {
        maxUsers: organization.settings_max_users ?? organization.limits_users ?? -1,
        maxProperties: organization.settings_max_properties ?? organization.limits_properties ?? -1,
        maxReservations: organization.limits_reservations ?? -1,
        features: organization.plan === 'enterprise' ? ['all'] : []
      },
      billing: {
        email: organization.billing_email || organization.email,
        cycle: organization.billing_cycle || 'monthly',
        nextBillingDate: organization.next_billing_date
      }
    };

    return c.json({ 
      success: true, 
      data: responseData 
    }, 201);
  } catch (error) {
    console.error('❌ Error creating organization:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create organization',
      details: error instanceof Error ? error.stack : String(error)
    }, 500);
  }
}

// PATCH /organizations/:id - Atualizar organização
// ✅ CORRIGIDO: Usa SQL direto ao invés de KV Store
export async function updateOrganization(c: Context) {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const client = getSupabaseClient();

    // Verificar se organização existe
    const { data: existing, error: fetchError } = await client
      .from('organizations')
      .select('id, slug, created_at')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('❌ Erro ao buscar organização:', fetchError);
      throw fetchError;
    }

    if (!existing) {
      return c.json({ 
        success: false, 
        error: 'Organization not found' 
      }, 404);
    }

    // Preparar dados para atualização (remover campos que não podem ser alterados)
    const updateData: any = {
      ...body,
      updated_at: new Date().toISOString()
    };
    
    // Remover campos que não podem ser alterados
    delete updateData.id;
    delete updateData.slug;
    delete updateData.created_at;

    // Atualizar no SQL
    const { data: updated, error: updateError } = await client
      .from('organizations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erro ao atualizar organização:', updateError);
      throw updateError;
    }

    console.log(`✅ Organization updated: ${updated.slug} (${id})`);

    // Converter formato SQL para formato esperado pelo frontend
    const formatted = {
      id: updated.id,
      slug: updated.slug,
      name: updated.name,
      email: updated.email,
      phone: updated.phone || '',
      plan: updated.plan,
      status: updated.status,
      trialEndsAt: updated.trial_ends_at,
      createdAt: updated.created_at,
      // Converter colunas individuais para formato esperado pelo frontend
      settings: {
        maxUsers: updated.settings_max_users ?? updated.limits_users ?? -1,
        maxProperties: updated.settings_max_properties ?? updated.limits_properties ?? -1,
        maxReservations: updated.limits_reservations ?? -1,
        features: updated.plan === 'enterprise' ? ['all'] : []
      },
      billing: {
        email: updated.billing_email || updated.email,
        cycle: updated.billing_cycle || 'monthly',
        nextBillingDate: updated.next_billing_date
      }
    };

    return c.json({ 
      success: true, 
      data: formatted 
    });
  } catch (error) {
    console.error('Error updating organization:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to update organization' 
    }, 500);
  }
}

// DELETE /organizations/:id - Deletar organização
// ✅ CORRIGIDO: Usa SQL direto ao invés de KV Store
export async function deleteOrganization(c: Context) {
  try {
    const id = c.req.param('id');
    const client = getSupabaseClient();

    // Verificar se organização existe
    const { data: organization, error: fetchError } = await client
      .from('organizations')
      .select('id, slug')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('❌ Erro ao buscar organização:', fetchError);
      throw fetchError;
    }

    if (!organization) {
      return c.json({ 
        success: false, 
        error: 'Organization not found' 
      }, 404);
    }

    // Não permitir deletar organização master
    if (organization.slug === 'rendizy') {
      return c.json({ 
        success: false, 
        error: 'Cannot delete master organization' 
      }, 403);
    }

    // Contar usuários da organização (serão deletados em cascade pela foreign key)
    const { data: users, error: usersError } = await client
      .from('users')
      .select('id')
      .eq('organization_id', id);

    if (usersError) {
      console.error('❌ Erro ao contar usuários:', usersError);
    }

    const usersCount = users?.length || 0;

    // Deletar organização (usuários serão deletados em cascade pela foreign key)
    const { error: deleteError } = await client
      .from('organizations')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('❌ Erro ao deletar organização:', deleteError);
      throw deleteError;
    }

    console.log(`✅ Organization deleted: ${organization.slug} (${id})`);
    console.log(`✅ Deleted ${usersCount} users from organization (cascade)`);

    return c.json({ 
      success: true, 
      message: 'Organization deleted successfully',
      deletedUsers: usersCount
    });
  } catch (error) {
    console.error('Error deleting organization:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to delete organization' 
    }, 500);
  }
}

// GET /organizations/:id/stats - Estatísticas da organização
// ✅ CORRIGIDO: Usa SQL direto ao invés de KV Store
export async function getOrganizationStats(c: Context) {
  try {
    const id = c.req.param('id');
    const client = getSupabaseClient();

    // Verificar se organização existe
    const { data: organization, error: orgError } = await client
      .from('organizations')
      .select('id, limits_users, limits_properties, limits_reservations, plan')
      .eq('id', id)
      .maybeSingle();

    if (orgError) {
      console.error('❌ Erro ao buscar organização:', orgError);
      throw orgError;
    }

    if (!organization) {
      return c.json({ 
        success: false, 
        error: 'Organization not found' 
      }, 404);
    }

    // Contar usuários da organização
    const { data: users, error: usersError } = await client
      .from('users')
      .select('id, status')
      .eq('organization_id', id);

    if (usersError) {
      console.error('❌ Erro ao contar usuários:', usersError);
    }

    const usersList = users || [];
    const stats = {
      users: {
        total: usersList.length,
        active: usersList.filter((u: any) => u.status === 'active').length,
        invited: usersList.filter((u: any) => u.status === 'invited').length
      },
      properties: {
        total: 0, // TODO: Buscar do banco quando tabela properties estiver em SQL
        active: 0
      },
      reservations: {
        total: 0, // TODO: Buscar do banco quando tabela reservations estiver em SQL
        thisMonth: 0
      },
      limits: {
        maxUsers: organization.limits_users ?? -1,
        maxProperties: organization.limits_properties ?? -1,
        maxReservations: organization.limits_reservations ?? -1
      }
    };

    return c.json({ 
      success: true, 
      data: stats 
    });
  } catch (error) {
    console.error('Error fetching organization stats:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch stats' 
    }, 500);
  }
}

// GET /organizations/:id/settings/global - Obter configurações globais
export async function getOrganizationSettings(c: Context) {
  // ✅ REFATORADO v1.0.103.500 - Usar helper híbrido ao invés de ensureOrganizationId
  const orgId = await getOrganizationIdOrThrow(c);
  const client = getSupabaseClient();

  const { data } = await client
    .from("organization_channel_config")
    .select("*")
    .eq("organization_id", orgId)
    .maybeSingle();

  return c.json(
    successResponse(
      data ?? {
        organization_id: orgId,
        whatsapp_enabled: false
      }
    )
  );
}

// PUT /organizations/:id/settings/global - Salvar configurações globais
export async function updateOrganizationSettings(c: Context) {
  const client = getSupabaseClient();
  // ✅ REFATORADO v1.0.103.500 - Usar helper híbrido ao invés de ensureOrganizationId
  const orgId = await getOrganizationIdOrThrow(c);
  const body = await c.req.json();

  const dbData = {
    organization_id: orgId,
    whatsapp_enabled: body.whatsapp?.enabled ?? false,
    whatsapp_api_url: body.whatsapp?.api_url ?? "",
    whatsapp_instance_name: body.whatsapp?.instance_name ?? "",
  };

  const { data, error } = await safeUpsert(
    client,
    "organization_channel_config",
    dbData,
    { onConflict: "organization_id" },
    "organization_id, whatsapp_enabled, whatsapp_api_url, whatsapp_instance_name"
  );

  if (error) return c.json(errorResponse(error.message), 500);

  return c.json(successResponse(data));
}