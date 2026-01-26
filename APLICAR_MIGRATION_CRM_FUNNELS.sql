-- ============================================================================
-- MIGRATION: CRM Funnels (Funis de Vendas, Serviços, Pré-determinados)
-- Data: 2026-01-26
-- Descrição: Criar tabelas para gerenciar funis e estágios do CRM
-- ============================================================================

-- Tabela principal de funis
CREATE TABLE IF NOT EXISTS crm_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('SALES', 'SERVICES', 'PREDETERMINED')),
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  is_global_default BOOLEAN DEFAULT FALSE,
  global_default_note TEXT,
  status_config JSONB DEFAULT '{"resolvedStatus": "Concluído", "unresolvedStatus": "Cancelado", "inProgressStatus": "Em Andamento"}'::jsonb,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de estágios do funil
CREATE TABLE IF NOT EXISTS crm_funnel_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES crm_funnels(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT '#3b82f6',
  "order" INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_crm_funnels_org ON crm_funnels(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_funnels_type ON crm_funnels(type);
CREATE INDEX IF NOT EXISTS idx_crm_funnel_stages_funnel ON crm_funnel_stages(funnel_id);
CREATE INDEX IF NOT EXISTS idx_crm_funnel_stages_order ON crm_funnel_stages(funnel_id, "order");

-- Adicionar coluna funnel_id na tabela deals se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deals' AND column_name = 'funnel_id'
  ) THEN
    ALTER TABLE deals ADD COLUMN funnel_id UUID REFERENCES crm_funnels(id);
    CREATE INDEX idx_deals_funnel ON deals(funnel_id);
  END IF;
END $$;

-- Adicionar coluna stage_id na tabela deals se não existir (para stage dinâmica)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deals' AND column_name = 'stage_id'
  ) THEN
    ALTER TABLE deals ADD COLUMN stage_id UUID REFERENCES crm_funnel_stages(id);
    CREATE INDEX idx_deals_stage_id ON deals(stage_id);
  END IF;
END $$;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_crm_funnels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_crm_funnels_updated_at ON crm_funnels;
CREATE TRIGGER trigger_crm_funnels_updated_at
  BEFORE UPDATE ON crm_funnels
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_funnels_updated_at();

-- RLS Policies
ALTER TABLE crm_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_funnel_stages ENABLE ROW LEVEL SECURITY;

-- Policy para crm_funnels
DROP POLICY IF EXISTS crm_funnels_org_policy ON crm_funnels;
CREATE POLICY crm_funnels_org_policy ON crm_funnels
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- Policy para crm_funnel_stages (acesso via funnel)
DROP POLICY IF EXISTS crm_funnel_stages_policy ON crm_funnel_stages;
CREATE POLICY crm_funnel_stages_policy ON crm_funnel_stages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM crm_funnels f 
      WHERE f.id = crm_funnel_stages.funnel_id 
      AND f.organization_id = current_setting('app.current_organization_id', true)::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_funnels f 
      WHERE f.id = crm_funnel_stages.funnel_id 
      AND f.organization_id = current_setting('app.current_organization_id', true)::uuid
    )
  );

-- ============================================================================
-- SEED: Criar funil padrão de vendas para organizações existentes
-- ============================================================================
DO $$
DECLARE
  org_record RECORD;
  new_funnel_id UUID;
BEGIN
  FOR org_record IN SELECT id FROM organizations LOOP
    -- Verificar se já existe funil SALES para esta organização
    IF NOT EXISTS (
      SELECT 1 FROM crm_funnels 
      WHERE organization_id = org_record.id AND type = 'SALES'
    ) THEN
      -- Criar funil padrão de vendas
      INSERT INTO crm_funnels (organization_id, name, type, description, is_default)
      VALUES (org_record.id, 'Funil Principal', 'SALES', 'Pipeline de vendas padrão', true)
      RETURNING id INTO new_funnel_id;
      
      -- Criar estágios padrão
      INSERT INTO crm_funnel_stages (funnel_id, name, color, "order") VALUES
        (new_funnel_id, 'Qualificado', '#3b82f6', 1),
        (new_funnel_id, 'Contato Feito', '#f59e0b', 2),
        (new_funnel_id, 'Reunião Agendada', '#ef4444', 3),
        (new_funnel_id, 'Proposta Enviada', '#8b5cf6', 4),
        (new_funnel_id, 'Negociação', '#6366f1', 5);
      
      RAISE NOTICE 'Funil SALES criado para organização %', org_record.id;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================
SELECT 
  f.id,
  f.organization_id,
  f.name,
  f.type,
  f.is_default,
  COUNT(s.id) as stages_count
FROM crm_funnels f
LEFT JOIN crm_funnel_stages s ON s.funnel_id = f.id
GROUP BY f.id, f.organization_id, f.name, f.type, f.is_default
ORDER BY f.created_at DESC;
