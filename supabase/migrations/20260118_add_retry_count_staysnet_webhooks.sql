-- Migration: Add retry_count column to staysnet_webhooks
-- Date: 2026-01-18
-- Purpose: Enable retry mechanism for failed webhooks (max 3 retries)

-- Add retry_count column if not exists
ALTER TABLE staysnet_webhooks 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Add index for retry queries
CREATE INDEX IF NOT EXISTS idx_staysnet_webhooks_retry 
ON staysnet_webhooks(retry_count, processed_at) 
WHERE error_message IS NOT NULL;

-- Comment
COMMENT ON COLUMN staysnet_webhooks.retry_count IS 'Number of retry attempts for failed webhook processing';
