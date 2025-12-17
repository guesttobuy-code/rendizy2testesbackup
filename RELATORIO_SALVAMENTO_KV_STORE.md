# 🔍 RELATÓRIO: Salvamentos no KV Store (Modo Antigo)

**Data:** 2025-11-19  
**Objetivo:** Identificar todos os lugares que ainda salvam configurações importantes no KV Store ao invés do Supabase Database

---

## 📋 SUMÁRIO EXECUTIVO

Foram encontrados **3 categorias principais** de problemas:

1. **🔴 CRÍTICO:** Rotas WhatsApp ainda usam KV Store para config (6 ocorrências)
2. **🔴 CRÍTICO:** Organizations salvam no KV Store, mas existe tabela no banco (2 ocorrências)
3. **🟡 MÉDIO:** StaysNet salva duplamente (banco + KV) - redundância desnecessária (1 ocorrência)

---

## 🔴 PROBLEMA 1: WhatsApp Config ainda usando KV Store

### Arquivo: `supabase/functions/rendizy-server/routes-chat.ts`

**Status:** ⚠️ **CRÍTICO** - Rotas WhatsApp não conseguem ler configurações salvas pelo PATCH corrigido

### Ocorrências Encontradas:

#### 1. Linha **989**: `GET /chat/channels/config` (rota antiga/duplicada)
```typescript
const key = `chat:channels:config:${orgId}`;
let config = await kv.get<OrganizationChannelConfig>(key);
```
**Problema:** Esta rota ainda usa KV Store, mas existe uma nova rota GET na linha 2000 que usa banco. Esta deve ser removida ou migrada.

#### 2. Linha **1616**: `POST /chat/channels/whatsapp/connect`
```typescript
const key = `chat:channels:config:${organization_id}`;
let config = await kv.get<OrganizationChannelConfig>(key);
// ...
await kv.set(key, config);
```
**Problema:** Busca e salva QR Code no KV Store, mas deveria usar `organization_channel_config`.

#### 3. Linha **1681**: `POST /chat/channels/whatsapp/status`
```typescript
const key = `chat:channels:config:${organization_id}`;
const config = await kv.get<OrganizationChannelConfig>(key);
```
**Problema:** Busca status do WhatsApp do KV Store ao invés do banco.

#### 4. Linha **1756**: `POST /chat/channels/whatsapp/disconnect`
```typescript
const key = `chat:channels:config:${organization_id}`;
const config = await kv.get<OrganizationChannelConfig>(key);
// ...
await kv.set(key, config);
```
**Problema:** Busca e salva status de desconexão no KV Store.

#### 5. Linha **1810**: `POST /chat/channels/whatsapp/send`
```typescript
const configKey = `chat:channels:config:${organization_id}`;
const config = await kv.get<OrganizationChannelConfig>(configKey);
```
**Problema:** Busca configuração para enviar mensagem do KV Store.

#### 6. Linha **1972**: `POST /chat/channels/whatsapp/webhook`
```typescript
const prefix = 'chat:channels:config:';
const allConfigs = await kv.getByPrefix<OrganizationChannelConfig>(prefix);
```
**Problema:** Busca todas as configs por prefixo no KV Store para encontrar org por instance_name.

### Impacto:

- ✅ **Corrigido:** `PATCH /chat/channels/config` agora salva no banco
- ❌ **Problema:** Rotas WhatsApp não conseguem ler essas configurações porque ainda buscam no KV Store
- ❌ **Resultado:** Usuário salva credenciais, mas WhatsApp não funciona porque rotas não encontram a config

### Solução Necessária:

Migrar todas as rotas acima para usar `organization_channel_config` do banco, igual ao GET/PATCH que já foram corrigidos.

---

## 🔴 PROBLEMA 2: Organizations salvando no KV Store

### Arquivo: `supabase/functions/rendizy-server/routes-organizations.ts`

**Status:** ⚠️ **CRÍTICO** - Existe tabela `organizations` no banco, mas código ainda usa KV Store

### Tabela Existente no Banco:

```sql
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  phone TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  billing JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb
);
```

### Ocorrências Encontradas:

#### 1. Linha **267**: `POST /organizations` (criar organização)
```typescript
// Salvar no KV store
await kv.set(`org:${id}`, organization);
```
**Problema:** Cria organização no KV Store, mas deveria salvar na tabela `organizations`.

#### 2. Linha **310**: `PATCH /organizations/:id` (atualizar organização)
```typescript
await kv.set(`org:${id}`, updated);
```
**Problema:** Atualiza organização no KV Store ao invés do banco.

### Impacto:

- ❌ Organizações não são persistidas no banco de dados
- ❌ Não é possível fazer queries SQL em organizações
- ❌ Foreign keys para `organizations` não funcionam
- ❌ Dados podem ser perdidos se KV Store for limpo

### Solução Necessária:

Migrar `POST` e `PATCH /organizations` para usar a tabela `organizations` do Supabase Database.

