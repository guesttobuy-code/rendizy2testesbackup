/**
 * RENDIZY - Backend Routes: Clients
 * Gestão de clientes (Hóspedes, Compradores, Locadores)
 * 
 * @version v1.0.103.232
 * @date 2025-11-01
 */

import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Types
type ClientType = 'guest' | 'buyer' | 'renter';
type ClientStatus = 'active' | 'inactive' | 'pending';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  document?: string;
  type: ClientType;
  status: ClientStatus;
  
  // Dados de Hóspede
  guestData?: {
    preferredCheckIn?: string;
    dietaryRestrictions?: string;
    emergencyContact?: string;
    totalStays?: number;
    totalSpent?: number;
    lastStayDate?: string;
    rating?: number;
    notes?: string;
  };
  
  // Dados de Comprador
  buyerData?: {
    budget?: number;
    preferredLocations?: string[];
    purchaseTimeline?: string;
    financingNeeded?: boolean;
    propertyPreferences?: string;
    workingWithAgent?: boolean;
  };
  
  // Dados de Locador
  renterData?: {
    leaseStartDate?: string;
    leaseEndDate?: string;
    monthlyRent?: number;
    depositAmount?: number;
    previousAddress?: string;
    employmentInfo?: string;
    references?: string;
  };
  
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
  // Remove caracteres não numéricos
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 10 && cleanPhone.length <= 15;
}

// GET /clients - Listar todos os clientes
app.get('/', async (c) => {
  try {
    const organizationId = c.req.query('organizationId');
    const type = c.req.query('type') as ClientType | undefined;
    const status = c.req.query('status') as ClientStatus | undefined;
    
    let clients = await kv.getByPrefix('client:');

    // Filtrar por organização se fornecido
    if (organizationId) {
      clients = clients.filter((client: Client) => client.organizationId === organizationId);
    }

    // Filtrar por tipo se fornecido
    if (type) {
      clients = clients.filter((client: Client) => client.type === type);
    }

    // Filtrar por status se fornecido
    if (status) {
      clients = clients.filter((client: Client) => client.status === status);
    }

    // Ordenar por data de criação (mais recentes primeiro)
    const sorted = clients.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return c.json({ 
      success: true, 
      clients: sorted,
      total: sorted.length 
    });
  } catch (error) {
    console.error('❌ Error fetching clients:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch clients' 
    }, 500);
  }
});

// GET /clients/:id - Obter cliente por ID
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const client = await kv.get(`client:${id}`);

    if (!client) {
      return c.json({ 
        success: false, 
        error: 'Client not found' 
      }, 404);
    }

    return c.json({ 
      success: true, 
      client 
    });
  } catch (error) {
    console.error('❌ Error fetching client:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch client' 
    }, 500);
  }
});

// GET /clients/email/:email - Obter cliente por email
app.get('/email/:email', async (c) => {
  try {
    const email = c.req.param('email').toLowerCase();
    const clients = await kv.getByPrefix('client:');
    const client = clients.find((cl: Client) => cl.email.toLowerCase() === email);

    if (!client) {
      return c.json({ 
        success: false, 
        error: 'Client not found' 
      }, 404);
    }

    return c.json({ 
      success: true, 
      client 
    });
  } catch (error) {
    console.error('❌ Error fetching client by email:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch client' 
    }, 500);
  }
});

// GET /clients/phone/:phone - Obter cliente por telefone
app.get('/phone/:phone', async (c) => {
  try {
    const phone = c.req.param('phone');
    const clients = await kv.getByPrefix('client:');
    const client = clients.find((cl: Client) => cl.phone === phone);

    if (!client) {
      return c.json({ 
        success: false, 
        error: 'Client not found' 
      }, 404);
    }

    return c.json({ 
      success: true, 
      client 
    });
  } catch (error) {
    console.error('❌ Error fetching client by phone:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch client' 
    }, 500);
  }
});

// POST /clients - Criar novo cliente
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { 
      name, 
      email, 
      phone,
      document,
      type = 'guest',
      status = 'active',
      guestData,
      buyerData,
      renterData,
      organizationId
    } = body;

    // Validações básicas
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

    // Validar tipo
    const validTypes: ClientType[] = ['guest', 'buyer', 'renter'];
    if (!validTypes.includes(type)) {
      return c.json({ 
        success: false, 
        error: 'Invalid client type. Must be: guest, buyer, or renter' 
      }, 400);
    }

    // Verificar se email já existe
    const existingClients = await kv.getByPrefix('client:');
    const emailExists = existingClients.some((cl: Client) => 
      cl.email.toLowerCase() === email.toLowerCase() &&
      (!organizationId || cl.organizationId === organizationId)
    );

    if (emailExists) {
      return c.json({ 
        success: false, 
        error: 'Client with this email already exists' 
      }, 409);
    }

    // Criar cliente
    const id = generateId('client');
    const now = new Date().toISOString();

    const client: Client = {
      id,
      name,
      email: email.toLowerCase(),
      phone,
      document,
      type,
      status,
      createdAt: now,
      updatedAt: now
    };

    // Adicionar dados específicos por tipo
    if (type === 'guest' && guestData) {
      client.guestData = guestData;
    }
    if (type === 'buyer' && buyerData) {
      client.buyerData = buyerData;
    }
    if (type === 'renter' && renterData) {
      client.renterData = renterData;
    }

    // Adicionar organizationId se fornecido
    if (organizationId) {
      client.organizationId = organizationId;
    }

    // Salvar no KV store
    await kv.set(`client:${id}`, client);

    console.log(`✅ Client created: ${email} (${type}) - ${id}`);

    return c.json({ 
      success: true, 
      client 
    }, 201);
  } catch (error) {
    console.error('❌ Error creating client:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to create client' 
    }, 500);
  }
});

