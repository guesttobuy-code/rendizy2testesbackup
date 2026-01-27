/**
 * CRM API - Módulo NOTES (Observações)
 * API para histórico de notas vinculadas a entidades
 * Arquitetura modular - persistência SQL real
 */

import { apiRequest } from './api';
import type { ApiResponse } from './api';

// =============================================================================
// TYPES
// =============================================================================

export interface CrmNote {
  id: string;
  organization_id: string;
  content: string;
  deal_id?: string;
  contact_id?: string;
  company_id?: string;
  task_id?: string;
  ticket_id?: string;
  note_type: 'general' | 'call' | 'meeting' | 'email';
  created_by?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CrmNoteCreate {
  content: string;
  deal_id?: string;
  contact_id?: string;
  company_id?: string;
  task_id?: string;
  ticket_id?: string;
  note_type?: 'general' | 'call' | 'meeting' | 'email';
  created_by?: string;
  created_by_name?: string;
}

export interface CrmNotesListParams {
  deal_id?: string;
  contact_id?: string;
  company_id?: string;
  task_id?: string;
  ticket_id?: string;
  note_type?: string;
  limit?: number;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Lista notas com filtros por entidade
 */
export async function listNotes(params?: CrmNotesListParams): Promise<ApiResponse<CrmNote[]>> {
  const queryParams = new URLSearchParams();
  if (params?.deal_id) queryParams.set('deal_id', params.deal_id);
  if (params?.contact_id) queryParams.set('contact_id', params.contact_id);
  if (params?.company_id) queryParams.set('company_id', params.company_id);
  if (params?.task_id) queryParams.set('task_id', params.task_id);
  if (params?.ticket_id) queryParams.set('ticket_id', params.ticket_id);
  if (params?.note_type) queryParams.set('note_type', params.note_type);
  if (params?.limit) queryParams.set('limit', params.limit.toString());

  const query = queryParams.toString();
  return apiRequest<CrmNote[]>(`/crm/notes${query ? `?${query}` : ''}`);
}

/**
 * Obtém uma nota por ID
 */
export async function getNote(id: string): Promise<ApiResponse<CrmNote>> {
  return apiRequest<CrmNote>(`/crm/notes/${id}`);
}

/**
 * Cria uma nova nota
 */
export async function createNote(data: CrmNoteCreate): Promise<ApiResponse<CrmNote>> {
  return apiRequest<CrmNote>('/crm/notes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Atualiza uma nota existente
 */
export async function updateNote(id: string, data: { content?: string; note_type?: string }): Promise<ApiResponse<CrmNote>> {
  return apiRequest<CrmNote>(`/crm/notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Deleta uma nota
 */
export async function deleteNote(id: string): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/crm/notes/${id}`, {
    method: 'DELETE',
  });
}

// =============================================================================
// EXPORT OBJECT
// =============================================================================

export const crmNotesApi = {
  list: listNotes,
  get: getNote,
  create: createNote,
  update: updateNote,
  delete: deleteNote,
};

export default crmNotesApi;
