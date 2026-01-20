/**
 * TIPOS PARA MULTI-TENANCY SAAS
 * Sistema de 3 níveis: Master → Organization (Imobiliária) → Users
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

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'export';

export type PermissionResource = 
  // Principais
  | 'dashboard'
  | 'calendar'
  | 'reservations'
  | 'messages'
  | 'properties'
  | 'booking_engine'
  | 'promotions'
  | 'finance'
  
  // Operacional
  | 'tasks'
  | 'users'
  | 'notifications'
  | 'catalog'
  
  // Avançado
  | 'statistics'
  | 'applications'
  | 'settings'
  | 'support'
  | 'backend'
  
  // Específicos
  | 'guests'
  | 'owners'
  | 'pricing'
  | 'blocks'
  | 'reports'
  | 'integrations'
  | 'billing';

export interface Permission {
  resource: PermissionResource;
  actions: PermissionAction[];
  conditions?: {
    own_only?: boolean; // Apenas próprios registros
    properties?: string[]; // Apenas propriedades específicas
  };
}

// Matriz de permissões padrão por role
export const DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    {
      resource: 'dashboard',
      actions: ['create', 'read', 'update', 'delete', 'export']
    },
    {
      resource: 'calendar',
      actions: ['create', 'read', 'update', 'delete', 'export']
    },
    {
      resource: 'reservations',
      actions: ['create', 'read', 'update', 'delete', 'export']
    },
    {
      resource: 'messages',
      actions: ['create', 'read', 'update', 'delete', 'export']
    },
    {
      resource: 'properties',
      actions: ['create', 'read', 'update', 'delete', 'export']
    },
    {
      resource: 'booking_engine',
      actions: ['create', 'read', 'update', 'delete', 'export']
    },
    {
      resource: 'promotions',
      actions: ['create', 'read', 'update', 'delete', 'export']
    },
    {
      resource: 'finance',
      actions: ['create', 'read', 'update', 'delete', 'export']
    },
    {
      resource: 'tasks',
      actions: ['create', 'read', 'update', 'delete', 'export']
    },
    {
      resource: 'users',
      actions: ['create', 'read', 'update', 'delete', 'export']
    },
    {
      resource: 'settings',
      actions: ['create', 'read', 'update', 'delete', 'export']
    }
  ],
  
  admin: [
    {
      resource: 'dashboard',
      actions: ['create', 'read', 'update', 'delete', 'export']
    },
    {
      resource: 'calendar',
      actions: ['create', 'read', 'update', 'delete', 'export']
    },
    {
      resource: 'reservations',
      actions: ['create', 'read', 'update', 'delete', 'export']
    },
    {
      resource: 'messages',
      actions: ['create', 'read', 'update', 'delete']
    },
    {
      resource: 'properties',
      actions: ['create', 'read', 'update', 'delete']
    },
    {
      resource: 'booking_engine',
      actions: ['create', 'read', 'update', 'delete']
    },
    {
      resource: 'promotions',
      actions: ['create', 'read', 'update', 'delete']
    },
    {
      resource: 'finance',
      actions: ['create', 'read', 'update', 'delete', 'export']
    },
    {
      resource: 'tasks',
      actions: ['create', 'read', 'update', 'delete']
    },
    {
      resource: 'users',
      actions: ['create', 'read', 'update', 'delete']
    },
    {
      resource: 'settings',
      actions: ['read', 'update']
    }
  ],
  
  manager: [
    {
      resource: 'dashboard',
      actions: ['read']
    },
    {
      resource: 'calendar',
      actions: ['read', 'update']
    },
    {
      resource: 'reservations',
      actions: ['create', 'read', 'update', 'export']
    },
    {
      resource: 'messages',
      actions: ['create', 'read', 'update']
    },
    {
      resource: 'properties',
      actions: ['read', 'update']
    },
    {
      resource: 'tasks',
      actions: ['create', 'read', 'update', 'delete']
    },
    {
      resource: 'finance',
      actions: ['read', 'export']
    }
  ],
  
  agent: [
    {
      resource: 'dashboard',
      actions: ['read']
    },
    {
      resource: 'calendar',
      actions: ['read']
    },
    {
      resource: 'reservations',
      actions: ['create', 'read', 'update']
    },
    {
      resource: 'messages',
      actions: ['create', 'read', 'update']
    },
    {
      resource: 'properties',
      actions: ['read']
    }
  ],
  
  guest_services: [
    {
      resource: 'calendar',
      actions: ['read']
    },
    {
      resource: 'reservations',
      actions: ['read', 'update']
    },
    {
      resource: 'messages',
      actions: ['create', 'read', 'update']
    },
    {
      resource: 'tasks',
      actions: ['read', 'update']
    }
  ],
  
  finance: [
    {
      resource: 'dashboard',
      actions: ['read']
    },
    {
      resource: 'reservations',
      actions: ['read']
    },
    {
      resource: 'finance',
      actions: ['create', 'read', 'update', 'export']
    },
    {
      resource: 'reports',
      actions: ['read', 'export']
    }
  ],
  
  readonly: [
    {
      resource: 'dashboard',
      actions: ['read']
    },
    {
      resource: 'calendar',
      actions: ['read']
    },
    {
      resource: 'reservations',
      actions: ['read']
    },
    {
      resource: 'properties',
      actions: ['read']
    }
  ]
};

// ============================================
// ACTIVITY LOG
// ============================================

export interface ActivityLog {
  id: string;
  organizationId: string;
  userId: string;
  userName: string;
  
  action: string;
  resource: string;
  resourceId?: string;
  
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  
  createdAt: Date;
}

// ============================================
// INVITATION
// ============================================

export interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  role: UserRole;
  permissions?: Permission[];
  
  invitedBy: string; // userId
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  
  token: string;
  expiresAt: Date;
  createdAt: Date;
  acceptedAt?: Date;
}

// ============================================
// HELPER TYPES
// ============================================

export interface OrganizationStats {
  totalUsers: number;
  activeUsers: number;
  totalProperties: number;
  totalReservations: number;
  revenue: number;
  occupancyRate: number;
}

export interface UserWithOrganization extends User {
  organization?: Organization;
}

export interface PermissionCheck {
  resource: PermissionResource;
  action: PermissionAction;
  resourceId?: string;
}

// ============================================
// NAMING CONVENTION HELPERS
// ============================================

/**
 * CONVENÇÃO DE NAMING PARA ORGANIZAÇÕES:
 * 
 * - Master Organization: slug = "rendizy"
 * - Client Organizations: slug = "rendizy_[cliente]"
 * 
 * Exemplos:
 * - "rendizy" → Organização Master (nossa)
 * - "rendizy_guesttobuy" → Cliente: GuestToBuy
 * - "rendizy_vistamar" → Cliente: Vista Mar
 * - "rendizy_temporadafeliz" → Cliente: Temporada Feliz
 */

