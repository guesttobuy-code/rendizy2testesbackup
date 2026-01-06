import { serve } from 'https://deno.land/std@0.201.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
    const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { error } = await client.rpc('exec_sql', {
      p_sql: `DROP FUNCTION IF EXISTS public.save_anuncio_field CASCADE;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;`
    })

    if (error) {
      console.error('RPC error:', error)
      return new Response(JSON.stringify({ error: 'RPC exec_sql failed', details: error }), { status: 500, headers: corsHeaders })
    }

    console.log('✅ RPC corrigida com sucesso!')
    return new Response(JSON.stringify({ ok: true, message: 'RPC corrigida' }), { status: 200, headers: corsHeaders })
  } catch (err: any) {
    console.error('Error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
