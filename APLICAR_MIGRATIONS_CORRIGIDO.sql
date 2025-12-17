-- ============================================================================
-- APLICAR MIGRATIONS - LOGIN FUNCIONANDO (CORRIGIDO)
-- ============================================================================
-- Execute este script NO SUPABASE SQL EDITOR
-- Copie e cole TUDO e execute (Ctrl+Enter)
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAR SE TABELAS JÁ EXISTEM
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    RAISE NOTICE '✅ Tabela users já existe';
  ELSE
    RAISE NOTICE '⚠️ Tabela users NÃO existe - será criada';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sessions') THEN
    RAISE NOTICE '✅ Tabela sessions já existe';
  ELSE
    RAISE NOTICE '⚠️ Tabela sessions NÃO existe - será criada';
  END IF;
END $$;

-- ============================================================================
-- 2. CRIAR TABELA ORGANIZATIONS (se não existir - necessária para foreign key)
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  phone TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'professional', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trial', 'suspended', 'cancelled')),
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  billing JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb
);

-- ============================================================================
-- 3. CRIAR TABELA USERS (se não existir)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  email TEXT,
  name TEXT,
  password_hash TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('superadmin', 'imobiliaria', 'staff')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(type);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_users_updated_at ON users;
CREATE TRIGGER trigger_update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();

-- ============================================================================
-- 4. CRIAR TABELA SESSIONS (se não existir)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  type TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ============================================================================
-- 5. FUNÇÃO PARA HASH DE SENHA
-- ============================================================================

CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Hash simples para MVP (substituir por bcrypt em produção)
  RETURN encode(digest('rendizy_salt_' || password, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. CRIAR SUPERADMIN (se não existir)
-- ============================================================================

-- Inserir superadmin rppt se não existir
INSERT INTO users (username, email, name, password_hash, type, status)
VALUES (
  'rppt',
  'suacasarendemais@gmail.com',
  'Super Administrador',
  hash_password('root'),
  'superadmin',
  'active'
)
ON CONFLICT (username) DO UPDATE
SET 
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  type = EXCLUDED.type,
  status = EXCLUDED.status;

-- Inserir superadmin admin se não existir
INSERT INTO users (username, email, name, password_hash, type, status)
VALUES (
  'admin',
  'admin@rendizy.com',
  'Administrador',
  hash_password('root'),
  'superadmin',
  'active'
)
ON CONFLICT (username) DO UPDATE
SET 
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  type = EXCLUDED.type,
  status = EXCLUDED.status;

-- ============================================================================
-- 7. VERIFICAÇÃO FINAL
-- ============================================================================

DO $$
DECLARE
  users_count INTEGER;
  sessions_exists BOOLEAN;
  rppt_exists BOOLEAN;
  admin_exists BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO users_count FROM users;
  SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sessions') INTO sessions_exists;
  SELECT EXISTS (SELECT 1 FROM users WHERE username = 'rppt') INTO rppt_exists;
  SELECT EXISTS (SELECT 1 FROM users WHERE username = 'admin') INTO admin_exists;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRATIONS APLICADAS COM SUCESSO!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Usuários na tabela: %', users_count;
  RAISE NOTICE 'Tabela sessions existe: %', sessions_exists;
  RAISE NOTICE 'SuperAdmin rppt existe: %', rppt_exists;
  RAISE NOTICE 'SuperAdmin admin existe: %', admin_exists;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Próximo passo: Fazer deploy do backend';
  RAISE NOTICE '========================================';
END $$;

