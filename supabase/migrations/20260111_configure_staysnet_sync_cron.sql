-- ============================================================
-- 📅 CONFIGURAÇÃO PG_CRON - STAYSNET PROPERTIES SYNC
-- ============================================================
-- Execute este SQL no SQL Editor do Supabase Dashboard
-- https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql
-- ============================================================

-- 1️⃣ Habilitar extensão pg_net (se não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2️⃣ Remover crons antigos (se existirem) - ignora erro se não existir
DO $$
BEGIN
  PERFORM cron.unschedule('staysnet-properties-sync-morning');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Job morning não existia, ignorando...';
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('staysnet-properties-sync-evening');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Job evening não existia, ignorando...';
END $$;

-- 3️⃣ Configurar cron para 08:00 BRT (11:00 UTC)
SELECT cron.schedule(
  'staysnet-properties-sync-morning',
  '0 11 * * *',
  $$
    SELECT net.http_post(
      url := 'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/staysnet-properties-sync-cron',
      body := '{}',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM1NDE3MSwiZXhwIjoyMDc3OTMwMTcxfQ.VHFenB49fLdgSUH-j9DUKgNgrWbcNjhCodhMtEa-rfE'
      )
    );
  $$
);

-- 4️⃣ Configurar cron para 20:00 BRT (23:00 UTC)
SELECT cron.schedule(
  'staysnet-properties-sync-evening',
  '0 23 * * *',
  $$
    SELECT net.http_post(
      url := 'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/staysnet-properties-sync-cron',
      body := '{}',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM1NDE3MSwiZXhwIjoyMDc3OTMwMTcxfQ.VHFenB49fLdgSUH-j9DUKgNgrWbcNjhCodhMtEa-rfE'
      )
    );
  $$
);

-- 5️⃣ Verificar crons configurados
SELECT 
  jobid,
  jobname,
  schedule,
  command
FROM cron.job
WHERE jobname LIKE 'staysnet-properties%';

-- 6️⃣ Ver histórico de execuções
SELECT 
  runid,
  jobid,
  job_pid,
  database,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
