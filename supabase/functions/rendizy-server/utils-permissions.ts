/**
 * Utils de Permissões - Controle de acesso granular
 * 
 * Este módulo implementa verificações de permissão baseadas em:
 * - Tipo de tenant (superadmin, imobiliaria, staff)
 * - Role do usuário dentro da organização (owner, admin, manager, staff, readonly)
 * 
 * HIERARQUIA:
 * 1. SuperAdmin → Acesso total à plataforma
 * 2. Owner → Dono da organização, pode tudo na sua org
 * 3. Admin → Administrador, quase tudo exceto billing
 * 4. Manager → Gerente, gestão operacional
 * 5. Staff → Corretor/Agente, operações básicas
 * 6. Readonly → Apenas visualização
 */

import { Context } from 'npm:hono';
import { getTenant, isSuperAdmin, isImobiliaria } from './utils-tenancy.ts';
import { getSupabaseClient } from './kv_store.tsx';

// Tipos de Role dentro de uma organização
export type UserRole = 'owner' | 'admin' | 'manager' | 'staff' | 'readonly';

// Mapeamento de permissões por role
export const ROLE_PERMISSIONS: Record<UserRole, {
  canManageUsers: boolean;
  canManageBilling: boolean;
  canManageSettings: boolean;
  canManageProperties: boolean;
  canManageReservations: boolean;
  canViewReports: boolean;
  canExportData: boolean;
  canDeleteOrganization: boolean;
}> = {
  owner: {
    canManageUsers: true,
    canManageBilling: true,
    canManageSettings: true,
    canManageProperties: true,
    canManageReservations: true,
    canViewReports: true,
    canExportData: true,
    canDeleteOrganization: true,
  },
  admin: {
    canManageUsers: true,
    canManageBilling: false,
    canManageSettings: true,
    canManageProperties: true,
    canManageReservations: true,
    canViewReports: true,
    canExportData: true,
    canDeleteOrganization: false,
  },
  manager: {
    canManageUsers: false,
    canManageBilling: false,
    canManageSettings: false,
    canManageProperties: true,
    canManageReservations: true,
    canViewReports: true,
    canExportData: true,
    canDeleteOrganization: false,
  },
  staff: {
    canManageUsers: false,
    canManageBilling: false,
    canManageSettings: false,
    canManageProperties: false,
    canManageReservations: true,
    canViewReports: false,
    canExportData: false,
    canDeleteOrganization: false,
  },
  readonly: {
    canManageUsers: false,
    canManageBilling: false,
    canManageSettings: false,
    canManageProperties: false,
    canManageReservations: false,
    canViewReports: true,
    canExportData: false,
    canDeleteOrganization: false,
  },
};

/**
 * Obtém o role do usuário atual
 * Para SuperAdmin: retorna 'owner' (acesso máximo)
 * Para Imobiliária: verifica o campo role no banco ou assume 'owner' se for o criador
 * Para Staff: retorna o role do banco
 */
export async function getCurrentUserRole(c: Context): Promise<UserRole> {
  const tenant = getTenant(c);
  
  // SuperAdmin sempre tem acesso máximo
  if (tenant.type === 'superadmin') {
    return 'owner';
  }
  
  // Para imobiliária, verificar se é o owner (primeiro usuário) ou admin
  // O campo 'type' = 'imobiliaria' geralmente indica o owner da org
  if (tenant.type === 'imobiliaria') {
    // Verificar se tem role definido no banco
    const supabase = getSupabaseClient();
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', tenant.userId)
      .single();
    
    // Se tem role definido, usar ele; senão assume owner (retrocompatibilidade)
    return (user?.role as UserRole) || 'owner';
  }
  
  // Para staff, buscar o role do banco
  const supabase = getSupabaseClient();
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', tenant.userId)
    .single();
  
  return (user?.role as UserRole) || 'staff';
}

/**
 * Verifica se o usuário atual pode gerenciar usuários (criar, editar, deletar)
 * Permitido para: SuperAdmin, Owner, Admin
 */
