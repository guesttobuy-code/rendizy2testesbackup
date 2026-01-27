/**
 * CRM API - Módulo COMPANIES (Empresas)
 * API para cadastro de empresas/organizações do CRM
 * Arquitetura modular - persistência SQL real
 */

import { apiRequest } from './api';
import type { ApiResponse } from './api';

// =============================================================================
// TYPES
// =============================================================================

export interface CrmCompany {
  id: string;
  organization_id: string;
  name: string;
  trading_name?: string;
  cnpj?: string;
  state_registration?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_country?: string;
  address_zip?: string;
  phone?: string;
  email?: string;
  website?: string;
  linkedin_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  industry?: string;
  annual_revenue?: number;
  employee_count?: number;
  owner_id?: string;
  owner_name?: string;
  labels?: string[];
  company_type?: 'cliente' | 'fornecedor' | 'parceiro' | 'prospect';
  custom_fields?: Record<string, unknown>;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CrmCompanyCreate {
  name: string;
  trading_name?: string;
  cnpj?: string;
  state_registration?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_country?: string;
  address_zip?: string;
  phone?: string;
  email?: string;
  website?: string;
  linkedin_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  industry?: string;
  annual_revenue?: number;
  employee_count?: number;
  owner_id?: string;
  owner_name?: string;
  labels?: string[];
  company_type?: string;
  custom_fields?: Record<string, unknown>;
  notes?: string;
}

export interface CrmCompaniesListParams {
  page?: number;
  limit?: number;
  search?: string;
  industry?: string;
  company_type?: string;
  owner_id?: string;
}

export interface CrmCompaniesListResponse {
  data: CrmCompany[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Lista empresas com paginação e filtros
 */
export async function listCompanies(params?: CrmCompaniesListParams): Promise<ApiResponse<CrmCompaniesListResponse>> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.search) queryParams.set('search', params.search);
  if (params?.industry) queryParams.set('industry', params.industry);
  if (params?.company_type) queryParams.set('company_type', params.company_type);
  if (params?.owner_id) queryParams.set('owner_id', params.owner_id);

  const query = queryParams.toString();
  return apiRequest<CrmCompaniesListResponse>(`/crm/companies${query ? `?${query}` : ''}`);
}

/**
 * Busca empresas para autocomplete
 */
export async function searchCompanies(q: string): Promise<ApiResponse<CrmCompany[]>> {
  return apiRequest<CrmCompany[]>(`/crm/companies/search?q=${encodeURIComponent(q)}`);
}

/**
 * Obtém uma empresa por ID
 */
export async function getCompany(id: string): Promise<ApiResponse<CrmCompany>> {
  return apiRequest<CrmCompany>(`/crm/companies/${id}`);
}

/**
 * Cria uma nova empresa
 */
export async function createCompany(data: CrmCompanyCreate): Promise<ApiResponse<CrmCompany>> {
  return apiRequest<CrmCompany>('/crm/companies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Atualiza uma empresa existente
 */
export async function updateCompany(id: string, data: Partial<CrmCompanyCreate>): Promise<ApiResponse<CrmCompany>> {
  return apiRequest<CrmCompany>(`/crm/companies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Deleta uma empresa
 */
export async function deleteCompany(id: string): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/crm/companies/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Lista contatos de uma empresa
 */
export async function getCompanyContacts(id: string): Promise<ApiResponse<unknown[]>> {
  return apiRequest<unknown[]>(`/crm/companies/${id}/contacts`);
}

/**
 * Lista deals de uma empresa
 */
export async function getCompanyDeals(id: string): Promise<ApiResponse<unknown[]>> {
  return apiRequest<unknown[]>(`/crm/companies/${id}/deals`);
}

// =============================================================================
// EXPORT OBJECT
// =============================================================================

export const crmCompaniesApi = {
  list: listCompanies,
  search: searchCompanies,
  get: getCompany,
  create: createCompany,
  update: updateCompany,
  delete: deleteCompany,
  getContacts: getCompanyContacts,
  getDeals: getCompanyDeals,
};

export default crmCompaniesApi;
