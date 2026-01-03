// ============================================================================
// API CLIENT - FRONTEND
// ============================================================================
// Cliente para comunicação com o backend Supabase Edge Function
// Suporta modo MOCK para desenvolvimento sem backend
// ============================================================================

import { projectId, publicAnonKey } from './supabase/info';
import { Photo } from '../components/PhotoManager';
// Mock backend desabilitado em v1.0.103.305 - Sistema usa apenas Supabase

// Base URL da API (permite override via VITE_API_BASE_URL em dev)
// Base URL da API (permite override via VITE_API_BASE_URL em dev)
// import { API_BASE_URL as API_BASE_URL_OVERRIDE } from './apiBase'; // REMOVED: File not found or causing issues
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server";

// ============================================================================
// TIPOS
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// ============================================================================
// LOCATION (Prédio/Condomínio - Container físico)
// ============================================================================

export interface Location {
  id: string;
  name: string;
  code: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  sharedAmenities: string[];
  management?: {
    company?: string;
    manager?: string;
    phone?: string;
    email?: string;
  };
  buildingAccess?: {
    type: 'portaria' | 'código' | 'livre' | 'outro';
    instructions?: string;
    hasElevator: boolean;
    hasParking: boolean;
    parkingType?: 'gratuito' | 'pago' | 'rotativo';
  };
  photos: string[];
  coverPhoto?: string;
  description?: string;
  showBuildingNumber: boolean;
  stats?: {
    totalAccommodations: number;
    activeAccommodations: number;
  };
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  isActive: boolean;
}

// ============================================================================
// PROPERTY/ACCOMMODATION (Unidade individual)
// ============================================================================

export interface Property {
  id: string;
  name: string;
  code: string;
  type: string;
  status: string;

  // 🔗 VÍNCULO COM LOCATION (hierarquia)
  locationId?: string;           // ID do Location pai

  address: {
    city: string;
    state: string;
    street: string;
    number: string;
    complement?: string;         // "Apto 101", "Bloco A"
    neighborhood: string;
    zipCode: string;
    country: string;
  };
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  pricing: {
    basePrice: number;
    currency: string;
    weeklyDiscount: number;
    biweeklyDiscount: number;
    monthlyDiscount: number;
  };
  restrictions: {
    minNights: number;
    maxNights: number;
    advanceBooking: number;
    preparationTime: number;
  };
  amenities: string[];
  tags: string[];
  folder?: string;
  color?: string;
  photos: string[];
  coverPhoto?: string;
  description?: string;
  platforms: {
    airbnb?: any;
    booking?: any;
    decolar?: any;
    direct: boolean;
  };
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  isActive: boolean;
}

// ✅ CORREÇÃO v1.0.103.401: Usar tipo unificado ao invés de interface duplicada
export type { Reservation } from '../types/reservation';

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  cpf?: string;
  stats: {
    totalReservations: number;
    totalNights: number;
    totalSpent: number;
  };
  tags: string[];
  isBlacklisted: boolean;
  blacklistReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  source: string;
}

// ============================================================================
// AI PROVIDER INTEGRATION
// ============================================================================

export interface AIProviderConfigResponse {
  exists?: boolean;
  organizationId?: string;
  enabled?: boolean;
  provider?: string;
  base_url?: string;
  default_model?: string;
  temperature?: number;
  max_tokens?: number;
  prompt_template?: string;
  notes?: string | null;
  hasApiKey?: boolean;
  id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UpsertAIProviderConfigRequest {
  id?: string; // Se fornecido, edita configuração existente
  name?: string; // Nome descritivo da configuração
  provider: string;
  baseUrl: string;
  defaultModel: string;
  enabled?: boolean;
  isActive?: boolean; // Se true, ativa esta configuração e desativa outras
  temperature?: number;
  maxTokens?: number;
  promptTemplate?: string;
  notes?: string;
  apiKey?: string;
}

export interface AIProviderConfigListItem {
  id: string;
  name?: string;
  provider: string;
  base_url: string;
  default_model: string;
  enabled: boolean;
  is_active: boolean;
  temperature: number;
  max_tokens: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  hasApiKey: boolean;
}

export interface AIProviderTestResponse {
  provider: string;
  url: string;
  httpStatus: number;
  modelsCount?: number;
  testedAt: string;
}

// ============================================================================
// AUTOMATIONS - NATURAL LANGUAGE
// ============================================================================

export type AutomationPriority = 'baixa' | 'media' | 'alta';

export interface AutomationNaturalLanguageRequest {
  input: string;
  module?: string; // Mantido para compatibilidade
  modules?: string[]; // NOVO: Array de módulos
  properties?: string[]; // NOVO: IDs dos imóveis
  channel?: 'chat' | 'whatsapp' | 'email' | 'sms' | 'dashboard';
  priority?: AutomationPriority;
  language?: string;
  conversationMode?: boolean;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface AutomationCondition {
  field: string;
  operator: string;
  value: any;
}

export interface AutomationAction {
  type: string;
  channel?: string;
  template?: string;
  payload?: Record<string, any>;
}

export interface AutomationDefinition {
  name: string;
  description?: string;
  trigger: {
    type: string;
    field?: string;
    operator?: string;
    value?: any;
    schedule?: string | null;
    threshold?: number | null;
  };
  conditions?: AutomationCondition[];
  actions: AutomationAction[];
  metadata?: {
    priority?: AutomationPriority;
    requiresApproval?: boolean;
    notifyChannels?: string[];
  };
}

export interface AutomationNaturalLanguageResponse {
  definition: AutomationDefinition | null;
  conversationalResponse?: string; // Resposta conversacional quando não há automação ainda
  ai_interpretation_summary?: string; // NOVO: Resumo do que a IA interpretou
  impact_description?: string; // NOVO: Descrição do impacto
  provider: string;
  model: string;
  rawText: string;
}

// ============================================================================
// HELPER FUNCTION
// ============================================================================

// ============================================================================
// FALLBACK AUTOMÁTICO PARA BACKEND OFFLINE
// ============================================================================

let backendOfflineDetected = false;

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;

