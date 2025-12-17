/**
 * UTILS - Listing Mapper (TypeScript ↔ SQL)
 * 
 * Converte entre interface Listing (TypeScript) e estrutura SQL da tabela listings
 * 
 * @version 1.0.103.400
 * @updated 2025-11-17 - Migração para SQL + multi-tenant
 */

import type { Listing } from './types.ts';

// ============================================================================
// TYPES
// ============================================================================

export interface ListingSQLRow {
  id: string;
  organization_id: string;
  property_id: string;
  platform: 'airbnb' | 'booking' | 'decolar' | 'vrbo' | 'direct';
  external_id: string | null;
  external_url: string | null;
  title: Record<string, string> | null;
  description: Record<string, string> | null;
  slug: string | null;
  status: 'draft' | 'published' | 'unlisted' | 'archived';
  sync_calendar: boolean;
  sync_pricing: boolean;
  sync_availability: boolean;
  ical_url: string | null;
  pricing_adjustment: Record<string, any> | null;
  min_nights: number | null;
  max_nights: number | null;
  instant_book: boolean;
  advance_notice: number | null;
  total_views: number;
  total_bookings: number;
  total_revenue: number;
  average_rating: number | null;
  last_sync_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SELECT FIELDS
// ============================================================================

export const LISTING_SELECT_FIELDS = `
  id,
  organization_id,
  property_id,
  platform,
  external_id,
  external_url,
  title,
  description,
  slug,
  status,
  sync_calendar,
  sync_pricing,
  sync_availability,
  ical_url,
  pricing_adjustment,
  min_nights,
  max_nights,
  instant_book,
  advance_notice,
  total_views,
  total_bookings,
  total_revenue,
  average_rating,
  last_sync_at,
  published_at,
  created_at,
  updated_at
`.trim().replace(/\s+/g, ' ');

// ============================================================================
// SQL → TypeScript
// ============================================================================

/**
 * Converte linha SQL para interface Listing (TypeScript)
 */
export function sqlToListing(row: ListingSQLRow): Listing {
  // Extrair dados de plataforma do SQL
  const platformData = {
    enabled: row.status === 'published' || row.status === 'unlisted',
    status: row.status as 'draft' | 'published' | 'unlisted',
    listingUrl: row.external_url || undefined,
    externalId: row.external_id || undefined,
    lastSync: row.last_sync_at || undefined,
    syncCalendar: row.sync_calendar,
    syncPricing: row.sync_pricing,
    syncAvailability: row.sync_availability,
  };

  // Montar objeto platforms baseado na plataforma
  const platforms: Listing['platforms'] = {};
  if (row.platform === 'airbnb') {
    platforms.airbnb = platformData;
  } else if (row.platform === 'booking') {
    platforms.booking = platformData;
  } else if (row.platform === 'decolar') {
    platforms.decolar = platformData;
  } else if (row.platform === 'direct') {
    platforms.direct = {
      enabled: platformData.enabled,
      status: platformData.status as 'draft' | 'published' | 'unlisted',
      bookingUrl: row.external_url || undefined,
    };
  }

  // Montar objeto Listing completo
  const listing: Listing = {
    id: row.id,
    accommodationId: row.property_id, // property_id → accommodationId
    
    // Título multilíngue
    title: row.title || { pt: '', en: '', es: '' },
    
    // Descrição multilíngue
    description: row.description || { pt: '', en: '', es: '' },
    
    // Status em cada plataforma
    platforms,
    
    // Configurações de preço por plataforma (do pricing_adjustment)
    pricingSettings: row.pricing_adjustment ? {
      [row.platform]: row.pricing_adjustment,
    } : undefined,
    
    // Configurações de disponibilidade
    availabilitySettings: {
      instantBook: row.instant_book,
      advanceNotice: row.advance_notice || 0,
      preparationTime: 0, // Não está no SQL, usar padrão
      checkInTime: '15:00', // Não está no SQL, usar padrão
      checkOutTime: '11:00', // Não está no SQL, usar padrão
      minNights: row.min_nights || 1,
      maxNights: row.max_nights || 999,
    },
    
    // iCal Sync URLs
    icalUrls: row.ical_url ? {
      [row.platform]: row.ical_url,
    } : undefined,
    
    // Estatísticas
    stats: {
      totalViews: row.total_views || 0,
      totalBookings: row.total_bookings || 0,
      averageRating: row.average_rating || 0,
      responseRate: 0, // Não está no SQL
      responseTime: 0, // Não está no SQL
    },
    
    // Metadata
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at || undefined,
    ownerId: row.organization_id, // Usar organization_id como ownerId temporariamente
  };

  // SEO (se slug existir)
  if (row.slug) {
    listing.seo = {
      slug: row.slug,
      metaTitle: row.title?.pt || '',
      metaDescription: row.description?.pt || '',
      keywords: [],
    };
  }

  return listing;
}

// ============================================================================
// TypeScript → SQL
// ============================================================================

/**
 * Converte interface Listing (TypeScript) para estrutura SQL
 */
export function listingToSql(listing: Listing, organizationId: string): Partial<ListingSQLRow> {
  // Determinar plataforma (assumindo que um listing representa uma plataforma)
  let platform: 'airbnb' | 'booking' | 'decolar' | 'vrbo' | 'direct' = 'direct';
  let externalId: string | null = null;
  let externalUrl: string | null = null;
  let syncCalendar = false;
  let syncPricing = false;
  let syncAvailability = false;
  let status: 'draft' | 'published' | 'unlisted' | 'archived' = 'draft';

  // Extrair dados da plataforma
  if (listing.platforms?.airbnb?.enabled) {
    platform = 'airbnb';
    externalId = listing.platforms.airbnb.externalId || null;
    externalUrl = listing.platforms.airbnb.listingUrl || null;
    syncCalendar = listing.platforms.airbnb.syncCalendar || false;
    syncPricing = listing.platforms.airbnb.syncPricing || false;
    syncAvailability = listing.platforms.airbnb.syncAvailability || false;
    status = listing.platforms.airbnb.status || 'draft';
  } else if (listing.platforms?.booking?.enabled) {
    platform = 'booking';
    externalId = listing.platforms.booking.externalId || null;
    externalUrl = listing.platforms.booking.listingUrl || null;
    syncCalendar = listing.platforms.booking.syncCalendar || false;
    syncPricing = listing.platforms.booking.syncPricing || false;
    syncAvailability = listing.platforms.booking.syncAvailability || false;
    status = listing.platforms.booking.status || 'draft';
  } else if (listing.platforms?.decolar?.enabled) {
    platform = 'decolar';
    externalId = listing.platforms.decolar.externalId || null;
    externalUrl = listing.platforms.decolar.listingUrl || null;
    syncCalendar = listing.platforms.decolar.syncCalendar || false;
    syncPricing = listing.platforms.decolar.syncPricing || false;
    syncAvailability = listing.platforms.decolar.syncAvailability || false;
    status = listing.platforms.decolar.status || 'draft';
  } else if (listing.platforms?.direct?.enabled) {
    platform = 'direct';
    externalUrl = listing.platforms.direct.bookingUrl || null;
    status = listing.platforms.direct.status || 'draft';
  }

  // Extrair iCal URL
  let icalUrl: string | null = null;
  if (listing.icalUrls?.airbnb && platform === 'airbnb') {
    icalUrl = listing.icalUrls.airbnb;
  } else if (listing.icalUrls?.booking && platform === 'booking') {
    icalUrl = listing.icalUrls.booking;
  } else if (listing.icalUrls?.decolar && platform === 'decolar') {
    icalUrl = listing.icalUrls.decolar;
  }

  // Extrair pricing adjustment
  let pricingAdjustment: Record<string, any> | null = null;
  if (listing.pricingSettings) {
    if (platform === 'airbnb' && listing.pricingSettings.airbnb) {
      pricingAdjustment = listing.pricingSettings.airbnb;
    } else if (platform === 'booking' && listing.pricingSettings.booking) {
      pricingAdjustment = listing.pricingSettings.booking;
    } else if (platform === 'decolar' && listing.pricingSettings.decolar) {
      pricingAdjustment = listing.pricingSettings.decolar;
    }
  }

  // Montar objeto SQL
  const sqlRow: Partial<ListingSQLRow> = {
    organization_id: organizationId,
    property_id: listing.accommodationId, // accommodationId → property_id
    platform,
    external_id: externalId,
    external_url: externalUrl,
    title: listing.title || null,
    description: listing.description || null,
    slug: listing.seo?.slug || null,
    status,
    sync_calendar: syncCalendar,
    sync_pricing: syncPricing,
    sync_availability: syncAvailability,
    ical_url: icalUrl,
    pricing_adjustment: pricingAdjustment,
    min_nights: listing.availabilitySettings?.minNights || null,
    max_nights: listing.availabilitySettings?.maxNights || null,
    instant_book: listing.availabilitySettings?.instantBook || false,
    advance_notice: listing.availabilitySettings?.advanceNotice || null,
    total_views: listing.stats?.totalViews || 0,
    total_bookings: listing.stats?.totalBookings || 0,
    total_revenue: listing.stats?.averageRating || 0, // TODO: mapear corretamente
    average_rating: listing.stats?.averageRating || null,
    last_sync_at: listing.platforms?.airbnb?.lastSync || 
                  listing.platforms?.booking?.lastSync || 
                  listing.platforms?.decolar?.lastSync || null,
    published_at: listing.publishedAt || null,
  };

  return sqlRow;
}

