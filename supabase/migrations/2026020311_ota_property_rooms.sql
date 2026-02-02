-- =====================================================
-- Migration 11: Property Rooms (Quartos por Propriedade)
-- =====================================================
-- 🎯 PROPÓSITO: Tabela separada para quartos de cada propriedade
-- 📋 ADR: ADR-002-OTA-UNIVERSAL-SCHEMA
-- 
-- 🌐 UNIVERSAL: Suporta Expedia, Booking, Airbnb, etc.
-- Antes os quartos ficavam em JSONB dentro de properties.data
-- Agora são entidades separadas para melhor gestão
-- 
-- DEPENDÊNCIAS:
--   - Tabela properties deve existir
-- =====================================================

-- =====================================================
-- 0. CRIAR ROOM_TYPES SE NÃO EXISTIR
-- =====================================================

CREATE TABLE IF NOT EXISTS room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_pt TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seeds básicos de room_types
INSERT INTO room_types (code, name, name_pt) VALUES
  ('standard', 'Standard Room', 'Quarto Standard'),
  ('deluxe', 'Deluxe Room', 'Quarto Deluxe'),
  ('suite', 'Suite', 'Suíte'),
  ('studio', 'Studio', 'Studio'),
  ('apartment', 'Apartment', 'Apartamento'),
  ('penthouse', 'Penthouse', 'Cobertura'),
  ('villa', 'Villa', 'Villa'),
  ('bungalow', 'Bungalow', 'Bangalô'),
  ('cabin', 'Cabin', 'Cabana'),
  ('loft', 'Loft', 'Loft')
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE room_types IS '[OTA-UNIVERSAL] Tipos de quarto padrão';

-- =====================================================
-- 1. TABELA PROPERTY_ROOMS
-- =====================================================

CREATE TABLE IF NOT EXISTS property_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Tipo de quarto (referência opcional)
  room_type_id UUID REFERENCES room_types(id),
  
  -- Identificação
  name TEXT NOT NULL,
  description TEXT,
  internal_code TEXT, -- Código interno do anfitrião
  
  -- Dimensões
  area_sqm DECIMAL(6,2), -- Área em metros quadrados
  area_sqft DECIMAL(6,2), -- Área em pés quadrados (calculado)
  
  -- Ocupação
  max_occupancy INTEGER NOT NULL DEFAULT 2,
  max_adults INTEGER,
  max_children INTEGER,
  standard_occupancy INTEGER DEFAULT 2, -- Ocupação padrão (sem taxa extra)
  
  -- Preços
  base_price DECIMAL(10,2),
  extra_person_fee DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  
  -- Configuração de camas (JSONB flexível)
  -- Formato: [{"type": "double", "size": "queen", "count": 1}, {"type": "single", "count": 2}]
  bed_configuration JSONB DEFAULT '[]',
  
  -- Imagens específicas do quarto
  -- Formato: [{"url": "...", "caption": "...", "is_primary": true}]
  images JSONB DEFAULT '[]',
  
  -- Amenidades do quarto (array de UUIDs referenciando amenities)
  amenity_ids UUID[] DEFAULT '{}',
  
  -- Vistas do quarto
  -- Valores: ocean, pool, garden, city, mountain, courtyard, parking, none
  views TEXT[] DEFAULT '{}',
  
  -- Características
  is_smoking_allowed BOOLEAN DEFAULT false,
  is_accessible BOOLEAN DEFAULT false, -- Acessível para cadeirantes
  floor_number INTEGER,
  
  -- Status e ordenação
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  -- OTA mappings
  ota_room_ids JSONB DEFAULT '{}', -- {"expedia": "123", "booking": "456"}
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_property_rooms_property ON property_rooms(property_id);
CREATE INDEX IF NOT EXISTS idx_property_rooms_active ON property_rooms(property_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_property_rooms_type ON property_rooms(room_type_id) WHERE room_type_id IS NOT NULL;

-- Comentários
COMMENT ON TABLE property_rooms IS '[OTA-UNIVERSAL] Quartos/unidades de cada propriedade';
COMMENT ON COLUMN property_rooms.bed_configuration IS '[OTA-UNIVERSAL] Config de camas: [{"type":"double","size":"king","count":1}]';
COMMENT ON COLUMN property_rooms.ota_room_ids IS '[OTA-UNIVERSAL] IDs do quarto em cada OTA';

-- =====================================================
-- 2. TRIGGER PARA UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_property_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_property_rooms_updated_at ON property_rooms;
CREATE TRIGGER trg_property_rooms_updated_at
BEFORE UPDATE ON property_rooms
FOR EACH ROW
EXECUTE FUNCTION update_property_rooms_updated_at();

-- =====================================================
-- 3. TABELA DE TIPOS DE CAMA (SEED)
-- =====================================================

CREATE TABLE IF NOT EXISTS bed_types (
  id TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_pt TEXT NOT NULL,
  category TEXT NOT NULL, -- single, double, bunk, sofa, other
  typical_width_cm INTEGER,
  typical_length_cm INTEGER,
  max_persons INTEGER DEFAULT 1
);

-- Seeds de tipos de cama
INSERT INTO bed_types (id, name_en, name_pt, category, typical_width_cm, typical_length_cm, max_persons) VALUES
  ('single', 'Single', 'Solteiro', 'single', 90, 190, 1),
  ('twin', 'Twin', 'Twin', 'single', 100, 200, 1),
  ('double', 'Double', 'Casal', 'double', 140, 190, 2),
  ('queen', 'Queen', 'Queen', 'double', 160, 200, 2),
  ('king', 'King', 'King', 'double', 180, 200, 2),
  ('super_king', 'Super King', 'Super King', 'double', 200, 200, 2),
  ('bunk', 'Bunk Bed', 'Beliche', 'bunk', 90, 190, 2),
  ('sofa_bed', 'Sofa Bed', 'Sofá-cama', 'sofa', 140, 190, 2),
  ('futon', 'Futon', 'Futon', 'sofa', 140, 190, 2),
  ('murphy', 'Murphy Bed', 'Cama Retrátil', 'other', 140, 190, 2),
  ('air_mattress', 'Air Mattress', 'Colchão Inflável', 'other', 140, 190, 2),
  ('crib', 'Crib', 'Berço', 'other', 60, 120, 1),
  ('toddler_bed', 'Toddler Bed', 'Cama Infantil', 'other', 70, 140, 1)
ON CONFLICT (id) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_pt = EXCLUDED.name_pt;

COMMENT ON TABLE bed_types IS '[OTA-UNIVERSAL] Tipos de cama padronizados';

-- =====================================================
-- 4. VIEW PARA QUARTOS COM DETALHES
-- =====================================================

CREATE OR REPLACE VIEW v_property_rooms_detailed AS
SELECT 
  pr.*,
  p.organization_id,
  rt.name AS room_type_name,
  rt.code AS room_type_code
FROM property_rooms pr
LEFT JOIN properties p ON p.id = pr.property_id
LEFT JOIN room_types rt ON rt.id = pr.room_type_id;

-- =====================================================
-- FIM DA MIGRATION 11
-- =====================================================
SELECT 'Migration 11 (property_rooms) executada com sucesso!' AS resultado;
