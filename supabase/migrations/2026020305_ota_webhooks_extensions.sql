-- ============================================================================
-- RENDIZY - MODELO DE DADOS UNIVERSAL PARA OTAs
-- Migração 5 de 5: WEBHOOKS, PROPERTY EXTENSIONS & SYNC
-- ============================================================================
-- Versão: 1.0
-- Data: 2026-02-03
-- Objetivo: Suportar webhooks de OTAs, extensões de propriedade e sincronização
-- ============================================================================

-- ============================================================================
-- TABELA 1: OTA WEBHOOKS
-- Webhooks recebidos de todas as OTAs
-- ============================================================================
CREATE TABLE IF NOT EXISTS ota_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- ============================================================================
  -- IDENTIFICAÇÃO DO EVENTO
  -- ============================================================================
  event_id TEXT,                          -- ID único do evento na OTA (idempotency)
  event_type TEXT NOT NULL,               -- Tipo do evento (ex: 'itinerary.agent.create')
  event_time TIMESTAMPTZ,                 -- Timestamp do evento na OTA
  
  -- OTA
  ota TEXT NOT NULL,                      -- 'expedia', 'booking', 'airbnb', 'staysnet'
  
  -- ============================================================================
  -- REFERÊNCIAS
  -- ============================================================================
  -- IDs externos
  ota_itinerary_id TEXT,                  -- ID do itinerary/booking na OTA
  ota_property_id TEXT,                   -- ID da property na OTA
  ota_room_id TEXT,                       -- ID do room na OTA
  
  -- IDs internos (preenchidos após processamento)
  reservation_id TEXT REFERENCES reservations(id),
  property_id UUID REFERENCES properties(id),
  
  -- ============================================================================
  -- PAYLOAD
  -- ============================================================================
  payload JSONB NOT NULL,                 -- Payload completo do webhook
  headers JSONB,                          -- Headers do request (para debug)
  
  -- ============================================================================
  -- PROCESSAMENTO
  -- ============================================================================
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  processing_attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  
  -- Resultado do processamento
  processing_result TEXT CHECK (processing_result IN (
    'success',              -- Processado com sucesso
    'skipped',              -- Ignorado (duplicado, irrelevante, etc)
    'failed',               -- Falhou
    'pending'               -- Pendente de processamento manual
  )),
  processing_error TEXT,
  processing_details JSONB,
  
  -- ============================================================================
  -- VALIDAÇÃO
  -- ============================================================================
  signature TEXT,                         -- Assinatura do webhook
  signature_valid BOOLEAN,                -- Assinatura válida?
  
  -- ============================================================================
  -- FLAGS
  -- ============================================================================
  is_test BOOLEAN DEFAULT false,          -- Evento de teste?
  requires_action BOOLEAN DEFAULT false,  -- Requer ação manual?
  
  -- ============================================================================
  -- METADATA
  -- ============================================================================
  source_ip TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para busca e processamento
