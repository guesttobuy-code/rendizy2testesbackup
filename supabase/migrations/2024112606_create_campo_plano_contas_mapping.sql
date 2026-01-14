-- ============================================================================
-- MIGRATION: Criar tabela de mapeamento de campos do sistema para plano de contas
-- Data: 2025-11-26
-- Versão: v1.0.103.1200
-- 
-- OBJETIVO:
-- Permitir mapear campos do sistema (ex: taxa de limpeza, taxa de serviço)
-- para contas do plano de contas
-- Similar a tags - amarra visualmente um campo a uma conta
-- ============================================================================

-- ============================================================================
-- PASSO 1: Criar tabela de mapeamento
-- ============================================================================

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

-- Índices para performance
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

-- Comentários
COMMENT ON TABLE financeiro_campo_plano_contas_mapping IS 'Mapeamento de campos do sistema para contas do plano de contas';
COMMENT ON COLUMN financeiro_campo_plano_contas_mapping.modulo IS 'Módulo do sistema (ex: reservas, propriedades)';
COMMENT ON COLUMN financeiro_campo_plano_contas_mapping.campo_codigo IS 'Código do campo (ex: pricing.cleaningFee)';
COMMENT ON COLUMN financeiro_campo_plano_contas_mapping.campo_nome IS 'Nome legível do campo (ex: Taxa de Limpeza)';
COMMENT ON COLUMN financeiro_campo_plano_contas_mapping.campo_tipo IS 'Tipo do campo: receita ou despesa';
COMMENT ON COLUMN financeiro_campo_plano_contas_mapping.categoria_id IS 'ID da conta do plano de contas mapeada';

-- ============================================================================
-- PASSO 2: Inserir campos padrão do módulo de reservas
-- ============================================================================

-- Função para inserir campos padrão para uma organização
CREATE OR REPLACE FUNCTION criar_campos_padrao_reservas(org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verificar se organização existe
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = org_id) THEN
    RAISE EXCEPTION 'Organização % não encontrada', org_id;
  END IF;

  -- Campos de RECEITA (valores que entram)
  -- Estes campos serão mapeados para contas de receita do plano de contas
  
  -- Base Total (receita principal)
  INSERT INTO financeiro_campo_plano_contas_mapping (
    organization_id, modulo, campo_codigo, campo_nome, campo_tipo, descricao, ativo
  )
  VALUES (
    org_id, 'reservas', 'pricing.baseTotal', 'Receita Base (Diárias)', 'receita',
    'Valor base das diárias da reserva', true
  )
  ON CONFLICT (organization_id, modulo, campo_codigo) DO NOTHING;

  -- Taxa de Limpeza (receita adicional)
  INSERT INTO financeiro_campo_plano_contas_mapping (
    organization_id, modulo, campo_codigo, campo_nome, campo_tipo, descricao, ativo
  )
  VALUES (
    org_id, 'reservas', 'pricing.cleaningFee', 'Taxa de Limpeza', 'receita',
    'Taxa de limpeza cobrada do hóspede', true
  )
  ON CONFLICT (organization_id, modulo, campo_codigo) DO NOTHING;

  -- Taxa de Serviço (receita adicional)
  INSERT INTO financeiro_campo_plano_contas_mapping (
    organization_id, modulo, campo_codigo, campo_nome, campo_tipo, descricao, ativo
  )
  VALUES (
    org_id, 'reservas', 'pricing.serviceFee', 'Taxa de Serviço', 'receita',
    'Taxa de serviço cobrada do hóspede', true
  )
  ON CONFLICT (organization_id, modulo, campo_codigo) DO NOTHING;

  -- Campos de DESPESA (valores que saem)
  -- Estes campos serão mapeados para contas de despesa do plano de contas
  
  -- Impostos (despesa)
  INSERT INTO financeiro_campo_plano_contas_mapping (
    organization_id, modulo, campo_codigo, campo_nome, campo_tipo, descricao, ativo
  )
  VALUES (
    org_id, 'reservas', 'pricing.taxes', 'Impostos sobre Receita', 'despesa',
    'Impostos calculados sobre a receita da reserva', true
  )
  ON CONFLICT (organization_id, modulo, campo_codigo) DO NOTHING;

  -- Desconto (redução de receita)
  INSERT INTO financeiro_campo_plano_contas_mapping (
    organization_id, modulo, campo_codigo, campo_nome, campo_tipo, descricao, ativo
  )
  VALUES (
    org_id, 'reservas', 'pricing.discount', 'Desconto Concedido', 'despesa',
    'Desconto aplicado na reserva', true
  )
  ON CONFLICT (organization_id, modulo, campo_codigo) DO NOTHING;

END;
$$;

-- Aplicar campos padrão para todas as organizações
DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT id FROM organizations LOOP
    PERFORM criar_campos_padrao_reservas(org_record.id);
  END LOOP;
  
  RAISE NOTICE '✅ Campos padrão criados para todas as organizações';
END $$;

-- ============================================================================
-- LOG DE CONCLUSÃO
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 20241126_create_campo_plano_contas_mapping concluída';
  RAISE NOTICE '   - Tabela financeiro_campo_plano_contas_mapping criada';
  RAISE NOTICE '   - Campos padrão do módulo de reservas inseridos';
  RAISE NOTICE '   - Pronto para mapeamento visual na interface';
END $$;

