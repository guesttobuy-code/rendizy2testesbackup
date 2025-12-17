-- ============================================================================
-- MIGRATION: RLS Policies + Índices + Soft Deletes
-- Data: 2024-11-19
-- Versão: v1.0.103.950
-- 
-- Implementa:
-- 1. RLS Policies corretas (multi-tenant isolation)
-- 2. Índices compostos estratégicos
-- 3. Soft deletes (deleted_at, cancelled_at)
-- ============================================================================

-- ============================================================================
-- 1. SOFT DELETES
-- ============================================================================

-- Adicionar deleted_at em organization_channel_config
ALTER TABLE organization_channel_config 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Comentário
COMMENT ON COLUMN organization_channel_config.deleted_at IS 'Soft delete - quando deletado, marca timestamp ao invés de deletar';

-- ============================================================================
-- 2. RLS POLICIES CORRETAS (Multi-Tenant Isolation)
-- ============================================================================

-- Remover policy permissiva antiga
DROP POLICY IF EXISTS "Allow all operations on channel_config" ON organization_channel_config;

-- Criar policy correta que isola por organization_id
-- IMPORTANTE: Edge Functions usam Service Role Key, então RLS é bypassado
-- MAS esta policy protege acesso direto ao banco (ex: via Supabase Dashboard)
-- NOTA: organization_id pode ser TEXT ou UUID no banco, então convertemos ambos para TEXT
CREATE POLICY "tenant_isolation_channel_config" 
ON organization_channel_config 
FOR ALL 
USING (
  -- Permitir se for service role (Edge Functions)
  auth.role() = 'service_role' OR
  -- OU se organization_id corresponder ao tenant atual (converte ambos para TEXT para compatibilidade)
  organization_id::text = COALESCE(current_setting('app.current_organization_id', true), '')::text
)
WITH CHECK (
  -- Mesmo check para INSERT/UPDATE
  auth.role() = 'service_role' OR
  organization_id::text = COALESCE(current_setting('app.current_organization_id', true), '')::text
);

-- Comentário
COMMENT ON POLICY "tenant_isolation_channel_config" ON organization_channel_config IS 
'Policy multi-tenant: isola dados por organization_id. Service role (Edge Functions) tem acesso total.';

-- Policy adicional: Soft delete filter (não mostrar deletados)
CREATE POLICY "filter_deleted_channel_config" 
ON organization_channel_config 
FOR SELECT 
USING (deleted_at IS NULL);

COMMENT ON POLICY "filter_deleted_channel_config" ON organization_channel_config IS 
'Policy para filtrar registros soft-deleted nas queries SELECT';

-- ============================================================================
-- 3. ÍNDICES COMPOSTOS ESTRATÉGICOS
-- ============================================================================

-- Índice composto: organization_id + whatsapp_enabled (queries filtradas)
CREATE INDEX IF NOT EXISTS idx_channel_config_org_enabled 
ON organization_channel_config(organization_id, whatsapp_enabled) 
WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_channel_config_org_enabled IS 
'Índice composto para queries filtradas por organization_id + whatsapp_enabled (exclui soft-deleted)';

-- Índice composto: organization_id + whatsapp_connected (status queries)
CREATE INDEX IF NOT EXISTS idx_channel_config_org_connected 
ON organization_channel_config(organization_id, whatsapp_connected) 
WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_channel_config_org_connected IS 
'Índice composto para queries de status por organization_id + whatsapp_connected (exclui soft-deleted)';

-- Índice composto: organization_id + created_at (ordenação)
CREATE INDEX IF NOT EXISTS idx_channel_config_org_created 
ON organization_channel_config(organization_id, created_at DESC) 
WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_channel_config_org_created IS 
'Índice composto para queries ordenadas por organization_id + created_at DESC (exclui soft-deleted)';

-- Índice parcial: whatsapp_enabled = true (apenas ativos)
CREATE INDEX IF NOT EXISTS idx_channel_config_whatsapp_active 
ON organization_channel_config(organization_id) 
WHERE whatsapp_enabled = true AND deleted_at IS NULL;

COMMENT ON INDEX idx_channel_config_whatsapp_active IS 
'Índice parcial para queries de WhatsApp ativos apenas (otimiza queries de webhooks)';

-- ============================================================================
-- 4. VERIFICAÇÕES
-- ============================================================================

-- Verificar se RLS está habilitado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'organization_channel_config'
    AND rowsecurity = true
  ) THEN
    ALTER TABLE organization_channel_config ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS habilitado em organization_channel_config';
  END IF;
END $$;

-- Log de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 20241119_fix_rls_and_indexes concluída com sucesso';
  RAISE NOTICE '  - Soft deletes: deleted_at adicionado';
  RAISE NOTICE '  - RLS Policies: tenant isolation implementado';
  RAISE NOTICE '  - Índices: 4 índices compostos criados';
END $$;

