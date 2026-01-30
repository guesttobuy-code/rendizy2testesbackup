-- =============================================================================
-- MIGRATION: Tabela de logs de reconciliação de reservas
-- =============================================================================
-- Registra execuções do job de reconciliação para:
-- 1. Auditoria de ações tomadas (cancelamentos, atualizações)
-- 2. Dashboard de saúde da sincronização
-- 3. Alertas de problemas recorrentes
-- =============================================================================

-- Tabela principal de execuções
CREATE TABLE IF NOT EXISTS reconciliation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Quando executou
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Status da execução
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  
  -- Contadores
  total_checked INTEGER DEFAULT 0,
  found_deleted INTEGER DEFAULT 0,       -- Reservas deletadas na Stays
  found_modified INTEGER DEFAULT 0,      -- Reservas modificadas (datas, status)
  found_orphan INTEGER DEFAULT 0,        -- Reservas sem property válida
  action_cancelled INTEGER DEFAULT 0,    -- Quantas foram canceladas
  action_updated INTEGER DEFAULT 0,      -- Quantas foram atualizadas
  action_skipped INTEGER DEFAULT 0,      -- Quantas foram ignoradas (data passada, etc.)
  
  -- Mensagens e erros
  error_message TEXT,
  summary JSONB,                          -- Resumo estruturado
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de detalhes (cada reserva afetada)
CREATE TABLE IF NOT EXISTS reconciliation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES reconciliation_runs(id) ON DELETE CASCADE,
  
  -- Identificação da reserva (reservations.id é TEXT, não UUID)
  reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  external_id TEXT,
  confirmation_code TEXT,
  property_id UUID,
  
  -- O que foi encontrado
  issue_type TEXT NOT NULL CHECK (issue_type IN (
    'deleted',       -- Não existe mais na Stays
    'status_changed', -- Status diferente na Stays
    'dates_changed', -- Datas alteradas
    'guest_changed', -- Hóspede alterado
    'orphan'         -- Property não existe mais
  )),
  
  -- Estado anterior e novo
  local_status TEXT,
  api_status TEXT,
  local_data JSONB,      -- Snapshot antes da alteração
  api_data JSONB,        -- Dados da API
  
  -- Ação tomada
  action_taken TEXT CHECK (action_taken IN ('cancelled', 'updated', 'skipped', 'error')),
  action_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_reconciliation_runs_org 
  ON reconciliation_runs(organization_id);
  
CREATE INDEX IF NOT EXISTS idx_reconciliation_runs_status 
  ON reconciliation_runs(status);
  
CREATE INDEX IF NOT EXISTS idx_reconciliation_runs_date 
  ON reconciliation_runs(started_at DESC);
  
CREATE INDEX IF NOT EXISTS idx_reconciliation_items_run 
  ON reconciliation_items(run_id);
  
CREATE INDEX IF NOT EXISTS idx_reconciliation_items_reservation 
  ON reconciliation_items(reservation_id);
  
CREATE INDEX IF NOT EXISTS idx_reconciliation_items_type 
  ON reconciliation_items(issue_type);

-- RLS
ALTER TABLE reconciliation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_items ENABLE ROW LEVEL SECURITY;

-- Policies: apenas usuários da organização podem ver
CREATE POLICY "Users can view their org reconciliation runs"
  ON reconciliation_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.organization_id = reconciliation_runs.organization_id
      AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can view their org reconciliation items"
  ON reconciliation_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reconciliation_runs rr
      JOIN users u ON u.organization_id = rr.organization_id
      WHERE rr.id = reconciliation_items.run_id
      AND u.id = auth.uid()
    )
  );

-- Service role pode tudo
CREATE POLICY "Service role full access to reconciliation_runs"
  ON reconciliation_runs FOR ALL
  USING (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role');

CREATE POLICY "Service role full access to reconciliation_items"
  ON reconciliation_items FOR ALL
  USING (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role');

-- =============================================================================
-- COMENTÁRIOS
-- =============================================================================
COMMENT ON TABLE reconciliation_runs IS 
  'Log de execuções do job de reconciliação de reservas com Stays.net';
  
COMMENT ON TABLE reconciliation_items IS 
  'Detalhes de cada reserva afetada em uma execução de reconciliação';
  
COMMENT ON COLUMN reconciliation_runs.found_deleted IS 
  'Reservas que não existem mais na API da Stays (foram deletadas)';
  
COMMENT ON COLUMN reconciliation_runs.found_modified IS 
  'Reservas que existem mas com dados diferentes (status, datas, etc.)';

-- =============================================================================
-- VIEW PARA DASHBOARD
-- =============================================================================
CREATE OR REPLACE VIEW reconciliation_dashboard AS
SELECT 
  rr.organization_id,
  rr.id AS run_id,
  rr.started_at,
  rr.duration_ms,
  rr.status,
  rr.total_checked,
  rr.found_deleted + rr.found_modified + rr.found_orphan AS total_issues,
  rr.action_cancelled + rr.action_updated AS total_fixed,
  rr.found_deleted,
  rr.found_modified,
  rr.found_orphan,
  rr.action_cancelled,
  rr.action_updated,
  rr.action_skipped,
  CASE 
    WHEN rr.total_checked = 0 THEN 100
    ELSE ROUND(
      ((rr.total_checked - (rr.found_deleted + rr.found_modified + rr.found_orphan))::numeric / rr.total_checked) * 100,
      2
    )
  END AS sync_health_percentage
FROM reconciliation_runs rr
ORDER BY rr.started_at DESC;

COMMENT ON VIEW reconciliation_dashboard IS 
  'Dashboard de saúde da sincronização de reservas';
