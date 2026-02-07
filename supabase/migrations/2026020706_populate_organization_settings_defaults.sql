-- ============================================================================
-- RENDIZY - POPULATE DEFAULT ORGANIZATION SETTINGS
-- Migração: 2026020706
-- Data: 2026-02-06
-- Objetivo: Criar settings default para organizações que não têm
-- ============================================================================
-- Contexto: A tela Settings Global mostra campos mock porque organization_settings
-- não existe para a maioria das orgs. Esta migration popula com defaults.
--
-- Ref: docs/roadmaps/FUNCTIONAL_MAPPING_OTA_FIELDS.md (63 prints Stays.net)
-- ============================================================================

-- Inserir settings default para organizações que não têm
INSERT INTO organization_settings (id, organization_id, settings, created_at, updated_at)
SELECT 
  gen_random_uuid() as id,
  o.id as organization_id,
  jsonb_build_object(
    -- ===== POLÍTICA DE CANCELAMENTO =====
    'cancellation_policy', jsonb_build_object(
      'enabled', true,
      'type', 'flexible',  -- flexible, moderate, strict, super_strict
      'no_refund_hours', 24,
      'refund_percentage_7days', 100,   -- 7+ dias antes = 100% reembolso
      'refund_percentage_3days', 50,    -- 3-6 dias antes = 50% reembolso
      'refund_percentage_1day', 0       -- <3 dias = sem reembolso
    ),
    
    -- ===== CHECK-IN / CHECK-OUT =====
    'checkin_checkout', jsonb_build_object(
      'enabled', true,
      'checkin_time_from', '15:00',     -- Check-in a partir de
      'checkin_time_to', '22:00',       -- Check-in até
      'checkout_time', '11:00',         -- Check-out até
      'flexible_hours', false,
      'early_checkin_fee', 0,           -- Taxa early check-in (R$)
      'early_checkin_percentage', 0,    -- ou % da diária
      'late_checkout_fee', 0,           -- Taxa late checkout (R$)
      'late_checkout_percentage', 0     -- ou % da diária
    ),
    
    -- ===== ESTADIA MÍNIMA =====
    'minimum_nights', jsonb_build_object(
      'enabled', true,
      'default_min_nights', 1,          -- Mínimo padrão
      'weekend_min_nights', 2,          -- Fim de semana
      'holiday_min_nights', 3,          -- Feriados
      'high_season_min_nights', 5       -- Alta temporada
    ),
    
    -- ===== ESTADIA MÁXIMA =====
    'maximum_nights', jsonb_build_object(
      'enabled', false,
      'default_max_nights', 30          -- Máximo padrão (30 dias)
    ),
    
    -- ===== ANTECEDÊNCIA DE RESERVA =====
    'advance_booking', jsonb_build_object(
      'enabled', true,
      'min_hours_advance', 24,          -- Mínimo 24h antes
      'max_days_advance', 365,          -- Máximo 1 ano
      'same_day_booking', false,        -- Reserva no mesmo dia?
      'last_minute_cutoff', '14:00'     -- Horário limite last minute
    ),
    
    -- ===== REGRAS DA CASA =====
    'house_rules', jsonb_build_object(
      'enabled', true,
      'no_smoking', true,               -- Proibido fumar
      'no_parties', true,               -- Proibido festas
      'no_pets', false,                 -- Aceita pets (default: sim)
      'pets_fee', 0,                    -- Taxa de pet (R$)
      'pets_max', 2,                    -- Máximo de pets
      'quiet_hours_enabled', true,
      'quiet_hours_from', '22:00',
      'quiet_hours_to', '08:00',
      'max_guests_strict', true,        -- Respeitar max hóspedes
      'children_allowed', true,         -- Aceita crianças
      'children_min_age', 0,            -- Idade mínima crianças
      'infants_allowed', true,          -- Aceita bebês (0-2 anos)
      'events_allowed', false           -- Eventos permitidos
    ),
    
    -- ===== TEMPO DE PREPARAÇÃO (TURNAROUND) =====
    'preparation_time', jsonb_build_object(
      'enabled', true,
      'days_before', 0,                 -- Dias bloqueados antes do check-in
      'days_after', 1                   -- Dias bloqueados após checkout (limpeza)
    ),
    
    -- ===== RESERVA INSTANTÂNEA =====
    'instant_booking', jsonb_build_object(
      'enabled', true,                  -- Aceita reserva instantânea
      'require_guest_verification', false,
      'require_positive_reviews', false
    ),
    
    -- ===== COMUNICAÇÃO =====
    'communication', jsonb_build_object(
      'enabled', true,
      'auto_confirm_reservations', false,        -- Confirmar automaticamente?
      'send_welcome_message', true,              -- Enviar mensagem boas-vindas
      'send_checkin_instructions', true,         -- Enviar instruções check-in
      'send_checkout_reminder', true,            -- Lembrete de checkout
      'send_review_request', true,               -- Pedir avaliação pós-checkout
      'communication_language', 'pt-BR'          -- Idioma padrão
    ),
    
    -- ===== GARANTIA DA RESERVA (SINAL) =====
    'deposit', jsonb_build_object(
      'enabled', true,
      'require_deposit', true,                   -- Exigir sinal?
      'deposit_percentage', 30,                  -- % do total como sinal
      'deposit_due_days', 0                      -- Dias para pagar sinal (0 = imediato)
    ),
    
    -- ===== DEPÓSITO CAUÇÃO (SEGURANÇA) =====
    'security_deposit', jsonb_build_object(
      'enabled', true,
      'require_security_deposit', true,
      'security_deposit_amount', 500,            -- Valor caução (R$)
      'damage_policy', 'deduct_from_deposit'     -- Política de danos
    ),
    
    -- ===== TAXAS ESPECIAIS =====
    'special_fees', jsonb_build_object(
      'enabled', false,
      'early_checkin_enabled', false,
      'early_checkin_type', 'fixed',             -- fixed ou percentage
      'early_checkin_value', 50,
      'late_checkout_enabled', false,
      'late_checkout_type', 'fixed',
      'late_checkout_value', 50
    )
  ) as settings,
  NOW() as created_at,
  NOW() as updated_at
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM organization_settings os 
  WHERE os.organization_id = o.id
);

-- Log do resultado
DO $$
DECLARE
  inserted_count INTEGER;
BEGIN
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RAISE NOTICE 'Organization settings criados: % organizações', inserted_count;
END $$;

-- ============================================================================
-- VERIFICAÇÃO PÓS-MIGRATION
-- ============================================================================
-- SELECT o.name, os.settings->'minimum_nights'->>'default_min_nights'
-- FROM organizations o
-- JOIN organization_settings os ON os.organization_id = o.id;
-- ============================================================================
