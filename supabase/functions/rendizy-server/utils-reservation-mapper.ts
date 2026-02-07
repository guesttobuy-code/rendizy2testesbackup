/**
 * Reservation Mapper - Converte entre formato TypeScript e SQL
 * 
 * ✅ MIGRAÇÃO v1.0.103.400 - SQL + RLS + Multi-tenant
 * Mapeia Reservation (TypeScript) ↔ reservations (SQL Table)
 * 
 * @version 1.0.103.400
 * @updated 2025-11-17 - Migração de KV Store para SQL Tables
 */

import type { Platform, Reservation } from './types.ts';

function moneyToCents(value: unknown, fallbackCents = 0): number {
  if (value === null || value === undefined || value === '') return fallbackCents;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallbackCents;
  return Math.round(n * 100);
}

function centsToMoney2(cents: unknown, fallback = 0): number {
  if (cents === null || cents === undefined || cents === '') return fallback;
  const n = Number(cents);
  if (!Number.isFinite(n)) return fallback;
  return Number((n / 100).toFixed(2));
}

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
    // ⚠️ IMPORTANTE: no schema atual do banco esses campos são INTEGER (centavos)
    // então persistimos sempre em centavos (inteiro) para garantir centavos exatos.
    pricing_price_per_night: moneyToCents(reservation.pricing?.pricePerNight, 0),
    pricing_base_total: moneyToCents(reservation.pricing?.baseTotal, 0),
    pricing_cleaning_fee: moneyToCents(reservation.pricing?.cleaningFee, 0),
    pricing_service_fee: moneyToCents(reservation.pricing?.serviceFee, 0),
    pricing_taxes: moneyToCents(reservation.pricing?.taxes, 0),
    pricing_discount: moneyToCents(reservation.pricing?.discount, 0),
    pricing_total: moneyToCents(reservation.pricing?.total, 0),
    pricing_platform_commission: moneyToCents(reservation.pricing?.platformCommission, 0),
    pricing_currency: reservation.pricing?.currency || 'BRL',
    pricing_applied_tier: reservation.pricing?.appliedTier || null,
    
    // Status
    status: reservation.status,
    
    // Plataforma - ✅ CORREÇÃO v1.0.103.900: Normalizar para valores permitidos pelo CHECK constraint
    platform: (['airbnb', 'booking', 'decolar', 'direct', 'other'] as const).includes(reservation.platform as any)
      ? reservation.platform
      : 'other',
    platform_partner_name: reservation.staysnetPartnerName || null,
    platform_commission_type: reservation.platformCommissionType || null,
    external_id: reservation.externalId || null,
    external_url: reservation.externalUrl || null,
    
    // Pagamento (flat) - ✅ CORREÇÃO v1.0.103.900: Normalizar payment_status
    payment_status: (['pending', 'paid', 'partial', 'refunded', 'cancelled'] as const).includes(reservation.payment?.status as any)
      ? reservation.payment?.status
      : 'pending',
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
    source_created_at: reservation.sourceCreatedAt || null,
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
 * ✅ CORREÇÃO v1.0.103.401: Extrair guestName do JOIN com tabela guests
 */
