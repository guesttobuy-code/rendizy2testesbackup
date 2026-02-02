-- =====================================================
-- Migration 12: Check-in/Check-out Settings
-- =====================================================
-- 🎯 PROPÓSITO: Campos de configuração de check-in/checkout
-- 📋 ADR: ADR-002-OTA-UNIVERSAL-SCHEMA
-- 
-- 🌐 UNIVERSAL: Suporta Expedia, Booking, Airbnb, etc.
-- Adiciona campos estruturados para políticas de chegada/saída
-- 
-- DEPENDÊNCIAS:
--   - Tabela properties deve existir
-- =====================================================

-- =====================================================
-- 1. CAMPOS DE CHECK-IN/CHECK-OUT
-- =====================================================

ALTER TABLE properties 
  ADD COLUMN IF NOT EXISTS checkin_begin_time TIME,
  ADD COLUMN IF NOT EXISTS checkin_end_time TIME,
  ADD COLUMN IF NOT EXISTS checkout_time TIME,
  ADD COLUMN IF NOT EXISTS checkin_instructions TEXT,
  ADD COLUMN IF NOT EXISTS checkin_special_instructions TEXT,
  ADD COLUMN IF NOT EXISTS checkout_instructions TEXT,
  ADD COLUMN IF NOT EXISTS min_age_checkin INTEGER DEFAULT 18;

COMMENT ON COLUMN properties.checkin_begin_time IS '[OTA-UNIVERSAL] Horário início check-in (ex: 14:00)';
COMMENT ON COLUMN properties.checkin_end_time IS '[OTA-UNIVERSAL] Horário fim check-in (ex: 22:00)';
COMMENT ON COLUMN properties.checkout_time IS '[OTA-UNIVERSAL] Horário limite checkout (ex: 11:00)';
COMMENT ON COLUMN properties.checkin_instructions IS '[OTA-UNIVERSAL] Instruções gerais de check-in';
COMMENT ON COLUMN properties.checkin_special_instructions IS '[OTA-UNIVERSAL] Instruções especiais (late check-in, etc)';
COMMENT ON COLUMN properties.checkout_instructions IS '[OTA-UNIVERSAL] Instruções de checkout';
COMMENT ON COLUMN properties.min_age_checkin IS '[OTA-UNIVERSAL] Idade mínima para check-in (padrão 18)';

-- =====================================================
-- 2. CAMPOS DE TAXAS E FEES
-- =====================================================

ALTER TABLE properties 
  ADD COLUMN IF NOT EXISTS know_before_you_go TEXT,
  ADD COLUMN IF NOT EXISTS mandatory_fees_description TEXT,
  ADD COLUMN IF NOT EXISTS optional_fees_description TEXT,
  ADD COLUMN IF NOT EXISTS all_inclusive_details TEXT;

COMMENT ON COLUMN properties.know_before_you_go IS '[OTA-UNIVERSAL] Informações importantes antes da reserva';
COMMENT ON COLUMN properties.mandatory_fees_description IS '[OTA-UNIVERSAL] Descrição de taxas obrigatórias';
COMMENT ON COLUMN properties.optional_fees_description IS '[OTA-UNIVERSAL] Descrição de taxas opcionais';
COMMENT ON COLUMN properties.all_inclusive_details IS '[OTA-UNIVERSAL] Detalhes se for all-inclusive';

-- =====================================================
-- 3. CAMPOS VRBO/EXPEDIA ESPECÍFICOS
-- =====================================================

ALTER TABLE properties 
  ADD COLUMN IF NOT EXISTS obfuscation_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS vrbo_listing_id TEXT,
  ADD COLUMN IF NOT EXISTS vrbo_srp_id TEXT,
  ADD COLUMN IF NOT EXISTS private_host BOOLEAN DEFAULT true;

COMMENT ON COLUMN properties.obfuscation_required IS '[OTA-UNIVERSAL] Se endereço deve ser ocultado (VRBO privacy)';
COMMENT ON COLUMN properties.vrbo_listing_id IS '[VRBO] ID do listing no VRBO';
COMMENT ON COLUMN properties.vrbo_srp_id IS '[VRBO] ID SRP no VRBO';
COMMENT ON COLUMN properties.private_host IS '[OTA-UNIVERSAL] Se é anfitrião privado (não empresa)';

-- =====================================================
-- 4. CAMPOS DE POLÍTICAS ADICIONAIS
-- =====================================================

ALTER TABLE properties 
  ADD COLUMN IF NOT EXISTS pets_policy JSONB DEFAULT '{"allowed": false}',
  ADD COLUMN IF NOT EXISTS smoking_policy TEXT DEFAULT 'no_smoking',
  ADD COLUMN IF NOT EXISTS party_policy TEXT DEFAULT 'no_parties',
  ADD COLUMN IF NOT EXISTS quiet_hours_start TIME,
  ADD COLUMN IF NOT EXISTS quiet_hours_end TIME;

