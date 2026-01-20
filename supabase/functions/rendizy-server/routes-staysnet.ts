import { Context } from 'npm:hono';
import * as kv from './kv_store.tsx';
import { getSupabaseClient } from './kv_store.tsx';
import { successResponse, errorResponse, logInfo, logError } from './utils.ts';
import * as staysnetDB from './staysnet-db.ts';
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';
import { loadStaysNetRuntimeConfigOrThrow } from './utils-staysnet-config.ts';
import { resolveOrCreateGuestIdFromStaysReservation } from './utils-staysnet-guest-link.ts';
import { SUPABASE_URL } from './utils-env.ts';
import type { Block, BlockSubtype } from './types.ts';
import { blockToSql } from './utils-block-mapper.ts';

function buildDefaultStaysNetWebhookUrl(organizationId: string): string | undefined {
  const base = String(SUPABASE_URL || '').trim().replace(/\/$/, '');
  if (!base) return undefined;
  if (!organizationId) return undefined;
  return `${base}/functions/v1/staysnet-webhook-receiver/${organizationId}`;
}

// ============================================================================
// TYPES
// ============================================================================

interface StaysNetConfig {
  apiKey: string;
  apiSecret?: string; // Para APIs que usam login/senha separados
  baseUrl: string;
  accountName?: string; // Nome da conta (ex: "Sua Casa Rende Mais")
  notificationWebhookUrl?: string; // Link de notificações
  scope?: 'global' | 'individual'; // Global ou Individual
  enabled: boolean;
  lastSync?: string;
}

interface TestEndpointRequest {
  apiKey: string;
  apiSecret?: string;
  baseUrl: string;
  endpoint: string;
  method: 'GET' | 'POST';
  body?: any;
}

// ============================================================================
// STAYS.NET API CLIENT
// ============================================================================

class StaysNetClient {
  private apiKey: string;
  private apiSecret?: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string, apiSecret?: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // 🔧 Autenticação HTTP Basic Auth
    if (this.apiSecret) {
      const credentials = `${this.apiKey}:${this.apiSecret}`;
      
      // ✅ SIMPLIFICADO: btoa funciona perfeitamente em Deno!
      const base64 = btoa(credentials);
      
      headers['Authorization'] = `Basic ${base64}`;
      
      console.log(`[StaysNet] Using Basic Auth: ${this.apiKey}:****`);
      console.log(`[StaysNet] Base64 credentials: ${base64}`);
    } else {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
      console.log('[StaysNet] Using Bearer Token');
    }

