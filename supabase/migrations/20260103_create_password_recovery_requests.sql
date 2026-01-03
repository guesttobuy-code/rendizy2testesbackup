-- ============================================================================
-- MIGRAÇÃO: Password recovery (recuperação de senha)
-- Data: 2026-01-03
-- Objetivo:
--  - Permitir fluxo de recuperação de senha para usuários da tabela users
--  - Guardar códigos/tokens de forma segura (hash), com expiração e uso único
-- ============================================================================

CREATE TABLE IF NOT EXISTS password_recovery_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Guardamos APENAS hashes (nunca código/token em texto puro)
  code_hash TEXT NOT NULL,
  token_hash TEXT NOT NULL,

  -- Controle
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,

  -- Auditoria básica (opcional)
  request_ip TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_password_recovery_user_id ON password_recovery_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_password_recovery_expires_at ON password_recovery_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_recovery_used_at ON password_recovery_requests(used_at);
CREATE INDEX IF NOT EXISTS idx_password_recovery_token_hash ON password_recovery_requests(token_hash);

COMMENT ON TABLE password_recovery_requests IS 'Solicitações de recuperação de senha (hash de código/token, expiração e uso único).';
