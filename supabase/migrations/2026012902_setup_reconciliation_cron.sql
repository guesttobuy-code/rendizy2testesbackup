-- =============================================================================
-- MIGRATION: Configurar pg_cron para Reconciliação de Reservas
-- =============================================================================
-- Agenda o job de reconciliação para rodar às 03:00 BRT (06:00 UTC) diariamente
-- =============================================================================
-- 
-- ⚠️ NOTA IMPORTANTE: No Supabase hospedado, pg_cron deve ser configurado via Dashboard!
-- 
-- PASSOS PARA CONFIGURAR MANUALMENTE:
-- 1. Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/integrations/cron
-- 2. Clique em "Create a new cron job"
-- 3. Configure:
--    - Name: rendizy-staysnet-reservations-reconcile
--    - Schedule: 0 6 * * * (06:00 UTC = 03:00 BRT)
--    - Type: Edge Function
--    - Edge Function: rendizy-server
--    - HTTP Method: POST
--    - HTTP Headers: {"Content-Type": "application/json"}
--    - Body: {}
--    - Endpoint Path: /cron/staysnet-reservations-reconcile
--
-- OU via SQL Editor (requer ser superuser/owner):
-- SELECT cron.schedule(
--   'rendizy-staysnet-reservations-reconcile',
--   '0 6 * * *',
--   $$SELECT net.http_post(
--     url := 'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/cron/staysnet-reservations-reconcile',
--     headers := '{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
--     body := '{}'::jsonb
--   )$$
-- );
-- =============================================================================

-- Esta migration apenas documenta a configuração necessária
-- A criação do cron job deve ser feita via Dashboard do Supabase

DO $$
BEGIN
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '📅 RECONCILIAÇÃO DE RESERVAS - CONFIGURAÇÃO DE CRON';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Para configurar o cron job, acesse o Dashboard do Supabase:';
  RAISE NOTICE 'https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/integrations/cron';
  RAISE NOTICE '';
  RAISE NOTICE 'Configuração:';
  RAISE NOTICE '  - Name: rendizy-staysnet-reservations-reconcile';
  RAISE NOTICE '  - Schedule: 0 6 * * * (06:00 UTC = 03:00 BRT)';
  RAISE NOTICE '  - Type: Edge Function';
  RAISE NOTICE '  - Function: rendizy-server';
  RAISE NOTICE '  - Method: POST';
  RAISE NOTICE '  - Path: /cron/staysnet-reservations-reconcile';
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;
