-- ============================================================================
-- DIAGNÓSTICO: Encontrar TODAS as referências a anuncios_ultimate no banco
-- Execute no Supabase SQL Editor
-- ============================================================================

-- 1. Funções que referenciam anuncios_ultimate
SELECT 
  proname as function_name,
  pg_get_function_identity_arguments(oid) as args
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND prosrc ILIKE '%anuncios_ultimate%';

-- 2. Views que referenciam anuncios_ultimate
SELECT 
  viewname,
  LEFT(definition, 300) as definition_preview
FROM pg_views
WHERE schemaname = 'public'
  AND definition ILIKE '%anuncios_ultimate%';

-- 3. Policies RLS que referenciam anuncios_ultimate
SELECT 
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual::text ILIKE '%anuncios_ultimate%' OR with_check::text ILIKE '%anuncios_ultimate%');

-- 4. Triggers com funções que referenciam anuncios_ultimate
SELECT DISTINCT
  t.tgname as trigger_name,
  c.relname as on_table,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relnamespace = 'public'::regnamespace
  AND p.prosrc ILIKE '%anuncios_ultimate%';

-- 5. Tabelas que existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('anuncios_ultimate', 'properties');
