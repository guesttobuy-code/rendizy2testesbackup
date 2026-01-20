-- ============================================================================
-- MIGRAÇÃO: TABELAS DEDICADAS PARA STAYS.NET
-- Data: 15/11/2025
-- Descrição: Cria tabelas dedicadas para armazenar dados do Stays.net
-- ============================================================================

-- ============================================================================
-- TABELA: staysnet_config
-- Armazena configuração da integração Stays.net
-- ============================================================================

CREATE TABLE IF NOT EXISTS staysnet_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL DEFAULT 'global',
  api_key TEXT NOT NULL,
  api_secret TEXT,
  base_url TEXT NOT NULL DEFAULT 'https://stays.net/external/v1',
  account_name TEXT,
  notification_webhook_url TEXT,
  scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'individual')),
  enabled BOOLEAN NOT NULL DEFAULT false,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT,
  
  -- Garantir apenas uma configuração por organização
  UNIQUE(organization_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_staysnet_config_org ON staysnet_config(organization_id);
CREATE INDEX IF NOT EXISTS idx_staysnet_config_enabled ON staysnet_config(enabled);
CREATE INDEX IF NOT EXISTS idx_staysnet_config_scope ON staysnet_config(scope);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_staysnet_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_staysnet_config_updated_at ON staysnet_config;
CREATE TRIGGER trigger_update_staysnet_config_updated_at
  BEFORE UPDATE ON staysnet_config
  FOR EACH ROW
  EXECUTE FUNCTION update_staysnet_config_updated_at();

-- ============================================================================
-- TABELA: staysnet_webhooks
-- Armazena histórico de webhooks recebidos do Stays.net
-- ============================================================================

CREATE TABLE IF NOT EXISTS staysnet_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL DEFAULT 'global',
  action TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_staysnet_webhooks_org ON staysnet_webhooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_staysnet_webhooks_action ON staysnet_webhooks(action);
CREATE INDEX IF NOT EXISTS idx_staysnet_webhooks_received ON staysnet_webhooks(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_staysnet_webhooks_processed ON staysnet_webhooks(processed);
CREATE INDEX IF NOT EXISTS idx_staysnet_webhooks_payload_gin ON staysnet_webhooks USING GIN(payload);

-- ============================================================================
-- TABELA: staysnet_sync_log
-- Armazena log de sincronizações realizadas
-- ============================================================================

CREATE TABLE IF NOT EXISTS staysnet_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL DEFAULT 'global',
  sync_type TEXT NOT NULL CHECK (sync_type IN ('properties', 'reservations', 'calendar', 'prices', 'clients', 'full')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'success', 'error', 'partial')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  items_synced INTEGER DEFAULT 0,
  items_created INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_staysnet_sync_log_org ON staysnet_sync_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_staysnet_sync_log_type ON staysnet_sync_log(sync_type);
CREATE INDEX IF NOT EXISTS idx_staysnet_sync_log_status ON staysnet_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_staysnet_sync_log_started ON staysnet_sync_log(started_at DESC);

-- ============================================================================
-- TABELA: staysnet_reservations_cache
-- Cache de reservas sincronizadas do Stays.net
-- ============================================================================

CREATE TABLE IF NOT EXISTS staysnet_reservations_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL DEFAULT 'global',
  staysnet_reservation_id TEXT NOT NULL,
  reservation_data JSONB NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(organization_id, staysnet_reservation_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_staysnet_reservations_cache_org ON staysnet_reservations_cache(organization_id);
CREATE INDEX IF NOT EXISTS idx_staysnet_reservations_cache_staysnet_id ON staysnet_reservations_cache(staysnet_reservation_id);
CREATE INDEX IF NOT EXISTS idx_staysnet_reservations_cache_synced ON staysnet_reservations_cache(synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_staysnet_reservations_cache_data_gin ON staysnet_reservations_cache USING GIN(reservation_data);

-- ============================================================================
-- TABELA: staysnet_properties_cache
-- Cache de propriedades sincronizadas do Stays.net
-- ============================================================================

CREATE TABLE IF NOT EXISTS staysnet_properties_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL DEFAULT 'global',
  staysnet_property_id TEXT NOT NULL,
  property_data JSONB NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(organization_id, staysnet_property_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_staysnet_properties_cache_org ON staysnet_properties_cache(organization_id);
CREATE INDEX IF NOT EXISTS idx_staysnet_properties_cache_staysnet_id ON staysnet_properties_cache(staysnet_property_id);
CREATE INDEX IF NOT EXISTS idx_staysnet_properties_cache_synced ON staysnet_properties_cache(synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_staysnet_properties_cache_data_gin ON staysnet_properties_cache USING GIN(property_data);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE staysnet_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE staysnet_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE staysnet_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE staysnet_reservations_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE staysnet_properties_cache ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas (permitir tudo por enquanto - ajustar conforme necessário)
DROP POLICY IF EXISTS "Allow all for staysnet_config" ON staysnet_config;
CREATE POLICY "Allow all for staysnet_config" ON staysnet_config
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for staysnet_webhooks" ON staysnet_webhooks;
CREATE POLICY "Allow all for staysnet_webhooks" ON staysnet_webhooks
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for staysnet_sync_log" ON staysnet_sync_log;
CREATE POLICY "Allow all for staysnet_sync_log" ON staysnet_sync_log
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for staysnet_reservations_cache" ON staysnet_reservations_cache;
CREATE POLICY "Allow all for staysnet_reservations_cache" ON staysnet_reservations_cache
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for staysnet_properties_cache" ON staysnet_properties_cache;
CREATE POLICY "Allow all for staysnet_properties_cache" ON staysnet_properties_cache
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- COMENTÁRIOS NAS TABELAS
-- ============================================================================

COMMENT ON TABLE staysnet_config IS 'Configuração da integração Stays.net por organização';
COMMENT ON TABLE staysnet_webhooks IS 'Histórico de webhooks recebidos do Stays.net';
COMMENT ON TABLE staysnet_sync_log IS 'Log de sincronizações realizadas com o Stays.net';
COMMENT ON TABLE staysnet_reservations_cache IS 'Cache de reservas sincronizadas do Stays.net';
COMMENT ON TABLE staysnet_properties_cache IS 'Cache de propriedades sincronizadas do Stays.net';

-- ============================================================================
-- MIGRAÇÃO DE DADOS DO KV_STORE (se existir)
-- ============================================================================

-- Migrar configuração existente do KV Store para a nova tabela
DO $$
DECLARE
  kv_config JSONB;
BEGIN
  -- Tentar buscar configuração do KV Store
  SELECT value INTO kv_config
  FROM kv_store_67caf26a
  WHERE key = 'settings:staysnet'
  LIMIT 1;
  
  -- Se encontrou configuração, migrar para a nova tabela
  IF kv_config IS NOT NULL THEN
    INSERT INTO staysnet_config (
      organization_id,
      api_key,
      api_secret,
      base_url,
      account_name,
      notification_webhook_url,
      scope,
      enabled,
      last_sync
    )
    VALUES (
      COALESCE(kv_config->>'organizationId', 'global'),
      COALESCE(kv_config->>'apiKey', ''),
      kv_config->>'apiSecret',
      COALESCE(kv_config->>'baseUrl', 'https://stays.net/external/v1'),
      kv_config->>'accountName',
      kv_config->>'notificationWebhookUrl',
      COALESCE(kv_config->>'scope', 'global'),
      COALESCE((kv_config->>'enabled')::boolean, false),
      (kv_config->>'lastSync')::timestamptz
    )
    ON CONFLICT (organization_id) DO UPDATE SET
      api_key = EXCLUDED.api_key,
      api_secret = EXCLUDED.api_secret,
      base_url = EXCLUDED.base_url,
      account_name = EXCLUDED.account_name,
      notification_webhook_url = EXCLUDED.notification_webhook_url,
      scope = EXCLUDED.scope,
      enabled = EXCLUDED.enabled,
      last_sync = EXCLUDED.last_sync,
      updated_at = NOW();
    
    RAISE NOTICE '✅ Configuração migrada do KV Store para staysnet_config';
  ELSE
    RAISE NOTICE 'ℹ️ Nenhuma configuração encontrada no KV Store para migrar';
  END IF;
END $$;

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Tabelas Stays.net criadas com sucesso!';
  RAISE NOTICE '   - staysnet_config';
  RAISE NOTICE '   - staysnet_webhooks';
  RAISE NOTICE '   - staysnet_sync_log';
  RAISE NOTICE '   - staysnet_reservations_cache';
  RAISE NOTICE '   - staysnet_properties_cache';
END $$;

