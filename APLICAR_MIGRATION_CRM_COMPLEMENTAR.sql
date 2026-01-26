-- ============================================================================
-- MIGRATION: CRM Complementar - Tasks, Produtos/Serviços, Motivos de Perda
-- Data: 2026-01-26
-- Descrição: Tabelas complementares ao CRM Modular
-- Relacionado: APLICAR_MIGRATION_CRM_MODULAR.sql
-- ============================================================================

-- ============================================================================
-- MÓDULO 1: TAREFAS (TASKS)
-- Tarefas/Atividades agendáveis vinculadas a cards de qualquer módulo
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Título e descrição
  title VARCHAR(500) NOT NULL,
  description TEXT,
  
  -- Tipo de tarefa
  task_type VARCHAR(50) DEFAULT 'task', -- task, call, meeting, email, follow_up, other
  
  -- Vínculo polimórfico com cards de diferentes módulos
  -- Apenas UM deve estar preenchido por vez
  sales_deal_id UUID REFERENCES sales_deals(id) ON DELETE CASCADE,
  service_ticket_id UUID REFERENCES service_tickets(id) ON DELETE CASCADE,
  predetermined_item_id UUID REFERENCES predetermined_items(id) ON DELETE CASCADE,
  
  -- Vínculo opcional com outras entidades do sistema
  property_id UUID,
  reservation_id UUID,
  contact_id UUID,
  
  -- Agendamento
  due_date TIMESTAMP WITH TIME ZONE,
  due_time TIME,
  duration_minutes INTEGER, -- Duração estimada em minutos
  reminder_at TIMESTAMP WITH TIME ZONE, -- Quando enviar lembrete
  
  -- Responsáveis
  assignee_id UUID REFERENCES users(id),
  assignee_name VARCHAR(255),
  created_by UUID REFERENCES users(id),
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES users(id),
  
  -- Prioridade
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Recorrência
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule JSONB, -- { type: 'daily'|'weekly'|'monthly', interval: 1, endDate: '...' }
  parent_task_id UUID REFERENCES crm_tasks(id), -- Para tarefas recorrentes geradas
  
  -- Metadados
  tags TEXT[],
  custom_fields JSONB,
  notes TEXT,
  
  -- Resultado da tarefa
  outcome VARCHAR(50), -- completed, rescheduled, no_answer, cancelled, etc
  outcome_notes TEXT,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para TASKS
CREATE INDEX IF NOT EXISTS idx_crm_tasks_org ON crm_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_sales_deal ON crm_tasks(sales_deal_id) WHERE sales_deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_tasks_service_ticket ON crm_tasks(service_ticket_id) WHERE service_ticket_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_tasks_predetermined_item ON crm_tasks(predetermined_item_id) WHERE predetermined_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_tasks_assignee ON crm_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_status ON crm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due_date ON crm_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_priority ON crm_tasks(priority);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_crm_tasks_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_crm_tasks_updated_at ON crm_tasks;
CREATE TRIGGER trigger_crm_tasks_updated_at BEFORE UPDATE ON crm_tasks FOR EACH ROW EXECUTE FUNCTION update_crm_tasks_updated_at();

