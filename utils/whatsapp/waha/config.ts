/**
 * WAHA - Configuração
 * 
 * Configurações específicas do provider WAHA (WhatsApp HTTP API)
 * Deploy: whatsapp.suacasaavenda.com.br
 */

import type { WhatsAppProviderConfig } from '../types';

export const WAHA_CONFIG: WhatsAppProviderConfig = {
  provider: 'waha',
  enabled: false, // DESABILITADO - WhatsApp API pausada temporariamente
  baseUrl: 'https://whatsapp.suacasaavenda.com.br',
  apiKey: 'rendizy_waha_2025_super_secret_key_change_this', // ALTERAR NO DEPLOY!
  sessionName: 'rendizy-default',
};

// URLs da WAHA API
export const WAHA_ENDPOINTS = {
  // Health
  health: '/health',
  
  // Sessions
  sessions: '/api/sessions',
  sessionDetail: '/api/sessions/:session',
  sessionStart: '/api/sessions/:session/start',
  sessionStop: '/api/sessions/:session/stop',
  sessionLogout: '/api/sessions/:session/logout',
  
  // Auth & QR Code
  sessionQR: '/api/sessions/:session/auth/qr',
  
  // Messages - Send
  sendText: '/api/sendText',
  sendImage: '/api/sendImage',
  sendFile: '/api/sendFile',
  sendVideo: '/api/sendVideo',
  sendAudio: '/api/sendAudio',
  sendVoice: '/api/sendVoice',
  sendLocation: '/api/sendLocation',
  sendLinkPreview: '/api/sendLinkPreview',
  sendSeen: '/api/sendSeen',
  
  // Messages - Receive
  messages: '/api/messages',
  
  // Chats
  chats: '/api/sessions/:session/chats',
  chatMessages: '/api/sessions/:session/chats/:chatId/messages',
  deleteChat: '/api/sessions/:session/chats/:chatId',
  
  // Contacts
  contacts: '/api/contacts',
  contactCheck: '/api/contacts/check-exists',
  contactAbout: '/api/contacts/about',
  contactProfilePicture: '/api/contacts/profile-picture',
  contactBlock: '/api/contacts/block',
  contactUnblock: '/api/contacts/unblock',
  
  // Groups
  groups: '/api/groups',
  
  // Status
  status: '/api/status',
  
  // Presence
  presence: '/api/presence',
  
  // Screenshot
  screenshot: '/api/screenshot',
} as const;

// Headers padrão WAHA
export const getWAHAHeaders = (apiKey: string) => ({
  'Content-Type': 'application/json',
  'X-Api-Key': apiKey,
});

// Status mapping WAHA → Padrão
export const WAHA_STATUS_MAP = {
  'STOPPED': 'DISCONNECTED',
  'STARTING': 'CONNECTING',
  'SCAN_QR_CODE': 'SCAN_QR_CODE',
  'WORKING': 'CONNECTED',
  'FAILED': 'ERROR',
} as const;

// Configuração de retry
export const WAHA_RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
};

// Timeouts
export const WAHA_TIMEOUTS = {
  qrCodeTimeout: 45000,     // 45 segundos (WAHA demora mais)
  connectionTimeout: 90000,  // 1.5 minutos
  messageTimeout: 15000,     // 15 segundos
};

// Validação de número (Brasil)
export const BRAZIL_PHONE_REGEX = /^55\d{10,11}$/;

export function validateBrazilianPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, '');
  return BRAZIL_PHONE_REGEX.test(cleanPhone);
}

export function formatPhoneForWAHA(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  
  // WAHA usa formato: 5511999999999@c.us
  if (cleanPhone.startsWith('55')) {
    return `${cleanPhone}@c.us`;
  }
  
  // Adiciona código do Brasil
  return `55${cleanPhone}@c.us`;
}

export function cleanPhoneFromWAHA(wahaPhone: string): string {
  // Remove @c.us e retorna apenas números
  return wahaPhone.replace('@c.us', '').replace(/\D/g, '');
}

// Webhook events suportados
export const WAHA_WEBHOOK_EVENTS = [
  'message',
  'message.any',
  'message.ack',
  'state.change',
  'group.join',
  'group.leave',
  'presence.update',
  'poll.vote',
  'poll.vote.failed',
] as const;

// Configuração padrão de sessão
export const WAHA_DEFAULT_SESSION_CONFIG = {
  webhooks: [
    {
      url: '', // Configurar no deploy
      events: ['message', 'message.any', 'state.change'],
      hmac: null,
      retries: null,
      customHeaders: null,
    },
  ],
  noweb: {
    store: {
      enabled: true,
      fullSync: false,
    },
  },
};
