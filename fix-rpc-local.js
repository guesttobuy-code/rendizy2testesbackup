const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

console.log('🔧 Corrigindo RPC save_anuncio_field...\n');

// SQL para corrigir a RPC
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

// Salvar em arquivo temporário
const tempFile = path.join(process.cwd(), '_fix_rpc_temp.sql');
fs.writeFileSync(tempFile, fixSql, 'utf8');

console.log('📝 Arquivo SQL criado: ' + tempFile);
console.log('\n⏳ Executando via supabase CLI...\n');

// Executar via supabase db execute
const result = spawnSync('npx', ['supabase', 'db', 'execute', '--local'], {
  input: fs.readFileSync(tempFile, 'utf8'),
  encoding: 'utf8',
  stdio: ['pipe', 'pipe', 'pipe']
});

console.log('STDOUT:\n', result.stdout || '(vazio)');
if (result.stderr) console.log('STDERR:\n', result.stderr);

// Limpar arquivo temporário
fs.unlinkSync(tempFile);

if (result.status === 0) {
  console.log('\n✅ RPC corrigida com sucesso!');
} else {
  console.log('\n❌ Erro ao corrigir RPC (código: ' + result.status + ')');
  console.log('\nTentando método alternativo: execute diretamente...');
  
  // Salvar SQL em arquivo e tentar por Supabase
  const migrationFile = path.join(process.cwd(), 'supabase/migrations/20251212_rpc_save_anuncio_field_FIXED.sql');
  fs.writeFileSync(migrationFile, fixSql, 'utf8');
  console.log('\n💾 SQL salvo em: ' + migrationFile);
  console.log('📌 Execute manualmente via Supabase Dashboard: SQL Editor');
}
