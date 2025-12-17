-- ============================================================================
-- QUERIES DE INVESTIGAÇÃO - DADOS DO ANÚNCIO DONA ROSA
-- ============================================================================
-- Execute estas queries NO SUPABASE SQL EDITOR para verificar os dados
-- Data: 16/12/2025 02:22
-- ============================================================================

-- 1️⃣ BUSCAR REGISTRO ESPECÍFICO COM JSON COMPLETO
SELECT 
    id,
    created_at,
    updated_at,
    data::text as dados_json_completo
FROM anuncios_drafts
WHERE id = '9f6cad48-42e9-4ed5-b766-82127a62dce2';

-- ============================================================================

-- 2️⃣ BUSCAR TODOS OS REGISTROS QUE CONTENHAM "DONA ROSA" OU "BOTAFOGO"
SELECT 
    id,
    created_at,
    data->>'title' as titulo,
    jsonb_pretty(data) as dados_formatados
FROM anuncios_drafts
WHERE 
    data->>'title' ILIKE '%dona%rosa%'
    OR data->>'title' ILIKE '%botafogo%'
ORDER BY created_at DESC;

-- ============================================================================

-- 3️⃣ LISTAR TODOS OS CAMPOS DO JSON (PARA VER O QUE EXISTE)
SELECT 
    id,
    data->>'title' as titulo,
    data->>'tipoLocal' as tipo_local,
    data->>'tipoAcomodacao' as tipo_acomodacao,
    data->'modalidades' as modalidades,
    data->'address' as endereco,
    data->>'bedrooms' as quartos,
    data->>'bathrooms' as banheiros,
    data->>'beds' as camas,
    data->>'guests' as hospedes,
    data->>'coverPhoto' as foto_capa,
    data->'photos' as fotos,
    data->>'description' as descricao,
    data->'rooms' as comodos,
    data->'locationAmenities' as comodidades_localizacao,
    data->'listingAmenities' as comodidades_imovel,
    data->'highlights' as destaques,
    data->'checkInCheckout' as checkin_checkout,
    data->'pricing' as precos,
    data->'rules' as regras,
    data->>'currentStep' as passo_atual,
    jsonb_object_keys(data) as todas_chaves
FROM anuncios_drafts
WHERE id = '9f6cad48-42e9-4ed5-b766-82127a62dce2';

-- ============================================================================

-- 4️⃣ VER ESTRUTURA DA TABELA anuncios_drafts
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'anuncios_drafts'
ORDER BY ordinal_position;

-- ============================================================================

-- 5️⃣ LISTAR TODAS AS TABELAS DISPONÍVEIS NO BANCO
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================

-- 6️⃣ BUSCAR TODOS OS REGISTROS DE anuncios_drafts (PARA VER SE HÁ OUTROS DADOS)
SELECT 
    id,
    created_at,
    updated_at,
    data->>'title' as titulo,
    data->>'tipoLocal' as tipo,
    jsonb_object_keys(data) as chaves
FROM anuncios_drafts
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================

-- 7️⃣ LISTAR APENAS AS CHAVES DO JSON (SEM DUPLICATAS)
SELECT DISTINCT jsonb_object_keys(data) as chaves_presentes
FROM anuncios_drafts
WHERE id = '9f6cad48-42e9-4ed5-b766-82127a62dce2'
ORDER BY chaves_presentes;

-- ============================================================================

-- 8️⃣ HISTÓRICO DE ATUALIZAÇÕES (ver se updated_at mudou)
SELECT 
    id,
    data->>'title' as titulo,
    created_at,
    updated_at,
    updated_at - created_at as tempo_desde_criacao,
    CASE 
        WHEN updated_at > created_at THEN 'ATUALIZADO'
        ELSE 'SEM ATUALIZAÇÕES'
    END as status_edicao
FROM anuncios_drafts
WHERE id = '9f6cad48-42e9-4ed5-b766-82127a62dce2';

-- ============================================================================

-- 9️⃣ BUSCAR POR INTERNAL_ID (SE EXISTIR NO JSON)
SELECT 
    id,
    data->>'internalId' as internal_id,
    data->>'title' as titulo,
    created_at
FROM anuncios_drafts
WHERE data->>'internalId' IS NOT NULL
ORDER BY created_at DESC;

-- ============================================================================

-- 🔟 EXPORTAR JSON COMPLETO FORMATADO
SELECT jsonb_pretty(data) 
FROM anuncios_drafts
WHERE id = '9f6cad48-42e9-4ed5-b766-82127a62dce2';
