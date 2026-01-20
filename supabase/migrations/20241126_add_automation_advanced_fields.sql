-- ============================================================================
-- MIGRATION: Adicionar campos avançados na tabela automations
-- Data: 2025-11-26
-- Objetivo: Suportar múltiplos módulos, seleção de imóveis e resumos da IA
-- ============================================================================

-- Adicionar campo modules (array de módulos)
ALTER TABLE automations 
ADD COLUMN IF NOT EXISTS modules TEXT[];

-- Adicionar campo properties (array de IDs de imóveis)
ALTER TABLE automations 
ADD COLUMN IF NOT EXISTS properties TEXT[];

-- Adicionar campo ai_interpretation_summary (resumo do que a IA interpretou)
ALTER TABLE automations 
ADD COLUMN IF NOT EXISTS ai_interpretation_summary TEXT;

-- Adicionar campo impact_description (descrição do impacto)
ALTER TABLE automations 
ADD COLUMN IF NOT EXISTS impact_description TEXT;

-- Comentários
COMMENT ON COLUMN automations.modules IS 'Array de módulos relacionados à automação (ex: ["reservas", "chat", "notificacoes"])';
COMMENT ON COLUMN automations.properties IS 'Array de IDs de imóveis onde a automação se aplica. Vazio = global (todos os imóveis)';
COMMENT ON COLUMN automations.ai_interpretation_summary IS 'Resumo do que a IA interpretou da descrição do usuário';
COMMENT ON COLUMN automations.impact_description IS 'Descrição do impacto e do que esta automação faz';

-- Índices para busca
CREATE INDEX IF NOT EXISTS idx_automations_modules ON automations USING GIN(modules);
CREATE INDEX IF NOT EXISTS idx_automations_properties ON automations USING GIN(properties);

