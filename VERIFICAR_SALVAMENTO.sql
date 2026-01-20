-- ============================================================================
-- VERIFICAÇÃO: Dados Salvos em organization_channel_config
-- ============================================================================
-- Execute esta query para verificar se os dados foram salvos corretamente

-- 1. Verificar dados salvos (últimos registros)
SELECT 
  organization_id,
  whatsapp_enabled,
  whatsapp_api_url,
  whatsapp_instance_name,
  whatsapp_api_key,
  whatsapp_connected,
  whatsapp_connection_status,
  created_at,
  updated_at,
  deleted_at
FROM organization_channel_config
ORDER BY updated_at DESC
LIMIT 5;

-- 2. Verificar se created_at não mudou em updates (importante!)
-- Se created_at está mudando, significa que está criando novo registro ao invés de atualizar
SELECT 
  organization_id,
  created_at,
  updated_at,
  CASE 
    WHEN created_at = updated_at THEN '⚠️ POSSÍVEL INSERT (mesma data)'
    ELSE '✅ UPDATE (datas diferentes)'
  END as status,
  EXTRACT(EPOCH FROM (updated_at - created_at)) as segundos_entre_criacao_e_atualizacao
FROM organization_channel_config
ORDER BY updated_at DESC
LIMIT 5;

-- 3. Verificar se há duplicatas (não deveria ter)
SELECT 
  organization_id,
  COUNT(*) as total_registros
FROM organization_channel_config
WHERE deleted_at IS NULL
GROUP BY organization_id
HAVING COUNT(*) > 1;

-- 4. Resumo dos dados salvos
SELECT 
  COUNT(*) as total_registros,
  COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as registros_ativos,
  COUNT(CASE WHEN whatsapp_enabled = true THEN 1 END) as whatsapp_habilitado,
  COUNT(CASE WHEN whatsapp_api_url IS NOT NULL AND whatsapp_api_url != '' THEN 1 END) as com_api_url,
  COUNT(CASE WHEN whatsapp_instance_name IS NOT NULL AND whatsapp_instance_name != '' THEN 1 END) as com_instance_name,
  MIN(created_at) as primeiro_registro,
  MAX(updated_at) as ultima_atualizacao
FROM organization_channel_config;

