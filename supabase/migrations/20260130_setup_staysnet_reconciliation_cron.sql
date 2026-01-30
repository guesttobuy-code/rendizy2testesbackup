-- ============================================================================
-- Migration: Configurar pg_cron para importação automática de reservas faltantes
-- ============================================================================
-- 
-- PROBLEMA RESOLVIDO:
-- - Webhooks podem falhar e reservas nunca chegam ao Rendizy
-- - Reservas criadas próximo ao check-in podem ser perdidas
-- - Status pode ficar incorreto (bug do 'cancelled' vs 'canceled')
-- 
-- SOLUÇÃO:
-- CRON diário que busca reservas por:
-- 1. Data de check-in (arrival) - próximos 14 dias
-- 2. Data de criação (creation) - últimas 72h
-- 
-- @version 1.0.0 - 2026-01-30
-- ============================================================================

-- Habilitar extensão pg_cron (se não existir)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- JOB 1: Reconciliação completa (verifica existentes + importa faltantes)
-- Executa às 05:00 BRT (08:00 UTC) diariamente
-- ============================================================================

-- Remover job existente se houver
SELECT cron.unschedule('staysnet-reconciliation-daily')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'staysnet-reconciliation-daily'
);

-- Criar novo job
SELECT cron.schedule(
  'staysnet-reconciliation-daily',
  '0 8 * * *', -- 08:00 UTC = 05:00 BRT
  $$
  SELECT net.http_post(
    url := 'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/cron/staysnet-reservations-reconcile',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.settings.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================================
-- JOB 2: Importação de faltantes (mais frequente, a cada 6h)
-- Para pegar reservas de última hora
-- ============================================================================

-- Remover job existente se houver
SELECT cron.unschedule('staysnet-import-missing-6h')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'staysnet-import-missing-6h'
);

-- Criar novo job - executa às 02:00, 08:00, 14:00, 20:00 UTC
SELECT cron.schedule(
  'staysnet-import-missing-6h',
  '0 2,8,14,20 * * *', -- A cada 6 horas
  $$
  SELECT net.http_post(
    url := 'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/cron/staysnet-import-missing',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.settings.cron_secret', true)
    ),
    body := '{"daysAhead": 7, "daysBack": 1}'::jsonb
  );
  $$
);

-- ============================================================================
-- VERIFICAÇÃO: Listar jobs configurados
-- ============================================================================

SELECT 
  jobid,
  jobname,
  schedule,
  active,
  database
FROM cron.job
WHERE jobname LIKE 'staysnet%'
ORDER BY jobname;

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - gerencia CRONs de sincronização Stays.net';

-- ============================================================================
-- NOTAS DE IMPLEMENTAÇÃO
-- ============================================================================
-- 
-- Para executar manualmente os jobs:
-- 
-- 1. Reconciliação completa:
--    POST /functions/v1/rendizy-server/cron/staysnet-reservations-reconcile
-- 
-- 2. Importar faltantes:
--    POST /functions/v1/rendizy-server/cron/staysnet-import-missing
--    Query params: daysAhead=14, daysBack=3
-- 
-- Para verificar logs:
--    SELECT * FROM cron.job_run_details WHERE jobid IN (
--      SELECT jobid FROM cron.job WHERE jobname LIKE 'staysnet%'
--    ) ORDER BY start_time DESC LIMIT 20;
-- 
-- ============================================================================
