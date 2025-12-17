const https = require('https');
const url = require('url');

const SUPABASE_URL = 'https://odcgnzfremrqnvtitpcc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM1NDE3MSwiZXhwIjoyMDc3OTMwMTcxfQ.VHFenB49fLdgSUH-j9DUKgNgrWbcNjhCodhMtEa-rfE';

const fixSql = `DROP FUNCTION IF EXISTS public.save_anuncio_field CASCADE;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;`;

async function executeViaPyth() {
  console.log('🔧 Tentando executar SQL via Python (postgres)...\n');
  
  // Tentar via um wrapper simples:
  // Salvar SQL em arquivo e abrir instrução
  const fs = require('fs');
  const path = require('path');
  
  const sqlFile = path.join(process.cwd(), 'FIX_RPC_MANUAL.sql');
  fs.writeFileSync(sqlFile, fixSql, 'utf8');
  
  console.log('✅ SQL salvo em: ' + sqlFile);
  console.log('\n📋 COMO EXECUTAR MANUALMENTE:\n');
  console.log('1. Abra: https://app.supabase.com/project/odcgnzfremrqnvtitpcc/sql/new');
  console.log('2. Cole o conteúdo do arquivo FIX_RPC_MANUAL.sql');
  console.log('3. Clique em "Run"');
  console.log('\nOu use psql:');
  console.log('psql "postgresql://postgres.<project>:<password>@<host>:5432/postgres" < FIX_RPC_MANUAL.sql');
}

executeViaPyth();
