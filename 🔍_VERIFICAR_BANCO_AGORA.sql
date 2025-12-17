-- ============================================================================
-- 🔍 SCRIPT DE VERIFICAÇÃO DO BANCO DE DADOS SUPABASE
-- ============================================================================
-- Sistema: RENDIZY
-- Versão: v1.0.103.298
-- Data: 04 NOV 2025
-- Tabela: kv_store_67caf26a
-- ============================================================================

-- ============================================================================
-- 1️⃣ VERIFICAR ESTRUTURA DA TABELA
-- ============================================================================

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'kv_store_67caf26a'
ORDER BY ordinal_position;

-- Resultado esperado:
-- key        | text   | NO  | NULL
-- value      | jsonb  | NO  | NULL
-- tenant_id  | text   | YES | NULL
-- created_at | timestamp | YES | now()
-- updated_at | timestamp | YES | now()

-- ============================================================================
-- 2️⃣ CONTAR REGISTROS POR TIPO
-- ============================================================================

SELECT 
    CASE 
        WHEN key LIKE 'property:%' THEN '🏠 Propriedades'
        WHEN key LIKE 'property_type:location:%' THEN '📍 Tipos de Local'
        WHEN key LIKE 'property_type:accommodation:%' THEN '🏢 Tipos de Acomodação'
        WHEN key LIKE 'reservation:%' THEN '📅 Reservas'
        WHEN key LIKE 'location:%' THEN '🌍 Localizações'
        ELSE '❓ Outros'
    END as tipo,
    COUNT(*) as total
FROM kv_store_67caf26a
GROUP BY tipo
ORDER BY total DESC;

-- ============================================================================
-- 3️⃣ VERIFICAR TIPOS DE LOCAL (LOCATION TYPES)
-- ============================================================================

SELECT 
    value->>'id' as id,
    value->>'code' as code,
    value->>'name' as name,
    value->>'icon' as icon,
    value->>'category' as category,
    value->>'isActive' as is_active,
    value->>'isSystem' as is_system,
    value->>'usage_count' as usage_count
FROM kv_store_67caf26a
WHERE key LIKE 'property_type:location:%'
ORDER BY value->>'name';

-- Resultado esperado: 30+ tipos de local
-- Ex: Casa, Apartamento, Chalé, Hotel, Pousada, Resort, etc.

-- ============================================================================
-- 4️⃣ VERIFICAR TIPOS DE ACOMODAÇÃO (ACCOMMODATION TYPES)
-- ============================================================================

SELECT 
    value->>'id' as id,
    value->>'code' as code,
    value->>'name' as name,
    value->>'icon' as icon,
    value->>'category' as category,
    value->>'isActive' as is_active,
    value->>'isSystem' as is_system,
    value->>'usage_count' as usage_count
FROM kv_store_67caf26a
WHERE key LIKE 'property_type:accommodation:%'
ORDER BY value->>'name';

-- Resultado esperado: 27+ tipos de acomodação
-- Ex: Apartamento, Casa, Estúdio, Loft, Suíte, Quarto Privado, etc.

-- ============================================================================
-- 5️⃣ VERIFICAR PROPRIEDADE ESPECÍFICA (STEP 1)
-- ============================================================================

-- Substitua pelo ID da propriedade que você está testando
SELECT 
    key,
    value->>'id' as property_id,
    value->>'tenantId' as tenant_id,
    value->>'createdAt' as created_at,
    value->>'updatedAt' as updated_at,
    
    -- STEP 1: Content Type
    value->'contentType'->>'propertyTypeId' as property_type_id,
    value->'contentType'->>'accommodationTypeId' as accommodation_type_id,
    value->'contentType'->>'subtipo' as subtipo,
    value->'contentType'->>'modalidades' as modalidades,
    value->'contentType'->>'propertyType' as property_type,
    
    -- Steps completados
    value->>'completedSteps' as completed_steps
FROM kv_store_67caf26a
WHERE key = 'property:acc_97239cad-4b8d-46c0-82a3-28673ae4cfc1';

-- ============================================================================
-- 6️⃣ VERIFICAR DADOS FINANCEIROS (SE PREENCHIDOS)
-- ============================================================================

