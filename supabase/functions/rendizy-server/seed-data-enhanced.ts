// ============================================================================
// SEED DATA - Dados de exemplo para testes (NOVA ESTRUTURA)
// ============================================================================
// Arquitetura: LOCATION → ACCOMMODATION (hierarquia de 2 níveis)
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

export async function seedDatabaseNew() {
  console.log('🌱 Seeding database with NEW STRUCTURE (Location → Accommodation)...');
  
  const now = getCurrentDateTime();

  // ============================================================================
  // STEP 1: CRIAR LOCATIONS (Prédios/Condomínios)
  // ============================================================================

  console.log('📍 Creating Locations...');

  const locations: Location[] = [
    {
      id: generateLocationId(),
      name: 'Edifício Copacabana Palace',
      code: 'COP',
      address: {
        street: 'Av. Atlântica',
        number: '1500',
        neighborhood: 'Copacabana',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zipCode: '22021-000',
        country: 'BR',
        coordinates: {
          lat: -22.9711,
          lng: -43.1822,
        },
      },
      sharedAmenities: ['piscina', 'academia', 'elevador', 'portaria-24h', 'salao-festas'],
      management: {
        company: 'Administradora Copacabana Ltda',
        manager: 'João Silva',
        phone: '+5521987654321',
        email: 'admin@copacabana.com.br',
      },
      buildingAccess: {
        type: 'portaria',
        instructions: 'Apresentar documento na portaria. Elevador social à direita.',
        hasElevator: true,
        hasParking: true,
        parkingType: 'pago',
      },
      photos: [],
      coverPhoto: undefined,
      description: 'Edifício de alto padrão em frente à praia de Copacabana, com segurança 24h e completa infraestrutura.',
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
    {
      id: generateLocationId(),
      name: 'Condomínio Ipanema Residence',
      code: 'IPA',
      address: {
        street: 'Rua Visconde de Pirajá',
        number: '500',
        neighborhood: 'Ipanema',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zipCode: '22410-000',
        country: 'BR',
        coordinates: {
          lat: -22.9838,
          lng: -43.1964,
        },
      },
      sharedAmenities: ['piscina', 'churrasqueira', 'playground', 'quadra-tenis', 'estacionamento'],
      management: {
        company: 'Síndico Profissional RJ',
        manager: 'Maria Santos',
        phone: '+5521999887766',
        email: 'contato@ipanemaresidence.com.br',
      },
      buildingAccess: {
        type: 'código',
        instructions: 'Portão automático com código. Após entrar, seguir até a casa indicada.',
        hasElevator: false,
        hasParking: true,
        parkingType: 'gratuito',
      },
      photos: [],
      coverPhoto: undefined,
      description: 'Condomínio residencial fechado com casas de alto padrão, área verde e completa segurança.',
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
    {
      id: generateLocationId(),
      name: 'Residencial Barra Beach',
      code: 'BAR',
      address: {
        street: 'Av. das Américas',
        number: '3000',
        neighborhood: 'Barra da Tijuca',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zipCode: '22640-000',
        country: 'BR',
        coordinates: {
          lat: -23.0029,
          lng: -43.3186,
        },
      },
      sharedAmenities: ['piscina-adulto', 'piscina-infantil', 'academia', 'sauna', 'elevador', 'portaria-24h'],
      management: {
        company: 'Barra Beach Administração',
        phone: '+5521988776655',
      },
      buildingAccess: {
        type: 'portaria',
        instructions: 'Apresentar documento na portaria principal.',
        hasElevator: true,
        hasParking: true,
        parkingType: 'gratuito',
      },
      photos: [],
      description: 'Condomínio resort com vista para o mar, próximo ao shopping e principais atrações da Barra.',
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
  ];

  // Salvar locations
  for (const location of locations) {
    await kv.set(`location:${location.id}`, location);
    console.log(`✅ Location created: ${location.name} (${location.code})`);
  }

  // ============================================================================
  // STEP 2: CRIAR ACCOMMODATIONS (Unidades vinculadas aos Locations)
  // ============================================================================

  console.log('\n🏠 Creating Accommodations...');

  const accommodations: Property[] = [
    // === COPACABANA PALACE ===
    {
      id: generatePropertyId(),
      name: 'Apartamento 201',
      code: 'COP201',
      type: 'apartment',
      status: 'active',
      locationId: locations[0].id, // 🔗 Vinculado ao Edifício Copacabana Palace
      address: {
        street: locations[0].address.street,
        number: locations[0].address.number,
        complement: 'Apto 201',
        neighborhood: locations[0].address.neighborhood,
        city: locations[0].address.city,
        state: locations[0].address.state,
        zipCode: locations[0].address.zipCode,
        country: locations[0].address.country,
      },
      maxGuests: 4,
      bedrooms: 2,
      beds: 2,
      bathrooms: 1,
      area: 65,
      pricing: {
        basePrice: 35000, // R$ 350,00 por noite
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
      amenities: ['wifi', 'ar-condicionado', 'tv', 'cozinha', 'vista-mar'],
      tags: ['praia', 'familia', 'luxo'],
      folder: undefined,
      color: '#3B82F6',
      photos: [],
      coverPhoto: undefined,
      description: 'Apartamento moderno com vista para o mar em Copacabana. 2 quartos, sala ampla, cozinha equipada.',
      shortDescription: 'Apto 2 quartos vista mar',
      platforms: {
        airbnb: {
          enabled: true,
          listingId: 'ABN123456',
          syncEnabled: true,
        },
        booking: {
          enabled: true,
          listingId: 'BKG789012',
          syncEnabled: true,
        },
        direct: true,
      },
      createdAt: now,
      updatedAt: now,
      ownerId: 'user_123',
      isActive: true,
    },
    {
      id: generatePropertyId(),
      name: 'Apartamento 305',
      code: 'COP305',
      type: 'apartment',
      status: 'active',
      locationId: locations[0].id, // 🔗 Vinculado ao Edifício Copacabana Palace
      address: {
        street: locations[0].address.street,
        number: locations[0].address.number,
        complement: 'Apto 305',
        neighborhood: locations[0].address.neighborhood,
        city: locations[0].address.city,
        state: locations[0].address.state,
        zipCode: locations[0].address.zipCode,
        country: locations[0].address.country,
      },
      maxGuests: 2,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      area: 45,
      pricing: {
        basePrice: 25000, // R$ 250,00 por noite
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
      amenities: ['wifi', 'ar-condicionado', 'tv', 'cozinha'],
      tags: ['praia', 'casal'],
      color: '#10B981',
      photos: [],
      description: 'Studio aconchegante em Copacabana, perfeito para casais.',
      platforms: {
        airbnb: {
          enabled: true,
          listingId: 'ABN123457',
          syncEnabled: true,
        },
        direct: true,
      },
      createdAt: now,
      updatedAt: now,
      ownerId: 'user_123',
      isActive: true,
    },

    // === IPANEMA RESIDENCE ===
    {
      id: generatePropertyId(),
      name: 'Casa 5',
      code: 'IPA005',
      type: 'house',
      status: 'active',
      locationId: locations[1].id, // 🔗 Vinculado ao Condomínio Ipanema Residence
      address: {
        street: locations[1].address.street,
        number: locations[1].address.number,
        complement: 'Casa 5',
        neighborhood: locations[1].address.neighborhood,
        city: locations[1].address.city,
        state: locations[1].address.state,
        zipCode: locations[1].address.zipCode,
        country: locations[1].address.country,
      },
      maxGuests: 8,
      bedrooms: 4,
      beds: 5,
      bathrooms: 3,
      area: 180,
      pricing: {
        basePrice: 80000, // R$ 800,00 por noite
        currency: 'BRL',
        weeklyDiscount: 12,
        biweeklyDiscount: 18,
        monthlyDiscount: 25,
      },
      restrictions: {
        minNights: 3,
        maxNights: 365,
        advanceBooking: 1,
        preparationTime: 2,
      },
      amenities: ['wifi', 'ar-condicionado', 'tv', 'cozinha', 'piscina-privada', 'churrasqueira', 'estacionamento'],
      tags: ['praia', 'familia', 'luxo', 'piscina'],
      color: '#F59E0B',
      photos: [],
      description: 'Casa de alto padrão com piscina privativa e churrasqueira em Ipanema.',
      platforms: {
        airbnb: {
          enabled: true,
          listingId: 'ABN456789',
          syncEnabled: true,
        },
        direct: true,
      },
      createdAt: now,
      updatedAt: now,
      ownerId: 'user_123',
      isActive: true,
    },

    // === BARRA BEACH ===
    {
      id: generatePropertyId(),
      name: 'Cobertura Duplex',
      code: 'BAR300',
      type: 'condo',
      status: 'active',
      locationId: locations[2].id, // 🔗 Vinculado ao Residencial Barra Beach
      address: {
        street: locations[2].address.street,
        number: locations[2].address.number,
        complement: 'Cobertura',
        neighborhood: locations[2].address.neighborhood,
        city: locations[2].address.city,
        state: locations[2].address.state,
        zipCode: locations[2].address.zipCode,
        country: locations[2].address.country,
      },
      maxGuests: 10,
      bedrooms: 5,
      beds: 6,
      bathrooms: 4,
      area: 250,
      pricing: {
        basePrice: 120000, // R$ 1.200,00 por noite
        currency: 'BRL',
        weeklyDiscount: 15,
        biweeklyDiscount: 20,
        monthlyDiscount: 30,
      },
      restrictions: {
        minNights: 5,
        maxNights: 365,
        advanceBooking: 2,
        preparationTime: 3,
      },
      amenities: ['wifi', 'ar-condicionado', 'tv', 'cozinha', 'piscina-privativa', 'jacuzzi', 'academia', 'estacionamento', 'vista-mar'],
      tags: ['praia', 'familia', 'luxo', 'eventos'],
      color: '#8B5CF6',
      photos: [],
      description: 'Cobertura de luxo com piscina privativa e vista panorâmica da Barra da Tijuca.',
      platforms: {
        airbnb: {
          enabled: true,
          listingId: 'ABN999888',
          syncEnabled: true,
        },
        booking: {
          enabled: true,
          listingId: 'BKG777666',
          syncEnabled: true,
        },
        decolar: {
          enabled: true,
          listingId: 'DEC555444',
          syncEnabled: true,
        },
        direct: true,
      },
      createdAt: now,
      updatedAt: now,
      ownerId: 'user_123',
      isActive: true,
    },

    // === UNIDADE STANDALONE (sem Location) ===
    {
      id: generatePropertyId(),
      name: 'Loft Botafogo Moderno',
      code: 'BOT050',
      type: 'loft',
      status: 'active',
      locationId: undefined, // ❌ Sem Location (compatibilidade)
      address: {
        street: 'Rua Voluntários da Pátria',
        number: '100',
        complement: 'Loft 5',
        neighborhood: 'Botafogo',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zipCode: '22270-000',
        country: 'BR',
      },
      maxGuests: 3,
      bedrooms: 1,
      beds: 2,
      bathrooms: 1,
      area: 50,
      pricing: {
        basePrice: 28000, // R$ 280,00 por noite
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
      amenities: ['wifi', 'ar-condicionado', 'tv', 'cozinha', 'area-trabalho'],
      tags: ['trabalho', 'moderno', 'wifi-rapido'],
      color: '#EC4899',
      photos: [],
      description: 'Loft moderno ideal para trabalho remoto em Botafogo.',
      platforms: {
        direct: true,
      },
      createdAt: now,
      updatedAt: now,
      ownerId: 'user_123',
      isActive: true,
    },
  ];

  // Salvar accommodations
  for (const accommodation of accommodations) {
    await kv.set(`property:${accommodation.id}`, accommodation);
    const locationInfo = accommodation.locationId 
      ? `(vinculado a ${locations.find(l => l.id === accommodation.locationId)?.name})`
      : '(standalone)';
    console.log(`✅ Accommodation created: ${accommodation.name} ${locationInfo}`);
  }

  // ============================================================================
  // STEP 3: CRIAR HÓSPEDES
  // ============================================================================

  console.log('\n👥 Creating Guests...');

  const guests: Guest[] = [
    {
      id: generateGuestId(),
      firstName: 'João',
      lastName: 'Silva',
      fullName: 'João Silva',
      email: 'joao.silva@email.com',
      phone: '+5521987654321',
      cpf: '12345678901',
      stats: {
        totalReservations: 0,
        totalNights: 0,
        totalSpent: 0,
      },
      tags: ['frequente', 'vip'],
      isBlacklisted: false,
      notes: 'Cliente VIP, sempre deixa tudo organizado',
      createdAt: now,
      updatedAt: now,
      source: 'airbnb',
    },
    {
      id: generateGuestId(),
      firstName: 'Maria',
      lastName: 'Santos',
      fullName: 'Maria Santos',
      email: 'maria.santos@email.com',
      phone: '+5511987654321',
      cpf: '98765432109',
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
  ];

  for (const guest of guests) {
    await kv.set(`guest:${guest.id}`, guest);
    console.log(`✅ Guest created: ${guest.fullName}`);
  }

  // ============================================================================
  // STEP 4: CRIAR RESERVAS
  // ============================================================================

  console.log('\n📅 Creating Reservations...');

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const reservations: Reservation[] = [
    {
      id: generateReservationId(),
      propertyId: accommodations[0].id, // Copacabana 201
      guestId: guests[0].id,
      checkIn: formatDate(tomorrow),
      checkOut: formatDate(new Date(tomorrow.getTime() + 3 * 24 * 60 * 60 * 1000)),
      nights: 3,
      guests: {
        adults: 2,
        children: 1,
        infants: 0,
        pets: 0,
        total: 3,
      },
      pricing: {
        pricePerNight: 35000,
        baseTotal: 105000,
        cleaningFee: 8000,
        serviceFee: 5000,
        taxes: 2000,
        discount: 0,
        total: 120000,
        currency: 'BRL',
        appliedTier: 'base',
      },
      status: 'confirmed',
      platform: 'airbnb',
      externalId: 'ABN987654321',
      payment: {
        status: 'paid',
        method: 'platform',
        transactionId: 'TXN123456',
      },
      notes: 'Check-in às 15h',
      internalComments: 'Cliente frequente, deixar welcome kit',
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
      confirmedAt: now,
    },
    // Reserva para testar seleção de datas (27-30 Outubro 2025)
    {
      id: generateReservationId(),
      propertyId: accommodations[0].id, // Copacabana 201
      guestId: guests[1].id, // Ana Costa
      checkIn: '2025-10-27',
      checkOut: '2025-10-30',
      nights: 3,
      guests: {
        adults: 2,
        children: 0,
        infants: 0,
        pets: 0,
        total: 2,
      },
      pricing: {
        pricePerNight: 35000,
        baseTotal: 105000,
        cleaningFee: 8000,
        serviceFee: 5000,
        taxes: 2000,
        discount: 0,
        total: 120000,
        currency: 'BRL',
        appliedTier: 'base',
      },
      status: 'confirmed',
      platform: 'booking',
      externalId: 'BKG555444333',
      payment: {
        status: 'paid',
        method: 'platform',
        transactionId: 'TXN789012',
      },
      notes: 'Reserva de teste para validar seleção de datas',
      internalComments: 'Esta reserva ajuda a testar a funcionalidade de seleção 24-26 Out',
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
      confirmedAt: now,
    },
  ];

  for (const reservation of reservations) {
    await kv.set(`reservation:${reservation.id}`, reservation);
    console.log(`✅ Reservation created: ${reservation.id}`);
  }

  console.log('');
  console.log('🎉 Database seeded successfully with NEW STRUCTURE!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   - ${locations.length} locations`);
  console.log(`   - ${accommodations.length} accommodations (${accommodations.filter(a => a.locationId).length} with location, ${accommodations.filter(a => !a.locationId).length} standalone)`);
  console.log(`   - ${guests.length} guests`);
  console.log(`   - ${reservations.length} reservations`);
  console.log('');

  return {
    locations,
    accommodations,
    guests,
    reservations,
  };
}

// Se executado diretamente
if (import.meta.main) {
  await seedDatabaseNew();
}
