-- ============================================================================
-- RENDIZY - Chat V2 - Database Schema
-- ============================================================================
-- 
-- Nova estrutura de banco de dados para suportar:
-- - Múltiplos canais (WhatsApp, Airbnb, Booking, SMS, Email)
-- - Múltiplos providers por canal (Evolution, WAHA, Twilio, etc)
-- - Isolamento por organização
-- - Constraint UNIQUE para evitar duplicatas
-- 
-- @version v2.0.0
-- @date 2026-01-22
-- 
-- IMPORTANTE: Execute com cuidado em produção!
-- Fazer backup antes de executar.
-- ============================================================================

-- ============================================================================
-- 1. TABELA: channel_instances
-- ============================================================================
-- Substitui organization_channel_config para WhatsApp
-- Cada linha representa uma conexão com um provedor específico

CREATE TABLE IF NOT EXISTS public.channel_instances (
  -- Identificadores
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Canal e Provider
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'airbnb', 'booking', 'sms', 'email', 'site', 'system')),
  provider TEXT NOT NULL, -- 'evolution', 'waha', 'twilio', etc
  
  -- Identificador único da instância (CRITICAL: deve ser único globalmente)
  instance_name TEXT NOT NULL,
  
  -- Configuração de conexão
  api_url TEXT,
  api_key TEXT,
  instance_token TEXT, -- Token adicional se necessário
  
  -- Status
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'qr_pending', 'error')),
  error_message TEXT,
  
  -- Dados da conexão
  connected_identifier TEXT, -- Número de telefone conectado, email, etc
  profile_name TEXT,
  profile_picture_url TEXT,
  
  -- Webhook
  webhook_url TEXT,
  webhook_events TEXT[], -- Array de eventos configurados
  
  -- QR Code (para WhatsApp)
  qr_code TEXT,
  qr_code_updated_at TIMESTAMPTZ,
  
  -- Configurações específicas do provider (JSON flexível)
  settings JSONB DEFAULT '{}',
  
  -- Flags
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE, -- Instância padrão para o canal
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_connected_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  
  -- CONSTRAINTS CRÍTICAS
  -- Garante que cada instance_name é único por provider (evita duplicatas)
  CONSTRAINT channel_instances_name_unique UNIQUE (provider, instance_name)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_channel_instances_org ON public.channel_instances(organization_id);
CREATE INDEX IF NOT EXISTS idx_channel_instances_channel ON public.channel_instances(channel);
CREATE INDEX IF NOT EXISTS idx_channel_instances_provider ON public.channel_instances(provider);
CREATE INDEX IF NOT EXISTS idx_channel_instances_status ON public.channel_instances(status);
CREATE INDEX IF NOT EXISTS idx_channel_instances_lookup ON public.channel_instances(provider, instance_name) WHERE deleted_at IS NULL;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_channel_instances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_channel_instances_updated_at ON public.channel_instances;
CREATE TRIGGER trigger_channel_instances_updated_at
  BEFORE UPDATE ON public.channel_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_channel_instances_updated_at();

-- Comentários
COMMENT ON TABLE public.channel_instances IS 'Instâncias de canais de comunicação (WhatsApp, SMS, etc) por organização';
COMMENT ON COLUMN public.channel_instances.instance_name IS 'Nome único da instância no provider. DEVE ser único globalmente para evitar conflitos de webhook.';
COMMENT ON COLUMN public.channel_instances.provider IS 'Provider do canal: evolution, waha, twilio, vonage, etc';
COMMENT ON COLUMN public.channel_instances.is_default IS 'Se TRUE, esta instância é usada como padrão para envio neste canal';


-- ============================================================================
-- 2. TABELA: channel_contacts
-- ============================================================================
-- Contatos unificados de todos os canais

