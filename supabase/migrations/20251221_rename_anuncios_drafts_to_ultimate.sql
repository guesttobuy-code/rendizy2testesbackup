-- ============================================================================
-- MIGRATION: Renomear anuncios_drafts para anuncios_ultimate
-- Data: 2025-12-21
-- Motivo: Padronizar nome da tabela com o nome do sistema (Anúncios Ultimate)
-- ============================================================================

-- Renomear tabela
ALTER TABLE IF EXISTS public.anuncios_drafts 
  RENAME TO anuncios_ultimate;

-- Renomear índices (se existirem)
ALTER INDEX IF EXISTS idx_drafts_user 
  RENAME TO idx_ultimate_user;

ALTER INDEX IF EXISTS idx_drafts_org 
  RENAME TO idx_ultimate_org;

ALTER INDEX IF EXISTS idx_anuncios_drafts_id
  RENAME TO idx_anuncios_ultimate_id;

ALTER INDEX IF EXISTS idx_anuncios_drafts_organization_id
  RENAME TO idx_anuncios_ultimate_organization_id;

-- Renomear trigger (se existir)
DROP TRIGGER IF EXISTS trigger_anuncios_drafts_updated_at ON public.anuncios_ultimate;
CREATE TRIGGER trigger_anuncios_ultimate_updated_at
  BEFORE UPDATE ON public.anuncios_ultimate
  FOR EACH ROW
  EXECUTE FUNCTION set_timestamp_drafts();

-- Renomear políticas RLS (se existirem)
DROP POLICY IF EXISTS "Service role full access" ON public.anuncios_ultimate;
CREATE POLICY "Service role full access" 
  ON public.anuncios_ultimate
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comentário na tabela
COMMENT ON TABLE public.anuncios_ultimate IS 
  'Tabela principal do sistema Anúncios Ultimate (renomeada de anuncios_drafts em 21/12/2025)';

-- Log
DO $$
BEGIN
  RAISE NOTICE '✅ Tabela renomeada: anuncios_drafts → anuncios_ultimate';
END $$;
