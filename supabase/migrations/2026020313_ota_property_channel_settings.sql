-- ============================================================================
-- Migration 13: Property Channel Settings (Override por Canal por Anúncio)
-- ============================================================================
-- Autor: Copilot
-- Data: 2026-02-03
-- Descrição: Tabela para configurações específicas de cada canal por anúncio
--            Implementa o NÍVEL 3 da triangulação: Global → Anúncio → Canal
-- NOTA: FK para cancellation_policies será adicionada quando a tabela existir
-- ============================================================================

-- Tabela principal: configurações de canal por propriedade
CREATE TABLE IF NOT EXISTS property_channel_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    
    -- Identificação do canal
    channel_code TEXT NOT NULL CHECK (channel_code IN ('airbnb', 'booking', 'expedia', 'decolar', 'vrbo', 'hotelscom')),
    
    -- Status no canal
    status TEXT NOT NULL DEFAULT 'not_connected' CHECK (status IN ('published', 'paused', 'not_connected', 'pending', 'error')),
    external_listing_id TEXT, -- ID do anúncio na OTA
    external_listing_url TEXT, -- URL para "Ver no Canal"
    
    -- ============================================================================
    -- OVERRIDES (null = herda do anúncio/organização)
    -- ============================================================================
    
    -- Política de cancelamento (override) - FK será adicionada depois
    cancellation_policy_id UUID, -- Será FK para cancellation_policies quando existir
    
    -- Preço/Markup
    price_correction_percent NUMERIC(5,2), -- Ex: 5.00 = +5%, -3.00 = -3%
    
    -- Garantia de pagamento
    require_payment_guarantee BOOLEAN, -- null = herda
    
    -- No-show rules
    no_show_rule TEXT CHECK (no_show_rule IS NULL OR no_show_rule IN ('default', 'first_night', 'full_amount', 'custom')),
    no_show_penalty_percent NUMERIC(5,2), -- Se custom, qual %
    
    -- ============================================================================
    -- SINCRONIZAÇÃO
    -- ============================================================================
    sync_photos BOOLEAN DEFAULT true,
    sync_amenities BOOLEAN DEFAULT true,
    sync_content BOOLEAN DEFAULT true,
    sync_prices BOOLEAN DEFAULT true,
    sync_availability BOOLEAN DEFAULT true,
    
    -- ============================================================================
    -- CHECK-IN (override)
    -- ============================================================================
    checkin_time TIME, -- null = herda
    checkout_time TIME, -- null = herda
    checkin_instructions TEXT, -- Instruções específicas para este canal
    checkin_method TEXT CHECK (checkin_method IS NULL OR checkin_method IN ('reception', 'lockbox', 'smart_lock', 'key_handoff', 'self_checkin')),
    
    -- ============================================================================
    -- PROMOÇÕES (específico Booking/Expedia)
    -- ============================================================================
    mobile_promo_enabled BOOLEAN DEFAULT false,
    mobile_promo_percent NUMERIC(5,2) DEFAULT 10.00, -- Mínimo 10% para Booking
    mobile_promo_excluded_periods JSONB DEFAULT '[]', -- Array de {start_date, end_date}
    
    -- ============================================================================
    -- REFEIÇÕES (específico Booking)
    -- ============================================================================
    meal_plan_included JSONB DEFAULT '[]', -- Array de meal_plan_codes
    meal_plan_prices JSONB DEFAULT '{}', -- {meal_plan_code: price}
    
    -- ============================================================================
    -- MAPEAMENTOS ESPECÍFICOS DO CANAL
    -- ============================================================================
    room_type_mappings JSONB DEFAULT '{}', -- {our_room_id: external_room_type_code}
    tax_mappings JSONB DEFAULT '{}', -- {our_tax_id: external_tax_code}
    
    -- ============================================================================
    -- METADADOS
    -- ============================================================================
    last_sync_at TIMESTAMPTZ,
    last_sync_status TEXT,
    last_sync_error TEXT,
    sync_enabled BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    UNIQUE(property_id, channel_code)
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================
CREATE INDEX idx_pcs_organization ON property_channel_settings(organization_id);
CREATE INDEX idx_pcs_property ON property_channel_settings(property_id);
CREATE INDEX idx_pcs_channel ON property_channel_settings(channel_code);
CREATE INDEX idx_pcs_status ON property_channel_settings(status);
CREATE INDEX idx_pcs_property_channel ON property_channel_settings(property_id, channel_code);
CREATE INDEX idx_pcs_sync_enabled ON property_channel_settings(sync_enabled) WHERE sync_enabled = true;

-- ============================================================================
-- TRIGGER: updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_property_channel_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_property_channel_settings_updated_at
    BEFORE UPDATE ON property_channel_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_property_channel_settings_updated_at();

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================
ALTER TABLE property_channel_settings ENABLE ROW LEVEL SECURITY;

-- Policy: usuários só veem settings da sua organização
CREATE POLICY "Users can view own organization channel settings"
    ON property_channel_settings
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Policy: usuários podem inserir na sua organização
CREATE POLICY "Users can insert own organization channel settings"
    ON property_channel_settings
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Policy: usuários podem atualizar na sua organização
CREATE POLICY "Users can update own organization channel settings"
    ON property_channel_settings
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Policy: usuários podem deletar na sua organização
CREATE POLICY "Users can delete own organization channel settings"
    ON property_channel_settings
    FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================
COMMENT ON TABLE property_channel_settings IS 'Configurações específicas de cada canal OTA por anúncio. Implementa o Nível 3 da triangulação: Global (org) → Individual (anúncio) → Por Canal';

COMMENT ON COLUMN property_channel_settings.channel_code IS 'Código do canal: airbnb, booking, expedia, decolar, vrbo, hotelscom';
COMMENT ON COLUMN property_channel_settings.status IS 'Status do anúncio no canal: published, paused, not_connected, pending, error';
COMMENT ON COLUMN property_channel_settings.cancellation_policy_id IS 'Override de política de cancelamento para este canal (null = herda do anúncio/org)';
COMMENT ON COLUMN property_channel_settings.price_correction_percent IS 'Ajuste de preço em % (positivo ou negativo). Ex: 5.00 = +5%';
COMMENT ON COLUMN property_channel_settings.require_payment_guarantee IS 'Exigir garantia de pagamento? (null = herda)';
COMMENT ON COLUMN property_channel_settings.no_show_rule IS 'Regra de no-show: default, first_night, full_amount, custom';
COMMENT ON COLUMN property_channel_settings.mobile_promo_enabled IS 'Ativar promoção para reservas mobile (Booking)';
COMMENT ON COLUMN property_channel_settings.room_type_mappings IS 'Mapeamento de quartos: {our_room_id: external_room_type_code}';
COMMENT ON COLUMN property_channel_settings.tax_mappings IS 'Mapeamento de taxas: {our_tax_id: external_tax_code}';

-- ============================================================================
-- FIM DA MIGRATION 13
-- ============================================================================
