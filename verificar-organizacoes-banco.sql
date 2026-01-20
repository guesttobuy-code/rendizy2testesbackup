-- ============================================================================
-- SCRIPT DE VERIFICAÇÃO: Organizações no Banco de Dados
-- Execute este script no Supabase SQL Editor para verificar se os dados existem
-- ============================================================================

-- 1. Verificar se a tabela organizations existe
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name = 'organizations';

-- 2. Contar total de organizações
SELECT 
  COUNT(*) as total_organizations
FROM organizations;

-- 3. Listar TODAS as organizações (sem filtros)
SELECT 
  id,
  name,
  slug,
  email,
  plan,
  status,
  created_at,
  updated_at
FROM organizations
ORDER BY created_at DESC;

-- 4. Verificar RLS (Row Level Security) na tabela
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'organizations';

-- 5. Listar políticas RLS da tabela organizations
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'organizations';

-- 6. Verificar se há dados no KV Store (caso ainda estejam lá)
SELECT 
  key,
  value->>'name' as name,
  value->>'slug' as slug,
  value->>'email' as email
FROM kv_store_67caf26a
WHERE key LIKE 'org:%'
ORDER BY key;

