-- ============================================================================
-- MIGRATION: CHANNEX MULTI-ACCOUNT ARCHITECTURE
-- Data: 2026-02-06
-- Descrição: Arquitetura multi-conta para integração Channex.io
--
-- Cenário real: Uma imobiliária (ex: 150 imóveis) pode ter N contas Airbnb,
-- N contas Booking.com, etc., todas gerenciadas sob 1 organization_id.
--
-- Tabelas criadas (8):
--   1. channex_accounts           - Contas Channex (N API keys por org)
--   2. channex_channel_connections - Conexões OTA (N contas por canal)
--   3. channex_property_mappings   - Mapeamento property Rendizy ↔ Channex
--   4. channex_room_type_mappings  - Mapeamento room ↔ room_type
--   5. channex_rate_plan_mappings  - Mapeamento rate_plan ↔ rate_plan
--   6. channex_listing_connections - Listing ↔ canal OTA
--   7. channex_webhooks            - Webhooks registrados no Channex
--   8. channex_webhook_logs        - Logs de eventos recebidos
--
-- RLS: Mesmo padrão das tabelas ota_* existentes
--   - SELECT via properties.user_id = auth.uid()
--   - ALL via service_role
-- ============================================================================

-- ============================================================================
-- FUNÇÃO AUXILIAR: updated_at trigger (reutiliza se já existir)
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- TABELA 1: CHANNEX ACCOUNTS
-- Uma organização pode ter N contas Channex (N API keys)
-- Ex: "Conta Principal Staging", "Conta Produção", "Conta Backup"
-- ============================================================================
CREATE TABLE IF NOT EXISTS channex_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Identificação
  label TEXT NOT NULL,                      -- "Conta Principal", "Conta Airbnb 2"

  -- Credenciais
  api_key TEXT NOT NULL,                    -- user-api-key header value
  environment TEXT NOT NULL DEFAULT 'staging'
    CHECK (environment IN ('staging', 'production')),

  -- Channex IDs (preenchidos após primeiro teste de conexão)
  channex_group_id TEXT,                    -- Group UUID no Channex
  channex_user_id TEXT,                     -- User UUID no Channex

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_connection_test_at TIMESTAMPTZ,
  last_connection_status TEXT               -- 'ok', 'error', 'unauthorized'
    CHECK (last_connection_status IS NULL OR 
           last_connection_status IN ('ok', 'error', 'unauthorized')),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, label)
);

COMMENT ON TABLE channex_accounts IS 'Contas Channex por organização. Cada org pode ter N API keys.';

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_channex_accounts_updated_at ON channex_accounts;
CREATE TRIGGER update_channex_accounts_updated_at
  BEFORE UPDATE ON channex_accounts
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ============================================================================
-- TABELA 2: CHANNEX CHANNEL CONNECTIONS
-- Cada conta Channex pode ter N canais OTA conectados
-- Ex: 8 contas Airbnb, 2 contas Booking.com, etc.
-- ============================================================================
CREATE TABLE IF NOT EXISTS channex_channel_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES channex_accounts(id) ON DELETE CASCADE,

  -- Identificação do canal
  channel_code TEXT NOT NULL,               -- 'airbnb', 'booking', 'expedia', 'vrbo', etc.
  label TEXT NOT NULL,                      -- "Airbnb Conta 1", "Booking Principal"

  -- Channex IDs
  channex_channel_id TEXT,                  -- Channel UUID no Channex

  -- Status
  is_active BOOLEAN DEFAULT true,
  sync_status TEXT DEFAULT 'pending'
    CHECK (sync_status IN ('synced', 'error', 'pending', 'syncing')),
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,

  -- Metadata da conta OTA
  ota_account_email TEXT,                   -- Email da conta na OTA
  ota_account_name TEXT,                    -- Nome/label na OTA
  listings_count INTEGER DEFAULT 0,         -- Quantos listings ativos

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE channex_channel_connections IS 'Conexões com canais OTA via Channex. Cada conta pode ter N canais.';

DROP TRIGGER IF EXISTS update_channex_channel_connections_updated_at ON channex_channel_connections;
CREATE TRIGGER update_channex_channel_connections_updated_at
  BEFORE UPDATE ON channex_channel_connections
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ============================================================================
-- TABELA 3: CHANNEX PROPERTY MAPPINGS
-- Mapeamento: property Rendizy ↔ property Channex
-- 1 property Rendizy = 1 property Channex (por conta)
-- ============================================================================
CREATE TABLE IF NOT EXISTS channex_property_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES channex_accounts(id) ON DELETE CASCADE,

  -- Mapeamento bidirecional
  rendizy_property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  channex_property_id TEXT NOT NULL,        -- UUID da property no Channex

  -- Status de sincronização
  sync_status TEXT DEFAULT 'pending'
    CHECK (sync_status IN ('synced', 'error', 'pending', 'syncing')),
  last_sync_at TIMESTAMPTZ,
  sync_error TEXT,

  -- Snapshot (para detectar divergências)
  last_synced_hash TEXT,                    -- Hash dos dados sincronizados
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(rendizy_property_id),             -- 1 property Rendizy só mapeia para 1 Channex
  UNIQUE(account_id, channex_property_id)  -- 1 property Channex pertence a 1 conta
);

