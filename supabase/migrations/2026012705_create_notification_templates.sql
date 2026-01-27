-- ============================================================================
-- MIGRATION: Criar tabela notification_templates
-- Data: 2026-01-27
-- Descrição: Templates customizáveis para notificações (email, sms, whatsapp)
-- ============================================================================
-- 
-- REFERÊNCIA RÁPIDA:
-- 
-- FRONTEND:
--   - Página: components/NotificationTemplatesPage.tsx
--   - Editor: components/NotificationTemplateEditor.tsx
--   - API: utils/api-notification-templates.ts
-- 
-- BACKEND:
--   - routes-notification-templates.ts
-- 
-- RELACIONAMENTOS:
--   - organization_id → organizations(id)
--   - created_by/updated_by → auth.users(id)
-- 
-- RLS:
--   - SELECT: Usuários veem templates da própria org
--   - INSERT/UPDATE/DELETE: Apenas superadmin/imobiliaria
--   - Templates is_system=true não podem ser deletados
-- 
-- DOCS: docs/ARQUITETURA_NOTIFICACOES.md
-- ============================================================================

-- Tabela principal de templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Identificação
  name VARCHAR(255) NOT NULL,
  description TEXT,
  internal_code VARCHAR(100), -- Código interno para referência (ex: 'reservation_confirmed')
  
  -- Trigger (quando dispara)
  trigger_event VARCHAR(100) NOT NULL, -- reservation_created, checkin_minus_24h, etc.
  trigger_config JSONB DEFAULT '{}', -- Configs adicionais do trigger (ex: horas antes)
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false, -- Templates padrão do sistema
  
  -- Canais habilitados
  channels JSONB DEFAULT '[]', -- ['email', 'sms', 'whatsapp', 'in_app']
  
  -- Conteúdo por canal
  email_subject VARCHAR(500),
  email_body TEXT,
  email_provider VARCHAR(50), -- 'resend', 'brevo-email', null = usa padrão
  
  sms_body VARCHAR(480), -- SMS tem limite de 160 chars (3x para maior)
  sms_provider VARCHAR(50), -- 'brevo-sms', null = usa padrão
  
  whatsapp_body TEXT,
  whatsapp_provider VARCHAR(50), -- 'evolution-api', null = usa padrão
  
  in_app_title VARCHAR(255),
  in_app_body TEXT,
  
  -- Metadata
  variables_used JSONB DEFAULT '[]', -- Lista de variáveis usadas no template
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_notification_templates_org 
  ON notification_templates(organization_id);
  
CREATE INDEX IF NOT EXISTS idx_notification_templates_trigger 
  ON notification_templates(trigger_event);
  
CREATE INDEX IF NOT EXISTS idx_notification_templates_active 
  ON notification_templates(organization_id, is_active);

-- Unique constraint para evitar duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_templates_org_code
  ON notification_templates(organization_id, internal_code)
  WHERE internal_code IS NOT NULL;

-- Comentários
COMMENT ON TABLE notification_templates IS 'Templates customizáveis para notificações multi-canal';
COMMENT ON COLUMN notification_templates.trigger_event IS 'Evento que dispara a notificação';
COMMENT ON COLUMN notification_templates.channels IS 'Array de canais habilitados: email, sms, whatsapp, in_app';
COMMENT ON COLUMN notification_templates.variables_used IS 'Lista de variáveis dinâmicas usadas no template';

-- ============================================================================
-- TABELA DE TRIGGERS DISPONÍVEIS (referência)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notification_trigger_types (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- reservations, payments, communication, system
  available_variables JSONB DEFAULT '[]', -- Variáveis disponíveis para este trigger
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0
);

