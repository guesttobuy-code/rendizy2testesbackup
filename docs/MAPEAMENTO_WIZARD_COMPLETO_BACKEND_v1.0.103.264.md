# 🗺️ MAPEAMENTO COMPLETO - Wizard de Imóveis → Backend

**Versão:** v1.0.103.264  
**Data:** 03 NOV 2025  
**Objetivo:** Mapear TODOS os 17 steps do wizard para a estrutura de backend  

---

## 📋 ESTRUTURA DO WIZARD

O PropertyEditWizard possui **3 BLOCOS** com **17 STEPS** no total:

### **BLOCO 1: CONTEÚDO (7 steps)**
1. `content-type` - Tipo e Identificação
2. `content-location` - Localização
3. `content-rooms` - Cômodos e Distribuição
4. `content-location-amenities` - Amenidades do Local (READ ONLY)
5. `content-property-amenities` - Amenidades da Acomodação
6. `content-photos` - Fotos e Mídia
7. `content-description` - Descrição

### **BLOCO 2: FINANCEIRO (5 steps)**
8. `financial-contract` - Configuração de Relacionamento
9. `financial-residential-pricing` - Preços Locação e Venda
10. `financial-fees` - Configuração de preço temporada
11. `financial-pricing` - Precificação Individual de Temporada
12. `financial-derived-pricing` - Preços Derivados

### **BLOCO 3: CONFIGURAÇÕES (5 steps)**
13. `settings-rules` - Regras de Hospedagem
14. `settings-booking` - Configurações de Reserva
15. `settings-tags` - Tags e Grupos
16. `settings-ical` - iCal e Sincronização
17. `settings-otas` - Integrações OTAs

---

## 🔍 MAPEAMENTO DETALHADO POR STEP

### **STEP 1: content-type - Tipo e Identificação**

**Component:** `ContentTypeStep.tsx`

**Campos do Frontend:**
```typescript
interface ContentTypeData {
  propertyTypeId?: string;        // Tipo de imóvel (casa, apartamento, etc)
  accommodationTypeId?: string;   // Tipo de acomodação
  subtipo?: 'entire_place' | 'private_room' | 'shared_room';
  categoria?: ('short_term_rental' | 'buy_sell' | 'residential_rental')[];
  registrationNumber?: string;    // Número de registro/IPTU
}
```

**Mapeamento Backend (Property):**
```typescript
{
  type: propertyTypeId,                    // PropertyType
  accommodationType: accommodationTypeId,  // string
  subtype: subtipo,                        // 'entire_place' | 'private_room' | 'shared_room'
  modalities: categoria,                   // array
  registrationNumber: registrationNumber   // string
}
```

**Status:** ✅ **JÁ IMPLEMENTADO** em types.ts (linhas 191-194)

---

### **STEP 2: content-location - Localização**

**Component:** `ContentLocationStep.tsx`

**Campos do Frontend:**
```typescript
interface ContentLocationData {
  mode: 'new' | 'existing';
  selectedLocationId?: string;
  locationName?: string;
  locationAmenities?: string[];
  
  address: {
    country: string;
    state: string;
    stateCode: string;
    zipCode: string;
    city: string;
    neighborhood: string;
    street: string;
    number: string;
    complement?: string;
    latitude?: number;
    longitude?: number;
  };
  
  showBuildingNumber: 'global' | 'individual';
  photos: string[];
  hasExpressCheckInOut: boolean;
  hasParking: boolean;
  hasCableInternet: boolean;
  hasWiFi: boolean;
  has24hReception: boolean;
}
```

**Mapeamento Backend (Property):**
```typescript
{
  locationId: selectedLocationId,           // string | undefined
  address: address,                         // Address object
  displaySettings: {
    showBuildingNumber: showBuildingNumber  // 'global' | 'individual'
  },
  locationFeatures: {
    hasExpressCheckInOut,
    hasParking,
    hasCableInternet,
    hasWiFi,
    has24hReception
  },
  locationAmenities: locationAmenities      // string[]
}
```

