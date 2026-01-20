-- ============================================================================
-- REMOVER DUPLICATAS DE CATEGORIAS - ORGANIZAÇÃO RENDIZY (MASTER)
-- ============================================================================
-- Este script remove duplicatas de categorias especificamente da organização Rendizy
-- Mantém apenas a categoria mais recente para cada código
-- ============================================================================

-- UUID da organização Rendizy (master)
-- 00000000-0000-0000-0000-000000000000

-- ============================================================================
-- PASSO 1: Verificar quantas categorias existem na organização Rendizy
-- ============================================================================

SELECT 
  'Total de categorias na organização Rendizy' AS descricao,
  COUNT(*) AS total
FROM financeiro_categorias
WHERE organization_id = '00000000-0000-0000-0000-000000000000';

-- ============================================================================
-- PASSO 2: Identificar duplicatas por código
-- ============================================================================

SELECT 
  codigo,
  COUNT(*) AS quantidade,
  array_agg(id ORDER BY created_at DESC) AS ids,
  array_agg(created_at ORDER BY created_at DESC) AS datas_criacao
FROM financeiro_categorias
WHERE organization_id = '00000000-0000-0000-0000-000000000000'
GROUP BY codigo
HAVING COUNT(*) > 1
ORDER BY quantidade DESC, codigo;

-- ============================================================================
-- PASSO 3: Remover duplicatas (manter apenas a mais recente)
-- ============================================================================

-- Deletar categorias duplicadas, mantendo apenas a mais recente de cada código
DELETE FROM financeiro_categorias
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY codigo, organization_id 
        ORDER BY created_at DESC, id DESC
      ) AS rn
    FROM financeiro_categorias
    WHERE organization_id = '00000000-0000-0000-0000-000000000000'
  ) AS ranked
  WHERE rn > 1
);

-- ============================================================================
-- PASSO 4: Verificar resultado final
-- ============================================================================

SELECT 
  'Categorias únicas após remoção' AS descricao,
  COUNT(*) AS total,
  COUNT(DISTINCT codigo) AS codigos_unicos
FROM financeiro_categorias
WHERE organization_id = '00000000-0000-0000-0000-000000000000';

-- ============================================================================
-- PASSO 5: Verificar se ainda há duplicatas
-- ============================================================================

SELECT 
  codigo,
  COUNT(*) AS quantidade
FROM financeiro_categorias
WHERE organization_id = '00000000-0000-0000-0000-000000000000'
GROUP BY codigo
HAVING COUNT(*) > 1;

-- Se este SELECT retornar 0 linhas, não há mais duplicatas!

