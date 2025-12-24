import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY (configure in .env.local).')
}

async function executeSQL(sql) {
  console.log('🔧 Executando SQL para corrigir RPC...\n')
  
  try {
    // Tentar via POST /rest/v1/sql (PostgreSQL direct)
    const res = await fetch(`${SUPABASE_URL}/rest/v1/sql`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    })
    
    const text = await res.text()
    console.log(`HTTP Status: ${res.status}`)
    console.log(`Response: ${text}`)
    
    if (res.status >= 200 && res.status < 300) {
      console.log('\n✅ RPC corrigida com sucesso!')
      return true
    } else {
      console.log('\n❌ Erro ao corrigir RPC')
      return false
    }
  } catch (err) {
    console.error('❌ Erro:', err.message)
    return false
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
$$ LANGUAGE plpgsql SECURITY DEFINER;`

executeSQL(fixSql)
