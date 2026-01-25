-- ============================================================================
-- RENDIZY: Tabela de Notificações (Dashboard)
-- v1.0.0 - 2026-01-25
-- 
-- Armazena notificações para exibição no dashboard do usuário.
-- Usada pelo Automation Engine para ação "send_notification".
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Tipo e origem
  type VARCHAR(50) DEFAULT 'system', -- 'automation', 'system', 'alert', 'reminder', etc.
  source VARCHAR(100), -- ex: 'automation:21b8b40c-4eb4-4a42-9233-02ceb06828c8'
  
  -- Conteúdo
  title VARCHAR(255) NOT NULL,
  message TEXT,
  priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  
  -- Status
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Metadados
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_org_read 
  ON notifications(organization_id, read);
  
CREATE INDEX IF NOT EXISTS idx_notifications_org_created 
  ON notifications(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_type 
  ON notifications(type);

-- RLS (Row Level Security)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Política: Usuários só veem notificações da própria organização
CREATE POLICY notifications_select_policy ON notifications
  FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM users 
    WHERE id = auth.uid()
  ));

-- Política: Service role pode inserir qualquer notificação
CREATE POLICY notifications_insert_service ON notifications
  FOR INSERT
  WITH CHECK (TRUE);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notifications_updated_at_trigger
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- Comentários
COMMENT ON TABLE notifications IS 'Notificações do dashboard para usuários';
COMMENT ON COLUMN notifications.type IS 'Tipo: automation, system, alert, reminder';
COMMENT ON COLUMN notifications.source IS 'Origem da notificação (ex: automation:uuid)';
COMMENT ON COLUMN notifications.priority IS 'Prioridade: low, normal, high, urgent';
