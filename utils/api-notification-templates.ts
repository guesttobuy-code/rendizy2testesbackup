// ============================================================================
// API: Notification Templates - Frontend
// ============================================================================
// Funções para gerenciar templates de notificação
// 
// @version 1.0.0
// @date 2026-01-27
// @author GitHub Copilot
// ============================================================================
// 
// REFERÊNCIA RÁPIDA:
// 
// USADO POR:
//   - components/NotificationTemplatesPage.tsx
//   - components/NotificationTemplateEditor.tsx
// 
// BACKEND:
//   - routes-notification-templates.ts (10 endpoints)
// 
// FUNÇÕES PRINCIPAIS:
//   - listTemplates(filters?)     - Lista com filtros opcionais
//   - getTemplate(id)             - Busca por ID
//   - createTemplate(input)       - Cria novo
//   - updateTemplate(id, input)   - Atualiza existente
//   - deleteTemplate(id)          - Remove
//   - toggleTemplateStatus(id, active) - Ativa/desativa
//   - duplicateTemplate(id, name) - Cria cópia
//   - listTriggerTypes()          - Lista triggers disponíveis
//   - previewTemplate(content, subject, data) - Preview com variáveis
//   - testTemplate(id, channel, recipient) - Envia teste real
// 
// HELPERS:
//   - extractVariables(text)      - Extrai {{vars}} do texto
//   - replaceVariables(text, data) - Substitui {{vars}} por valores
// 
// CONSTANTES:
//   - SAMPLE_DATA                 - Dados de exemplo para preview
//   - CHANNEL_LABELS              - Labels pt-BR dos canais
//   - TRIGGER_CATEGORIES          - Categorias de triggers
// 
// DOCS: docs/REFERENCIA_NOTIFICACOES.md
// ============================================================================

import { apiClient } from './apiClient';

// ============================================================================
// TIPOS
// ============================================================================

export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'in_app';

export interface NotificationTemplate {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  internal_code?: string;
  trigger_event: string;
  trigger_config?: Record<string, any>;
  is_active: boolean;
  is_system: boolean;
  channels: NotificationChannel[];
  
  // Conteúdo por canal
  email_subject?: string;
  email_body?: string;
  email_provider?: string;
  
  sms_body?: string;
  sms_provider?: string;
  
  whatsapp_body?: string;
  whatsapp_provider?: string;
  
  in_app_title?: string;
  in_app_body?: string;
  
  variables_used?: string[];
  
  created_at?: string;
  updated_at?: string;
}

export interface NotificationTemplateInput {
  name: string;
  description?: string;
  internal_code?: string;
  trigger_event: string;
  trigger_config?: Record<string, any>;
  is_active?: boolean;
  channels: NotificationChannel[];
  
  email_subject?: string;
  email_body?: string;
  email_provider?: string;
  
  sms_body?: string;
  sms_provider?: string;
  
  whatsapp_body?: string;
  whatsapp_provider?: string;
  
  in_app_title?: string;
  in_app_body?: string;
}

export interface TriggerType {
  id: string;
  name: string;
  description?: string;
  category: 'reservations' | 'payments' | 'communication' | 'system';
  available_variables: string[];
  is_active: boolean;
  sort_order: number;
}

export interface TemplateListResponse {
  templates: NotificationTemplate[];
  total: number;
}

export interface TemplatePreviewRequest {
  template_id?: string;
  channel: NotificationChannel;
  content: string;
  subject?: string;
  sample_data?: Record<string, any>;
}

export interface TemplatePreviewResponse {
  rendered_subject?: string;
  rendered_body: string;
  variables_found: string[];
  missing_variables: string[];
}

// ============================================================================
// FUNÇÕES - TEMPLATES
// ============================================================================

/**
 * Lista todos os templates da organização
 */
export async function listTemplates(filters?: {
  trigger_event?: string;
  channel?: NotificationChannel;
  is_active?: boolean;
}): Promise<TemplateListResponse> {
  const params = new URLSearchParams();
  if (filters?.trigger_event) params.append('trigger_event', filters.trigger_event);
  if (filters?.channel) params.append('channel', filters.channel);
  if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));
  
  const queryString = params.toString();
  const url = `/notifications/templates${queryString ? `?${queryString}` : ''}`;
  
  const response = await apiClient<{ data: TemplateListResponse }>(url, {
    method: 'GET',
  });
  
  return response.data || { templates: [], total: 0 };
}

/**
 * Busca um template por ID
 */
export async function getTemplate(id: string): Promise<NotificationTemplate | null> {
  const response = await apiClient<{ data: { template: NotificationTemplate } }>(`/notifications/templates/${id}`, {
    method: 'GET',
  });
  
  return response.data?.template || null;
}

/**
 * Cria um novo template
 */
