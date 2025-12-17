-- ============================================================================
-- MIGRATION: Permitir múltiplas configurações de IA por organização
-- Data: 2025-11-26
-- Objetivo: Permitir histórico de configurações de IA e múltiplas integrações
-- ============================================================================

-- Remover constraint UNIQUE que limita a uma configuração por organização
ALTER TABLE ai_provider_configs 
DROP CONSTRAINT IF EXISTS ai_provider_configs_organization_id_key;

-- Adicionar campo is_active para marcar qual configuração está ativa
ALTER TABLE ai_provider_configs 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false;

-- Adicionar campo name para identificar a configuração (ex: "OpenAI Principal", "DeepSeek Backup")
ALTER TABLE ai_provider_configs 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Adicionar comentário explicativo
COMMENT ON COLUMN ai_provider_configs.is_active IS 'Indica se esta configuração está ativa. Apenas uma deve estar ativa por organização.';
COMMENT ON COLUMN ai_provider_configs.name IS 'Nome descritivo da configuração (ex: "OpenAI Principal", "DeepSeek Backup")';

-- Criar índice para busca rápida de configurações ativas
CREATE INDEX IF NOT EXISTS idx_ai_provider_configs_active 
ON ai_provider_configs(organization_id, is_active) 
WHERE is_active = true;

-- Criar índice para busca por provider
CREATE INDEX IF NOT EXISTS idx_ai_provider_configs_provider 
ON ai_provider_configs(organization_id, provider);

-- Criar índice para ordenação por data de criação (timeline)
CREATE INDEX IF NOT EXISTS idx_ai_provider_configs_created 
ON ai_provider_configs(organization_id, created_at DESC);

-- Função para garantir que apenas uma configuração esteja ativa por organização
CREATE OR REPLACE FUNCTION ensure_single_active_ai_config()
RETURNS TRIGGER AS $$
BEGIN
  -- Se estamos ativando uma configuração, desativar todas as outras da mesma organização
  IF NEW.is_active = true THEN
    UPDATE ai_provider_configs
    SET is_active = false
    WHERE organization_id = NEW.organization_id
      AND id != NEW.id
      AND is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para garantir apenas uma configuração ativa
DROP TRIGGER IF EXISTS trg_ensure_single_active_ai_config ON ai_provider_configs;
CREATE TRIGGER trg_ensure_single_active_ai_config
  BEFORE INSERT OR UPDATE ON ai_provider_configs
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_active_ai_config();

-- Atualizar configurações existentes para terem um nome padrão e marcar como ativa
UPDATE ai_provider_configs
SET 
  name = CASE 
    WHEN provider = 'openai' THEN 'OpenAI (ChatGPT)'
    WHEN provider = 'deepseek' THEN 'DeepSeek'
    WHEN provider = 'anthropic' THEN 'Anthropic (Claude)'
    WHEN provider = 'google-gemini' THEN 'Google Gemini'
    WHEN provider = 'groq' THEN 'Groq'
    WHEN provider = 'together' THEN 'Together AI'
    WHEN provider = 'azure-openai' THEN 'Azure OpenAI'
    WHEN provider = 'huggingface' THEN 'Hugging Face'
    ELSE 'Configuração Personalizada'
  END,
  is_active = true
WHERE name IS NULL;