SELECT 
    key,
    value->>'id' as property_id,
    
    -- Financial Data - Short Term Rental
    value->'contentType'->'financialData'->>'dailyRate' as daily_rate,
    value->'contentType'->'financialData'->>'weeklyRate' as weekly_rate,
    value->'contentType'->'financialData'->>'monthlyRate' as monthly_rate,
    value->'contentType'->'financialData'->>'cleaningFee' as cleaning_fee,
    value->'contentType'->'financialData'->>'securityDeposit' as security_deposit,
    value->'contentType'->'financialData'->>'minNights' as min_nights,
    value->'contentType'->'financialData'->>'maxNights' as max_nights,
    
    -- Financial Data - Residential Rental
    value->'contentType'->'financialData'->>'monthlyRent' as monthly_rent,
    value->'contentType'->'financialData'->>'iptu' as iptu,
    value->'contentType'->'financialData'->>'condo' as condo,
    value->'contentType'->'financialData'->>'fees' as fees,
    
    -- Financial Data - Buy/Sell
    value->'contentType'->'financialData'->>'salePrice' as sale_price
FROM kv_store_67caf26a
WHERE key = 'property:acc_97239cad-4b8d-46c0-82a3-28673ae4cfc1';

-- ============================================================================
-- 7️⃣ LISTAR TODAS AS PROPRIEDADES COM STEP 1 COMPLETO
-- ============================================================================

SELECT 
    value->>'id' as property_id,
    value->>'createdAt' as created_at,
    value->'contentType'->>'propertyTypeId' as property_type_id,
    value->'contentType'->>'accommodationTypeId' as accommodation_type_id,
    value->'contentType'->>'subtipo' as subtipo,
    value->'contentType'->>'modalidades' as modalidades,
    value->>'completedSteps' as completed_steps
FROM kv_store_67caf26a
WHERE key LIKE 'property:%'
  AND value->'completedSteps' ? 'content-type'
ORDER BY value->>'updatedAt' DESC;

-- ============================================================================
-- 8️⃣ ESTATÍSTICAS: PROPRIEDADES POR TIPO
-- ============================================================================

SELECT 
    value->'contentType'->>'propertyTypeId' as property_type_id,
    COUNT(*) as total_properties
FROM kv_store_67caf26a
WHERE key LIKE 'property:%'
  AND value->'contentType'->>'propertyTypeId' IS NOT NULL
GROUP BY property_type_id
ORDER BY total_properties DESC;

-- ============================================================================
-- 9️⃣ ESTATÍSTICAS: PROPRIEDADES POR MODALIDADE
-- ============================================================================

SELECT 
    value->'contentType'->>'modalidades' as modalidades,
    COUNT(*) as total_properties
FROM kv_store_67caf26a
WHERE key LIKE 'property:%'
  AND value->'contentType'->>'modalidades' IS NOT NULL
GROUP BY modalidades
ORDER BY total_properties DESC;

-- ============================================================================
-- 🔟 VERIFICAR SE TIPOS ESTÃO SENDO USADOS (USAGE COUNT)
-- ============================================================================

-- Contar uso de cada tipo de local
WITH property_types AS (
    SELECT 
        value->'contentType'->>'propertyTypeId' as type_id
    FROM kv_store_67caf26a
    WHERE key LIKE 'property:%'
      AND value->'contentType'->>'propertyTypeId' IS NOT NULL
)
SELECT 
    pt.value->>'name' as type_name,
    pt.value->>'category' as category,
    COUNT(p.type_id) as usage_count
FROM kv_store_67caf26a pt
LEFT JOIN property_types p ON p.type_id = pt.value->>'id'
WHERE pt.key LIKE 'property_type:%'
GROUP BY pt.value->>'name', pt.value->>'category'
ORDER BY usage_count DESC, type_name;

-- ============================================================================
-- 1️⃣1️⃣ VERIFICAR ÚLTIMA ATUALIZAÇÃO
-- ============================================================================

SELECT 
    key,
    value->>'id' as property_id,
    value->>'updatedAt' as last_updated,
    value->>'completedSteps' as completed_steps,
    NOW() - (value->>'updatedAt')::timestamp as time_since_update
FROM kv_store_67caf26a
WHERE key LIKE 'property:%'
ORDER BY (value->>'updatedAt')::timestamp DESC
LIMIT 10;

-- ============================================================================
-- 1️⃣2️⃣ VERIFICAR INTEGRIDADE DOS DADOS
-- ============================================================================