**Status:** ✅ **JÁ IMPLEMENTADO** em types.ts (linhas 104-221)

---

### **STEP 3: content-rooms - Cômodos e Distribuição**

**Component:** `ContentRoomsStep.tsx`

**Campos do Frontend:**
```typescript
interface ContentRoomsData {
  rooms: Room[];  // Array de cômodos configurados
}

interface Room {
  id: string;
  name: string;
  type: 'bedroom' | 'bathroom' | 'living_room' | 'kitchen' | 'other';
  bedType?: string;
  bedCount?: number;
  amenities?: string[];
}
```

**Mapeamento Backend (Property):**
```typescript
{
  // Campos agregados (já existem)
  maxGuests: number,
  bedrooms: number,
  beds: number,
  bathrooms: number,
  area?: number,
  
  // 🆕 NOVO: Detalhamento de cômodos
  rooms: Room[]
}
```

**Status:** ⚠️ **PARCIAL** - Campos agregados existem, mas falta array `rooms[]`

---

### **STEP 4: content-location-amenities - Amenidades do Local**

**Component:** `ContentLocationAmenitiesStep.tsx`

**Campos do Frontend:**
```typescript
interface ContentLocationAmenitiesData {
  locationId?: string;
  locationName?: string;
  locationAmenities: string[];  // READ ONLY (herdadas)
}
```

**Mapeamento Backend (Property):**
```typescript
{
  locationAmenities: string[]  // Já existe
}
```

**Status:** ✅ **JÁ IMPLEMENTADO** (READ ONLY, herdadas do Location)

---

### **STEP 5: content-property-amenities - Amenidades da Acomodação**

**Component:** `ContentAmenitiesStep.tsx`

**Campos do Frontend:**
```typescript
interface ContentAmenitiesData {
  locationId?: string;
  locationName?: string;
  locationAmenities: string[];      // READ ONLY
  propertyAmenities: string[];      // EDITÁVEL
  inheritLocationAmenities?: boolean;
}
```

**Mapeamento Backend (Property):**
```typescript
{
  locationAmenities: string[],      // Herdadas
  listingAmenities: propertyAmenities  // Específicas da unidade
}
```

**Status:** ✅ **JÁ IMPLEMENTADO** em types.ts (linhas 145-152)

---

### **STEP 6: content-photos - Fotos e Mídia**

**Component:** `ContentPhotosStep.tsx`

**Campos do Frontend:**
```typescript
interface ContentPhotosData {
  photos: string[];         // URLs das fotos
  coverPhoto?: string;      // URL da foto de capa
}
```

**Mapeamento Backend (Property):**
```typescript
{
  photos: string[],
  coverPhoto?: string
}
```

**Status:** ✅ **JÁ IMPLEMENTADO** em types.ts (linhas 163-164)

---

### **STEP 7: content-description - Descrição**

**Component:** `ContentDescriptionStep.tsx`

**Campos do Frontend:**
```typescript
interface ContentDescriptionData {
  title: string;                    // Título do anúncio
  description: string;              // Descrição completa
  shortDescription?: string;        // Descrição curta
  highlights?: string[];            // Destaques
  rules?: string;                   // Regras da casa
  customFields?: Array<{
    fieldId: string;
    label: string;
    value: string;
  }>;
}
```

**Mapeamento Backend (Property):**
```typescript
{
  name: title,                      // string
  description: description,         // string
  shortDescription: shortDescription, // string
  
  // 🆕 NOVO: Campos adicionais
  highlights: string[],
  houseRules: string,
  customFields: Array<{
    fieldId: string,
    label: string,
    value: string
  }>
}
```

**Status:** ⚠️ **PARCIAL** - Campos básicos existem, faltam highlights, rules e customFields

---

### **STEP 8: financial-contract - Configuração de Relacionamento** ⚠️ **CRÍTICO**

**Component:** `FinancialContractStep.tsx`

