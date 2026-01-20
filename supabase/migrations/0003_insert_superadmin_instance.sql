-- ============================================================================
-- INSERIR/ATUALIZAR INSTÂNCIA DO SUPERADMIN
-- Data: 15/11/2025
-- ============================================================================
-- 
-- Este script insere ou atualiza a instância do superadmin (user_id = 1)
-- na tabela evolution_instances.
--
-- ⚠️ IMPORTANTE: Substitua os valores abaixo pelas suas credenciais reais!
--
-- ============================================================================

-- Inserir ou atualizar instância do superadmin
INSERT INTO evolution_instances (
  user_id, 
  instance_name, 
  instance_api_key, 
  global_api_key, 
  base_url
)
VALUES (
  1,  -- user_id do superadmin
  'Rafael Rendizy Google teste',  -- Nome da instância
  'D34790BEB178-4054-A6C2-F76445A81747',  -- Instance Token
  NULL,  -- Substitua por sua Global API Key se tiver; caso contrário ficará NULL
  'https://evo.boravendermuito.com.br'  -- Base URL
)
ON CONFLICT (user_id) DO UPDATE
SET 
  instance_name = EXCLUDED.instance_name,
  instance_api_key = EXCLUDED.instance_api_key,
  global_api_key = COALESCE(EXCLUDED.global_api_key, evolution_instances.global_api_key),
  base_url = EXCLUDED.base_url;

-- ⚠️ NOTA: A global_api_key precisa ser buscada do secret ou inserida manualmente
-- Se você tiver a Global API Key, execute este UPDATE separadamente:
-- UPDATE evolution_instances 
-- SET global_api_key = 'SUA_GLOBAL_API_KEY_AQUI'
-- WHERE user_id = 1;

-- Verificar se foi inserido/atualizado
SELECT 
  user_id,
  instance_name,
  base_url,
  CASE 
    WHEN instance_api_key IS NOT NULL AND LENGTH(instance_api_key) > 0 
      AND global_api_key IS NOT NULL AND LENGTH(global_api_key) > 0
    THEN '✅ Totalmente configurado'
    WHEN instance_api_key IS NOT NULL AND LENGTH(instance_api_key) > 0
    THEN '⚠️ Falta Global API Key'
    ELSE '❌ Não configurado'
  END AS status_credenciais,
  created_at,
  updated_at
FROM evolution_instances
WHERE user_id = 1;