export async function canManageUsers(c: Context): Promise<boolean> {
  // SuperAdmin pode tudo
  if (isSuperAdmin(c)) return true;
  
  // Verificar role do usuário
  const role = await getCurrentUserRole(c);
  return ROLE_PERMISSIONS[role]?.canManageUsers ?? false;
}

/**
 * Verifica se pode gerenciar usuários da mesma organização
 * Retorna true se:
 * - É SuperAdmin (pode qualquer org)
 * - É Owner/Admin e o targetOrganizationId é a mesma org do usuário
 */
export async function canManageUsersInOrg(c: Context, targetOrganizationId: string): Promise<boolean> {
  const tenant = getTenant(c);
  
  // SuperAdmin pode gerenciar qualquer org
  if (tenant.type === 'superadmin') return true;
  
  // Verificar se é a mesma organização
  if (tenant.organizationId !== targetOrganizationId) {
    return false;
  }
  
  // Verificar se tem permissão de gerenciar usuários
  return await canManageUsers(c);
}

/**
 * Verifica se pode gerenciar configurações da organização
 */
export async function canManageOrgSettings(c: Context): Promise<boolean> {
  if (isSuperAdmin(c)) return true;
  
  const role = await getCurrentUserRole(c);
  return ROLE_PERMISSIONS[role]?.canManageSettings ?? false;
}

/**
 * Verifica se pode gerenciar billing (planos, pagamentos)
 * Apenas Owner e SuperAdmin
 */
export async function canManageBilling(c: Context): Promise<boolean> {
  if (isSuperAdmin(c)) return true;
  
  const role = await getCurrentUserRole(c);
  return ROLE_PERMISSIONS[role]?.canManageBilling ?? false;
}

/**
 * Verifica se pode ver relatórios
 */
export async function canViewReports(c: Context): Promise<boolean> {
  if (isSuperAdmin(c)) return true;
  
  const role = await getCurrentUserRole(c);
  return ROLE_PERMISSIONS[role]?.canViewReports ?? false;
}

/**
 * Verifica se pode deletar a organização
 * Apenas Owner e SuperAdmin
 */
export async function canDeleteOrganization(c: Context): Promise<boolean> {
  if (isSuperAdmin(c)) return true;
  
  const role = await getCurrentUserRole(c);
  return ROLE_PERMISSIONS[role]?.canDeleteOrganization ?? false;
}

/**
 * Middleware que verifica se o usuário pode gerenciar usuários
 * Se não puder, retorna 403 Forbidden
 */
export async function requireUserManagement(c: Context, next: () => Promise<void>) {
  const canManage = await canManageUsers(c);
  
  if (!canManage) {
    return c.json({ 
      success: false, 
      error: 'Você não tem permissão para gerenciar usuários' 
    }, 403);
  }
  
  await next();
}

/**
 * Verifica se um role pode ser atribuído por outro role
 * Ex: Staff não pode criar Admin
 */
export function canAssignRole(assignerRole: UserRole, targetRole: UserRole): boolean {
  const hierarchy: Record<UserRole, number> = {
    owner: 5,
    admin: 4,
    manager: 3,
    staff: 2,
    readonly: 1,
  };
  
  // Só pode atribuir roles de nível igual ou inferior
  // Exceção: ninguém pode criar owner (apenas SuperAdmin)
  if (targetRole === 'owner') {
    return false; // Apenas SuperAdmin pode criar owners
  }
  
  return hierarchy[assignerRole] >= hierarchy[targetRole];
}

/**
 * Helper para verificar se é Owner ou Admin
 */
export async function isOwnerOrAdmin(c: Context): Promise<boolean> {
  if (isSuperAdmin(c)) return true;
  
  const role = await getCurrentUserRole(c);
  return role === 'owner' || role === 'admin';
}

/**
 * Helper para verificar se é o Owner da organização
 */
export async function isOwner(c: Context): Promise<boolean> {
  if (isSuperAdmin(c)) return true;
  
  const role = await getCurrentUserRole(c);
  return role === 'owner';
}