export function sqlToReservation(row: any): Reservation {
  const toNumber = (value: any, fallback = 0): number => {
    if (value === null || value === undefined || value === '') return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const toInt = (value: any, fallback = 0): number => {
    const n = toNumber(value, fallback);
    return Math.floor(n);
  };

  // ✅ Extrair guest name do JOIN (se disponível). Se não estiver vinculado, tentar fallback do staysnet_raw.
  const guestData = row.guests;
  const staysRaw = row.staysnet_raw;
  const rawGuestName =
    staysRaw?.guestName ||
    staysRaw?.guest?.name ||
    (staysRaw?.guestFirstName && staysRaw?.guestLastName ? `${staysRaw.guestFirstName} ${staysRaw.guestLastName}` : undefined) ||
    (staysRaw?.guest?.firstName && staysRaw?.guest?.lastName ? `${staysRaw.guest.firstName} ${staysRaw.guest.lastName}` : undefined) ||
    undefined;

  const guestName =
    guestData?.full_name ||
    (guestData?.first_name && guestData?.last_name ? `${guestData.first_name} ${guestData.last_name}` : undefined) ||
    rawGuestName ||
    guestData?.email ||
    staysRaw?.guestEmail ||
    staysRaw?.guest?.email ||
    'Hóspede';

  const normalizePlatform = (input: unknown): Platform | null => {
    const v = String(input || '').trim().toLowerCase();
    if (v === 'airbnb' || v === 'booking' || v === 'decolar' || v === 'direct' || v === 'other') {
      return v as Platform;
    }
    return null;
  };

  const mapPlatformFromRaw = (input: unknown): Platform | null => {
    if (!input) return null;
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
    return null;
  };

  const platformCandidates = [
    row.platform,
    row.staysnet_partner_name,
    row.staysnet_partner_code,
    staysRaw?.platform,
    staysRaw?.source,
    staysRaw?.partner,
  ];

  let platform: Platform = normalizePlatform(row.platform) ?? 'other';
  if (platform === 'other') {
    for (const c of platformCandidates) {
      const mapped = mapPlatformFromRaw(c);
      if (mapped) {
        platform = mapped;
        break;
      }
    }
    if (!platform) platform = normalizePlatform(row.platform) ?? 'other';
  }
  
  return {
    id: row.id,
    propertyId: row.property_id || '',
    guestId: row.guest_id || '',
    guestName: guestName,  // ✅ Agora incluído do JOIN
    
    // Datas
    checkIn: row.check_in,
    checkOut: row.check_out,
    nights: toInt(row.nights, 0),
    
    // Hóspedes (aninhado)
    guests: {
      adults: toInt(row.guests_adults, 1) || 1,
      children: toInt(row.guests_children, 0),
      infants: toInt(row.guests_infants, 0),
      pets: toInt(row.guests_pets, 0),
      total: toInt(row.guests_total, 0) || toInt(row.guests_adults, 1) || 1,
    },
    
    // Precificação (aninhado)
    pricing: {
      // ⚠️ IMPORTANTE: no schema atual do banco esses campos são INTEGER (centavos)
      // e precisamos expor em reais (2 casas) para o frontend.
      pricePerNight: centsToMoney2(toNumber(row.pricing_price_per_night, 0), 0),
      baseTotal: centsToMoney2(toNumber(row.pricing_base_total, 0), 0),
      cleaningFee: centsToMoney2(toNumber(row.pricing_cleaning_fee, 0), 0),
      serviceFee: centsToMoney2(toNumber(row.pricing_service_fee, 0), 0),
      taxes: centsToMoney2(toNumber(row.pricing_taxes, 0), 0),
      discount: centsToMoney2(toNumber(row.pricing_discount, 0), 0),
      total: centsToMoney2(toNumber(row.pricing_total, 0), 0),
      platformCommission: centsToMoney2(toNumber(row.pricing_platform_commission, 0), 0),
      currency: row.pricing_currency || 'BRL',
      appliedTier: row.pricing_applied_tier || undefined,
    },
    
    // Status
    status: row.status,
    
    // Plataforma
    platform: platform,
    staysnetPartnerName: row.staysnet_partner_name || row.platform_partner_name || undefined,
    platformCommissionType: row.platform_commission_type || undefined,
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
    sourceCreatedAt: row.source_created_at || undefined,
    updatedAt: row.updated_at || new Date().toISOString(),
    createdBy: row.created_by || 'system',
    confirmedAt: row.confirmed_at || undefined,
  };
}

/**
 * Campos selecionados na query SQL (para performance)
 * ✅ CORREÇÃO v1.0.103.401: Adicionar JOIN com tabela guests
 */
export const RESERVATION_SELECT_FIELDS = `
  *,
  guests!guest_id (
    id,
    full_name,
    first_name,
    last_name,
    email,
    phone
  )
`.replace(/\s+/g, ' ').trim();
