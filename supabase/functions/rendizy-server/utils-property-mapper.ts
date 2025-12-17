/**
 * Property Mapper - Converte entre formato TypeScript e SQL
 *
 * ✅ MIGRAÇÃO v1.0.103.400 - SQL + RLS + Multi-tenant
 * Mapeia Property (TypeScript) ↔ properties (SQL Table)
 *
 * @version 1.0.103.400
 * @updated 2025-11-17 - Migração de KV Store para SQL Tables
 */

import type { Property } from "./types.ts";
import { getSupabaseClient } from "./kv_store.tsx";

/**
 * Converte Property (TypeScript) para formato SQL (tabela properties)
 */
export function propertyToSql(property: Property, organizationId: string): any {
  // ✅ CORREÇÃO: Remover prefixo do ID se existir (ex: "acc_" -> UUID puro)
  // O banco SQL espera UUID puro, mas o sistema usa prefixos para compatibilidade
  let propertyId = property.id;
  console.log("🔍 [propertyToSql] ID original:", propertyId);
  if (propertyId && propertyId.includes("_")) {
    // Se tem prefixo (ex: "acc_uuid"), extrair apenas o UUID
    const parts = propertyId.split("_");
    if (parts.length > 1) {
      // Pegar a última parte (UUID) ou todas as partes após o primeiro underscore
      propertyId = parts.slice(1).join("_");
      console.log("✅ [propertyToSql] ID após remover prefixo:", propertyId);
    }
  }

  // ✅ CORREÇÃO: organizationId deve ser UUID válido ou null (não 'system')
  let orgId = organizationId;
  if (orgId === "system" || !orgId) {
    orgId = null;
  }

  return {
    id: propertyId,
    organization_id: orgId, // ✅ Multi-tenant: sempre usar organization_id do tenant (ou null para SuperAdmin)
    owner_id: (() => {
      const ownerId = property.ownerId;
      // Se ownerId for 'system' ou null, usar null
      if (!ownerId || ownerId === "system") {
        return null;
      }
      // Se tiver prefixo, remover
      if (typeof ownerId === "string" && ownerId.includes("_")) {
        const parts = ownerId.split("_");
        return parts.length > 1 ? parts.slice(1).join("_") : ownerId;
      }
      return ownerId;
    })(),
    location_id: (() => {
      const locationId = property.locationId || null;
      if (
        locationId &&
        typeof locationId === "string" &&
        locationId.includes("_")
      ) {
        const parts = locationId.split("_");
        return parts.length > 1 ? parts.slice(1).join("_") : locationId;
      }
      return locationId;
    })(),

    // Identificação
    name: property.name,
    code: property.code,
    type: property.type,
    status: property.status,

    // Endereço (flat)
    address_street: property.address?.street || null,
    address_number: property.address?.number || null,
    address_complement: property.address?.complement || null,
    address_neighborhood: property.address?.neighborhood || null,
    address_city: property.address?.city || null,
    address_state: property.address?.state || null,
    address_zip_code: property.address?.zipCode || null,
    address_country: property.address?.country || "BR",

    // Capacidade
    max_guests: property.maxGuests,
    bedrooms: property.bedrooms || 0,
    beds: property.beds || 0,
    bathrooms: property.bathrooms || 0,
    area: property.area || null,

    // Precificação (flat)
    pricing_base_price: property.pricing?.basePrice || 0,
    pricing_currency: property.pricing?.currency || "BRL",
    pricing_weekly_discount: property.pricing?.weeklyDiscount || 0,
    pricing_biweekly_discount: property.pricing?.biweeklyDiscount || 0,
    pricing_monthly_discount: property.pricing?.monthlyDiscount || 0,

    // Restrições (flat)
    restrictions_min_nights: property.restrictions?.minNights || 1,
    restrictions_max_nights: property.restrictions?.maxNights || 365,
    restrictions_advance_booking: property.restrictions?.advanceBooking || 0,
    restrictions_preparation_time: property.restrictions?.preparationTime || 0,

    // Arrays
    amenities: property.amenities || [],
    tags: property.tags || [],
    photos: property.photos || [],

    // Organização e visual
    folder: property.folder || null,
    color: property.color || null,
    cover_photo: property.coverPhoto || null,

    // Descrição
    description: property.description || null,
    short_description: property.shortDescription || null,

    // Plataformas (flat - booleanos separados)
    platforms_airbnb_enabled: property.platforms?.airbnb?.enabled || false,
    platforms_airbnb_listing_id: property.platforms?.airbnb?.listingId || null,
    platforms_airbnb_sync_enabled:
      property.platforms?.airbnb?.syncEnabled || false,
    platforms_booking_enabled: property.platforms?.booking?.enabled || false,
    platforms_booking_listing_id:
      property.platforms?.booking?.listingId || null,
    platforms_booking_sync_enabled:
      property.platforms?.booking?.syncEnabled || false,
    platforms_decolar_enabled: property.platforms?.decolar?.enabled || false,
    platforms_decolar_listing_id:
      property.platforms?.decolar?.listingId || null,
    platforms_decolar_sync_enabled:
      property.platforms?.decolar?.syncEnabled || false,
    platforms_direct: property.platforms?.direct !== false, // Default: true

    // Status
    is_active: property.isActive !== false, // Default: true

    // 🆕 Sistema de Rascunho
    status: property.status || "active", // 'draft', 'active', 'inactive', 'maintenance'
    wizard_data: property.wizardData || null, // Dados completos do wizard em JSONB
    completion_percentage: property.completionPercentage || 0, // 0-100
    completed_steps: property.completedSteps || [], // Array de step IDs completados

    // Metadata
    created_at: property.createdAt || new Date().toISOString(),
    updated_at: property.updatedAt || new Date().toISOString(),
  };
}

