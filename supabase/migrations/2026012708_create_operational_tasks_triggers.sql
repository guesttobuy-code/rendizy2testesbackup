-- ============================================================================
-- MIGRATION: Triggers para Geração Automática de Tarefas Operacionais
-- Version: 1.0.0
-- Date: 2026-01-28
-- 
-- Este arquivo cria os triggers que geram tarefas operacionais automaticamente
-- baseado em eventos de reservas (check-in, check-out)
-- ============================================================================

-- ============================================================================
-- FUNÇÃO: Gerar tarefas operacionais baseado em templates de evento
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_operational_tasks_from_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template RECORD;
  v_checkin_date DATE;
  v_checkout_date DATE;
  v_property_id UUID;
  v_reservation_id TEXT;
  v_org_id UUID;
  v_scheduled_date DATE;
  v_scheduled_time TIME;
  v_task_title TEXT;
  v_days_offset INTEGER;
  v_event_config JSONB;
BEGIN
  -- Pega dados da reserva
  -- NOTA: Ajuste conforme a estrutura real da sua tabela de reservas
  v_org_id := NEW.organization_id;
  v_property_id := NEW.property_id;
  v_reservation_id := NEW.id::TEXT;
  
  -- Tenta pegar datas do campo data ou de colunas específicas
  IF NEW.data IS NOT NULL THEN
    v_checkin_date := (NEW.data->>'check_in')::DATE;
    v_checkout_date := (NEW.data->>'check_out')::DATE;
  ELSE
    -- Fallback para colunas diretas se existirem
    v_checkin_date := COALESCE(NEW.check_in::DATE, NEW.checkin_date::DATE);
    v_checkout_date := COALESCE(NEW.check_out::DATE, NEW.checkout_date::DATE);
  END IF;
  
  -- Se não conseguiu pegar as datas, sai
  IF v_checkin_date IS NULL OR v_checkout_date IS NULL THEN
    RAISE NOTICE 'Reserva % sem datas de check-in/check-out definidas', v_reservation_id;
    RETURN NEW;
  END IF;

  -- Busca templates ativos para esta organização
  FOR v_template IN 
    SELECT * FROM operational_task_templates 
    WHERE organization_id = v_org_id 
      AND is_active = true 
      AND trigger_type = 'event'
      AND (
        property_scope = 'all'
        OR (property_scope = 'selected' AND v_property_id = ANY(property_ids))
      )
  LOOP
    v_event_config := v_template.event_trigger;
    
    -- Verifica qual evento dispara o template
    CASE v_event_config->>'event'
      WHEN 'checkin_day' THEN
        v_days_offset := COALESCE((v_event_config->>'days_offset')::INTEGER, 0);
        v_scheduled_date := v_checkin_date + v_days_offset;
        v_task_title := v_template.name || ' - Reserva ' || v_reservation_id;
        
      WHEN 'checkout_day' THEN
        v_days_offset := COALESCE((v_event_config->>'days_offset')::INTEGER, 0);
        v_scheduled_date := v_checkout_date + v_days_offset;
        v_task_title := v_template.name || ' - Reserva ' || v_reservation_id;
        
      WHEN 'reservation_confirmed' THEN
        v_days_offset := COALESCE((v_event_config->>'days_offset')::INTEGER, 0);
        v_scheduled_date := CURRENT_DATE + v_days_offset;
        v_task_title := v_template.name || ' - Reserva ' || v_reservation_id;
        
      WHEN 'checkin_approaching' THEN
        -- X dias antes do check-in
        v_days_offset := COALESCE((v_event_config->>'days_offset')::INTEGER, -1);
        v_scheduled_date := v_checkin_date + v_days_offset;
        v_task_title := v_template.name || ' - Reserva ' || v_reservation_id;
        
      ELSE
        -- Evento desconhecido, pula
        CONTINUE;
    END CASE;
    
    -- Define horário
    IF v_event_config->>'time_mode' = 'fixed' THEN
      v_scheduled_time := (v_event_config->>'fixed_time')::TIME;
    ELSE
      v_scheduled_time := '09:00'::TIME;
    END IF;
    
    -- Verifica se já existe tarefa para este template/reserva
    IF NOT EXISTS (
      SELECT 1 FROM operational_tasks 
      WHERE template_id = v_template.id 
        AND reservation_id = v_reservation_id
        AND triggered_by_event = v_event_config->>'event'
    ) THEN
      -- Cria a tarefa operacional
      INSERT INTO operational_tasks (
        organization_id,
        template_id,
        title,
        description,
        instructions,
        status,
        priority,
        assignee_id,
        team_id,
        property_id,
        reservation_id,
        scheduled_date,
        scheduled_time,
        triggered_by_event,
        triggered_by_entity_id,
        metadata,
        created_at
      ) VALUES (
        v_org_id,
        v_template.id,
        v_task_title,
        v_template.description,
        v_template.instructions,
        'pending',
        v_template.priority,
        v_template.assigned_user_id,
        v_template.assigned_team_id,
        v_property_id,
        v_reservation_id,
        v_scheduled_date,
        v_scheduled_time,
        v_event_config->>'event',
        v_reservation_id,
        jsonb_build_object(
          'checkin_date', v_checkin_date,
          'checkout_date', v_checkout_date,
          'generated_at', NOW(),
          'trigger_template', v_template.name
        ),
        NOW()
      );
      
      RAISE NOTICE 'Tarefa operacional criada: % para reserva %', v_task_title, v_reservation_id;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- FUNÇÃO: Cancelar tarefas operacionais quando reserva é cancelada
