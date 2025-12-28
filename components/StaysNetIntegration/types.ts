/**
 * StaysNet Integration - TypeScript Definitions
 * Centralized type definitions for type safety and consistency
 */

export interface StaysNetConfig {
  apiKey: string;
  apiSecret?: string;
  baseUrl: string;
  accountName?: string;
  notificationWebhookUrl?: string;
  scope?: 'global' | 'individual';
  enabled: boolean;
  lastSync?: string;
}

export interface ApiEndpoint {
  id: string;
  name: string;
  method: 'GET' | 'POST';
  endpoint: string;
  description: string;
  category: 'properties' | 'reservations' | 'rates' | 'availability' | 'guests';
}

export interface ApiResponse {
  endpoint: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

/**
 * StaysNet Property Type
 * IMPORTANTE: A API Stays.net retorna '_id' (não 'id')
 */
export interface StaysNetProperty {
  _id: string;              // ⚡ Campo principal da API Stays.net
  id?: string;              // Alias para compatibilidade
  // Alguns payloads usam um "código curto" (ex: C003). Guardamos para compat.
  staysListingCode?: string;
  name: string;
  code?: string;
  status?: 'active' | 'hidden' | 'inactive';
  [key: string]: any;
}

export interface ImportStats {
  properties?: {
    fetched: number;
    created: number;
    updated: number;
    failed: number;
  };
  reservations?: {
    fetched: number;
    created: number;
    updated: number;
    failed: number;
  };
  guests?: {
    fetched: number;
    created: number;
    updated: number;
    failed: number;
  };
}

export interface ImportOptions {
  selectedPropertyIds: string[];
  startDate?: string;
  endDate?: string;
  dateType?: 'creation' | 'checkin' | 'checkout' | 'included';
}

export type ImportType = 'all' | 'properties' | 'reservations' | 'guests' | 'test';

export interface ImportState {
  isImporting: boolean;
  importType: ImportType | null;
  stats: ImportStats | null;
  error: string | null;
}

export type ImportLogLevel = 'info' | 'success' | 'error';

export type ImportLogScope = 'properties' | 'reservations' | 'guests' | 'all' | 'system' | 'test';

export interface ImportLogEntry {
  id: string;
  timestamp: string; // ISO
  level: ImportLogLevel;
  scope: ImportLogScope;
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationResult {
  isValid: boolean;
  status: 'idle' | 'correct' | 'fixable' | 'invalid';
  message: string;
  errors: string[];
}

export interface ConnectionStatus {
  status: 'idle' | 'success' | 'error';
  message?: string;
  timestamp?: string;
}

export interface FetchPropertiesResult {
  success: boolean;
  properties: StaysNetProperty[];
  total: number;
  error?: string;
}

export interface ImportResult {
  success: boolean;
  stats: ImportStats;
  error?: string;
}

export interface ImportPreview {
  totalRemote: number;
  existingCount: number;
  newCount: number;
  existingIds: string[];
  newIds: string[];
  timestamp?: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  data?: any;
}

export const CATEGORY_INFO = {
  properties: { label: 'Propriedades', color: 'blue' as const },
  reservations: { label: 'Reservas', color: 'green' as const },
  rates: { label: 'Tarifas', color: 'purple' as const },
  availability: { label: 'Disponibilidade', color: 'orange' as const },
  guests: { label: 'Hóspedes', color: 'pink' as const },
} as const;
