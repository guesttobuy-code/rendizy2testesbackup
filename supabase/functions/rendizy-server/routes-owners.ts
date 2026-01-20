/**
 * RENDIZY - Backend Routes: Owners
 * Gestão de proprietários de imóveis
 * 
 * @version v1.0.103.232
 * @date 2025-11-01
 */

import { Hono } from 'npm:hono';
import { getSupabaseClient } from './kv_store.tsx';
import { tenancyMiddleware } from './utils-tenancy.ts';
import { getOrganizationIdForRequest } from './utils-multi-tenant.ts';

const app = new Hono();
app.use('*', tenancyMiddleware);

// Types
type ContractType = 'exclusivity' | 'non_exclusive' | 'temporary';
type OwnerStatus = 'active' | 'inactive';

interface Owner {
  id: string;
  name: string;
  email: string;
  phone: string;
  document: string;
  cpf?: string;
  rg?: string;
  profissao?: string;
  rendaMensal?: number;
  
  // Tipo de Contrato
  contractType: ContractType;
  contractStartDate?: string;
  contractEndDate?: string;
  
  // Dados Bancários
  bankData?: {
    banco?: string;
    agencia?: string;
    conta?: string;
    tipoConta?: 'corrente' | 'poupanca';
    chavePix?: string;
  };
  
  // Comissões
  taxaComissao?: number;
  formaPagamentoComissao?: string;
  
  // Premium
  isPremium: boolean;

  // Imóveis vinculados
  propertyIds?: string[];

  // Imóveis vinculados
  propertyIds?: string[];
  
  // Estatísticas
  stats?: {
    totalProperties?: number;
    activeProperties?: number;
    totalRevenue?: number;
  };
  
  status: OwnerStatus;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

// Helper: Validar email
function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Helper: Validar telefone
function isValidPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 10 && cleanPhone.length <= 15;
}

// Helper: Validar CPF (simplificado)
function isValidCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '');
  return cleanCPF.length === 11;
}

// Helper: Validar CNPJ (simplificado)
function isValidCNPJ(cnpj: string): boolean {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  return cleanCNPJ.length === 14;
}

// Helper: Validar documento (CPF ou CNPJ)
function isValidDocument(document: string): boolean {
  const clean = document.replace(/\D/g, '');
  return clean.length === 11 || clean.length === 14;
}

const mapRowToOwner = (row: any): Owner => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  document: row.document || '',
  cpf: row.cpf || undefined,
  rg: row.rg || undefined,
  profissao: row.profissao || undefined,
  rendaMensal: row.renda_mensal ?? undefined,
  contractType: row.contract_type,
  contractStartDate: row.contract_start_date || undefined,
  contractEndDate: row.contract_end_date || undefined,
  bankData: row.bank_data || undefined,
  taxaComissao: row.taxa_comissao ?? undefined,
  formaPagamentoComissao: row.forma_pagamento_comissao || undefined,
  isPremium: row.is_premium,
  propertyIds: row.property_ids || [],
  stats: row.stats || undefined,
  status: row.status,
  organizationId: row.organization_id || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// GET /owners - Listar todos os proprietários
app.get('/', async (c) => {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const contractType = c.req.query('contractType') as ContractType | undefined;
    const status = c.req.query('status') as OwnerStatus | undefined;
    const premium = c.req.query('premium');
    const client = getSupabaseClient();
    let query = client
      .from('owners')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (contractType) {
      query = query.eq('contract_type', contractType);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (premium !== undefined) {
      query = query.eq('is_premium', premium === 'true');
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error('❌ Error fetching owners:', error);
      return c.json({ success: false, error: 'Failed to fetch owners' }, 500);
    }

    const owners = (rows || []).map(mapRowToOwner);
    return c.json({ success: true, owners, total: owners.length });
  } catch (error) {
    console.error('❌ Error fetching owners:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch owners' 
    }, 500);
  }
});

// GET /owners/:id - Obter proprietário por ID
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const organizationId = await getOrganizationIdForRequest(c);
    const client = getSupabaseClient();
    const { data: row, error } = await client
      .from('owners')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      console.error('❌ Error fetching owner:', error);
      return c.json({ success: false, error: 'Failed to fetch owner' }, 500);
    }

    if (!row) {
      return c.json({ success: false, error: 'Owner not found' }, 404);
    }

    return c.json({ success: true, owner: mapRowToOwner(row) });
  } catch (error) {
    console.error('❌ Error fetching owner:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch owner' 
    }, 500);
  }
});