    // ✅ CORREÇÃO: Usar token do usuário do localStorage ao invés de publicAnonKey
    // ✅ SOLUÇÃO: Usar header customizado X-Auth-Token para evitar validação JWT automática do Supabase
    const userToken = localStorage.getItem('rendizy-token');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`, // Necessário para Supabase Edge Functions
      ...options.headers,
    };

    // ✅ Adicionar token customizado em header separado para evitar validação JWT automática
    if (userToken) {
      headers['X-Auth-Token'] = userToken;
    }

    // ✅ GARANTIR que credentials não seja passado via options
    const { credentials, ...restOptions } = options;

    const response = await fetch(url, {
      ...restOptions,
      headers,
      credentials: 'omit', // ✅ Explícito: não enviar credentials
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`API Error [${endpoint}]:`, data);

      // ⚡ AUTO-RECUPERAÇÃO: Se "Property not found", resetar dados automaticamente
      if (data.error === 'Property not found') {
        console.warn('⚠️ ERRO: Propriedade não encontrada!');
        console.warn('🔄 AUTO-RECUPERAÇÃO: Resetando dados corrompidos...');

        // Resetar dados automaticamente
        localStorage.removeItem('rendizy_mock_data');
        localStorage.removeItem('rendizy_data_version');

        console.log('✅ Dados resetados! Recarregando página...');

        // Recarregar após 1 segundo
        setTimeout(() => {
          window.location.reload();
        }, 1000);

        return data;
      }
    }

    // Se conseguiu conectar, marca backend como online
    backendOfflineDetected = false;
    return data;

  } catch (error) {
    console.error(`❌ Network Error [${endpoint}]:`, error);
    console.error(`   ❌ Full URL: ${API_BASE_URL}${endpoint}`);
    console.error(`   �� Error type: ${error?.constructor?.name}`);
    console.error(`   ❌ Error message: ${error instanceof Error ? error.message : 'Unknown'}`);

    // Detectar se é "Failed to fetch" (backend offline)
    const isBackendOffline = error instanceof TypeError &&
      error.message.includes('fetch');

    if (isBackendOffline && !backendOfflineDetected) {
      backendOfflineDetected = true;
      console.info('');
      console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.info('ℹ️  Backend ainda não foi deployado');
      console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.info('');
      console.info('📘 O sistema está usando dados mockados temporários.');
      console.info('');
      console.info('✅ Para habilitar backend completo:');
      console.info('   ./DEPLOY_BACKEND_NOW.sh');
      console.info('');
      console.info('📚 Documentação: START_HERE_v1.0.103.181.md');
      console.info('');
      console.info('🔄 MODO FALLBACK ATIVO');
      console.info('   • Usando localStorage como backend temporário');
      console.info('   • Sistema funciona normalmente');
      console.info('   • Dados salvos localmente');
      console.info('');
      console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    // ⚠️ FALLBACK REMOVIDO v1.0.103.308 - Sistema usa apenas Supabase
    // Não há mais fallback para localStorage para dados de negócio

    return {
      success: false,
      error: 'Network error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================================================
// FALLBACK COM LOCALSTORAGE - ⚠️ DESABILITADO v1.0.103.308
// ============================================================================
// Função desabilitada - não usar localStorage para dados de negócio
// Mantida apenas para referência histórica

function tryLocalStorageFallback<T>(
  endpoint: string,
  options: RequestInit = {}
): ApiResponse<T> | null {
  // ⚠️ FUNÇÃO DESABILITADA v1.0.103.308
  // Retorna null para forçar uso do Supabase apenas
  console.warn('⚠️ tryLocalStorageFallback DESABILITADO - Use apenas Supabase');
  return null;

  /* CÓDIGO LEGADO DESABILITADO:
  const method = options.method || 'GET';
  
  // GET /chat/channels/config
  if (method === 'GET' && endpoint.includes('/chat/channels/config')) {
    const orgId = new URL(`http://dummy${endpoint}`).searchParams.get('organization_id');
    const key = `chat_channels_config_${orgId || 'default'}`;
    const stored = localStorage.getItem(key);
    
    if (stored) {
      console.log(`📦 Carregando configuração do localStorage: ${key}`);
      return {
        success: true,
        data: JSON.parse(stored) as T,
        timestamp: new Date().toISOString(),
      };
    }
    
    // Retornar configuração padrão
    const defaultConfig = {
      organization_id: orgId || 'admin-master',
      whatsapp: {
        enabled: false,
        api_url: '',
        instance_name: '',
        api_key: '',
        connected: false,
        connection_status: 'disconnected'
      },
      sms: {
        enabled: false,
        account_sid: '',
        auth_token: '',
        phone_number: '',
        credits_remaining: 0,
        credits_used: 0
      },
      automations: {
        reservation_confirmation: false,
        checkin_reminder: false,
        checkout_review: false,
        payment_reminder: false
      },
      auto_reply_templates: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log(`📦 Criando configuração padrão no localStorage: ${key}`);
    localStorage.setItem(key, JSON.stringify(defaultConfig));
    
    return {
      success: true,
      data: defaultConfig as T,
      timestamp: new Date().toISOString(),
    };
  }
  
  // PATCH /chat/channels/config
  if (method === 'PATCH' && endpoint.includes('/chat/channels/config')) {
    try {
      const body = JSON.parse(options.body as string);
      const orgId = body.organization_id || 'admin-master';
      const key = `chat_channels_config_${orgId}`;
      
      // Carregar config existente
      const existing = localStorage.getItem(key);
      const current = existing ? JSON.parse(existing) : {};
      
      // Merge com novos dados
      const updated = {
        ...current,
        ...body,
        organization_id: orgId,
        updated_at: new Date().toISOString(),
      };
      
      // Salvar
      localStorage.setItem(key, JSON.stringify(updated));
      
      console.log(`✅ Configuração salva no localStorage: ${key}`);
      console.log(`📊 Dados salvos:`, updated);
      
      return {
        success: true,
        data: updated as T,
        message: 'Configuração salva com sucesso (modo offline)',
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      console.error('Erro ao salvar no localStorage:', err);
      return null;
    }
  }
  
  // GET /properties (lista)
  if (method === 'GET' && endpoint === '/properties' || endpoint.startsWith('/properties?')) {
    const mockData = localStorage.getItem('rendizy_mock_data');
    if (mockData) {
      const parsed = JSON.parse(mockData);
      console.log(`📦 Carregando propriedades do localStorage`);
      return {
        success: true,
        data: (parsed.properties || []) as T,
        timestamp: new Date().toISOString(),
      };
    }
    // Retornar array vazio se não houver dados
    return {
      success: true,
      data: [] as T,
      timestamp: new Date().toISOString(),
    };
  }
  
  // GET /properties/:id (específica)
  if (method === 'GET' && endpoint.match(/^\/properties\/[A-Z0-9-]+$/)) {
    const propertyId = endpoint.split('/').pop();
    const mockData = localStorage.getItem('rendizy_mock_data');
    
    if (mockData) {
      const parsed = JSON.parse(mockData);
      const property = parsed.properties?.find((p: any) => p.id === propertyId);
      
      if (property) {
        console.log(`📦 Carregando propriedade ${propertyId} do localStorage`);
        return {
          success: true,
          data: property as T,
          timestamp: new Date().toISOString(),
        };
      }
    }
    
    // Property not found
    console.warn(`⚠️ Propriedade ${propertyId} não encontrada no localStorage`);
    return {
      success: false,
      error: 'Property not found',
      message: `Propriedade ${propertyId} não encontrada (backend offline)`,
      timestamp: new Date().toISOString(),
    } as any;
  }
  
  return null;
  */ // FIM DO CÓDIGO LEGADO DESABILITADO
}

// ============================================================================
// PROPERTIES API
// ============================================================================

export const propertiesApi = {
  // Listar todas as propriedades
  list: async (filters?: {
    status?: string[];
    type?: string[];
    city?: string[];
    tags?: string[];
    folder?: string;
    search?: string;
  }): Promise<ApiResponse<Property[]>> => {
    // ✅ SUPABASE ONLY (desde v1.0.103.305)
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status.join(','));
    if (filters?.type) params.set('type', filters.type.join(','));
    if (filters?.city) params.set('city', filters.city.join(','));
    if (filters?.tags) params.set('tags', filters.tags.join(','));
    if (filters?.folder) params.set('folder', filters.folder);
    if (filters?.search) params.set('search', filters.search);

    const query = params.toString();
    return apiRequest<Property[]>(`/properties${query ? '?' + query : ''}`);
  },

  // Buscar propriedade por ID
  get: async (id: string): Promise<ApiResponse<Property>> => {
    // ✅ SUPABASE ONLY (desde v1.0.103.305)
    return apiRequest<Property>(`/properties/${id}`);
  },

