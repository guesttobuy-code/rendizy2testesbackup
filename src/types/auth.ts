/**
 * Tipos de Autenticação do Rendizy
 * 
 * Centraliza tipos relacionados a User, Organization e Permissions
 * Evita duplicação em múltiplos arquivos
 * 
 * Projeto Fluência - Fase 2
 */

// ============================================
// ORGANIZAÇÕES (IMOBILIÁRIAS CLIENTES)
// ============================================

export interface Organization {
  id: string;
  name: string; // Nome da imobiliária
  slug: string; // URL-friendly identifier (ex: "rendizy" ou "rendizy_guesttobuy")
  isMaster?: boolean; // true se for a organização master RENDIZY
  logo?: string;
  status: 'active' | 'suspended' | 'trial' | 'cancelled';
  plan: 'free' | 'basic' | 'professional' | 'enterprise';
  
  // Informações da empresa
  tradingName?: string; // Nome fantasia
  legalName?: string; // Razão social
  taxId?: string; // CNPJ
  email: string;
  phone?: string;
  
  // Endereço
  address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  
  // Configurações
  settings: {
    language: 'pt' | 'en' | 'es';
    timezone: string;
    currency: 'BRL' | 'USD' | 'EUR';
    dateFormat: string;
    maxUsers: number;
    maxProperties: number;
  };
  
  // Limites e uso
  limits: {
    users: number;
    properties: number;
    reservations: number;
    storage: number; // MB
  };
  
  usage: {
    users: number;
    properties: number;
    reservations: number;
    storage: number; // MB
  };
  
  // Datas
  createdAt: Date;
  updatedAt: Date;
  trialEndsAt?: Date;
  suspendedAt?: Date;
  
  // Billing
  billingEmail?: string;
  billingCycle?: 'monthly' | 'yearly';
  nextBillingDate?: Date;
}

// ============================================
// USUÁRIOS
// ============================================

export type UserRole = 
  | 'super_admin'      // Nosso time - acesso total a todas organizações
  | 'admin'            // Administrador da imobiliária
  | 'manager'          // Gerente - acesso amplo mas limitado
  | 'agent'            // Corretor/Agente - acesso a reservas e propriedades
  | 'guest_services'   // Atendimento ao hóspede
  | 'finance'          // Financeiro
  | 'readonly';        // Apenas visualização

export interface User {
  id: string;
  organizationId?: string; // null para super_admin
  
  // Informações pessoais
  email: string;
  name: string;
  avatar?: string;
  phone?: string;
  
  // Autenticação
  role: UserRole;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  emailVerified: boolean;
  
  // Permissões customizadas (sobrescreve role padrão)
  customPermissions?: Permission[];
  
  // Datas
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  invitedAt?: Date;
  invitedBy?: string; // userId
  
  // Preferências
  preferences?: {
    language: 'pt' | 'en' | 'es';
    theme: 'light' | 'dark' | 'auto';
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
}

// ============================================
// PERMISSÕES
// ============================================

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'export' | 'import';
export type PermissionResource = 
  | 'properties'
  | 'reservations'
  | 'guests'
  | 'calendar'
  | 'finance'
  | 'reports'
  | 'settings'
  | 'users'
  | 'organizations'
  | 'integrations'
  | 'channels'
  | 'pricing'
  | 'tasks'
  | 'chat'
  | 'automation';

export interface Permission {
  resource: PermissionResource;
  actions: PermissionAction[];
}

export interface PermissionCheck {
  resource: PermissionResource;
  action: PermissionAction;
}

// Permissões padrão por role
export const DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    { resource: 'organizations', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'properties', actions: ['create', 'read', 'update', 'delete', 'export', 'import'] },
    { resource: 'reservations', actions: ['create', 'read', 'update', 'delete', 'export', 'import'] },
    { resource: 'guests', actions: ['create', 'read', 'update', 'delete', 'export', 'import'] },
    { resource: 'calendar', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'finance', actions: ['create', 'read', 'update', 'delete', 'export'] },
    { resource: 'reports', actions: ['read', 'export'] },
    { resource: 'settings', actions: ['read', 'update'] },
    { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'integrations', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'channels', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'pricing', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'tasks', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'chat', actions: ['read', 'create'] },
    { resource: 'automation', actions: ['create', 'read', 'update', 'delete'] }
  ],
  admin: [
    { resource: 'properties', actions: ['create', 'read', 'update', 'delete', 'export', 'import'] },
    { resource: 'reservations', actions: ['create', 'read', 'update', 'delete', 'export', 'import'] },
    { resource: 'guests', actions: ['create', 'read', 'update', 'delete', 'export', 'import'] },
    { resource: 'calendar', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'finance', actions: ['create', 'read', 'update', 'delete', 'export'] },
    { resource: 'reports', actions: ['read', 'export'] },
    { resource: 'settings', actions: ['read', 'update'] },
    { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'integrations', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'channels', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'pricing', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'tasks', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'chat', actions: ['read', 'create'] },
    { resource: 'automation', actions: ['create', 'read', 'update', 'delete'] }
  ],
  manager: [
    { resource: 'properties', actions: ['read', 'update', 'export'] },
    { resource: 'reservations', actions: ['create', 'read', 'update', 'delete', 'export'] },
    { resource: 'guests', actions: ['create', 'read', 'update', 'export'] },
    { resource: 'calendar', actions: ['read', 'update'] },
    { resource: 'finance', actions: ['read', 'export'] },
    { resource: 'reports', actions: ['read', 'export'] },
    { resource: 'settings', actions: ['read'] },
    { resource: 'pricing', actions: ['read', 'update'] },
    { resource: 'tasks', actions: ['create', 'read', 'update'] },
    { resource: 'chat', actions: ['read', 'create'] }
  ],
  agent: [
    { resource: 'properties', actions: ['read'] },
    { resource: 'reservations', actions: ['create', 'read', 'update'] },
    { resource: 'guests', actions: ['read', 'update'] },
    { resource: 'calendar', actions: ['read'] },
    { resource: 'tasks', actions: ['create', 'read', 'update'] },
    { resource: 'chat', actions: ['read', 'create'] }
  ],
  guest_services: [
    { resource: 'reservations', actions: ['read', 'update'] },
    { resource: 'guests', actions: ['read', 'update'] },
    { resource: 'chat', actions: ['read', 'create'] },
    { resource: 'tasks', actions: ['create', 'read', 'update'] }
  ],
  finance: [
    { resource: 'finance', actions: ['create', 'read', 'update', 'export'] },
    { resource: 'reports', actions: ['read', 'export'] },
    { resource: 'reservations', actions: ['read'] },
    { resource: 'properties', actions: ['read'] }
  ],
  readonly: [
    { resource: 'properties', actions: ['read'] },
    { resource: 'reservations', actions: ['read'] },
    { resource: 'guests', actions: ['read'] },
    { resource: 'calendar', actions: ['read'] },
    { resource: 'reports', actions: ['read'] }
  ]
};

// ============================================
// TYPES ADICIONAIS
// ============================================

export interface UserWithOrganization extends User {
  organization: Organization;
}

export interface OrganizationStats {
  totalUsers: number;
  totalProperties: number;
  totalReservations: number;
  activeReservations: number;
  revenue: number;
}