**Campos do Frontend:**
```typescript
interface FinancialContractData {
  // Titular e Administrador
  ownerId?: string;
  managerId?: string;
  
  // Contrato
  registeredDate?: string;
  isSublet: boolean;
  isExclusive: boolean;
  startDate?: string;
  endDate?: string;
  blockCalendarAfterEnd: boolean;
  
  // Comissão
  commissionModel: 'global' | 'individual';
  commissionType?: 'percentage' | 'fixed_monthly';
  commissionPercentage?: number;
  commissionBase?: 'accommodation_source' | 'total_daily' | 'gross_daily';
  considerChannelFees: boolean;
  deductChannelFees: boolean;
  allowExclusiveTransfer: boolean;
  
  // Encargos
  electricityChargeMode: 'global' | 'individual';
  
  // Notificações
  showReservationsInOwnerCalendar: 'global' | 'individual';
  ownerPreReservationEmail: 'global' | 'individual';
  agentPreReservationEmail: 'global' | 'individual';
  ownerConfirmedReservationEmail: 'global' | 'individual';
  agentConfirmedReservationEmail: 'global' | 'individual';
  cancellationEmail: 'global' | 'individual';
  deletedReservationEmail: 'global' | 'individual';
  reserveLinkBeforeCheckout: 'global' | 'individual';
}
```

**Mapeamento Backend (Property):**
```typescript
{
  ownerId: string,  // Já existe
  contract: {
    managerId: string,
    registeredDate: string,
    isSublet: boolean,
    isExclusive: boolean,
    startDate: string,
    endDate: string,
    blockCalendarAfterEnd: boolean,
    
    commission: {
      model: 'global' | 'individual',
      type: 'percentage' | 'fixed_monthly',
      percentage: number,
      calculationBase: 'accommodation_source' | 'total_daily' | 'gross_daily',
      considerChannelFees: boolean,
      deductChannelFees: boolean,
      allowExclusiveTransfer: boolean
    },
    
    charges: {
      electricityMode: 'global' | 'individual'
    },
    
    notifications: {
      showReservationsInOwnerCalendar: 'global' | 'individual',
      ownerPreReservationEmail: 'global' | 'individual',
      agentPreReservationEmail: 'global' | 'individual',
      ownerConfirmedReservationEmail: 'global' | 'individual',
      agentConfirmedReservationEmail: 'global' | 'individual',
      cancellationEmail: 'global' | 'individual',
      deletedReservationEmail: 'global' | 'individual',
      reserveLinkBeforeCheckout: 'global' | 'individual'
    }
  }
}
```

**Status:** ✅ **JÁ IMPLEMENTADO** em types.ts (linhas 223-257)

---

### **STEP 9: financial-residential-pricing - Preços Locação e Venda**

**Component:** `FinancialResidentialPricingStep.tsx`

**Campos do Frontend:**
```typescript
interface FinancialResidentialPricingData {
  // Tipo de negócio
  priceType: 'rental' | 'sale' | 'both';
  
  // Locação Residencial
  monthlyRent?: number;
  monthlyIptu?: number;
  monthlyCondo?: number;
  monthlyFees?: number;
  
  // Compra e Venda
  salePrice?: number;
  annualIptu?: number;
  acceptsFinancing: boolean;
  acceptsTrade: boolean;
  exclusiveSale: boolean;
}
```

**Mapeamento Backend (Property):**
```typescript
{
  financialInfo: {
    monthlyRent: number,
    monthlyIptu: number,
    monthlyCondo: number,
    monthlyFees: number,
    salePrice: number,
    annualIptu: number
  },
  
  // 🆕 NOVO: Flags de venda
  saleSettings: {
    acceptsFinancing: boolean,
    acceptsTrade: boolean,
    exclusiveSale: boolean
  }
}
```

**Status:** ⚠️ **PARCIAL** - financialInfo existe, faltam saleSettings

---

### **STEP 10: financial-fees - Configuração de Preço Temporada**

