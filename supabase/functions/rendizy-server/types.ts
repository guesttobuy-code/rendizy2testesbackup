// ============================================================================
// TIPOS COMPARTILHADOS - BACKEND
// ============================================================================
// Data: 26 de Outubro de 2025
// Sistema: Gestão de Imóveis de Temporada
// Arquitetura: LOCATION → ACCOMMODATION (hierarquia de 2 níveis)
// ============================================================================

// ============================================================================
// LOCATION (LOCALIZAÇÃO / PRÉDIO / ENDEREÇO FÍSICO)
// ============================================================================
// Representa o prédio/condomínio/hotel - Container físico das unidades
// Exemplo: "Edifício Copacabana Palace" (contém múltiplos apartamentos)
// NÃO é anunciado/vendido diretamente - apenas organiza as unidades

export interface Location {
  id: string; // "loc_uuid"
  shortId?: string; // 🆕 v1.0.103.271 - ID curto (6 chars): "LOC2A3"
  name: string; // "Edifício Copacabana Palace"
  code: string; // "COP" ou "BY02J"

  // Endereço completo (herdado por todas as Accommodations)
  address: {
    street: string; // "Av. Atlântica"
    number: string; // "1500"
    neighborhood: string; // "Copacabana"
    city: string; // "Rio de Janeiro"
    state: string; // "RJ"
    zipCode: string; // "22021-000"
    country: string; // "BR"
    coordinates?: {
      // Coordenadas GPS
      lat: number;
      lng: number;
    };
  };

  // Amenities compartilhados do prédio/condomínio
  sharedAmenities: string[]; // ['piscina', 'academia', 'elevador', 'portaria-24h']

  // Informações administrativas
  management?: {
    company?: string; // Nome da administradora
    manager?: string; // Nome do síndico/gerente
    phone?: string; // Telefone da administração
    email?: string; // Email da administração
  };

  // Informações de acesso ao prédio
  buildingAccess?: {
    type: "portaria" | "código" | "livre" | "outro";
    instructions?: string; // Instruções de acesso
    hasElevator: boolean;
    hasParking: boolean;
    parkingType?: "gratuito" | "pago" | "rotativo";
  };

  // Fotos do prédio/condomínio
  photos: string[]; // URLs das fotos externas
  coverPhoto?: string; // Foto de capa do prédio

  // Descrição
  description?: string; // Descrição do prédio/localização

  // Configurações
  showBuildingNumber: boolean; // Mostrar número do prédio nos anúncios?

  // Estatísticas
  stats?: {
    totalAccommodations: number; // Total de unidades neste Location
    activeAccommodations: number; // Unidades ativas
  };

  // Metadata
  createdAt: string;
  updatedAt: string;
  ownerId: string; // ID do usuário dono
  isActive: boolean;
}

// ============================================================================
// ACCOMMODATION (ACOMODAÇÃO / UNIDADE)
// ============================================================================
// Representa uma unidade individual dentro de um Location
// Exemplo: "Apartamento 101" dentro do "Edifício Copacabana Palace"
// É o produto vendável - pode ser anunciado e reservado

export interface Property {
  id: string; // "acc_uuid" (accommodation)
  shortId?: string; // 🆕 v1.0.103.271 - ID curto (6 chars): "PRP7K9"
  name: string; // "Apartamento 101" (nome interno)
  code: string; // "COP201"
  type: PropertyType;
  status: PropertyStatus;

  // 🔗 VÍNCULO COM LOCATION (hierarquia)
  locationId?: string; // ID do Location pai (opcional para compatibilidade)

  // 🆕 TIPO DE ANÚNCIO (v1.0.103.80)
  // 'individual': Anúncio standalone (casa, apt sem prédio) - location_amenities EDITÁVEIS
  // 'location-linked': Anúncio vinculado a Location - location_amenities READ-ONLY (herdados)
  propertyType: "individual" | "location-linked";

  // Localização (DEPRECATED quando locationId existe - usar Location.address)
  // Mantido para compatibilidade com sistema atual
  address: {
    street: string;
    number: string;
    complement?: string; // "Apto 101", "Bloco A", "Torre 2"
    neighborhood: string;
    city: string;
    state: string;
    stateCode?: string; // 🆕 v1.0.103.261 - UF (ex: "RJ", "SP")
    zipCode: string;
    country: string;
    coordinates?: {
      // 🆕 v1.0.103.261 - Coordenadas GPS
      lat: number;
      lng: number;
    };
  };

  // Capacidade
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  area?: number; // m²

  // Preços (por noite em centavos)
  pricing: {
    basePrice: number; // Preço base (em centavos)
    currency: Currency;

    // Tiers de desconto (percentual)
    weeklyDiscount: number; // 7+ noites (ex: 10 = 10%)
    biweeklyDiscount: number; // 15+ noites (ex: 15 = 15%)
    monthlyDiscount: number; // 28+ noites (ex: 20 = 20%)
  };

  // Restrições
  restrictions: {
    minNights: number; // Mínimo de noites
    maxNights: number; // Máximo de noites
    advanceBooking: number; // Dias de antecedência mínima
    preparationTime: number; // Dias entre reservas
  };

  // 🆕 AMENIDADES SEPARADAS (v1.0.103.80)
  // Location Amenities: Amenidades do prédio/local
  //   - Se propertyType='individual': EDITÁVEIS
  //   - Se propertyType='location-linked': READ-ONLY (herdados do Location)
  locationAmenities: string[]; // ['pool', 'gym', 'parking', '24h-security', ...]

  // Listing Amenities: Amenidades da unidade específica (sempre EDITÁVEIS)
  listingAmenities: string[]; // ['wifi', 'ac', 'tv', 'kitchen', ...]

  // DEPRECATED: amenities (mantido para compatibilidade)
  amenities: string[]; // ['wifi', 'pool', 'parking', 'ac', ...]

  // Tags e Organização
  tags: string[]; // ['praia', 'luxo', 'familia']
  folder?: string; // ID da pasta/categoria
  color?: string; // Cor no calendário (hex)

  // Fotos
  photos: string[]; // URLs das fotos
  coverPhoto?: string; // URL da foto de capa

  // Descrição
  description?: string;
  shortDescription?: string;

  // Plataformas
  platforms: {
    airbnb?: {
      enabled: boolean;
      listingId: string;
      syncEnabled: boolean;
    };
    booking?: {
      enabled: boolean;
      listingId: string;
      syncEnabled: boolean;
    };
    decolar?: {
      enabled: boolean;
      listingId: string;
      syncEnabled: boolean;
    };
    direct: boolean; // Reserva direta habilitada
  };

  // 🆕 v1.0.103.261 - STEP 1: Tipo e Identificação Estendidos
  accommodationType?: string; // Tipo de anúncio (separado do tipo de localização)
  subtype?: "entire_place" | "private_room" | "shared_room";
  modalities?: ("short_term_rental" | "buy_sell" | "residential_rental")[];
  registrationNumber?: string; // Número de registro municipal/IPTU

