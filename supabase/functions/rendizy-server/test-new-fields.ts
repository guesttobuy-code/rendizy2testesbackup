// ============================================================================
// TESTES AUTOMATIZADOS - NOVOS CAMPOS v1.0.103.262
// ============================================================================
// Testa a persistência dos 37 novos campos adicionados

import type { Property } from './types.ts';

// ============================================================================
// DADOS DE TESTE
// ============================================================================

export const mockPropertyWithAllNewFields: Partial<Property> = {
  // Campos existentes (básicos)
  name: 'Apartamento Teste Completo',
  code: 'TEST001',
  type: 'apartment',
  status: 'active',
  propertyType: 'location-linked',
  locationId: 'loc_teste_123',
  
  // Endereço com novos campos
  address: {
    street: 'Rua Teste',
    number: '123',
    complement: 'Apto 501',
    neighborhood: 'Centro',
    city: 'Rio de Janeiro',
    state: 'Rio de Janeiro',
    stateCode: 'RJ', // 🆕 NOVO
    zipCode: '20000-000',
    country: 'BR',
    coordinates: { // 🆕 NOVO
      lat: -22.9068,
      lng: -43.1729,
    },
  },
  
  // Capacidade
  maxGuests: 4,
  bedrooms: 2,
  beds: 2,
  bathrooms: 1,
  area: 65,
  
  // Pricing
  pricing: {
    basePrice: 25000, // R$ 250,00
    currency: 'BRL',
    weeklyDiscount: 10,
    biweeklyDiscount: 15,
    monthlyDiscount: 20,
  },
  
  // Restrictions
  restrictions: {
    minNights: 2,
    maxNights: 30,
    advanceBooking: 1,
    preparationTime: 1,
  },
  
  // Amenidades separadas
  locationAmenities: ['pool', 'gym', '24h-security'],
  listingAmenities: ['wifi', 'ac', 'tv', 'kitchen'],
  amenities: ['wifi', 'pool', 'gym'], // deprecated
  
  tags: ['praia', 'familia'],
  photos: [],
  description: 'Apartamento completo para teste',
  
  platforms: {
    airbnb: { enabled: true, listingId: 'airbnb_123', syncEnabled: true },
    booking: { enabled: false, listingId: '', syncEnabled: false },
    decolar: { enabled: false, listingId: '', syncEnabled: false },
    direct: true,
  },
  
  // ========================================
  // 🆕 STEP 1: Tipo e Identificação
  // ========================================
  accommodationType: 'apartment',
  subtype: 'entire_place',
  modalities: ['short_term_rental', 'residential_rental'],
  registrationNumber: 'IPTU-12345678',
  
  // ========================================
  // 🆕 STEP 1: Dados Financeiros
  // ========================================
  financialInfo: {
    // Locação Residencial
    monthlyRent: 3500.00,
    monthlyIptu: 200.00,
    monthlyCondo: 450.00,
    monthlyFees: 100.00,
    
    // Compra e Venda
    salePrice: 850000.00,
    annualIptu: 3200.00,
  },
  
  // ========================================
  // 🆕 STEP 2: Configurações de Exibição
  // ========================================
  displaySettings: {
    showBuildingNumber: 'individual',
  },
  
  // ========================================
  // 🆕 STEP 2: Características do Local
  // ========================================
  locationFeatures: {
    hasExpressCheckInOut: true,
    hasParking: true,
    hasCableInternet: false,
    hasWiFi: true,
    has24hReception: true,
  },
  
  // ========================================
  // 🆕 STEP 8: Contrato e Taxas (COMPLETO!)
  // ========================================
  contract: {
    managerId: 'manager_123',
    registeredDate: '2025-01-01',
    isSublet: false,
    isExclusive: true,
    startDate: '2025-01-01',
    endDate: '2026-12-31',
    blockCalendarAfterEnd: true,
    
    commission: {
      model: 'individual',
      type: 'percentage',
      percentage: 15,
      calculationBase: 'gross_daily',
      considerChannelFees: true,
      deductChannelFees: true,
      allowExclusiveTransfer: false,
    },
    
    charges: {
      electricityMode: 'individual',
    },
    
    notifications: {
      showReservationsInOwnerCalendar: 'global',
      ownerPreReservationEmail: 'individual',
      agentPreReservationEmail: 'global',
      ownerConfirmedReservationEmail: 'individual',
      agentConfirmedReservationEmail: 'global',
      cancellationEmail: 'individual',
      deletedReservationEmail: 'individual',
      reserveLinkBeforeCheckout: 'global',
    },
  },
  
  // Metadata
  ownerId: 'system',
  isActive: true,
};