    return headers;
  }

  async request(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any) {
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log(`[StaysNet] ${method} ${url}`);
    console.log(`[StaysNet] Headers:`, JSON.stringify(this.getHeaders(), null, 2));
    
    try {
      const options: RequestInit = {
        method,
        headers: this.getHeaders(),
      };

      if (body && method === 'POST') {
        options.body = JSON.stringify(body);
        console.log(`[StaysNet] Request body:`, body);
      }

      console.log(`[StaysNet] Making request...`);
      const response = await fetch(url, options);
      console.log(`[StaysNet] Response status: ${response.status} ${response.statusText}`);
      console.log(`[StaysNet] Response headers:`, Object.fromEntries(response.headers.entries()));
      
      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');
      console.log(`[StaysNet] Content-Type: ${contentType}, isJson: ${isJson}`);

      let data;
      try {
        if (isJson) {
          data = await response.json();
          console.log(`[StaysNet] ✅ JSON data parsed successfully`);
          console.log(`[StaysNet] 📦 Data preview:`, JSON.stringify(data).substring(0, 300));
        } else {
          const text = await response.text();
          console.error('[StaysNet] ❌ Non-JSON response (first 500 chars):', text.substring(0, 500));
          
          // More detailed error message
          const errorDetails = {
            status: response.status,
            statusText: response.statusText,
            contentType: contentType,
            url: url,
            previewText: text.substring(0, 200),
          };
          
          throw new Error(
            `API returned non-JSON response:\n` +
            `Status: ${response.status} ${response.statusText}\n` +
            `Content-Type: ${contentType}\n` +
            `URL: ${url}\n` +
            `This usually means:\n` +
            `1. The Base URL is incorrect\n` +
            `2. The endpoint doesn't exist\n` +
            `3. Authentication failed\n` +
            `4. Server returned an error page (HTML)\n` +
            `Preview: ${text.substring(0, 100)}...`
          );
        }
      } catch (parseError: any) {
        console.error('[StaysNet] Parse error:', parseError);
        throw parseError;
      }

      if (!response.ok) {
        const errorMsg = data.message || data.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error('[StaysNet] Request failed:', errorMsg);
        console.error('[StaysNet] Response data:', JSON.stringify(data, null, 2));
        
        // Retorna com status correto mesmo em erro
        return {
          success: false,
          error: errorMsg,
          status: response.status,
          data: data, // Inclui dados de erro se existirem
        };
      }

      console.log('[StaysNet] ✅ Request successful - Valid JSON received');
      return {
        success: true,
        data,
        status: response.status,
      };
    } catch (error: any) {
      console.error('[StaysNet] Request error:', error.message);
      console.error('[StaysNet] Full error:', error);
      console.error('[StaysNet] Error stack:', error.stack);
      
      // Retornar mensagem de erro mais descritiva
      const errorMessage = error.message || 'Unknown error occurred';
      return {
        success: false,
        error: `Request failed: ${errorMessage}`,
        status: 500,
        details: {
          message: error.message,
          stack: error.stack,
          url: url,
          method: method,
        }
      };
    }
  }

  // Test connection - Try multiple endpoints
  async testConnection() {
    console.log('═══════════════════════════════════════════════════');
    console.log('[StaysNet] 🔍 INICIANDO TESTE DE CONEXÃO');
    console.log('═══════════════════════════════════════════════════');
    console.log('[StaysNet] Base URL:', this.baseUrl);
    console.log('[StaysNet] API Key:', this.apiKey.substring(0, 4) + '****');
    console.log('[StaysNet] Has API Secret:', !!this.apiSecret);
    console.log('[StaysNet] Full URL Example:', `${this.baseUrl}/content/properties`);
    console.log('═══════════════════════════════════════════════════');
    
    // 🎯 Try CORRECT Stays.net API endpoints (based on official documentation)
    const endpointsToTry = [
      '/content/properties',      // ✅ Official: GET /external/v1/content/properties
      '/content/listings',        // ✅ Official: GET /external/v1/content/listings
      '/booking/reservations',    // ✅ Official: GET /external/v1/booking/reservations
      '/booking/searchfilter',    // ✅ Official: GET /external/v1/booking/searchfilter
      '/translation/property-amenities', // ✅ Official: GET /external/v1/translation/property-amenities
      '',                         // Try base URL without endpoint (last resort)
    ];

    let lastError = '';
    let lastStatus = 0;
    const errors: string[] = [];
    const detailedResults: any[] = [];
    
    for (let i = 0; i < endpointsToTry.length; i++) {
      const endpoint = endpointsToTry[i];
      console.log(`\n[StaysNet] ─── TESTE ${i + 1}/${endpointsToTry.length} ───`);
      console.log(`[StaysNet] Endpoint: ${endpoint || '(base URL)'}`);
      console.log(`[StaysNet] URL: ${this.baseUrl}${endpoint}`);
      
      const result = await this.request(endpoint, 'GET');
      
      detailedResults.push({
        endpoint: endpoint || '(base)',
        status: result.status,
        success: result.success,
        error: result.error?.substring(0, 100),
      });
      
      if (result.success) {
        console.log(`\n✅✅✅ SUCESSO! ✅✅✅`);
        console.log(`Endpoint: ${endpoint || 'base URL'}`);
        console.log(`Status: ${result.status}`);
        
        return {
          success: true,
          data: {
            message: `Connection successful via ${endpoint || 'base URL'}`,
            endpoint: endpoint,
            data: result.data
          },
          status: result.status,
        };
      }
      
      lastError = result.error || 'Unknown error';
      lastStatus = result.status || 0;
      errors.push(`${endpoint || '(base)'}→${result.status || 'ERR'}`);
      
      console.log(`[StaysNet] ❌ Status: ${result.status} - ${lastError.substring(0, 100)}`);
    }
    
    console.error('\n═══════════════════════════════════════════════════');
    console.error('[StaysNet] ❌ TODOS FALHARAM');
    console.error('═══════════════════════════════════════════════════');
    detailedResults.forEach((r, i) => {
      console.error(`  ${i + 1}. ${r.endpoint}: ${r.status} - ${r.success ? 'OK' : 'ERRO'}`);
    });
    console.error('═══════════════════════════════════════════════════\n');
    
    // Build helpful error message based on error type
    let helpMessage = '';
    if (lastError.includes('text/html') && lastError.includes('200 OK')) {
      helpMessage = `\n\n📍 CAUSA DO PROBLEMA:\n` +
        `O servidor retornou HTML (200 OK) ao invés de JSON.\n` +
        `Isso significa que você está acessando a página de ADMINISTRAÇÃO, não a API!\n\n` +
        `✅ SOLUÇÃO:\n` +
        `A URL "${this.baseUrl}" está retornando a página web de login.\n` +
        `Você precisa da URL da API, não do painel administrativo.\n\n` +
        `🔍 COMO ENCONTRAR A URL CORRETA DA API:\n\n` +
        `1. Entre em contato com o SUPORTE STAYS.NET e pergunte:\n` +
        `   "Qual é a URL base da API REST para integração externa?"\n\n` +
        `2. Verifique a DOCUMENTAÇÃO oficial da API:\n` +
        `   https://stays.net/external-api ou https://api-docs.stays.net\n\n` +
        `3. Procure no PAINEL de administração em:\n` +
        `   Configurações → Integrações → API → Endpoint Base URL\n\n` +
        `4. URLs comuns de API (tente estas):\n` +
        `   • https://api.stays.net\n` +
        `   • https://api.stays.net/v1\n` +
        `   • https://bvm.stays.net/api\n` +
        `   • https://yourcompany.stays.net/api/v1\n\n` +
        `⚠️ IMPORTANTE:\n` +
        `A URL que você está usando (${this.baseUrl}) é para ACESSAR O PAINEL via navegador,\n` +
        `NÃO é a URL da API para integração programática!`;
    } else if (lastError.includes('404')) {
      helpMessage = `\n\n📍 SOLUÇÃO:\n` +
        `A URL base está incorreta ou o endpoint não existe.\n\n` +
        `✅ URLs para tentar:\n` +
        `1. https://api.stays.net\n` +
        `2. https://api.stays.net/v1\n` +
        `3. https://bvm.stays.net/api\n` +
        `4. Entre em contato com suporte Stays.net para URL correta\n\n` +
        `📚 Documentação: https://stays.net/external-api`;
    } else if (lastError.includes('403') || lastError.includes('401')) {
      helpMessage = `\n\n📍 SOLUÇÃO:\n` +
        `Credenciais incorretas ou acesso negado.\n\n` +
        `✅ Verifique:\n` +
        `1. Login e Senha estão corretos?\n` +
        `2. API está ativa no painel Stays.net?\n` +
        `3. IP do servidor está liberado?\n` +
        `4. Regere nova API Key se necessário`;
    } else if (lastError.includes('500')) {
      helpMessage = `\n\n📍 SOLUÇÃO:\n` +
        `Erro interno no servidor Stays.net (HTTP 500).\n\n` +
        `Possíveis causas:\n` +
        `1. A URL não é um endpoint válido da API\n` +
        `2. O servidor está com problemas temporários\n` +
        `3. Suas credenciais estão causando erro no servidor\n\n` +
        `✅ Tente:\n` +
        `1. Verificar se a URL base está correta\n` +
        `2. Aguardar alguns minutos e tentar novamente\n` +
        `3. Entrar em contato com suporte Stays.net`;
    }
    
    // All endpoints failed
    return {
      success: false,
      error: `❌ Não foi possível conectar com Stays.net.\n\n` +
        `Tentamos ${endpointsToTry.length} endpoints diferentes: ${errors.join(', ')}\n\n` +
        `Último erro: ${lastError}${helpMessage}`,
      status: lastStatus,
    };
  }

  // Properties - ✅ ENDPOINTS OFICIAIS STAYS.NET
  async getProperties() {
    console.log('[StaysNet] Fetching properties from /content/properties');
    return await this.request('/content/properties', 'GET');
  }

  async getProperty(id: string) {
    console.log(`[StaysNet] Fetching property ${id} from /content/properties/${id}`);
    return await this.request(`/content/properties/${id}`, 'GET');
  }

  async getPropertyAmenities(id: string) {
    console.log(`[StaysNet] Fetching amenities for property ${id}`);
    return await this.request(`/content/properties/${id}/amenities`, 'GET');
  }

  // Listings - ✅ ENDPOINT OFICIAL STAYS.NET
  async getListings(params?: { limit?: number; skip?: number }) {
    let endpoint = '/content/listings';
    const searchParams = new URLSearchParams();
    
    // Adicionar parâmetros de paginação se fornecidos
    if (params?.limit) {
      searchParams.append('limit', params.limit.toString());
    }
    if (params?.skip) {
      searchParams.append('skip', params.skip.toString());
    }
    
    if (searchParams.toString()) {
      endpoint += `?${searchParams.toString()}`;
    }
    
    console.log('[StaysNet] Fetching listings from', endpoint);
    return await this.request(endpoint, 'GET');
  }
  
  // ✅ NOVO: Buscar TODOS os listings (com paginação automática)
  async getAllListings(params?: { maxPages?: number }): Promise<{ success: boolean; data?: any[]; error?: string }> {
    const allListings: any[] = [];
    let skip = 0;
    const limit = 20; // ✅ Stays.net: limit max 20
    const maxPages = Math.max(1, Number(params?.maxPages ?? 500));
    let hasMore = true;

    let pages = 0;
    while (hasMore && pages < maxPages) {
      const result = await this.getListings({ limit, skip });
      
      if (!result.success) {
        return { success: false, error: result.error };
      }
      
      let listings: any[] = [];
      if (Array.isArray(result.data)) {
        listings = result.data;
      } else if (result.data?.listings && Array.isArray(result.data.listings)) {
        listings = result.data.listings;
      } else if (result.data?.data && Array.isArray(result.data.data)) {
        listings = result.data.data;
      }
      
      allListings.push(...listings);
      
      // Se retornou menos que o limite, não há mais páginas
      hasMore = listings.length === limit;
      skip += limit;
      pages++;
      
      console.log(`[StaysNet] 📥 Buscados ${allListings.length} listings até agora...`);
    }

    if (hasMore) {
      console.warn(`[StaysNet] ⚠️ getAllListings atingiu maxPages=${maxPages} (limit=${limit}). Retornando parcial.`);
    }
    
    return { success: true, data: allListings };
  }

  // Reservations - ✅ ENDPOINTS OFICIAIS STAYS.NET
  async getReservations(params?: { startDate?: string; endDate?: string; dateType?: string; limit?: number; skip?: number }) {
    let endpoint = '/booking/reservations'; // ✅ Endpoint oficial
    
    // A API Stays.net requer 'from', 'to' e 'dateType' como parâmetros obrigatórios
    const searchParams = new URLSearchParams();
    
    // Se não fornecido, usar últimos 30 dias como padrão
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    const defaultEndDate = new Date();
    defaultEndDate.setDate(defaultEndDate.getDate() + 365); // Próximos 365 dias
    
    const startDate = params?.startDate || defaultStartDate.toISOString().split('T')[0];
    const endDate = params?.endDate || defaultEndDate.toISOString().split('T')[0];
    const dateType = params?.dateType || 'arrival'; // Padrão: arrival (data de chegada)
    
    // Parâmetros obrigatórios da API Stays.net
    searchParams.append('from', startDate);
    searchParams.append('to', endDate);
    searchParams.append('dateType', dateType);
    
    // Adicionar parâmetros de paginação se fornecidos
    if (params?.limit) {
      searchParams.append('limit', params.limit.toString());
    }
    if (params?.skip) {
      searchParams.append('skip', params.skip.toString());
    }
    
    endpoint += `?${searchParams.toString()}`;
    
    console.log(`[StaysNet] 📍 Fetching reservations`);
    console.log(`[StaysNet] 📍 Endpoint: ${endpoint}`);
    console.log(`[StaysNet] 📍 Full URL: ${this.baseUrl}${endpoint}`);
    console.log(`[StaysNet] 📍 Query Params:`, { from: startDate, to: endDate, dateType, limit: params?.limit, skip: params?.skip });
    console.log(`[StaysNet] 📍 Query String: ${searchParams.toString()}`);
    
    const result = await this.request(endpoint, 'GET');
    
    console.log(`[StaysNet] 📍 Result:`, {
      success: result.success,
      status: result.status,
      hasData: !!result.data,
      errorPreview: result.error ? result.error.substring(0, 200) : null,
    });
    
    // 🎯 DEBUG: Analisar estrutura da resposta
    if (result.success && result.data) {
      console.log('\n' + '='.repeat(80));
      console.log('🔍 [BACKEND] ANÁLISE DA ESTRUTURA DA API STAYS.NET');
      console.log('='.repeat(80));
      console.log('📦 Tipo do result.data:', typeof result.data);
      console.log('📦 É array direto?', Array.isArray(result.data));
      
      if (Array.isArray(result.data)) {
        console.log('   ✅ SIM! Array com', result.data.length, 'itens');
        if (result.data.length > 0) {
          console.log('   📋 Primeiro item:', JSON.stringify(result.data[0], null, 2).substring(0, 500));
        }
      } else if (result.data && typeof result.data === 'object') {
        console.log('   📋 Chaves no objeto:', Object.keys(result.data).join(', '));
        console.log('   🔎 Testando possíveis caminhos:');
        console.log('      • data.reservations?', !!result.data.reservations, Array.isArray(result.data.reservations) ? `(array com ${result.data.reservations.length} itens)` : '');
        console.log('      • data.items?', !!result.data.items, Array.isArray(result.data.items) ? `(array com ${result.data.items.length} itens)` : '');
        console.log('      • data.results?', !!result.data.results, Array.isArray(result.data.results) ? `(array com ${result.data.results.length} itens)` : '');
        console.log('      • data.data?', !!result.data.data, Array.isArray(result.data.data) ? `(array com ${result.data.data.length} itens)` : '');
      }
      
      console.log('\n💾 JSON COMPLETO (primeiros 2000 chars):');
      console.log(JSON.stringify(result.data, null, 2).substring(0, 2000));
      console.log('='.repeat(80) + '\n');
    }
    
    return result;
  }
  
  // ✅ NOVO: Buscar TODAS as reservas (com paginação automática)
  async getAllReservations(params?: { startDate?: string; endDate?: string; dateType?: string; maxPages?: number }): Promise<{ success: boolean; data?: any[]; error?: string }> {
    const allReservations: any[] = [];
    let skip = 0;
    const limit = 20; // ✅ Stays.net: limit max 20
    const maxPages = Math.max(1, Number(params?.maxPages ?? 500));
    let hasMore = true;
    
    let pages = 0;
    while (hasMore && pages < maxPages) {
      const result = await this.getReservations({ ...params, limit, skip });
      
      if (!result.success) {
        return { success: false, error: result.error };
      }
      
      let reservations: any[] = [];
      if (Array.isArray(result.data)) {
        reservations = result.data;
      } else if (result.data?.reservations && Array.isArray(result.data.reservations)) {
        reservations = result.data.reservations;
      } else if (result.data?.data && Array.isArray(result.data.data)) {
        reservations = result.data.data;
      }
      
      allReservations.push(...reservations);
      
      // Se retornou menos que o limite, não há mais páginas
      hasMore = reservations.length === limit;
      skip += limit;
      pages++;
      
      console.log(`[StaysNet] 📥 Buscadas ${allReservations.length} reservas até agora...`);
    }

    if (hasMore) {
      console.warn(`[StaysNet] ⚠️ getAllReservations atingiu maxPages=${maxPages} (limit=${limit}). Retornando parcial.`);
    }
    
    return { success: true, data: allReservations };
  }

  async getReservation(id: string) {
    console.log(`[StaysNet] Fetching reservation ${id}`);
    return await this.request(`/booking/reservations/${id}`, 'GET');
  }

  async createReservation(data: any) {
    console.log('[StaysNet] Creating reservation');
    return await this.request('/booking/reservations', 'POST', data);
  }
  
  // Search/Filter - ✅ ENDPOINT OFICIAL STAYS.NET
  async searchReservations(filters?: any) {
    console.log('[StaysNet] Searching reservations with filters');
    return await this.request('/booking/searchfilter', 'POST', filters);
  }

  // Rates
  async getRates() {
    return await this.request('/rates', 'GET');
  }

  async getRatesCalendar(params?: { startDate?: string; endDate?: string; propertyId?: string }) {
    let endpoint = '/rates/calendar';
    if (params) {
      const searchParams = new URLSearchParams();
      if (params.startDate) searchParams.append('start_date', params.startDate);
      if (params.endDate) searchParams.append('end_date', params.endDate);
      if (params.propertyId) searchParams.append('property_id', params.propertyId);
      const query = searchParams.toString();
      if (query) endpoint += `?${query}`;
    }
    return await this.request(endpoint, 'GET');
  }

  // Availability
  async checkAvailability(params?: { startDate?: string; endDate?: string; propertyId?: string }) {
    let endpoint = '/availability';
    if (params) {
      const searchParams = new URLSearchParams();
      if (params.startDate) searchParams.append('start_date', params.startDate);
      if (params.endDate) searchParams.append('end_date', params.endDate);
      if (params.propertyId) searchParams.append('property_id', params.propertyId);
      const query = searchParams.toString();
      if (query) endpoint += `?${query}`;
    }
    return await this.request(endpoint, 'GET');
  }

  async getAvailabilityCalendar(params?: { startDate?: string; endDate?: string; propertyId?: string }) {
    let endpoint = '/availability/calendar';
    if (params) {
      const searchParams = new URLSearchParams();
      if (params.startDate) searchParams.append('start_date', params.startDate);
      if (params.endDate) searchParams.append('end_date', params.endDate);
      if (params.propertyId) searchParams.append('property_id', params.propertyId);
      const query = searchParams.toString();
      if (query) endpoint += `?${query}`;
    }
    return await this.request(endpoint, 'GET');
  }

  // Guests / Clients
  async getGuests() {
    return await this.request('/guests', 'GET');
  }

  async getGuest(id: string) {
    return await this.request(`/guests/${id}`, 'GET');
  }

  // ✅ NOVO: Buscar clientes (hóspedes) via /booking/clients
  // ✅ MELHORADO: Suporte a paginação para buscar TODOS os clientes
  async getClients(params?: { limit?: number; skip?: number }) {
    let endpoint = '/booking/clients';
    const searchParams = new URLSearchParams();
    
    // Adicionar parâmetros de paginação se fornecidos
    if (params?.limit) {
      searchParams.append('limit', params.limit.toString());
    }
    if (params?.skip) {
      searchParams.append('skip', params.skip.toString());
    }
    
    if (searchParams.toString()) {
      endpoint += `?${searchParams.toString()}`;
    }
    
    return await this.request(endpoint, 'GET');
  }
  
  // ✅ NOVO: Buscar TODOS os clientes (com paginação automática)
  async getAllClients(params?: { maxPages?: number }): Promise<{ success: boolean; data?: any[]; error?: string }> {
    const allClients: any[] = [];
    let skip = 0;
    const limit = 20; // ✅ Stays.net: limit max 20
    const maxPages = Math.max(1, Number(params?.maxPages ?? 500));
    let hasMore = true;
    
    let pages = 0;
    while (hasMore && pages < maxPages) {
      const result = await this.getClients({ limit, skip });
      
      if (!result.success) {
        return { success: false, error: result.error };
      }
      
      let clients: any[] = [];
      if (Array.isArray(result.data)) {
        clients = result.data;
      } else if (result.data?.clients && Array.isArray(result.data.clients)) {
        clients = result.data.clients;
      } else if (result.data?.data && Array.isArray(result.data.data)) {
        clients = result.data.data;
      }
      
      allClients.push(...clients);
      
      // Se retornou menos que o limite, não há mais páginas
      hasMore = clients.length === limit;
      skip += limit;
      pages++;
      
      console.log(`[StaysNet] 📥 Buscados ${allClients.length} hóspedes até agora...`);
    }

    if (hasMore) {
      console.warn(`[StaysNet] ⚠️ getAllClients atingiu maxPages=${maxPages} (limit=${limit}). Retornando parcial.`);
    }
    
    return { success: true, data: allClients };
  }
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * GET /settings/staysnet
 * Get Stays.net configuration
 */
