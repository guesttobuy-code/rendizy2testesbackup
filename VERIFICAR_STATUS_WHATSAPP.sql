-- ============================================================================
-- VERIFICAR: Status da Conexão WhatsApp
-- ============================================================================
-- 
-- Execute este SQL para ver o status atual da conexão WhatsApp
--
-- ============================================================================

-- 1. Ver status da conexão WhatsApp no banco de dados
SELECT 
  organization_id,
  whatsapp_enabled,
  whatsapp_connected,
  whatsapp_connection_status,
  whatsapp_phone_number,
  whatsapp_last_connected_at,
  whatsapp_error_message,
  created_at,
  updated_at
FROM organization_channel_config
WHERE whatsapp_enabled = true
ORDER BY created_at DESC
LIMIT 5;

-- 2. Ver se está conectado agora
SELECT 
  CASE 
    WHEN whatsapp_connected = true THEN '✅ CONECTADO'
    WHEN whatsapp_connected = false THEN '❌ DESCONECTADO'
    ELSE '⚠️ DESCONHECIDO'
  END AS status_atual,
  whatsapp_phone_number AS telefone,
  whatsapp_connection_status AS status_detalhado,
  whatsapp_last_connected_at AS ultima_conexao,
  whatsapp_error_message AS erro,
  created_at AS criado_em,
  updated_at AS atualizado_em
FROM organization_channel_config
WHERE whatsapp_enabled = true
ORDER BY created_at DESC
LIMIT 1;

