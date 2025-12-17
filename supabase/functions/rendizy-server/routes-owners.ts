/**
 * RENDIZY - Backend Routes: Owners
 * Gestão de proprietários de imóveis
 * 
 * @version v1.0.103.232
 * @date 2025-11-01
 */

import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const app = new Hono();

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

// Helper: Gerar ID único
function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `${prefix}_${timestamp}${random}`;
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

// GET /owners - Listar todos os proprietários
app.get('/', async (c) => {
  try {
    const organizationId = c.req.query('organizationId');
    const contractType = c.req.query('contractType') as ContractType | undefined;
    const status = c.req.query('status') as OwnerStatus | undefined;
    const premium = c.req.query('premium');
    
    let owners = await kv.getByPrefix('owner:');

    // Filtrar por organização se fornecido
    if (organizationId) {
      owners = owners.filter((owner: Owner) => owner.organizationId === organizationId);
    }

    // Filtrar por tipo de contrato se fornecido
    if (contractType) {
      owners = owners.filter((owner: Owner) => owner.contractType === contractType);
    }

    // Filtrar por status se fornecido
    if (status) {
      owners = owners.filter((owner: Owner) => owner.status === status);
    }

    // Filtrar por premium se fornecido
    if (premium !== undefined) {
      const isPremiumFilter = premium === 'true';
      owners = owners.filter((owner: Owner) => owner.isPremium === isPremiumFilter);
    }

    // Ordenar por data de criação (mais recentes primeiro)
    const sorted = owners.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return c.json({ 
      success: true, 
      owners: sorted,
      total: sorted.length 
    });
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
    const owner = await kv.get(`owner:${id}`);

    if (!owner) {
      return c.json({ 
        success: false, 
        error: 'Owner not found' 
      }, 404);
    }

    return c.json({ 
      success: true, 
      owner 
    });
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
    const owners = await kv.getByPrefix('owner:');
    const owner = owners.find((o: Owner) => o.email.toLowerCase() === email);

    if (!owner) {
      return c.json({ 
        success: false, 
        error: 'Owner not found' 
      }, 404);
    }

    return c.json({ 
      success: true, 
      owner 
    });
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
    const owners = await kv.getByPrefix('owner:');
    const owner = owners.find((o: Owner) => o.document === document);

    if (!owner) {
      return c.json({ 
        success: false, 
        error: 'Owner not found' 
      }, 404);
    }

    return c.json({ 
      success: true, 
      owner 
    });
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
      organizationId
    } = body;

    // Validações básicas
    if (!name || !email || !phone || !document) {
      return c.json({ 
        success: false, 
        error: 'Name, email, phone and document are required' 
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

    // Validar documento
    if (!isValidDocument(document)) {
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

    // Verificar se email já existe
    const existingOwners = await kv.getByPrefix('owner:');
    const emailExists = existingOwners.some((o: Owner) => 
      o.email.toLowerCase() === email.toLowerCase() &&
      (!organizationId || o.organizationId === organizationId)
    );

    if (emailExists) {
      return c.json({ 
        success: false, 
        error: 'Owner with this email already exists' 
      }, 409);
    }

    // Verificar se documento já existe
    const documentExists = existingOwners.some((o: Owner) => 
      o.document === document &&
      (!organizationId || o.organizationId === organizationId)
    );

    if (documentExists) {
      return c.json({ 
        success: false, 
        error: 'Owner with this document already exists' 
      }, 409);
    }

    // Criar proprietário
    const id = generateId('owner');
    const now = new Date().toISOString();

    const owner: Owner = {
      id,
      name,
      email: email.toLowerCase(),
      phone,
      document,
      cpf,
      rg,
      profissao,
      rendaMensal,
      contractType,
      contractStartDate,
      contractEndDate,
      bankData,
      taxaComissao,
      formaPagamentoComissao,
      isPremium,
      status,
      createdAt: now,
      updatedAt: now
    };

    // Adicionar organizationId se fornecido
    if (organizationId) {
      owner.organizationId = organizationId;
    }

    // Inicializar stats
    owner.stats = {
      totalProperties: 0,
      activeProperties: 0,
      totalRevenue: 0
    };

    // Salvar no KV store
    await kv.set(`owner:${id}`, owner);

    console.log(`✅ Owner created: ${email} (${contractType}) - ${id}`);

    return c.json({ 
      success: true, 
      owner 
    }, 201);
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

    const owner = await kv.get(`owner:${id}`);
    if (!owner) {
      return c.json({ 
        success: false, 
        error: 'Owner not found' 
      }, 404);
    }

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

    // Atualizar campos permitidos
    const updated: Owner = {
      ...owner,
      ...body,
      id: owner.id, // Não permitir mudar ID
      createdAt: owner.createdAt, // Não permitir mudar data de criação
      updatedAt: new Date().toISOString()
    };

    await kv.set(`owner:${id}`, updated);

    console.log(`✅ Owner updated: ${updated.email} (${id})`);

    return c.json({ 
      success: true, 
      owner: updated 
    });
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

    const owner = await kv.get(`owner:${id}`);
    if (!owner) {
      return c.json({ 
        success: false, 
        error: 'Owner not found' 
      }, 404);
    }

    // Atualizar apenas campos fornecidos
    const updated: Owner = {
      ...owner,
      ...body,
      id: owner.id,
      createdAt: owner.createdAt,
      updatedAt: new Date().toISOString()
    };

    await kv.set(`owner:${id}`, updated);

    console.log(`✅ Owner patched: ${updated.email} (${id})`);

    return c.json({ 
      success: true, 
      owner: updated 
    });
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

    const owner = await kv.get(`owner:${id}`);
    if (!owner) {
      return c.json({ 
        success: false, 
        error: 'Owner not found' 
      }, 404);
    }

    // Verificar se proprietário tem imóveis associados
    const properties = await kv.getByPrefix('property:');
    const hasProperties = properties.some((p: any) => p.ownerId === id);

    if (hasProperties) {
      return c.json({ 
        success: false, 
        error: 'Cannot delete owner with associated properties. Remove properties first.' 
      }, 403);
    }

    await kv.del(`owner:${id}`);

    console.log(`✅ Owner deleted: ${owner.email} (${id})`);

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

    const owner = await kv.get(`owner:${id}`);
    if (!owner) {
      return c.json({ 
        success: false, 
        error: 'Owner not found' 
      }, 404);
    }

    const updated: Owner = {
      ...owner,
      isPremium: !owner.isPremium,
      updatedAt: new Date().toISOString()
    };

    await kv.set(`owner:${id}`, updated);

    console.log(`✅ Owner premium toggled: ${owner.email} (${id}) - Premium: ${updated.isPremium}`);

    return c.json({ 
      success: true, 
      owner: updated,
      message: `Owner ${updated.isPremium ? 'upgraded to' : 'downgraded from'} premium` 
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

    const owner = await kv.get(`owner:${id}`);
    if (!owner) {
      return c.json({ 
        success: false, 
        error: 'Owner not found' 
      }, 404);
    }

    const updated: Owner = {
      ...owner,
      stats: {
        ...owner.stats,
        ...body
      },
      updatedAt: new Date().toISOString()
    };

    await kv.set(`owner:${id}`, updated);

    console.log(`✅ Owner stats updated: ${owner.email} (${id})`);

    return c.json({ 
      success: true, 
      owner: updated 
    });
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
    const organizationId = c.req.query('organizationId');
    
    let owners = await kv.getByPrefix('owner:');

    if (organizationId) {
      owners = owners.filter((o: Owner) => o.organizationId === organizationId);
    }

    const stats = {
      total: owners.length,
      byContractType: {
        exclusivity: owners.filter((o: Owner) => o.contractType === 'exclusivity').length,
        non_exclusive: owners.filter((o: Owner) => o.contractType === 'non_exclusive').length,
        temporary: owners.filter((o: Owner) => o.contractType === 'temporary').length
      },
      byStatus: {
        active: owners.filter((o: Owner) => o.status === 'active').length,
        inactive: owners.filter((o: Owner) => o.status === 'inactive').length
      },
      premium: owners.filter((o: Owner) => o.isPremium).length,
      totalProperties: owners.reduce((sum, o) => sum + (o.stats?.totalProperties || 0), 0),
      activeProperties: owners.reduce((sum, o) => sum + (o.stats?.activeProperties || 0), 0),
      totalRevenue: owners.reduce((sum, o) => sum + (o.stats?.totalRevenue || 0), 0),
      averageCommission: owners
        .filter((o: Owner) => o.taxaComissao)
        .reduce((sum, o, _, arr) => sum + (o.taxaComissao || 0) / arr.length, 0)
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