-- RLS
ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crm_tasks_org_policy ON crm_tasks;
CREATE POLICY crm_tasks_org_policy ON crm_tasks FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- ============================================================================
-- MÓDULO 2: CATÁLOGO DE PRODUTOS E SERVIÇOS
-- Produtos e serviços que podem ser vinculados aos cards do CRM
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_products_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Identificação
  code VARCHAR(50), -- Código SKU ou referência interna
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Tipo
  type VARCHAR(20) NOT NULL CHECK (type IN ('product', 'service')),
  
  -- Categoria (ex: "Hospedagem", "Limpeza", "Taxa Extra", "Upgrade")
  category VARCHAR(100),
  
  -- Preço base
  price DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'BRL',
  
  -- Modelo de cobrança
  billing_type VARCHAR(20) DEFAULT 'one_time' CHECK (billing_type IN ('one_time', 'recurring', 'per_unit', 'per_night')),
  
  -- Para cobrança recorrente
  recurrence_interval VARCHAR(20), -- daily, weekly, monthly, yearly
  recurrence_count INTEGER, -- Número de cobranças (null = infinito)
  
  -- Para cobrança por unidade
  unit_name VARCHAR(50), -- "diária", "pessoa", "item", etc
  min_quantity INTEGER DEFAULT 1,
  max_quantity INTEGER,
  
  -- Desconto e margem
  cost_price DECIMAL(15,2), -- Custo interno (para cálculo de margem)
  discount_allowed BOOLEAN DEFAULT TRUE,
  max_discount_percent DECIMAL(5,2), -- Desconto máximo permitido (%)
  
  -- Tributação
  tax_rate DECIMAL(5,2) DEFAULT 0, -- Taxa de imposto (%)
  tax_included BOOLEAN DEFAULT TRUE, -- Imposto já incluso no preço?
  
  -- Disponibilidade
  is_active BOOLEAN DEFAULT TRUE,
  available_from DATE,
  available_until DATE,
  
  -- Aplicabilidade nos módulos
  apply_to_sales BOOLEAN DEFAULT TRUE,
  apply_to_services BOOLEAN DEFAULT TRUE,
  apply_to_predetermined BOOLEAN DEFAULT FALSE,
  
  -- Imagem/Ícone
  image_url TEXT,
  icon VARCHAR(50), -- Nome do ícone (ex: "package", "home", "cleaning")
  
  -- Metadados
  tags TEXT[],
  custom_fields JSONB,
  notes TEXT,
  
  -- Ordenação
  sort_order INTEGER DEFAULT 0,
  
  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para PRODUCTS_SERVICES
CREATE INDEX IF NOT EXISTS idx_crm_products_services_org ON crm_products_services(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_products_services_type ON crm_products_services(type);
CREATE INDEX IF NOT EXISTS idx_crm_products_services_category ON crm_products_services(category);
CREATE INDEX IF NOT EXISTS idx_crm_products_services_active ON crm_products_services(is_active);
CREATE INDEX IF NOT EXISTS idx_crm_products_services_code ON crm_products_services(organization_id, code) WHERE code IS NOT NULL;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_crm_products_services_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_crm_products_services_updated_at ON crm_products_services;
CREATE TRIGGER trigger_crm_products_services_updated_at BEFORE UPDATE ON crm_products_services FOR EACH ROW EXECUTE FUNCTION update_crm_products_services_updated_at();

-- RLS
ALTER TABLE crm_products_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crm_products_services_org_policy ON crm_products_services;
CREATE POLICY crm_products_services_org_policy ON crm_products_services FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- ============================================================================
-- MÓDULO 3: ITENS VINCULADOS AOS CARDS (Produtos/Serviços nos cards)
-- Tabela pivot para vincular produtos/serviços aos cards do CRM
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_card_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Produto/Serviço do catálogo
  product_service_id UUID NOT NULL REFERENCES crm_products_services(id) ON DELETE RESTRICT,
  
  -- Vínculo polimórfico com cards de diferentes módulos
  -- Apenas UM deve estar preenchido por vez
  sales_deal_id UUID REFERENCES sales_deals(id) ON DELETE CASCADE,
  service_ticket_id UUID REFERENCES service_tickets(id) ON DELETE CASCADE,
  predetermined_item_id UUID REFERENCES predetermined_items(id) ON DELETE CASCADE,
  
  -- Dados do item no card (podem sobrescrever os do catálogo)
  name VARCHAR(255), -- Se null, usa o nome do catálogo
  description TEXT,
  
  -- Quantidade e preço
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL, -- Preço unitário aplicado
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  
  -- Valores calculados
  subtotal DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  total DECIMAL(15,2) GENERATED ALWAYS AS (
    (quantity * unit_price) - discount_amount - ((quantity * unit_price) * discount_percent / 100)
  ) STORED,
  
  -- Recorrência específica deste item
  billing_type VARCHAR(20) DEFAULT 'one_time' CHECK (billing_type IN ('one_time', 'recurring', 'per_unit', 'per_night')),
  recurrence_start DATE,
  recurrence_end DATE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'delivered', 'cancelled')),
  
  -- Notas
  notes TEXT,
  
  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para CARD_ITEMS
