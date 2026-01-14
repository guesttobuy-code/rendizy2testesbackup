-- ============================================================================
-- MIGRAÇÃO: Identidade canônica de reservas (multi-canal)
-- Data: 28/12/2025
-- Objetivo:
--   - Garantir unicidade por (organization_id, platform, external_id)
--   - Permitir UPSERT por chave externa, mantendo reservations.id como ID interno
--   - Não força formato do id ainda (compat/legado)
-- ============================================================================

-- 1) Índice/constraint de unicidade por chave externa
-- Observação: em alguns ambientes isso já existe manualmente.
-- Postgres suporta IF NOT EXISTS para índices, evitando DO/EXECUTE e problemas de quoting.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_reservations_org_platform_external_id
ON public.reservations(organization_id, platform, external_id)
;

-- 2) Índice auxiliar para resolver por organization_id + platform + external_id
CREATE INDEX IF NOT EXISTS idx_reservations_org_platform_external_id
ON public.reservations(organization_id, platform, external_id)
;