export async function getStaysNetConfig(c: Context) {
  try {
    logInfo('Getting Stays.net config');
    
    // ✅ REFATORADO v1.0.103.500 - Usar helper híbrido ao invés de query param
    const organizationId = await getOrganizationIdOrThrow(c);
    
    // ✅ PRIMEIRO: Tentar carregar do banco de dados (tabela dedicada)
    const dbResult = await staysnetDB.loadStaysNetConfigDB(organizationId);
    
    if (dbResult.success && dbResult.data) {
      console.log('[StaysNet] ✅ Configuração carregada do banco de dados');
      const computedWebhook = buildDefaultStaysNetWebhookUrl(organizationId);
      const dataWithWebhook: StaysNetConfig = {
        ...dbResult.data,
        notificationWebhookUrl: dbResult.data.notificationWebhookUrl || computedWebhook || '',
      };
      return c.json(successResponse(dataWithWebhook));
    }
    
    // ⚠️ FALLBACK: Tentar carregar do KV Store (compatibilidade)
    console.log('[StaysNet] ⚠️ Tentando carregar do KV Store (fallback)...');
    const config = await kv.get<StaysNetConfig>('settings:staysnet');
    
    if (config) {
      // Migrar automaticamente para o banco de dados
      console.log('[StaysNet] 🔄 Migrando configuração do KV Store para banco de dados...');
      await staysnetDB.saveStaysNetConfigDB(config, organizationId);
    }

    const computedWebhook = buildDefaultStaysNetWebhookUrl(organizationId);
    const defaultConfig: StaysNetConfig = config || {
      apiKey: '',
      baseUrl: 'https://stays.net/external/v1',
      accountName: '',
      notificationWebhookUrl: '',
      scope: 'global',
      enabled: false,
    };

    if (!defaultConfig.notificationWebhookUrl && computedWebhook) {
      defaultConfig.notificationWebhookUrl = computedWebhook;
    }

    return c.json(successResponse(defaultConfig));
  } catch (error) {
    logError('Error getting Stays.net config', error);
    return c.json(errorResponse('Failed to get config'), 500);
  }
}