COMMENT ON TABLE channex_property_mappings IS 'Mapeamento property Rendizy ↔ Channex. Uma property Rendizy mapeia para exatamente 1 property Channex.';

DROP TRIGGER IF EXISTS update_channex_property_mappings_updated_at ON channex_property_mappings;
CREATE TRIGGER update_channex_property_mappings_updated_at
  BEFORE UPDATE ON channex_property_mappings
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ============================================================================
-- TABELA 4: CHANNEX ROOM TYPE MAPPINGS
-- Mapeamento: room Rendizy ↔ room_type Channex
-- ============================================================================
CREATE TABLE IF NOT EXISTS channex_room_type_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_mapping_id UUID NOT NULL REFERENCES channex_property_mappings(id) ON DELETE CASCADE,

  -- Mapeamento
  rendizy_room_id UUID NOT NULL REFERENCES property_rooms(id) ON DELETE CASCADE,
  channex_room_type_id TEXT NOT NULL,       -- UUID do room_type no Channex

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(rendizy_room_id),                           -- 1 room = 1 room_type
  UNIQUE(property_mapping_id, channex_room_type_id)  -- unicidade por property
);

COMMENT ON TABLE channex_room_type_mappings IS 'Mapeamento room Rendizy ↔ room_type Channex.';


-- ============================================================================
-- TABELA 5: CHANNEX RATE PLAN MAPPINGS
-- Mapeamento: rate_plan Rendizy ↔ rate_plan Channex
-- ============================================================================
CREATE TABLE IF NOT EXISTS channex_rate_plan_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_mapping_id UUID NOT NULL REFERENCES channex_room_type_mappings(id) ON DELETE CASCADE,

  -- Mapeamento
  rendizy_rate_plan_id UUID NOT NULL REFERENCES rate_plans(id) ON DELETE CASCADE,
  channex_rate_plan_id TEXT NOT NULL,        -- UUID do rate_plan no Channex

  -- Config Channex
  sell_mode TEXT DEFAULT 'per_room'
    CHECK (sell_mode IN ('per_room', 'per_person')),
  currency TEXT DEFAULT 'BRL',

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(rendizy_rate_plan_id),                              -- 1 rate_plan = 1 mapping
  UNIQUE(room_type_mapping_id, channex_rate_plan_id)         -- unicidade por room_type
);

COMMENT ON TABLE channex_rate_plan_mappings IS 'Mapeamento rate_plan Rendizy ↔ Channex. Rate deve ser integer no Channex.';


