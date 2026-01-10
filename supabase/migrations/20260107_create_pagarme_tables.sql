-- ============================================================================
-- Pagar.me (v5) - Config + Checkout (Payment Links) + Webhooks
--
-- Objetivo:
-- - Persistir credenciais por organização (multi-tenant)
-- - Auditar criação de links de pagamento
-- - Garantir idempotência e auditoria de webhooks
--
-- Observação:
-- - Tabelas criadas com IF NOT EXISTS para não quebrar ambientes existentes.
-- - Secrets devem ser armazenados criptografados (handled no backend).
-- ============================================================================

-- Configuração por organização
CREATE TABLE IF NOT EXISTS pagarme_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,

  enabled BOOLEAN NOT NULL DEFAULT false,
  is_test_mode BOOLEAN NOT NULL DEFAULT true,

  -- Chaves
  public_key TEXT,
  secret_key_encrypted TEXT,
  encryption_key_encrypted TEXT,

  -- Webhook
  webhook_url TEXT,
  webhook_secret_encrypted TEXT,

  -- Opcional (marketplace/splits)
  recipient_id TEXT,

  -- Config livre (ex: métodos aceitos)
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (organization_id)
);

CREATE INDEX IF NOT EXISTS idx_pagarme_configs_org ON pagarme_configs(organization_id);

-- Links de pagamento / checkout URL gerado
CREATE TABLE IF NOT EXISTS pagarme_payment_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,

  reservation_id UUID,

  -- Referências do Pagar.me
  pagarme_link_id TEXT,
  url TEXT,

  amount_total_cents INTEGER,
  currency TEXT,

  -- Auditoria
  request_payload JSONB,
  response_payload JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagarme_payment_links_org ON pagarme_payment_links(organization_id);
CREATE INDEX IF NOT EXISTS idx_pagarme_payment_links_reservation ON pagarme_payment_links(reservation_id);

-- Webhooks (idempotência + auditoria)
CREATE TABLE IF NOT EXISTS pagarme_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,

  event_id TEXT,
  event_type TEXT,

  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,

  payload JSONB,
  headers JSONB,

  UNIQUE (organization_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_pagarme_webhook_events_org ON pagarme_webhook_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_pagarme_webhook_events_received ON pagarme_webhook_events(received_at DESC);

-- updated_at trigger (se a função existir no schema)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_updated_at_column'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = 'update_pagarme_configs_updated_at'
    ) THEN
      CREATE TRIGGER update_pagarme_configs_updated_at
      BEFORE UPDATE ON pagarme_configs
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END IF;
END $$;
