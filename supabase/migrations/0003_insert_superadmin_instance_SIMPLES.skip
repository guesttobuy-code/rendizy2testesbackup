-- ============================================================================
-- INSERIR/ATUALIZAR INSTÂNCIA DO SUPERADMIN (VERSÃO SIMPLES)
-- Data: 15/11/2025
-- ============================================================================
-- 
-- ⚠️ IMPORTANTE: Você precisa ter a GLOBAL_API_KEY também!
-- Se não tiver, deixe o campo global_api_key como NULL por enquanto.
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
  NULL,  -- ⚠️ SUBSTITUA NULL pela sua Global API Key se tiver
  'https://evo.boravendermuito.com.br'  -- Base URL
)
ON CONFLICT (user_id) DO UPDATE
SET 
  instance_name = EXCLUDED.instance_name,
  instance_api_key = EXCLUDED.instance_api_key,
  global_api_key = COALESCE(EXCLUDED.global_api_key, evolution_instances.global_api_key),  -- Mantém o valor antigo se novo for NULL
  base_url = EXCLUDED.base_url;
  -- ✅ REMOVIDO: updated_at = NOW(); (coluna foi removida na migration 20241116)

-- Verificar resultado
SELECT 
  user_id,
  instance_name,
  base_url,
  CASE 
    WHEN instance_api_key IS NOT NULL AND LENGTH(instance_api_key) > 0 
      AND global_api_key IS NOT NULL AND LENGTH(global_api_key) > 0
    THEN '✅ Totalmente configurado'
    WHEN instance_api_key IS NOT NULL AND LENGTH(instance_api_key) > 0
    THEN '⚠️ Falta Global API Key (mas pode usar do secret)'
    ELSE '❌ Não configurado'
  END AS status_credenciais,
  created_at
  -- ✅ REMOVIDO: updated_at (coluna foi removida na migration 20241116)
FROM evolution_instances
WHERE user_id = 1;

