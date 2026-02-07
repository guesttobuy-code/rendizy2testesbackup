-- ============================================================================
-- RENDIZY - FUNÇÃO CALCULATE_STAY_PRICE
-- Migração: 2026020703  
-- Data: 2026-02-07
-- Objetivo: Calcular preço total da estadia somando preços por dia
-- ============================================================================
-- CONTEXTO:
-- A função calculate_effective_price() retorna o preço de UMA data específica.
-- Esta função itera sobre todas as noites da estadia e soma os preços.
--
-- ARQUITETURA:
-- 1. Recebe: property_id, check_in, check_out, rate_plan_id (opcional)
-- 2. Para cada noite ocupada (check_in até check_out-1), calcula o preço efetivo
-- 3. Retorna: total, array de preços por dia, média, moeda
--
-- Ver: ROADMAP_INTEGRACAO_CHANNEX_2026_02.md seção "ARQUITETURA RATE PLANS"
-- ============================================================================

BEGIN;

-- ============================================================================
-- TIPO DE RETORNO COMPOSTO
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stay_price_result') THEN
    CREATE TYPE stay_price_result AS (
      total_price NUMERIC(12,2),
      average_per_night NUMERIC(12,2),
      nights_count INTEGER,
      currency TEXT,
      rate_plan_id UUID,
      price_breakdown JSONB  -- Array de {date, price, has_override, source}
    );
  END IF;
END $$;

-- ============================================================================
-- FUNÇÃO PRINCIPAL: calculate_stay_price
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_stay_price(
  p_property_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_rate_plan_id UUID DEFAULT NULL
)
RETURNS stay_price_result AS $$
DECLARE
  v_rate_plan_id UUID;
  v_current_date DATE;
  v_nightly_price NUMERIC(12,2);
  v_total_price NUMERIC(12,2) := 0;
  v_nights_count INTEGER := 0;
  v_currency TEXT := 'BRL';
  v_price_breakdown JSONB := '[]'::JSONB;
  v_result stay_price_result;
  v_base_price NUMERIC(12,2);
  v_has_override BOOLEAN;
BEGIN
  -- Obter rate_plan_id (usar STANDARD se não especificado)
  IF p_rate_plan_id IS NULL THEN
    v_rate_plan_id := get_default_rate_plan_id(p_property_id);
  ELSE
    v_rate_plan_id := p_rate_plan_id;
  END IF;
  
  -- Se não encontrou rate_plan, retornar nulo
  IF v_rate_plan_id IS NULL THEN
    RAISE WARNING 'calculate_stay_price: Nenhum rate_plan encontrado para property_id=%', p_property_id;
    RETURN NULL;
  END IF;
  
  -- Buscar moeda da propriedade
  SELECT COALESCE((p.data->>'moeda')::TEXT, 'BRL')
  INTO v_currency
  FROM properties p
  WHERE p.id = p_property_id;
  
  -- Buscar preço base do rate_plan para comparação (detectar overrides)
  SELECT rp.base_price
  INTO v_base_price
  FROM rate_plans rp
  WHERE rp.id = v_rate_plan_id;
  
  -- Iterar sobre cada noite da estadia (check_in até check_out-1)
  -- Em hotelaria: check_in ocupa a noite, check_out não
  v_current_date := p_check_in;
  
  WHILE v_current_date < p_check_out LOOP
    -- Calcular preço efetivo para esta data
    v_nightly_price := calculate_effective_price(p_property_id, v_rate_plan_id, v_current_date);
    
    -- Se retornou 0 ou nulo, usar base_price
    IF v_nightly_price IS NULL OR v_nightly_price = 0 THEN
      v_nightly_price := COALESCE(v_base_price, 0);
    END IF;
    
    -- Verificar se tem override (preço diferente do base)
    v_has_override := (v_nightly_price != v_base_price);
    
    -- Acumular total
    v_total_price := v_total_price + v_nightly_price;
    v_nights_count := v_nights_count + 1;
    
    -- Adicionar ao breakdown
    v_price_breakdown := v_price_breakdown || jsonb_build_object(
      'date', v_current_date::TEXT,
      'price', v_nightly_price,
      'has_override', v_has_override,
      'source', CASE WHEN v_has_override THEN 'override' ELSE 'base' END
    );
    
    -- Próximo dia
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;
  
  -- Montar resultado
  v_result.total_price := v_total_price;
  v_result.average_per_night := CASE 
    WHEN v_nights_count > 0 THEN ROUND(v_total_price / v_nights_count, 2)
    ELSE 0 
  END;
  v_result.nights_count := v_nights_count;
  v_result.currency := v_currency;
  v_result.rate_plan_id := v_rate_plan_id;
  v_result.price_breakdown := v_price_breakdown;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- FUNÇÃO SIMPLIFICADA: get_stay_total_price
-- Retorna apenas o preço total (para queries simples)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_stay_total_price(
  p_property_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_rate_plan_id UUID DEFAULT NULL
)
RETURNS NUMERIC(12,2) AS $$
DECLARE
  v_result stay_price_result;
BEGIN
  v_result := calculate_stay_price(p_property_id, p_check_in, p_check_out, p_rate_plan_id);
  RETURN COALESCE(v_result.total_price, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON FUNCTION calculate_stay_price IS 'Calcula o preço total da estadia somando preços diários do rate_plan. Retorna total, média, breakdown por dia.';
COMMENT ON FUNCTION get_stay_total_price IS 'Wrapper simples que retorna apenas o valor total da estadia.';

-- ============================================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índice composto para otimizar calculate_effective_price por data
CREATE INDEX IF NOT EXISTS idx_rate_plan_pricing_overrides_date_range 
ON rate_plan_pricing_overrides (rate_plan_id, date_from, date_to)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_rate_plan_availability_date
ON rate_plan_availability (rate_plan_id, date);

COMMIT;

-- ============================================================================
-- TESTE
-- ============================================================================
-- Execute para testar:
-- SELECT * FROM calculate_stay_price(
--   'dfe3d5d2-0691-4d64-bee3-e1bcae3ee915'::UUID,  -- João e Gisele
--   '2026-03-01',
--   '2026-03-08'
-- );
--
-- SELECT get_stay_total_price(
--   'dfe3d5d2-0691-4d64-bee3-e1bcae3ee915'::UUID,
--   '2026-03-01',
--   '2026-03-08'
-- );
-- ============================================================================
