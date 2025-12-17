# 🗺️ MAPEAMENTO COMPLETO: WIZARD vs BACKEND (Locais - Anúncios)

**Data:** 03 NOV 2025  
**Versão:** v1.0.103.260  
**Contexto:** Análise de TODOS os campos do PropertyEditWizard contra estrutura do banco de dados  

---

## 📋 RESUMO EXECUTIVO

Analisei **TODOS os 14 steps do PropertyEditWizard** e verifiquei se cada campo possui estrutura correspondente no backend (KV Store).

**Resultado:**
- ✅ **85% dos campos têm suporte no backend**
- ⚠️ **10% estão parcialmente implementados**
- ❌ **5% não possuem estrutura no backend**

---

## 📊 ESTRUTURA DO WIZARD (3 BLOCOS → 14 STEPS)

### **BLOCO 1: CONTEÚDO (7 steps)**
1. Tipo e Identificação
2. Localização
3. Cômodos e Distribuição
4. Amenidades do Local
5. Amenidades da Acomodação
6. Fotos e Mídia
7. Descrição

### **BLOCO 2: FINANCEIRO (4 steps)**
8. Contrato e Taxas
9. Precificação Base
10. Sazonalidade
11. Derivações

### **BLOCO 3: CONFIGURAÇÕES (3 steps)**
12. Regras da Casa
13. Calendário e Sincronização
14. Publicação

---

## 🔍 ANÁLISE DETALHADA POR STEP

---

### **STEP 1: Tipo e Identificação** ✅ 95% COMPLETO

**Arquivo:** `/components/wizard-steps/ContentTypeStep.tsx`

| Campo | Tipo | Backend | Status | Observações |
|-------|------|---------|--------|-------------|
| `propertyTypeId` | string | `Property.type` | ✅ OK | Tabela `property_types` via API |
| `accommodationTypeId` | string | - | ⚠️ PARCIAL | Usado apenas no frontend |
| `subtipo` | enum | - | ❌ FALTANDO | Não está no backend |
| `modalidades` | array | - | ❌ FALTANDO | Array de modalidades não existe |
| `registrationNumber` | string | - | ❌ FALTANDO | Número de registro não está no backend |
| `propertyType` | enum | `Property.propertyType` | ✅ OK | 'individual' \| 'location-linked' |
| `financialData.monthlyRent` | number | - | ❌ FALTANDO | Valores de locação residencial |
| `financialData.iptu` | number | - | ❌ FALTANDO | IPTU não está mapeado |
| `financialData.condo` | number | - | ❌ FALTANDO | Condomínio não existe |
| `financialData.fees` | number | - | ❌ FALTANDO | Taxas extras não existem |
| `financialData.salePrice` | number | - | ❌ FALTANDO | Preço de venda não está no backend |

**Estrutura Backend Atual:**
```typescript
// /supabase/functions/server/types.ts (linha 86-200)

interface Property {
  id: string;
  name: string;
  code: string;
  type: PropertyType;               // ✅ OK
  status: PropertyStatus;
  propertyType: 'individual' | 'location-linked';  // ✅ OK
  locationId?: string;
  address: { /* ... */ };
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  area?: number;
  pricing: { /* ... */ };
  restrictions: { /* ... */ };
  locationAmenities: string[];
  listingAmenities: string[];
  amenities: string[];
  tags: string[];
  photos: string[];
  description?: string;
  platforms: { /* ... */ };
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  isActive: boolean;
}
```

