-- ============================================================================
-- QUERY DE DIAGNÓSTICO: Listar todas as funções relacionadas a anuncios/properties
-- Execute no Supabase SQL Editor para ver o estado atual
-- ============================================================================

-- 1. Listar TODAS as funções com "anuncio" ou "properties" no nome
SELECT 
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as definition_preview
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    p.proname LIKE '%anuncio%' 
    OR p.proname LIKE '%properties%'
    OR p.proname LIKE '%property%'
    OR p.proname LIKE '%completion%'
    OR p.proname LIKE '%version%'
    OR p.proname LIKE '%publish%'
  )
ORDER BY p.proname;

-- 2. Verificar se tabelas antigas ainda existem
SELECT table_name, 
       CASE 
         WHEN table_name = 'properties' THEN '✓ CANONICAL'
         WHEN table_name IN ('anuncios_ultimate', 'anuncios_drafts') THEN '⚠ OLD NAME'
         ELSE '○'
       END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('properties', 'anuncios_ultimate', 'anuncios_drafts', 'anuncios_field_changes', 'anuncios_versions');

-- 3. Ver o corpo das funções save_anuncio_* para verificar qual tabela usam
SELECT 
  p.proname as function_name,
  CASE 
    WHEN prosrc LIKE '%anuncios_drafts%' THEN '⚠ USA anuncios_drafts'
    WHEN prosrc LIKE '%anuncios_ultimate%' THEN '⚠ USA anuncios_ultimate'
    WHEN prosrc LIKE '%public.properties%' THEN '✓ USA properties'
    ELSE '?'
  END as tabela_usada,
  pg_get_function_identity_arguments(p.oid) as args
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('save_anuncio_field', 'save_anuncio_batch', 'update_completion_percentage', 
                    'create_version_snapshot', 'restore_version', 'publish_anuncio', 'retry_failed_changes');