CREATE TABLE IF NOT EXISTS public.channel_contacts (
  -- Identificadores
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES public.channel_instances(id) ON DELETE CASCADE,
  
  -- Canal
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'airbnb', 'booking', 'sms', 'email', 'site', 'system')),
  
  -- Identificador externo (JID, email, phone, guest_id, etc)
  external_id TEXT NOT NULL,
  
  -- Tipo de contato
  contact_type TEXT NOT NULL DEFAULT 'user' CHECK (contact_type IN ('user', 'group', 'broadcast', 'channel', 'lid', 'unknown')),
  
  -- Dados do contato
  phone_number TEXT,
  email TEXT,
  display_name TEXT NOT NULL,
  saved_name TEXT, -- Nome salvo pelo usuário
  
  -- Perfil
  profile_picture_url TEXT,
  
  -- Flags
  is_business BOOLEAN DEFAULT FALSE,
  is_blocked BOOLEAN DEFAULT FALSE,
  
  -- Metadados específicos do canal (reserva, etc)
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  
  -- CONSTRAINTS
  -- Um external_id deve ser único por instância
  CONSTRAINT channel_contacts_external_unique UNIQUE (instance_id, external_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_channel_contacts_org ON public.channel_contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_channel_contacts_instance ON public.channel_contacts(instance_id);
CREATE INDEX IF NOT EXISTS idx_channel_contacts_phone ON public.channel_contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_channel_contacts_email ON public.channel_contacts(email);
CREATE INDEX IF NOT EXISTS idx_channel_contacts_external ON public.channel_contacts(external_id);
CREATE INDEX IF NOT EXISTS idx_channel_contacts_lookup ON public.channel_contacts(instance_id, external_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_channel_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_channel_contacts_updated_at ON public.channel_contacts;
CREATE TRIGGER trigger_channel_contacts_updated_at
  BEFORE UPDATE ON public.channel_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_channel_contacts_updated_at();

-- Comentários
COMMENT ON TABLE public.channel_contacts IS 'Contatos de todos os canais de comunicação';
COMMENT ON COLUMN public.channel_contacts.external_id IS 'Identificador externo: JID para WhatsApp, guest_id para Airbnb, email para Email, etc';
COMMENT ON COLUMN public.channel_contacts.contact_type IS 'Tipo: user (individual), group, broadcast, channel (WhatsApp Channels), lid (link ID)';


-- ============================================================================
-- 3. ATUALIZAÇÃO: conversations (adicionar campos)
-- ============================================================================
-- Adicionar campos para multi-canal na tabela existente

-- Adicionar coluna channel se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'conversations' 
    AND column_name = 'channel'
  ) THEN
    ALTER TABLE public.conversations 
    ADD COLUMN channel TEXT NOT NULL DEFAULT 'whatsapp' 
    CHECK (channel IN ('whatsapp', 'airbnb', 'booking', 'sms', 'email', 'site', 'system'));
  END IF;
END $$;

-- Adicionar coluna instance_id se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'conversations' 
    AND column_name = 'instance_id'
  ) THEN
    ALTER TABLE public.conversations ADD COLUMN instance_id UUID;
    -- Nota: Não adicionar FK ainda porque precisamos popular primeiro
  END IF;
END $$;

-- Adicionar coluna contact_id se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'conversations' 
    AND column_name = 'contact_id'
  ) THEN
    ALTER TABLE public.conversations ADD COLUMN contact_id UUID;
  END IF;
END $$;

-- Índices para novos campos
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON public.conversations(channel);
CREATE INDEX IF NOT EXISTS idx_conversations_instance ON public.conversations(instance_id);
CREATE INDEX IF NOT EXISTS idx_conversations_contact ON public.conversations(contact_id);


-- ============================================================================
-- 4. ATUALIZAÇÃO: messages (adicionar campos)
-- ============================================================================

-- Adicionar coluna channel se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'channel'
  ) THEN
    ALTER TABLE public.messages 
    ADD COLUMN channel TEXT NOT NULL DEFAULT 'whatsapp' 
    CHECK (channel IN ('whatsapp', 'airbnb', 'booking', 'sms', 'email', 'site', 'system'));
  END IF;
END $$;

-- Adicionar coluna external_id se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'external_id'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN external_id TEXT;
  END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_messages_channel ON public.messages(channel);
CREATE INDEX IF NOT EXISTS idx_messages_external ON public.messages(external_id);


-- ============================================================================
-- 5. VIEW: v_channel_instances_active
-- ============================================================================
-- View para facilitar consulta de instâncias ativas

