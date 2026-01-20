-- Migration: Dashboard do Prestador - Estrutura de Analytics
-- Data: 2025-11-29

-- Garantir tabelas base usadas nas FKs (evita erro em ambientes limpos)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
);

CREATE TABLE IF NOT EXISTS service_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID REFERENCES profiles(id)
);

-- Tabela de Analytics do Prestador
CREATE TABLE IF NOT EXISTS provider_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    service_id UUID REFERENCES service_listings(id) ON DELETE CASCADE,
    
    -- Tipo de métrica
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN (
        'view',
        'click',
        'conversion',
        'proposal_sent',
        'proposal_accepted',
        'proposal_rejected',
        'message_sent',
        'review_received'
    )),
    
    -- Valor da métrica
    metric_value INTEGER DEFAULT 1,
    
    -- Data
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Metadata adicional (JSONB)
    metadata JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(provider_id, service_id, metric_type, date)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_provider_analytics_provider ON provider_analytics(provider_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_provider_analytics_service ON provider_analytics(service_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_provider_analytics_type ON provider_analytics(metric_type);
CREATE INDEX IF NOT EXISTS idx_provider_analytics_date ON provider_analytics(date DESC);

-- Tabela de Visualizações de Serviços
CREATE TABLE IF NOT EXISTS service_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL REFERENCES service_listings(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- NULL se anônimo
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    session_id VARCHAR(255), -- Para tracking de sessão
    referrer VARCHAR(100), -- 'search', 'feed', 'direct', 'marketplace', 'profile'
    ip_address INET, -- Opcional, para analytics
    user_agent TEXT -- Opcional
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_service_views_service ON service_views(service_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_views_viewer ON service_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_service_views_date ON service_views(viewed_at DESC);

-- Tabela de Visualizações de Perfil
CREATE TABLE IF NOT EXISTS profile_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- NULL se anônimo
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    session_id VARCHAR(255),
    referrer VARCHAR(100),
    ip_address INET,
    user_agent TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_profile_views_profile ON profile_views(profile_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer ON profile_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_date ON profile_views(viewed_at DESC);

-- Adicionar colunas em service_listings se não existirem
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_listings' AND column_name = 'total_views'
    ) THEN
        ALTER TABLE service_listings 
        ADD COLUMN total_views INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_listings' AND column_name = 'total_clicks'
    ) THEN
        ALTER TABLE service_listings 
        ADD COLUMN total_clicks INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_listings' AND column_name = 'conversion_rate'
    ) THEN
        ALTER TABLE service_listings 
        ADD COLUMN conversion_rate DECIMAL(5, 2) DEFAULT 0;
    END IF;
END $$;

-- Adicionar colunas em profiles se não existirem
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'total_profile_views'
    ) THEN
        ALTER TABLE profiles 
        ADD COLUMN total_profile_views INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'total_impressions'
    ) THEN
        ALTER TABLE profiles 
        ADD COLUMN total_impressions INTEGER DEFAULT 0;
    END IF;
END $$;

-- RLS
ALTER TABLE provider_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

-- Políticas para provider_analytics
DROP POLICY IF EXISTS "Providers can view own analytics" ON provider_analytics;
CREATE POLICY "Providers can view own analytics"
    ON provider_analytics FOR SELECT
    USING (auth.uid() = provider_id);

DROP POLICY IF EXISTS "System can insert analytics" ON provider_analytics;
CREATE POLICY "System can insert analytics"
    ON provider_analytics FOR INSERT
    WITH CHECK (true);

-- Políticas para service_views
DROP POLICY IF EXISTS "Anyone can view service views" ON service_views;
CREATE POLICY "Anyone can view service views"
    ON service_views FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "System can insert service views" ON service_views;
CREATE POLICY "System can insert service views"
    ON service_views FOR INSERT
    WITH CHECK (true);

-- Políticas para profile_views
DROP POLICY IF EXISTS "Users can view own profile views" ON profile_views;
CREATE POLICY "Users can view own profile views"
    ON profile_views FOR SELECT
    USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "System can insert profile views" ON profile_views;
CREATE POLICY "System can insert profile views"
    ON profile_views FOR INSERT
    WITH CHECK (true);

-- Função para registrar visualização de serviço
CREATE OR REPLACE FUNCTION track_service_view(
    p_service_id UUID,
    p_viewer_id UUID DEFAULT NULL,
    p_referrer VARCHAR DEFAULT 'direct'
) RETURNS UUID AS $$
DECLARE
    v_view_id UUID;
    v_provider_id UUID;
BEGIN
    -- Buscar provider do serviço
    SELECT provider_id INTO v_provider_id
    FROM service_listings
    WHERE id = p_service_id;
    
    IF v_provider_id IS NULL THEN
        RAISE EXCEPTION 'Serviço não encontrado';
    END IF;
    
    -- Inserir visualização
    INSERT INTO service_views (service_id, viewer_id, referrer)
    VALUES (p_service_id, p_viewer_id, p_referrer)
    RETURNING id INTO v_view_id;
    
    -- Atualizar contador no serviço
    UPDATE service_listings
    SET total_views = total_views + 1
    WHERE id = p_service_id;
    
    -- Registrar no analytics do provider
    INSERT INTO provider_analytics (provider_id, service_id, metric_type, metric_value, date)
    VALUES (v_provider_id, p_service_id, 'view', 1, CURRENT_DATE)
    ON CONFLICT (provider_id, service_id, metric_type, date)
    DO UPDATE SET metric_value = provider_analytics.metric_value + 1;
    
    RETURN v_view_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para registrar visualização de perfil
CREATE OR REPLACE FUNCTION track_profile_view(
    p_profile_id UUID,
    p_viewer_id UUID DEFAULT NULL,
    p_referrer VARCHAR DEFAULT 'direct'
) RETURNS UUID AS $$
DECLARE
    v_view_id UUID;
BEGIN
    -- Não registrar se o próprio usuário estiver vendo seu perfil
    IF p_viewer_id = p_profile_id THEN
        RETURN NULL;
    END IF;
    
    -- Inserir visualização
    INSERT INTO profile_views (profile_id, viewer_id, referrer)
    VALUES (p_profile_id, p_viewer_id, p_referrer)
    RETURNING id INTO v_view_id;
    
    -- Atualizar contador no perfil
    UPDATE profiles
    SET total_profile_views = total_profile_views + 1
    WHERE id = p_profile_id;
    
    RETURN v_view_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE provider_analytics IS 'Analytics agregados para prestadores';
COMMENT ON TABLE service_views IS 'Visualizações individuais de serviços';
COMMENT ON TABLE profile_views IS 'Visualizações individuais de perfis';
COMMENT ON FUNCTION track_service_view IS 'Registra visualização de serviço e atualiza contadores';
COMMENT ON FUNCTION track_profile_view IS 'Registra visualização de perfil e atualiza contadores';
