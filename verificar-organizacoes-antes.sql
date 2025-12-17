-- ============================================================================
-- VERIFICAR ORGANIZAÇÕES ANTES DA LIMPEZA
-- ============================================================================
-- Execute este script ANTES de executar limpar-organizacoes-exceto-rendizy.sql
-- para ver o que será deletado
-- ============================================================================

-- 1. Listar todas as organizações
SELECT 
  id,
  name,
  slug,
  email,
  plan,
  status,
  created_at,
  (SELECT COUNT(*) FROM financeiro_categorias WHERE organization_id = o.id) as categorias,
  (SELECT COUNT(*) FROM reservations WHERE organization_id = o.id) as reservas,
  (SELECT COUNT(*) FROM properties WHERE organization_id = o.id) as propriedades,
  (SELECT COUNT(*) FROM guests WHERE organization_id = o.id) as hospedes,
  (SELECT COUNT(*) FROM users WHERE organization_id = o.id) as usuarios
FROM organizations o
ORDER BY 
  CASE WHEN id = '00000000-0000-0000-0000-000000000000' THEN 0 ELSE 1 END,
  name;

-- 2. Resumo por organização
SELECT 
  CASE 
    WHEN organization_id = '00000000-0000-0000-0000-000000000000' THEN '✅ RENDIZY (MASTER) - SERÁ PRESERVADA'
    ELSE '❌ OUTRA ORGANIZAÇÃO - SERÁ DELETADA'
  END as status,
  organization_id,
  COUNT(*) as total_registros
FROM (
  SELECT organization_id FROM financeiro_categorias
  UNION ALL
  SELECT organization_id FROM reservations
  UNION ALL
  SELECT organization_id FROM properties
  UNION ALL
  SELECT organization_id FROM guests
) AS all_data
GROUP BY organization_id
ORDER BY 
  CASE WHEN organization_id = '00000000-0000-0000-0000-000000000000' THEN 0 ELSE 1 END;

-- 3. Contar dados que serão deletados
SELECT 
  'financeiro_categorias' as tabela,
  COUNT(*) as registros_para_deletar
FROM financeiro_categorias
WHERE organization_id != '00000000-0000-0000-0000-000000000000'
  OR organization_id IS NULL
UNION ALL
SELECT 
  'reservations',
  COUNT(*)
FROM reservations
WHERE organization_id != '00000000-0000-0000-0000-000000000000'
  OR organization_id IS NULL
UNION ALL
SELECT 
  'properties',
  COUNT(*)
FROM properties
WHERE organization_id != '00000000-0000-0000-0000-000000000000'
  OR organization_id IS NULL
UNION ALL
SELECT 
  'guests',
  COUNT(*)
FROM guests
WHERE organization_id != '00000000-0000-0000-0000-000000000000'
  OR organization_id IS NULL;

