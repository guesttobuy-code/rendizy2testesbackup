import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://odcgnzfremrqnvtitpcc.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM1NDE3MSwiZXhwIjoyMDc3OTMwMTcxfQ.VHFenB49fLdgSUH-j9DUKgNgrWbcNjhCodhMtEa-rfE'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  db: { schema: 'public' }
})

// SQL para corrigir a RPC
const fixSql = `
DROP FUNCTION IF EXISTS public.save_anuncio_field CASCADE;

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
`

async function main() {
  console.log('🔧 Corrigindo RPC save_anuncio_field...\n')
  
  try {
    // Executar SQL direto
    const { data, error } = await supabase.rpc('exec_sql_direct', {
      sql: fixSql
    }).catch(async () => {
      // Fallback: tentar via REST SQL endpoint (Deno)
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql_direct`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql: fixSql })
      })
      
      const text = await res.text()
      console.log(`Status: ${res.status}`)
      console.log(`Response: ${text}`)
      
      return null
    })
    
    if (error) {
      console.log('❌ Erro ao executar SQL:', error)
      // Tentar método alternativo
      console.log('\n📋 Método alternativo: usar supabase sql via terminal')
      process.exit(1)
    } else {
      console.log('✅ RPC corrigida com sucesso!')
    }
  } catch (err) {
    console.error('❌ Erro:', err.message)
    process.exit(1)
  }
}

main()