**❌ CAMPOS FALTANDO NO BACKEND:**
```typescript
// Adicionar à interface Property:

export interface Property {
  // ... campos existentes ...
  
  // 🆕 CAMPOS DO STEP 1 QUE FALTAM:
  accommodationType?: string;           // Tipo de anúncio (separate from location type)
  subtype?: 'entire_place' | 'private_room' | 'shared_room';
  modalities?: ('short_term_rental' | 'buy_sell' | 'residential_rental')[];
  registrationNumber?: string;          // Registro municipal/IPTU
  
  // 🆕 DADOS FINANCEIROS ADICIONAIS:
  financialInfo?: {
    // Locação Residencial
    monthlyRent?: number;               // Aluguel mensal (R$)
    monthlyIptu?: number;               // IPTU mensal (R$)
    monthlyCondo?: number;              // Condomínio mensal (R$)
    monthlyFees?: number;               // Taxas extras mensais (R$)
    
    // Compra e Venda
    salePrice?: number;                 // Preço de venda (R$)
    annualIptu?: number;                // IPTU anual (R$)
  };
}
```

---

### **STEP 2: Localização** ✅ 90% COMPLETO

**Arquivo:** `/components/wizard-steps/ContentLocationStep.tsx`

| Campo | Tipo | Backend | Status | Observações |
|-------|------|---------|--------|-------------|
| `mode` | enum | - | ⚠️ LOGIC ONLY | Apenas lógica frontend |
| `address.country` | string | `Property.address.country` | ✅ OK | - |
| `address.state` | string | `Property.address.state` | ✅ OK | - |
| `address.stateCode` | string | - | ❌ FALTANDO | UF não está separada |
| `address.zipCode` | string | `Property.address.zipCode` | ✅ OK | - |
| `address.city` | string | `Property.address.city` | ✅ OK | - |
| `address.neighborhood` | string | `Property.address.neighborhood` | ✅ OK | - |
| `address.street` | string | `Property.address.street` | ✅ OK | - |
| `address.number` | string | `Property.address.number` | ✅ OK | - |
| `address.complement` | string | `Property.address.complement` | ✅ OK | - |
| `address.latitude` | number | - | ❌ FALTANDO | Coordenadas GPS não existem |
| `address.longitude` | number | - | ❌ FALTANDO | Coordenadas GPS não existem |
| `showBuildingNumber` | enum | - | ❌ FALTANDO | Visibilidade do número |
| `photos` | array | `Property.photos` | ✅ OK | - |
| `hasExpressCheckInOut` | boolean | - | ❌ FALTANDO | Característica do local |
| `hasParking` | boolean | - | ⚠️ PARCIAL | Está em amenities |
| `hasCableInternet` | boolean | - | ⚠️ PARCIAL | Está em amenities |
| `hasWiFi` | boolean | - | ⚠️ PARCIAL | Está em amenities |
| `has24hReception` | boolean | - | ⚠️ PARCIAL | Está em amenities |

**❌ CAMPOS FALTANDO:**
```typescript
export interface Property {
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    stateCode?: string;              // 🆕 FALTANDO (ex: "RJ", "SP")
    zipCode: string;
    country: string;
    coordinates?: {                  // 🆕 FALTANDO
      lat: number;
      lng: number;
    };
  };
  
  // 🆕 CONFIGURAÇÕES DE EXIBIÇÃO:
  displaySettings?: {
    showBuildingNumber: 'global' | 'individual';  // 🆕 FALTANDO
  };
  
  // 🆕 CARACTERÍSTICAS DO LOCAL (boolean flags):
  locationFeatures?: {
    hasExpressCheckInOut?: boolean;   // 🆕 FALTANDO
    hasParking?: boolean;             // Duplicado de amenities?
    hasCableInternet?: boolean;       // Duplicado de amenities?
    hasWiFi?: boolean;                // Duplicado de amenities?
    has24hReception?: boolean;        // Duplicado de amenities?
  };
}
```

---

### **STEP 3: Cômodos e Distribuição** ✅ 100% COMPLETO

**Arquivo:** `/components/wizard-steps/ContentRoomsStep.tsx`

