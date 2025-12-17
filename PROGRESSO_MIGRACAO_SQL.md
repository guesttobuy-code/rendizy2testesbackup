# 📊 PROGRESSO: MIGRAÇÃO SQL + RLS + MULTI-TENANT

**Data:** 17/11/2025  
**Versão:** 1.0.103.400  
**Status:** 🔄 Em Progresso

---

## ✅ MIGRAÇÃO CONCLUÍDA

### 1. ✅ **`evolution_instances` - Removido `user_id`**

**Arquivos Modificados:**
- ✅ `supabase/functions/rendizy-server/evolution-credentials.ts`
- ✅ `supabase/functions/rendizy-server/routes-chat.ts`

**Mudanças:**
- Removido parâmetro `userId: number` → `instanceName?: string`
- Busca por `instance_name` ou primeira instância disponível
- Rotas GET/POST/DELETE ajustadas para não usar `user_id`

---

### 2. ✅ **`properties` - Migração SQL Parcial**

**Arquivos Criados:**
- ✅ `supabase/functions/rendizy-server/utils-property-mapper.ts`
  - Funções `propertyToSql()` e `sqlToProperty()` para conversão
  - Campo `PROPERTY_SELECT_FIELDS` para queries

**Arquivos Modificados:**
- ✅ `supabase/functions/rendizy-server/routes-properties.ts`
  - ✅ `listProperties()` - Migrado para SQL
  - ✅ `getProperty()` - Migrado para SQL
  - ✅ `createProperty()` - Migrado para SQL
  - ⏳ `updateProperty()` - **PENDENTE**
  - ⏳ `deleteProperty()` - **PENDENTE**

**Funcionalidades Implementadas:**
- ✅ Filtro multi-tenant por `organization_id`
- ✅ SuperAdmin vê todas as properties
- ✅ Imobiliária vê apenas suas properties
- ✅ Conversão TypeScript ↔ SQL automática
- ✅ Filtros de query params (status, type, city) na query SQL
- ✅ Filtros adicionais (tags, search, folder) em memória

**Schema SQL Usado:**
```sql
CREATE TABLE public.properties (
  id uuid NOT NULL,
  organization_id uuid NOT NULL,  -- ✅ Multi-tenant
  owner_id uuid NOT NULL,
  location_id uuid,
  name character varying NOT NULL,
  code character varying NOT NULL,
  type character varying NOT NULL,
  status character varying NOT NULL,
  -- ... campos flat (address_*, pricing_*, restrictions_*, etc)
  amenities ARRAY,
  tags ARRAY,
  photos ARRAY,
  -- ... plataformas (platforms_*_enabled, platforms_*_listing_id, etc)
  is_active boolean,
  created_at timestamp,
  updated_at timestamp
);
```

---

## ⏳ MIGRAÇÃO PENDENTE

### 3. ⏳ **`properties` - Completar Migração**

**Pendente:**
- ⏳ `updateProperty()` - Migrar para SQL
- ⏳ `deleteProperty()` - Migrar para SQL
- ⏳ Testar isolamento multi-tenant
- ⏳ Verificar mapeamento de campos complexos (rooms, highlights, etc)

---

### 4. ⏳ **`reservations` - Migração SQL**

**Arquivos a Modificar:**
- ⏳ `supabase/functions/rendizy-server/routes-reservations.ts`
  - ⏳ Criar `utils-reservation-mapper.ts`
  - ⏳ Migrar `listReservations()`
  - ⏳ Migrar `getReservation()`
  - ⏳ Migrar `createReservation()`
  - ⏳ Migrar `updateReservation()`
  - ⏳ Migrar `cancelReservation()`
  - ⏳ Migrar `deleteReservation()`

**Schema SQL:**
```sql
CREATE TABLE public.reservations (
  id uuid NOT NULL,
  organization_id uuid NOT NULL,  -- ✅ Multi-tenant
  property_id uuid NOT NULL,
  guest_id uuid NOT NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  nights integer NOT NULL,
  -- ... campos de guests, pricing, status, platform, payment
  created_by uuid NOT NULL,
  created_at timestamp,
  updated_at timestamp
);
```

---

### 5. ⏳ **`guests` - Migração SQL**

