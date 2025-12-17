-- ============================================================================
-- MIGRATION: Criar tabelas do Módulo Financeiro (VERSÃO IDEMPOTENTE)
-- Data: 2025-11-23
-- Versão: 1.0.103.400 - MÓDULO FINANCEIRO
-- ============================================================================
-- 
-- ✅ VERSÃO IDEMPOTENTE: Pode ser executada múltiplas vezes sem erros
-- ✅ DROP CASCADE: Remove todas as dependências antes de recriar
-- ✅ DROP FUNCTIONS/TRIGGERS: Remove funções e triggers antes de criar
-- ============================================================================

-- ============================================================================
-- LIMPEZA COMPLETA: Dropar tudo que pode existir
-- ============================================================================

-- Dropar triggers primeiro (dependem de tabelas)
DROP TRIGGER IF EXISTS trigger_validate_categoria_parent_org ON financeiro_categorias;
DROP TRIGGER IF EXISTS trigger_update_financeiro_categorias_updated_at ON financeiro_categorias;
DROP TRIGGER IF EXISTS trigger_update_financeiro_centro_custos_updated_at ON financeiro_centro_custos;
DROP TRIGGER IF EXISTS trigger_update_financeiro_contas_bancarias_updated_at ON financeiro_contas_bancarias;
DROP TRIGGER IF EXISTS trigger_update_financeiro_lancamentos_updated_at ON financeiro_lancamentos;
DROP TRIGGER IF EXISTS trigger_update_financeiro_titulos_updated_at ON financeiro_titulos;
DROP TRIGGER IF EXISTS trigger_update_financeiro_regras_conciliacao_updated_at ON financeiro_regras_conciliacao;

-- Dropar funções (podem ser usadas por triggers)
DROP FUNCTION IF EXISTS validate_categoria_parent_org();
DROP FUNCTION IF EXISTS update_financeiro_updated_at();

-- Dropar tabelas (em ordem reversa de dependências)
DROP TABLE IF EXISTS financeiro_regras_conciliacao CASCADE;
DROP TABLE IF EXISTS financeiro_linhas_extrato CASCADE;
DROP TABLE IF EXISTS financeiro_titulos CASCADE;
DROP TABLE IF EXISTS financeiro_lancamentos_splits CASCADE;
DROP TABLE IF EXISTS financeiro_lancamentos CASCADE;
DROP TABLE IF EXISTS financeiro_contas_bancarias CASCADE;
DROP TABLE IF EXISTS financeiro_centro_custos CASCADE;
DROP TABLE IF EXISTS financeiro_categorias CASCADE;

-- ============================================================================
-- 1. CATEGORIAS (Plano de Contas)
-- ============================================================================

