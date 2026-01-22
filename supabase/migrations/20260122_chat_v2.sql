-- ============================================
-- RENDIZY - Chat V2 Migration
-- 
-- Cria estrutura de banco para sistema de chat unificado
-- Suporta múltiplos canais: WhatsApp, Airbnb, Booking, SMS, Email
--
-- @version 2.0.2
-- @date 2026-01-22
-- ============================================

-- ============================================
-- 0. LIMPEZA (Dropar objetos existentes)
-- ============================================

-- Dropar tabelas primeiro (CASCADE remove triggers e policies automaticamente)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_channel_configs CASCADE;
DROP TABLE IF EXISTS chat_conversations CASCADE;

-- Dropar funções
DROP FUNCTION IF EXISTS update_conversation_on_new_message() CASCADE;
DROP FUNCTION IF EXISTS update_chat_channel_configs_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_chat_conversations_updated_at() CASCADE;
DROP FUNCTION IF EXISTS get_or_create_conversation(UUID, TEXT, TEXT, TEXT, TEXT) CASCADE;

-- ============================================
-- 1. TABELA DE CONVERSAS
-- ============================================

CREATE TABLE chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Identificação do canal
    channel_type TEXT NOT NULL CHECK (channel_type IN ('whatsapp', 'airbnb', 'booking', 'sms', 'email')),
    external_id TEXT NOT NULL, -- ID no sistema externo (JID do WhatsApp, thread do Airbnb, etc)
    
    -- Contato
    contact_name TEXT,
    contact_identifier TEXT NOT NULL, -- telefone, email, userId
    contact_avatar_url TEXT,
    
    -- Contexto de negócio
    reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    
    -- Estado
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived', 'spam')),
    unread_count INTEGER NOT NULL DEFAULT 0,
    
    -- Última mensagem (desnormalizado para performance)
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    last_message_direction TEXT CHECK (last_message_direction IN ('inbound', 'outbound')),
    
    -- Atribuição
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Metadados
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Índice único para evitar duplicatas
    UNIQUE(organization_id, channel_type, external_id)
);

-- Índices para buscas comuns
CREATE INDEX IF NOT EXISTS idx_chat_conversations_org_status 
    ON chat_conversations(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_org_channel 
    ON chat_conversations(organization_id, channel_type);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_org_last_message 
    ON chat_conversations(organization_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_contact_identifier 
    ON chat_conversations(contact_identifier);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_reservation 
    ON chat_conversations(reservation_id) WHERE reservation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_conversations_property 
    ON chat_conversations(property_id) WHERE property_id IS NOT NULL;

-- ============================================
-- 2. TABELA DE MENSAGENS
-- ============================================

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Identificação externa
    external_id TEXT, -- ID no sistema externo
    
    -- Direção e tipo
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'audio', 'video', 'document', 'location', 'contact', 'sticker')),
    
    -- Conteúdo
    content TEXT, -- Texto ou descrição
    
    -- Mídia
    media_url TEXT,
    media_mime_type TEXT,
    media_file_name TEXT,
    media_file_size INTEGER,
    media_thumbnail_url TEXT,
    
    -- Status de entrega
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    
    -- Remetente
    sender_name TEXT,
    sender_identifier TEXT,
    sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Se enviado por usuário do sistema
    
    -- Timestamps
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    
    -- Metadados
    metadata JSONB DEFAULT '{}',
    
    -- Criação
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para buscas comuns
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation 
    ON chat_messages(conversation_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_org 
    ON chat_messages(organization_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_external_id 
    ON chat_messages(external_id) WHERE external_id IS NOT NULL;

-- ============================================
-- 3. TABELA DE CONFIGURAÇÃO DE CANAIS
-- ============================================

CREATE TABLE chat_channel_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    channel_type TEXT NOT NULL CHECK (channel_type IN ('whatsapp', 'airbnb', 'booking', 'sms', 'email')),
    
    -- Estado
    enabled BOOLEAN NOT NULL DEFAULT false,
    connected BOOLEAN NOT NULL DEFAULT false,
    last_connected_at TIMESTAMPTZ,
    
    -- Configurações específicas do canal (variam por tipo)
    config JSONB NOT NULL DEFAULT '{}',
    -- WhatsApp: { api_url, instance_name, api_key }
    -- Airbnb: { access_token, refresh_token, listing_ids }
    -- Booking: { api_key, hotel_id }
    -- SMS: { provider, api_key, phone_number }
    -- Email: { smtp_host, smtp_port, username, password }
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(organization_id, channel_type)
);

-- ============================================
-- 4. TRIGGERS PARA UPDATED_AT
-- ============================================

-- Trigger para chat_conversations
CREATE OR REPLACE FUNCTION update_chat_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_chat_conversations_updated_at ON chat_conversations;
CREATE TRIGGER trigger_chat_conversations_updated_at
    BEFORE UPDATE ON chat_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_conversations_updated_at();

-- Trigger para chat_channel_configs
CREATE OR REPLACE FUNCTION update_chat_channel_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_chat_channel_configs_updated_at ON chat_channel_configs;
CREATE TRIGGER trigger_chat_channel_configs_updated_at
    BEFORE UPDATE ON chat_channel_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_channel_configs_updated_at();

-- ============================================
-- 5. TRIGGER PARA ATUALIZAR CONVERSA NA NOVA MENSAGEM
-- ============================================

CREATE OR REPLACE FUNCTION update_conversation_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_conversations
    SET 
        last_message_at = NEW.sent_at,
        last_message_preview = LEFT(NEW.content, 100),
        last_message_direction = NEW.direction,
        unread_count = CASE 
            WHEN NEW.direction = 'inbound' THEN unread_count + 1 
            ELSE unread_count 
        END,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_on_new_message ON chat_messages;
CREATE TRIGGER trigger_update_conversation_on_new_message
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_on_new_message();

-- ============================================
-- 6. RLS (Row Level Security)
-- ============================================

-- Habilitar RLS
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_channel_configs ENABLE ROW LEVEL SECURITY;

-- Políticas para chat_conversations
DROP POLICY IF EXISTS chat_conversations_select ON chat_conversations;
CREATE POLICY chat_conversations_select ON chat_conversations
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND type = 'superadmin'
        )
    );

