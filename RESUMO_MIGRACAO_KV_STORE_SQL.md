# 📋 RESUMO: Migração KV Store → SQL

**Versão:** v1.0.103.970  
**Data:** 20/11/2025  
**Status:** ✅ **Em Andamento**

---

## ✅ O QUE FOI FEITO

### 1. **Regra Documentada**
- ✅ Criado `REGRA_KV_STORE_VS_SQL.md` com padrões claros
- ✅ Definido: KV Store APENAS para cache temporário
- ✅ Definido: SQL para TUDO que precisa persistir

### 2. **Validação no Código**
- ✅ Adicionado validação em `kv_store.tsx`
- ✅ Bloqueia uso de KV Store para dados críticos
- ✅ Permite apenas prefixos: `cache:`, `process:`, `temp:`, `lock:`, `queue:`

### 3. **Migration SQL Criada**
- ✅ Criado `supabase/migrations/20241120_create_whatsapp_chat_tables.sql`
- ✅ Tabelas: `conversations` e `messages`
- ⚠️ **PRECISA SER APLICADA NO SUPABASE DASHBOARD**

### 4. **Código Migrado**
- ✅ Webhook WhatsApp: Salva em SQL
- ✅ GET `/conversations`: Lê de SQL
- ✅ GET `/conversations/:id/messages`: Lê de SQL

---

## ⚠️ AÇÃO NECESSÁRIA

### **APLICAR MIGRATION SQL**

1. Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc
2. Navegue para: **SQL Editor**
3. Abra: `supabase/migrations/20241120_create_whatsapp_chat_tables.sql`
4. Copie TODO o conteúdo
5. Cole no SQL Editor
6. Clique em **RUN** (`Ctrl+Enter`)
7. Verifique se as tabelas foram criadas: **Database → Tables**

---

## 📋 O QUE AINDA PRECISA SER MIGRADO

### **Rotas que ainda usam KV Store:**

1. **POST `/conversations`** (criar conversa)
   - Linha 288: `await kv.set(key, conversation);`
   - Migrar para SQL

2. **GET `/conversations/:id`** (buscar conversa específica)
   - Linha 218: `await kv.get(key);`
   - Migrar para SQL

3. **PATCH `/conversations/:id`** (atualizar conversa)
   - Linha 309, 343: `await kv.set(key, conversation);`
   - Migrar para SQL

4. **DELETE `/conversations/:id`** (deletar conversa)
   - Linha 377: `await kv.del(key);`
   - Migrar para SQL

5. **POST `/conversations/:id/messages`** (enviar mensagem)
   - Linha 498, 511: `await kv.set(...)`
   - Migrar para SQL

6. **PATCH `/messages/:id/read`** (marcar como lida)
   - Precisar verificar e migrar

7. **GET `/conversations/search`** (buscar conversas)
   - Linha 734, 842: `await kv.getByPrefix(...)`
   - Migrar para SQL

8. **POST `/conversations/:id/tags`** (adicionar tags)
   - Precisar verificar e migrar

9. **Outras rotas que usam `chat:conversation:` ou `chat:message:`**
   - Revisar todas e migrar

---

## 🚫 REGRA APLICADA

### **KV Store é BLOQUEADO para:**
- ❌ `chat:conversation:*`
- ❌ `chat:message:*`
- ❌ `user:*`
- ❌ `conversation:*`
- ❌ `message:*`
- ❌ `reservation:*`
- ❌ `property:*`
- ❌ `config:*`
- ❌ E outros padrões críticos

### **KV Store é PERMITIDO apenas para:**
- ✅ `cache:*` (cache de APIs externas)
- ✅ `process:*` (estado de processos temporários)
- ✅ `temp:*` (dados temporários)
- ✅ `lock:*` (locks de operações)
- ✅ `queue:*` (fila temporária de jobs)

---

## 📊 STATUS

| Item | Status | Nota |
|------|--------|------|
| Regra documentada | ✅ | `REGRA_KV_STORE_VS_SQL.md` |
| Validação no código | ✅ | `kv_store.tsx` |
| Migration SQL | ✅ | **Precisa aplicar no Supabase** |
| Webhook WhatsApp | ✅ | Migrado para SQL |
| GET /conversations | ✅ | Migrado para SQL |
| GET /messages | ✅ | Migrado para SQL |
| POST /conversations | ⏳ | Ainda usa KV Store |
| POST /messages | ⏳ | Ainda usa KV Store |
| Outras rotas | ⏳ | Revisar todas |

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ **Aplicar migration SQL no Supabase Dashboard**
2. ⏳ Migrar rotas restantes para SQL
3. ⏳ Testar integração completa
4. ⏳ Remover código antigo de KV Store
5. ⏳ Atualizar frontend se necessário

---

**NOTA:** O código atual está em estado híbrido. O webhook salva em SQL, mas algumas rotas ainda tentam ler de KV Store. Após aplicar a migration SQL, precisaremos migrar todas as rotas restantes.