CREATE INDEX IF NOT EXISTS idx_ota_webhooks_org ON ota_webhooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_ota_webhooks_ota ON ota_webhooks(ota);
CREATE INDEX IF NOT EXISTS idx_ota_webhooks_event_id ON ota_webhooks(ota, event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ota_webhooks_event_type ON ota_webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_ota_webhooks_processed ON ota_webhooks(processed) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_ota_webhooks_reservation ON ota_webhooks(reservation_id) WHERE reservation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ota_webhooks_property ON ota_webhooks(property_id) WHERE property_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ota_webhooks_created ON ota_webhooks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ota_webhooks_requires_action ON ota_webhooks(requires_action) WHERE requires_action = true;

-- Índice único para idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_ota_webhooks_idempotency ON ota_webhooks(ota, event_id) WHERE event_id IS NOT NULL;

COMMENT ON TABLE ota_webhooks IS 'Webhooks recebidos de todas as OTAs - log centralizado';
COMMENT ON COLUMN ota_webhooks.event_id IS 'ID único do evento na OTA - usado para idempotency';

-- ============================================================================
-- TABELA 2: OTA WEBHOOK SUBSCRIPTIONS
-- Configuração de subscriptions de webhook por organização
-- ============================================================================
CREATE TABLE IF NOT EXISTS ota_webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- OTA
  ota TEXT NOT NULL,
  
  -- ============================================================================
  -- CONFIGURAÇÃO
  -- ============================================================================
  endpoint_url TEXT,                      -- URL do webhook (se configurável)
  secret_key TEXT,                        -- Chave para validar assinaturas
  
  -- Eventos subscritos (NULL = todos)
  subscribed_events TEXT[],               -- ['itinerary.agent.create', 'itinerary.agent.cancel', ...]
  
  -- ============================================================================
  -- STATUS
  -- ============================================================================
  is_active BOOLEAN DEFAULT true,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  
  -- Último evento recebido
  last_event_at TIMESTAMPTZ,
  last_event_type TEXT,
  
  -- Estatísticas
  total_events_received INTEGER DEFAULT 0,
  total_events_processed INTEGER DEFAULT 0,
  total_events_failed INTEGER DEFAULT 0,
  
  -- ============================================================================
  -- METADATA
  -- ============================================================================
  ota_subscription_id TEXT,               -- ID da subscription na OTA
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ota_webhook_subs_org ON ota_webhook_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_ota_webhook_subs_ota ON ota_webhook_subscriptions(ota);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ota_webhook_subs_unique ON ota_webhook_subscriptions(organization_id, ota);

COMMENT ON TABLE ota_webhook_subscriptions IS 'Configuração de subscriptions de webhook por organização';

-- ============================================================================
-- TABELA 3: PROPERTY OTA EXTENSIONS
-- Dados específicos de OTA que não fazem sentido no modelo principal
-- ============================================================================
CREATE TABLE IF NOT EXISTS property_ota_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  ota TEXT NOT NULL,
  
  -- ============================================================================
  -- IDENTIFICADORES NA OTA
  -- ============================================================================
  ota_property_id TEXT,                   -- ID da property na OTA
  ota_listing_id TEXT,                    -- ID do listing (se diferente)
  ota_listing_url TEXT,                   -- URL do anúncio
  
  -- ============================================================================
  -- STATUS NA OTA
  -- ============================================================================
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',                -- Rascunho
    'pending_review',       -- Aguardando revisão
    'active',               -- Ativo/publicado
    'inactive',             -- Inativo
    'suspended',            -- Suspenso
    'archived'              -- Arquivado
  )),
  
  status_reason TEXT,
  status_updated_at TIMESTAMPTZ,
  
  -- ============================================================================
  -- DADOS ESPECÍFICOS DA OTA (JSONB flexível)
  -- ============================================================================
  ota_data JSONB DEFAULT '{}',
  /*
  Para Expedia:
  {
    "supply_source": "vrbo",
    "category_id": "15",
    "category_name": "Apartment",
    "registry_number": "ABC123",
    "tax_id": "12.345.678/0001-00",
    "business_model": {
      "expedia_collect": true,
      "property_collect": true
    },
    "payment_registration_recommended": true,
    "rank": 4.5,
    "chain": { "id": "123", "name": "Chain Name" },
    "brand": { "id": "456", "name": "Brand Name" }
  }
  
  Para Airbnb:
  {
    "listing_status": "published",
    "instant_book": true,
    "professional_host": true,
    "superhost": false,
    "listing_type": "entire_home"
  }
  
  Para Booking:
  {
    "property_class": 4,
    "review_score": 8.5,
    "genius_eligible": true,
    "preferred_partner": false,
    "commission_rate": 15
  }
  
  Para Stays.net:
  {
    "internal_code": "APT001",
    "channel_manager_id": "xyz"
  }
  */
  
  -- ============================================================================
  -- CONFIGURAÇÕES DE SYNC
  -- ============================================================================
  sync_enabled BOOLEAN DEFAULT true,
  
  -- O que sincronizar
  sync_content BOOLEAN DEFAULT true,      -- Dados do imóvel
  sync_rates BOOLEAN DEFAULT true,        -- Preços/tarifas
  sync_availability BOOLEAN DEFAULT true, -- Disponibilidade
  sync_reservations BOOLEAN DEFAULT true, -- Reservas
  
  -- Última sincronização
  last_synced_at TIMESTAMPTZ,
  last_sync_result TEXT,
  last_sync_error TEXT,
  
  -- Próxima sincronização agendada
  next_sync_at TIMESTAMPTZ,
  
  -- ============================================================================
  -- ESTATÍSTICAS
  -- ============================================================================
  total_reservations INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  average_rating DECIMAL(3,2),
  review_count INTEGER DEFAULT 0,
  
  -- ============================================================================
  -- METADATA
  -- ============================================================================
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(property_id, ota)
);

