    -- ============================================================================
    -- RENDIZY - RATE PLANS STANDARD AUTO-CREATE
    -- Migração: 2026020701
    -- Data: 2026-02-07
    -- Objetivo: Criar rate_plan STANDARD para todas as properties existentes
    --           e trigger para auto-criar em novas properties
    -- ============================================================================
    -- CONTEXTO:
    -- Esta migração faz parte da unificação dos 3 sistemas de pricing:
    -- 1. Property JSONB (preco_base_noite) - fonte visual do wizard
    -- 2. calendar_pricing_rules - regras de % do calendário (a deprecar)
    -- 3. rate_plans - fonte de verdade para OTAs (esta migração)
    --
    -- Ver: ROADMAP_INTEGRACAO_CHANNEX_2026_02.md seção "ARQUITETURA RATE PLANS"
    -- ============================================================================

    BEGIN;

    -- ============================================================================
    -- PARTE 1: Criar Rate Plan STANDARD para properties existentes
    -- ============================================================================
    -- Insere um rate_plan STANDARD para cada property que ainda não tem um
    -- O rate plan padrão não tem ajuste de preço (price_adjustment_type = 'none')
    -- O preço base vem do properties.data.preco_base_noite via ARI sync
    -- ============================================================================

    INSERT INTO rate_plans (
    organization_id,
    property_id,
    code,
    name_pt,
    name_en,
    description_pt,
    price_adjustment_type,
    price_adjustment_value,
    price_adjustment_currency,
    cancellation_policy_id,
    min_nights,
    is_refundable,
    is_active,
    is_default,
    priority,
    created_at
    )
    SELECT 
    p.organization_id,
    p.id AS property_id,
    'STANDARD' AS code,
    'Tarifa Padrão' AS name_pt,
    'Standard Rate' AS name_en,
    'Tarifa padrão da propriedade. Preço base sem ajustes.' AS description_pt,
    'none' AS price_adjustment_type,
    0 AS price_adjustment_value,
    COALESCE((p.data->>'moeda')::TEXT, 'BRL') AS price_adjustment_currency,
    'flexible' AS cancellation_policy_id,  -- Template padrão
    COALESCE((p.data->>'minimo_noites')::INTEGER, 1) AS min_nights,
    true AS is_refundable,
    true AS is_active,
    true AS is_default,
    0 AS priority,
    NOW() AS created_at
    FROM properties p
    WHERE p.status = 'active'
    AND NOT EXISTS (
        SELECT 1 FROM rate_plans rp 
        WHERE rp.property_id = p.id 
        AND rp.code = 'STANDARD'
    )
    ON CONFLICT (organization_id, property_id, code) DO NOTHING;

    -- Log quantos foram criados
    DO $$
    DECLARE
    count_created INTEGER;
    BEGIN
    SELECT COUNT(*) INTO count_created FROM rate_plans WHERE code = 'STANDARD';
    RAISE NOTICE 'Rate Plans STANDARD criados: %', count_created;
    END $$;

    -- ============================================================================
    -- PARTE 2: Trigger para auto-criar Rate Plan STANDARD em novas properties
    -- ============================================================================

    -- Função que cria rate_plan STANDARD quando property é inserida
    CREATE OR REPLACE FUNCTION create_standard_rate_plan_for_property()
    RETURNS TRIGGER AS $$
    BEGIN
    -- Só criar se não existir ainda
    IF NOT EXISTS (
        SELECT 1 FROM rate_plans 
        WHERE property_id = NEW.id AND code = 'STANDARD'
    ) THEN
        INSERT INTO rate_plans (
        organization_id,
        property_id,
        code,
        name_pt,
        name_en,
        description_pt,
        price_adjustment_type,
        price_adjustment_value,
        price_adjustment_currency,
        cancellation_policy_id,
        min_nights,
        is_refundable,
        is_active,
        is_default,
        priority
        ) VALUES (
        NEW.organization_id,
        NEW.id,
        'STANDARD',
        'Tarifa Padrão',
        'Standard Rate',
        'Tarifa padrão da propriedade. Preço base sem ajustes.',
        'none',
        0,
        COALESCE((NEW.data->>'moeda')::TEXT, 'BRL'),
        'flexible',
        COALESCE((NEW.data->>'minimo_noites')::INTEGER, 1),
        true,
        true,
        true,
        0
        );
    END IF;
    
    RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Trigger after insert em properties
    DROP TRIGGER IF EXISTS trg_create_standard_rate_plan ON properties;
    CREATE TRIGGER trg_create_standard_rate_plan
    AFTER INSERT ON properties
    FOR EACH ROW
    EXECUTE FUNCTION create_standard_rate_plan_for_property();

    -- ============================================================================
    -- PARTE 3: Função para recalcular preço efetivo
    -- ============================================================================
    -- Esta função calcula o preço efetivo para uma data específica
    -- considerando o rate_plan base + overrides + availability
    -- ============================================================================

    CREATE OR REPLACE FUNCTION calculate_effective_price(
    p_property_id UUID,
    p_rate_plan_id UUID,
    p_date DATE
    ) RETURNS DECIMAL(10,2) AS $$
    DECLARE
    v_base_price DECIMAL(10,2);
    v_rate_plan RECORD;
    v_override RECORD;
    v_availability RECORD;
    v_effective_price DECIMAL(10,2);
    BEGIN
    -- 1. Buscar preço base da property (do JSONB)
    SELECT 
        COALESCE((data->>'preco_base_noite')::DECIMAL, 0)
    INTO v_base_price
    FROM properties
    WHERE id = p_property_id;
    
    -- Se não houver preço base, retorna 0
    IF v_base_price IS NULL OR v_base_price = 0 THEN
        RETURN 0;
    END IF;
    
    -- 2. Buscar rate_plan para ver ajustes
    SELECT * INTO v_rate_plan
    FROM rate_plans
    WHERE id = p_rate_plan_id;
    
    -- Aplicar ajuste do rate_plan
    IF v_rate_plan IS NOT NULL THEN
        CASE v_rate_plan.price_adjustment_type
        WHEN 'percentage' THEN
            v_effective_price := v_base_price * (1 + v_rate_plan.price_adjustment_value / 100);
        WHEN 'fixed' THEN
            v_effective_price := v_base_price + v_rate_plan.price_adjustment_value;
        ELSE
            v_effective_price := v_base_price;
        END CASE;
    ELSE
        v_effective_price := v_base_price;
    END IF;
    
    -- 3. Verificar override de período (rate_plan_pricing_overrides)
    SELECT * INTO v_override
    FROM rate_plan_pricing_overrides
    WHERE rate_plan_id = p_rate_plan_id
        AND p_date >= date_from
        AND p_date <= date_to
        AND is_active = true
    ORDER BY date_from DESC
    LIMIT 1;
    
    IF v_override IS NOT NULL THEN
        CASE v_override.override_type
        WHEN 'absolute' THEN
            v_effective_price := v_override.price_value;
        WHEN 'adjustment' THEN
            IF v_override.price_adjustment_type = 'percentage' THEN
            v_effective_price := v_effective_price * (1 + v_override.price_adjustment_value / 100);
            ELSE
            v_effective_price := v_effective_price + v_override.price_adjustment_value;
            END IF;
        WHEN 'closed' THEN
            RETURN 0; -- Fechado para reservas
        END CASE;
    END IF;
    
    -- 4. Verificar override diário (rate_plan_availability)
    SELECT * INTO v_availability
    FROM rate_plan_availability
    WHERE rate_plan_id = p_rate_plan_id
        AND property_id = p_property_id
        AND date = p_date;
    
    IF v_availability IS NOT NULL THEN
        -- Se tem price_override, usa ele
        IF v_availability.price_override IS NOT NULL THEN
        v_effective_price := v_availability.price_override;
        END IF;
        
        -- Se está fechado, retorna 0
        IF v_availability.is_closed OR v_availability.stop_sell THEN
        RETURN 0;
        END IF;
    END IF;
    
    RETURN ROUND(v_effective_price, 2);
    END;
    $$ LANGUAGE plpgsql STABLE;

    COMMENT ON FUNCTION calculate_effective_price(UUID, UUID, DATE) IS 
    'Calcula o preço efetivo para uma data considerando rate_plan + overrides + availability';

    -- ============================================================================
    -- PARTE 4: Helper function para obter rate_plan default de uma property
    -- ============================================================================

    CREATE OR REPLACE FUNCTION get_default_rate_plan_id(p_property_id UUID)
    RETURNS UUID AS $$
    SELECT id FROM rate_plans
    WHERE property_id = p_property_id
        AND is_default = true
        AND is_active = true
    ORDER BY priority ASC
    LIMIT 1;
    $$ LANGUAGE sql STABLE;

    COMMENT ON FUNCTION get_default_rate_plan_id(UUID) IS 
    'Retorna o ID do rate_plan padrão (STANDARD) de uma property';

    -- ============================================================================
    -- PARTE 5: View para facilitar consultas de pricing
    -- ============================================================================

    CREATE OR REPLACE VIEW v_property_pricing AS
    SELECT 
    p.id AS property_id,
    COALESCE((p.data->>'title')::TEXT, 'Sem nome') AS property_name,
    p.organization_id,
    rp.id AS rate_plan_id,
    rp.code AS rate_plan_code,
    rp.name_pt AS rate_plan_name,
    rp.is_default,
    COALESCE((p.data->>'preco_base_noite')::DECIMAL, 0) AS base_price,
    COALESCE((p.data->>'moeda')::TEXT, 'BRL') AS currency,
    rp.price_adjustment_type,
    rp.price_adjustment_value,
    rp.min_nights,
    rp.cancellation_policy_id
    FROM properties p
    LEFT JOIN rate_plans rp ON rp.property_id = p.id AND rp.is_active = true
    WHERE p.status = 'active';

    COMMENT ON VIEW v_property_pricing IS 
    'View que combina property + rate_plans para facilitar consultas de pricing';

    COMMIT;

    -- ============================================================================
    -- VERIFICAÇÃO PÓS-MIGRAÇÃO
    -- ============================================================================
    -- Execute para verificar:
    -- SELECT COUNT(*) as total_properties FROM properties WHERE status = 'active';
    -- SELECT COUNT(*) as total_rate_plans FROM rate_plans WHERE code = 'STANDARD';
    -- SELECT * FROM v_property_pricing WHERE rate_plan_id IS NOT NULL LIMIT 10;
    -- ============================================================================
