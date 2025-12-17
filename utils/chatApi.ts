import { publicAnonKey } from './supabase/info';
import { API_BASE_URL } from './apiBase';
import { isOfflineMode } from './offlineConfig';

const BASE_URL = API_BASE_URL;

// ============================================
// HEALTH CHECK - Verifica se servidor está acessível
// ============================================

let serverHealthChecked = false;
let serverIsHealthy = false;

async function checkServerHealth() {
  if (serverHealthChecked) return serverIsHealthy;
  
  // Em modo offline, não faz check e não loga erros
  if (isOfflineMode()) {
    console.log('📴 [OFFLINE] Sistema em modo offline - backend não será verificado');
    serverHealthChecked = true;
    serverIsHealthy = false;
    return false;
  }
  
  console.log('🏥 Verificando saúde do servidor backend...');
  console.log('   URL:', BASE_URL);
  
  try {
    const response = await fetch(`${BASE_URL}/health`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
      },
    });
    
    serverHealthChecked = true;
    serverIsHealthy = response.ok;
    
    if (response.ok) {
      console.log('✅ Servidor backend está ONLINE');
    } else {
      console.error('❌ Servidor backend retornou erro:', response.status);
      console.error('   Isso pode significar que a Edge Function não está deployada');
    }
    
    return serverIsHealthy;
  } catch (error) {
    serverHealthChecked = true;
    serverIsHealthy = false;
    
    // Não loga erros se estiver em modo offline
    if (!isOfflineMode()) {
      console.error('❌ Servidor backend está OFFLINE ou inacessível');
      console.error('   Erro:', error instanceof Error ? error.message : String(error));
      console.error('');
      console.error('📋 POSSÍVEIS SOLUÇÕES:');
      console.error('   1. Execute: cd supabase/functions && supabase functions serve');
      console.error('   2. Ou faça deploy: supabase functions deploy rendizy-server');
      console.error('   3. Verifique se o projeto Supabase está ativo');
      console.error('   4. Verifique sua conexão com internet');
      console.error('');
    }
    
    return false;
  }
}

// Executa check ao carregar o módulo apenas se NÃO estiver em modo offline
if (!isOfflineMode()) {
  checkServerHealth();
}

// ============================================
// TYPES
// ============================================

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'guest' | 'staff' | 'system';
  sender_name: string;
  sender_id?: string;
  content: string;
  sent_at: string;
  read_at?: string;
  organization_id: string;
  attachments?: string[];
  
  // ============================================
  // 🆕 MULTI-CHANNEL SUPPORT (v1.0.101)
  // ============================================
  channel: 'internal' | 'whatsapp' | 'sms' | 'email';
  direction: 'incoming' | 'outgoing';
  
  // External integration data
  external_id?: string; // ID from Evolution API, Twilio, etc
  external_status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  external_error?: string;
  
  // Metadata for media and other channel-specific data
  metadata?: {
    media_url?: string;
    media_type?: string; // image, video, audio, document
    media_caption?: string;
    whatsapp_message_id?: string;
    sms_message_sid?: string;
    error_code?: string;
    error_message?: string;
  };
}

export interface Conversation {
  id: string;
  organization_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  reservation_code?: string;
  property_name?: string;
  property_id?: string;
  channel: 'internal' | 'whatsapp' | 'sms' | 'email';
  status: 'unread' | 'read' | 'resolved';
  category: 'urgent' | 'normal' | 'resolved';
  conversation_type: 'guest' | 'lead';
  last_message: string;
  last_message_at: string;
  checkin_date?: string;
  checkout_date?: string;
  order?: number;
  isPinned?: boolean;
  tags?: string[];
  lead_data?: {
    desired_location?: string;
    num_guests?: number;
    desired_checkin?: string;
    desired_checkout?: string;
  };
  created_at: string;
  updated_at: string;
  
  // ============================================
  // 🆕 MULTI-CHANNEL SUPPORT (v1.0.101)
  // ============================================
  // External conversation ID (for WhatsApp, SMS, etc)
  external_conversation_id?: string;
  