  // Criar nova propriedade
  // ✅ BOAS PRÁTICAS v1.0.103.1000 - Aceitar dados do wizard (estrutura aninhada ou plana)
  create: async (data: Partial<Property> | any): Promise<ApiResponse<Property>> => {
    return apiRequest<Property>('/properties', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Atualizar propriedade
  update: async (id: string, data: Partial<Property>): Promise<ApiResponse<Property>> => {
    return apiRequest<Property>(`/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Deletar propriedade
  delete: async (id: string, options?: { permanent?: boolean; force?: boolean }): Promise<ApiResponse<null>> => {
    const params = new URLSearchParams();
    if (options?.permanent) params.set('permanent', 'true');
    if (options?.force) params.set('force', 'true');

    const query = params.toString();
    return apiRequest<null>(`/properties/${id}${query ? '?' + query : ''}`, {
      method: 'DELETE',
    });
  },

  // Buscar estatísticas da propriedade
  getStats: async (id: string): Promise<ApiResponse<any>> => {
    return apiRequest<any>(`/properties/${id}/stats`);
  },
};

// ============================================================================
// RESERVATIONS API
// ============================================================================

export const reservationsApi = {
  // Listar todas as reservas
  list: async (filters?: {
    propertyId?: string;
    guestId?: string;
    status?: string[];
    platform?: string[];
    checkInFrom?: string;
    checkInTo?: string;
  }): Promise<ApiResponse<Reservation[]>> => {
    const params = new URLSearchParams();
    if (filters?.propertyId) params.set('propertyId', filters.propertyId);
    if (filters?.guestId) params.set('guestId', filters.guestId);
    if (filters?.status) params.set('status', filters.status.join(','));
    if (filters?.platform) params.set('platform', filters.platform.join(','));
    if (filters?.checkInFrom) params.set('checkInFrom', filters.checkInFrom);
    if (filters?.checkInTo) params.set('checkInTo', filters.checkInTo);

    const query = params.toString();
    return apiRequest<Reservation[]>(`/reservations${query ? '?' + query : ''}`);
  },

  // Listar reservas paginadas (v2 opt-in no backend)
  listPaged: async (filters?: {
    propertyId?: string;
    propertyIds?: string[];
    guestId?: string;
    status?: string[];
    platform?: string[];
    checkInFrom?: string;
    checkInTo?: string;
    checkOutFrom?: string;
    checkOutTo?: string;
    createdFrom?: string;
    createdTo?: string;
    dateField?: 'checkin' | 'checkout' | 'created';
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<
    ApiResponse<{
      data: Reservation[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>
  > => {
    const params = new URLSearchParams();
    if (filters?.propertyId) params.set('propertyId', filters.propertyId);
    if (filters?.propertyIds?.length) params.set('propertyIds', filters.propertyIds.join(','));
    if (filters?.guestId) params.set('guestId', filters.guestId);
    if (filters?.status?.length) params.set('status', filters.status.join(','));
    if (filters?.platform?.length) params.set('platform', filters.platform.join(','));
    if (filters?.checkInFrom) params.set('checkInFrom', filters.checkInFrom);
    if (filters?.checkInTo) params.set('checkInTo', filters.checkInTo);
    if (filters?.checkOutFrom) params.set('checkOutFrom', filters.checkOutFrom);
    if (filters?.checkOutTo) params.set('checkOutTo', filters.checkOutTo);
    if (filters?.createdFrom) params.set('createdFrom', filters.createdFrom);
    if (filters?.createdTo) params.set('createdTo', filters.createdTo);
    if (filters?.dateField) params.set('dateField', filters.dateField);
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));

    const query = params.toString();
    return apiRequest(`/reservations${query ? '?' + query : ''}`);
  },

  // Resumo para cards (total/confirmadas/pendentes/receita)
  getSummary: async (filters?: {
    propertyId?: string;
    propertyIds?: string[];
    guestId?: string;
    status?: string[];
    platform?: string[];
    checkInFrom?: string;
    checkInTo?: string;
    checkOutFrom?: string;
    checkOutTo?: string;
    createdFrom?: string;
    createdTo?: string;
    dateField?: 'checkin' | 'checkout' | 'created';
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ApiResponse<{ total: number; confirmed: number; pending: number; revenue: number }>> => {
    const params = new URLSearchParams();
    if (filters?.propertyId) params.set('propertyId', filters.propertyId);
    if (filters?.propertyIds?.length) params.set('propertyIds', filters.propertyIds.join(','));
    if (filters?.guestId) params.set('guestId', filters.guestId);
    if (filters?.status?.length) params.set('status', filters.status.join(','));
    if (filters?.platform?.length) params.set('platform', filters.platform.join(','));
    if (filters?.checkInFrom) params.set('checkInFrom', filters.checkInFrom);
    if (filters?.checkInTo) params.set('checkInTo', filters.checkInTo);
    if (filters?.checkOutFrom) params.set('checkOutFrom', filters.checkOutFrom);
    if (filters?.checkOutTo) params.set('checkOutTo', filters.checkOutTo);
    if (filters?.createdFrom) params.set('createdFrom', filters.createdFrom);
    if (filters?.createdTo) params.set('createdTo', filters.createdTo);
    if (filters?.dateField) params.set('dateField', filters.dateField);
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);

    const query = params.toString();
    return apiRequest(`/reservations/summary${query ? '?' + query : ''}`);
  },

  // KPIs do dia (check-in/out/in-house/novas hoje)
  // inHouseToday = quantidade de imóveis/reservas em estadia hoje (não é somatório de hóspedes).
  getKpis: async (): Promise<ApiResponse<{
    date: string;
    checkinsToday: number;
    checkoutsToday: number;
    inHouseToday: number;
    newReservationsToday: number;
  }>> => {
    // Alguns deploys expõem KPIs em rotas diferentes.
    // Tentamos primeiro a rota sem prefixo; se vier 404, tentamos a rota com /rendizy-server.
    const primary = await apiRequest<{
      date: string;
      checkinsToday: number;
      checkoutsToday: number;
      inHouseToday: number;
      newReservationsToday: number;
    }>(`/reservations/kpis`);

    const primaryAny = primary as any;
    const looksLikeNotFound =
      primaryAny?.message === 'Not Found' ||
      primaryAny?.error === 'Not Found' ||
      (primaryAny?.success === false && typeof primaryAny?.error === 'string' && primaryAny.error.toLowerCase().includes('not found'));

    if (looksLikeNotFound) {
      const secondary = await apiRequest<{
        date: string;
        checkinsToday: number;
        checkoutsToday: number;
        inHouseToday: number;
        newReservationsToday: number;
      }>(`/rendizy-server/reservations/kpis`);
      if ((secondary as any)?.success) return secondary;
    }

    return primary;
  },

  // Buscar reserva por ID
  get: async (id: string): Promise<ApiResponse<Reservation>> => {
    return apiRequest<Reservation>(`/reservations/${id}`);
  },

  // Verificar disponibilidade
  checkAvailability: async (data: {
    propertyId: string;
    checkIn: string;
    checkOut: string;
  }): Promise<ApiResponse<{
    available: boolean;
    reason?: string;
    conflictingReservation?: any;
  }>> => {
    return apiRequest('/reservations/check-availability', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Criar nova reserva
  create: async (data: {
    propertyId: string;
    guestId: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    children?: number;
    infants?: number;
    pets?: number;
    platform: string;
    notes?: string;
    specialRequests?: string;
    externalId?: string;
  }): Promise<ApiResponse<Reservation>> => {
    return apiRequest<Reservation>('/reservations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Atualizar reserva
  update: async (id: string, data: {
    propertyId?: string;        // 🎯 v1.0.103.273 - Transferir para outro imóvel
    status?: string;
    checkIn?: string;
    checkOut?: string;
    adults?: number;
    children?: number;
    notes?: string;
    internalComments?: string;
    paymentStatus?: string;
  }): Promise<ApiResponse<Reservation>> => {
    return apiRequest<Reservation>(`/reservations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Cancelar reserva
  cancel: async (id: string, options?: { reason?: string }): Promise<ApiResponse<Reservation>> => {
    return apiRequest<Reservation>(`/reservations/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: options?.reason || 'Cancelada pelo usuário' }),
    });
  },

  // Deletar reserva
  delete: async (id: string): Promise<ApiResponse<null>> => {
    return apiRequest<null>(`/reservations/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================================================
// GUESTS API
// ============================================================================

export const guestsApi = {
  // Listar todos os hóspedes
  list: async (filters?: {
    search?: string;
    blacklisted?: boolean;
  }): Promise<ApiResponse<Guest[]>> => {
    const params = new URLSearchParams();
    if (filters?.search) params.set('search', filters.search);
    if (filters?.blacklisted !== undefined) {
      params.set('blacklisted', filters.blacklisted.toString());
    }

    const query = params.toString();
    return apiRequest<Guest[]>(`/guests${query ? '?' + query : ''}`);
  },

  // Busca global (cross-org) por identificadores (email/telefone/CPF)
  // Retorna sugestões com o mesmo shape de Guest, mas com `id` do tipo `global:*`.
  globalSearch: async (filters: {
    search: string;
    limit?: number;
  }): Promise<ApiResponse<Array<Guest & { isGlobalSuggestion?: boolean; cpf?: string }>>> => {
    const params = new URLSearchParams();
    params.set('search', filters.search);
    if (filters.limit !== undefined) params.set('limit', String(filters.limit));
    return apiRequest(`/guests/global-search?${params.toString()}`);
  },

  // Garante que o hóspede exista na organização atual (cria se necessário)
  ensure: async (data: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    cpf?: string;
  }): Promise<ApiResponse<Guest>> => {
    return apiRequest<Guest>('/guests/ensure', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Buscar hóspede por ID
  get: async (id: string): Promise<ApiResponse<Guest>> => {
    return apiRequest<Guest>(`/guests/${id}`);
  },

  // Criar novo hóspede
  create: async (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    cpf?: string;
    source: string;
  }): Promise<ApiResponse<Guest>> => {
    return apiRequest<Guest>('/guests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Atualizar hóspede
  update: async (id: string, data: Partial<Guest>): Promise<ApiResponse<Guest>> => {
    return apiRequest<Guest>(`/guests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Deletar hóspede
  delete: async (id: string): Promise<ApiResponse<null>> => {
    return apiRequest<null>(`/guests/${id}`, {
      method: 'DELETE',
    });
  },

  // Buscar histórico do hóspede
  getHistory: async (id: string): Promise<ApiResponse<{
    guest: Guest;
    reservations: Reservation[];
  }>> => {
    return apiRequest(`/guests/${id}/history`);
  },

  // Adicionar/remover blacklist
  toggleBlacklist: async (
    id: string,
    blacklist: boolean,
    reason?: string
  ): Promise<ApiResponse<Guest>> => {
    return apiRequest<Guest>(`/guests/${id}/blacklist`, {
      method: 'POST',
      body: JSON.stringify({ blacklist, reason }),
    });
  },
};

// ============================================================================
// CALENDAR API
// ============================================================================

export const calendarApi = {
  // Buscar dados do calendário
  getData: async (params: {
    startDate: string;
    endDate: string;
    propertyIds?: string[];
    includeBlocks?: boolean;
    includePrices?: boolean;
  }): Promise<ApiResponse<{
    properties: Property[];
    reservations: Reservation[];
    blocks: any[];
    customPrices: any[];
    customMinNights: any[];
    dateRange: {
      startDate: string;
      endDate: string;
    };
  }>> => {
    const searchParams = new URLSearchParams({
      startDate: params.startDate,
      endDate: params.endDate,
    });

    if (params.propertyIds && params.propertyIds.length > 0) {
      searchParams.set('propertyIds', params.propertyIds.join(','));
    }
    if (params.includeBlocks !== undefined) {
      searchParams.set('includeBlocks', params.includeBlocks.toString());
    }
    if (params.includePrices !== undefined) {
      searchParams.set('includePrices', params.includePrices.toString());
    }

    return apiRequest(`/calendar?${searchParams.toString()}`);
  },

  // Buscar estatísticas do calendário
  getStats: async (startDate: string, endDate: string): Promise<ApiResponse<{
    totalProperties: number;
    totalReservations: number;
    totalBlocks: number;
    occupiedNights: number;
    availableNights: number;
    totalRevenue: number;
    occupancyRate: number;
  }>> => {
    const params = new URLSearchParams({ startDate, endDate });
    return apiRequest(`/calendar/stats?${params.toString()}`);
  },

  // Criar bloqueio
  createBlock: async (data: {
    propertyId: string;
    startDate: string;
    endDate: string;
    type: 'block';
    subtype?: 'simple' | 'predictive' | 'maintenance';
    reason: string;
    notes?: string;
  }): Promise<ApiResponse<any>> => {
    return apiRequest('/calendar/blocks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Busca bloqueios por IDs de propriedades
   * ✅ v1.0.103.355 - Corrigida rota para usar endpoint correto do backend
   * ✅ v1.0.103.357 - Adiciona conversão snake_case → camelCase
   */
  getBlocks: async (propertyIds: string[]): Promise<ApiResponse<any[]>> => {
    try {
      const idsParam = propertyIds.join(',');
      // ✅ CANÔNICO: usar rota SQL do calendário (multi-tenant, com filtros)
      // Evita depender do legado /make-server-67caf26a/blocks (que pode 404 em alguns ambientes)
      const response = await apiRequest<any[]>(
        `/calendar/blocks?propertyIds=${idsParam}`,
        { method: 'GET' }
      );
      
      // ✅ FIX v1.0.103.364: Backend já retorna camelCase via sqlToBlock()
      // Não precisamos transformar novamente
      if (response.success && response.data) {
        console.log(`✅ [calendarApi.getBlocks] ${response.data.length} bloqueios carregados`);
        console.log(`🔍 [calendarApi.getBlocks] Primeiro bloqueio:`, response.data[0]);
      }
      
      return response;
    } catch (error) {
      console.error('❌ [calendarApi.getBlocks] Erro:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        data: []
      };
    }
  },

  // Atualizar bloqueio
  updateBlock: async (id: string, data: {
    subtype?: 'simple' | 'predictive' | 'maintenance';
    reason?: string;
    notes?: string;
  }): Promise<ApiResponse<any>> => {
    return apiRequest(`/calendar/blocks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // ❌ REMOVIDO: Método duplicado getBlocks() com rota ERRADA
  // O método correto está na linha 920 com rota: /rendizy-server/make-server-67caf26a/blocks

  // Deletar bloqueio
  deleteBlock: async (id: string): Promise<ApiResponse<null>> => {
    return apiRequest<null>(`/calendar/blocks/${id}`, {
      method: 'DELETE',
    });
  },

  // Atualizar preços em lote
  bulkUpdatePrices: async (data: {
    propertyIds: string[];
    startDate: string;
    endDate: string;
    price?: number;
    adjustment?: {
      type: 'increase' | 'decrease';
      value: number;
    };
    reason?: string;
  }): Promise<ApiResponse<{
    count: number;
    prices: any[];
  }>> => {
    return apiRequest('/calendar/bulk-update-prices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Atualizar mínimo de noites em lote
  bulkUpdateMinNights: async (data: {
    propertyIds: string[];
    startDate: string;
    endDate: string;
    minNights: number;
    reason?: string;
  }): Promise<ApiResponse<{
    count: number;
    minNights: any[];
  }>> => {
    return apiRequest('/calendar/bulk-update-min-nights', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Deletar preços customizados
  deleteCustomPrices: async (data: {
    propertyIds: string[];
    startDate: string;
    endDate: string;
  }): Promise<ApiResponse<{
    count: number;
  }>> => {
    return apiRequest('/calendar/delete-custom-prices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ============================================================================
// LOCATIONS API (NOVA ESTRUTURA)
// ============================================================================

export const locationsApi = {
  // Listar todos os locations
  list: async (filters?: {
    city?: string[];
    state?: string[];
    search?: string;
    hasElevator?: boolean;
    hasParking?: boolean;
  }): Promise<ApiResponse<Location[]>> => {
    const params = new URLSearchParams();
    if (filters?.city) params.set('city', filters.city.join(','));
    if (filters?.state) params.set('state', filters.state.join(','));
    if (filters?.search) params.set('search', filters.search);
    if (filters?.hasElevator !== undefined) params.set('hasElevator', String(filters.hasElevator));
    if (filters?.hasParking !== undefined) params.set('hasParking', String(filters.hasParking));

    const query = params.toString();
    return apiRequest<Location[]>(`/locations${query ? '?' + query : ''}`);
  },

  // Buscar location por ID
  get: async (id: string): Promise<ApiResponse<{
    location: Location;
    accommodations: Property[];
  }>> => {
    return apiRequest(`/locations/${id}`);
  },

  // Criar novo location
  create: async (data: {
    name: string;
    code: string;
    address: Location['address'];
    sharedAmenities?: string[];
    management?: Location['management'];
    buildingAccess?: Location['buildingAccess'];
    description?: string;
    showBuildingNumber?: boolean;
  }): Promise<ApiResponse<Location>> => {
    return apiRequest<Location>('/locations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Atualizar location
  update: async (id: string, data: Partial<Location>): Promise<ApiResponse<Location>> => {
    return apiRequest<Location>(`/locations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Deletar location
  delete: async (id: string, options?: { permanent?: boolean; force?: boolean }): Promise<ApiResponse<null>> => {
    const params = new URLSearchParams();
    if (options?.permanent) params.set('permanent', 'true');
    if (options?.force) params.set('force', 'true');

    const query = params.toString();
    return apiRequest<null>(`/locations/${id}${query ? '?' + query : ''}`, {
      method: 'DELETE',
    });
  },

  // Buscar accommodations de um location
  getAccommodations: async (id: string): Promise<ApiResponse<{
    location: {
      id: string;
      name: string;
      code: string;
      address: Location['address'];
    };
    accommodations: Property[];
    total: number;
  }>> => {
    return apiRequest(`/locations/${id}/accommodations`);
  },
};

// ============================================================================
// DEV API (Ferramentas de desenvolvimento)
// ============================================================================

export const devApi = {
  // Seed com estrutura antiga (compatibilidade)
  seedDatabase: async (): Promise<ApiResponse<{
    propertiesCount: number;
    guestsCount: number;
    reservationsCount: number;
  }>> => {
    return apiRequest('/dev/seed-database', {
      method: 'POST',
    });
  },

  // Seed com NOVA estrutura (Location → Accommodation)
  seedDatabaseNew: async (): Promise<ApiResponse<{
    locationsCount: number;
    accommodationsCount: number;
    guestsCount: number;
    reservationsCount: number;
    linkedAccommodations: number;
    standaloneAccommodations: number;
  }>> => {
    return apiRequest('/dev/seed-database-new', {
      method: 'POST',
    });
  },
};

// ============================================================================
// LISTINGS API
// ============================================================================

export interface Listing {
  id: string;
  locationId: string;
  propertyId: string;
  propertyName: string;
  title: string;
  description: string;
  propertyType: 'apartment' | 'house' | 'studio' | 'loft';
  status: 'draft' | 'active' | 'inactive' | 'archived';
  publishedPlatforms: Platform[];
  pricing: {
    basePrice: number;
    currency: string;
    cleaningFee: number;
    extraGuestFee: number;
  };
  capacity: {
    guests: number;
    bedrooms: number;
    beds: number;
    bathrooms: number;
  };
  amenities: string[];
  photos: {
    url: string;
    order: number;
    isCover: boolean;
  }[];
  stats: {
    views: number;
    reservations: number;
    revenue: number;
    rating: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Platform {
  name: 'airbnb' | 'booking' | 'vrbo' | 'direct';
  status: 'active' | 'inactive' | 'pending';
  listingUrl?: string;
  externalId?: string;
  publishedAt?: string;
}

export const listingsApi = {
  // Listar todos os listings
  list: async (): Promise<ApiResponse<Listing[]>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/listings`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return {
        success: data.success,
        data: data.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Erro ao listar listings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
      };
    }
  },

  // Obter detalhes de um listing
  get: async (id: string): Promise<ApiResponse<Listing>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/listings/${id}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return {
        success: data.success,
        data: data.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Erro ao buscar listing:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
      };
    }
  },

  // Criar novo listing
  create: async (listing: Partial<Listing>): Promise<ApiResponse<Listing>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/listings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(listing),
      });

      const data = await response.json();
      return {
        success: data.success,
        data: data.data,
        message: data.message,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Erro ao criar listing:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
      };
    }
  },

  // Atualizar listing
  update: async (id: string, listing: Partial<Listing>): Promise<ApiResponse<Listing>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/listings/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(listing),
      });

      const data = await response.json();
      return {
        success: data.success,
        data: data.data,
        message: data.message,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Erro ao atualizar listing:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
      };
    }
  },

  // Deletar listing
  delete: async (id: string): Promise<ApiResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/listings/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const data = await response.json();
      return {
        success: data.success,
        message: data.message,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Erro ao deletar listing:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
      };
    }
  },

  // Publicar em plataforma
  publish: async (id: string, platform: string, listingUrl?: string): Promise<ApiResponse<Platform>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/listings/${id}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ platform, listingUrl }),
      });

      const data = await response.json();
      return {
        success: data.success,
        data: data.data,
        message: data.message,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Erro ao publicar listing:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
      };
    }
  },

  // Despublicar de plataforma
  unpublish: async (id: string, platform: string): Promise<ApiResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/listings/${id}/unpublish/${platform}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const data = await response.json();
      return {
        success: data.success,
        message: data.message,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Erro ao despublicar listing:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
      };
    }
  },