-- ============================================================================

CREATE OR REPLACE FUNCTION cancel_operational_tasks_on_reservation_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Se a reserva foi cancelada, cancela as tarefas pendentes relacionadas
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE operational_tasks
    SET 
      status = 'cancelled',
      updated_at = NOW(),
      metadata = metadata || jsonb_build_object('cancelled_reason', 'Reserva cancelada', 'cancelled_at', NOW())
    WHERE 
      reservation_id = NEW.id::TEXT
      AND status IN ('pending', 'in_progress');
    
    RAISE NOTICE 'Tarefas operacionais canceladas para reserva %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- FUNÇÃO: Atualizar tarefas quando reserva muda de data
-- ============================================================================

CREATE OR REPLACE FUNCTION update_operational_tasks_on_reservation_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_checkin DATE;
  v_new_checkin DATE;
  v_old_checkout DATE;
  v_new_checkout DATE;
  v_date_diff INTERVAL;
BEGIN
  -- Pega datas antigas e novas
  IF OLD.data IS NOT NULL THEN
    v_old_checkin := (OLD.data->>'check_in')::DATE;
    v_old_checkout := (OLD.data->>'check_out')::DATE;
  END IF;
  
  IF NEW.data IS NOT NULL THEN
    v_new_checkin := (NEW.data->>'check_in')::DATE;
    v_new_checkout := (NEW.data->>'check_out')::DATE;
  END IF;
  
  -- Se check-in mudou, atualiza tarefas de check-in
  IF v_old_checkin IS DISTINCT FROM v_new_checkin AND v_new_checkin IS NOT NULL THEN
    v_date_diff := v_new_checkin - v_old_checkin;
    
    UPDATE operational_tasks
    SET 
      scheduled_date = scheduled_date + v_date_diff,
      original_scheduled_date = COALESCE(original_scheduled_date, scheduled_date),
      postpone_reason = 'Reserva alterada: check-in mudou de ' || v_old_checkin || ' para ' || v_new_checkin,
      updated_at = NOW()
    WHERE 
      reservation_id = NEW.id::TEXT
      AND triggered_by_event IN ('checkin_day', 'checkin_approaching')
      AND status = 'pending';
    
    RAISE NOTICE 'Tarefas de check-in atualizadas para reserva %', NEW.id;
  END IF;
  
  -- Se check-out mudou, atualiza tarefas de check-out
  IF v_old_checkout IS DISTINCT FROM v_new_checkout AND v_new_checkout IS NOT NULL THEN
    v_date_diff := v_new_checkout - v_old_checkout;
    
    UPDATE operational_tasks
    SET 
      scheduled_date = scheduled_date + v_date_diff,
      original_scheduled_date = COALESCE(original_scheduled_date, scheduled_date),
      postpone_reason = 'Reserva alterada: check-out mudou de ' || v_old_checkout || ' para ' || v_new_checkout,
      updated_at = NOW()
    WHERE 
      reservation_id = NEW.id::TEXT
      AND triggered_by_event IN ('checkout_day')
      AND status = 'pending';
    
    RAISE NOTICE 'Tarefas de check-out atualizadas para reserva %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- TRIGGERS NA TABELA DE RESERVAS
-- NOTA: Ajuste o nome da tabela conforme sua estrutura
-- ============================================================================

-- Trigger para criar tarefas quando reserva é criada/confirmada
DROP TRIGGER IF EXISTS trg_generate_operational_tasks_on_reservation ON reservations;
CREATE TRIGGER trg_generate_operational_tasks_on_reservation
AFTER INSERT ON reservations
FOR EACH ROW
EXECUTE FUNCTION generate_operational_tasks_from_reservation();

-- Trigger para cancelar tarefas quando reserva é cancelada
DROP TRIGGER IF EXISTS trg_cancel_tasks_on_reservation_cancel ON reservations;
CREATE TRIGGER trg_cancel_tasks_on_reservation_cancel
AFTER UPDATE OF status ON reservations
FOR EACH ROW
WHEN (NEW.status = 'cancelled')
EXECUTE FUNCTION cancel_operational_tasks_on_reservation_cancel();

