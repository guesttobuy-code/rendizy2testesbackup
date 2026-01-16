import { Hono } from 'npm:hono';
import { createHash } from 'node:crypto';
import * as kv from './kv_store.tsx';
import { getSupabaseClient } from './kv_store.tsx';
import { tenancyMiddleware, isSuperAdmin, getTenant } from './utils-tenancy.ts';

const app = new Hono();

// 🔒 Proteção: endpoints de users são restritos ao Admin Master
app.use('*', tenancyMiddleware);
app.use('*', async (c, next) => {
  if (!isSuperAdmin(c)) {
    return c.json({ success: false, error: 'Forbidden' }, 403);
  }
  await next();
});

// Tipos
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
  createdBy: string;
  permissions?: string[];
  avatar?: string;
}

// Helper: Gerar ID único
function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `${prefix}_${timestamp}${random}`;
}

// Helper: Hash de senha (SHA256)
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function generateTemporaryPassword(): string {
  // Não retornamos isso para o cliente; serve apenas para satisfazer password_hash NOT NULL.
  // 2 UUIDs → alta entropia.
  return `${crypto.randomUUID()}${crypto.randomUUID()}`;
}

// Helper: Obter permissões padrão por role
function getDefaultPermissions(role: string): string[] {
  const permissions: Record<string, string[]> = {
    owner: ['*'], // Todas as permissões
    admin: [
      'properties:*',
      'reservations:*',
      'guests:*',
      'calendar:*',
      'reports:view',
      'users:view',
      'users:invite',
      'settings:view'
    ],
    manager: [
      'properties:view',
      'properties:edit',
      'reservations:*',
      'guests:*',
      'calendar:*',
      'reports:view'
    ],
    staff: [
      'properties:view',
      'reservations:view',
      'reservations:create',
      'reservations:edit',
      'guests:view',
      'guests:create',
      'calendar:view'
    ],
    readonly: [
      'properties:view',
      'reservations:view',
      'guests:view',
      'calendar:view',
      'reports:view'
    ]
  };

  return permissions[role] || permissions.readonly;
}

// Helper: Validar email
function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// GET /users - Listar todos os usuários (opcional: filtrar por organização)
app.get('/', async (c) => {
  try {
    const organizationId = c.req.query('organizationId');
    const supabase = getSupabaseClient();

    // Construir query base
    let query = supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    // Filtrar por organização se fornecido
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: sqlUsers, error: queryError } = await query;

    if (queryError) {
      console.error('❌ Erro ao buscar usuários no SQL:', queryError);
      return c.json({
        success: false,
        error: `Erro ao buscar usuários: ${queryError.message}`
      }, 500);
    }

    // Converter para formato esperado pelo frontend
    // Mapear 'type' para 'role' (type: 'imobiliaria' -> role: 'owner' ou 'admin', type: 'staff' -> role: 'staff')
    const users: User[] = (sqlUsers || []).map((sqlUser: any) => {
      // Mapear type para role
      let role: 'owner' | 'admin' | 'manager' | 'staff' | 'readonly' = 'staff';
      if (sqlUser.type === 'imobiliaria') {
        role = 'admin'; // Por padrão, imobiliaria é admin
      } else if (sqlUser.type === 'superadmin') {
        role = 'owner'; // SuperAdmin é owner
      } else {
        role = 'staff';
      }

      return {
        id: sqlUser.id,
        organizationId: sqlUser.organization_id,
        name: sqlUser.name,
        email: sqlUser.email,
        role,
        status: sqlUser.status as 'active' | 'invited' | 'suspended',
        createdAt: sqlUser.created_at,
        createdBy: sqlUser.created_by || '',
        permissions: getDefaultPermissions(role)
      };
    });

    return c.json({
      success: true,
      data: users,
      total: users.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch users'
    }, 500);
  }
});

// GET /users/:id - Obter usuário por ID
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const user = await kv.get(`user:${id}`);

    if (!user) {
      return c.json({
        success: false,
        error: 'User not found'
      }, 404);
    }

    return c.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch user'
    }, 500);
  }
});

// GET /users/email/:email - Obter usuário por email
app.get('/email/:email', async (c) => {
  try {
    const email = c.req.param('email').toLowerCase();
    const users = await kv.getByPrefix('user:');
    const user = users.find((u: User) => u.email.toLowerCase() === email);

    if (!user) {
      return c.json({
        success: false,
        error: 'User not found'
      }, 404);
    }

    return c.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user by email:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch user'
    }, 500);
  }
});

