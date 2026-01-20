# 🔍 ANÁLISE ESTRUTURAL: PROPRIEDADES EM SAAS DE IMÓVEIS

**Data:** 23/11/2025  
**Versão:** v1.0.103.1000+  
**Objetivo:** Identificar problemas estruturais e propor solução sustentável

---

## 📋 SUMÁRIO EXECUTIVO

Este documento analisa os problemas estruturais que estão impedindo a criação de propriedades e propõe uma arquitetura sustentável baseada em melhores práticas para SaaS multi-tenant de gestão de imóveis.

### 🎯 Problemas Críticos Identificados

1. **UUIDs com Prefixos** - Sistema usa `acc_`, `loc_`, `user_` mas SQL espera UUID puro
2. **organization_id NOT NULL** - Superadmin não tem organização, mas tabela exige
3. **Mapeamento Frontend ↔ Backend** - Wizard aninhado vs SQL flat
4. **Campos Faltando** - Wizard envia dados que não existem no schema SQL
5. **Constraints Rígidos** - CHECK constraints não alinhados com dados do wizard
6. **Normalização Dupla** - Frontend e backend fazem normalização diferente

---

## 🔴 PROBLEMA 1: UUIDs COM PREFIXOS

### Situação Atual

**Código:**
```typescript
// utils.ts
export function generatePropertyId(): string {
  return `acc_${crypto.randomUUID()}`; // ❌ Gera "acc_uuid"
}

// utils-property-mapper.ts
export function propertyToSql(property: Property, organizationId: string): any {
  // ✅ CORREÇÃO: Remover prefixo manualmente
  let propertyId = property.id;
  if (propertyId && propertyId.includes('_')) {
    const parts = propertyId.split('_');
    propertyId = parts.slice(1).join('_'); // Remove "acc_"
  }
  // ...
}
```

**Problema:**
- Sistema gera IDs com prefixo (`acc_`, `loc_`, `user_`)
- SQL espera UUID puro
- Solução atual: remover prefixo manualmente (workaround frágil)
- Risco: se esquecer de remover em algum lugar → erro de UUID

### Impacto

- ❌ Erro: `invalid input syntax for type uuid: "acc_13fb6f17-..."`
- ❌ Código frágil: precisa lembrar de remover prefixo em todos os lugares
- ❌ Inconsistência: alguns lugares usam prefixo, outros não

### Solução Proposta

**Opção A: Remover Prefixos Completamente (Recomendado)**
```typescript
// ✅ UUID puro em todo o sistema
export function generatePropertyId(): string {
  return crypto.randomUUID(); // UUID puro
}

// Se precisar de identificação visual, usar campo separado
interface Property {
  id: UUID;              // UUID puro para SQL
  shortId: string;       // "PRP-ABC123" para exibição
  code: string;          // "COP201" código do usuário
}
```

**Opção B: Manter Prefixos mas Usar TEXT no SQL**
```sql
-- Se realmente precisar de prefixos
CREATE TABLE properties (
  id TEXT PRIMARY KEY,  -- Aceita "acc_uuid"
  -- ...
);
```

**Recomendação:** Opção A (UUID puro) - mais limpo, mais performático, alinhado com PostgreSQL

---

## 🔴 PROBLEMA 2: organization_id NOT NULL vs Superadmin

### Situação Atual

**Schema SQL:**
```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,  -- ❌ NOT NULL
  -- ...
);
```

**Código:**
```typescript
// routes-properties.ts
if (tenant.type !== 'superadmin') {
  organizationId = await getOrganizationIdOrThrow(c);
} else {
  // ❌ Workaround: buscar primeira organização ou usar UUID fixo
  const { data: defaultOrg } = await client
    .from('organizations')
    .select('id')
    .limit(1)
    .maybeSingle();
  organizationId = defaultOrg?.id || '00000000-0000-0000-0000-000000000001';
}
```

**Problema:**
- Superadmin não pertence a uma organização
- Tabela exige `organization_id NOT NULL`
- Workaround: usar organização aleatória ou UUID fixo
- Risco: dados do superadmin misturados com dados de organizações reais

### Impacto

