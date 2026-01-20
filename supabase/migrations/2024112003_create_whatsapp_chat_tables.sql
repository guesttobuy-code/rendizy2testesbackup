-- ============================================================================
-- MIGRAÇÃO: Tabelas para Chat WhatsApp (SQL Relacional)
-- Data: 20/11/2025
-- Versão: v1.0.103.970
-- ============================================================================
-- 
-- Migra conversas e mensagens do WhatsApp de KV Store para tabelas SQL
-- Garante persistência permanente e integridade referencial
--
-- ============================================================================

-- ============================================================================
-- TABELA: conversations
-- Armazena conversas (WhatsApp, Email, SMS, etc)
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  
  -- Dados do contato
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  
  -- Canal e status
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms', 'internal')),
  status TEXT DEFAULT 'normal' CHECK (status IN ('pinned', 'urgent', 'normal', 'resolved')),
  category TEXT DEFAULT 'normal',
  conversation_type TEXT DEFAULT 'guest' CHECK (conversation_type IN ('guest', 'staff', 'system')),
  
  -- Mensagens
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,
  
  -- Metadados externos
  external_conversation_id TEXT, -- ID do WhatsApp (remoteJid)
  last_channel TEXT,
  channel_metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_org_external_conversation UNIQUE(organization_id, external_conversation_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conversations_org ON conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_guest_phone ON conversations(guest_phone);
CREATE INDEX IF NOT EXISTS idx_conversations_external_id ON conversations(external_conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_unread ON conversations(organization_id, unread_count) WHERE unread_count > 0;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversations_updated_at();

-- ============================================================================
-- TABELA: messages
-- Armazena mensagens individuais de conversas
-- ============================================================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  
  -- Dados do remetente
  sender_type TEXT NOT NULL CHECK (sender_type IN ('guest', 'staff', 'system')),
  sender_name TEXT NOT NULL,
  sender_id TEXT,
  
  -- Conteúdo
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  
  -- Canal e direção
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms', 'internal')),
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  
  -- Metadados externos
  external_id TEXT, -- ID da mensagem no WhatsApp (Evolution API)
  external_status TEXT CHECK (external_status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  external_error TEXT,
  
  -- Status e timestamps
  sent_at TIMESTAMPTZ NOT NULL,
  read_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  -- Metadata adicional
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_org_external_message UNIQUE(organization_id, external_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_org ON messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel);
CREATE INDEX IF NOT EXISTS idx_messages_external_id ON messages(external_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, read_at) WHERE read_at IS NULL;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_messages_updated_at();

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON TABLE conversations IS 'Armazena conversas de todos os canais (WhatsApp, Email, SMS, etc)';
COMMENT ON TABLE messages IS 'Armazena mensagens individuais de conversas';
COMMENT ON COLUMN conversations.external_conversation_id IS 'ID externo da conversa (ex: remoteJid do WhatsApp)';
COMMENT ON COLUMN messages.external_id IS 'ID externo da mensagem (ex: messageId do WhatsApp)';

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Tabelas de chat WhatsApp criadas com sucesso!';
  RAISE NOTICE '   - conversations';
  RAISE NOTICE '   - messages';
END $$;