**Component:** `FinancialSeasonalPricingStep.tsx`

**Campos do Frontend:**
```typescript
interface FinancialSeasonalPricingData {
  configMode: 'global' | 'individual';
  region: 'global' | 'individual';
  currency: string;
  
  // Descontos
  discountPolicy: 'global' | 'individual';
  longStayDiscount: number;
  weeklyDiscount: number;
  monthlyDiscount: number;
  
  // Depósito
  depositMode: 'global' | 'individual';
  depositAmount: number;
  depositCurrency: string;
  
  // Precificação Dinâmica
  dynamicPricingMode: 'global' | 'individual';
  enableDynamicPricing: boolean;
  
  // Taxas
  feesMode: 'global' | 'individual';
  cleaningFee: number;
  cleaningFeePaidBy: 'guest' | 'owner';
  petFee: number;
  petFeePaidBy: 'guest' | 'owner';
  extraServicesFee: number;
  extraServicesFeePaidBy: 'guest' | 'owner';
}
```

**Mapeamento Backend (Property):**
```typescript
{
  pricing: {
    currency: string,
    weeklyDiscount: number,
    monthlyDiscount: number
  },
  
  // 🆕 NOVO: Configurações sazonais
  seasonalPricing: {
    configMode: 'global' | 'individual',
    region: 'global' | 'individual',
    discountPolicy: 'global' | 'individual',
    longStayDiscount: number,
    
    deposit: {
      mode: 'global' | 'individual',
      amount: number,
      currency: string
    },
    
    dynamicPricing: {
      mode: 'global' | 'individual',
      enabled: boolean
    },
    
    fees: {
      mode: 'global' | 'individual',
      cleaning: {
        amount: number,
        paidBy: 'guest' | 'owner'
      },
      pet: {
        amount: number,
        paidBy: 'guest' | 'owner'
      },
      extraServices: {
        amount: number,
        paidBy: 'guest' | 'owner'
      }
    }
  }
}
```

**Status:** ⚠️ **PARCIAL** - pricing.weeklyDiscount e monthlyDiscount existem, falta todo o resto

---

### **STEP 11: financial-pricing - Precificação Individual de Temporada**

**Component:** `FinancialIndividualPricingStep.tsx`

**Campos do Frontend:**
```typescript
interface FinancialIndividualPricingData {
  pricingMode: 'global' | 'individual';
  basePricePerNight: number;
  currency: string;
  
  // Descontos por permanência
  enableStayDiscounts: boolean;
  weeklyDiscount: number;
  monthlyDiscount: number;
  
  // Períodos sazonais
  enableSeasonalPricing: boolean;
  seasonalPeriods: Array<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    pricePerNight: number;
    minNights: number;
    color: string;
  }>;
  
  // Preços por dia da semana
  enableWeekdayPricing: boolean;
  weekdayPricing: {
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
    saturday: number;
    sunday: number;
  };
  
  // Datas especiais
  enableSpecialDates: boolean;
  specialDates: Array<{
    id: string;
    name: string;
    date: string;
    pricePerNight: number;
    minNights: number;
  }>;
}
```

**Mapeamento Backend (Property):**
```typescript
{
  pricing: {
    basePrice: basePricePerNight,
    currency: currency,
    weeklyDiscount: number,
    monthlyDiscount: number
  },
  
  // 🆕 NOVO: Precificação avançada
  advancedPricing: {
    mode: 'global' | 'individual',
    
    stayDiscounts: {
      enabled: boolean,
      weekly: number,
      monthly: number
    },
    
    seasonalPeriods: {
      enabled: boolean,
      periods: Array<{
        id: string,
        name: string,
        startDate: string,
        endDate: string,
        pricePerNight: number,
        minNights: number,
        color: string
      }>
    },
    
    weekdayPricing: {
      enabled: boolean,
      prices: {
        monday: number,
        tuesday: number,
        wednesday: number,
        thursday: number,
        friday: number,
        saturday: number,
        sunday: number
      }
    },
    
    specialDates: {
      enabled: boolean,
      dates: Array<{
        id: string,
        name: string,
        date: string,
        pricePerNight: number,
        minNights: number
      }>
    }
  }
}
```

