-- VERIFICAR: Histórico de Execuções do Cron Job
-- Execute este SQL para ver se o cron job está rodando

-- 1. Ver últimas 10 execuções
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

