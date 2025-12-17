-- ============================================================================
-- MIGRATION: Criar tabela function_logs para logging estruturado
-- Data: 2025-11-20
-- Versão: 1.0.103.1001 - LOGGING ESTRUTURADO
-- ============================================================================
-- 
-- OBJETIVO:
-- Criar tabela SQL para logs de Edge Functions
-- Suporta Realtime para notificações em tempo real
-- Permite auditoria e rastreamento de erros
-- ============================================================================

-- ============================================================================
-- PASSO 1: Criar tabela function_logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS function_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação da função
  function_name TEXT NOT NULL,
  
  -- Nível do log
  level TEXT NOT NULL CHECK (level IN ('error', 'warning', 'info', 'debug')),
  
  -- Mensagem do log
  message TEXT NOT NULL,
  
  -- Metadata adicional (JSON)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Índices para busca rápida
  CONSTRAINT idx_function_logs_function_name CHECK (function_name IS NOT NULL),
  CONSTRAINT idx_function_logs_level CHECK (level IS NOT NULL)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_function_logs_function_name ON function_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_function_logs_level ON function_logs(level);
CREATE INDEX IF NOT EXISTS idx_function_logs_created_at ON function_logs(created_at DESC);

-- Índice composto para queries comuns
CREATE INDEX IF NOT EXISTS idx_function_logs_function_level_time ON function_logs(function_name, level, created_at DESC);

-- ============================================================================
-- PASSO 2: Row Level Security (RLS)
-- ============================================================================

ALTER TABLE function_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Apenas service_role pode inserir (Edge Functions)
DROP POLICY IF EXISTS "Allow service role to insert logs" ON function_logs;
CREATE POLICY "Allow service role to insert logs" 
ON function_logs 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Policy: Todos podem ler (para Realtime e dashboards)
DROP POLICY IF EXISTS "Allow all to read logs" ON function_logs;
CREATE POLICY "Allow all to read logs" 
ON function_logs 
FOR SELECT 
TO authenticated
USING (true);

-- Policy: Apenas service_role pode deletar (manutenção)
DROP POLICY IF EXISTS "Allow service role to delete logs" ON function_logs;
CREATE POLICY "Allow service role to delete logs" 
ON function_logs 
FOR DELETE 
TO service_role
USING (true);

-- ============================================================================
-- PASSO 3: Trigger para Realtime (opcional)
-- ============================================================================

-- Se quiser notificações Realtime automáticas
-- CREATE PUBLICATION supabase_realtime FOR TABLE function_logs;
-- Nota: Verificar se Realtime está habilitado no projeto

-- ============================================================================
-- PASSO 4: Função para limpar logs antigos (manutenção)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_function_logs()
RETURNS void AS $$
BEGIN
  -- Deletar logs com mais de 30 dias (ajuste conforme necessário)
  DELETE FROM function_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON TABLE function_logs IS 'Logs estruturados de Edge Functions para auditoria e debug';
COMMENT ON COLUMN function_logs.function_name IS 'Nome da Edge Function (ex: rendizy-server/auth/login)';
COMMENT ON COLUMN function_logs.level IS 'Nível do log: error, warning, info, debug';
COMMENT ON COLUMN function_logs.metadata IS 'Metadata adicional em JSON (stack trace, request info, etc.)';

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 20241120_create_function_logs_table concluída';
  RAISE NOTICE '   - Tabela function_logs criada';
  RAISE NOTICE '   - RLS policies configuradas';
  RAISE NOTICE '   - Índices criados';
  RAISE NOTICE '';
  RAISE NOTICE '📋 PRÓXIMO PASSO:';
  RAISE NOTICE '   - Usar logErrorToDatabase() nas Edge Functions';
  RAISE NOTICE '   - Configurar Realtime channel no frontend (opcional)';
END $$;

