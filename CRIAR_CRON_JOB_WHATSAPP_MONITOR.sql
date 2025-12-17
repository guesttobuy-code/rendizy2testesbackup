-- ============================================================================
-- CRON JOB: Monitoramento Contínuo WhatsApp
-- Data: 20/11/2025
-- Versão: v1.0.103.970
-- ============================================================================
-- 
-- Cria cron job para monitorar conexão WhatsApp a cada 30 segundos
-- Mantém conexão estável e reconecta automaticamente se cair
--
-- ============================================================================

-- Passo 1: Ativar extensão pg_cron (se ainda não estiver ativada)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Passo 2: Criar cron job para monitoramento
-- IMPORTANTE: Substitua YOUR_SERVICE_ROLE_KEY pela sua Service Role Key do Supabase
-- Você pode encontrar em: Supabase Dashboard → Settings → API → service_role key
SELECT cron.schedule(
  'monitor-whatsapp-connection',
  '*/30 * * * * *', -- A cada 30 segundos (formato: segundo minuto hora dia mês dia-da-semana)
  $$
  SELECT net.http_post(
    url := 'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/whatsapp/monitor/start',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer SEU_SERVICE_ROLE_KEY_AQUI'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

-- Verificar se cron job foi criado
SELECT jobid, jobname, schedule, active 
FROM cron.job 
WHERE jobname = 'monitor-whatsapp-connection';

-- Ver histórico de execuções (últimas 10)
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'monitor-whatsapp-connection')
ORDER BY start_time DESC
LIMIT 10;

-- ============================================================================
-- GERENCIAMENTO
-- ============================================================================

-- Para PAUSAR o cron job:
-- SELECT cron.unschedule('monitor-whatsapp-connection');

-- Para REATIVAR (criar novamente):
-- Execute novamente o SELECT cron.schedule acima

-- Para ALTERAR intervalo:
-- 1. Execute: SELECT cron.unschedule('monitor-whatsapp-connection');
-- 2. Execute novamente o SELECT cron.schedule com novo intervalo
--    Exemplos:
--    '*/10 * * * * *' = A cada 10 segundos
--    '*/60 * * * * *' = A cada 60 segundos
--    '*/5 * * * * *'  = A cada 5 segundos

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

-- 1. Substitua 'SEU_SERVICE_ROLE_KEY_AQUI' pela sua Service Role Key
--    Encontre em: Supabase Dashboard → Settings → API → service_role key
--
-- 2. O cron job executará automaticamente a cada 30 segundos
--
-- 3. Verifique os logs em: Supabase Dashboard → Edge Functions → Logs
--    Procure por: "[WhatsApp Monitor]"
--
-- 4. Se o cron job não estiver executando, verifique:
--    - Se a extensão pg_cron está ativada
--    - Se a Service Role Key está correta
--    - Se o endpoint está funcionando (teste manualmente primeiro)
--
-- ============================================================================

