-- =====================================================
-- MIGRATION: Chat Marketplace (B2B Inter-Organizações)
-- Data: 2026-02-02
-- Descrição: Tabelas para conversas entre organizações
--            diferentes no marketplace (seguindo ADR-010)
-- =====================================================

-- 1. Tabela de conversas B2B entre organizações diferentes
CREATE TABLE IF NOT EXISTS re_marketplace_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Participantes (orgs diferentes)
  org_a_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  org_b_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Contexto opcional da conversa
  related_type TEXT CHECK (related_type IN ('partnership', 'demand', 'development', 'reservation', 'inquiry')),
  related_id UUID,
  
  -- Metadados
  title TEXT, -- "Parceria - Residencial Aurora"
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
  
  -- Cache do último dado para listagem rápida
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  last_message_sender_id UUID REFERENCES profiles(id),
  
  -- Contagem de não lidas (por org)
  unread_count_org_a INTEGER DEFAULT 0,
  unread_count_org_b INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Garantir que são orgs diferentes
  CONSTRAINT different_orgs CHECK (org_a_id != org_b_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_marketplace_conv_org_a ON re_marketplace_conversations(org_a_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_conv_org_b ON re_marketplace_conversations(org_b_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_conv_status ON re_marketplace_conversations(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_conv_last_msg ON re_marketplace_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_conv_related ON re_marketplace_conversations(related_type, related_id);

-- Índice único para evitar duplicatas (ordenado para consistência)
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_conv_unique_pair 
ON re_marketplace_conversations (LEAST(org_a_id, org_b_id), GREATEST(org_a_id, org_b_id))
WHERE related_type IS NULL;


-- 2. Tabela de mensagens do marketplace
CREATE TABLE IF NOT EXISTS re_marketplace_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES re_marketplace_conversations(id) ON DELETE CASCADE,
  
  -- Remetente
  sender_profile_id UUID NOT NULL REFERENCES profiles(id),
  sender_org_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Conteúdo
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'file', 'audio', 'video', 'location', 'system')),
  
  -- Anexos
  attachments JSONB DEFAULT '[]', -- [{name, url, type, size}]
  
  -- Metadados
  metadata JSONB DEFAULT '{}', -- dados extras como quoted_message_id, etc
  
  -- Status de leitura
  read_at TIMESTAMPTZ,
  read_by_profile_id UUID REFERENCES profiles(id),
  
  -- Soft delete
  deleted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_marketplace_msg_conv ON re_marketplace_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_msg_sender ON re_marketplace_messages(sender_profile_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_msg_created ON re_marketplace_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_msg_unread ON re_marketplace_messages(conversation_id, read_at) WHERE read_at IS NULL;


-- 3. Tabela de participantes (para extensibilidade futura - grupos)
CREATE TABLE IF NOT EXISTS re_marketplace_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES re_marketplace_conversations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id),
  org_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Role no chat
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  
  -- Configurações do participante
  muted_until TIMESTAMPTZ,
  pinned BOOLEAN DEFAULT false,
  
  -- Status
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  
  UNIQUE(conversation_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_part_conv ON re_marketplace_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_part_profile ON re_marketplace_participants(profile_id);


-- 4. RLS Policies
ALTER TABLE re_marketplace_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE re_marketplace_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE re_marketplace_participants ENABLE ROW LEVEL SECURITY;

-- Policies para conversas (usuário pode ver conversas da sua org)
DROP POLICY IF EXISTS "marketplace_conv_select" ON re_marketplace_conversations;
CREATE POLICY "marketplace_conv_select" ON re_marketplace_conversations
  FOR SELECT USING (
    org_a_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    OR org_b_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "marketplace_conv_insert" ON re_marketplace_conversations;
CREATE POLICY "marketplace_conv_insert" ON re_marketplace_conversations
  FOR INSERT WITH CHECK (
    org_a_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    OR org_b_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "marketplace_conv_update" ON re_marketplace_conversations;
CREATE POLICY "marketplace_conv_update" ON re_marketplace_conversations
  FOR UPDATE USING (
    org_a_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    OR org_b_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Policies para mensagens (pode ver mensagens de conversas que participa)
DROP POLICY IF EXISTS "marketplace_msg_select" ON re_marketplace_messages;
CREATE POLICY "marketplace_msg_select" ON re_marketplace_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM re_marketplace_conversations 
      WHERE org_a_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
         OR org_b_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "marketplace_msg_insert" ON re_marketplace_messages;
CREATE POLICY "marketplace_msg_insert" ON re_marketplace_messages
  FOR INSERT WITH CHECK (
    sender_profile_id = auth.uid()
    AND conversation_id IN (
      SELECT id FROM re_marketplace_conversations 
      WHERE org_a_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
         OR org_b_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "marketplace_msg_update" ON re_marketplace_messages;
CREATE POLICY "marketplace_msg_update" ON re_marketplace_messages
  FOR UPDATE USING (
    -- Só pode atualizar próprias mensagens (para soft delete) ou marcar como lida
    sender_profile_id = auth.uid()
    OR conversation_id IN (
      SELECT id FROM re_marketplace_conversations 
      WHERE org_a_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
         OR org_b_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

-- Policies para participantes
DROP POLICY IF EXISTS "marketplace_part_select" ON re_marketplace_participants;
CREATE POLICY "marketplace_part_select" ON re_marketplace_participants
  FOR SELECT USING (
    profile_id = auth.uid()
    OR conversation_id IN (
      SELECT id FROM re_marketplace_conversations 
      WHERE org_a_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
         OR org_b_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );


-- 5. Função para atualizar last_message na conversa
CREATE OR REPLACE FUNCTION update_marketplace_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE re_marketplace_conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100),
    last_message_sender_id = NEW.sender_profile_id,
    updated_at = NOW(),
    -- Incrementar unread para a org que NÃO enviou
    unread_count_org_a = CASE 
      WHEN org_a_id != NEW.sender_org_id THEN unread_count_org_a + 1 
      ELSE unread_count_org_a 
    END,
    unread_count_org_b = CASE 
      WHEN org_b_id != NEW.sender_org_id THEN unread_count_org_b + 1 
      ELSE unread_count_org_b 
    END
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_marketplace_msg_update_conv ON re_marketplace_messages;
CREATE TRIGGER trg_marketplace_msg_update_conv
  AFTER INSERT ON re_marketplace_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_conversation_last_message();


-- 6. Função para marcar mensagens como lidas e zerar contador
CREATE OR REPLACE FUNCTION mark_marketplace_conversation_as_read(
  p_conversation_id UUID,
  p_profile_id UUID
)
RETURNS void AS $$
DECLARE
  v_org_id UUID;
  v_is_org_a BOOLEAN;
BEGIN
  -- Pegar org do usuário (usando tabela users)
  SELECT organization_id INTO v_org_id FROM users WHERE id = p_profile_id;
  
  -- Verificar se é org_a ou org_b
  SELECT org_a_id = v_org_id INTO v_is_org_a 
  FROM re_marketplace_conversations 
  WHERE id = p_conversation_id;
  
  -- Marcar mensagens como lidas
  UPDATE re_marketplace_messages
  SET read_at = NOW(), read_by_profile_id = p_profile_id
  WHERE conversation_id = p_conversation_id
    AND sender_org_id != v_org_id
    AND read_at IS NULL;
  
  -- Zerar contador de unread
  IF v_is_org_a THEN
    UPDATE re_marketplace_conversations
    SET unread_count_org_a = 0
    WHERE id = p_conversation_id;
  ELSE
    UPDATE re_marketplace_conversations
    SET unread_count_org_b = 0
    WHERE id = p_conversation_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7. Função para criar ou obter conversa existente
CREATE OR REPLACE FUNCTION get_or_create_marketplace_conversation(
  p_my_org_id UUID,
  p_target_org_id UUID,
  p_related_type TEXT DEFAULT NULL,
  p_related_id UUID DEFAULT NULL,
  p_title TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_org_a UUID;
  v_org_b UUID;
BEGIN
  -- Ordenar IDs para consistência
  IF p_my_org_id < p_target_org_id THEN
    v_org_a := p_my_org_id;
    v_org_b := p_target_org_id;
  ELSE
    v_org_a := p_target_org_id;
    v_org_b := p_my_org_id;
  END IF;
  
  -- Verificar se já existe
  SELECT id INTO v_conversation_id
  FROM re_marketplace_conversations
  WHERE org_a_id = v_org_a AND org_b_id = v_org_b
    AND (
      (p_related_type IS NULL AND related_type IS NULL)
      OR (related_type = p_related_type AND related_id = p_related_id)
    )
  LIMIT 1;
  
  -- Se não existe, criar
  IF v_conversation_id IS NULL THEN
    INSERT INTO re_marketplace_conversations (
      org_a_id, org_b_id, related_type, related_id, title
    ) VALUES (
      v_org_a, v_org_b, p_related_type, p_related_id, p_title
    )
    RETURNING id INTO v_conversation_id;
  END IF;
  
  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 8. Habilitar Realtime para mensagens
ALTER PUBLICATION supabase_realtime ADD TABLE re_marketplace_messages;

-- Comentários
COMMENT ON TABLE re_marketplace_conversations IS 'Conversas B2B entre organizações diferentes no marketplace';
COMMENT ON TABLE re_marketplace_messages IS 'Mensagens das conversas do marketplace';
COMMENT ON TABLE re_marketplace_participants IS 'Participantes das conversas (para futuras extensões como grupos)';
COMMENT ON FUNCTION get_or_create_marketplace_conversation IS 'Retorna ID de conversa existente ou cria nova se não existir';
COMMENT ON FUNCTION mark_marketplace_conversation_as_read IS 'Marca todas as mensagens de uma conversa como lidas para o usuário';