-- ============================================================================
-- TABELA 6: CHANNEX LISTING CONNECTIONS
-- Qual property está publicada em qual canal OTA (via qual conta)
-- Ex: Property "Casa Copacabana" → Airbnb Conta 1 (listing #12345)
--                                 → Booking.com (listing #98765)
-- ============================================================================
CREATE TABLE IF NOT EXISTS channex_listing_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_mapping_id UUID NOT NULL REFERENCES channex_property_mappings(id) ON DELETE CASCADE,
  channel_connection_id UUID NOT NULL REFERENCES channex_channel_connections(id) ON DELETE CASCADE,

  -- IDs na OTA
  ota_listing_id TEXT,                      -- ID do anúncio na OTA (ex: Airbnb listing ID)
  ota_listing_url TEXT,                     -- URL do anúncio na OTA (opcional)

  -- Status
  is_active BOOLEAN DEFAULT true,
  sync_status TEXT DEFAULT 'pending'
    CHECK (sync_status IN ('synced', 'error', 'pending', 'syncing')),
  last_sync_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints: 1 property por canal/conta
  UNIQUE(property_mapping_id, channel_connection_id)
);

COMMENT ON TABLE channex_listing_connections IS 'Conexão entre property mapeada e canal OTA. Rastreia listing IDs por canal.';


-- ============================================================================
-- TABELA 7: CHANNEX WEBHOOKS
-- Webhooks registrados na API Channex (via POST /api/v1/webhooks)
-- ============================================================================
CREATE TABLE IF NOT EXISTS channex_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES channex_accounts(id) ON DELETE CASCADE,
  property_mapping_id UUID REFERENCES channex_property_mappings(id) ON DELETE SET NULL,

  -- Channex IDs
  channex_webhook_id TEXT NOT NULL,         -- UUID do webhook no Channex
  
  -- Configuração
  event_mask TEXT NOT NULL DEFAULT '*',     -- '*' = todos eventos
  callback_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  send_data BOOLEAN DEFAULT true,           -- Channex envia payload completo

  -- Headers customizados (para validação)
  secret_header_name TEXT,                  -- Nome do header de validação
  secret_header_value TEXT,                 -- Valor secreto

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE channex_webhooks IS 'Webhooks registrados na API Channex. Criados via POST /api/v1/webhooks.';


-- ============================================================================
-- TABELA 8: CHANNEX WEBHOOK LOGS
-- Log de TODOS os eventos recebidos via webhook do Channex
-- Usado para: auditoria, retry, debugging, reconciliação
-- ============================================================================
CREATE TABLE IF NOT EXISTS channex_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES channex_accounts(id) ON DELETE SET NULL,
  property_mapping_id UUID REFERENCES channex_property_mappings(id) ON DELETE SET NULL,

  -- Evento
  event_type TEXT NOT NULL,                 -- 'booking', 'booking_new', 'booking_modification', etc.
  event_id TEXT,                            -- ID único do evento (idempotência)
  channex_property_id TEXT,                 -- Property UUID do Channex (para lookup rápido)
  ota_name TEXT,                            -- 'Airbnb', 'BookingCom', etc.

  -- Payload bruto
  payload JSONB NOT NULL,

  -- Processamento
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,

  -- Resultado do processamento
  result_type TEXT,                         -- 'reservation_created', 'reservation_updated', 'reservation_cancelled'
  result_id TEXT,                           -- ID da entidade criada/atualizada no Rendizy

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE channex_webhook_logs IS 'Log de todos os eventos webhook recebidos do Channex. Armazena payload bruto para auditoria e retry.';


-- ============================================================================
-- ÍNDICES DE PERFORMANCE
-- ============================================================================

-- channex_accounts
CREATE INDEX IF NOT EXISTS idx_chx_accounts_org 
  ON channex_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_chx_accounts_active 
  ON channex_accounts(is_active) WHERE is_active = true;

-- channex_channel_connections
CREATE INDEX IF NOT EXISTS idx_chx_channels_account 
  ON channex_channel_connections(account_id);
CREATE INDEX IF NOT EXISTS idx_chx_channels_code 
  ON channex_channel_connections(channel_code);
CREATE INDEX IF NOT EXISTS idx_chx_channels_active 
  ON channex_channel_connections(is_active) WHERE is_active = true;

-- channex_property_mappings
CREATE INDEX IF NOT EXISTS idx_chx_prop_map_account 
  ON channex_property_mappings(account_id);
CREATE INDEX IF NOT EXISTS idx_chx_prop_map_rendizy 
  ON channex_property_mappings(rendizy_property_id);
CREATE INDEX IF NOT EXISTS idx_chx_prop_map_channex 
  ON channex_property_mappings(channex_property_id);
CREATE INDEX IF NOT EXISTS idx_chx_prop_map_sync 
  ON channex_property_mappings(sync_status) WHERE sync_status != 'synced';

-- channex_room_type_mappings
CREATE INDEX IF NOT EXISTS idx_chx_room_map_prop 
  ON channex_room_type_mappings(property_mapping_id);

-- channex_rate_plan_mappings
CREATE INDEX IF NOT EXISTS idx_chx_rate_map_room 
  ON channex_rate_plan_mappings(room_type_mapping_id);

-- channex_listing_connections
CREATE INDEX IF NOT EXISTS idx_chx_listing_prop 
  ON channex_listing_connections(property_mapping_id);
CREATE INDEX IF NOT EXISTS idx_chx_listing_channel 
  ON channex_listing_connections(channel_connection_id);
CREATE INDEX IF NOT EXISTS idx_chx_listing_active 
  ON channex_listing_connections(is_active) WHERE is_active = true;

-- channex_webhooks
CREATE INDEX IF NOT EXISTS idx_chx_webhook_account 
  ON channex_webhooks(account_id);
CREATE INDEX IF NOT EXISTS idx_chx_webhook_prop 
  ON channex_webhooks(property_mapping_id) WHERE property_mapping_id IS NOT NULL;

-- channex_webhook_logs (critical para queries frequentes)
CREATE INDEX IF NOT EXISTS idx_chx_wh_logs_created 
  ON channex_webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chx_wh_logs_processed 
  ON channex_webhook_logs(processed) WHERE NOT processed;
CREATE INDEX IF NOT EXISTS idx_chx_wh_logs_event_type 
  ON channex_webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_chx_wh_logs_ota 
  ON channex_webhook_logs(ota_name) WHERE ota_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chx_wh_logs_property 
  ON channex_webhook_logs(channex_property_id) WHERE channex_property_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chx_wh_logs_retry 
  ON channex_webhook_logs(next_retry_at) WHERE NOT processed AND retry_count < max_retries;
CREATE UNIQUE INDEX IF NOT EXISTS idx_chx_wh_logs_idempotency 
  ON channex_webhook_logs(event_id) WHERE event_id IS NOT NULL;


-- ============================================================================
-- ROW LEVEL SECURITY
-- Padrão: Mesmo das tabelas ota_* existentes
--   - SELECT para usuários autenticados via properties.user_id
--   - ALL para service_role (backend Edge Functions)
-- ============================================================================
ALTER TABLE channex_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE channex_channel_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE channex_property_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE channex_room_type_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE channex_rate_plan_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE channex_listing_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE channex_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE channex_webhook_logs ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------
-- RLS: channex_accounts
-- -----------------------------------------------------------------------
CREATE POLICY "channex_accounts_select_own_org" ON channex_accounts
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM properties WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "channex_accounts_service_role" ON channex_accounts
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- -----------------------------------------------------------------------
-- RLS: channex_channel_connections (via account → org)
-- -----------------------------------------------------------------------
CREATE POLICY "channex_channels_select_own_org" ON channex_channel_connections
  FOR SELECT USING (
    account_id IN (
      SELECT id FROM channex_accounts
      WHERE organization_id IN (
        SELECT organization_id FROM properties WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "channex_channels_service_role" ON channex_channel_connections
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- -----------------------------------------------------------------------
-- RLS: channex_property_mappings (via property owner)
-- -----------------------------------------------------------------------
CREATE POLICY "channex_prop_map_select_own" ON channex_property_mappings
  FOR SELECT USING (
    rendizy_property_id IN (
      SELECT id FROM properties WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "channex_prop_map_service_role" ON channex_property_mappings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- -----------------------------------------------------------------------
-- RLS: channex_room_type_mappings (via property mapping → property)
-- -----------------------------------------------------------------------
CREATE POLICY "channex_room_map_select_own" ON channex_room_type_mappings
  FOR SELECT USING (
    property_mapping_id IN (
      SELECT id FROM channex_property_mappings
      WHERE rendizy_property_id IN (
        SELECT id FROM properties WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "channex_room_map_service_role" ON channex_room_type_mappings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- -----------------------------------------------------------------------
-- RLS: channex_rate_plan_mappings (via room mapping → property)
-- -----------------------------------------------------------------------
CREATE POLICY "channex_rate_map_select_own" ON channex_rate_plan_mappings
  FOR SELECT USING (
    room_type_mapping_id IN (
      SELECT id FROM channex_room_type_mappings
      WHERE property_mapping_id IN (
        SELECT id FROM channex_property_mappings
        WHERE rendizy_property_id IN (
          SELECT id FROM properties WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "channex_rate_map_service_role" ON channex_rate_plan_mappings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- -----------------------------------------------------------------------
-- RLS: channex_listing_connections (via property mapping)
-- -----------------------------------------------------------------------
CREATE POLICY "channex_listing_select_own" ON channex_listing_connections
  FOR SELECT USING (
    property_mapping_id IN (
      SELECT id FROM channex_property_mappings
      WHERE rendizy_property_id IN (
        SELECT id FROM properties WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "channex_listing_service_role" ON channex_listing_connections
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- -----------------------------------------------------------------------
-- RLS: channex_webhooks (via account → org)
-- -----------------------------------------------------------------------
CREATE POLICY "channex_webhooks_select_own_org" ON channex_webhooks
  FOR SELECT USING (
    account_id IN (
      SELECT id FROM channex_accounts
      WHERE organization_id IN (
        SELECT organization_id FROM properties WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "channex_webhooks_service_role" ON channex_webhooks
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- -----------------------------------------------------------------------
-- RLS: channex_webhook_logs (via account → org)
-- -----------------------------------------------------------------------
CREATE POLICY "channex_wh_logs_select_own_org" ON channex_webhook_logs
  FOR SELECT USING (
    account_id IS NULL OR
    account_id IN (
      SELECT id FROM channex_accounts
      WHERE organization_id IN (
        SELECT organization_id FROM properties WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "channex_wh_logs_service_role" ON channex_webhook_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');


-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================
DO $$
DECLARE
  tbl TEXT;
  tbl_count INTEGER;
BEGIN
  tbl_count := 0;
  FOR tbl IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename LIKE 'channex_%'
    ORDER BY tablename
  LOOP
    RAISE NOTICE '✅ Tabela criada: %', tbl;
    tbl_count := tbl_count + 1;
  END LOOP;
  
  IF tbl_count = 8 THEN
    RAISE NOTICE '🎉 Todas as 8 tabelas Channex criadas com sucesso!';
  ELSE
    RAISE WARNING '⚠️ Esperadas 8 tabelas, encontradas: %', tbl_count;
  END IF;
END $$;
