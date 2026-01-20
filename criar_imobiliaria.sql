-- Script SQL para criar a imobiliária "Sua Casa Mobiliada"
-- Execute este script no Supabase SQL Editor

INSERT INTO organizations (
    name,
    slug,
    email,
    phone,
    plan,
    status,
    created_by,
    settings,
    billing
) VALUES (
    'Sua Casa Mobiliada',
    'rendizy_sua_casa_mobiliada',
    'suacasamobiliada@gmail.com',
    NULL,
    'enterprise',
    'active',
    'user_master_rendizy',
    '{
        "maxUsers": -1,
        "maxProperties": -1,
        "maxReservations": -1,
        "features": ["all"]
    }'::jsonb,
    '{
        "mrr": 0,
        "billingDate": 1
    }'::jsonb
)
ON CONFLICT (slug) DO UPDATE
SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    plan = EXCLUDED.plan,
    status = EXCLUDED.status,
    updated_at = NOW();

-- Verificar se foi criada
SELECT 
    id,
    slug,
    name,
    email,
    plan,
    status,
    created_at
FROM organizations
WHERE slug = 'rendizy_sua_casa_mobiliada';
