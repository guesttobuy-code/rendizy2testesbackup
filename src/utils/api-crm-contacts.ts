/**
 * CRM API - Módulo CONTACTS (Contatos/Pessoas)
 * API para cadastro de pessoas/contatos do CRM
 * Arquitetura modular - persistência SQL real
 * 
 * @version 2.0.0
 * @date 2026-01-27
 */

import { apiRequest, type ApiResponse } from '../../utils/api';

// =============================================================================
// TYPES
// =============================================================================

/** Tipos de contato disponíveis */
export type ContactType = 
  | 'guest'        // Hóspede (vem de reserva - tipo fixo/locked)
  | 'lead'         // Lead/Interessado
  | 'cliente'      // Cliente ativo
  | 'ex-cliente'   // Ex-cliente
  | 'proprietario' // Proprietário de imóvel
  | 'parceiro'     // Parceiro comercial/corretor
  | 'fornecedor'   // Fornecedor
  | 'outro';       // Outros

export interface CrmContact {
  id: string;
  organization_id: string;
  first_name?: string;
  last_name?: string;
  full_name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  whatsapp_jid?: string;
  chat_contact_id?: string;
  company_id?: string;
  company_name?: string; // Preenchido via JOIN
  job_title?: string;
  department?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_country?: string;
  address_zip?: string;
  linkedin_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  twitter_url?: string;
  source?: string;
  source_detail?: string;
  labels?: string[];
  contact_type: ContactType;
  is_type_locked?: boolean; // Se true, tipo não pode ser alterado (ex: guest)
  birth_date?: string;
  gender?: string;
  owner_id?: string;
  owner_name?: string;
  visible_to?: 'everyone' | 'owner_only' | 'team';
  custom_fields?: Record<string, unknown>;
  notes?: string;
  // Novos campos v2
  user_id?: string; // Se contato virou usuário
  property_ids?: string[]; // Imóveis vinculados (proprietário)
  company?: { id: string; name: string };
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CrmContactCreate {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  whatsapp_jid?: string;
  company_id?: string;
  job_title?: string;
  department?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_country?: string;
  address_zip?: string;
  linkedin_url?: string;
  instagram_url?: string;
  source?: string;
  source_detail?: string;
  labels?: string[];
  contact_type?: string;
  birth_date?: string;
  gender?: string;
  owner_id?: string;
  owner_name?: string;
  visible_to?: string;
  custom_fields?: Record<string, unknown>;
  notes?: string;
}

export interface CrmContactsListParams {
  page?: number;
  limit?: number;
  offset?: number;
  search?: string;
  company_id?: string;
  contact_type?: ContactType;
  owner_id?: string;
}

export interface CrmContactsListResponse {
  data: CrmContact[];
  total: number;
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
 * Lista contatos com paginação e filtros
 */
export async function listContacts(params?: CrmContactsListParams): Promise<ApiResponse<CrmContactsListResponse>> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.offset) queryParams.set('offset', params.offset.toString());
  if (params?.search) queryParams.set('search', params.search);
  if (params?.company_id) queryParams.set('company_id', params.company_id);
  if (params?.contact_type) queryParams.set('contact_type', params.contact_type);
  if (params?.owner_id) queryParams.set('owner_id', params.owner_id);

  const query = queryParams.toString();
  return apiRequest<CrmContactsListResponse>(`/crm/contacts${query ? `?${query}` : ''}`);
}

/**
 * Busca contatos para autocomplete
 */
export async function searchContacts(q: string, type?: ContactType, limit?: number): Promise<ApiResponse<CrmContact[]>> {
  const params = new URLSearchParams({ q });
  if (type) params.set('type', type);
  if (limit) params.set('limit', limit.toString());
  
  return apiRequest<CrmContact[]>(`/crm/contacts/search?${params.toString()}`);
}

/**
 * Obtém um contato por ID
 */
export async function getContact(id: string): Promise<ApiResponse<CrmContact>> {
  return apiRequest<CrmContact>(`/crm/contacts/${id}`);
}

/**
 * Cria um novo contato
 */
export async function createContact(data: CrmContactCreate): Promise<ApiResponse<CrmContact>> {
  return apiRequest<CrmContact>('/crm/contacts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Atualiza um contato existente
 */
export async function updateContact(id: string, data: Partial<CrmContactCreate>): Promise<ApiResponse<CrmContact>> {
  return apiRequest<CrmContact>(`/crm/contacts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Deleta um contato
 */
export async function deleteContact(id: string): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/crm/contacts/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Lista deals de um contato
 */
export async function getContactDeals(id: string): Promise<ApiResponse<unknown[]>> {
  return apiRequest<unknown[]>(`/crm/contacts/${id}/deals`);
}

/**
 * Lista notas de um contato
 */
export async function getContactNotes(id: string): Promise<ApiResponse<unknown[]>> {
  return apiRequest<unknown[]>(`/crm/contacts/${id}/notes`);
}

// =============================================================================
// EXPORT OBJECT
// =============================================================================

export const crmContactsApi = {
  list: listContacts,
  search: searchContacts,
  get: getContact,
  create: createContact,
  update: updateContact,
  delete: deleteContact,
  getDeals: getContactDeals,
  getNotes: getContactNotes,
};

export default crmContactsApi;
