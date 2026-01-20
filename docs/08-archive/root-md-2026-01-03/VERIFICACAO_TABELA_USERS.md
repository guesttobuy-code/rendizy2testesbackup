# ✅ VERIFICAÇÃO: TABELA USERS

**Data:** 20/11/2025  
**Objetivo:** Verificar se tabela users foi criada e tem dados  
**Status:** 🔍 VERIFICANDO

---

## 🔍 VERIFICAÇÃO MANUAL NO SUPABASE

Execute estas queries no SQL Editor do Supabase:

### 1. Verificar se tabela existe:
```sql
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'users'
);
```

**Resultado esperado:** `true`

---

### 2. Verificar estrutura da tabela:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
```

**Resultado esperado:** Ver todas as colunas (id, username, email, name, password_hash, etc.)

---

### 3. Verificar SuperAdmins inseridos:
```sql
SELECT id, username, email, name, type, status
FROM users
WHERE type = 'superadmin';
```

**Resultado esperado:**
- 2 usuários (rppt e admin)
- Type: 'superadmin'
- Status: 'active'

---

### 4. Verificar hash de senha:
```sql
SELECT username, password_hash
FROM users
WHERE username IN ('rppt', 'admin');
```

**Resultado esperado:**
- password_hash: `4813494d137e1631bba301d5acab6e7bb7aa74ce1185d456565ef51d737677b2`

---

## 🔍 LOGS DO BACKEND (APÓS DEPLOY)

Após fazer login, verifique os logs da Edge Function no Supabase Dashboard:
- **Logs:** https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions/rendizy-server/logs

**Logs esperados:**
```
🔐 POST /auth/login - Tentativa de login
👤 Login attempt: { username: 'rppt' }
✅ Tabela users acessível. Usuários encontrados: 2
✅ Usuário encontrado na tabela SQL: { id: ..., username: 'rppt', type: 'superadmin' }
✅ Login bem-sucedido: { username: 'rppt', type: 'superadmin' }
```

---

**VERSÃO:** 1.0  
**STATUS:** 🔍 VERIFICANDO

