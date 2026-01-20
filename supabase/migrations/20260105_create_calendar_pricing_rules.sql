-- ============================================================
-- Calendar Pricing Rules (Multi-tenant)
-- Cada organização pode ter suas próprias regras de preço/condição/restrição por data
-- ============================================================

-- Tabela principal de regras de calendário
CREATE TABLE IF NOT EXISTS calendar_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- property_id NULL = regra global (Regras em Lote)
  -- property_id NOT NULL = regra específica do imóvel
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Período da regra
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Condição percentual (ex: +15 = acréscimo de 15%, -10 = desconto de 10%)
  condition_percent DECIMAL(5,2) DEFAULT 0,
  
  -- Mínimo de noites para este período
  min_nights INTEGER DEFAULT 1 CHECK (min_nights >= 1),
  
  -- Restrição (texto livre ou tipo específico)
  -- Exemplos: 'no_checkin', 'no_checkout', 'blocked', null (sem restrição)
  restriction TEXT DEFAULT NULL,
  
  -- Prioridade: regras com maior prioridade sobrepõem as de menor
  -- Regras em Lote (property_id IS NULL) têm prioridade menor que regras específicas
  -- Mas quando o imóvel está no filtro avançado, Regras em Lote devem sobrepor
  priority INTEGER DEFAULT 0,
  
  -- Metadados
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT valid_condition_percent CHECK (condition_percent BETWEEN -100 AND 500)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_calendar_pricing_rules_org 
  ON calendar_pricing_rules(organization_id);
  
CREATE INDEX IF NOT EXISTS idx_calendar_pricing_rules_property 
  ON calendar_pricing_rules(property_id) WHERE property_id IS NOT NULL;
  
CREATE INDEX IF NOT EXISTS idx_calendar_pricing_rules_dates 
  ON calendar_pricing_rules(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_calendar_pricing_rules_org_dates 
  ON calendar_pricing_rules(organization_id, start_date, end_date);

-- Índice para regras globais (Regras em Lote)
CREATE INDEX IF NOT EXISTS idx_calendar_pricing_rules_global 
  ON calendar_pricing_rules(organization_id, start_date, end_date) 
  WHERE property_id IS NULL;

-- RLS (Row Level Security)
ALTER TABLE calendar_pricing_rules ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (para permitir re-execução)
DROP POLICY IF EXISTS calendar_pricing_rules_select_policy ON calendar_pricing_rules;
DROP POLICY IF EXISTS calendar_pricing_rules_insert_policy ON calendar_pricing_rules;
DROP POLICY IF EXISTS calendar_pricing_rules_update_policy ON calendar_pricing_rules;
DROP POLICY IF EXISTS calendar_pricing_rules_delete_policy ON calendar_pricing_rules;

-- Política: usuários só veem regras da sua organização
CREATE POLICY calendar_pricing_rules_select_policy ON calendar_pricing_rules
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Política: usuários só podem inserir regras na sua organização
CREATE POLICY calendar_pricing_rules_insert_policy ON calendar_pricing_rules
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Política: usuários só podem atualizar regras da sua organização
CREATE POLICY calendar_pricing_rules_update_policy ON calendar_pricing_rules
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Política: usuários só podem deletar regras da sua organização
CREATE POLICY calendar_pricing_rules_delete_policy ON calendar_pricing_rules
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Função para buscar regras aplicáveis a uma data específica
-- Retorna a regra mais específica (property > global) ou com maior prioridade
CREATE OR REPLACE FUNCTION get_calendar_rule_for_date(
  p_organization_id UUID,
  p_property_id UUID,
  p_date DATE,
  p_apply_batch_rules BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  condition_percent DECIMAL(5,2),
  min_nights INTEGER,
  restriction TEXT,
  is_batch_rule BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_rules AS (
    SELECT 
      r.condition_percent,
      r.min_nights,
      r.restriction,
      r.property_id IS NULL AS is_batch_rule,
      CASE 
        -- Se apply_batch_rules=true E regra é batch, dá prioridade máxima
        WHEN p_apply_batch_rules AND r.property_id IS NULL THEN 1000 + r.priority
        -- Regras específicas do imóvel têm prioridade maior que batch
        WHEN r.property_id IS NOT NULL THEN 100 + r.priority
        -- Regras batch têm prioridade menor
        ELSE r.priority
      END AS effective_priority
    FROM calendar_pricing_rules r
    WHERE r.organization_id = p_organization_id
      AND p_date BETWEEN r.start_date AND r.end_date
      AND (r.property_id = p_property_id OR r.property_id IS NULL)
    ORDER BY effective_priority DESC
    LIMIT 1
  )
  SELECT 
    ranked_rules.condition_percent,
    ranked_rules.min_nights,
    ranked_rules.restriction,
    ranked_rules.is_batch_rule
  FROM ranked_rules;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute para authenticated users
GRANT EXECUTE ON FUNCTION get_calendar_rule_for_date TO authenticated;

-- Comentários para documentação
COMMENT ON TABLE calendar_pricing_rules IS 
  'Regras de precificação e restrições de calendário por organização (multi-tenant). '
  'property_id NULL = Regras em Lote (aplicam a todos os imóveis filtrados). '
  'property_id NOT NULL = Regra específica do imóvel.';

COMMENT ON COLUMN calendar_pricing_rules.condition_percent IS 
  'Percentual de condição a aplicar no preço base. '
  'Positivo = acréscimo (ex: +15 para alta temporada). '
  'Negativo = desconto (ex: -10 para baixa temporada).';

COMMENT ON COLUMN calendar_pricing_rules.min_nights IS 
  'Mínimo de noites exigido para reservas neste período.';

COMMENT ON COLUMN calendar_pricing_rules.restriction IS 
  'Tipo de restrição: no_checkin, no_checkout, blocked, ou texto livre.';

COMMENT ON FUNCTION get_calendar_rule_for_date IS 
  'Retorna a regra de calendário aplicável para uma data específica. '
  'Se p_apply_batch_rules=true, regras em lote têm prioridade sobre regras do imóvel.';
