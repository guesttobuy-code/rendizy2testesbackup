-- ============================================================================
-- MIGRATION: Criar tabela de logs de entrega de notificações
-- Data: 2026-01-27
-- Descrição: Histórico de todas as notificações enviadas (email, SMS, WhatsApp)
-- ============================================================================

-- Tabela de logs de entrega
CREATE TABLE IF NOT EXISTS notification_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Referência à notificação original (se houver)
  notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
  
  -- Canal e provider
  channel VARCHAR(20) NOT NULL, -- 'email', 'sms', 'whatsapp', 'push', 'in_app'
  provider VARCHAR(50) NOT NULL, -- 'resend', 'brevo', 'evolution', etc.
  
  -- Destinatário
  recipient VARCHAR(255) NOT NULL, -- email, telefone, user_id
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'bounced'
  
  -- IDs do provider
  message_id TEXT, -- ID retornado pelo provider
  
  -- Erro (se houver)
  error_message TEXT,
  
  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadados extras
  metadata JSONB DEFAULT '{}'
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_delivery_logs_org 
  ON notification_delivery_logs(organization_id);

CREATE INDEX IF NOT EXISTS idx_delivery_logs_channel 
  ON notification_delivery_logs(channel);

CREATE INDEX IF NOT EXISTS idx_delivery_logs_status 
  ON notification_delivery_logs(status);

CREATE INDEX IF NOT EXISTS idx_delivery_logs_created 
  ON notification_delivery_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_logs_notification 
  ON notification_delivery_logs(notification_id);

-- RLS
ALTER TABLE notification_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Política: Usuários só veem logs da própria organização
CREATE POLICY delivery_logs_select_policy ON notification_delivery_logs
  FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM users 
    WHERE id = auth.uid()
  ));

-- Política: Service role pode inserir/atualizar
CREATE POLICY delivery_logs_insert_service ON notification_delivery_logs
  FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY delivery_logs_update_service ON notification_delivery_logs
  FOR UPDATE
  USING (TRUE);

-- Comentários
COMMENT ON TABLE notification_delivery_logs IS 'Histórico de envio de notificações por todos os canais';
COMMENT ON COLUMN notification_delivery_logs.channel IS 'Canal: email, sms, whatsapp, push, in_app';
COMMENT ON COLUMN notification_delivery_logs.provider IS 'Provider: resend, brevo, evolution, firebase, in_app';
COMMENT ON COLUMN notification_delivery_logs.status IS 'Status: pending, sent, delivered, failed, bounced';

-- ============================================================================
-- PRONTO!
-- ============================================================================
DO $$ 
BEGIN
  RAISE NOTICE '✅ Tabela notification_delivery_logs criada';
END $$;
