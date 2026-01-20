-- ============================================================================
-- MIGRATION: Renomear anuncios_drafts para properties
-- Data: 2025-12-21
-- Motivo: Padronizar nome da tabela com o nome do sistema (Anúncios Ultimate)
-- ============================================================================

DO $$
DECLARE
  has_drafts boolean;
  has_ultimate boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'anuncios_drafts'
  ) INTO has_drafts;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'properties'
  ) INTO has_ultimate;

  IF NOT has_drafts THEN
    RAISE NOTICE 'ℹ️ anuncios_drafts não existe; nada a renomear.';
    RETURN;
  END IF;

  -- Caso A) Só existe anuncios_drafts -> renomear para properties
  IF has_drafts AND NOT has_ultimate THEN
    EXECUTE 'ALTER TABLE public.anuncios_drafts RENAME TO properties';

    -- Renomear índices (se existirem)
    EXECUTE 'ALTER INDEX IF EXISTS idx_drafts_user RENAME TO idx_ultimate_user';
    EXECUTE 'ALTER INDEX IF EXISTS idx_drafts_org RENAME TO idx_ultimate_org';
    EXECUTE 'ALTER INDEX IF EXISTS idx_anuncios_drafts_id RENAME TO idx_properties_id';
    EXECUTE 'ALTER INDEX IF EXISTS idx_anuncios_drafts_organization_id RENAME TO idx_properties_organization_id';

    -- Comentário na tabela
    EXECUTE $$COMMENT ON TABLE public.properties IS
      'Tabela principal do sistema Anúncios Ultimate (renomeada de anuncios_drafts em 21/12/2025)'$$;

    RAISE NOTICE '✅ Tabela renomeada: anuncios_drafts → properties';
    RETURN;
  END IF;

  -- Caso B) Existe anuncios_drafts e properties -> resolver conflito sem falhar.
  -- Estratégia: tratar properties como legado (V1), migrar dados faltantes para drafts,
  -- substituir tabela e então manter apenas properties (V2) como canônica.
  IF has_drafts AND has_ultimate THEN
    -- 1) Garantir que anuncios_drafts tem ao menos os dados da V1 (sem sobrescrever IDs já existentes)
    BEGIN
      EXECUTE $$
        INSERT INTO public.anuncios_drafts (
          id,
          organization_id,
          user_id,
          title,
          status,
          completion_percentage,
          data,
          step_completed,
          created_at,
          updated_at
        )
        SELECT
          a.id,
          a.organization_id,
          COALESCE(a.user_id, gen_random_uuid()),
          COALESCE(a.data->>'title', 'Sem título') AS title,
          COALESCE(a.status, 'draft') AS status,
          0 AS completion_percentage,
          a.data,
          0 AS step_completed,
          a.created_at,
          a.updated_at
        FROM public.properties a
        WHERE NOT EXISTS (
          SELECT 1 FROM public.anuncios_drafts d WHERE d.id = a.id
        );
      $$;
    EXCEPTION
      WHEN OTHERS THEN
        -- Em alguns ambientes, a V1 pode não ter user_id/organization_id populados ou drafts pode ter constraints.
        -- Preferimos não falhar a migração inteira; apenas logar.
        RAISE NOTICE '⚠️ Migração de dados properties -> anuncios_drafts falhou e foi ignorada: %', SQLERRM;
    END;

    -- 2) Desvincular FK de anuncios_field_changes (se existir) antes de dropar a V1
    BEGIN
      EXECUTE 'ALTER TABLE IF EXISTS public.anuncios_field_changes DROP CONSTRAINT IF EXISTS anuncios_field_changes_anuncio_id_fkey';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'ℹ️ Não foi possível remover FK de anuncios_field_changes (ignorado): %', SQLERRM;
    END;

    -- 3) Remover tabela legado V1 e renomear drafts -> ultimate
    EXECUTE 'DROP TABLE IF EXISTS public.properties';
    EXECUTE 'ALTER TABLE public.anuncios_drafts RENAME TO properties';

    -- 4) Recriar FK de anuncios_field_changes (se tabela existir)
    BEGIN
      EXECUTE 'ALTER TABLE IF EXISTS public.anuncios_field_changes ADD CONSTRAINT anuncios_field_changes_anuncio_id_fkey FOREIGN KEY (anuncio_id) REFERENCES public.properties(id) ON DELETE CASCADE';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'ℹ️ Não foi possível recriar FK de anuncios_field_changes (ignorado): %', SQLERRM;
    END;

    -- Renomear índices (se existirem)
    EXECUTE 'ALTER INDEX IF EXISTS idx_drafts_user RENAME TO idx_ultimate_user';
    EXECUTE 'ALTER INDEX IF EXISTS idx_drafts_org RENAME TO idx_ultimate_org';
    EXECUTE 'ALTER INDEX IF EXISTS idx_anuncios_drafts_id RENAME TO idx_properties_id';
    EXECUTE 'ALTER INDEX IF EXISTS idx_anuncios_drafts_organization_id RENAME TO idx_properties_organization_id';

    EXECUTE $$COMMENT ON TABLE public.properties IS
      'Tabela principal do sistema Anúncios Ultimate (consolidada em 21/12/2025; legado anuncios_drafts/properties V1 removido)'$$;

    RAISE NOTICE '✅ Conflito resolvido: mantida apenas public.properties (V2).';
  END IF;
END $$;