CREATE INDEX IF NOT EXISTS idx_crm_card_items_org ON crm_card_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_card_items_product ON crm_card_items(product_service_id);
CREATE INDEX IF NOT EXISTS idx_crm_card_items_sales_deal ON crm_card_items(sales_deal_id) WHERE sales_deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_card_items_service_ticket ON crm_card_items(service_ticket_id) WHERE service_ticket_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_card_items_predetermined ON crm_card_items(predetermined_item_id) WHERE predetermined_item_id IS NOT NULL;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_crm_card_items_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_crm_card_items_updated_at ON crm_card_items;
CREATE TRIGGER trigger_crm_card_items_updated_at BEFORE UPDATE ON crm_card_items FOR EACH ROW EXECUTE FUNCTION update_crm_card_items_updated_at();

-- RLS
ALTER TABLE crm_card_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crm_card_items_org_policy ON crm_card_items;
CREATE POLICY crm_card_items_org_policy ON crm_card_items FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- ============================================================================
-- MÓDULO 4: MOTIVOS DE PERDA (LOST REASONS)
-- Motivos cadastráveis para quando um deal é marcado como "Lost"
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_lost_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Identificação
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Categorização
  category VARCHAR(100), -- "Preço", "Concorrência", "Timing", "Qualificação", etc
  
  -- Aplicabilidade nos módulos
  apply_to_sales BOOLEAN DEFAULT TRUE,
  apply_to_services BOOLEAN DEFAULT TRUE,
  apply_to_predetermined BOOLEAN DEFAULT FALSE,
  
  -- Configurações
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE, -- Motivo padrão (se não selecionar nenhum)
  requires_notes BOOLEAN DEFAULT FALSE, -- Obriga preenchimento de notas adicionais
  
  -- Estatísticas (atualizado via trigger ou job)
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  -- Ordenação
  sort_order INTEGER DEFAULT 0,
  
  -- Metadados
  color VARCHAR(20) DEFAULT '#ef4444', -- Cor para exibição
  icon VARCHAR(50), -- Ícone (ex: "x-circle", "dollar-sign", "clock")
  
  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para LOST_REASONS