---

## 🟡 PROBLEMA 3: StaysNet salvando duplamente

### Arquivo: `supabase/functions/rendizy-server/routes-staysnet.ts`

**Status:** 🟡 **MÉDIO** - Já migrado para banco, mas ainda salva no KV como fallback redundante

### Ocorrência Encontrada:

#### Linha **557**: `POST /settings/staysnet` (salvar config)
```typescript
// ✅ SALVAR NO BANCO DE DADOS (tabela dedicada)
const dbResult = await staysnetDB.saveStaysNetConfigDB(config, organizationId);

if (!dbResult.success) {
  // Fallback para KV Store se falhar
  await kv.set('settings:staysnet', config);
} else {
  console.log('[StaysNet] ✅ Configuração salva no banco de dados');
}

// Também salvar no KV Store para compatibilidade (até migração completa)
await kv.set('settings:staysnet', config);
```

**Problema:** Salva no banco E no KV Store. O fallback é OK, mas a linha 557 salva sempre, mesmo quando banco funciona.

### Impacto:

- 🟡 Redundância desnecessária
- 🟡 Pode causar confusão (qual é a fonte de verdade?)
- 🟡 Desperdiça recursos

### Solução Necessária:

Remover a linha 557 que salva sempre no KV. Manter apenas o fallback se banco falhar.

---

## 📊 RESUMO POR PRIORIDADE

| Prioridade | Arquivo | Linhas | Problema | Impacto |
|-----------|---------|--------|----------|---------|
| 🔴 **CRÍTICO** | `routes-chat.ts` | 989, 1616, 1681, 1756, 1810, 1972 | WhatsApp usa KV Store | Configurações não funcionam |
| 🔴 **CRÍTICO** | `routes-organizations.ts` | 267, 310 | Organizations no KV | Dados não persistem corretamente |
| 🟡 **MÉDIO** | `routes-staysnet.ts` | 557 | Salvamento duplo | Redundância desnecessária |

---

## ✅ AÇÕES RECOMENDADAS

### Prioridade 1: Corrigir WhatsApp Config (URGENTE)

1. Migrar `POST /chat/channels/whatsapp/connect` (linha 1616)
   - Buscar config do banco `organization_channel_config`
   - Salvar QR Code no banco

2. Migrar `POST /chat/channels/whatsapp/status` (linha 1681)
   - Buscar config do banco
   - Atualizar status no banco

3. Migrar `POST /chat/channels/whatsapp/disconnect` (linha 1756)
   - Buscar config do banco
   - Salvar desconexão no banco

4. Migrar `POST /chat/channels/whatsapp/send` (linha 1810)
   - Buscar config do banco para enviar mensagem

5. Migrar `POST /chat/channels/whatsapp/webhook` (linha 1972)
   - Buscar config por `instance_name` usando query SQL ao invés de `getByPrefix`

6. Remover ou migrar `GET /chat/channels/config` duplicado (linha 989)

### Prioridade 2: Corrigir Organizations

1. Migrar `POST /organizations` (linha 267)
   - Salvar na tabela `organizations` do banco

2. Migrar `PATCH /organizations/:id` (linha 310)
   - Atualizar na tabela `organizations` do banco

3. Migrar `GET /organizations` para ler do banco também

### Prioridade 3: Limpar StaysNet

1. Remover salvamento duplo (linha 557)
   - Manter apenas fallback para KV se banco falhar

---

## 🔧 PADRÃO DE CORREÇÃO

Todas as correções devem seguir o padrão já implementado em:

- ✅ `GET /chat/channels/config` (linha 2000) - usa banco
- ✅ `PATCH /chat/channels/config` (linha 1037) - usa banco

### Exemplo de Correção:

**ANTES (KV Store):**
```typescript
const key = `chat:channels:config:${organization_id}`;
const config = await kv.get<OrganizationChannelConfig>(key);
await kv.set(key, config);
```

**DEPOIS (Supabase Database):**
```typescript
const client = getSupabaseClient();
const organizationId = await getOrganizationIdOrThrow(c);

// Buscar do banco
const { data, error } = await client
  .from('organization_channel_config')
  .select('...')
  .eq('organization_id', organizationId)
  .maybeSingle();

// Salvar no banco
const { data: savedData, error: saveError } = await safeUpsert(
  client,
  'organization_channel_config',
  dbData,
  { onConflict: 'organization_id' },
  '...'
);
```

---

## 📝 NOTAS ADICIONAIS

- **Chat Conversations/Messages:** Esses ainda usam KV Store, mas podem ser aceitáveis por enquanto (cache temporário). Se causar problemas, devem ser migrados para tabelas dedicadas.

- **Outros arquivos:** `routes-*.ts` usam KV Store para dados transitórios ou cache, o que é aceitável. O problema é apenas com **configurações persistentes**.

---

**Próximo Passo:** Implementar correções na ordem de prioridade acima.

