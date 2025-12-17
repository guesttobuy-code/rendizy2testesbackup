-- ============================================================================
-- MIGRATION: Corrigir tabelas users e sessions (estrutura completa)
-- Data: 2025-11-23
-- Descrição: Aplica estrutura completa baseada nas migrations originais
-- ============================================================================
-- 
-- CORREÇÕES APLICADAS:
-- - Estrutura completa (igual migrations originais)
-- - Hash de senha correto (SHA256 direto)
-- - RLS configurado para ambas as tabelas
-- - Força recriação (DROP TABLE antes de criar)
-- ============================================================================

-- ============================================================================
-- 1. CRIAR TABELA ORGANIZATIONS (se não existir - necessária para foreign key)
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
-- 2. CRIAR TABELA USERS
-- ============================================================================

-- Dropar tabela se existir (será recriada com estrutura correta)
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  
  -- Autenticação
  password_hash TEXT NOT NULL,
  
  -- Tipo de usuário
  type TEXT NOT NULL CHECK (type IN ('superadmin', 'imobiliaria', 'staff')),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'invited')),
  
  -- Relacionamento com organização (NULL para SuperAdmin)
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Metadata
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  
  -- Constraints adicionais
  CONSTRAINT check_superadmin_no_org CHECK (
    (type = 'superadmin' AND organization_id IS NULL) OR
    (type != 'superadmin')
  )
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(type);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at);

-- Trigger para atualizar updated_at automaticamente
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

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Permitir todas operações via service role (Edge Functions)
DROP POLICY IF EXISTS "Allow all operations via service role" ON users;
CREATE POLICY "Allow all operations via service role" 
ON users 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- ============================================================================
-- 3. CRIAR TABELA SESSIONS
-- ============================================================================

DROP TABLE IF EXISTS sessions CASCADE;

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('superadmin', 'imobiliaria', 'staff')),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Índices
  CONSTRAINT sessions_token_unique UNIQUE (token)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_organization_id ON sessions(organization_id);

-- Row Level Security (RLS)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Permitir todas operações via service role (Edge Functions)
DROP POLICY IF EXISTS "Allow all operations via service role" ON sessions;
CREATE POLICY "Allow all operations via service role" 
ON sessions 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- ============================================================================
-- 4. INICIALIZAR SUPERADMINS
-- ============================================================================

-- SuperAdmin: rppt
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
  '00000000-0000-0000-0000-000000000001', -- ID fixo para rppt
  'rppt',
  'suacasarendemais@gmail.com',
  'Super Administrador',
  '4813494d137e1631bba301d5acab6e7bb7aa74ce1185d456565ef51d737677b2', -- Hash SHA256 de 'root' (minúsculas)
  'superadmin',
  'active',
  NULL, -- SuperAdmin não tem organization_id
  NOW(),
  NOW()
)
ON CONFLICT (username) DO UPDATE
SET 
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();

-- SuperAdmin: admin
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
  '00000000-0000-0000-0000-000000000002', -- ID fixo para admin
  'admin',
  'root@rendizy.com',
  'Administrador',
  '4813494d137e1631bba301d5acab6e7bb7aa74ce1185d456565ef51d737677b2', -- Hash SHA256 de 'root' (minúsculas)
  'superadmin',
  'active',
  NULL, -- SuperAdmin não tem organization_id
  NOW(),
  NOW()
)
ON CONFLICT (username) DO UPDATE
SET 
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();

-- ============================================================================
-- 5. VERIFICAÇÃO FINAL
-- ============================================================================

DO $$
DECLARE
  users_count INTEGER;
  sessions_exists BOOLEAN;
  rppt_exists BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO users_count FROM users;
  SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sessions') INTO sessions_exists;
  SELECT EXISTS (SELECT FROM users WHERE username = 'rppt') INTO rppt_exists;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRATIONS APLICADAS COM SUCESSO!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Usuários na tabela: %', users_count;
  RAISE NOTICE 'Tabela sessions existe: %', sessions_exists;
  RAISE NOTICE 'Usuário rppt existe: %', rppt_exists;
  RAISE NOTICE '========================================';
END $$;



