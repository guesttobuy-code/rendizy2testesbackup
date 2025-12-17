// ============================================================================
// ⚠️ MOCK BACKEND - DESABILITADO PERMANENTEMENTE
// ============================================================================
// Este arquivo foi desabilitado em v1.0.103.305 (04/11/2025)
// 
// RAZÃO: Sistema agora usa APENAS Supabase para garantir:
//   - Consistência entre desenvolvimento e produção
//   - Isolamento multi-tenant correto
//   - Dados persistentes e recuperáveis
//   - Zero bugs de "funciona local, quebra em produção"
//
// APRENDIZADO CRÍTICO:
//   Mock backend é ARMADILHA para SaaS real. Causa bugs inconsistentes,
//   dados perdidos, e falsa sensação de segurança. Sempre use backend real.
//
// DOCUMENTAÇÃO: /docs/⚠️_APRENDIZADO_CRITICO_SUPABASE_ONLY.md
// ============================================================================

const STORAGE_KEY = 'rendizy_mock_data';
const MOCK_ENABLED_KEY = 'rendizy_mock_enabled';
const DATA_VERSION_KEY = 'rendizy_data_version';
const CURRENT_DATA_VERSION = 'DISABLED'; // Mock desabilitado permanentemente

// ============================================================================
// TIPOS
// ============================================================================

type Currency = 'BRL' | 'USD' | 'EUR';
type PropertyType = 'apartment' | 'house' | 'studio' | 'loft' | 'condo' | 'villa' | 'other';
type PropertyStatus = 'active' | 'inactive' | 'maintenance' | 'draft';
type ReservationStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'completed' | 'cancelled' | 'no_show';
type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded' | 'failed';
type PaymentMethod = 'credit_card' | 'debit_card' | 'pix' | 'bank_transfer' | 'cash' | 'platform';
type Platform = 'airbnb' | 'booking' | 'decolar' | 'direct' | 'other';
type PriceTier = 'base' | 'weekly' | 'biweekly' | 'monthly';

// ============================================================================
// STORAGE
// ============================================================================

function loadData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  const storedVersion = localStorage.getItem(DATA_VERSION_KEY);
  
  // Se não há dados OU versão desatualizada, criar dados iniciais
  if (!stored || storedVersion !== CURRENT_DATA_VERSION) {
    console.log('🔄 Inicializando dados mock...');
    if (storedVersion && storedVersion !== CURRENT_DATA_VERSION) {
      console.log(`📦 Versão antiga detectada (${storedVersion} → ${CURRENT_DATA_VERSION}). Criando novos dados...`);
    }
    const initialData = seedMockData();
    localStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);
    return initialData;
  }
  
  if (stored) {
    const data = JSON.parse(stored);
    
    // Se está vazio, criar dados
    if (!data.properties || data.properties.length === 0) {
      console.log('📦 Dados vazios detectados. Criando dados iniciais...');
      return seedMockData();
    }
    
    // Validar e limpar dados inconsistentes
    const validPropertyIds = new Set(data.properties?.map((p: any) => p.id) || []);
    const validGuestIds = new Set(data.guests?.map((g: any) => g.id) || []);
    
    // Filtrar reservas órfãs (sem propriedade ou hóspede associado)
    const originalReservationCount = data.reservations?.length || 0;
    let hasOrphanedData = false;
    
    data.reservations = (data.reservations || []).filter((r: any) => {
      const hasValidProperty = validPropertyIds.has(r.propertyId);
      const hasValidGuest = validGuestIds.has(r.guestId);
      
      if (!hasValidProperty) {
        console.warn(`⚠️ Reserva órfã removida: ${r.id} (propriedade ${r.propertyId} não existe)`);
        console.warn(`   Propriedades disponíveis:`, Array.from(validPropertyIds));
        hasOrphanedData = true;
      }
      if (!hasValidGuest) {
        console.warn(`⚠️ Reserva órfã removida: ${r.id} (hóspede ${r.guestId} não existe)`);
        hasOrphanedData = true;
      }
      
      return hasValidProperty && hasValidGuest;
    });
    
    if (data.reservations.length !== originalReservationCount) {
      console.log(`🧹 Limpeza automática: ${originalReservationCount - data.reservations.length} reservas órfãs removidas`);
      saveData(data);
    }
    
    // Se encontrou dados órfãos, alerta o usuário
    if (hasOrphanedData) {
      console.error('🔴 DADOS CORROMPIDOS DETECTADOS E LIMPOS!');
      console.error('💡 Se o erro persistir, use o botão "Resetar Dados" no banner roxo');
    }
    
    return data;
  }
  
  // Fallback: criar dados iniciais
  console.log('📦 Nenhum dado encontrado. Criando dados iniciais...');
  return seedMockData();
}

function saveData(data: any) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ============================================================================
// UTILS
// ============================================================================

// Gera código curto alfanumérico de 6 caracteres (A-Z, 0-9)
// Exemplo: RSV-A3K9X2, PRP-B7M4N1, GST-C2P8Q5
function generateShortCode(prefix: string, existingCodes: string[] = []): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const codeLength = 6;
  
  let attempts = 0;
  const maxAttempts = 100; // Prevenir loop infinito (muito improvável)
  
  while (attempts < maxAttempts) {
    let code = '';
    for (let i = 0; i < codeLength; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      code += chars[randomIndex];
    }
    
    const fullCode = `${prefix}-${code}`;
    
    // Verificar se já existe
    if (!existingCodes.includes(fullCode)) {
      return fullCode;
    }
    
    attempts++;
  }
  
  // Fallback (extremamente raro)
  console.warn('⚠️ Muitas colisões ao gerar código. Usando UUID como fallback.');
  return `${prefix}_${crypto.randomUUID()}`;
}