// PUT /clients/:id - Atualizar cliente
app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const client = await kv.get(`client:${id}`);
    if (!client) {
      return c.json({ 
        success: false, 
        error: 'Client not found' 
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

    // Atualizar campos permitidos
    const updated: Client = {
      ...client,
      ...body,
      id: client.id, // Não permitir mudar ID
      createdAt: client.createdAt, // Não permitir mudar data de criação
      updatedAt: new Date().toISOString()
    };

    // Se mudou o tipo, limpar dados do tipo anterior
    if (body.type && body.type !== client.type) {
      delete updated.guestData;
      delete updated.buyerData;
      delete updated.renterData;
    }

    await kv.set(`client:${id}`, updated);

    console.log(`✅ Client updated: ${updated.email} (${id})`);

    return c.json({ 
      success: true, 
      client: updated 
    });
  } catch (error) {
    console.error('❌ Error updating client:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to update client' 
    }, 500);
  }
});

// PATCH /clients/:id - Atualizar parcialmente cliente
app.patch('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const client = await kv.get(`client:${id}`);
    if (!client) {
      return c.json({ 
        success: false, 
        error: 'Client not found' 
      }, 404);
    }

    // Atualizar apenas campos fornecidos
    const updated: Client = {
      ...client,
      ...body,
      id: client.id,
      createdAt: client.createdAt,
      updatedAt: new Date().toISOString()
    };

    await kv.set(`client:${id}`, updated);

    console.log(`✅ Client patched: ${updated.email} (${id})`);

    return c.json({ 
      success: true, 
      client: updated 
    });
  } catch (error) {
    console.error('❌ Error patching client:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to patch client' 
    }, 500);
  }
});

// DELETE /clients/:id - Deletar cliente
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const client = await kv.get(`client:${id}`);
    if (!client) {
      return c.json({ 
        success: false, 
        error: 'Client not found' 
      }, 404);
    }

    await kv.del(`client:${id}`);

    console.log(`✅ Client deleted: ${client.email} (${id})`);

    return c.json({ 
      success: true, 
      message: 'Client deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Error deleting client:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to delete client' 
    }, 500);
  }
});

// GET /clients/stats - Obter estatísticas de clientes
app.get('/stats', async (c) => {
  try {
    const organizationId = c.req.query('organizationId');
    
    let clients = await kv.getByPrefix('client:');

    if (organizationId) {
      clients = clients.filter((cl: Client) => cl.organizationId === organizationId);
    }

    const stats = {
      total: clients.length,
      byType: {
        guest: clients.filter((cl: Client) => cl.type === 'guest').length,
        buyer: clients.filter((cl: Client) => cl.type === 'buyer').length,
        renter: clients.filter((cl: Client) => cl.type === 'renter').length
      },
      byStatus: {
        active: clients.filter((cl: Client) => cl.status === 'active').length,
        inactive: clients.filter((cl: Client) => cl.status === 'inactive').length,
        pending: clients.filter((cl: Client) => cl.status === 'pending').length
      },
      // Estatísticas específicas de hóspedes
      guestStats: {
        totalStays: clients
          .filter((cl: Client) => cl.type === 'guest' && cl.guestData?.totalStays)
          .reduce((sum, cl) => sum + (cl.guestData?.totalStays || 0), 0),
        totalRevenue: clients
          .filter((cl: Client) => cl.type === 'guest' && cl.guestData?.totalSpent)
          .reduce((sum, cl) => sum + (cl.guestData?.totalSpent || 0), 0),
        averageRating: clients
          .filter((cl: Client) => cl.type === 'guest' && cl.guestData?.rating)
          .reduce((sum, cl, _, arr) => sum + (cl.guestData?.rating || 0) / arr.length, 0)
      }
    };

    return c.json({ 
      success: true, 
      stats 
    });
  } catch (error) {
    console.error('❌ Error fetching client stats:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch client stats' 
    }, 500);
  }
});

export default app;
