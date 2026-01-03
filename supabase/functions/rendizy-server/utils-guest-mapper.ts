/**
 * Guest Mapper - Converte entre formato TypeScript e SQL
 * 
 * ✅ MIGRAÇÃO v1.0.103.400 - SQL + RLS + Multi-tenant
 * Mapeia Guest (TypeScript) ↔ guests (SQL Table)
 * 
 * @version 1.0.103.400
 * @updated 2025-11-17 - Migração de KV Store para SQL Tables
 */

import type { Guest, Platform } from './types.ts';

/**
 * Converte Guest (TypeScript) para formato SQL (tabela guests)
 */
export function guestToSql(guest: Guest, organizationId: string): any {
  return {
    id: guest.id,
    organization_id: organizationId, // ✅ Multi-tenant: sempre usar organization_id do tenant
    
    // Dados pessoais
    first_name: guest.firstName,
    last_name: guest.lastName,
    email: guest.email,
    phone: guest.phone,
    
    // Documentos
    cpf: guest.cpf || null,
    passport: guest.passport || null,
    rg: guest.rg || null,
    
    // Endereço (flat)
    address_street: guest.address?.street || null,
    address_number: guest.address?.number || null,
    address_complement: guest.address?.complement || null,
    address_neighborhood: guest.address?.neighborhood || null,
    address_city: guest.address?.city || null,
    address_state: guest.address?.state || null,
    address_zip_code: guest.address?.zipCode || null,
    address_country: guest.address?.country || null,
    
    // Dados demográficos
    birth_date: guest.birthDate || null,
    nationality: guest.nationality || null,
    language: guest.language || 'pt-BR',
    
    // Estatísticas (flat)
    stats_total_reservations: guest.stats?.totalReservations || 0,
    stats_total_nights: guest.stats?.totalNights || 0,
    stats_total_spent: guest.stats?.totalSpent || 0,
    stats_average_rating: guest.stats?.averageRating || null,
    stats_last_stay_date: guest.stats?.lastStayDate || null,
    
    // Preferências (flat - booleans)
    preferences_early_check_in: guest.preferences?.earlyCheckIn || false,
    preferences_late_check_out: guest.preferences?.lateCheckOut || false,
    preferences_quiet_floor: guest.preferences?.quietFloor || false,
    preferences_high_floor: guest.preferences?.highFloor || false,
    preferences_pets: guest.preferences?.pets || false,
    
    // Tags (array)
    tags: guest.tags || [],
    
    // Blacklist
    is_blacklisted: guest.isBlacklisted || false,
    blacklist_reason: guest.blacklistReason || null,
    blacklisted_at: guest.blacklistedAt || null,
    blacklisted_by: guest.blacklistedBy || null,
    
    // Notas
    notes: guest.notes || null,
    
    // Metadata
    created_at: guest.createdAt || new Date().toISOString(),
    updated_at: guest.updatedAt || new Date().toISOString(),
    source: guest.source || 'direct',
  };
}

/**
 * Converte resultado SQL (tabela guests) para Guest (TypeScript)
 */
export function sqlToGuest(row: any): Guest {
  // Calcular fullName
  const fullName = `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Sem nome';
  
  return {
    id: row.id,
    
    // Dados pessoais
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: fullName,
    email: row.email,
    phone: row.phone,
    
    // Documentos
    cpf: row.cpf || undefined,
    passport: row.passport || undefined,
    rg: row.rg || undefined,
    
    // Endereço (aninhado)
    address: row.address_street ? {
      street: row.address_street,
      number: row.address_number || '',
      complement: row.address_complement || undefined,
      neighborhood: row.address_neighborhood || '',
      city: row.address_city || '',
      state: row.address_state || '',
      zipCode: row.address_zip_code || '',
      country: row.address_country || 'BR',
    } : undefined,
    
    // Dados demográficos
    birthDate: row.birth_date || undefined,
    nationality: row.nationality || undefined,
    language: row.language || 'pt-BR',
    
    // Estatísticas (aninhado)
    stats: {
      totalReservations: row.stats_total_reservations || 0,
      totalNights: row.stats_total_nights || 0,
      totalSpent: row.stats_total_spent || 0,
      averageRating: row.stats_average_rating || undefined,
      lastStayDate: row.stats_last_stay_date || undefined,
    },
    
    // Preferências (aninhado)
    preferences: {
      earlyCheckIn: row.preferences_early_check_in || false,
      lateCheckOut: row.preferences_late_check_out || false,
      quietFloor: row.preferences_quiet_floor || false,
      highFloor: row.preferences_high_floor || false,
      pets: row.preferences_pets || false,
    },
    
    // Tags (array)
    tags: row.tags || [],
    
    // Blacklist
    isBlacklisted: row.is_blacklisted || false,
    blacklistReason: row.blacklist_reason || undefined,
    blacklistedAt: row.blacklisted_at || undefined,
    blacklistedBy: row.blacklisted_by || undefined,
    
    // Notas
    notes: row.notes || undefined,
    
    // Metadata
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    source: row.source || 'direct',
  };
}

/**
 * Campos selecionados na query SQL (para performance)
 */
export const GUEST_SELECT_FIELDS = `
  id, organization_id,
  first_name, last_name, email, phone,
  cpf, passport, rg,
  address_street, address_number, address_complement, address_neighborhood,
  address_city, address_state, address_zip_code, address_country,
  birth_date, nationality, language,
  stats_total_reservations, stats_total_nights, stats_total_spent,
  stats_average_rating, stats_last_stay_date,
  preferences_early_check_in, preferences_late_check_out, preferences_quiet_floor,
  preferences_high_floor, preferences_pets,
  tags, is_blacklisted, blacklist_reason, blacklisted_at, blacklisted_by,
  notes, source, created_at, updated_at
`.replace(/\s+/g, ' ').trim();
