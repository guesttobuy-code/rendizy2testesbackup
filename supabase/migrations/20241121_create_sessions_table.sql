-- ============================================================================
-- MIGRAÇÃO: Tabela de Sessões
-- Data: 2024-11-21
-- Descrição: Cria tabela de sessões para autenticação usando SQL
-- ============================================================================

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('superadmin', 'imobiliaria', 'staff')),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Índices
  CONSTRAINT sessions_token_unique UNIQUE (token)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_organization_id ON sessions(organization_id);

-- Trigger para atualizar last_activity (se necessário no futuro)
-- Por enquanto, será atualizado manualmente nas rotas

-- Função para limpar sessões expiradas (útil para manutenção)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON TABLE sessions IS 'Tabela de sessões de autenticação do sistema';
COMMENT ON COLUMN sessions.token IS 'Token único de autenticação';
COMMENT ON COLUMN sessions.user_id IS 'ID do usuário autenticado';
COMMENT ON COLUMN sessions.expires_at IS 'Data e hora de expiração da sessão';

