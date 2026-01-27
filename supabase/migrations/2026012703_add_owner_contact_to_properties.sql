-- ============================================================================
-- MIGRATION: Adicionar owner_contact_id em properties
-- Data: 2026-01-27
-- Descrição: FK para vincular properties com crm_contacts (tipo proprietario)
-- ============================================================================

-- Adicionar coluna owner_contact_id
ALTER TABLE public.properties 
  ADD COLUMN IF NOT EXISTS owner_contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_properties_owner_contact_id 
  ON public.properties(owner_contact_id);

-- Comentário
COMMENT ON COLUMN public.properties.owner_contact_id IS 'FK para crm_contacts - vincula propriedade ao proprietário';

-- ============================================================================
-- PRONTO!
-- ============================================================================
DO $$ 
BEGIN
  RAISE NOTICE '✅ Coluna owner_contact_id adicionada em properties';
END $$;
