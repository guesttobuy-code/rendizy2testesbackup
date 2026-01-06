const https = require('https');
const url = require('url');

require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

function inferProjectRef() {
  if (!SUPABASE_URL) return null;
  try {
    const u = new URL(SUPABASE_URL);
    const host = u.hostname || '';
    const match = host.match(/^([a-z0-9-]+)\.supabase\.co$/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

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
  const projectRef = inferProjectRef() || '<PROJECT_REF>';
  console.log(`1. Abra: https://app.supabase.com/project/${projectRef}/sql/new`);
  console.log('2. Cole o conteúdo do arquivo FIX_RPC_MANUAL.sql');
  console.log('3. Clique em "Run"');
  console.log('\nOu use psql:');
  console.log('psql "postgresql://postgres.<project>:<password>@<host>:5432/postgres" < FIX_RPC_MANUAL.sql');
}

executeViaPyth();
