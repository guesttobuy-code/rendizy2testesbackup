-- ============================================================================
-- VERIFICAR: Histórico de Execuções do Cron Job
-- ============================================================================
-- 
-- Execute este SQL para ver se o cron job está rodando e funcionando
--
-- ============================================================================

-- 1. Ver todas as execuções recentes (últimas 10)
SELECT 
  runid,
  status,
  return_message,
  start_time,
  end_time,
  (end_time - start_time) AS duration
FROM cron.job_run_details 
WHERE jobid = 1
ORDER BY start_time DESC
LIMIT 10;

-- 2. Resumo de execuções hoje
SELECT 
  COUNT(*) AS total_execucoes_hoje,
  COUNT(CASE WHEN status = 'succeeded' THEN 1 END) AS sucessos,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) AS falhas,
  MIN(start_time) AS primeira_execucao,
  MAX(start_time) AS ultima_execucao,
  AVG(EXTRACT(EPOCH FROM (end_time - start_time))) AS tempo_medio_segundos
FROM cron.job_run_details 
WHERE jobid = 1
  AND DATE(start_time) = CURRENT_DATE;

-- 3. Ver últimas execuções com detalhes
SELECT 
  runid,
  CASE 
    WHEN status = 'succeeded' THEN '✅ SUCESSO'
    WHEN status = 'failed' THEN '❌ FALHOU'
    ELSE status
  END AS status_formatado,
  return_message,
  TO_CHAR(start_time, 'HH24:MI:SS') AS hora_inicio,
  TO_CHAR(end_time, 'HH24:MI:SS') AS hora_fim,
  EXTRACT(EPOCH FROM (end_time - start_time))::numeric(10,2) AS duracao_segundos
FROM cron.job_run_details 
WHERE jobid = 1
ORDER BY start_time DESC
LIMIT 20;

-- 4. Ver se está executando agora (últimos 2 minutos)
SELECT 
  COUNT(*) AS execucoes_ultimos_2min,
  MAX(start_time) AS ultima_execucao,
  CASE 
    WHEN MAX(start_time) > NOW() - INTERVAL '2 minutes' THEN '✅ RODANDO'
    ELSE '⚠️ PARADO'
  END AS status_atual
FROM cron.job_run_details 
WHERE jobid = 1
  AND start_time > NOW() - INTERVAL '2 minutes';

