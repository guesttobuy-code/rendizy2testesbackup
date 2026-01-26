/**
 * ============================================================================
 * CRM API - Módulo VENDAS (Sales) - Frontend
 * ============================================================================
 * 
 * 📚 DOCUMENTAÇÃO: docs/adr/ADR-001-CRM-MODULAR-ARCHITECTURE.md
 * 📝 CHANGELOG:    docs/changelogs/2026-01-26-CRM-MODULAR-MULTI-TENANT.md
 * 🗃️ TABELAS:      sales_funnels, sales_funnel_stages, sales_deals
 * 🔗 BACKEND:      supabase/functions/rendizy-server/routes-sales.ts
 * 
 * USO:
 *   import { crmSalesApi, SalesFunnel, SalesDeal } from '@/utils/api-crm-sales';
 *   
 *   const funnels = await crmSalesApi.list();
 *   const deals = await crmSalesApi.listDeals({ funnel_id: 'xxx' });
 * 
 * MÉTODOS DISPONÍVEIS:
 *   crmSalesApi.list()              - Lista funis
 *   crmSalesApi.get(id)             - Obtém funil por ID
 *   crmSalesApi.create(data)        - Cria funil
 *   crmSalesApi.update(id, data)    - Atualiza funil
 *   crmSalesApi.delete(id)          - Remove funil
 *   crmSalesApi.listDeals(params)   - Lista deals
 *   crmSalesApi.getDeal(id)         - Obtém deal
 *   crmSalesApi.createDeal(data)    - Cria deal
 *   crmSalesApi.updateDeal(id,data) - Atualiza deal
 *   crmSalesApi.deleteDeal(id)      - Remove deal
 *   crmSalesApi.moveDeal(id,stage)  - Move deal entre etapas
 *   crmSalesApi.getStats(funnel)    - Estatísticas do funil
 * ============================================================================
 */

import { apiRequest } from './api';
import type { ApiResponse } from './api';

// =============================================================================
// TYPES
// =============================================================================

export interface SalesFunnelStage {
  id: string;
  funnel_id: string;
  name: string;
  description?: string;
  color: string;
  order: number;
  created_at: string;
}

export interface SalesFunnel {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  status_config?: {
    wonStatus: string;
    lostStatus: string;
    inProgressStatus: string;
  };
  stages: SalesFunnelStage[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SalesDeal {
  id: string;
  organization_id: string;
  funnel_id: string;
  stage_id: string;
  title: string;
  description?: string;
  value: number;
  currency: string;
  probability: number;
  expected_close_date?: string;
  contact_id?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_whatsapp_jid?: string;
  source: string;
  source_metadata?: Record<string, unknown>;
  owner_id?: string;
  owner_name?: string;
  status: 'active' | 'won' | 'lost';
  won_at?: string;
  lost_at?: string;
  lost_reason?: string;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
  notes?: string;
  stage?: { id: string; name: string; color: string };
  funnel?: { id: string; name: string };
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SalesStats {
  total: number;
  active: number;
  won: number;
  lost: number;
  totalValue: number;
  wonValue: number;
  avgValue: number;
  winRate: number;
}

// =============================================================================
// FUNNELS API
// =============================================================================

export const salesFunnelsApi = {
  /**
   * Lista todos os funis de vendas
   */
  async list(): Promise<ApiResponse<SalesFunnel[]>> {
    return apiRequest<SalesFunnel[]>('/crm/sales/funnels', { method: 'GET' });
  },

  /**
   * Obtém um funil específico
   */
  async get(id: string): Promise<ApiResponse<SalesFunnel>> {
    return apiRequest<SalesFunnel>(`/crm/sales/funnels/${id}`, { method: 'GET' });
  },

  /**
   * Cria um novo funil
   */
  async create(data: {
    name: string;
    description?: string;
    is_default?: boolean;
    status_config?: SalesFunnel['status_config'];
    stages?: Array<{ name: string; color?: string; order?: number }>;
  }): Promise<ApiResponse<SalesFunnel>> {
    return apiRequest<SalesFunnel>('/crm/sales/funnels', {
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
    status_config?: SalesFunnel['status_config'];
    stages?: Array<{ name: string; color?: string; order?: number }>;
  }): Promise<ApiResponse<SalesFunnel>> {
    return apiRequest<SalesFunnel>(`/crm/sales/funnels/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Deleta um funil
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiRequest<void>(`/crm/sales/funnels/${id}`, { method: 'DELETE' });
  },
};

// =============================================================================
// DEALS API
// =============================================================================

export const salesDealsApi = {
  /**
   * Lista deals
   */
  async list(params?: {
    funnel_id?: string;
    stage_id?: string;
    status?: string;
    owner_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<SalesDeal[]>> {
    const searchParams = new URLSearchParams();
    if (params?.funnel_id) searchParams.set('funnel_id', params.funnel_id);
    if (params?.stage_id) searchParams.set('stage_id', params.stage_id);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.owner_id) searchParams.set('owner_id', params.owner_id);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    
    const query = searchParams.toString();
    const url = query ? `/crm/sales/deals?${query}` : '/crm/sales/deals';
    return apiRequest<SalesDeal[]>(url, { method: 'GET' });
  },

  /**
   * Obtém um deal específico
   */
  async get(id: string): Promise<ApiResponse<SalesDeal>> {
    return apiRequest<SalesDeal>(`/crm/sales/deals/${id}`, { method: 'GET' });
  },

  /**
   * Cria um novo deal
   */
  async create(data: {
    funnel_id: string;
    stage_id: string;
    title: string;
    description?: string;
    value?: number;
    currency?: string;
    probability?: number;
    expected_close_date?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    source?: string;
    owner_id?: string;
    owner_name?: string;
    tags?: string[];
    notes?: string;
  }): Promise<ApiResponse<SalesDeal>> {
    return apiRequest<SalesDeal>('/crm/sales/deals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Atualiza um deal
   */
  async update(id: string, data: Partial<SalesDeal>): Promise<ApiResponse<SalesDeal>> {
    return apiRequest<SalesDeal>(`/crm/sales/deals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Deleta um deal
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiRequest<void>(`/crm/sales/deals/${id}`, { method: 'DELETE' });
  },

  /**
   * Move deal para outro estágio (drag & drop)
   */
  async move(id: string, stageId: string): Promise<ApiResponse<SalesDeal>> {
    return apiRequest<SalesDeal>(`/crm/sales/deals/${id}/move`, {
      method: 'POST',
      body: JSON.stringify({ stage_id: stageId }),
    });
  },
};

// =============================================================================
// STATS API
// =============================================================================

export const salesStatsApi = {
  /**
   * Obtém estatísticas de vendas
   */
  async get(funnelId?: string): Promise<ApiResponse<SalesStats>> {
    const url = funnelId ? `/crm/sales/stats?funnel_id=${funnelId}` : '/crm/sales/stats';
    return apiRequest<SalesStats>(url, { method: 'GET' });
  },
};

// =============================================================================
// EXPORT CONSOLIDADO
// =============================================================================

export const crmSalesApi = {
  funnels: salesFunnelsApi,
  deals: salesDealsApi,
  stats: salesStatsApi,
};
