import { Context } from 'npm:hono';
import * as kv from './kv_store.tsx';
import { getSupabaseClient } from './kv_store.tsx';
import { successResponse, errorResponse, logInfo, logError } from './utils.ts';
import * as staysnetDB from './staysnet-db.ts';
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';
import { loadStaysNetRuntimeConfigOrThrow } from './utils-staysnet-config.ts';
import { resolveOrCreateGuestIdFromStaysReservation } from './utils-staysnet-guest-link.ts';
import type { Block, BlockSubtype } from './types.ts';
import { blockToSql } from './utils-block-mapper.ts';

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
      return c.json(successResponse(dbResult.data));
    }
    
    // ⚠️ FALLBACK: Tentar carregar do KV Store (compatibilidade)
    console.log('[StaysNet] ⚠️ Tentando carregar do KV Store (fallback)...');
    const config = await kv.get<StaysNetConfig>('settings:staysnet');
    
    if (config) {
      // Migrar automaticamente para o banco de dados
      console.log('[StaysNet] 🔄 Migrando configuração do KV Store para banco de dados...');
      await staysnetDB.saveStaysNetConfigDB(config, organizationId);
    }

    return c.json(successResponse(config || {
      apiKey: '',
      baseUrl: 'https://stays.net/external/v1',
      accountName: '',
      notificationWebhookUrl: '',
      scope: 'global',
      enabled: false,
    }));
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
    
    const config: StaysNetConfig = {
      apiKey: body.apiKey,
      apiSecret: body.apiSecret || undefined,
      baseUrl: body.baseUrl || 'https://stays.net/external/v1',
      accountName: body.accountName || undefined,
      notificationWebhookUrl: body.notificationWebhookUrl || undefined,
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
 * Receiver simples para notificações do Stays.net.
 *
 * Observação: a documentação menciona `x-stays-signature`, porém não define
 * aqui o algoritmo de verificação. Por segurança, persistimos headers + payload
 * para posterior validação/processing.
 */
export async function receiveStaysNetWebhook(c: Context) {
  try {
    const { organizationId } = c.req.param();
    if (!organizationId) {
      return c.json(errorResponse('organizationId is required'), 400);
    }

    const clientId = c.req.header('x-stays-client-id') || null;
    const signature = c.req.header('x-stays-signature') || null;

    // Sempre capturar o body RAW como texto para permitir verificação de assinatura.
    // (Hono/Deno Request body é consumível 1x)
    const rawText = await c.req.text();

    let body: any = rawText;
    try {
      body = JSON.parse(rawText);
    } catch {
      // manter como string
    }

    const action = typeof body === 'object' && body ? String(body.action || 'unknown') : 'unknown';
    const payload = typeof body === 'object' && body ? (body.payload ?? body) : body;
    const dt = typeof body === 'object' && body ? (body._dt ?? null) : null;

    const verifyEnabled = String(Deno.env.get('STAYSNET_WEBHOOK_VERIFY_SIGNATURE') || '').trim().toLowerCase() === 'true';
    const webhookSecret = String(Deno.env.get('STAYSNET_WEBHOOK_SECRET') || '').trim();

    let signatureVerified: boolean | null = null;
    let signatureReason: string | null = null;
    if (verifyEnabled) {
      if (!webhookSecret) {
        signatureVerified = null;
        signatureReason = 'verify_enabled_but_secret_missing';
      } else if (!signature) {
        signatureVerified = false;
        signatureReason = 'missing_signature_header';
      } else {
        try {
          signatureVerified = await verifyStaysNetWebhookSignature(signature, webhookSecret, rawText);
          signatureReason = signatureVerified ? 'ok' : 'mismatch';
        } catch (e: any) {
          signatureVerified = false;
          signatureReason = e?.message || 'verification_error';
        }
      }
    }

    const save = await staysnetDB.saveStaysNetWebhookDB(
      organizationId,
      action,
      payload,
      {
        received_dt: dt,
        headers: {
          'x-stays-client-id': clientId,
          'x-stays-signature': signature,
          'user-agent': c.req.header('user-agent') || null,
        },
        signature_verification: {
          enabled: verifyEnabled,
          verified: signatureVerified,
          reason: signatureReason,
        },
      },
    );

    if (!save.success) {
      return c.json(errorResponse(save.error || 'Failed to save webhook'), 500);
    }

    // Se verificação estiver habilitada e falhar, marcar como processado e retornar erro.
    if (verifyEnabled) {
      if (!webhookSecret) {
        await staysnetDB.markWebhookProcessedDB(save.id!, 'Signature verify enabled but secret missing');
        return c.json(errorResponse('Webhook signature verification misconfigured'), 500);
      }

      if (!signature) {
        await staysnetDB.markWebhookProcessedDB(save.id!, 'Missing x-stays-signature');
        return c.json(errorResponse('Missing webhook signature'), 401);
      }

      if (signatureVerified === false) {
        await staysnetDB.markWebhookProcessedDB(save.id!, 'Invalid webhook signature');
        return c.json(errorResponse('Invalid webhook signature'), 401);
      }
    }

    // 🚀 Realtime: processar a fila imediatamente (sem bloquear o response).
    // Em Supabase Edge Functions + Hono, `c.executionCtx.waitUntil` mantém o trabalho rodando.
    // Se não existir ExecutionContext (ambientes diferentes), apenas retorna e o cron consumirá.
    const realtimeEnabled = String(Deno.env.get('STAYSNET_WEBHOOK_REALTIME_PROCESS') || 'true')
      .trim()
      .toLowerCase() === 'true';
    const realtimeLimit = Math.max(
      1,
      Math.min(50, Number(Deno.env.get('STAYSNET_WEBHOOK_REALTIME_LIMIT') || 10)),
    );

    if (realtimeEnabled) {
      const execCtx: any = (c as any).executionCtx;
      if (execCtx && typeof execCtx.waitUntil === 'function') {
        execCtx.waitUntil(
          processPendingStaysNetWebhooksForOrg(organizationId, realtimeLimit).catch((e: any) => {
            console.error('[StaysNet Webhook] realtime process failed:', e?.message || String(e));
          }),
        );
      }
    }

    return c.json(successResponse({ id: save.id, received: true }));
  } catch (error) {
    logError('Error receiving Stays.net webhook', error);
    return c.json(errorResponse('Failed to receive webhook'), 500);
  }
}

function isHexString(value: string): boolean {
  return /^[0-9a-f]+$/i.test(value);
}

function base64FromBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function bytesFromHex(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase();
  if (clean.length % 2 !== 0) throw new Error('Invalid hex length');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesFromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function hmacSha256(secret: string, message: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return new Uint8Array(sig);
}

async function verifyStaysNetWebhookSignature(provided: string, secret: string, rawBodyText: string): Promise<boolean> {
  const raw = String(provided || '').trim();
  if (!raw) throw new Error('empty_signature');

  // Aceitar formatos comuns: "sha256=<hex>", "hmac-sha256=<hex/base64>", ou apenas valor.
  const cleaned = raw
    .replace(/^sha256=/i, '')
    .replace(/^hmac-sha256=/i, '')
    .trim();

  const computed = await hmacSha256(secret, rawBodyText);

  // Comparar como hex ou base64 conforme input.
  if (isHexString(cleaned)) {
    const expected = bytesFromHex(cleaned);
    return constantTimeEqual(expected, computed);
  }

  // Base64 (ou outro formato): tentar base64 estrito.
  const expectedB64 = bytesFromBase64(cleaned);
  return constantTimeEqual(expectedB64, computed);
}

function safeInt(value: any, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n);
}

function parseMoney(value: any, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;

  if (typeof value === 'object') {
    const candidates = [
      (value as any)._f_total,
      (value as any)._f_val,
      (value as any).total,
      (value as any).amount,
      (value as any).value,
      (value as any).price,
      (value as any).grandTotal,
      (value as any).grand_total,
    ];
    for (const c of candidates) {
      const n = parseMoney(c, Number.NaN);
      if (Number.isFinite(n)) return n;
    }
    return fallback;
  }

  if (typeof value === 'string') {
    let s = value.trim();
    if (!s) return fallback;
    s = s.replace(/[^0-9,.-]/g, '');
    if (!s) return fallback;
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    const decimalSep = lastComma > lastDot ? ',' : '.';
    if (decimalSep === ',') {
      s = s.replace(/\./g, '').replace(/,/g, '.');
    } else {
      s = s.replace(/,/g, '');
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : fallback;
  }

  return fallback;
}

function parseMoneyInt(value: any, fallback = 0): number {
  const n = parseMoney(value, Number.NaN);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n);
}

function pickMoneyFromObject(obj: any, keys: string[], fallback = Number.NaN): number {
  if (!obj || typeof obj !== 'object') return fallback;
  for (const k of keys) {
    if (k in obj) {
      const n = parseMoney((obj as any)[k], Number.NaN);
      if (Number.isFinite(n)) return n;
    }
  }
  return fallback;
}

function mapReservationStatus(staysStatus: string | undefined): string {
  if (!staysStatus) return 'pending';
  const v = String(staysStatus).trim().toLowerCase();
  const map: Record<string, string> = {
    pending: 'pending',
    inquiry: 'pending',
    confirmed: 'confirmed',
    checked_in: 'checked_in',
    checked_out: 'checked_out',
    cancelled: 'cancelled',
    canceled: 'cancelled',
    // PT-BR (UI Stays)
    cancelada: 'cancelled',
    cancelado: 'cancelled',
    declined: 'cancelled',
    expired: 'cancelled',
    no_show: 'no_show',
  };
  return map[v] || 'pending';
}

function deriveReservationStatus(input: { type?: string; status?: string }): string {
  const typeLower = String(input.type || '').trim().toLowerCase();
  if (typeLower === 'canceled' || typeLower === 'cancelled' || typeLower === 'cancelada' || typeLower === 'cancelado') return 'cancelled';
  if (typeLower === 'no_show') return 'no_show';

  const fromStatus = mapReservationStatus(input.status);
  if (fromStatus === 'pending') {
    if (typeLower === 'booked' || typeLower === 'contract') return 'confirmed';
    if (typeLower === 'reserved') return 'pending';
    // PT-BR (UI Stays)
    if (typeLower === 'reserva' || typeLower === 'contrato') return 'confirmed';
    if (typeLower === 'pré-reserva' || typeLower === 'pre-reserva' || typeLower === 'prereserva') return 'pending';
  }
  return fromStatus;
}

function isStaysBlockLikeType(rawType: any): boolean {
  const t = String(rawType || '').trim().toLowerCase();
  return t === 'blocked' || t === 'bloqueado' || t === 'maintenance' || t === 'manutenção' || t === 'manutencao';
}

function mapBlockSubtypeFromStaysType(rawType: any): BlockSubtype {
  const t = String(rawType || '').trim().toLowerCase();
  if (t === 'maintenance' || t === 'manutenção' || t === 'manutencao') return 'maintenance';
  return 'simple';
}

function buildBlockReasonFromStaysType(rawType: any): string {
  const t = String(rawType || '').trim().toLowerCase();
  if (t === 'maintenance' || t === 'manutenção' || t === 'manutencao') return 'Manutenção (Stays.net)';
  return 'Bloqueio (Stays.net)';
}

function toYmd(value: any): string | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.split('T')[0];
}

