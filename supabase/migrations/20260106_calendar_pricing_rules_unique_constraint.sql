-- ============================================================
-- Add UNIQUE constraint for upsert on calendar_pricing_rules
-- Required for Edge Function batch upsert to work correctly
-- ============================================================

-- Primeiro, remover duplicatas se existirem (manter a mais recente)
DELETE FROM calendar_pricing_rules a
  USING calendar_pricing_rules b
  WHERE a.organization_id = b.organization_id
    AND a.property_id = b.property_id
    AND a.start_date = b.start_date
    AND a.end_date = b.end_date
    AND a.id < b.id;

-- Criar índice único para permitir upsert (ON CONFLICT)
-- Supabase exige índice único, não apenas constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_pricing_rules_unique_entry
  ON calendar_pricing_rules (organization_id, property_id, start_date, end_date)
  WHERE property_id IS NOT NULL;

-- Índice separado para regras globais (property_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_pricing_rules_unique_global
  ON calendar_pricing_rules (organization_id, start_date, end_date)
  WHERE property_id IS NULL;

-- Comentário explicativo
COMMENT ON INDEX idx_calendar_pricing_rules_unique_entry IS 'Unique constraint for upsert: one rule per property/date range';
COMMENT ON INDEX idx_calendar_pricing_rules_unique_global IS 'Unique constraint for global rules: one rule per org/date range';
