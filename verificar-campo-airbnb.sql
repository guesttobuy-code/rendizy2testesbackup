-- ============================================================================
-- SCRIPT: Verificar se campo do Airbnb foi registrado
-- ============================================================================

-- 1. Verificar se as colunas da migration existem
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'financeiro_campo_plano_contas_mapping'
  AND column_name IN ('is_system_field', 'registered_by_module', 'obrigatorio')
ORDER BY column_name;

-- 2. Verificar se o campo do Airbnb foi registrado (com verificação de colunas)
DO $$
BEGIN
  -- Verificar se coluna is_system_field existe
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'financeiro_campo_plano_contas_mapping' 
    AND column_name = 'is_system_field'
  ) THEN
    RAISE NOTICE '✅ Coluna is_system_field existe';
    
    -- Buscar campo do Airbnb
    PERFORM 1 FROM financeiro_campo_plano_contas_mapping 
    WHERE campo_codigo = 'airbnb.comissao';
    
    IF FOUND THEN
      RAISE NOTICE '✅ Campo airbnb.comissao encontrado!';
    ELSE
      RAISE NOTICE '⚠️ Campo airbnb.comissao NÃO encontrado. Execute a migration primeiro.';
    END IF;
  ELSE
    RAISE NOTICE '❌ Coluna is_system_field NÃO existe. Execute a migration primeiro!';
    RAISE NOTICE '📝 Migration: supabase/migrations/20241126_create_financial_fields_registry.sql';
  END IF;
END $$;

-- 3. Verificar TODOS os campos registrados (sem usar colunas que podem não existir)
SELECT 
  modulo,
  campo_codigo,
  campo_nome,
  campo_tipo,
  categoria_id,
  ativo
FROM financeiro_campo_plano_contas_mapping
WHERE organization_id = '00000000-0000-0000-0000-000000000000' -- Rendizy master
ORDER BY modulo, campo_codigo;

-- 3. Verificar TODOS os campos registrados (para debug)
SELECT 
  modulo,
  campo_codigo,
  campo_nome,
  campo_tipo,
  is_system_field,
  registered_by_module,
  obrigatorio,
  ativo
FROM financeiro_campo_plano_contas_mapping
WHERE organization_id = '00000000-0000-0000-0000-000000000000' -- Rendizy master
ORDER BY modulo, campo_codigo;

-- 4. Verificar se a função SQL existe
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'registrar_campo_financeiro';