COMMENT ON COLUMN properties.pets_policy IS '[OTA-UNIVERSAL] Política de pets: {"allowed": true, "fee": 50, "max": 2}';
COMMENT ON COLUMN properties.smoking_policy IS '[OTA-UNIVERSAL] no_smoking, designated_areas, allowed';
COMMENT ON COLUMN properties.party_policy IS '[OTA-UNIVERSAL] no_parties, small_gatherings, allowed';
COMMENT ON COLUMN properties.quiet_hours_start IS '[OTA-UNIVERSAL] Início horário de silêncio';
COMMENT ON COLUMN properties.quiet_hours_end IS '[OTA-UNIVERSAL] Fim horário de silêncio';

-- =====================================================
-- 5. CAMPOS DE CONTATO E EMERGÊNCIA
-- =====================================================

ALTER TABLE properties 
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS property_manager_name TEXT,
  ADD COLUMN IF NOT EXISTS property_manager_phone TEXT,
  ADD COLUMN IF NOT EXISTS property_manager_email TEXT;

COMMENT ON COLUMN properties.emergency_contact_name IS '[OTA-UNIVERSAL] Nome contato de emergência';
COMMENT ON COLUMN properties.emergency_contact_phone IS '[OTA-UNIVERSAL] Telefone emergência';
COMMENT ON COLUMN properties.property_manager_name IS '[OTA-UNIVERSAL] Nome do gerente/responsável';
COMMENT ON COLUMN properties.property_manager_phone IS '[OTA-UNIVERSAL] Telefone do gerente';
COMMENT ON COLUMN properties.property_manager_email IS '[OTA-UNIVERSAL] Email do gerente';

-- =====================================================
-- 6. CAMPOS DE LOCALIZAÇÃO DETALHADA
-- =====================================================

ALTER TABLE properties 
  ADD COLUMN IF NOT EXISTS parking_details JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS accessibility_features TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS nearby_attractions JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS transportation_options JSONB DEFAULT '[]';

COMMENT ON COLUMN properties.parking_details IS '[OTA-UNIVERSAL] {"available": true, "type": "free", "spaces": 2}';
COMMENT ON COLUMN properties.accessibility_features IS '[OTA-UNIVERSAL] Array: wheelchair, elevator, ground_floor, etc';
COMMENT ON COLUMN properties.nearby_attractions IS '[OTA-UNIVERSAL] [{name, distance_km, type}]';
COMMENT ON COLUMN properties.transportation_options IS '[OTA-UNIVERSAL] [{type: "airport", name: "GRU", distance_km: 15}]';

-- =====================================================
-- 7. CAMPOS DE LICENÇAS E REGISTROS
-- =====================================================

ALTER TABLE properties 
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS license_type TEXT,
  ADD COLUMN IF NOT EXISTS license_expiry DATE,
  ADD COLUMN IF NOT EXISTS tax_registration TEXT,
  ADD COLUMN IF NOT EXISTS insurance_policy TEXT;

COMMENT ON COLUMN properties.license_number IS '[OTA-UNIVERSAL] Número da licença/alvará';
COMMENT ON COLUMN properties.license_type IS '[OTA-UNIVERSAL] Tipo: tourism, short_term_rental, hotel, etc';
COMMENT ON COLUMN properties.license_expiry IS '[OTA-UNIVERSAL] Data expiração da licença';
COMMENT ON COLUMN properties.tax_registration IS '[OTA-UNIVERSAL] Registro fiscal/ISS';
COMMENT ON COLUMN properties.insurance_policy IS '[OTA-UNIVERSAL] Número apólice de seguro';

-- =====================================================
-- 8. VIEW PARA PROPERTIES COM CONFIGURAÇÕES COMPLETAS
-- =====================================================

CREATE OR REPLACE VIEW v_properties_ota_ready AS
SELECT 
  p.id,
  p.organization_id,
  p.status,
  -- Check-in/out
  p.checkin_begin_time,
  p.checkin_end_time,
  p.checkout_time,
  p.min_age_checkin,
  -- Configurações
  p.obfuscation_required,
  p.private_host,
  p.pets_policy,
  p.smoking_policy,
  -- Contagem de quartos
  (SELECT COUNT(*) FROM property_rooms pr WHERE pr.property_id = p.id AND pr.is_active = true) AS room_count,
  -- Capacidade total
  (SELECT COALESCE(SUM(pr.max_occupancy), 0) FROM property_rooms pr WHERE pr.property_id = p.id AND pr.is_active = true) AS total_capacity,
  -- OTA IDs
  p.vrbo_listing_id,
  p.vrbo_srp_id,
  -- Rating
  p.property_rating,
  p.property_rating_type,
  -- Timestamps
  p.created_at,
  p.updated_at
FROM properties p
WHERE p.status = 'active';

-- =====================================================
-- FIM DA MIGRATION 12
-- =====================================================
SELECT 'Migration 12 (checkin/checkout settings) executada com sucesso!' AS resultado;
