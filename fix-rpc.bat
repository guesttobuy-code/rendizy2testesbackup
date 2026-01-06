@echo off
REM Criar arquivo SQL com a correção
(
echo DROP FUNCTION IF EXISTS public.save_anuncio_field CASCADE;
echo.
echo CREATE OR REPLACE FUNCTION public.save_anuncio_field(
echo   p_anuncio_id uuid,
echo   p_field text,
echo   p_value jsonb,
echo   p_idempotency_key text DEFAULT NULL,
echo   p_organization_id uuid DEFAULT NULL,
echo   p_user_id uuid DEFAULT NULL
echo ) RETURNS TABLE(id uuid, data jsonb) AS $$
echo DECLARE
echo   v_existing_annuncio uuid;
echo   v_id uuid;
echo BEGIN
echo   -- Idempotency short-circuit
echo   IF p_idempotency_key IS NOT NULL THEN
echo     SELECT anuncio_id INTO v_existing_annuncio FROM public.anuncios_field_changes WHERE idempotency_key = p_idempotency_key LIMIT 1;
echo     IF FOUND THEN
echo       RETURN QUERY SELECT properties.id, properties.data FROM public.properties WHERE properties.id = v_existing_annuncio;
echo       RETURN;
echo     END IF;
echo   END IF;
echo.
echo   -- Create or update anuncio atomically
echo   IF p_anuncio_id IS NULL THEN
echo     INSERT INTO public.properties (organization_id, user_id, data) VALUES (p_organization_id, p_user_id, jsonb_build_object(p_field, p_value)) RETURNING public.properties.id INTO v_id;
echo   ELSE
echo     v_id := p_anuncio_id;
echo     UPDATE public.properties
echo       SET data = jsonb_set(coalesce(data, '{}'::jsonb), ARRAY[p_field], p_value, true)
echo       WHERE id = v_id;
echo     IF NOT FOUND THEN
echo       INSERT INTO public.properties (id, organization_id, user_id, data) VALUES (v_id, p_organization_id, p_user_id, jsonb_build_object(p_field, p_value));
echo     END IF;
echo   END IF;
echo.
echo   -- Insert change log, ignore duplicate idempotency keys
echo   INSERT INTO public.anuncios_field_changes (anuncio_id, field, value, idempotency_key)
echo     VALUES (v_id, p_field, p_value, p_idempotency_key)
echo     ON CONFLICT (idempotency_key) DO NOTHING;
echo.
echo   RETURN QUERY SELECT properties.id, properties.data FROM public.properties WHERE properties.id = v_id;
echo END;
echo $$ LANGUAGE plpgsql SECURITY DEFINER;
) > fix_rpc.sql

echo Executando SQL...
npx supabase db execute < fix_rpc.sql

echo Limpando arquivo temporario...
del fix_rpc.sql
