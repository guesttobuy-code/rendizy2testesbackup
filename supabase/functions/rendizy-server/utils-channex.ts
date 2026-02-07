/**
 * Channex API Client Utilities
 * 
 * Channex.io is a Channel Manager that connects properties to multiple OTAs.
 * 
 * Base URLs:
 * - Production: https://app.channex.io/api/v1
 * - Staging: https://staging.channex.io/api/v1
 * 
 * Authentication: x-api-key header
 * 
 * Rate Limits:
 * - 20 req/min for ARI
 * - 10 req/min for restrictions/prices (per property)
 * - 10 req/min for availability (per property)
 */

import { CHANNEX_API_TOKEN, CHANNEX_BASE_URL, CHANNEX_ENVIRONMENT } from './utils-env.ts';

// ============================================================================
// TYPES
// ============================================================================

export interface ChannexCredentials {
  apiToken: string;
  environment: 'staging' | 'production';
  baseUrl: string;
}

export interface ChannexPropertyData {
  title: string;
  currency: string;
  timezone: string;
  address?: string;
  zip?: string;
  city?: string;
  country?: string; // ISO 2-letter code
  email?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
}

export interface ChannexRoomType {
  title: string;
  property_id: string;
  count_of_rooms: number;
  occ_base: number;
  occ_max: number;
  default_occupancy?: number;
}

export interface ChannexRatePlanOption {
  occupancy: number;
  is_primary: boolean;
  rate: number; // Integer! Not float
}

export interface ChannexRatePlan {
  title: string;
  room_type_id: string;
  currency: string;
  sell_mode: 'per_room' | 'per_person';
  rate_mode: 'manual' | 'derived';
  options?: ChannexRatePlanOption[] | {
    cancellation?: {
      type: 'free' | 'non_refundable' | 'flexible';
      days?: number;
      penalty?: number;
    };
    meal?: 'room_only' | 'breakfast' | 'half_board' | 'full_board';
  };
}

export interface ChannexARIUpdate {
  property_id?: string;
  room_type_id: string;
  rate_plan_id?: string;
  date_from: string; // YYYY-MM-DD
  date_to: string;   // YYYY-MM-DD
  availability?: number;
  rate?: number;
  min_stay_arrival?: number;
  max_stay?: number;
  stop_sell?: boolean;
  closed_to_arrival?: boolean;
  closed_to_departure?: boolean;
}

export interface ChannexApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

// ============================================================================
// CHANNEX CLIENT
// ============================================================================

export class ChannexClient {
  private apiToken: string;
  private baseUrl: string;
  private environment: 'staging' | 'production';

  constructor(credentials?: Partial<ChannexCredentials>) {
    this.apiToken = credentials?.apiToken || CHANNEX_API_TOKEN;
    this.baseUrl = credentials?.baseUrl || CHANNEX_BASE_URL;
    this.environment = (credentials?.environment || CHANNEX_ENVIRONMENT) as 'staging' | 'production';

    if (!this.apiToken) {
      console.warn('[ChannexClient] No API token configured');
    }
  }