// GET /owners/email/:email - Obter proprietário por email
app.get('/email/:email', async (c) => {
  try {
    const email = c.req.param('email').toLowerCase();
    const organizationId = await getOrganizationIdForRequest(c);
    const client = getSupabaseClient();
    const { data: row, error } = await client
      .from('owners')
      .select('*')
      .eq('organization_id', organizationId)
      .ilike('email', email)
      .maybeSingle();

    if (error) {
      console.error('❌ Error fetching owner by email:', error);
      return c.json({ success: false, error: 'Failed to fetch owner' }, 500);
    }

    if (!row) {
      return c.json({ success: false, error: 'Owner not found' }, 404);
    }

    return c.json({ success: true, owner: mapRowToOwner(row) });
  } catch (error) {
    console.error('❌ Error fetching owner by email:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch owner' 
    }, 500);
  }
});

// GET /owners/document/:document - Obter proprietário por documento
app.get('/document/:document', async (c) => {
  try {
    const document = c.req.param('document');
    const organizationId = await getOrganizationIdForRequest(c);
    const client = getSupabaseClient();
    const { data: row, error } = await client
      .from('owners')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('document', document)
      .maybeSingle();

    if (error) {
      console.error('❌ Error fetching owner by document:', error);
      return c.json({ success: false, error: 'Failed to fetch owner' }, 500);
    }

    if (!row) {
      return c.json({ success: false, error: 'Owner not found' }, 404);
    }

    return c.json({ success: true, owner: mapRowToOwner(row) });
  } catch (error) {
    console.error('❌ Error fetching owner by document:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch owner' 
    }, 500);
  }
});

// POST /owners - Criar novo proprietário
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { 
      name, 
      email, 
      phone,
      document,
      cpf,
      rg,
      profissao,
      rendaMensal,
      contractType = 'non_exclusive',
      contractStartDate,
      contractEndDate,
      bankData,
      taxaComissao,
      formaPagamentoComissao,
      isPremium = false,
      status = 'active',
      organizationId,
      propertyIds
    } = body;

    // Validações básicas (somente campos obrigatórios)
    if (!name || !email || !phone) {
      return c.json({ 
        success: false, 
        error: 'Name, email and phone are required' 
      }, 400);
    }

    // Validar email
    if (!isValidEmail(email)) {
      return c.json({ 
        success: false, 
        error: 'Invalid email format' 
      }, 400);
    }

    // Validar telefone
    if (!isValidPhone(phone)) {
      return c.json({ 
        success: false, 
        error: 'Invalid phone format' 
      }, 400);
    }

    // Validar documento (se informado)
    if (document && !isValidDocument(document)) {
      return c.json({ 
        success: false, 
        error: 'Invalid document format (must be CPF or CNPJ)' 
      }, 400);
    }

    // Validar tipo de contrato
    const validContractTypes: ContractType[] = ['exclusivity', 'non_exclusive', 'temporary'];
    if (!validContractTypes.includes(contractType)) {
      return c.json({ 
        success: false, 
        error: 'Invalid contract type. Must be: exclusivity, non_exclusive, or temporary' 
      }, 400);
    }

    const orgId = organizationId || await getOrganizationIdForRequest(c);
    const client = getSupabaseClient();

    const { data: rows, error } = await client
      .from('owners')
      .upsert({
        organization_id: orgId,
        name,
        email: email.toLowerCase(),
        phone,
        document: document || null,
        cpf: cpf || null,
        rg: rg || null,
        profissao: profissao || null,
        renda_mensal: rendaMensal || null,
        contract_type: contractType,
        contract_start_date: contractStartDate || null,
        contract_end_date: contractEndDate || null,
        bank_data: bankData || {},
        taxa_comissao: taxaComissao || null,
        forma_pagamento_comissao: formaPagamentoComissao || null,
        is_premium: !!isPremium,
        status,
        // ✅ NOTA: property_ids e stats são colunas opcionais - não incluir se não existem na tabela
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id,email'
      })
      .select('*');

    let ownerRow = rows?.[0];

    if ((error || !ownerRow) && !error) {
      const { data: refetchRow, error: refetchError } = await client
        .from('owners')
        .select('*')
        .eq('organization_id', orgId)
        .ilike('email', email.toLowerCase())
        .maybeSingle();

      if (refetchError) {
        console.error('❌ Error refetching owner after upsert:', refetchError);
      }

      ownerRow = refetchRow || undefined;
    }

    if (error || !ownerRow) {
      console.error('❌ Error creating owner:', {
        error,
        hasRows: !!rows,
        rowCount: rows?.length || 0,
        organizationId: orgId,
        email: email?.toLowerCase(),
      });
      return c.json({
        success: false,
        error: 'Failed to create owner',
        details: error?.message || 'No rows returned'
      }, 500);
    }

    const owner = mapRowToOwner(ownerRow);
    console.log(`✅ Owner created: ${email} (${contractType}) - ${owner.id}`);

    return c.json({ success: true, owner }, 201);
  } catch (error) {
    console.error('❌ Error creating owner:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to create owner' 
    }, 500);
  }
});

