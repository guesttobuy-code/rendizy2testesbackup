-- Add base_price to calendar_pricing_rules for per-day base pricing
ALTER TABLE calendar_pricing_rules
  ADD COLUMN IF NOT EXISTS base_price NUMERIC(12,2) DEFAULT NULL;

COMMENT ON COLUMN calendar_pricing_rules.base_price IS 'Preço base da diária para a data/período';
