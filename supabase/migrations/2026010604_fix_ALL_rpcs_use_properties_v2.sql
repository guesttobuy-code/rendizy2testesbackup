-- ============================================================================
-- MIGRATION COMPLETA: Corrigir TODAS as RPCs para usar public.properties
-- Data: 2026-01-06 (v2 - com DROP específico de assinaturas)
--
-- PROBLEMA:
-- - Várias RPCs ainda referenciam public.anuncios_ultimate ou public.anuncios_drafts
-- - Existem múltiplas versões das funções com diferentes assinaturas
-- - Erro: "function name is not unique" ao fazer DROP CASCADE
--
-- SOLUÇÃO:
-- - Dropar TODAS as assinaturas conhecidas de cada função
-- - Recriar usando public.properties (tabela canônica)
-- ============================================================================

-- ============================================================================
-- 1. DROP TODAS AS ASSINATURAS CONHECIDAS DE save_anuncio_field
-- ============================================================================
DROP FUNCTION IF EXISTS public.save_anuncio_field(uuid, text, text, text, uuid, uuid);
DROP FUNCTION IF EXISTS public.save_anuncio_field(uuid, text, jsonb, text, uuid, uuid);
DROP FUNCTION IF EXISTS public.save_anuncio_field(uuid, text, jsonb, text);
DROP FUNCTION IF EXISTS public.save_anuncio_field(text, text, uuid, text);
DROP FUNCTION IF EXISTS public.save_anuncio_field(uuid, uuid, uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.save_anuncio_field(uuid, uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.save_anuncio_field();
-- Tentar DROP genérico por último (pode falhar se ainda houver múltiplas)
DO $$
BEGIN
  EXECUTE 'DROP FUNCTION IF EXISTS public.save_anuncio_field CASCADE';
EXCEPTION WHEN OTHERS THEN
  NULL; -- ignorar erro se falhar
END $$;

-- ============================================================================
-- 2. DROP TODAS AS ASSINATURAS CONHECIDAS DE save_anuncio_batch
-- ============================================================================
DROP FUNCTION IF EXISTS public.save_anuncio_batch(uuid, jsonb, uuid, uuid);
DROP FUNCTION IF EXISTS public.save_anuncio_batch(uuid, jsonb);
DROP FUNCTION IF EXISTS public.save_anuncio_batch();
DO $$
BEGIN
  EXECUTE 'DROP FUNCTION IF EXISTS public.save_anuncio_batch CASCADE';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================================================
-- 3. DROP FUNÇÕES AUXILIARES QUE USAM TABELAS ANTIGAS
-- ============================================================================
DROP FUNCTION IF EXISTS public.update_completion_percentage(uuid);
DROP FUNCTION IF EXISTS public.create_version_snapshot(uuid);
DROP FUNCTION IF EXISTS public.restore_version(uuid);
DROP FUNCTION IF EXISTS public.publish_anuncio(uuid);
DROP FUNCTION IF EXISTS public.retry_failed_changes();

-- ============================================================================
-- 4. RECRIAR save_anuncio_batch (usa properties)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.save_anuncio_batch(
  p_anuncio_id uuid,
  p_changes jsonb, -- array de {field, value, idempotency_key}
  p_organization_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_id uuid;
  v_change jsonb;
  v_applied int := 0;
  v_skipped int := 0;
  v_result jsonb;
  v_now timestamptz := now();
BEGIN
  IF p_changes IS NULL OR jsonb_typeof(p_changes) <> 'array' THEN
    RAISE EXCEPTION 'changes must be a jsonb array';
  END IF;

  -- Multi-tenant: nunca criar/salvar sem organization_id
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required';
  END IF;

  -- Criar ou recuperar imóvel
  IF p_anuncio_id IS NULL THEN
    INSERT INTO public.properties (organization_id, user_id, data, status, created_at, updated_at)
    VALUES (p_organization_id, p_user_id, '{}'::jsonb, 'draft', v_now, v_now)
    RETURNING id INTO v_id;
  ELSE
    v_id := p_anuncio_id;
  END IF;

  -- Processar mudanças em ordem
  FOR v_change IN SELECT * FROM jsonb_array_elements(p_changes) LOOP
    DECLARE
      v_field text := v_change->>'field';
      v_value jsonb := v_change->'value';
      v_idem_key text := v_change->>'idempotency_key';
      v_exists bool;
      v_path text[];
    BEGIN
      IF v_field IS NULL OR length(trim(v_field)) = 0 THEN
        RAISE EXCEPTION 'field is required';
      END IF;

      -- Suporte a path "a.b.c" (padrão simples)
      v_path := string_to_array(v_field, '.');

      -- Checar idempotência
      IF v_idem_key IS NOT NULL AND length(trim(v_idem_key)) > 0 THEN
        SELECT EXISTS(
          SELECT 1 FROM public.anuncios_field_changes c
          WHERE c.idempotency_key = v_idem_key
          LIMIT 1
        ) INTO v_exists;

        IF v_exists THEN
          v_skipped := v_skipped + 1;
          CONTINUE;
        END IF;
      END IF;

      -- Aplicar mudança (somente dentro do tenant)
      UPDATE public.properties
        SET data = jsonb_set(COALESCE(data, '{}'::jsonb), v_path, v_value, true),
            updated_at = v_now,
            user_id = COALESCE(p_user_id, user_id)
      WHERE id = v_id
        AND organization_id = p_organization_id;

      -- Se não existia (ou org não bateu), criar no tenant
      IF NOT FOUND THEN
        INSERT INTO public.properties (id, organization_id, user_id, data, status, created_at, updated_at)
        VALUES (
          v_id,
          p_organization_id,
          p_user_id,
          jsonb_set('{}'::jsonb, v_path, v_value, true),
          'draft',
          v_now,
          v_now
        )
        ON CONFLICT (id) DO UPDATE
          SET data = jsonb_set(COALESCE(public.properties.data, '{}'::jsonb), v_path, v_value, true),
              updated_at = v_now,
              user_id = COALESCE(p_user_id, public.properties.user_id)
          WHERE public.properties.organization_id = p_organization_id;
      END IF;

      -- Logar mudança (idempotência garante reprocessamento seguro)
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'anuncios_field_changes') THEN
        INSERT INTO public.anuncios_field_changes (anuncio_id, field, value, idempotency_key, created_at)
          VALUES (v_id, v_field, v_value, v_idem_key, v_now)
          ON CONFLICT (idempotency_key) DO NOTHING;
      END IF;

      v_applied := v_applied + 1;
    END;
  END LOOP;

  SELECT jsonb_build_object(
    'id', a.id,
    'data', a.data,
    'organization_id', a.organization_id,
    'user_id', a.user_id,
    'status', a.status,
    'updated_at', a.updated_at,
    'changes_applied', v_applied,
    'changes_skipped', v_skipped
  ) INTO v_result
  FROM public.properties a
  WHERE a.id = v_id
    AND a.organization_id = p_organization_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.save_anuncio_batch IS
  '[CANÔNICO 2026-01-06] Batch save em properties.data com idempotência';

-- ============================================================================
-- 5. RECRIAR save_anuncio_field (wrapper → save_anuncio_batch)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.save_anuncio_field(
  p_anuncio_id uuid DEFAULT NULL,
  p_field text DEFAULT NULL,
  p_value jsonb DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_organization_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_changes jsonb;
BEGIN
  IF p_field IS NULL THEN
    RAISE EXCEPTION 'field is required';
  END IF;

  v_changes := jsonb_build_array(
    jsonb_build_object(
      'field', p_field,
      'value', p_value,
      'idempotency_key', COALESCE(p_idempotency_key, p_field || '-' || extract(epoch from now())::text)
    )
  );

  v_result := save_anuncio_batch(
    p_anuncio_id := p_anuncio_id,
    p_changes := v_changes,
    p_organization_id := p_organization_id,
    p_user_id := p_user_id
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.save_anuncio_field IS
  '[CANÔNICO 2026-01-06] Wrapper de campo único para save_anuncio_batch (usa properties)';

-- ============================================================================
-- 6. RECRIAR update_completion_percentage (usa properties)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_completion_percentage(p_anuncio_id uuid)
RETURNS void AS $$
DECLARE
  v_data jsonb;
  v_required_fields text[] := ARRAY[
    'title', 'tipoLocal', 'tipoAcomodacao', 'modalidades',
    'cidade', 'estado', 'endereco',
    'quartos', 'banheiros', 'fotos',
    'description'
  ];
  v_field text;
  v_completed int := 0;
  v_total int := array_length(v_required_fields, 1);
  v_percentage int;
BEGIN
  SELECT data INTO v_data FROM public.properties WHERE id = p_anuncio_id;

  IF v_data IS NULL THEN
    RETURN;
  END IF;

  -- Contar campos preenchidos
  FOREACH v_field IN ARRAY v_required_fields LOOP
    IF v_data ? v_field AND v_data->>v_field IS NOT NULL AND v_data->>v_field != '' AND v_data->>v_field != '[]' THEN
      v_completed := v_completed + 1;
    END IF;
  END LOOP;

  v_percentage := (v_completed * 100) / v_total;

  -- Atualizar status baseado na completude
  UPDATE public.properties
    SET completion_percentage = v_percentage,
        status = CASE
          WHEN v_percentage = 100 THEN 'ready_to_publish'
          WHEN v_percentage >= 50 THEN 'validating'
          ELSE 'draft'
        END
    WHERE id = p_anuncio_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_completion_percentage IS
  '[CANÔNICO 2026-01-06] Atualiza completion_percentage em properties';

-- ============================================================================
-- 7. RECRIAR create_version_snapshot (usa properties)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_version_snapshot(p_anuncio_id uuid)
RETURNS uuid AS $$
DECLARE
  v_current_data jsonb;
  v_current_title text;
  v_last_version int := 0;
  v_new_version int;
  v_version_id uuid;
BEGIN
  -- Recuperar dados atuais da properties
  SELECT data, data->>'title' INTO v_current_data, v_current_title 
  FROM public.properties 
  WHERE id = p_anuncio_id;

  IF v_current_data IS NULL THEN
    RAISE EXCEPTION 'Imóvel não encontrado: %', p_anuncio_id;
  END IF;

  -- Recuperar última versão (se tabela existir)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'anuncios_versions') THEN
    SELECT COALESCE(MAX(version_number), 0) INTO v_last_version
    FROM public.anuncios_versions
    WHERE anuncio_id = p_anuncio_id;

    v_new_version := v_last_version + 1;

    -- Criar snapshot
    INSERT INTO public.anuncios_versions (anuncio_id, version_number, data)
    VALUES (p_anuncio_id, v_new_version, v_current_data)
    RETURNING id INTO v_version_id;
  ELSE
    v_version_id := p_anuncio_id; -- retorna o próprio ID se não há versionamento
  END IF;

  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.create_version_snapshot IS
  '[CANÔNICO 2026-01-06] Cria snapshot de versão de properties';

-- ============================================================================
-- 8. RECRIAR restore_version (usa properties)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.restore_version(p_version_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_version record;
  v_result jsonb;
BEGIN
  -- Verificar se tabela de versões existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'anuncios_versions') THEN
    RAISE EXCEPTION 'Tabela anuncios_versions não existe';
  END IF;

  -- Recuperar versão
  SELECT * INTO v_version FROM public.anuncios_versions WHERE id = p_version_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Versão não encontrada: %', p_version_id;
  END IF;

  -- Restaurar dados em properties
  UPDATE public.properties
    SET data = v_version.data,
        updated_at = now()
    WHERE id = v_version.anuncio_id;

  -- Criar nova versão (snapshot do restore)
  PERFORM create_version_snapshot(v_version.anuncio_id);

  -- Retornar resultado
  SELECT jsonb_build_object(
    'id', id,
    'data', data,
    'updated_at', updated_at
  ) INTO v_result
  FROM public.properties WHERE id = v_version.anuncio_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.restore_version IS
  '[CANÔNICO 2026-01-06] Restaura versão em properties';

-- ============================================================================
-- 9. RECRIAR publish_anuncio (usa properties)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.publish_anuncio(p_draft_id uuid)
RETURNS uuid AS $$
DECLARE
  v_property record;
  v_slug text;
BEGIN
  -- Recuperar do properties
  SELECT * INTO v_property FROM public.properties WHERE id = p_draft_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Imóvel não encontrado: %', p_draft_id;
  END IF;

  IF v_property.completion_percentage < 100 THEN
    RAISE EXCEPTION 'Imóvel incompleto (% %%)', v_property.completion_percentage;
  END IF;

  -- Gerar slug único
  v_slug := lower(regexp_replace(COALESCE(v_property.data->>'title', 'imovel'), '[^a-zA-Z0-9]+', '-', 'g')) 
            || '-' || substring(v_property.id::text from 1 for 8);

  -- Atualizar status para published
  UPDATE public.properties
    SET status = 'published',
        data = data || jsonb_build_object('slug', v_slug),
        updated_at = now()
    WHERE id = p_draft_id;

  RETURN p_draft_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.publish_anuncio IS
  '[CANÔNICO 2026-01-06] Publica imóvel (properties)';

-- ============================================================================
-- 10. RECRIAR retry_failed_changes (usa properties)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.retry_failed_changes()
RETURNS int AS $$
DECLARE
  v_count int := 0;
  v_change record;
BEGIN
  -- Verificar se tabela existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'anuncios_field_changes') THEN
    RETURN 0;
  END IF;

  -- Reprocessar mudanças com status 'failed' ou 'pending'
  FOR v_change IN 
    SELECT * FROM public.anuncios_field_changes 
    WHERE status IN ('pending', 'failed')
    ORDER BY created_at
    LIMIT 100
  LOOP
    BEGIN
      -- Aplicar mudança em properties
      UPDATE public.properties
        SET data = jsonb_set(COALESCE(data, '{}'::jsonb), 
                             string_to_array(v_change.field, '.'), 
                             v_change.value, true),
            updated_at = now()
        WHERE id = v_change.anuncio_id;

      -- Marcar como processado
      UPDATE public.anuncios_field_changes
        SET status = 'applied'
        WHERE id = v_change.id;

      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Marcar como falha
      UPDATE public.anuncios_field_changes
        SET status = 'failed',
            error_message = SQLERRM
        WHERE id = v_change.id;
    END;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.retry_failed_changes IS
  '[CANÔNICO 2026-01-06] Reprocessa mudanças pendentes/falhas para properties';

-- ============================================================================
-- 11. GRANT PERMISSIONS
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.save_anuncio_batch TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_anuncio_batch TO service_role;
GRANT EXECUTE ON FUNCTION public.save_anuncio_field TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_anuncio_field TO service_role;
GRANT EXECUTE ON FUNCTION public.update_completion_percentage TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_completion_percentage TO service_role;
GRANT EXECUTE ON FUNCTION public.create_version_snapshot TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_version_snapshot TO service_role;
GRANT EXECUTE ON FUNCTION public.restore_version TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_version TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_anuncio TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_anuncio TO service_role;
GRANT EXECUTE ON FUNCTION public.retry_failed_changes TO service_role;

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
