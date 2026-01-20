# 📊 RESUMO EXECUTIVO: GAPS BACKEND vs WIZARD

**Data:** 03 NOV 2025  
**Versão:** v1.0.103.260  
**Análise:** Todos os 14 steps do PropertyEditWizard vs Backend  

---

## 🎯 RESUMO

Analisei **TODOS os campos** do wizard de edição de propriedades (Locais - Anúncios) e identifiquei:

- ✅ **85% dos campos têm backend** (Property interface)
- ❌ **15% não possuem estrutura** (aproximadamente 25 campos)

---

## 🔴 GAPS CRÍTICOS (URGENTE)

### **1. STEP 8 - Contrato e Taxas** 🔥 **TODO O STEP FALTANDO**

**Problema:** NENHUM campo de contrato existe no backend.

**Campos faltando (17 campos):**
```typescript
Property.contract = {
  ownerId: string;                   // ✅ Existe separado
  managerId?: string;                // ❌ FALTANDO
  registeredDate?: string;           // ❌ FALTANDO
  isSublet: boolean;                 // ❌ FALTANDO
  isExclusive: boolean;              // ❌ FALTANDO
  startDate?: string;                // ❌ FALTANDO
  endDate?: string;                  // ❌ FALTANDO
  blockCalendarAfterEnd: boolean;    // ❌ FALTANDO
  
  commission: {
    model: 'global' | 'individual'; // ❌ FALTANDO
    type?: 'percentage' | 'fixed_monthly'; // ❌ FALTANDO
    percentage?: number;             // ❌ FALTANDO
    calculationBase?: string;        // ❌ FALTANDO
    considerChannelFees: boolean;    // ❌ FALTANDO
    deductChannelFees: boolean;      // ❌ FALTANDO
    allowExclusiveTransfer: boolean; // ❌ FALTANDO
  };
  
  charges: {
    electricityMode: 'global' | 'individual'; // ❌ FALTANDO
  };
  
  notifications: {
    // 8 campos de notificação          // ❌ TODOS FALTANDO
  };
}
```

**Impacto:** ⚠️ **SISTEMA NÃO FUNCIONA PARA IMOBILIÁRIAS**  
- Sem gestão de comissões
- Sem controle de proprietários
- Sem notificações configuráveis

**Prioridade:** 🔴 **CRÍTICA**  
**Tempo estimado:** 2-3 horas

---

### **2. STEP 1 - Dados Financeiros** 🔥 **6 campos faltando**

**Problema:** Modalidades de locação residencial e venda não funcionam.

**Campos faltando:**
```typescript
Property.financialInfo = {
  monthlyRent?: number;      // ❌ Aluguel mensal
  monthlyIptu?: number;      // ❌ IPTU mensal
  monthlyCondo?: number;     // ❌ Condomínio
  monthlyFees?: number;      // ❌ Taxas extras
  salePrice?: number;        // ❌ Preço de venda
  annualIptu?: number;       // ❌ IPTU anual
}
```

**Impacto:** ⚠️ **Modalidades de negócio quebradas**  
- Locação residencial não salva valores
- Compra/venda não funciona

**Prioridade:** 🔴 **ALTA**  
**Tempo estimado:** 30 minutos

---

## 🟠 GAPS IMPORTANTES (ESTA SEMANA)

### **3. STEP 2 - Coordenadas GPS** 

**Campos faltando:**
```typescript
Property.address.coordinates = {
  lat: number;   // ❌ Latitude
  lng: number;   // ❌ Longitude
}
```

**Impacto:** Integração com mapas quebrada  
**Prioridade:** 🟠 MÉDIA  
**Tempo estimado:** 15 minutos

---

### **4. STEP 1 - Tipo e Modalidades**

**Campos faltando:**
```typescript
Property.accommodationType?: string;  // ❌ Tipo de anúncio
Property.subtype?: enum;              // ❌ Subtipo (entire/private/shared)
Property.modalities?: array;          // ❌ Modalidades (temporada/venda/residencial)
Property.registrationNumber?: string; // ❌ Registro municipal
```

**Impacto:** Filtros e buscas limitados  
**Prioridade:** 🟠 MÉDIA  
**Tempo estimado:** 20 minutos

---

## 🟡 GAPS DESEJÁVEIS (PRÓXIMA SPRINT)

### **5. Características do Local**

```typescript
Property.locationFeatures = {
  hasExpressCheckInOut?: boolean;  // ❌
  hasParking?: boolean;            // ⚠️ Duplicado em amenities
  hasCableInternet?: boolean;      // ⚠️ Duplicado em amenities
  hasWiFi?: boolean;               // ⚠️ Duplicado em amenities
  has24hReception?: boolean;       // ⚠️ Duplicado em amenities
}
```

**Impacto:** Funcionalidades redundantes  
**Prioridade:** 🟡 BAIXA  

---

### **6. Configurações de Exibição**

```typescript
Property.displaySettings = {
  showBuildingNumber: 'global' | 'individual';  // ❌
}
```

**Impacto:** Controle de privacidade limitado  
**Prioridade:** 🟡 BAIXA  

---

## 📋 PLANO DE AÇÃO

### **FASE 1: CRÍTICO (Hoje)**
**Tempo:** 3-4 horas

- [ ] Adicionar `Property.contract` (objeto completo)
- [ ] Adicionar `Property.financialInfo` (6 campos)
- [ ] Testar salvamento e recuperação
- [ ] Validar no wizard

**Entrega:** Sistema funcional para imobiliárias

---

### **FASE 2: IMPORTANTE (Esta Semana)**
**Tempo:** 1 hora