// Função antiga mantida para compatibilidade (não usada mais)
function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function getCurrentDateTime(): string {
  return new Date().toISOString();
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

function calculateNights(checkIn: string, checkOut: string): number {
  const start = parseDate(checkIn);
  const end = parseDate(checkOut);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function datesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = parseDate(start1);
  const e1 = parseDate(end1);
  const s2 = parseDate(start2);
  const e2 = parseDate(end2);
  return s1 < e2 && s2 < e1;
}

function applyDiscount(basePrice: number, discountPercent: number): number {
  const discount = Math.round(basePrice * (discountPercent / 100));
  return basePrice - discount;
}

function calculateReservationPrice(property: any, nights: number) {
  const basePrice = property.pricing.basePrice;
  let tier: PriceTier = 'base';
  let discountPercent = 0;

  if (nights >= 28) {
    tier = 'monthly';
    discountPercent = property.pricing.monthlyDiscount;
  } else if (nights >= 15) {
    tier = 'biweekly';
    discountPercent = property.pricing.biweeklyDiscount;
  } else if (nights >= 7) {
    tier = 'weekly';
    discountPercent = property.pricing.weeklyDiscount;
  }

  const pricePerNight = discountPercent > 0 ? applyDiscount(basePrice, discountPercent) : basePrice;
  const baseTotal = pricePerNight * nights;
  const cleaningFee = Math.round(basePrice * 0.2);
  const serviceFee = Math.round(baseTotal * 0.05);
  const taxes = Math.round(baseTotal * 0.02);
  const discount = discountPercent > 0 ? (basePrice - pricePerNight) * nights : 0;
  const total = baseTotal + cleaningFee + serviceFee + taxes;

  return {
    pricePerNight,
    baseTotal,
    cleaningFee,
    serviceFee,
    taxes,
    discount,
    total,
    currency: property.pricing.currency,
    appliedTier: tier,
  };
}

// ============================================================================
// SEED DATA
// ============================================================================

export function seedMockData() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextMonth = new Date(today);
  nextMonth.setDate(nextMonth.getDate() + 30);

  const properties = [
    {
      id: generateShortCode('PRP'),
      name: 'Apartamento Copacabana 201',
      code: 'COP201',
      type: 'apartment' as PropertyType,
      status: 'active' as PropertyStatus,
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
        basePrice: 35000,
        currency: 'BRL' as Currency,
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
      color: '#3B82F6',
      photos: [],
      description: 'Apartamento moderno com vista para o mar em Copacabana',
      platforms: { airbnb: { enabled: true, listingId: 'ABN123456', syncEnabled: true }, direct: true },
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      ownerId: 'user_123',
      isActive: true,
    },
    {
      id: generateShortCode('PRP'),
      name: 'Casa Ipanema Premium',
      code: 'IPA001',
      type: 'house' as PropertyType,
      status: 'active' as PropertyStatus,
      address: {
        street: 'Rua Visconde de Pirajá',
        number: '500',
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
        basePrice: 80000,
        currency: 'BRL' as Currency,
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
      amenities: ['wifi', 'ar-condicionado', 'piscina', 'churrasqueira'],
      tags: ['praia', 'familia', 'luxo', 'piscina'],
      color: '#10B981',
      photos: [],
      description: 'Casa de alto padrão com piscina em Ipanema',
      platforms: { airbnb: { enabled: true, listingId: 'ABN456789', syncEnabled: true }, direct: true },
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      ownerId: 'user_123',
      isActive: true,
    },
    {
      id: generateShortCode('PRP'),
      name: 'Studio Leblon Compacto',
      code: 'LEB100',
      type: 'studio' as PropertyType,
      status: 'active' as PropertyStatus,
      address: {
        street: 'Rua Dias Ferreira',
        number: '200',
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
        basePrice: 25000,
        currency: 'BRL' as Currency,
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
      amenities: ['wifi', 'ar-condicionado', 'tv'],
      tags: ['praia', 'casal', 'trabalho'],
      color: '#F59E0B',
      photos: [],
      description: 'Studio moderno no coração do Leblon',
      platforms: { direct: true },
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      ownerId: 'user_123',
      isActive: true,
    },
    {
      id: '1', // ID fixo para match com App.tsx
      name: 'Arraial Novo - Barra da Tijuca RJ',
      code: 'ARR001',
      type: 'house' as PropertyType,
      status: 'active' as PropertyStatus,
      address: {
        street: 'Av. das Américas',
        number: '3000',
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
        basePrice: 120000,
        currency: 'BRL' as Currency,
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
      amenities: ['wifi', 'ar-condicionado', 'piscina-privativa', 'jacuzzi'],
      tags: ['praia', 'familia', 'luxo', 'eventos'],
      color: '#8B5CF6',
      photos: [],
      description: 'Cobertura de luxo com piscina privativa',
      platforms: { airbnb: { enabled: true, listingId: 'ABN999888', syncEnabled: true }, direct: true },
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      ownerId: 'user_123',
      isActive: true,
    },
    {
      id: '2', // ID fixo para match com App.tsx
      name: 'Terraço Itaúnas',
      code: 'ITA200',
      type: 'apartment' as PropertyType,
      status: 'active' as PropertyStatus,
      address: {
        street: 'Rua Voluntários da Pátria',
        number: '100',
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
        basePrice: 28000,
        currency: 'BRL' as Currency,
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
      amenities: ['wifi', 'ar-condicionado', 'area-trabalho'],
      tags: ['trabalho', 'moderno', 'wifi-rapido'],
      color: '#EC4899',
      photos: [],
      description: 'Loft moderno ideal para trabalho remoto',
      platforms: { direct: true },
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      ownerId: 'user_123',
      isActive: true,
    },
    {
      id: '3', // ID fixo para match com App.tsx
      name: 'Studio Centro - RJ',
      code: 'CTR300',
      type: 'apartment' as PropertyType,
      status: 'active' as PropertyStatus,
      address: {
        street: 'Av. Rio Branco',
        number: '200',
        neighborhood: 'Centro',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zipCode: '20040-000',
        country: 'BR',
      },
      maxGuests: 2,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      area: 35,
      pricing: {
        basePrice: 20000, // R$ 200/noite
        currency: 'BRL' as Currency,
        weeklyDiscount: 8,
        biweeklyDiscount: 12,
        monthlyDiscount: 15,
      },
      restrictions: {
        minNights: 1,
        maxNights: 30,
        advanceBooking: 0,
        preparationTime: 1,
      },
      amenities: ['wifi', 'ar-condicionado'],
      tags: ['cidade', 'trabalho'],
      color: '#10B981',
      photos: [],
      description: 'Studio compacto no centro',
      platforms: { direct: true },
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      ownerId: 'user_123',
      isActive: true,
    },
    {
      id: '4', // ID fixo para match com App.tsx
      name: 'MARICÁ - RESERVA TIPO CASA',
      code: 'MAR400',
      type: 'house' as PropertyType,
      status: 'active' as PropertyStatus,
      address: {
        street: 'Rua Principal',
        number: '500',
        neighborhood: 'Centro',
        city: 'Maricá',
        state: 'RJ',
        zipCode: '24900-000',
        country: 'BR',
      },
      maxGuests: 6,
      bedrooms: 3,
      beds: 4,
      bathrooms: 2,
      area: 150,
      pricing: {
        basePrice: 28000, // R$ 280/noite
        currency: 'BRL' as Currency,
        weeklyDiscount: 12,
        biweeklyDiscount: 18,
        monthlyDiscount: 22,
      },
      restrictions: {
        minNights: 2,
        maxNights: 60,
        advanceBooking: 1,
        preparationTime: 2,
      },
      amenities: ['wifi', 'piscina', 'churrasqueira', 'jardim'],
      tags: ['praia', 'familia', 'montanha'],
      color: '#F59E0B',
      photos: [],
      description: 'Casa espaçosa em Maricá',
      platforms: { direct: true, airbnb: { enabled: true, syncEnabled: false } },
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      ownerId: 'user_123',
      isActive: true,
    },
  ];

  const guests = [
    {
      id: generateShortCode('GST'),
      firstName: 'João',
      lastName: 'Silva',
      fullName: 'João Silva',
      email: 'joao.silva@email.com',
      phone: '+5521987654321',
      cpf: '12345678901',
      stats: { totalReservations: 0, totalNights: 0, totalSpent: 0 },
      tags: ['frequente', 'vip'],
      isBlacklisted: false,
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      source: 'airbnb' as Platform,
    },
    {
      id: generateShortCode('GST'),
      firstName: 'Maria',
      lastName: 'Santos',
      fullName: 'Maria Santos',
      email: 'maria.santos@email.com',
      phone: '+5511987654321',
      stats: { totalReservations: 0, totalNights: 0, totalSpent: 0 },
      tags: [],
      isBlacklisted: false,
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      source: 'booking' as Platform,
    },
    {
      id: generateShortCode('GST'),
      firstName: 'Robert',
      lastName: 'Johnson',
      fullName: 'Robert Johnson',
      email: 'robert.johnson@email.com',
      phone: '+1234567890',
      passport: 'US123456789',
      stats: { totalReservations: 0, totalNights: 0, totalSpent: 0 },
      tags: ['internacional'],
      isBlacklisted: false,
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      source: 'airbnb' as Platform,
    },
    {
      id: generateShortCode('GST'),
      firstName: 'Ana',
      lastName: 'Costa',
      fullName: 'Ana Costa',
      email: 'ana.costa@email.com',
      phone: '+5521912345678',
      stats: { totalReservations: 0, totalNights: 0, totalSpent: 0 },
      tags: ['business'],
      isBlacklisted: false,
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      source: 'direct' as Platform,
    },
  ];

  const reservations = [
    // 🎯 RESERVA DE TESTE: 20-23 OUTUBRO 2025 - APARTAMENTO COPACABANA 201
    {
      id: generateShortCode('RSV'),
      propertyId: properties[0].id, // Copacabana 201
      guestId: guests[0].id, // João Silva
      checkIn: '2025-10-20',
      checkOut: '2025-10-23',
      nights: 3,
      guests: { adults: 2, children: 0, infants: 0, pets: 0, total: 2 },
      pricing: {
        pricePerNight: 35000, // R$ 350,00
        baseTotal: 105000,    // R$ 1.050,00 (3 noites)
        cleaningFee: 8000,    // R$ 80,00
        serviceFee: 5000,     // R$ 50,00
        taxes: 2000,          // R$ 20,00
        discount: 0,
        total: 120000,        // R$ 1.200,00
        currency: 'BRL' as Currency,
        appliedTier: 'base' as PriceTier,
      },
      status: 'confirmed' as ReservationStatus,
      platform: 'airbnb' as Platform,
      externalId: 'ABN-OCT-20-23',
      payment: { 
        status: 'paid' as PaymentStatus, 
        method: 'platform' as PaymentMethod,
        transactionId: 'TXN-AIRBNB-OCT2025',
      },
      notes: 'Reserva de teste - Outubro 2025',
      internalComments: 'Teste de criação de reserva via Airbnb',
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      createdBy: 'system',
      confirmedAt: getCurrentDateTime(),
    },
    // 🎯 RESERVA DE TESTE: 24-27 OUTUBRO 2025 - APARTAMENTO COPACABANA 201
    {
      id: generateShortCode('RSV'),
      propertyId: properties[0].id, // Copacabana 201
      guestId: guests[1].id, // Maria Santos
      checkIn: '2025-10-24',
      checkOut: '2025-10-27',
      nights: 3,
      guests: { adults: 1, children: 0, infants: 0, pets: 0, total: 1 },
      pricing: {
        pricePerNight: 40000, // R$ 400,00
        baseTotal: 120000,    // R$ 1.200,00 (3 noites)
        cleaningFee: 8000,    // R$ 80,00
        serviceFee: 6000,     // R$ 60,00
        taxes: 2000,          // R$ 20,00
        discount: 0,
        total: 136000,        // R$ 1.360,00
        currency: 'BRL' as Currency,
        appliedTier: 'base' as PriceTier,
      },
      status: 'confirmed' as ReservationStatus,
      platform: 'booking' as Platform,
      externalId: 'BKG-OCT-24-27',
      payment: { 
        status: 'paid' as PaymentStatus, 
        method: 'platform' as PaymentMethod,
        transactionId: 'TXN-BOOKING-OCT2025',
      },
      notes: 'Reserva de teste - Outubro 2025',
      internalComments: 'Reserva via Booking.com',
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      createdBy: 'system',
      confirmedAt: getCurrentDateTime(),
    },
    {
      id: generateId('res'),
      propertyId: properties[1].id, // Casa Ipanema (property diferente para evitar conflito)
      guestId: guests[0].id,
      checkIn: formatDate(tomorrow),
      checkOut: formatDate(new Date(tomorrow.getTime() + 3 * 24 * 60 * 60 * 1000)),
      nights: 3,
      guests: { adults: 2, children: 1, infants: 0, pets: 0, total: 3 },
      pricing: {
        pricePerNight: 70000,
        baseTotal: 210000,
        cleaningFee: 15000,
        serviceFee: 10000,
        taxes: 5000,
        discount: 0,
        total: 240000,
        currency: 'BRL' as Currency,
        appliedTier: 'base' as PriceTier,
      },
      status: 'confirmed' as ReservationStatus,
      platform: 'airbnb' as Platform,
      payment: { status: 'paid' as PaymentStatus, method: 'platform' as PaymentMethod },
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      createdBy: 'system',
      confirmedAt: getCurrentDateTime(),
    },
    {
      id: generateId('res'),
      propertyId: properties[1].id,
      guestId: guests[2].id,
      checkIn: formatDate(nextWeek),
      checkOut: formatDate(new Date(nextWeek.getTime() + 10 * 24 * 60 * 60 * 1000)),
      nights: 10,
      guests: { adults: 4, children: 2, infants: 0, pets: 0, total: 6 },
      pricing: {
        pricePerNight: 70400,
        baseTotal: 704000,
        cleaningFee: 15000,
        serviceFee: 10000,
        taxes: 5000,
        discount: 96000,
        total: 734000,
        currency: 'BRL' as Currency,
        appliedTier: 'weekly' as PriceTier,
      },
      status: 'pending' as ReservationStatus,
      platform: 'booking' as Platform,
      payment: { status: 'pending' as PaymentStatus },
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      createdBy: 'system',
    },
    {
      id: generateId('res'),
      propertyId: properties[2].id,
      guestId: guests[3].id,
      checkIn: formatDate(nextMonth),
      checkOut: formatDate(new Date(nextMonth.getTime() + 5 * 24 * 60 * 60 * 1000)),
      nights: 5,
      guests: { adults: 1, children: 0, infants: 0, pets: 0, total: 1 },
      pricing: {
        pricePerNight: 25000,
        baseTotal: 125000,
        cleaningFee: 5000,
        serviceFee: 3000,
        taxes: 1500,
        discount: 0,
        total: 134500,
        currency: 'BRL' as Currency,
        appliedTier: 'base' as PriceTier,
      },
      status: 'confirmed' as ReservationStatus,
      platform: 'direct' as Platform,
      payment: { status: 'paid' as PaymentStatus, method: 'pix' as PaymentMethod },
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      createdBy: 'system',
      confirmedAt: getCurrentDateTime(),
    },
  ];

  const data = { properties, guests, reservations, blocks: [] };
  saveData(data);
  
  console.log('✅ Mock data seeded:', { 
    properties: properties.length, 
    guests: guests.length, 
    reservations: reservations.length 
  });
  
  return data;
}

// ============================================================================
// MOCK API
// ============================================================================

// Helper: Garante que há dados válidos
function ensureData() {
  const data = loadData();
  
  // Se não há propriedades, força seed
  if (!data.properties || data.properties.length === 0) {
    console.error('🚨 CRÍTICO: Dados vazios detectados durante operação!');
    console.log('🔄 Forçando seed imediato...');
    const seededData = seedMockData();
    localStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);
    return seededData;
  }
  
  return data;
}

export const mockBackend = {
  // Properties
  getProperties: async () => {
    const data = ensureData();
    return { success: true, data: data.properties };
  },

  getProperty: async (id: string) => {
    const data = ensureData();
    const property = data.properties.find((p: any) => p.id === id);
    if (!property) return { success: false, error: 'Property not found' };
    return { success: true, data: property };
  },

  createProperty: async (propertyData: any) => {
    const data = loadData();
    
    // Gerar código curto único para a propriedade
    const existingCodes = data.properties.map((p: any) => p.id);
    
    const newProperty = {
      id: generateShortCode('PRP', existingCodes),
      ...propertyData,
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      isActive: true,
    };
    data.properties.push(newProperty);
    saveData(data);
    return { success: true, data: newProperty };
  },

  updateProperty: async (id: string, updates: any) => {
    const data = loadData();
    const index = data.properties.findIndex((p: any) => p.id === id);
    if (index === -1) return { success: false, error: 'Property not found' };
    data.properties[index] = { ...data.properties[index], ...updates, updatedAt: getCurrentDateTime() };
    saveData(data);
    return { success: true, data: data.properties[index] };
  },

  deleteProperty: async (id: string) => {
    const data = loadData();
    data.properties = data.properties.filter((p: any) => p.id !== id);
    saveData(data);
    return { success: true, data: { id } };
  },

  // Guests
  getGuests: async () => {
    const data = ensureData();
    return { success: true, data: data.guests };
  },

  getGuest: async (id: string) => {
    const data = loadData();
    const guest = data.guests.find((g: any) => g.id === id);
    if (!guest) return { success: false, error: 'Guest not found' };
    return { success: true, data: guest };
  },

  createGuest: async (guestData: any) => {
    const data = loadData();
    
    // Gerar código curto único para o hóspede
    const existingCodes = data.guests.map((g: any) => g.id);
    
    const newGuest = {
      id: generateShortCode('GST', existingCodes),
      ...guestData,
      fullName: `${guestData.firstName} ${guestData.lastName}`,
      stats: { totalReservations: 0, totalNights: 0, totalSpent: 0 },
      tags: guestData.tags || [],
      isBlacklisted: false,
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
    };
    data.guests.push(newGuest);
    saveData(data);
    return { success: true, data: newGuest };
  },

  updateGuest: async (id: string, updates: any) => {
    const data = loadData();
    const index = data.guests.findIndex((g: any) => g.id === id);
    if (index === -1) return { success: false, error: 'Guest not found' };
    data.guests[index] = { ...data.guests[index], ...updates, updatedAt: getCurrentDateTime() };
    saveData(data);
    return { success: true, data: data.guests[index] };
  },

  // Reservations
  getReservations: async () => {
    try {
      const data = ensureData();
      
      // Validar e limpar reservas órfãs (sem propriedade associada)
      const validPropertyIds = new Set(data.properties.map((p: any) => p.id));
      const validGuestIds = new Set(data.guests.map((g: any) => g.id));
      
      const validReservations = data.reservations.filter((r: any) => {
        const hasValidProperty = validPropertyIds.has(r.propertyId);
        const hasValidGuest = validGuestIds.has(r.guestId);
        
        if (!hasValidProperty) {
          console.warn(`⚠️ Reserva órfã detectada e removida: ${r.id} (propriedade ${r.propertyId} não existe)`);
        }
        if (!hasValidGuest) {
          console.warn(`⚠️ Reserva órfã detectada: ${r.id} (hóspede ${r.guestId} não existe)`);
        }
        
        return hasValidProperty && hasValidGuest;
      });
      
      // Se houve limpeza, salvar dados atualizados E mostrar alerta
      if (validReservations.length !== data.reservations.length) {
        const removedCount = data.reservations.length - validReservations.length;
        console.log(`🧹 Limpeza automática: ${removedCount} reservas órfãs removidas`);
        console.warn('💡 Dados inconsistentes foram detectados e limpos automaticamente.');
        console.warn('   Se o problema persistir, clique no botão "Resetar Dados"');
        data.reservations = validReservations;
        saveData(data);
      }
      
      return { success: true, data: validReservations };
    } catch (error) {
      console.error('🔴 ERRO CRÍTICO em getReservations:', error);
      // NUNCA retornar erro - retornar lista vazia
      return { success: true, data: [] };
    }
  },

  getReservation: async (id: string) => {
    const data = loadData();
    const reservation = data.reservations.find((r: any) => r.id === id);
    if (!reservation) return { success: false, error: 'Reservation not found' };
    
    // Verificar se a propriedade associada existe
    const property = data.properties.find((p: any) => p.id === reservation.propertyId);
    if (!property) {
      console.warn(`⚠️ Reserva órfã detectada: ${id} (propriedade ${reservation.propertyId} não existe)`);
      return { success: false, error: 'Property not found' };
    }
    
    return { success: true, data: reservation };
  },

  createReservation: async (reservationData: any) => {
    // VERIFICAÇÃO CRÍTICA: Se detectar dados incompatíveis, FORÇA reload
    const currentVersion = localStorage.getItem(DATA_VERSION_KEY);
    if (currentVersion !== CURRENT_DATA_VERSION) {
      console.error('%c🚨 DADOS DESATUALIZADOS DETECTADOS!', 'color: red; font-size: 16px; font-weight: bold');
      console.error('🔄 Forçando reload em 2 segundos...');
      
      setTimeout(() => {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(DATA_VERSION_KEY);
        window.location.reload();
      }, 2000);
      
      return { 
        success: false, 
        error: 'Dados desatualizados. Recarregando página...' 
      };
    }
    
    const data = loadData();
    
    console.log('📝 Criando reserva:', {
      propertyId: reservationData.propertyId,
      checkIn: reservationData.checkIn,
      checkOut: reservationData.checkOut,
      guestId: reservationData.guestId
    });
    
    console.log('🏠 Propriedades disponíveis:', data.properties.map((p: any) => ({ id: p.id, name: p.name })));

    // Check availability
    const conflicts = data.reservations.filter((r: any) =>
      r.propertyId === reservationData.propertyId &&
      r.status !== 'cancelled' &&
      datesOverlap(reservationData.checkIn, reservationData.checkOut, r.checkIn, r.checkOut)
    );

    if (conflicts.length > 0) {
      console.log('❌ Conflito de datas encontrado');
      return { success: false, error: 'Property not available for these dates' };
    }

    // Get property to calculate price
    const property = data.properties.find((p: any) => p.id === reservationData.propertyId);
    if (!property) {
      console.error('%c🚨 ERRO CRÍTICO: Propriedade não encontrada!', 'color: red; font-size: 16px; font-weight: bold');
      console.error('📋 Dados corrompidos detectados:', {
        buscando: reservationData.propertyId,
        disponiveis: data.properties.map((p: any) => p.id),
        versao: currentVersion
      });
      console.error('🔄 FORÇANDO RELOAD em 3 segundos...');
      
      // FORÇA reload para corrigir
      setTimeout(() => {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(DATA_VERSION_KEY);
        window.location.reload();
      }, 3000);
      
      return { success: false, error: 'Property not found - Recarregando para corrigir...' };
    }
    
    console.log('✅ Propriedade encontrada:', property.name);

    const nights = calculateNights(reservationData.checkIn, reservationData.checkOut);
    const pricing = calculateReservationPrice(property, nights);

    // Gerar código curto único para a reserva
    const existingCodes = data.reservations.map((r: any) => r.id);
    
    const newReservation = {
      id: generateShortCode('RSV', existingCodes),
      propertyId: reservationData.propertyId,
      guestId: reservationData.guestId,
      checkIn: reservationData.checkIn,
      checkOut: reservationData.checkOut,
      nights,
      guests: {
        adults: reservationData.adults || 1,
        children: reservationData.children || 0,
        infants: reservationData.infants || 0,
        pets: reservationData.pets || 0,
        total: (reservationData.adults || 1) + (reservationData.children || 0) + (reservationData.infants || 0) + (reservationData.pets || 0),
      },
      pricing,
      status: 'pending' as ReservationStatus,
      platform: reservationData.platform || 'direct',
      payment: { status: 'pending' as PaymentStatus },
      notes: reservationData.notes,
      specialRequests: reservationData.specialRequests,
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      createdBy: reservationData.createdBy || 'system',
    };

    data.reservations.push(newReservation);
    saveData(data);
    return { success: true, data: newReservation };
  },

  updateReservation: async (id: string, updates: any) => {
    const data = loadData();
    const index = data.reservations.findIndex((r: any) => r.id === id);
    if (index === -1) return { success: false, error: 'Reservation not found' };
    data.reservations[index] = { ...data.reservations[index], ...updates, updatedAt: getCurrentDateTime() };
    saveData(data);
    return { success: true, data: data.reservations[index] };
  },

  cancelReservation: async (id: string) => {
    const data = loadData();
    const index = data.reservations.findIndex((r: any) => r.id === id);
    if (index === -1) return { success: false, error: 'Reservation not found' };
    data.reservations[index] = {
      ...data.reservations[index],
      status: 'cancelled',
      cancelledAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
    };
    saveData(data);
    return { success: true, data: data.reservations[index] };
  },

  // Calendar
  checkAvailability: async (propertyId: string, checkIn: string, checkOut: string) => {
    const data = loadData();
    const conflicts = data.reservations.filter((r: any) =>
      r.propertyId === propertyId &&
      r.status !== 'cancelled' &&
      datesOverlap(checkIn, checkOut, r.checkIn, r.checkOut)
    );

    const available = conflicts.length === 0;
    const response: any = { available };

    if (!available && conflicts.length > 0) {
      response.reason = 'Property is already booked for these dates';
      response.conflictingReservation = {
        id: conflicts[0].id,
        checkIn: conflicts[0].checkIn,
        checkOut: conflicts[0].checkOut,
      };
    }

    return { success: true, data: response };
  },

  getQuote: async (propertyId: string, checkIn: string, checkOut: string) => {
    const data = loadData();
    const property = data.properties.find((p: any) => p.id === propertyId);
    if (!property) {
      return { success: false, error: 'Property not found' };
    }

    const nights = calculateNights(checkIn, checkOut);
    const pricing = calculateReservationPrice(property, nights);

    return {
      success: true,
      data: {
        propertyId,
        checkIn,
        checkOut,
        nights,
        pricing,
      },
    };
  },

  // Locations (Nova Estrutura)
  getLocations: async () => {
    const data = loadData();
    return { success: true, data: data.locations || [] };
  },

  getLocation: async (id: string) => {
    const data = loadData();
    const location = (data.locations || []).find((l: any) => l.id === id);
    if (!location) return { success: false, error: 'Location not found' };
    
    // Retornar com accommodations vinculadas
    const accommodations = data.properties.filter((p: any) => p.locationId === id);
    return { 
      success: true, 
      data: {
        location,
        accommodations
      }
    };
  },

  createLocation: async (locationData: any) => {
    const data = loadData();
    if (!data.locations) data.locations = [];
    
    // Verificar código único
    const codeExists = data.locations.some((l: any) => 
      l.code.toLowerCase() === locationData.code.toLowerCase()
    );
    if (codeExists) {
      return { success: false, error: 'Location code already exists' };
    }
    
    // Gerar código curto único para a location
    const existingCodes = data.locations.map((l: any) => l.id);
    
    const newLocation = {
      id: generateShortCode('LOC', existingCodes),
      ...locationData,
      sharedAmenities: locationData.sharedAmenities || [],
      photos: locationData.photos || [],
      stats: {
        totalAccommodations: 0,
        activeAccommodations: 0
      },
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      ownerId: 'user_123',
      isActive: true,
    };
    
    data.locations.push(newLocation);
    saveData(data);
    return { success: true, data: newLocation };
  },

  updateLocation: async (id: string, updates: any) => {
    const data = loadData();
    if (!data.locations) data.locations = [];
    
    const index = data.locations.findIndex((l: any) => l.id === id);
    if (index === -1) return { success: false, error: 'Location not found' };
    
    // Verificar código único (exceto o próprio)
    if (updates.code) {
      const codeExists = data.locations.some((l: any, i: number) => 
        i !== index && l.code.toLowerCase() === updates.code.toLowerCase()
      );
      if (codeExists) {
        return { success: false, error: 'Location code already exists' };
      }
    }
    
    data.locations[index] = { 
      ...data.locations[index], 
      ...updates, 
      updatedAt: getCurrentDateTime() 
    };
    saveData(data);
    return { success: true, data: data.locations[index] };
  },

  deleteLocation: async (id: string) => {
    const data = loadData();
    if (!data.locations) data.locations = [];
    
    // Verificar se tem accommodations vinculadas
    const hasAccommodations = data.properties.some((p: any) => p.locationId === id);
    if (hasAccommodations) {
      return { 
        success: false, 
        error: 'Cannot delete location with accommodations. Please remove or reassign accommodations first.' 
      };
    }
    
    data.locations = data.locations.filter((l: any) => l.id !== id);
    saveData(data);
    return { success: true, data: { id } };
  },

  getLocationAccommodations: async (id: string) => {
    const data = loadData();
    const location = (data.locations || []).find((l: any) => l.id === id);
    if (!location) return { success: false, error: 'Location not found' };
    
    const accommodations = data.properties.filter((p: any) => p.locationId === id);
    
    return { 
      success: true, 
      data: {
        location: {
          id: location.id,
          name: location.name,
          code: location.code,
          address: location.address
        },
        accommodations,
        total: accommodations.length
      }
    };
  },

  // Utility
  clearAll: () => {
    localStorage.removeItem(STORAGE_KEY);
    return { success: true, data: { message: 'All data cleared' } };
  },

  seedData: () => {
    const data = seedMockData();
    return { success: true, data: { 
      propertiesCount: data.properties.length,
      guestsCount: data.guests.length,
      reservationsCount: data.reservations.length
    }};
  },
  
  seedDataNew: () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // LOCATIONS
    const locations = [
      {
        id: generateId('loc'),
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
          coordinates: { lat: -22.9711, lng: -43.1822 }
        },
        sharedAmenities: ['piscina', 'academia', 'elevador', 'portaria-24h'],
        buildingAccess: {
          type: 'portaria',
          instructions: 'Apresentar documento na portaria',
          hasElevator: true,
          hasParking: true,
          parkingType: 'pago'
        },
        photos: [],
        description: 'Edifício clássico em frente à praia de Copacabana',
        showBuildingNumber: true,
        stats: { totalAccommodations: 2, activeAccommodations: 2 },
        createdAt: getCurrentDateTime(),
        updatedAt: getCurrentDateTime(),
        ownerId: 'user_123',
        isActive: true
      },
      {
        id: generateId('loc'),
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
          coordinates: { lat: -22.9838, lng: -43.1964 }
        },
        sharedAmenities: ['academia', 'elevador', 'portaria-24h', 'salao-festas'],
        buildingAccess: {
          type: 'portaria',
          hasElevator: true,
          hasParking: true,
          parkingType: 'gratuito'
        },
        photos: [],
        description: 'Condomínio residencial de alto padrão em Ipanema',
        showBuildingNumber: true,
        stats: { totalAccommodations: 1, activeAccommodations: 1 },
        createdAt: getCurrentDateTime(),
        updatedAt: getCurrentDateTime(),
        ownerId: 'user_123',
        isActive: true
      },
      {
        id: generateId('loc'),
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
          coordinates: { lat: -23.0041, lng: -43.3636 }
        },
        sharedAmenities: ['piscina', 'academia', 'elevador', 'portaria-24h', 'quadra-tenis'],
        buildingAccess: {
          type: 'portaria',
          hasElevator: true,
          hasParking: true,
          parkingType: 'gratuito'
        },
        photos: [],
        description: 'Residencial moderno na Barra da Tijuca',
        showBuildingNumber: true,
        stats: { totalAccommodations: 1, activeAccommodations: 1 },
        createdAt: getCurrentDateTime(),
        updatedAt: getCurrentDateTime(),
        ownerId: 'user_123',
        isActive: true
      }
    ];
    
    // ACCOMMODATIONS (vinculadas a locations)
    const accommodations = [
      // Copacabana Palace - Apto 201
      {
        id: generateId('acc'),
        name: 'Apartamento 201',
        code: 'COP201',
        locationId: locations[0].id, // Vinculado ao Copacabana Palace
        type: 'apartment' as PropertyType,
        status: 'active' as PropertyStatus,
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
          basePrice: 35000,
          currency: 'BRL' as Currency,
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
        tags: ['praia', 'familia'],
        color: '#3B82F6',
        photos: [],
        description: 'Apartamento moderno com vista para o mar',
        platforms: { airbnb: { enabled: true, listingId: 'ABN123', syncEnabled: true }, direct: true },
        createdAt: getCurrentDateTime(),
        updatedAt: getCurrentDateTime(),
        ownerId: 'user_123',
        isActive: true,
      },
      // Copacabana Palace - Apto 305
      {
        id: generateId('acc'),
        name: 'Apartamento 305',
        code: 'COP305',
        locationId: locations[0].id, // Vinculado ao Copacabana Palace
        type: 'apartment' as PropertyType,
        status: 'active' as PropertyStatus,
        address: {
          street: 'Av. Atlântica',
          number: '1500',
          complement: 'Apto 305',
          neighborhood: 'Copacabana',
          city: 'Rio de Janeiro',
          state: 'RJ',
          zipCode: '22021-000',
          country: 'BR',
        },
        maxGuests: 2,
        bedrooms: 1,
        beds: 1,
        bathrooms: 1,
        area: 40,
        pricing: {
          basePrice: 25000,
          currency: 'BRL' as Currency,
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
        description: 'Studio aconchegante com vista lateral do mar',
        platforms: { airbnb: { enabled: true, listingId: 'ABN124', syncEnabled: true }, direct: true },
        createdAt: getCurrentDateTime(),
        updatedAt: getCurrentDateTime(),
        ownerId: 'user_123',
        isActive: true,
      },
      // Ipanema Residence - Casa 5
      {
        id: generateId('acc'),
        name: 'Casa 5',
        code: 'IPA005',
        locationId: locations[1].id, // Vinculado ao Ipanema Residence
        type: 'house' as PropertyType,
        status: 'active' as PropertyStatus,
        address: {
          street: 'Rua Visconde de Pirajá',
          number: '500',
          complement: 'Casa 5',
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
          basePrice: 80000,
          currency: 'BRL' as Currency,
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
        amenities: ['wifi', 'ar-condicionado', 'piscina-privativa', 'churrasqueira'],
        tags: ['praia', 'familia', 'luxo'],
        color: '#F59E0B',
        photos: [],
        description: 'Casa de alto padrão com piscina privativa',
        platforms: { airbnb: { enabled: true, listingId: 'ABN125', syncEnabled: true }, direct: true },
        createdAt: getCurrentDateTime(),
        updatedAt: getCurrentDateTime(),
        ownerId: 'user_123',
        isActive: true,
      },
      // Barra Beach - Cobertura
      {
        id: generateId('acc'),
        name: 'Cobertura Duplex',
        code: 'BAR300',
        locationId: locations[2].id, // Vinculado ao Barra Beach
        type: 'apartment' as PropertyType,
        status: 'active' as PropertyStatus,
        address: {
          street: 'Av. das Américas',
          number: '3000',
          complement: 'Cobertura 300',
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
          basePrice: 120000,
          currency: 'BRL' as Currency,
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
        amenities: ['wifi', 'ar-condicionado', 'piscina-privativa', 'jacuzzi', 'sauna'],
        tags: ['praia', 'familia', 'luxo', 'eventos'],
        color: '#8B5CF6',
        photos: [],
        description: 'Cobertura duplex de alto luxo com piscina privativa',
        platforms: { airbnb: { enabled: true, listingId: 'ABN126', syncEnabled: true }, direct: true },
        createdAt: getCurrentDateTime(),
        updatedAt: getCurrentDateTime(),
        ownerId: 'user_123',
        isActive: true,
      },
      // Standalone (sem location)
      {
        id: generateId('acc'),
        name: 'Loft Botafogo Moderno',
        code: 'BOT050',
        type: 'loft' as PropertyType,
        status: 'active' as PropertyStatus,
        address: {
          street: 'Rua Voluntários da Pátria',
          number: '100',
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
          basePrice: 28000,
          currency: 'BRL' as Currency,
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
        amenities: ['wifi', 'ar-condicionado', 'area-trabalho'],
        tags: ['trabalho', 'moderno'],
        color: '#EC4899',
        photos: [],
        description: 'Loft moderno ideal para trabalho remoto',
        platforms: { direct: true },
        createdAt: getCurrentDateTime(),
        updatedAt: getCurrentDateTime(),
        ownerId: 'user_123',
        isActive: true,
      }
    ];
    
    // GUESTS
    const guests = [
      {
        id: generateId('guest'),
        firstName: 'Carlos',
        lastName: 'Oliveira',
        fullName: 'Carlos Oliveira',
        email: 'carlos.oliveira@email.com',
        phone: '+5521987654321',
        stats: { totalReservations: 0, totalNights: 0, totalSpent: 0 },
        tags: [],
        isBlacklisted: false,
        createdAt: getCurrentDateTime(),
        updatedAt: getCurrentDateTime(),
        source: 'direct' as Platform,
      },
      {
        id: generateId('guest'),
        firstName: 'Ana',
        lastName: 'Silva',
        fullName: 'Ana Silva',
        email: 'ana.silva@email.com',
        phone: '+5511987654321',
        stats: { totalReservations: 0, totalNights: 0, totalSpent: 0 },
        tags: [],
        isBlacklisted: false,
        createdAt: getCurrentDateTime(),
        updatedAt: getCurrentDateTime(),
        source: 'airbnb' as Platform,
      }
    ];
    
    // RESERVATION
    const reservations = [
      {
        id: generateId('res'),
        propertyId: accommodations[0].id,
        guestId: guests[0].id,
        checkIn: formatDate(tomorrow),
        checkOut: formatDate(new Date(tomorrow.getTime() + 3 * 24 * 60 * 60 * 1000)),
        nights: 3,
        guests: { adults: 2, children: 1, infants: 0, pets: 0, total: 3 },
        pricing: {
          pricePerNight: 35000,
          baseTotal: 105000,
          cleaningFee: 7000,
          serviceFee: 5250,
          taxes: 2100,
          discount: 0,
          total: 119350,
          currency: 'BRL' as Currency,
          appliedTier: 'base' as PriceTier,
        },
        status: 'confirmed' as ReservationStatus,
        platform: 'direct' as Platform,
        payment: { status: 'paid' as PaymentStatus, method: 'pix' as PaymentMethod },
        createdAt: getCurrentDateTime(),
        updatedAt: getCurrentDateTime(),
        createdBy: 'system',
        confirmedAt: getCurrentDateTime(),
      }
    ];
    
    const data = { 
      locations, 
      properties: accommodations, 
      guests, 
      reservations, 
      blocks: [] 
    };
    saveData(data);
    
    const linkedCount = accommodations.filter((a: any) => a.locationId).length;
    const standaloneCount = accommodations.filter((a: any) => !a.locationId).length;
    
    console.log('✅ Mock data (NEW STRUCTURE) seeded:', { 
      locations: locations.length,
      accommodations: accommodations.length,
      linked: linkedCount,
      standalone: standaloneCount,
      guests: guests.length,
      reservations: reservations.length
    });
    
    return {
      success: true,
      data: {
        locationsCount: locations.length,
        accommodationsCount: accommodations.length,
        linkedAccommodations: linkedCount,
        standaloneAccommodations: standaloneCount,
        guestsCount: guests.length,
        reservationsCount: reservations.length
      }
    };
  },

  // Blocks
  getBlocks: async () => {
    const data = loadData();
    return { success: true, data: data.blocks || [] };
  },

  createBlock: async (blockData: any) => {
    const data = loadData();
    
    // Verificar se propriedade existe
    const property = data.properties.find((p: any) => p.id === blockData.propertyId);
    if (!property) {
      return { success: false, error: 'Property not found', timestamp: getCurrentDateTime() };
    }
    
    // Calcular número de noites
    const nights = calculateNights(blockData.startDate, blockData.endDate);
    
    // Criar bloqueio
    const newBlock = {
      id: generateId('block'),
      propertyId: blockData.propertyId,
      startDate: blockData.startDate,
      endDate: blockData.endDate,
      nights,
      type: 'block', // Tipo único
      subtype: blockData.subtype || undefined, // Subtipo opcional
      reason: blockData.reason,
      notes: blockData.notes,
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
      createdBy: 'system'
    };
    
    // Inicializar array de blocks se não existir
    if (!data.blocks) {
      data.blocks = [];
    }
    
    data.blocks.push(newBlock);
    saveData(data);
    
    console.log('✅ Bloqueio criado no mockBackend:', newBlock);
    
    return { success: true, data: newBlock, timestamp: getCurrentDateTime() };
  },

  updateBlock: async (id: string, updateData: any) => {
    const data = loadData();
    
    // Encontrar o bloqueio
    const blockIndex = data.blocks?.findIndex((b: any) => b.id === id);
    if (blockIndex === undefined || blockIndex === -1) {
      return { success: false, error: 'Block not found', timestamp: getCurrentDateTime() };
    }
    
    // Atualizar bloqueio
    const currentBlock = data.blocks[blockIndex];
    const updatedBlock = {
      ...currentBlock,
      ...updateData,
      updatedAt: getCurrentDateTime()
    };
    
    // Se as datas foram atualizadas, recalcular número de noites
    if (updateData.startDate || updateData.endDate) {
      const newStartDate = updateData.startDate || currentBlock.startDate;
      const newEndDate = updateData.endDate || currentBlock.endDate;
      updatedBlock.nights = calculateNights(newStartDate, newEndDate);
    }
    
    data.blocks[blockIndex] = updatedBlock;
    saveData(data);
    
    console.log('✅ Bloqueio atualizado no mockBackend:', updatedBlock);
    
    return { success: true, data: updatedBlock, timestamp: getCurrentDateTime() };
  },

  deleteBlock: async (id: string) => {
    const data = loadData();
    
    // Encontrar o bloqueio
    const blockIndex = data.blocks?.findIndex((b: any) => b.id === id);
    if (blockIndex === undefined || blockIndex === -1) {
      return { success: false, error: 'Block not found', timestamp: getCurrentDateTime() };
    }
    
    // Remover bloqueio
    const deletedBlock = data.blocks[blockIndex];
    data.blocks.splice(blockIndex, 1);
    saveData(data);
    
    console.log('✅ Bloqueio deletado no mockBackend:', deletedBlock);
    
    return { success: true, data: null, timestamp: getCurrentDateTime() };
  },
};

// ============================================================================
// MOCK MODE CONTROL - DESABILITADO PERMANENTEMENTE (v1.0.103.305)
// ============================================================================

/**
 * ⚠️ MOCK DESABILITADO PERMANENTEMENTE
 * 
 * Esta função agora SEMPRE retorna false.
 * O sistema usa APENAS Supabase para garantir consistência.
 * 
 * @returns {boolean} Sempre false
 */
export function isMockEnabled(): boolean {
  console.warn('⚠️ MOCK MODE DESABILITADO - Sistema usa apenas Supabase (desde v1.0.103.305)');
  
  // Limpar flag antiga se existir
  if (localStorage.getItem(MOCK_ENABLED_KEY)) {
    localStorage.removeItem(MOCK_ENABLED_KEY);
    console.log('🧹 Flag de mock antiga removida');
  }
  
  return false; // SEMPRE false
}

/**
 * ⚠️ FUNÇÃO DESABILITADA
 * Mock mode não pode mais ser habilitado
 */
export function enableMockMode() {
  console.error('❌ MOCK MODE DESABILITADO - Sistema usa apenas Supabase');
  console.error('📖 Ver: /docs/⚠️_APRENDIZADO_CRITICO_SUPABASE_ONLY.md');
  // Não faz nada - função desabilitada
}

/**
 * ⚠️ FUNÇÃO DESABILITADA
 * Mock mode não pode ser desabilitado porque já está permanentemente desabilitado
 */
export function disableMockMode() {
  console.log('ℹ️ Mock já está desabilitado permanentemente (desde v1.0.103.305)');
}

/**
 * ⚠️ FUNÇÃO DESABILITADA
 * Não é mais possível alternar entre mock e real - sempre usa Supabase
 */
export function toggleMockMode() {
  console.error('❌ TOGGLE MOCK DESABILITADO - Sistema usa apenas Supabase');
  console.error('📖 Ver: /docs/⚠️_APRENDIZADO_CRITICO_SUPABASE_ONLY.md');
  return false; // Sempre retorna false (mock desabilitado)
}

// ============================================================================
// AUTO-INITIALIZE - DESABILITADO (v1.0.103.305)
// ============================================================================

// Mock permanentemente desabilitado - limpar flags antigas
if (localStorage.getItem(MOCK_ENABLED_KEY)) {
  localStorage.removeItem(MOCK_ENABLED_KEY);
  console.log('🧹 Flag de mock antiga removida - Sistema usa apenas Supabase');
}

// ============================================================================
// RESET FORÇADO AUTOMÁTICO - DESABILITADO (v1.0.103.305)
// ============================================================================
// Mock desabilitado - não há mais validação de dados mock
// Todos os dados agora vêm do Supabase
if (false) { // Código legado desabilitado
  const currentVersion = localStorage.getItem(DATA_VERSION_KEY);
  const stored = localStorage.getItem(STORAGE_KEY);
  let needsReset = false;
  let resetReason = '';
  
  console.log('🔍 Verificando integridade dos dados...');
  console.log(`📦 Versão encontrada: ${currentVersion} | Versão necessária: ${CURRENT_DATA_VERSION}`);
  
  // MOTIVO 1: Versão desatualizada
  if (currentVersion !== CURRENT_DATA_VERSION) {
    needsReset = true;
    resetReason = 'Versão desatualizada';
  }
  
  // MOTIVO 2: Sem dados
  if (!stored) {
    needsReset = true;
    resetReason = 'Sem dados no localStorage';
  }
  
  // MOTIVO 3: Dados vazios ou corrompidos
  if (stored && !needsReset) {
    try {
      const data = JSON.parse(stored);
      if (!data.properties || data.properties.length === 0) {
        needsReset = true;
        resetReason = 'Propriedades vazias';
      }
    } catch (e) {
      needsReset = true;
      resetReason = 'Dados corrompidos (JSON inválido)';
    }
  }
  
  // Se precisa reset, FORÇA imediatamente
  if (needsReset) {
    console.log('%c🔥 RESET NECESSÁRIO!', 'color: red; font-size: 16px; font-weight: bold');
    console.log(`%c📋 Motivo: ${resetReason}`, 'color: orange; font-size: 14px;');
    console.log('%c🔄 RESETANDO DADOS AUTOMATICAMENTE...', 'color: orange; font-size: 14px; font-weight: bold');
    
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(DATA_VERSION_KEY);
    seedMockData();
    localStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);
    
    console.log('%c✅ RESET COMPLETO! Dados atualizados para versão 4.0', 'color: green; font-size: 16px; font-weight: bold');
    console.log('📊 Estrutura criada - 5 Propriedades, 4 Hóspedes, 3 Reservas');
    
    // Validar que os dados foram criados corretamente
    const newData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    console.log('✅ Validação:', {
      properties: newData.properties?.length || 0,
      guests: newData.guests?.length || 0,
      reservations: newData.reservations?.length || 0
    });
    console.log('💡 Para testar Locations, use: devApi.seedDatabaseNew()');
  } else {
    // Versão correta, mas verifica integridade dos dados
    const data = loadData();
    const hasAllProperties = 
      data.properties.find((p: any) => p.id === '1') &&
      data.properties.find((p: any) => p.id === '2') &&
      data.properties.find((p: any) => p.id === '3') &&
      data.properties.find((p: any) => p.id === '4');
    
    if (!hasAllProperties) {
      console.log('%c⚠️ DADOS CORROMPIDOS DETECTADOS!', 'color: orange; font-size: 14px; font-weight: bold');
      console.log('🔄 Recriando dados...');
      
      localStorage.removeItem(STORAGE_KEY);
      seedMockData();
      
      console.log('%c✅ Dados corrigidos!', 'color: green; font-size: 14px; font-weight: bold');
    } else {
      console.log('%c✅ Dados OK - Versão 4.0', 'color: green; font-size: 12px');
      console.log('📍 Locations disponíveis:', data.locations?.length || 0);
      console.log('🏠 Properties disponíveis:', data.properties?.length || 0);
    }
  }
}
