-- 20260110_create_staysnet_sync_log.sql
-- Tabela para registrar execuções do cron de sync de propriedades Stays.net

CREATE TABLE IF NOT EXISTS staysnet_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL DEFAULT 'properties_cron',
  stays_count INTEGER DEFAULT 0,
  rendizy_count INTEGER DEFAULT 0,
  new_count INTEGER DEFAULT 0,
  imported_count INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para consultas comuns
CREATE INDEX IF NOT EXISTS idx_staysnet_sync_log_org_id ON staysnet_sync_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_staysnet_sync_log_executed_at ON staysnet_sync_log(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_staysnet_sync_log_sync_type ON staysnet_sync_log(sync_type);

-- RLS
ALTER TABLE staysnet_sync_log ENABLE ROW LEVEL SECURITY;

-- Policy: usuários autenticados veem logs de sua organização
CREATE POLICY staysnet_sync_log_select ON staysnet_sync_log
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: service role pode fazer tudo
CREATE POLICY staysnet_sync_log_service ON staysnet_sync_log
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE staysnet_sync_log IS 'Log de execuções do cron de sincronização de propriedades Stays.net';
COMMENT ON COLUMN staysnet_sync_log.sync_type IS 'Tipo de sync: properties_cron, reservations_cron, etc.';
COMMENT ON COLUMN staysnet_sync_log.stays_count IS 'Total de propriedades na Stays.net no momento do sync';
COMMENT ON COLUMN staysnet_sync_log.rendizy_count IS 'Total de propriedades no Rendizy antes do sync';
COMMENT ON COLUMN staysnet_sync_log.new_count IS 'Quantidade de propriedades novas detectadas';
COMMENT ON COLUMN staysnet_sync_log.imported_count IS 'Quantidade de propriedades importadas com sucesso';
COMMENT ON COLUMN staysnet_sync_log.errors IS 'Lista de erros ocorridos durante o sync';
