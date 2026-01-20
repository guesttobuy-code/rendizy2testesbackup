-- ============================================================================
-- REMOVER DUPLICATAS DO PLANO DE CONTAS
-- ============================================================================
-- Este script remove categorias duplicadas mantendo apenas a mais recente
-- Baseado em: codigo + organization_id (deve ser único)
-- ============================================================================

-- 1. Verificar quantas duplicatas existem ANTES da limpeza
SELECT 
  codigo,
  organization_id,
  COUNT(*) as total_duplicatas
FROM financeiro_categorias
WHERE ativo = true
GROUP BY codigo, organization_id
HAVING COUNT(*) > 1
ORDER BY total_duplicatas DESC;

-- 2. Remover duplicatas mantendo apenas a mais recente (maior created_at)
-- Para cada grupo de duplicatas, mantém apenas o registro com maior created_at
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

-- 3. Verificar se ainda há duplicatas APÓS a limpeza
SELECT 
  codigo,
  organization_id,
  COUNT(*) as total
FROM financeiro_categorias
WHERE ativo = true
GROUP BY codigo, organization_id
HAVING COUNT(*) > 1;

-- 4. Remover constraint antiga se existir (para recriar)
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

-- 5. Adicionar constraint UNIQUE para evitar duplicatas futuras
ALTER TABLE financeiro_categorias
ADD CONSTRAINT financeiro_categorias_codigo_organization_unique
UNIQUE (codigo, organization_id);

-- 6. Verificar total de categorias após limpeza
SELECT 
  organization_id,
  COUNT(*) as total_categorias
FROM financeiro_categorias
WHERE ativo = true
GROUP BY organization_id
ORDER BY total_categorias DESC;

