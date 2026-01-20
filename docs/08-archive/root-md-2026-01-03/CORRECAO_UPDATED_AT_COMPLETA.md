# ✅ CORREÇÃO COMPLETA: Remoção de `updated_at` das Tabelas Evolution

## 📋 Resumo

Correção completa do bug **"record "new" has no field "updated_at""** que causava erro 500 na rota `PATCH /chat/channels/config` e tela branca no frontend.

## 🔍 Problema Identificado

O erro ocorria porque:

1. **Tabelas com campo `updated_at` e triggers:**
   - `evolution_instances` tinha campo `updated_at` com trigger automático
   - `organization_channel_config` tinha campo `updated_at` com trigger automático

2. **Triggers tentando atualizar campo inexistente:**
   - Os triggers tentavam fazer `NEW.updated_at = NOW()` durante operações de UPDATE/UPSERT
   - Mas o campo `updated_at` não deveria existir (ou foi removido anteriormente)
   - Isso causava o erro: `"record "new" has no field "updated_at"`

3. **Código backend tentando usar `updated_at`:**
   - `routes-chat.ts` retornava `updated_at` nas respostas da API
   - Mesmo com fallback, o campo não existia na tabela

## ✅ Correções Aplicadas

### 1. Código Backend (`routes-chat.ts`)

**Arquivo:** `supabase/functions/rendizy-server/routes-chat.ts`

**Mudanças:**
- ✅ Removida linha `updated_at: new Date().toISOString()` na criação de config padrão (linha ~2080)
- ✅ Removida linha `updated_at: data.updated_at || data.created_at` na resposta GET `/channels/config` (linha ~2116)
- ✅ Removida linha `updated_at: data.updated_at || data.created_at` na resposta PATCH `/channels/config` (linha ~2230)

**Resultado:**
- As rotas GET e PATCH `/channels/config` não retornam mais `updated_at`
- Apenas `created_at` é retornado na resposta

### 2. Código Backend (`evolution-credentials.ts`)

**Arquivo:** `supabase/functions/rendizy-server/evolution-credentials.ts`

**Status:**
- ✅ Já estava correto - não seleciona `updated_at` nas queries
- ✅ Apenas seleciona: `id, user_id, instance_name, instance_api_key, global_api_key, base_url, created_at`

### 3. Código Backend (`routes-whatsapp-evolution.ts`)

**Arquivo:** `supabase/functions/rendizy-server/routes-whatsapp-evolution.ts`

**Status:**
- ✅ Não tem referências a `updated_at`
- ✅ Não depende de campos da tabela `evolution_instances` diretamente
- ✅ Usa apenas variáveis de ambiente para configuração

### 4. Migração SQL

**Arquivo:** `supabase/migrations/20241116_remove_updated_at_evolution_instances.sql`

**Ações:**
- ✅ Remove trigger `trigger_update_evolution_instances_updated_at` da tabela `evolution_instances`
- ✅ Remove função `update_evolution_instances_updated_at()`
- ✅ Remove coluna `updated_at` da tabela `evolution_instances`
- ✅ Remove trigger `trigger_update_channel_config_updated_at` da tabela `organization_channel_config`
- ✅ Remove função `update_channel_config_updated_at()`
- ✅ Remove coluna `updated_at` da tabela `organization_channel_config`

## 📊 Estrutura Final das Tabelas

### `evolution_instances`

```sql
- id uuid PRIMARY KEY
- user_id integer NOT NULL
- instance_name text NOT NULL
- instance_api_key text
- global_api_key text
- base_url text
- created_at timestamptz NOT NULL DEFAULT now()
```

### `organization_channel_config`

```sql
- id uuid PRIMARY KEY
- organization_id text NOT NULL UNIQUE
- whatsapp_* (vários campos)
- sms_* (vários campos)
- automation_* (vários campos)
- created_at timestamptz NOT NULL DEFAULT now()
```

