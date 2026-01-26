/**
 * ============================================================================
 * CRM API - Módulo SERVIÇOS (Services) - Frontend
 * ============================================================================
 * 
 * 📚 DOCUMENTAÇÃO: docs/adr/ADR-001-CRM-MODULAR-ARCHITECTURE.md
 * 📝 CHANGELOG:    docs/changelogs/2026-01-26-CRM-MODULAR-MULTI-TENANT.md
 * 🗃️ TABELAS:      service_funnels, service_funnel_stages, service_tickets
 * 🔗 BACKEND:      supabase/functions/rendizy-server/routes-services.ts
 * 
 * USO:
 *   import { crmServicesApi, ServiceFunnel, ServiceTicket } from '@/utils/api-crm-services';
 *   
 *   const funnels = await crmServicesApi.list();
 *   const tickets = await crmServicesApi.listTickets({ funnel_id: 'xxx' });
 * 
 * MÉTODOS DISPONÍVEIS:
 *   crmServicesApi.list()                - Lista funis
 *   crmServicesApi.get(id)               - Obtém funil por ID
 *   crmServicesApi.create(data)          - Cria funil
 *   crmServicesApi.update(id, data)      - Atualiza funil
 *   crmServicesApi.delete(id)            - Remove funil
 *   crmServicesApi.listTickets(params)   - Lista tickets
 *   crmServicesApi.getTicket(id)         - Obtém ticket
 *   crmServicesApi.createTicket(data)    - Cria ticket
 *   crmServicesApi.updateTicket(id,data) - Atualiza ticket
 *   crmServicesApi.deleteTicket(id)      - Remove ticket
 *   crmServicesApi.moveTicket(id,stage)  - Move ticket entre etapas
 *   crmServicesApi.getStats(funnel)      - Estatísticas do funil
 * ============================================================================
 */

import { apiRequest } from './api';
import type { ApiResponse } from './api';

// =============================================================================
// TYPES
// =============================================================================

export interface ServiceFunnelStage {
  id: string;
  funnel_id: string;
  name: string;
  description?: string;
  color: string;
  order: number;
  is_resolved: boolean;
  created_at: string;
}