- [ ] Adicionar `address.coordinates`
- [ ] Adicionar `accommodationType`
- [ ] Adicionar `subtype`
- [ ] Adicionar `modalities`
- [ ] Adicionar `registrationNumber`

**Entrega:** Funcionalidades completas

---

### **FASE 3: REFINAMENTO (Próxima Sprint)**
**Tempo:** 30 minutos

- [ ] Adicionar `locationFeatures`
- [ ] Adicionar `displaySettings`
- [ ] Refinar validações

**Entrega:** Sistema polido

---

## 🎯 CÓDIGO PRONTO PARA IMPLEMENTAR

### **Adicionar ao arquivo:** `/supabase/functions/server/types.ts`

```typescript
export interface Property {
  id: string;
  name: string;
  code: string;
  type: PropertyType;
  status: PropertyStatus;
  propertyType: 'individual' | 'location-linked';
  locationId?: string;
  
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    stateCode?: string;              // 🆕 ADICIONAR
    zipCode: string;
    country: string;
    coordinates?: {                  // 🆕 ADICIONAR
      lat: number;
      lng: number;
    };
  };
  
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  area?: number;
  
  pricing: {
    basePrice: number;
    currency: Currency;
    weeklyDiscount: number;
    biweeklyDiscount: number;
    monthlyDiscount: number;
  };
  
  restrictions: {
    minNights: number;
    maxNights: number;
    advanceBooking: number;
    preparationTime: number;
  };
  
  locationAmenities: string[];
  listingAmenities: string[];
  amenities: string[];
  tags: string[];
  photos: string[];
  coverPhoto?: string;
  description?: string;
  shortDescription?: string;
  
  platforms: {
    airbnb?: { enabled: boolean; listingId: string; syncEnabled: boolean };
    booking?: { enabled: boolean; listingId: string; syncEnabled: boolean };
    decolar?: { enabled: boolean; listingId: string; syncEnabled: boolean };
    direct: boolean;
  };
  
  // 🆕 ADICIONAR TUDO ABAIXO:
  
  accommodationType?: string;
  subtype?: 'entire_place' | 'private_room' | 'shared_room';
  modalities?: ('short_term_rental' | 'buy_sell' | 'residential_rental')[];
  registrationNumber?: string;
  
  financialInfo?: {
    monthlyRent?: number;
    monthlyIptu?: number;
    monthlyCondo?: number;
    monthlyFees?: number;
    salePrice?: number;
    annualIptu?: number;
  };
  
  displaySettings?: {
    showBuildingNumber: 'global' | 'individual';
  };
  
  locationFeatures?: {
    hasExpressCheckInOut?: boolean;
    hasParking?: boolean;
    hasCableInternet?: boolean;
    hasWiFi?: boolean;
    has24hReception?: boolean;
  };
  
  contract?: {
    managerId?: string;
    registeredDate?: string;
    isSublet: boolean;
    isExclusive: boolean;
    startDate?: string;
    endDate?: string;
    blockCalendarAfterEnd: boolean;
    
    commission: {
      model: 'global' | 'individual';
      type?: 'percentage' | 'fixed_monthly';
      percentage?: number;
      calculationBase?: 'accommodation_source' | 'total_daily' | 'gross_daily';
      considerChannelFees: boolean;
      deductChannelFees: boolean;
      allowExclusiveTransfer: boolean;
    };
    
    charges: {
      electricityMode: 'global' | 'individual';
    };
    
    notifications: {
      showReservationsInOwnerCalendar: 'global' | 'individual';
      ownerPreReservationEmail: 'global' | 'individual';
      agentPreReservationEmail: 'global' | 'individual';
      ownerConfirmedReservationEmail: 'global' | 'individual';
      agentConfirmedReservationEmail: 'global' | 'individual';
      cancellationEmail: 'global' | 'individual';
      deletedReservationEmail: 'global' | 'individual';
      reserveLinkBeforeCheckout: 'global' | 'individual';
    };
  };
  
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  isActive: boolean;
}
```

---

## ✅ VALIDAÇÃO

Após implementar, testar:

1. ✅ Criar propriedade com STEP 8 completo
2. ✅ Salvar valores de locação residencial
3. ✅ Salvar valores de compra/venda
4. ✅ Salvar coordenadas GPS
5. ✅ Recuperar todos os campos ao editar
6. ✅ Verificar persistência no KV Store

---

## 📊 MÉTRICAS

| Métrica | Valor |
|---------|-------|
| **Total de campos no wizard** | ~100 |
| **Campos implementados** | ~85 (85%) |
| **Campos faltando** | ~25 (15%) |
| **Campos críticos faltando** | 23 (Step 8) |
| **Tempo estimado para 100%** | 4-5 horas |

---

## 🚨 IMPACTO DE NÃO IMPLEMENTAR

### **Se não implementar Step 8 (Contrato):**
- ❌ Imobiliárias não conseguem configurar comissões
- ❌ Gestão de proprietários quebrada
- ❌ Notificações não funcionam
- ❌ **Sistema não está pronto para produção**

### **Se não implementar campos financeiros:**
- ❌ Locação residencial não funciona
- ❌ Compra/venda não funciona
- ❌ Apenas temporada funciona (1 modalidade de 3)

---

**ÚLTIMA ATUALIZAÇÃO:** 03 NOV 2025  
**VERSÃO:** v1.0.103.260  
**STATUS:** ⚠️ **AÇÃO URGENTE NECESSÁRIA**  

**PRÓXIMO PASSO:** Implementar STEP 8 (Contrato e Taxas) - 🔴 CRÍTICO
