-- ============================================================================
-- RENDIZY - ADD CLEANING FEE TO PRICE CALCULATION
-- Migração: 2026020705
-- Data: 2026-02-06
-- Objetivo: Incluir taxa de limpeza na composição de preço final
-- ============================================================================
-- REGRA: Taxa de limpeza é SEMPRE inclusa na primeira diária
-- Exemplo: 7 noites × R$200 = R$1.400 + R$130 (taxa_limpeza) = R$1.530
-- ============================================================================

-- Drop todas as variantes da função para recriar com taxa de limpeza
DROP FUNCTION IF EXISTS calculate_stay_price(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS calculate_stay_price(UUID, DATE, DATE, TEXT);
DROP FUNCTION IF EXISTS calculate_stay_price(UUID, DATE, DATE, UUID);

-- Função atualizada com taxa de limpeza
CREATE OR REPLACE FUNCTION calculate_stay_price(
  p_property_id UUID,
  p_checkin DATE,
  p_checkout DATE,
  p_rate_plan_code TEXT DEFAULT 'STANDARD'
)
RETURNS TABLE (
  total_price NUMERIC,
  nightly_rate NUMERIC,
  nights INTEGER,
  cleaning_fee NUMERIC,
  currency TEXT,
  rate_plan_id UUID,
  breakdown JSONB
) AS $$
DECLARE
  v_rate_plan_id UUID;
  v_base_price NUMERIC;
  v_cleaning_fee NUMERIC;
  v_currency TEXT;
  v_nights INTEGER;
  v_total NUMERIC;
  v_adjustment_percent NUMERIC := 0;
  v_breakdown JSONB;
BEGIN
  -- Calcular número de noites
  v_nights := p_checkout - p_checkin;
  
  IF v_nights <= 0 THEN
    RAISE EXCEPTION 'Checkout deve ser após checkin';
  END IF;
  
  -- Buscar rate plan e preço base da propriedade
  SELECT 
    rp.id,
    COALESCE((p.data->>'preco_base_noite')::NUMERIC, 0),
    COALESCE((p.data->>'taxa_limpeza')::NUMERIC, 0),
    COALESCE(p.data->>'moeda', 'BRL')
  INTO v_rate_plan_id, v_base_price, v_cleaning_fee, v_currency
  FROM rate_plans rp
  INNER JOIN properties p ON p.id = rp.property_id
  WHERE rp.property_id = p_property_id
    AND rp.code = p_rate_plan_code
    AND rp.is_active = true;
  
  IF v_rate_plan_id IS NULL THEN
    RAISE EXCEPTION 'Rate plan % não encontrado para property %', p_rate_plan_code, p_property_id;
  END IF;
  
  IF v_base_price = 0 THEN
    RAISE EXCEPTION 'Preço base não configurado para property %', p_property_id;
  END IF;
  
  -- Buscar ajuste de preço do rate plan (se houver)
  -- Ex: NON_REFUNDABLE pode ter -15%
  SELECT COALESCE(rp.price_adjustment_value, 0)
  INTO v_adjustment_percent
  FROM rate_plans rp
  WHERE rp.id = v_rate_plan_id
    AND rp.price_adjustment_type = 'percentage';
  
  -- TODO: Considerar overrides por data (rate_plan_pricing_overrides)
  -- TODO: Considerar descontos por pacote (7d, 14d, 28d)
  
  -- Calcular total: (base × noites) + taxa_limpeza
  v_total := (v_base_price * v_nights) + v_cleaning_fee;
  
  -- Aplicar ajuste percentual do rate plan se houver
  IF v_adjustment_percent != 0 THEN
    v_total := v_total * (1 + v_adjustment_percent / 100);
  END IF;
  
  -- Montar breakdown
  v_breakdown := jsonb_build_object(
    'base_price_per_night', v_base_price,
    'nights', v_nights,
    'accommodation_total', v_base_price * v_nights,
    'cleaning_fee', v_cleaning_fee,
    'rate_plan_adjustment_percent', v_adjustment_percent,
    'currency', v_currency,
    'calculation', format('%s × %s noites = %s + %s (limpeza) = %s', 
      v_base_price, v_nights, v_base_price * v_nights, v_cleaning_fee, v_total)
  );
  
  RETURN QUERY SELECT 
    v_total AS total_price,
    v_base_price AS nightly_rate,
    v_nights AS nights,
    v_cleaning_fee AS cleaning_fee,
    v_currency AS currency,
    v_rate_plan_id AS rate_plan_id,
    v_breakdown AS breakdown;
END;
$$ LANGUAGE plpgsql STABLE;

-- Comentário da função
COMMENT ON FUNCTION calculate_stay_price IS 
'Calcula preço total de estadia incluindo taxa de limpeza.
Taxa de limpeza é SEMPRE somada ao total (inclusa na primeira diária).
Retorna: total_price, nightly_rate, nights, cleaning_fee, currency, rate_plan_id, breakdown';

-- ============================================================================
-- TESTE: João e Gisele - 7 noites
-- Esperado: R$200 × 7 = R$1.400 + R$130 (limpeza) = R$1.530
-- ============================================================================
-- SELECT * FROM calculate_stay_price(
--   'dfe3d5d2-0691-4d64-bee3-e1bcae3ee915'::UUID,
--   '2026-03-01'::DATE,
--   '2026-03-08'::DATE,
--   'STANDARD'
-- );
-- ============================================================================
