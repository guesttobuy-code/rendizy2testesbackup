-- ============================================================================
-- SETUP CRON: Sincronização de Propriedades Stays.net (2x ao dia)
-- ============================================================================
-- Execute este SQL no Supabase SQL Editor para configurar o CRON
--
-- O CRON roda às 08:00 e 20:00 BRT (11:00 e 23:00 UTC)
-- para importar automaticamente novas propriedades da Stays.net
-- ============================================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remover CRONs antigos se existirem (ignora erro se não existir)
DO $$
BEGIN
  PERFORM cron.unschedule('staysnet-properties-sync-morning');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Job staysnet-properties-sync-morning não existe, ignorando...';
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('staysnet-properties-sync-evening');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Job staysnet-properties-sync-evening não existe, ignorando...';
END $$;

-- CRON 1: Manhã - 08:00 BRT (11:00 UTC)
SELECT cron.schedule(
  'staysnet-properties-sync-morning',
  '0 11 * * *',  -- 11:00 UTC = 08:00 BRT
  $$
  SELECT net.http_post(
    url := 'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/staysnet-properties-sync-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- CRON 2: Noite - 20:00 BRT (23:00 UTC)
SELECT cron.schedule(
  'staysnet-properties-sync-evening',
  '0 23 * * *',  -- 23:00 UTC = 20:00 BRT
  $$
  SELECT net.http_post(
    url := 'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/staysnet-properties-sync-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Verificar CRONs configurados
SELECT jobid, jobname, schedule, command 
FROM cron.job 
WHERE jobname LIKE 'staysnet-properties%';
