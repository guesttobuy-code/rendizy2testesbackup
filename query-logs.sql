-- ============================================================================
-- QUERIES ÚTEIS: Consultar Logs de Edge Functions
-- ============================================================================
-- Use estas queries no Supabase Dashboard → SQL Editor
-- ============================================================================

-- ============================================================================
-- 1️⃣ ÚLTIMOS ERROS (últimas 2 horas)
-- ============================================================================
SELECT 
  id,
  function_name,
  level,
  message,
  metadata,
  created_at
FROM function_logs
WHERE level = 'error'
  AND created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC
LIMIT 50;

-- ============================================================================
-- 2️⃣ TENTATIVAS DE LOGIN (hoje)
-- ============================================================================
SELECT 
  id,
  function_name,
  level,
  message,
  metadata->>'username' as username,
  metadata->>'type' as user_type,
  created_at
FROM function_logs
WHERE function_name LIKE '%auth/login%'
  AND created_at > CURRENT_DATE
ORDER BY created_at DESC
LIMIT 100;

-- ============================================================================
-- 3️⃣ LOGINS BEM-SUCEDIDOS vs FALHAS (últimas 24h)
-- ============================================================================
SELECT 
  level,
  COUNT(*) as total,
  MIN(created_at) as primeiro,
  MAX(created_at) as ultimo
FROM function_logs
WHERE function_name LIKE '%auth/login%'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY level
ORDER BY total DESC;

-- ============================================================================
-- 4️⃣ ERROS POR FUNÇÃO (últimas 24h)
-- ============================================================================
SELECT 
  function_name,
  COUNT(*) as total_erros,
  COUNT(DISTINCT DATE(created_at)) as dias_com_erro,
  MIN(created_at) as primeiro_erro,
  MAX(created_at) as ultimo_erro
FROM function_logs
WHERE level = 'error'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY function_name
ORDER BY total_erros DESC;

-- ============================================================================
-- 5️⃣ ÚLTIMOS 100 LOGS (todas as funções)
-- ============================================================================
SELECT 
  function_name,
  level,
  message,
  created_at,
  CASE 
    WHEN level = 'error' THEN '🔴'
    WHEN level = 'warning' THEN '🟡'
    WHEN level = 'info' THEN '🔵'
    ELSE '⚪'
  END as emoji
FROM function_logs
ORDER BY created_at DESC
LIMIT 100;

-- ============================================================================
-- 6️⃣ BUSCAR LOGS ESPECÍFICOS (por texto na mensagem)
-- ============================================================================
-- Substitua 'SEU_TEXTO' pelo que você quer buscar
SELECT *
FROM function_logs
WHERE message ILIKE '%SEU_TEXTO%'
   OR (metadata::text) ILIKE '%SEU_TEXTO%'
ORDER BY created_at DESC
LIMIT 50;

-- ============================================================================
-- 7️⃣ ERROS COM STACK TRACE (últimas 2 horas)
-- ============================================================================
SELECT 
  function_name,
  message,
  metadata->>'stack' as stack_trace,
  created_at
FROM function_logs
WHERE level = 'error'
  AND metadata->>'stack' IS NOT NULL
  AND created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================================
-- 8️⃣ LIMPAR LOGS ANTIGOS (manutenção)
-- ============================================================================
-- ATENÇÃO: Execute apenas se quiser limpar logs antigos
-- DELETE FROM function_logs
-- WHERE created_at < NOW() - INTERVAL '30 days';

-- ============================================================================
-- 9️⃣ ESTATÍSTICAS GERAIS (últimas 24h)
-- ============================================================================
SELECT 
  level,
  COUNT(*) as total,
  COUNT(DISTINCT function_name) as funcoes_afetadas,
  MIN(created_at) as primeiro,
  MAX(created_at) as ultimo
FROM function_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY level
ORDER BY total DESC;

