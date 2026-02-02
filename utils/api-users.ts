/**
 * API de Usuários - Staff dentro de uma organização
 * 
 * Endpoints disponíveis no backend:
 * - GET    /users             - Listar usuários (filtro por organizationId)
 * - GET    /users/:id         - Obter usuário por ID
 * - POST   /users             - Criar novo usuário
 * - PATCH  /users/:id         - Atualizar usuário
 * - DELETE /users/:id         - Deletar usuário
 * - POST   /users/invite      - Convidar usuário (envia email)
 * - PATCH  /users/:id/status  - Alterar status (ativar/suspender)
 * 
 * PERMISSÕES:
 * - SuperAdmin: pode tudo em qualquer organização
 * - Owner: pode gerenciar todos os usuários da sua org
 * - Admin: pode criar/editar/deletar staff/manager/readonly da sua org
 * - Manager/Staff/Readonly: não podem gerenciar usuários
 */

import { apiRequest } from './api';

// Tipos - Alinhados com o backend
// Roles dentro de uma organização (do mais para menos permissivo)
export type UserRole = 'owner' | 'admin' | 'manager' | 'staff' | 'readonly';
export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended' | 'invited';

export interface UserBase {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  emailVerified?: boolean;
  avatar?: string;
  phone?: string;
  permissions?: string[];
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
  invitedAt?: string;
  invitedBy?: string;
}

export interface CreateUserParams {
  organizationId: string;
  email: string;
  name: string;
  role: UserRole;
  password?: string; // Se não fornecido, usuário fica como 'invited'
  phone?: string;
}

export interface UpdateUserParams {
  name?: string;
  role?: UserRole;
  status?: UserStatus;
  phone?: string;
  password?: string; // Para reset de senha
}

export interface InviteUserParams {
  organizationId: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface UserInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: UserRole;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  token: string;
  expiresAt: string;
  createdAt: string;
}

// Mapeamento de roles para labels
export const roleLabels: Record<UserRole, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  manager: 'Gerente',
  staff: 'Corretor/Agente',
  readonly: 'Somente Leitura'
};

export const roleColors: Record<UserRole, string> = {
  owner: 'bg-purple-100 text-purple-700',
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-blue-100 text-blue-700',
  staff: 'bg-green-100 text-green-700',
  readonly: 'bg-gray-100 text-gray-700'
};

export const statusLabels: Record<UserStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  pending: 'Pendente',
  suspended: 'Suspenso',
  invited: 'Convidado'
};

export const statusColors: Record<UserStatus, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-700',
  pending: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-red-100 text-red-700',
  invited: 'bg-blue-100 text-blue-700'
};

// ============================================================================
// API Functions
// ============================================================================

/**
 * Lista usuários de uma organização
 */
export async function listUsers(organizationId?: string): Promise<UserBase[]> {
  const query = organizationId ? `?organizationId=${organizationId}` : '';
  const response = await apiRequest<UserBase[]>(`/users${query}`, { method: 'GET' });
  
  if (response.success && response.data) {
    return response.data;
  }
  
  console.error('Erro ao listar usuários:', response.error);
  return [];
}

/**
 * Obtém um usuário por ID
 */
export async function getUser(userId: string): Promise<UserBase | null> {
  const response = await apiRequest<UserBase>(`/users/${userId}`, { method: 'GET' });
  
  if (response.success && response.data) {
    return response.data;
  }
  
  console.error('Erro ao buscar usuário:', response.error);
  return null;
}

/**
 * Cria um novo usuário na organização
 */
export async function createUser(params: CreateUserParams): Promise<UserBase | null> {
  const response = await apiRequest<UserBase>('/users', {
    method: 'POST',
    body: JSON.stringify(params)
  });
  
  if (response.success && response.data) {
    return response.data;
  }
  
  throw new Error(response.error || 'Erro ao criar usuário');
}

/**
 * Atualiza um usuário existente
 */
export async function updateUser(userId: string, params: UpdateUserParams): Promise<UserBase | null> {
  const response = await apiRequest<UserBase>(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(params)
  });
  
  if (response.success && response.data) {
    return response.data;
  }
  
  throw new Error(response.error || 'Erro ao atualizar usuário');
}

/**
 * Deleta um usuário
 */
export async function deleteUser(userId: string): Promise<boolean> {
  const response = await apiRequest<void>(`/users/${userId}`, {
    method: 'DELETE'
  });
  
  if (response.success) {
    return true;
  }
  
  throw new Error(response.error || 'Erro ao deletar usuário');
}

/**
 * Convida um novo usuário (envia email de convite)
 * Nota: Por enquanto, usa o mesmo endpoint de criar usuário
 */
export async function inviteUser(params: InviteUserParams): Promise<UserBase | null> {
  // O backend trata o convite automaticamente se não houver senha
  return createUser({
    organizationId: params.organizationId,
    email: params.email,
    name: params.name,
    role: params.role
  });
}

/**
 * Reenvia convite para um usuário pendente
 */
export async function resendInvitation(userId: string): Promise<boolean> {
  // TODO: Implementar endpoint específico no backend
  // Por enquanto, apenas retorna true simulando sucesso
  console.log('[API] resendInvitation:', userId);
  return true;
}

/**
 * Cancela um convite pendente (deleta o usuário se status = invited)
 */
export async function cancelInvitation(userId: string): Promise<boolean> {
  return deleteUser(userId);
}

/**
 * Altera o status de um usuário (ativar/suspender)
 */
export async function changeUserStatus(userId: string, status: UserStatus): Promise<UserBase | null> {
  return updateUser(userId, { status });
}

/**
 * Reset de senha do usuário
 */
export async function resetUserPassword(userId: string, newPassword: string): Promise<boolean> {
  const response = await updateUser(userId, { password: newPassword });
  return response !== null;
}
