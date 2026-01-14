-- ============================================================================
-- MIGRAÇÃO: Corrigir FK de reservations.property_id
-- Data: 18/12/2025
-- Executor: Claude Sonnet 4.5
-- Objetivo: Apontar FK para anuncios_drafts (tabela correta) ao invés de properties
-- ============================================================================

-- CONTEXTO:
-- - Frontend v2.0 envia propertyId de imóveis em anuncios_drafts
-- - Backend busca imóveis em anuncios_drafts (linha 305 de routes-reservations.ts)
-- - Mas FK antiga apontava para properties (Wizard descontinuado)
-- - Resultado: Foreign key constraint violation

-- ============================================================================
-- 1. REMOVER FK ANTIGA
-- ============================================================================

ALTER TABLE reservations 
DROP CONSTRAINT IF EXISTS reservations_property_id_fkey;

-- ============================================================================
-- 2. CRIAR FK NOVA (anuncios_drafts)
-- ============================================================================

ALTER TABLE reservations
ADD CONSTRAINT reservations_property_id_fkey 
  FOREIGN KEY (property_id) 
  REFERENCES anuncios_drafts(id) 
  ON DELETE CASCADE;

-- ============================================================================
-- 3. CRIAR ÍNDICE PARA PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_reservations_property_id 
ON reservations(property_id);

-- ============================================================================
-- 4. COMENTÁRIO EXPLICATIVO
-- ============================================================================

COMMENT ON CONSTRAINT reservations_property_id_fkey ON reservations IS 
'FK corrigida em 18/12/2025: aponta para anuncios_drafts (Anúncio Ultimate ativo) ao invés de properties (Wizard descontinuado)';

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================