function calcNightsYmd(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function mapPaymentStatus(raw: string | undefined, fallback: string = 'pending'): string {
  if (!raw) return fallback;
  const v = String(raw).trim().toLowerCase();
  const map: Record<string, string> = {
    pending: 'pending',
    paid: 'paid',
    completed: 'paid',
    partial: 'partial',
    partially_paid: 'partial',
    refunded: 'refunded',
    refund: 'refunded',
  };
  return map[v] || fallback;
}

function mapPlatformFromRaw(input: unknown): string {
  if (!input) return '';
  const token = (() => {
    if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') return String(input);
    if (typeof input === 'object') {
      const v: any = input as any;
      return [v?.name, v?.code, v?.platform, v?.source].filter(Boolean).map(String).join(' ');
    }
    return String(input);
  })();
  const s = token.toLowerCase();
  if (s.includes('airbnb')) return 'airbnb';
  if (s.includes('booking')) return 'booking';
  if (s.includes('decolar')) return 'decolar';
  if (s.includes('direct')) return 'direct';
  return '';
}

function derivePlatformFromStaysReservation(input: any, existingPlatform?: string | null): string {
  const existing = String(existingPlatform || '').trim();
  if (existing && existing !== 'other') return existing;

  const candidates = [
    input?.platform,
    input?.source,
    input?.partner,
    input?.partnerName,
    input?.partnerCode,
    input?.ota,
    input?.channel,
    input?.channelName,
    input?.origin,
  ];

  for (const c of candidates) {
    const mapped = mapPlatformFromRaw(c);
    if (mapped) return mapped;
  }

  // Fallback conservador: a maioria das reservas do Stays é "direct"
  return 'direct';
}

function parseOptionalDateToIso(value: any): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

async function resolveAnuncioDraftIdFromStaysId(
  supabase: ReturnType<typeof getSupabaseClient>,
  organizationId: string,
  staysId: string,
): Promise<string | null> {
  const lookups: Array<{ label: string; needle: any }> = [
    { label: 'data.externalIds.staysnet_property_id', needle: { externalIds: { staysnet_property_id: staysId } } },
    { label: 'data.externalIds.staysnet_listing_id', needle: { externalIds: { staysnet_listing_id: staysId } } },
    { label: 'data.staysnet_raw._id', needle: { staysnet_raw: { _id: staysId } } },
    { label: 'data.staysnet_raw.id', needle: { staysnet_raw: { id: staysId } } },
    { label: 'data.codigo', needle: { codigo: staysId } },
  ];

  for (const l of lookups) {
    const { data: row, error } = await supabase
      .from('anuncios_ultimate')
      .select('id')
      .eq('organization_id', organizationId)
      .contains('data', l.needle)
      .maybeSingle();

    if (error) {
      console.warn(`⚠️ [StaysNet Webhook] Erro ao buscar anuncios_ultimate via ${l.label}: ${error.message}`);
      continue;
    }

    if (row?.id) return row.id;
  }

  return null;
}

function extractListingCandidateFromStaysReservation(input: any): string | null {
  const r = input?.payload ?? input;
  if (!r || typeof r !== 'object') return null;

  const direct =
    r?._idlisting ??
    r?._id_listing ??
    r?.idlisting ??
    r?.id_listing ??
    r?.listingId ??
    r?.listing_id ??
    r?.propertyId ??
    r?.property_id ??
    null;
  if (direct) return String(direct);

  const nestedListing = r?.listing ?? r?.property ?? null;
  if (nestedListing && typeof nestedListing === 'object') {
    const nested =
      nestedListing?._id ??
      nestedListing?.id ??
      nestedListing?._idlisting ??
      nestedListing?.listingId ??
      nestedListing?.listing_id ??
      nestedListing?.propertyId ??
      nestedListing?.property_id ??
      nestedListing?.code ??
      null;
    if (nested) return String(nested);
  }

  // Alguns payloads podem vir envelopados em staysnet_raw
  const raw = r?.staysnet_raw;
  if (raw && typeof raw === 'object') {
    const fromRaw =
      raw?._idlisting ??
      raw?._id_listing ??
      raw?.listingId ??
      raw?.listing_id ??
      raw?.propertyId ??
      raw?.property_id ??
      null;
    if (fromRaw) return String(fromRaw);
  }

  return null;
}

function extractReservationIdFromPayload(payload: any): string | null {
  const p = payload?.payload ?? payload;
  const candidates = [
    p?._id,
    p?.reservationId,
    p?.reserveId,
    p?.id,
    p?.confirmationCode,
    p?.partnerCode,
    p?.reservation?._id,
    p?.reservation?.id,
    p?.reservation?.confirmationCode,
  ].filter(Boolean);

  if (candidates.length === 0) return null;
  return String(candidates[0]);
}

function extractReservationIdCandidatesFromPayload(payload: any): string[] {
  const p = payload?.payload ?? payload;
  const raw = [
    p?._id,
    p?.id,
    p?.reservationId,
    p?.reserveId,
    p?.confirmationCode,
    p?.partnerCode,
    p?.reservation?._id,
    p?.reservation?.id,
    p?.reservation?.confirmationCode,
  ]
    .filter(Boolean)
    .map((x) => String(x));
  return Array.from(new Set(raw));
}

function isCancellationAction(action: string): boolean {
  const a = String(action || '').trim().toLowerCase();
  return a === 'reservation.deleted' || a === 'reservation.canceled' || a === 'reservation.cancelled';
}

async function findReservationsByCandidates(
  supabase: ReturnType<typeof getSupabaseClient>,
  organizationId: string,
  candidates: string[],
): Promise<any[]> {
  const ids = Array.from(new Set((candidates || []).filter(Boolean).map((x) => String(x))));
  if (ids.length === 0) return [];

  const found: any[] = [];
  const seen = new Set<string>();

  const tryQueries: Array<{ label: string; column: string }> = [
    { label: 'external_id', column: 'external_id' },
    { label: 'id', column: 'id' },
    { label: 'staysnet_reservation_code', column: 'staysnet_reservation_code' },
  ];

  for (const q of tryQueries) {
    const res = await supabase
      .from('reservations')
      .select('id, external_id, staysnet_reservation_code, staysnet_type, staysnet_raw')
      .eq('organization_id', organizationId)
      .in(q.column as any, ids)
      .limit(25);

    if (res.error) {
      console.warn(`[StaysNet Webhook] findReservationsByCandidates(${q.label}) failed:`, res.error.message);
      continue;
    }

    for (const row of res.data || []) {
      const key = String((row as any).id);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      found.push(row);
    }
  }

  return found;
}

async function applyCancellationForCandidates(
  supabase: ReturnType<typeof getSupabaseClient>,
  organizationId: string,
  candidates: string[],
): Promise<{ matched: number; cancelled: number; deletedBlocks: number }> {
  const rows = await findReservationsByCandidates(supabase, organizationId, candidates);
  if (rows.length === 0) return { matched: 0, cancelled: 0, deletedBlocks: 0 };

  let cancelled = 0;
  let deletedBlocks = 0;
  const nowIso = new Date().toISOString();

  for (const r of rows) {
    const isBlocked =
      isStaysBlockLikeType((r as any).staysnet_type) ||
      isStaysBlockLikeType((r as any).staysnet_raw?.type);

    if (isBlocked) {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('organization_id', organizationId)
        .eq('id', (r as any).id);
      if (error) {
        console.warn('[StaysNet Webhook] Failed to delete block reservation:', error.message);
      } else {
        deletedBlocks++;
      }
      continue;
    }

    const { error } = await supabase
      .from('reservations')
      .update({ status: 'cancelled', cancelled_at: nowIso })
      .eq('organization_id', organizationId)
      .eq('id', (r as any).id);
    if (error) {
      console.warn('[StaysNet Webhook] Failed to mark cancelled:', error.message);
    } else {
      cancelled++;
    }
  }

  return { matched: rows.length, cancelled, deletedBlocks };
}

async function cleanupMisclassifiedBlockReservations(
  supabase: ReturnType<typeof getSupabaseClient>,
  organizationId: string,
  candidates: string[],
): Promise<number> {
  const rows = await findReservationsByCandidates(supabase, organizationId, candidates);
  if (rows.length === 0) return 0;

  const misclassified = rows.filter(
    (r) => isStaysBlockLikeType((r as any).staysnet_type) || isStaysBlockLikeType((r as any).staysnet_raw?.type),
  );

  let deleted = 0;
  for (const r of misclassified) {
    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', (r as any).id);
    if (!error) deleted++;
  }
  return deleted;
}

async function upsertBlockFromStaysReservation(
  supabase: ReturnType<typeof getSupabaseClient>,
  organizationId: string,
  propertyId: string,
  startDate: string,
  endDate: string,
  subtype: BlockSubtype,
  reason: string,
  staysMeta: any,
): Promise<{ created: boolean; id: string } | null> {
  const { data: existing, error: existingError } = await supabase
    .from('blocks')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('property_id', propertyId)
    .eq('start_date', startDate)
    .eq('end_date', endDate)
    .eq('subtype', subtype)
    .maybeSingle();

  if (existingError) {
    console.warn('[StaysNet Webhook] Failed to check existing block:', existingError.message);
  }

  const now = new Date().toISOString();
  const notes = JSON.stringify({ staysnet: staysMeta });

  if (existing?.id) {
    const { error: updErr } = await supabase
      .from('blocks')
      .update({ reason, notes, updated_at: now })
      .eq('organization_id', organizationId)
      .eq('id', existing.id);
    if (updErr) {
      console.warn('[StaysNet Webhook] Failed to update existing block:', updErr.message);
      return null;
    }
    return { created: false, id: existing.id };
  }

  const nights = Math.max(1, calcNightsYmd(startDate, endDate));
  const block: Block = {
    id: crypto.randomUUID(),
    propertyId,
    startDate,
    endDate,
    nights,
    type: 'block',
    subtype,
    reason,
    notes,
    createdAt: now,
    updatedAt: now,
    createdBy: 'staysnet-webhook',
  };

  const sqlData = blockToSql(block, organizationId);
  const { error: insErr } = await supabase.from('blocks').insert(sqlData);
  if (insErr) {
    console.warn('[StaysNet Webhook] Failed to insert block:', insErr.message);
    return null;
  }

  return { created: true, id: block.id };
}

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000002';

function mapStaysReservationToSql(
  input: any,
  organizationId: string,
  resolvedPropertyId: string | null,
  resolvedGuestId: string | null,
  existing?: any,
) {
  const checkInDate = input?.checkInDate || input?.checkIn || input?.check_in;
  const checkOutDate = input?.checkOutDate || input?.checkOut || input?.check_out;
  if (!checkInDate || !checkOutDate) {
    throw new Error('Reservation sem checkIn/checkOut');
  }

  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const nights = safeInt(input?.nights, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
  if (nights < 1) throw new Error('Nights inválido');

  // ✅ Contrato canônico (multi-canal):
  // - `reservations.id` é SEMPRE um UUID interno do Rendizy (string)
  // - A identidade externa é (organization_id, platform, external_id)
  // - Para Stays, `external_id` preferencialmente é o `_id` interno (estável)
  const id = String(existing?.id || crypto.randomUUID());
  if (!id) throw new Error('Reservation sem id');

  const priceObj = input?.price || {};
  const currency = input?.currency || priceObj?.currency || 'BRL';

  const hostingDetails = priceObj?.hostingDetails || priceObj?.hosting_details || {};

  const hostingFees: unknown[] = Array.isArray((hostingDetails as any)?.fees) ? ((hostingDetails as any).fees as unknown[]) : [];
  const hostingFeesTotal = parseMoneyInt(
    hostingFees.reduce((acc, fee) => {
      if (!fee || typeof fee !== 'object') return acc;
      const v = pickMoneyFromObject(fee as any, ['_f_val', 'value', 'val', 'amount', 'price'], Number.NaN);
      const n = parseMoney(v, Number.NaN);
      return Number.isFinite(n) ? acc + n : acc;
    }, 0),
    0,
  );

  // OBS: em produção, os campos pricing_* são INTEGER. O Stays pode enviar decimais ("813.38"),
  // então normalizamos para inteiro (arredondado) para evitar erro de cast no Postgres.
  const pricePerNight = parseMoneyInt(
    input?.pricePerNight ??
      pickMoneyFromObject(hostingDetails, ['_f_nightPrice', 'nightPrice', 'pricePerNight', 'perNight', 'per_night'], Number.NaN) ??
      pickMoneyFromObject(priceObj, ['pricePerNight', 'price_per_night', 'perNight', 'per_night', '_f_nightPrice'], Number.NaN),
    0,
  );

  // `price._f_total` costuma vir como TOTAL final (inclui taxas). Para base/accommodation, preferimos `_f_expected`.
  const accommodationTotal = parseMoney(
    pickMoneyFromObject(priceObj, ['_f_expected', 'expected', 'expectedTotal', 'expected_total', 'accommodation', 'accommodationTotal', 'accommodation_total', 'subtotal', 'sub_total'], Number.NaN) ??
      pickMoneyFromObject(hostingDetails, ['_f_nightPrice', 'nightPrice', 'pricePerNight', 'perNight', 'per_night'], Number.NaN),
    Number.NaN,
  );

  const baseTotal = parseMoney(
    pickMoneyFromObject(priceObj, ['baseTotal', 'base_total', 'accommodation', 'accommodationTotal', 'accommodation_total', 'subtotal', 'sub_total'], Number.NaN) ??
      input?.price ??
      input?.baseTotal,
    Number.NaN,
  );

  const cleaningFeeFromFields = parseMoneyInt(
    input?.cleaningFee ??
      pickMoneyFromObject(priceObj, ['cleaningFee', 'cleaning_fee', 'cleaning'], Number.NaN),
    0,
  );
  const serviceFee = parseMoneyInt(
    input?.serviceFee ??
      pickMoneyFromObject(priceObj, ['serviceFee', 'service_fee', 'service'], Number.NaN),
    0,
  );
  const taxes = parseMoneyInt(
    input?.taxes ??
      pickMoneyFromObject(priceObj, ['taxes', 'tax', 'vat'], Number.NaN),
    0,
  );
  const discount = parseMoneyInt(
    input?.discount ??
      pickMoneyFromObject(priceObj, ['discount', 'discounts', 'coupon', 'promotion'], Number.NaN),
    0,
  );

  const resolvedBaseTotal = Number.isFinite(accommodationTotal)
    ? Math.round(accommodationTotal)
    : Number.isFinite(baseTotal)
      ? Math.round(baseTotal)
      : pricePerNight * nights;

  // Se não veio taxa explícita, tenta somar fees do hostingDetails.
  const cleaningFee = cleaningFeeFromFields > 0 ? cleaningFeeFromFields : hostingFeesTotal;

  const rawType = input?.type ?? input?.reservationType ?? input?.typeReservation ?? input?.tipo ?? input?.tipoReserva ?? null;
  const rawStatus =
    input?.status ??
    input?.reservationStatus ??
    input?.statusReservation ??
    input?.bookingStatus ??
    input?.status_reservation ??
    input?.reservation_status ??
    null;

  const derivedStatus = deriveReservationStatus({ type: rawType, status: rawStatus });

  const cancelledAtIso =
    parseOptionalDateToIso(
      input?.cancelledAt ??
        input?.canceledAt ??
        input?.cancellationDate ??
        input?.cancelDate ??
        input?.cancelled_at,
    ) ?? (derivedStatus === 'cancelled' ? new Date().toISOString() : null);

  const cancellationReason =
    input?.cancellationReason ?? input?.cancellation_reason ?? input?.cancelReason ?? input?.cancel_reason ?? null;

  // Guests
  const guestsDetails = input?.guestsDetails || input?.guests_details || input?.guests || {};
  const guestsAdults = safeInt(guestsDetails?.adults ?? input?.guests?.adults, 1) || 1;
  const guestsChildren = safeInt(guestsDetails?.children ?? input?.guests?.children, 0);
  const guestsInfants = safeInt(guestsDetails?.infants ?? input?.guests?.infants, 0);
  const guestsPets = safeInt(guestsDetails?.pets ?? input?.guests?.pets, 0);
  const guestsTotal = safeInt(guestsDetails?.total ?? input?.guests?.total, guestsAdults);

  // Guardar o id interno do Stays em `external_id` (para fetch/update via API), e o código curto em `id`.
  const externalId = String(input?._id || input?.reservationId || input?.reserveId || input?.id || id);
  const externalUrl = input?.reservationUrl || input?.externalUrl || input?.external_url || null;

  // Mantém vínculos existentes se não conseguimos resolver
  const finalPropertyId = resolvedPropertyId || existing?.property_id || null;
  const finalGuestId = resolvedGuestId || existing?.guest_id || null;

  const sourceCreatedAtIso = parseOptionalDateToIso(input?.creationDate ?? input?.createdAt ?? input?.created_at);

  // Total final: preferir total explícito se vier (alguns payloads já trazem com taxas/fees)
  const explicitTotal = parseMoney(
    pickMoneyFromObject(priceObj, ['total', 'grandTotal', 'grand_total', '_f_total', 'amount', 'value', 'price'], Number.NaN) ??
      pickMoneyFromObject(hostingDetails, ['_f_total'], Number.NaN) ??
      input?.total,
    Number.NaN,
  );
  const computedTotal = resolvedBaseTotal + cleaningFee + serviceFee + taxes - discount;
  const total = Number.isFinite(explicitTotal) ? Math.round(explicitTotal) : computedTotal;

  return {
    id,
    organization_id: organizationId,
    property_id: finalPropertyId,
    guest_id: finalGuestId,
    created_by: existing?.created_by || DEFAULT_USER_ID,
    check_in: checkIn.toISOString().split('T')[0],
    check_out: checkOut.toISOString().split('T')[0],
    nights,
    guests_adults: guestsAdults,
    guests_children: guestsChildren,
    guests_infants: guestsInfants,
    guests_pets: guestsPets,
    guests_total: guestsTotal,
    pricing_price_per_night: pricePerNight,
    pricing_base_total: resolvedBaseTotal,
    pricing_cleaning_fee: cleaningFee,
    pricing_service_fee: serviceFee,
    pricing_taxes: taxes,
    pricing_discount: discount,
    pricing_total: total,
    pricing_currency: currency,
    status: derivedStatus,
    platform: derivePlatformFromStaysReservation(input, existing?.platform ?? null),
    external_id: externalId,
    external_url: externalUrl,
    payment_status: mapPaymentStatus(input?.paymentStatus, 'pending'),
    payment_method: input?.paymentMethod || null,
    notes: input?.notes || null,
    special_requests: input?.specialRequests || null,
    check_in_time: input?.checkInTime || null,
    check_out_time: input?.checkOutTime || null,
    cancelled_at: cancelledAtIso,
    cancellation_reason: cancellationReason,
    source_created_at: sourceCreatedAtIso,
    confirmed_at: derivedStatus === 'confirmed' ? new Date().toISOString() : null,

    // 🔒 Persistência completa do payload de origem (audit/debug)
    staysnet_raw: input,
  };
}

/**
 * POST /staysnet/webhooks/process/:organizationId
 * Processa webhooks pendentes e aplica alterações no SQL.
 */
export async function processStaysNetWebhooks(c: Context) {
  try {
    const { organizationId } = c.req.param();
    if (!organizationId) return c.json(errorResponse('organizationId is required'), 400);

    const limit = Math.max(1, Math.min(200, Number(c.req.query('limit') || 25)));
    const result = await processPendingStaysNetWebhooksForOrg(organizationId, limit);
    return c.json(successResponse(result));
  } catch (error) {
    logError('Error processing Stays.net webhooks', error);
    return c.json(errorResponse('Failed to process webhooks'), 500);
  }
}

/**
 * GET /staysnet/webhooks/diagnostics/:organizationId
 * Diagnóstico rápido: fila pendente, erros processados e últimos eventos.
 *
 * Útil para validar se o webhook está chegando e se o cron/processador está consumindo.
 */
export async function getStaysNetWebhooksDiagnostics(c: Context) {
  try {
    const { organizationId } = c.req.param();
    if (!organizationId) return c.json(errorResponse('organizationId is required'), 400);

    const limit = Math.max(1, Math.min(200, Number(c.req.query('limit') || 50)));
    const supabase = getSupabaseClient();

    const qPending = supabase
      .from('staysnet_webhooks')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('processed', false);

    const qErrorProcessed = supabase
      .from('staysnet_webhooks')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('processed', true)
      .not('error_message', 'is', null);

    const qRecent = supabase
      .from('staysnet_webhooks')
      .select('id, action, received_at, processed, processed_at, error_message, metadata, payload')
      .eq('organization_id', organizationId)
      .order('received_at', { ascending: false })
      .limit(limit);

    const [rPending, rErrProcessed, rRecent] = await Promise.all([qPending, qErrorProcessed, qRecent]);
    const firstError = rPending.error || rErrProcessed.error || rRecent.error;
    if (firstError) {
      return c.json(errorResponse('Failed to load Stays.net webhook diagnostics', { details: firstError.message }), 500);
    }

    const rows = (rRecent.data || []) as any[];

    const recent = rows.map((row) => {
      const reservationId = extractReservationIdFromPayload(row?.payload);
      const signature = row?.metadata?.headers?.['x-stays-signature'] || null;
      const signatureVerified = row?.metadata?.signature_verification?.verified ?? null;
      const signatureReason = row?.metadata?.signature_verification?.reason ?? null;
      return {
        id: row.id,
        action: row.action,
        reservationId,
        received_at: row.received_at,
        processed: row.processed,
        processed_at: row.processed_at || null,
        error_message: row.error_message || null,
        signature: signature ? String(signature).slice(0, 12) + '…' : null,
        signature_verified: signatureVerified,
        signature_reason: signatureReason,
      };
    });

    return c.json(
      successResponse({
        organizationId,
        counts: {
          pending: rPending.count ?? 0,
          processedWithError: rErrProcessed.count ?? 0,
          recentReturned: recent.length,
        },
        recent,
      }),
    );
  } catch (error: any) {
    logError('Error loading Stays.net webhook diagnostics', error);
    return c.json(errorResponse('Failed to load webhook diagnostics', { details: error?.message || String(error) }), 500);
  }
}

/**
 * POST /staysnet/backfill/guests/:organizationId
 * Backfill: cria/vincula guests para reservas que ainda estão com guest_id = null.
 *
 * Útil para corrigir histórico após ativar webhooks/rotinas antigas.
 */
export async function backfillStaysNetReservationGuests(c: Context) {
  try {
    const { organizationId } = c.req.param();
    if (!organizationId) return c.json(errorResponse('organizationId is required'), 400);

    const limit = Math.max(1, Math.min(500, Number(c.req.query('limit') || 200)));

    const supabase = getSupabaseClient();

    const { data: rows, error } = await supabase
      .from('reservations')
      .select('id, external_id, guest_id, staysnet_raw')
      .eq('organization_id', organizationId)
      .not('staysnet_raw', 'is', null)
      .limit(limit);

    if (error) return c.json(errorResponse('Failed to list reservations', { details: error.message }), 500);

    let scanned = 0;
    let updated = 0;
    let createdOrFound = 0;
    let skipped = 0;
    let errors = 0;

    for (const r of rows || []) {
      scanned++;
      try {
        const raw = (r as any).staysnet_raw;
        if (!raw) {
          skipped++;
          continue;
        }

        // Resolver property se possível
        const listingCandidate = extractListingCandidateFromStaysReservation(raw);
        let resolvedPropertyId: string | null = null;
        if (listingCandidate) {
          resolvedPropertyId = await resolveAnuncioDraftIdFromStaysId(supabase, organizationId, String(listingCandidate));
        }

        // Resolver/criar guest
        const existingGuestId = (r as any).guest_id || null;
        const resolvedGuestId = existingGuestId || (await resolveOrCreateGuestIdFromStaysReservation(supabase, organizationId, raw));
        if (resolvedGuestId) createdOrFound++;

        // Recalcular SQL completo com mapper (inclui pricing_*)
        const sqlData = mapStaysReservationToSql(raw, organizationId, resolvedPropertyId, resolvedGuestId, {
          id: (r as any).id,
          property_id: resolvedPropertyId,
          guest_id: existingGuestId,
          created_by: null,
        });

        // 🔒 Regra canônica: reservas sem imóvel não existem.
        // Se não conseguimos resolver property_id (nem existe vínculo anterior), não persistimos.
        if (!sqlData.property_id) {
          await supabase
            .from('reservations')
            .delete()
            .eq('organization_id', organizationId)
            .eq('id', (r as any).id);
          skipped++;
          continue;
        }

        const { error: upErr } = await supabase
          .from('reservations')
          .upsert(sqlData, { onConflict: 'organization_id,platform,external_id' });
        if (upErr) {
          errors++;
          continue;
        }

        updated++;
      } catch {
        errors++;
      }
    }

    return c.json(
      successResponse({
        scanned,
        createdOrFound,
        updated,
        skipped,
        errors,
      }),
    );
  } catch (error) {
    logError('Error backfilling Stays.net reservation guests', error);
    return c.json(errorResponse('Failed to backfill reservation guests'), 500);
  }
}

/**
 * Processa webhooks pendentes e aplica alterações no SQL (helper reutilizável).
 *
 * Importante: NÃO depende de Context/Hono, para permitir uso em cron/worker.
 */
export async function processPendingStaysNetWebhooksForOrg(
  organizationId: string,
  limit: number = 25,
): Promise<{ processed: number; updated: number; skipped: number; errors: number }> {
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 25));
  const pending = await staysnetDB.listPendingWebhooksDB(organizationId, safeLimit);
  if (!pending.success) {
    throw new Error(pending.error || 'Failed to list webhooks');
  }

  const rows = pending.data || [];
  if (rows.length === 0) {
    return { processed: 0, updated: 0, skipped: 0, errors: 0 };
  }

  const staysConfig = await loadStaysNetRuntimeConfigOrThrow(organizationId);
  const client = new StaysNetClient(staysConfig.apiKey, staysConfig.baseUrl, staysConfig.apiSecret);
  const supabase = getSupabaseClient();

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const hook of rows) {
    processed++;
    try {
      const action = String(hook.action || '').trim();

      if (!action.startsWith('reservation.')) {
        skipped++;
        await staysnetDB.markWebhookProcessedDB(hook.id);
        continue;
      }

      // Pagamentos não impactam calendário; hoje não temos pipeline de conciliação financeira via webhook.
      // Para evitar ruído e falhas com IDs errados (paymentId vs reservationId), marcamos como processado.
      if (action.startsWith('reservation.payments.')) {
        skipped++;
        await staysnetDB.markWebhookProcessedDB(hook.id);
        continue;
      }

      const reservationId = extractReservationIdFromPayload(hook.payload);

      const cancellationCandidates = extractReservationIdCandidatesFromPayload(hook.payload);
      if (reservationId) cancellationCandidates.unshift(String(reservationId));

      // delete/canceled/cancelled: tratar como cancelamento (mesma regra), mas para bloqueios removemos.
      // Motivo: Stays pode enviar `reservation.deleted` quando a reserva é cancelada.
      if (isCancellationAction(action)) {
        const cancelResult = await applyCancellationForCandidates(supabase, organizationId, cancellationCandidates);
        if (cancelResult.matched > 0) {
          updated++;
          await staysnetDB.markWebhookProcessedDB(
            hook.id,
            `Cancellation applied (matched=${cancelResult.matched}, cancelled=${cancelResult.cancelled}, deletedBlocks=${cancelResult.deletedBlocks})`,
          );
          continue;
        }

        // Se não encontramos no banco, tentamos buscar detalhes e criar/atualizar como cancelled.
        // Isso evita perder cancelamentos quando o evento chega antes da criação local.
        if (reservationId) {
          const detail = await client.request(`/booking/reservations/${reservationId}`, 'GET');
          if (detail.success) {
            const staysReservation = detail.data;

            const staysTypeLower = String((staysReservation as any)?.type || '').trim().toLowerCase();

            const listingCandidate =
              extractListingCandidateFromStaysReservation(staysReservation) ||
              extractListingCandidateFromStaysReservation(hook.payload);

            let resolvedPropertyId: string | null = null;
            if (listingCandidate) {
              resolvedPropertyId = await resolveAnuncioDraftIdFromStaysId(supabase, organizationId, String(listingCandidate));
            }

            // ✅ Se for bloqueio/manutenção, a ação de cancelamento significa remover o block (não marcar reserva).
            if (isStaysBlockLikeType(staysTypeLower)) {
              const startDate = toYmd((staysReservation as any)?.checkInDate || (staysReservation as any)?.checkIn);
              const endDate = toYmd((staysReservation as any)?.checkOutDate || (staysReservation as any)?.checkOut);
              if (!resolvedPropertyId || !startDate || !endDate) {
                skipped++;
                await staysnetDB.markWebhookProcessedDB(
                  hook.id,
                  'Cancellation webhook (block): property/date not resolved; cannot delete block',
                );
                continue;
              }

              const subtype = mapBlockSubtypeFromStaysType(staysTypeLower);
              const { error: delErr } = await supabase
                .from('blocks')
                .delete()
                .eq('organization_id', organizationId)
                .eq('property_id', resolvedPropertyId)
                .eq('start_date', startDate)
                .eq('end_date', endDate)
                .eq('subtype', subtype);

              const deletedMisclassified = await cleanupMisclassifiedBlockReservations(supabase, organizationId, cancellationCandidates);

              if (delErr) {
                throw new Error(`Failed to delete block on cancellation: ${delErr.message}`);
              }

              updated++;
              await staysnetDB.markWebhookProcessedDB(
                hook.id,
                `Cancellation webhook (block): deleted block + cleaned ${deletedMisclassified} misclassified reservations`,
              );
              continue;
            }

            let resolvedGuestId: string | null = null;
            resolvedGuestId = await resolveOrCreateGuestIdFromStaysReservation(supabase, organizationId, staysReservation);

            const sqlData = mapStaysReservationToSql(staysReservation, organizationId, resolvedPropertyId, resolvedGuestId);
            (sqlData as any).status = 'cancelled';
            (sqlData as any).cancelled_at = (sqlData as any).cancelled_at || new Date().toISOString();

            if (!sqlData.property_id) {
              skipped++;
              await staysnetDB.markWebhookProcessedDB(
                hook.id,
                'Cancellation webhook: no match in DB and property not resolved (cannot persist cancelled reservation without property_id)',
              );
              continue;
            }

            const { error: upErr } = await supabase
              .from('reservations')
              .upsert(sqlData, { onConflict: 'organization_id,platform,external_id' });
            if (upErr) throw new Error(`Upsert failed (cancelled fallback): ${upErr.message}`);

            updated++;
            await staysnetDB.markWebhookProcessedDB(hook.id, 'Cancellation webhook: created/updated cancelled reservation');
            continue;
          }
        }

        skipped++;
        await staysnetDB.markWebhookProcessedDB(hook.id, 'Cancellation webhook: no matching reservation found');
        continue;
      }

      if (!reservationId) {
        throw new Error('Não foi possível extrair reservationId do webhook');
      }

      const detail = await client.request(`/booking/reservations/${reservationId}`, 'GET');
      if (!detail.success) {
        throw new Error(detail.error || 'Falha ao buscar detalhes da reserva');
      }

      const staysReservation = detail.data;

      const staysTypeLower = String((staysReservation as any)?.type || '').trim().toLowerCase();

      // Resolver property se possível
      const listingCandidate =
        extractListingCandidateFromStaysReservation(staysReservation) ||
        extractListingCandidateFromStaysReservation(hook.payload);

      // Dedupe: o mesmo booking pode aparecer com IDs diferentes ao longo do tempo
      // (ex.: confirmationCode vs _id). Para evitar duplicação e evitar violar o
      // unique (organization_id, platform, external_id), tentamos casar por múltiplos
      // campos, sempre filtrando pela organização.
      const preferredExternalId = (staysReservation?._id ?? reservationId) ? String(staysReservation?._id ?? reservationId) : null;
      const staysReservationCode = (staysReservation?.id ?? staysReservation?.reservationId ?? staysReservation?.confirmationCode)
        ? String(staysReservation?.id ?? staysReservation?.reservationId ?? staysReservation?.confirmationCode)
        : null;

      const dedupeCandidates = Array.from(
        new Set(
          [preferredExternalId, staysReservationCode, staysReservation?.confirmationCode, reservationId]
            .filter(Boolean)
            .map((x) => String(x))
        )
      );

      // ✅ Se for bloqueio/manutenção vindo da Stays, persistir em `blocks` (não em `reservations`).
      if (isStaysBlockLikeType(staysTypeLower)) {
        let resolvedPropertyId: string | null = null;
        if (listingCandidate) {
          resolvedPropertyId = await resolveAnuncioDraftIdFromStaysId(supabase, organizationId, String(listingCandidate));
        }

        const startDate = toYmd((staysReservation as any)?.checkInDate || (staysReservation as any)?.checkIn);
        const endDate = toYmd((staysReservation as any)?.checkOutDate || (staysReservation as any)?.checkOut);
        if (!resolvedPropertyId || !startDate || !endDate) {
          skipped++;
          await staysnetDB.markWebhookProcessedDB(hook.id, 'Webhook (block): property/date not resolved; skipping');
          continue;
        }

        const subtype = mapBlockSubtypeFromStaysType(staysTypeLower);
        const reason = buildBlockReasonFromStaysType(staysTypeLower);
        const upserted = await upsertBlockFromStaysReservation(
          supabase,
          organizationId,
          resolvedPropertyId,
          startDate,
          endDate,
          subtype,
          reason,
          {
            _id: (staysReservation as any)?._id ?? reservationId,
            type: staysTypeLower,
            reservationId,
            partner: (staysReservation as any)?.partner,
            partnerCode: (staysReservation as any)?.partnerCode,
            reservationUrl: (staysReservation as any)?.reservationUrl,
          },
        );

        const deletedMisclassified = await cleanupMisclassifiedBlockReservations(supabase, organizationId, dedupeCandidates);

        if (!upserted) {
          errors++;
          await staysnetDB.markWebhookErrorDB(hook.id, 'Webhook (block): failed to upsert block');
          continue;
        }

        updated++;
        await staysnetDB.markWebhookProcessedDB(
          hook.id,
          `Webhook (block): upserted block (created=${upserted.created}) + cleaned ${deletedMisclassified} misclassified reservations`,
        );
        continue;
      }

      let existing: any = null;

      // 1) external_id
      if (!existing && dedupeCandidates.length > 0) {
        const ex = await supabase
          .from('reservations')
          .select('id, platform, property_id, guest_id, created_by, external_id')
          .eq('organization_id', organizationId)
          .in('external_id', dedupeCandidates)
          .order('updated_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!ex.error && ex.data) existing = ex.data;
      }

      // 2) id
      if (!existing && dedupeCandidates.length > 0) {
        const ex = await supabase
          .from('reservations')
          .select('id, platform, property_id, guest_id, created_by, external_id')
          .eq('organization_id', organizationId)
          .in('id', dedupeCandidates)
          .order('updated_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!ex.error && ex.data) existing = ex.data;
      }

      // 3) staysnet_reservation_code
      if (!existing && dedupeCandidates.length > 0) {
        const ex = await supabase
          .from('reservations')
          .select('id, platform, property_id, guest_id, created_by, external_id')
          .eq('organization_id', organizationId)
          .in('staysnet_reservation_code', dedupeCandidates)
          .order('updated_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!ex.error && ex.data) existing = ex.data;
      }

      // Se não vier externalId no payload, não apagamos o que já existe.
      if (!staysReservation?._id && existing?.external_id) {
        (staysReservation as any)._id = existing.external_id;
      }

      let resolvedPropertyId: string | null = null;
      if (listingCandidate) {
        resolvedPropertyId = await resolveAnuncioDraftIdFromStaysId(supabase, organizationId, String(listingCandidate));
      }

      // ✅ Resolver/criar guest automaticamente (se ainda não vinculado)
      let resolvedGuestId: string | null = existing?.guest_id || null;
      if (!resolvedGuestId) {
        resolvedGuestId = await resolveOrCreateGuestIdFromStaysReservation(supabase, organizationId, staysReservation);
      }

      const sqlData = mapStaysReservationToSql(staysReservation, organizationId, resolvedPropertyId, resolvedGuestId, existing);

      // 🔒 Regra canônica: reservas sem imóvel não existem.
      // Se não conseguimos resolver o imóvel e não há vínculo anterior, não persistimos.
      // Evita gerar cards “Propriedade não encontrada”.
      if (!sqlData.property_id) {
        if (existing?.id) {
          await supabase
            .from('reservations')
            .delete()
            .eq('organization_id', organizationId)
            .eq('id', existing.id);
        }

        skipped++;
        await staysnetDB.markWebhookProcessedDB(hook.id, 'Skipped: property not resolved (reservation without property is forbidden)');
        continue;
      }

      const { error: upErr } = await supabase
        .from('reservations')
        .upsert(sqlData, { onConflict: 'organization_id,platform,external_id' });

      if (upErr) throw new Error(`Upsert failed: ${upErr.message}`);

      updated++;
      await staysnetDB.markWebhookProcessedDB(hook.id);
    } catch (err: any) {
      errors++;
      await staysnetDB.markWebhookProcessedDB(hook.id, err?.message || 'Unknown error');
    }
  }

  return { processed, updated, skipped, errors };
}

export async function reconcileStaysNetReservations(c: Context) {
  try {
    const organizationId = c.req.param('organizationId');
    const body = await c.req.json().catch(() => ({}));

    const dryRun = Boolean((body as any)?.dryRun ?? true);
    const groupLimit = Math.max(1, Math.min(200, Number((body as any)?.limit) || 25));
    const scanLimit = Math.max(100, Math.min(20000, Number((body as any)?.scanLimit) || 5000));

    const supabase = getSupabaseClient();

    const { data: rows, error } = await supabase
      .from('reservations')
      .select(
        'id, organization_id, platform, external_id, staysnet_reservation_code, status, cancelled_at, cancellation_reason, property_id, guest_id, updated_at, created_at',
      )
      .eq('organization_id', organizationId)
      .not('external_id', 'is', null)
      .order('external_id', { ascending: true })
      .order('updated_at', { ascending: false })
      .limit(scanLimit);

    if (error) {
      return c.json(errorResponse(`Failed to scan reservations: ${error.message}`), 500);
    }

    const byKey = new Map<string, any[]>();
    for (const r of rows || []) {
      const platform = String((r as any).platform || 'other');
      const externalId = String((r as any).external_id || '');
      if (!externalId) continue;
      const key = `${platform}||${externalId}`;
      const arr = byKey.get(key) || [];
      arr.push(r);
      byKey.set(key, arr);
    }

    const duplicateGroups = Array.from(byKey.entries()).filter(([, arr]) => arr.length > 1);

    const planned = duplicateGroups.slice(0, groupLimit).map(([key, group]) => {
      // Prefer manter o registro cujo id == external_id (id canônico estável), senão o mais recente.
      const sorted = [...group].sort((a, b) => {
        const au = new Date((a as any).updated_at || (a as any).created_at || 0).getTime();
        const bu = new Date((b as any).updated_at || (b as any).created_at || 0).getTime();
        return bu - au;
      });

      const externalId = String((sorted[0] as any).external_id);
      const canonical = group.find((x) => String((x as any).id) === externalId) || sorted[0];
      const losers = group.filter((x) => String((x as any).id) !== String((canonical as any).id));

      const latest = sorted[0];
      const merged = {
        status: (latest as any).status,
        cancelled_at: (latest as any).cancelled_at,
        cancellation_reason: (latest as any).cancellation_reason,
        property_id: (canonical as any).property_id || (latest as any).property_id,
        guest_id: (canonical as any).guest_id || (latest as any).guest_id,
        staysnet_reservation_code:
          (canonical as any).staysnet_reservation_code ||
          (latest as any).staysnet_reservation_code ||
          losers.map((x) => (x as any).staysnet_reservation_code).find(Boolean) ||
          null,
      };

      return {
        key,
        external_id: externalId,
        platform: String((canonical as any).platform),
        keep_id: String((canonical as any).id),
        merge_from_ids: losers.map((x) => String((x as any).id)),
        merged,
      };
    });

    const stats = {
      scanned: (rows || []).length,
      duplicateGroups: duplicateGroups.length,
      plannedGroups: planned.length,
      dryRun,
      repointed: 0,
      deleted: 0,
      updated: 0,
      errors: 0,
    };

    if (dryRun) {
      return c.json(successResponse({ stats, planned }));
    }

    for (const plan of planned) {
      try {
        // 1) Atualiza o registro canônico com o estado mais recente
        const { error: updErr } = await supabase
          .from('reservations')
          .update(plan.merged)
          .eq('organization_id', organizationId)
          .eq('id', plan.keep_id);
        if (updErr) throw updErr;
        stats.updated++;

        // 2) Repontar dependências conhecidas
        for (const loserId of plan.merge_from_ids) {
          const updChat = await supabase
            .from('chat_conversations')
            .update({ reservation_id: plan.keep_id })
            // Algumas bases têm reservation_id como UUID; se der erro, registramos e seguimos.
            .eq('reservation_id', loserId);
          if (!updChat.error && (updChat as any).data) stats.repointed++;

          const updFin = await supabase
            .from('financeiro_titulos')
            .update({ reservation_id: plan.keep_id })
            .eq('reservation_id', loserId);
          if (!updFin.error && (updFin as any).data) stats.repointed++;

          // 3) Apaga a duplicata
          const { error: delErr } = await supabase
            .from('reservations')
            .delete()
            .eq('organization_id', organizationId)
            .eq('id', loserId);
          if (delErr) throw delErr;
          stats.deleted++;
        }
      } catch (e: any) {
        stats.errors++;
      }
    }

    return c.json(successResponse({ stats, planned }));
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

    // Buscar apenas em anuncios_ultimate (tabela oficial), considerando todos os formatos de external_id
    // ✅ CORREÇÃO: Buscar apenas 'data' pois 'external_ids' não existe mais (migrado para data->externalIds)
    const { data: ultimateData, error: ultimateError } = await supabase
      .from('anuncios_ultimate')
      .select('id, data')
      .eq('organization_id', organizationId);

    if (ultimateError) {
      console.warn('[StaysNet Import Preview] ⚠️ Falha ao consultar anuncios_ultimate:', ultimateError.message);
    }

    let allExisting = [...(ultimateData || [])];

    // Fallback: se não encontrou nada para a organização atual, faz varredura global (apenas IDs) para detectar duplicados históricos
    if (allExisting.length === 0) {
      const { data: ultimateAny, error: ultimateAnyError } = await supabase
        .from('anuncios_ultimate')
        .select('id, data');

      if (ultimateAnyError) {
        console.warn('[StaysNet Import Preview] ⚠️ Falha fallback anuncios_ultimate (global):', ultimateAnyError.message);
      }

      allExisting = [...(ultimateAny || [])];
    }

    const existingSet = new Set<string>();

    const addIfString = (value: any) => {
      if (value !== undefined && value !== null) {
        existingSet.add(String(value));
      }
    };

    console.log(`[StaysNet Import Preview] 🔍 Analisando ${allExisting.length} registros em anuncios_ultimate...`);

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
