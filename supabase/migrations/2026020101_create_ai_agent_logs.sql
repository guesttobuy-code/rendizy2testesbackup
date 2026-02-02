-- ============================================================================
-- MIGRATION: AI Agent Execution Logs
-- Tabela para armazenar logs de execução dos agentes de IA
-- ============================================================================

-- Tabela de logs de execução
CREATE TABLE IF NOT EXISTS ai_agent_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    agent_type VARCHAR(100) NOT NULL, -- 'construtora-scraper', 'price-updater', etc.
    input_data JSONB, -- Dados de entrada (URL, params, etc.)
    output_data JSONB, -- Dados de saída (empreendimentos encontrados, etc.)
    status VARCHAR(50) NOT NULL DEFAULT 'started', -- started, running, completed, failed
    tokens_used INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_org 
    ON ai_agent_execution_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_type 
    ON ai_agent_execution_logs(agent_type);
CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_status 
    ON ai_agent_execution_logs(status);
CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_created 
    ON ai_agent_execution_logs(created_at DESC);

-- RLS: Cada organização só vê seus próprios logs
ALTER TABLE ai_agent_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations can view own AI agent logs"
    ON ai_agent_execution_logs FOR SELECT
    USING (organization_id = auth.jwt() ->> 'organization_id'::text
           OR EXISTS (
               SELECT 1 FROM profiles p 
               WHERE p.id = auth.uid() 
               AND p.organization_id = ai_agent_execution_logs.organization_id
           ));

CREATE POLICY "Organizations can insert own AI agent logs"
    ON ai_agent_execution_logs FOR INSERT
    WITH CHECK (organization_id = auth.jwt() ->> 'organization_id'::text
                OR EXISTS (
                    SELECT 1 FROM profiles p 
                    WHERE p.id = auth.uid() 
                    AND p.organization_id = ai_agent_execution_logs.organization_id
                ));

-- Service role pode fazer tudo (para edge functions)
CREATE POLICY "Service role full access to AI agent logs"
    ON ai_agent_execution_logs FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Comentários
COMMENT ON TABLE ai_agent_execution_logs IS 'Logs de execução dos agentes de IA (scraping, coleta, etc.)';
COMMENT ON COLUMN ai_agent_execution_logs.agent_type IS 'Tipo do agente: construtora-scraper, price-updater, etc.';
COMMENT ON COLUMN ai_agent_execution_logs.tokens_used IS 'Quantidade de tokens consumidos na chamada de IA';