**Status:** ⚠️ **PARCIAL** - pricing.basePrice existe, falta toda a estrutura advancedPricing

---

### **STEP 12: financial-derived-pricing - Preços Derivados**

**Component:** `FinancialDerivedPricingStep.tsx`

**Campos do Frontend:**
```typescript
interface FinancialDerivedPricingData {
  pricesVaryByGuests: boolean;
  maxGuestsIncluded: number;
  extraGuestFeeType: 'fixed' | 'percentage';
  extraGuestFeeValue: number;
  
  chargeForChildren: boolean;
  childrenChargeType: 'per_night' | 'per_stay';
  
  ageBrackets: Array<{
    id: string;
    name: string;
    minAge: number;
    maxAge: number;
    feeType: 'fixed' | 'percentage';
    feeValue: number;
  }>;
}
```

**Mapeamento Backend (Property):**
```typescript
{
  // 🆕 NOVO: Preços derivados
  derivedPricing: {
    guestPricing: {
      variesByGuests: boolean,
      maxGuestsIncluded: number,
      extraGuestFee: {
        type: 'fixed' | 'percentage',
        value: number
      }
    },
    
    childrenPricing: {
      chargeForChildren: boolean,
      chargeType: 'per_night' | 'per_stay',
      ageBrackets: Array<{
        id: string,
        name: string,
        minAge: number,
        maxAge: number,
        feeType: 'fixed' | 'percentage',
        feeValue: number
      }>
    }
  }
}
```

**Status:** ❌ **NÃO IMPLEMENTADO**

---

### **STEP 13: settings-rules - Regras de Hospedagem**

**Component:** `SettingsRulesStep.tsx`

**Campos do Frontend:**
```typescript
interface SettingsRulesData {
  checkInTime: string;              // "14:00"
  checkOutTime: string;             // "12:00"
  checkInType: 'physical_key' | 'code' | 'app' | 'other';
  checkInInstructions?: string;
  
  allowPets: boolean;
  allowSmoking: boolean;
  allowEvents: boolean;
  
  quietHoursStart?: string;         // "22:00"
  quietHoursEnd?: string;           // "08:00"
  
  minAge?: number;
  maxGuests: number;
  
  houseRules?: string;
  additionalRules?: string[];
}
```

**Mapeamento Backend (Property):**
```typescript
{
  // 🆕 NOVO: Regras de hospedagem
  rules: {
    checkIn: {
      time: string,
      type: 'physical_key' | 'code' | 'app' | 'other',
      instructions: string
    },
    
    checkOut: {
      time: string
    },
    
    policies: {
      allowPets: boolean,
      allowSmoking: boolean,
      allowEvents: boolean
    },
    
    quietHours: {
      start: string,
      end: string
    },
    
    restrictions: {
      minAge: number,
      maxGuests: number
    },
    
    houseRules: string,
    additionalRules: string[]
  }
}
```

**Status:** ❌ **NÃO IMPLEMENTADO**

---

### **STEP 14: settings-booking - Configurações de Reserva**

**Component:** (Ainda não implementado)

**Campos esperados:**
```typescript
interface SettingsBookingData {
  instantBooking: boolean;
  requireApproval: boolean;
  advanceNotice: number;            // Horas de antecedência
  preparationTime: number;          // Dias entre reservas
  availabilityWindow: number;       // Meses de antecedência
  minNights: number;
  maxNights: number;
}
```

**Mapeamento Backend (Property):**
```typescript
{
  restrictions: {
    minNights: number,           // ✅ Já existe
    maxNights: number,           // ✅ Já existe
    advanceBooking: number,      // ✅ Já existe
    preparationTime: number      // ✅ Já existe
  },
  
  // 🆕 NOVO: Configurações de reserva
  bookingSettings: {
    instantBooking: boolean,
    requireApproval: boolean,
    advanceNoticeHours: number,
    availabilityWindowMonths: number
  }
}
```

