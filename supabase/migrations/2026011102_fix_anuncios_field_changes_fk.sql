-- ============================================================================
-- MIGRATION: Corrigir FK anuncios_field_changes → properties
-- Data: 2026-01-11
-- Problema: FK aponta para anuncios_ultimate_old em vez de properties
-- ============================================================================

-- 1. Remover a FK antiga
ALTER TABLE IF EXISTS public.anuncios_field_changes
  DROP CONSTRAINT IF EXISTS anuncios_field_changes_anuncio_id_fkey;

-- 2. Adicionar nova FK apontando para properties
-- Nota: Usando ON DELETE SET NULL para não quebrar registros existentes
ALTER TABLE IF EXISTS public.anuncios_field_changes
  ADD CONSTRAINT anuncios_field_changes_anuncio_id_fkey
  FOREIGN KEY (anuncio_id) 
  REFERENCES public.properties(id) 
  ON DELETE SET NULL;

-- 3. Verificação
DO $$
BEGIN
  RAISE NOTICE '✅ FK anuncios_field_changes corrigida para apontar para properties';
END $$;
