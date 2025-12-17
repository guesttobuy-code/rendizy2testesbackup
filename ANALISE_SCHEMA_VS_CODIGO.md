# 🔍 ANÁLISE: SCHEMA vs CÓDIGO

**Data:** 17/11/2025  
**Versão:** 1.0.103.400  
**Status:** 🔄 Em Análise

---

## 📋 OBJETIVO

Comparar o schema atualizado do banco de dados com o código fonte para identificar e corrigir discrepâncias.

---

## 🚨 DISCREPÂNCIAS ENCONTRADAS

### 1. ⚠️ `evolution_instances` - Campo `user_id` REMOVIDO

**Schema Novo:**
```sql
CREATE TABLE public.evolution_instances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  instance_name text NOT NULL,
  instance_api_key text NOT NULL,
  global_api_key text,
  base_url text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  instance_token text,
  -- ❌ NÃO TEM user_id
);
```

**Código Atual:**
```typescript
// evolution-credentials.ts
.from('evolution_instances')
.select('id, user_id, instance_name, ...')  // ❌ Usa user_id
.eq('user_id', userId)                       // ❌ Filtra por user_id

// routes-chat.ts
.eq('user_id', parseInt(userId))             // ❌ Filtra por user_id
user_id: parseInt(user_id)                   // ❌ Insere user_id
```

**Impacto:** 🔴 **CRÍTICO**
- Código não funcionará com schema novo
- Todas as queries que usam `user_id` falharão

**Solução:**
1. ✅ Opção A: Remover todas as referências a `user_id` do código
2. ✅ Opção B: Adicionar `organization_id` ao invés de `user_id`
3. ⚠️ Opção C: Manter `user_id` se for necessário para compatibilidade

---

### 2. ⚠️ `organization_channel_config` - `organization_id` Tipo

**Schema Novo:**
```sql
CREATE TABLE public.organization_channel_config (
  organization_id text NOT NULL UNIQUE,  -- ❌ TEXT no schema fornecido
  -- Mas deveria ser UUID conforme outras tabelas
);
```

**Schema Padrão (outras tabelas):**
```sql
CREATE TABLE public.properties (
  organization_id uuid NOT NULL,  -- ✅ UUID
);
```

**Código Atual:**
```typescript
// routes-organizations.ts
.from("organization_channel_config")
.eq("organization_id", orgId)  // orgId pode ser string ou UUID
```

**Impacto:** 🟡 **MÉDIO**
- Funciona, mas inconsistente com outras tabelas
- Pode causar problemas de performance

**Solução:**
1. ✅ Verificar se `organization_id` deve ser UUID ou TEXT
2. ✅ Se UUID, converter strings para UUID no código
3. ✅ Se TEXT, manter como está mas documentar

---

### 3. ⚠️ `properties`, `reservations`, `guests`, `blocks` - KV Store vs SQL

**Schema Novo:**
```sql
-- Todas essas tabelas EXISTEM no schema novo:
CREATE TABLE public.properties (
  id uuid NOT NULL,
  organization_id uuid NOT NULL,  -- ✅ Tem organization_id
  ...
);

CREATE TABLE public.reservations (
  id uuid NOT NULL,
  organization_id uuid NOT NULL,  -- ✅ Tem organization_id
  property_id uuid NOT NULL,
  guest_id uuid NOT NULL,
  ...
);

CREATE TABLE public.guests (
  id uuid NOT NULL,
  organization_id uuid NOT NULL,  -- ✅ Tem organization_id
  ...
);

CREATE TABLE public.blocks (
  id uuid NOT NULL,
  organization_id uuid NOT NULL,  -- ✅ Tem organization_id
  property_id uuid NOT NULL,
  ...
);
```

**Código Atual:**
```typescript
// routes-properties.ts, routes-reservations.ts, etc.
// ❌ TUDO usa KV Store:
await kv.get<Property>(`property:${id}`);
await kv.set(`property:${id}`, property);
await kv.getByPrefix<Reservation>('reservation:');
```

**Impacto:** 🔴 **CRÍTICO**
- Código não usa as tabelas SQL do schema
- Dados não estão sendo salvos nas tabelas corretas
- Isolamento multi-tenant não funciona nas tabelas SQL

**Solução:**
1. ⚠️ **DECISÃO NECESSÁRIA:** Continuar com KV Store ou migrar para SQL?
2. ✅ Se migrar: Criar funções para salvar nas tabelas SQL
3. ✅ Se manter KV: Documentar que não usa as tabelas SQL

---

### 4. ⚠️ `listings` - Tabela Separada de `properties`