**Status:** ⚠️ **PARCIAL** - restrictions existe, falta bookingSettings

---

### **STEP 15: settings-tags - Tags e Grupos**

**Component:** (Ainda não implementado)

**Campos esperados:**
```typescript
interface SettingsTagsData {
  tags: string[];
  folder?: string;
  color?: string;
}
```

**Mapeamento Backend (Property):**
```typescript
{
  tags: string[],      // ✅ Já existe
  folder: string,      // ✅ Já existe
  color: string        // ✅ Já existe
}
```

**Status:** ✅ **JÁ IMPLEMENTADO** em types.ts (linhas 158-160)

---

### **STEP 16: settings-ical - iCal e Sincronização**

**Component:** (Ainda não implementado)

**Campos esperados:**
```typescript
interface SettingsICalData {
  icalImportUrl?: string;
  icalExportUrl?: string;
  syncEnabled: boolean;
  syncInterval: number;              // Minutos
  lastSync?: string;
}
```

**Mapeamento Backend (Property):**
```typescript
{
  // 🆕 NOVO: Configurações iCal
  icalSettings: {
    importUrl: string,
    exportUrl: string,
    syncEnabled: boolean,
    syncIntervalMinutes: number,
    lastSyncAt: string
  }
}
```

**Status:** ❌ **NÃO IMPLEMENTADO**

---

### **STEP 17: settings-otas - Integrações OTAs**

**Component:** (Ainda não implementado)

**Campos esperados:**
```typescript
interface SettingsOTAsData {
  airbnb: {
    enabled: boolean;
    listingId?: string;
    syncEnabled: boolean;
  };
  booking: {
    enabled: boolean;
    listingId?: string;
    syncEnabled: boolean;
  };
  decolar: {
    enabled: boolean;
    listingId?: string;
    syncEnabled: boolean;
  };
  direct: boolean;
}
```

**Mapeamento Backend (Property):**
```typescript
{
  platforms: {              // ✅ Já existe
    airbnb: {
      enabled: boolean,
      listingId: string,
      syncEnabled: boolean
    },
    booking: {
      enabled: boolean,
      listingId: string,
      syncEnabled: boolean
    },
    decolar: {
      enabled: boolean,
      listingId: string,
      syncEnabled: boolean
    },
    direct: boolean
  }
}
```

**Status:** ✅ **JÁ IMPLEMENTADO** em types.ts (linhas 171-188)

---

## 📊 RESUMO DO STATUS

| Step | Nome | Status Backend | Prioridade |
|------|------|----------------|------------|
| 1 | Tipo e Identificação | ✅ Completo | - |
| 2 | Localização | ✅ Completo | - |
| 3 | Cômodos | ⚠️ Parcial | 🔴 ALTA |
| 4 | Amenidades Local | ✅ Completo | - |
| 5 | Amenidades Acomodação | ✅ Completo | - |
| 6 | Fotos | ✅ Completo | - |
| 7 | Descrição | ⚠️ Parcial | 🟡 MÉDIA |
| 8 | Contrato e Taxas | ✅ Completo | - |
| 9 | Preços Residenciais | ⚠️ Parcial | 🟡 MÉDIA |
| 10 | Configuração Temporada | ⚠️ Parcial | 🔴 ALTA |
| 11 | Precificação Individual | ⚠️ Parcial | 🔴 ALTA |
| 12 | Preços Derivados | ❌ Faltando | 🔴 ALTA |
| 13 | Regras Hospedagem | ❌ Faltando | 🔴 ALTA |
| 14 | Config. Reserva | ⚠️ Parcial | 🟡 MÉDIA |
| 15 | Tags e Grupos | ✅ Completo | - |
| 16 | iCal | ❌ Faltando | 🟢 BAIXA |
| 17 | OTAs | ✅ Completo | - |

