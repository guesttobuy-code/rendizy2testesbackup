-- ============================================================================
-- MIGRATION: Tabela de Automações (VERSÃO IDEMPOTENTE)
-- Data: 2025-11-26
-- Objetivo: Armazenar automações criadas pelos usuários (notificações, relatórios)
-- ============================================================================

CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  definition JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused')),
  module TEXT,
  channel TEXT,
  priority TEXT DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta')),
  trigger_count INTEGER NOT NULL DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT automations_name_org_unique UNIQUE (organization_id, name)
);

COMMENT ON TABLE automations IS 'Automações criadas pelos usuários para notificações e relatórios automáticos.';
COMMENT ON COLUMN automations.definition IS 'JSON estruturado com trigger, conditions, actions e metadata.';
COMMENT ON COLUMN automations.status IS 'Estado da automação: draft (rascunho), active (ativa), paused (pausada).';
COMMENT ON COLUMN automations.trigger_count IS 'Contador de quantas vezes a automação foi executada.';

CREATE INDEX IF NOT EXISTS idx_automations_org ON automations(organization_id);
CREATE INDEX IF NOT EXISTS idx_automations_status ON automations(status);
CREATE INDEX IF NOT EXISTS idx_automations_module ON automations(module);
CREATE INDEX IF NOT EXISTS idx_automations_org_status ON automations(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_automations_definition_gin ON automations USING GIN(definition);

CREATE OR REPLACE FUNCTION update_automations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_automations_updated_at ON automations;

CREATE TRIGGER trg_automations_updated_at
  BEFORE UPDATE ON automations
  FOR EACH ROW
  EXECUTE FUNCTION update_automations_updated_at();

CREATE TABLE IF NOT EXISTS automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  trigger_event TEXT,
  conditions_met BOOLEAN NOT NULL DEFAULT false,
  actions_executed JSONB,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE automation_executions IS 'Log de execuções das automações para auditoria e debugging.';

CREATE INDEX IF NOT EXISTS idx_automation_executions_automation ON automation_executions(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_org ON automation_executions(organization_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_status ON automation_executions(status);
CREATE INDEX IF NOT EXISTS idx_automation_executions_created ON automation_executions(created_at DESC);

ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para automations (com DROP IF EXISTS para ser idempotente)
DROP POLICY IF EXISTS automations_org_isolation ON automations;
CREATE POLICY automations_org_isolation ON automations
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Políticas RLS para automation_executions (com DROP IF EXISTS para ser idempotente)
DROP POLICY IF EXISTS automation_executions_org_isolation ON automation_executions;
CREATE POLICY automation_executions_org_isolation ON automation_executions
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