// ============================================================================
// TESTES DE VALIDAÇÃO
// ============================================================================

export function validateNewFields(property: Property): { 
  valid: boolean; 
  errors: string[]; 
  fieldsCovered: number;
  totalFields: number;
} {
  const errors: string[] = [];
  let fieldsCovered = 0;
  const totalFields = 37; // Total de novos campos
  
  // ========================================
  // STEP 1: Tipo e Identificação (6 campos)
  // ========================================
  
  if (property.accommodationType) {
    fieldsCovered++;
  } else {
    errors.push('accommodationType não foi salvo');
  }
  
  if (property.subtype) {
    fieldsCovered++;
    if (!['entire_place', 'private_room', 'shared_room'].includes(property.subtype)) {
      errors.push(`subtype inválido: ${property.subtype}`);
    }
  } else {
    errors.push('subtype não foi salvo');
  }
  
  if (property.modalities && property.modalities.length > 0) {
    fieldsCovered++;
  } else {
    errors.push('modalities não foi salvo');
  }
  
  if (property.registrationNumber) {
    fieldsCovered++;
  } else {
    errors.push('registrationNumber não foi salvo');
  }
  
  // ========================================
  // STEP 1: Dados Financeiros (6 campos)
  // ========================================
  
  if (property.financialInfo) {
    if (property.financialInfo.monthlyRent !== undefined) fieldsCovered++;
    else errors.push('financialInfo.monthlyRent não foi salvo');
    
    if (property.financialInfo.monthlyIptu !== undefined) fieldsCovered++;
    else errors.push('financialInfo.monthlyIptu não foi salvo');
    
    if (property.financialInfo.monthlyCondo !== undefined) fieldsCovered++;
    else errors.push('financialInfo.monthlyCondo não foi salvo');
    
    if (property.financialInfo.monthlyFees !== undefined) fieldsCovered++;
    else errors.push('financialInfo.monthlyFees não foi salvo');
    
    if (property.financialInfo.salePrice !== undefined) fieldsCovered++;
    else errors.push('financialInfo.salePrice não foi salvo');
    
    if (property.financialInfo.annualIptu !== undefined) fieldsCovered++;
    else errors.push('financialInfo.annualIptu não foi salvo');
  } else {
    errors.push('financialInfo não foi salvo (objeto inteiro)');
  }
  
  // ========================================
  // STEP 2: GPS (2 campos)
  // ========================================
  
  if (property.address.stateCode) {
    fieldsCovered++;
  } else {
    errors.push('address.stateCode não foi salvo');
  }
  
  if (property.address.coordinates) {
    fieldsCovered++;
    if (property.address.coordinates.lat < -90 || property.address.coordinates.lat > 90) {
      errors.push('Latitude inválida');
    }
    if (property.address.coordinates.lng < -180 || property.address.coordinates.lng > 180) {
      errors.push('Longitude inválida');
    }
  } else {
    errors.push('address.coordinates não foi salvo');
  }
  
  // ========================================
  // STEP 2: Exibição (1 campo)
  // ========================================
  
  if (property.displaySettings?.showBuildingNumber) {
    fieldsCovered++;
  } else {
    errors.push('displaySettings.showBuildingNumber não foi salvo');
  }
  
  // ========================================
  // STEP 2: Características (5 campos)
  // ========================================
  
  if (property.locationFeatures) {
    if (property.locationFeatures.hasExpressCheckInOut !== undefined) fieldsCovered++;
    else errors.push('locationFeatures.hasExpressCheckInOut não foi salvo');
    
    if (property.locationFeatures.hasParking !== undefined) fieldsCovered++;
    else errors.push('locationFeatures.hasParking não foi salvo');
    
    if (property.locationFeatures.hasCableInternet !== undefined) fieldsCovered++;
    else errors.push('locationFeatures.hasCableInternet não foi salvo');
    
    if (property.locationFeatures.hasWiFi !== undefined) fieldsCovered++;
    else errors.push('locationFeatures.hasWiFi não foi salvo');
    
    if (property.locationFeatures.has24hReception !== undefined) fieldsCovered++;
    else errors.push('locationFeatures.has24hReception não foi salvo');
  } else {
    errors.push('locationFeatures não foi salvo (objeto inteiro)');
  }
  
  // ========================================
  // STEP 8: Contrato (17 campos)
  // ========================================
  
  if (property.contract) {
    if (property.contract.managerId) fieldsCovered++;
    else errors.push('contract.managerId não foi salvo');
    
    if (property.contract.registeredDate) fieldsCovered++;
    else errors.push('contract.registeredDate não foi salvo');
    
    if (property.contract.isSublet !== undefined) fieldsCovered++;
    else errors.push('contract.isSublet não foi salvo');
    
    if (property.contract.isExclusive !== undefined) fieldsCovered++;
    else errors.push('contract.isExclusive não foi salvo');
    
    if (property.contract.startDate) fieldsCovered++;
    else errors.push('contract.startDate não foi salvo');
    
    if (property.contract.endDate) fieldsCovered++;
    else errors.push('contract.endDate não foi salvo');
    
    if (property.contract.blockCalendarAfterEnd !== undefined) fieldsCovered++;
    else errors.push('contract.blockCalendarAfterEnd não foi salvo');
    
    // Comissão (7 campos)
    if (property.contract.commission) {
      if (property.contract.commission.model) fieldsCovered++;
      else errors.push('contract.commission.model não foi salvo');
      
      if (property.contract.commission.type) fieldsCovered++;
      else errors.push('contract.commission.type não foi salvo');
      
      if (property.contract.commission.percentage !== undefined) fieldsCovered++;
      else errors.push('contract.commission.percentage não foi salvo');
      
      if (property.contract.commission.calculationBase) fieldsCovered++;
      else errors.push('contract.commission.calculationBase não foi salvo');
      
      if (property.contract.commission.considerChannelFees !== undefined) fieldsCovered++;
      else errors.push('contract.commission.considerChannelFees não foi salvo');
      
      if (property.contract.commission.deductChannelFees !== undefined) fieldsCovered++;
      else errors.push('contract.commission.deductChannelFees não foi salvo');
      
      if (property.contract.commission.allowExclusiveTransfer !== undefined) fieldsCovered++;
      else errors.push('contract.commission.allowExclusiveTransfer não foi salvo');
    } else {
      errors.push('contract.commission não foi salvo (objeto inteiro)');
    }
    
    // Charges (1 campo)
    if (property.contract.charges?.electricityMode) {
      fieldsCovered++;
    } else {
      errors.push('contract.charges.electricityMode não foi salvo');
    }
    
    // Notificações (8 campos) - só vou validar se o objeto existe
    if (property.contract.notifications && Object.keys(property.contract.notifications).length === 8) {
      fieldsCovered++;
    } else {
      errors.push('contract.notifications não foi salvo completamente');
    }
  } else {
    errors.push('contract não foi salvo (objeto inteiro)');
  }
  
  const valid = errors.length === 0 && fieldsCovered === totalFields;
  
  return {
    valid,
    errors,
    fieldsCovered,
    totalFields,
  };
}

// ============================================================================
// SUMÁRIO DE TESTES
// ============================================================================

export function printTestSummary(result: ReturnType<typeof validateNewFields>) {
  console.log('\n========================================');
  console.log('📊 TESTE DE PERSISTÊNCIA - v1.0.103.262');
  console.log('========================================\n');
  
  console.log(`✅ Campos salvos: ${result.fieldsCovered}/${result.totalFields}`);
  console.log(`📊 Cobertura: ${((result.fieldsCovered / result.totalFields) * 100).toFixed(1)}%\n`);
  
  if (result.valid) {
    console.log('🎉 TODOS OS CAMPOS FORAM PERSISTIDOS COM SUCESSO!\n');
  } else {
    console.log('⚠️ ALGUNS CAMPOS NÃO FORAM SALVOS:\n');
    result.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
    console.log('');
  }
  
  console.log('========================================\n');
}