-- Propriedades com Step 1 incompleto
SELECT 
    value->>'id' as property_id,
    value->>'createdAt' as created_at,
    CASE 
        WHEN value->'contentType'->>'propertyTypeId' IS NULL THEN '❌ propertyTypeId faltando'
        WHEN value->'contentType'->>'accommodationTypeId' IS NULL THEN '❌ accommodationTypeId faltando'
        WHEN value->'contentType'->>'subtipo' IS NULL THEN '❌ subtipo faltando'
        WHEN value->'contentType'->>'modalidades' IS NULL THEN '❌ modalidades faltando'
        ELSE '✅ Completo'
    END as status
FROM kv_store_67caf26a
WHERE key LIKE 'property:%'
ORDER BY status;

-- ============================================================================
-- 1️⃣3️⃣ EXPORT JSON COMPLETO DE UMA PROPRIEDADE
-- ============================================================================

-- Ver JSON completo formatado de uma propriedade específica
SELECT 
    jsonb_pretty(value) as property_json
FROM kv_store_67caf26a
WHERE key = 'property:acc_97239cad-4b8d-46c0-82a3-28673ae4cfc1';

-- ============================================================================
-- 1️⃣4️⃣ SEED VERIFICATION (Verificar se os tipos do sistema existem)
-- ============================================================================

-- Deve retornar 30+ location types
SELECT COUNT(*) as total_location_types
FROM kv_store_67caf26a
WHERE key LIKE 'property_type:location:%';

-- Deve retornar 27+ accommodation types
SELECT COUNT(*) as total_accommodation_types
FROM kv_store_67caf26a
WHERE key LIKE 'property_type:accommodation:%';

-- ============================================================================
-- 1️⃣5️⃣ TESTE DE INSERÇÃO (OPCIONAL - USE COM CUIDADO!)
-- ============================================================================

-- ATENÇÃO: Este script CRIA uma propriedade de teste!
-- Só execute se quiser testar a estrutura do banco.

/*
INSERT INTO kv_store_67caf26a (key, value, tenant_id)
VALUES (
    'property:test_property_' || gen_random_uuid(),
    jsonb_build_object(
        'id', 'test_property_' || gen_random_uuid(),
        'tenantId', 'default_tenant',
        'createdAt', NOW(),
        'updatedAt', NOW(),
        'contentType', jsonb_build_object(
            'propertyTypeId', 'location_casa_1730757123456',
            'accommodationTypeId', 'accommodation_apartamento_1730757234567',
            'subtipo', 'entire_place',
            'modalidades', jsonb_build_array('short_term_rental'),
            'propertyType', 'individual'
        ),
        'completedSteps', jsonb_build_array('content-type')
    ),
    'default_tenant'
)
RETURNING key, value->>'id' as property_id;
*/

-- ============================================================================
-- ✅ CHECKLIST DE VERIFICAÇÃO
-- ============================================================================

/*
Execute as queries acima na ordem e verifique:

✅ 1. Tabela kv_store_67caf26a existe
✅ 2. Tem colunas: key, value, tenant_id, created_at, updated_at
✅ 3. Tem 30+ tipos de local (location types)
✅ 4. Tem 27+ tipos de acomodação (accommodation types)
✅ 5. Propriedades tem campo contentType
✅ 6. contentType tem: propertyTypeId, accommodationTypeId, subtipo, modalidades
✅ 7. Validação backend funciona (campos obrigatórios)
✅ 8. Dados são salvos corretamente no formato JSON
✅ 9. Isolation por tenant funciona (tenant_id)
✅ 10. Timestamps são atualizados (updated_at)

SE TODOS OS CHECKS PASSAREM = BANCO 100% CORRETO! ✅
*/

-- ============================================================================
-- 📊 RESULTADO ESPERADO
-- ============================================================================

/*
Ao executar estas queries, você deve ver:

1. Tabela com estrutura correta (key, value JSONB, tenant_id, timestamps)
2. 30+ tipos de local (Casa, Apartamento, Chalé, etc.)
3. 27+ tipos de acomodação (Apartamento, Casa, Estúdio, etc.)
4. Propriedades com contentType preenchido
5. Dados salvos no formato JSON correto
6. Validação de campos obrigatórios funcionando

SE NÃO VER ISSO = Backend não foi executado ainda!
Acesse a aplicação para fazer o seed automático.
*/

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