export const MASTER_ORG_SLUG = 'rendizy';
export const ORG_SLUG_PREFIX = 'rendizy_';

/**
 * Verifica se uma organização é a Master (RENDIZY)
 */
export function isMasterOrganization(org: Organization): boolean {
  return org.slug === MASTER_ORG_SLUG || org.isMaster === true;
}

/**
 * Verifica se uma organização é cliente
 */
export function isClientOrganization(org: Organization): boolean {
  return org.slug.startsWith(ORG_SLUG_PREFIX) && org.slug !== MASTER_ORG_SLUG;
}

/**
 * Gera slug para organização cliente
 * Exemplo: generateClientSlug("Guest to Buy") → "rendizy_guesttobuy"
 */
export function generateClientSlug(clientName: string): string {
  const normalized = clientName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '') // Remove espaços
    .trim();
  
  return `${ORG_SLUG_PREFIX}${normalized}`;
}

/**
 * Extrai nome do cliente do slug
 * Exemplo: extractClientName("rendizy_guesttobuy") → "guesttobuy"
 */
export function extractClientName(slug: string): string {
  if (slug === MASTER_ORG_SLUG) {
    return 'RENDIZY (Master)';
  }
  
  if (slug.startsWith(ORG_SLUG_PREFIX)) {
    return slug.replace(ORG_SLUG_PREFIX, '');
  }
  
  return slug;
}

/**
 * Valida se um slug é válido
 */
export function isValidOrganizationSlug(slug: string): boolean {
  // Master org
  if (slug === MASTER_ORG_SLUG) {
    return true;
  }
  
  // Client org
  if (slug.startsWith(ORG_SLUG_PREFIX)) {
    const clientPart = slug.replace(ORG_SLUG_PREFIX, '');
    // Deve ter pelo menos 3 caracteres após o prefixo
    // Deve conter apenas letras minúsculas e números
    return clientPart.length >= 3 && /^[a-z0-9]+$/.test(clientPart);
  }
  
  return false;
}
