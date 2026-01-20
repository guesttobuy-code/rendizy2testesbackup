#!/usr/bin/env pwsh

# Substituir 'psql' diretamente com supabase password

# Obter connection string do supabase
$projectRef = "odcgnzfremrqnvtitpcc"
$databasePassword = "NeQz2VCbvYDMIiLZ"  # Você pode ter isso em .env

# Usar supabase CLI para conectar e executar SQL
Write-Host "🔧 Executando SQL para corrigir RPC..." -ForegroundColor Yellow

$sqlScript = @"
DROP FUNCTION IF EXISTS public.save_anuncio_field CASCADE;

CREATE OR REPLACE FUNCTION public.save_anuncio_field(
  p_anuncio_id uuid,
  p_field text,
  p_value jsonb,
  p_idempotency_key text DEFAULT NULL,
  p_organization_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
) RETURNS TABLE(id uuid, data jsonb) AS \$$
DECLARE
  v_existing_annuncio uuid;
  v_id uuid;
BEGIN
  -- Idempotency short-circuit
  IF p_idempotency_key IS NOT NULL THEN
    SELECT anuncio_id INTO v_existing_annuncio FROM public.anuncios_field_changes WHERE idempotency_key = p_idempotency_key LIMIT 1;
    IF FOUND THEN
      RETURN QUERY SELECT properties.id, properties.data FROM public.properties WHERE properties.id = v_existing_annuncio;
      RETURN;
    END IF;
  END IF;

  -- Create or update anuncio atomically
  IF p_anuncio_id IS NULL THEN
    INSERT INTO public.properties (organization_id, user_id, data) VALUES (p_organization_id, p_user_id, jsonb_build_object(p_field, p_value)) RETURNING public.properties.id INTO v_id;
  ELSE
    v_id := p_anuncio_id;
    UPDATE public.properties
      SET data = jsonb_set(coalesce(data, '{}'::jsonb), ARRAY[p_field], p_value, true)
      WHERE id = v_id;
    IF NOT FOUND THEN
      INSERT INTO public.properties (id, organization_id, user_id, data) VALUES (v_id, p_organization_id, p_user_id, jsonb_build_object(p_field, p_value));
    END IF;
  END IF;

  -- Insert change log, ignore duplicate idempotency keys
  INSERT INTO public.anuncios_field_changes (anuncio_id, field, value, idempotency_key)
    VALUES (v_id, p_field, p_value, p_idempotency_key)
    ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN QUERY SELECT properties.id, properties.data FROM public.properties WHERE properties.id = v_id;
END;
\$$ LANGUAGE plpgsql SECURITY DEFINER;
"@

$sqlScript | Out-File -FilePath "fix_rpc_temp.sql" -Encoding UTF8

# Usar supabase database connect
Write-Host "📌 Tentando via supabase CLI..." -ForegroundColor Cyan
npx supabase db execute < fix_rpc_temp.sql 2>&1

# Limpar arquivo temporário
Remove-Item "fix_rpc_temp.sql" -Force
