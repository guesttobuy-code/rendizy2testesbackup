-- ============================================================================
-- 🕷️ TABELA SCRAPED_PROPERTIES - POC SCRAPING IMOBILIÁRIAS
-- ============================================================================
-- 
-- Tabela para armazenar imóveis extraídos de sites externos
-- Usado para POC de integração com Sergio Castro Imóveis
--
-- Execute no Supabase SQL Editor: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql
-- ============================================================================

-- Criar tabela
CREATE TABLE IF NOT EXISTS scraped_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  code TEXT UNIQUE NOT NULL,
  title TEXT,
  address TEXT,
  
  -- Valores
  price DECIMAL(15,2),
  condominio DECIMAL(10,2),
  iptu DECIMAL(10,2),
  iptu_parcelas INTEGER,
  
  -- Características
  area_sqm DECIMAL(10,2),
  bedrooms INTEGER,
  suites INTEGER,
  bathrooms INTEGER,
  parking_spots INTEGER,
  living_rooms INTEGER,
  
  -- Descrição
  description TEXT,
  amenities JSONB DEFAULT '[]',
  
  -- Imagens
  images JSONB DEFAULT '[]',
  images_base64 JSONB DEFAULT '[]',
  
  -- Localização
  property_type TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  
  -- Metadados
  purpose TEXT,
  source TEXT,
  source_url TEXT,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_scraped_properties_source ON scraped_properties(source);
CREATE INDEX IF NOT EXISTS idx_scraped_properties_code ON scraped_properties(code);
CREATE INDEX IF NOT EXISTS idx_scraped_properties_neighborhood ON scraped_properties(neighborhood);

-- RLS - Permitir leitura pública (para POC)
ALTER TABLE scraped_properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scraped_properties_public_read" ON scraped_properties;
CREATE POLICY "scraped_properties_public_read" ON scraped_properties
  FOR SELECT USING (true);

-- Permitir insert/update via service role (scraper)
DROP POLICY IF EXISTS "scraped_properties_service_write" ON scraped_properties;
CREATE POLICY "scraped_properties_service_write" ON scraped_properties
  FOR ALL USING (true) WITH CHECK (true);

-- Verificar
SELECT 'Tabela scraped_properties criada com sucesso!' AS status;