  // 🆕 v1.0.103.261 - STEP 1: Dados Financeiros Adicionais
  financialInfo?: {
    // Locação Residencial
    monthlyRent?: number; // Aluguel mensal (R$)
    monthlyIptu?: number; // IPTU mensal (R$)
    monthlyCondo?: number; // Condomínio mensal (R$)
    monthlyFees?: number; // Taxas extras mensais (R$)

    // Compra e Venda
    salePrice?: number; // Preço de venda (R$)
    annualIptu?: number; // IPTU anual (R$)
  };

  // 🆕 v1.0.103.261 - STEP 2: Configurações de Exibição
  displaySettings?: {
    showBuildingNumber: "global" | "individual";
  };

  // 🆕 v1.0.103.261 - STEP 2: Características do Local
  locationFeatures?: {
    hasExpressCheckInOut?: boolean;
    hasParking?: boolean;
    hasCableInternet?: boolean;
    hasWiFi?: boolean;
    has24hReception?: boolean;
  };

  // 🆕 v1.0.103.261 - STEP 8: Contrato e Taxas (CRÍTICO!)
  contract?: {
    managerId?: string; // ID do gestor da propriedade
    registeredDate?: string; // Data de registro do contrato
    isSublet: boolean; // É sublocação?
    isExclusive: boolean; // Contrato exclusivo?
    startDate?: string; // Início do contrato
    endDate?: string; // Fim do contrato
    blockCalendarAfterEnd: boolean; // Bloquear calendário após término?

    commission: {
      model: "global" | "individual";
      type?: "percentage" | "fixed_monthly";
      percentage?: number; // % de comissão (ex: 15 = 15%)
      calculationBase?: "accommodation_source" | "total_daily" | "gross_daily";
      considerChannelFees: boolean;
      deductChannelFees: boolean;
      allowExclusiveTransfer: boolean;
    };

    charges: {
      electricityMode: "global" | "individual";
    };

    notifications: {
      showReservationsInOwnerCalendar: "global" | "individual";
      ownerPreReservationEmail: "global" | "individual";
      agentPreReservationEmail: "global" | "individual";
      ownerConfirmedReservationEmail: "global" | "individual";
      agentConfirmedReservationEmail: "global" | "individual";
      cancellationEmail: "global" | "individual";
      deletedReservationEmail: "global" | "individual";
      reserveLinkBeforeCheckout: "global" | "individual";
    };
  };

  // 🆕 v1.0.103.264 - STEP 3: Cômodos Detalhados
  rooms?: Array<{
    id: string;
    name: string;
    type: "bedroom" | "bathroom" | "living_room" | "kitchen" | "other";
    bedType?: string;
    bedCount?: number;
    amenities?: string[];
  }>;

  // 🆕 v1.0.103.264 - STEP 7: Descrição Estendida
  highlights?: string[]; // Destaques do imóvel
  houseRules?: string; // Regras da casa (texto livre)
  customFields?: Array<{
    // Campos personalizados
    fieldId: string;
    label: string;
    value: string;
  }>;

  // 🆕 v1.0.103.264 - STEP 9: Configurações de Venda
  saleSettings?: {
    acceptsFinancing: boolean; // Aceita financiamento
    acceptsTrade: boolean; // Aceita permuta
    exclusiveSale: boolean; // Venda exclusiva
  };

  // 🆕 SISTEMA DE RASCUNHO (2025-12-02)
  wizardData?: any; // Dados completos do wizard em JSONB (preserva tudo)
  completionPercentage?: number; // Percentual de conclusão (0-100)
  completedSteps?: string[]; // Array de step IDs completados

  // 🆕 v1.0.103.264 - STEP 10: Configurações Sazonais Completas
  seasonalPricing?: {
    configMode: "global" | "individual";
    region: "global" | "individual";
    discountPolicy: "global" | "individual";
    longStayDiscount: number; // Desconto para estadias longas (%)

    deposit: {
      mode: "global" | "individual";
      amount: number; // Valor do depósito
      currency: string; // Moeda do depósito
    };

    dynamicPricing: {
      mode: "global" | "individual";
      enabled: boolean; // Precificação dinâmica ativada
    };

    fees: {
      mode: "global" | "individual";
      cleaning: {
        amount: number;
        paidBy: "guest" | "owner";
      };
      pet: {
        amount: number;
        paidBy: "guest" | "owner";
      };
      extraServices: {
        amount: number;
        paidBy: "guest" | "owner";
      };
    };
  };

  // 🆕 v1.0.103.264 - STEP 11: Precificação Avançada Individual
  advancedPricing?: {
    mode: "global" | "individual";

    stayDiscounts: {
      enabled: boolean;
      weekly: number; // Desconto semanal (%)
      monthly: number; // Desconto mensal (%)
    };

    seasonalPeriods: {
      enabled: boolean;
      periods: Array<{
        id: string;
        name: string; // "Alta Temporada", "Carnaval", etc
        startDate: string; // ISO date
        endDate: string; // ISO date
        pricePerNight: number; // Preço por noite neste período
        minNights: number; // Mínimo de noites neste período
        color: string; // Cor para exibição no calendário
      }>;
    };

    weekdayPricing: {
      enabled: boolean;
      prices: {
        monday: number;
        tuesday: number;
        wednesday: number;
        thursday: number;
        friday: number;
        saturday: number;
        sunday: number;
      };
    };

    specialDates: {
      enabled: boolean;
      dates: Array<{
        id: string;
        name: string; // "Réveillon", "Carnaval", etc
        date: string; // ISO date
        pricePerNight: number; // Preço especial
        minNights: number; // Mínimo de noites
      }>;
    };
  };

  // 🆕 v1.0.103.264 - STEP 12: Preços Derivados (Hóspedes Extras e Crianças)
  derivedPricing?: {
    guestPricing: {
      variesByGuests: boolean; // Preço varia por número de hóspedes
      maxGuestsIncluded: number; // Hóspedes inclusos no preço base
      extraGuestFee: {
        type: "fixed" | "percentage";
        value: number; // Valor ou % por hóspede extra
      };
    };

    childrenPricing: {
      chargeForChildren: boolean; // Cobrar por crianças
      chargeType: "per_night" | "per_stay";
      ageBrackets: Array<{
        id: string;
        name: string; // "Bebê", "Criança", "Adolescente"
        minAge: number;
        maxAge: number;
        feeType: "fixed" | "percentage";
        feeValue: number;
      }>;
    };
  };

