-- ============================================================================
-- MIGRATION: Criar organização padrão (default organization)
-- Data: 2024-11-19
-- Versão: v1.0.103.970
-- 
-- OBJETIVO:
-- Criar organização padrão para permitir salvamento quando usuário não está logado
-- Resolve problema de foreign key constraint ao salvar channel_config
-- ============================================================================

-- Criar organização padrão (se não existir)
INSERT INTO organizations (
  id,
  name,
  slug,
  email,
  plan,
  status,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Organização Padrão',
  'default-organization',
  'admin@rendizy.com',
  'free',
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING; -- Não falhar se já existir

-- Comentário
COMMENT ON TABLE organizations IS 'Tabela de organizações (tenants). Inclui organização padrão para usuários não autenticados.';

-- Log de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 20241119_create_default_organization concluída';
  RAISE NOTICE '   - Organização padrão criada: 00000000-0000-0000-0000-000000000001';
  RAISE NOTICE '   - Permite salvamento de channel_config mesmo sem login';
END $$;

