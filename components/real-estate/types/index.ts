/**
 * 🏗️ REAL ESTATE MODULE - Tipos Compartilhados
 * 
 * Definições de tipos para todo o módulo Real Estate B2B
 */

// ============================================
// Construtoras
// ============================================
export interface Construtora {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  location: string;
  rating: number;
  reviewsCount: number;
  segments: string[];
  launchesCount: number;
  partnershipStatus: 'open' | 'closed' | 'active' | 'pending';
  verified?: boolean;
  commissionModel?: string;
  contact?: {
    email?: string;
    phone?: string;
    website?: string;
  };
  createdAt?: string;
}

// ============================================
// Imobiliárias
// ============================================
export interface Imobiliaria {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  location: string;
  rating: number;
  reviewsCount: number;
  brokersCount: number;
  activeListings: number;
  partnershipStatus: 'open' | 'closed' | 'active' | 'pending';
  partnershipModel: string;
  verified?: boolean;
  createdAt?: string;
}

// ============================================
// Empreendimentos
// ============================================
export interface Empreendimento {
  id: string;
  companyId: string;
  companyName?: string;
  companyLogo?: string;
  name: string;
  description?: string;
  images?: string[];
  mainImage?: string;
  city: string;
  state: string;
  neighborhood?: string;
  address?: string;
  status: 'launch' | 'construction' | 'ready';
  propertyType: 'apartment' | 'house' | 'commercial' | 'land';
  priceMin: number;
  priceMax: number;
  areaMin: number;
  areaMax: number;
  bedroomsMin: number;
  bedroomsMax: number;
  totalUnits: number;
  availableUnits: number;
  deliveryDate?: string;
  amenities?: string[];
  differentials?: string[];
  commission?: string;
  featured?: boolean;
  vgv?: number;
  createdAt?: string;
}

// ============================================
// Unidades
// ============================================
export interface Unidade {
  id: string;
  developmentId: string;
  developmentName?: string;
  developmentCity?: string;
  developmentState?: string;
  unitNumber: string;
  block?: string;
  floor?: number;
  typology?: string;
  bedrooms?: number;
  suites?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  privateArea?: number;
  totalArea?: number;
  price: number;
  pricePerM2?: number;
  status: 'available' | 'reserved' | 'sold';
  position?: string;
  sunExposure?: string;
  view?: string;
  floorPlan?: string;
  images?: string[];
  differentials?: string[];
  createdAt?: string;
}

// ============================================
// Corretores
// ============================================
export interface Corretor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  avatar?: string;
  creci?: string;
  companyId?: string;
  companyName?: string;
  companyType?: 'constructor' | 'real_estate';
  city?: string;
  state?: string;
  specialties?: string[];
  rating: number;
  reviewsCount: number;
  salesCount: number;
  leadsCount: number;
  status: 'active' | 'inactive' | 'pending';
  verified?: boolean;
  bio?: string;
  socialLinks?: Record<string, string>;
  createdAt?: string;
}

// ============================================
// Stats & Dashboard
// ============================================
export interface RealEstateStats {
  construtoras: {
    total: number;
    parceiras: number;
    pendentes: number;
  };
  imobiliarias: {
    total: number;
    parceiras: number;
    pendentes: number;
  };
  empreendimentos: {
    total: number;
    lancamentos: number;
    emConstrucao: number;
    prontos: number;
  };
  unidades: {
    total: number;
    disponiveis: number;
    reservadas: number;
    vendidas: number;
  };
  corretores: {
    total: number;
    ativos: number;
  };
  financeiro: {
    vgvTotal: number;
    valorUnidades: number;
    ticketMedio: number;
  };
}

// ============================================
// Filtros
// ============================================
export interface FiltroConstrutora {
  search?: string;
  segments?: string[];
  partnershipStatus?: 'open' | 'closed' | 'active' | 'pending' | 'all';
  location?: string;
}

export interface FiltroImobiliaria {
  search?: string;
  partnershipStatus?: 'open' | 'closed' | 'active' | 'pending' | 'all';
  location?: string;
}

export interface FiltroEmpreendimento {
  search?: string;
  companyId?: string;
  status?: 'launch' | 'construction' | 'ready' | 'all';
  propertyType?: 'apartment' | 'house' | 'commercial' | 'land';
  city?: string;
  priceMin?: number;
  priceMax?: number;
}

export interface FiltroUnidade {
  developmentId?: string;
  status?: 'available' | 'reserved' | 'sold' | 'all';
  typology?: string;
  priceMin?: number;
  priceMax?: number;
  areaMin?: number;
  areaMax?: number;
}

export interface FiltroCorretor {
  search?: string;
  companyId?: string;
  status?: 'active' | 'inactive' | 'pending' | 'all';
  city?: string;
}