  // 🆕 v1.0.103.264 - STEP 13: Regras de Hospedagem Completas
  rules?: {
    checkIn: {
      time: string; // "14:00"
      type: "physical_key" | "code" | "app" | "other";
      instructions?: string; // Instruções de check-in
    };

    checkOut: {
      time: string; // "12:00"
    };

    policies: {
      allowPets: boolean;
      allowSmoking: boolean;
      allowEvents: boolean;
    };

    quietHours?: {
      start: string; // "22:00"
      end: string; // "08:00"
    };

    restrictions: {
      minAge?: number; // Idade mínima do responsável
      maxGuests: number; // Máximo de hóspedes
    };

    houseRules?: string; // Texto livre com regras
    additionalRules?: string[]; // Lista de regras adicionais
  };

  // 🆕 v1.0.103.264 - STEP 14: Configurações de Reserva
  bookingSettings?: {
    instantBooking: boolean; // Reserva instantânea
    requireApproval: boolean; // Requer aprovação
    advanceNoticeHours: number; // Horas de antecedência mínima
    availabilityWindowMonths: number; // Meses de antecedência máxima
  };

  // 🆕 v1.0.103.264 - STEP 16: Configurações iCal
  icalSettings?: {
    importUrl?: string; // URL para importar calendário
    exportUrl?: string; // URL para exportar calendário
    syncEnabled: boolean; // Sincronização ativada
    syncIntervalMinutes: number; // Intervalo de sincronização
    lastSyncAt?: string; // Última sincronização (ISO date)
  };

  // Metadata
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  ownerId: string; // ID do usuário dono
  isActive: boolean; // Ativo/Inativo
}

export type PropertyType =
  | "apartment"
  | "house"
  | "studio"
  | "loft"
  | "condo"
  | "villa"
  | "other";

export type PropertyStatus =
  | "active" // Disponível para reservas
  | "inactive" // Não disponível
  | "maintenance" // Em manutenção
  | "draft"; // Rascunho

// ============================================================================
// RESERVA
// ============================================================================

export interface Reservation {
  id: string; // "res_uuid"
  propertyId: string; // "prop_uuid"
  guestId: string; // "guest_uuid"

  // Datas
  checkIn: string; // ISO date (YYYY-MM-DD)
  checkOut: string; // ISO date (YYYY-MM-DD)
  nights: number; // Calculado automaticamente

  // Hóspedes
  guests: {
    adults: number;
    children: number;
    infants: number;
    pets: number;
    total: number; // Calculado
  };

  // Preço
  pricing: {
    pricePerNight: number; // Em centavos
    baseTotal: number; // Total sem taxas
    cleaningFee: number; // Taxa de limpeza
    serviceFee: number; // Taxa de serviço
    taxes: number; // Impostos
    discount: number; // Desconto aplicado
    total: number; // Total final
    currency: Currency;
    appliedTier?: PriceTier; // Tier aplicado
  };

  // Status
  status: ReservationStatus;

  // Plataforma de origem
  platform: Platform;
  externalId?: string; // ID na plataforma externa
  externalUrl?: string; // Link para a reserva externa

  // Pagamento
  payment: {
    status: PaymentStatus;
    method?: PaymentMethod;
    transactionId?: string;
    paidAt?: string; // ISO date
    refundedAt?: string; // ISO date
  };

  // Comunicação
  notes?: string; // Observações visíveis para hóspede
  internalComments?: string; // Comentários apenas equipe
  specialRequests?: string; // Pedidos especiais do hóspede

  // Check-in/out
  checkInTime?: string; // HH:mm
  checkOutTime?: string; // HH:mm
  actualCheckIn?: string; // ISO datetime
  actualCheckOut?: string; // ISO datetime

  // Cancelamento
  cancelledAt?: string; // ISO date
  cancelledBy?: string; // user_id ou 'guest' ou 'system'
  cancellationReason?: string;

  // Metadata
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  createdBy: string; // ID do usuário que criou
  confirmedAt?: string; // ISO date
}

export type ReservationStatus =
  | "pending" // Aguardando confirmação
  | "confirmed" // Confirmada
  | "checked_in" // Hóspede fez check-in
  | "checked_out" // Hóspede fez check-out
  | "completed" // Completada
  | "cancelled" // Cancelada
  | "no_show"; // Não compareceu

export type PaymentStatus =
  | "pending" // Aguardando pagamento
  | "partial" // Parcialmente pago
  | "paid" // Pago
  | "refunded" // Reembolsado
  | "failed"; // Falhou

export type PaymentMethod =
  | "credit_card"
  | "debit_card"
  | "pix"
  | "bank_transfer"
  | "cash"
  | "platform"; // Pago pela plataforma (Airbnb, etc.)

export type Platform =
  | "airbnb"
  | "booking"
  | "decolar"
  | "direct" // Reserva direta
  | "other";

export type PriceTier =
  | "base" // Preço base
  | "weekly" // 7+ noites
  | "biweekly" // 15+ noites
  | "monthly"; // 28+ noites

export type Currency = "BRL" | "USD" | "EUR";

// ============================================================================
// HÓSPEDE
// ============================================================================

export interface Guest {
  id: string; // "guest_uuid"

  // Dados pessoais
  firstName: string;
  lastName: string;
  fullName: string; // Calculado
  email: string;
  phone: string;

  // Documentos
  cpf?: string;
  passport?: string;
  rg?: string;

  // Endereço
  address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };

  // Dados demográficos
  birthDate?: string; // ISO date
  nationality?: string;
  language?: string; // 'pt-BR', 'en', 'es', etc.

  // Histórico
  stats: {
    totalReservations: number;
    totalNights: number;
    totalSpent: number; // Em centavos
    averageRating?: number; // 0-5
    lastStayDate?: string; // ISO date
  };

  // Preferências
  preferences?: {
    earlyCheckIn: boolean;
    lateCheckOut: boolean;
    quietFloor: boolean;
    highFloor: boolean;
    pets: boolean;
  };

  // Tags
  tags: string[]; // ['vip', 'frequent', 'business']

  // Blacklist
  isBlacklisted: boolean;
  blacklistReason?: string;
  blacklistedAt?: string; // ISO date
  blacklistedBy?: string; // user_id

  // Notas
  notes?: string; // Observações sobre o hóspede

  // Metadata
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  source: Platform; // De onde veio o hóspede
}

// ============================================================================
// BLOQUEIO
// ============================================================================

export interface Block {
  id: string; // "block_uuid"
  propertyId: string; // "prop_uuid"

  // Datas
  startDate: string; // ISO date (YYYY-MM-DD)
  endDate: string; // ISO date (YYYY-MM-DD)
  nights: number; // Calculado

  // Tipo (sempre 'block', subtipo é opcional)
  type: "block";

  // Subtipo opcional
  subtype?: BlockSubtype;

  // Informações
  reason: string;
  notes?: string;

  // Metadata
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  createdBy: string; // user_id
}

export type BlockSubtype =
  | "simple" // Bloqueio simples
  | "maintenance" // Manutenção
  | "predictive"; // Bloqueio preditivo

// ============================================================================
// PREÇO CUSTOMIZADO
// ============================================================================

export interface CustomPrice {
  id: string; // "price_uuid"
  propertyId: string; // "prop_uuid"