  // Last channel used for this conversation
  last_channel?: 'internal' | 'whatsapp' | 'sms' | 'email';
  
  // Channel-specific metadata
  channel_metadata?: {
    whatsapp_contact_id?: string;
    whatsapp_profile_pic?: string;
    sms_phone_number?: string;
  };
}

export interface MessageTemplate {
  id: string;
  organization_id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  content: string;
  content_en?: string;
  content_es?: string;
  category: 'pre_checkin' | 'post_checkout' | 'during_stay' | 'payment' | 'general' | 'urgent';
  created_at: string;
  updated_at: string;
}

export interface ChatTag {
  id: string;
  organization_id: string;
  name: string;
  color: string;
  description?: string;
  created_at: string;
  conversations_count: number;
}

export interface Quotation {
  id: string;
  organization_id: string;
  quotation_code: string;
  property_id: string;
  property_name: string;
  start_date: string;
  end_date: string;
  nights: number;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  price_per_night: number;
  total_price: number;
  deposit?: number;
  installment_value?: number;
  payment_option: 'full' | 'deposit' | 'installments';
  validity_days: number;
  valid_until: string;
  notes?: string;
  link: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'converted';
  conversation_id?: string;
  reservation_id?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  accepted_at?: string;
  rejected_at?: string;
  converted_at?: string;
}

export interface Block {
  id: string;
  organization_id: string;
  property_id: string;
  property_name?: string;
  start_date: string;
  end_date: string;
  type: 'block';
  subtype?: 'simple' | 'predictive' | 'maintenance';
  reason: string;
  notes?: string;
  check_in_time?: string;
  check_out_time?: string;
  limitations?: {
    acoes?: boolean;
    espera?: boolean;
  };
  created_at: string;
  updated_at: string;
  created_by: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const fullUrl = `${BASE_URL}${endpoint}`;
  
  // Em modo offline, retorna falha silenciosa
  if (isOfflineMode()) {
    return {
      success: false,
      error: 'Offline mode'
    };
  }
  
