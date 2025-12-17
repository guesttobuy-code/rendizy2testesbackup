/**
 * Reservation Mapper - Converte entre formato TypeScript e SQL
 * 
 * ✅ MIGRAÇÃO v1.0.103.400 - SQL + RLS + Multi-tenant
 * Mapeia Reservation (TypeScript) ↔ reservations (SQL Table)
 * 
 * @version 1.0.103.400
 * @updated 2025-11-17 - Migração de KV Store para SQL Tables
 */

import type { Reservation } from './types.ts';

/**
 * Converte Reservation (TypeScript) para formato SQL (tabela reservations)
 */
export function reservationToSql(reservation: Reservation, organizationId: string): any {
  // ✅ Garantir que propertyId e guestId sejam UUIDs válidos (não 'system' ou null)
  const propertyId = (reservation.propertyId && reservation.propertyId !== 'system' && reservation.propertyId.length === 36) 
    ? reservation.propertyId 
    : null;
  const guestId = (reservation.guestId && reservation.guestId !== 'system' && reservation.guestId.length === 36) 
    ? reservation.guestId 
    : null;
  
  // ✅ Garantir que organizationId seja UUID válido (não 'system')
  const orgId = (organizationId && organizationId !== 'system' && organizationId.length === 36) 
    ? organizationId 
    : null;
  
  return {
    id: reservation.id,
    organization_id: orgId, // ✅ Multi-tenant: sempre usar organization_id do tenant
    property_id: propertyId,
    guest_id: guestId,
    
    // Datas
    check_in: reservation.checkIn,
    check_out: reservation.checkOut,
    nights: Math.floor(Math.abs(Number(reservation.nights) || 0)), // ✅ GARANTIR INTEGER (Math.floor + Math.abs)
    
    // Hóspedes (flat) - ✅ GARANTIR INTEGER (Math.floor + Math.abs)
    guests_adults: Math.floor(Math.abs(Number(reservation.guests?.adults || 1))),
    guests_children: Math.floor(Math.abs(Number(reservation.guests?.children || 0))),
    guests_infants: Math.floor(Math.abs(Number(reservation.guests?.infants || 0))),
    guests_pets: Math.floor(Math.abs(Number(reservation.guests?.pets || 0))),
    guests_total: Math.floor(Math.abs(Number(reservation.guests?.total || reservation.guests?.adults || 1))),
    
    // Precificação (flat)
    pricing_price_per_night: reservation.pricing?.pricePerNight || 0,
    pricing_base_total: reservation.pricing?.baseTotal || 0,
    pricing_cleaning_fee: reservation.pricing?.cleaningFee || 0,
    pricing_service_fee: reservation.pricing?.serviceFee || 0,
    pricing_taxes: reservation.pricing?.taxes || 0,
    pricing_discount: reservation.pricing?.discount || 0,
    pricing_total: reservation.pricing?.total || 0,
    pricing_currency: reservation.pricing?.currency || 'BRL',
    pricing_applied_tier: reservation.pricing?.appliedTier || null,
    
    // Status
    status: reservation.status,
    
    // Plataforma
    platform: reservation.platform,
    external_id: reservation.externalId || null,
    external_url: reservation.externalUrl || null,
    
    // Pagamento (flat)
    payment_status: reservation.payment?.status || 'pending',
    payment_method: reservation.payment?.method || null,
    payment_transaction_id: reservation.payment?.transactionId || null,
    payment_paid_at: reservation.payment?.paidAt || null,
    payment_refunded_at: reservation.payment?.refundedAt || null,
    
    // Comunicação
    notes: reservation.notes || null,
    internal_comments: reservation.internalComments || null,
    special_requests: reservation.specialRequests || null,
    
    // Check-in/out
    check_in_time: reservation.checkInTime || null,
    check_out_time: reservation.checkOutTime || null,
    actual_check_in: reservation.actualCheckIn || null,
    actual_check_out: reservation.actualCheckOut || null,
    
    // Cancelamento
    cancelled_at: reservation.cancelledAt || null,
    cancelled_by: reservation.cancelledBy || null,
    cancellation_reason: reservation.cancellationReason || null,
    
    // Metadata
    created_at: reservation.createdAt || new Date().toISOString(),
    updated_at: reservation.updatedAt || new Date().toISOString(),
    // ✅ Garantir que created_by seja UUID válido (não 'system')
    created_by: (reservation.createdBy && reservation.createdBy !== 'system' && reservation.createdBy.length === 36)
      ? reservation.createdBy
      : '00000000-0000-0000-0000-000000000001', // UUID fallback ao invés de 'system'
    confirmed_at: reservation.confirmedAt || null,
  };
}

