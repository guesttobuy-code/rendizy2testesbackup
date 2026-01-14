-- ============================================================================
-- FIX: save_anuncio_batch → usar properties (canônico)
-- Data: 2026-01-03
--
-- Contexto:
-- - O projeto consolidou a tabela canônica como public.properties.
-- - Migrações antigas criaram/renomearam anuncios_drafts → properties,
--   mas as RPCs (save_anuncio_batch) ainda referenciavam anuncios_drafts.
-- - Resultado: save_anuncio_field/save-field quebram (404/500, sem persistência).
--
-- Objetivo:
-- - Tornar save_anuncio_batch independente de anuncios_drafts.
-- - Manter idempotência via anuncios_field_changes.idempotency_key.
-- - Persistir alterações no JSONB properties.data (com suporte a path "a.b.c").
-- ============================================================================

-- Assinatura antiga (V2) usava (uuid, jsonb, uuid, uuid)
DROP FUNCTION IF EXISTS public.save_anuncio_batch(uuid, jsonb, uuid, uuid);

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

  -- Criar ou recuperar anúncio
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
      INSERT INTO public.anuncios_field_changes (anuncio_id, field, value, idempotency_key, created_at)
        VALUES (v_id, v_field, v_value, v_idem_key, v_now)
        ON CONFLICT (idempotency_key) DO NOTHING;

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
  '[CANÔNICO] Batch save em properties.data com idempotência (anuncios_field_changes)';
