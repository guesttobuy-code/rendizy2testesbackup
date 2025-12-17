-- Migration: Sistema de Rascunho para Properties
-- Data: 02/12/2025
-- Descrição: Adiciona suporte a rascunhos com progresso e dados do wizard

-- 1. Adicionar campo status se não existir (aceitar 'draft')
DO $$
BEGIN
  -- Verificar se coluna status existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'status'
  ) THEN
    ALTER TABLE properties 
      ADD COLUMN status TEXT DEFAULT 'active' 
      CHECK (status IN ('draft', 'active', 'inactive', 'maintenance'));
    
    RAISE NOTICE '✅ Coluna status criada';
  ELSE
    -- Se existe, verificar se aceita 'draft'
    -- Se não aceitar, precisamos alterar o CHECK constraint
    RAISE NOTICE 'ℹ️ Coluna status já existe';
  END IF;
END $$;

-- 2. Adicionar campo wizard_data (JSONB) para salvar dados completos do wizard
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

-- 3. Adicionar campo completion_percentage (0-100)
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

-- 4. Adicionar campo completed_steps (array de step IDs)
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

-- 5. Atualizar constraint de status para incluir 'draft' se necessário
DO $$
BEGIN
  -- Tentar adicionar 'draft' ao CHECK constraint
  -- Se falhar, significa que já está incluído ou constraint não existe
  BEGIN
    ALTER TABLE properties 
      DROP CONSTRAINT IF EXISTS properties_status_check;
    
    ALTER TABLE properties 
      ADD CONSTRAINT properties_status_check 
      CHECK (status IN ('draft', 'active', 'inactive', 'maintenance'));
    
    RAISE NOTICE '✅ Constraint de status atualizado para incluir draft';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'ℹ️ Constraint de status: %', SQLERRM;
  END;
END $$;

-- Comentários para documentação
COMMENT ON COLUMN properties.status IS 'Status da propriedade: draft (rascunho), active (ativa), inactive (inativa), maintenance (manutenção)';
COMMENT ON COLUMN properties.wizard_data IS 'Dados completos do wizard preservados em JSONB para não perder informações';
COMMENT ON COLUMN properties.completion_percentage IS 'Percentual de conclusão do wizard (0-100)';
COMMENT ON COLUMN properties.completed_steps IS 'Array de IDs dos steps completados (ex: ["content-type", "content-location"])';