export async function createTemplate(input: NotificationTemplateInput): Promise<NotificationTemplate> {
  const response = await apiClient<{ data: { template: NotificationTemplate } }>('/notifications/templates', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  
  if (!response.data?.template) {
    throw new Error('Erro ao criar template');
  }
  
  return response.data.template;
}

/**
 * Atualiza um template existente
 */
export async function updateTemplate(id: string, input: Partial<NotificationTemplateInput>): Promise<NotificationTemplate> {
  const response = await apiClient<{ data: { template: NotificationTemplate } }>(`/notifications/templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  
  if (!response.data?.template) {
    throw new Error('Erro ao atualizar template');
  }
  
  return response.data.template;
}

/**
 * Deleta um template
 */
export async function deleteTemplate(id: string): Promise<void> {
  await apiClient(`/notifications/templates/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Ativa/desativa um template
 */
export async function toggleTemplateStatus(id: string, is_active: boolean): Promise<void> {
  await apiClient(`/notifications/templates/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active }),
  });
}

/**
 * Duplica um template
 */
export async function duplicateTemplate(id: string, newName: string): Promise<NotificationTemplate> {
  const response = await apiClient<{ data: { template: NotificationTemplate } }>(`/notifications/templates/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ name: newName }),
  });
  
  if (!response.data?.template) {
    throw new Error('Erro ao duplicar template');
  }
  
  return response.data.template;
}

// ============================================================================
// FUNÇÕES - TRIGGERS
// ============================================================================

/**
 * Lista todos os tipos de trigger disponíveis
 */
export async function listTriggerTypes(): Promise<TriggerType[]> {
  const response = await apiClient<{ data: { triggers: TriggerType[] } }>('/notifications/triggers', {
    method: 'GET',
  });
  
  return response.data?.triggers || [];
}

/**
 * Busca variáveis disponíveis para um trigger
 */
export async function getTriggerVariables(triggerEvent: string): Promise<string[]> {
  const triggers = await listTriggerTypes();
  const trigger = triggers.find(t => t.id === triggerEvent);
  return trigger?.available_variables || [];
}

// ============================================================================
// FUNÇÕES - PREVIEW E TESTE
// ============================================================================

/**
 * Gera preview do template com dados de exemplo
 */
export async function previewTemplate(request: TemplatePreviewRequest): Promise<TemplatePreviewResponse> {
  const response = await apiClient<{ data: TemplatePreviewResponse }>('/notifications/templates/preview', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  
  return response.data || {
    rendered_body: request.content,
    variables_found: [],
    missing_variables: [],
  };
}

/**
 * Envia teste do template
 */
export async function testTemplate(templateId: string, channel: NotificationChannel, recipient: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const response = await apiClient<{ data: { success: boolean; message?: string; error?: string } }>(`/notifications/templates/${templateId}/test`, {
    method: 'POST',
    body: JSON.stringify({ channel, recipient }),
  });
  
  return response.data || { success: false, error: 'Erro desconhecido' };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extrai variáveis de um texto (formato {{variavel}})
 */
export function extractVariables(text: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const variables: string[] = [];
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }
  
  return variables;
}

/**
 * Substitui variáveis em um texto
 */
export function replaceVariables(text: string, data: Record<string, any>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return data[key] !== undefined ? String(data[key]) : `{{${key}}}`;
  });
}

/**
 * Dados de exemplo para preview
 */
export const SAMPLE_DATA: Record<string, any> = {
  guestName: 'João Silva',
  guestEmail: 'joao.silva@email.com',
  guestPhone: '+55 11 99999-9999',
  checkInDate: '25/01/2026',
  checkInTime: '15:00',
  checkOutDate: '30/01/2026',
  checkOutTime: '11:00',
  propertyName: 'Casa da Praia',
  propertyAddress: 'Rua das Flores, 123 - Florianópolis/SC',
  totalAmount: 'R$ 2.500,00',
  reservationCode: 'RES-2026-001',
  nights: '5',
  adults: '2',
  children: '1',
  accessCode: '1234',
  wifiName: 'CasaPraia_WiFi',
  wifiPassword: 'bemvindo2026',
  emergencyPhone: '+55 48 99999-0000',
  organizationName: 'Rendizy Imóveis',
  paymentAmount: 'R$ 1.250,00',
  paymentMethod: 'PIX',
  pendingAmount: 'R$ 1.250,00',
  dueDate: '20/01/2026',
  paymentLink: 'https://pay.rendizy.com/abc123',
};

/**
 * Categorias de trigger formatadas
 */
export const TRIGGER_CATEGORIES: Record<string, string> = {
  reservations: '📅 Reservas',
  payments: '💰 Pagamentos',
  communication: '💬 Comunicação',
  system: '⚙️ Sistema',
};

/**
 * Ícones por canal
 */
export const CHANNEL_ICONS: Record<NotificationChannel, string> = {
  email: '📧',
  sms: '📱',
  whatsapp: '💬',
  in_app: '🔔',
};

/**
 * Labels por canal
 */
export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  in_app: 'In-App',
};
