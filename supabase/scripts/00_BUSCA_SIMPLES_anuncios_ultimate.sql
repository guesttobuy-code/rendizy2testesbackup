-- ============================================================================
-- DIAGNÓSTICO SIMPLES: Buscar QUALQUER referência a anuncios_ultimate
-- Execute no Supabase SQL Editor
-- ============================================================================

-- 1. Buscar em TODAS as funções
SELECT 
  proname as function_name,
  pg_get_function_identity_arguments(oid) as args
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND prosrc ILIKE '%anuncios_ultimate%';

-- 2. Buscar em TODAS as views
SELECT 
  viewname,
  LEFT(definition, 500) as definition_preview
FROM pg_views
WHERE schemaname = 'public'
  AND definition ILIKE '%anuncios_ultimate%';

-- 3. Buscar em TODAS as policies
SELECT 
  tablename,
  policyname,
  LEFT(qual::text, 300) as qual_preview,
  LEFT(with_check::text, 300) as with_check_preview
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual::text ILIKE '%anuncios_ultimate%' OR with_check::text ILIKE '%anuncios_ultimate%');

-- 4. Buscar em triggers (corpo da função)
SELECT DISTINCT
  t.tgname as trigger_name,
  c.relname as on_table,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relnamespace = 'public'::regnamespace
  AND p.prosrc ILIKE '%anuncios_ultimate%';

-- 5. Buscar em constraints (check constraints)
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
  AND pg_get_constraintdef(oid) ILIKE '%anuncios_ultimate%';

-- 6. Buscar em comentários de tabelas/colunas
SELECT 
  c.relname as table_name,
  d.description
FROM pg_description d
JOIN pg_class c ON d.objoid = c.oid
WHERE c.relnamespace = 'public'::regnamespace
  AND d.description ILIKE '%anuncios_ultimate%';

-- 7. Listar todas as tabelas que existem (para confirmar)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%anuncio%'
ORDER BY table_name;
