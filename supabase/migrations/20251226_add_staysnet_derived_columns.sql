-- ============================================================================
-- MIGRAÇÃO: Colunas derivadas Stays.net (reservations + guests)
-- Data: 26/12/2025
-- Objetivo:
-- - Evitar depender de JSONB para joins/consultas frequentes
-- - Não confundir IDs internos do Rendizy com IDs externos do Stays
-- - Manter staysnet_raw como fonte de verdade, mas expor chaves/atributos principais
-- ============================================================================

-- ============================================================================
-- 1) reservations: chaves e campos Stays derivados
-- ============================================================================

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS staysnet_listing_id TEXT,
  ADD COLUMN IF NOT EXISTS staysnet_client_id TEXT,
  ADD COLUMN IF NOT EXISTS staysnet_reservation_code TEXT,
  ADD COLUMN IF NOT EXISTS staysnet_partner_code TEXT,
  ADD COLUMN IF NOT EXISTS staysnet_partner_id TEXT,
  ADD COLUMN IF NOT EXISTS staysnet_partner_name TEXT,
  ADD COLUMN IF NOT EXISTS staysnet_type TEXT;

COMMENT ON COLUMN reservations.staysnet_listing_id IS 'ID do listing/imóvel na Stays (ex.: staysnet_raw._idlisting)';
COMMENT ON COLUMN reservations.staysnet_client_id IS 'ID do cliente na Stays (ex.: staysnet_raw._idclient)';
COMMENT ON COLUMN reservations.staysnet_reservation_code IS 'Código curto da reserva na Stays (ex.: staysnet_raw.id)';
COMMENT ON COLUMN reservations.staysnet_partner_code IS 'Código do parceiro/canal na Stays (ex.: staysnet_raw.partnerCode)';
COMMENT ON COLUMN reservations.staysnet_partner_id IS 'ID do parceiro/canal na Stays (ex.: staysnet_raw.partner._id)';
COMMENT ON COLUMN reservations.staysnet_partner_name IS 'Nome do parceiro/canal na Stays (ex.: staysnet_raw.partner.name)';
COMMENT ON COLUMN reservations.staysnet_type IS 'Tipo macro na Stays (ex.: staysnet_raw.type = booked/canceled/blocked etc)';

CREATE INDEX IF NOT EXISTS idx_reservations_staysnet_listing_id
ON reservations(staysnet_listing_id)
WHERE staysnet_listing_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_staysnet_client_id
ON reservations(staysnet_client_id)
WHERE staysnet_client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_staysnet_partner_code
ON reservations(staysnet_partner_code)
WHERE staysnet_partner_code IS NOT NULL;

-- ============================================================================
-- 2) guests: chave Stays e JSONB raw opcional
-- ============================================================================

ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS staysnet_client_id TEXT,
  ADD COLUMN IF NOT EXISTS staysnet_raw JSONB;

COMMENT ON COLUMN public.guests.staysnet_client_id IS 'ID do cliente na Stays (ex.: reservations.staysnet_client_id)';
COMMENT ON COLUMN public.guests.staysnet_raw IS 'Payload bruto do hóspede/cliente vindo da Stays (quando disponível)';

CREATE UNIQUE INDEX IF NOT EXISTS uidx_guests_org_staysnet_client_id
ON public.guests(organization_id, staysnet_client_id)
WHERE staysnet_client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guests_staysnet_raw_gin
ON public.guests USING GIN (staysnet_raw)
WHERE staysnet_raw IS NOT NULL;

-- ============================================================================
-- FIM
-- ============================================================================
