-- ============================================================================
-- DIAGNÓSTICO COMPLETO: Por que rascunhos não estão salvando?
-- ============================================================================
-- Execute este script para identificar o problema
-- ============================================================================

-- 1. Verificar se tabela properties existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'properties')
    THEN '✅ Tabela properties existe'
    ELSE '❌ Tabela properties NÃO existe'
  END as tabela_status;

-- 2. Verificar RLS (Row Level Security)
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE tablename = 'properties';

-- 3. Verificar políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'properties';

-- 4. Verificar colunas obrigatórias (NOT NULL sem DEFAULT)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'properties'
  AND is_nullable = 'NO'
  AND column_default IS NULL
ORDER BY ordinal_position;

-- 5. Verificar constraints CHECK
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'properties'::regclass
  AND contype = 'c';

-- 6. Tentar inserir e capturar erro exato
DO $$
DECLARE
  v_id UUID;
  v_error TEXT;
BEGIN
  BEGIN
    INSERT INTO properties (
      id,
      organization_id,
      status,
      name,
      code,
      type,
      address_city,
      address_state,
      address_country,
      max_guests,
      pricing_base_price,
      pricing_currency,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      NULL,
      'draft',
      'Teste Diagnóstico',
      'TEST-DIAG-' || to_char(now(), 'YYYYMMDDHH24MISS'),
      'house',  -- ✅ Valor válido na constraint CHECK
      'Rio de Janeiro',
      'RJ',
      'BR',
      1,
      0,
      'BRL',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_id;
    
    RAISE NOTICE '✅ SUCESSO! Rascunho inserido com ID: %', v_id;
    
  EXCEPTION WHEN OTHERS THEN
    v_error := SQLERRM;
    RAISE NOTICE '❌ ERRO ao inserir: %', v_error;
    RAISE NOTICE '   SQLSTATE: %', SQLSTATE;
  END;
END $$;

-- 7. Verificar se inseriu
SELECT 
  id,
  organization_id,
  status,
  name,
  code,
  type,
  created_at
FROM properties
WHERE name = 'Teste Diagnóstico'
ORDER BY created_at DESC
LIMIT 1;
