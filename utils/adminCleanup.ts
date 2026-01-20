// ============================================================================
// ADMIN CLEANUP UTILITIES
// ============================================================================
// Utilitários para limpeza administrativa do banco de dados
// v1.0.103.272 - DELETE ALL PROPERTIES
// ============================================================================

import { publicAnonKey } from './supabase/info';
import { API_BASE_URL } from './apiBase';

const BASE_URL = API_BASE_URL;

// ============================================================================
// TYPES
// ============================================================================

export interface CleanupStatus {
  properties: number;
  locations: number;
  photos: number;
  rooms: number;
  listings: number;
  reservations: number;
  blocks: number;
  shortIds: number;
  totalToDelete: number;
}

export interface CleanupResult {
  properties: number;
  locations: number;
  photos: number;
  rooms: number;
  listings: number;
  reservations: number;
  blocks: number;
  totalDeleted: number;
  durationSeconds: string;
}

export interface SpecificDeleteResult {
  totalRequested: number;
  deleted: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

// ============================================================================
// API CALLS
// ============================================================================

/**
 * Deleta TODAS as propriedades e dados relacionados do sistema
 * ⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL!
 */
export async function deleteAllProperties(): Promise<{ success: boolean; data: CleanupResult }> {
  try {
    console.log('🗑️ [ADMIN CLEANUP] Deletando TODAS as propriedades...');
    
    const response = await fetch(
      `${BASE_URL}/admin/cleanup/properties`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Erro ao deletar propriedades');
    }
    
    if (result.success) {
      console.log('✅ Todas as propriedades deletadas:', result.data);
      return result;
    } else {
      console.error('❌ Erro ao deletar:', result.message);
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
    throw error;
  }
}

/**
 * Verifica quantos registros serão deletados (sem deletar)
 */
export async function getCleanupStatus(): Promise<CleanupStatus> {
  try {
    console.log('📊 [ADMIN CLEANUP] Verificando status...');
    
    const response = await fetch(
      `${BASE_URL}/admin/cleanup/properties/status`,
      {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      }
    );

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Erro ao verificar status');
    }
    
    if (result.success) {
      console.log('📊 Status:', result.data);
      return result.data;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('❌ Erro ao verificar status:', error);
    throw error;
  }
}

/**
 * Deleta apenas IDs específicos
 * @param ids - Array de IDs para deletar (loc_, prop_, acc_, etc.)
 */
export async function deleteSpecificIds(ids: string[]): Promise<{ success: boolean; data: SpecificDeleteResult }> {
  try {
    console.log(`🗑️ [ADMIN CLEANUP] Deletando ${ids.length} IDs específicos...`);
    
    const response = await fetch(
      `${BASE_URL}/admin/cleanup/properties/specific`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
      }
    );

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Erro ao deletar IDs específicos');
    }
    
    if (result.success) {
      console.log('✅ IDs deletados:', result.data);
      return result;
    } else {
      console.error('❌ Erro ao deletar IDs:', result.message);
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Formata o status para exibição
 */
export function formatCleanupStatus(status: CleanupStatus): string {
  return [
    '📊 Status do Banco de Dados:\n',
    `• Properties: ${status.properties}`,
    `• Locations: ${status.locations}`,
    `• Photos: ${status.photos}`,
    `• Rooms: ${status.rooms}`,
    `• Listings: ${status.listings}`,
    `• Reservations: ${status.reservations}`,
    `• Blocks: ${status.blocks}`,
    `• Short IDs: ${status.shortIds}`,
    `\nTOTAL: ${status.totalToDelete} registros`,
  ].join('\n');
}

/**
 * Formata o resultado da limpeza para exibição
 */
export function formatCleanupResult(result: CleanupResult): string {
  return [
    '✅ Limpeza Completa!\n',
    `• ${result.properties} properties deletadas`,
    `• ${result.locations} locations deletadas`,
    `• ${result.photos} photos deletadas`,
    `• ${result.rooms} rooms deletados`,
    `• ${result.listings} listings deletados`,
    `• ${result.reservations} reservations deletadas`,
    `• ${result.blocks} blocks deletados`,
    `\nTOTAL: ${result.totalDeleted} registros deletados`,
    `Tempo: ${result.durationSeconds}s`,
  ].join('\n');
}

/**
 * Confirmação de limpeza completa
 */
export function confirmDeleteAll(): boolean {
  return window.confirm(
    '⚠️ ATENÇÃO: AÇÃO IRREVERSÍVEL!\n\n' +
    'Isso vai deletar TODAS as propriedades, locations, reservas e dados relacionados.\n\n' +
    'Esta ação NÃO PODE SER DESFEITA!\n\n' +
    'Tem certeza absoluta que deseja continuar?'
  );
}

/**
 * Confirmação de limpeza específica
 */
export function confirmDeleteSpecific(count: number): boolean {
  return window.confirm(
    `⚠️ ATENÇÃO: AÇÃO IRREVERSÍVEL!\n\n` +
    `Isso vai deletar ${count} registro(s) específico(s).\n\n` +
    `Esta ação NÃO PODE SER DESFEITA!\n\n` +
    `Tem certeza que deseja continuar?`
  );
}