  // Data
  date: string; // ISO date (YYYY-MM-DD)

  // Preço
  price: number; // Em centavos

  // Tipo
  type: "special" | "seasonal" | "event";

  // Informações
  reason?: string; // Ex: "Réveillon", "Carnaval"

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================================
// MÍNIMO DE NOITES CUSTOMIZADO
// ============================================================================

export interface CustomMinNights {
  id: string; // "minnight_uuid"
  propertyId: string; // "prop_uuid"

  // Data
  date: string; // ISO date (YYYY-MM-DD)

  // Valor
  minNights: number;

  // Informações
  reason?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================================
// USUÁRIO (EQUIPE)
// ============================================================================

export interface User {
  id: string; // UUID do Supabase Auth
  email: string;

  // Perfil
  firstName: string;
  lastName: string;
  fullName: string;
  avatar?: string; // URL

  // Permissões
  role: UserRole;
  permissions: Permission[];

  // Metadata
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  isActive: boolean;
}

export type UserRole =
  | "owner" // Dono/Admin
  | "manager" // Gerente
  | "staff" // Equipe
  | "viewer"; // Apenas visualização

export type Permission =
  | "properties.view"
  | "properties.create"
  | "properties.edit"
  | "properties.delete"
  | "reservations.view"
  | "reservations.create"
  | "reservations.edit"
  | "reservations.cancel"
  | "guests.view"
  | "guests.edit"
  | "pricing.view"
  | "pricing.edit"
  | "reports.view"
  | "settings.view"
  | "settings.edit";

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

// ============================================================================
// LOCATION DTOs
// ============================================================================

export interface CreateLocationDTO {
  name: string; // Nome do prédio/condomínio
  code: string; // Código único (ex: "COP", "BY02J")
  address: Location["address"]; // Endereço completo
  sharedAmenities?: string[]; // Amenities compartilhados
  management?: Location["management"];
  buildingAccess?: Location["buildingAccess"];
  description?: string;
  showBuildingNumber?: boolean; // Default: false
}

export interface UpdateLocationDTO extends Partial<CreateLocationDTO> {
  photos?: string[];
  coverPhoto?: string;
}

export interface LocationFilters {
  city?: string[];
  state?: string[];
  search?: string; // Busca por nome ou código
  hasElevator?: boolean;
  hasParking?: boolean;
}

// ============================================================================
// ACCOMMODATION (PROPERTY) DTOs
// ============================================================================

export interface CreatePropertyDTO {
  name: string; // Nome interno da unidade
  code: string; // Código único
  type: PropertyType;

  // 🔗 OPÇÃO 1: Vincular a Location existente (RECOMENDADO)
  locationId?: string; // ID do Location pai
  complement?: string; // "Apto 101", "Bloco A"

  // 🔗 OPÇÃO 2: Criar com endereço próprio (para compatibilidade)
  address?: Property["address"]; // Usado apenas se locationId for undefined

  // Dados da acomodação
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  basePrice: number; // Em centavos
  currency?: Currency;
  minNights?: number;
  tags?: string[];
  amenities?: string[];
  description?: string;
}

// Atualizar Propriedade
export interface UpdatePropertyDTO extends Partial<CreatePropertyDTO> {
  status?: PropertyStatus;
  color?: string;
  photos?: string[];
}

// Criar Reserva
export interface CreateReservationDTO {
  propertyId: string;
  guestId: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  adults: number;
  children?: number;
  infants?: number;
  pets?: number;
  platform: Platform;
  notes?: string;
  specialRequests?: string;
  externalId?: string;
}

// Atualizar Reserva
export interface UpdateReservationDTO {
  status?: ReservationStatus;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
  notes?: string;
  internalComments?: string;
  paymentStatus?: PaymentStatus;
}

// Criar Hóspede
export interface CreateGuestDTO {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cpf?: string;
  source: Platform;
}

// Criar Bloqueio
export interface CreateBlockDTO {
  propertyId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  type: "block"; // Tipo único
  subtype?: BlockSubtype; // Subtipo opcional
  reason: string;
  notes?: string;
}

// Atualizar Preços em Lote
export interface BulkUpdatePricesDTO {
  propertyIds: string[]; // IDs das propriedades
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  price?: number; // Em centavos (se for setar preço fixo)
  adjustment?: {
    // OU ajuste percentual
    type: "increase" | "decrease";
    value: number; // Percentual
  };
  reason?: string;
}

// ============================================================================
// ROOM (CÔMODO) DTOs
// ============================================================================

export interface CreateRoomDTO {
  accommodationId: string; // ID da Accommodation
  type: RoomType;
  name?: string;
  isShared: boolean;
  hasLock: boolean;
  beds: Bed[]; // Array de camas
  order?: number;
}

export interface UpdateRoomDTO extends Partial<CreateRoomDTO> {
  photos?: RoomPhoto[];
}

export interface CreateRoomPhotoDTO {
  roomId: string;
  url: string;
  tag: RoomPhotoTag;
  caption?: string;
  order?: number;
  isMain?: boolean;
}

// Atualizar Mínimo de Noites em Lote
export interface BulkUpdateMinNightsDTO {
  propertyIds: string[];
  startDate: string;
  endDate: string;
  minNights: number;
  reason?: string;
}

// ============================================================================
// RESPOSTAS DA API
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// FILTROS E QUERIES
// ============================================================================

export interface PropertyFilters {
  status?: PropertyStatus[];
  type?: PropertyType[];
  city?: string[];
  tags?: string[];
  folder?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxGuests?: number;
  search?: string; // Busca por nome ou código
}

export interface ReservationFilters {
  propertyId?: string;
  guestId?: string;
  status?: ReservationStatus[];
  platform?: Platform[];
  checkInFrom?: string; // YYYY-MM-DD
  checkInTo?: string; // YYYY-MM-DD
  checkOutFrom?: string;
  checkOutTo?: string;
  createdFrom?: string;
  createdTo?: string;
}

export interface CalendarQuery {
  propertyIds?: string[]; // Filtrar propriedades específicas
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  includeBlocks?: boolean; // Incluir bloqueios
  includePrices?: boolean; // Incluir preços
  includeRestrictions?: boolean; // Incluir restrições
}

// ============================================================================
// DISPONIBILIDADE
// ============================================================================

export interface AvailabilityCheck {
  propertyId: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
}

export interface AvailabilityResponse {
  available: boolean;
  reason?: string; // Se não disponível, por quê
  conflictingReservation?: {
    id: string;
    checkIn: string;
    checkOut: string;
  };
  suggestedDates?: {
    checkIn: string;
    checkOut: string;
  }[];
}

// ============================================================================
// ESTATÍSTICAS
// ============================================================================

export interface PropertyStats {
  totalReservations: number;
  totalNights: number;
  totalRevenue: number; // Em centavos
  occupancyRate: number; // Percentual
  averageDailyRate: number; // Em centavos
  averageNightsPerBooking: number;
  upcomingReservations: number;
  currentlyOccupied: boolean;
}

export interface CalendarStats {
  totalProperties: number;
  totalReservations: number;
  totalBlocks: number;
  occupiedNights: number;
  availableNights: number;
  totalRevenue: number; // Em centavos
  occupancyRate: number; // Percentual
}

// ============================================================================
// ROOMS (CÔMODOS) - Sistema de múltiplos quartos/banheiros
// ============================================================================

export interface Room {
  id: string; // "room_uuid"
  accommodationId: string; // ID da Accommodation dona

