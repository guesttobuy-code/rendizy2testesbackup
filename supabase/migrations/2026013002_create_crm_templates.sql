-- ============================================================================
-- MIGRATION: Sistema de Templates CRM (Tarefas e Projetos)
-- Version: 1.0.0
-- Date: 2026-01-30
-- 
-- Permite que usuários criem templates de tarefas e projetos para reutilização.
-- Templates podem ser públicos (compartilhados na organização) ou privados.
-- ============================================================================

-- ============================================================================
-- TABELA: crm_templates
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Identificação
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Tipo de template
  template_type VARCHAR(20) NOT NULL, -- 'task' ou 'project'
  
  -- Visibilidade
  is_public BOOLEAN DEFAULT false, -- true = todos da organização podem usar
  
  -- Dados do template (estrutura JSON)
  -- Para task: { title, description, priority, subtasks: [...], custom_fields: {...} }
  -- Para project: { name, description, color, sections: [...], tasks: [...] }
  template_data JSONB NOT NULL DEFAULT '{}',
  
  -- Metadados
  icon VARCHAR(50) DEFAULT 'file-text',
  color VARCHAR(7) DEFAULT '#6366f1',
  category VARCHAR(100), -- Categoria opcional para organização
  tags TEXT[] DEFAULT ARRAY[]::TEXT[], -- Tags para busca
  
  -- Estatísticas de uso
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Controle
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_crm_templates_org ON crm_templates(organization_id);
CREATE INDEX idx_crm_templates_created_by ON crm_templates(created_by);
CREATE INDEX idx_crm_templates_type ON crm_templates(template_type);
CREATE INDEX idx_crm_templates_public ON crm_templates(is_public);
CREATE INDEX idx_crm_templates_active ON crm_templates(is_active);
CREATE INDEX idx_crm_templates_category ON crm_templates(category);
CREATE INDEX idx_crm_templates_tags ON crm_templates USING GIN(tags);
CREATE INDEX idx_crm_templates_search ON crm_templates USING GIN(to_tsvector('portuguese', name || ' ' || COALESCE(description, '')));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_crm_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_crm_templates_updated_at
  BEFORE UPDATE ON crm_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_templates_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE crm_templates ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuário pode ver:
-- 1. Seus próprios templates (privados e públicos)
-- 2. Templates públicos da sua organização
CREATE POLICY crm_templates_select_policy ON crm_templates FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (
      created_by = auth.uid()  -- Seus próprios templates
      OR is_public = true      -- Templates públicos
    )
    AND is_active = true
  );

-- INSERT: Usuário pode criar templates na sua organização
CREATE POLICY crm_templates_insert_policy ON crm_templates FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    AND created_by = auth.uid()
  );

-- UPDATE: Usuário pode atualizar apenas seus próprios templates
CREATE POLICY crm_templates_update_policy ON crm_templates FOR UPDATE
  USING (
    created_by = auth.uid()
    AND organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- DELETE: Usuário pode deletar apenas seus próprios templates
CREATE POLICY crm_templates_delete_policy ON crm_templates FOR DELETE
  USING (
    created_by = auth.uid()
    AND organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- ============================================================================
-- FUNÇÃO: Incrementar contador de uso
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_template_use_count(template_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE crm_templates 
  SET 
    use_count = use_count + 1,
    last_used_at = NOW()
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON TABLE crm_templates IS 'Templates reutilizáveis de tarefas e projetos do CRM';
COMMENT ON COLUMN crm_templates.template_type IS 'Tipo: task (tarefa individual) ou project (projeto completo com estrutura)';
COMMENT ON COLUMN crm_templates.is_public IS 'Se true, todos os usuários da organização podem usar este template';
COMMENT ON COLUMN crm_templates.template_data IS 'JSON com a estrutura completa do template (campos variam por tipo)';
COMMENT ON COLUMN crm_templates.use_count IS 'Contador de quantas vezes este template foi usado';
