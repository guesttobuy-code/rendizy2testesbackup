-- ============================================================================
-- RENDIZY - MIGRATE CALENDAR PRICING RULES TO RATE PLAN SYSTEM
-- Migração: 2026020702  
-- Data: 2026-02-07
-- Objetivo: Migrar dados de calendar_pricing_rules para rate_plan_pricing_overrides
-- ============================================================================
-- CONTEXTO:
-- calendar_pricing_rules usa:
--   - condition_percent: ajuste de % sobre preço base
--   - min_nights: mínimo de noites
--   - restriction: 'no_checkin', 'no_checkout', 'blocked', etc
--
-- rate_plan_pricing_overrides + rate_plan_availability usam:
--   - price_adjustment_type + price_adjustment_value para %
--   - min_nights no override
--   - closed_to_arrival, closed_to_departure, stop_sell para restrições
--
-- Ver: ROADMAP_INTEGRACAO_CHANNEX_2026_02.md seção "ARQUITETURA RATE PLANS"
-- ============================================================================

BEGIN;

-- ============================================================================
-- PARTE 1: Migrar regras de PREÇO (condition_percent != 0)
-- Para rate_plan_pricing_overrides
-- ============================================================================

INSERT INTO rate_plan_pricing_overrides (
  rate_plan_id,
  date_from,
  date_to,
  override_type,
  price_adjustment_type,
  price_adjustment_value,
  min_nights,
  reason,
  is_active,
  created_at
)
SELECT 
  rp.id AS rate_plan_id,
  cpr.start_date AS date_from,
  cpr.end_date AS date_to,
  'adjustment' AS override_type,
  'percentage' AS price_adjustment_type,
  cpr.condition_percent AS price_adjustment_value,
  cpr.min_nights,
  'Migrado de calendar_pricing_rules' AS reason,
  true AS is_active,
  NOW() AS created_at
FROM calendar_pricing_rules cpr
INNER JOIN rate_plans rp ON rp.property_id = cpr.property_id AND rp.code = 'STANDARD'
WHERE cpr.condition_percent IS NOT NULL 
  AND cpr.condition_percent != 0
  AND NOT EXISTS (
    SELECT 1 FROM rate_plan_pricing_overrides rpo
    WHERE rpo.rate_plan_id = rp.id
      AND rpo.date_from = cpr.start_date
      AND rpo.date_to = cpr.end_date
  );

-- ============================================================================
-- PARTE 2: Migrar RESTRIÇÕES (restriction != NULL)
-- Para rate_plan_availability por dia
-- ============================================================================

-- Função auxiliar para expandir date range em dias individuais
CREATE OR REPLACE FUNCTION expand_date_range(start_date DATE, end_date DATE)
RETURNS TABLE(date DATE) AS $$
BEGIN
  RETURN QUERY
  SELECT generate_series(start_date, end_date, '1 day'::interval)::DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Inserir availability records para restrições
INSERT INTO rate_plan_availability (
  rate_plan_id,
  property_id,
  date,
  closed_to_arrival,
  closed_to_departure,
  stop_sell,
  is_closed,
  min_nights,
  created_at
)
SELECT DISTINCT ON (rp.id, d.date)
  rp.id AS rate_plan_id,
  cpr.property_id,
  d.date,
  -- closed_to_arrival se restriction = 'no_checkin'
  (cpr.restriction = 'no_checkin' OR cpr.restriction = 'closed_to_arrival') AS closed_to_arrival,
  -- closed_to_departure se restriction = 'no_checkout'
  (cpr.restriction = 'no_checkout' OR cpr.restriction = 'closed_to_departure') AS closed_to_departure,
  -- stop_sell se restriction = 'stop_sell'
  (cpr.restriction = 'stop_sell') AS stop_sell,
  -- is_closed se restriction = 'blocked' ou 'closed'
  (cpr.restriction = 'blocked' OR cpr.restriction = 'closed') AS is_closed,
  cpr.min_nights,
  NOW() AS created_at
