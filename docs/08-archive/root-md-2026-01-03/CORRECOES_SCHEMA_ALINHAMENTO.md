# 🔧 CORREÇÕES: ALINHAMENTO SCHEMA vs CÓDIGO

**Data:** 17/11/2025  
**Versão:** 1.0.103.400  
**Status:** ⏳ Aguardando Decisões

---

## 🎯 OBJETIVO

Corrigir o código fonte para alinhar com o schema atualizado do banco de dados fornecido.

---

## ⚠️ DISCREPÂNCIAS IDENTIFICADAS

### 1. 🔴 **CRÍTICO: `evolution_instances` - Campo `user_id` REMOVIDO**

**Schema Novo (Fornecido):**
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
  -- ❌ NÃO TEM organization_id
  CONSTRAINT evolution_instances_pkey PRIMARY KEY (id)
);
```

**Código Atual (INCORRETO):**
```typescript
// evolution-credentials.ts
.from('evolution_instances')
.select('id, user_id, instance_name, ...')  // ❌ Usa user_id
.eq('user_id', userId)                       // ❌ Filtra por user_id

// routes-chat.ts
.eq('user_id', parseInt(userId))             // ❌ Filtra por user_id
user_id: parseInt(user_id)                   // ❌ Insere user_id
onConflict: 'user_id'                        // ❌ Conflict em user_id
```

**🚨 PROBLEMA:**
- Código tenta usar campo `user_id` que não existe no schema novo
- Queries falharão com erro: `column "user_id" does not exist`
- Funcionalidade de Evolution API não funcionará

**✅ SOLUÇÃO PROPOSTA:**

**Opção A: Instâncias Globais (Simples)**
- Remover todas as referências a `user_id`
- Buscar primeira instância disponível ou por `instance_name`
- Usar instância compartilhada por todas as organizações

**Opção B: Instâncias por Nome (Recomendado)**
- Usar `instance_name` como identificador único
- Cada organização pode ter instância com nome específico
- Buscar por `instance_name` ao invés de `user_id`

**Opção C: Instâncias com `organization_id` (Multi-tenant Completo)**
- Adicionar campo `organization_id uuid` ao schema (migração)
- Filtrar instâncias por `organization_id`
- Manter isolamento multi-tenant

**🎯 RECOMENDAÇÃO: Opção B (Instâncias por Nome)**

---

### 2. 🟡 **MÉDIO: `organization_channel_config` - Tipo `organization_id`**

**Schema Novo:**
```sql
CREATE TABLE public.organization_channel_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id text NOT NULL UNIQUE,  -- ⚠️ TEXT (não UUID)
  ...
);
```

**Outras Tabelas:**
```sql
CREATE TABLE public.properties (
  organization_id uuid NOT NULL,  -- ✅ UUID
  ...
);
```

**Código Atual:**
```typescript
// routes-organizations.ts
.from("organization_channel_config")
.eq("organization_id", orgId)  // orgId pode ser string ou UUID
```

**🚨 PROBLEMA:**
- Inconsistência: algumas tabelas usam `UUID`, outras usam `TEXT`
- Pode causar problemas de performance (TEXT é mais lento para índices)
- Pode causar confusão no código

**✅ SOLUÇÃO PROPOSTA:**

**Opção A: Converter para UUID (Recomendado)**
- Migração: `ALTER TABLE organization_channel_config ALTER COLUMN organization_id TYPE uuid USING organization_id::uuid;`
- Converter strings para UUID no código antes de salvar
- Garantir consistência com outras tabelas

**Opção B: Manter TEXT (Compatibilidade)**
- Manter como está (funciona)
- Documentar que `organization_id` é TEXT nesta tabela
- Converter UUID para string quando necessário

**🎯 RECOMENDAÇÃO: Opção A (Converter para UUID)**

---

### 3. 🔴 **CRÍTICO: KV Store vs SQL Tables**

**Schema Novo (Fornecido):**
```sql
-- ✅ Todas essas tabelas EXISTEM no schema:
CREATE TABLE public.properties (...);
CREATE TABLE public.reservations (...);
CREATE TABLE public.guests (...);
CREATE TABLE public.blocks (...);
```

**Código Atual:**
```typescript
// ❌ TUDO usa KV Store:
await kv.get<Property>(`property:${id}`);
await kv.set(`property:${id}`, property);
await kv.getByPrefix<Reservation>('reservation:');
```

**🚨 PROBLEMA:**
- Schema tem tabelas SQL criadas
- Código não usa essas tabelas (usa KV Store)
- Dados não estão sendo salvos nas tabelas corretas
- Isolamento multi-tenant não funciona nas tabelas SQL

**✅ SOLUÇÃO PROPOSTA:**

**Opção A: Migrar para SQL Tables (Recomendado para Produção)**
- Implementar salvamento nas tabelas SQL
- Remover dependência de KV Store para essas entidades
- Usar queries SQL com filtros por `organization_id`
- Garantir isolamento multi-tenant automático

**Opção B: Continuar com KV Store (Temporário)**
- Manter uso do KV Store
- Documentar que tabelas SQL não são usadas
- Migrar gradualmente no futuro

**🎯 DECISÃO NECESSÁRIA:** Qual arquitetura usar?

---

### 4. 🟡 **MÉDIO: Tabela `listings` Não Utilizada**

**Schema Novo:**
```sql
CREATE TABLE public.listings (
  id uuid NOT NULL,
  organization_id uuid NOT NULL,
  accommodation_id uuid NOT NULL,  -- FK para properties.id
  ...
);
```

**Código Atual:**
```typescript
// ❌ Não encontrei uso da tabela listings
// Dados de anúncios podem estar misturados com properties
```

**🚨 PROBLEMA:**
- Tabela `listings` existe mas não é usada
- Dados de anúncios (Airbnb, Booking, etc.) podem estar em `properties`
- Separação entre "acomodação" (property) e "anúncio" (listing) não está clara

**✅ SOLUÇÃO PROPOSTA:**
- Verificar se código precisa usar `listings`
- Separar dados de `properties` (acomodação física) de `listings` (anúncios em plataformas)
- Implementar uso da tabela `listings` se necessário

**🎯 AÇÃO:** Verificar necessidade de usar `listings`

---

## 📋 PLANO DE CORREÇÃO

### 🔴 Prioridade Alta (Bloqueia Funcionamento)

#### Correção 1: `evolution_instances` - Remover `user_id`

**Arquivos a Modificar:**
1. `supabase/functions/rendizy-server/evolution-credentials.ts`
2. `supabase/functions/rendizy-server/routes-chat.ts`

**Alterações Propostas:**

```typescript
// ANTES (INCORRETO):
.from('evolution_instances')
.select('id, user_id, instance_name, ...')
.eq('user_id', userId)

