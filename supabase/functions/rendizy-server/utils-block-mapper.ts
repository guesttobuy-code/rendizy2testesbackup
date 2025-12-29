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

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000002';

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

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
    // `blocks.created_by` é UUID no Postgres. Muitos chamadores antigos usam strings
    // como 'system'/'staysnet-webhook'. Coagir para um UUID estável para evitar falha.
    created_by: isUuid(block.createdBy) ? block.createdBy : DEFAULT_USER_ID,
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
    createdBy: isUuid(row.created_by) ? row.created_by : DEFAULT_USER_ID,
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
