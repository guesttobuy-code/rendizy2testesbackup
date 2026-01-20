-- ============================================================================
-- VERIFICAR SE ORGANIZAÇÃO FOI CRIADA
-- ============================================================================
-- Execute esta query para verificar se "Sua Casa Mobiliada" foi criada

-- Verificar por email
SELECT 
    id,
    name,
    slug,
    email,
    plan,
    status,
    is_master,
    limits_users,
    limits_properties,
    limits_reservations,
    created_at
FROM organizations
WHERE email = 'suacasamobiliada@gmail.com'
ORDER BY created_at DESC
LIMIT 1;

-- Verificar por slug
SELECT 
    id,
    name,
    slug,
    email,
    plan,
    status,
    created_at
FROM organizations
WHERE slug = 'rendizy_sua_casa_mobiliada'
LIMIT 1;

-- Listar todas as organizações (últimas 5)
SELECT 
    id,
    name,
    slug,
    email,
    plan,
    status,
    created_at
FROM organizations
ORDER BY created_at DESC
LIMIT 5;
