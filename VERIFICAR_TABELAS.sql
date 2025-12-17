-- ============================================================================
-- SCRIPT PARA VERIFICAR SE TABELAS FORAM CRIADAS
-- Execute no Supabase SQL Editor
-- ============================================================================

-- 1. Verificar se tabelas existem
SELECT 
    table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = t.table_name
        ) THEN '✅ Existe'
        ELSE '❌ Não existe'
    END AS status
FROM (VALUES 
    ('organizations'),
    ('users'),
    ('sessions')
) AS t(table_name);

-- 2. Se tabela users existe, verificar se usuários foram criados
SELECT 
    username,
    email,
    name,
    type,
    status,
    created_at
FROM users
ORDER BY created_at;

-- 3. Se tabela sessions existe, verificar estrutura
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'sessions'
ORDER BY ordinal_position;

-- 4. Contar registros em cada tabela
SELECT 
    'organizations' AS tabela,
    COUNT(*) AS total_registros
FROM organizations
UNION ALL
SELECT 
    'users' AS tabela,
    COUNT(*) AS total_registros
FROM users
UNION ALL
SELECT 
    'sessions' AS tabela,
    COUNT(*) AS total_registros
FROM sessions;

