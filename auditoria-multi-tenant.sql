-- ============================================================================
-- AUDITORIA MULTI-TENANT - Verificar dados por organização
-- ============================================================================
-- Este script verifica quantos registros existem por organização
-- e identifica dados órfãos (sem organization_id ou com organization_id inválido)
-- ============================================================================

-- 1. Verificar categorias por organização
SELECT 
  organization_id,
  COUNT(*) as total_categorias,
  COUNT(CASE WHEN tipo = 'receita' THEN 1 END) as receitas,
  COUNT(CASE WHEN tipo = 'despesa' THEN 1 END) as despesas,
  COUNT(CASE WHEN ativo = true THEN 1 END) as ativas
FROM financeiro_categorias
GROUP BY organization_id
ORDER BY total_categorias DESC;

-- 2. Verificar se há categorias sem organization_id
SELECT 
  COUNT(*) as categorias_sem_org,
  COUNT(DISTINCT codigo) as codigos_unicos
FROM financeiro_categorias
WHERE organization_id IS NULL;

-- 3. Verificar outras tabelas financeiras
SELECT 
  'financeiro_lancamentos' as tabela,
  organization_id,
  COUNT(*) as total
FROM financeiro_lancamentos
GROUP BY organization_id
UNION ALL
SELECT 
  'financeiro_titulos' as tabela,
  organization_id,
  COUNT(*) as total
FROM financeiro_titulos
GROUP BY organization_id
UNION ALL
SELECT 
  'financeiro_contas_bancarias' as tabela,
  organization_id,
  COUNT(*) as total
FROM financeiro_contas_bancarias
GROUP BY organization_id
UNION ALL
SELECT 
  'financeiro_centro_custos' as tabela,
  organization_id,
  COUNT(*) as total
FROM financeiro_centro_custos
GROUP BY organization_id
ORDER BY tabela, organization_id;

-- 4. Verificar reservas por organização
SELECT 
  organization_id,
  COUNT(*) as total_reservas
FROM reservations
GROUP BY organization_id
ORDER BY total_reservas DESC;

-- 5. Verificar propriedades por organização
SELECT 
  organization_id,
  COUNT(*) as total_propriedades
FROM properties
GROUP BY organization_id
ORDER BY total_propriedades DESC;

-- 6. Verificar hóspedes por organização
SELECT 
  organization_id,
  COUNT(*) as total_hospedes
FROM guests
GROUP BY organization_id
ORDER BY total_hospedes DESC;

-- 7. Verificar organização Rendizy (master) - deve ter ~84-98 categorias
SELECT 
  COUNT(*) as total_categorias_rendizy
FROM financeiro_categorias
WHERE organization_id = '00000000-0000-0000-0000-000000000000'
  AND ativo = true;

-- 8. Listar todas as organizações e seus totais
SELECT 
  o.id,
  o.name,
  o.slug,
  (SELECT COUNT(*) FROM financeiro_categorias WHERE organization_id = o.id AND ativo = true) as categorias,
  (SELECT COUNT(*) FROM reservations WHERE organization_id = o.id) as reservas,
  (SELECT COUNT(*) FROM properties WHERE organization_id = o.id) as propriedades,
  (SELECT COUNT(*) FROM guests WHERE organization_id = o.id) as hospedes
FROM organizations o
ORDER BY o.name;

