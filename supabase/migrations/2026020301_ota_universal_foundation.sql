-- ============================================================================
-- RENDIZY - MODELO DE DADOS UNIVERSAL PARA OTAs
-- Migração 1 de 5: FUNDAÇÃO (Tabelas Base de Mapeamento)
-- ============================================================================
-- Versão: 1.0
-- Data: 2026-02-03
-- Objetivo: Criar a estrutura base para mapeamento universal de OTAs
-- ============================================================================

-- Criar tipos ENUM para OTAs
DO $$ BEGIN
  CREATE TYPE ota_channel AS ENUM (
    'expedia',
    'booking',
    'airbnb',
    'vrbo',
    'decolar',
    'despegar',
    'trivago',
    'google_vacation',
    'tripadvisor',
    'direct'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Criar tipo para escopo de mapeamento
DO $$ BEGIN
  CREATE TYPE mapping_scope AS ENUM (
    'property',     -- Amenidade/campo do imóvel
    'location',     -- Amenidade do prédio/localização
    'room',         -- Amenidade/campo do quarto
    'rate',         -- Incluído em um rate plan (ex: café)
    'reservation'   -- Campo de reserva
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- TABELA 1: CANONICAL AMENITIES (Master List)
-- Todas as amenidades que o Rendizy conhece (fonte de verdade)
-- ============================================================================
CREATE TABLE IF NOT EXISTS canonical_amenities (
  id TEXT PRIMARY KEY,                    -- 'wifi', 'pool', 'ac', etc
  
  -- Nomes multilíngue
  name_pt TEXT NOT NULL,                  -- 'Wi-Fi'
  name_en TEXT,                           -- 'WiFi'
  name_es TEXT,                           -- 'WiFi'
  
  -- Categorização
  category TEXT NOT NULL,                 -- 'internet', 'outdoor', 'climate'
  subcategory TEXT,                       -- 'connectivity', 'pool', etc
  
  -- Escopo de aplicação
  scope mapping_scope NOT NULL DEFAULT 'property',
  -- property = amenidade do imóvel
  -- location = amenidade do prédio/local
  -- room = amenidade específica de um quarto
  -- rate = amenidade incluída em um rate plan
  
  -- Metadados de exibição
  icon TEXT,                              -- Emoji ou classe CSS
  description_pt TEXT,
  description_en TEXT,
  is_highlight BOOLEAN DEFAULT false,     -- Amenidade de destaque?
  display_order INTEGER DEFAULT 0,        -- Ordem de exibição
  
  -- Controle
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE canonical_amenities IS 'Lista canônica de amenidades do Rendizy - fonte de verdade para todas as OTAs';
COMMENT ON COLUMN canonical_amenities.scope IS 'Escopo: property (imóvel), location (prédio), room (quarto), rate (incluso em tarifa)';

-- ============================================================================
-- TABELA 2: OTA AMENITY MAPPINGS
-- Mapeamento bidirecional: Rendizy ↔ OTA
-- ============================================================================
CREATE TABLE IF NOT EXISTS ota_amenity_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Chave canônica Rendizy
  canonical_id TEXT NOT NULL REFERENCES canonical_amenities(id) ON DELETE CASCADE,
  
  -- Identificação OTA
  ota TEXT NOT NULL,                      -- 'expedia', 'booking', 'airbnb', 'vrbo'
  ota_id TEXT NOT NULL,                   -- ID da amenidade na OTA (ex: '2390' para Expedia Wi-Fi)
  ota_name TEXT,                          -- Nome original na OTA (para debug)
  ota_category TEXT,                      -- Categoria na OTA (se houver)
  
  -- Escopo na OTA (pode diferir do canônico)
  ota_scope TEXT,                         -- 'property', 'room', 'rate', etc
  
  -- Metadados de mapeamento
  confidence DECIMAL(3,2) DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  is_auto_mapped BOOLEAN DEFAULT false,   -- Mapeamento automático vs manual
  notes TEXT,                             -- Notas sobre o mapeamento
  
  -- Se a amenidade aceita valor (ex: "10 piscinas")
  accepts_value BOOLEAN DEFAULT false,
  value_type TEXT,                        -- 'count', 'text', 'boolean'
  
  -- Controle
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Cada código OTA aparece uma vez por OTA
  UNIQUE(ota, ota_id)
);

CREATE INDEX IF NOT EXISTS idx_ota_amenity_canonical ON ota_amenity_mappings(canonical_id);
CREATE INDEX IF NOT EXISTS idx_ota_amenity_ota ON ota_amenity_mappings(ota, ota_id);
CREATE INDEX IF NOT EXISTS idx_ota_amenity_ota_scope ON ota_amenity_mappings(ota, ota_scope);

COMMENT ON TABLE ota_amenity_mappings IS 'Mapeamento bidirecional de amenidades Rendizy ↔ OTA';

-- ============================================================================
-- TABELA 3: CANONICAL PROPERTY TYPES
-- Tipos de propriedade que o Rendizy conhece
-- ============================================================================
CREATE TABLE IF NOT EXISTS canonical_property_types (
  id TEXT PRIMARY KEY,                    -- 'apartment', 'house', 'villa'
  
  -- Nomes multilíngue
  name_pt TEXT NOT NULL,
  name_en TEXT,
  name_es TEXT,
  
  -- Categorização
  parent_type TEXT REFERENCES canonical_property_types(id), -- Hierarquia
  
  -- Capacidade típica
  typical_min_guests INTEGER DEFAULT 1,
  typical_max_guests INTEGER DEFAULT 10,
  typical_bedrooms_min INTEGER DEFAULT 1,
  typical_bedrooms_max INTEGER DEFAULT 5,
  
  -- Metadados
  icon TEXT,
  description_pt TEXT,
  description_en TEXT,
  
  -- Controle
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE canonical_property_types IS 'Tipos de propriedade canônicos do Rendizy';

-- ============================================================================
-- TABELA 4: OTA PROPERTY TYPE MAPPINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS ota_property_type_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Rendizy
  canonical_id TEXT NOT NULL REFERENCES canonical_property_types(id) ON DELETE CASCADE,
  
  -- OTA
  ota TEXT NOT NULL,
  ota_id TEXT NOT NULL,                   -- Código na OTA (ex: '15' para Expedia Apartment)
  ota_name TEXT,                          -- Nome na OTA (ex: 'Apartment')
  ota_parent_id TEXT,                     -- ID da categoria pai na OTA (se houver)
  
  -- Metadados
  confidence DECIMAL(3,2) DEFAULT 1.0,
  requires_subtype BOOLEAN DEFAULT false, -- Precisa de subtipo? (entire/private/shared)
  default_subtype TEXT,                   -- Subtipo padrão se não especificado
  notes TEXT,
  
  -- Controle
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(ota, canonical_id),              -- Um tipo Rendizy = um código por OTA
  UNIQUE(ota, ota_id)                     -- Um código OTA = um tipo Rendizy
);

CREATE INDEX IF NOT EXISTS idx_ota_property_type_canonical ON ota_property_type_mappings(canonical_id);
CREATE INDEX IF NOT EXISTS idx_ota_property_type_ota ON ota_property_type_mappings(ota, ota_id);

COMMENT ON TABLE ota_property_type_mappings IS 'Mapeamento de tipos de propriedade Rendizy ↔ OTA';

-- ============================================================================
-- TABELA 5: CANONICAL BED TYPES
-- Tipos de cama que o Rendizy conhece
-- ============================================================================
CREATE TABLE IF NOT EXISTS canonical_bed_types (
  id TEXT PRIMARY KEY,                    -- 'single', 'double', 'queen', 'king'
  
  -- Nomes multilíngue
  name_pt TEXT NOT NULL,
  name_en TEXT,
  name_es TEXT,
  
  -- Dimensões padrão (opcional)
  width_cm INTEGER,                       -- Largura em cm
  length_cm INTEGER,                      -- Comprimento em cm
  
  -- Capacidade
  typical_capacity INTEGER DEFAULT 1,     -- Quantas pessoas normalmente
  
  -- Metadados
  icon TEXT,
  description_pt TEXT,
  
  -- Controle
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE canonical_bed_types IS 'Tipos de cama canônicos do Rendizy';

-- ============================================================================
-- TABELA 6: OTA BED TYPE MAPPINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS ota_bed_type_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Rendizy
  canonical_id TEXT NOT NULL REFERENCES canonical_bed_types(id) ON DELETE CASCADE,
  
  -- OTA
  ota TEXT NOT NULL,
  ota_id TEXT NOT NULL,                   -- Código na OTA
  ota_name TEXT,                          -- Nome na OTA
  ota_size TEXT,                          -- 'King', 'Queen', etc (algumas OTAs separam)
  
  -- Controle
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(ota, ota_id)
);

CREATE INDEX IF NOT EXISTS idx_ota_bed_type_canonical ON ota_bed_type_mappings(canonical_id);
CREATE INDEX IF NOT EXISTS idx_ota_bed_type_ota ON ota_bed_type_mappings(ota, ota_id);

COMMENT ON TABLE ota_bed_type_mappings IS 'Mapeamento de tipos de cama Rendizy ↔ OTA';

-- ============================================================================
-- TABELA 7: CANONICAL ROOM TYPES
-- Tipos de quarto que o Rendizy conhece
-- ============================================================================
CREATE TABLE IF NOT EXISTS canonical_room_types (
  id TEXT PRIMARY KEY,                    -- 'standard', 'suite', 'master', 'studio'
  
  -- Nomes multilíngue
  name_pt TEXT NOT NULL,
  name_en TEXT,
  name_es TEXT,
  
  -- Metadados
  description_pt TEXT,
  typical_beds INTEGER DEFAULT 1,
  
  -- Controle
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE canonical_room_types IS 'Tipos de quarto canônicos do Rendizy';

-- ============================================================================
-- TABELA 8: OTA ROOM TYPE MAPPINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS ota_room_type_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Rendizy
  canonical_id TEXT NOT NULL REFERENCES canonical_room_types(id) ON DELETE CASCADE,
  
  -- OTA
  ota TEXT NOT NULL,
  ota_id TEXT NOT NULL,
  ota_name TEXT,
  
  -- Controle
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(ota, ota_id)
);

CREATE INDEX IF NOT EXISTS idx_ota_room_type_canonical ON ota_room_type_mappings(canonical_id);

COMMENT ON TABLE ota_room_type_mappings IS 'Mapeamento de tipos de quarto Rendizy ↔ OTA';

-- ============================================================================
-- TABELA 9: CANONICAL ROOM VIEWS
-- Tipos de vista do quarto
-- ============================================================================
CREATE TABLE IF NOT EXISTS canonical_room_views (
  id TEXT PRIMARY KEY,                    -- 'sea', 'mountain', 'city', 'garden', 'pool'
  
  name_pt TEXT NOT NULL,
  name_en TEXT,
  name_es TEXT,
  
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE canonical_room_views IS 'Tipos de vista do quarto canônicos';

-- ============================================================================
-- TABELA 10: OTA ROOM VIEW MAPPINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS ota_room_view_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  canonical_id TEXT NOT NULL REFERENCES canonical_room_views(id) ON DELETE CASCADE,
  ota TEXT NOT NULL,
  ota_id TEXT NOT NULL,
  ota_name TEXT,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(ota, ota_id)
);

-- ============================================================================
-- TABELA 11: CANONICAL IMAGE CATEGORIES
-- Categorias de imagem (Expedia usa IDs específicos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS canonical_image_categories (
  id TEXT PRIMARY KEY,                    -- 'exterior', 'lobby', 'room', 'bathroom', 'pool'
  
  name_pt TEXT NOT NULL,
  name_en TEXT,
  name_es TEXT,
  
  -- Onde pode ser usada
  applies_to TEXT[] DEFAULT ARRAY['property'], -- 'property', 'room', 'location'
  
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE canonical_image_categories IS 'Categorias de imagem canônicas';

-- ============================================================================
-- TABELA 12: OTA IMAGE CATEGORY MAPPINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS ota_image_category_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  canonical_id TEXT NOT NULL REFERENCES canonical_image_categories(id) ON DELETE CASCADE,
  ota TEXT NOT NULL,
  ota_id TEXT NOT NULL,                   -- Expedia usa IDs numéricos
  ota_name TEXT,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(ota, ota_id)
);

-- ============================================================================
-- TABELA 13: CANONICAL LANGUAGES
-- Idiomas suportados (para spoken_languages do Expedia)
-- ============================================================================
CREATE TABLE IF NOT EXISTS canonical_languages (
  id TEXT PRIMARY KEY,                    -- 'pt-BR', 'en-US', 'es-ES'
  
  name_pt TEXT NOT NULL,                  -- 'Português (Brasil)'
  name_en TEXT,                           -- 'Portuguese (Brazil)'
  name_native TEXT,                       -- 'Português'
  
  iso_639_1 TEXT,                         -- 'pt'
  iso_639_2 TEXT,                         -- 'por'
  
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE canonical_languages IS 'Idiomas canônicos do Rendizy';

-- ============================================================================
-- TABELA 14: OTA LANGUAGE MAPPINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS ota_language_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  canonical_id TEXT NOT NULL REFERENCES canonical_languages(id) ON DELETE CASCADE,
  ota TEXT NOT NULL,
  ota_id TEXT NOT NULL,
  ota_name TEXT,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(ota, ota_id)
);

-- ============================================================================
-- TABELA 15: CANONICAL PAYMENT TYPES
-- Tipos de pagamento aceitos
-- ============================================================================
CREATE TABLE IF NOT EXISTS canonical_payment_types (
  id TEXT PRIMARY KEY,                    -- 'visa', 'mastercard', 'amex', 'pix', 'cash'
  
  name_pt TEXT NOT NULL,
  name_en TEXT,
  
  category TEXT NOT NULL,                 -- 'credit_card', 'debit_card', 'bank_transfer', 'cash', 'other'
  
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE canonical_payment_types IS 'Tipos de pagamento canônicos';

-- ============================================================================
-- TABELA 16: OTA PAYMENT TYPE MAPPINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS ota_payment_type_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  canonical_id TEXT NOT NULL REFERENCES canonical_payment_types(id) ON DELETE CASCADE,
  ota TEXT NOT NULL,
  ota_id TEXT NOT NULL,
  ota_name TEXT,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(ota, ota_id)
);

-- ============================================================================
-- TABELA 17: CANONICAL THEMES
-- Temas/categorias de propriedade (Luxury, Spa, Beach, etc)
-- ============================================================================
CREATE TABLE IF NOT EXISTS canonical_themes (
  id TEXT PRIMARY KEY,                    -- 'luxury', 'spa', 'beach', 'family', 'romantic'
  
  name_pt TEXT NOT NULL,
  name_en TEXT,
  name_es TEXT,
  
  icon TEXT,
  description_pt TEXT,
  
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE canonical_themes IS 'Temas/categorias de propriedade canônicos';

-- ============================================================================
-- TABELA 18: OTA THEME MAPPINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS ota_theme_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  canonical_id TEXT NOT NULL REFERENCES canonical_themes(id) ON DELETE CASCADE,
  ota TEXT NOT NULL,
  ota_id TEXT NOT NULL,
  ota_name TEXT,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(ota, ota_id)
);

-- ============================================================================
-- TABELA 19: CANONICAL FEE TYPES
-- Tipos de taxas (mandatory_fee, resort_fee, cleaning_fee, etc)
-- ============================================================================
CREATE TABLE IF NOT EXISTS canonical_fee_types (
  id TEXT PRIMARY KEY,                    -- 'cleaning', 'resort', 'parking', 'pet', 'service'
  
  name_pt TEXT NOT NULL,
  name_en TEXT,
  name_es TEXT,
  
  -- Comportamento
  is_mandatory BOOLEAN DEFAULT false,     -- Taxa obrigatória?
  is_refundable BOOLEAN DEFAULT true,     -- Reembolsável?
  applies_to TEXT DEFAULT 'stay',         -- 'stay', 'night', 'guest', 'pet'
  
  description_pt TEXT,
  
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE canonical_fee_types IS 'Tipos de taxas canônicos';

-- ============================================================================
-- TABELA 20: OTA FEE TYPE MAPPINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS ota_fee_type_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  canonical_id TEXT NOT NULL REFERENCES canonical_fee_types(id) ON DELETE CASCADE,
  ota TEXT NOT NULL,
  ota_id TEXT NOT NULL,
  ota_name TEXT,
  
  -- Como a OTA calcula
  ota_calculation_type TEXT,              -- 'per_stay', 'per_night', 'per_person_per_night'
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(ota, ota_id)
);

-- ============================================================================
-- TABELA 21: CANONICAL RESERVATION STATUSES
-- Status de reserva mapeados para cada OTA
-- ============================================================================
CREATE TABLE IF NOT EXISTS canonical_reservation_statuses (
  id TEXT PRIMARY KEY,                    -- 'pending', 'confirmed', 'cancelled', 'no_show'
  
  name_pt TEXT NOT NULL,
  name_en TEXT,
  
  -- Comportamento
  is_active_booking BOOLEAN DEFAULT true, -- Ainda é uma reserva ativa?
  is_final BOOLEAN DEFAULT false,         -- Estado final (não pode mudar)?
  allows_checkin BOOLEAN DEFAULT false,   -- Permite check-in?
  
  color TEXT,                             -- Cor para exibição
  icon TEXT,
  
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE canonical_reservation_statuses IS 'Status de reserva canônicos';

-- ============================================================================
-- TABELA 22: OTA RESERVATION STATUS MAPPINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS ota_reservation_status_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  canonical_id TEXT NOT NULL REFERENCES canonical_reservation_statuses(id) ON DELETE CASCADE,
  ota TEXT NOT NULL,
  ota_id TEXT NOT NULL,                   -- Código/string da OTA
  ota_name TEXT,
  
  -- Direção do mapeamento (algumas OTAs têm status assimétricos)
  direction TEXT DEFAULT 'both',          -- 'import', 'export', 'both'
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(ota, ota_id, direction)
);

CREATE INDEX IF NOT EXISTS idx_ota_reservation_status_canonical ON ota_reservation_status_mappings(canonical_id);

COMMENT ON TABLE ota_reservation_status_mappings IS 'Mapeamento de status de reserva Rendizy ↔ OTA';

-- ============================================================================
-- TRIGGERS para updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger nas tabelas que têm updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'canonical_amenities',
    'ota_amenity_mappings'
  ])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%s_updated_at ON %s;
      CREATE TRIGGER update_%s_updated_at
        BEFORE UPDATE ON %s
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END;
$$;

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================
-- Tabelas canônicas são públicas para leitura, admin para escrita
ALTER TABLE canonical_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_amenity_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_property_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_property_type_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_bed_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_bed_type_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_room_type_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_room_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_room_view_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_image_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_image_category_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_language_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_payment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_payment_type_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_theme_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_fee_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_fee_type_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_reservation_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_reservation_status_mappings ENABLE ROW LEVEL SECURITY;

-- Políticas: leitura pública, escrita via service_role
CREATE POLICY "Canonical amenities are readable by all" ON canonical_amenities FOR SELECT USING (true);
CREATE POLICY "Canonical amenities writable by service" ON canonical_amenities FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "OTA amenity mappings readable by all" ON ota_amenity_mappings FOR SELECT USING (true);
CREATE POLICY "OTA amenity mappings writable by service" ON ota_amenity_mappings FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Canonical property types readable by all" ON canonical_property_types FOR SELECT USING (true);
CREATE POLICY "Canonical property types writable by service" ON canonical_property_types FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "OTA property type mappings readable by all" ON ota_property_type_mappings FOR SELECT USING (true);
CREATE POLICY "OTA property type mappings writable by service" ON ota_property_type_mappings FOR ALL USING (auth.role() = 'service_role');

-- Aplicar mesma política para todas as outras tabelas canônicas
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'canonical_bed_types', 'ota_bed_type_mappings',
    'canonical_room_types', 'ota_room_type_mappings',
    'canonical_room_views', 'ota_room_view_mappings',
    'canonical_image_categories', 'ota_image_category_mappings',
    'canonical_languages', 'ota_language_mappings',
    'canonical_payment_types', 'ota_payment_type_mappings',
    'canonical_themes', 'ota_theme_mappings',
    'canonical_fee_types', 'ota_fee_type_mappings',
    'canonical_reservation_statuses', 'ota_reservation_status_mappings'
  ])
  LOOP
    EXECUTE format('
      CREATE POLICY IF NOT EXISTS "%s readable by all" ON %s FOR SELECT USING (true);
      CREATE POLICY IF NOT EXISTS "%s writable by service" ON %s FOR ALL USING (auth.role() = ''service_role'');
    ', t, t, t, t);
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  -- Ignora se políticas já existirem
  NULL;
END;
$$;

-- ============================================================================
-- COMENTÁRIO FINAL
-- ============================================================================
COMMENT ON SCHEMA public IS 'Schema com modelo de dados universal para OTAs - Migração 1/5: Fundação';
