-- ============================================================================
-- TABELA: ai_agent_empreendimentos
-- Armazena empreendimentos coletados pelo agente de IA
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_agent_empreendimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  construtora_id UUID REFERENCES ai_agent_construtoras(id) ON DELETE CASCADE,
  
  -- Identificação
  nome VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  
  -- Localização
  bairro VARCHAR(255),
  cidade VARCHAR(100) DEFAULT 'Rio de Janeiro',
  estado VARCHAR(2) DEFAULT 'RJ',
  endereco TEXT,
  
  -- Características
  tipologias JSONB DEFAULT '[]'::jsonb, -- ["1 quarto", "2 quartos", "3 suítes"]
  area_min DECIMAL(10,2),
  area_max DECIMAL(10,2),
  andares INTEGER,
  unidades_total INTEGER,
  unidades_disponiveis INTEGER,
  
  -- Preços
  preco_min DECIMAL(15,2),
  preco_max DECIMAL(15,2),
  condicao_pagamento TEXT,
  
  -- Status do empreendimento
  status VARCHAR(50), -- 'lancamento', 'em_obras', 'pronto', 'entregue'
  previsao_entrega DATE,
  percentual_vendido DECIMAL(5,2),
  
  -- Links coletados
  links JSONB DEFAULT '{}'::jsonb,
  /*
    Estrutura esperada:
    {
      "disponibilidade": "https://...",
      "tabela_precos": "https://...",
      "material_vendas": "https://...",
      "decorado_virtual": "https://...",
      "andamento_obra": "https://...",
      "publicidade": "https://..."
    }
  */
  
  -- Dados brutos da última coleta
  dados_raw JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps e controle
  last_scraped_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ai_empreendimentos_org 
  ON ai_agent_empreendimentos(organization_id);

CREATE INDEX IF NOT EXISTS idx_ai_empreendimentos_construtora 
  ON ai_agent_empreendimentos(construtora_id);

CREATE INDEX IF NOT EXISTS idx_ai_empreendimentos_active 
  ON ai_agent_empreendimentos(organization_id, is_active);

CREATE INDEX IF NOT EXISTS idx_ai_empreendimentos_slug 
  ON ai_agent_empreendimentos(slug);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_ai_empreendimentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_empreendimentos_updated_at ON ai_agent_empreendimentos;
CREATE TRIGGER trg_ai_empreendimentos_updated_at
  BEFORE UPDATE ON ai_agent_empreendimentos
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_empreendimentos_updated_at();

-- ============================================================================
-- TABELA: ai_agent_unidades
-- Unidades individuais de cada empreendimento (opcional - fase 2)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_agent_unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  empreendimento_id UUID NOT NULL REFERENCES ai_agent_empreendimentos(id) ON DELETE CASCADE,
  
  -- Identificação da unidade
  codigo VARCHAR(50), -- "101", "201-A", etc.
  bloco VARCHAR(50),
  andar INTEGER,
  
  -- Características
  tipologia VARCHAR(100), -- "2 quartos", "3 suítes", etc.
  area DECIMAL(10,2),
  
  -- Preço
  preco DECIMAL(15,2),
  preco_m2 DECIMAL(15,2),
  
  -- Status
  status VARCHAR(50), -- 'disponivel', 'reservada', 'vendida'
  
  -- Dados brutos
  dados_raw JSONB DEFAULT '{}'::jsonb,
  
  -- Controle
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ai_unidades_empreendimento 
  ON ai_agent_unidades(empreendimento_id);

CREATE INDEX IF NOT EXISTS idx_ai_unidades_status 
  ON ai_agent_unidades(empreendimento_id, status);

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON TABLE ai_agent_empreendimentos IS 'Empreendimentos coletados pelo agente de IA';
COMMENT ON TABLE ai_agent_unidades IS 'Unidades individuais de cada empreendimento';

COMMENT ON COLUMN ai_agent_empreendimentos.links IS 'Links categorizados: disponibilidade, tabela_precos, material_vendas, decorado_virtual, andamento_obra, publicidade';
COMMENT ON COLUMN ai_agent_empreendimentos.tipologias IS 'Array de tipologias: ["1 quarto", "2 quartos", "3 suítes"]';
COMMENT ON COLUMN ai_agent_empreendimentos.status IS 'lancamento, em_obras, pronto, entregue';
