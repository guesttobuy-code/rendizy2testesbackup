-- ============================================================================
-- SCRIPT: Executar Migration de Campos Financeiros
-- Execute este script no Supabase SQL Editor
-- ============================================================================

-- Verificar se a migration já foi executada
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'financeiro_campo_plano_contas_mapping' 
    AND column_name = 'is_system_field'
  ) THEN
    RAISE NOTICE '✅ Migration já foi executada. Colunas já existem.';
  ELSE
    RAISE NOTICE '📝 Executando migration...';
    
    -- PASSO 1: Adicionar colunas
    ALTER TABLE financeiro_campo_plano_contas_mapping
    ADD COLUMN IF NOT EXISTS is_system_field BOOLEAN DEFAULT false;

    ALTER TABLE financeiro_campo_plano_contas_mapping
    ADD COLUMN IF NOT EXISTS registered_by_module TEXT;

    ALTER TABLE financeiro_campo_plano_contas_mapping
    ADD COLUMN IF NOT EXISTS obrigatorio BOOLEAN DEFAULT false;

    -- Comentários
    COMMENT ON COLUMN financeiro_campo_plano_contas_mapping.is_system_field IS 'Indica se é um campo do sistema que deve aparecer sempre na interface';
    COMMENT ON COLUMN financeiro_campo_plano_contas_mapping.registered_by_module IS 'Módulo que registrou este campo (ex: integracoes.airbnb, pagamentos.stripe)';
    COMMENT ON COLUMN financeiro_campo_plano_contas_mapping.obrigatorio IS 'Se true, o campo DEVE ter um mapeamento para conta do plano de contas';

    RAISE NOTICE '✅ Colunas adicionadas com sucesso!';
  END IF;
END $$;

-- PASSO 2: Criar função para registrar campo financeiro
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

-- PASSO 3: Criar índices
CREATE INDEX IF NOT EXISTS idx_campo_mapping_system_field 
ON financeiro_campo_plano_contas_mapping(is_system_field) 
WHERE is_system_field = true;

CREATE INDEX IF NOT EXISTS idx_campo_mapping_registered_by 
ON financeiro_campo_plano_contas_mapping(registered_by_module) 
WHERE registered_by_module IS NOT NULL;

-- PASSO 4: Verificar resultado
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'financeiro_campo_plano_contas_mapping' 
    AND column_name = 'is_system_field'
  ) THEN
    RAISE NOTICE '✅ Migration executada com sucesso!';
    RAISE NOTICE '   - Colunas is_system_field, registered_by_module, obrigatorio criadas';
    RAISE NOTICE '   - Função registrar_campo_financeiro criada';
    RAISE NOTICE '   - Índices criados';
  ELSE
    RAISE EXCEPTION '❌ Erro ao executar migration';
  END IF;
END $$;








