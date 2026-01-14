-- ============================================================================
-- MIGRATION: Criar organização "Rendizy" (Master) para SuperAdmin
-- Data: 2025-11-26
-- Versão: v1.0.103.1100
-- 
-- OBJETIVO:
-- Criar organização especial "Rendizy" para o gestor absoluto do código fonte
-- Permitir que superadmin tenha organization_id (organização master)
-- Garantir que o financeiro funcione para o superadmin
-- ============================================================================

-- ============================================================================
-- PASSO 0: Garantir que coluna metadata existe (se não existir)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'organizations' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE organizations ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE '✅ Coluna metadata criada na tabela organizations';
  END IF;
END $$;

-- ============================================================================
-- PASSO 1: Criar organização "Rendizy" (Master)
-- ============================================================================

-- UUID fixo para organização master: 00000000-0000-0000-0000-000000000000
-- (diferente da organização padrão que é 00000000-0000-0000-0000-000000000001)
INSERT INTO organizations (
  id,
  name,
  slug,
  email,
  plan,
  status,
  created_at,
  updated_at,
  metadata
)
VALUES (
  '00000000-0000-0000-0000-000000000000',  -- UUID fixo para organização master
  'Rendizy',
  'rendizy-master',
  'master@rendizy.com',
  'enterprise',
  'active',
  NOW(),
  NOW(),
  '{"is_master": true, "description": "Organização master para gestores do código fonte"}'::jsonb
)
ON CONFLICT (id) DO UPDATE
SET 
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  email = EXCLUDED.email,
  plan = EXCLUDED.plan,
  status = EXCLUDED.status,
  updated_at = NOW(),
  metadata = COALESCE(EXCLUDED.metadata, organizations.metadata, '{}'::jsonb);

-- ============================================================================
-- PASSO 2: Remover constraint que impede superadmin de ter organization_id
-- ============================================================================

-- Dropar constraints antigas (se existirem)
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS check_superadmin_no_org;

ALTER TABLE users
DROP CONSTRAINT IF EXISTS check_superadmin_org_master;

-- Criar nova constraint que permite superadmin ter organization_id (organização master)
-- Verificar se já existe antes de criar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_superadmin_org_master'
    AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT check_superadmin_org_master CHECK (
      (type = 'superadmin' AND (organization_id IS NULL OR organization_id = '00000000-0000-0000-0000-000000000000')) OR
      (type != 'superadmin')
    );
    RAISE NOTICE '✅ Constraint check_superadmin_org_master criada';
  ELSE
    RAISE NOTICE '⚠️ Constraint check_superadmin_org_master já existe - pulando criação';
  END IF;
END $$;

-- ============================================================================
-- PASSO 3: Atualizar superadmin para usar organização Rendizy
-- ============================================================================

-- Atualizar todos os superadmins para usar organização Rendizy
UPDATE users
SET 
  organization_id = '00000000-0000-0000-0000-000000000000',
  updated_at = NOW()
WHERE type = 'superadmin' 
  AND (organization_id IS NULL OR organization_id != '00000000-0000-0000-0000-000000000000');

-- ============================================================================
-- PASSO 4: Garantir que plano de contas seja criado para organização Rendizy
-- ============================================================================

-- Executar função de criação de plano de contas para organização Rendizy
DO $$
BEGIN
  PERFORM criar_plano_contas_para_organizacao('00000000-0000-0000-0000-000000000000');
  RAISE NOTICE '✅ Plano de contas criado para organização Rendizy (master)';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '⚠️ Função criar_plano_contas_para_organizacao não existe ainda. Execute a migration 20241124_plano_contas_imobiliaria_temporada.sql primeiro.';
END $$;

-- ============================================================================
-- LOG DE CONCLUSÃO
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 20241126_create_rendizy_master_organization concluída';
  RAISE NOTICE '   - Organização Rendizy (master) criada: 00000000-0000-0000-0000-000000000000';
  RAISE NOTICE '   - Constraint ajustada para permitir superadmin ter organization_id';
  RAISE NOTICE '   - Superadmins atualizados para usar organização Rendizy';
  RAISE NOTICE '   - Plano de contas será criado para organização Rendizy';
END $$;

