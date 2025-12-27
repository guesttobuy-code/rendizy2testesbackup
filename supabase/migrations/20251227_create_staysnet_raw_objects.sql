-- 20251227_create_staysnet_raw_objects.sql
-- Objetivo: persistir TODO o JSON bruto retornado pela Stays (reservations, clients, listings, finance, etc)
-- em uma tabela única, versionada por hash, para auditoria e uso futuro.

CREATE TABLE IF NOT EXISTS staysnet_raw_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- domínio lógico do payload (ex: 'reservations', 'clients', 'listings', 'finance')
  domain text NOT NULL,

  -- identificadores do objeto no mundo Stays
  external_id text NULL,
  external_code text NULL,

  -- endpoint/origem do payload (ex: '/booking/reservations/{id}')
  endpoint text NULL,

  -- payload bruto (fonte de verdade)
  payload jsonb NOT NULL,

  -- hash do payload para deduplicação/versionamento
  payload_hash text NOT NULL,

  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS staysnet_raw_objects_org_domain_idx
  ON staysnet_raw_objects (organization_id, domain);

CREATE INDEX IF NOT EXISTS staysnet_raw_objects_external_id_idx
  ON staysnet_raw_objects (organization_id, domain, external_id);

CREATE UNIQUE INDEX IF NOT EXISTS staysnet_raw_objects_dedupe_idx
  ON staysnet_raw_objects (organization_id, domain, external_id, payload_hash);

-- RLS
ALTER TABLE staysnet_raw_objects ENABLE ROW LEVEL SECURITY;

-- Mantém padrão do projeto: permitir operações via service role/Edge Functions.
DROP POLICY IF EXISTS "Allow all operations via service role" ON staysnet_raw_objects;
CREATE POLICY "Allow all operations via service role"
ON staysnet_raw_objects
FOR ALL
USING (true)
WITH CHECK (true);

COMMENT ON TABLE staysnet_raw_objects IS 'Armazena payload bruto da Stays (JSON) por dominio/objeto, com versionamento por hash.';
COMMENT ON COLUMN staysnet_raw_objects.payload IS 'JSON bruto retornado pela Stays; não normalizado.';
COMMENT ON COLUMN staysnet_raw_objects.payload_hash IS 'SHA-256 do payload (string JSON) para deduplicação/versionamento.';
