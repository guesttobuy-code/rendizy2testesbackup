-- ============================================================================
-- TABELA: organization_channel_config
-- Armazena configurações de canais de comunicação (WhatsApp, SMS, etc)
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_channel_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL UNIQUE,
  
  -- WhatsApp (Evolution API)
  whatsapp_enabled BOOLEAN DEFAULT false,
  whatsapp_api_url TEXT,
  whatsapp_instance_name TEXT,
  whatsapp_api_key TEXT,
  whatsapp_instance_token TEXT,
  whatsapp_connected BOOLEAN DEFAULT false,
  whatsapp_phone_number TEXT,
  whatsapp_qr_code TEXT,
  whatsapp_connection_status TEXT DEFAULT 'disconnected',
  whatsapp_last_connected_at TIMESTAMPTZ,
  whatsapp_error_message TEXT,
  
  -- SMS (Twilio) - Futuro
  sms_enabled BOOLEAN DEFAULT false,
  sms_account_sid TEXT,
  sms_auth_token TEXT,
  sms_phone_number TEXT,
  sms_credits_used INTEGER DEFAULT 0,
  sms_last_recharged_at TIMESTAMPTZ,
  
  -- Automations
  automation_reservation_confirmation BOOLEAN DEFAULT false,
  automation_checkin_reminder BOOLEAN DEFAULT false,
  automation_checkout_review BOOLEAN DEFAULT false,
  automation_payment_reminder BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca rápida por organization_id
CREATE INDEX IF NOT EXISTS idx_channel_config_org 
ON organization_channel_config(organization_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_channel_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Evita erro na reexecução de migrations durante resets locais
DROP TRIGGER IF EXISTS trigger_update_channel_config_updated_at
  ON organization_channel_config;

CREATE TRIGGER trigger_update_channel_config_updated_at
  BEFORE UPDATE ON organization_channel_config
  FOR EACH ROW
  EXECUTE FUNCTION update_channel_config_updated_at();

-- Row Level Security (RLS)
ALTER TABLE organization_channel_config ENABLE ROW LEVEL SECURITY;

-- Evita erro na reexecução se a política já existir
DROP POLICY IF EXISTS "Allow all operations on channel_config" ON organization_channel_config;

-- Policy: Permitir todas operações (ajustar conforme necessidade de segurança)
CREATE POLICY "Allow all operations on channel_config" 
ON organization_channel_config 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Comentários
COMMENT ON TABLE organization_channel_config IS 'Configurações de canais de comunicação (WhatsApp, SMS, Email) por organização';
COMMENT ON COLUMN organization_channel_config.organization_id IS 'ID único da organização/imobiliária';
COMMENT ON COLUMN organization_channel_config.whatsapp_api_url IS 'URL base da Evolution API';
COMMENT ON COLUMN organization_channel_config.whatsapp_instance_name IS 'Nome da instância no Evolution API';
COMMENT ON COLUMN organization_channel_config.whatsapp_api_key IS 'Global API Key do Evolution API';
COMMENT ON COLUMN organization_channel_config.whatsapp_instance_token IS 'Token específico da instância';