  // Tipo do cômodo
  type: RoomType;

  // Nome/descrição (opcional)
  name?: string; // "Quarto Master", "Suíte 1"

  // Características
  isShared: boolean; // Cômodo compartilhado?
  hasLock: boolean; // Possui fechadura?

  // Camas (apenas para quartos)
  beds: Bed[];

  // Capacidade calculada (pessoas)
  capacity: number; // Calculado automaticamente pelas camas

  // Fotos específicas do cômodo
  photos: RoomPhoto[];

  // Ordem de exibição
  order: number;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

export type RoomType =
  | "banheiro" // Banheiro completo
  | "meio-banheiro" // Lavabo
  | "quadruplo" // Quarto para 4 pessoas
  | "suite" // Suíte
  | "triplo" // Quarto para 3 pessoas
  | "twin" // 2 camas de solteiro
  | "duplo" // Quarto para 2 pessoas
  | "individual" // Quarto para 1 pessoa
  | "studio" // Estúdio
  | "sala" // Sala/área comum
  | "outras"; // Outras dependências

// ============================================================================
// BEDS (CAMAS)
// ============================================================================

export interface Bed {
  id: string; // "bed_uuid"
  type: BedType;
  quantity: number; // Quantidade deste tipo
  capacity: number; // Pessoas por cama (calculado pelo tipo)
}

export type BedType =
  | "casal" // Cama de casal (2 pessoas)
  | "solteiro" // Cama de solteiro (1 pessoa)
  | "solteiro-twin" // Twin (1 pessoa)
  | "beliche-single" // Beliche 1 pessoa por nível
  | "beliche-double" // Beliche 2 pessoas por nível
  | "king" // King size (2 pessoas)
  | "queen" // Queen size (2 pessoas)
  | "futon-casal" // Futón/colchão casal (2 pessoas)
  | "futon-individual" // Futón/colchão individual (1 pessoa)
  | "sofa-cama" // Sofá-cama (1 pessoa)
  | "sofa-cama-casal"; // Sofá-cama casal (2 pessoas)

// Capacidade padrão por tipo de cama
export const BED_CAPACITY: Record<BedType, number> = {
  casal: 2,
  solteiro: 1,
  "solteiro-twin": 1,
  "beliche-single": 1,
  "beliche-double": 2,
  king: 2,
  queen: 2,
  "futon-casal": 2,
  "futon-individual": 1,
  "sofa-cama": 1,
  "sofa-cama-casal": 2,
};

// ============================================================================
// ROOM PHOTOS (FOTOS DE CÔMODOS)
// ============================================================================

export interface RoomPhoto {
  id: string; // "photo_uuid"
  url: string; // URL da imagem
  tag: RoomPhotoTag; // Categoria/tag da foto
  caption?: string; // Legenda (multilíngue depois)
  order: number; // Ordem de exibição
  isMain: boolean; // É a foto principal do cômodo?
}

export type RoomPhotoTag =
  | "academia"
  | "alimentos-bebidas"
  | "animais"
  | "area-estar"
  | "banheiro"
  | "cama"
  | "cozinha"
  | "fachada"
  | "foto-todo-quarto"
  | "jardim"
  | "paisagem-natural"
  | "piscina"
  | "praia"
  | "quarto"
  | "restaurante"
  | "sala-estar"
  | "spa"
  | "vista-aerea"
  | "vista-cidade"
  | "vista-mar"
  | "outra";

// ============================================================================
// AMENITIES CATEGORIES (13 categorias principais)
// ============================================================================

export interface AmenityCategory {
  id: string;
  name: string;
  icon: string; // Emoji ou classe de ícone
  amenities: Amenity[];
}

export interface Amenity {
  id: string;
  name: string;
  category: AmenityCategoryType;
  channels?: string[]; // OTAs onde está disponível
}

export type AmenityCategoryType =
  | "acessibilidade" // ♿ (8 amenities)
  | "ao-ar-livre-vista" // 🌳 (34 amenities)
  | "banheiro" // 🚿 (28 amenities)
  | "climatizacao" // ❄️ (3 amenities)
  | "cozinha-jantar" // 🍽️ (33 amenities)
  | "entretenimento" // 📺 (48 amenities)
  | "estacionamento" // 🅿️ (21 amenities)
  | "familia" // 👨‍👩‍👧‍👦 (17 amenities)
  | "internet-escritorio" // 💻 (13 amenities)
  | "limpeza" // 🧹 (4 amenities)
  | "quarto-lavanderia" // 🛏️ (27 amenities)
  | "seguranca" // 🔒 (22 amenities)
  | "servicos"; // 🛎️ (11 amenities)

// ============================================================================
// ACCOMMODATION RULES (REGRAS DA ACOMODAÇÃO) - v1.0.80
// ============================================================================

export interface AccommodationRules {
  id: string; // "rules_uuid"
  listingId: string; // ID do Listing/Accommodation

  // OCUPAÇÃO MÁXIMA
  maxAdults: number; // Calculado automaticamente pelas camas
  minAge: number; // Idade mínima para reservar (ex: 18, 21)

  // CRIANÇAS (2-12 anos)
  acceptsChildren: boolean;
  maxChildren: number;
  childrenRules?: {
    pt: string; // Regras em português
    en: string; // Rules in English
    es: string; // Regras em español
  };

  // BEBÊS (0-2 anos)
  acceptsBabies: boolean;
  maxBabies: number;
  providesCribs: boolean; // Fornece berços?
  maxCribs: number;
  babiesRules?: {
    pt: string;
    en: string;
    es: string;
  };

  // ANIMAIS DE ESTIMAÇÃO
  allowsPets: PetsPolicy;
  petFee?: number; // Taxa por pet (em centavos, 1x por reserva)
  maxPets?: number;
  petRules?: {
    pt: string;
    en: string;
    es: string;
  };

  // OUTRAS REGRAS
  smokingAllowed: SmokingPolicy;
  eventsAllowed: EventsPolicy;
  quietHours: boolean;
  quietHoursStart?: string; // "22:00"
  quietHoursEnd?: string; // "08:00"

  // REGRAS ADICIONAIS (texto livre)
  additionalRules?: {
    pt: string;
    en: string;
    es: string;
  };