FROM calendar_pricing_rules cpr
INNER JOIN rate_plans rp ON rp.property_id = cpr.property_id AND rp.code = 'STANDARD'
CROSS JOIN LATERAL expand_date_range(cpr.start_date, cpr.end_date) AS d(date)
WHERE cpr.restriction IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM rate_plan_availability rpa
    WHERE rpa.rate_plan_id = rp.id
      AND rpa.property_id = cpr.property_id
      AND rpa.date = d.date
  );

-- ============================================================================
-- PARTE 3: Migrar regras de min_nights SEM condition_percent
-- (só min_nights, sem ajuste de preço)
-- ============================================================================

INSERT INTO rate_plan_availability (
  rate_plan_id,
  property_id,
  date,
  min_nights,
  created_at
)
SELECT DISTINCT ON (rp.id, d.date)
  rp.id AS rate_plan_id,
  cpr.property_id,
  d.date,
  cpr.min_nights,
  NOW() AS created_at
FROM calendar_pricing_rules cpr
INNER JOIN rate_plans rp ON rp.property_id = cpr.property_id AND rp.code = 'STANDARD'
CROSS JOIN LATERAL expand_date_range(cpr.start_date, cpr.end_date) AS d(date)
WHERE cpr.min_nights IS NOT NULL
  AND cpr.min_nights > 1  -- Só se min_nights específico
  AND (cpr.condition_percent IS NULL OR cpr.condition_percent = 0)
  AND cpr.restriction IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM rate_plan_availability rpa
    WHERE rpa.rate_plan_id = rp.id
      AND rpa.property_id = cpr.property_id
      AND rpa.date = d.date
  );

-- ============================================================================
-- PARTE 4: Marcar calendar_pricing_rules como migradas
-- Adicionar coluna para tracking (se não existir)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calendar_pricing_rules' AND column_name = 'migrated_to_rate_plans'
  ) THEN
    ALTER TABLE calendar_pricing_rules ADD COLUMN migrated_to_rate_plans BOOLEAN DEFAULT false;
    ALTER TABLE calendar_pricing_rules ADD COLUMN migrated_at TIMESTAMPTZ;
  END IF;
END $$;

-- Marcar todas as rules que foram migradas
UPDATE calendar_pricing_rules
SET migrated_to_rate_plans = true,
    migrated_at = NOW()
WHERE id IN (
  SELECT cpr.id
  FROM calendar_pricing_rules cpr
  INNER JOIN rate_plans rp ON rp.property_id = cpr.property_id AND rp.code = 'STANDARD'
);

-- ============================================================================
-- PARTE 5: Log de migração
-- ============================================================================

DO $$
DECLARE
  count_overrides INTEGER;
  count_availability INTEGER;
  count_migrated INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_overrides FROM rate_plan_pricing_overrides WHERE reason = 'Migrado de calendar_pricing_rules';
  SELECT COUNT(*) INTO count_availability FROM rate_plan_availability WHERE created_at > NOW() - INTERVAL '1 minute';
  SELECT COUNT(*) INTO count_migrated FROM calendar_pricing_rules WHERE migrated_to_rate_plans = true;
  
  RAISE NOTICE '=== MIGRAÇÃO CALENDAR_PRICING_RULES CONCLUÍDA ===';
  RAISE NOTICE 'Rate plan pricing overrides criados: %', count_overrides;
  RAISE NOTICE 'Rate plan availability records criados: %', count_availability;
  RAISE NOTICE 'Calendar pricing rules marcadas como migradas: %', count_migrated;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICAÇÃO PÓS-MIGRAÇÃO
-- ============================================================================
-- Execute para verificar:
-- SELECT COUNT(*) FROM rate_plan_pricing_overrides WHERE reason = 'Migrado de calendar_pricing_rules';
-- SELECT COUNT(*) FROM rate_plan_availability;
-- SELECT COUNT(*) FROM calendar_pricing_rules WHERE migrated_to_rate_plans = true;
-- ============================================================================