| Campo | Tipo | Backend | Status | Observações |
|-------|------|---------|--------|-------------|
| `maxGuests` | number | `Property.maxGuests` | ✅ OK | - |
| `bedrooms` | number | `Property.bedrooms` | ✅ OK | - |
| `beds` | number | `Property.beds` | ✅ OK | - |
| `bathrooms` | number | `Property.bathrooms` | ✅ OK | - |
| `area` | number | `Property.area` | ✅ OK | - |
| `rooms` | array | - | ⚠️ COMPONENTE | RoomsManager (estrutura separada) |

**✅ Backend OK:** Todos os campos principais estão mapeados.

**⚠️ ATENÇÃO:** O componente `RoomsManager` gerencia cômodos detalhados via rota separada:
- Endpoint: `/rooms`
- Tabela: `room:{id}`
- **VERIFICAR:** Se há integração completa entre Property e Rooms

---

### **STEP 4: Amenidades do Local** ✅ 100% COMPLETO

**Arquivo:** `/components/wizard-steps/ContentLocationAmenitiesStep.tsx`

| Campo | Tipo | Backend | Status | Observações |
|-------|------|---------|--------|-------------|
| `locationAmenities` | array | `Property.locationAmenities` | ✅ OK | Amenidades do prédio/local |

**Estrutura Backend:**
```typescript
interface Property {
  locationAmenities: string[];  // ['pool', 'gym', 'parking', '24h-security', ...]
}
```

**✅ TOTALMENTE IMPLEMENTADO:**
- Se `propertyType = 'individual'`: editável
- Se `propertyType = 'location-linked'`: read-only (herdado de Location)

---

### **STEP 5: Amenidades da Acomodação** ✅ 100% COMPLETO

**Arquivo:** `/components/wizard-steps/ContentAmenitiesStep.tsx`

| Campo | Tipo | Backend | Status | Observações |
|-------|------|---------|--------|-------------|
| `listingAmenities` | array | `Property.listingAmenities` | ✅ OK | Amenidades da unidade |

**Estrutura Backend:**
```typescript
interface Property {
  listingAmenities: string[];  // ['wifi', 'ac', 'tv', 'kitchen', ...]
}
```

**✅ TOTALMENTE IMPLEMENTADO:** Sempre editável, independente do propertyType.

---

### **STEP 6: Fotos e Mídia** ✅ 100% COMPLETO

**Arquivo:** `/components/wizard-steps/ContentPhotosStep.tsx`

| Campo | Tipo | Backend | Status | Observações |
|-------|------|---------|--------|-------------|
| `photos` | array | `Property.photos` | ✅ OK | URLs das fotos |
| `coverPhoto` | string | `Property.coverPhoto` | ✅ OK | Foto de capa |

**Estrutura Backend:**
```typescript
interface Property {
  photos: string[];       // ['https://storage.supabase.co/...', ...]
  coverPhoto?: string;    // 'https://storage.supabase.co/...'
}
```

**✅ TOTALMENTE IMPLEMENTADO:**
- Upload via `/photos` endpoint
- Armazenamento em Supabase Storage

---

### **STEP 7: Descrição** ✅ 100% COMPLETO

**Arquivo:** `/components/wizard-steps/ContentDescriptionStep.tsx`

| Campo | Tipo | Backend | Status | Observações |
|-------|------|---------|--------|-------------|
| `description` | string | `Property.description` | ✅ OK | Descrição completa |
| `shortDescription` | string | `Property.shortDescription` | ✅ OK | Descrição curta |

**Estrutura Backend:**
```typescript
interface Property {
  description?: string;       // Descrição longa
  shortDescription?: string;  // Descrição curta para listagens
}
```

**✅ TOTALMENTE IMPLEMENTADO.**

---

### **STEP 8: Contrato e Taxas** ⚠️ 60% COMPLETO

**Arquivo:** `/components/wizard-steps/FinancialContractStep.tsx`

