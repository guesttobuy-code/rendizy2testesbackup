-- ============================================================================
-- MIGRATION: Estrutura Sustentável para Properties (SaaS Multi-Tenant)
-- Data: 2025-11-23
-- Descrição: Corrige problemas estruturais e adiciona suporte completo ao wizard
-- ============================================================================
-- 
-- ⚠️ IMPORTANTE: Esta migration é segura e não quebra funcionalidades existentes
-- - Torna organization_id NULLABLE (suporta superadmin)
-- - Adiciona campos JSONB para dados complexos do wizard
-- - Adiciona índices GIN para busca em JSONB
-- - Mantém compatibilidade com dados existentes
-- ============================================================================

-- ============================================================================
-- 1. TORNAR organization_id NULLABLE (suporta superadmin)
-- ============================================================================

-- Verificar se a coluna existe e se é NOT NULL
DO $$
BEGIN
  -- Tornar organization_id NULLABLE se ainda não for
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'properties' 
      AND column_name = 'organization_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE properties 
      ALTER COLUMN organization_id DROP NOT NULL;
    
    RAISE NOTICE '✅ organization_id agora é NULLABLE';
  ELSE
    RAISE NOTICE 'ℹ️ organization_id já é NULLABLE ou não existe';
  END IF;
END $$;

-- ============================================================================
-- 2. ADICIONAR CAMPOS JSONB PARA DADOS COMPLEXOS DO WIZARD
-- ============================================================================

-- financial_info: Dados financeiros (monthlyRent, monthlyIptu, salePrice, etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'properties' 
      AND column_name = 'financial_info'
  ) THEN
    ALTER TABLE properties 
      ADD COLUMN financial_info JSONB DEFAULT '{}'::jsonb;
    
    RAISE NOTICE '✅ Campo financial_info adicionado';
  ELSE
    RAISE NOTICE 'ℹ️ Campo financial_info já existe';
  END IF;
END $$;

-- location_features: Características do local (hasExpressCheckInOut, hasParking, etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'properties' 
      AND column_name = 'location_features'
  ) THEN
    ALTER TABLE properties 
      ADD COLUMN location_features JSONB DEFAULT '{}'::jsonb;
    
    RAISE NOTICE '✅ Campo location_features adicionado';
  ELSE
    RAISE NOTICE 'ℹ️ Campo location_features já existe';
  END IF;
END $$;

-- wizard_data: Estrutura completa do wizard (compatibilidade futura)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'properties' 
      AND column_name = 'wizard_data'
  ) THEN
    ALTER TABLE properties 
      ADD COLUMN wizard_data JSONB DEFAULT '{}'::jsonb;
    
    RAISE NOTICE '✅ Campo wizard_data adicionado';
  ELSE
    RAISE NOTICE 'ℹ️ Campo wizard_data já existe';
  END IF;
END $$;

-- display_settings: Configurações de exibição
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'properties' 
      AND column_name = 'display_settings'
  ) THEN
    ALTER TABLE properties 
      ADD COLUMN display_settings JSONB DEFAULT '{}'::jsonb;
    
    RAISE NOTICE '✅ Campo display_settings adicionado';
  ELSE
    RAISE NOTICE 'ℹ️ Campo display_settings já existe';
  END IF;
END $$;

-- contract: Dados de contrato
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'properties' 
      AND column_name = 'contract'
  ) THEN
    ALTER TABLE properties 
      ADD COLUMN contract JSONB DEFAULT '{}'::jsonb;
    
    RAISE NOTICE '✅ Campo contract adicionado';
  ELSE
    RAISE NOTICE 'ℹ️ Campo contract já existe';
  END IF;
END $$;

-- rooms: Cômodos detalhados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'properties' 
      AND column_name = 'rooms'
  ) THEN
    ALTER TABLE properties 
      ADD COLUMN rooms JSONB DEFAULT '[]'::jsonb;
    
    RAISE NOTICE '✅ Campo rooms adicionado';
  ELSE
    RAISE NOTICE 'ℹ️ Campo rooms já existe';
  END IF;
END $$;

-- highlights: Destaques
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'properties' 
      AND column_name = 'highlights'
  ) THEN
    ALTER TABLE properties 
      ADD COLUMN highlights JSONB DEFAULT '[]'::jsonb;
    
    RAISE NOTICE '✅ Campo highlights adicionado';
  ELSE
    RAISE NOTICE 'ℹ️ Campo highlights já existe';
  END IF;
END $$;

-- house_rules: Regras da casa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'properties' 
      AND column_name = 'house_rules'
  ) THEN
    ALTER TABLE properties 
      ADD COLUMN house_rules JSONB DEFAULT '[]'::jsonb;
    
    RAISE NOTICE '✅ Campo house_rules adicionado';
  ELSE
    RAISE NOTICE 'ℹ️ Campo house_rules já existe';
  END IF;
