// ============================================================================
// SEED DATA - 4 Imóveis para Testes de Reserva
// ============================================================================
// Baseado na imagem fornecida pelo usuário
// ============================================================================

import * as kv from './kv_store.tsx';
import type { Location, Property, Guest, Reservation } from './types.ts';
import { 
  getCurrentDateTime, 
  generateLocationId,
  generatePropertyId, 
  generateGuestId, 
  generateReservationId, 
  calculateNights 
} from './utils.ts';

export async function seedTestProperties() {
  console.log('🌱 Seeding database with 4 TEST PROPERTIES for Reservation Testing...');
  
  const now = getCurrentDateTime();

  // ============================================================================
  // STEP 1: CRIAR LOCATIONS
  // ============================================================================

  console.log('📍 Creating Locations...');

  const locations: Location[] = [
    // Location para Barra da Tijuca
    {
      id: generateLocationId(),
      name: 'Arraial Novo',
      code: 'ARR',
      address: {
        street: 'Av. das Américas',
        number: '4500',
        neighborhood: 'Barra da Tijuca',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zipCode: '22640-102',
        country: 'BR',
        coordinates: {
          lat: -23.0029,
          lng: -43.3186,
        },
      },
      sharedAmenities: ['estacionamento', 'area-lazer', 'churrasqueira', 'piscina'],
      buildingAccess: {
        type: 'portão automático',
        instructions: 'Código do portão será enviado antes do check-in',
        hasElevator: false,
        hasParking: true,
        parkingType: 'gratuito',
      },
      photos: [],
      coverPhoto: 'https://images.unsplash.com/photo-1744289262966-42527de2bddf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWFjaCUyMGhvdXNlJTIwYmFycmElMjB0aWp1Y2F8ZW58MXx8fHwxNzYxNDU5Mjg1fDA&ixlib=rb-4.1.0&q=80&w=1080',
      description: 'Condomínio residencial na Barra da Tijuca com infraestrutura completa.',
      showBuildingNumber: true,
      stats: {
        totalAccommodations: 0,
        activeAccommodations: 0,
      },
      createdAt: now,
      updatedAt: now,
      ownerId: 'user_123',
      isActive: true,
    },
    // Location para Itaúnas
    {
      id: generateLocationId(),
      name: 'Residencial Itaúnas Beach',
      code: 'ITA',
      address: {
        street: 'Rua Principal',
        number: '150',
        neighborhood: 'Centro',
        city: 'Conceição da Barra',
        state: 'ES',
        zipCode: '29960-000',
        country: 'BR',
        coordinates: {
          lat: -18.4167,
          lng: -39.7167,
        },
      },
      sharedAmenities: ['estacionamento', 'area-verde', 'churrasqueira'],
      buildingAccess: {
        type: 'portão',
        instructions: 'Portão manual com chave. Chave disponível na recepção.',
        hasElevator: false,
        hasParking: true,
        parkingType: 'gratuito',
      },
      photos: [],
      coverPhoto: 'https://images.unsplash.com/photo-1672668798339-577dfd762e2c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWFjaCUyMGhvdXNlJTIwaXRhdW5hc3xlbnwxfHx8fDE3NjE0NTkyODZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
      description: 'Casas de praia em Itaúnas, próximo às dunas e ao mar.',
      showBuildingNumber: false,
      stats: {
        totalAccommodations: 0,
        activeAccommodations: 0,
      },
      createdAt: now,
      updatedAt: now,
      ownerId: 'user_123',
      isActive: true,
    },
    // Location para Centro - RJ (Studio)
    {
      id: generateLocationId(),
      name: 'Edifício Centro Business',
      code: 'CTR',
      address: {
        street: 'Av. Rio Branco',
        number: '156',
        neighborhood: 'Centro',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zipCode: '20040-901',
        country: 'BR',
        coordinates: {
          lat: -22.9035,
          lng: -43.1808,
        },
      },
      sharedAmenities: ['elevador', 'portaria-24h', 'seguranca'],
      buildingAccess: {
        type: 'portaria',
        instructions: 'Apresentar documento na portaria. Acesso ao apartamento pelo elevador.',
        hasElevator: true,
        hasParking: false,
        parkingType: 'indisponível',
      },
      photos: [],
      coverPhoto: 'https://images.unsplash.com/photo-1633505765486-e404bbbec654?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBzdHVkaW8lMjBhcGFydG1lbnR8ZW58MXx8fHwxNzYxNDM0OTIwfDA&ixlib=rb-4.1.0&q=80&w=1080',
      description: 'Edifício comercial com studios residenciais no Centro do Rio.',
      showBuildingNumber: true,
      stats: {
        totalAccommodations: 0,
        activeAccommodations: 0,
      },
      createdAt: now,
      updatedAt: now,
      ownerId: 'user_123',
      isActive: true,
    },
    // Location para Maricá
    {
      id: generateLocationId(),
      name: 'Reserva Maricá',
      code: 'MAR',
      address: {
        street: 'Estrada da Barra',
        number: '200',
        neighborhood: 'Itaipuaçu',
        city: 'Maricá',
        state: 'RJ',
        zipCode: '24930-000',
        country: 'BR',
        coordinates: {
          lat: -22.9528,
          lng: -43.0300,
        },
      },
      sharedAmenities: ['piscina', 'churrasqueira', 'area-verde', 'estacionamento', 'playground'],
      buildingAccess: {
        type: 'portão automático',
        instructions: 'Condomínio fechado. Código será enviado 24h antes do check-in.',
        hasElevator: false,
        hasParking: true,
        parkingType: 'gratuito',
      },
      photos: [],
      coverPhoto: 'https://images.unsplash.com/photo-1654559595621-27e662e1bf3c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWFjaCUyMGhvdXNlJTIwbWFyaWNhfGVufDF8fHx8MTc2MTQ1OTI4Nnww&ixlib=rb-4.1.0&q=80&w=1080',
      description: 'Condomínio de casas de alto padrão em Maricá, próximo à praia.',
      showBuildingNumber: false,
      stats: {
        totalAccommodations: 0,
        activeAccommodations: 0,
      },
      createdAt: now,
      updatedAt: now,
      ownerId: 'user_123',
      isActive: true,
    },
  ];

  // Salvar locations
  for (const location of locations) {
    await kv.set(`location:${location.id}`, location);
    console.log(`✅ Location created: ${location.name} (${location.code})`);
  }

  // ============================================================================
  // STEP 2: CRIAR OS 4 IMÓVEIS PARA TESTE
  // ============================================================================

  console.log('\n🏠 Creating 4 Test Properties...');

  const properties: Property[] = [
    // 1. ARRAIAL NOVO - BARRA DA TIJUCA RJ
    {
      id: generatePropertyId(),
      name: 'Arraial Novo - Barra da Tijuca RJ',
      code: 'ARR001',
      type: 'house',
      status: 'active',
      locationId: locations[0].id, // 🔗 Vinculado ao Arraial Novo
      address: {
        street: locations[0].address.street,
        number: locations[0].address.number,
        complement: 'Casa',
        neighborhood: locations[0].address.neighborhood,
        city: locations[0].address.city,
        state: locations[0].address.state,
        zipCode: locations[0].address.zipCode,
        country: locations[0].address.country,
      },
      maxGuests: 8,
      bedrooms: 4,
      beds: 5,
      bathrooms: 3,
      area: 200,
      pricing: {
        basePrice: 65000, // R$ 650,00 por noite
        currency: 'BRL',
        weeklyDiscount: 10,
        biweeklyDiscount: 15,
        monthlyDiscount: 20,
      },
      restrictions: {
        minNights: 2,
        maxNights: 365,
        advanceBooking: 0,
        preparationTime: 1,
      },
      amenities: ['wifi', 'ar-condicionado', 'tv', 'cozinha', 'piscina', 'churrasqueira', 'estacionamento', 'area-lazer'],
      tags: ['praia', 'familia', 'piscina', 'barra'],
      folder: undefined,
      color: '#FF6B6B',
      photos: ['https://images.unsplash.com/photo-1744289262966-42527de2bddf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWFjaCUyMGhvdXNlJTIwYmFycmElMjB0aWp1Y2F8ZW58MXx8fHwxNzYxNDU5Mjg1fDA&ixlib=rb-4.1.0&q=80&w=1080'],
      coverPhoto: 'https://images.unsplash.com/photo-1744289262966-42527de2bddf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWFjaCUyMGhvdXNlJTIwYmFycmElMjB0aWp1Y2F8ZW58MXx8fHwxNzYxNDU5Mjg1fDA&ixlib=rb-4.1.0&q=80&w=1080',
      description: 'Casa ampla e confortável no Arraial Novo, Barra da Tijuca. Perfeita para famílias, com piscina, churrasqueira e área de lazer completa. Próximo às principais praias e shoppings da Barra.',
      shortDescription: 'Casa 4 quartos com piscina',
      platforms: {
        airbnb: {
          enabled: true,
          listingId: 'ARR-ABN-001',
          syncEnabled: true,
        },
        booking: {
          enabled: true,
          listingId: 'ARR-BKG-001',
          syncEnabled: true,
        },
        direct: true,
      },
      createdAt: now,
      updatedAt: now,
      ownerId: 'user_123',
      isActive: true,
    },

    // 2. CASA 003 - ITAÚNAS RJ (ES na verdade)
    {
      id: generatePropertyId(),
      name: 'Casa 003 - Itaúnas RJ',
      code: 'ITA003',
      type: 'house',
      status: 'active',
      locationId: locations[1].id, // 🔗 Vinculado ao Residencial Itaúnas Beach
      address: {
        street: locations[1].address.street,
        number: locations[1].address.number,
        complement: 'Casa 003',
        neighborhood: locations[1].address.neighborhood,
        city: locations[1].address.city,
        state: locations[1].address.state,
        zipCode: locations[1].address.zipCode,
        country: locations[1].address.country,
      },
      maxGuests: 6,
      bedrooms: 3,
      beds: 4,
      bathrooms: 2,
      area: 150,
      pricing: {
        basePrice: 45000, // R$ 450,00 por noite
        currency: 'BRL',
        weeklyDiscount: 12,
        biweeklyDiscount: 18,
        monthlyDiscount: 25,
      },
      restrictions: {
        minNights: 3,
        maxNights: 365,
        advanceBooking: 0,
        preparationTime: 1,
      },
      amenities: ['wifi', 'ventilador', 'tv', 'cozinha', 'churrasqueira', 'estacionamento', 'varanda'],
      tags: ['praia', 'natureza', 'itaunas', 'familia'],
      folder: undefined,
      color: '#4ECDC4',
      photos: ['https://images.unsplash.com/photo-1672668798339-577dfd762e2c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWFjaCUyMGhvdXNlJTIwaXRhdW5hc3xlbnwxfHx8fDE3NjE0NTkyODZ8MA&ixlib=rb-4.1.0&q=80&w=1080'],
      coverPhoto: 'https://images.unsplash.com/photo-1672668798339-577dfd762e2c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWFjaCUyMGhvdXNlJTIwaXRhdW5hc3xlbnwxfHx8fDE3NjE0NTkyODZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
      description: 'Casa de praia em Itaúnas, próxima às famosas dunas e ao mar. Ambiente rústico e aconchegante, ideal para quem busca contato com a natureza. Ótima para famílias e grupos de amigos.',
      shortDescription: 'Casa 3 quartos próxima às dunas',
      platforms: {
        airbnb: {
          enabled: true,
          listingId: 'ITA-ABN-003',
          syncEnabled: true,
        },
        direct: true,
      },
      createdAt: now,
      updatedAt: now,
      ownerId: 'user_123',
      isActive: true,
    },

    // 3. STUDIO CENTRO - RJ
    {
      id: generatePropertyId(),
      name: 'Studio Centro - RJ',
      code: 'CTR101',
      type: 'apartment',
      status: 'active',
      locationId: locations[2].id, // 🔗 Vinculado ao Edifício Centro Business
      address: {
        street: locations[2].address.street,
        number: locations[2].address.number,
        complement: 'Apartamento 101',
        neighborhood: locations[2].address.neighborhood,
        city: locations[2].address.city,
        state: locations[2].address.state,
        zipCode: locations[2].address.zipCode,
        country: locations[2].address.country,
      },
      maxGuests: 2,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      area: 35,
      pricing: {
        basePrice: 22000, // R$ 220,00 por noite
        currency: 'BRL',
        weeklyDiscount: 15,
        biweeklyDiscount: 20,
        monthlyDiscount: 30,
      },
      restrictions: {
        minNights: 1,
        maxNights: 365,
        advanceBooking: 0,
        preparationTime: 0,
      },
      amenities: ['wifi', 'ar-condicionado', 'tv', 'cozinha-compacta', 'area-trabalho', 'mesa-escritorio'],
      tags: ['centro', 'negocios', 'trabalho', 'wifi-rapido'],
      folder: undefined,
      color: '#95E1D3',
      photos: ['https://images.unsplash.com/photo-1633505765486-e404bbbec654?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBzdHVkaW8lMjBhcGFydG1lbnR8ZW58MXx8fHwxNzYxNDM0OTIwfDA&ixlib=rb-4.1.0&q=80&w=1080'],
      coverPhoto: 'https://images.unsplash.com/photo-1633505765486-e404bbbec654?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBzdHVkaW8lMjBhcGFydG1lbnR8ZW58MXx8fHwxNzYxNDM0OTIwfDA&ixlib=rb-4.1.0&q=80&w=1080',
      description: 'Studio moderno no Centro do Rio, ideal para viagens de negócios ou estadias curtas. Localização estratégica próximo ao metrô, restaurantes e principais pontos comerciais da cidade.',
      shortDescription: 'Studio moderno para negócios',
      platforms: {
        airbnb: {
          enabled: true,
          listingId: 'CTR-ABN-101',
          syncEnabled: true,
        },
        booking: {
          enabled: true,
          listingId: 'CTR-BKG-101',
          syncEnabled: true,
        },
        direct: true,
      },
      createdAt: now,
      updatedAt: now,
      ownerId: 'user_123',
      isActive: true,
    },

    // 4. MARICÁ - RESERVA TIPO CASA
    {
      id: generatePropertyId(),
      name: 'MARICÁ - RESERVA TIPO CASA',
      code: 'MAR001',
      type: 'house',
      status: 'active',
      locationId: locations[3].id, // 🔗 Vinculado ao Reserva Maricá
      address: {
        street: locations[3].address.street,
        number: locations[3].address.number,
        complement: 'Casa',
        neighborhood: locations[3].address.neighborhood,
        city: locations[3].address.city,
        state: locations[3].address.state,
        zipCode: locations[3].address.zipCode,
        country: locations[3].address.country,
      },
      maxGuests: 10,
      bedrooms: 5,
      beds: 6,
      bathrooms: 4,
      area: 280,
      pricing: {
        basePrice: 85000, // R$ 850,00 por noite
        currency: 'BRL',
        weeklyDiscount: 10,
        biweeklyDiscount: 15,
        monthlyDiscount: 25,
      },
      restrictions: {
        minNights: 2,
        maxNights: 365,
        advanceBooking: 1,
        preparationTime: 2,
      },
      amenities: ['wifi', 'ar-condicionado', 'tv', 'cozinha', 'piscina-privada', 'churrasqueira', 'estacionamento', 'area-lazer', 'playground', 'vista-mar'],
      tags: ['praia', 'familia', 'luxo', 'piscina', 'marica', 'eventos'],
      folder: undefined,
      color: '#F38181',
      photos: ['https://images.unsplash.com/photo-1654559595621-27e662e1bf3c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWFjaCUyMGhvdXNlJTIwbWFyaWNhfGVufDF8fHx8MTc2MTQ1OTI4Nnww&ixlib=rb-4.1.0&q=80&w=1080'],
      coverPhoto: 'https://images.unsplash.com/photo-1654559595621-27e662e1bf3c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWFjaCUyMGhvdXNlJTIwbWFyaWNhfGVufDF8fHx8MTc2MTQ1OTI4Nnww&ixlib=rb-4.1.0&q=80&w=1080',
      description: 'Casa de alto padrão em condomínio fechado em Maricá. Espaçosa e luxuosa, com piscina privativa, churrasqueira e área de lazer completa. Vista para o mar e próxima às melhores praias da região. Ideal para grandes famílias e eventos especiais.',
      shortDescription: 'Casa de luxo 5 quartos com piscina',
      platforms: {
        airbnb: {
          enabled: true,
          listingId: 'MAR-ABN-001',
          syncEnabled: true,
        },
        booking: {
          enabled: true,
          listingId: 'MAR-BKG-001',
          syncEnabled: true,
        },
        decolar: {
          enabled: true,
          listingId: 'MAR-DEC-001',
          syncEnabled: true,
        },
        direct: true,
      },
      createdAt: now,
      updatedAt: now,
      ownerId: 'user_123',
      isActive: true,
    },
  ];

  // Salvar properties
  for (const property of properties) {
    await kv.set(`property:${property.id}`, property);
    const locationInfo = property.locationId 
      ? `(vinculado a ${locations.find(l => l.id === property.locationId)?.name})`
      : '(standalone)';
    console.log(`✅ Property created: ${property.name} ${locationInfo}`);
  }

  // ============================================================================
  // STEP 3: CRIAR HÓSPEDES PARA TESTES
  // ============================================================================

  console.log('\n👥 Creating Test Guests...');

  const guests: Guest[] = [
    {
      id: generateGuestId(),
      firstName: 'Carlos',
      lastName: 'Oliveira',
      fullName: 'Carlos Oliveira',
      email: 'carlos.oliveira@email.com',
      phone: '+5521987654321',
      cpf: '11122233344',
      stats: {
        totalReservations: 0,
        totalNights: 0,
        totalSpent: 0,
      },
      tags: ['frequente'],
      isBlacklisted: false,
      notes: 'Cliente confiável',
      createdAt: now,
      updatedAt: now,
      source: 'airbnb',
    },
    {
      id: generateGuestId(),
      firstName: 'Ana',
      lastName: 'Costa',
      fullName: 'Ana Costa',
      email: 'ana.costa@email.com',
      phone: '+5521999888777',
      cpf: '55566677788',
      stats: {
        totalReservations: 0,
        totalNights: 0,
        totalSpent: 0,
      },
      tags: [],
      isBlacklisted: false,
      createdAt: now,
      updatedAt: now,
      source: 'booking',
    },
    {
      id: generateGuestId(),
      firstName: 'Roberto',
      lastName: 'Silva',
      fullName: 'Roberto Silva',
      email: 'roberto.silva@email.com',
      phone: '+5521988776655',
      stats: {
        totalReservations: 0,
        totalNights: 0,
        totalSpent: 0,
      },
      tags: [],
      isBlacklisted: false,
      createdAt: now,
      updatedAt: now,
      source: 'direct',
    },
  ];

  for (const guest of guests) {
    await kv.set(`guest:${guest.id}`, guest);
    console.log(`✅ Guest created: ${guest.fullName}`);
  }

  // ============================================================================
  // STEP 4: CRIAR RESERVA DE TESTE DO AIRBNB (24-26 JAN)
  // ============================================================================

  console.log('\\n📅 Creating Airbnb Test Reservation (Jan 24-26)...');

  const reservations: Reservation[] = [
    {
      id: generateReservationId(),
      propertyId: properties[0].id, // Arraial Novo - Barra da Tijuca
      guestId: guests[0].id, // Carlos Oliveira
      checkIn: '2025-01-24',
      checkOut: '2025-01-27', // 3 noites (24→25, 25→26, 26→27)
      nights: 3,
      guests: {
        adults: 4,
        children: 2,
        infants: 0,
        pets: 0,
        total: 6,
      },
      status: 'confirmed',
      platform: 'airbnb',
      pricing: {
        pricePerNight: 65000, // R$ 650,00
        baseTotal: 195000, // R$ 1.950,00
        cleaningFee: 15000, // R$ 150,00
        serviceFee: 29250, // R$ 292,50 (15%)
        taxes: 0,
        discount: 0,
        total: 239250, // R$ 2.392,50
        currency: 'BRL',
        appliedTier: 'base',
      },
      payment: {
        status: 'paid',
        method: 'platform',
        transactionId: 'HMABCSN9XY',
      },
      notes: 'Reserva de teste criada automaticamente - Airbnb',
      createdAt: '2025-01-20T10:30:00Z',
      updatedAt: now,
      createdBy: 'system',
    },
  ];

  for (const reservation of reservations) {
    await kv.set(`reservation:${reservation.id}`, reservation);
    const guest = guests.find(g => g.id === reservation.guestId);
    const property = properties.find(p => p.id === reservation.propertyId);
    console.log(`✅ Reservation created: ${guest?.fullName} at ${property?.name}`);
    console.log(`   📍 Platform: ${reservation.platform.toUpperCase()}`);
    console.log(`   📅 Dates: ${reservation.checkIn} → ${reservation.checkOut} (${reservation.nights} nights)`);
    console.log(`   💰 Total: R$ ${(reservation.pricing.total / 100).toFixed(2)}`);
  }

  console.log('');
  console.log('🎉 Test database seeded successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   - ${locations.length} locations`);
  console.log(`   - ${properties.length} properties`);
  console.log(`   - ${guests.length} guests`);
  console.log(`   - ${reservations.length} reservations`);
  console.log('');
  console.log('✨ Propriedades criadas:');
  console.log('   1. Arraial Novo - Barra da Tijuca RJ (Casa)');
  console.log('   2. Casa 003 - Itaúnas RJ (Casa)');
  console.log('   3. Studio Centro - RJ (Apartamento)');
  console.log('   4. MARICÁ - RESERVA TIPO CASA (Casa)');
  console.log('');
  console.log('🔥 Reservas de teste:');
  console.log('   ✈️ Airbnb: Jan 24-27 (3 noites) - Arraial Novo - Carlos Oliveira');
  console.log('');

  return {
    locations,
    properties,
    guests,
    reservations,
  };
}

// Se executado diretamente
if (import.meta.main) {
  await seedTestProperties();
}
