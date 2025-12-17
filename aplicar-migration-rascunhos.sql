-- ============================================================================
-- APLICAR MIGRATION DE RASCUNHOS (SE NECESSÁRIO)
-- ============================================================================
-- Execute este script se as colunas wizard_data não existirem
-- ============================================================================

-- Verificar e criar coluna status se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'status'
  ) THEN
    ALTER TABLE properties 
      ADD COLUMN status TEXT DEFAULT 'active' 
      CHECK (status IN ('draft', 'active', 'inactive', 'maintenance'));
    
    RAISE NOTICE '✅ Coluna status criada';
  ELSE
    RAISE NOTICE 'ℹ️ Coluna status já existe';
  END IF;
END $$;

-- Verificar e criar coluna wizard_data se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'wizard_data'
  ) THEN
    ALTER TABLE properties 
      ADD COLUMN wizard_data JSONB DEFAULT '{}'::jsonb;
    
    CREATE INDEX IF NOT EXISTS idx_properties_wizard_data ON properties USING GIN(wizard_data);
    
    RAISE NOTICE '✅ Coluna wizard_data criada';
  ELSE
    RAISE NOTICE 'ℹ️ Coluna wizard_data já existe';
  END IF;
END $$;

-- Verificar e criar coluna completion_percentage se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'completion_percentage'
  ) THEN
    ALTER TABLE properties 
      ADD COLUMN completion_percentage INTEGER DEFAULT 0 
      CHECK (completion_percentage >= 0 AND completion_percentage <= 100);
    
    RAISE NOTICE '✅ Coluna completion_percentage criada';
  ELSE
    RAISE NOTICE 'ℹ️ Coluna completion_percentage já existe';
  END IF;
END $$;

-- Verificar e criar coluna completed_steps se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'completed_steps'
  ) THEN
    ALTER TABLE properties 
      ADD COLUMN completed_steps TEXT[] DEFAULT ARRAY[]::TEXT[];
    
    RAISE NOTICE '✅ Coluna completed_steps criada';
  ELSE
    RAISE NOTICE 'ℹ️ Coluna completed_steps já existe';
  END IF;
END $$;

-- Verificar resultado
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'status') 
    THEN '✅ status existe' 
    ELSE '❌ status NÃO existe' 
  END as status_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'wizard_data') 
    THEN '✅ wizard_data existe' 
    ELSE '❌ wizard_data NÃO existe' 
  END as wizard_data_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'completion_percentage') 
    THEN '✅ completion_percentage existe' 
    ELSE '❌ completion_percentage NÃO existe' 
  END as completion_percentage_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'completed_steps') 
    THEN '✅ completed_steps existe' 
    ELSE '❌ completed_steps NÃO existe' 
  END as completed_steps_check;
