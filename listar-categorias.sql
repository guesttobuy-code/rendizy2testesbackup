-- Listar todas as categorias do plano de contas
SELECT 
  id,
  codigo,
  nome,
  tipo,
  natureza,
  nivel,
  ativo,
  organization_id,
  created_at
FROM financeiro_categorias
ORDER BY codigo;

