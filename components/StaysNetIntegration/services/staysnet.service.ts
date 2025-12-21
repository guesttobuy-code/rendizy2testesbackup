/**
 * StaysNet Integration - Service Layer
 * Centralized API communication with error handling and retry logic
 */

import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { staysnetLogger } from '../utils/logger';
import type {
  StaysNetConfig,
  StaysNetProperty,
  ImportOptions,
  ImportResult,
  TestConnectionResult,
  FetchPropertiesResult,
  ImportType,
} from '../types';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1`;

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  retries?: number;
}

/**
 * StaysNet Service Class
 * Handles all API communication with proper error handling
 */
export class StaysNetService {
  /**
   * Generic request method with error handling and retry logic
   */
  private static async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { skipAuth, retries = 0, ...fetchOptions } = options;
    const token = !skipAuth ? localStorage.getItem('rendizy-token') : null;

    if (!skipAuth && !token) {
      throw new Error('Token de autenticação não encontrado. Faça login novamente.');
    }

    const url = `${BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    if (token && !skipAuth) {
      headers['X-Auth-Token'] = token;
    }

    // Edge Function exige Bearer + apikey mesmo sendo rota privada; não remover.
    if (publicAnonKey) {
      headers['Authorization'] = `Bearer ${publicAnonKey}`;
      headers['apikey'] = publicAnonKey;
    }

    staysnetLogger.api.info(`Request: ${fetchOptions.method || 'GET'} ${endpoint}`);

    let lastError: Error | null = null;

    // Retry logic
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...fetchOptions,
          headers,
        });

        staysnetLogger.api.info(`Response: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage: string;

          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorData.message || response.statusText;
          } catch {
            errorMessage = errorText || response.statusText;
          }

          throw new Error(
            `HTTP ${response.status}: ${errorMessage}`
          );
        }

        const data = await response.json();
        return data;
      } catch (error) {
        lastError = error as Error;

        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          staysnetLogger.api.info(`Retry ${attempt + 1}/${retries} after ${delay}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    staysnetLogger.api.error('Request failed', lastError);
    throw lastError;
  }

  /**
   * Save StaysNet configuration
   */
  static async saveConfig(config: StaysNetConfig): Promise<{ success: boolean }> {
    staysnetLogger.config.info('Salvando configuração...', { baseUrl: config.baseUrl });

    try {
      const response = await this.request<{ success: boolean }>('/rendizy-server/make-server-67caf26a/settings/staysnet', {
        method: 'POST',
        body: JSON.stringify(config),
      });

      if (response.success) {
        staysnetLogger.config.success('Configuração salva com sucesso');
      }

      return response;
    } catch (error) {
      staysnetLogger.config.error('Erro ao salvar configuração', error);
      throw error;
    }
  }

  /**
   * Test StaysNet connection
   */
  static async testConnection(config: StaysNetConfig): Promise<TestConnectionResult> {
    staysnetLogger.connection.info('Testando conexão...', { baseUrl: config.baseUrl });

    try {
      const response = await this.request<TestConnectionResult>('/rendizy-server/make-server-67caf26a/staysnet/test', {
        method: 'POST',
        body: JSON.stringify({
          apiKey: config.apiKey,
          apiSecret: config.apiSecret,
          baseUrl: config.baseUrl,
        }),
        retries: 2,
      });

      if (response.success) {
        staysnetLogger.connection.success('Conexão estabelecida com sucesso');
      } else {
        staysnetLogger.connection.error('Falha na conexão', response.message);
      }

      return response;
    } catch (error) {
      staysnetLogger.connection.error('Erro ao testar conexão', error);
      throw error;
    }
  }

  /**
   * Fetch available properties from StaysNet
   */
  static async fetchProperties(
    config: StaysNetConfig,
    options: { skip?: number; limit?: number } = {}
  ): Promise<FetchPropertiesResult> {
    const { skip = 0, limit = 100 } = options;

    staysnetLogger.properties.info(`Buscando propriedades (skip: ${skip}, limit: ${limit})`);

    try {
      const response = await this.request<{ success: boolean; data: any }>('/rendizy-server/make-server-67caf26a/staysnet/test-endpoint', {
        method: 'POST',
        body: JSON.stringify({
          apiKey: config.apiKey,
          apiSecret: config.apiSecret,
          baseUrl: config.baseUrl,
          endpoint: '/content/listings',
          params: { skip, limit },
        }),
      });

      if (!response.success) {
        throw new Error('Falha ao buscar propriedades');
      }

      // A API Stays.net retorna um array direto em response.data
      const properties: StaysNetProperty[] = Array.isArray(response.data) 
        ? response.data 
        : [];
      const total = properties.length;

      staysnetLogger.properties.success(`${properties.length} propriedades carregadas`);

      return {
        success: true,
        properties,
        total,
      };
    } catch (error) {
      staysnetLogger.properties.error('Erro ao buscar propriedades', error);
      return {
        success: false,
        properties: [],
        total: 0,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Fetch ALL properties with pagination
   */
  static async fetchAllProperties(config: StaysNetConfig): Promise<StaysNetProperty[]> {
    staysnetLogger.properties.info('Buscando TODAS as propriedades (paginação inteligente)');

    const allProperties: StaysNetProperty[] = [];
    let skip = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const result = await this.fetchProperties(config, { skip, limit });

      if (!result.success || result.properties.length === 0) {
        hasMore = false;
        break;
      }

      // Filter only active and hidden properties
      const validProperties = result.properties.filter(
        (p) => p.status === 'active' || p.status === 'hidden'
      );

      allProperties.push(...validProperties);
      skip += limit;

      // Stop if we fetched less than limit (last page)
      if (result.properties.length < limit) {
        hasMore = false;
      }

      staysnetLogger.properties.info(`Progresso: ${allProperties.length} propriedades`);
    }

    staysnetLogger.properties.success(`Total: ${allProperties.length} propriedades carregadas`);

    return allProperties;
  }

  /**
   * Import properties
   */
  static async importProperties(
    config: StaysNetConfig,
    options: ImportOptions
  ): Promise<ImportResult> {
    staysnetLogger.import.info('Iniciando importação de propriedades', {
      count: options.selectedPropertyIds.length,
    });

    try {
      const response = await this.request<{ success: boolean; data: any }>('/rendizy-server/make-server-67caf26a/staysnet/import/full', {
        method: 'POST',
        body: JSON.stringify({
          selectedPropertyIds: options.selectedPropertyIds,
          startDate: options.startDate,
          endDate: options.endDate,
        }),
      });

      if (!response.success) {
        throw new Error(response.data?.error || 'Erro ao importar propriedades');
      }

      const stats = response.data.stats || {};
      staysnetLogger.import.success('Propriedades importadas com sucesso', stats);

      return {
        success: true,
        stats,
      };
    } catch (error) {
      staysnetLogger.import.error('Erro ao importar propriedades', error);
      throw error;
    }
  }

  /**
   * Import reservations
   */
  static async importReservations(
    config: StaysNetConfig,
    options: ImportOptions
  ): Promise<ImportResult> {
    staysnetLogger.import.info('Iniciando importação de reservas', options);

    try {
      const response = await this.request<{ success: boolean; data: any }>('/rendizy-server/make-server-67caf26a/staysnet/import/reservations', {
        method: 'POST',
        body: JSON.stringify({
          apiKey: config.apiKey,
          apiSecret: config.apiSecret,
          baseUrl: config.baseUrl,
          startDate: options.startDate,
          endDate: options.endDate,
        }),
      });

      if (!response.success) {
        throw new Error(response.data?.error || 'Erro ao importar reservas');
      }

      const stats = response.data.stats || {};
      staysnetLogger.import.success('Reservas importadas com sucesso', stats);

      return {
        success: true,
        stats,
      };
    } catch (error) {
      staysnetLogger.import.error('Erro ao importar reservas', error);
      throw error;
    }
  }

  /**
   * Import guests
   */
  static async importGuests(
    config: StaysNetConfig
  ): Promise<ImportResult> {
    staysnetLogger.import.info('Iniciando importação de hóspedes');

    try {
      const response = await this.request<{ success: boolean; data: any }>('/rendizy-server/make-server-67caf26a/staysnet/import/guests', {
        method: 'POST',
        body: JSON.stringify({
          apiKey: config.apiKey,
          apiSecret: config.apiSecret,
          baseUrl: config.baseUrl,
        }),
      });

      if (!response.success) {
        throw new Error(response.data?.error || 'Erro ao importar hóspedes');
      }

      const stats = response.data.stats || {};
      staysnetLogger.import.success('Hóspedes importados com sucesso', stats);

      return {
        success: true,
        stats,
      };
    } catch (error) {
      staysnetLogger.import.error('Erro ao importar hóspedes', error);
      throw error;
    }
  }

  /**
   * Import all data (full sync)
   */
  static async importAll(
    config: StaysNetConfig,
    options: ImportOptions
  ): Promise<ImportResult> {
    staysnetLogger.import.info('Iniciando importação completa', options);

    try {
      const response = await this.request<{ success: boolean; data: any }>('/rendizy-server/make-server-67caf26a/staysnet/import/full', {
        method: 'POST',
        body: JSON.stringify({
          apiKey: config.apiKey,
          apiSecret: config.apiSecret,
          baseUrl: config.baseUrl,
          selectedPropertyIds: options.selectedPropertyIds,
          startDate: options.startDate,
          endDate: options.endDate,
        }),
      });

      if (!response.success) {
        throw new Error(response.data?.error || 'Erro na importação completa');
      }

      const stats = response.data.stats || {};
      staysnetLogger.import.success('Importação completa finalizada', stats);

      return {
        success: true,
        stats,
      };
    } catch (error) {
      staysnetLogger.import.error('Erro na importação completa', error);
      throw error;
    }
  }

  /**
   * Generic endpoint test (for API explorer)
   */
  static async testEndpoint(
    config: StaysNetConfig,
    endpoint: string,
    params: any = {}
  ): Promise<any> {
    staysnetLogger.api.info(`Testando endpoint: ${endpoint}`, params);

    try {
      const response = await this.request('/rendizy-server/make-server-67caf26a/staysnet/test-endpoint', {
        method: 'POST',
        body: JSON.stringify({
          apiKey: config.apiKey,
          apiSecret: config.apiSecret,
          baseUrl: config.baseUrl,
          endpoint,
          params,
        }),
      });

      return response;
    } catch (error) {
      staysnetLogger.api.error(`Erro ao testar ${endpoint}`, error);
      throw error;
    }
  }
}