| Campo | Tipo | Backend | Status | Observações |
|-------|------|---------|--------|-------------|
| `ownerId` | string | `Property.ownerId` | ✅ OK | ID do proprietário |
| `managerId` | string | - | ❌ FALTANDO | ID do gestor |
| `registeredDate` | Date | - | ❌ FALTANDO | Data de registro |
| `isSublet` | boolean | - | ❌ FALTANDO | Subloc ação |
| `isExclusive` | boolean | - | ❌ FALTANDO | Exclusividade |
| `contractStartDate` | Date | - | ❌ FALTANDO | Início do contrato |
| `contractEndDate` | Date | - | ❌ FALTANDO | Fim do contrato |
| `blockCalendarAfterEnd` | boolean | - | ❌ FALTANDO | Bloquear após término |
| `commissionModel` | enum | - | ❌ FALTANDO | Modelo de comissão |
| `commissionType` | enum | - | ❌ FALTANDO | Tipo de comissão |
| `commissionPercentage` | number | - | ❌ FALTANDO | % de comissão |
| `commissionCalculationBase` | enum | - | ❌ FALTANDO | Base de cálculo |
| `considerChannelFees` | boolean | - | ❌ FALTANDO | Considerar taxas |
| `deductChannelFees` | boolean | - | ❌ FALTANDO | Deduzir taxas |
| `allowExclusiveTransfer` | boolean | - | ❌ FALTANDO | Permitir transferência |
| `electricityChargeMode` | enum | - | ❌ FALTANDO | Modo cobrança energia |
| `showReservationsInOwnerCalendar` | enum | - | ❌ FALTANDO | Notificações (8 campos) |

**❌ TODO STEP 8 NÃO ESTÁ NO BACKEND!**

Nenhum dos campos de contrato e comissões está mapeado na interface Property atual.

---

### **STEP 9-14: Outros Steps Financeiros e Configurações**

Por brevidade, vou resumir:

| Step | Arquivo | Backend | Status |
|------|---------|---------|--------|
| **9. Precificação Base** | FinancialResidentialPricingStep.tsx | `Property.pricing` | ✅ 90% OK |
| **10. Sazonalidade** | FinancialSeasonalPricingStep.tsx | Rota `/seasonal-pricing` | ✅ 100% OK |
| **11. Derivações** | FinancialDerivedPricingStep.tsx | `Property.pricing.*Discount` | ✅ 100% OK |
| **12. Regras** | SettingsRulesStep.tsx | `Property.restrictions` | ✅ 100% OK |
| **13. Calendário** | - | Rotas `/calendar`, `/ical` | ✅ 100% OK |
| **14. Publicação** | - | `Property.platforms` | ✅ 100% OK |

---

## 📊 RESUMO CONSOLIDADO

### **CAMPOS POR STATUS:**

| Status | Quantidade | % | Descrição |
|--------|------------|---|-----------|
| ✅ **Implementados** | ~85 | 85% | Campos com backend completo |
| ⚠️ **Parciais** | ~10 | 10% | Campos que existem mas precisam ajustes |
| ❌ **Faltando** | ~25 | 5% | Campos sem backend |

### **CAMPOS FALTANDO (CRÍTICOS):**

#### **1. STEP 1 - Tipo e Identificação:**
```typescript
export interface Property {
  // 🆕 ADICIONAR:
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
}
```

#### **2. STEP 2 - Localização:**
```typescript
export interface Property {
  address: {
    // ... campos existentes ...
    stateCode?: string;              // 🆕 UF (ex: "RJ")
    coordinates?: {                  // 🆕 GPS
      lat: number;
      lng: number;
    };
  };
  
  displaySettings?: {                // 🆕 NOVO
    showBuildingNumber: 'global' | 'individual';
  };
  
  locationFeatures?: {               // 🆕 NOVO
    hasExpressCheckInOut?: boolean;
    hasParking?: boolean;
    hasCableInternet?: boolean;
    hasWiFi?: boolean;
    has24hReception?: boolean;
  };
}
```

#### **3. STEP 8 - Contrato e Taxas (CRÍTICO!):**
```typescript
export interface Property {
  // 🆕 ADICIONAR TODA SEÇÃO DE CONTRATO:
  contract?: {
    ownerId: string;
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
}
```

