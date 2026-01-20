// ============================================================================
// SEED DATA - Dados de exemplo para testes
// ============================================================================
// Execute este arquivo para popular o banco com dados de teste
// ============================================================================

import * as kv from './kv_store.tsx';
import type { Property, Guest, Reservation } from './types.ts';
import { getCurrentDateTime, generatePropertyId, generateGuestId, generateReservationId, calculateNights } from './utils.ts';

export async function seedDatabase() {
  console.log('🌱 Seeding database with sample data...');

  // ============================================================================
  // PROPRIEDADES
  // ============================================================================

  const properties: Property[] = [
    {
      id: generatePropertyId(),
      name: 'Apartamento Copacabana 201',
      code: 'COP201',
      type: 'apartment',
      status: 'active',
      address: {
        street: 'Av. Atlântica',
        number: '1500',
        complement: 'Apto 201',
        neighborhood: 'Copacabana',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zipCode: '22021-000',
        country: 'BR',
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
      description: 'Apartamento moderno com vista para o mar em Copacabana',
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
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      ownerId: 'user_123',
      isActive: true,
    },
    {
      id: generatePropertyId(),
      name: 'Casa Ipanema Premium',
      code: 'IPA001',
      type: 'house',
      status: 'active',
      address: {
        street: 'Rua Visconde de Pirajá',
        number: '500',
        complement: '',
        neighborhood: 'Ipanema',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zipCode: '22410-000',
        country: 'BR',
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
      amenities: ['wifi', 'ar-condicionado', 'tv', 'cozinha', 'piscina', 'churrasqueira', 'estacionamento'],
      tags: ['praia', 'familia', 'luxo', 'piscina'],
      folder: undefined,
      color: '#10B981',
      photos: [],
      coverPhoto: undefined,
      description: 'Casa de alto padrão com piscina e churrasqueira em Ipanema',
      shortDescription: 'Casa 4 quartos com piscina',
      platforms: {
        airbnb: {
          enabled: true,
          listingId: 'ABN456789',
          syncEnabled: true,
        },
        direct: true,
      },
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      ownerId: 'user_123',
      isActive: true,
    },
    {
      id: generatePropertyId(),
      name: 'Studio Leblon Compacto',
      code: 'LEB100',
      type: 'studio',
      status: 'active',
      address: {
        street: 'Rua Dias Ferreira',
        number: '200',
        complement: 'Apto 1005',
        neighborhood: 'Leblon',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zipCode: '22431-000',
        country: 'BR',
      },
      maxGuests: 2,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      area: 35,
      pricing: {
        basePrice: 25000, // R$ 250,00 por noite
        currency: 'BRL',
        weeklyDiscount: 8,
        biweeklyDiscount: 12,
        monthlyDiscount: 18,
      },
      restrictions: {
        minNights: 1,
        maxNights: 365,
        advanceBooking: 0,
        preparationTime: 0,
      },
      amenities: ['wifi', 'ar-condicionado', 'tv', 'cozinha-americana'],
      tags: ['praia', 'casal', 'trabalho'],
      folder: undefined,
      color: '#F59E0B',
      photos: [],
      coverPhoto: undefined,
      description: 'Studio moderno e compacto no coração do Leblon',
      shortDescription: 'Studio moderno',
      platforms: {
        booking: {
          enabled: true,
          listingId: 'BKG111222',
          syncEnabled: true,
        },
        direct: true,
      },
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      ownerId: 'user_123',
      isActive: true,
    },
    {
      id: generatePropertyId(),
      name: 'Cobertura Barra da Tijuca',
      code: 'BAR300',
      type: 'condo',
      status: 'active',
      address: {
        street: 'Av. das Américas',
        number: '3000',
        complement: 'Cobertura',
        neighborhood: 'Barra da Tijuca',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zipCode: '22640-000',
        country: 'BR',
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
      folder: undefined,
      color: '#8B5CF6',
      photos: [],
      coverPhoto: undefined,
      description: 'Cobertura de luxo com piscina privativa e vista panorâmica',
      shortDescription: 'Cobertura 5 quartos de luxo',
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
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      ownerId: 'user_123',
      isActive: true,
    },
    {
      id: generatePropertyId(),
      name: 'Loft Botafogo Moderno',
      code: 'BOT050',
      type: 'loft',
      status: 'active',
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
      folder: undefined,
      color: '#EC4899',
      photos: [],
      coverPhoto: undefined,
      description: 'Loft moderno ideal para trabalho remoto',
      shortDescription: 'Loft moderno',
      platforms: {
        direct: true,
      },
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      ownerId: 'user_123',
      isActive: true,
    },
  ];

  // Salvar propriedades
  for (const property of properties) {
    await kv.set(`property:${property.id}`, property);
    console.log(`✅ Property created: ${property.name} (${property.code})`);
  }

  // ============================================================================
  // HÓSPEDES
  // ============================================================================

  const guests: Guest[] = [
    {
      id: generateGuestId(),
      firstName: 'João',
      lastName: 'Silva',
      fullName: 'João Silva',
      email: 'joao.silva@email.com',
      phone: '+5521987654321',
      cpf: '12345678901',
      passport: undefined,
      rg: undefined,
      address: {
        street: 'Rua das Flores',
        number: '100',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01000-000',
        country: 'BR',
      },
      birthDate: '1985-05-15',
      nationality: 'BR',
      language: 'pt-BR',
      stats: {
        totalReservations: 0,
        totalNights: 0,
        totalSpent: 0,
      },
      preferences: {
        earlyCheckIn: false,
        lateCheckOut: true,
        quietFloor: false,
        highFloor: true,
        pets: false,
      },
      tags: ['frequente', 'vip'],
      isBlacklisted: false,
      notes: 'Cliente VIP, sempre deixa tudo organizado',
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
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
      passport: undefined,
      rg: undefined,
      address: undefined,
      birthDate: '1990-08-20',
      nationality: 'BR',
      language: 'pt-BR',
      stats: {
        totalReservations: 0,
        totalNights: 0,
        totalSpent: 0,
      },
      preferences: undefined,
      tags: [],
      isBlacklisted: false,
      notes: undefined,
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      source: 'booking',
    },
    {
      id: generateGuestId(),
      firstName: 'Robert',
      lastName: 'Johnson',
      fullName: 'Robert Johnson',
      email: 'robert.johnson@email.com',
      phone: '+1234567890',
      cpf: undefined,
      passport: 'US123456789',
      rg: undefined,
      address: undefined,
      birthDate: '1988-03-10',
      nationality: 'US',
      language: 'en',
      stats: {
        totalReservations: 0,
        totalNights: 0,
        totalSpent: 0,
      },
      preferences: {
        earlyCheckIn: true,
        lateCheckOut: false,
        quietFloor: true,
        highFloor: true,
        pets: false,
      },
      tags: ['internacional'],
      isBlacklisted: false,
      notes: 'Guest from USA, speaks English only',
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      source: 'airbnb',
    },
    {
      id: generateGuestId(),
      firstName: 'Ana',
      lastName: 'Costa',
      fullName: 'Ana Costa',
      email: 'ana.costa@email.com',
      phone: '+5521912345678',
      cpf: '11122233344',
      passport: undefined,
      rg: undefined,
      address: undefined,
      birthDate: '1995-12-05',
      nationality: 'BR',
      language: 'pt-BR',
      stats: {
        totalReservations: 0,
        totalNights: 0,
        totalSpent: 0,
      },
      preferences: undefined,
      tags: ['business'],
      isBlacklisted: false,
      notes: 'Viaja a trabalho, sempre pontual',
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      source: 'direct',
    },
  ];

  // Salvar hóspedes
  for (const guest of guests) {
    await kv.set(`guest:${guest.id}`, guest);
    console.log(`✅ Guest created: ${guest.fullName}`);
  }

  // ============================================================================
  // RESERVAS
  // ============================================================================

  // Criar algumas reservas de exemplo
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextMonth = new Date(today);
  nextMonth.setDate(nextMonth.getDate() + 30);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const reservations: Reservation[] = [
    // 🎯 RESERVA DE TESTE: 20-22 OUTUBRO 2025 - APARTAMENTO COPACABANA 201
    {
      id: generateReservationId(),
      propertyId: properties[0].id, // Copacabana 201
      guestId: guests[0].id, // João Silva
      checkIn: '2025-10-20',
      checkOut: '2025-10-22',
      nights: 2,
      guests: {
        adults: 2,
        children: 0,
        infants: 0,
        pets: 0,
        total: 2,
      },
      pricing: {
        pricePerNight: 35000, // R$ 350,00
        baseTotal: 70000,     // R$ 700,00 (2 noites)
        cleaningFee: 8000,    // R$ 80,00
        serviceFee: 5000,     // R$ 50,00
        taxes: 2000,          // R$ 20,00
        discount: 0,
        total: 85000,         // R$ 850,00
        currency: 'BRL',
        appliedTier: 'base',
      },
      status: 'confirmed',
      platform: 'airbnb',
      externalId: 'ABN-OCT-20-22',
      payment: {
        status: 'paid',
        method: 'platform',
        transactionId: 'TXN-AIRBNB-OCT2025',
      },
      notes: 'Reserva de teste - Outubro 2025 (sem conflito)',
      internalComments: 'Teste de criação de reserva via Airbnb',
      specialRequests: undefined,
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      createdBy: 'system',
      confirmedAt: getCurrentDateTime(),
    },
    // 🎯 RESERVA DE TESTE: 23-26 OUTUBRO 2025 - APARTAMENTO COPACABANA 201
    {
      id: generateReservationId(),
      propertyId: properties[0].id, // Copacabana 201
      guestId: guests[1].id, // Maria Santos
      checkIn: '2025-10-23',
      checkOut: '2025-10-26',
      nights: 3,
      guests: {
        adults: 1,
        children: 0,
        infants: 0,
        pets: 0,
        total: 1,
      },
      pricing: {
        pricePerNight: 40000, // R$ 400,00
        baseTotal: 120000,    // R$ 1.200,00 (3 noites)
        cleaningFee: 8000,    // R$ 80,00
        serviceFee: 6000,     // R$ 60,00
        taxes: 2000,          // R$ 20,00
        discount: 0,
        total: 136000,        // R$ 1.360,00
        currency: 'BRL',
        appliedTier: 'base',
      },
      status: 'confirmed',
      platform: 'booking',
      externalId: 'BKG-OCT-23-26',
      payment: {
        status: 'paid',
        method: 'platform',
        transactionId: 'TXN-BOOKING-OCT2025',
      },
      notes: 'Reserva de teste - Outubro 2025 (sem conflito)',
      internalComments: 'Teste de criação de reserva via Booking.com',
      specialRequests: undefined,
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      createdBy: 'system',
      confirmedAt: getCurrentDateTime(),
    },
    {
      id: generateReservationId(),
      propertyId: properties[0].id, // Copacabana
      guestId: guests[0].id, // João Silva
      checkIn: formatDate(nextWeek),
      checkOut: formatDate(new Date(nextWeek.getTime() + 3 * 24 * 60 * 60 * 1000)), // 3 noites
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
      specialRequests: 'Berço para bebê',
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      createdBy: 'system',
      confirmedAt: getCurrentDateTime(),
    },
    {
      id: generateReservationId(),
      propertyId: properties[1].id, // Ipanema
      guestId: guests[2].id, // Robert Johnson
      checkIn: formatDate(nextWeek),
      checkOut: formatDate(new Date(nextWeek.getTime() + 10 * 24 * 60 * 60 * 1000)), // 10 noites
      nights: 10,
      guests: {
        adults: 4,
        children: 2,
        infants: 0,
        pets: 0,
        total: 6,
      },
      pricing: {
        pricePerNight: 70400, // Com 12% de desconto (weekly)
        baseTotal: 704000,
        cleaningFee: 15000,
        serviceFee: 10000,
        taxes: 5000,
        discount: 96000,
        total: 734000,
        currency: 'BRL',
        appliedTier: 'weekly',
      },
      status: 'pending',
      platform: 'booking',
      externalId: 'BKG111222333',
      payment: {
        status: 'pending',
      },
      notes: undefined,
      internalComments: undefined,
      specialRequests: 'Late check-out if possible',
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      createdBy: 'system',
    },
    {
      id: generateReservationId(),
      propertyId: properties[2].id, // Leblon Studio
      guestId: guests[3].id, // Ana Costa
      checkIn: formatDate(nextMonth),
      checkOut: formatDate(new Date(nextMonth.getTime() + 5 * 24 * 60 * 60 * 1000)), // 5 noites
      nights: 5,
      guests: {
        adults: 1,
        children: 0,
        infants: 0,
        pets: 0,
        total: 1,
      },
      pricing: {
        pricePerNight: 25000,
        baseTotal: 125000,
        cleaningFee: 5000,
        serviceFee: 3000,
        taxes: 1500,
        discount: 0,
        total: 134500,
        currency: 'BRL',
        appliedTier: 'base',
      },
      status: 'confirmed',
      platform: 'direct',
      payment: {
        status: 'paid',
        method: 'pix',
        transactionId: 'PIX789456',
      },
      notes: 'Preciso de nota fiscal',
      internalComments: 'Viagem a trabalho',
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      createdBy: 'system',
      confirmedAt: getCurrentDateTime(),
    },
  ];

  // Salvar reservas
  for (const reservation of reservations) {
    await kv.set(`reservation:${reservation.id}`, reservation);
    console.log(`✅ Reservation created: ${reservation.id}`);
  }

  console.log('');
  console.log('🎉 Database seeded successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   - ${properties.length} properties`);
  console.log(`   - ${guests.length} guests`);
  console.log(`   - ${reservations.length} reservations`);
  console.log('');

  return {
    properties,
    guests,
    reservations,
  };
}

// Se executado diretamente
if (import.meta.main) {
  await seedDatabase();
}
