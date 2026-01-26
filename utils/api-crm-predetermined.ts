/**
 * ============================================================================
 * CRM API - Módulo PRÉ-DETERMINADOS (Predetermined) - Frontend
 * ============================================================================
 * 
 * 📚 DOCUMENTAÇÃO: docs/adr/ADR-001-CRM-MODULAR-ARCHITECTURE.md
 * 📝 CHANGELOG:    docs/changelogs/2026-01-26-CRM-MODULAR-MULTI-TENANT.md
 * 🗃️ TABELAS:      predetermined_funnels, predetermined_funnel_stages, predetermined_items
 * 🔗 BACKEND:      supabase/functions/rendizy-server/routes-predetermined.ts
 * 
 * USO:
 *   import { crmPredeterminedApi, PredeterminedFunnel, PredeterminedItem } from '@/utils/api-crm-predetermined';
 *   
 *   const funnels = await crmPredeterminedApi.list();
 *   const items = await crmPredeterminedApi.listItems({ funnel_id: 'xxx' });
 * 
 * MÉTODOS DISPONÍVEIS:
 *   crmPredeterminedApi.list()              - Lista funis
 *   crmPredeterminedApi.get(id)             - Obtém funil por ID
 *   crmPredeterminedApi.create(data)        - Cria funil
 *   crmPredeterminedApi.update(id, data)    - Atualiza funil
 *   crmPredeterminedApi.delete(id)          - Remove funil
 *   crmPredeterminedApi.listItems(params)   - Lista items
 *   crmPredeterminedApi.getItem(id)         - Obtém item
 *   crmPredeterminedApi.createItem(data)    - Cria item
 *   crmPredeterminedApi.updateItem(id,data) - Atualiza item
 *   crmPredeterminedApi.deleteItem(id)      - Remove item
 *   crmPredeterminedApi.moveItem(id,stage)  - Move item entre etapas
 *   crmPredeterminedApi.getStats(funnel)    - Estatísticas do funil
 * ============================================================================
 */

import { apiRequest } from './api';
import type { ApiResponse } from './api';

// =============================================================================
// TYPES
// =============================================================================

export interface PredeterminedFunnelStage {
  id: string;
  funnel_id: string;
  name: string;
  description?: string;
  color: string;
  order: number;
  auto_actions?: Record<string, unknown>;
  required_fields?: Record<string, unknown>;
  created_at: string;
}

