-- ============================================================================
-- MIGRATION: CRM Modular - Arquitetura Separada por Módulo
-- Data: 2026-01-26
-- Descrição: Tabelas 100% separadas para Vendas, Serviços e Pré-determinados
-- Objetivo: Manutenção independente, relatórios separados, escalabilidade
-- ============================================================================

-- ============================================================================
-- MÓDULO 1: VENDAS (SALES)
-- Tabelas: sales_funnels, sales_funnel_stages, sales_deals
-- ============================================================================

-- 1.1 Funis de Vendas
CREATE TABLE IF NOT EXISTS sales_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  status_config JSONB DEFAULT '{
    "wonStatus": "Ganho",
    "lostStatus": "Perdido",
    "inProgressStatus": "Em Negociação"
  }'::jsonb,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.2 Estágios do Funil de Vendas
CREATE TABLE IF NOT EXISTS sales_funnel_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES sales_funnels(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT '#3b82f6',
  "order" INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.3 Deals (Cards de Vendas)
CREATE TABLE IF NOT EXISTS sales_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  funnel_id UUID NOT NULL REFERENCES sales_funnels(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES sales_funnel_stages(id),
  
  -- Dados do deal
  title VARCHAR(500) NOT NULL,
  description TEXT,
  value DECIMAL(15,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'BRL',
  probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  
  -- Contato
  contact_id UUID,
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_whatsapp_jid VARCHAR(100),
  
  -- Fonte
  source VARCHAR(50) DEFAULT 'MANUAL', -- MANUAL, WHATSAPP, EMAIL, AIRBNB, BOOKING, etc
  source_metadata JSONB,
  
  -- Responsável
  owner_id UUID REFERENCES users(id),
  owner_name VARCHAR(255),
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost')),
  won_at TIMESTAMP WITH TIME ZONE,
  lost_at TIMESTAMP WITH TIME ZONE,
  lost_reason TEXT,
  
  -- Metadados
  tags TEXT[],
  custom_fields JSONB,
  notes TEXT,
  
  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.4 Atividades de Deals (timeline)
CREATE TABLE IF NOT EXISTS sales_deal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES sales_deals(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- stage_change, note, call, email, meeting, etc
  description TEXT,
  metadata JSONB,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para SALES
CREATE INDEX IF NOT EXISTS idx_sales_funnels_org ON sales_funnels(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_funnel_stages_funnel ON sales_funnel_stages(funnel_id);
CREATE INDEX IF NOT EXISTS idx_sales_funnel_stages_order ON sales_funnel_stages(funnel_id, "order");
CREATE INDEX IF NOT EXISTS idx_sales_deals_org ON sales_deals(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_deals_funnel ON sales_deals(funnel_id);
CREATE INDEX IF NOT EXISTS idx_sales_deals_stage ON sales_deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_sales_deals_status ON sales_deals(status);
CREATE INDEX IF NOT EXISTS idx_sales_deals_owner ON sales_deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_sales_deal_activities_deal ON sales_deal_activities(deal_id);

-- ============================================================================
-- MÓDULO 2: SERVIÇOS (SERVICES)
-- Tabelas: service_funnels, service_funnel_stages, service_tickets
-- ============================================================================

-- 2.1 Funis de Serviços
CREATE TABLE IF NOT EXISTS service_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  status_config JSONB DEFAULT '{
    "resolvedStatus": "Resolvido",
    "unresolvedStatus": "Não Resolvido",
    "inProgressStatus": "Em Análise"
  }'::jsonb,
  sla_config JSONB, -- Configuração de SLA
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.2 Estágios do Funil de Serviços
CREATE TABLE IF NOT EXISTS service_funnel_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES service_funnels(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT '#3b82f6',
  "order" INTEGER NOT NULL DEFAULT 1,
  is_resolved BOOLEAN DEFAULT FALSE, -- Indica se é estágio de resolução
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.3 Tickets (Cards de Serviços)
CREATE TABLE IF NOT EXISTS service_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  funnel_id UUID NOT NULL REFERENCES service_funnels(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES service_funnel_stages(id),
  
  -- Dados do ticket
  title VARCHAR(500) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category VARCHAR(100),
  
  -- Relacionamentos
  property_id UUID, -- Imóvel relacionado
  reservation_id UUID, -- Reserva relacionada
  guest_id UUID, -- Hóspede relacionado
  
  -- Contato (quem abriu/solicitou)
  requester_type VARCHAR(20) DEFAULT 'guest', -- guest, owner, staff, other
  requester_id UUID,
  requester_name VARCHAR(255),
  requester_email VARCHAR(255),
  requester_phone VARCHAR(50),
  
  -- Responsável
  assignee_id UUID REFERENCES users(id),
  assignee_name VARCHAR(255),
  
  -- Status
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'cancelled')),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  
  -- SLA
  sla_due_at TIMESTAMP WITH TIME ZONE,
  sla_breached BOOLEAN DEFAULT FALSE,
  
  -- Metadados
  tags TEXT[],
  custom_fields JSONB,
  
  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.4 Atividades de Tickets (timeline)
CREATE TABLE IF NOT EXISTS service_ticket_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- stage_change, note, comment, status_change, etc
  description TEXT,
  metadata JSONB,
  is_internal BOOLEAN DEFAULT FALSE, -- Nota interna vs pública
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para SERVICES
CREATE INDEX IF NOT EXISTS idx_service_funnels_org ON service_funnels(organization_id);
CREATE INDEX IF NOT EXISTS idx_service_funnel_stages_funnel ON service_funnel_stages(funnel_id);
CREATE INDEX IF NOT EXISTS idx_service_funnel_stages_order ON service_funnel_stages(funnel_id, "order");
CREATE INDEX IF NOT EXISTS idx_service_tickets_org ON service_tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_service_tickets_funnel ON service_tickets(funnel_id);
CREATE INDEX IF NOT EXISTS idx_service_tickets_stage ON service_tickets(stage_id);
CREATE INDEX IF NOT EXISTS idx_service_tickets_status ON service_tickets(status);
CREATE INDEX IF NOT EXISTS idx_service_tickets_assignee ON service_tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_service_tickets_property ON service_tickets(property_id);
CREATE INDEX IF NOT EXISTS idx_service_tickets_reservation ON service_tickets(reservation_id);
CREATE INDEX IF NOT EXISTS idx_service_ticket_activities_ticket ON service_ticket_activities(ticket_id);

-- ============================================================================
-- MÓDULO 3: PRÉ-DETERMINADOS (PREDETERMINED)
-- Tabelas: predetermined_funnels, predetermined_funnel_stages, predetermined_items
-- ============================================================================

-- 3.1 Funis Pré-determinados (Wizards/Workflows)
CREATE TABLE IF NOT EXISTS predetermined_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  trigger_type VARCHAR(50), -- checkin, checkout, reservation_created, manual, etc
  auto_create BOOLEAN DEFAULT FALSE, -- Criar automaticamente quando trigger acontece
  status_config JSONB DEFAULT '{
    "completedStatus": "Concluído",
    "cancelledStatus": "Cancelado",
    "inProgressStatus": "Em Andamento"
  }'::jsonb,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.2 Estágios do Funil Pré-determinado
CREATE TABLE IF NOT EXISTS predetermined_funnel_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES predetermined_funnels(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT '#3b82f6',
  "order" INTEGER NOT NULL DEFAULT 1,
  
  -- Ações automáticas
  auto_actions JSONB, -- Ações a executar ao entrar no estágio
  required_fields JSONB, -- Campos obrigatórios para avançar
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.3 Items Pré-determinados (Cards de Workflow)
CREATE TABLE IF NOT EXISTS predetermined_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  funnel_id UUID NOT NULL REFERENCES predetermined_funnels(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES predetermined_funnel_stages(id),
  
  -- Dados do item
  title VARCHAR(500) NOT NULL,
  description TEXT,
  
  -- Relacionamentos (contexto do workflow)
  property_id UUID,
  reservation_id UUID,
  guest_id UUID,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'skipped')),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Dados preenchidos
  form_data JSONB, -- Dados do formulário/wizard
  checklist JSONB, -- Checklist de tarefas
  
  -- Responsável
  assignee_id UUID REFERENCES users(id),
  assignee_name VARCHAR(255),
  
  -- Datas
  due_date DATE,
  started_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadados
  tags TEXT[],
  custom_fields JSONB,
  notes TEXT,
  
  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.4 Atividades de Items Pré-determinados
CREATE TABLE IF NOT EXISTS predetermined_item_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES predetermined_items(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- stage_change, checklist_update, form_update, etc
  description TEXT,
  metadata JSONB,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para PREDETERMINED
CREATE INDEX IF NOT EXISTS idx_predetermined_funnels_org ON predetermined_funnels(organization_id);
CREATE INDEX IF NOT EXISTS idx_predetermined_funnel_stages_funnel ON predetermined_funnel_stages(funnel_id);
CREATE INDEX IF NOT EXISTS idx_predetermined_funnel_stages_order ON predetermined_funnel_stages(funnel_id, "order");
CREATE INDEX IF NOT EXISTS idx_predetermined_items_org ON predetermined_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_predetermined_items_funnel ON predetermined_items(funnel_id);
CREATE INDEX IF NOT EXISTS idx_predetermined_items_stage ON predetermined_items(stage_id);
CREATE INDEX IF NOT EXISTS idx_predetermined_items_status ON predetermined_items(status);
CREATE INDEX IF NOT EXISTS idx_predetermined_items_property ON predetermined_items(property_id);
CREATE INDEX IF NOT EXISTS idx_predetermined_items_reservation ON predetermined_items(reservation_id);
CREATE INDEX IF NOT EXISTS idx_predetermined_item_activities_item ON predetermined_item_activities(item_id);

-- ============================================================================
-- TRIGGERS: Auto-update updated_at
-- ============================================================================

-- Sales
CREATE OR REPLACE FUNCTION update_sales_funnels_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_sales_funnels_updated_at ON sales_funnels;
CREATE TRIGGER trigger_sales_funnels_updated_at BEFORE UPDATE ON sales_funnels FOR EACH ROW EXECUTE FUNCTION update_sales_funnels_updated_at();

CREATE OR REPLACE FUNCTION update_sales_deals_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_sales_deals_updated_at ON sales_deals;
CREATE TRIGGER trigger_sales_deals_updated_at BEFORE UPDATE ON sales_deals FOR EACH ROW EXECUTE FUNCTION update_sales_deals_updated_at();

-- Services
CREATE OR REPLACE FUNCTION update_service_funnels_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_service_funnels_updated_at ON service_funnels;
CREATE TRIGGER trigger_service_funnels_updated_at BEFORE UPDATE ON service_funnels FOR EACH ROW EXECUTE FUNCTION update_service_funnels_updated_at();

CREATE OR REPLACE FUNCTION update_service_tickets_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_service_tickets_updated_at ON service_tickets;
CREATE TRIGGER trigger_service_tickets_updated_at BEFORE UPDATE ON service_tickets FOR EACH ROW EXECUTE FUNCTION update_service_tickets_updated_at();

-- Predetermined
CREATE OR REPLACE FUNCTION update_predetermined_funnels_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_predetermined_funnels_updated_at ON predetermined_funnels;
CREATE TRIGGER trigger_predetermined_funnels_updated_at BEFORE UPDATE ON predetermined_funnels FOR EACH ROW EXECUTE FUNCTION update_predetermined_funnels_updated_at();

CREATE OR REPLACE FUNCTION update_predetermined_items_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_predetermined_items_updated_at ON predetermined_items;
CREATE TRIGGER trigger_predetermined_items_updated_at BEFORE UPDATE ON predetermined_items FOR EACH ROW EXECUTE FUNCTION update_predetermined_items_updated_at();

-- ============================================================================
-- RLS POLICIES (Row Level Security)
-- ============================================================================

-- SALES
ALTER TABLE sales_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_funnel_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_deal_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_funnels_org_policy ON sales_funnels;
CREATE POLICY sales_funnels_org_policy ON sales_funnels FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

DROP POLICY IF EXISTS sales_funnel_stages_policy ON sales_funnel_stages;
CREATE POLICY sales_funnel_stages_policy ON sales_funnel_stages FOR ALL
  USING (EXISTS (SELECT 1 FROM sales_funnels f WHERE f.id = sales_funnel_stages.funnel_id AND f.organization_id = current_setting('app.current_organization_id', true)::uuid));

DROP POLICY IF EXISTS sales_deals_org_policy ON sales_deals;
CREATE POLICY sales_deals_org_policy ON sales_deals FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

DROP POLICY IF EXISTS sales_deal_activities_policy ON sales_deal_activities;
CREATE POLICY sales_deal_activities_policy ON sales_deal_activities FOR ALL
  USING (EXISTS (SELECT 1 FROM sales_deals d WHERE d.id = sales_deal_activities.deal_id AND d.organization_id = current_setting('app.current_organization_id', true)::uuid));

-- SERVICES
ALTER TABLE service_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_funnel_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_ticket_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_funnels_org_policy ON service_funnels;
CREATE POLICY service_funnels_org_policy ON service_funnels FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

DROP POLICY IF EXISTS service_funnel_stages_policy ON service_funnel_stages;
CREATE POLICY service_funnel_stages_policy ON service_funnel_stages FOR ALL
  USING (EXISTS (SELECT 1 FROM service_funnels f WHERE f.id = service_funnel_stages.funnel_id AND f.organization_id = current_setting('app.current_organization_id', true)::uuid));

DROP POLICY IF EXISTS service_tickets_org_policy ON service_tickets;
CREATE POLICY service_tickets_org_policy ON service_tickets FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

DROP POLICY IF EXISTS service_ticket_activities_policy ON service_ticket_activities;
CREATE POLICY service_ticket_activities_policy ON service_ticket_activities FOR ALL
  USING (EXISTS (SELECT 1 FROM service_tickets t WHERE t.id = service_ticket_activities.ticket_id AND t.organization_id = current_setting('app.current_organization_id', true)::uuid));

-- PREDETERMINED
ALTER TABLE predetermined_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE predetermined_funnel_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE predetermined_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE predetermined_item_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS predetermined_funnels_org_policy ON predetermined_funnels;
CREATE POLICY predetermined_funnels_org_policy ON predetermined_funnels FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

DROP POLICY IF EXISTS predetermined_funnel_stages_policy ON predetermined_funnel_stages;
CREATE POLICY predetermined_funnel_stages_policy ON predetermined_funnel_stages FOR ALL
  USING (EXISTS (SELECT 1 FROM predetermined_funnels f WHERE f.id = predetermined_funnel_stages.funnel_id AND f.organization_id = current_setting('app.current_organization_id', true)::uuid));

DROP POLICY IF EXISTS predetermined_items_org_policy ON predetermined_items;
CREATE POLICY predetermined_items_org_policy ON predetermined_items FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

DROP POLICY IF EXISTS predetermined_item_activities_policy ON predetermined_item_activities;
CREATE POLICY predetermined_item_activities_policy ON predetermined_item_activities FOR ALL
  USING (EXISTS (SELECT 1 FROM predetermined_items i WHERE i.id = predetermined_item_activities.item_id AND i.organization_id = current_setting('app.current_organization_id', true)::uuid));

-- ============================================================================
-- SEED: Criar funis padrão para organizações existentes
-- ============================================================================
DO $$
DECLARE
  org_record RECORD;
  new_funnel_id UUID;
BEGIN
  FOR org_record IN SELECT id FROM organizations LOOP
    
    -- ========== SALES ==========
    IF NOT EXISTS (SELECT 1 FROM sales_funnels WHERE organization_id = org_record.id) THEN
      INSERT INTO sales_funnels (organization_id, name, description, is_default)
      VALUES (org_record.id, 'Funil Principal', 'Pipeline de vendas padrão', true)
      RETURNING id INTO new_funnel_id;
      
      INSERT INTO sales_funnel_stages (funnel_id, name, color, "order") VALUES
        (new_funnel_id, 'Qualificado', '#3b82f6', 1),
        (new_funnel_id, 'Contato Feito', '#f59e0b', 2),
        (new_funnel_id, 'Reunião Agendada', '#ef4444', 3),
        (new_funnel_id, 'Proposta Enviada', '#8b5cf6', 4),
        (new_funnel_id, 'Negociação', '#6366f1', 5);
      
      RAISE NOTICE 'Sales funnel criado para organização %', org_record.id;
    END IF;
    
    -- ========== SERVICES ==========
    IF NOT EXISTS (SELECT 1 FROM service_funnels WHERE organization_id = org_record.id) THEN
      INSERT INTO service_funnels (organization_id, name, description, is_default)
      VALUES (org_record.id, 'Funil de Atendimento', 'Pipeline de serviços padrão', true)
      RETURNING id INTO new_funnel_id;
      
      INSERT INTO service_funnel_stages (funnel_id, name, color, "order", is_resolved) VALUES
        (new_funnel_id, 'Triagem', '#3b82f6', 1, false),
        (new_funnel_id, 'Em Análise', '#f59e0b', 2, false),
        (new_funnel_id, 'Em Resolução', '#8b5cf6', 3, false),
        (new_funnel_id, 'Resolvido', '#10b981', 4, true);
      
      RAISE NOTICE 'Service funnel criado para organização %', org_record.id;
    END IF;
    
    -- ========== PREDETERMINED ==========
    IF NOT EXISTS (SELECT 1 FROM predetermined_funnels WHERE organization_id = org_record.id) THEN
      INSERT INTO predetermined_funnels (organization_id, name, description, is_default, trigger_type)
      VALUES (org_record.id, 'Checkin Padrão', 'Workflow de check-in', true, 'checkin')
      RETURNING id INTO new_funnel_id;
      
      INSERT INTO predetermined_funnel_stages (funnel_id, name, color, "order") VALUES
        (new_funnel_id, 'Aguardando', '#3b82f6', 1),
        (new_funnel_id, 'Em Preparação', '#f59e0b', 2),
        (new_funnel_id, 'Pronto', '#10b981', 3);
      
      RAISE NOTICE 'Predetermined funnel criado para organização %', org_record.id;
    END IF;
    
  END LOOP;
END $$;

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================
SELECT 'SALES FUNNELS' as module, COUNT(*) as count FROM sales_funnels
UNION ALL
SELECT 'SALES STAGES', COUNT(*) FROM sales_funnel_stages
UNION ALL
SELECT 'SERVICE FUNNELS', COUNT(*) FROM service_funnels
UNION ALL
SELECT 'SERVICE STAGES', COUNT(*) FROM service_funnel_stages
UNION ALL
SELECT 'PREDETERMINED FUNNELS', COUNT(*) FROM predetermined_funnels
UNION ALL
SELECT 'PREDETERMINED STAGES', COUNT(*) FROM predetermined_funnel_stages;