  try {
    // ✅ GARANTIR que credentials não seja passado via options
    const { credentials, ...restOptions } = options;
    
    const response = await fetch(fullUrl, {
      ...restOptions,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${publicAnonKey}`,
        ...restOptions.headers,
      },
      credentials: 'omit', // ✅ Explícito: não enviar credentials
    });

    const json = await response.json();

    if (!response.ok) {
      return { success: false, error: json.error || json.message || 'Unknown error' };
    }

    return json;
  } catch (error) {
    // Silencia erros em modo offline
    if (isOfflineMode()) {
      return {
        success: false,
        error: 'Offline mode'
      };
    }
    
    // Loga erros apenas se não estiver em modo offline
    console.error(`❌ Network Error [${endpoint}]:`, error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ============================================
// CONVERSATIONS API
// ============================================

export const conversationsApi = {
  list: (organizationId: string) =>
    fetchAPI<Conversation[]>(`/chat/conversations?organization_id=${organizationId}`),

  get: (conversationId: string, organizationId: string) =>
    fetchAPI<Conversation>(
      `/chat/conversations/${conversationId}?organization_id=${organizationId}`
    ),

  create: (data: Partial<Conversation>) =>
    fetchAPI<Conversation>('/chat/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (conversationId: string, data: Partial<Conversation>) =>
    fetchAPI<Conversation>(`/chat/conversations/${conversationId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (conversationId: string, organizationId: string) =>
    fetchAPI<void>(
      `/chat/conversations/${conversationId}?organization_id=${organizationId}`,
      { method: 'DELETE' }
    ),

  updateOrder: (conversationId: string, organizationId: string, order: number) =>
    fetchAPI<Conversation>(`/chat/conversations/${conversationId}/order`, {
      method: 'PATCH',
      body: JSON.stringify({ organization_id: organizationId, order }),
    }),

  togglePin: (conversationId: string, organizationId: string) =>
    fetchAPI<Conversation>(`/chat/conversations/${conversationId}/pin`, {
      method: 'PATCH',
      body: JSON.stringify({ organization_id: organizationId }),
    }),
};

// ============================================
// MESSAGES API
// ============================================

export const messagesApi = {
  list: (conversationId: string, organizationId: string) =>
    fetchAPI<Message[]>(
      `/chat/conversations/${conversationId}/messages?organization_id=${organizationId}`
    ),

  send: (conversationId: string, data: Partial<Message>) =>
    fetchAPI<Message>(`/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  markAsRead: (messageId: string, conversationId: string, organizationId: string) =>
    fetchAPI<Message>(`/chat/messages/${messageId}/read`, {
      method: 'PATCH',
      body: JSON.stringify({ organization_id: organizationId, conversation_id: conversationId }),
    }),
};

// ============================================
// TEMPLATES API
// ============================================

export const templatesApi = {
  list: (organizationId: string) =>
    fetchAPI<MessageTemplate[]>(`/chat/templates?organization_id=${organizationId}`),

  get: (templateId: string, organizationId: string) =>
    fetchAPI<MessageTemplate>(`/chat/templates/${templateId}?organization_id=${organizationId}`),

  create: (data: Partial<MessageTemplate>) =>
    fetchAPI<MessageTemplate>('/chat/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (templateId: string, data: Partial<MessageTemplate>) =>
    fetchAPI<MessageTemplate>(`/chat/templates/${templateId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (templateId: string, organizationId: string) =>
    fetchAPI<void>(`/chat/templates/${templateId}?organization_id=${organizationId}`, {
      method: 'DELETE',
    }),
};

// ============================================
// TAGS API
// ============================================

export const tagsApi = {
  list: (organizationId: string) =>
    fetchAPI<ChatTag[]>(`/chat/tags?organization_id=${organizationId}`),

  create: (data: Partial<ChatTag>) =>
    fetchAPI<ChatTag>('/chat/tags', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (tagId: string, data: Partial<ChatTag>) =>
    fetchAPI<ChatTag>(`/chat/tags/${tagId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (tagId: string, organizationId: string) =>
    fetchAPI<void>(`/chat/tags/${tagId}?organization_id=${organizationId}`, {
      method: 'DELETE',
    }),
};

// ============================================
// QUOTATIONS API
// ============================================

export const quotationsApi = {
  list: (organizationId: string, status?: string) => {
    const queryParams = new URLSearchParams({ organization_id: organizationId });
    if (status) queryParams.append('status', status);
    return fetchAPI<Quotation[]>(`/quotations?${queryParams}`);
  },

  get: (quotationId: string, organizationId: string) =>
    fetchAPI<Quotation>(`/quotations/${quotationId}?organization_id=${organizationId}`),

  getByCode: (code: string) =>
    fetchAPI<Quotation>(`/quotations/public/code/${code}`),

  create: (data: Partial<Quotation>) =>
    fetchAPI<Quotation>('/quotations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (quotationId: string, data: Partial<Quotation>) =>
    fetchAPI<Quotation>(`/quotations/${quotationId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  accept: (quotationId: string, organizationId: string) =>
    fetchAPI<Quotation>(`/quotations/${quotationId}/accept`, {
      method: 'PATCH',
      body: JSON.stringify({ organization_id: organizationId }),
    }),

  reject: (quotationId: string, organizationId: string) =>
    fetchAPI<Quotation>(`/quotations/${quotationId}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ organization_id: organizationId }),
    }),

  convert: (quotationId: string, organizationId: string, reservationId: string) =>
    fetchAPI<Quotation>(`/quotations/${quotationId}/convert`, {
      method: 'PATCH',
      body: JSON.stringify({ organization_id: organizationId, reservation_id: reservationId }),
    }),

  delete: (quotationId: string, organizationId: string) =>
    fetchAPI<void>(`/quotations/${quotationId}?organization_id=${organizationId}`, {
      method: 'DELETE',
    }),

  listByProperty: (propertyId: string, organizationId: string) =>
    fetchAPI<Quotation[]>(`/quotations/property/${propertyId}?organization_id=${organizationId}`),

  listByConversation: (conversationId: string, organizationId: string) =>
    fetchAPI<Quotation[]>(
      `/quotations/conversation/${conversationId}?organization_id=${organizationId}`
    ),
};

// ============================================
// 🆕 CHANNEL CONFIGURATION (v1.0.101)
// ============================================

export interface EvolutionAPIConfig {
  enabled: boolean;
  api_url: string;
  instance_name: string;
  api_key: string; // Global API Key
  instance_token?: string; // Instance-specific token (opcional)
  connected: boolean;
  phone_number?: string;
  qr_code?: string;
  connection_status?: 'disconnected' | 'connecting' | 'connected' | 'error';
  last_connected_at?: string;
  error_message?: string;
}

export interface TwilioConfig {
  enabled: boolean;
  account_sid: string;
  auth_token: string;
  phone_number: string;
  credits_remaining?: number;
  credits_used?: number;
  last_recharged_at?: string;
}

export interface OrganizationChannelConfig {
  organization_id: string;
  
  // WhatsApp (Evolution API)
  whatsapp?: EvolutionAPIConfig;
  
  // SMS (Twilio)
  sms?: TwilioConfig;
  
  // Automations
  automations?: {
    reservation_confirmation?: boolean;
    checkin_reminder?: boolean;
    checkout_review?: boolean;
    payment_reminder?: boolean;
  };
  
  // Auto-reply templates
  auto_reply_templates?: {
    [key: string]: string;
  };
  
  created_at: string;
  updated_at: string;
}

// ============================================
// CHANNELS API
// ============================================

export const channelsApi = {
  // Get channel configuration for organization
  getConfig: (organizationId: string) =>
    fetchAPI<OrganizationChannelConfig>(`/chat/channels/config?organization_id=${organizationId}`),
  
  // Update channel configuration
  updateConfig: (organizationId: string, data: Partial<OrganizationChannelConfig>) =>
    fetchAPI<OrganizationChannelConfig>('/chat/channels/config', {
      method: 'PATCH',
      body: JSON.stringify({ organization_id: organizationId, ...data }),
    }),
  
  // Evolution API - WhatsApp
  evolution: {
    // Connect WhatsApp instance (generates QR code)
    connect: (organizationId: string, config: { api_url: string; instance_name: string; api_key: string }) =>
      fetchAPI<{ qr_code: string; instance_name: string }>('/chat/channels/whatsapp/connect', {
        method: 'POST',
        body: JSON.stringify({ organization_id: organizationId, ...config }),
      }),
    
    // Get connection status
    status: (organizationId: string) =>
      fetchAPI<{ connected: boolean; phone_number?: string; error?: string }>('/chat/channels/whatsapp/status', {
        method: 'POST',
        body: JSON.stringify({ organization_id: organizationId }),
      }),
    
    // Disconnect WhatsApp
    disconnect: (organizationId: string) =>
      fetchAPI<{ success: boolean }>('/chat/channels/whatsapp/disconnect', {
        method: 'POST',
        body: JSON.stringify({ organization_id: organizationId }),
      }),
    
    // Send WhatsApp message
    sendMessage: (organizationId: string, conversationId: string, content: string, metadata?: any) =>
      fetchAPI<Message>('/chat/channels/whatsapp/send', {
        method: 'POST',
        body: JSON.stringify({
          organization_id: organizationId,
          conversation_id: conversationId,
          content,
          metadata,
        }),
      }),
  },
  
  // Twilio - SMS
  sms: {
    // Configure Twilio
    configure: (organizationId: string, config: Partial<TwilioConfig>) =>
      fetchAPI<TwilioConfig>('/chat/channels/sms/configure', {
        method: 'POST',
        body: JSON.stringify({ organization_id: organizationId, ...config }),
      }),
    
    // Send SMS
    sendMessage: (organizationId: string, conversationId: string, content: string) =>
      fetchAPI<Message>('/chat/channels/sms/send', {
        method: 'POST',
        body: JSON.stringify({
          organization_id: organizationId,
          conversation_id: conversationId,
          content,
        }),
      }),
    
    // Get credits status
    getCredits: (organizationId: string) =>
      fetchAPI<{ remaining: number; used: number }>('/chat/channels/sms/credits', {
        method: 'POST',
        body: JSON.stringify({ organization_id: organizationId }),
      }),
  },
};

// ============================================
// BLOCKS API
// ============================================

export const blocksApi = {
  list: (
    organizationId: string,
    options?: {
      propertyId?: string;
      startDate?: string;
      endDate?: string;
    }
  ) => {
    const queryParams = new URLSearchParams({ organization_id: organizationId });
    if (options?.propertyId) queryParams.append('property_id', options.propertyId);
    if (options?.startDate) queryParams.append('start_date', options.startDate);
    if (options?.endDate) queryParams.append('end_date', options.endDate);
    return fetchAPI<Block[]>(`/blocks?${queryParams}`);
  },

  get: (blockId: string, organizationId: string) =>
    fetchAPI<Block>(`/blocks/${blockId}?organization_id=${organizationId}`),

  create: (data: Partial<Block>) =>
    fetchAPI<Block>('/blocks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (blockId: string, data: Partial<Block>) =>
    fetchAPI<Block>(`/blocks/${blockId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (blockId: string, organizationId: string) =>
    fetchAPI<void>(`/blocks/${blockId}?organization_id=${organizationId}`, {
      method: 'DELETE',
    }),

  listByProperty: (
    propertyId: string,
    organizationId: string,
    options?: {
      startDate?: string;
      endDate?: string;
    }
  ) => {
    const queryParams = new URLSearchParams({ organization_id: organizationId });
    if (options?.startDate) queryParams.append('start_date', options.startDate);
    if (options?.endDate) queryParams.append('end_date', options.endDate);
    return fetchAPI<Block[]>(`/blocks/property/${propertyId}?${queryParams}`);
  },

  bulkDelete: (blockIds: string[], organizationId: string) =>
    fetchAPI<{ deleted: number; not_found: number }>('/blocks/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ organization_id: organizationId, block_ids: blockIds }),
    }),

  checkAvailability: (
    organizationId: string,
    propertyId: string,
    startDate: string,
    endDate: string
  ) => {
    const queryParams = new URLSearchParams({
      organization_id: organizationId,
      property_id: propertyId,
      start_date: startDate,
      end_date: endDate,
    });
    return fetchAPI<{
      available: boolean;
      blocks: Block[];
      reservations: any[];
    }>(`/blocks/check-availability?${queryParams}`);
  },
};

// ============================================
// FILES API
// ============================================

export interface FileMetadata {
  id: string;
  filename: string;
  path: string;
  size: number;
  type: string;
  organization_id: string;
  conversation_id?: string;
  uploaded_at: string;
  url: string;
}

export const filesApi = {
  upload: async (
    file: File,
    organizationId: string,
    conversationId?: string
  ): Promise<{ success: boolean; data?: FileMetadata; error?: string }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('organization_id', organizationId);
      if (conversationId) {
        formData.append('conversation_id', conversationId);
      }

      const response = await fetch(`${BASE_URL}/chat/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: formData,
      });

      const json = await response.json();

      if (!response.ok) {
        console.error(`Upload Error:`, json);
        return { success: false, error: json.error || json.message || 'Upload failed' };
      }

      return json;
    } catch (error) {
      console.error(`Upload Network Error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  },

  get: (fileId: string, organizationId: string) =>
    fetchAPI<FileMetadata>(`/chat/files/${fileId}?organization_id=${organizationId}`),

  listByConversation: (conversationId: string, organizationId: string) =>
    fetchAPI<FileMetadata[]>(
      `/chat/conversations/${conversationId}/files?organization_id=${organizationId}`
    ),
};

// ============================================
// EXPORT ALL
// ============================================

export const chatApi = {
  conversations: conversationsApi,
  messages: messagesApi,
  templates: templatesApi,
  tags: tagsApi,
  quotations: quotationsApi,
  blocks: blocksApi,
};
