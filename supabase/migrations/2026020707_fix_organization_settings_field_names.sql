-- ============================================================================
-- RENDIZY - FIX ORGANIZATION SETTINGS FIELD NAMES
-- Migração: 2026020707
-- Data: 2026-02-06
-- Objetivo: Alinhar nomes de campos no JSONB com frontend
-- ============================================================================
-- O frontend GlobalSettingsManager.tsx espera nomes diferentes dos que foram
-- inseridos na migration 2026020706. Esta migration corrige.
-- ============================================================================

-- 1. Corrigir security_deposit: renomear campos para match frontend
UPDATE organization_settings
SET settings = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        settings,
        '{security_deposit,amount}',
        COALESCE(settings->'security_deposit'->'security_deposit_amount', '500'::jsonb),
        true
      ),
      '{security_deposit,required_for_all}',
      COALESCE(settings->'security_deposit'->'require_security_deposit', 'true'::jsonb),
      true
    ),
    '{security_deposit,refund_days_after_checkout}',
    '7'::jsonb,
    true
  ),
  '{security_deposit,payment_method}',
  '"pix"'::jsonb,
  true
)
WHERE settings->'security_deposit' IS NOT NULL;

-- 2. Remover campos antigos do security_deposit
UPDATE organization_settings
SET settings = settings #- '{security_deposit,security_deposit_amount}'
                        #- '{security_deposit,require_security_deposit}'
                        #- '{security_deposit,damage_policy}'
WHERE settings->'security_deposit' IS NOT NULL;

-- 3. Adicionar additional_fees se não existir (para compat. frontend)
UPDATE organization_settings
SET settings = jsonb_set(
  settings,
  '{additional_fees}',
  jsonb_build_object(
    'enabled', true,
    'cleaning_fee', 0,
    'cleaning_fee_is_passthrough', false,
    'service_fee_percentage', 0,
    'platform_fee_percentage', 0
  ),
  true
)
WHERE settings->'additional_fees' IS NULL;

-- ============================================================================
-- VERIFICAÇÃO PÓS-MIGRATION
-- ============================================================================
-- SELECT 
--   o.name,
--   os.settings->'security_deposit'->>'amount' as deposito_valor,
--   os.settings->'security_deposit'->>'payment_method' as deposito_metodo,
--   os.settings->'additional_fees'->>'cleaning_fee' as taxa_limpeza
-- FROM organizations o
-- JOIN organization_settings os ON os.organization_id = o.id;
-- ============================================================================