  /**
   * Get headers for Channex API requests
   * Docs: https://docs.channex.io/api-v.1-documentation/api-reference#api-key-access
   * Header: user-api-key (NOT x-api-key)
   */
  private getHeaders(): Record<string, string> {
    return {
      'user-api-key': this.apiToken,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  /**
   * Make a request to the Channex API
   */
  async request<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<ChannexApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log(`[ChannexClient] ${method} ${url}`);

    try {
      const response = await fetch(url, {
        method,
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });

      const responseText = await response.text();
      let data: any;

      try {
        data = JSON.parse(responseText);
      } catch {
        data = responseText;
      }

      if (!response.ok) {
        console.error('[ChannexClient] Error response:', response.status, data);
        return {
          success: false,
          error: typeof data === 'object' ? (data.message || data.error || JSON.stringify(data)) : String(data),
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('[ChannexClient] Request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ============================================================================
  // CONNECTION TEST
  // ============================================================================

  /**
   * Test the connection to Channex API
   * Uses /properties endpoint as a health check
   */
  async testConnection(): Promise<ChannexApiResponse<{ connected: boolean; environment: string; propertiesCount?: number }>> {
    if (!this.apiToken) {
      return {
        success: false,
        error: 'No API token configured',
      };
    }

    const result = await this.request('/properties?pagination[page]=1&pagination[limit]=1');

    if (result.success) {
      return {
        success: true,
        data: {
          connected: true,
          environment: this.environment,
          propertiesCount: result.data?.meta?.total || result.data?.data?.length || 0,
        },
      };
    }

    return {
      success: false,
      error: result.error || 'Failed to connect to Channex',
    };
  }

  // ============================================================================
  // PROPERTIES
  // ============================================================================

  /**
   * List all properties from Channex
   */
  async listProperties(page = 1, limit = 25): Promise<ChannexApiResponse> {
    return this.request(`/properties?pagination[page]=${page}&pagination[limit]=${limit}`);
  }

  /**
   * Get a specific property
   */
  async getProperty(propertyId: string): Promise<ChannexApiResponse> {
    return this.request(`/properties/${propertyId}`);
  }

  /**
   * Create a property in Channex
   */
  async createProperty(data: ChannexPropertyData): Promise<ChannexApiResponse> {
    return this.request('/properties', 'POST', { property: data });
  }

  /**
   * Update a property in Channex
   */
  async updateProperty(propertyId: string, data: Partial<ChannexPropertyData>): Promise<ChannexApiResponse> {
    return this.request(`/properties/${propertyId}`, 'PUT', { property: data });
  }

  // ============================================================================
  // ROOM TYPES
  // ============================================================================

  /**
   * List room types for a property
   */
  async listRoomTypes(propertyId?: string): Promise<ChannexApiResponse> {
    const filter = propertyId ? `?filter[property_id]=${propertyId}` : '';
    return this.request(`/room_types${filter}`);
  }

  /**
   * Get a specific room type
   */
  async getRoomType(roomTypeId: string): Promise<ChannexApiResponse> {
    return this.request(`/room_types/${roomTypeId}`);
  }

  /**
   * Create a room type
   */
  async createRoomType(data: ChannexRoomType): Promise<ChannexApiResponse> {
    return this.request('/room_types', 'POST', { room_type: data });
  }

  /**
   * Update a room type
   */
  async updateRoomType(roomTypeId: string, data: Partial<ChannexRoomType>): Promise<ChannexApiResponse> {
    return this.request(`/room_types/${roomTypeId}`, 'PUT', { room_type: data });
  }

  // ============================================================================
  // RATE PLANS
  // ============================================================================

  /**
   * List rate plans
   */
  async listRatePlans(roomTypeId?: string): Promise<ChannexApiResponse> {
    const filter = roomTypeId ? `?filter[room_type_id]=${roomTypeId}` : '';
    return this.request(`/rate_plans${filter}`);
  }

  /**
   * Get a specific rate plan
   */
  async getRatePlan(ratePlanId: string): Promise<ChannexApiResponse> {
    return this.request(`/rate_plans/${ratePlanId}`);
  }

  /**
   * Create a rate plan
   */
  async createRatePlan(data: ChannexRatePlan): Promise<ChannexApiResponse> {
    return this.request('/rate_plans', 'POST', { rate_plan: data });
  }

  /**
   * Update a rate plan
   */
  async updateRatePlan(ratePlanId: string, data: Partial<ChannexRatePlan>): Promise<ChannexApiResponse> {
    return this.request(`/rate_plans/${ratePlanId}`, 'PUT', { rate_plan: data });
  }

  // ============================================================================
  // ARI (Availability, Rates, Inventory)
  // ============================================================================

  /**
   * Update ARI (Availability, Rates, Inventory)
   * Rate limit: 20 req/min total
   */
  async updateARI(updates: ChannexARIUpdate[]): Promise<ChannexApiResponse> {
    return this.request('/ari/updates', 'POST', { values: updates });
  }

  /**
   * Get current ARI for a room type
   */
  async getARI(roomTypeId: string, dateFrom: string, dateTo: string): Promise<ChannexApiResponse> {
    return this.request(`/ari?filter[room_type_id]=${roomTypeId}&filter[date][gte]=${dateFrom}&filter[date][lte]=${dateTo}`);
  }

  // ============================================================================
  // BOOKINGS
  // ============================================================================

  /**
   * Get booking feed (revisions)
   */
  async getBookingFeed(page = 1, limit = 25): Promise<ChannexApiResponse> {
    return this.request(`/booking_revisions/feed?pagination[page]=${page}&pagination[limit]=${limit}`);
  }

  /**
   * Get a specific booking
   */
  async getBooking(bookingId: string): Promise<ChannexApiResponse> {
    return this.request(`/bookings/${bookingId}`);
  }

  /**
   * Acknowledge a booking revision
   */
  async acknowledgeBooking(revisionId: string): Promise<ChannexApiResponse> {
    return this.request(`/booking_revisions/${revisionId}/ack`, 'POST');
  }

  // ============================================================================
  // CHANNELS (OTAs)
  // ============================================================================

  /**
   * List available channels (OTAs)
   */
  async listChannels(): Promise<ChannexApiResponse> {
    return this.request('/channels');
  }

  /**
   * List connected channels for a property
   */
  async listPropertyChannels(propertyId: string): Promise<ChannexApiResponse> {
    return this.request(`/channels?filter[property_id]=${propertyId}`);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  getCredentials(): ChannexCredentials {
    return {
      apiToken: this.apiToken,
      environment: this.environment,
      baseUrl: this.baseUrl,
    };
  }

  isConfigured(): boolean {
    return !!this.apiToken;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let defaultClient: ChannexClient | null = null;

export function getChannexClient(credentials?: Partial<ChannexCredentials>): ChannexClient {
  if (credentials) {
    return new ChannexClient(credentials);
  }

  if (!defaultClient) {
    defaultClient = new ChannexClient();
  }

  return defaultClient;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format date to YYYY-MM-DD for Channex API
 */
export function formatDateForChannex(date: Date | string): string {
  if (typeof date === 'string') {
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    date = new Date(date);
  }
  return date.toISOString().split('T')[0];
}

/**
 * Convert Rendizy currency to Channex format
 */
export function mapCurrencyToChannex(currency: string): string {
  const currencyMap: Record<string, string> = {
    'BRL': 'BRL',
    'USD': 'USD',
    'EUR': 'EUR',
    'GBP': 'GBP',
  };
  return currencyMap[currency?.toUpperCase()] || 'BRL';
}

/**
 * Convert Rendizy country to ISO 2-letter code
 */
export function mapCountryToISO(country: string): string {
  const countryMap: Record<string, string> = {
    'brasil': 'BR',
    'brazil': 'BR',
    'br': 'BR',
    'united states': 'US',
    'usa': 'US',
    'us': 'US',
    'portugal': 'PT',
    'pt': 'PT',
  };
  return countryMap[country?.toLowerCase()] || country?.substring(0, 2).toUpperCase() || 'BR';
}
