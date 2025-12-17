-- Criar usuário para Medhome
-- Email: mrockgarage@gmail.com
-- Organization ID: e78c7bb9-7823-44b8-9aee-95c9b073e7b7
-- Senha: medhome123 (hash SHA256: 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8)

-- Verificar se usuário já existe
SELECT id, username, email, name, type, organization_id, status 
FROM users 
WHERE email = 'mrockgarage@gmail.com' 
   OR (organization_id = 'e78c7bb9-7823-44b8-9aee-95c9b073e7b7' AND type = 'imobiliaria');

-- Criar usuário se não existir
-- Hash SHA256 de "medhome123" = f642834b93d8fe7f90e6adbed6d067c560015eee0c346d5408ca3bf336fea843
INSERT INTO users (
  username,
  email,
  name,
  password_hash,
  type,
  status,
  organization_id,
  created_by,
  created_at,
  updated_at
) VALUES (
  'medhome_admin',
  'mrockgarage@gmail.com',
  'Medhome Admin',
  'f642834b93d8fe7f90e6adbed6d067c560015eee0c346d5408ca3bf336fea843', -- SHA256 de "medhome123"
  'imobiliaria',
  'active',
  'e78c7bb9-7823-44b8-9aee-95c9b073e7b7',
  'superadmin_rppt',
  NOW(),
  NOW()
) ON CONFLICT (username) DO UPDATE
SET 
  email = EXCLUDED.email,
  organization_id = EXCLUDED.organization_id,
  password_hash = EXCLUDED.password_hash,
  status = 'active',
  updated_at = NOW()
RETURNING id, username, email, name, type, organization_id, status;