CREATE OR REPLACE VIEW public.v_channel_instances_active AS
SELECT 
  ci.*,
  o.name as organization_name
FROM public.channel_instances ci
JOIN public.organizations o ON o.id = ci.organization_id
WHERE ci.deleted_at IS NULL
  AND ci.is_enabled = TRUE;

COMMENT ON VIEW public.v_channel_instances_active IS 'Instâncias de canal ativas (não deletadas e habilitadas)';


-- ============================================================================
-- 6. FUNÇÃO: find_instance_by_name
-- ============================================================================
-- Função para encontrar instância por nome e provider

CREATE OR REPLACE FUNCTION public.find_instance_by_name(
  p_provider TEXT,
  p_instance_name TEXT
) RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM public.channel_instances
  WHERE provider = p_provider
    AND instance_name = p_instance_name
    AND deleted_at IS NULL
    AND is_enabled = TRUE
  LIMIT 1;
  
  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.find_instance_by_name IS 'Encontra organization_id por provider e instance_name';


-- ============================================================================
-- 7. MIGRAÇÃO DE DADOS (organization_channel_config -> channel_instances)
-- ============================================================================
-- IMPORTANTE: Executar apenas uma vez!
-- Descomentar e executar manualmente após revisar

/*
INSERT INTO public.channel_instances (
  organization_id,
  channel,
  provider,
  instance_name,
  api_url,
  api_key,
  instance_token,
  status,
  connected_identifier,
  webhook_url,
  is_enabled,
  settings
)
SELECT 
  organization_id,
  'whatsapp',
  'evolution', -- Assumindo Evolution como padrão atual
  whatsapp_instance_name,
  whatsapp_evolution_api_url,
  whatsapp_evolution_api_key,
  whatsapp_instance_token,
  CASE 
    WHEN whatsapp_connection_status = 'open' THEN 'connected'
    WHEN whatsapp_connection_status = 'qr' THEN 'qr_pending'
    ELSE 'disconnected'
  END,
  whatsapp_phone_number,
  whatsapp_webhook_url,
  whatsapp_enabled,
  jsonb_build_object(
    'migrated_from', 'organization_channel_config',
    'migrated_at', NOW()::text
  )
FROM public.organization_channel_config
WHERE whatsapp_instance_name IS NOT NULL
ON CONFLICT (provider, instance_name) DO NOTHING;
*/


-- ============================================================================
-- 8. RLS (Row Level Security)
-- ============================================================================
-- NOTA: RLS desabilitado por enquanto pois organization_members não existe.
-- As edge functions usam service_role que bypassa RLS de qualquer forma.
-- Quando implementar multi-tenant com users, criar as políticas apropriadas.

-- Manter RLS desabilitado para acesso via service_role
ALTER TABLE public.channel_instances DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_contacts DISABLE ROW LEVEL SECURITY;

-- Política permissiva para service_role (edge functions)
DROP POLICY IF EXISTS "Service role full access instances" ON public.channel_instances;
CREATE POLICY "Service role full access instances" ON public.channel_instances
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access contacts" ON public.channel_contacts;
CREATE POLICY "Service role full access contacts" ON public.channel_contacts
  FOR ALL
  USING (true)
  WITH CHECK (true);


-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

-- Verificar se as tabelas foram criadas corretamente
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Chat V2 Schema - Verificação';
  RAISE NOTICE '========================================';
  
  -- Verificar channel_instances
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'channel_instances') THEN
    RAISE NOTICE '✓ Tabela channel_instances criada';
  ELSE
    RAISE WARNING '✗ Tabela channel_instances NÃO encontrada';
  END IF;
  
  -- Verificar channel_contacts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'channel_contacts') THEN
    RAISE NOTICE '✓ Tabela channel_contacts criada';
  ELSE
    RAISE WARNING '✗ Tabela channel_contacts NÃO encontrada';
  END IF;
  
  -- Verificar constraint única
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'channel_instances_name_unique'
  ) THEN
    RAISE NOTICE '✓ Constraint UNIQUE em channel_instances criada';
  ELSE
    RAISE WARNING '✗ Constraint UNIQUE NÃO encontrada';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Schema pronto para uso!';
  RAISE NOTICE '========================================';
END $$;