// POST /users - Criar novo usuário
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const {
      organizationId,
      name,
      email,
      password, // senha opcional (se não fornecida, usuário fica invited e terá senha temporária)
      role = 'staff',
      status, // Se password fornecido, será 'active', senão 'invited'
      createdBy
    } = body;

    const tenant = getTenant(c);
    const createdByValue = tenant.userId; // UUID do usuário autenticado (compatível com colunas uuid/text)

    // Validações
    if (!organizationId || !name || !email) {
      return c.json({
        success: false,
        error: 'organizationId, name, and email are required'
      }, 400);
    }

    const emailNormalized = normalizeEmail(email);

    // Validar email
    if (!isValidEmail(emailNormalized)) {
      return c.json({
        success: false,
        error: 'Invalid email format'
      }, 400);
    }

    // Verificar se organização existe no SQL
    const supabase = getSupabaseClient();
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug, limits_users')
      .eq('id', organizationId)
      .maybeSingle();

    if (orgError || !organization) {
      console.error('❌ Erro ao buscar organização:', orgError);
      return c.json({
        success: false,
        error: 'Organization not found'
      }, 404);
    }

    // Padrão: username = email (normalizado)
    const finalUsername = emailNormalized;

    // Verificar se email/username já existe (global)
    const { data: existingUser, error: existingError } = await supabase
      .from('users')
      .select('id, email, username, organization_id')
      .or(`email.eq.${emailNormalized},username.eq.${finalUsername}`)
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error('❌ Erro ao verificar usuário existente:', existingError);
      return c.json({
        success: false,
        error: 'Database error checking existing user'
      }, 500);
    }

    if (existingUser) {
      return c.json({
        success: false,
        error: 'Já existe um usuário com este email'
      }, 409);
    }

    // Verificar limites do plano
    const { data: orgUsersCount, error: countError } = await supabase
      .from('users')
      .select('count', { count: 'exact' })
      .eq('organization_id', organizationId);

    if (countError) {
      console.error('❌ Erro ao contar usuários:', countError);
      return c.json({
        success: false,
        error: 'Database error counting users'
      }, 500);
    }

    const maxUsers = organization.limits_users;

    if (maxUsers !== -1 && (orgUsersCount?.count || 0) >= maxUsers) {
      return c.json({
        success: false,
        error: `Organization has reached the maximum number of users (${maxUsers})`
      }, 403);
    }

    // Determinar status
    const finalStatus = status === 'suspended' ? 'suspended' : 'active';
    const finalPassword = password || generateTemporaryPassword();
    const passwordHash = hashPassword(finalPassword);
    const now = new Date().toISOString();

    // Criar no SQL (sempre)
    const { data: sqlUser, error: sqlError } = await supabase
      .from('users')
      .insert({
        username: finalUsername,
        email: emailNormalized,
        name,
        password_hash: passwordHash,
        type: role === 'owner' || role === 'admin' ? 'imobiliaria' : 'staff',
        status: finalStatus,
        organization_id: organizationId,
        created_by: createdByValue,
        created_at: now,
        updated_at: now
      })
      .select()
      .single();

    if (sqlError) {
      console.error('❌ Erro ao criar usuário no SQL:', sqlError);
      return c.json({
        success: false,
        error: `Erro ao criar usuário: ${sqlError.message}`
      }, 500);
    }

    console.log(`✅ User created in SQL: ${emailNormalized} in org ${organization.slug} (${sqlUser.id})`);

    const user: User = {
      id: sqlUser.id,
      organizationId: sqlUser.organization_id,
      name: sqlUser.name,
      email: sqlUser.email,
      role,
      status: sqlUser.status as 'active' | 'invited' | 'suspended',
      createdAt: sqlUser.created_at,
      createdBy: sqlUser.created_by || createdBy,
      permissions: getDefaultPermissions(role)
    };

    return c.json({
      success: true,
      data: user
    }, 201);
  } catch (error) {
    console.error('Error creating user:', error);
    return c.json({
      success: false,
      error: 'Failed to create user'
    }, 500);
  }
});

