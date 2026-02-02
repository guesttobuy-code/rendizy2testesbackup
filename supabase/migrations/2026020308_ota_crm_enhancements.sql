-- =====================================================
-- Migration 08: OTA CRM/Guests Enhancements
-- =====================================================
-- Adiciona campos necessários para integração completa com Expedia
-- Baseado no Gap Analysis: telefone estruturado, data nascimento, loyalty
-- =====================================================

-- =====================================================
-- 1. TELEFONE ESTRUTURADO (crm_contacts)
-- Expedia requer: country_code, area_code, number separados
-- =====================================================

ALTER TABLE crm_contacts 
  ADD COLUMN IF NOT EXISTS phone_country_code TEXT,
  ADD COLUMN IF NOT EXISTS phone_area_code TEXT,
  ADD COLUMN IF NOT EXISTS phone_number_only TEXT;

COMMENT ON COLUMN crm_contacts.phone_country_code IS 'Código do país (ex: 55 para Brasil)';
COMMENT ON COLUMN crm_contacts.phone_area_code IS 'Código de área/DDD (ex: 11 para SP)';
COMMENT ON COLUMN crm_contacts.phone_number_only IS 'Número sem código de país/área';

-- =====================================================
-- 2. DADOS PESSOAIS ADICIONAIS
-- Expedia requer: middle_name, date_of_birth
-- =====================================================

ALTER TABLE crm_contacts 
  ADD COLUMN IF NOT EXISTS middle_name TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

COMMENT ON COLUMN crm_contacts.middle_name IS 'Nome do meio (opcional para Expedia)';
COMMENT ON COLUMN crm_contacts.date_of_birth IS 'Data de nascimento (obrigatório para algumas reservas)';

-- =====================================================
-- 3. ENDEREÇO ISO COUNTRY CODE
-- Expedia requer: country_code em formato ISO 2-letter
-- =====================================================

ALTER TABLE crm_contacts 
  ADD COLUMN IF NOT EXISTS address_country_code TEXT;

COMMENT ON COLUMN crm_contacts.address_country_code IS 'Código ISO do país (2 letras: BR, US, etc)';

-- =====================================================
-- 4. LOYALTY/FIDELIDADE
-- Para programas de fidelidade de hóspedes
-- =====================================================

ALTER TABLE crm_contacts 
  ADD COLUMN IF NOT EXISTS loyalty_program_name TEXT,
  ADD COLUMN IF NOT EXISTS loyalty_program_id TEXT,
  ADD COLUMN IF NOT EXISTS loyalty_id TEXT;

COMMENT ON COLUMN crm_contacts.loyalty_program_name IS 'Nome do programa de fidelidade';
COMMENT ON COLUMN crm_contacts.loyalty_program_id IS 'ID do programa de fidelidade';
COMMENT ON COLUMN crm_contacts.loyalty_id IS 'ID do hóspede no programa de fidelidade';

-- =====================================================
-- 5. PREFERÊNCIAS ADICIONAIS
-- =====================================================

ALTER TABLE crm_contacts 
  ADD COLUMN IF NOT EXISTS prefers_smoking BOOLEAN DEFAULT false;

COMMENT ON COLUMN crm_contacts.prefers_smoking IS 'Preferência por quarto para fumantes';

-- =====================================================
-- 6. FUNÇÃO PARA EXTRAIR TELEFONE ESTRUTURADO
-- Tenta extrair country_code, area_code do campo phone existente
-- =====================================================

CREATE OR REPLACE FUNCTION parse_phone_number(phone_raw TEXT)
RETURNS TABLE (
  country_code TEXT,
  area_code TEXT,
  number_only TEXT
) AS $$
DECLARE
  cleaned TEXT;
BEGIN
  -- Remove caracteres não numéricos
  cleaned := regexp_replace(phone_raw, '[^0-9]', '', 'g');
  
  -- Telefone brasileiro com código de país (55DDNNNNNNNNN)
  IF length(cleaned) >= 12 AND cleaned LIKE '55%' THEN
    RETURN QUERY SELECT 
      '55'::TEXT,
      substring(cleaned from 3 for 2),
      substring(cleaned from 5);
  -- Telefone brasileiro sem código de país (DDNNNNNNNNN)
  ELSIF length(cleaned) >= 10 AND length(cleaned) <= 11 THEN
    RETURN QUERY SELECT 
      '55'::TEXT,
      substring(cleaned from 1 for 2),
      substring(cleaned from 3);
  -- Outros formatos - retorna como está
  ELSE
    RETURN QUERY SELECT 
      NULL::TEXT,
      NULL::TEXT,
      cleaned;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 7. ATUALIZAR REGISTROS EXISTENTES