### **Estatísticas:**
- ✅ **Completos:** 6 steps (35%)
- ⚠️ **Parciais:** 6 steps (35%)
- ❌ **Faltando:** 5 steps (30%)

---

## 🎯 CAMPOS QUE PRECISAM SER ADICIONADOS

### **Alta Prioridade (implementar agora):**

```typescript
interface Property {
  // ... campos existentes ...
  
  // STEP 3: Cômodos detalhados
  rooms?: Array<{
    id: string;
    name: string;
    type: 'bedroom' | 'bathroom' | 'living_room' | 'kitchen' | 'other';
    bedType?: string;
    bedCount?: number;
    amenities?: string[];
  }>;
  
  // STEP 10: Configurações sazonais
  seasonalPricing?: {
    configMode: 'global' | 'individual';
    region: 'global' | 'individual';
    discountPolicy: 'global' | 'individual';
    longStayDiscount: number;
    deposit: {
      mode: 'global' | 'individual';
      amount: number;
      currency: string;
    };
    dynamicPricing: {
      mode: 'global' | 'individual';
      enabled: boolean;
    };
    fees: {
      mode: 'global' | 'individual';
      cleaning: { amount: number; paidBy: 'guest' | 'owner'; };
      pet: { amount: number; paidBy: 'guest' | 'owner'; };
      extraServices: { amount: number; paidBy: 'guest' | 'owner'; };
    };
  };
  
  // STEP 11: Precificação avançada
  advancedPricing?: {
    mode: 'global' | 'individual';
    stayDiscounts: {
      enabled: boolean;
      weekly: number;
      monthly: number;
    };
    seasonalPeriods: {
      enabled: boolean;
      periods: Array<{
        id: string;
        name: string;
        startDate: string;
        endDate: string;
        pricePerNight: number;
        minNights: number;
        color: string;
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
        name: string;
        date: string;
        pricePerNight: number;
        minNights: number;
      }>;
    };
  };
  
  // STEP 12: Preços derivados
  derivedPricing?: {
    guestPricing: {
      variesByGuests: boolean;
      maxGuestsIncluded: number;
      extraGuestFee: {
        type: 'fixed' | 'percentage';
        value: number;
      };
    };
    childrenPricing: {
      chargeForChildren: boolean;
      chargeType: 'per_night' | 'per_stay';
      ageBrackets: Array<{
        id: string;
        name: string;
        minAge: number;
        maxAge: number;
        feeType: 'fixed' | 'percentage';
        feeValue: number;
      }>;
    };
  };
  
  // STEP 13: Regras de hospedagem
  rules?: {
    checkIn: {
      time: string;
      type: 'physical_key' | 'code' | 'app' | 'other';
      instructions?: string;
    };
    checkOut: {
      time: string;
    };
    policies: {
      allowPets: boolean;
      allowSmoking: boolean;
      allowEvents: boolean;
    };
    quietHours?: {
      start: string;
      end: string;
    };
    restrictions: {
      minAge?: number;
      maxGuests: number;
    };
    houseRules?: string;
    additionalRules?: string[];
  };
}
```

---

## 🔧 PRÓXIMOS PASSOS

### **FASE 1: Atualizar Types** ✅ AGORA
1. Adicionar todos os campos faltantes em `types.ts`
2. Criar interfaces específicas para cada step
3. Documentar todos os campos

### **FASE 2: Atualizar Rotas** ✅ AGORA
1. Atualizar POST `/api/properties` para aceitar todos os campos
2. Atualizar PUT `/api/properties/:id` para aceitar todos os campos
3. Atualizar GET `/api/properties/:id` para retornar todos os campos
4. Adicionar validações de negócio

### **FASE 3: Testar End-to-End**
1. Testar cada step do wizard
2. Verificar que dados são salvos corretamente
3. Verificar que dados são carregados corretamente
4. Testar navegação entre steps

---

**PRÓXIMO:** Implementar FASE 1 e FASE 2 agora!