// DEPOIS (CORRETO - Opção B: Por Nome):
.from('evolution_instances')
.select('id, instance_name, instance_api_key, global_api_key, base_url, instance_token, created_at')
.eq('instance_name', instanceName)  // Buscar por nome

// Ou usar primeira instância disponível:
.from('evolution_instances')
.select('id, instance_name, ...')
.limit(1)
.single()
```

**Rotas a Ajustar:**

1. **GET /evolution/instance**
   ```typescript
   // ANTES: GET /evolution/instance?user_id=123
   // DEPOIS: GET /evolution/instance?instance_name=TESTE
   // Ou: GET /evolution/instance (retorna primeira)
   ```

2. **POST /evolution/instance**
   ```typescript
   // ANTES: body: { user_id, instance_name, ... }
   // DEPOIS: body: { instance_name, instance_api_key, ... }
   // Remover user_id, usar instance_name como identificador único
   ```

3. **DELETE /evolution/instance/:id**
   ```typescript
   // ANTES: DELETE /evolution/instance/:userId
   // DEPOIS: DELETE /evolution/instance/:id (usar ID UUID)
   // Ou: DELETE /evolution/instance?instance_name=TESTE
   ```

---

#### Correção 2: `organization_channel_config` - Tipo `organization_id`

**Arquivos a Modificar:**
1. `supabase/functions/rendizy-server/routes-organizations.ts`
2. `supabase/functions/rendizy-server/routes-chat.ts`

**Alterações Propostas:**

```typescript
// Verificar se organization_id é UUID ou TEXT
// Se UUID, converter strings para UUID:
import { v4 as uuidv4 } from 'https://deno.land/std@0.208.0/uuid/mod.ts';

