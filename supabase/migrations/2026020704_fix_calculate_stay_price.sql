-- ============================================================================
-- FIX: calculate_stay_price - usar preco_base da property, não do rate_plan
-- ============================================================================

-- Recriar função calculate_stay_price corrigida
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
  v_adjustment_value NUMERIC(12,2);
  v_adjustment_type TEXT;
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
  
  -- Buscar moeda e preço BASE da PROPRIEDADE (não do rate_plan!)
  SELECT 
    COALESCE((p.data->>'moeda')::TEXT, 'BRL'),
    COALESCE((p.data->>'preco_base_noite')::NUMERIC(12,2), 0)
  INTO v_currency, v_base_price
  FROM properties p
  WHERE p.id = p_property_id;
  
  -- Se não tem preço base, retornar nulo
  IF v_base_price IS NULL OR v_base_price = 0 THEN
    RAISE WARNING 'calculate_stay_price: Preço base não configurado para property_id=%', p_property_id;
    RETURN NULL;
  END IF;
  
  -- Buscar ajuste do rate_plan (se houver)
  SELECT rp.price_adjustment_type, rp.price_adjustment_value
  INTO v_adjustment_type, v_adjustment_value
  FROM rate_plans rp
  WHERE rp.id = v_rate_plan_id;
  
  -- Iterar sobre cada noite da estadia (check_in até check_out-1)
  v_current_date := p_check_in;
  
  WHILE v_current_date < p_check_out LOOP
    -- Começar com preço base
    v_nightly_price := v_base_price;
    v_has_override := false;
    
    -- Aplicar ajuste do rate_plan (se percentual)
    IF v_adjustment_type = 'percentage' AND v_adjustment_value IS NOT NULL AND v_adjustment_value != 0 THEN
      v_nightly_price := v_nightly_price * (1 + v_adjustment_value / 100);
      v_has_override := true;
    ELSIF v_adjustment_type = 'fixed' AND v_adjustment_value IS NOT NULL THEN
      v_nightly_price := v_nightly_price + v_adjustment_value;
      v_has_override := true;
    END IF;
    
    -- Verificar se há override de preço para esta data específica
    DECLARE
      v_override_adj_type TEXT;
      v_override_adj_value NUMERIC(12,2);
    BEGIN
      SELECT rpo.price_adjustment_type, rpo.price_adjustment_value
      INTO v_override_adj_type, v_override_adj_value
      FROM rate_plan_pricing_overrides rpo
      WHERE rpo.rate_plan_id = v_rate_plan_id
        AND rpo.is_active = true
        AND v_current_date >= rpo.date_from
        AND v_current_date <= rpo.date_to
      ORDER BY rpo.created_at DESC  -- pegar o mais recente se houver múltiplos
      LIMIT 1;
      
      IF v_override_adj_value IS NOT NULL THEN
        IF v_override_adj_type = 'percentage' THEN
          v_nightly_price := v_base_price * (1 + v_override_adj_value / 100);
        ELSIF v_override_adj_type = 'fixed' THEN
          v_nightly_price := v_base_price + v_override_adj_value;
        ELSIF v_override_adj_type = 'absolute' THEN
          v_nightly_price := v_override_adj_value;
        END IF;
        v_has_override := true;
      END IF;
    END;
    
    -- Acumular total
    v_total_price := v_total_price + v_nightly_price;
    v_nights_count := v_nights_count + 1;
    
    -- Adicionar ao breakdown
    v_price_breakdown := v_price_breakdown || jsonb_build_object(
      'date', v_current_date::TEXT,
      'price', ROUND(v_nightly_price, 2),
      'has_override', v_has_override,
      'source', CASE WHEN v_has_override THEN 'override' ELSE 'base' END
    );
    
    -- Próximo dia
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;
  
  -- Montar resultado
  v_result.total_price := ROUND(v_total_price, 2);
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

-- Recriar wrapper simplificado
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
