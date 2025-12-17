-- ============================================================================
-- CRON JOB: Monitoramento WhatsApp Contínuo
-- Data: 20/11/2025
-- Versão: v1.0.103.970
-- ============================================================================
-- 
-- Este SQL cria um cron job que monitora a conexão WhatsApp a cada 30 segundos
-- Garante que a conexão seja verificada e reconectada automaticamente se cair
--
-- ============================================================================

-- ============================================================================
-- PASSO 1: Ativar extensão pg_cron (se ainda não estiver ativada)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- PASSO 2: Remover cron job existente (se houver)
-- ============================================================================

-- Tentar remover cron job existente (ignorar erro se não existir)
DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('monitor-whatsapp-connection');
    RAISE NOTICE 'Cron job existente removido com sucesso';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Cron job não existe ainda (normal na primeira execução)';
  END;
END $$;

-- ============================================================================
-- PASSO 3: Criar cron job para monitoramento contínuo
-- ============================================================================
-- 
-- IMPORTANTE: Substitua 'YOUR_SERVICE_ROLE_KEY' pela sua Service Role Key
-- Você pode encontrar em: Supabase Dashboard → Settings → API → service_role key
-- 

SELECT cron.schedule(
  'monitor-whatsapp-connection',                    -- Nome do cron job
  '*/30 * * * * *',                                 -- A cada 30 segundos (formato: segundo minuto hora dia mês dia-da-semana)
  $$
  SELECT net.http_post(
    url := 'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/whatsapp/monitor/start',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================================
-- PASSO 4: Verificar se cron job foi criado com sucesso
-- ============================================================================

SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job
WHERE jobname = 'monitor-whatsapp-connection';

-- ============================================================================
-- COMANDOS ÚTEIS PARA GERENCIAR O CRON JOB
-- ============================================================================

-- Ver todos os cron jobs:
-- SELECT * FROM cron.job;

-- Ver histórico de execuções (últimas 10):
-- SELECT 
--   jobid,
--   runid,
--   job_pid,
--   database,
--   username,
--   command,
--   status,
--   return_message,
--   start_time,
--   end_time
-- FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'monitor-whatsapp-connection')
-- ORDER BY start_time DESC
-- LIMIT 10;

-- Parar/Desativar cron job:
-- DO $$
-- BEGIN
--   BEGIN
--     PERFORM cron.unschedule('monitor-whatsapp-connection');
--     RAISE NOTICE 'Cron job removido com sucesso';
--   EXCEPTION
--     WHEN OTHERS THEN
--       RAISE NOTICE 'Cron job não existe';
--   END;
-- END $$;

-- Ativar novamente (recriar):
-- Execute o PASSO 3 novamente

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
--
-- 1. O cron job roda a cada 30 segundos
-- 2. Ele chama o endpoint de monitoramento que já está implementado
-- 3. O monitor verifica a conexão e reconecta automaticamente se cair
-- 4. Você pode ver os logs em: Supabase Dashboard → Edge Functions → Logs
-- 5. Para verificar se está funcionando, execute o PASSO 4
--
-- ============================================================================

