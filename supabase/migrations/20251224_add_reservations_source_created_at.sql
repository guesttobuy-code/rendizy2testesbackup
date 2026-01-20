-- ============================================================================
-- MIGRAÇÃO: Adicionar source_created_at em reservations
-- Data: 24/12/2025
-- Objetivo: Persistir data de criação da reserva na plataforma de origem (ex: StaysNet)
-- ============================================================================

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS source_created_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_reservations_source_created_at
  ON reservations(source_created_at DESC)
  WHERE source_created_at IS NOT NULL;
