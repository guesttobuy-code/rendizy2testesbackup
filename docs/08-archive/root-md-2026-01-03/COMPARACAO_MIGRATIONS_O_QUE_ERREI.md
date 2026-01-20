# 🔍 COMPARAÇÃO: Migrations - O Que Eu Errei Antes

**Data:** 2025-11-23  
**Objetivo:** Explicar diferenças entre migrations e o que foi corrigido

---

## 📋 RESUMO DAS MIGRATIONS

### **1. Migration Original (20241120_create_users_table.sql)** ✅
- **Status:** ✅ CORRETA - Migration oficial
- **Estrutura:** Completa e robusta
- **Problema:** Pode não ter sido aplicada no banco

### **2. Migration Original (20241121_create_sessions_table.sql)** ✅
- **Status:** ✅ CORRETA - Migration oficial
- **Estrutura:** Completa
- **Problema:** Pode não ter sido aplicada no banco

### **3. APLICAR_MIGRATIONS_AGORA.sql** ⚠️
- **Status:** ⚠️ INCOMPLETA - Script de emergência
- **Problemas encontrados:**
  - ❌ Usa `CREATE TABLE IF NOT EXISTS` (não força recriação se estrutura estiver errada)
  - ❌ Estrutura simplificada (faltam campos importantes)
  - ❌ Hash de senha diferente (usa função `hash_password()` ao invés de hash direto)
  - ❌ Falta RLS (Row Level Security) para sessions
  - ❌ Falta constraint CHECK em sessions.type
  - ❌ Não atualiza password_hash no ON CONFLICT

### **4. APLICAR_MIGRATIONS_E_TESTAR.sql** ✅
- **Status:** ✅ CORRIGIDA - Baseada nas migrations originais
- **Correções:**
  - ✅ Usa `DROP TABLE IF EXISTS ... CASCADE` (força recriação)
  - ✅ Estrutura completa igual às migrations originais
  - ✅ Hash de senha correto (SHA256 direto)
  - ✅ RLS configurado para users E sessions
  - ✅ Constraints completas
  - ✅ Atualiza password_hash no ON CONFLICT

---

## 🔴 ERROS QUE COMETI ANTES

### **ERRO 1: Estrutura Simplificada** ❌

**Antes (APLICAR_MIGRATIONS_AGORA.sql):**
```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  email TEXT,                    -- ❌ NULL permitido
  name TEXT,                     -- ❌ NULL permitido
  password_hash TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('superadmin', 'imobiliaria', 'staff')),
  role TEXT DEFAULT 'staff',     -- ❌ Campo extra que não existe na migration original
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),  -- ❌ 'inactive' ao invés de 'invited'
  organization_id UUID,          -- ❌ Sem foreign key
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Agora (APLICAR_MIGRATIONS_E_TESTAR.sql):**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,           -- ✅ NOT NULL
  name TEXT NOT NULL,            -- ✅ NOT NULL
  password_hash TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('superadmin', 'imobiliaria', 'staff')),
  -- ✅ Sem campo 'role' (não existe na migration original)
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'invited')),  -- ✅ 'invited' correto
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,  -- ✅ Foreign key
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  -- ✅ Constraint adicional
  CONSTRAINT check_superadmin_no_org CHECK (
    (type = 'superadmin' AND organization_id IS NULL) OR
    (type != 'superadmin')
  )
);
```

---

### **ERRO 2: Hash de Senha Diferente** ❌

**Antes (APLICAR_MIGRATIONS_AGORA.sql):**
```sql
-- ❌ Função hash diferente
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest('rendizy_salt_' || password, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

INSERT INTO users (username, email, name, password_hash, type, role, status)
VALUES (
  'rppt',
  'suacasarendemais@gmail.com',
  'Super Administrador',
  hash_password('root'),  -- ❌ Hash diferente
  'superadmin',
  'super_admin',
  'active'
)
ON CONFLICT (username) DO NOTHING;  -- ❌ Não atualiza password_hash
```

**Agora (APLICAR_MIGRATIONS_E_TESTAR.sql):**
```sql
-- ✅ Hash direto (igual migration original)
INSERT INTO users (
  id,
  username,
  email,
  name,
  password_hash,
  type,
  status,
  organization_id,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'rppt',
  'suacasarendemais@gmail.com',
  'Super Administrador',
  '4813494d137e1631bba301d5acab6e7bb7aa74ce1185d456565ef51d737677b2',  -- ✅ Hash SHA256 de 'root' (minúsculas)
  'superadmin',
  'active',
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (username) DO UPDATE
SET 
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,  -- ✅ Atualiza password_hash
  updated_at = NOW();
```

