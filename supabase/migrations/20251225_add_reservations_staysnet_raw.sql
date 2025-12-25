-- ============================================================================
-- MIGRAÇÃO: Persistir payload bruto da Stays.net em reservations
-- Data: 25/12/2025
-- Objetivo: garantir que TODO JSON de origem fique salvo (debug/auditoria)
-- ============================================================================

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS staysnet_raw JSONB;

COMMENT ON COLUMN reservations.staysnet_raw IS 'Payload bruto da reserva vindo da Stays.net (JSONB)';
