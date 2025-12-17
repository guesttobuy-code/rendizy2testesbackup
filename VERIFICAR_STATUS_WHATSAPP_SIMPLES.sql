-- Ver status atual da conexão WhatsApp (VERSÃO SIMPLIFICADA)
-- Execute este SQL no Supabase Dashboard

SELECT 
  CASE 
    WHEN whatsapp_connected = true THEN '✅ CONECTADO'
    WHEN whatsapp_connected = false THEN '❌ DESCONECTADO'
    ELSE '⚠️ DESCONHECIDO'
  END AS status_atual,
  whatsapp_phone_number AS telefone,
  whatsapp_connection_status AS status_detalhado,
  whatsapp_last_connected_at AS ultima_conexao,
  whatsapp_error_message AS erro
FROM organization_channel_config
WHERE whatsapp_enabled = true
ORDER BY created_at DESC
LIMIT 1;