-- Trigger para atualizar tarefas quando reserva muda de data
DROP TRIGGER IF EXISTS trg_update_tasks_on_reservation_change ON reservations;
CREATE TRIGGER trg_update_tasks_on_reservation_change
AFTER UPDATE OF data ON reservations
FOR EACH ROW
EXECUTE FUNCTION update_operational_tasks_on_reservation_change();

-- ============================================================================
-- FUNÇÃO RPC: Gerar tarefas manualmente para reservas existentes
-- Útil para rodar uma vez e criar tarefas para reservas já existentes
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_tasks_for_existing_reservations(
  p_organization_id UUID,
  p_from_date DATE DEFAULT CURRENT_DATE,
  p_to_date DATE DEFAULT CURRENT_DATE + INTERVAL '30 days'
)
RETURNS TABLE (
  reservation_id TEXT,
  tasks_created INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reservation RECORD;
  v_template RECORD;
  v_count INTEGER;
  v_total INTEGER := 0;
  v_checkin_date DATE;
  v_checkout_date DATE;
  v_scheduled_date DATE;
  v_scheduled_time TIME;
  v_event_config JSONB;
  v_days_offset INTEGER;
BEGIN
  -- Itera sobre reservas no período
  FOR v_reservation IN 
    SELECT * FROM reservations 
    WHERE organization_id = p_organization_id
      AND status NOT IN ('cancelled')
      AND (
        (data->>'check_in')::DATE BETWEEN p_from_date AND p_to_date
        OR (data->>'check_out')::DATE BETWEEN p_from_date AND p_to_date
      )
  LOOP
    v_count := 0;
    v_checkin_date := (v_reservation.data->>'check_in')::DATE;
    v_checkout_date := (v_reservation.data->>'check_out')::DATE;
    
    -- Itera sobre templates ativos
    FOR v_template IN 
      SELECT * FROM operational_task_templates 
      WHERE organization_id = p_organization_id 
        AND is_active = true 
        AND trigger_type = 'event'
    LOOP
      v_event_config := v_template.event_trigger;
      
      -- Calcula data baseado no evento
      CASE v_event_config->>'event'
        WHEN 'checkin_day' THEN
          v_days_offset := COALESCE((v_event_config->>'days_offset')::INTEGER, 0);
          v_scheduled_date := v_checkin_date + v_days_offset;
        WHEN 'checkout_day' THEN
          v_days_offset := COALESCE((v_event_config->>'days_offset')::INTEGER, 0);
          v_scheduled_date := v_checkout_date + v_days_offset;
        ELSE
          CONTINUE;
      END CASE;
      
      -- Define horário
      IF v_event_config->>'time_mode' = 'fixed' THEN
        v_scheduled_time := (v_event_config->>'fixed_time')::TIME;
      ELSE
        v_scheduled_time := '09:00'::TIME;
      END IF;
      
      -- Verifica se já existe
      IF NOT EXISTS (
        SELECT 1 FROM operational_tasks 
        WHERE template_id = v_template.id 
          AND reservation_id = v_reservation.id::TEXT
          AND triggered_by_event = v_event_config->>'event'
      ) THEN
        -- Cria tarefa
        INSERT INTO operational_tasks (
          organization_id, template_id, title, description, instructions,
          status, priority, assignee_id, team_id, property_id, reservation_id,
          scheduled_date, scheduled_time, triggered_by_event, triggered_by_entity_id,
          created_at
        ) VALUES (
          p_organization_id, v_template.id,
          v_template.name || ' - Reserva ' || v_reservation.id::TEXT,
          v_template.description, v_template.instructions,
          'pending', v_template.priority, v_template.assigned_user_id, v_template.assigned_team_id,
          v_reservation.property_id, v_reservation.id::TEXT,
          v_scheduled_date, v_scheduled_time,
          v_event_config->>'event', v_reservation.id::TEXT,
          NOW()
        );
        
        v_count := v_count + 1;
        v_total := v_total + 1;
      END IF;
    END LOOP;
    
    reservation_id := v_reservation.id::TEXT;
    tasks_created := v_count;
    RETURN NEXT;
  END LOOP;
  
  RAISE NOTICE 'Total de tarefas criadas: %', v_total;
END;
$$;

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON FUNCTION generate_operational_tasks_from_reservation() IS 
'Trigger function que cria tarefas operacionais automaticamente quando uma reserva é criada';

COMMENT ON FUNCTION cancel_operational_tasks_on_reservation_cancel() IS 
'Trigger function que cancela tarefas pendentes quando uma reserva é cancelada';

COMMENT ON FUNCTION update_operational_tasks_on_reservation_change() IS 
'Trigger function que atualiza datas das tarefas quando uma reserva muda de data';

COMMENT ON FUNCTION generate_tasks_for_existing_reservations(UUID, DATE, DATE) IS 
'RPC para gerar tarefas retroativamente para reservas já existentes no sistema';