  // Registrar estatísticas
  recordStats: async (id: string, stats: { views?: number; reservations?: number; revenue?: number; avgRating?: number; date?: string }): Promise<ApiResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/listings/${id}/stats`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stats),
      });

      const data = await response.json();
      return {
        success: data.success,
        data: data.data,
        message: data.message,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Erro ao registrar stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
      };
    }
  },

  // Obter estatísticas
  getStats: async (id: string): Promise<ApiResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/listings/${id}/stats`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const data = await response.json();
      return {
        success: data.success,
        data: data.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Erro ao buscar stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
      };
    }
  },

  // Obter resumo geral
  getSummary: async (): Promise<ApiResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/listings/stats/summary`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const data = await response.json();
      return {
        success: data.success,
        data: data.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Erro ao buscar resumo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
      };
    }
  },
};

// ============================================================================
// PHOTOS API
// ============================================================================

export const photosApi = {
  // Upload de foto
  upload: async (file: File, propertyId: string, room: string): Promise<ApiResponse<Photo>> => {
    console.log('📸 Frontend: Starting upload', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      propertyId,
      room
    });

    // COMPRESSÃO AUTOMÁTICA se > 5MB
    let fileToUpload = file;
    const MAX_SIZE_MB = 5;
    const fileSizeMB = file.size / 1024 / 1024;

    if (fileSizeMB > MAX_SIZE_MB) {
      console.log(`🗜️ Arquivo muito grande (${fileSizeMB.toFixed(2)}MB), comprimindo...`);
      console.log('🔧 Iniciando importação do módulo de compressão...');

      try {
        // Importar compressão dinamicamente
        const compressionModule = await import('./imageCompression');
        console.log('✅ Módulo de compressão importado com sucesso');

        const { compressImage } = compressionModule;

        if (!compressImage) {
          console.error('❌ Função compressImage não encontrada no módulo');
          throw new Error('Módulo de compressão não disponível');
        }

        console.log('🗜️ Chamando compressImage...');
        fileToUpload = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.85,
          maxSizeMB: 4.5, // Um pouco abaixo do limite de 5MB
        });

        const newSizeMB = fileToUpload.size / 1024 / 1024;
        const reduction = ((1 - fileToUpload.size / file.size) * 100).toFixed(1);

        console.log(`✅ Compressão concluída: ${fileSizeMB.toFixed(2)}MB → ${newSizeMB.toFixed(2)}MB (${reduction}% redução)`);
      } catch (compressionError) {
        console.error('❌ Erro completo na compressão:', compressionError);
        console.error('❌ Stack trace:', compressionError instanceof Error ? compressionError.stack : 'N/A');

        // Se a compressão falhar, vamos tentar enviar mesmo assim para o backend validar
        console.warn('⚠️ Enviando arquivo original (sem compressão) - backend pode rejeitar');
      }
    }

    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('propertyId', propertyId);
    formData.append('room', room);

    console.log('📦 FormData created');
    console.log('🌐 Uploading to:', `${API_BASE_URL}/photos/upload`);

    let response;
    try {
      response = await fetch(`${API_BASE_URL}/photos/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: formData,
      });
      console.log('📡 Response received:', response.status, response.statusText);
    } catch (fetchError) {
      console.error('❌ Fetch error:', fetchError);
      throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Unknown'}`);
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error('❌ Upload failed:', errorData);
      } catch (e) {
        console.error('❌ Could not parse error response');
        throw new Error(`Upload failed with status ${response.status}`);
      }
      throw new Error(errorData.error || 'Failed to upload photo');
    }

    let data;
    try {
      data = await response.json();
      console.log('✅ Upload successful:', data);
    } catch (parseError) {
      console.error('❌ Could not parse success response');
      throw new Error('Invalid response from server');
    }

    return {
      success: true,
      data: data.photo,
      timestamp: new Date().toISOString(),
    };
  },

  // Deletar foto
  delete: async (path: string): Promise<ApiResponse<null>> => {
    return apiRequest<null>(`/photos/${encodeURIComponent(path)}`, {
      method: 'DELETE',
    });
  },

  // Listar fotos de uma propriedade
  listByProperty: async (propertyId: string): Promise<ApiResponse<{ photos: Photo[] }>> => {
    return apiRequest(`/photos/property/${propertyId}`);
  },
};

