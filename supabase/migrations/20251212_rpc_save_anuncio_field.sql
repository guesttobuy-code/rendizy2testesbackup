-- RPC: save_anuncio_field
-- Data: 2025-12-12

/* Função RPC atômica para salvar campo por campo em anuncios_ultimate
   Parâmetros:
     p_anuncio_id uuid | NULL
     p_field text
     p_value jsonb
     p_idempotency_key text | NULL
     p_organization_id uuid | NULL
     p_user_id uuid | NULL

   Comportamento:
   - Se p_idempotency_key já foi processado em anuncios_field_changes, retorna o anúncio existente (id,data).
   - Se p_anuncio_id é NULL, cria um novo anúncio com o campo recebido.
   - Se p_anuncio_id existe, atualiza o JSONB com jsonb_set(..., create_missing := true).
   - Insere um registro em anuncios_field_changes (ON CONFLICT DO NOTHING para idempotency_key).
   - Retorna a linha atualizada/recém-criada de anuncios_ultimate.
*/

CREATE OR REPLACE FUNCTION public.save_anuncio_field(
  p_anuncio_id uuid,
  p_field text,
  p_value jsonb,
  p_idempotency_key text DEFAULT NULL,
  p_organization_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
) RETURNS TABLE(id uuid, data jsonb) AS $$
DECLARE
  v_existing_annuncio uuid;
  v_id uuid;
BEGIN
  -- Idempotency short-circuit
  IF p_idempotency_key IS NOT NULL THEN
    SELECT anuncio_id INTO v_existing_annuncio FROM public.anuncios_field_changes WHERE idempotency_key = p_idempotency_key LIMIT 1;
    IF FOUND THEN
      RETURN QUERY SELECT anuncios_ultimate.id, anuncios_ultimate.data FROM public.anuncios_ultimate WHERE anuncios_ultimate.id = v_existing_annuncio;
      RETURN;
    END IF;
  END IF;

  -- Create or update anuncio atomically
  IF p_anuncio_id IS NULL THEN
    INSERT INTO public.anuncios_ultimate (organization_id, user_id, data) VALUES (p_organization_id, p_user_id, jsonb_build_object(p_field, p_value)) RETURNING public.anuncios_ultimate.id INTO v_id;
  ELSE
    v_id := p_anuncio_id;
    UPDATE public.anuncios_ultimate
      SET data = jsonb_set(coalesce(data, '{}'::jsonb), ARRAY[p_field], p_value, true)
      WHERE id = v_id;
    IF NOT FOUND THEN
      INSERT INTO public.anuncios_ultimate (id, organization_id, user_id, data) VALUES (v_id, p_organization_id, p_user_id, jsonb_build_object(p_field, p_value));
    END IF;
  END IF;

  -- Insert change log, ignore duplicate idempotency keys
  INSERT INTO public.anuncios_field_changes (anuncio_id, field, value, idempotency_key)
    VALUES (v_id, p_field, p_value, p_idempotency_key)
    ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN QUERY SELECT anuncios_ultimate.id, anuncios_ultimate.data FROM public.anuncios_ultimate WHERE anuncios_ultimate.id = v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