---

### **ERRO 3: Sessions Sem RLS e Constraints** ❌

**Antes (APLICAR_MIGRATIONS_AGORA.sql):**
```sql
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  type TEXT NOT NULL,  -- ❌ Sem constraint CHECK
  organization_id UUID,  -- ❌ Sem foreign key
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity TIMESTAMPTZ DEFAULT NOW()
);
-- ❌ Sem RLS
-- ❌ Sem policies
```

**Agora (APLICAR_MIGRATIONS_E_TESTAR.sql):**
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('superadmin', 'imobiliaria', 'staff')),  -- ✅ Constraint CHECK
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,  -- ✅ Foreign key
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT sessions_token_unique UNIQUE (token)
);

-- ✅ RLS configurado
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- ✅ Policy criada
DROP POLICY IF EXISTS "Allow all operations via service role" ON sessions;
CREATE POLICY "Allow all operations via service role" 
ON sessions 
FOR ALL 
USING (true) 
WITH CHECK (true);
```

---

### **ERRO 4: CREATE TABLE IF NOT EXISTS** ❌

**Antes (APLICAR_MIGRATIONS_AGORA.sql):**
```sql
CREATE TABLE IF NOT EXISTS users (...);  -- ❌ Não força recriação se estrutura estiver errada
CREATE TABLE IF NOT EXISTS sessions (...);  -- ❌ Não força recriação
```

**Agora (APLICAR_MIGRATIONS_E_TESTAR.sql):**
```sql
DROP TABLE IF EXISTS users CASCADE;  -- ✅ Força recriação
CREATE TABLE users (...);

DROP TABLE IF EXISTS sessions CASCADE;  -- ✅ Força recriação
CREATE TABLE sessions (...);
```

---

## ✅ O QUE FOI CORRIGIDO

### **1. Estrutura Completa**
- ✅ Campos NOT NULL corretos
- ✅ Foreign keys configuradas
- ✅ Constraints adicionais (check_superadmin_no_org)
- ✅ Índices completos

### **2. Hash de Senha Correto**
- ✅ Hash SHA256 direto (igual migration original)
- ✅ Atualiza password_hash no ON CONFLICT
- ✅ IDs fixos para SuperAdmins

### **3. RLS Configurado**
- ✅ RLS habilitado para users E sessions
- ✅ Policies criadas para permitir acesso via service role

### **4. Força Recriação**
- ✅ DROP TABLE antes de criar
- ✅ Garante estrutura correta mesmo se tabela já existir

---

## 📊 COMPARAÇÃO FINAL

| Aspecto | Migration Original | APLICAR_MIGRATIONS_AGORA.sql | APLICAR_MIGRATIONS_E_TESTAR.sql |
|---------|-------------------|----------------------------|--------------------------------|
| Estrutura | ✅ Completa | ❌ Simplificada | ✅ Completa |
| Hash senha | ✅ SHA256 direto | ❌ Função diferente | ✅ SHA256 direto |
| RLS users | ✅ Sim | ✅ Sim | ✅ Sim |
| RLS sessions | ✅ Sim | ❌ Não | ✅ Sim |
| Constraints | ✅ Completas | ❌ Incompletas | ✅ Completas |
| Foreign keys | ✅ Sim | ❌ Não | ✅ Sim |
| Força recriação | ✅ DROP TABLE | ❌ IF NOT EXISTS | ✅ DROP TABLE |

---

## 🎯 CONCLUSÃO

**O que eu errei:**
1. ❌ Simplifiquei demais a estrutura (removi campos e constraints)
2. ❌ Usei hash de senha diferente (função ao invés de hash direto)
3. ❌ Não configurei RLS para sessions
4. ❌ Usei `IF NOT EXISTS` ao invés de `DROP TABLE` (não força recriação)
5. ❌ Não atualizei password_hash no ON CONFLICT

**O que corrigi:**
1. ✅ Usei a estrutura EXATA das migrations originais
2. ✅ Hash de senha igual à migration original
3. ✅ RLS configurado para ambas as tabelas
4. ✅ DROP TABLE antes de criar (força recriação)
5. ✅ Atualiza password_hash no ON CONFLICT

**Recomendação:**
- ✅ **Usar `APLICAR_MIGRATIONS_E_TESTAR.sql`** (baseado nas migrations originais)
- ❌ **NÃO usar `APLICAR_MIGRATIONS_AGORA.sql`** (incompleto)

---

**Última atualização:** 2025-11-23