// PUT /owners/:id - Atualizar proprietário
app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const organizationId = await getOrganizationIdForRequest(c);
    const client = getSupabaseClient();

    // Validar email se fornecido
    if (body.email && !isValidEmail(body.email)) {
      return c.json({ 
        success: false, 
        error: 'Invalid email format' 
      }, 400);
    }

    // Validar telefone se fornecido
    if (body.phone && !isValidPhone(body.phone)) {
      return c.json({ 
        success: false, 
        error: 'Invalid phone format' 
      }, 400);
    }

    // Validar documento se fornecido
    if (body.document && !isValidDocument(body.document)) {
      return c.json({ 
        success: false, 
        error: 'Invalid document format' 
      }, 400);
    }

    const updatePayload = {
      name: body.name,
      email: body.email?.toLowerCase(),
      phone: body.phone,
      document: body.document || null,
      cpf: body.cpf || null,
      rg: body.rg || null,
      profissao: body.profissao || null,
      renda_mensal: body.rendaMensal || null,
      contract_type: body.contractType,
      contract_start_date: body.contractStartDate || null,
      contract_end_date: body.contractEndDate || null,
      bank_data: body.bankData || {},
      taxa_comissao: body.taxaComissao || null,
      forma_pagamento_comissao: body.formaPagamentoComissao || null,
      is_premium: body.isPremium ?? undefined,
      status: body.status,
      property_ids: Array.isArray(body.propertyIds) ? body.propertyIds : undefined,
      updated_at: new Date().toISOString(),
    } as Record<string, any>;

    Object.keys(updatePayload).forEach((key) => updatePayload[key] === undefined && delete updatePayload[key]);

    const { data: row, error } = await client
      .from('owners')
      .update(updatePayload)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('❌ Error updating owner:', error);
      return c.json({ success: false, error: 'Failed to update owner' }, 500);
    }

    if (!row) {
      return c.json({ success: false, error: 'Owner not found' }, 404);
    }

    console.log(`✅ Owner updated: ${row.email} (${id})`);

    return c.json({ success: true, owner: mapRowToOwner(row) });
  } catch (error) {
    console.error('❌ Error updating owner:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to update owner' 
    }, 500);
  }
});

// PATCH /owners/:id - Atualizar parcialmente proprietário
app.patch('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const organizationId = await getOrganizationIdForRequest(c);
    const client = getSupabaseClient();

    const patchPayload = {
      name: body.name,
      email: body.email?.toLowerCase(),
      phone: body.phone,
      document: body.document || null,
      cpf: body.cpf || null,
      rg: body.rg || null,
      profissao: body.profissao || null,
      renda_mensal: body.rendaMensal || null,
      contract_type: body.contractType,
      contract_start_date: body.contractStartDate || null,
      contract_end_date: body.contractEndDate || null,
      bank_data: body.bankData || {},
      taxa_comissao: body.taxaComissao || null,
      forma_pagamento_comissao: body.formaPagamentoComissao || null,
      is_premium: body.isPremium ?? undefined,
      status: body.status,
      property_ids: Array.isArray(body.propertyIds) ? body.propertyIds : undefined,
      stats: body.stats,
      updated_at: new Date().toISOString(),
    } as Record<string, any>;

    Object.keys(patchPayload).forEach((key) => patchPayload[key] === undefined && delete patchPayload[key]);

    const { data: row, error } = await client
      .from('owners')
      .update(patchPayload)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('❌ Error patching owner:', error);
      return c.json({ success: false, error: 'Failed to patch owner' }, 500);
    }

    if (!row) {
      return c.json({ success: false, error: 'Owner not found' }, 404);
    }

    console.log(`✅ Owner patched: ${row.email} (${id})`);

    return c.json({ success: true, owner: mapRowToOwner(row) });
  } catch (error) {
    console.error('❌ Error patching owner:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to patch owner' 
    }, 500);
  }
});

// DELETE /owners/:id - Deletar proprietário
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const organizationId = await getOrganizationIdForRequest(c);
    const client = getSupabaseClient();

    const { data: row, error } = await client
      .from('owners')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('❌ Error deleting owner:', error);
      return c.json({ success: false, error: 'Failed to delete owner' }, 500);
    }

    if (!row) {
      return c.json({ success: false, error: 'Owner not found' }, 404);
    }

    console.log(`✅ Owner deleted: ${row.email} (${id})`);

    return c.json({ 
      success: true, 
      message: 'Owner deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Error deleting owner:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to delete owner' 
    }, 500);
  }
});