/**
 * Converte resultado SQL (tabela properties) para Property (TypeScript)
 */
export function sqlToProperty(row: any): Property {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    type: row.type,
    status: row.status || "active", // 🆕 Garantir que status sempre tenha valor
    locationId: row.location_id || undefined,
    propertyType: "individual", // TODO: Adicionar campo property_type ao schema se necessário

    // Endereço (aninhado)
    address: {
      street: row.address_street || "",
      number: row.address_number || "",
      complement: row.address_complement || undefined,
      neighborhood: row.address_neighborhood || "",
      city: row.address_city || "",
      state: row.address_state || "",
      zipCode: row.address_zip_code || "",
      country: row.address_country || "BR",
    },

    // Capacidade
    maxGuests: row.max_guests,
    bedrooms: row.bedrooms || 0,
    beds: row.beds || 0,
    bathrooms: row.bathrooms || 0,
    area: row.area || undefined,

    // Precificação (aninhado)
    pricing: {
      basePrice: row.pricing_base_price || 0,
      currency: row.pricing_currency || "BRL",
      weeklyDiscount: row.pricing_weekly_discount || 0,
      biweeklyDiscount: row.pricing_biweekly_discount || 0,
      monthlyDiscount: row.pricing_monthly_discount || 0,
    },

    // Restrições (aninhado)
    restrictions: {
      minNights: row.restrictions_min_nights || 1,
      maxNights: row.restrictions_max_nights || 365,
      advanceBooking: row.restrictions_advance_booking || 0,
      preparationTime: row.restrictions_preparation_time || 0,
    },

    // Arrays
    amenities: row.amenities || [],
    tags: row.tags || [],
    photos: row.photos || [],
    locationAmenities: [], // TODO: Buscar do location se necessário
    listingAmenities: row.amenities || [], // Por enquanto igual a amenities

    // Organização e visual
    folder: row.folder || undefined,
    color: row.color || undefined,
    coverPhoto: row.cover_photo || undefined,

    // Descrição
    description: row.description || undefined,
    shortDescription: row.short_description || undefined,

    // Plataformas (aninhado)
    platforms: {
      airbnb: row.platforms_airbnb_enabled
        ? {
            enabled: true,
            listingId: row.platforms_airbnb_listing_id || "",
            syncEnabled: row.platforms_airbnb_sync_enabled || false,
          }
        : undefined,
      booking: row.platforms_booking_enabled
        ? {
            enabled: true,
            listingId: row.platforms_booking_listing_id || "",
            syncEnabled: row.platforms_booking_sync_enabled || false,
          }
        : undefined,
      decolar: row.platforms_decolar_enabled
        ? {
            enabled: true,
            listingId: row.platforms_decolar_listing_id || "",
            syncEnabled: row.platforms_decolar_sync_enabled || false,
          }
        : undefined,
      direct: row.platforms_direct !== false,
    },

    // 🆕 Sistema de Rascunho
    wizardData: row.wizard_data || undefined,
    completionPercentage: row.completion_percentage || 0,
    completedSteps: row.completed_steps || [],
    // 🆕 IMPORTANTE: Garantir que status seja retornado corretamente
    status: row.status || "active", // Se não tiver status, assumir 'active'

    // Metadata
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    ownerId: row.owner_id || "system",
    isActive: row.is_active !== false,
  };
}

/**
 * Campos selecionados na query SQL (para performance)
 */
export const PROPERTY_SELECT_FIELDS = `
  id, organization_id, owner_id, location_id,
  name, code, type, status,
  address_street, address_number, address_complement, address_neighborhood,
  address_city, address_state, address_zip_code, address_country,
  max_guests, bedrooms, beds, bathrooms, area,
  pricing_base_price, pricing_currency, pricing_weekly_discount,
  pricing_biweekly_discount, pricing_monthly_discount,
  restrictions_min_nights, restrictions_max_nights,
  restrictions_advance_booking, restrictions_preparation_time,
  amenities, tags, photos, folder, color, cover_photo,
  description, short_description,
  platforms_airbnb_enabled, platforms_airbnb_listing_id, platforms_airbnb_sync_enabled,
  platforms_booking_enabled, platforms_booking_listing_id, platforms_booking_sync_enabled,
  platforms_decolar_enabled, platforms_decolar_listing_id, platforms_decolar_sync_enabled,
  platforms_direct, is_active, 
  wizard_data, completion_percentage, completed_steps,
  created_at, updated_at
`
  .replace(/\s+/g, " ")
  .trim();
