/**
 * EVOLUTION API - Configuração
 * 
 * Configurações específicas do provider Evolution API
 */

import type { WhatsAppProviderConfig } from '../types';

export const EVOLUTION_CONFIG: WhatsAppProviderConfig = {
  provider: 'evolution',
  enabled: false, // DESABILITADO por padrão (estava dando erro 401)
  baseUrl: 'https://evo.conectese.app',
  apiKey: '', // Deixar vazio por segurança
  instanceName: 'rendizy',
};

// URLs da Evolution API
export const EVOLUTION_ENDPOINTS = {
  // Instance Management
  createInstance: '/instance/create',
  deleteInstance: '/instance/delete/:instanceName',
  fetchInstances: '/instance/fetchInstances',
  connectionState: '/instance/connectionState/:instanceName',
  
  // QR Code
  connectQR: '/instance/connect/:instanceName',
  
  // Messages
  sendText: '/message/sendText/:instanceName',
  sendMedia: '/message/sendMedia/:instanceName',
  sendImage: '/message/sendImage/:instanceName',
  sendVideo: '/message/sendVideo/:instanceName',
  sendAudio: '/message/sendAudio/:instanceName',
  sendDocument: '/message/sendDocument/:instanceName',
  
  // Chats
  fetchChats: '/chat/fetchChats/:instanceName',
  
  // Contacts
  fetchContacts: '/chat/fetchContacts/:instanceName',
  checkNumber: '/chat/checkNumber/:instanceName',
  
  // Webhooks
  setWebhook: '/webhook/set/:instanceName',
  
  // Settings
  setSetting: '/settings/set/:instanceName',
} as const;

// Headers padrão Evolution
export const getEvolutionHeaders = (apiKey: string) => ({
  'Content-Type': 'application/json',
  'apikey': apiKey,
});

// Status mapping Evolution → Padrão
export const EVOLUTION_STATUS_MAP = {
  'close': 'DISCONNECTED',
  'connecting': 'CONNECTING',
  'open': 'CONNECTED',
} as const;

// Configuração de retry
export const EVOLUTION_RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
};

// Timeouts
export const EVOLUTION_TIMEOUTS = {
  qrCodeTimeout: 30000,  // 30 segundos
  connectionTimeout: 60000, // 1 minuto
  messageTimeout: 10000, // 10 segundos
};

// Validação de número (Brasil)
export const BRAZIL_PHONE_REGEX = /^55\d{10,11}$/;

export function validateBrazilianPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, '');
  return BRAZIL_PHONE_REGEX.test(cleanPhone);
}

export function formatPhoneForEvolution(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Se já começa com 55, retorna
  if (cleanPhone.startsWith('55')) {
    return `${cleanPhone}@s.whatsapp.net`;
  }
  
  // Adiciona código do Brasil
  return `55${cleanPhone}@s.whatsapp.net`;
}