/**
 * POST /settings/staysnet
 * Save Stays.net configuration
 */
export async function saveStaysNetConfig(c: Context) {
  try {
    const body = await c.req.json();
    logInfo('Saving Stays.net config');

    // ✅ REFATORADO v1.0.103.500 - Usar helper híbrido ao invés de body.organizationId
    const organizationId = await getOrganizationIdOrThrow(c);

    const computedWebhook = buildDefaultStaysNetWebhookUrl(organizationId);
    
    const config: StaysNetConfig = {
      apiKey: body.apiKey,
      apiSecret: body.apiSecret || undefined,
      baseUrl: body.baseUrl || 'https://stays.net/external/v1',
      accountName: body.accountName || undefined,
      notificationWebhookUrl: body.notificationWebhookUrl || computedWebhook || undefined,
      scope: body.scope || 'global',
      enabled: body.enabled || false,
      lastSync: body.lastSync || new Date().toISOString(),
    };

    // ✅ SALVAR NO BANCO DE DADOS (tabela dedicada)
    const dbResult = await staysnetDB.saveStaysNetConfigDB(config, organizationId);
    
    if (!dbResult.success) {
      console.error('[StaysNet] ❌ Erro ao salvar no banco de dados:', dbResult.error);
      // Fallback para KV Store se falhar
      await kv.set('settings:staysnet', config);
      console.log('[StaysNet] ⚠️ Configuração salva no KV Store (fallback)');
    } else {
      console.log('[StaysNet] ✅ Configuração salva no banco de dados');
    }
    
    // Também salvar no KV Store para compatibilidade (até migração completa)
    await kv.set('settings:staysnet', config);

    return c.json(successResponse(config));
  } catch (error) {
    logError('Error saving Stays.net config', error);
    return c.json(errorResponse('Failed to save config'), 500);
  }
}

