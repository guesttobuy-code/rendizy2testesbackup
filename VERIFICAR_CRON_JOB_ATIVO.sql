-- ============================================================================
-- VERIFICAR: Cron Job WhatsApp Monitoramento
-- ============================================================================
-- 
-- Execute este SQL para verificar se o cron job está ativo e funcionando
--
-- ============================================================================

-- 1. Verificar se cron job existe e está ativo
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  nodename,
  nodeport,
  database,
  username,
  command
FROM cron.job
WHERE jobname = 'monitor-whatsapp-connection';

-- 2. Ver histórico de execuções (últimas 10)
SELECT 
  runid,
  jobid,
  status,
  return_message,
  start_time,
  end_time,
  (end_time - start_time) AS duration
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'monitor-whatsapp-connection')
ORDER BY start_time DESC
LIMIT 10;

-- 3. Ver todas as execuções hoje
SELECT 
  COUNT(*) AS total_execucoes_hoje,
  COUNT(CASE WHEN status = 'succeeded' THEN 1 END) AS sucessos,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) AS falhas,
  MIN(start_time) AS primeira_execucao,
  MAX(start_time) AS ultima_execucao
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'monitor-whatsapp-connection')
  AND DATE(start_time) = CURRENT_DATE;

