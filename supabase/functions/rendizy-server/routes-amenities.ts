// ============================================================================
// ROTAS DE AMENIDADES (v1.0.103.80)
// ============================================================================
// Gerenciamento de Location Amenities e Listing Amenities
// Suporta anúncios individuais e vinculados a locations

import type { Context } from 'npm:hono';
import * as kv from './kv_store.tsx';
import type { Property } from './types.ts';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  logInfo,
  logError,
} from './utils.ts';

// ============================================================================
// ATUALIZAR LOCATION AMENITIES
// ============================================================================
// PUT /make-server-67caf26a/properties/:id/location-amenities
// Body: { amenities: string[] }
//
// ⚠️ REGRAS:
// - Se propertyType='individual' → PERMITIDO (editar)
// - Se propertyType='location-linked' → BLOQUEADO (read-only, herdadas do Location)

export async function updateLocationAmenities(c: Context) {
  try {
    const propertyId = c.req.param('id');
    const { amenities } = await c.req.json();

    logInfo(`Updating location amenities for property ${propertyId}`);

    // Validação
    if (!Array.isArray(amenities)) {
      return errorResponse(c, 'amenities must be an array', 400);
    }

    // Buscar propriedade
    const property = await kv.get<Property>(`property:${propertyId}`);
    
    if (!property) {
      return notFoundResponse(c, 'Property not found');
    }

    // 🔒 VERIFICAR PERMISSÃO
    if (property.propertyType === 'location-linked') {
      return errorResponse(
        c,
        'Cannot edit location amenities for location-linked properties. These amenities are inherited from the Location.',
        403
      );
    }

    // ✅ Propriedade individual - pode editar
    property.locationAmenities = amenities;
    property.updatedAt = new Date().toISOString();

    // Salvar
    await kv.set(`property:${propertyId}`, property);

    logInfo(`Location amenities updated for property ${propertyId}`);

    return successResponse(c, property, 'Location amenities updated successfully');

  } catch (error: any) {
    logError('Error updating location amenities:', error);
    return errorResponse(c, error.message);
  }
}

// ============================================================================
// ATUALIZAR LISTING AMENITIES
// ============================================================================
// PUT /make-server-67caf26a/properties/:id/listing-amenities
// Body: { amenities: string[] }
//
// ✅ SEMPRE PERMITIDO (ambos os tipos de propriedade)

export async function updateListingAmenities(c: Context) {
  try {
    const propertyId = c.req.param('id');
    const { amenities } = await c.req.json();

    logInfo(`Updating listing amenities for property ${propertyId}`);

    // Validação
    if (!Array.isArray(amenities)) {
      return errorResponse(c, 'amenities must be an array', 400);
    }

    // Buscar propriedade
    const property = await kv.get<Property>(`property:${propertyId}`);
    
    if (!property) {
      return notFoundResponse(c, 'Property not found');
    }

    // ✅ Sempre permitido
    property.listingAmenities = amenities;
    property.updatedAt = new Date().toISOString();

    // Atualizar também o campo deprecated 'amenities' para compatibilidade
    property.amenities = [...(property.locationAmenities || []), ...(property.listingAmenities || [])];

    // Salvar
    await kv.set(`property:${propertyId}`, property);

    logInfo(`Listing amenities updated for property ${propertyId}`);

    return successResponse(c, property, 'Listing amenities updated successfully');

  } catch (error: any) {
    logError('Error updating listing amenities:', error);
    return errorResponse(c, error.message);
  }
}

// ============================================================================
// OBTER AMENIDADES DE UMA PROPRIEDADE
// ============================================================================
// GET /make-server-67caf26a/properties/:id/amenities
//
// Retorna:
// {
//   locationAmenities: string[],
//   listingAmenities: string[],
//   canEditLocationAmenities: boolean,
//   canEditListingAmenities: boolean,
//   locationAmenitiesSource: 'property' | 'location'
// }

export async function getPropertyAmenities(c: Context) {
  try {
    const propertyId = c.req.param('id');

    logInfo(`Getting amenities for property ${propertyId}`);

    // Buscar propriedade
    const property = await kv.get<Property>(`property:${propertyId}`);
    
    if (!property) {
      return notFoundResponse(c, 'Property not found');
    }

    // Inicializar campos se não existirem
    if (!property.locationAmenities) property.locationAmenities = [];
    if (!property.listingAmenities) property.listingAmenities = [];

    // Determinar origem das location amenities
    let locationAmenitiesSource: 'property' | 'location' = 'property';
    let locationAmenities = property.locationAmenities;

    // Se é location-linked, buscar amenities do Location
    if (property.propertyType === 'location-linked' && property.locationId) {
      const location = await kv.get<any>(`location:${property.locationId}`);
      if (location && location.sharedAmenities) {
        locationAmenities = location.sharedAmenities;
        locationAmenitiesSource = 'location';
      }
    }

    const response = {
      locationAmenities,
      listingAmenities: property.listingAmenities,
      canEditLocationAmenities: property.propertyType === 'individual',
      canEditListingAmenities: true,
      locationAmenitiesSource,
      propertyType: property.propertyType,
    };

    return successResponse(c, response);

  } catch (error: any) {
    logError('Error getting property amenities:', error);
    return errorResponse(c, error.message);
  }
}