/**
 * POST /staysnet/webhook/:organizationId
 * Implementação movida para a cápsula dedicada.
 */

// ✅ Blindagem forte: o pipeline de webhooks foi movido para a cápsula dedicada.
// Mantemos re-exports aqui para compatibilidade com imports existentes.
export {
  receiveStaysNetWebhook,
  processStaysNetWebhooks,
  getStaysNetWebhooksDiagnostics,
  backfillStaysNetReservationGuests,
  processPendingStaysNetWebhooksForOrg,
} from './routes-staysnet-webhooks.ts';

/**
 * POST /staysnet/reservations/reconcile/:organizationId
 * Endpoint de manutenção: reconcilia duplicações de reservas no banco.
 *
 * Body:
 * - apply?: boolean (default: false)
 * - planned?: Array<{ keep_id: string; merge_from_ids: string[] }>
 * - limit?: number (default: 5000) usado quando auto-planejando
 */
export async function reconcileStaysNetReservations(c: Context) {
  try {
    const { organizationId } = c.req.param();
    if (!organizationId) {
      return c.json(errorResponse('organizationId is required'), 400);
    }

    const body = await c.req.json().catch(() => ({} as any));
    const apply = Boolean(body?.apply);
    const limitRaw = Number(body?.limit);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(5000, limitRaw)) : 5000;

    const supabase = getSupabaseClient(c);

    type Plan = { keep_id: string; merge_from_ids: string[] };

    const normalizePlan = (p: any): Plan | null => {
      if (!p || typeof p !== 'object') return null;
      if (typeof p.keep_id !== 'string' || !p.keep_id.trim()) return null;
      if (!Array.isArray(p.merge_from_ids)) return null;
      const mergeFrom = Array.from(
        new Set(p.merge_from_ids.map((x: any) => String(x)).filter((x: string) => x && x.trim()))
      );
      return { keep_id: String(p.keep_id), merge_from_ids: mergeFrom };
    };

    const plannedFromBody: Plan[] | null = Array.isArray(body?.planned)
      ? (body.planned.map(normalizePlan).filter(Boolean) as Plan[])
      : null;

    const computePlan = async (): Promise<Plan[]> => {
      const { data, error } = await supabase
        .from('reservations')
        .select('id, external_id, staysnet_reservation_code, platform, updated_at, created_at')
        .eq('organization_id', organizationId)
        .limit(limit);

      if (error) throw new Error(`Failed to load reservations: ${error.message}`);
      const rows = (data || []) as Array<any>;

      const groupsByExternalId = new Map<string, Array<any>>();
      const groupsByCode = new Map<string, Array<any>>();

      for (const r of rows) {
        const externalId = r?.external_id ? String(r.external_id) : '';
        const code = r?.staysnet_reservation_code ? String(r.staysnet_reservation_code) : '';

        if (externalId) {
          const k = `${String(r?.platform || '')}::${externalId}`;
          const arr = groupsByExternalId.get(k) || [];
          arr.push(r);
          groupsByExternalId.set(k, arr);
        }

        if (code) {
          const k = `${String(r?.platform || '')}::${code}`;
          const arr = groupsByCode.get(k) || [];
          arr.push(r);
          groupsByCode.set(k, arr);
        }
      }

      const sortBestFirst = (a: any, b: any) => {
        const au = String(a?.updated_at || '');
        const bu = String(b?.updated_at || '');
        if (au !== bu) return bu.localeCompare(au);
        const ac = String(a?.created_at || '');
        const bc = String(b?.created_at || '');
        return bc.localeCompare(ac);
      };

      const out: Plan[] = [];
      const usedIds = new Set<string>();

      const pushGroup = (group: Array<any>) => {
        const ids = group.map((r) => String(r.id)).filter(Boolean);
        const uniqueIds = Array.from(new Set(ids));
        if (uniqueIds.length <= 1) return;

        // Evitar conflitos: se o grupo já envolve IDs usados em outro plano, pulamos.
        // (Comportamento conservador, evita merges cruzados)
        if (uniqueIds.some((id) => usedIds.has(id))) return;

        const sorted = [...group].sort(sortBestFirst);
        const keepId = String(sorted[0].id);
        const mergeFrom = uniqueIds.filter((id) => id !== keepId);
        if (!keepId || mergeFrom.length === 0) return;

        out.push({ keep_id: keepId, merge_from_ids: mergeFrom });
        usedIds.add(keepId);
        for (const id of mergeFrom) usedIds.add(id);
      };

      for (const group of groupsByExternalId.values()) pushGroup(group);
      for (const group of groupsByCode.values()) pushGroup(group);

      return out;
    };

    const planned = plannedFromBody ?? (await computePlan());

    const stats = {
      planned: planned.length,
      updated: 0,
      repointed: 0,
      deleted: 0,
      errors: 0,
    };

    if (!apply) {
      return c.json(successResponse({ apply, stats, planned }));
    }

    for (const plan of planned) {
      try {
        // 1) Repontar dependências conhecidas
        for (const loserId of plan.merge_from_ids) {
          try {
            const updChat = await supabase
              .from('chat_conversations')
              .update({ reservation_id: plan.keep_id })
              .eq('reservation_id', loserId);
            if (!updChat.error && (updChat as any).data) stats.repointed++;
          } catch {
            // ignora type mismatch (ex.: reservation_id UUID)
          }

          try {
            const updFin = await supabase
              .from('financeiro_titulos')
              .update({ reservation_id: plan.keep_id })
              .eq('reservation_id', loserId);
            if (!updFin.error && (updFin as any).data) stats.repointed++;
          } catch {
            // ignora type mismatch
          }

          // 2) Apagar duplicata
          const { error: delErr } = await supabase
            .from('reservations')
            .delete()
            .eq('organization_id', organizationId)
            .eq('id', loserId);
          if (delErr) throw delErr;
          stats.deleted++;
        }

        stats.updated++;
      } catch {
        stats.errors++;
      }
    }

    return c.json(successResponse({ apply, stats, planned }));
  } catch (error: any) {
    return c.json(errorResponse(error?.message || 'Failed to reconcile reservations'), 500);
  }
}

/**
 * POST /staysnet/test
 * Test connection to Stays.net API
 */
export async function testStaysNetConnection(c: Context) {
  try {
    const body = await c.req.json();
    const { apiKey, apiSecret, baseUrl } = body;

    if (!apiKey || !baseUrl) {
      return c.json(errorResponse('API Key and Base URL are required'), 400);
    }

    logInfo('Testing Stays.net connection');

    const client = new StaysNetClient(apiKey, baseUrl, apiSecret);
    const result = await client.testConnection();

    if (result.success) {
      return c.json(successResponse({
        message: 'Connection successful',
        data: result.data,
      }));
    } else {
      return c.json(errorResponse(result.error || 'Connection failed'), 400);
    }
  } catch (error) {
    logError('Error testing Stays.net connection', error);
    return c.json(errorResponse('Failed to test connection'), 500);
  }
}