CREATE INDEX IF NOT EXISTS idx_property_ota_ext_property ON property_ota_extensions(property_id);
CREATE INDEX IF NOT EXISTS idx_property_ota_ext_ota ON property_ota_extensions(ota);
CREATE INDEX IF NOT EXISTS idx_property_ota_ext_ota_id ON property_ota_extensions(ota, ota_property_id) WHERE ota_property_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_property_ota_ext_sync ON property_ota_extensions(sync_enabled, next_sync_at) WHERE sync_enabled = true;

COMMENT ON TABLE property_ota_extensions IS 'Dados específicos de OTA para cada propriedade';
COMMENT ON COLUMN property_ota_extensions.ota_data IS 'Dados flexíveis específicos da OTA em formato JSON';

-- ============================================================================
-- TABELA 4: SYNC LOGS
-- Log de sincronizações com OTAs
-- ============================================================================
CREATE TABLE IF NOT EXISTS ota_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Referências
  property_id UUID REFERENCES properties(id),
  reservation_id TEXT REFERENCES reservations(id),
  rate_plan_id UUID REFERENCES rate_plans(id),
  
  -- OTA
  ota TEXT NOT NULL,
  
  -- ============================================================================
  -- TIPO DE SINCRONIZAÇÃO
  -- ============================================================================
  sync_type TEXT NOT NULL CHECK (sync_type IN (
    'content_push',         -- Enviar conteúdo para OTA
    'content_pull',         -- Buscar conteúdo da OTA
    'rates_push',           -- Enviar preços para OTA
    'rates_pull',           -- Buscar preços da OTA
    'availability_push',    -- Enviar disponibilidade
    'availability_pull',    -- Buscar disponibilidade
    'reservation_create',   -- Criar reserva na OTA
    'reservation_update',   -- Atualizar reserva na OTA
    'reservation_cancel',   -- Cancelar reserva na OTA
    'reservation_pull',     -- Buscar reservas da OTA
    'full_sync'             -- Sincronização completa
  )),
  
  -- Direção
  direction TEXT NOT NULL CHECK (direction IN ('push', 'pull')),
  
  -- ============================================================================
  -- STATUS
  -- ============================================================================
  status TEXT DEFAULT 'started' CHECK (status IN (
    'started',
    'in_progress',
    'completed',
    'partial',              -- Parcialmente completado
    'failed',
    'cancelled'
  )),
  
  -- ============================================================================
  -- DADOS DA SINCRONIZAÇÃO
  -- ============================================================================
  request_data JSONB,                     -- Dados enviados
  response_data JSONB,                    -- Resposta recebida
  
  -- Estatísticas
  items_total INTEGER DEFAULT 0,
  items_processed INTEGER DEFAULT 0,
  items_succeeded INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  items_skipped INTEGER DEFAULT 0,
  
  -- ============================================================================
  -- TEMPOS
  -- ============================================================================
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- ============================================================================
  -- ERROS
  -- ============================================================================
  error_code TEXT,
  error_message TEXT,
  error_details JSONB,
  
  -- ============================================================================
  -- METADATA
  -- ============================================================================
  triggered_by TEXT,                      -- 'manual', 'scheduled', 'webhook', 'api'
  triggered_by_user_id UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_org ON ota_sync_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_property ON ota_sync_logs(property_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_ota ON ota_sync_logs(ota);
CREATE INDEX IF NOT EXISTS idx_sync_logs_type ON ota_sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON ota_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created ON ota_sync_logs(created_at DESC);

COMMENT ON TABLE ota_sync_logs IS 'Log de sincronizações com OTAs';

-- ============================================================================
-- TABELA 5: OTA API CREDENTIALS
-- Credenciais de API para cada OTA por organização
-- ============================================================================
CREATE TABLE IF NOT EXISTS ota_api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- OTA
  ota TEXT NOT NULL,
  
  -- ============================================================================
  -- CREDENCIAIS (criptografadas no application layer)
  -- ============================================================================
  api_key TEXT,
  api_secret TEXT,
  access_token TEXT,
  refresh_token TEXT,
  
  -- OAuth
  oauth_client_id TEXT,
  oauth_client_secret TEXT,
  oauth_scope TEXT,
  
  -- Expiration
  token_expires_at TIMESTAMPTZ,
  
  -- ============================================================================
  -- AMBIENTE
  -- ============================================================================
  environment TEXT DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  
  -- ============================================================================
  -- ENDPOINT CUSTOMIZADO
  -- ============================================================================
  api_base_url TEXT,                      -- URL base customizada (se houver)
  
  -- ============================================================================
  -- STATUS
  -- ============================================================================
  is_active BOOLEAN DEFAULT true,
  is_valid BOOLEAN,                       -- Credenciais válidas?
  last_validated_at TIMESTAMPTZ,
  validation_error TEXT,
  
  -- ============================================================================
  -- RATE LIMITS
  -- ============================================================================
  rate_limit_requests INTEGER,            -- Requests por minuto/hora
  rate_limit_window TEXT,                 -- 'minute', 'hour', 'day'
  current_usage INTEGER DEFAULT 0,
  usage_reset_at TIMESTAMPTZ,
  
  -- ============================================================================
  -- METADATA
  -- ============================================================================
  account_id TEXT,                        -- ID da conta na OTA
  account_name TEXT,                      -- Nome da conta
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, ota, environment)
);

