-- =====================================================
-- Migration: Fix trigger log_reservation_changes
-- =====================================================
-- 🎯 PROPÓSITO: Corrigir função do trigger que usa colunas incorretas
-- 
-- PROBLEMA: 
--   - O trigger log_reservation_changes() usa: event_type, previous_data, new_data
--   - A tabela reservation_history tem: change_type, old_values, new_values
--   - Isso causa "column event_type does not exist" ao atualizar reservas
--
-- SOLUÇÃO: Recriar a função com as colunas corretas
-- =====================================================

-- Corrigir função log_reservation_changes para usar as colunas corretas
CREATE OR REPLACE FUNCTION log_reservation_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Só loga se houve mudança real
  IF TG_OP = 'UPDATE' AND OLD IS DISTINCT FROM NEW THEN
    INSERT INTO reservation_history (
      reservation_id,
      change_type,
      change_reason,
      old_values,
      new_values,
      changed_by_type,
      source
    ) VALUES (
      NEW.id,
      CASE 
        WHEN OLD.status IS DISTINCT FROM NEW.status THEN NEW.status
        WHEN OLD.check_in IS DISTINCT FROM NEW.check_in OR OLD.check_out IS DISTINCT FROM NEW.check_out THEN 'dates_changed'
        WHEN OLD.pricing_total IS DISTINCT FROM NEW.pricing_total THEN 'price_changed'
        ELSE 'modified'
      END,
      'Reserva atualizada automaticamente',
      to_jsonb(OLD),
      to_jsonb(NEW),
      'system',
      'trigger'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
-- ✅ Agora o cancelamento de reservas vai funcionar!
