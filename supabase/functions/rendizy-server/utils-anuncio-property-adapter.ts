/**
 * Adapter de Compatibilidade: properties ↔ Property (legado)
 * 
 * ============================================================================
 * CONTEXTO (2026-01-06):
 * ============================================================================
 * A tabela `properties` foi REMOVIDA do banco.
 * O sistema agora usa `properties` como fonte de verdade.
 * 
 * Este adapter permite que rotas antigas que esperavam o formato `Property`
 * continuem funcionando, lendo/escrevendo em `properties`.
 * 
 * ============================================================================
 * MAPEAMENTO DE CAMPOS:
 * ============================================================================
 * | Campo Property (legado)     | Campo properties                   |
 * |-----------------------------|-------------------------------------------|
 * | id                          | id                                        |
 * | organization_id             | organization_id                           |
 * | name                        | data.name / data.title                    |
 * | code                        | data.codigo / data.propertyCode           |
 * | type                        | data.type / data.tipoAcomodacao           |
 * | status                      | status                                    |
 * | address_city                | data.address.city / data.cidade           |
 * | address_state               | data.address.state / data.sigla_estado    |
 * | pricing_base_price          | data.pricing.dailyRate / data.basePrice   |
 * | bedrooms                    | data.bedrooms / data.quartos              |
 * | bathrooms                   | data.bathrooms / data.banheiros           |
 * | max_guests                  | data.guests / data.maxGuests              |
 * | photos                      | data.photos / data.fotos                  |
 * | cover_photo                 | data.coverPhoto / data.fotoPrincipal      |
 * | amenities                   | data.amenities / data.comodidades         |
 * | wizard_data                 | data (todo o objeto)                      |
 * ============================================================================
 */

import type { Property } from "./types.ts";

/**
 * Campos a selecionar de properties para adaptar para Property
 */
export const ANUNCIO_SELECT_FOR_PROPERTY = `
  id,
  organization_id,
  user_id,
  owner_contact_id,
  status,
  title,
  data,
  completion_percentage,
  step_completed,
  created_at,
  updated_at
`.replace(/\s+/g, " ").trim();

/**
 * Converte um registro de properties para o formato Property (legado)
 * 
 * @param row - Registro de properties
 * @returns Objeto Property compatível com API antiga + organizationId extra
 * @note Retorna any para evitar problemas de tipagem com organizationId extra
 */