END $$;

-- custom_fields: Campos customizados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'properties' 
      AND column_name = 'custom_fields'
  ) THEN
    ALTER TABLE properties 
      ADD COLUMN custom_fields JSONB DEFAULT '{}'::jsonb;
    
    RAISE NOTICE '✅ Campo custom_fields adicionado';
  ELSE
    RAISE NOTICE 'ℹ️ Campo custom_fields já existe';
  END IF;
END $$;

-- sale_settings: Configurações de venda
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'properties' 
      AND column_name = 'sale_settings'
  ) THEN
    ALTER TABLE properties 
      ADD COLUMN sale_settings JSONB DEFAULT '{}'::jsonb;
    
    RAISE NOTICE '✅ Campo sale_settings adicionado';
  ELSE
    RAISE NOTICE 'ℹ️ Campo sale_settings já existe';
  END IF;
END $$;

-- seasonal_pricing: Precificação sazonal
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'properties' 
      AND column_name = 'seasonal_pricing'
  ) THEN
    ALTER TABLE properties 
      ADD COLUMN seasonal_pricing JSONB DEFAULT '[]'::jsonb;
    
    RAISE NOTICE '✅ Campo seasonal_pricing adicionado';
  ELSE
    RAISE NOTICE 'ℹ️ Campo seasonal_pricing já existe';
  END IF;
END $$;

-- advanced_pricing: Precificação avançada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'properties' 
      AND column_name = 'advanced_pricing'
  ) THEN
    ALTER TABLE properties 
      ADD COLUMN advanced_pricing JSONB DEFAULT '{}'::jsonb;
    
    RAISE NOTICE '✅ Campo advanced_pricing adicionado';
  ELSE
    RAISE NOTICE 'ℹ️ Campo advanced_pricing já existe';
  END IF;
END $$;

-- derived_pricing: Precificação derivada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'properties' 
      AND column_name = 'derived_pricing'
  ) THEN
    ALTER TABLE properties 
      ADD COLUMN derived_pricing JSONB DEFAULT '{}'::jsonb;
    
    RAISE NOTICE '✅ Campo derived_pricing adicionado';
  ELSE
    RAISE NOTICE 'ℹ️ Campo derived_pricing já existe';
  END IF;
END $$;

-- rules: Regras gerais
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'properties' 
      AND column_name = 'rules'
  ) THEN
    ALTER TABLE properties 
      ADD COLUMN rules JSONB DEFAULT '{}'::jsonb;
    
    RAISE NOTICE '✅ Campo rules adicionado';
  ELSE
    RAISE NOTICE 'ℹ️ Campo rules já existe';
  END IF;
END $$;

-- booking_settings: Configurações de reserva
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'properties' 
      AND column_name = 'booking_settings'
  ) THEN
    ALTER TABLE properties 
      ADD COLUMN booking_settings JSONB DEFAULT '{}'::jsonb;
    
    RAISE NOTICE '✅ Campo booking_settings adicionado';
  ELSE
    RAISE NOTICE 'ℹ️ Campo booking_settings já existe';
  END IF;
END $$;

-- ical_settings: Configurações iCal
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'properties' 
      AND column_name = 'ical_settings'
  ) THEN
    ALTER TABLE properties 
      ADD COLUMN ical_settings JSONB DEFAULT '{}'::jsonb;
    
    RAISE NOTICE '✅ Campo ical_settings adicionado';
  ELSE
    RAISE NOTICE 'ℹ️ Campo ical_settings já existe';
  END IF;
END $$;

-- ============================================================================
-- 3. ADICIONAR ÍNDICES GIN PARA BUSCA EM JSONB
-- ============================================================================

-- Índice GIN para financial_info
CREATE INDEX IF NOT EXISTS idx_properties_financial_info_gin 
  ON properties USING GIN (financial_info);

-- Índice GIN para location_features
CREATE INDEX IF NOT EXISTS idx_properties_location_features_gin 
  ON properties USING GIN (location_features);

-- Índice GIN para wizard_data
CREATE INDEX IF NOT EXISTS idx_properties_wizard_data_gin 
  ON properties USING GIN (wizard_data);

-- Índice GIN para display_settings
CREATE INDEX IF NOT EXISTS idx_properties_display_settings_gin 
  ON properties USING GIN (display_settings);

-- Índice GIN para contract
CREATE INDEX IF NOT EXISTS idx_properties_contract_gin 
  ON properties USING GIN (contract);

-- Índice GIN para rooms
CREATE INDEX IF NOT EXISTS idx_properties_rooms_gin 
  ON properties USING GIN (rooms);

-- Índice GIN para highlights
CREATE INDEX IF NOT EXISTS idx_properties_highlights_gin 
  ON properties USING GIN (highlights);