// PATCH /users/:id - Atualizar usuário
app.patch('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const supabase = getSupabaseClient();

    console.log(`[PATCH] Updating user ${id}`, body);

    // 1. Tentar atualizar no SQL
    const { data: sqlUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (sqlUser) {
      // Preparar updates para SQL
      const updates: any = {
        updated_at: new Date().toISOString()
      };

      if (body.name) updates.name = body.name;
      if (body.status) updates.status = body.status;

      // Mapeamento reverso de role para type
      if (body.role) {
        if (body.role === 'owner' || body.role === 'admin') {
          updates.type = 'imobiliaria';
        } else {
          updates.type = 'staff';
        }
      }

      // Se password foi enviada (reset de senha)
      if (body.password) {
        updates.password_hash = hashPassword(body.password);
      }

      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Erro ao atualizar usuário no SQL:', updateError);
        return c.json({
          success: false,
          error: `Failed to update user in SQL: ${updateError.message}`
        }, 500);
      }

      return c.json({
        success: true,
        data: updatedUser, // Retorna objeto SQL raw ou poderia mapear
        message: 'User updated in SQL'
      });
    }

    // 2. Fallback para KV (se não achou no SQL)
    const user = await kv.get(`user:${id}`);
    if (!user) {
      return c.json({
        success: false,
        error: 'User not found in SQL or KV'
      }, 404);
    }

    // Atualizar campos permitidos no KV
    const updated = {
      ...user,
      ...body,
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: new Date().toISOString()
    };

    // Se mudou role, atualizar permissões
    if (body.role && body.role !== user.role) {
      updated.permissions = getDefaultPermissions(body.role);
    }

    await kv.set(`user:${id}`, updated);
    console.log(`✅ User updated in KV: ${updated.email} (${id})`);

    return c.json({
      success: true,
      data: updated
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return c.json({
      success: false,
      error: 'Failed to update user'
    }, 500);
  }
});

// DELETE /users/:id - Deletar usuário
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const user = await kv.get(`user:${id}`);
    if (!user) {
      return c.json({
        success: false,
        error: 'User not found'
      }, 404);
    }

    // Não permitir deletar owners (deve ter pelo menos 1 owner por org)
    if (user.role === 'owner') {
      const allUsers = await kv.getByPrefix('user:');
      const orgOwners = allUsers.filter((u: User) =>
        u.organizationId === user.organizationId && u.role === 'owner'
      );

      if (orgOwners.length <= 1) {
        return c.json({
          success: false,
          error: 'Cannot delete the last owner of an organization'
        }, 403);
      }
    }

    await kv.del(`user:${id}`);

    console.log(`✅ User deleted: ${user.email} (${id})`);

    return c.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return c.json({
      success: false,
      error: 'Failed to delete user'
    }, 500);
  }
});

// POST /users/:id/resend-invite - Reenviar convite
app.post('/:id/resend-invite', async (c) => {
  try {
    const id = c.req.param('id');

    const user = await kv.get(`user:${id}`);
    if (!user) {
      return c.json({
        success: false,
        error: 'User not found'
      }, 404);
    }

    if (user.status !== 'invited') {
      return c.json({
        success: false,
        error: 'User is not in invited status'
      }, 400);
    }

    // Atualizar data do convite
    const updated = {
      ...user,
      invitedAt: new Date().toISOString()
    };

    await kv.set(`user:${id}`, updated);

    console.log(`✅ Invite resent: ${user.email} (${id})`);

    return c.json({
      success: true,
      data: updated,
      message: 'Invite resent successfully'
    });
  } catch (error) {
    console.error('Error resending invite:', error);
    return c.json({
      success: false,
      error: 'Failed to resend invite'
    }, 500);
  }
});

// POST /users/:id/activate - Ativar usuário (aceitar convite)
app.post('/:id/activate', async (c) => {
  try {
    const id = c.req.param('id');

    const user = await kv.get(`user:${id}`);
    if (!user) {
      return c.json({
        success: false,
        error: 'User not found'
      }, 404);
    }

    if (user.status === 'active') {
      return c.json({
        success: false,
        error: 'User is already active'
      }, 400);
    }

    // Ativar usuário
    const updated = {
      ...user,
      status: 'active',
      joinedAt: new Date().toISOString()
    };

    await kv.set(`user:${id}`, updated);

    console.log(`✅ User activated: ${user.email} (${id})`);

    return c.json({
      success: true,
      data: updated,
      message: 'User activated successfully'
    });
  } catch (error) {
    console.error('Error activating user:', error);
    return c.json({
      success: false,
      error: 'Failed to activate user'
    }, 500);
  }
});

export default app;
