-- Verificar se ainda há duplicatas
SELECT 
  codigo,
  organization_id,
  COUNT(*) as total
FROM financeiro_categorias
WHERE ativo = true
GROUP BY codigo, organization_id
HAVING COUNT(*) > 1
ORDER BY total DESC;

-- Verificar se a constraint UNIQUE foi criada
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conname = 'financeiro_categorias_codigo_organization_unique';