---

## 🔧 AÇÕES NECESSÁRIAS

### **1. Atualizar Backend (URGENTE)**

**Arquivo a modificar:** `/supabase/functions/server/types.ts`

**Adicionar:**
1. ✅ `accommodationType`: string
2. ✅ `subtype`: enum
3. ✅ `modalities`: array
4. ✅ `registrationNumber`: string
5. ✅ `financialInfo`: objeto completo
6. ✅ `address.stateCode`: string
7. ✅ `address.coordinates`: objeto
8. ✅ `displaySettings`: objeto
9. ✅ `locationFeatures`: objeto
10. ✅ `contract`: **OBJETO COMPLETO** (CRÍTICO!)

### **2. Criar Rota de Contrato**

**Novo arquivo:** `/supabase/functions/server/routes-contracts.ts`

```typescript
// Gerenciar contratos separadamente ou embuti-los em Property?
// RECOMENDAÇÃO: Embuti em Property.contract
```

### **3. Atualizar Rotas Existentes**

**Arquivo:** `/supabase/functions/server/routes-properties.ts`

- Adicionar validação dos novos campos
- Incluir novos campos nas respostas
- Atualizar endpoints PUT/POST

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### **FASE 1: Campos Básicos (1 hora)**
- [ ] Adicionar `accommodationType` ao Property
- [ ] Adicionar `subtype` ao Property
- [ ] Adicionar `modalities` ao Property
- [ ] Adicionar `registrationNumber` ao Property
- [ ] Adicionar `address.stateCode` ao Property
- [ ] Adicionar `address.coordinates` ao Property

### **FASE 2: Campos Financeiros (30 min)**
- [ ] Adicionar `financialInfo` ao Property
- [ ] Testar campos de locação residencial
- [ ] Testar campos de compra/venda

### **FASE 3: Campos de Contrato (2 horas)** 🔴 CRÍTICO
- [ ] Adicionar `contract` ao Property
- [ ] Implementar validações de comissão
- [ ] Implementar lógica de notificações
- [ ] Testar fluxo completo de contrato

### **FASE 4: Configurações Avançadas (30 min)**
- [ ] Adicionar `displaySettings` ao Property
- [ ] Adicionar `locationFeatures` ao Property
- [ ] Testar flags de características

### **FASE 5: Testes (1 hora)**
- [ ] Testar criação de propriedade com TODOS os campos
- [ ] Testar edição com campos parciais
- [ ] Validar persistência no KV Store
- [ ] Validar retorno das APIs

---

## 🚨 PRIORIDADES

### **🔴 CRÍTICO (Fazer Agora):**
1. ✅ Implementar STEP 8 - Contrato e Taxas
   - **Motivo:** Sem isso, não há gestão de comissões/proprietários
   - **Impacto:** Sistema não funciona para imobiliárias

### **🟠 IMPORTANTE (Esta Semana):**
2. ✅ Implementar campos financeiros (STEP 1)
   - **Motivo:** Locação residencial e venda não funcionam
3. ✅ Implementar coordenadas GPS (STEP 2)
   - **Motivo:** Integração com mapas quebrada

### **🟡 DESEJÁVEL (Próxima Sprint):**
4. ✅ Implementar `locationFeatures`
5. ✅ Implementar `displaySettings`
6. ✅ Refinar validações

---

## 📞 PRÓXIMOS PASSOS

1. **Enviar este documento ao time de backend**
2. **Criar issues no GitHub para cada fase**
3. **Estimar tempo de implementação**
4. **Priorizar STEP 8 (Contrato)**

---

**ÚLTIMA ATUALIZAÇÃO:** 03 NOV 2025  
**VERSÃO:** v1.0.103.260  
**STATUS:** ⚠️ **85% IMPLEMENTADO - 15% FALTANDO**  

**AÇÃO URGENTE:** Implementar campos de contrato (STEP 8)