- ❌ Violação de integridade: superadmin usando organização que não é dele
- ❌ Dificulta queries: não dá para distinguir dados do superadmin
- ❌ RLS complicado: políticas de segurança ficam confusas

### Solução Proposta

**Opção A: organization_id NULLABLE para Superadmin (Recomendado)**
```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY,
  organization_id UUID,  -- ✅ NULLABLE
  -- ...
  CONSTRAINT properties_organization_check CHECK (
    organization_id IS NOT NULL OR created_by IN (
      SELECT id FROM users WHERE type = 'superadmin'
    )
  )
);
```

**Opção B: Tabela Separada para Dados do Superadmin**
```sql
-- Dados de organizações
CREATE TABLE properties (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  -- ...
);

-- Dados do superadmin (se necessário)
CREATE TABLE superadmin_properties (
  id UUID PRIMARY KEY,
  -- Mesmos campos, sem organization_id
);
```

**Opção C: Organização Virtual "System"**
```sql
-- Criar organização especial para superadmin
INSERT INTO organizations (id, name, type) VALUES
  ('00000000-0000-0000-0000-000000000000', 'System', 'system');

-- Superadmin sempre usa essa organização
```

**Recomendação:** Opção A (NULLABLE) - mais simples, mais flexível, alinhado com multi-tenant

---

## 🔴 PROBLEMA 3: Mapeamento Frontend ↔ Backend

### Situação Atual

**Frontend (Wizard):**
```typescript
// Estrutura aninhada
const formData = {
  contentType: {
    propertyTypeId: 'house',
    accommodationTypeId: 'casa',
    subtipo: 'entire_place',
    modalidades: ['short_term_rental'],
  },
  contentLocation: {
    address: { street: '...', city: '...' },
    locationAmenities: ['wifi', 'parking'],
  },
  // ...
};
```

**Backend (SQL):**
```sql
-- Estrutura flat
CREATE TABLE properties (
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL,  -- Precisa vir de accommodationTypeId
  address_street TEXT,
  address_city TEXT,
  -- ...
);
```

**Normalização Dupla:**
```typescript
// Frontend: PropertyWizardPage.tsx
const normalizedData = normalizeFrontendWizardData(data);

// Backend: routes-properties.ts
const normalized = normalizeWizardData(body);
```

**Problema:**
- Frontend envia dados aninhados
- Backend espera dados flat
- Duas normalizações diferentes
- Campos do wizard não mapeiam diretamente para SQL

### Impacto

- ❌ Complexidade: duas camadas de normalização
- ❌ Bugs: fácil esquecer de mapear algum campo
- ❌ Manutenção: mudanças no wizard exigem mudanças em dois lugares

### Solução Proposta

**Opção A: Backend Aceita Estrutura Aninhada (Recomendado)**
```typescript
// Backend sempre normaliza, frontend envia como quiser
export async function createProperty(c: Context) {
  const body = await c.req.json(); // Aceita qualquer estrutura
  
  // Backend faz toda a normalização
  const normalized = normalizeWizardData(body);
  // ...
}
```

**Opção B: Frontend Sempre Envia Flat**
```typescript
// Frontend normaliza antes de enviar
const normalizedData = normalizeFrontendWizardData(data);
await propertiesApi.create(normalizedData); // Já vem flat
```

**Opção C: Schema JSONB para Dados do Wizard**
```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY,
  -- Campos principais flat
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL,
  
  -- Dados do wizard em JSONB (flexível)
  wizard_data JSONB,  -- Estrutura completa do wizard
  
  -- Índices GIN para busca
  -- ...
);
```

**Recomendação:** Opção A + C (Backend normaliza + JSONB para compatibilidade)

---

## 🔴 PROBLEMA 4: Campos Faltando no Schema SQL

### Situação Atual

**Wizard Envia:**
```typescript
{
  contentType: { accommodationTypeId, subtipo, modalidades },
  financialInfo: { monthlyRent, monthlyIptu, salePrice },
  locationFeatures: { hasExpressCheckInOut, hasParking },
  // ... muitos outros campos
}
```