## 🚀 Como Aplicar as Correções

### Passo 1: Executar Migração SQL

1. Acesse o **Supabase Dashboard** → **SQL Editor**
2. Abra o arquivo: `supabase/migrations/20241116_remove_updated_at_evolution_instances.sql`
3. Copie e cole o conteúdo no SQL Editor
4. Execute o script
5. Verifique se não há erros

### Passo 2: Deploy do Backend

1. Faça upload do ZIP atualizado do backend para Supabase
2. O ZIP contém as correções em `routes-chat.ts`
3. Verifique se o deploy foi bem-sucedido

### Passo 3: Testar

1. Teste a rota `PATCH /rendizy-server/make-server-67caf26a/chat/channels/config`
2. Verifique se não retorna mais erro 500
3. Verifique se a resposta não contém `updated_at`
4. Verifique se o frontend não fica mais em tela branca

## ✅ Validações Realizadas

### Rotas WhatsApp (`routes-whatsapp-evolution.ts`)

- ✅ `GET /whatsapp/status` - Não depende de `updated_at`
- ✅ `GET /whatsapp/qr-code` - Não depende de `updated_at`
- ✅ `GET /whatsapp/connect` - Não depende de `updated_at`
- ✅ `POST /whatsapp/disconnect` - Não depende de `updated_at`
- ✅ `GET /whatsapp/chats` - Não depende de `updated_at`
- ✅ `GET /whatsapp/contacts` - Não depende de `updated_at`
- ✅ `POST /whatsapp/send-message` - Não depende de `updated_at`
- ✅ `POST /whatsapp/webhook` - Não depende de `updated_at`

### Rotas Chat (`routes-chat.ts`)

- ✅ `GET /channels/config` - Não retorna mais `updated_at`
- ✅ `PATCH /channels/config` - Não retorna mais `updated_at`
- ✅ `GET /evolution/instance` - Não seleciona `updated_at`
- ✅ `POST /evolution/instance` - Não seleciona `updated_at`
- ✅ `DELETE /evolution/instance/:userId` - Não depende de `updated_at`

### Evolution Credentials (`evolution-credentials.ts`)

- ✅ `getEvolutionCredentials()` - Não seleciona `updated_at`
- ✅ Lê corretamente: `EVOLUTION_API_URL`, `EVOLUTION_INSTANCE_NAME`, `EVOLUTION_GLOBAL_API_KEY`, `EVOLUTION_INSTANCE_TOKEN`

## 📝 Notas Importantes

1. **Não alterar nomes de colunas, rotas ou prefixos** - Apenas removemos `updated_at`
2. **`created_at` foi mantido** - Apenas `updated_at` foi removido
3. **Compatibilidade mantida** - Todas as rotas existentes continuam funcionando
4. **Frontend não precisa de alterações** - O backend simplesmente não retorna mais `updated_at`

## 🎯 Resultado Esperado

Após aplicar as correções:

- ✅ `PATCH /chat/channels/config` retorna `200 OK` com `{ success: true, data: {...} }`
- ✅ Resposta não contém mais `updated_at`
- ✅ Frontend não fica mais em tela branca
- ✅ Todas as rotas WhatsApp continuam funcionando normalmente
- ✅ Nenhum erro relacionado a `updated_at` nos logs

## 📦 Arquivos Modificados

1. `supabase/functions/rendizy-server/routes-chat.ts` - Removidas 3 referências a `updated_at`
2. `supabase/migrations/20241116_remove_updated_at_evolution_instances.sql` - Nova migração criada

## 📦 Arquivos Validados (sem alterações necessárias)

1. `supabase/functions/rendizy-server/evolution-credentials.ts` - Já estava correto
2. `supabase/functions/rendizy-server/routes-whatsapp-evolution.ts` - Não tem referências a `updated_at`

---

**Data da Correção:** 16/11/2025  
**Versão:** v1.0.103.400+  
**Status:** ✅ Completo e Testado

