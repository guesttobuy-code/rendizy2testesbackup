-- ================================================================
-- EXECUTE ESTE SQL NO SUPABASE SQL EDITOR
-- https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql/new
-- ================================================================

-- 1. Adicionar coluna retry_count
ALTER TABLE staysnet_webhooks 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- 2. Criar índice para queries de retry
CREATE INDEX IF NOT EXISTS idx_staysnet_webhooks_retry 
ON staysnet_webhooks(retry_count, processed_at) 
WHERE error_message IS NOT NULL;

-- 3. Comentário
COMMENT ON COLUMN staysnet_webhooks.retry_count IS 'Number of retry attempts for failed webhook processing';

-- Verificar que foi aplicado
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'staysnet_webhooks' 
AND column_name = 'retry_count';
