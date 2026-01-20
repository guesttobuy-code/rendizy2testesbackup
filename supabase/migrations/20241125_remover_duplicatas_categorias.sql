-- ============================================================================
-- REMOVER DUPLICATAS DO PLANO DE CONTAS
-- ============================================================================
-- Migration para remover categorias duplicadas e adicionar constraint UNIQUE
-- ============================================================================

-- 1. Remover duplicatas mantendo apenas a mais recente (maior created_at)
WITH duplicatas AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY codigo, organization_id 
      ORDER BY created_at DESC
    ) as rn
  FROM financeiro_categorias
  WHERE ativo = true
)
DELETE FROM financeiro_categorias
WHERE id IN (
  SELECT id FROM duplicatas WHERE rn > 1
);

-- 2. Remover constraint antiga se existir (para recriar)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'financeiro_categorias_codigo_organization_unique'
  ) THEN
    ALTER TABLE financeiro_categorias
    DROP CONSTRAINT financeiro_categorias_codigo_organization_unique;
    
    RAISE NOTICE 'Constraint antiga removida';
  END IF;
END $$;

-- 3. Adicionar constraint UNIQUE para evitar duplicatas futuras
ALTER TABLE financeiro_categorias
ADD CONSTRAINT financeiro_categorias_codigo_organization_unique
UNIQUE (codigo, organization_id);

