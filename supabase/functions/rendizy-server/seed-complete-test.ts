// ============================================================================
// SEED DATA - TESTE COMPLETO DE LOCATION E LISTING
// ============================================================================
// Cria uma Location e um Listing completos para testar todas as funcionalidades
// do sistema RENDIZY incluindo:
// - Location com todos os campos preenchidos
// - Listing com integração em múltiplas plataformas
// - Sistema de Cômodos (Rooms) completo
// - Regras de Acomodação (pets, fumantes, etc)
// - Preços Derivados com taxa por hóspede adicional
// - iCal Sync configurado
// - Todos os amenities possíveis
// ============================================================================

import * as kv from './kv_store.tsx';
import type { Location, Property, Room, Listing } from './types.ts';
import { 
  getCurrentDateTime, 
  generateLocationId,
  generatePropertyId,
  generateRoomId,
  generateListingId
} from './utils.ts';

export async function seedCompleteTest() {
  console.log('🌱 [SEED COMPLETE TEST] Iniciando seed de teste completo...');
  
  const now = getCurrentDateTime();
  const userId = 'user_test_complete_001';

  // ============================================================================
  // STEP 1: CRIAR LOCATION COMPLETA
  // ============================================================================

  console.log('📍 [STEP 1/4] Criando Location completa...');

  const location: Location = {
    id: generateLocationId(),
    name: 'Edifício Copacabana Sunset Tower',
    code: 'COPA-ST',
    
    // Endereço completo com coordenadas GPS
    address: {
      street: 'Av. Atlântica',
      number: '2964',
      neighborhood: 'Copacabana',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '22070-000',
      country: 'BR',
      coordinates: {
        lat: -22.9711,
        lng: -43.1882,
      },
    },
    
    // Amenities compartilhados do prédio
    sharedAmenities: [
      'piscina',
      'academia',
      'elevador',
      'portaria-24h',
      'salao-festas',
      'churrasqueira',
      'sauna',
      'playground',
      'quadra-esportes',
      'sala-jogos',
      'estacionamento',
      'seguranca-24h',
      'circuito-cameras',
      'gerador-emergencia',
    ],
    
    // Informações administrativas
    management: {
      company: 'Administradora Copacabana Elite Ltda',
      manager: 'Carlos Roberto Silva',
      phone: '+55 21 3500-8000',
      email: 'administracao@copaelite.com.br',
    },
    
    // Informações de acesso ao prédio
    buildingAccess: {
      type: 'portaria',
      instructions: 'Apresente-se na portaria com documento de identidade. O porteiro fornecerá a chave e código do elevador. Horário de recepção: 24h.',
      hasElevator: true,
      hasParking: true,
      parkingType: 'gratuito',
    },
    
    // Fotos do prédio
    photos: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6',
    ],
    coverPhoto: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00',
    
    // Descrição completa
    description: 'O Edifício Copacabana Sunset Tower é um empreendimento de alto padrão localizado em frente à praia de Copacabana. Construído em 2018, oferece infraestrutura completa de lazer e segurança para moradores e hóspedes. O prédio possui 20 andares com vista privilegiada para o mar, piscina aquecida, academia equipada, sauna seca e a vapor, salão de festas com capacidade para 50 pessoas, playground infantil, quadra poliesportiva, sala de jogos e 2 vagas de estacionamento por apartamento. Portaria 24h com equipe bilíngue, sistema de segurança com câmeras e controle de acesso por cartão magnético.',
    
    // Configurações
    showBuildingNumber: true,
    
    // Estatísticas (serão atualizadas automaticamente)
    stats: {
      totalAccommodations: 1,
      activeAccommodations: 1,
    },
    
    // Metadata
    createdAt: now,
    updatedAt: now,
    ownerId: userId,
    isActive: true,
  };

  // Salvar Location
  await kv.set(`location:${location.id}`, location);
  console.log(`✅ Location criada: ${location.name} (${location.id})`);

  // ============================================================================
  // STEP 2: CRIAR PROPERTY (ACCOMMODATION) COMPLETA
  // ============================================================================

  console.log('🏠 [STEP 2/4] Criando Property (Accommodation) completa...');

  const property: Property = {
    id: generatePropertyId(),
    name: 'Apartamento 1502 - Vista Mar Premium',
    code: 'COPA-ST-1502',
    type: 'apartment',
    status: 'active',
    
    // Vínculo com Location
    locationId: location.id,
    
    // Endereço (herda do Location + complemento)
    address: {
      street: location.address.street,
      number: location.address.number,
      complement: 'Apto 1502 - Torre A',
      neighborhood: location.address.neighborhood,
      city: location.address.city,
      state: location.address.state,
      zipCode: location.address.zipCode,
      country: location.address.country,
    },
    
    // Capacidade
    maxGuests: 6,
    bedrooms: 3,
    beds: 5,
    bathrooms: 2,
    area: 145, // m²
    
    // Preços (em centavos)
    pricing: {
      basePrice: 45000, // R$ 450,00 por noite
      currency: 'BRL',
      weeklyDiscount: 10,     // 10% de desconto para 7+ noites
      biweeklyDiscount: 15,   // 15% de desconto para 15+ noites
      monthlyDiscount: 25,    // 25% de desconto para 28+ noites
    },
    
    // Restrições
    restrictions: {
      minNights: 2,           // Mínimo 2 noites
      maxNights: 90,          // Máximo 90 noites
      advanceBooking: 1,      // 1 dia de antecedência mínima
      preparationTime: 1,     // 1 dia entre reservas para limpeza
    },
    
    // Amenidades da unidade
    amenities: [
      // Essenciais
      'wifi',
      'ar-condicionado',
      'aquecedor',
      'tv-a-cabo',
      'netflix',
      'cozinha-completa',
      'maquina-lavar',
      'secadora',
      'ferro-passar',
      
      // Conforto
      'roupa-cama',
      'toalhas',
      'sabonetes',
      'shampoo',
      'secador-cabelo',
      'cofre',
      
      // Tecnologia
      'smart-tv',
      'chromecast',
      'bluetooth-speaker',
      'carregador-usb',
      
      // Cozinha
      'geladeira',
      'micro-ondas',
      'fogao',
      'forno',
      'lava-loucas',
      'cafeteira',
      'liquidificador',
      'torradeira',
      'pratos-talheres',
      
      // Área externa/Vista
      'varanda',
      'vista-mar',
      'churrasqueira-privada',
      
      // Segurança
      'detector-fumaca',
      'extintor',
      'kit-primeiros-socorros',
    ],
    
    // Tags e organização
    tags: ['praia', 'luxo', 'vista-mar', 'familia', 'copacabana'],
    color: '#3B82F6', // Azul
    
    // Fotos
    photos: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267',
      'https://images.unsplash.com/photo-1502672260066-6bc35f0af07e',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2',
      'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d',
    ],
    coverPhoto: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267',
    
    // Descrições
    description: `Apartamento de alto padrão no 15º andar com vista deslumbrante para o mar de Copacabana. 

Este espaçoso apartamento de 145m² foi completamente reformado em 2023 e oferece todo o conforto para sua estadia no Rio de Janeiro. 

**DESTAQUES:**
• Vista frontal para o mar de Copacabana
• 3 quartos (1 suíte master + 2 quartos)
• 2 banheiros completos
• Ar-condicionado em todos os ambientes
• Cozinha americana totalmente equipada
• Varanda com churrasqueira e mesa para 6 pessoas
• Smart TV em todos os quartos
• Wi-Fi de alta velocidade (500 Mbps)

**LOCALIZAÇÃO PRIVILEGIADA:**
• Frente para a praia de Copacabana
• 2 minutos a pé da orla
• Próximo a metrô, restaurantes e comércio
• 20 minutos do Pão de Açúcar
• 25 minutos do Cristo Redentor

**INFRAESTRUTURA DO PRÉDIO:**
• Piscina aquecida com vista para o mar
• Academia completa (24h)
• Sauna seca e a vapor
• Salão de festas
• Playground
• 2 vagas de estacionamento
• Portaria 24h com equipe bilíngue

Perfeito para famílias, grupos de amigos ou estadias de negócios.`,
    
    shortDescription: 'Apartamento de luxo com 3 quartos e vista mar em Copacabana. Piscina, academia e 2 vagas.',
    
    // Plataformas
    platforms: {
      airbnb: {
        enabled: true,
        listingId: 'airbnb_789456123',
        syncEnabled: true,
      },
      booking: {
        enabled: true,
        listingId: 'booking_456789321',
        syncEnabled: true,
      },
      decolar: {
        enabled: false,
        listingId: '',
        syncEnabled: false,
      },
      direct: true,
    },
    
    // Metadata
    createdAt: now,
    updatedAt: now,
    ownerId: userId,
    isActive: true,
  };

  // Salvar Property
  await kv.set(`property:${property.id}`, property);
  console.log(`✅ Property criada: ${property.name} (${property.id})`);

  // ============================================================================
  // STEP 3: CRIAR ROOMS (CÔMODOS) COMPLETOS
  // ============================================================================

  console.log('🛏️ [STEP 3/4] Criando Rooms (Cômodos) completos...');

  const rooms: Room[] = [
    // Suíte Master
    {
      id: generateRoomId(),
      accommodationId: property.id,
      type: 'suite',
      name: 'Suíte Master com Vista Mar',
      isShared: false,
      hasLock: true,
      beds: [
        {
          id: 'bed_001',
          type: 'king',
          quantity: 1,
          capacity: 2,
        },
      ],
      capacity: 2,
      photos: [
        {
          id: 'photo_001',
          url: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0',
          tag: 'quarto',
          caption: 'Suíte master com cama king size e vista para o mar',
          order: 1,
          isMain: true,
        },
        {
          id: 'photo_002',
          url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461',
          tag: 'vista-mar',
          caption: 'Vista da suíte master',
          order: 2,
          isMain: false,
        },
      ],
      order: 1,
      createdAt: now,
      updatedAt: now,
    },
    
    // Quarto 2 - Twin
    {
      id: generateRoomId(),
      accommodationId: property.id,
      type: 'twin',
      name: 'Quarto Twin',
      isShared: false,
      hasLock: true,
      beds: [
        {
          id: 'bed_002',
          type: 'solteiro',
          quantity: 2,
          capacity: 2,
        },
      ],
      capacity: 2,
      photos: [
        {
          id: 'photo_003',
          url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85',
          tag: 'quarto',
          caption: 'Quarto com duas camas de solteiro',
          order: 1,
          isMain: true,
        },
      ],
      order: 2,
      createdAt: now,
      updatedAt: now,
    },
    
    // Quarto 3 - Duplo com beliche
    {
      id: generateRoomId(),
      accommodationId: property.id,
      type: 'duplo',
      name: 'Quarto Duplo',
      isShared: false,
      hasLock: true,
      beds: [
        {
          id: 'bed_003',
          type: 'casal',
          quantity: 1,
          capacity: 2,
        },
      ],
      capacity: 2,
      photos: [
        {
          id: 'photo_004',
          url: 'https://images.unsplash.com/photo-1540518614846-7eded433c457',
          tag: 'quarto',
          caption: 'Quarto duplo com cama de casal',
          order: 1,
          isMain: true,
        },
      ],
      order: 3,
      createdAt: now,
      updatedAt: now,
    },
    
    // Banheiro Suíte
    {
      id: generateRoomId(),
      accommodationId: property.id,
      type: 'banheiro',
      name: 'Banheiro da Suíte',
      isShared: false,
      hasLock: true,
      beds: [],
      capacity: 0,
      photos: [
        {
          id: 'photo_005',
          url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14',
          tag: 'banheiro',
          caption: 'Banheiro da suíte com banheira',
          order: 1,
          isMain: true,
        },
      ],
      order: 4,
      createdAt: now,
      updatedAt: now,
    },
    
    // Banheiro Social
    {
      id: generateRoomId(),
      accommodationId: property.id,
      type: 'banheiro',
      name: 'Banheiro Social',
      isShared: true,
      hasLock: true,
      beds: [],
      capacity: 0,
      photos: [
        {
          id: 'photo_006',
          url: 'https://images.unsplash.com/photo-1604014237800-1c9102c219da',
          tag: 'banheiro',
          caption: 'Banheiro social completo',
          order: 1,
          isMain: true,
        },
      ],
      order: 5,
      createdAt: now,
      updatedAt: now,
    },
    
    // Sala de Estar
    {
      id: generateRoomId(),
      accommodationId: property.id,
      type: 'sala',
      name: 'Sala de Estar',
      isShared: true,
      hasLock: false,
      beds: [
        {
          id: 'bed_004',
          type: 'sofa-cama',
          quantity: 1,
          capacity: 1,
        },
      ],
      capacity: 1,
      photos: [
        {
          id: 'photo_007',
          url: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb',
          tag: 'sala-estar',
          caption: 'Sala de estar com sofá-cama e vista para o mar',
          order: 1,
          isMain: true,
        },
      ],
      order: 6,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // Salvar todos os rooms
  for (const room of rooms) {
    await kv.set(`room:${room.id}`, room);
    console.log(`  ✅ Room criado: ${room.name} (${room.type})`);
  }

  // ============================================================================
  // STEP 4: CRIAR LISTING COMPLETO
  // ============================================================================

  console.log('📢 [STEP 4/4] Criando Listing completo...');

  const listing: Listing = {
    id: generateListingId(),
    accommodationId: property.id,
    
    // Título e descrição para cada plataforma
    title: {
      pt: 'Apartamento de Luxo 3 Quartos Vista Mar - Copacabana',
      en: 'Luxury 3BR Ocean View Apartment - Copacabana',
      es: 'Apartamento de Lujo 3 Habitaciones Vista al Mar - Copacabana',
    },
    
    description: {
      pt: property.description || '',
      en: `Luxury high-end apartment on the 15th floor with stunning views of Copacabana beach.

This spacious 145m² apartment was completely renovated in 2023 and offers all the comfort for your stay in Rio de Janeiro.

**HIGHLIGHTS:**
• Front ocean view of Copacabana beach
• 3 bedrooms (1 master suite + 2 bedrooms)
• 2 full bathrooms
• Air conditioning in all rooms
• Fully equipped American kitchen
• Balcony with BBQ and table for 6
• Smart TV in all bedrooms
• High-speed Wi-Fi (500 Mbps)

**PRIME LOCATION:**
• Beachfront in Copacabana
• 2-minute walk to the beach
• Close to subway, restaurants and shops
• 20 minutes from Sugarloaf Mountain
• 25 minutes from Christ the Redeemer

**BUILDING AMENITIES:**
• Heated pool with ocean view
• Full gym (24h)
• Dry and steam sauna
• Party room
• Playground
• 2 parking spaces
• 24h reception with bilingual staff

Perfect for families, groups of friends or business stays.`,
      es: `Apartamento de alto estándar en el piso 15 con impresionantes vistas al mar de Copacabana.

Este espacioso apartamento de 145m² fue completamente renovado en 2023 y ofrece todo el confort para su estadía en Río de Janeiro.

**DESTACADOS:**
• Vista frontal al mar de Copacabana
• 3 habitaciones (1 suite principal + 2 habitaciones)
• 2 baños completos
• Aire acondicionado en todos los ambientes
• Cocina americana totalmente equipada
• Balcón con parrilla y mesa para 6 personas
• Smart TV en todas las habitaciones
• Wi-Fi de alta velocidad (500 Mbps)

**UBICACIÓN PRIVILEGIADA:**
• Frente a la playa de Copacabana
• 2 minutos a pie de la costa
• Cerca de metro, restaurantes y comercio
• 20 minutos del Pan de Azúcar
• 25 minutos del Cristo Redentor

**INFRAESTRUCTURA DEL EDIFICIO:**
• Piscina climatizada con vista al mar
• Gimnasio completo (24h)
• Sauna seca y de vapor
• Salón de fiestas
• Área de juegos
• 2 plazas de estacionamiento
• Recepción 24h con personal bilingüe

Perfecto para familias, grupos de amigos o estancias de negocios.`,
    },
    
    // Status em cada plataforma
    platforms: {
      airbnb: {
        enabled: true,
        status: 'published',
        listingUrl: 'https://airbnb.com/rooms/789456123',
        externalId: 'airbnb_789456123',
        lastSync: now,
        syncCalendar: true,
        syncPricing: true,
        syncAvailability: true,
      },
      booking: {
        enabled: true,
        status: 'published',
        listingUrl: 'https://booking.com/hotel/br/copa-st-1502.html',
        externalId: 'booking_456789321',
        lastSync: now,
        syncCalendar: true,
        syncPricing: true,
        syncAvailability: true,
      },
      decolar: {
        enabled: false,
        status: 'draft',
        syncCalendar: false,
        syncPricing: false,
        syncAvailability: false,
      },
      direct: {
        enabled: true,
        status: 'published',
        bookingUrl: 'https://rendizy.com.br/book/copa-st-1502',
      },
    },
    
    // Configurações de preço por plataforma
    pricingSettings: {
      airbnb: {
        baseAdjustment: 0,        // Sem ajuste
        weeklyAdjustment: 10,     // 10% desconto semanal
        monthlyAdjustment: 25,    // 25% desconto mensal
        cleaningFee: 15000,       // R$ 150,00
        serviceFeeType: 'host',   // Taxa paga pelo host
      },
      booking: {
        baseAdjustment: -5,       // -5% (comissão menor)
        weeklyAdjustment: 10,
        monthlyAdjustment: 25,
        cleaningFee: 15000,
        serviceFeeType: 'host',
      },
      decolar: {
        baseAdjustment: 0,
        weeklyAdjustment: 10,
        monthlyAdjustment: 25,
        cleaningFee: 15000,
        serviceFeeType: 'guest',
      },
      direct: {
        baseAdjustment: -10,      // -10% para reservas diretas
        weeklyAdjustment: 15,     // Melhor desconto
        monthlyAdjustment: 30,
        cleaningFee: 12000,       // R$ 120,00 (mais barato)
        serviceFeeType: 'none',   // Sem taxa de serviço
      },
    },
    
    // Configurações de disponibilidade
    availabilitySettings: {
      instantBook: true,
      advanceNotice: 24,          // 24h
      preparationTime: 24,        // 24h entre reservas
      checkInTime: '15:00',
      checkOutTime: '11:00',
      minNights: 2,
      maxNights: 90,
    },
    
    // Regras da casa
    houseRules: {
      checkInStart: '15:00',
      checkInEnd: '22:00',
      checkOutTime: '11:00',
      smoking: false,
      pets: {
        allowed: true,
        maxPets: 1,
        fee: 5000,                // R$ 50,00 por pet por estadia
        feeType: 'per_stay',
        restrictions: 'Apenas cães de pequeno porte (até 10kg). Não é permitido deixar o pet sozinho no apartamento.',
      },
      parties: false,
      maxGuests: 6,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      additionalRules: [
        'Proibido fumar em todas as áreas do apartamento',
        'Favor manter o volume de TV e música em nível moderado após 22h',
        'Uso da churrasqueira permitido até 23h',
        'Proibido eventos ou festas',
        'Check-in após 22h: taxa adicional de R$ 100',
      ],
    },
    
    // Preços derivados
    derivedPricing: {
      enabled: true,
      extraGuestFee: {
        enabled: true,
        startingGuest: 5,         // A partir do 5º hóspede
        feePerNight: 8000,        // R$ 80,00 por hóspede adicional por noite
        maxGuests: 6,
      },
      childDiscount: {
        enabled: true,
        ageLimit: 12,
        discountPercent: 50,      // 50% para crianças até 12 anos
      },
    },
    
    // Configurações de SEO
    seo: {
      slug: 'apartamento-luxo-3qts-vista-mar-copacabana-rio',
      metaTitle: 'Apartamento de Luxo 3 Quartos Vista Mar - Copacabana, Rio de Janeiro',
      metaDescription: 'Alugue este incrível apartamento de 3 quartos com vista mar em Copacabana. Piscina, academia, 2 vagas. Próximo à praia. Reserve agora!',
      keywords: ['copacabana', 'apartamento', 'vista mar', '3 quartos', 'piscina', 'academia', 'rio de janeiro', 'praia'],
    },
    
    // iCal Sync URLs
    icalUrls: {
      airbnb: 'https://www.airbnb.com/calendar/ical/789456123.ics?s=3f8e9b2c1d4a5e6f7g8h9i0j',
      booking: 'https://admin.booking.com/hotel/hoteladmin/ical.html?t=456789321-abc123def456',
      decolar: '',
      vrbo: '',
      homeaway: '',
      other: [],
    },
    
    // Metadata
    stats: {
      totalViews: 1247,
      totalBookings: 34,
      averageRating: 4.9,
      responseRate: 100,
      responseTime: 15,           // minutos
    },
    
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
    ownerId: userId,
    isActive: true,
  };

  // Salvar Listing
  await kv.set(`listing:${listing.id}`, listing);
  console.log(`✅ Listing criado: ${listing.title.pt} (${listing.id})`);

  // ============================================================================
  // CRIAR CONFIGURAÇÕES DE PRICING SETTINGS
  // ============================================================================

  const pricingSettings = {
    id: `pricing_${property.id}`,
    accommodationId: property.id,
    
    // Preços derivados
    derivedPricing: {
      enabled: true,
      extraGuestFee: {
        enabled: true,
        startingGuest: 5,
        feePerNight: 8000,        // R$ 80,00
        maxGuests: 6,
      },
      childDiscount: {
        enabled: true,
        ageLimit: 12,
        discountPercent: 50,
      },
    },
    
    // Taxas
    fees: {
      cleaning: 15000,            // R$ 150,00
      service: 0,
      petFee: 5000,               // R$ 50,00
    },
    
    createdAt: now,
    updatedAt: now,
  };

  await kv.set(`pricingSettings:${property.id}`, pricingSettings);
  console.log(`✅ Pricing Settings criado`);

  // ============================================================================
  // CRIAR REGRAS DE ACOMODAÇÃO
  // ============================================================================

  const accommodationRules = {
    id: `rules_${property.id}`,
    accommodationId: property.id,
    
    // Regras de pets
    pets: {
      allowed: true,
      maxPets: 1,
      allowedTypes: ['cachorro-pequeno'],
      fee: 5000,
      feeType: 'per_stay',
      deposit: 0,
      restrictions: 'Apenas cães de pequeno porte (até 10kg). Não é permitido deixar o pet sozinho no apartamento.',
    },
    
    // Regras de fumantes
    smoking: {
      allowed: false,
      allowedAreas: [],
      restrictions: 'Proibido fumar em todas as áreas internas do apartamento. Fumar é permitido apenas na varanda.',
    },
    
    // Regras de festas
    parties: {
      allowed: false,
      maxGuests: 0,
      restrictions: 'Não são permitidos eventos ou festas no apartamento.',
    },
    
    // Horário de silêncio
    quietHours: {
      enabled: true,
      start: '22:00',
      end: '08:00',
      restrictions: 'Favor manter o volume de TV e música em nível moderado após 22h.',
    },
    
    // Regras adicionais
    additionalRules: [
      'Proibido fumar em todas as áreas do apartamento',
      'Favor manter o volume de TV e música em nível moderado após 22h',
      'Uso da churrasqueira permitido até 23h',
      'Proibido eventos ou festas',
      'Check-in após 22h: taxa adicional de R$ 100',
    ],
    
    createdAt: now,
    updatedAt: now,
  };

  await kv.set(`accommodationRules:${property.id}`, accommodationRules);
  console.log(`✅ Accommodation Rules criado`);

  // ============================================================================
  // SUMÁRIO
  // ============================================================================

  console.log('\n' + '='.repeat(80));
  console.log('✅ SEED COMPLETE TEST - CONCLUÍDO COM SUCESSO!');
  console.log('='.repeat(80));
  console.log(`
📍 LOCATION CRIADA:
   ID: ${location.id}
   Nome: ${location.name}
   Código: ${location.code}
   Endereço: ${location.address.street}, ${location.address.number} - ${location.address.neighborhood}
   Cidade: ${location.address.city}/${location.address.state}
   Amenities: ${location.sharedAmenities.length} items
   
🏠 PROPERTY CRIADA:
   ID: ${property.id}
   Nome: ${property.name}
   Código: ${property.code}
   Tipo: ${property.type}
   Capacidade: ${property.maxGuests} hóspedes
   Quartos: ${property.bedrooms} | Banheiros: ${property.bathrooms}
   Área: ${property.area}m²
   Preço base: R$ ${(property.pricing.basePrice / 100).toFixed(2)}
   Amenities: ${property.amenities.length} items
   
🛏️ ROOMS CRIADOS: ${rooms.length} cômodos
   ${rooms.map(r => `• ${r.name} (${r.type})`).join('\n   ')}
   
📢 LISTING CRIADO:
   ID: ${listing.id}
   Título: ${listing.title.pt}
   Plataformas ativas: ${Object.entries(listing.platforms).filter(([k, v]) => v.enabled).map(([k]) => k).join(', ')}
   iCal Sync: ${Object.values(listing.icalUrls).filter(url => url).length} URLs configuradas
   Preços derivados: ${listing.derivedPricing.enabled ? 'Ativado' : 'Desativado'}
   Taxa hóspede adicional: R$ ${(listing.derivedPricing.extraGuestFee.feePerNight / 100).toFixed(2)}/noite
   
⚙️ CONFIGURAÇÕES ADICIONAIS:
   • Pricing Settings: ${pricingSettings.id}
   • Accommodation Rules: ${accommodationRules.id}
   • Pets permitidos: Sim (máx ${accommodationRules.pets.maxPets}, taxa R$ ${(accommodationRules.pets.fee / 100).toFixed(2)})
   • Fumantes: Não
   • Festas: Não
  `);
  console.log('='.repeat(80) + '\n');

  return {
    location,
    property,
    rooms,
    listing,
    pricingSettings,
    accommodationRules,
  };
}
