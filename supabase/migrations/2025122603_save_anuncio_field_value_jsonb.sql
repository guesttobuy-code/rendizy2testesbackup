-- ============================================================================
-- FIX: save_anuncio_field p_value as JSONB (not TEXT)
-- ============================================================================
-- Motivation:
-- - Importers (ex.: StaysNet listings/properties) need to persist objects/arrays
--   like externalIds, fotos, publicDescription as real JSONB, not JSON strings.
-- - The previous wrapper used p_value TEXT and forwarded it to save_anuncio_batch
--   as a JSONB string, causing jsonb_set to store a string instead of an object.
--
-- Compatibility:
-- - JSON strings and plain strings still work (they become JSONB strings)
-- - Numbers/booleans sent by clients remain typed (JSONB number/bool)

-- Drop any previous signatures
DROP FUNCTION IF EXISTS public.save_anuncio_field(uuid, text, text, text, uuid, uuid);
DROP FUNCTION IF EXISTS public.save_anuncio_field(uuid, text, jsonb, text, uuid, uuid);
DROP FUNCTION IF EXISTS public.save_anuncio_field(uuid, text, jsonb, text);
DROP FUNCTION IF EXISTS public.save_anuncio_field(text, text, uuid, text);
DROP FUNCTION IF EXISTS public.save_anuncio_field CASCADE;

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

COMMENT ON FUNCTION save_anuncio_field IS
'[WRAPPER V1→V2] p_value as JSONB to persist objects/arrays correctly; forwards to save_anuncio_batch';
