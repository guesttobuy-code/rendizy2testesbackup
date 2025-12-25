-- ============================================================================
-- CRON JOB: Processar StaysNet Webhooks (via Edge Function staysnet-webhooks-cron)
-- Data: 25/12/2025
--
-- Como usar:
-- 1) Abra o Supabase Dashboard → SQL Editor
-- 2) Substitua os placeholders abaixo (PROJECT_URL, ANON_KEY e CRON_SECRET)
-- 3) Execute o SQL
--
-- Observações:
-- - Este job usa pg_cron + pg_net para chamar a Edge Function via HTTP.
-- - Recomendado passar ANON KEY (apikey + Authorization).
-- - Se você configurou STAYSNET_CRON_SECRET na Edge Function, passe o header x-cron-secret.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- (Opcional) remover job existente
DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('staysnet-webhooks-cron');
  EXCEPTION WHEN OTHERS THEN
    -- ignore
  END;
END $$;

-- Substitua:
--   <PROJECT_URL> ex: https://odcgnzfremrqnvtitpcc.supabase.co
--   <ANON_KEY>    anon public key do projeto
--   <CRON_SECRET> segredo compartilhado (deve ser igual ao STAYSNET_CRON_SECRET)

SELECT cron.schedule(
  'staysnet-webhooks-cron',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := '<PROJECT_URL>/functions/v1/staysnet-webhooks-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', '<ANON_KEY>',
      'Authorization', 'Bearer ' || '<ANON_KEY>',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body := jsonb_build_object('source', 'pg_cron')
  ) AS request_id;
  $$
);

-- Verificar job
SELECT * FROM cron.job WHERE jobname = 'staysnet-webhooks-cron';
