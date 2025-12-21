-- ════════════════════════════════════════════════════════════════
-- 🔍 CONSULTA 1: IDENTIFICAR DUPLICATAS
-- ════════════════════════════════════════════════════════════════
-- IDs dos anúncios de TESTE (com reservas/bloqueios) - MANTER
-- 3cabf06d-51c6-4e2b-b73e-520e018f1fce (teste 30 02)
-- 9f6cad48-42e9-4ed5-b766-82127a62dce2 (Dona Rosa Botafogo ap 01)

SELECT 
    title AS "Título",
    COUNT(*) AS "Quantidade",
    STRING_AGG(id::text, ', ') AS "IDs",
    STRING_AGG(
        CASE 
            WHEN id IN (
                '3cabf06d-51c6-4e2b-b73e-520e018f1fce',
                '9f6cad48-42e9-4ed5-b766-82127a62dce2'
            ) THEN '🎯 TESTE (MANTER)'
            WHEN data->>'migrated_from' = 'properties' THEN '📦 MIGRADO (REMOVER)'
            ELSE '❓ DESCONHECIDO'
        END,
        ', '
    ) AS "Tipo"
FROM anuncios_drafts
GROUP BY title
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- ════════════════════════════════════════════════════════════════
-- 🔍 CONSULTA 2: DETALHES DAS DUPLICATAS
-- ════════════════════════════════════════════════════════════════
WITH duplicates AS (
    SELECT title
    FROM anuncios_drafts
    GROUP BY title
    HAVING COUNT(*) > 1
)
SELECT 
    a.id,
    a.title,
    a.created_at,
    CASE 
        WHEN a.id IN (
            '3cabf06d-51c6-4e2b-b73e-520e018f1fce',
            '9f6cad48-42e9-4ed5-b766-82127a62dce2'
        ) THEN '🎯 MANTER (TESTE com reservas)'
        WHEN a.data->>'migrated_from' = 'properties' THEN '❌ REMOVER (duplicata migrada)'
        ELSE '❓ VERIFICAR'
    END AS acao,
    a.data->>'migrated_from' AS origem
FROM anuncios_drafts a
INNER JOIN duplicates d ON a.title = d.title
ORDER BY a.title, a.created_at;

-- ════════════════════════════════════════════════════════════════
-- 📊 CONSULTA 3: CONTAGEM TOTAL
-- ════════════════════════════════════════════════════════════════
SELECT 
    COUNT(*) AS total_atual,
    COUNT(*) - 2 AS duplicatas_estimadas,
    159 AS total_esperado
FROM anuncios_drafts;

-- ════════════════════════════════════════════════════════════════
-- ❌ DELETE: REMOVER DUPLICATAS (EXECUTAR APÓS CONFIRMAR)
-- ════════════════════════════════════════════════════════════════
-- ⚠️  ATENÇÃO: Execute apenas DEPOIS de confirmar as queries acima!

-- Deletar duplicatas DOS ANÚNCIOS DE TESTE (manter originais)
DELETE FROM anuncios_drafts
WHERE title IN (
    SELECT title 
    FROM anuncios_drafts 
    WHERE id IN (
        '3cabf06d-51c6-4e2b-b73e-520e018f1fce',  -- teste 30 02
        '9f6cad48-42e9-4ed5-b766-82127a62dce2'   -- Dona Rosa Botafogo ap 01
    )
)
AND id NOT IN (
    '3cabf06d-51c6-4e2b-b73e-520e018f1fce',
    '9f6cad48-42e9-4ed5-b766-82127a62dce2'
)
-- Retorna os IDs removidos
RETURNING id, title, data->>'migrated_from' AS origem;

-- ════════════════════════════════════════════════════════════════
-- ✅ VERIFICAÇÃO FINAL
-- ════════════════════════════════════════════════════════════════
SELECT COUNT(*) AS total_final FROM anuncios_drafts;
-- Deve retornar: 159