**Schema SQL Tem:**
```sql
CREATE TABLE properties (
  -- Campos básicos
  name, code, type, status,
  -- Endereço flat
  address_street, address_city, ...
  -- Precificação básica
  pricing_base_price, pricing_currency,
  -- ❌ FALTANDO: financialInfo, locationFeatures, etc.
);
```

**Problema:**
- Wizard tem 17 passos com dezenas de campos
- SQL tem apenas campos básicos
- Dados do wizard são perdidos ou não salvos

### Impacto

- ❌ Perda de dados: usuário preenche wizard completo, mas dados não são salvos
- ❌ Funcionalidades quebradas: campos usados no frontend não existem no backend
- ❌ Inconsistência: alguns dados em SQL, outros em JSONB, outros perdidos

### Solução Proposta

**Estrutura Híbrida (Recomendado):**
```sql
CREATE TABLE properties (
  -- ===== CAMPOS PRINCIPAIS (Flat, Indexados) =====
  id UUID PRIMARY KEY,
  organization_id UUID,
  owner_id UUID,
  location_id UUID,
  
  -- Identificação
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('apartment', 'house', 'studio', 'loft', 'condo', 'villa', 'other')),
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'maintenance', 'draft')),
  
  -- Endereço (flat para queries)
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  address_state_code TEXT,
  address_zip_code TEXT,
  address_country TEXT DEFAULT 'BR',
  address_latitude NUMERIC(10, 8),
  address_longitude NUMERIC(11, 8),
  
  -- Capacidade
  max_guests INTEGER,
  bedrooms INTEGER,
  beds INTEGER,
  bathrooms INTEGER,
  area NUMERIC(10, 2), -- m²
  
  -- Precificação Básica (flat para queries)
  pricing_base_price NUMERIC(10, 2),
  pricing_currency TEXT DEFAULT 'BRL',
  pricing_weekly_discount NUMERIC(5, 2),
  pricing_biweekly_discount NUMERIC(5, 2),
  pricing_monthly_discount NUMERIC(5, 2),
  
  -- Arrays (PostgreSQL native)
  amenities TEXT[],
  tags TEXT[],
  photos TEXT[],
  
  -- ===== DADOS COMPLEXOS (JSONB, Flexível) =====
  
  -- Dados Financeiros (do wizard)
  financial_info JSONB,  -- { monthlyRent, monthlyIptu, monthlyCondo, salePrice, ... }
  
  -- Características do Local (do wizard)
  location_features JSONB,  -- { hasExpressCheckInOut, hasParking, hasWiFi, ... }
  
  -- Dados do Wizard (compatibilidade)
  wizard_data JSONB,  -- Estrutura completa do wizard para compatibilidade futura
  
  -- Configurações de Exibição
  display_settings JSONB,  -- { showBuildingNumber, ... }
  
  -- Contrato e Taxas
  contract JSONB,  -- { startDate, endDate, monthlyRent, ... }
  
  -- Cômodos Detalhados
  rooms JSONB,  -- Array de quartos com camas, fotos, etc.
  
  -- Descrição Estendida
  highlights JSONB,
  house_rules JSONB,
  custom_fields JSONB,
  
  -- Configurações de Venda
  sale_settings JSONB,
  
  -- Precificação Avançada
  seasonal_pricing JSONB,
  advanced_pricing JSONB,
  derived_pricing JSONB,
  
  -- Regras e Configurações
  rules JSONB,
  booking_settings JSONB,
  ical_settings JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  
  -- Índices
  CONSTRAINT properties_type_check CHECK (type IN ('apartment', 'house', 'studio', 'loft', 'condo', 'villa', 'other')),
  CONSTRAINT properties_status_check CHECK (status IN ('active', 'inactive', 'maintenance', 'draft'))
);

-- Índices GIN para busca em JSONB
CREATE INDEX idx_properties_financial_info ON properties USING GIN (financial_info);
CREATE INDEX idx_properties_location_features ON properties USING GIN (location_features);
CREATE INDEX idx_properties_wizard_data ON properties USING GIN (wizard_data);

-- Índices para queries comuns
CREATE INDEX idx_properties_organization_id ON properties(organization_id);
CREATE INDEX idx_properties_type ON properties(type);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_address_city ON properties(address_city);
```