// ============================================================================
// FINANCEIRO API (MÓDULO FINANCEIRO v1.0.103.400)
// ============================================================================

import type {
  Lancamento,
  Titulo,
  ContaBancaria,
  CentroCusto,
  ContaContabil,
  FiltroFinanceiro,
  PaginatedResponse,
  RegraConciliacao,
  LinhaExtrato,
} from '../types/financeiro';

export const financeiroApi = {
  // ============================================================================
  // LANÇAMENTOS
  // ============================================================================

  lancamentos: {
    list: async (filtros?: FiltroFinanceiro): Promise<ApiResponse<PaginatedResponse<Lancamento>>> => {
      const params = new URLSearchParams();
      if (filtros?.dataInicio) params.append('dataInicio', filtros.dataInicio);
      if (filtros?.dataFim) params.append('dataFim', filtros.dataFim);
      if (filtros?.tipo) params.append('tipo', filtros.tipo);
      if (filtros?.categoriaId) params.append('categoriaId', filtros.categoriaId);
      if (filtros?.centroCustoId) params.append('centroCustoId', filtros.centroCustoId);
      if (filtros?.contaId) params.append('contaId', filtros.contaId);
      if (filtros?.conciliado !== undefined) params.append('conciliado', filtros.conciliado.toString());
      if (filtros?.busca) params.append('busca', filtros.busca);
      if (filtros?.page) params.append('page', filtros.page.toString());
      if (filtros?.limit) params.append('limit', filtros.limit.toString());
      if (filtros?.orderBy) params.append('orderBy', filtros.orderBy);
      if (filtros?.order) params.append('order', filtros.order);

      return apiRequest<PaginatedResponse<Lancamento>>(`/financeiro/lancamentos?${params.toString()}`);
    },

    create: async (data: Partial<Lancamento>): Promise<ApiResponse<Lancamento>> => {
      return apiRequest<Lancamento>('/financeiro/lancamentos', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: async (id: string, data: Partial<Lancamento>): Promise<ApiResponse<Lancamento>> => {
      return apiRequest<Lancamento>(`/financeiro/lancamentos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    delete: async (id: string): Promise<ApiResponse<null>> => {
      return apiRequest<null>(`/financeiro/lancamentos/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // ============================================================================
  // TÍTULOS
  // ============================================================================

  titulos: {
    list: async (filtros?: FiltroFinanceiro): Promise<ApiResponse<PaginatedResponse<Titulo>>> => {
      const params = new URLSearchParams();
      if (filtros?.tipo) params.append('tipo', filtros.tipo);
      if (filtros?.status) params.append('status', filtros.status);
      if (filtros?.page) params.append('page', filtros.page.toString());
      if (filtros?.limit) params.append('limit', filtros.limit.toString());

      return apiRequest<PaginatedResponse<Titulo>>(`/financeiro/titulos?${params.toString()}`);
    },

    create: async (data: Partial<Titulo>): Promise<ApiResponse<Titulo>> => {
      return apiRequest<Titulo>('/financeiro/titulos', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    quitar: async (id: string, data: { valorPago?: number; dataPagamento?: string }): Promise<ApiResponse<Titulo>> => {
      return apiRequest<Titulo>(`/financeiro/titulos/${id}/quitar`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },

  // ============================================================================
  // CONTAS BANCÁRIAS
  // ============================================================================

  contasBancarias: {
    list: async (): Promise<ApiResponse<ContaBancaria[]>> => {
      return apiRequest<ContaBancaria[]>('/financeiro/contas-bancarias');
    },

    create: async (data: Partial<ContaBancaria>): Promise<ApiResponse<ContaBancaria>> => {
      return apiRequest<ContaBancaria>('/financeiro/contas-bancarias', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },

  // ============================================================================
  // CATEGORIAS (Plano de Contas)
  // ============================================================================

  categorias: {
    list: async (): Promise<ApiResponse<ContaContabil[]>> => {
      return apiRequest<ContaContabil[]>('/make-server-67caf26a/financeiro/categorias');
    },

    create: async (data: Partial<ContaContabil>): Promise<ApiResponse<ContaContabil>> => {
      return apiRequest<ContaContabil>('/make-server-67caf26a/financeiro/categorias', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },

  // ============================================================================
  // MAPEAMENTO DE CAMPOS DO SISTEMA PARA PLANO DE CONTAS
  // ============================================================================

  campoMappings: {
    list: async (): Promise<ApiResponse<any[]>> => {
      return apiRequest<any[]>('/make-server-67caf26a/financeiro/campo-mappings');
    },

    create: async (data: any): Promise<ApiResponse<any>> => {
      return apiRequest<any>('/make-server-67caf26a/financeiro/campo-mappings', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: async (id: string, data: any): Promise<ApiResponse<any>> => {
      return apiRequest<any>(`/make-server-67caf26a/financeiro/campo-mappings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    delete: async (id: string): Promise<ApiResponse<null>> => {
      return apiRequest<null>(`/make-server-67caf26a/financeiro/campo-mappings/${id}`, {
        method: 'DELETE',
      });
    },
    register: async (data: {
      modulo: string;
      campo_codigo: string;
      campo_nome: string;
      campo_tipo: 'receita' | 'despesa';
      descricao?: string;
      registered_by_module?: string;
      obrigatorio?: boolean;
    }): Promise<ApiResponse<any>> => {
      return apiRequest<any>('/make-server-67caf26a/financeiro/campo-mappings/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },

  // ============================================================================
  // CENTRO DE CUSTOS
  // ============================================================================

  centroCustos: {
    list: async (): Promise<ApiResponse<CentroCusto[]>> => {
      return apiRequest<CentroCusto[]>('/financeiro/centro-custos');
    },

    create: async (data: Partial<CentroCusto>): Promise<ApiResponse<CentroCusto>> => {
      return apiRequest<CentroCusto>('/financeiro/centro-custos', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },

  // ============================================================================
  // CONCILIAÇÃO BANCÁRIA
  // ============================================================================

  conciliacao: {
    importar: async (arquivo: File, contaId: string, formato: 'csv' | 'ofx'): Promise<ApiResponse<any>> => {
      const formData = new FormData();
      formData.append('arquivo', arquivo);
      formData.append('contaId', contaId);
      formData.append('formato', formato);

      return apiRequest<any>('/financeiro/conciliacao/importar', {
        method: 'POST',
        body: formData,
      });
    },

    pendentes: async (filtros?: { contaId?: string; dataInicio?: string; dataFim?: string; conciliado?: boolean }): Promise<ApiResponse<any>> => {
      const params = new URLSearchParams();
      if (filtros?.contaId) params.append('contaId', filtros.contaId);
      if (filtros?.dataInicio) params.append('dataInicio', filtros.dataInicio);
      if (filtros?.dataFim) params.append('dataFim', filtros.dataFim);
      if (filtros?.conciliado !== undefined) params.append('conciliado', filtros.conciliado.toString());

      return apiRequest<any>(`/financeiro/conciliacao/pendentes?${params.toString()}`);
    },

    match: async (linhaExtratoId: string, lancamentoId: string, observacoes?: string): Promise<ApiResponse<any>> => {
      return apiRequest<any>('/financeiro/conciliacao/match', {
        method: 'POST',
        body: JSON.stringify({ linhaExtratoId, lancamentoId, observacoes }),
      });
    },

    aplicarRegras: async (linhaIds?: string[]): Promise<ApiResponse<any>> => {
      return apiRequest<any>('/financeiro/conciliacao/aplicar-regras', {
        method: 'POST',
        body: JSON.stringify({ linhaIds: linhaIds || [] }),
      });
    },

    fechamento: async (data: string, contaId: string): Promise<ApiResponse<any>> => {
      return apiRequest<any>(`/financeiro/conciliacao/fechamento?data=${data}&contaId=${contaId}`);
    },

    regras: {
      list: async (): Promise<ApiResponse<RegraConciliacao[]>> => {
        return apiRequest<RegraConciliacao[]>('/financeiro/conciliacao/regras');
      },

      create: async (data: Partial<RegraConciliacao>): Promise<ApiResponse<RegraConciliacao>> => {
        return apiRequest<RegraConciliacao>('/financeiro/conciliacao/regras', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },

      update: async (id: string, data: Partial<RegraConciliacao>): Promise<ApiResponse<RegraConciliacao>> => {
        return apiRequest<RegraConciliacao>(`/financeiro/conciliacao/regras/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      },

      delete: async (id: string): Promise<ApiResponse<null>> => {
        return apiRequest<null>(`/financeiro/conciliacao/regras/${id}`, {
          method: 'DELETE',
        });
      },
    },
  },
};

// ============================================================================
// INTEGRAÇÕES - PROVEDOR DE IA
// ============================================================================

export const integrationsApi = {
  ai: {
    getConfig: async (): Promise<ApiResponse<AIProviderConfigResponse>> => {
      return apiRequest<AIProviderConfigResponse>('/make-server-67caf26a/integrations/ai/config');
    },
    listConfigs: async (): Promise<ApiResponse<{ configs: AIProviderConfigListItem[]; organizationId: string }>> => {
      return apiRequest<{ configs: AIProviderConfigListItem[]; organizationId: string }>('/make-server-67caf26a/integrations/ai/configs');
    },
    upsertConfig: async (
      payload: UpsertAIProviderConfigRequest
    ): Promise<ApiResponse<AIProviderConfigResponse>> => {
      return apiRequest<AIProviderConfigResponse>('/make-server-67caf26a/integrations/ai/config', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    toggleStatus: async (configId: string, isActive: boolean): Promise<ApiResponse<AIProviderConfigResponse>> => {
      return apiRequest<AIProviderConfigResponse>(`/make-server-67caf26a/integrations/ai/config/${configId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      });
    },
    deleteConfig: async (configId: string): Promise<ApiResponse<{ deleted: boolean; id: string }>> => {
      return apiRequest<{ deleted: boolean; id: string }>(`/make-server-67caf26a/integrations/ai/config/${configId}`, {
        method: 'DELETE',
      });
    },
    testConfig: async (configId?: string): Promise<ApiResponse<AIProviderTestResponse>> => {
      const url = configId
        ? `/make-server-67caf26a/integrations/ai/test?configId=${configId}`
        : '/make-server-67caf26a/integrations/ai/test';
      return apiRequest<AIProviderTestResponse>(url, {
        method: 'POST',
      });
    },
  },
};

// ============================================================================
// AUTOMAÇÕES - LAB IA
// ============================================================================

// Tipos para Automações
export interface Automation {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  definition: {
    name: string;
    description?: string;
    trigger: {
      type: string;
      field?: string;
      operator?: string;
      value?: any;
      schedule?: string;
      threshold?: number;
    };
    conditions?: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
    actions: Array<{
      type: string;
      channel?: string;
      template?: string;
      payload?: Record<string, any>;
    }>;
    metadata?: {
      priority?: 'baixa' | 'media' | 'alta';
      requiresApproval?: boolean;
      notifyChannels?: string[];
    };
  };
  status: 'draft' | 'active' | 'paused';
  module?: string; // Mantido para compatibilidade
  modules?: string[]; // NOVO: Array de módulos
  channel?: string;
  priority: 'baixa' | 'media' | 'alta';
  properties?: string[]; // NOVO: IDs dos imóveis selecionados
  ai_interpretation_summary?: string; // NOVO: Resumo do que a IA interpretou
  impact_description?: string; // NOVO: Descrição do impacto da automação
  trigger_count: number;
  last_triggered_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAutomationRequest {
  name: string;
  description?: string;
  definition: Automation['definition'];
  status?: 'draft' | 'active' | 'paused';
  module?: string; // Mantido para compatibilidade
  modules?: string[]; // NOVO: Array de módulos
  properties?: string[]; // NOVO: IDs dos imóveis
  ai_interpretation_summary?: string; // NOVO: Resumo da interpretação da IA
  impact_description?: string; // NOVO: Descrição do impacto
  channel?: string;
  priority?: 'baixa' | 'media' | 'alta';
}

export interface UpdateAutomationRequest extends Partial<CreateAutomationRequest> { }

export interface AutomationExecution {
  id: string;
  automation_id: string;
  organization_id: string;
  status: 'success' | 'failed' | 'skipped';
  trigger_event?: string;
  conditions_met: boolean;
  actions_executed?: any;
  error_message?: string;
  execution_time_ms?: number;
  created_at: string;
}

export const automationsApi = {
  ai: {
    interpretNaturalLanguage: async (
      payload: AutomationNaturalLanguageRequest
    ): Promise<ApiResponse<AutomationNaturalLanguageResponse>> => {
      return apiRequest<AutomationNaturalLanguageResponse>('/automations/ai/interpret', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  },
  // CRUD de Automações
  list: async (): Promise<ApiResponse<Automation[]>> => {
    return apiRequest<Automation[]>('/automations', {
      method: 'GET',
    });
  },
  get: async (id: string): Promise<ApiResponse<Automation>> => {
    return apiRequest<Automation>(`/automations/${id}`, {
      method: 'GET',
    });
  },
  create: async (payload: CreateAutomationRequest): Promise<ApiResponse<Automation>> => {
    return apiRequest<Automation>('/automations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  update: async (id: string, payload: UpdateAutomationRequest): Promise<ApiResponse<Automation>> => {
    return apiRequest<Automation>(`/automations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  delete: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>(`/automations/${id}`, {
      method: 'DELETE',
    });
  },
  updateStatus: async (id: string, status: 'draft' | 'active' | 'paused'): Promise<ApiResponse<Automation>> => {
    return apiRequest<Automation>(`/automations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
  getExecutions: async (id: string, limit = 50, offset = 0): Promise<ApiResponse<AutomationExecution[]>> => {
    return apiRequest<AutomationExecution[]>(`/automations/${id}/executions?limit=${limit}&offset=${offset}`, {
      method: 'GET',
    });
  },
};

// ============================================================================
// CRM FUNNEL APIS - STUB IMPLEMENTATIONS COM DADOS DE EXEMPLO
// ============================================================================

// Funil de exemplo com stages
const EXAMPLE_FUNNEL = {
  id: 'services-default',
  organizationId: '00000000-0000-0000-0000-000000000000',
  name: 'Funil de Serviços',
  type: 'SERVICES',
  description: 'Gestão de tickets e resolução de problemas',
  stages: [
    { id: 'stage-1', funnelId: 'services-default', name: 'Triagem', order: 1, color: '#3b82f6', createdAt: new Date().toISOString() },
    { id: 'stage-2', funnelId: 'services-default', name: 'Em Análise', order: 2, color: '#f59e0b', createdAt: new Date().toISOString() },
    { id: 'stage-3', funnelId: 'services-default', name: 'Em Resolução', order: 3, color: '#8b5cf6', createdAt: new Date().toISOString() },
    { id: 'stage-4', funnelId: 'services-default', name: 'Aguardando Cliente', order: 4, color: '#6366f1', createdAt: new Date().toISOString() },
    { id: 'stage-5', funnelId: 'services-default', name: 'Resolvido', order: 5, color: '#10b981', createdAt: new Date().toISOString() },
  ],
  statusConfig: {
    resolvedStatus: 'Resolvido',
    unresolvedStatus: 'Não Resolvido',
    inProgressStatus: 'Em Análise',
  },
  isDefault: true,
  isActive: true,
  createdAt: new Date('2025-01-01').toISOString(),
  updatedAt: new Date().toISOString(),
};

// Ticket de exemplo
const EXAMPLE_TICKET = {
  id: 'ticket-001',
  funnelId: 'services-default',
  stageId: 'stage-1',
  title: 'Sistema de check-in apresentando lentidão',
  description: 'Hóspedes relatam que o sistema de check-in está demorando mais de 5 minutos para processar. Problema começou hoje pela manhã após a atualização do sistema.',
  priority: 'high',
  status: 'open',
  assignedToId: '00000000-0000-0000-0000-000000000002',
  assignedToName: 'Administrador',
  createdById: '00000000-0000-0000-0000-000000000002',
  createdByName: 'Administrador',
  tags: ['sistema', 'urgente', 'check-in'],
  dueDate: new Date(Date.now() + 86400000).toISOString(), // Amanhã
  estimatedHours: 4,
  actualHours: 0,
  customFields: {
    categoria: 'Técnico',
    impacto: 'Alto',
    canal: 'Telefone',
  },
  people: [
    {
      id: 'guest-001',
      type: 'guest',
      name: 'João Silva',
      email: 'joao.silva@email.com',
      phone: '+5511999998888',
    },
  ],
  properties: [
    {
      id: 'property-001',
      name: 'Hotel Central Plaza',
      code: 'HCP',
    },
  ],
  attachments: [],
  comments: [
    {
      id: 'comment-001',
      ticketId: 'ticket-001',
      userId: '00000000-0000-0000-0000-000000000002',
      userName: 'Administrador',
      content: 'Iniciando análise do problema. Verificando logs do sistema.',
      createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hora atrás
    },
  ],
  activities: [
    {
      id: 'activity-001',
      ticketId: 'ticket-001',
      userId: '00000000-0000-0000-0000-000000000002',
      userName: 'Administrador',
      type: 'created',
      description: 'Ticket criado',
      metadata: {},
      createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 horas atrás
    },
  ],
  createdAt: new Date(Date.now() - 7200000).toISOString(),
  updatedAt: new Date(Date.now() - 3600000).toISOString(),
};

export const funnelsApi = {
  list: async () => {
    // Retornar funil de exemplo
    return { success: true, data: [EXAMPLE_FUNNEL] };
  },
  get: async (id: string) => {
    if (id === 'services-default') {
      return { success: true, data: EXAMPLE_FUNNEL };
    }
    return { success: true, data: null };
  },
  create: async (funnel: any) => ({ success: true, data: funnel }),
  update: async (id: string, funnel: any) => ({ success: true, data: funnel }),
  delete: async (id: string) => ({ success: true }),
};

export const servicesTicketsApi = {
  list: async (funnelId?: string) => {
    // Retornar ticket de exemplo
    if (funnelId === 'services-default' || !funnelId) {
      return { success: true, data: [EXAMPLE_TICKET] };
    }
    return { success: true, data: [] };
  },
  get: async (id: string) => {
    if (id === 'ticket-001') {
      return { success: true, data: EXAMPLE_TICKET };
    }
    return { success: true, data: null };
  },
  create: async (ticket: any) => {
    const newTicket = {
      ...ticket,
      id: `ticket-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return { success: true, data: newTicket };
  },
  update: async (id: string, ticket: any) => ({ success: true, data: ticket }),
  delete: async (id: string) => ({ success: true }),
  updateStage: async (id: string, stageId: string) => {
    console.log(`📍 Movendo ticket ${id} para stage ${stageId}`);
    return { success: true };
  },
};

export const ticketTemplatesApi = {
  list: async () => ({ success: true, data: [] }),
  get: async (id: string) => ({ success: true, data: null }),
  create: async (template: any) => ({ success: true, data: template }),
  update: async (id: string, template: any) => ({ success: true, data: template }),
  delete: async (id: string) => ({ success: true }),
};

// ============================================================================
// DEALS API (Pipeline de Vendas)
// ============================================================================

export interface CreateDealRequest {
  title: string;
  contactId?: string;
  value?: number;
  currency?: "BRL" | "USD" | "EUR";
  stage: string;
  source?: string;
  description?: string;
  expectedCloseDate?: string;
}

export interface UpdateDealRequest extends Partial<CreateDealRequest> {
  status?: "active" | "won" | "lost";
}

export interface CreateDealActivityRequest {
  dealId: string;
  type: string;
  description: string;
  date?: string;
}

export interface CreateDealMessageRequest {
  dealId: string;
  contactId: string;
  content: string;
  source: string;
}

export const dealsApi = {
  list: async (): Promise<ApiResponse<any[]>> => {
    return apiRequest<any[]>("/crm/deals", {
      method: "GET",
    });
  },
  get: async (id: string): Promise<ApiResponse<any>> => {
    return apiRequest<any>(`/crm/deals/${id}`, {
      method: "GET",
    });
  },
  create: async (payload: CreateDealRequest): Promise<ApiResponse<any>> => {
    return apiRequest<any>("/crm/deals", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  update: async (
    id: string,
    payload: UpdateDealRequest
  ): Promise<ApiResponse<any>> => {
    return apiRequest<any>(`/crm/deals/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  updateStage: async (
    id: string,
    newStage: string,
    note?: string
  ): Promise<ApiResponse<any>> => {
    return apiRequest<any>(`/crm/deals/${id}/stage`, {
      method: "PATCH",
      body: JSON.stringify({ stage: newStage, note }),
    });
  },
  delete: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>(`/crm/deals/${id}`, {
      method: "DELETE",
    });
  },
  // Activities
  getActivities: async (
    dealId: string
  ): Promise<ApiResponse<any[]>> => {
    return apiRequest<any[]>(`/crm/deals/${dealId}/activities`, {
      method: "GET",
    });
  },
  createActivity: async (
    payload: CreateDealActivityRequest
  ): Promise<ApiResponse<any>> => {
    return apiRequest<any>(`/crm/deals/${payload.dealId}/activities`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  // Messages
  getMessages: async (dealId: string): Promise<ApiResponse<any[]>> => {
    return apiRequest<any[]>(`/crm/deals/${dealId}/messages`, {
      method: "GET",
    });
  },
  sendMessage: async (
    payload: CreateDealMessageRequest
  ): Promise<ApiResponse<any>> => {
    return apiRequest<any>(`/crm/deals/${payload.dealId}/messages`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  properties: propertiesApi,
  reservations: reservationsApi,
  guests: guestsApi,
  calendar: calendarApi,
  locations: locationsApi,
  dev: devApi,
  financeiro: financeiroApi,
  integrations: integrationsApi,
  automations: automationsApi,
  deals: dealsApi,
  funnels: funnelsApi,
  servicesTickets: servicesTicketsApi,
  ticketTemplates: ticketTemplatesApi,
};
