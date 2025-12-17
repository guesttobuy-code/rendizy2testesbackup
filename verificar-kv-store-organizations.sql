-- ============================================================================
-- VERIFICAR: Se há organizações no KV Store (VIOLANDO REGRAS)
-- Execute este script no Supabase SQL Editor
-- ============================================================================

-- Verificar se há dados no KV Store com prefixo "org:"
SELECT 
  '🚨 VIOLAÇÃO DE REGRA: Organizações no KV Store' as verificacao,
  key,
  value->>'name' as name,
  value->>'slug' as slug,
  value->>'email' as email,
  value->>'id' as id
FROM kv_store_67caf26a
WHERE key LIKE 'org:%'
ORDER BY key;

-- Contar quantas organizações estão no KV Store
SELECT 
  'Total de organizações no KV Store (VIOLANDO REGRAS)' as verificacao,
  COUNT(*) as total
FROM kv_store_67caf26a
WHERE key LIKE 'org:%';

-- Comparar: KV Store vs SQL
SELECT 
  'Comparação: KV Store vs SQL' as verificacao,
  (SELECT COUNT(*) FROM kv_store_67caf26a WHERE key LIKE 'org:%') as no_kv_store,
  (SELECT COUNT(*) FROM organizations) as no_sql,
  CASE 
    WHEN (SELECT COUNT(*) FROM kv_store_67caf26a WHERE key LIKE 'org:%') > 0 
    THEN '🚨 VIOLAÇÃO: Há dados no KV Store!'
    ELSE '✅ OK: Nenhum dado no KV Store'
  END as status;