/**
 * POST /staysnet/test-endpoint
 * Test a specific endpoint
 */
export async function testStaysNetEndpoint(c: Context) {
  try {
    const body: TestEndpointRequest = await c.req.json();
    const { apiKey, apiSecret, baseUrl, endpoint, method, body: requestBody, params } = body as any;

    if (!apiKey || !baseUrl || !endpoint) {
      return c.json(errorResponse('API Key, Base URL, and endpoint are required'), 400);
    }

    // Build URL with query params if provided
    let finalEndpoint = endpoint;
    if (params && Object.keys(params).length > 0) {
      const queryString = new URLSearchParams(params).toString();
      finalEndpoint = `${endpoint}?${queryString}`;
    }

    logInfo(`Testing Stays.net endpoint: ${method || 'GET'} ${finalEndpoint}`);

    const client = new StaysNetClient(apiKey, baseUrl, apiSecret);
    const result = await client.request(finalEndpoint, method || 'GET', requestBody);

    if (result.success) {
      return c.json(successResponse(result.data));
    } else {
      return c.json(errorResponse(result.error || 'Request failed'), 400);
    }
  } catch (error) {
    logError('Error testing Stays.net endpoint', error);
    return c.json(errorResponse('Failed to test endpoint'), 500);
  }
}

/**
 * POST /staysnet/sync/properties
 * Sync properties from Stays.net
 */
export async function syncStaysNetProperties(c: Context) {
  try {
    logInfo('Syncing properties from Stays.net');

    // Get config
    const config = await kv.get<StaysNetConfig>('settings:staysnet');
    if (!config || !config.apiKey) {
      return c.json(errorResponse('Stays.net not configured'), 400);
    }

    const client = new StaysNetClient(config.apiKey, config.baseUrl, config.apiSecret);
    const result = await client.getProperties();

    if (!result.success) {
      return c.json(errorResponse(result.error || 'Failed to fetch properties'), 400);
    }

    // TODO: Map and save properties to local database
    // For now, just return the data
    
    return c.json(successResponse({
      message: 'Properties synced successfully',
      count: Array.isArray(result.data) ? result.data.length : 0,
      data: result.data,
    }));
  } catch (error) {
    logError('Error syncing Stays.net properties', error);
    return c.json(errorResponse('Failed to sync properties'), 500);
  }
}

/**
 * POST /staysnet/sync/reservations
 * Sync reservations from Stays.net
 */
export async function syncStaysNetReservations(c: Context) {
  try {
    const body = await c.req.json();
    const { startDate, endDate } = body;

    logInfo('Syncing reservations from Stays.net');

    // Get config
    const config = await kv.get<StaysNetConfig>('settings:staysnet');
    if (!config || !config.apiKey) {
      return c.json(errorResponse('Stays.net not configured'), 400);
    }

    const client = new StaysNetClient(config.apiKey, config.baseUrl, config.apiSecret);
    const result = await client.getReservations({ startDate, endDate });

    if (!result.success) {
      return c.json(errorResponse(result.error || 'Failed to fetch reservations'), 400);
    }

    // TODO: Map and save reservations to local database
    // For now, just return the data

    // Log detalhado das reservas
    console.log('[StaysNet] ✅ Reservations fetched successfully!');
    console.log('[StaysNet] Count:', Array.isArray(result.data) ? result.data.length : 'N/A');
    if (Array.isArray(result.data) && result.data.length > 0) {
      console.log('[StaysNet] First reservation:', JSON.stringify(result.data[0], null, 2));
    }

    return c.json(successResponse({
      message: 'Reservations synced successfully',
      count: Array.isArray(result.data) ? result.data.length : 0,
      data: result.data,
      timestamp: new Date().toISOString(),
    }));
  } catch (error) {
    logError('Error syncing Stays.net reservations', error);
    return c.json(errorResponse('Failed to sync reservations'), 500);
  }
}

/**
 * GET /staysnet/reservations/preview
 * Preview reservations from Stays.net (for testing)
 */
export async function previewStaysNetReservations(c: Context) {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('[StaysNet Preview] 🔍 INÍCIO DO PREVIEW DE RESERVAS');
    console.log('='.repeat(80));
    
    const query = c.req.query();
    const startDate = query.startDate || undefined;
    const endDate = query.endDate || undefined;
    const dateType = query.dateType || undefined;

    logInfo('Previewing reservations from Stays.net');
    console.log('[StaysNet Preview] Query params:', { startDate, endDate, dateType });

    // Get config
    console.log('[StaysNet Preview] Carregando configuração do KV...');
    const config = await kv.get<StaysNetConfig>('settings:staysnet');
    
    console.log('[StaysNet Preview] Config retornada do KV:', {
      hasConfig: !!config,
      hasApiKey: !!config?.apiKey,
      hasApiSecret: !!config?.apiSecret,
      baseUrl: config?.baseUrl || 'N/A',
      enabled: config?.enabled || false,
    });
    
    if (!config || !config.apiKey) {
      console.error('[StaysNet Preview] ❌ Configuration not found or missing API key');
      return c.json(errorResponse('Stays.net não configurado. Configure em Configurações → Integrações → Stays.net'), 400);
    }

    console.log('[StaysNet Preview] ✅ Configuration loaded successfully');
    console.log('[StaysNet Preview]   - Base URL:', config.baseUrl);
    console.log('[StaysNet Preview]   - API Key (first 4 chars):', config.apiKey.substring(0, 4) + '****');
    console.log('[StaysNet Preview]   - Has API Secret:', !!config.apiSecret);

    console.log('[StaysNet Preview] Criando cliente Stays.net...');
    const client = new StaysNetClient(config.apiKey, config.baseUrl, config.apiSecret);
    
    console.log('[StaysNet Preview] Chamando client.getReservations()...');
    const result = await client.getReservations({ startDate, endDate, dateType });

    console.log('[StaysNet Preview] Resultado recebido do cliente:');
    console.log('[StaysNet Preview] API Result:', {
      success: result.success,
      status: result.status,
      hasData: !!result.data,
      hasError: !!result.error,
      errorPreview: result.error ? result.error.substring(0, 200) : null,
    });

    if (!result.success) {
      const errorMsg = result.error || 'Failed to fetch reservations';
      console.error('[StaysNet Preview] ❌ Error fetching reservations');
      console.error('[StaysNet Preview] ❌ Error message:', errorMsg);
      console.error('[StaysNet Preview] ❌ Full result:', JSON.stringify(result, null, 2));
      
      return c.json(errorResponse(errorMsg, result.details || undefined), result.status || 400);
    }

    console.log('[StaysNet Preview] ✅ Success! Data received');
    console.log('[StaysNet Preview] Data type:', typeof result.data);
    console.log('[StaysNet Preview] Is array?:', Array.isArray(result.data));
    console.log('[StaysNet Preview] Count:', Array.isArray(result.data) ? result.data.length : 'N/A');
    console.log('='.repeat(80) + '\n');
    
    return c.json(successResponse({
      message: 'Reservations fetched successfully',
      count: Array.isArray(result.data) ? result.data.length : 0,
      data: result.data,
      timestamp: new Date().toISOString(),
    }));
  } catch (error: any) {
    console.error('\n' + '='.repeat(80));
    console.error('[StaysNet Preview] ❌ EXCEPTION CAUGHT IN previewStaysNetReservations');
    console.error('='.repeat(80));
    console.error('[StaysNet Preview] ❌ Error type:', error.constructor.name);
    console.error('[StaysNet Preview] ❌ Error message:', error.message);
    console.error('[StaysNet Preview] ❌ Error stack:', error.stack);
    console.error('='.repeat(80) + '\n');
    
    logError('Error previewing Stays.net reservations', error);
    
    return c.json(errorResponse(error.message || 'Failed to preview reservations', {
      type: error.constructor.name,
      message: error.message,
      stack: error.stack,
    }), 500);
  }
}