  // Metadata
  createdAt: string;
  updatedAt: string;
}

export type PetsPolicy =
  | "no" // Não aceita pets
  | "yes_free" // Aceita pets grátis
  | "yes_chargeable" // Aceita pets COM cobrança
  | "upon_request"; // Mediante solicitação

export type SmokingPolicy = "yes" | "no" | "outdoor_only"; // Apenas áreas externas

export type EventsPolicy = "yes" | "no" | "on_request"; // Sob consulta

// ============================================================================
// PRICING SETTINGS (CONFIGURAÇÕES DE PREÇOS) - v1.0.81
// ============================================================================

export interface PricingSettings {
  id: string; // "pricing_uuid"
  listingId: string; // ID do Listing/Accommodation

  // PREÇOS DERIVADOS (hóspedes adicionais)
  basePricePerNight: number; // Preço base em centavos (ex: 20000 = R$ 200)
  maxGuestsIncluded: number; // Hóspedes incluídos no preço base (ex: 2)
  extraGuestFeePerNight: number; // Taxa por hóspede extra/dia em centavos (ex: 5000 = R$ 50)
  chargeForChildren: boolean; // Cobra por crianças extras?

  // TAXA DE LIMPEZA
  cleaningFee: number; // Taxa de limpeza em centavos (ex: 15000 = R$ 150)
  cleaningFeeIsPassThrough: boolean; // É repasse integral? (não entra na comissão)

  // MOEDA
  currency: Currency; // 'BRL', 'USD', 'EUR'

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Função auxiliar para calcular total da reserva
export interface ReservationCalculation {
  baseTotal: number; // Diárias base (nights × basePrice)
  extraGuestsTotal: number; // Hóspedes extras (extraGuests × fee × nights)
  cleaningFee: number; // Taxa de limpeza (1x)
  grandTotal: number; // Total final
  commissionBase: number; // Base para cálculo de comissão (sem taxa limpeza)
}

// DTO para calcular reserva
export interface CalculateReservationDTO {
  listingId: string;
  nights: number;
  guests: number;
  hasPets?: boolean; // Tem pets? (para adicionar pet fee)
}

// ============================================================================
// LISTING (ANÚNCIO PUBLICADO) - v1.0.77+
// ============================================================================
// Representa um anúncio publicado em uma ou mais plataformas
// Vinculado a uma Accommodation (Property)

export interface Listing {
  id: string; // "listing_uuid"
  accommodationId: string; // ID da Property/Accommodation

  // Título multilíngue
  title: {
    pt: string;
    en: string;
    es: string;
  };

  // Descrição multilíngue
  description: {
    pt: string;
    en: string;
    es: string;
  };

  // Status em cada plataforma
  platforms: {
    airbnb?: {
      enabled: boolean;
      status: "draft" | "published" | "unlisted";
      listingUrl?: string;
      externalId?: string;
      lastSync?: string;
      syncCalendar: boolean;
      syncPricing: boolean;
      syncAvailability: boolean;
    };
    booking?: {
      enabled: boolean;
      status: "draft" | "published" | "unlisted";
      listingUrl?: string;
      externalId?: string;
      lastSync?: string;
      syncCalendar: boolean;
      syncPricing: boolean;
      syncAvailability: boolean;
    };
    decolar?: {
      enabled: boolean;
      status: "draft" | "published" | "unlisted";
      listingUrl?: string;
      externalId?: string;
      lastSync?: string;
      syncCalendar: boolean;
      syncPricing: boolean;
      syncAvailability: boolean;
    };
    direct?: {
      enabled: boolean;
      status: "draft" | "published" | "unlisted";
      bookingUrl?: string;
    };
  };

  // Configurações de preço por plataforma
  pricingSettings?: {
    airbnb?: PlatformPricingSettings;
    booking?: PlatformPricingSettings;
    decolar?: PlatformPricingSettings;
    direct?: PlatformPricingSettings;
  };

  // Configurações de disponibilidade
  availabilitySettings?: {
    instantBook: boolean;
    advanceNotice: number; // horas
    preparationTime: number; // horas
    checkInTime: string; // "15:00"
    checkOutTime: string; // "11:00"
    minNights: number;
    maxNights: number;
  };

  // Regras da casa
  houseRules?: {
    checkInStart: string;
    checkInEnd: string;
    checkOutTime: string;
    smoking: boolean;
    pets?: {
      allowed: boolean;
      maxPets: number;
      fee: number; // em centavos
      feeType: "per_stay" | "per_night";
      restrictions?: string;
    };
    parties: boolean;
    maxGuests: number;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    additionalRules?: string[];
  };

  // Preços derivados (taxa por hóspede adicional)
  derivedPricing?: {
    enabled: boolean;
    extraGuestFee: {
      enabled: boolean;
      startingGuest: number; // A partir de qual hóspede cobra
      feePerNight: number; // em centavos
      maxGuests: number;
    };
    childDiscount?: {
      enabled: boolean;
      ageLimit: number;
      discountPercent: number;
    };
  };

  // SEO
  seo?: {
    slug: string;
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };

  // iCal Sync URLs
  icalUrls?: {
    airbnb?: string;
    booking?: string;
    decolar?: string;
    vrbo?: string;
    homeaway?: string;
    other?: string[];
  };

  // Estatísticas
  stats?: {
    totalViews: number;
    totalBookings: number;
    averageRating: number;
    responseRate: number;
    responseTime: number; // minutos
  };

  // Metadata
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  ownerId: string;
  isActive: boolean;
}

export interface PlatformPricingSettings {
  baseAdjustment: number; // % de ajuste no preço base (-10 a +50)
  weeklyAdjustment: number; // % desconto para 7+ noites
  monthlyAdjustment: number; // % desconto para 28+ noites
  cleaningFee: number; // em centavos
  serviceFeeType: "host" | "guest" | "split" | "none";
}

// ============================================================================
// DTOs PARA REGRAS E PREÇOS
// ============================================================================

export interface UpdateAccommodationRulesDTO
  extends Partial<
    Omit<AccommodationRules, "id" | "listingId" | "createdAt" | "updatedAt">
  > {}

export interface UpdatePricingSettingsDTO
  extends Partial<
    Omit<PricingSettings, "id" | "listingId" | "createdAt" | "updatedAt">
  > {}

// ============================================================================
// WHATSAPP MODULE - Evolution API Integration (v1.0.103.265)
// ============================================================================
// Sistema completo de integração WhatsApp via Evolution API
// Armazena contatos, conversas, mensagens e logs de sincronização
// ============================================================================

// ============================================================================
// WHATSAPP CONTACT (CONTATO DO WHATSAPP)
// ============================================================================

export interface WhatsAppContact {
  id: string; // "wa_contact_uuid"
  organization_id: string; // ID da organização (multi-tenant)

  // Dados do Evolution API
  whatsapp_id: string; // ID original do WhatsApp (ex: "5511987654321@c.us")
  phone: string; // Número formatado: "+55 11 98765-4321"
  phone_raw: string; // Número sem formatação: "5511987654321"

