-- ============================================================================
-- Add payment_methods field to stripe_configs and pagarme_configs
-- 
-- This allows each gateway to specify which payment methods are enabled:
-- - stripe: ["credit_card", "pix", "boleto", "paypal"]
-- - pagarme: ["credit_card", "pix", "boleto"]
--
-- This enables multi-gateway checkout where user can select payment method
-- and backend routes to the correct gateway.
-- ============================================================================

-- Add payment_methods to stripe_configs
ALTER TABLE stripe_configs 
ADD COLUMN IF NOT EXISTS payment_methods JSONB NOT NULL DEFAULT '["credit_card"]'::jsonb;

-- Add payment_methods to pagarme_configs
ALTER TABLE pagarme_configs 
ADD COLUMN IF NOT EXISTS payment_methods JSONB NOT NULL DEFAULT '["pix", "boleto"]'::jsonb;

-- Add priority field for fallback order (lower = higher priority)
ALTER TABLE stripe_configs 
ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 1;

ALTER TABLE pagarme_configs 
ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 2;

-- Comments for documentation
COMMENT ON COLUMN stripe_configs.payment_methods IS 'Array of enabled payment methods: credit_card, pix, boleto, paypal';
COMMENT ON COLUMN pagarme_configs.payment_methods IS 'Array of enabled payment methods: credit_card, pix, boleto';
COMMENT ON COLUMN stripe_configs.priority IS 'Priority for gateway selection (lower = higher priority)';
COMMENT ON COLUMN pagarme_configs.priority IS 'Priority for gateway selection (lower = higher priority)';
