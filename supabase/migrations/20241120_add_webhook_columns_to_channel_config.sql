-- ============================================================================
-- MIGRATION: Adicionar colunas de webhook à organization_channel_config
-- Data: 2024-11-20
-- ============================================================================

-- Adicionar colunas de webhook se não existirem
DO $$
BEGIN
  -- Adicionar webhook_url se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_channel_config' 
    AND column_name = 'webhook_url'
  ) THEN
    ALTER TABLE organization_channel_config 
    ADD COLUMN webhook_url TEXT;
  END IF;

  -- Adicionar webhook_events se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_channel_config' 
    AND column_name = 'webhook_events'
  ) THEN
    ALTER TABLE organization_channel_config 
    ADD COLUMN webhook_events TEXT[];
  END IF;

  -- Adicionar webhook_by_events se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_channel_config' 
    AND column_name = 'webhook_by_events'
  ) THEN
    ALTER TABLE organization_channel_config 
    ADD COLUMN webhook_by_events BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Comentários
COMMENT ON COLUMN organization_channel_config.webhook_url IS 'URL do webhook configurado na Evolution API';
COMMENT ON COLUMN organization_channel_config.webhook_events IS 'Array de eventos monitorados pelo webhook';
COMMENT ON COLUMN organization_channel_config.webhook_by_events IS 'Se true, cria uma rota de webhook diferente para cada tipo de evento';

