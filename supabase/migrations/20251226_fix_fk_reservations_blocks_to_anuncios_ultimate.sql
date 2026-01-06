-- ============================================================================
-- MIGRAÇÃO: Unificar propriedades em properties (FKs)
-- Data: 26/12/2025
-- Objetivo:
--  - reservations.property_id deve referenciar properties (não anuncios_drafts)
--  - blocks.property_id (se existir) pode referenciar properties
-- Observação: Esta migração é recomendada em conjunto com um wipe/reimport,
-- pois reservas antigas podem apontar para IDs que só existem em anuncios_drafts.
-- ============================================================================

-- 1) Ajustar FK de reservations.property_id
ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_property_id_fkey;

ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_property_id_fkey
  FOREIGN KEY (property_id)
  REFERENCES public.properties(id)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_reservations_property_id
  ON public.reservations(property_id);

COMMENT ON CONSTRAINT reservations_property_id_fkey ON public.reservations IS
'FK ajustada em 26/12/2025: reservations.property_id -> properties(id)';

-- 2) Ajustar FK de blocks.property_id (opcional)
-- Nota: alguns ambientes podem não ter a tabela/coluna.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'blocks'
      AND column_name = 'property_id'
  ) THEN
    BEGIN
      ALTER TABLE public.blocks
        DROP CONSTRAINT IF EXISTS blocks_property_id_fkey;

      ALTER TABLE public.blocks
        ADD CONSTRAINT blocks_property_id_fkey
        FOREIGN KEY (property_id)
        REFERENCES public.properties(id)
        ON DELETE CASCADE;

      COMMENT ON CONSTRAINT blocks_property_id_fkey ON public.blocks IS
      'FK ajustada em 26/12/2025: blocks.property_id -> properties(id)';

    EXCEPTION WHEN others THEN
      -- Se houver dados inválidos, ou tipo incompatível, manter sem FK.
      RAISE NOTICE 'Não foi possível criar FK blocks_property_id_fkey: %', SQLERRM;
    END;
  END IF;
END $$;

-- ============================================================================
-- FIM
-- ============================================================================