// POST /owners/:id/toggle-premium - Alternar status premium
app.post('/:id/toggle-premium', async (c) => {
  try {
    const id = c.req.param('id');
    const organizationId = await getOrganizationIdForRequest(c);
    const client = getSupabaseClient();

    const { data: row, error } = await client
      .from('owners')
      .select('id,is_premium,email')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      console.error('❌ Error toggling premium:', error);
      return c.json({ success: false, error: 'Failed to toggle premium' }, 500);
    }

    if (!row) {
      return c.json({ success: false, error: 'Owner not found' }, 404);
    }

    const { data: updatedRow, error: updateError } = await client
      .from('owners')
      .update({ is_premium: !row.is_premium, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select('*')
      .maybeSingle();

    if (updateError || !updatedRow) {
      console.error('❌ Error toggling premium:', updateError);
      return c.json({ success: false, error: 'Failed to toggle premium' }, 500);
    }

    console.log(`✅ Owner premium toggled: ${updatedRow.email} (${id}) - Premium: ${updatedRow.is_premium}`);

    return c.json({
      success: true,
      owner: mapRowToOwner(updatedRow),
      message: `Owner ${updatedRow.is_premium ? 'upgraded to' : 'downgraded from'} premium`
    });
  } catch (error) {
    console.error('❌ Error toggling premium:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to toggle premium' 
    }, 500);
  }
});

// PATCH /owners/:id/stats - Atualizar estatísticas do proprietário
app.patch('/:id/stats', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const organizationId = await getOrganizationIdForRequest(c);
    const client = getSupabaseClient();

    const { data: row, error } = await client
      .from('owners')
      .select('id,stats,email')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      console.error('❌ Error updating owner stats:', error);
      return c.json({ success: false, error: 'Failed to update owner stats' }, 500);
    }

    if (!row) {
      return c.json({ success: false, error: 'Owner not found' }, 404);
    }

    const nextStats = {
      ...(row.stats || {}),
      ...body
    };

    const { data: updatedRow, error: updateError } = await client
      .from('owners')
      .update({ stats: nextStats, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select('*')
      .maybeSingle();

    if (updateError || !updatedRow) {
      console.error('❌ Error updating owner stats:', updateError);
      return c.json({ success: false, error: 'Failed to update owner stats' }, 500);
    }

    console.log(`✅ Owner stats updated: ${updatedRow.email} (${id})`);

    return c.json({ success: true, owner: mapRowToOwner(updatedRow) });
  } catch (error) {
    console.error('❌ Error updating owner stats:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to update owner stats' 
    }, 500);
  }
});

// GET /owners/stats - Obter estatísticas gerais de proprietários
app.get('/stats', async (c) => {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const client = getSupabaseClient();
    const { data: rows, error } = await client
      .from('owners')
      .select('contract_type,status,is_premium,stats,taxa_comissao')
      .eq('organization_id', organizationId);

    if (error) {
      console.error('❌ Error fetching owner stats:', error);
      return c.json({ success: false, error: 'Failed to fetch owner stats' }, 500);
    }

    const byContractType = {
      exclusivity: 0,
      non_exclusive: 0,
      temporary: 0
    };
    const byStatus = {
      active: 0,
      inactive: 0
    };
    let premium = 0;
    let totalProperties = 0;
    let activeProperties = 0;
    let totalRevenue = 0;
    let commissionSum = 0;
    let commissionCount = 0;

    (rows || []).forEach((row: any) => {
      if (row.contract_type && row.contract_type in byContractType) {
        (byContractType as Record<string, number>)[row.contract_type] += 1;
      }

      if (row.status && row.status in byStatus) {
        (byStatus as Record<string, number>)[row.status] += 1;
      }

      if (row.is_premium) {
        premium += 1;
      }

      const rowStats = row.stats || {};
      totalProperties += rowStats.totalProperties || 0;
      activeProperties += rowStats.activeProperties || 0;
      totalRevenue += rowStats.totalRevenue || 0;

      if (row.taxa_comissao !== null && row.taxa_comissao !== undefined) {
        commissionSum += Number(row.taxa_comissao) || 0;
        commissionCount += 1;
      }
    });

    const stats = {
      total: (rows || []).length,
      byContractType,
      byStatus,
      premium,
      totalProperties,
      activeProperties,
      totalRevenue,
      averageCommission: commissionCount ? commissionSum / commissionCount : 0
    };

    return c.json({ 
      success: true, 
      stats 
    });
  } catch (error) {
    console.error('❌ Error fetching owner stats:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch owner stats' 
    }, 500);
  }
});

export default app;