CREATE INDEX IF NOT EXISTS idx_crm_lost_reasons_org ON crm_lost_reasons(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_lost_reasons_active ON crm_lost_reasons(is_active);
CREATE INDEX IF NOT EXISTS idx_crm_lost_reasons_category ON crm_lost_reasons(category);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_crm_lost_reasons_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_crm_lost_reasons_updated_at ON crm_lost_reasons;
CREATE TRIGGER trigger_crm_lost_reasons_updated_at BEFORE UPDATE ON crm_lost_reasons FOR EACH ROW EXECUTE FUNCTION update_crm_lost_reasons_updated_at();

-- RLS
ALTER TABLE crm_lost_reasons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crm_lost_reasons_org_policy ON crm_lost_reasons;
CREATE POLICY crm_lost_reasons_org_policy ON crm_lost_reasons FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- ============================================================================
-- ALTERAÇÕES NAS TABELAS EXISTENTES
-- Adicionar coluna lost_reason_id nas tabelas de cards
-- ============================================================================

-- SALES: Adicionar lost_reason_id ao sales_deals
ALTER TABLE sales_deals 
  ADD COLUMN IF NOT EXISTS lost_reason_id UUID REFERENCES crm_lost_reasons(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sales_deals_lost_reason ON sales_deals(lost_reason_id) WHERE lost_reason_id IS NOT NULL;

-- SERVICES: Adicionar campos de resolução ao service_tickets
ALTER TABLE service_tickets 
  ADD COLUMN IF NOT EXISTS unresolved_reason_id UUID REFERENCES crm_lost_reasons(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_service_tickets_unresolved_reason ON service_tickets(unresolved_reason_id) WHERE unresolved_reason_id IS NOT NULL;

-- PREDETERMINED: Adicionar campos ao predetermined_items
ALTER TABLE predetermined_items 
  ADD COLUMN IF NOT EXISTS cancelled_reason_id UUID REFERENCES crm_lost_reasons(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_predetermined_items_cancelled_reason ON predetermined_items(cancelled_reason_id) WHERE cancelled_reason_id IS NOT NULL;

-- ============================================================================
-- SEED: Criar motivos de perda padrão para organizações existentes
-- ============================================================================
DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT id FROM organizations LOOP
    
    -- Criar motivos de perda padrão se não existirem
    IF NOT EXISTS (SELECT 1 FROM crm_lost_reasons WHERE organization_id = org_record.id) THEN
      
      INSERT INTO crm_lost_reasons (organization_id, name, category, sort_order, icon, apply_to_sales, apply_to_services) VALUES
        -- Motivos relacionados a Preço
        (org_record.id, 'Preço muito alto', 'Preço', 1, 'dollar-sign', true, true),
        (org_record.id, 'Orçamento do cliente insuficiente', 'Preço', 2, 'wallet', true, false),
        (org_record.id, 'Concorrente ofereceu preço menor', 'Preço', 3, 'trending-down', true, true),
        
        -- Motivos relacionados a Timing
        (org_record.id, 'Momento inadequado', 'Timing', 4, 'clock', true, true),
        (org_record.id, 'Urgência - prazo não atendido', 'Timing', 5, 'alert-triangle', true, true),
        (org_record.id, 'Projeto adiado/cancelado', 'Timing', 6, 'pause-circle', true, false),
        
        -- Motivos relacionados a Concorrência
        (org_record.id, 'Escolheu concorrente', 'Concorrência', 7, 'users', true, true),
        (org_record.id, 'Solução interna do cliente', 'Concorrência', 8, 'home', true, false),
        
        -- Motivos relacionados a Qualificação
        (org_record.id, 'Lead não qualificado', 'Qualificação', 9, 'user-x', true, false),
        (org_record.id, 'Sem autoridade de decisão', 'Qualificação', 10, 'shield-off', true, false),
        (org_record.id, 'Necessidade não identificada', 'Qualificação', 11, 'help-circle', true, true),
        
        -- Motivos relacionados ao Produto/Serviço
        (org_record.id, 'Funcionalidade não disponível', 'Produto', 12, 'package', true, true),
        (org_record.id, 'Não atende requisitos técnicos', 'Produto', 13, 'tool', true, true),
        
        -- Motivos de Relacionamento
        (org_record.id, 'Experiência negativa anterior', 'Relacionamento', 14, 'frown', true, true),
        (org_record.id, 'Falta de confiança', 'Relacionamento', 15, 'shield-off', true, true),
        
        -- Outros
        (org_record.id, 'Sem resposta/Ghosting', 'Comunicação', 16, 'message-circle', true, true),
        (org_record.id, 'Desistiu sem motivo', 'Outros', 17, 'x-circle', true, true),
        (org_record.id, 'Outro motivo', 'Outros', 18, 'more-horizontal', true, true);
      
      RAISE NOTICE 'Lost reasons criados para organização %', org_record.id;
    END IF;
    
    -- Criar produtos/serviços de exemplo se não existirem
    IF NOT EXISTS (SELECT 1 FROM crm_products_services WHERE organization_id = org_record.id) THEN
      
      INSERT INTO crm_products_services (organization_id, code, name, type, category, price, billing_type, icon, apply_to_sales, apply_to_services) VALUES
        -- Serviços de Hospedagem
        (org_record.id, 'DIARIA-STD', 'Diária Standard', 'service', 'Hospedagem', 250.00, 'per_night', 'bed', true, false),
        (org_record.id, 'DIARIA-PRM', 'Diária Premium', 'service', 'Hospedagem', 450.00, 'per_night', 'star', true, false),
        
        -- Serviços de Limpeza
        (org_record.id, 'LIMP-CHK', 'Limpeza de Check-out', 'service', 'Limpeza', 150.00, 'one_time', 'sparkles', true, true),
        (org_record.id, 'LIMP-PROF', 'Limpeza Profunda', 'service', 'Limpeza', 350.00, 'one_time', 'sparkles', true, true),
        
        -- Taxas e Adicionais
        (org_record.id, 'TAXA-PET', 'Taxa Pet', 'service', 'Taxas', 50.00, 'per_night', 'heart', true, false),
        (org_record.id, 'TAXA-HOSP-EXTRA', 'Hóspede Extra', 'service', 'Taxas', 80.00, 'per_night', 'user-plus', true, false),
        (org_record.id, 'EARLY-CHK', 'Early Check-in', 'service', 'Taxas', 100.00, 'one_time', 'sunrise', true, false),
        (org_record.id, 'LATE-CHK', 'Late Check-out', 'service', 'Taxas', 100.00, 'one_time', 'sunset', true, false),
        
        -- Manutenção
        (org_record.id, 'MANUT-GERAL', 'Manutenção Geral', 'service', 'Manutenção', 0.00, 'one_time', 'wrench', false, true),
        (org_record.id, 'MANUT-ELET', 'Manutenção Elétrica', 'service', 'Manutenção', 0.00, 'one_time', 'zap', false, true),
        (org_record.id, 'MANUT-HIDR', 'Manutenção Hidráulica', 'service', 'Manutenção', 0.00, 'one_time', 'droplet', false, true);
      
      RAISE NOTICE 'Produtos/Serviços criados para organização %', org_record.id;
    END IF;
    
  END LOOP;
END $$;

-- ============================================================================
-- VIEWS: Agregações úteis
-- ============================================================================

-- View: Total de itens (produtos/serviços) por deal de vendas
CREATE OR REPLACE VIEW vw_sales_deal_totals AS
SELECT 
  d.id AS deal_id,
  d.organization_id,
  d.title AS deal_title,
  d.value AS deal_value,
  COALESCE(SUM(ci.total), 0) AS items_total,
  COUNT(ci.id) AS items_count,
  d.value + COALESCE(SUM(ci.total), 0) AS grand_total
FROM sales_deals d
LEFT JOIN crm_card_items ci ON ci.sales_deal_id = d.id
GROUP BY d.id, d.organization_id, d.title, d.value;

-- View: Estatísticas de motivos de perda (útil para relatórios)
CREATE OR REPLACE VIEW vw_lost_reasons_stats AS
SELECT 
  lr.id,
  lr.organization_id,
  lr.name,
  lr.category,
  COUNT(DISTINCT sd.id) AS sales_deals_count,
  COUNT(DISTINCT st.id) AS service_tickets_count,
  COUNT(DISTINCT pi.id) AS predetermined_items_count,
  (COUNT(DISTINCT sd.id) + COUNT(DISTINCT st.id) + COUNT(DISTINCT pi.id)) AS total_usage
FROM crm_lost_reasons lr
LEFT JOIN sales_deals sd ON sd.lost_reason_id = lr.id
LEFT JOIN service_tickets st ON st.unresolved_reason_id = lr.id
LEFT JOIN predetermined_items pi ON pi.cancelled_reason_id = lr.id
GROUP BY lr.id, lr.organization_id, lr.name, lr.category;

-- View: Tarefas pendentes por usuário
CREATE OR REPLACE VIEW vw_pending_tasks_by_user AS
SELECT 
  t.assignee_id,
  t.assignee_name,
  t.organization_id,
  COUNT(*) FILTER (WHERE t.status = 'pending') AS pending_count,
  COUNT(*) FILTER (WHERE t.status = 'pending' AND t.due_date < NOW()) AS overdue_count,
  COUNT(*) FILTER (WHERE t.status = 'pending' AND t.due_date >= NOW() AND t.due_date < NOW() + INTERVAL '1 day') AS due_today_count,
  COUNT(*) FILTER (WHERE t.status = 'pending' AND t.due_date >= NOW() + INTERVAL '1 day' AND t.due_date < NOW() + INTERVAL '7 days') AS due_this_week_count
FROM crm_tasks t
WHERE t.status IN ('pending', 'in_progress')
GROUP BY t.assignee_id, t.assignee_name, t.organization_id;

-- ============================================================================
-- FUNÇÃO: Atualizar contador de uso de motivo de perda
-- ============================================================================
CREATE OR REPLACE FUNCTION update_lost_reason_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Se está setando um novo motivo de perda
  IF NEW.lost_reason_id IS NOT NULL AND (OLD.lost_reason_id IS NULL OR OLD.lost_reason_id != NEW.lost_reason_id) THEN
    UPDATE crm_lost_reasons 
    SET usage_count = usage_count + 1, last_used_at = NOW()
    WHERE id = NEW.lost_reason_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar uso
DROP TRIGGER IF EXISTS trigger_sales_deals_lost_reason_usage ON sales_deals;
CREATE TRIGGER trigger_sales_deals_lost_reason_usage
  AFTER UPDATE OF lost_reason_id ON sales_deals
  FOR EACH ROW EXECUTE FUNCTION update_lost_reason_usage();

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================
SELECT 'CRM_TASKS' as tabela, COUNT(*) as count FROM crm_tasks
UNION ALL
SELECT 'CRM_PRODUCTS_SERVICES', COUNT(*) FROM crm_products_services
UNION ALL
SELECT 'CRM_CARD_ITEMS', COUNT(*) FROM crm_card_items
UNION ALL
SELECT 'CRM_LOST_REASONS', COUNT(*) FROM crm_lost_reasons;

-- Verificar alterações nas tabelas existentes
SELECT 
  'SALES_DEALS.lost_reason_id' as coluna,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales_deals' AND column_name = 'lost_reason_id'
  ) THEN 'OK' ELSE 'MISSING' END as status
UNION ALL
SELECT 
  'SERVICE_TICKETS.unresolved_reason_id',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_tickets' AND column_name = 'unresolved_reason_id'
  ) THEN 'OK' ELSE 'MISSING' END
UNION ALL
SELECT 
  'PREDETERMINED_ITEMS.cancelled_reason_id',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'predetermined_items' AND column_name = 'cancelled_reason_id'
  ) THEN 'OK' ELSE 'MISSING' END;

-- ============================================================================
-- COMENTÁRIOS DA MIGRATION
-- ============================================================================
COMMENT ON TABLE crm_tasks IS 'Tarefas/Atividades agendáveis do CRM, vinculadas a cards de qualquer módulo';
COMMENT ON TABLE crm_products_services IS 'Catálogo de produtos e serviços que podem ser vinculados aos cards do CRM';
COMMENT ON TABLE crm_card_items IS 'Itens (produtos/serviços) vinculados aos cards do CRM';
COMMENT ON TABLE crm_lost_reasons IS 'Motivos de perda cadastráveis para uso no botão Lost do CRM';

-- ============================================================================
-- FIM DA MIGRATION
-- Próximo passo: Executar no Supabase SQL Editor
-- ============================================================================
