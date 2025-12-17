-- ============================================================================
-- SCRIPT: Verificar e criar tabela financeiro_campo_plano_contas_mapping
-- Data: 2025-11-26
-- ============================================================================

-- Verificar se a tabela existe
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'financeiro_campo_plano_contas_mapping'
    )
    THEN '✅ Tabela existe'
    ELSE '❌ Tabela NÃO existe'
  END AS status_tabela;

-- Se não existir, criar a tabela
CREATE TABLE IF NOT EXISTS financeiro_campo_plano_contas_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Campo do sistema (origem)
  modulo TEXT NOT NULL, -- 'reservas', 'propriedades', 'hospedes', etc.
  campo_codigo TEXT NOT NULL, -- 'pricing.cleaningFee', 'pricing.serviceFee', etc.
  campo_nome TEXT NOT NULL, -- 'Taxa de Limpeza', 'Taxa de Serviço', etc.
  campo_tipo TEXT NOT NULL CHECK (campo_tipo IN ('receita', 'despesa')), -- Tipo do campo
  
  -- Conta do plano de contas (destino)
  categoria_id UUID REFERENCES financeiro_categorias(id) ON DELETE SET NULL,
  
  -- Metadados
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  
  -- Constraint: um campo só pode estar mapeado para uma conta por organização
  CONSTRAINT unique_campo_organizacao UNIQUE (organization_id, modulo, campo_codigo)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_campo_mapping_organization ON financeiro_campo_plano_contas_mapping(organization_id);
CREATE INDEX IF NOT EXISTS idx_campo_mapping_modulo ON financeiro_campo_plano_contas_mapping(modulo);
CREATE INDEX IF NOT EXISTS idx_campo_mapping_categoria ON financeiro_campo_plano_contas_mapping(categoria_id);
CREATE INDEX IF NOT EXISTS idx_campo_mapping_ativo ON financeiro_campo_plano_contas_mapping(ativo);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_campo_mapping_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_campo_mapping_updated_at ON financeiro_campo_plano_contas_mapping;
CREATE TRIGGER trigger_update_campo_mapping_updated_at
  BEFORE UPDATE ON financeiro_campo_plano_contas_mapping
  FOR EACH ROW
  EXECUTE FUNCTION update_campo_mapping_updated_at();

-- Verificar novamente após criação
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'financeiro_campo_plano_contas_mapping'
    )
    THEN '✅ Tabela criada com sucesso!'
    ELSE '❌ Erro ao criar tabela'
  END AS status_final;

-- Mostrar estrutura da tabela
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'financeiro_campo_plano_contas_mapping'
ORDER BY ordinal_position;