export function anuncioToProperty(row: any): any {
  const d = row?.data || {};
  
  // Normalizar campos que podem ter nomes diferentes
  const name = d.name || d.title || d.internalId || row.title || "Sem nome";
  const code = d.codigo || d.propertyCode || d.code || d.externalIds?.staysnet_listing_code || row.id;
  const type = d.type || d.tipoAcomodacao || d.tipoLocal || d.propertyType || "house";
  
  // Endereço
  const address = {
    street: d.address?.street || d.rua || "",
    number: d.address?.number || d.numero || "",
    complement: d.address?.complement || d.complemento || undefined,
    neighborhood: d.address?.neighborhood || d.bairro || "",
    city: d.address?.city || d.cidade || "",
    state: d.address?.state || d.sigla_estado || d.estado || "",
    zipCode: d.address?.zipCode || d.cep || "",
    country: d.address?.country || d.pais || "BR",
  };
  
  // Capacidade
  const bedrooms = Number(d.bedrooms ?? d.quartos ?? 0) || 0;
  const bathrooms = Number(d.bathrooms ?? d.banheiros ?? 0) || 0;
  const maxGuests = Number(d.guests ?? d.maxGuests ?? d.max_guests ?? d.hospedes ?? 0) || 0;
  const beds = Number(d.beds ?? d.camas ?? 0) || 0;
  const area = Number(d.area ?? 0) || undefined;
  
  // Preços
  const pricing = {
    basePrice: Number(d.pricing?.dailyRate ?? d.pricing?.basePrice ?? d.basePrice ?? d.dailyRate ?? 0) || 0,
    currency: d.pricing?.currency || d.currency || "BRL",
    weeklyDiscount: Number(d.pricing?.weeklyDiscount ?? 0) || 0,
    biweeklyDiscount: Number(d.pricing?.biweeklyDiscount ?? 0) || 0,
    monthlyDiscount: Number(d.pricing?.monthlyDiscount ?? 0) || 0,
  };
  
  // Fotos
  const photos = Array.isArray(d.photos) 
    ? d.photos 
    : Array.isArray(d.fotos) 
      ? d.fotos 
      : [];
  const coverPhoto = d.coverPhoto || d.fotoPrincipal || (photos.length > 0 ? photos[0] : undefined);
  
  // Amenities
  const amenities = Array.isArray(d.comodidades) 
    ? d.comodidades 
    : Array.isArray(d.amenities) 
      ? d.amenities 
      : Array.isArray(d.comodidadesStaysnetIds) 
        ? d.comodidadesStaysnetIds 
        : [];
  
  // Tags
  const tags = Array.isArray(d.tags) ? d.tags : [];
  
  // Descrição
  const description = d.description || d.descricao || "";
  const shortDescription = d.shortDescription || d.descricaoCurta || "";
  
  // Restrições
  const restrictions = {
    minNights: Number(d.restrictions?.minNights ?? d.minNights ?? 1) || 1,
    maxNights: Number(d.restrictions?.maxNights ?? d.maxNights ?? 365) || 365,
    advanceBooking: Number(d.restrictions?.advanceBooking ?? 0) || 0,
    preparationTime: Number(d.restrictions?.preparationTime ?? 0) || 0,
  };
  
  // Plataformas
  const platforms = {
    airbnb: d.platforms?.airbnb || undefined,
    booking: d.platforms?.booking || undefined,
    decolar: d.platforms?.decolar || undefined,
    direct: d.platforms?.direct !== false,
  };
  
  const result: any = {
    id: row.id,
    name,
    code,
    type,
    status: row.status || d.status || "active",
    locationId: d.locationId || d.location_id || undefined,
    propertyType: d.propertyType || "individual",
    
    address,
    
    maxGuests,
    bedrooms,
    beds,
    bathrooms,
    area,
    
    pricing,
    restrictions,
    
    amenities,
    tags,
    photos,
    locationAmenities: [],
    listingAmenities: amenities,
    
    folder: d.folder || undefined,
    color: d.color || undefined,
    coverPhoto,
    
    description,
    shortDescription,
    
    platforms,
    
    // Sistema de wizard - todo o data vai aqui
    wizardData: d,
    completionPercentage: row.completion_percentage || 0,
    completedSteps: d.completedSteps || [],
    
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    ownerId: row.user_id || "system",
    isActive: row.status === "active" || row.status === "published",
  };
  
  // Campo extra para rastreabilidade (fora do literal para evitar erro de tipo)
  result.organizationId = row.organization_id;
  result.owner_contact_id = row.owner_contact_id || null; // FK para crm_contacts (proprietário)
  
  return result;
}

/**
 * Converte dados no formato Property (legado) para o formato properties
 * 
 * @param property - Objeto Property
 * @param organizationId - ID da organização
 * @param userId - ID do usuário (opcional)
 * @returns Objeto pronto para inserir/atualizar em properties
 */