  // Informações do contato
  name: string; // Nome do contato
  pushname: string; // Nome do perfil WhatsApp

  // Tipo e status
  isBusiness: boolean; // É conta business?
  isMyContact: boolean; // Está na minha lista de contatos?
  isGroup: boolean; // É grupo?

  // Foto de perfil
  profilePicUrl?: string; // URL da foto de perfil

  // Metadados adicionais
  metadata?: {
    labels?: string[]; // Tags/labels do contato
    notes?: string; // Notas sobre o contato
    isBlocked?: boolean; // Contato bloqueado?
    lastSeen?: string; // Última vez online (ISO date)
  };

  // Vínculo com sistema Rendizy
  linked_guest_id?: string; // ID do hóspede vinculado
  linked_reservation_id?: string; // ID da reserva vinculada

  // Estatísticas
  stats?: {
    totalMessages: number; // Total de mensagens trocadas
    lastMessageAt?: string; // Última mensagem (ISO date)
    unreadCount?: number; // Mensagens não lidas
  };

  // Metadata
  createdAt: string; // Quando foi importado (ISO date)
  updatedAt: string; // Última atualização (ISO date)
  lastSyncAt: string; // Última sincronização com Evolution (ISO date)
  source: "evolution" | "manual"; // Origem do contato
}

// ============================================================================
// WHATSAPP CHAT (CONVERSA/CHAT DO WHATSAPP)
// ============================================================================

export interface WhatsAppChat {
  id: string; // "wa_chat_uuid"
  organization_id: string; // ID da organização (multi-tenant)

  // Dados do Evolution API
  whatsapp_chat_id: string; // ID original do chat (ex: "5511987654321@c.us")

  // Informações da conversa
  contact_id: string; // ID do WhatsAppContact
  contact_name: string; // Nome do contato (denormalizado para performance)
  contact_phone: string; // Telefone do contato (denormalizado)

  // Tipo e status
  isGroup: boolean; // É grupo?
  groupName?: string; // Nome do grupo (se for grupo)
  groupParticipants?: string[]; // IDs dos participantes do grupo

  // Última mensagem
  lastMessage?: {
    content: string; // Conteúdo da mensagem
    timestamp: string; // Data/hora (ISO date)
    fromMe: boolean; // Mensagem enviada por mim?
    type: WhatsAppMessageType; // Tipo da mensagem
  };

  // Contadores
  unreadCount: number; // Mensagens não lidas
  totalMessages: number; // Total de mensagens na conversa

  // Status
  isPinned: boolean; // Conversa fixada?
  isMuted: boolean; // Conversa silenciada?
  isArchived: boolean; // Conversa arquivada?

  // Tags/categorização
  tags?: string[]; // Tags da conversa
  category?: "urgent" | "normal" | "resolved"; // Categoria

  // Vínculo com sistema Rendizy
  linked_conversation_id?: string; // ID da Conversation (sistema de chat interno)
  linked_reservation_id?: string; // ID da reserva vinculada
  linked_property_id?: string; // ID do imóvel relacionado

  // Metadata
  createdAt: string; // Primeira mensagem (ISO date)
  updatedAt: string; // Última atividade (ISO date)
  lastSyncAt: string; // Última sincronização (ISO date)
}

// ============================================================================
// WHATSAPP MESSAGE (MENSAGEM DO WHATSAPP)
// ============================================================================

export interface WhatsAppMessage {
  id: string; // "wa_msg_uuid"
  organization_id: string; // ID da organização (multi-tenant)

  // Dados do Evolution API
  whatsapp_message_id: string; // ID original da mensagem no WhatsApp
  chat_id: string; // ID do WhatsAppChat

  // Remetente/destinatário
  from: string; // Número do remetente
  to: string; // Número do destinatário
  fromMe: boolean; // Mensagem enviada por mim?

  // Conteúdo
  type: WhatsAppMessageType; // Tipo da mensagem
  content: string; // Texto da mensagem

  // Mídia (se houver)
  media?: {
    url: string; // URL da mídia
    mimetype: string; // Tipo MIME (image/jpeg, video/mp4, etc)
    filename?: string; // Nome do arquivo
    caption?: string; // Legenda da mídia
    size?: number; // Tamanho em bytes
    thumbnail?: string; // URL da thumbnail (para vídeos)
  };

  // Status da mensagem
  status: WhatsAppMessageStatus;

  // Datas/horários
  timestamp: string; // Data/hora de envio (ISO date)
  ack?: number; // ACK do WhatsApp (0-5)
  sentAt?: string; // Enviado (ISO date)
  deliveredAt?: string; // Entregue (ISO date)
  readAt?: string; // Lido (ISO date)

  // Erro (se houver)
  error?: {
    code: string;
    message: string;
    timestamp: string;
  };

  // Contexto (resposta/encaminhamento)
  context?: {
    isReply: boolean; // É resposta?
    quotedMessageId?: string; // ID da mensagem citada
    isForwarded: boolean; // É encaminhada?
  };

  // Vínculo com sistema Rendizy
  linked_message_id?: string; // ID da Message (sistema de chat interno)

  // Metadata
  createdAt: string; // Quando foi salva no banco (ISO date)
  updatedAt: string; // Última atualização (ISO date)
}

export type WhatsAppMessageType =
  | "text" // Texto simples
  | "image" // Imagem
  | "video" // Vídeo
  | "audio" // Áudio/voz
  | "document" // Documento (PDF, DOC, etc)
  | "sticker" // Sticker
  | "location" // Localização
  | "contact" // Contato vCard
  | "poll" // Enquete
  | "reaction" // Reação a mensagem
  | "unknown"; // Tipo desconhecido

export type WhatsAppMessageStatus =
  | "pending" // Pendente
  | "sent" // Enviada
  | "delivered" // Entregue
  | "read" // Lida
  | "failed" // Falhou
  | "deleted"; // Deletada

// ============================================================================
// WHATSAPP INSTANCE (INSTÂNCIA DO EVOLUTION API)
// ============================================================================

export interface WhatsAppInstance {
  id: string; // "wa_instance_uuid"
  organization_id: string; // ID da organização (multi-tenant)

  // Configuração Evolution API
  instance_name: string; // Nome da instância no Evolution
  api_url: string; // URL base da Evolution API

  // Status da conexão
  status: WhatsAppInstanceStatus;

  // Informações da conta conectada
  phone?: string; // Número conectado
  profileName?: string; // Nome do perfil
  profilePicUrl?: string; // URL da foto do perfil

  // QR Code (para conexão inicial)
  qrCode?: {
    code: string; // Base64 do QR Code
    expiresAt: string; // Quando expira (ISO date)
    generatedAt: string; // Quando foi gerado (ISO date)
  };

  // Estatísticas
  stats?: {
    totalContacts: number; // Total de contatos
    totalChats: number; // Total de conversas
    totalMessages: number; // Total de mensagens
    lastActivity?: string; // Última atividade (ISO date)
  };

