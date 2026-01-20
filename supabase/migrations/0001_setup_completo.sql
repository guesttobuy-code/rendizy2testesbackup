-- ============================================================================
-- MIGRAÇÃO COMPLETA - SETUP INICIAL DO SUPABASE
-- Data: 15/11/2025
-- Projeto: Rendizy (odcgnzfremrqnvtitpcc)
-- ============================================================================
-- 
-- Este script cria todas as tabelas necessárias para o sistema funcionar.
-- Execute este script no SQL Editor do Supabase Dashboard.
--
-- ORDEM DE EXECUÇÃO:
-- 1. Execute este script completo
-- 2. Configure os Secrets (Edge Functions → Secrets)
-- 3. Execute o script de verificação
--
-- ============================================================================

-- ============================================================================
-- 1. TABELA: kv_store_67caf26a
-- Tabela principal Key-Value Store para todos os dados do sistema
-- ============================================================================

CREATE TABLE IF NOT EXISTS kv_store_67caf26a (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca rápida por prefixo
CREATE INDEX IF NOT EXISTS idx_kv_store_key_prefix 
ON kv_store_67caf26a(key text_pattern_ops);

-- Índice GIN para busca dentro do JSONB
CREATE INDEX IF NOT EXISTS idx_kv_store_value_gin 
ON kv_store_67caf26a USING GIN(value);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_kv_store_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_kv_store_updated_at ON kv_store_67caf26a;
CREATE TRIGGER trigger_update_kv_store_updated_at
  BEFORE UPDATE ON kv_store_67caf26a
  FOR EACH ROW
  EXECUTE FUNCTION update_kv_store_updated_at();

-- Comentários
COMMENT ON TABLE kv_store_67caf26a IS 'Tabela principal Key-Value Store para todos os dados do sistema Rendizy';
COMMENT ON COLUMN kv_store_67caf26a.key IS 'Chave única (ex: org:123, acc:456, reservation:789)';
COMMENT ON COLUMN kv_store_67caf26a.value IS 'Valor em formato JSON (JSONB)';

-- ============================================================================
-- 2. TABELA: organization_channel_config
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

DROP TRIGGER IF EXISTS trigger_update_channel_config_updated_at ON organization_channel_config;
CREATE TRIGGER trigger_update_channel_config_updated_at
  BEFORE UPDATE ON organization_channel_config
  FOR EACH ROW
  EXECUTE FUNCTION update_channel_config_updated_at();

-- Row Level Security (RLS)
ALTER TABLE organization_channel_config ENABLE ROW LEVEL SECURITY;

-- Policy: Permitir todas operações (ajustar conforme necessidade de segurança)
DROP POLICY IF EXISTS "Allow all operations on channel_config" ON organization_channel_config;
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

-- ============================================================================
-- 3. TABELA: evolution_instances
-- Armazena instâncias Evolution API por usuário (Multi-Tenant)
-- ============================================================================

CREATE TABLE IF NOT EXISTS evolution_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL,
  instance_name TEXT NOT NULL,
  instance_api_key TEXT NOT NULL,
  global_api_key TEXT,
  base_url TEXT NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id) -- Um usuário = uma instância
);

-- Índice para busca rápida por user_id
CREATE INDEX IF NOT EXISTS idx_evolution_instances_user 
ON evolution_instances(user_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_evolution_instances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_evolution_instances_updated_at ON evolution_instances;
CREATE TRIGGER trigger_update_evolution_instances_updated_at
  BEFORE UPDATE ON evolution_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_evolution_instances_updated_at();

-- Row Level Security (RLS)
ALTER TABLE evolution_instances ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their own instance" ON evolution_instances;
DROP POLICY IF EXISTS "Users can update their own instance" ON evolution_instances;
DROP POLICY IF EXISTS "Users can insert their own instance" ON evolution_instances;
DROP POLICY IF EXISTS "Admin can view all instances" ON evolution_instances;

-- Policy: Usuário só vê sua própria instância
CREATE POLICY "Users can view their own instance" 
ON evolution_instances 
FOR SELECT 
USING (user_id = (current_setting('request.jwt.claims')::json->>'user_id')::integer);

-- Policy: Usuário pode atualizar sua própria instância
CREATE POLICY "Users can update their own instance" 
ON evolution_instances 
FOR UPDATE 
USING (user_id = (current_setting('request.jwt.claims')::json->>'user_id')::integer);

-- Policy: Usuário pode inserir sua própria instância
CREATE POLICY "Users can insert their own instance" 
ON evolution_instances 
FOR INSERT 
WITH CHECK (user_id = (current_setting('request.jwt.claims')::json->>'user_id')::integer);

-- Policy: Admin vê todas as instâncias
CREATE POLICY "Admin can view all instances" 
ON evolution_instances 
FOR ALL 
USING ((current_setting('request.jwt.claims')::json->>'user_id')::integer = 1);

-- Comentários
COMMENT ON TABLE evolution_instances IS 'Instâncias Evolution API por usuário (multi-tenant)';
COMMENT ON COLUMN evolution_instances.user_id IS 'ID do usuário dono da instância';
COMMENT ON COLUMN evolution_instances.instance_name IS 'Nome da instância (ex: TESTE)';
COMMENT ON COLUMN evolution_instances.instance_api_key IS 'API Key específica da instância';
COMMENT ON COLUMN evolution_instances.global_api_key IS 'Global API Key (opcional)';
COMMENT ON COLUMN evolution_instances.base_url IS 'URL base da Evolution API';

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
-- 
-- PRÓXIMOS PASSOS:
-- 
-- 1. Configure os Secrets no Supabase Dashboard:
--    Settings → Edge Functions → Secrets
--    - EVOLUTION_API_URL
--    - EVOLUTION_INSTANCE_NAME
--    - EVOLUTION_GLOBAL_API_KEY
--    - EVOLUTION_INSTANCE_TOKEN
--
-- 2. (Opcional) Insira instância do superadmin:
--    INSERT INTO evolution_instances (user_id, instance_name, instance_api_key, global_api_key, base_url)
--    VALUES (1, 'Rendizy', 'SEU_TOKEN', 'SUA_KEY', 'https://evo.boravendermuito.com.br');
--
-- 3. Execute o script de verificação para confirmar que tudo está OK
--
-- ============================================================================

