-- ============================================================================
-- MIGRAÇÃO: Criar tabela listings (Anúncios separados de Properties)
-- Data: 2025-11-17
-- Versão: 1.0.103.400
-- Descrição: Separa anúncios (listings) de unidades físicas (properties)
--            Segue padrão Airbnb: 1 Property pode ter múltiplos Listings
-- ============================================================================

-- ============================================================================
-- TABELA: listings
-- Armazena anúncios publicados em plataformas (Airbnb, Booking, etc)
-- Vinculado a uma Property (unidade física)
-- ============================================================================

CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- properties.id é TEXT para suportar rascunhos; alinhar o FK com TEXT
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Plataforma
  platform TEXT NOT NULL CHECK (platform IN ('airbnb', 'booking', 'decolar', 'vrbo', 'direct')),
  
  -- Identificação Externa
  external_id TEXT,  -- ID da plataforma (ex: "AIR123")
  external_url TEXT, -- URL do anúncio na plataforma
  
  -- Conteúdo do Anúncio (multilíngue)
  title JSONB,       -- { pt: "...", en: "...", es: "..." }
  description JSONB, -- { pt: "...", en: "...", es: "..." }
  slug TEXT,         -- URL-friendly slug para SEO
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' 
    CHECK (status IN ('draft', 'published', 'unlisted', 'archived')),
  
  -- Configurações de Sincronização
  sync_calendar BOOLEAN DEFAULT true,
  sync_pricing BOOLEAN DEFAULT true,
  sync_availability BOOLEAN DEFAULT true,
  ical_url TEXT,     -- URL do iCal para sincronização bidirecional
  
  -- Preços Específicos da Plataforma (ajuste em relação ao Property.pricing)
  pricing_adjustment JSONB,  -- { baseAdjustment: 10, cleaningFee: 50, ... }
  
  -- Configurações de Disponibilidade Específicas
  min_nights INTEGER,
  max_nights INTEGER,
  instant_book BOOLEAN DEFAULT false,
  advance_notice INTEGER,  -- horas de antecedência mínima para reserva
  
  -- Estatísticas
  total_views INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  total_revenue NUMERIC(10, 2) DEFAULT 0,
  average_rating NUMERIC(3, 2), -- 0.00 a 5.00
  
  -- Metadata
  last_sync_at TIMESTAMPTZ,  -- Última sincronização com a plataforma
  published_at TIMESTAMPTZ,  -- Data de publicação
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Garantir que uma propriedade não tenha listings duplicados na mesma plataforma
  UNIQUE(property_id, platform)
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================

-- Índice para busca por organização (multi-tenant)
CREATE INDEX IF NOT EXISTS idx_listings_organization_id 
ON listings(organization_id);

-- Índice para busca por propriedade
CREATE INDEX IF NOT EXISTS idx_listings_property_id 
ON listings(property_id);

-- Índice para busca por plataforma
CREATE INDEX IF NOT EXISTS idx_listings_platform 
ON listings(platform);

-- Índice para busca por status
CREATE INDEX IF NOT EXISTS idx_listings_status 
ON listings(status);

-- Índice para busca por external_id (para sincronização)
CREATE INDEX IF NOT EXISTS idx_listings_external_id 
ON listings(external_id) 
WHERE external_id IS NOT NULL;

-- Índice GIN para busca em title/description (multilíngue)
CREATE INDEX IF NOT EXISTS idx_listings_title_gin 
ON listings USING gin(title) 
WHERE title IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listings_description_gin 
ON listings USING gin(description) 
WHERE description IS NOT NULL;

-- Índice composto para queries comuns (org + platform + status)
CREATE INDEX IF NOT EXISTS idx_listings_org_platform_status 
ON listings(organization_id, platform, status);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_listings_updated_at ON listings;
CREATE TRIGGER trigger_update_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION update_listings_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários só veem/listam listings da própria organização
CREATE POLICY "listings_organization_isolation"
ON listings
FOR ALL
USING (
  organization_id IN (
    SELECT id FROM organizations WHERE id = listings.organization_id
  )
)
WITH CHECK (
  organization_id IN (
    SELECT id FROM organizations WHERE id = listings.organization_id
  )
);

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON TABLE listings IS 
'Anúncios publicados em plataformas (Airbnb, Booking, etc). Separado de properties para permitir múltiplos anúncios por propriedade.';

COMMENT ON COLUMN listings.organization_id IS 
'UUID da organização (FK para organizations.id). Usado para isolamento multi-tenant.';

COMMENT ON COLUMN listings.property_id IS 
'UUID da propriedade/acomodação física (FK para properties.id). Uma property pode ter múltiplos listings (um por plataforma).';

COMMENT ON COLUMN listings.platform IS 
'Plataforma onde o anúncio está publicado: airbnb, booking, decolar, vrbo, ou direct.';

COMMENT ON COLUMN listings.external_id IS 
'ID do anúncio na plataforma externa (ex: ID do Airbnb, Booking, etc).';

COMMENT ON COLUMN listings.title IS 
'Título do anúncio em formato multilíngue JSON: { pt: "...", en: "...", es: "..." }.';

COMMENT ON COLUMN listings.description IS 
'Descrição do anúncio em formato multilíngue JSON: { pt: "...", en: "...", es: "..." }.';

COMMENT ON COLUMN listings.pricing_adjustment IS 
'Ajuste de preço específico da plataforma em relação ao Property.pricing. Ex: { baseAdjustment: 10, cleaningFee: 50 }.';

COMMENT ON COLUMN listings.status IS 
'Status do anúncio: draft (rascunho), published (publicado), unlisted (removido), archived (arquivado).';

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'listings'
  ) THEN
    RAISE NOTICE '✅ Tabela listings criada com sucesso!';
  ELSE
    RAISE WARNING '⚠️ Tabela listings não foi criada. Verifique erros acima.';
  END IF;
END $$;