-- Popula campos estruturados a partir do phone existente
-- =====================================================

UPDATE crm_contacts
SET 
  phone_country_code = parsed.country_code,
  phone_area_code = parsed.area_code,
  phone_number_only = parsed.number_only
FROM (
  SELECT 
    id,
    (parse_phone_number(phone)).*
  FROM crm_contacts
  WHERE phone IS NOT NULL 
    AND phone != ''
    AND phone_country_code IS NULL
) AS parsed
WHERE crm_contacts.id = parsed.id;

-- =====================================================
-- 8. TABELA DE MAPEAMENTO PAÍSES ISO
-- Para converter nomes de país para códigos ISO
-- =====================================================

CREATE TABLE IF NOT EXISTS country_iso_codes (
  code TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_pt TEXT,
  phone_code TEXT
);

-- Inserir países mais comuns
INSERT INTO country_iso_codes (code, name_en, name_pt, phone_code) VALUES
  ('BR', 'Brazil', 'Brasil', '55'),
  ('US', 'United States', 'Estados Unidos', '1'),
  ('PT', 'Portugal', 'Portugal', '351'),
  ('AR', 'Argentina', 'Argentina', '54'),
  ('CL', 'Chile', 'Chile', '56'),
  ('CO', 'Colombia', 'Colômbia', '57'),
  ('MX', 'Mexico', 'México', '52'),
  ('PE', 'Peru', 'Peru', '51'),
  ('UY', 'Uruguay', 'Uruguai', '598'),
  ('PY', 'Paraguay', 'Paraguai', '595'),
  ('ES', 'Spain', 'Espanha', '34'),
  ('FR', 'France', 'França', '33'),
  ('IT', 'Italy', 'Itália', '39'),
  ('DE', 'Germany', 'Alemanha', '49'),
  ('GB', 'United Kingdom', 'Reino Unido', '44'),
  ('CA', 'Canada', 'Canadá', '1'),
  ('AU', 'Australia', 'Austrália', '61'),
  ('JP', 'Japan', 'Japão', '81'),
  ('CN', 'China', 'China', '86'),
  ('KR', 'South Korea', 'Coreia do Sul', '82')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 9. ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_crm_contacts_loyalty 
  ON crm_contacts(loyalty_program_name, loyalty_id) 
  WHERE loyalty_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_contacts_dob 
  ON crm_contacts(date_of_birth) 
  WHERE date_of_birth IS NOT NULL;

-- =====================================================
-- 10. VIEW PARA FORMATO EXPEDIA
-- Retorna contatos no formato esperado pela Expedia
-- =====================================================

CREATE OR REPLACE VIEW crm_contacts_expedia_format AS
SELECT 
  id,
  organization_id,
  first_name AS given_name,
  last_name AS family_name,
  middle_name,
  email,
  -- Phone estruturado
  jsonb_build_object(
    'country_code', COALESCE(phone_country_code, '55'),
    'area_code', phone_area_code,
    'number', phone_number_only
  ) AS phone,
  -- Address estruturado
  jsonb_build_object(
    'line_1', address_street || COALESCE(' ' || address_number, ''),
    'line_2', address_complement,
    'line_3', address_neighborhood,
    'city', address_city,
    'state_province_code', address_state,
    'postal_code', address_zip,
    'country_code', COALESCE(address_country_code, 'BR')
  ) AS address,
  -- Loyalty
  CASE WHEN loyalty_id IS NOT NULL THEN
    jsonb_build_object(
      'program_name', loyalty_program_name,
      'program_id', loyalty_program_id,
      'id', loyalty_id
    )
  ELSE NULL END AS loyalty,
  -- Preferences
  prefers_smoking AS smoking,
  date_of_birth
FROM crm_contacts;

COMMENT ON VIEW crm_contacts_expedia_format IS 'Contatos formatados para API Expedia';

-- =====================================================
-- FIM DA MIGRATION 08
-- =====================================================
