-- ============================================================================
-- MIGRAÇÃO: Adicionar legacy_imobiliaria_id na tabela organizations
-- Data: 2025-11-17
-- Versão: 1.0.103.500
-- ============================================================================
-- 
-- OBJETIVO:
-- Criar mapeamento entre imobiliariaId (KV Store) e organizationId (UUID SQL)
-- Permitir lookup bidirecional: imobiliariaId → organizationId
--
-- CONTEXTO:
-- - Sistema atual usa KV Store com imobiliariaId (TEXT)
-- - Migração futura para SQL usa organizationId (UUID)
-- - Necessário mapear imobiliariaId → organizationId para compatibilidade
-- ============================================================================

-- ============================================================================
-- PASSO 1: Criar tabela organizations se não existir
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
  -- Metadata adicional (JSONB flexível)
  metadata JSONB DEFAULT '{}'::jsonb,
  -- Billing
  billing JSONB DEFAULT '{}'::jsonb,
  -- Settings
  settings JSONB DEFAULT '{}'::jsonb
);

-- Índice para busca rápida por slug
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- Índice para busca rápida por status
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

-- Índice GIN para busca em metadata JSONB
CREATE INDEX IF NOT EXISTS idx_organizations_metadata_gin ON organizations USING GIN(metadata);

-- ============================================================================
-- PASSO 2: Adicionar coluna legacy_imobiliaria_id
-- ============================================================================

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS legacy_imobiliaria_id TEXT;

-- Criar índice único para lookup rápido
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_legacy_imobiliaria_id 
ON organizations(legacy_imobiliaria_id) 
WHERE legacy_imobiliaria_id IS NOT NULL;

-- Comentário explicativo
COMMENT ON COLUMN organizations.legacy_imobiliaria_id IS 
'Mapeamento para imobiliariaId do KV Store. Usado para lookup: imobiliariaId → organizationId (UUID)';

-- ============================================================================
-- PASSO 3: Criar função de lookup imobiliariaId → organizationId
-- ============================================================================

CREATE OR REPLACE FUNCTION lookup_organization_id_by_imobiliaria_id(
  p_imobiliaria_id TEXT
)
RETURNS UUID AS $$
DECLARE
  v_organization_id UUID;
BEGIN
  -- Buscar organizationId via legacy_imobiliaria_id
  SELECT id INTO v_organization_id
  FROM organizations
  WHERE legacy_imobiliaria_id = p_imobiliaria_id
  LIMIT 1;
  
  -- Se não encontrou, retornar NULL
  RETURN v_organization_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Comentário da função
COMMENT ON FUNCTION lookup_organization_id_by_imobiliaria_id(TEXT) IS 
'Lookup function: imobiliariaId (TEXT do KV Store) → organizationId (UUID do SQL). Retorna NULL se não encontrado.';

-- ============================================================================
-- PASSO 4: Criar função auxiliar para validar tenant (retorna erro se inválido)
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_tenant_by_imobiliaria_id(
  p_imobiliaria_id TEXT
)
RETURNS UUID AS $$
DECLARE
  v_organization_id UUID;
BEGIN
  -- Buscar organizationId via legacy_imobiliaria_id
  v_organization_id := lookup_organization_id_by_imobiliaria_id(p_imobiliaria_id);
  
  -- Se não encontrou, lançar exceção
  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION 'Tenant inválido: imobiliariaId % não encontrado na tabela organizations', p_imobiliaria_id;
  END IF;
  
  RETURN v_organization_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Comentário da função
COMMENT ON FUNCTION validate_tenant_by_imobiliaria_id(TEXT) IS 
'Valida se imobiliariaId existe e retorna organizationId. Lança exceção se tenant não encontrado.';

-- ============================================================================
-- PASSO 5: Row Level Security (RLS) - Permitir acesso para Edge Functions
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Policy: Permitir todas operações via service role (Edge Functions)
DROP POLICY IF EXISTS "Allow all operations via service role" ON organizations;
CREATE POLICY "Allow all operations via service role" 
ON organizations 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Comentário das policies
COMMENT ON POLICY "Allow all operations via service role" ON organizations IS 
'Policy permite acesso via service role (Edge Functions). Ajustar conforme necessário para produção.';

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration concluída com sucesso!';
  RAISE NOTICE '   - Tabela organizations criada (se não existia)';
  RAISE NOTICE '   - Coluna legacy_imobiliaria_id adicionada';
  RAISE NOTICE '   - Função lookup_organization_id_by_imobiliaria_id() criada';
  RAISE NOTICE '   - Função validate_tenant_by_imobiliaria_id() criada';
  RAISE NOTICE '';
  RAISE NOTICE '📋 PRÓXIMOS PASSOS:';
  RAISE NOTICE '   1. Migrar dados do KV Store para tabela organizations';
  RAISE NOTICE '   2. Popular legacy_imobiliaria_id com imobiliariaId existentes';
  RAISE NOTICE '   3. Usar helper híbrido no backend para lookup automático';
END $$;