/**
 * Converte resultado SQL (tabela reservations) para Reservation (TypeScript)
 */
export function sqlToReservation(row: any): Reservation {
  return {
    id: row.id,
    propertyId: row.property_id,
    guestId: row.guest_id,
    
    // Datas
    checkIn: row.check_in,
    checkOut: row.check_out,
    nights: row.nights,
    
    // Hóspedes (aninhado)
    guests: {
      adults: row.guests_adults || 1,
      children: row.guests_children || 0,
      infants: row.guests_infants || 0,
      pets: row.guests_pets || 0,
      total: row.guests_total || row.guests_adults || 1,
    },
    
    // Precificação (aninhado)
    pricing: {
      pricePerNight: row.pricing_price_per_night || 0,
      baseTotal: row.pricing_base_total || 0,
      cleaningFee: row.pricing_cleaning_fee || 0,
      serviceFee: row.pricing_service_fee || 0,
      taxes: row.pricing_taxes || 0,
      discount: row.pricing_discount || 0,
      total: row.pricing_total || 0,
      currency: row.pricing_currency || 'BRL',
      appliedTier: row.pricing_applied_tier || undefined,
    },
    
    // Status
    status: row.status,
    
    // Plataforma
    platform: row.platform,
    externalId: row.external_id || undefined,
    externalUrl: row.external_url || undefined,
    
    // Pagamento (aninhado)
    payment: {
      status: row.payment_status || 'pending',
      method: row.payment_method || undefined,
      transactionId: row.payment_transaction_id || undefined,
      paidAt: row.payment_paid_at || undefined,
      refundedAt: row.payment_refunded_at || undefined,
    },
    
    // Comunicação
    notes: row.notes || undefined,
    internalComments: row.internal_comments || undefined,
    specialRequests: row.special_requests || undefined,
    
    // Check-in/out
    checkInTime: row.check_in_time || undefined,
    checkOutTime: row.check_out_time || undefined,
    actualCheckIn: row.actual_check_in || undefined,
    actualCheckOut: row.actual_check_out || undefined,
    
    // Cancelamento
    cancelledAt: row.cancelled_at || undefined,
    cancelledBy: row.cancelled_by || undefined,
    cancellationReason: row.cancellation_reason || undefined,
    
    // Metadata
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    createdBy: row.created_by || 'system',
    confirmedAt: row.confirmed_at || undefined,
  };
}

/**
 * Campos selecionados na query SQL (para performance)
 */
export const RESERVATION_SELECT_FIELDS = `
  id, organization_id, property_id, guest_id,
  check_in, check_out, nights,
  guests_adults, guests_children, guests_infants, guests_pets, guests_total,
  pricing_price_per_night, pricing_base_total, pricing_cleaning_fee,
  pricing_service_fee, pricing_taxes, pricing_discount, pricing_total,
  pricing_currency, pricing_applied_tier,
  status, platform, external_id, external_url,
  payment_status, payment_method, payment_transaction_id,
  payment_paid_at, payment_refunded_at,
  notes, internal_comments, special_requests,
  check_in_time, check_out_time, actual_check_in, actual_check_out,
  cancelled_at, cancelled_by, cancellation_reason,
  created_at, updated_at, created_by, confirmed_at
`.replace(/\s+/g, ' ').trim();
