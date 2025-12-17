-- ============================================================================
-- SCRIPT PARA APLICAR MIGRATION: Access/Refresh Tokens (OAuth2)
-- Data: 2025-11-26
-- Versão: v1.0.103.1010
-- ============================================================================
-- 
-- INSTRUÇÕES:
-- 1. Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql/new
-- 2. Copie TODO este conteúdo
-- 3. Cole e execute (Ctrl+Enter)
-- 4. Verifique se as colunas foram adicionadas corretamente
-- ============================================================================

-- ============================================================================
-- PASSO 1: Adicionar novas colunas (com valores padrão para compatibilidade)
-- ============================================================================

-- Adicionar colunas para access/refresh tokens
ALTER TABLE sessions 
  ADD COLUMN IF NOT EXISTS access_token TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refresh_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rotated_from UUID REFERENCES sessions(id),
  ADD COLUMN IF NOT EXISTS rotated_to UUID REFERENCES sessions(id),
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS ip_hash TEXT,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

-- ============================================================================
-- PASSO 2: Migrar dados existentes (compatibilidade)
-- ============================================================================

-- Se token antigo existe mas access_token não, copiar token para access_token
UPDATE sessions 
SET 
  access_token = token,
  access_expires_at = expires_at,
  refresh_expires_at = expires_at + INTERVAL '30 days' -- Refresh válido por 30 dias
WHERE access_token IS NULL AND token IS NOT NULL;

-- ============================================================================
-- PASSO 3: Criar índices para performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sessions_access_token ON sessions(access_token) WHERE access_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token) WHERE refresh_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_access_expires_at ON sessions(access_expires_at) WHERE access_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_expires_at ON sessions(refresh_expires_at) WHERE refresh_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_revoked_at ON sessions(revoked_at) WHERE revoked_at IS NOT NULL;

-- ============================================================================
-- PASSO 4: Constraints e validações
-- ============================================================================

-- Garantir que access_token é único (se não for NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_access_token_unique 
ON sessions(access_token) 
WHERE access_token IS NOT NULL;

-- ============================================================================
-- PASSO 5: Comentários
-- ============================================================================

COMMENT ON COLUMN sessions.access_token IS 'Token de acesso (curto, 15-30 min) - usado em todas as chamadas de API';
COMMENT ON COLUMN sessions.refresh_token IS 'Token de renovação (longo, 30-60 dias) - usado apenas para renovar access_token';
COMMENT ON COLUMN sessions.access_expires_at IS 'Data de expiração do access token';
COMMENT ON COLUMN sessions.refresh_expires_at IS 'Data de expiração do refresh token';
COMMENT ON COLUMN sessions.rotated_from IS 'ID da sessão anterior (para rotação de refresh tokens)';
COMMENT ON COLUMN sessions.rotated_to IS 'ID da sessão seguinte (para rotação de refresh tokens)';
COMMENT ON COLUMN sessions.user_agent IS 'User agent do navegador (para segurança)';
COMMENT ON COLUMN sessions.ip_hash IS 'Hash do IP do usuário (para segurança)';
COMMENT ON COLUMN sessions.revoked_at IS 'Data de revogação da sessão (logout ou segurança)';

-- ============================================================================
-- PASSO 6: Função helper para gerar tokens
-- ============================================================================

-- Função para gerar token seguro (128 caracteres)
CREATE OR REPLACE FUNCTION generate_secure_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(64), 'hex');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PASSO 7: Função para limpar sessões expiradas/revogadas
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_sessions_v2()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sessions 
  WHERE 
    (access_expires_at IS NOT NULL AND access_expires_at < NOW())
    OR (refresh_expires_at IS NOT NULL AND refresh_expires_at < NOW())
    OR (revoked_at IS NOT NULL);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_sessions_v2() IS 'Limpa sessões expiradas ou revogadas (versão 2 com access/refresh tokens)';

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Verificar se as colunas foram criadas
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'sessions' 
  AND column_name IN ('access_token', 'refresh_token', 'access_expires_at', 'refresh_expires_at', 'rotated_from', 'rotated_to', 'user_agent', 'ip_hash', 'revoked_at')
ORDER BY column_name;

-- Verificar se os índices foram criados
SELECT 
  indexname, 
  indexdef
FROM pg_indexes 
WHERE tablename = 'sessions' 
  AND indexname LIKE 'idx_sessions_%'
ORDER BY indexname;

