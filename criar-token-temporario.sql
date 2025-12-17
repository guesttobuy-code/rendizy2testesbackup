-- ============================================================================
-- SCRIPT TEMPORÁRIO: Criar token de sessão para teste
-- ============================================================================
-- Este script cria uma sessão válida para o usuário admin
-- Use o token retornado no localStorage: localStorage.setItem('rendizy-token', 'TOKEN_AQUI')
-- ============================================================================

-- 1. Limpar sessões antigas do admin
DELETE FROM sessions 
WHERE user_id = (SELECT id FROM users WHERE username = 'admin' AND type = 'superadmin' LIMIT 1);

-- 2. Criar nova sessão com token gerado
WITH user_data AS (
  SELECT id, username, type, organization_id
  FROM users
  WHERE username = 'admin' AND type = 'superadmin'
  LIMIT 1
),
new_session AS (
  INSERT INTO sessions (
    token,
    user_id,
    username,
    type,
    organization_id,
    expires_at,
    last_activity,
    created_at
  )
  SELECT 
    encode(gen_random_bytes(64), 'hex') as token,
    id,
    username,
    type,
    COALESCE(organization_id, '00000000-0000-0000-0000-000000000000')::UUID,
    NOW() + INTERVAL '7 days' as expires_at,
    NOW() as last_activity,
    NOW() as created_at
  FROM user_data
  RETURNING token, username, type, expires_at, created_at
)
-- 3. Retornar token criado
SELECT 
  token,
  username,
  type,
  expires_at,
  created_at,
  '✅ Token criado! Use no localStorage: localStorage.setItem(''rendizy-token'', ''' || token || ''')' as instrucoes
FROM new_session;