CREATE INDEX IF NOT EXISTS idx_ota_credentials_org ON ota_api_credentials(organization_id);
CREATE INDEX IF NOT EXISTS idx_ota_credentials_ota ON ota_api_credentials(ota);
CREATE INDEX IF NOT EXISTS idx_ota_credentials_active ON ota_api_credentials(is_active) WHERE is_active = true;

COMMENT ON TABLE ota_api_credentials IS 'Credenciais de API para cada OTA por organização';

-- ============================================================================
-- ALTERAÇÕES NA TABELA PROPERTIES
-- Adicionar campos universais para OTAs
-- ============================================================================
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_rating DECIMAL(2,1);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_rating_type TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS category_id TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS category_name TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS supply_source TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS expedia_collect BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_collect BOOLEAN DEFAULT true;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS registry_number TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS chain_id TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS chain_name TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS brand_id TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS brand_name TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS multi_unit BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS payment_registration_recommended BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS descriptions JSONB DEFAULT '{}';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS statistics JSONB DEFAULT '{}';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS spoken_languages TEXT[];
ALTER TABLE properties ADD COLUMN IF NOT EXISTS themes TEXT[];
ALTER TABLE properties ADD COLUMN IF NOT EXISTS onsite_payment_types TEXT[];

COMMENT ON COLUMN properties.category_id IS 'ID da categoria canônica do tipo de propriedade';
COMMENT ON COLUMN properties.descriptions IS 'Descrições categorizadas: amenities, dining, location, etc';
COMMENT ON COLUMN properties.statistics IS 'Estatísticas: total_rooms, floors, year_built, etc';

