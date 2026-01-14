-- ============================================================================
-- MIGRATION: Sistema de Registro Automático de Campos Financeiros
-- Data: 2025-11-26
-- Versão: v1.0.103.1500
-- 
-- OBJETIVO:
-- Criar sistema que permite que qualquer módulo registre campos financeiros
-- automaticamente, fazendo-os aparecer na tela de mapeamento de campos x contas
-- 
-- CASOS DE USO:
-- - Comissão do Airbnb (quando módulo de integração for criado)
-- - Taxa de plataforma de pagamento
-- - Taxas fixas de qualquer módulo
-- ============================================================================

-- ============================================================================
-- PASSO 1: Adicionar coluna para identificar campos do sistema vs mapeamentos
-- ============================================================================

-- Adicionar coluna para identificar se é um campo do sistema (deve aparecer sempre)
-- ou um mapeamento customizado
ALTER TABLE financeiro_campo_plano_contas_mapping
ADD COLUMN IF NOT EXISTS is_system_field BOOLEAN DEFAULT false;

-- Adicionar coluna para identificar o módulo que registrou o campo
ALTER TABLE financeiro_campo_plano_contas_mapping
ADD COLUMN IF NOT EXISTS registered_by_module TEXT;

-- Adicionar coluna para indicar se o campo é obrigatório (deve ter mapeamento)
ALTER TABLE financeiro_campo_plano_contas_mapping
ADD COLUMN IF NOT EXISTS obrigatorio BOOLEAN DEFAULT false;

-- Comentários
COMMENT ON COLUMN financeiro_campo_plano_contas_mapping.is_system_field IS 'Indica se é um campo do sistema que deve aparecer sempre na interface';
COMMENT ON COLUMN financeiro_campo_plano_contas_mapping.registered_by_module IS 'Módulo que registrou este campo (ex: integracoes.airbnb, pagamentos.stripe)';
COMMENT ON COLUMN financeiro_campo_plano_contas_mapping.obrigatorio IS 'Se true, o campo DEVE ter um mapeamento para conta do plano de contas';

-- ============================================================================
-- PASSO 2: Marcar campos existentes como campos do sistema
-- ============================================================================

-- Marcar todos os campos criados pela migration inicial como campos do sistema
UPDATE financeiro_campo_plano_contas_mapping
SET is_system_field = true,
    registered_by_module = 'sistema.reservas',
    obrigatorio = false
WHERE modulo = 'reservas'
  AND campo_codigo IN (
    'pricing.baseTotal',
    'pricing.pricePerNight',
    'pricing.cleaningFee',
    'pricing.serviceFee',
    'pricing.taxes',
    'pricing.discount'
  );

-- ============================================================================
-- PASSO 3: Criar função para registrar campo financeiro automaticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION registrar_campo_financeiro(
  p_organization_id UUID,
  p_modulo TEXT,
  p_campo_codigo TEXT,
  p_campo_nome TEXT,
  p_campo_tipo TEXT,
  p_descricao TEXT DEFAULT NULL,
  p_registered_by_module TEXT DEFAULT NULL,
  p_obrigatorio BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_campo_id UUID;
BEGIN
  -- Verificar se campo já existe
  SELECT id INTO v_campo_id
  FROM financeiro_campo_plano_contas_mapping
  WHERE organization_id = p_organization_id
    AND modulo = p_modulo
    AND campo_codigo = p_campo_codigo;
  
  IF v_campo_id IS NOT NULL THEN
    -- Atualizar campo existente
    UPDATE financeiro_campo_plano_contas_mapping
    SET campo_nome = p_campo_nome,
        campo_tipo = p_campo_tipo,
        descricao = COALESCE(p_descricao, descricao),
        is_system_field = true,
        registered_by_module = COALESCE(p_registered_by_module, registered_by_module),
        obrigatorio = p_obrigatorio,
        updated_at = NOW()
    WHERE id = v_campo_id;
    
    RETURN v_campo_id;
  ELSE
    -- Criar novo campo
    INSERT INTO financeiro_campo_plano_contas_mapping (
      organization_id,
      modulo,
      campo_codigo,
      campo_nome,
      campo_tipo,
      descricao,
      is_system_field,
      registered_by_module,
      obrigatorio,
      ativo,
      created_at,
      updated_at
    )
    VALUES (
      p_organization_id,
      p_modulo,
      p_campo_codigo,
      p_campo_nome,
      p_campo_tipo,
      p_descricao,
      true, -- Sempre é campo do sistema quando registrado via função
      p_registered_by_module,
      p_obrigatorio,
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_campo_id;
    
    RETURN v_campo_id;
  END IF;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION registrar_campo_financeiro IS 'Registra ou atualiza um campo financeiro do sistema. Se já existir, atualiza. Se não existir, cria.';

-- ============================================================================
-- PASSO 4: Criar função para registrar campos para TODAS as organizações
-- ============================================================================

CREATE OR REPLACE FUNCTION registrar_campo_financeiro_global(
  p_modulo TEXT,
  p_campo_codigo TEXT,
  p_campo_nome TEXT,
  p_campo_tipo TEXT,
  p_descricao TEXT DEFAULT NULL,
  p_registered_by_module TEXT DEFAULT NULL,
  p_obrigatorio BOOLEAN DEFAULT false
)
RETURNS TABLE(organization_id UUID, campo_id UUID, status TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  org_record RECORD;
  v_campo_id UUID;
BEGIN
  -- Para cada organização, registrar o campo
  FOR org_record IN SELECT id FROM organizations LOOP
    SELECT registrar_campo_financeiro(
      org_record.id,
      p_modulo,
      p_campo_codigo,
      p_campo_nome,
      p_campo_tipo,
      p_descricao,
      p_registered_by_module,
      p_obrigatorio
    ) INTO v_campo_id;
    
    organization_id := org_record.id;
    campo_id := v_campo_id;
    status := 'registrado';
    
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION registrar_campo_financeiro_global IS 'Registra um campo financeiro para TODAS as organizações do sistema. Útil para campos globais como taxas de plataformas.';

-- ============================================================================
-- PASSO 5: Exemplo de uso - Registrar campos de integração Airbnb
-- ============================================================================

-- Exemplo: Registrar comissão do Airbnb (quando módulo for criado)
-- SELECT registrar_campo_financeiro_global(
--   'integracoes',
--   'airbnb.comissao',
--   'Comissão do Airbnb',
--   'despesa',
--   'Comissão cobrada pelo Airbnb sobre cada reserva',
--   'integracoes.airbnb',
--   true -- Obrigatório ter mapeamento
-- );

-- ============================================================================
-- PASSO 6: Criar índice para busca rápida de campos do sistema
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_campo_mapping_system_field 
ON financeiro_campo_plano_contas_mapping(is_system_field) 
WHERE is_system_field = true;

CREATE INDEX IF NOT EXISTS idx_campo_mapping_registered_by 
ON financeiro_campo_plano_contas_mapping(registered_by_module) 
WHERE registered_by_module IS NOT NULL;

-- ============================================================================
-- LOG DE CONCLUSÃO
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 20241126_create_financial_fields_registry concluída';
  RAISE NOTICE '   - Colunas is_system_field, registered_by_module, obrigatorio adicionadas';
  RAISE NOTICE '   - Função registrar_campo_financeiro criada';
  RAISE NOTICE '   - Função registrar_campo_financeiro_global criada';
  RAISE NOTICE '   - Sistema pronto para registro automático de campos financeiros';
END $$;