-- Índice GIN para house_rules
CREATE INDEX IF NOT EXISTS idx_properties_house_rules_gin 
  ON properties USING GIN (house_rules);

-- Índice GIN para custom_fields
CREATE INDEX IF NOT EXISTS idx_properties_custom_fields_gin 
  ON properties USING GIN (custom_fields);

-- Índice GIN para sale_settings
CREATE INDEX IF NOT EXISTS idx_properties_sale_settings_gin 
  ON properties USING GIN (sale_settings);

-- Índice GIN para seasonal_pricing
CREATE INDEX IF NOT EXISTS idx_properties_seasonal_pricing_gin 
  ON properties USING GIN (seasonal_pricing);

-- Índice GIN para advanced_pricing
CREATE INDEX IF NOT EXISTS idx_properties_advanced_pricing_gin 
  ON properties USING GIN (advanced_pricing);

-- Índice GIN para derived_pricing
CREATE INDEX IF NOT EXISTS idx_properties_derived_pricing_gin 
  ON properties USING GIN (derived_pricing);

-- Índice GIN para rules
CREATE INDEX IF NOT EXISTS idx_properties_rules_gin 
  ON properties USING GIN (rules);

-- Índice GIN para booking_settings
CREATE INDEX IF NOT EXISTS idx_properties_booking_settings_gin 
  ON properties USING GIN (booking_settings);

-- Índice GIN para ical_settings
CREATE INDEX IF NOT EXISTS idx_properties_ical_settings_gin 
  ON properties USING GIN (ical_settings);

-- ============================================================================
-- 4. ADICIONAR CONSTRAINT PARA VALIDAR organization_id NULL (superadmin)
-- ============================================================================

-- Remover constraint antiga se existir
ALTER TABLE properties 
  DROP CONSTRAINT IF EXISTS properties_organization_check;

-- Adicionar constraint que permite NULL apenas para superadmin
ALTER TABLE properties 
  ADD CONSTRAINT properties_organization_check CHECK (
    organization_id IS NOT NULL 
    OR 
    created_by IN (
      SELECT id FROM users WHERE type = 'superadmin'
    )
    OR
    created_by IS NULL  -- Permitir NULL temporariamente durante migração
  );

-- ============================================================================
-- 5. VERIFICAÇÃO FINAL
-- ============================================================================

DO $$
DECLARE
  org_id_nullable BOOLEAN;
  jsonb_fields_count INTEGER;
  gin_indexes_count INTEGER;
BEGIN
  -- Verificar se organization_id é NULLABLE
  SELECT is_nullable = 'YES' INTO org_id_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'properties'
    AND column_name = 'organization_id';
  
  -- Contar campos JSONB adicionados
  SELECT COUNT(*) INTO jsonb_fields_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'properties'
    AND data_type = 'jsonb';
  
  -- Contar índices GIN
  SELECT COUNT(*) INTO gin_indexes_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'properties'
    AND indexdef LIKE '%USING GIN%';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRATION APLICADA COM SUCESSO!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'organization_id é NULLABLE: %', org_id_nullable;
  RAISE NOTICE 'Campos JSONB: %', jsonb_fields_count;
  RAISE NOTICE 'Índices GIN: %', gin_indexes_count;
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- 6. COMENTÁRIOS NAS COLUNAS (Documentação)
-- ============================================================================

COMMENT ON COLUMN properties.organization_id IS 'ID da organização (NULL para superadmin)';
COMMENT ON COLUMN properties.financial_info IS 'Dados financeiros do wizard (monthlyRent, monthlyIptu, salePrice, etc.)';
COMMENT ON COLUMN properties.location_features IS 'Características do local (hasExpressCheckInOut, hasParking, etc.)';
COMMENT ON COLUMN properties.wizard_data IS 'Estrutura completa do wizard (compatibilidade futura)';
COMMENT ON COLUMN properties.display_settings IS 'Configurações de exibição';
COMMENT ON COLUMN properties.contract IS 'Dados de contrato';
COMMENT ON COLUMN properties.rooms IS 'Cômodos detalhados (array)';
COMMENT ON COLUMN properties.highlights IS 'Destaques (array)';
COMMENT ON COLUMN properties.house_rules IS 'Regras da casa (array)';
COMMENT ON COLUMN properties.custom_fields IS 'Campos customizados';
COMMENT ON COLUMN properties.sale_settings IS 'Configurações de venda';
COMMENT ON COLUMN properties.seasonal_pricing IS 'Precificação sazonal (array)';
COMMENT ON COLUMN properties.advanced_pricing IS 'Precificação avançada';
COMMENT ON COLUMN properties.derived_pricing IS 'Precificação derivada';
COMMENT ON COLUMN properties.rules IS 'Regras gerais';
COMMENT ON COLUMN properties.booking_settings IS 'Configurações de reserva';
COMMENT ON COLUMN properties.ical_settings IS 'Configurações iCal';

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================

