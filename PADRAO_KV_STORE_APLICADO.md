# ✅ PADRÃO KV STORE APLICADO

**Versão:** v1.0.103.970  
**Data:** 20/11/2025  
**Status:** ✅ **IMPLEMENTADO**

---

## 🎯 O QUE FOI FEITO

### 1. **Regra Documentada**
✅ Criado `REGRA_KV_STORE_VS_SQL.md` com padrões claros:
- ❌ **NUNCA** use KV Store para dados críticos
- ✅ **APENAS** use KV Store para cache temporário (TTL < 24h)

### 2. **Validação no Código**
✅ Adicionado validação em `kv_store.tsx`:
- 🚫 **BLOQUEIA** uso de KV Store para dados críticos
- ✅ **PERMITE** apenas prefixos: `cache:`, `process:`, `temp:`, `lock:`, `queue:`

### 3. **Padrões Definidos**

#### ❌ **NUNCA USE KV STORE PARA:**
- Conversas (`chat:conversation:*`)
- Mensagens (`chat:message:*`)
- Usuários (`user:*`)
- Sessões (`session:*`)
- Reservas (`reservation:*`)
- Propriedades (`property:*`)
- Configurações (`config:*`)
- Qualquer dado crítico para o negócio

#### ✅ **USE KV STORE APENAS PARA:**
- Cache de APIs externas (`cache:external-api:*`)
- Estado de processos temporários (`process:*`)
- Dados temporários (`temp:*`)
- Locks de operações (`lock:*`)
- Fila de jobs (`queue:*`)

---

## 🚫 VALIDAÇÃO AUTOMÁTICA

A validação agora está **ativa** em `kv_store.tsx`. Se você tentar usar KV Store para dados críticos, receberá um erro:

```
❌ PROIBIDO: Não use KV Store para dados críticos!

   Key: chat:conversation:org:123
   REGRA: KV Store APENAS para cache temporário (TTL < 24h)
   SOLUÇÃO: Use tabela SQL apropriada (users, conversations, messages, etc)
   📚 Veja: REGRA_KV_STORE_VS_SQL.md
   ✅ Prefixos permitidos: cache:*, process:*, temp:*, lock:*, queue:*
```

---

## 📋 CHECKLIST DE USO

Antes de usar KV Store, pergunte:

1. ✅ **Esses dados precisam persistir além de 24h?**
   - SIM → Use SQL
   - NÃO → Continue...

2. ✅ **Esses dados são críticos para o negócio?**
   - SIM → Use SQL
   - NÃO → Continue...

3. ✅ **Esses dados podem ser perdidos sem problema?**
   - NÃO → Use SQL
   - SIM → Pode ser KV Store (cache)

4. ✅ **Esses dados são temporários (cache, sessão, processo)?**
   - SIM → KV Store OK
   - NÃO → Use SQL

---

## 📚 DOCUMENTAÇÃO

- **Regra Completa:** `REGRA_KV_STORE_VS_SQL.md`
- **Resumo Migração:** `RESUMO_MIGRACAO_KV_STORE_SQL.md`
- **Instruções Migration SQL:** `APLICAR_MIGRATION_SQL_CHAT.md`
- **Validador:** `supabase/functions/rendizy-server/utils-kv-store-validator.ts`

---

## ⚠️ AÇÃO NECESSÁRIA

### **APLICAR MIGRATION SQL**

Para completar a migração, você precisa aplicar a migration SQL no Supabase Dashboard:

1. Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc
2. Navegue para: **SQL Editor**
3. Abra: `supabase/migrations/20241120_create_whatsapp_chat_tables.sql`
4. Copie TODO o conteúdo
5. Cole no SQL Editor
6. Clique em **RUN** (`Ctrl+Enter`)
7. Verifique se as tabelas foram criadas: **Database → Tables**

---

## ✅ STATUS ATUAL

| Item | Status |
|------|--------|
| Regra documentada | ✅ |
| Validação no código | ✅ |
| Migration SQL criada | ✅ |
| Webhook migrado para SQL | ✅ |
| Rotas principais migradas | ✅ |
| **Migration SQL aplicada** | ⚠️ **PRECISA APLICAR** |
| Rotas restantes migradas | ⏳ Em andamento |

---

**NOTA:** O padrão está aplicado e funcionando. A validação irá bloquear tentativas de usar KV Store para dados críticos. Agora é necessário aplicar a migration SQL para completar a migração dos dados.