**Schema Novo:**
```sql
CREATE TABLE public.listings (
  id uuid NOT NULL,
  organization_id uuid NOT NULL,
  accommodation_id uuid NOT NULL,  -- ✅ FK para properties.id
  owner_id uuid NOT NULL,
  title_pt text,
  description_pt text,
  platforms_airbnb_enabled boolean,
  ...
  -- MUITOS campos de plataformas
);
```

**Código Atual:**
```typescript
// ❌ Não encontrei uso da tabela listings
// Tudo parece estar misturado com properties no KV Store
```

**Impacto:** 🟡 **MÉDIO**
- Tabela `listings` existe mas não é usada
- Dados de anúncios podem estar misturados com `properties`

**Solução:**
1. ✅ Verificar se código precisa usar `listings`
2. ✅ Separar dados de `properties` (acomodação) de `listings` (anúncios)

---

### 5. ⚠️ `chat_channels_config` vs `organization_channel_config`

**Schema Novo:**
```sql
-- Existe DUAS tabelas:
CREATE TABLE public.chat_channels_config (...);      -- ❓ Não vi no schema
CREATE TABLE public.organization_channel_config (...); -- ✅ Existe no schema
```

**Código Atual:**
```typescript
// routes-chat.ts
.from('organization_channel_config')  // ✅ Usa esta

// routes-organizations.ts
.from("organization_channel_config")  // ✅ Usa esta
```

**Impacto:** 🟢 **BAIXO**
- Código usa `organization_channel_config` (correto)
- Mas pode haver confusão com `chat_channels_config`

**Solução:**
1. ✅ Confirmar qual tabela usar
2. ✅ Remover referências a tabela incorreta se houver

---

## 📊 RESUMO DAS DISCREPÂNCIAS

| # | Tabela/Campo | Schema | Código | Impacto | Status |
|---|--------------|--------|--------|---------|--------|
| 1 | `evolution_instances.user_id` | ❌ Não existe | ✅ Usa | 🔴 CRÍTICO | ⚠️ Precisa correção |
| 2 | `organization_channel_config.organization_id` | TEXT | String | 🟡 MÉDIO | ⚠️ Verificar tipo |
| 3 | `properties` (salvamento) | SQL Table | KV Store | 🔴 CRÍTICO | ⚠️ Decisão necessária |
| 4 | `reservations` (salvamento) | SQL Table | KV Store | 🔴 CRÍTICO | ⚠️ Decisão necessária |
| 5 | `guests` (salvamento) | SQL Table | KV Store | 🔴 CRÍTICO | ⚠️ Decisão necessária |
| 6 | `blocks` (salvamento) | SQL Table | KV Store | 🔴 CRÍTICO | ⚠️ Decisão necessária |
| 7 | `listings` | SQL Table | Não usado | 🟡 MÉDIO | ⚠️ Verificar uso |

---

## 🎯 PRIORIDADES DE CORREÇÃO

### 🔴 Prioridade Alta (Bloqueia funcionamento)

1. **`evolution_instances.user_id`**
   - Remover todas as referências a `user_id`
   - Ajustar queries para não usar `user_id`
   - Decidir como identificar instâncias (por `organization_id`?)

### 🟡 Prioridade Média (Pode causar problemas)

2. **KV Store vs SQL Tables**
   - Decidir: Continuar KV ou migrar para SQL?
   - Se SQL: Implementar salvamento nas tabelas corretas
   - Se KV: Documentar que não usa tabelas SQL

3. **`organization_channel_config.organization_id`**
   - Verificar tipo correto (UUID ou TEXT)
   - Converter strings para UUID se necessário

### 🟢 Prioridade Baixa (Melhoria futura)

4. **Tabela `listings`**
   - Separar dados de `properties` (acomodação) de `listings` (anúncios)
   - Implementar uso da tabela `listings` se necessário

---

## ✅ PRÓXIMOS PASSOS

1. [ ] **Confirmar decisão sobre `evolution_instances`:**
   - Como identificar instâncias sem `user_id`?
   - Usar `organization_id`? Ou remover completamente?

2. [ ] **Decidir arquitetura de dados:**
   - Continuar com KV Store para properties/reservations/guests/blocks?
   - Ou migrar para tabelas SQL?

3. [ ] **Corrigir código conforme decisões:**
   - Ajustar `evolution_instances` (remover `user_id`)
   - Implementar salvamento nas tabelas SQL (se decidir migrar)
   - Ajustar tipos de `organization_id`

4. [ ] **Testar correções:**
   - Verificar queries funcionam com schema novo
   - Testar isolamento multi-tenant
   - Validar integridade de dados

---

**Status:** ⏳ Aguardando decisões sobre arquitetura de dados