-- ============================================================================
-- TABELA 6: GEOGRAPHIC REGIONS
-- Regiões geográficas (para Geography API do Expedia)
-- ============================================================================
CREATE TABLE IF NOT EXISTS geographic_regions (
  id TEXT PRIMARY KEY,                    -- ID da região (pode ser do Expedia ou interno)
  
  -- ============================================================================
  -- DADOS DA REGIÃO
  -- ============================================================================
  name TEXT NOT NULL,
  name_full TEXT,                         -- Nome completo com hierarquia
  
  type TEXT NOT NULL CHECK (type IN (
    'continent',
    'country',
    'province_state',
    'multi_city_vicinity',
    'city',
    'neighborhood',
    'airport',
    'poi',                  -- Point of Interest
    'metro_station',
    'train_station'
  )),
  
  -- Hierarquia
  parent_id TEXT REFERENCES geographic_regions(id),
  country_code TEXT,                      -- ISO 2-letter
  
  -- Coordenadas
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  
  -- Bounding box (para busca)
  bbox_north DECIMAL(10,7),
  bbox_south DECIMAL(10,7),
  bbox_east DECIMAL(10,7),
  bbox_west DECIMAL(10,7),
  
  -- ============================================================================
  -- METADADOS
  -- ============================================================================
  categories TEXT[],                      -- ['hotel', 'vacation_rental', etc]
  property_count INTEGER DEFAULT 0,
  
  -- Tags de busca
  tags TEXT[],
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regions_type ON geographic_regions(type);
CREATE INDEX IF NOT EXISTS idx_regions_parent ON geographic_regions(parent_id);
CREATE INDEX IF NOT EXISTS idx_regions_country ON geographic_regions(country_code);
CREATE INDEX IF NOT EXISTS idx_regions_coords ON geographic_regions(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_regions_name ON geographic_regions USING gin(to_tsvector('portuguese', name));

COMMENT ON TABLE geographic_regions IS 'Regiões geográficas para busca e filtro';

-- ============================================================================
-- TABELA 7: OTA REGION MAPPINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS ota_region_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  region_id TEXT NOT NULL REFERENCES geographic_regions(id) ON DELETE CASCADE,
  ota TEXT NOT NULL,
  ota_region_id TEXT NOT NULL,
  ota_region_name TEXT,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(ota, ota_region_id)
);

CREATE INDEX IF NOT EXISTS idx_ota_region_region ON ota_region_mappings(region_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_ota_webhooks_updated_at ON ota_webhooks;
CREATE TRIGGER update_ota_webhooks_updated_at
  BEFORE UPDATE ON ota_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_property_ota_ext_updated_at ON property_ota_extensions;
CREATE TRIGGER update_property_ota_ext_updated_at
  BEFORE UPDATE ON property_ota_extensions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ota_credentials_updated_at ON ota_api_credentials;
CREATE TRIGGER update_ota_credentials_updated_at
  BEFORE UPDATE ON ota_api_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar estatísticas de webhook subscription
CREATE OR REPLACE FUNCTION update_webhook_subscription_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ota_webhook_subscriptions 
  SET 
    total_events_received = total_events_received + 1,
    last_event_at = NEW.created_at,
    last_event_type = NEW.event_type,
    total_events_processed = total_events_processed + CASE WHEN NEW.processed THEN 1 ELSE 0 END
  WHERE organization_id = NEW.organization_id AND ota = NEW.ota;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_webhook_stats_trigger ON ota_webhooks;
CREATE TRIGGER update_webhook_stats_trigger
  AFTER INSERT ON ota_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_subscription_stats();

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================
-- NOTA: O Rendizy usa multi-tenancy via organization_id direto nas tabelas.
-- O backend (Edge Functions) é responsável por filtrar por organization_id.
-- RLS aqui é para proteção extra via service_role.
-- ============================================================================
ALTER TABLE ota_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_ota_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_api_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE geographic_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_region_mappings ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "OTA webhooks via org" ON ota_webhooks
  FOR SELECT USING (
    organization_id IS NULL OR
    organization_id IN (SELECT organization_id FROM properties WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role full access ota webhooks" ON ota_webhooks
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "OTA webhook subscriptions via org" ON ota_webhook_subscriptions
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM properties WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role full access ota webhook subscriptions" ON ota_webhook_subscriptions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Property OTA extensions via property" ON property_ota_extensions
  FOR SELECT USING (
    property_id IN (SELECT id FROM properties WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role full access property ota extensions" ON property_ota_extensions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "OTA sync logs via org" ON ota_sync_logs
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM properties WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role full access ota sync logs" ON ota_sync_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "OTA credentials via org" ON ota_api_credentials
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM properties WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role full access ota api credentials" ON ota_api_credentials
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Geographic regions readable by all" ON geographic_regions
  FOR SELECT USING (true);

CREATE POLICY "Service role full access geographic regions" ON geographic_regions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "OTA region mappings readable by all" ON ota_region_mappings
  FOR SELECT USING (true);

CREATE POLICY "Service role full access ota region mappings" ON ota_region_mappings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- FUNÇÃO: Processar webhook de OTA
-- ============================================================================
CREATE OR REPLACE FUNCTION process_ota_webhook(webhook_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_webhook RECORD;
  v_result JSONB;
BEGIN
  -- Buscar webhook
  SELECT * INTO v_webhook FROM ota_webhooks WHERE id = webhook_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Webhook not found');
  END IF;
  
  -- Marcar como em processamento
  UPDATE ota_webhooks 
  SET 
    processing_attempts = processing_attempts + 1,
    last_attempt_at = NOW()
  WHERE id = webhook_id;
  
  -- Lógica de processamento por OTA e tipo de evento
  -- (implementar no application layer, mas registrar resultado aqui)
  
  RETURN jsonb_build_object('success', true, 'webhook_id', webhook_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS ÚTEIS
-- ============================================================================

-- View: Propriedades com status de sincronização
CREATE OR REPLACE VIEW v_property_sync_status AS
SELECT 
  p.id AS property_id,
  p.organization_id,
  p.status AS property_status,
  poe.ota,
  poe.ota_property_id,
  poe.status AS ota_status,
  poe.sync_enabled,
  poe.last_synced_at,
  poe.last_sync_result,
  CASE 
    WHEN poe.last_synced_at IS NULL THEN 'never'
    WHEN poe.last_synced_at > NOW() - INTERVAL '1 hour' THEN 'recent'
    WHEN poe.last_synced_at > NOW() - INTERVAL '24 hours' THEN 'today'
    ELSE 'stale'
  END AS sync_freshness
FROM properties p
LEFT JOIN property_ota_extensions poe ON p.id = poe.property_id
WHERE p.status = 'active';

-- View: Webhooks pendentes de processamento
CREATE OR REPLACE VIEW v_pending_webhooks AS
SELECT 
  id,
  ota,
  event_type,
  event_id,
  created_at,
  processing_attempts,
  last_attempt_at,
  CASE 
    WHEN processing_attempts = 0 THEN 'new'
    WHEN processing_attempts < 3 THEN 'retrying'
    ELSE 'failing'
  END AS status_hint
FROM ota_webhooks
WHERE processed = false
ORDER BY created_at;

-- ============================================================================
COMMENT ON SCHEMA public IS 'Schema com modelo de dados universal para OTAs - Migração 5/5: Webhooks, Extensions & Sync';
