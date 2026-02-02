-- =====================================================
-- Migration 10: Trigger para Histórico de Reservas
-- =====================================================
-- 🎯 PROPÓSITO: Criar trigger de audit log APÓS tabela existir
-- 📋 ADR: ADR-002-OTA-UNIVERSAL-SCHEMA
-- 
-- ⚠️ IMPORTANTE: Esta migration DEVE ser executada APÓS migration 09!
-- O PostgreSQL valida funções no momento da criação, então a
-- tabela reservation_history precisa já existir e estar commitada.
-- 
-- DEPENDÊNCIAS:
--   - Migration 09: reservation_history deve existir
-- =====================================================

-- =====================================================
-- 1. FUNÇÃO DE LOG AUTOMÁTICO
-- =====================================================
-- 🌐 UNIVERSAL: Registra automaticamente mudanças em reservas
-- =====================================================

CREATE OR REPLACE FUNCTION log_reservation_change()
RETURNS TRIGGER AS $$
DECLARE
  v_change_type TEXT;
  v_old_vals JSONB;
  v_new_vals JSONB;
BEGIN
  -- Determinar tipo de mudança
  IF TG_OP = 'INSERT' THEN
    v_change_type := 'created';
    v_old_vals := NULL;
    v_new_vals := to_jsonb(NEW);
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'confirmed' THEN
        v_change_type := 'confirmed';
      ELSIF NEW.status = 'checked_in' THEN
        v_change_type := 'checked_in';
      ELSIF NEW.status = 'checked_out' THEN
        v_change_type := 'checked_out';
      ELSIF NEW.status = 'cancelled' THEN
        v_change_type := 'cancelled';
      ELSIF NEW.status = 'no_show' THEN
        v_change_type := 'no_show';
      ELSE
        v_change_type := 'status_changed';
      END IF;
      
    -- Date changes
    ELSIF OLD.check_in IS DISTINCT FROM NEW.check_in 
       OR OLD.check_out IS DISTINCT FROM NEW.check_out THEN
      v_change_type := 'dates_changed';
      
    -- Guest changes
    ELSIF OLD.guests_adults IS DISTINCT FROM NEW.guests_adults 
       OR OLD.guests_children IS DISTINCT FROM NEW.guests_children THEN
      v_change_type := 'guests_changed';
      
    -- Price changes
    ELSIF OLD.pricing_total IS DISTINCT FROM NEW.pricing_total THEN
      v_change_type := 'price_adjusted';
      
    -- Payment changes
    ELSIF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
      IF NEW.payment_status = 'paid' THEN
        v_change_type := 'payment_received';
      ELSIF NEW.payment_status = 'refunded' THEN
        v_change_type := 'payment_refunded';
      ELSE
        v_change_type := 'modified';
      END IF;
      
    ELSE
      v_change_type := 'modified';
    END IF;
    
    -- Capturar valores anteriores e novos
    v_old_vals := jsonb_build_object(
      'status', OLD.status,
      'check_in', OLD.check_in,
      'check_out', OLD.check_out,
      'guests_adults', OLD.guests_adults,
      'guests_children', OLD.guests_children,
      'pricing_total', OLD.pricing_total,
      'payment_status', OLD.payment_status
    );
    v_new_vals := jsonb_build_object(
      'status', NEW.status,
      'check_in', NEW.check_in,
      'check_out', NEW.check_out,
      'guests_adults', NEW.guests_adults,
      'guests_children', NEW.guests_children,
      'pricing_total', NEW.pricing_total,
      'payment_status', NEW.payment_status
    );
  END IF;
  
  -- Inserir no histórico
  INSERT INTO reservation_history (
    reservation_id,
    change_type,
    changed_by_type,
    old_values,
    new_values,
    source
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    v_change_type,
    'system',
    v_old_vals,
    v_new_vals,
    'trigger'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_reservation_change() IS '[OTA-UNIVERSAL] Trigger function para audit log de reservas';

-- =====================================================
-- 2. TRIGGER NA TABELA RESERVATIONS
-- =====================================================

DROP TRIGGER IF EXISTS trg_reservation_history ON reservations;

CREATE TRIGGER trg_reservation_history
AFTER INSERT OR UPDATE ON reservations
FOR EACH ROW
EXECUTE FUNCTION log_reservation_change();

COMMENT ON TRIGGER trg_reservation_history ON reservations IS '[OTA-UNIVERSAL] Auto-log de todas as mudanças';

-- =====================================================
-- FIM DA MIGRATION 10
-- =====================================================
-- ✅ Agora o histórico será preenchido automaticamente!
-- Teste: UPDATE reservations SET status = 'confirmed' WHERE id = '...'
-- Verificar: SELECT * FROM reservation_history ORDER BY created_at DESC LIMIT 5;
-- =====================================================