// ============================================================================
// PREVIEW IMPORT (Propriedades): evita duplicar anúncios
// ============================================================================
export async function previewStaysNetImport(c: Context) {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    const body = await c.req.json().catch(() => ({}));
    const propertyIds: string[] = Array.isArray(body.propertyIds) ? body.propertyIds : [];

    console.log('[StaysNet Import Preview] org:', organizationId, 'totalIds:', propertyIds.length);

    if (!propertyIds.length) {
      return c.json(errorResponse('Envie propertyIds para pré-visualizar a importação'), 400);
    }

    const supabase = getSupabaseClient(c);

    // Buscar apenas em properties (tabela oficial), considerando todos os formatos de external_id
    // ✅ CORREÇÃO: Buscar apenas 'data' pois 'external_ids' não existe mais (migrado para data->externalIds)
    const { data: ultimateData, error: ultimateError } = await supabase
      .from('properties')
      .select('id, data')
      .eq('organization_id', organizationId);

    if (ultimateError) {
      console.warn('[StaysNet Import Preview] ⚠️ Falha ao consultar properties:', ultimateError.message);
    }

    let allExisting = [...(ultimateData || [])];

    // Fallback: se não encontrou nada para a organização atual, faz varredura global (apenas IDs) para detectar duplicados históricos
    if (allExisting.length === 0) {
      const { data: ultimateAny, error: ultimateAnyError } = await supabase
        .from('properties')
        .select('id, data');

      if (ultimateAnyError) {
        console.warn('[StaysNet Import Preview] ⚠️ Falha fallback properties (global):', ultimateAnyError.message);
      }

      allExisting = [...(ultimateAny || [])];
    }

    const existingSet = new Set<string>();

    const addIfString = (value: any) => {
      if (value !== undefined && value !== null) {
        existingSet.add(String(value));
      }
    };

    console.log(`[StaysNet Import Preview] 🔍 Analisando ${allExisting.length} registros em properties...`);

    allExisting.forEach((row: any) => {
      const data = row?.data || {};
      const extIds = data?.externalIds || {};

      // ✅ Campos principais usados pelo import-staysnet-properties.ts
      // - staysnet_listing_id (ID do listing)
      // - staysnet_property_id (ID do property por trás do listing, quando disponível)
      const staysnetListingId = extIds.staysnet_listing_id;
      const staysnetPropertyId = extIds.staysnet_property_id;
      const staysnetListingCode = extIds.staysnet_listing_code;

      if (staysnetListingId) {
        addIfString(staysnetListingId);
      }
      if (staysnetPropertyId) {
        addIfString(staysnetPropertyId);
      }
      if (staysnetListingCode) {
        addIfString(staysnetListingCode);
      }

      if (staysnetListingId || staysnetPropertyId || staysnetListingCode) {
        console.log(
          `[Preview] ✅ Encontrado: ${data?.title || data?.nome_interno || 'sem título'} → ` +
            `listing_id=${staysnetListingId || '∅'} property_id=${staysnetPropertyId || '∅'} code=${staysnetListingCode || '∅'}`
        );
      }

      // Variantes para compatibilidade com imports antigos (mais raros)
      addIfString(extIds.stays_property_id);
      addIfString(data?._stays_net_original?.id);
      addIfString(data?._stays_net_original?._id);
    });

    console.log(`[StaysNet Import Preview] 📊 Total de IDs únicos encontrados: ${existingSet.size}`);
    console.log(`[StaysNet Import Preview] 📋 Sample IDs:`, Array.from(existingSet).slice(0, 5));

    const existingIds = propertyIds.filter((id) => existingSet.has(String(id)));
    const newIds = propertyIds.filter((id) => !existingSet.has(String(id)));

    console.log('[StaysNet Import Preview] ✅ Resultado: existentes:', existingIds.length, 'novos:', newIds.length);

    return c.json(successResponse({
      totalRemote: propertyIds.length,
      existingCount: existingIds.length,
      newCount: newIds.length,
      existingIds,
      newIds,
      timestamp: new Date().toISOString(),
    }));
  } catch (error: any) {
    console.error('[StaysNet Import Preview] ❌ Exception:', error.message);
    return c.json(errorResponse(error.message || 'Falha ao gerar preview'), 500);
  }
}

/**
 * POST /staysnet/import/full
 * Importação completa de dados da Stays.net (hóspedes, propriedades, reservas)
 */