**Vantagens:**
- ✅ Campos principais flat (performance em queries)
- ✅ Dados complexos em JSONB (flexibilidade)
- ✅ Índices GIN para busca em JSONB
- ✅ Compatibilidade: wizard_data preserva estrutura original

---

## 🔴 PROBLEMA 5: Constraints Rígidos vs Dados do Wizard

### Situação Atual

**Schema:**
```sql
CREATE TABLE properties (
  type TEXT NOT NULL CHECK (type IN ('apartment', 'house', 'studio', 'loft', 'condo', 'villa', 'other')),
  -- ...
);
```

**Wizard Envia:**
```typescript
{
  contentType: {
    accommodationTypeId: 'casa',  // ❌ Não está na lista do CHECK
    // ...
  }
}
```

**Normalização:**
```typescript
// Precisa converter 'casa' → 'house'
const typeMap = {
  'casa': 'house',
  'apartamento': 'apartment',
  // ...
};
```

**Problema:**
- CHECK constraint muito rígido
- Wizard usa valores diferentes
- Precisa mapear manualmente

### Solução Proposta

**Opção A: Mapeamento Centralizado (Recomendado)**
```typescript
// utils-property-mapper.ts
const ACCOMMODATION_TYPE_MAP: Record<string, string> = {
  'casa': 'house',
  'apartamento': 'apartment',
  'studio': 'studio',
  'loft': 'loft',
  'condominio': 'condo',
  'villa': 'villa',
  // ...
};

export function normalizePropertyType(accommodationTypeId: string): string {
  return ACCOMMODATION_TYPE_MAP[accommodationTypeId] || 'other';
}
```

**Opção B: Expandir CHECK Constraint**
```sql
-- Aceitar mais valores
CREATE TABLE properties (
  type TEXT NOT NULL CHECK (type IN (
    'apartment', 'house', 'studio', 'loft', 'condo', 'villa', 'other',
    'casa', 'apartamento', 'condominio'  -- Valores do wizard
  )),
  -- ...
);
```

**Recomendação:** Opção A (mapeamento centralizado) - mantém schema limpo, normaliza na camada de aplicação

---

## 🎯 PROPOSTA DE ARQUITETURA SUSTENTÁVEL

### Princípios

1. **Separação de Responsabilidades**
   - Frontend: coleta dados do usuário (qualquer estrutura)
   - Backend: normaliza e valida (camada única de normalização)
   - Database: armazena de forma otimizada (flat + JSONB)

2. **Flexibilidade vs Performance**
   - Campos principais: flat (performance em queries)
   - Dados complexos: JSONB (flexibilidade)
   - Índices GIN: busca em JSONB quando necessário

3. **Multi-Tenant Consistente**
   - `organization_id` NULLABLE (suporta superadmin)
   - RLS policies claras
   - Queries sempre filtram por organização

4. **UUIDs Limpos**
   - UUID puro em todo o sistema
   - `shortId` para exibição (ex: "PRP-ABC123")
   - `code` para identificação do usuário (ex: "COP201")

### Estrutura Proposta

