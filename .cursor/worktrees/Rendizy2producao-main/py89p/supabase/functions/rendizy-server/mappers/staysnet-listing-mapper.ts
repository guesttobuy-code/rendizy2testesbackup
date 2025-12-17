/**
 * Stays.net Listing to Property Mapper
 * 
 * Converte listings (anúncios) da Stays.net para Properties do Rendizy
 * 
 * @version 1.0.0
 * @updated 2025-11-22
 */

import type { Property } from '../types.ts';
import { staysNetListingToPlatformInfo } from './staysnet-property-mapper.ts';
import type { StaysNetListing } from './staysnet-property-mapper.ts';

/**
 * Converte listing (anúncio) da Stays.net para Property do Rendizy
 */
export function staysNetListingToRendizyProperty(
  staysListing: StaysNetListing,
  organizationId: string,
  ownerId: string = 'system'
): Property {
  // Extrair nome (priorizar título traduzido)
  const name = staysListing._mstitle?.pt_BR || 
               staysListing._mstitle?.en_US || 
               staysListing.internalName || 
               'Propriedade sem nome';
  
  // Extrair descrição
  const description = staysListing._msdesc?.pt_BR || 
                      staysListing._msdesc?.en_US || 
                      undefined;
  
  // Extrair tipo
  const type = staysListing._t_typeMeta?._mstitle?.pt_BR?.toLowerCase() || 
               staysListing._t_propertyTypeMeta?._mstitle?.pt_BR?.toLowerCase() || 
               'apartment';
  
  // Mapear tipo
  let propertyType = 'apartment';
  if (type.includes('casa') || type.includes('house')) {
    propertyType = 'house';
  } else if (type.includes('quarto') || type.includes('room')) {
    propertyType = 'room';
  }
  
  // Extrair endereço
  const address = staysListing.address ? {
    street: staysListing.address.street || '',
    number: staysListing.address.streetNumber || '',
    complement: staysListing.address.additional,
    neighborhood: staysListing.address.region || '',
    city: staysListing.address.city || '',
    state: staysListing.address.stateCode || staysListing.address.state || '',
    zipCode: staysListing.address.zip || '',
    country: staysListing.address.countryCode || 'BR',
  } : undefined;
  
  // Extrair foto principal
  const coverPhoto = staysListing._t_mainImageMeta?.url || undefined;
  
  const property: Property = {
    id: staysListing._id || staysListing.id || crypto.randomUUID(),
    name,
    code: staysListing.id || '',
    type: propertyType,
    status: staysListing.status === 'active' ? 'active' : 'draft',
    locationId: undefined,
    propertyType: 'individual',
    address,
    maxGuests: staysListing._i_maxGuests || 2,
    bedrooms: staysListing._i_rooms || 0,
    beds: staysListing._i_beds || 0,
    bathrooms: Math.floor(staysListing._f_bathrooms || 0),
    area: staysListing._f_square,
    pricing: {
      basePrice: 0, // Não disponível no listing
      currency: staysListing.deff_curr || 'BRL',
      weeklyDiscount: 0,
      biweeklyDiscount: 0,
      monthlyDiscount: 0,
    },
    restrictions: {
      minNights: 1,
      maxNights: 365,
      advanceBooking: 0,
      preparationTime: 0,
    },
    amenities: [], // Não disponível diretamente no listing
    tags: [],
    photos: coverPhoto ? [coverPhoto] : [],
    locationAmenities: [],
    listingAmenities: [],
    folder: undefined,
    color: undefined,
    coverPhoto,
    description,
    shortDescription: staysListing._mstitle?.pt_BR || staysListing._mstitle?.en_US,
    platforms: {
      direct: staysListing.otaChannels?.some(ch => ch.name?.toLowerCase().includes('website')) || false,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerId,
    isActive: staysListing.status === 'active',
  };
  
  // Adicionar plataformas de OTA
  if (staysListing.otaChannels) {
    for (const channel of staysListing.otaChannels) {
      const channelName = (channel.name || '').toLowerCase();
      if (channelName.includes('airbnb')) {
        property.platforms.airbnb = {
          enabled: true,
          listingId: '',
          syncEnabled: true,
        };
      } else if (channelName.includes('booking')) {
        property.platforms.booking = {
          enabled: true,
          listingId: '',
          syncEnabled: true,
        };
      }
    }
  }
  
  return property;
}