-- Inserir triggers padrão
INSERT INTO notification_trigger_types (id, name, description, category, available_variables, sort_order) VALUES
  -- RESERVAS
  ('reservation_created', 'Nova Reserva', 'Quando uma reserva é criada', 'reservations', 
   '["guestName", "guestEmail", "guestPhone", "checkInDate", "checkInTime", "checkOutDate", "checkOutTime", "propertyName", "propertyAddress", "totalAmount", "reservationCode", "nights", "adults", "children"]', 10),
  
  ('reservation_confirmed', 'Reserva Confirmada', 'Quando uma reserva é confirmada', 'reservations',
   '["guestName", "guestEmail", "guestPhone", "checkInDate", "checkInTime", "checkOutDate", "checkOutTime", "propertyName", "propertyAddress", "totalAmount", "reservationCode", "nights"]', 11),
  
  ('reservation_cancelled', 'Reserva Cancelada', 'Quando uma reserva é cancelada', 'reservations',
   '["guestName", "guestEmail", "reservationCode", "propertyName", "checkInDate", "cancellationReason"]', 12),
  
  ('reservation_modified', 'Reserva Alterada', 'Quando uma reserva é modificada', 'reservations',
   '["guestName", "guestEmail", "reservationCode", "propertyName", "oldCheckIn", "newCheckIn", "oldCheckOut", "newCheckOut"]', 13),
  
  -- CHECK-IN / CHECK-OUT
  ('checkin_minus_72h', 'Lembrete Check-in (72h)', '72 horas antes do check-in', 'reservations',
   '["guestName", "checkInDate", "checkInTime", "propertyName", "propertyAddress", "accessInstructions"]', 20),
  
  ('checkin_minus_24h', 'Lembrete Check-in (24h)', '24 horas antes do check-in', 'reservations',
   '["guestName", "checkInDate", "checkInTime", "propertyName", "propertyAddress", "accessInstructions", "wifiName", "wifiPassword"]', 21),
  
  ('checkin_day', 'Dia do Check-in', 'No dia do check-in', 'reservations',
   '["guestName", "checkInTime", "propertyName", "propertyAddress", "accessCode", "wifiName", "wifiPassword", "emergencyPhone"]', 22),
  
  ('checkout_day', 'Dia do Check-out', 'No dia do check-out', 'reservations',
   '["guestName", "checkOutTime", "propertyName", "checkoutInstructions"]', 23),
  
  ('checkout_plus_24h', 'Pós Check-out (24h)', '24 horas após o check-out', 'reservations',
   '["guestName", "propertyName", "reviewLink"]', 24),
  
  -- PAGAMENTOS
  ('payment_received', 'Pagamento Recebido', 'Quando um pagamento é confirmado', 'payments',
   '["guestName", "reservationCode", "paymentAmount", "paymentMethod", "receiptLink"]', 30),
  
  ('payment_pending', 'Pagamento Pendente', 'Lembrete de pagamento pendente', 'payments',
   '["guestName", "reservationCode", "pendingAmount", "dueDate", "paymentLink"]', 31),
  
  ('payment_overdue', 'Pagamento Atrasado', 'Quando um pagamento está atrasado', 'payments',
   '["guestName", "reservationCode", "overdueAmount", "daysOverdue", "paymentLink"]', 32),
  
  -- COMUNICAÇÃO
  ('new_message', 'Nova Mensagem', 'Quando recebe mensagem do hóspede', 'communication',
   '["guestName", "messagePreview", "replyLink"]', 40),
  
  ('new_review', 'Nova Avaliação', 'Quando recebe avaliação', 'communication',
   '["guestName", "propertyName", "rating", "reviewText"]', 41),
  
  -- SISTEMA
  ('welcome_guest', 'Boas-vindas Hóspede', 'Primeiro contato com novo hóspede', 'system',
   '["guestName", "organizationName"]', 50),
  
  ('custom', 'Personalizado', 'Trigger manual ou via API', 'system',
   '["customField1", "customField2", "customField3"]', 99)

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  available_variables = EXCLUDED.available_variables;

-- ============================================================================
-- TEMPLATES PADRÃO DO SISTEMA
-- ============================================================================
-- Serão inseridos via código quando organização for criada
-- Ou podem ser importados manualmente

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Policy para leitura
CREATE POLICY "Users can view templates of their organization"
  ON notification_templates FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy para inserção
CREATE POLICY "Admins can create templates"
  ON notification_templates FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE id = auth.uid() 
      AND type IN ('superadmin', 'imobiliaria')
    )
  );

-- Policy para atualização
CREATE POLICY "Admins can update templates"
  ON notification_templates FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE id = auth.uid() 
      AND type IN ('superadmin', 'imobiliaria')
    )
  );

-- Policy para deleção
CREATE POLICY "Admins can delete templates"
  ON notification_templates FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE id = auth.uid() 
      AND type IN ('superadmin', 'imobiliaria')
    )
    AND is_system = false -- Não pode deletar templates do sistema
  );

-- Trigger types é público (leitura)
ALTER TABLE notification_trigger_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view trigger types"
  ON notification_trigger_types FOR SELECT
  USING (true);

-- ============================================================================
-- PRONTO!
-- ============================================================================
DO $$ 
BEGIN
  RAISE NOTICE '✅ Tabela notification_templates criada com sucesso';
  RAISE NOTICE '✅ Tabela notification_trigger_types criada com triggers padrão';
END $$;
