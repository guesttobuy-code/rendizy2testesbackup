-- Migration: Blindagem canônica - reservas SEMPRE vinculadas a imóvel
-- Data: 2025-12-28
-- Objetivo:
--  1) Deletar reservas órfãs (sem property_id, property inexistente, ou org mismatch)
--  2) Impedir para sempre novas reservas órfãs (NOT NULL + trigger)
--
-- IMPORTANTE:
--  - A FK reservations.property_id -> properties(id) já deve existir (ver 20251226_fix_fk_reservations_blocks_to_properties.sql)
--  - A FK garante existência (quando property_id não é NULL) e cascade em delete.
--  - O trigger abaixo também bloqueia mismatch de organization_id.

-- 0) Limpeza imediata: remove reservas que não possuem imóvel válido
DELETE FROM public.reservations r
WHERE
  r.property_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM public.properties a WHERE a.id = r.property_id)
  OR EXISTS (
    SELECT 1
    FROM public.properties a
    WHERE a.id = r.property_id
      AND a.organization_id IS DISTINCT FROM r.organization_id
  );

-- 1) Função de validação (bloqueia criação/atualização inválida)
CREATE OR REPLACE FUNCTION public.enforce_reservation_property_link()
RETURNS TRIGGER AS $$
DECLARE
  prop_org uuid;
BEGIN
  IF NEW.property_id IS NULL THEN
    RAISE EXCEPTION 'RESERVATION_ORPHAN_FORBIDDEN: property_id é obrigatório'
      USING ERRCODE = 'not_null_violation';
  END IF;

  SELECT a.organization_id INTO prop_org
  FROM public.properties a
  WHERE a.id = NEW.property_id;

  IF prop_org IS NULL THEN
    RAISE EXCEPTION 'RESERVATION_ORPHAN_FORBIDDEN: property_id não existe em properties (%).', NEW.property_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF prop_org IS DISTINCT FROM NEW.organization_id THEN
    RAISE EXCEPTION 'RESERVATION_ORPHAN_FORBIDDEN: org mismatch (reservation.org=% property.org=%).', NEW.organization_id, prop_org
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_reservation_property_link ON public.reservations;
CREATE TRIGGER trg_enforce_reservation_property_link
BEFORE INSERT OR UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.enforce_reservation_property_link();

-- 2) Tornar property_id obrigatório (depois da limpeza)
ALTER TABLE public.reservations
  ALTER COLUMN property_id SET NOT NULL;
