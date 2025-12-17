# 🏗️ ESTRUTURA SUSTENTÁVEL PARA SAAS DE IMÓVEIS

**Data:** 23/11/2025  
**Versão:** v1.0.103.1000+  
**Objetivo:** Análise completa e proposta de arquitetura sustentável baseada em melhores práticas

---

## 📋 SUMÁRIO EXECUTIVO

Este documento analisa os problemas estruturais que estão impedindo a criação de propriedades e propõe uma arquitetura sustentável baseada em **melhores práticas para SaaS multi-tenant de gestão de imóveis**.

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
  // ✅ CORREÇÃO: Remover prefixo manualmente (workaround frágil)
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

### Solução Proposta

**Backend Aceita Estrutura Aninhada (Recomendado)**
```typescript
// Backend sempre normaliza, frontend envia como quiser
export async function createProperty(c: Context) {
  const body = await c.req.json(); // Aceita qualquer estrutura
  
  // Backend faz toda a normalização
  const normalized = normalizeWizardData(body);
  // ...
}
```

**Schema JSONB para Dados do Wizard**
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

**Recomendação:** Backend normaliza + JSONB para compatibilidade

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

### Solução Proposta

**Estrutura Híbrida (Recomendado):**
- Campos principais: flat (performance em queries)
- Dados complexos: JSONB (flexibilidade)
- Índices GIN: busca em JSONB quando necessário

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

---

## 📋 MIGRATION SQL PROPOSTA

Ver arquivo: `MIGRATION_ESTRUTURA_SUSTENTAVEL_PROPERTIES.sql`

Esta migration:
1. ✅ Torna `organization_id` NULLABLE
2. ✅ Adiciona campos JSONB para dados complexos
3. ✅ Adiciona índices GIN para busca em JSONB
4. ✅ Mantém compatibilidade com dados existentes
5. ✅ Não quebra funcionalidades atuais

---

## 📋 PLANO DE IMPLEMENTAÇÃO

### Fase 1: Preparação (Sem Breaking Changes)

1. ✅ Aplicar migration SQL (tornar `organization_id` NULLABLE, adicionar JSONB)
2. ✅ Adicionar índices GIN
3. ✅ Atualizar `propertyToSql` para usar JSONB
4. ✅ Testar criação de propriedade com dados básicos

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

- [ ] Aplicar migration SQL (`MIGRATION_ESTRUTURA_SUSTENTAVEL_PROPERTIES.sql`)
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

**Próximo Passo:** Aplicar migration SQL e implementar Fase 1 (Preparação).