export interface PredeterminedFunnel {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  trigger_type?: string; // checkin, checkout, reservation_created, manual
  auto_create: boolean;
  status_config?: {
    completedStatus: string;
    cancelledStatus: string;
    inProgressStatus: string;
  };
  stages: PredeterminedFunnelStage[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PredeterminedItem {
  id: string;
  organization_id: string;
  funnel_id: string;
  stage_id: string;
  title: string;
  description?: string;
  property_id?: string;
  reservation_id?: string;
  guest_id?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'skipped';
  completed_at?: string;
  form_data?: Record<string, unknown>;
  checklist?: Array<{ id: string; text: string; completed: boolean }>;
  assignee_id?: string;
  assignee_name?: string;
  due_date?: string;
  started_at?: string;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
  notes?: string;
  stage?: { id: string; name: string; color: string };
  funnel?: { id: string; name: string; trigger_type?: string };
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PredeterminedStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  skipped: number;
  dueToday: number;
  overdue: number;
  completionRate: number;
}

// =============================================================================
// FUNNELS API
// =============================================================================

export const predeterminedFunnelsApi = {
  /**
   * Lista todos os funis pré-determinados
   */
  async list(): Promise<ApiResponse<PredeterminedFunnel[]>> {
    return apiRequest<PredeterminedFunnel[]>('/crm/predetermined/funnels', { method: 'GET' });
  },

  /**
   * Obtém um funil específico
   */
  async get(id: string): Promise<ApiResponse<PredeterminedFunnel>> {
    return apiRequest<PredeterminedFunnel>(`/crm/predetermined/funnels/${id}`, { method: 'GET' });
  },

  /**
   * Cria um novo funil
   */
  async create(data: {
    name: string;
    description?: string;
    is_default?: boolean;
    trigger_type?: string;
    auto_create?: boolean;
    status_config?: PredeterminedFunnel['status_config'];
    stages?: Array<{ name: string; color?: string; order?: number; auto_actions?: Record<string, unknown>; required_fields?: Record<string, unknown> }>;
  }): Promise<ApiResponse<PredeterminedFunnel>> {
    return apiRequest<PredeterminedFunnel>('/crm/predetermined/funnels', {
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
    trigger_type?: string;
    auto_create?: boolean;
    status_config?: PredeterminedFunnel['status_config'];
    stages?: Array<{ name: string; color?: string; order?: number; auto_actions?: Record<string, unknown>; required_fields?: Record<string, unknown> }>;
  }): Promise<ApiResponse<PredeterminedFunnel>> {
    return apiRequest<PredeterminedFunnel>(`/crm/predetermined/funnels/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Deleta um funil
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiRequest<void>(`/crm/predetermined/funnels/${id}`, { method: 'DELETE' });
  },
};

// =============================================================================
// ITEMS API
// =============================================================================

export const predeterminedItemsApi = {
  /**
   * Lista items
   */
  async list(params?: {
    funnel_id?: string;
    stage_id?: string;
    status?: string;
    property_id?: string;
    reservation_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<PredeterminedItem[]>> {
    const searchParams = new URLSearchParams();
    if (params?.funnel_id) searchParams.set('funnel_id', params.funnel_id);
    if (params?.stage_id) searchParams.set('stage_id', params.stage_id);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.property_id) searchParams.set('property_id', params.property_id);
    if (params?.reservation_id) searchParams.set('reservation_id', params.reservation_id);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    
    const query = searchParams.toString();
    const url = query ? `/crm/predetermined/items?${query}` : '/crm/predetermined/items';
    return apiRequest<PredeterminedItem[]>(url, { method: 'GET' });
  },

  /**
   * Obtém um item específico
   */
  async get(id: string): Promise<ApiResponse<PredeterminedItem>> {
    return apiRequest<PredeterminedItem>(`/crm/predetermined/items/${id}`, { method: 'GET' });
  },

  /**
   * Cria um novo item
   */
  async create(data: {
    funnel_id: string;
    stage_id: string;
    title: string;
    description?: string;
    property_id?: string;
    reservation_id?: string;
    guest_id?: string;
    assignee_id?: string;
    assignee_name?: string;
    due_date?: string;
    form_data?: Record<string, unknown>;
    checklist?: Array<{ id: string; text: string; completed: boolean }>;
    tags?: string[];
    notes?: string;
  }): Promise<ApiResponse<PredeterminedItem>> {
    return apiRequest<PredeterminedItem>('/crm/predetermined/items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Atualiza um item
   */
  async update(id: string, data: Partial<PredeterminedItem>): Promise<ApiResponse<PredeterminedItem>> {
    return apiRequest<PredeterminedItem>(`/crm/predetermined/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Deleta um item
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiRequest<void>(`/crm/predetermined/items/${id}`, { method: 'DELETE' });
  },

  /**
   * Move item para outro estágio (drag & drop)
   */
  async move(id: string, stageId: string): Promise<ApiResponse<PredeterminedItem>> {
    return apiRequest<PredeterminedItem>(`/crm/predetermined/items/${id}/move`, {
      method: 'POST',
      body: JSON.stringify({ stage_id: stageId }),
    });
  },

  /**
   * Atualiza checklist de um item
   */
  async updateChecklist(id: string, checklist: Array<{ id: string; text: string; completed: boolean }>): Promise<ApiResponse<PredeterminedItem>> {
    return apiRequest<PredeterminedItem>(`/crm/predetermined/items/${id}/checklist`, {
      method: 'PATCH',
      body: JSON.stringify({ checklist }),
    });
  },
};

// =============================================================================
// STATS API
// =============================================================================

export const predeterminedStatsApi = {
  /**
   * Obtém estatísticas de pré-determinados
   */
  async get(funnelId?: string): Promise<ApiResponse<PredeterminedStats>> {
    const url = funnelId ? `/crm/predetermined/stats?funnel_id=${funnelId}` : '/crm/predetermined/stats';
    return apiRequest<PredeterminedStats>(url, { method: 'GET' });
  },
};

// =============================================================================
// EXPORT CONSOLIDADO
// =============================================================================

export const crmPredeterminedApi = {
  funnels: predeterminedFunnelsApi,
  items: predeterminedItemsApi,
  stats: predeterminedStatsApi,
};