```sql
-- ============================================================================
-- TABELA PROPERTIES (Versão Sustentável)
-- ============================================================================

CREATE TABLE properties (
  -- ===== IDENTIFICAÇÃO =====
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id TEXT UNIQUE,  -- "PRP-ABC123" para exibição
  code TEXT NOT NULL,     -- Código do usuário (ex: "COP201")
  organization_id UUID,   -- NULLABLE para superadmin
  owner_id UUID,
  location_id UUID,
  
  -- ===== DADOS PRINCIPAIS (Flat, Indexados) =====
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('apartment', 'house', 'studio', 'loft', 'condo', 'villa', 'other')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'inactive', 'maintenance', 'draft')),
  
  -- Endereço (flat para queries)
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  address_state_code TEXT,
  address_zip_code TEXT,
  address_country TEXT DEFAULT 'BR',
  address_latitude NUMERIC(10, 8),
  address_longitude NUMERIC(11, 8),
  
  -- Capacidade
  max_guests INTEGER,
  bedrooms INTEGER,
  beds INTEGER,
  bathrooms INTEGER,
  area NUMERIC(10, 2),
  
  -- Precificação Básica (flat)
  pricing_base_price NUMERIC(10, 2),
  pricing_currency TEXT DEFAULT 'BRL',
  pricing_weekly_discount NUMERIC(5, 2) DEFAULT 10,
  pricing_biweekly_discount NUMERIC(5, 2) DEFAULT 15,
  pricing_monthly_discount NUMERIC(5, 2) DEFAULT 20,
  
  -- Arrays (PostgreSQL native)
  amenities TEXT[],
  tags TEXT[],
  photos TEXT[],
  cover_photo TEXT,
  
  -- Descrições
  description TEXT,
  short_description TEXT,
  
  -- ===== DADOS COMPLEXOS (JSONB) =====
  
  -- Dados Financeiros
  financial_info JSONB,  -- { monthlyRent, monthlyIptu, monthlyCondo, salePrice, ... }
  
  -- Características do Local
  location_features JSONB,  -- { hasExpressCheckInOut, hasParking, hasWiFi, ... }
  
  -- Dados do Wizard (compatibilidade)
  wizard_data JSONB,  -- Estrutura completa preservada
  
  -- Configurações
  display_settings JSONB,
  contract JSONB,
  rooms JSONB,
  highlights JSONB,
  house_rules JSONB,
  custom_fields JSONB,
  sale_settings JSONB,
  seasonal_pricing JSONB,
  advanced_pricing JSONB,
  derived_pricing JSONB,
  rules JSONB,
  booking_settings JSONB,
  ical_settings JSONB,
  
  -- Plataformas (flat para queries comuns)
  platforms_airbnb_enabled BOOLEAN DEFAULT false,
  platforms_airbnb_listing_id TEXT,
  platforms_booking_enabled BOOLEAN DEFAULT false,
  platforms_booking_listing_id TEXT,
  platforms_decolar_enabled BOOLEAN DEFAULT false,
  platforms_decolar_listing_id TEXT,
  platforms_direct BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  is_active BOOLEAN DEFAULT true,
  
  -- Constraints
  CONSTRAINT properties_code_org_unique UNIQUE (code, organization_id),
  CONSTRAINT properties_organization_fk FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT properties_owner_fk FOREIGN KEY (owner_id) REFERENCES users(id),
  CONSTRAINT properties_location_fk FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- ===== ÍNDICES =====

-- Índices para queries comuns (flat)
CREATE INDEX idx_properties_organization_id ON properties(organization_id);
CREATE INDEX idx_properties_owner_id ON properties(owner_id);
CREATE INDEX idx_properties_location_id ON properties(location_id);
CREATE INDEX idx_properties_type ON properties(type);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_address_city ON properties(address_city);
CREATE INDEX idx_properties_code ON properties(code);

-- Índices GIN para busca em JSONB
CREATE INDEX idx_properties_financial_info_gin ON properties USING GIN (financial_info);
CREATE INDEX idx_properties_location_features_gin ON properties USING GIN (location_features);
CREATE INDEX idx_properties_wizard_data_gin ON properties USING GIN (wizard_data);

-- Índice composto para queries multi-tenant comuns
CREATE INDEX idx_properties_org_status_type ON properties(organization_id, status, type);

-- ===== ROW LEVEL SECURITY (RLS) =====

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Política: Usuários veem apenas propriedades da sua organização
CREATE POLICY "Users can view properties from their organization"
  ON properties FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    OR
    created_by = auth.uid()  -- Criador sempre vê
  );

-- Política: Usuários podem criar propriedades na sua organização
CREATE POLICY "Users can create properties in their organization"
  ON properties FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Política: Usuários podem atualizar propriedades da sua organização
CREATE POLICY "Users can update properties from their organization"
  ON properties FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Política: Superadmin vê tudo
CREATE POLICY "Superadmin can view all properties"
  ON properties FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND type = 'superadmin'
    )
  );
```

### Mapeamento Backend

