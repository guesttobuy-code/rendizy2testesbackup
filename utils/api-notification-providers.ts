// ============================================================================
// API: Notification Providers - Frontend
// ============================================================================
// Funções para gerenciar configuração de providers de notificação
// ============================================================================

import { apiClient } from './apiClient';

// ============================================================================
// TIPOS
// ============================================================================

export interface ProviderConfig {
  provider: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'push';
  enabled: boolean;
  apiKey?: string;
  fromEmail?: string;
  fromName?: string;
  senderName?: string;
  customConfig?: Record<string, any>;
  updatedAt?: string;
}

export interface ProviderConfigInput {
  provider: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'push';
  enabled: boolean;
  apiKey?: string;
  fromEmail?: string;
  fromName?: string;
  senderName?: string;
  customConfig?: Record<string, any>;
}

export interface ConfiguredProviders {
  email: string[];
  sms: string[];
  whatsapp: string[];
  push: string[];
  in_app: string[];
}

export interface ProvidersResponse {
  providers: Record<string, ProviderConfig>;
  configuredProviders: ConfiguredProviders;
}

export interface TestSendRequest {
  channel: 'email' | 'sms' | 'whatsapp' | 'in_app';
  recipient: string;
  message?: string;
  providerOverride?: string;
}

export interface TestSendResult {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// FUNÇÕES
// ============================================================================

/**
 * Lista todos os providers configurados
 */
export async function listNotificationProviders(): Promise<ProvidersResponse> {
  const response = await apiClient<{ data: ProvidersResponse }>('/notifications/providers', {
    method: 'GET',
  });
  
  return response.data || { providers: {}, configuredProviders: {} as ConfiguredProviders };
}

/**
 * Busca configuração de um canal específico
 */
export async function getChannelProviders(channel: string): Promise<Record<string, ProviderConfig>> {
  const response = await apiClient<{ data: { configs: Record<string, ProviderConfig> } }>(`/notifications/providers/${channel}`, {
    method: 'GET',
  });
  
  return response.data?.configs || {};
}

/**
 * Salva configuração de um provider
 */
export async function saveProviderConfig(config: ProviderConfigInput): Promise<void> {
  await apiClient('/notifications/providers', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

/**
 * Remove configuração de um provider
 */
export async function deleteProviderConfig(channel: string, provider: string): Promise<void> {
  await apiClient(`/notifications/providers/${channel}/${provider}`, {
    method: 'DELETE',
  });
}

/**
 * Testa envio de notificação
 */
export async function testProviderSend(request: TestSendRequest): Promise<TestSendResult> {
  const response = await apiClient<{ data: { result: TestSendResult } }>('/notifications/providers/test', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  
  return response.data?.result || { success: false, provider: 'unknown' };
}

/**
 * Verifica se um canal tem algum provider configurado
 */
export async function isChannelConfigured(channel: string): Promise<boolean> {
  const { configuredProviders } = await listNotificationProviders();
  return (configuredProviders[channel as keyof ConfiguredProviders] || []).length > 0;
}