export interface ServiceFunnel {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  status_config?: {
    resolvedStatus: string;
    unresolvedStatus: string;
    inProgressStatus: string;
  };
  sla_config?: Record<string, unknown>;
  stages: ServiceFunnelStage[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceTicket {
  id: string;
  organization_id: string;
  funnel_id: string;
  stage_id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  property_id?: string;
  reservation_id?: string;
  guest_id?: string;
  requester_type: string;
  requester_id?: string;
  requester_name?: string;
  requester_email?: string;
  requester_phone?: string;
  assignee_id?: string;
  assignee_name?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled';
  resolved_at?: string;
  resolution_notes?: string;
  sla_due_at?: string;
  sla_breached: boolean;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
  stage?: { id: string; name: string; color: string; is_resolved: boolean };
  funnel?: { id: string; name: string };
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  slaBreached: number;
  slaDueSoon: number;
}

// =============================================================================
// FUNNELS API
// =============================================================================

export const serviceFunnelsApi = {
  /**
   * Lista todos os funis de serviços
   */
  async list(): Promise<ApiResponse<ServiceFunnel[]>> {
    return apiRequest<ServiceFunnel[]>('/crm/services/funnels', { method: 'GET' });
  },

  /**
   * Obtém um funil específico
   */
  async get(id: string): Promise<ApiResponse<ServiceFunnel>> {
    return apiRequest<ServiceFunnel>(`/crm/services/funnels/${id}`, { method: 'GET' });
  },

  /**
   * Cria um novo funil
   */
  async create(data: {
    name: string;
    description?: string;
    is_default?: boolean;
    status_config?: ServiceFunnel['status_config'];
    sla_config?: Record<string, unknown>;
    stages?: Array<{ name: string; color?: string; order?: number; is_resolved?: boolean }>;
  }): Promise<ApiResponse<ServiceFunnel>> {
    return apiRequest<ServiceFunnel>('/crm/services/funnels', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Atualiza um funil
   */
  async update(id: string, data: {
    name?: string;
    description?: string;
    is_default?: boolean;
    status_config?: ServiceFunnel['status_config'];
    sla_config?: Record<string, unknown>;
    stages?: Array<{ name: string; color?: string; order?: number; is_resolved?: boolean }>;
  }): Promise<ApiResponse<ServiceFunnel>> {
    return apiRequest<ServiceFunnel>(`/crm/services/funnels/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Deleta um funil
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiRequest<void>(`/crm/services/funnels/${id}`, { method: 'DELETE' });
  },
};

// =============================================================================
// TICKETS API
// =============================================================================

export const serviceTicketsApi = {
  /**
   * Lista tickets
   */
  async list(params?: {
    funnel_id?: string;
    stage_id?: string;
    status?: string;
    priority?: string;
    assignee_id?: string;
    property_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<ServiceTicket[]>> {
    const searchParams = new URLSearchParams();
    if (params?.funnel_id) searchParams.set('funnel_id', params.funnel_id);
    if (params?.stage_id) searchParams.set('stage_id', params.stage_id);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.priority) searchParams.set('priority', params.priority);
    if (params?.assignee_id) searchParams.set('assignee_id', params.assignee_id);
    if (params?.property_id) searchParams.set('property_id', params.property_id);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    
    const query = searchParams.toString();
    const url = query ? `/crm/services/tickets?${query}` : '/crm/services/tickets';
    return apiRequest<ServiceTicket[]>(url, { method: 'GET' });
  },

  /**
   * Obtém um ticket específico
   */
  async get(id: string): Promise<ApiResponse<ServiceTicket>> {
    return apiRequest<ServiceTicket>(`/crm/services/tickets/${id}`, { method: 'GET' });
  },

  /**
   * Cria um novo ticket
   */
  async create(data: {
    funnel_id: string;
    stage_id: string;
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    category?: string;
    property_id?: string;
    reservation_id?: string;
    guest_id?: string;
    requester_type?: string;
    requester_name?: string;
    requester_email?: string;
    requester_phone?: string;
    assignee_id?: string;
    assignee_name?: string;
    sla_due_at?: string;
    tags?: string[];
  }): Promise<ApiResponse<ServiceTicket>> {
    return apiRequest<ServiceTicket>('/crm/services/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Atualiza um ticket
   */
  async update(id: string, data: Partial<ServiceTicket>): Promise<ApiResponse<ServiceTicket>> {
    return apiRequest<ServiceTicket>(`/crm/services/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Deleta um ticket
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiRequest<void>(`/crm/services/tickets/${id}`, { method: 'DELETE' });
  },

  /**
   * Move ticket para outro estágio (drag & drop)
   */
  async move(id: string, stageId: string): Promise<ApiResponse<ServiceTicket>> {
    return apiRequest<ServiceTicket>(`/crm/services/tickets/${id}/move`, {
      method: 'POST',
      body: JSON.stringify({ stage_id: stageId }),
    });
  },
};

// =============================================================================
// STATS API
// =============================================================================

export const serviceStatsApi = {
  /**
   * Obtém estatísticas de serviços
   */
  async get(funnelId?: string): Promise<ApiResponse<ServiceStats>> {
    const url = funnelId ? `/crm/services/stats?funnel_id=${funnelId}` : '/crm/services/stats';
    return apiRequest<ServiceStats>(url, { method: 'GET' });
  },
};

// =============================================================================
// EXPORT CONSOLIDADO
// =============================================================================

export const crmServicesApi = {
  funnels: serviceFunnelsApi,
  tickets: serviceTicketsApi,
  stats: serviceStatsApi,
};
