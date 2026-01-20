-- ============================================================================
-- VERIFICAÇÃO COMPLETA: Organizações no Banco de Dados
-- Execute este script no Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- QUERY 1: Verificar se tabela existe
-- ============================================================================
SELECT 
  '1. Tabela existe?' as verificacao,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'organizations'
    ) THEN '✅ SIM'
    ELSE '❌ NÃO'
  END as resultado;

-- ============================================================================
-- QUERY 2: Contar total de organizações
-- ============================================================================
SELECT 
  '2. Total de organizações' as verificacao,
  COUNT(*)::text as resultado
FROM organizations;

-- ============================================================================
-- QUERY 3: Listar TODAS as organizações (sem filtros)
-- ============================================================================
SELECT 
  '3. Lista de organizações' as verificacao,
  id::text as id,
  name,
  slug,
  email,
  plan,
  status,
  created_at::text as created_at
FROM organizations
ORDER BY created_at DESC;

-- ============================================================================
-- QUERY 4: Verificar RLS habilitado
-- ============================================================================
SELECT 
  '4. RLS habilitado?' as verificacao,
  CASE 
    WHEN rowsecurity THEN '✅ SIM'
    ELSE '❌ NÃO'
  END as resultado
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'organizations';

-- ============================================================================
-- QUERY 5: Políticas RLS (você já enviou isso)
-- ============================================================================
SELECT 
  '5. Políticas RLS' as verificacao,
  policyname,
  cmd,
  qual::text as qual_condition
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'organizations';

-- ============================================================================
-- QUERY 6: Verificar KV Store (dados antigos)
-- ============================================================================
SELECT 
  '6. Dados no KV Store (antigo)' as verificacao,
  key,
  value->>'name' as name,
  value->>'slug' as slug,
  value->>'email' as email
FROM kv_store_67caf26a
WHERE key LIKE 'org:%'
ORDER BY key;

-- ============================================================================
-- QUERY 7: Testar acesso com Service Role (simular backend)
-- ============================================================================
-- Esta query deve retornar dados se Service Role Key funcionar
SELECT 
  '7. Teste de acesso (simula backend)' as verificacao,
  COUNT(*)::text as total_encontrado
FROM organizations;

