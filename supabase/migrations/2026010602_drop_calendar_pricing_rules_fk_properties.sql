-- ============================================================
-- MIGRATION: Remove FK from calendar_pricing_rules -> properties
-- ============================================================
-- A tabela `properties` foi descontinuada.
-- O sistema usa `properties` como fonte de imóveis.
-- A FK estava impedindo inserções de regras de calendário.
-- ============================================================

-- 1. Dropar a FK constraint de properties
-- O nome da constraint é: calendar_pricing_rules_property_id_fkey
ALTER TABLE calendar_pricing_rules
  DROP CONSTRAINT IF EXISTS calendar_pricing_rules_property_id_fkey;

-- 2. Adicionar comentário explicativo
COMMENT ON COLUMN calendar_pricing_rules.property_id IS 
  'ID do imóvel em properties (sem FK por design - properties é a tabela mestre)';

-- 3. Verificar se properties está vazia e pode ser dropada (apenas log)
-- DROP TABLE IF EXISTS properties; -- DESCOMENTADO QUANDO CONFIRMADO QUE NÃO HÁ DEPENDÊNCIAS