export async function importFullStaysNet(c: Context) {
  const requestId = `import-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  try {
    console.log('\n' + '='.repeat(80));
    console.log(`[StaysNet Full Import] 🚀 INICIANDO IMPORTAÇÃO COMPLETA [${requestId}]`);
    console.log('='.repeat(80));
    console.log('[StaysNet Full Import] Timestamp:', new Date().toISOString());
    console.log('[StaysNet Full Import] Request ID:', requestId);
    
    // Obter organization_id
    const organizationId = await getOrganizationIdOrThrow(c);
    console.log('[StaysNet Full Import] Organization ID:', organizationId);
    
    // Obter parâmetros do body
    const body = await c.req.json().catch(() => ({}));
    const { selectedPropertyIds, startDate, endDate } = body;
    
    console.log('[StaysNet Full Import] Parâmetros recebidos:', {
      selectedPropertyIds: selectedPropertyIds?.length || 0,
      selectedIds: selectedPropertyIds,
      startDate,
      endDate,
      hasBody: !!body,
      bodyKeys: Object.keys(body),
    });
    
    // ✅ Obter configuração (banco de dados primeiro, depois KV Store)
    let config: StaysNetConfig | null = null;
    
    // Tentar carregar do banco de dados primeiro
    const dbResult = await staysnetDB.loadStaysNetConfigDB(organizationId);
    if (dbResult.success && dbResult.data) {
      config = dbResult.data;
      console.log('[StaysNet Full Import] ✅ Configuração carregada do banco de dados');
    } else {
      // Fallback para KV Store
      config = await kv.get<StaysNetConfig>('settings:staysnet');
      if (config) {
        console.log('[StaysNet Full Import] ⚠️ Configuração carregada do KV Store (fallback)');
        // Migrar automaticamente para o banco
        await staysnetDB.saveStaysNetConfigDB(config, organizationId);
      }
    }
    
    if (!config || !config.apiKey) {
      return c.json(errorResponse('Stays.net não configurado. Configure em Configurações → Integrações → Stays.net'), 400);
    }
    
    console.log('[StaysNet Full Import] ✅ Configuração carregada:', {
      baseUrl: config.baseUrl,
      apiKey: config.apiKey.substring(0, 4) + '****',
      hasApiSecret: !!config.apiSecret,
    });
    
    // Criar cliente
    const client = new StaysNetClient(config.apiKey, config.baseUrl, config.apiSecret);
    console.log('[StaysNet Full Import] ✅ Cliente Stays.net criado');
    
    // Importar função de sincronização completa
    const { fullSyncStaysNet } = await import('./staysnet-full-sync.ts');
    console.log('[StaysNet Full Import] ✅ Função fullSyncStaysNet importada');
    
    console.log('[StaysNet Full Import] 🔄 Chamando fullSyncStaysNet com parâmetros:', {
      requestId,
      organizationId,
      selectedPropertyIdsCount: selectedPropertyIds?.length || 0,
      startDate,
      endDate,
    });
    
    // Executar sincronização completa
    const result = await fullSyncStaysNet(
      client,
      organizationId,
      selectedPropertyIds,
      startDate,
      endDate,
      requestId
    );
    
    console.log('[StaysNet Full Import] 🔙 fullSyncStaysNet retornou:', {
      requestId,
      success: result.success,
      hasStats: !!result.stats,
      statsKeys: result.stats ? Object.keys(result.stats) : [],
    });
    
    console.log('[StaysNet Full Import] ✅ Sincronização concluída');
    console.log('[StaysNet Full Import] Estatísticas:', result.stats);
    console.log('='.repeat(80) + '\n');
    
    if (result.success) {
      return c.json(successResponse({
        message: 'Importação completa realizada com sucesso',
        stats: result.stats,
        timestamp: new Date().toISOString(),
      }));
    } else {
      return c.json(errorResponse('Importação completa concluída com erros', result.stats), 200);
    }
  } catch (error: any) {
    console.error('\n' + '='.repeat(80));
    console.error('[StaysNet Full Import] ❌ ERRO');
    console.error('='.repeat(80));
    console.error('[StaysNet Full Import] Erro:', error);
    console.error('='.repeat(80) + '\n');
    
    logError('Error in full import Stays.net', error);
    return c.json(errorResponse(error.message || 'Failed to import data', {
      type: error.constructor.name,
      message: error.message,
      stack: error.stack,
    }), 500);
  }
}

/**
 * POST /staysnet/import/debug
 * 🧪 ENDPOINT DEBUG: Retorna JSON BRUTO da StaysNet sem processar
 * Objetivo: Confirmar que backend consegue puxar dados da API
 */
export async function debugRawStaysNet(c: Context) {
  const requestId = `debug-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  console.error('🧪🧪🧪 [DEBUG RAW] INICIANDO 🧪🧪🧪');
  console.error(`[DEBUG RAW] Request ID: ${requestId}`);
  
  try {
    // Obter organization_id
    const organizationId = await getOrganizationIdOrThrow(c);
    console.error(`[DEBUG RAW] Organization ID: ${organizationId}`);
    
    // Obter parâmetros
    const body = await c.req.json().catch(() => ({}));
    const { selectedPropertyIds } = body;
    
    console.error(`[DEBUG RAW] Selected IDs: ${JSON.stringify(selectedPropertyIds || [])}`);
    
    // Carregar configuração StaysNet
    let config: StaysNetConfig | null = null;
    
    const dbResult = await staysnetDB.loadStaysNetConfigDB(organizationId);
    if (dbResult.success && dbResult.data) {
      config = dbResult.data;
      console.error('[DEBUG RAW] ✅ Config carregada do banco');
    } else {
      config = await kv.get<StaysNetConfig>('settings:staysnet');
      if (config) {
        console.error('[DEBUG RAW] ⚠️ Config carregada do KV Store');
      }
    }
    
    if (!config || !config.apiKey) {
      console.error('[DEBUG RAW] ❌ StaysNet não configurado');
      return c.json(errorResponse('Stays.net não configurado. Configure as credenciais primeiro.'), 400);
    }
    
    console.error(`[DEBUG RAW] ✅ Config: ${config.baseUrl} | Key: ${config.apiKey.substring(0, 4)}****`);
    
    // Criar cliente StaysNet
    const client = new StaysNetClient(config.apiKey, config.baseUrl, config.apiSecret);
    console.error('[DEBUG RAW] ✅ Cliente criado');
    
    // 🧪 BUSCAR LISTINGS BRUTO
    console.error('[DEBUG RAW] 📡 Chamando StaysNet API...');
    
    const listingsResult = client.getAllListings 
      ? await client.getAllListings() 
      : await client.getListings();
    
    console.error(`[DEBUG RAW] 📡 Resposta recebida - Success: ${listingsResult.success}`);
    
    if (!listingsResult.success) {
      console.error('[DEBUG RAW] ❌ API retornou erro');
      return c.json({
        success: false,
        error: listingsResult.error || 'StaysNet API retornou erro',
        api_called: true,
        config_exists: true,
      }, 500);
    }
    
    // Extrair array de listings
    let staysListings: any[] = [];
    if (Array.isArray(listingsResult.data)) {
      staysListings = listingsResult.data;
    } else if (listingsResult.data?.listings && Array.isArray(listingsResult.data.listings)) {
      staysListings = listingsResult.data.listings;
    } else if (listingsResult.data?.data && Array.isArray(listingsResult.data.data)) {
      staysListings = listingsResult.data.data;
    }
    
    console.error(`[DEBUG RAW] 📊 Total de propriedades recebidas: ${staysListings.length}`);
    
    // Filtrar por IDs selecionados (se fornecido)
    if (selectedPropertyIds && selectedPropertyIds.length > 0) {
      const before = staysListings.length;
      staysListings = staysListings.filter(listing => 
        selectedPropertyIds.includes(listing._id || listing.id)
      );
      console.error(`[DEBUG RAW] 🔍 Filtrado: ${before} → ${staysListings.length} propriedades`);
    }
    
    // 🎉 RETORNAR JSON BRUTO
    console.error('[DEBUG RAW] ✅ Retornando dados brutos');
    console.error('🧪🧪🧪 [DEBUG RAW] CONCLUÍDO 🧪🧪🧪');
    
    return c.json({
      success: true,
      message: '✅ Backend conseguiu puxar dados da StaysNet API!',
      api_called: true,
      config_exists: true,
      stats: {
        total_fetched: staysListings.length,
        first_property_id: staysListings[0]?._id || staysListings[0]?.id,
        first_property_name: staysListings[0]?.internalName,
      },
      raw_data: staysListings, // 🎯 JSON BRUTO AQUI
      timestamp: new Date().toISOString(),
      request_id: requestId,
    });
    
  } catch (error: any) {
    console.error('[DEBUG RAW] ❌ ERRO:', error);
    return c.json({
      success: false,
      error: error.message,
      api_called: false,
      config_exists: false,
      stack: error.stack,
    }, 500);
  }
}
