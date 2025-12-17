-- ============================================================================
-- WRAPPER: save_anuncio_field (Compatibilidade V1 → V2)
-- ============================================================================
-- Esta função mantém compatibilidade com frontend V1 enquanto usa backend V2
-- Converte chamada de campo único em batch de 1 item para save_anuncio_batch

-- Dropar função antiga se existir (pode ter assinatura diferente)
DROP FUNCTION IF EXISTS public.save_anuncio_field(uuid, text, text, text, uuid, uuid);
DROP FUNCTION IF EXISTS public.save_anuncio_field(text, text, uuid, text);
DROP FUNCTION IF EXISTS public.save_anuncio_field(uuid, text, jsonb, text);
DROP FUNCTION IF EXISTS public.save_anuncio_field CASCADE;

CREATE OR REPLACE FUNCTION public.save_anuncio_field(
  p_anuncio_id uuid DEFAULT NULL,
  p_field text DEFAULT NULL,
  p_value text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_organization_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_changes jsonb;
BEGIN
  -- Validação básica
  IF p_field IS NULL THEN
    RAISE EXCEPTION 'field is required';
  END IF;

  -- Converte campo único em array de changes para save_anuncio_batch
  v_changes := jsonb_build_array(
    jsonb_build_object(
      'field', p_field,
      'value', p_value,
      'idempotency_key', COALESCE(p_idempotency_key, p_field || '-' || extract(epoch from now())::text)
    )
  );

  -- Chama função V2 com batch de 1 item
  v_result := save_anuncio_batch(
    p_anuncio_id := p_anuncio_id,
    p_changes := v_changes,
    p_organization_id := p_organization_id,
    p_user_id := p_user_id
  );

  -- Retorna resultado no formato esperado pelo frontend
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION save_anuncio_field IS 
'[WRAPPER V1→V2] Mantém compatibilidade com frontend antigo, converte campo único em batch';
