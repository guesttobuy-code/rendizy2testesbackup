-- ============================================================================
-- CRIAR ORGANIZAÇÃO: Sua Casa Mobiliada (VERSÃO CORRIGIDA)
-- ============================================================================
-- Execute este script no SQL Editor do Supabase Dashboard
-- https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql/new
-- 
-- ✅ CORRIGIDO: Removido campo created_by que não existe na tabela

-- Primeiro, vamos verificar a estrutura da tabela (opcional, para debug)
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'organizations' 
-- ORDER BY ordinal_position;

-- Agora, inserir a organização usando estrutura REAL da tabela
INSERT INTO organizations (
    id,
    name,
    slug,
    email,
    phone,
    plan,
    status,
    is_master,
    limits_users,
    limits_properties,
    limits_reservations,
    limits_storage,
    settings_max_users,
    settings_max_properties,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Sua Casa Mobiliada',
    'rendizy_sua_casa_mobiliada',
    'suacasamobiliada@gmail.com',
    NULL,
    'enterprise',
    'active',
    false,
    -1, -- Ilimitado
    -1, -- Ilimitado
    -1, -- Ilimitado
    -1, -- Ilimitado
    -1, -- Ilimitado
    -1, -- Ilimitado
    NOW(),
    NOW()
)
ON CONFLICT (slug) DO UPDATE
SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    plan = EXCLUDED.plan,
    status = EXCLUDED.status,
    updated_at = NOW()
RETURNING id, name, slug, email, plan, status;

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
    created_at
FROM organizations
WHERE email = 'suacasamobiliada@gmail.com'
ORDER BY created_at DESC
LIMIT 1;