**Arquivos a Modificar:**
- ⏳ `supabase/functions/rendizy-server/routes-guests.ts`
  - ⏳ Criar `utils-guest-mapper.ts`
  - ⏳ Migrar todas as funções

**Schema SQL:**
```sql
CREATE TABLE public.guests (
  id uuid NOT NULL,
  organization_id uuid NOT NULL,  -- ✅ Multi-tenant
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  email character varying NOT NULL,
  phone character varying NOT NULL,
  -- ... campos adicionais
  created_at timestamp,
  updated_at timestamp
);
```

---

### 6. ⏳ **`blocks` - Migração SQL**

**Arquivos a Modificar:**
- ⏳ `supabase/functions/rendizy-server/routes-blocks.ts`
  - ⏳ Criar `utils-block-mapper.ts`
  - ⏳ Migrar todas as funções

**Schema SQL:**
```sql
CREATE TABLE public.blocks (
  id uuid NOT NULL,
  organization_id uuid NOT NULL,  -- ✅ Multi-tenant
  property_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  -- ... campos adicionais
  created_by uuid NOT NULL,
  created_at timestamp,
  updated_at timestamp
);
```

---

## 📋 CHECKLIST DE MIGRAÇÃO

### ✅ Completado

- [x] Criar `utils-property-mapper.ts` para conversão TypeScript ↔ SQL
- [x] Migrar `listProperties()` para SQL
- [x] Migrar `getProperty()` para SQL
- [x] Migrar `createProperty()` para SQL
- [x] Adicionar filtro multi-tenant por `organization_id`
- [x] Remover `user_id` de `evolution_instances`

### ⏳ Pendente

- [ ] Migrar `updateProperty()` para SQL
- [ ] Migrar `deleteProperty()` para SQL
- [ ] Criar `utils-reservation-mapper.ts`
- [ ] Migrar todas as funções de `routes-reservations.ts`
- [ ] Criar `utils-guest-mapper.ts`
- [ ] Migrar todas as funções de `routes-guests.ts`
- [ ] Criar `utils-block-mapper.ts`
- [ ] Migrar todas as funções de `routes-blocks.ts`
- [ ] Testar isolamento multi-tenant
- [ ] Verificar RLS (Row Level Security) no Supabase

---

## 🎯 PRÓXIMOS PASSOS

1. **Completar migração de `properties`:**
   - Migrar `updateProperty()` e `deleteProperty()`

2. **Migrar `reservations`:**
   - Criar mapper
   - Migrar todas as funções
   - Adicionar filtros multi-tenant

3. **Migrar `guests`:**
   - Criar mapper
   - Migrar todas as funções
   - Adicionar filtros multi-tenant

4. **Migrar `blocks`:**
   - Criar mapper
   - Migrar todas as funções
   - Adicionar filtros multi-tenant

5. **Testes:**
   - Testar isolamento multi-tenant
   - Verificar performance
   - Validar integridade de dados

---

## ⚠️ OBSERVAÇÕES IMPORTANTES

### Campos Não Mapeados (Ainda)

Alguns campos complexos do Property TypeScript ainda não estão no SQL:
- `rooms` (Array de objetos) - Tabela separada `rooms` e `beds` existe
- `highlights` (Array de strings) - Pode ser armazenado em JSONB
- `houseRules` (String) - Pode ser armazenado em `description`
- `customFields` (Array de objetos) - Pode ser armazenado em JSONB
- `saleSettings`, `seasonalPricing`, `advancedPricing`, etc. - Podem ser JSONB

**Decisão Necessária:** Armazenar esses campos como JSONB ou criar tabelas separadas?

### Locations (Ainda no KV Store)

- `locations` ainda usa KV Store
- Propriedades referenciam `location_id` que pode não existir no SQL
- **Decisão Necessária:** Migrar `locations` para SQL também?

---

## 📊 ESTATÍSTICAS

**Progresso Geral:**
- ✅ **25%** Completo
- ⏳ **75%** Pendente

**Por Módulo:**
- ✅ `evolution_instances`: **100%** Completo
- ✅ `properties`: **60%** Completo (3/5 funções)
- ⏳ `reservations`: **0%** Completo
- ⏳ `guests`: **0%** Completo
- ⏳ `blocks`: **0%** Completo

---

**Status:** 🔄 Migração em progresso. Próximo passo: Completar migração de `properties` e iniciar `reservations`.

