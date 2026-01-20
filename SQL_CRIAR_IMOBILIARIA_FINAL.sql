-- ============================================================================
-- CRIAR ORGANIZAÇÃO: Sua Casa Mobiliada (VERSÃO FINAL - ESTRUTURA REAL)
-- ============================================================================
-- Execute este script no SQL Editor do Supabase Dashboard
-- https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql/new
-- 
-- ✅ BASEADO NA ESTRUTURA REAL DA TABELA

-- Inserir organização usando apenas colunas que existem
INSERT INTO organizations (
    id,
    name,
    slug,
    email,
    phone,
    plan,
    status,
    is_master,
    -- Limites do plano Enterprise (ilimitado = -1 ou NULL)
    limits_users,
    limits_properties,
    limits_reservations,
    limits_storage,
    -- Settings básicos
    settings_max_users,
    settings_max_properties,
    created_at,
    updated_at,
    trial_ends_at
) VALUES (
    gen_random_uuid(),
    'Sua Casa Mobiliada',
    'rendizy_sua_casa_mobiliada',
    'suacasamobiliada@gmail.com',
    NULL,
    'enterprise',
    'active',
    false, -- Não é organização master
    -1, -- Ilimitado
    -1, -- Ilimitado
    -1, -- Ilimitado
    -1, -- Ilimitado
    -1, -- Ilimitado
    -1, -- Ilimitado
    NOW(),
    NOW(),
    NULL -- Sem trial (plano enterprise)
)
ON CONFLICT (slug) DO UPDATE
SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    plan = EXCLUDED.plan,
    status = EXCLUDED.status,
    updated_at = NOW()
RETURNING *;

-- ============================================================================
-- VERIFICAR SE FOI CRIADA
-- ============================================================================

SELECT 
    id,
    name,
    slug,
    email,
    plan,
    status,
    limits_users,
    limits_properties,
    limits_reservations,
    created_at
FROM organizations
WHERE email = 'suacasamobiliada@gmail.com'
ORDER BY created_at DESC
LIMIT 1;