```typescript
// utils-property-mapper.ts

// Mapeamento centralizado de tipos
const ACCOMMODATION_TYPE_MAP: Record<string, string> = {
  'casa': 'house',
  'apartamento': 'apartment',
  'studio': 'studio',
  'loft': 'loft',
  'condominio': 'condo',
  'villa': 'villa',
};

export function normalizeWizardData(wizardData: any): any {
  // Extrair campos principais
  const name = wizardData.name || 
    wizardData.contentType?.accommodationTypeId || 
    'Propriedade';
  
  const code = wizardData.code || 
    generatePropertyCode();
  
  const type = wizardData.type || 
    normalizePropertyType(wizardData.contentType?.accommodationTypeId) || 
    'other';
  
  // Endereço flat
  const address = wizardData.contentLocation?.address || wizardData.address;
  
  // Dados complexos em JSONB
  const financialInfo = wizardData.financialInfo || wizardData.contentFinancial;
  const locationFeatures = wizardData.locationFeatures || wizardData.contentLocation;
  const wizardDataPreserved = wizardData; // Preservar estrutura original
  
  return {
    // Campos flat
    name,
    code,
    type,
    address_street: address?.street,
    address_city: address?.city,
    // ...
    
    // JSONB
    financial_info: financialInfo,
    location_features: locationFeatures,
    wizard_data: wizardDataPreserved,
  };
}

function normalizePropertyType(accommodationTypeId: string): string {
  return ACCOMMODATION_TYPE_MAP[accommodationTypeId?.toLowerCase()] || 'other';
}
```

---

## 📋 PLANO DE MIGRAÇÃO

### Fase 1: Preparação (Sem Breaking Changes)

1. ✅ Adicionar campos JSONB à tabela `properties`
2. ✅ Tornar `organization_id` NULLABLE
3. ✅ Adicionar índices GIN
4. ✅ Atualizar `propertyToSql` para usar JSONB

### Fase 2: Normalização (Backend)

1. ✅ Centralizar mapeamento de tipos
2. ✅ Backend sempre normaliza (remover normalização do frontend)
3. ✅ Preservar `wizard_data` em JSONB

### Fase 3: Limpeza (UUIDs)

1. ✅ Remover prefixos de `generatePropertyId`
2. ✅ Migrar IDs existentes (se houver)
3. ✅ Atualizar todos os lugares que geram IDs

### Fase 4: Validação

1. ✅ Testar criação de propriedade completa
2. ✅ Testar queries com índices GIN
3. ✅ Testar RLS policies
4. ✅ Testar superadmin vs organização

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Criar migration para nova estrutura `properties`
- [ ] Tornar `organization_id` NULLABLE
- [ ] Adicionar campos JSONB (`financial_info`, `location_features`, `wizard_data`, etc.)
- [ ] Adicionar índices GIN para JSONB
- [ ] Atualizar `propertyToSql` para mapear JSONB
- [ ] Centralizar mapeamento de tipos (`ACCOMMODATION_TYPE_MAP`)
- [ ] Remover prefixos de `generatePropertyId`
- [ ] Atualizar RLS policies para suportar `organization_id` NULL
- [ ] Remover normalização do frontend (backend faz tudo)
- [ ] Testar criação completa de propriedade
- [ ] Testar queries com filtros em JSONB
- [ ] Documentar estrutura final

---

## 🎯 CONCLUSÃO

A estrutura atual tem problemas fundamentais que impedem o funcionamento correto:

1. **UUIDs com prefixos** → UUID puro
2. **organization_id NOT NULL** → NULLABLE
3. **Normalização dupla** → Backend único
4. **Campos faltando** → Estrutura híbrida (flat + JSONB)
5. **Constraints rígidos** → Mapeamento centralizado

A proposta usa **melhores práticas para SaaS multi-tenant**:
- ✅ Separação clara de responsabilidades
- ✅ Flexibilidade (JSONB) + Performance (flat)
- ✅ Multi-tenant consistente (NULLABLE organization_id)
- ✅ UUIDs limpos (sem prefixos)
- ✅ Normalização única (backend)

**Próximo Passo:** Implementar Fase 1 (Preparação) sem breaking changes.

