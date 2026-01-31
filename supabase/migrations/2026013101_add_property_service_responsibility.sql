-- ============================================================================
-- MIGRAÇÃO: Adicionar campos de responsabilidade por serviço nos imóveis
-- Data: 2026-01-31
-- Autor: Sistema
-- 
-- Esta migração adiciona campos para configurar quem é responsável pela
-- limpeza e manutenção de cada imóvel: a empresa de gestão ou o proprietário.
-- ============================================================================

-- 1. Adicionar campos de responsabilidade na tabela properties
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS cleaning_responsibility TEXT DEFAULT 'company' 
  CHECK (cleaning_responsibility IN ('company', 'owner'));

ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS maintenance_responsibility TEXT DEFAULT 'company' 
  CHECK (maintenance_responsibility IN ('company', 'owner'));

-- Comentários para documentação
COMMENT ON COLUMN properties.cleaning_responsibility IS 'Quem é responsável pela limpeza: company (empresa de gestão) ou owner (proprietário)';
COMMENT ON COLUMN properties.maintenance_responsibility IS 'Quem é responsável pela manutenção: company (empresa de gestão) ou owner (proprietário)';

-- 2. Adicionar campos nos templates de tarefas operacionais
ALTER TABLE operational_task_templates 
ADD COLUMN IF NOT EXISTS responsibility_filter TEXT DEFAULT 'all'
  CHECK (responsibility_filter IN ('company', 'owner', 'all'));

ALTER TABLE operational_task_templates 
ADD COLUMN IF NOT EXISTS operation_category TEXT DEFAULT 'other'
  CHECK (operation_category IN ('checkin', 'checkout', 'cleaning', 'maintenance', 'other'));

COMMENT ON COLUMN operational_task_templates.responsibility_filter IS 'Filtrar tarefas por responsabilidade: company (só imóveis da empresa), owner (só do proprietário), all (todos)';
COMMENT ON COLUMN operational_task_templates.operation_category IS 'Categoria da operação: checkin, checkout, cleaning, maintenance, other';

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_properties_cleaning_responsibility 
ON properties(cleaning_responsibility) 
WHERE cleaning_responsibility IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_properties_maintenance_responsibility 
ON properties(maintenance_responsibility) 
WHERE maintenance_responsibility IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_operational_templates_category 
ON operational_task_templates(operation_category);

CREATE INDEX IF NOT EXISTS idx_operational_templates_responsibility 
ON operational_task_templates(responsibility_filter);

-- 4. Criar view para facilitar consultas de operações por responsabilidade
CREATE OR REPLACE VIEW v_properties_with_responsibilities AS
SELECT 
  p.id,
  p.title,
  p.organization_id,
  p.cleaning_responsibility,
  p.maintenance_responsibility,
  CASE 
    WHEN p.cleaning_responsibility = 'company' THEN 'Empresa'
    WHEN p.cleaning_responsibility = 'owner' THEN 'Proprietário'
    ELSE 'Não definido'
  END as cleaning_responsibility_label,
  CASE 
    WHEN p.maintenance_responsibility = 'company' THEN 'Empresa'
    WHEN p.maintenance_responsibility = 'owner' THEN 'Proprietário'
    ELSE 'Não definido'
  END as maintenance_responsibility_label
FROM properties p;

-- 5. Função para obter estatísticas de responsabilidade por organização
CREATE OR REPLACE FUNCTION get_property_responsibility_stats(p_organization_id UUID)
RETURNS TABLE (
  total_properties BIGINT,
  cleaning_by_company BIGINT,
  cleaning_by_owner BIGINT,
  maintenance_by_company BIGINT,
  maintenance_by_owner BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_properties,
    COUNT(*) FILTER (WHERE cleaning_responsibility = 'company')::BIGINT as cleaning_by_company,
    COUNT(*) FILTER (WHERE cleaning_responsibility = 'owner')::BIGINT as cleaning_by_owner,
    COUNT(*) FILTER (WHERE maintenance_responsibility = 'company')::BIGINT as maintenance_by_company,
    COUNT(*) FILTER (WHERE maintenance_responsibility = 'owner')::BIGINT as maintenance_by_owner
  FROM properties
  WHERE organization_id = p_organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissões
GRANT EXECUTE ON FUNCTION get_property_responsibility_stats(UUID) TO authenticated;