CREATE TABLE financeiro_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Hierarquia
  codigo TEXT NOT NULL, -- Ex: "1.1.2"
  nome TEXT NOT NULL,
  descricao TEXT,
  parent_id UUID REFERENCES financeiro_categorias(id) ON DELETE CASCADE,
  nivel INTEGER NOT NULL CHECK (nivel BETWEEN 1 AND 5), -- Máximo 5 níveis
  
  -- Classificação
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa', 'transferencia')),
  natureza TEXT NOT NULL CHECK (natureza IN ('devedora', 'credora')),
  
  -- Mapeamento DRE/IFRS
  mapeamento_dre TEXT, -- Ex: "Receita Operacional"
  mapeamento_ifrs TEXT, -- Ex: "Revenue"
  
  -- Status
  ativo BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  -- Constraints
  CONSTRAINT unique_codigo_org UNIQUE (organization_id, codigo)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_financeiro_categorias_org ON financeiro_categorias(organization_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_categorias_parent ON financeiro_categorias(parent_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_categorias_tipo ON financeiro_categorias(tipo);
CREATE INDEX IF NOT EXISTS idx_financeiro_categorias_codigo ON financeiro_categorias(organization_id, codigo);

-- ============================================================================
-- 2. CENTRO DE CUSTOS
-- ============================================================================

CREATE TABLE financeiro_centro_custos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('propriedade', 'projeto', 'departamento', 'outro')),
  
  -- Relacionamento com propriedade (se tipo = 'propriedade')
  property_id TEXT REFERENCES properties(id) ON DELETE SET NULL,
  
  -- Orçamento
  orcamento_anual NUMERIC(15, 2),
  orcamento_mensal NUMERIC(15, 2),
  
  -- Status
  ativo BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  -- Constraints
  CONSTRAINT unique_codigo_org_centro_custos UNIQUE (organization_id, codigo)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_financeiro_centro_custos_org ON financeiro_centro_custos(organization_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_centro_custos_property ON financeiro_centro_custos(property_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_centro_custos_tipo ON financeiro_centro_custos(tipo);

-- ============================================================================
-- 3. CONTAS BANCÁRIAS
-- ============================================================================

CREATE TABLE financeiro_contas_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  nome TEXT NOT NULL,
  banco TEXT,
  agencia TEXT,
  numero TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('corrente', 'poupanca', 'investimento')),
  moeda TEXT NOT NULL DEFAULT 'BRL' CHECK (moeda IN ('BRL', 'USD', 'EUR')),
  
  -- Saldos
  saldo_inicial NUMERIC(15, 2) NOT NULL DEFAULT 0,
  saldo_atual NUMERIC(15, 2) NOT NULL DEFAULT 0,
  
  -- Open Finance
  status_feed TEXT CHECK (status_feed IN ('conectado', 'desconectado', 'erro', 'expirado')),
  ultima_sincronizacao TIMESTAMPTZ,
  consentimento_id TEXT,
  consentimento_validade TIMESTAMPTZ,
  
  -- Status
  ativo BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_financeiro_contas_bancarias_org ON financeiro_contas_bancarias(organization_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_contas_bancarias_ativo ON financeiro_contas_bancarias(ativo);

-- ============================================================================
-- 4. LANÇAMENTOS CONTÁBEIS
-- ============================================================================

CREATE TABLE financeiro_lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Tipo e datas
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'transferencia')),
  data DATE NOT NULL, -- Data de caixa (quando dinheiro entrou/saiu)
  competencia DATE NOT NULL, -- Data de competência (quando receita/despesa foi gerada)
  
  -- Valores
  valor NUMERIC(15, 2) NOT NULL CHECK (valor > 0),
  moeda TEXT NOT NULL DEFAULT 'BRL' CHECK (moeda IN ('BRL', 'USD', 'EUR')),
  valor_convertido NUMERIC(15, 2), -- Valor convertido para moeda base da organização
  
  -- Descrição
  descricao TEXT NOT NULL,
  documento TEXT, -- Número do documento (ex: REC-2025-001)
  nota_fiscal TEXT, -- Chave de acesso NF-e/NFS-e
  
  -- Relacionamentos
  categoria_id UUID REFERENCES financeiro_categorias(id) ON DELETE RESTRICT,
  conta_id UUID NOT NULL REFERENCES financeiro_contas_bancarias(id) ON DELETE RESTRICT,
  centro_custo_id UUID REFERENCES financeiro_centro_custos(id) ON DELETE SET NULL,
  property_id TEXT REFERENCES properties(id) ON DELETE SET NULL,
  
  -- Transferência (se tipo = 'transferencia')
  conta_origem_id UUID REFERENCES financeiro_contas_bancarias(id) ON DELETE RESTRICT,
  conta_destino_id UUID REFERENCES financeiro_contas_bancarias(id) ON DELETE RESTRICT,
  
  -- Split/Rateio
  has_split BOOLEAN NOT NULL DEFAULT false,
  
  -- Conciliação
  conciliado BOOLEAN NOT NULL DEFAULT false,
  linha_extrato_id UUID, -- Referência à linha do extrato (será criada depois)
  
  -- Observações
  observacoes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  -- Constraints
  CONSTRAINT check_transferencia_contas CHECK (
    (tipo = 'transferencia' AND conta_origem_id IS NOT NULL AND conta_destino_id IS NOT NULL) OR
    (tipo != 'transferencia' AND conta_origem_id IS NULL AND conta_destino_id IS NULL)
  ),
  CONSTRAINT check_categoria_required CHECK (
    (tipo != 'transferencia' AND categoria_id IS NOT NULL) OR
    (tipo = 'transferencia')
  )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_financeiro_lancamentos_org ON financeiro_lancamentos(organization_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_lancamentos_data ON financeiro_lancamentos(data DESC);
CREATE INDEX IF NOT EXISTS idx_financeiro_lancamentos_competencia ON financeiro_lancamentos(competencia DESC);
CREATE INDEX IF NOT EXISTS idx_financeiro_lancamentos_tipo ON financeiro_lancamentos(tipo);
CREATE INDEX IF NOT EXISTS idx_financeiro_lancamentos_categoria ON financeiro_lancamentos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_lancamentos_conta ON financeiro_lancamentos(conta_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_lancamentos_centro_custo ON financeiro_lancamentos(centro_custo_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_lancamentos_conciliado ON financeiro_lancamentos(conciliado);
CREATE INDEX IF NOT EXISTS idx_financeiro_lancamentos_property ON financeiro_lancamentos(property_id);

-- Índice composto para queries comuns
CREATE INDEX IF NOT EXISTS idx_financeiro_lancamentos_org_data ON financeiro_lancamentos(organization_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_financeiro_lancamentos_org_competencia ON financeiro_lancamentos(organization_id, competencia DESC);

-- ============================================================================
-- 5. SPLIT DE LANÇAMENTOS (Rateio)
-- ============================================================================

CREATE TABLE financeiro_lancamentos_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id UUID NOT NULL REFERENCES financeiro_lancamentos(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Destino do split
  tipo_split TEXT NOT NULL CHECK (tipo_split IN ('percentual', 'valor_fixo')),
  valor_percentual NUMERIC(5, 2), -- 0.00 a 100.00
  valor_fixo NUMERIC(15, 2), -- Valor fixo em centavos
  
  -- Destino
  categoria_id UUID REFERENCES financeiro_categorias(id) ON DELETE RESTRICT,
  conta_id UUID REFERENCES financeiro_contas_bancarias(id) ON DELETE RESTRICT,
  centro_custo_id UUID REFERENCES financeiro_centro_custos(id) ON DELETE SET NULL,
  
  -- Observações
  observacoes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_split_valor CHECK (
    (tipo_split = 'percentual' AND valor_percentual IS NOT NULL AND valor_fixo IS NULL) OR
    (tipo_split = 'valor_fixo' AND valor_fixo IS NOT NULL AND valor_percentual IS NULL)
  )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_financeiro_lancamentos_splits_lancamento ON financeiro_lancamentos_splits(lancamento_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_lancamentos_splits_org ON financeiro_lancamentos_splits(organization_id);

-- ============================================================================
-- 6. TÍTULOS A RECEBER/PAGAR
-- ============================================================================

CREATE TABLE financeiro_titulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Tipo
  tipo TEXT NOT NULL CHECK (tipo IN ('receber', 'pagar')),
  
  -- Identificação
  numero TEXT NOT NULL, -- Ex: "TIT-2025-001"
  descricao TEXT NOT NULL,
  
  -- Valores
  valor_original NUMERIC(15, 2) NOT NULL CHECK (valor_original > 0),
  valor_pago NUMERIC(15, 2) NOT NULL DEFAULT 0,
  valor_restante NUMERIC(15, 2) NOT NULL, -- Calculado: valor_original - valor_pago
  moeda TEXT NOT NULL DEFAULT 'BRL' CHECK (moeda IN ('BRL', 'USD', 'EUR')),
  
  -- Datas
  emissao DATE NOT NULL,
  vencimento DATE NOT NULL,
  pagamento DATE, -- Data efetiva de pagamento
  
  -- Relacionamentos
  categoria_id UUID REFERENCES financeiro_categorias(id) ON DELETE RESTRICT,
  conta_id UUID REFERENCES financeiro_contas_bancarias(id) ON DELETE RESTRICT,
  centro_custo_id UUID REFERENCES financeiro_centro_custos(id) ON DELETE SET NULL,
  property_id TEXT REFERENCES properties(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL, -- Para títulos de reservas
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL, -- Para títulos de reservas
  
  -- Status
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'pago', 'vencido', 'cancelado', 'parcial')),
  
  -- Juros e Multa
  taxa_juros_mensal NUMERIC(5, 2) DEFAULT 1.00, -- 1% ao mês
  taxa_multa NUMERIC(5, 2) DEFAULT 2.00, -- 2% sobre o valor
  juros_calculado NUMERIC(15, 2) DEFAULT 0,
  multa_calculada NUMERIC(15, 2) DEFAULT 0,
  
  -- Desconto
  desconto_antecipacao NUMERIC(15, 2) DEFAULT 0,
  
  -- Recorrência
  recorrente BOOLEAN NOT NULL DEFAULT false,
  frequencia TEXT CHECK (frequencia IN ('mensal', 'trimestral', 'semestral', 'anual')),
  proxima_parcela DATE,
  total_parcelas INTEGER,
  parcela_atual INTEGER,
  titulo_pai_id UUID REFERENCES financeiro_titulos(id) ON DELETE CASCADE, -- Para parcelas
  
  -- Cobrança
  enviar_cobranca BOOLEAN NOT NULL DEFAULT false,
  ultima_cobranca TIMESTAMPTZ,
  proxima_cobranca DATE,
  
  -- Observações
  observacoes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  -- Constraints
  CONSTRAINT check_valor_restante CHECK (valor_restante >= 0),
  CONSTRAINT check_valor_pago CHECK (valor_pago <= valor_original),
  CONSTRAINT check_status_pago CHECK (
    (status = 'pago' AND pagamento IS NOT NULL) OR
    (status != 'pago')
  )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_financeiro_titulos_org ON financeiro_titulos(organization_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_titulos_tipo ON financeiro_titulos(tipo);
CREATE INDEX IF NOT EXISTS idx_financeiro_titulos_status ON financeiro_titulos(status);
CREATE INDEX IF NOT EXISTS idx_financeiro_titulos_vencimento ON financeiro_titulos(vencimento);
CREATE INDEX IF NOT EXISTS idx_financeiro_titulos_reservation ON financeiro_titulos(reservation_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_titulos_guest ON financeiro_titulos(guest_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_titulos_pai ON financeiro_titulos(titulo_pai_id);

-- Índice composto para queries comuns
CREATE INDEX IF NOT EXISTS idx_financeiro_titulos_org_tipo_status ON financeiro_titulos(organization_id, tipo, status);
CREATE INDEX IF NOT EXISTS idx_financeiro_titulos_org_vencimento ON financeiro_titulos(organization_id, vencimento);

-- ============================================================================
-- 7. LINHAS DE EXTRATO BANCÁRIO
-- ============================================================================

CREATE TABLE financeiro_linhas_extrato (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conta_id UUID NOT NULL REFERENCES financeiro_contas_bancarias(id) ON DELETE CASCADE,
  
  -- Dados da transação
  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(15, 2) NOT NULL,
  moeda TEXT NOT NULL DEFAULT 'BRL' CHECK (moeda IN ('BRL', 'USD', 'EUR')),
  tipo TEXT NOT NULL CHECK (tipo IN ('debito', 'credito')),
  
  -- Referências
  ref TEXT, -- Referência interna
  ref_banco TEXT, -- Referência do banco
  hash_unico TEXT NOT NULL UNIQUE, -- Hash para deduplicação
  
  -- Origem
  origem TEXT NOT NULL CHECK (origem IN ('ofx', 'csv', 'open_finance', 'manual')),
  
  -- Conciliação
  conciliado BOOLEAN NOT NULL DEFAULT false,
  lancamento_id UUID REFERENCES financeiro_lancamentos(id) ON DELETE SET NULL,
  
  -- Machine Learning
  confianca_ml NUMERIC(5, 2), -- 0.00 a 100.00
  sugestao_categoria_id UUID REFERENCES financeiro_categorias(id) ON DELETE SET NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_hash_extrato UNIQUE (hash_unico)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_financeiro_linhas_extrato_org ON financeiro_linhas_extrato(organization_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_linhas_extrato_conta ON financeiro_linhas_extrato(conta_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_linhas_extrato_data ON financeiro_linhas_extrato(data DESC);
CREATE INDEX IF NOT EXISTS idx_financeiro_linhas_extrato_conciliado ON financeiro_linhas_extrato(conciliado);
CREATE INDEX IF NOT EXISTS idx_financeiro_linhas_extrato_lancamento ON financeiro_linhas_extrato(lancamento_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_linhas_extrato_hash ON financeiro_linhas_extrato(hash_unico);

-- Índice composto
CREATE INDEX IF NOT EXISTS idx_financeiro_linhas_extrato_conta_data ON financeiro_linhas_extrato(conta_id, data DESC);

-- ============================================================================
-- 8. REGRAS DE CONCILIAÇÃO
-- ============================================================================

CREATE TABLE financeiro_regras_conciliacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  prioridade INTEGER NOT NULL DEFAULT 50 CHECK (prioridade BETWEEN 0 AND 100),
  
  -- Condições
  padrao_operador TEXT NOT NULL CHECK (padrao_operador IN ('contains', 'equals', 'regex')),
  padrao_termo TEXT NOT NULL,
  
  valor_operador TEXT CHECK (valor_operador IN ('eq', 'gte', 'lte', 'between')),
  valor_a NUMERIC(15, 2),
  valor_b NUMERIC(15, 2),
  
  tipo_lancamento TEXT CHECK (tipo_lancamento IN ('entrada', 'saida', 'transferencia')),
  
  -- Ações
  categoria_id UUID REFERENCES financeiro_categorias(id) ON DELETE RESTRICT,
  conta_contrapartida_id UUID REFERENCES financeiro_contas_bancarias(id) ON DELETE RESTRICT,
  centro_custo_id UUID REFERENCES financeiro_centro_custos(id) ON DELETE SET NULL,
  acao TEXT NOT NULL CHECK (acao IN ('sugerir', 'auto_conciliar', 'auto_criar')),
  
  -- Estatísticas
  aplicacoes INTEGER NOT NULL DEFAULT 0,
  ultima_aplicacao TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_financeiro_regras_conciliacao_org ON financeiro_regras_conciliacao(organization_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_regras_conciliacao_ativo ON financeiro_regras_conciliacao(ativo);
CREATE INDEX IF NOT EXISTS idx_financeiro_regras_conciliacao_prioridade ON financeiro_regras_conciliacao(prioridade DESC);

-- ============================================================================
-- FUNÇÕES
-- ============================================================================

-- Função genérica para updated_at
CREATE OR REPLACE FUNCTION update_financeiro_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para validar que parent_id pertence à mesma organização
CREATE OR REPLACE FUNCTION validate_categoria_parent_org()
RETURNS TRIGGER AS $$
BEGIN
  -- Se parent_id é NULL, permitir (categoria raiz)
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Verificar se parent_id existe e pertence à mesma organização
  IF NOT EXISTS (
    SELECT 1 FROM financeiro_categorias p 
    WHERE p.id = NEW.parent_id 
    AND p.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'parent_id deve pertencer à mesma organização';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS: Atualizar updated_at automaticamente
-- ============================================================================

-- Aplicar trigger em todas as tabelas com updated_at
CREATE TRIGGER trigger_update_financeiro_categorias_updated_at
  BEFORE UPDATE ON financeiro_categorias
  FOR EACH ROW
  EXECUTE FUNCTION update_financeiro_updated_at();

CREATE TRIGGER trigger_update_financeiro_centro_custos_updated_at
  BEFORE UPDATE ON financeiro_centro_custos
  FOR EACH ROW
  EXECUTE FUNCTION update_financeiro_updated_at();

CREATE TRIGGER trigger_update_financeiro_contas_bancarias_updated_at
  BEFORE UPDATE ON financeiro_contas_bancarias
  FOR EACH ROW
  EXECUTE FUNCTION update_financeiro_updated_at();

CREATE TRIGGER trigger_update_financeiro_lancamentos_updated_at
  BEFORE UPDATE ON financeiro_lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_financeiro_updated_at();

CREATE TRIGGER trigger_update_financeiro_titulos_updated_at
  BEFORE UPDATE ON financeiro_titulos
  FOR EACH ROW
  EXECUTE FUNCTION update_financeiro_updated_at();

CREATE TRIGGER trigger_update_financeiro_regras_conciliacao_updated_at
  BEFORE UPDATE ON financeiro_regras_conciliacao
  FOR EACH ROW
  EXECUTE FUNCTION update_financeiro_updated_at();

-- ============================================================================
-- TRIGGER: Validar parent_id na mesma organização
-- ============================================================================

CREATE TRIGGER trigger_validate_categoria_parent_org
  BEFORE INSERT OR UPDATE ON financeiro_categorias
  FOR EACH ROW
  EXECUTE FUNCTION validate_categoria_parent_org();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE financeiro_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_centro_custos ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_contas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_lancamentos_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_titulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_linhas_extrato ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_regras_conciliacao ENABLE ROW LEVEL SECURITY;

-- Policy: Permitir todas operações via service role (Edge Functions)
-- As Edge Functions usam service role, então precisam de acesso total

-- Categorias
DROP POLICY IF EXISTS "Allow all operations via service role" ON financeiro_categorias;
CREATE POLICY "Allow all operations via service role" 
  ON financeiro_categorias
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Centro de Custos
DROP POLICY IF EXISTS "Allow all operations via service role" ON financeiro_centro_custos;
CREATE POLICY "Allow all operations via service role" 
  ON financeiro_centro_custos
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Contas Bancárias
DROP POLICY IF EXISTS "Allow all operations via service role" ON financeiro_contas_bancarias;
CREATE POLICY "Allow all operations via service role" 
  ON financeiro_contas_bancarias
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Lançamentos
DROP POLICY IF EXISTS "Allow all operations via service role" ON financeiro_lancamentos;
CREATE POLICY "Allow all operations via service role" 
  ON financeiro_lancamentos
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Splits
DROP POLICY IF EXISTS "Allow all operations via service role" ON financeiro_lancamentos_splits;
CREATE POLICY "Allow all operations via service role" 
  ON financeiro_lancamentos_splits
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Títulos
DROP POLICY IF EXISTS "Allow all operations via service role" ON financeiro_titulos;
CREATE POLICY "Allow all operations via service role" 
  ON financeiro_titulos
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Linhas de Extrato
DROP POLICY IF EXISTS "Allow all operations via service role" ON financeiro_linhas_extrato;
CREATE POLICY "Allow all operations via service role" 
  ON financeiro_linhas_extrato
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Regras de Conciliação
DROP POLICY IF EXISTS "Allow all operations via service role" ON financeiro_regras_conciliacao;
CREATE POLICY "Allow all operations via service role" 
  ON financeiro_regras_conciliacao
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- COMENTÁRIOS NAS TABELAS (Documentação)
-- ============================================================================

COMMENT ON TABLE financeiro_categorias IS 'Plano de contas hierárquico (até 5 níveis)';
COMMENT ON TABLE financeiro_centro_custos IS 'Centros de custo por propriedade/projeto/departamento';
COMMENT ON TABLE financeiro_contas_bancarias IS 'Contas bancárias da organização';
COMMENT ON TABLE financeiro_lancamentos IS 'Lançamentos contábeis (entrada/saída/transferência)';
COMMENT ON TABLE financeiro_lancamentos_splits IS 'Rateio de lançamentos (split)';
COMMENT ON TABLE financeiro_titulos IS 'Títulos a receber e a pagar';
COMMENT ON TABLE financeiro_linhas_extrato IS 'Linhas de extrato bancário importadas';
COMMENT ON TABLE financeiro_regras_conciliacao IS 'Regras automáticas de conciliação bancária';

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
-- Ensure guests table exists (finance references)
CREATE TABLE IF NOT EXISTS public.guests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text,
    email text,
    phone text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'guests' AND policyname = 'allow_all_guests_finance'
    ) THEN
        CREATE POLICY allow_all_guests_finance ON public.guests
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_guests_finance'
    ) THEN
        CREATE TRIGGER set_updated_at_guests_finance
        BEFORE UPDATE ON public.guests
        FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
    END IF;
END $$;
