-- ============================================================================
-- MIGRATION: AI Agent Construtoras
-- Tabela para cadastro persistente de construtoras monitoradas pelo agente de IA
-- ============================================================================

-- Criar tabela de construtoras
CREATE TABLE IF NOT EXISTS ai_agent_construtoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Dados da construtora
  name VARCHAR(255) NOT NULL,
  linktree_url TEXT NOT NULL,
  website_url TEXT,
  notes TEXT,
  
  -- Status e controle
  is_active BOOLEAN DEFAULT true,
  last_scraped_at TIMESTAMPTZ,
  empreendimentos_count INTEGER DEFAULT 0,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ai_agent_construtoras_org 
  ON ai_agent_construtoras(organization_id);

CREATE INDEX IF NOT EXISTS idx_ai_agent_construtoras_active 
  ON ai_agent_construtoras(organization_id, is_active);

-- Constraint de unicidade (uma construtora por Linktree por org)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_agent_construtoras_unique_url 
  ON ai_agent_construtoras(organization_id, linktree_url) 
  WHERE is_active = true;

-- RLS
ALTER TABLE ai_agent_construtoras ENABLE ROW LEVEL SECURITY;

-- Política de leitura
CREATE POLICY "Users can read own org construtoras" ON ai_agent_construtoras
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Política de inserção
CREATE POLICY "Users can insert own org construtoras" ON ai_agent_construtoras
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Política de atualização
CREATE POLICY "Users can update own org construtoras" ON ai_agent_construtoras
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Política de deleção
CREATE POLICY "Users can delete own org construtoras" ON ai_agent_construtoras
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Comentários
COMMENT ON TABLE ai_agent_construtoras IS 'Construtoras cadastradas para monitoramento pelo agente de IA';
COMMENT ON COLUMN ai_agent_construtoras.linktree_url IS 'URL do Linktree da construtora para scraping';
COMMENT ON COLUMN ai_agent_construtoras.last_scraped_at IS 'Data/hora da última coleta de dados';
COMMENT ON COLUMN ai_agent_construtoras.empreendimentos_count IS 'Quantidade de empreendimentos encontrados na última coleta';
