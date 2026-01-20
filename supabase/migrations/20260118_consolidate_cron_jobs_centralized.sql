-- ============================================================================
-- MIGRAÇÃO: Consolidar Cron Jobs para Arquitetura Centralizada
-- Data: 18/01/2026
-- Projeto: Rendizy
-- ADR: docs/ADR_EDGE_FUNCTIONS_ARQUITETURA_CENTRALIZADA.md
-- ============================================================================
-- 
-- OBJETIVO:
-- Atualizar cron jobs para usar URLs centralizadas em rendizy-server
-- ao invés de Edge Functions separadas (deprecated).
--
-- MUDANÇAS:
-- OLD: /functions/v1/staysnet-properties-sync-cron
-- NEW: /functions/v1/rendizy-server/cron/staysnet-properties-sync
--
-- OLD: /functions/v1/staysnet-webhooks-cron
-- NEW: /functions/v1/rendizy-server/cron/staysnet-webhooks
--
-- ============================================================================

-- ============================================================================
-- 1. REMOVER CRON JOBS ANTIGOS (se existirem)
-- ============================================================================

-- Remover jobs de properties sync antigos
SELECT cron.unschedule('staysnet-properties-sync-morning') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'staysnet-properties-sync-morning');

SELECT cron.unschedule('staysnet-properties-sync-evening')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'staysnet-properties-sync-evening');

-- Remover jobs de webhooks antigos
SELECT cron.unschedule('staysnet-webhooks-process')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'staysnet-webhooks-process');

-- ============================================================================
-- 2. CRIAR NOVOS CRON JOBS (URLs Centralizadas)
-- ============================================================================

-- Sync de propriedades: 08:00 BRT (11:00 UTC)
SELECT cron.schedule(
  'rendizy-staysnet-properties-sync-morning',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/cron/staysnet-properties-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Sync de propriedades: 20:00 BRT (23:00 UTC)
SELECT cron.schedule(
  'rendizy-staysnet-properties-sync-evening',
  '0 23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/cron/staysnet-properties-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Processar webhooks pendentes: a cada 5 minutos
SELECT cron.schedule(
  'rendizy-staysnet-webhooks-process',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/cron/staysnet-webhooks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================================
-- 3. VERIFICAR JOBS CRIADOS
-- ============================================================================

-- Listar todos os jobs do Rendizy
SELECT jobname, schedule, command 
FROM cron.job 
WHERE jobname LIKE 'rendizy-%'
ORDER BY jobname;

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================
