-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║           CONVERSATION ACTIVITY LOGS - MIGRATION SCRIPT                   ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
-- 
-- Execute este script no SQL Editor do Supabase Dashboard
-- 
-- @version 1.0.0
-- @date 2026-01-30
-- 
-- TABELA: conversation_activity_logs
-- - Armazena histórico de ações feitas em conversas do chat
-- - Tipos de ação: quotation, checkin_status, observation, reservation, deal_created, block_created, message_sent
-- - Cada ação tem dados específicos em JSONB (action_data)
-- - Logs são públicos para toda a organização
-- 

-- ============================================================================
-- CRIAR TABELA
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversation_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    contact_phone TEXT NOT NULL,
    action_type TEXT NOT NULL,
    action_data JSONB DEFAULT '{}',
    user_id UUID,
    user_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentários
COMMENT ON TABLE conversation_activity_logs IS 'Histórico de atividades/ações realizadas em conversas do chat';
COMMENT ON COLUMN conversation_activity_logs.contact_phone IS 'Telefone do contato (normalizado, sem @s.whatsapp.net)';
COMMENT ON COLUMN conversation_activity_logs.action_type IS 'Tipo de ação: quotation, checkin_status, observation, reservation, deal_created, block_created, message_sent';
COMMENT ON COLUMN conversation_activity_logs.action_data IS 'Dados específicos da ação em formato JSON';

-- ============================================================================
-- ÍNDICES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_conv_activity_org_phone 
    ON conversation_activity_logs(organization_id, contact_phone);

CREATE INDEX IF NOT EXISTS idx_conv_activity_created 
    ON conversation_activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conv_activity_type 
    ON conversation_activity_logs(action_type);

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================

ALTER TABLE conversation_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Permitir SELECT para todos (autenticado ou não) - logs são da organização
-- A filtragem real acontece pela query (organization_id)
CREATE POLICY "Allow select for all"
    ON conversation_activity_logs
    FOR SELECT
    USING (true);

-- Policy: Permitir INSERT para todos - o frontend valida a organização
-- A validação real acontece no código (useAuth verifica org)
CREATE POLICY "Allow insert for all"
    ON conversation_activity_logs
    FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

-- Verificar se a tabela foi criada
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'conversation_activity_logs'
ORDER BY ordinal_position;

-- ============================================================================
-- EXEMPLO DE USO (para teste)
-- ============================================================================

-- INSERT INTO conversation_activity_logs (
--     organization_id,
--     contact_phone,
--     action_type,
--     action_data,
--     user_id,
--     user_name
-- ) VALUES (
--     '00000000-0000-0000-0000-000000000000', -- Substituir pelo ID real
--     '5511999998888',
--     'checkin_status',
--     '{"property_name": "Ap. Centro", "new_status": "completed", "guest_name": "João Silva"}'::jsonb,
--     NULL,
--     'Admin'
-- );
