/**
 * Block Mapper - Converte entre formato TypeScript e SQL
 * 
 * ✅ MIGRAÇÃO v1.0.103.400 - SQL + RLS + Multi-tenant
 * Mapeia Block (TypeScript) ↔ blocks (SQL Table)
 * 
 * @version 1.0.103.400
 * @updated 2025-11-17 - Migração de KV Store para SQL Tables
 */

import type { Block } from './types.ts';

/**
 * Converte Block (TypeScript) para formato SQL (tabela blocks)
 */
export function blockToSql(block: Block, organizationId: string): any {
  return {
    id: block.id,
    organization_id: organizationId, // ✅ Multi-tenant: sempre usar organization_id do tenant
    property_id: block.propertyId,
    
    // Datas
    start_date: block.startDate,
    end_date: block.endDate,
    nights: Math.round(Number(block.nights || 0)), // ✅ Garantir INTEGER (não decimal)
    
    // Tipo
    type: block.type || 'block', // Sempre 'block'
    subtype: block.subtype || null,
    
    // Informações
    reason: block.reason,
    notes: block.notes || null,
    
    // Metadata
    created_at: block.createdAt || new Date().toISOString(),
    updated_at: block.updatedAt || new Date().toISOString(),
    created_by: block.createdBy || 'system',
  };
}

/**
 * Converte resultado SQL (tabela blocks) para Block (TypeScript)
 */
export function sqlToBlock(row: any): Block {
  // Calcular nights
  const start = new Date(row.start_date);
  const end = new Date(row.end_date);
  const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    id: row.id,
    propertyId: row.property_id,
    
    // Datas
    startDate: row.start_date,
    endDate: row.end_date,
    nights: row.nights || nights,
    
    // Tipo
    type: 'block' as const,
    subtype: row.subtype || undefined,
    
    // Informações
    reason: row.reason,
    notes: row.notes || undefined,
    
    // Metadata
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    createdBy: row.created_by || 'system',
  };
}

/**
 * Campos selecionados na query SQL (para performance)
 */
export const BLOCK_SELECT_FIELDS = `
  id, organization_id, property_id,
  start_date, end_date, nights,
  type, subtype, reason, notes,
  created_at, updated_at, created_by
`.replace(/\s+/g, ' ').trim();
