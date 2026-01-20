-- ============================================================================
-- CRON JOB: Monitoramento WhatsApp Contínuo (VERSÃO SIMPLIFICADA)
-- Data: 20/11/2025
-- Versão: v1.0.103.970
-- ============================================================================
-- 
-- Este SQL cria um cron job que monitora a conexão WhatsApp a cada 30 segundos
-- Garante que a conexão seja verificada e reconectada automaticamente se cair
--
-- ============================================================================

-- PASSO 1: Ativar extensão pg_cron (se ainda não estiver ativada)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- PASSO 2: Criar cron job para monitoramento contínuo
-- Se já existir, será recriado (sobrescrever)
SELECT cron.schedule(
  'monitor-whatsapp-connection',
  '*/30 * * * * *',
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

-- PASSO 3: Verificar se foi criado com sucesso
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  nodename,
  nodeport,
  database,
  username
FROM cron.job
WHERE jobname = 'monitor-whatsapp-connection';

