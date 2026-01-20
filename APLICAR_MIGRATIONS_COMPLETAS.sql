-- ============================================================================
-- MIGRAÇÕES COMPLETAS PARA APLICAR NO SUPABASE
-- Execute este script NO ORDEM no Supabase SQL Editor
-- Data: 2024-11-21
-- ============================================================================

-- ============================================================================
-- PASSO 1: CRIAR TABELA ORGANIZATIONS (se não existe)
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

-- Adicionar coluna legacy_imobiliaria_id se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'organizations' 
    AND column_name = 'legacy_imobiliaria_id'
  ) THEN
    ALTER TABLE organizations ADD COLUMN legacy_imobiliaria_id TEXT;
  END IF;
END $$;

-- Índices para organizations
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_legacy_imobiliaria_id ON organizations(legacy_imobiliaria_id) WHERE legacy_imobiliaria_id IS NOT NULL;

-- Inserir organização padrão
INSERT INTO organizations (
  id, name, slug, email, plan, status, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Organização Padrão',
  'default-organization',
  'admin@rendizy.com',
  'free',
  'active',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PASSO 2: CRIAR TABELA USERS (removendo se existir para recriar)
-- ============================================================================

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

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(type);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at);
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

-- Inserir SuperAdmins iniciais
-- Hash de "root" usando SHA256: 4813494d137e1631bba301d5acab6e7bb7aa74ce1185d456565ef51d737677b2
INSERT INTO users (id, username, email, name, password_hash, type, status, organization_id, created_at, updated_at)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001',
    'rppt',
    'suacasarendemais@gmail.com',
    'Super Administrador',
    '4813494d137e1631bba301d5acab6e7bb7aa74ce1185d456565ef51d737677b2',
    'superadmin',
    'active',
    NULL,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'admin',
    'root@rendizy.com',
    'Administrador',
    '4813494d137e1631bba301d5acab6e7bb7aa74ce1185d456565ef51d737677b2',
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
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();

-- ============================================================================
-- PASSO 3: CRIAR TABELA SESSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS sessions (
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
  
  -- Constraints
  CONSTRAINT sessions_token_unique UNIQUE (token)
);

-- Índices para sessions
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_organization_id ON sessions(organization_id);

-- Função para limpar sessões expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON TABLE sessions IS 'Tabela de sessões de autenticação do sistema';
COMMENT ON COLUMN sessions.token IS 'Token único de autenticação';
COMMENT ON COLUMN sessions.user_id IS 'ID do usuário autenticado';
COMMENT ON COLUMN sessions.expires_at IS 'Data e hora de expiração da sessão';

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

SELECT '✅ Migrations aplicadas com sucesso!' AS status;

-- Verificar se tabelas foram criadas
SELECT 
    table_name,
    '✅ Existe' AS status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('organizations', 'users', 'sessions')
ORDER BY table_name;

-- Verificar se usuários foram criados
SELECT 
    username,
    email,
    type,
    status,
    '✅ Usuário criado' AS status
FROM users
ORDER BY username;

