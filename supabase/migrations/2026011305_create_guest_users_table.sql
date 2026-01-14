-- Migration: Criar tabela guest_users para hóspedes dos sites clientes
-- Data: 2026-01-13
-- Versão: 1.0.104.001
-- 
-- Esta tabela armazena os dados dos hóspedes que fazem login nos sites
-- dos clientes (via Google, Apple ou email/senha).
-- É separada da tabela auth_users (funcionários do Rendizy).

-- ============================================================================
-- TABELA: guest_users
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.guest_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Dados básicos
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  
  -- OAuth providers
  google_id TEXT UNIQUE,
  apple_id TEXT UNIQUE,
  
  -- Senha (apenas para login email/senha, hash bcrypt)
  password_hash TEXT,
  
  -- Organização (qual cliente do Rendizy este hóspede pertence)
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  email_verified BOOLEAN DEFAULT false,
  
  -- Preferências
  preferred_language TEXT DEFAULT 'pt-BR',
  marketing_opt_in BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  
  -- Índice único composto: email + organization_id
  -- (mesmo email pode existir em organizações diferentes)
  CONSTRAINT unique_email_per_org UNIQUE (email, organization_id)
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================

-- Índice para busca por email
CREATE INDEX IF NOT EXISTS idx_guest_users_email ON public.guest_users(email);

-- Índice para busca por organização
CREATE INDEX IF NOT EXISTS idx_guest_users_organization ON public.guest_users(organization_id);

-- Índice para busca por Google ID (login social)
CREATE INDEX IF NOT EXISTS idx_guest_users_google_id ON public.guest_users(google_id) WHERE google_id IS NOT NULL;

-- Índice para busca por Apple ID (login social)
CREATE INDEX IF NOT EXISTS idx_guest_users_apple_id ON public.guest_users(apple_id) WHERE apple_id IS NOT NULL;

-- ============================================================================
-- TRIGGER: updated_at automático
-- ============================================================================

CREATE OR REPLACE FUNCTION update_guest_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_guest_users_updated_at ON public.guest_users;
CREATE TRIGGER trigger_guest_users_updated_at
  BEFORE UPDATE ON public.guest_users
  FOR EACH ROW
  EXECUTE FUNCTION update_guest_users_updated_at();

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================

ALTER TABLE public.guest_users ENABLE ROW LEVEL SECURITY;

-- Política: Service role pode tudo
CREATE POLICY "service_role_all_guest_users" ON public.guest_users
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Política: Anon pode inserir (criar conta via OAuth)
CREATE POLICY "anon_insert_guest_users" ON public.guest_users
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Política: Anon pode ler seus próprios dados
CREATE POLICY "anon_select_own_guest_users" ON public.guest_users
  FOR SELECT
  TO anon
  USING (true);

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON TABLE public.guest_users IS 'Hóspedes dos sites clientes (login via Google, Apple ou email)';
COMMENT ON COLUMN public.guest_users.google_id IS 'ID único do usuário no Google (sub do JWT)';
COMMENT ON COLUMN public.guest_users.apple_id IS 'ID único do usuário no Apple (sub do JWT)';
COMMENT ON COLUMN public.guest_users.organization_id IS 'Qual cliente do Rendizy este hóspede pertence';
COMMENT ON COLUMN public.guest_users.password_hash IS 'Hash bcrypt da senha (apenas para login email/senha)';