function ensureUuid(orgId: string): string {
  // Se já é UUID válido, retornar
  if (orgId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return orgId;
  }
  // Se não, pode ser necessário buscar UUID correspondente
  // ou manter como TEXT se schema usar TEXT
  return orgId;
}
```

**Decisão Necessária:** UUID ou TEXT?

---

### 🟡 Prioridade Média (Pode Causar Problemas)

#### Correção 3: KV Store vs SQL Tables

**Decisão Necessária:** 
1. ✅ Continuar com KV Store? (mais rápido de implementar)
2. ✅ Migrar para SQL Tables? (mais robusto, alinhado com schema)

**Se Decidir Migrar para SQL:**

**Arquivos a Modificar:**
1. `supabase/functions/rendizy-server/routes-properties.ts`
2. `supabase/functions/rendizy-server/routes-reservations.ts`
3. `supabase/functions/rendizy-server/routes-guests.ts`
4. `supabase/functions/rendizy-server/routes-blocks.ts`

**Alterações Propostas:**

```typescript
// ANTES (KV Store):
await kv.get<Property>(`property:${id}`);
await kv.set(`property:${id}`, property);

// DEPOIS (SQL Tables):
const client = getSupabaseClient();
const { data } = await client
  .from('properties')
  .select('*')
  .eq('id', id)
  .eq('organization_id', organizationId)  // Filtro multi-tenant
  .single();
```

---

## ✅ CHECKLIST DE CORREÇÃO

### Correção 1: `evolution_instances`
- [ ] Remover todas as referências a `user_id` em `evolution-credentials.ts`
- [ ] Ajustar `GET /evolution/instance` para buscar por `instance_name` ou retornar primeira
- [ ] Ajustar `POST /evolution/instance` para não usar `user_id`
- [ ] Ajustar `DELETE /evolution/instance/:id` para usar ID UUID ao invés de userId
- [ ] Remover `onConflict: 'user_id'` e usar outro campo (ou remover)
- [ ] Testar queries funcionam sem `user_id`

### Correção 2: `organization_channel_config`
- [ ] Verificar tipo correto de `organization_id` (UUID ou TEXT)
- [ ] Implementar conversão se necessário
- [ ] Testar salvamento e busca funcionam

### Correção 3: KV Store vs SQL (Se Decidir Migrar)
- [ ] Implementar salvamento em `properties` (SQL)
- [ ] Implementar salvamento em `reservations` (SQL)
- [ ] Implementar salvamento em `guests` (SQL)
- [ ] Implementar salvamento em `blocks` (SQL)
- [ ] Remover uso de KV Store para essas entidades
- [ ] Testar isolamento multi-tenant funciona

---

## 🎯 PRÓXIMOS PASSOS

1. **Decidir sobre `evolution_instances`:**
   - ✅ Opção A (Global), B (Por Nome), ou C (Com organization_id)?

2. **Decidir sobre `organization_channel_config`:**
   - ✅ Manter TEXT ou converter para UUID?

3. **Decidir sobre arquitetura de dados:**
   - ✅ Continuar KV Store ou migrar para SQL Tables?

4. **Implementar correções conforme decisões**

---

**Status:** ⏳ Aguardando decisões sobre arquitetura antes de implementar correções

