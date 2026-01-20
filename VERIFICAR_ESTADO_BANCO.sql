-- ============================================================================
-- SCRIPT DE VERIFICAÇÃO - ESTADO DO BANCO DE DADOS
-- ============================================================================
-- Execute este script no Supabase Dashboard → SQL Editor
-- Para verificar quais tabelas existem e seu estado
-- ============================================================================

-- 1. VERIFICAR TABELAS CRÍTICAS
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('users', 'sessions', 'evolution_contacts', 'conversations', 'messages') 
    THEN '✅ CRÍTICA'
    ELSE '📋 Normal'
  END as importancia,
  (SELECT COUNT(*) 
   FROM information_schema.columns 
   WHERE table_schema = 'public' 
     AND table_name = t.table_name) as colunas
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN (
    'users', 
    'sessions', 
    'evolution_contacts', 
    'conversations', 
    'messages',
    'organizations',
    'properties',
    'reservations',
    'guests'
  )
ORDER BY 
  CASE 
    WHEN table_name IN ('users', 'sessions', 'evolution_contacts', 'conversations', 'messages') 
    THEN 1 
    ELSE 2 
  END,
  table_name;

-- 2. VERIFICAR DADOS EM TABELAS CRÍTICAS
SELECT 'users' as tabela, COUNT(*) as registros FROM users
UNION ALL
SELECT 'sessions', COUNT(*) FROM sessions
UNION ALL
SELECT 'evolution_contacts', COUNT(*) FROM evolution_contacts
UNION ALL
SELECT 'conversations', COUNT(*) FROM conversations
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'organizations', COUNT(*) FROM organizations;

-- 3. VERIFICAR ÍNDICES (performance)
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('users', 'sessions', 'evolution_contacts', 'conversations', 'messages')
ORDER BY tablename, indexname;

-- 4. VERIFICAR CONSTRAINTS (integridade)
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('users', 'sessions', 'evolution_contacts', 'conversations', 'messages')
ORDER BY tc.table_name, tc.constraint_type;