  // Health check
  health?: {
    isHealthy: boolean; // API está saudável?
    lastCheck: string; // Última verificação (ISO date)
    errorCount: number; // Erros nas últimas 24h
    lastError?: {
      message: string;
      timestamp: string;
    };
  };

  // Metadata
  createdAt: string; // Quando foi criada (ISO date)
  updatedAt: string; // Última atualização (ISO date)
  connectedAt?: string; // Quando conectou (ISO date)
  disconnectedAt?: string; // Quando desconectou (ISO date)
  isActive: boolean; // Instância ativa?
}

export type WhatsAppInstanceStatus =
  | "disconnected" // Desconectado
  | "connecting" // Conectando
  | "connected" // Conectado
  | "qr" // Aguardando QR Code
  | "error"; // Erro

// ============================================================================
// WHATSAPP SYNC LOG (LOG DE SINCRONIZAÇÃO)
// ============================================================================

export interface WhatsAppSyncLog {
  id: string; // "wa_sync_uuid"
  organization_id: string; // ID da organização (multi-tenant)

  // Tipo de sincronização
  sync_type: WhatsAppSyncType;

  // Status
  status: "started" | "completed" | "failed" | "partial";

  // Resultados
  results?: {
    contactsImported: number; // Contatos importados
    contactsUpdated: number; // Contatos atualizados
    contactsSkipped: number; // Contatos ignorados
    chatsImported: number; // Conversas importadas
    chatsUpdated: number; // Conversas atualizadas
    messagesImported: number; // Mensagens importadas
    errorsCount: number; // Total de erros
  };

  // Erros (se houver)
  errors?: Array<{
    type: string;
    message: string;
    item_id?: string; // ID do item que falhou
    timestamp: string;
  }>;

  // Duração
  startedAt: string; // Início (ISO date)
  completedAt?: string; // Fim (ISO date)
  duration?: number; // Duração em segundos

  // Metadata
  createdAt: string; // Quando foi criado (ISO date)
}

export type WhatsAppSyncType =
  | "contacts" // Sincronização de contatos
  | "chats" // Sincronização de conversas
  | "messages" // Sincronização de mensagens
  | "full"; // Sincronização completa

// ============================================================================
// WHATSAPP CONFIG (CONFIGURAÇÕES DO WHATSAPP)
// ============================================================================

export interface WhatsAppConfig {
  id: string; // "wa_config_uuid"
  organization_id: string; // ID da organização (multi-tenant)

  // Auto-sync settings
  autoSync: {
    enabled: boolean; // Auto-sync ativado?
    interval: number; // Intervalo em minutos (padrão: 5)
    lastSync?: string; // Última sincronização (ISO date)
    nextSync?: string; // Próxima sincronização (ISO date)
  };

  // Filtros de importação
  importFilters?: {
    onlyMyContacts: boolean; // Importar apenas meus contatos?
    excludeGroups: boolean; // Excluir grupos?
    onlyBusinessContacts: boolean; // Apenas contas business?
    minMessages?: number; // Mínimo de mensagens para importar chat
  };

  // Vinculação automática
  autoLink?: {
    enabled: boolean; // Vinculação automática ativada?
    linkByPhone: boolean; // Vincular por telefone?
    createGuestIfNotFound: boolean; // Criar hóspede se não encontrado?
  };

  // Notificações
  notifications?: {
    newMessage: boolean; // Notificar nova mensagem?
    newContact: boolean; // Notificar novo contato?
    connectionStatus: boolean; // Notificar mudança de status?
  };

  // Templates de resposta automática
  autoReply?: {
    enabled: boolean;
    welcomeMessage?: string; // Mensagem de boas-vindas
    awayMessage?: string; // Mensagem de ausência
    businessHours?: {
      enabled: boolean;
      start: string; // "09:00"
      end: string; // "18:00"
      timezone: string; // "America/Sao_Paulo"
    };
  };

  // Metadata
  createdAt: string; // Quando foi criado (ISO date)
  updatedAt: string; // Última atualização (ISO date)
}

// ============================================================================
// DTOs PARA WHATSAPP
// ============================================================================

export interface CreateWhatsAppContactDTO {
  whatsapp_id: string;
  phone: string;
  name: string;
  pushname: string;
  isBusiness: boolean;
  isMyContact: boolean;
  profilePicUrl?: string;
  organization_id: string;
}

export interface UpdateWhatsAppContactDTO
  extends Partial<
    Omit<WhatsAppContact, "id" | "organization_id" | "createdAt" | "updatedAt">
  > {}

export interface CreateWhatsAppChatDTO {
  whatsapp_chat_id: string;
  contact_id: string;
  contact_name: string;
  contact_phone: string;
  isGroup: boolean;
  organization_id: string;
}

export interface UpdateWhatsAppChatDTO
  extends Partial<
    Omit<WhatsAppChat, "id" | "organization_id" | "createdAt" | "updatedAt">
  > {}

export interface CreateWhatsAppMessageDTO {
  whatsapp_message_id: string;
  chat_id: string;
  from: string;
  to: string;
  fromMe: boolean;
  type: WhatsAppMessageType;
  content: string;
  media?: WhatsAppMessage["media"];
  timestamp: string;
  organization_id: string;
}

export interface SendWhatsAppMessageDTO {
  to: string; // Número do destinatário
  type: "text" | "image" | "video" | "audio" | "document";
  content: string; // Texto ou caption
  mediaUrl?: string; // URL da mídia (se aplicável)
  organization_id: string;
}

export interface SyncWhatsAppDataDTO {
  organization_id: string;
  sync_type: WhatsAppSyncType;
  force?: boolean; // Forçar sincronização mesmo se recente?
}

// ============================================================================
// MÓDULO FINANCEIRO - CONCILIAÇÃO BANCÁRIA
// ============================================================================

export interface LinhaExtrato {
  id: string;
  contaId: string;
  data: string;
  descricao: string;
  valor: number;
  moeda: Currency;
  tipo: "debito" | "credito";
  ref?: string;
  refBanco?: string;
  hashUnico?: string;
  origem?: "ofx" | "csv" | "open_finance" | "manual";
  conciliado: boolean;
  lancamentoId?: string;
  confiancaML?: number;
  sugestaoId?: string;
  createdAt: string;
}

export interface RegraConciliacao {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  prioridade: number;
  padrao: {
    operador: "contains" | "equals" | "regex";
    termo: string;
  };
  valor?: {
    operador: "eq" | "gte" | "lte" | "between";
    a?: number;
    b?: number;
  };
  tipo?: "entrada" | "saida" | "transferencia";
  categoriaId?: string;
  contaContrapartidaId?: string;
  centroCustoId?: string;
  acao: "sugerir" | "auto_conciliar" | "auto_criar";
  aplicacoes?: number;
  ultimaAplicacao?: string;
  createdAt: string;
  updatedAt: string;
}