export function propertyToAnuncio(
  property: Partial<Property>, 
  organizationId: string,
  userId?: string
): any {
  // Construir o objeto data JSONB
  const data: any = {
    // Identificação
    name: property.name,
    title: property.name, // Duplicar para compatibilidade
    codigo: property.code,
    propertyCode: property.code,
    type: property.type,
    
    // Endereço
    address: property.address || {},
    cidade: property.address?.city,
    sigla_estado: property.address?.state,
    
    // Capacidade
    bedrooms: property.bedrooms || 0,
    quartos: property.bedrooms || 0,
    bathrooms: property.bathrooms || 0,
    banheiros: property.bathrooms || 0,
    beds: property.beds || 0,
    guests: property.maxGuests || 0,
    maxGuests: property.maxGuests || 0,
    area: property.area,
    
    // Preços
    pricing: property.pricing || { basePrice: 0, currency: "BRL" },
    basePrice: property.pricing?.basePrice || 0,
    dailyRate: property.pricing?.basePrice || 0,
    
    // Descrição
    description: property.description,
    shortDescription: property.shortDescription,
    
    // Mídia
    photos: property.photos || [],
    coverPhoto: property.coverPhoto,
    
    // Comodidades
    amenities: property.amenities || [],
    comodidades: property.amenities || [],
    
    // Tags
    tags: property.tags || [],
    
    // Organização
    folder: property.folder,
    color: property.color,
    
    // Restrições
    restrictions: property.restrictions,
    minNights: property.restrictions?.minNights || 1,
    maxNights: property.restrictions?.maxNights || 365,
    
    // Plataformas
    platforms: property.platforms,
    
    // Location
    locationId: property.locationId,
    
    // Metadados
    propertyType: property.propertyType || "individual",
    completedSteps: property.completedSteps || [],
    
    // Preservar dados existentes do wizard se houver
    ...(property.wizardData || {}),
  };
  
  return {
    id: property.id, // Pode ser undefined para INSERT (banco gera UUID)
    organization_id: organizationId,
    user_id: userId || null,
    owner_contact_id: (property as any).owner_contact_id || null, // FK para crm_contacts (proprietário)
    status: property.status || "draft",
    title: property.name || "Sem nome",
    data,
    completion_percentage: property.completionPercentage || 0,
    step_completed: Math.floor((property.completionPercentage || 0) / 10),
    created_at: property.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Converte dados de atualização parcial para formato properties
 * Usado em PATCH/UPDATE
 */
export function propertyUpdateToAnuncioUpdate(updates: Partial<Property>): any {
  const result: any = {
    updated_at: new Date().toISOString(),
  };
  
  // Status é coluna separada
  if (updates.status !== undefined) {
    result.status = updates.status;
  }
  
  // Title é coluna separada
  if (updates.name !== undefined) {
    result.title = updates.name;
  }
  
  // Completion percentage é coluna separada
  if (updates.completionPercentage !== undefined) {
    result.completion_percentage = updates.completionPercentage;
  }
  
  // owner_contact_id é coluna separada (FK para crm_contacts)
  if ((updates as any).owner_contact_id !== undefined) {
    result.owner_contact_id = (updates as any).owner_contact_id;
  }
  
  // Tudo mais vai no data JSONB (será merged via JSONB functions)
  // NOTA: O chamador deve fazer o merge manualmente ou usar RPC
  
  return result;
}

/**
 * Gera SQL para update de campos JSONB no data
 * Retorna objeto que pode ser passado para .update()
 */
export function buildAnuncioDataUpdate(updates: Partial<Property>, existingData: any = {}): any {
  const newData = { ...existingData };
  
  // Atualizar campos no data
  if (updates.name !== undefined) {
    newData.name = updates.name;
    newData.title = updates.name;
  }
  if (updates.code !== undefined) {
    newData.codigo = updates.code;
    newData.propertyCode = updates.code;
  }
  if (updates.type !== undefined) {
    newData.type = updates.type;
  }
  if (updates.address !== undefined) {
    newData.address = updates.address;
    newData.cidade = updates.address.city;
    newData.sigla_estado = updates.address.state;
  }
  if (updates.bedrooms !== undefined) {
    newData.bedrooms = updates.bedrooms;
    newData.quartos = updates.bedrooms;
  }
  if (updates.bathrooms !== undefined) {
    newData.bathrooms = updates.bathrooms;
    newData.banheiros = updates.bathrooms;
  }
  if (updates.beds !== undefined) {
    newData.beds = updates.beds;
  }
  if (updates.maxGuests !== undefined) {
    newData.guests = updates.maxGuests;
    newData.maxGuests = updates.maxGuests;
  }
  if (updates.area !== undefined) {
    newData.area = updates.area;
  }
  if (updates.pricing !== undefined) {
    newData.pricing = updates.pricing;
    newData.basePrice = updates.pricing.basePrice;
    newData.dailyRate = updates.pricing.basePrice;
  }
  if (updates.description !== undefined) {
    newData.description = updates.description;
  }
  if (updates.shortDescription !== undefined) {
    newData.shortDescription = updates.shortDescription;
  }
  if (updates.photos !== undefined) {
    newData.photos = updates.photos;
  }
  if (updates.coverPhoto !== undefined) {
    newData.coverPhoto = updates.coverPhoto;
  }
  if (updates.amenities !== undefined) {
    newData.amenities = updates.amenities;
    newData.comodidades = updates.amenities;
  }
  if (updates.tags !== undefined) {
    newData.tags = updates.tags;
  }
  if (updates.folder !== undefined) {
    newData.folder = updates.folder;
  }
  if (updates.color !== undefined) {
    newData.color = updates.color;
  }
  if (updates.restrictions !== undefined) {
    newData.restrictions = updates.restrictions;
    newData.minNights = updates.restrictions.minNights;
    newData.maxNights = updates.restrictions.maxNights;
  }
  if (updates.platforms !== undefined) {
    newData.platforms = updates.platforms;
  }
  if (updates.locationId !== undefined) {
    newData.locationId = updates.locationId;
  }
  if (updates.completedSteps !== undefined) {
    newData.completedSteps = updates.completedSteps;
  }
  if (updates.wizardData !== undefined) {
    // Merge wizard data
    Object.assign(newData, updates.wizardData);
  }
  
  return newData;
}