DROP POLICY IF EXISTS chat_conversations_insert ON chat_conversations;
CREATE POLICY chat_conversations_insert ON chat_conversations
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND type = 'superadmin'
        )
    );

DROP POLICY IF EXISTS chat_conversations_update ON chat_conversations;
CREATE POLICY chat_conversations_update ON chat_conversations
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND type = 'superadmin'
        )
    );

-- Políticas para chat_messages
DROP POLICY IF EXISTS chat_messages_select ON chat_messages;
CREATE POLICY chat_messages_select ON chat_messages
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND type = 'superadmin'
        )
    );

DROP POLICY IF EXISTS chat_messages_insert ON chat_messages;
CREATE POLICY chat_messages_insert ON chat_messages
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND type = 'superadmin'
        )
    );

-- Políticas para chat_channel_configs
DROP POLICY IF EXISTS chat_channel_configs_select ON chat_channel_configs;
CREATE POLICY chat_channel_configs_select ON chat_channel_configs
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND type = 'superadmin'
        )
    );

DROP POLICY IF EXISTS chat_channel_configs_all ON chat_channel_configs;
CREATE POLICY chat_channel_configs_all ON chat_channel_configs
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND type = 'superadmin'
        )
    );

-- ============================================
-- 7. FUNÇÃO PARA BUSCAR OU CRIAR CONVERSA
-- ============================================

CREATE OR REPLACE FUNCTION get_or_create_conversation(
    p_organization_id UUID,
    p_channel_type TEXT,
    p_external_id TEXT,
    p_contact_name TEXT DEFAULT NULL,
    p_contact_identifier TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_conversation_id UUID;
BEGIN
    -- Tentar encontrar conversa existente
    SELECT id INTO v_conversation_id
    FROM chat_conversations
    WHERE organization_id = p_organization_id
      AND channel_type = p_channel_type
      AND external_id = p_external_id;
    
    -- Se não existir, criar nova
    IF v_conversation_id IS NULL THEN
        INSERT INTO chat_conversations (
            organization_id,
            channel_type,
            external_id,
            contact_name,
            contact_identifier
        ) VALUES (
            p_organization_id,
            p_channel_type,
            p_external_id,
            COALESCE(p_contact_name, 'Desconhecido'),
            COALESCE(p_contact_identifier, p_external_id)
        )
        RETURNING id INTO v_conversation_id;
    END IF;
    
    RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. COMENTÁRIOS
-- ============================================

COMMENT ON TABLE chat_conversations IS 'Conversas unificadas de todos os canais de comunicação';
COMMENT ON TABLE chat_messages IS 'Mensagens de todas as conversas';
COMMENT ON TABLE chat_channel_configs IS 'Configuração de canais de comunicação por organização';

COMMENT ON COLUMN chat_conversations.channel_type IS 'Tipo do canal: whatsapp, airbnb, booking, sms, email';
COMMENT ON COLUMN chat_conversations.external_id IS 'ID da conversa no sistema externo (JID do WhatsApp, thread do Airbnb, etc)';
COMMENT ON COLUMN chat_messages.direction IS 'Direção da mensagem: inbound (recebida) ou outbound (enviada)';
COMMENT ON COLUMN chat_messages.content_type IS 'Tipo de conteúdo: text, image, audio, video, document, location, contact, sticker';

-- ============================================
-- FIM DA MIGRATION
-- ============================================
