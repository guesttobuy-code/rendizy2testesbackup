-- ============================================================================
-- MIGRATION: Configurações de Provedor de IA
-- Data: 2025-11-26
-- Objetivo: armazenar de forma segura as integrações com provedores de IA
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  base_url TEXT NOT NULL,
  default_model TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  temperature NUMERIC(3,2) NOT NULL DEFAULT 0.20,
  max_tokens INTEGER NOT NULL DEFAULT 512,
  prompt_template TEXT,
  notes TEXT,
  api_key_encrypted TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id)
);

COMMENT ON TABLE ai_provider_configs IS 'Configurações do provedor de IA por organização.';
COMMENT ON COLUMN ai_provider_configs.provider IS 'Identificador do provedor (openai, azure-openai, huggingface, custom).';
COMMENT ON COLUMN ai_provider_configs.api_key_encrypted IS 'API key criptografada. Nunca retorna em claro.';

CREATE INDEX IF NOT EXISTS idx_ai_provider_configs_org ON ai_provider_configs(organization_id);

CREATE OR REPLACE FUNCTION update_ai_provider_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_provider_configs_updated_at ON ai_provider_configs;

CREATE TRIGGER trg_ai_provider_configs_updated_at
  BEFORE UPDATE ON ai_provider_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_provider_configs_updated_at();

