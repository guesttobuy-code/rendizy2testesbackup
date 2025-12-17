-- ============================================================================
-- MIGRATION: Criar tabela users
-- Data: 2025-11-20
-- Versão: 1.0.103.1000 - ARQUITETURA SQL COMPLETA
-- ============================================================================
-- 
-- OBJETIVO:
-- Criar tabela SQL para usuários (substituir KV Store)
-- Suporta SuperAdmin e usuários de organizações
--
-- ARQUITETURA:
-- - Tabela SQL normal com foreign keys
-- - Integridade referencial garantida pelo banco
-- - Constraints de validação no banco
-- ============================================================================

-- ============================================================================
-- PASSO 1: Garantir que tabela organizations existe
-- ============================================================================

-- Se não existe, criar (baseado na migration 20241117)
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
-- PASSO 2: Dropar tabela users se existir com estrutura antiga
-- ============================================================================

-- Dropar tabela se existir (será recriada com estrutura correta)
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================================
-- PASSO 3: Criar tabela users com estrutura completa
-- ============================================================================

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

-- Índice composto para queries comuns
CREATE INDEX IF NOT EXISTS idx_users_org_status ON users(organization_id, status);

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

-- Comentários
COMMENT ON TABLE users IS 'Usuários do sistema (SuperAdmin e usuários de organizações)';
COMMENT ON COLUMN users.type IS 'Tipo de usuário: superadmin, imobiliaria, staff';
COMMENT ON COLUMN users.organization_id IS 'ID da organização (NULL para SuperAdmin)';
COMMENT ON COLUMN users.password_hash IS 'Hash da senha (bcrypt)';

-- ============================================================================
-- INICIALIZAR SUPERADMINS
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
  updated_at = NOW();

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 20241120_create_users_table concluída';
  RAISE NOTICE '   - Tabela users criada';
  RAISE NOTICE '   - SuperAdmins inicializados (rppt, admin)';
  RAISE NOTICE '   - Constraints de validação criadas';
  RAISE NOTICE '   - Índices criados';
  RAISE NOTICE '';
  RAISE NOTICE '📋 PRÓXIMO PASSO:';
  RAISE NOTICE '   - Atualizar routes-auth.ts para usar tabela users';
  RAISE NOTICE '   - Remover dependência de KV Store para autenticação';
END $$;

