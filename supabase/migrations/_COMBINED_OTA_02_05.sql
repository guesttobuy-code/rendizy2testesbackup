-- COMBINED OTA MIGRATIONS 02-05
-- Execute no SQL Editor do Supabase Dashboard
-- ========================================

-- ========== 2026020302_ota_cancellation_rates.sql ==========
-- ============================================================================
-- RENDIZY - MODELO DE DADOS UNIVERSAL PARA OTAs
-- Migração 2 de 5: CANCELLATION POLICIES & RATE PLANS
-- ============================================================================
-- Versão: 1.0
-- Data: 2026-02-03
-- Objetivo: Criar estrutura para políticas de cancelamento e rate plans
-- ============================================================================

-- ============================================================================
-- TABELA 1: CANCELLATION POLICY TEMPLATES
-- Templates de políticas de cancelamento reutilizáveis
-- ============================================================================
CREATE TABLE IF NOT EXISTS cancellation_policy_templates (
  id TEXT PRIMARY KEY,                    -- 'flexible', 'moderate', 'strict', 'non_refundable'
  organization_id UUID REFERENCES organizations(id), -- NULL = template do sistema
  
  -- Nomes multilíngue
  name_pt TEXT NOT NULL,
  name_en TEXT,
  name_es TEXT,
  
  -- Descrições para o hóspede
  description_pt TEXT,
  description_en TEXT,
  description_es TEXT,
  
  -- ============================================================================
  -- REGRAS DA POLÍTICA (Estrutura Universal)
  -- ============================================================================
  -- O JSON segue um formato que pode ser traduzido para qualquer OTA
  rules JSONB NOT NULL DEFAULT '{
    "free_cancellation_hours": 48,
    "penalties": [],
    "no_show_penalty_type": "percentage",
    "no_show_penalty_value": 100
  }',
  /*
  Estrutura do JSONB 'rules':
  {
    "free_cancellation_hours": 48,        // Cancelamento grátis até X horas antes
    "free_cancellation_days": 2,          // OU em dias (alternativa)
    
    "penalties": [
      {
        "days_before_checkin_min": 7,     // A partir de 7 dias antes
        "days_before_checkin_max": null,  // Até infinito (null = sem limite)
        "penalty_type": "percentage",     // 'percentage' | 'nights' | 'fixed'
        "penalty_value": 0,               // 0% = grátis
        "penalty_currency": "BRL"         // Só para 'fixed'
      },
      {
        "days_before_checkin_min": 1,
        "days_before_checkin_max": 6,
        "penalty_type": "percentage",
        "penalty_value": 50               // 50% do total
      },
      {
        "days_before_checkin_min": 0,
        "days_before_checkin_max": 0,
        "penalty_type": "percentage",
        "penalty_value": 100              // 100% = sem reembolso
      }
    ],
    
    "no_show_penalty_type": "percentage",
    "no_show_penalty_value": 100,
    
    "exceptions": {
      "first_night_non_refundable": false,
      "deposit_non_refundable": false,
      "cleaning_fee_refundable": true
    }
  }
  */
  
  -- Mapeamento direto para OTAs que usam templates (ex: Airbnb)
  -- Esse campo permite mapear diretamente sem calcular
  airbnb_policy TEXT,                     -- 'flexible', 'moderate', 'strict', 'super_strict_30', 'super_strict_60'
  booking_policy TEXT,                    -- Código Booking se aplicável
  
  -- Flags
  is_refundable BOOLEAN DEFAULT true,     -- Permite algum reembolso?
  is_system BOOLEAN DEFAULT false,        -- Template do sistema vs customizado
  
  -- Controle
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE cancellation_policy_templates IS 'Templates de políticas de cancelamento reutilizáveis';
COMMENT ON COLUMN cancellation_policy_templates.rules IS 'Regras em formato universal traduzível para qualquer OTA';

-- ============================================================================
-- TABELA 2: OTA CANCELLATION POLICY MAPPINGS
-- Como traduzir nossa estrutura para cada OTA
-- ============================================================================
CREATE TABLE IF NOT EXISTS ota_cancellation_policy_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Rendizy
  template_id TEXT REFERENCES cancellation_policy_templates(id) ON DELETE CASCADE,
  
  -- OTA
  ota TEXT NOT NULL,
  ota_policy_id TEXT,                     -- ID/código na OTA (se existir)
  ota_policy_name TEXT,
  
  -- Formato de exportação específico da OTA
  -- Usado quando a OTA precisa de um formato muito diferente
  export_format JSONB,
  /*
  Para Expedia:
  {
    "cancel_penalties": [
      {"start": "2026-01-01T00:00:00Z", "end": "2026-01-07T00:00:00Z", "amount": "0.00", "currency": "BRL"},
      {"start": "2026-01-07T00:00:00Z", "end": "2026-01-10T00:00:00Z", "amount": "150.00", "currency": "BRL"}
    ],
    "nonrefundable_date_ranges": [
      {"start": "2026-12-20", "end": "2026-01-05"}
    ]
  }
  
  Para Airbnb:
  {
    "cancellation_policy": "moderate"
  }
  
  Para Booking:
  {
    "cancellation_rules": {
      "type": "from_date",
      "deadline": "2026-01-07",
      "charge_type": "percent",
      "charge_amount": 50
    }
  }
  */
  
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(ota, template_id)
);

CREATE INDEX IF NOT EXISTS idx_ota_cancellation_template ON ota_cancellation_policy_mappings(template_id);
CREATE INDEX IF NOT EXISTS idx_ota_cancellation_ota ON ota_cancellation_policy_mappings(ota);

COMMENT ON TABLE ota_cancellation_policy_mappings IS 'Mapeamento de políticas de cancelamento para formato específico de cada OTA';

-- ============================================================================
-- TABELA 3: RATE PLANS
-- Planos de tarifa (conceito universal que todas OTAs usam)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rate_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE, -- NULL = aplicável a todas
  
  -- Identificação
  code TEXT NOT NULL,                     -- 'STANDARD', 'WITH_BREAKFAST', 'NON_REFUNDABLE'
  name_pt TEXT NOT NULL,
  name_en TEXT,
  name_es TEXT,
  
  description_pt TEXT,
  description_en TEXT,
  
  -- ============================================================================
  -- PREÇO
  -- ============================================================================
  -- Ajuste de preço em relação ao preço base
  price_adjustment_type TEXT DEFAULT 'none' CHECK (price_adjustment_type IN ('none', 'percentage', 'fixed')),
  price_adjustment_value DECIMAL(10,2) DEFAULT 0,   -- +20%, -50, etc
  price_adjustment_currency TEXT DEFAULT 'BRL',
  
  -- ============================================================================
  -- POLÍTICA DE CANCELAMENTO
  -- ============================================================================
  cancellation_policy_id TEXT REFERENCES cancellation_policy_templates(id),
  
  -- ============================================================================
  -- RESTRIÇÕES DE ESTADIA
  -- ============================================================================
  min_nights INTEGER DEFAULT 1,
  max_nights INTEGER,
  
  -- Antecedência de reserva
  advance_booking_min_days INTEGER,       -- Mínimo de dias de antecedência
  advance_booking_max_days INTEGER,       -- Máximo de dias de antecedência (ex: 365)
  
  -- Janela de reserva
  booking_window_start TIME,              -- Hora inicial para reservas
  booking_window_end TIME,                -- Hora final para reservas
  
  -- ============================================================================
  -- AMENIDADES INCLUÍDAS
  -- ============================================================================
  -- Amenidades que vêm com este rate (ex: café da manhã, estacionamento)
  included_amenities TEXT[],              -- ['breakfast', 'parking', 'wifi', 'airport_transfer']
  
  -- ============================================================================
  -- OCUPAÇÃO
  -- ============================================================================
  -- Restrições de ocupação específicas deste rate
  max_adults INTEGER,
  max_children INTEGER,
  max_occupancy INTEGER,
  
  -- ============================================================================
  -- PAGAMENTO
  -- ============================================================================
  payment_type TEXT DEFAULT 'property_collect' CHECK (payment_type IN (
    'property_collect',     -- Propriedade coleta
    'ota_collect',          -- OTA coleta (Expedia Collect, Booking prepaid)
    'both'                  -- Ambos disponíveis
  )),
  
  -- Merchant of Record (quem processa o pagamento)
  merchant_of_record TEXT DEFAULT 'property' CHECK (merchant_of_record IN ('property', 'expedia', 'ota')),
  
  -- Depósito
  deposit_required BOOLEAN DEFAULT false,
  deposit_type TEXT CHECK (deposit_type IN ('percentage', 'fixed', 'first_night', 'full')),
  deposit_value DECIMAL(10,2),
  deposit_currency TEXT DEFAULT 'BRL',
  deposit_due_days INTEGER,               -- Dias antes do check-in
  
  -- ============================================================================
  -- DISPONIBILIDADE
  -- ============================================================================
  is_refundable BOOLEAN DEFAULT true,
  
  -- Período de validade do rate
  valid_from DATE,
  valid_to DATE,
  
  -- Dias da semana válidos (NULL = todos)
  valid_days_of_week INTEGER[],           -- [0,1,2,3,4,5,6] (0=domingo)
  
  -- Restrições de check-in/check-out
  checkin_days_allowed INTEGER[],         -- Dias permitidos para check-in
  checkout_days_allowed INTEGER[],        -- Dias permitidos para check-out
  
  -- ============================================================================
  -- PROMOÇÕES
  -- ============================================================================
  is_promotional BOOLEAN DEFAULT false,
  promotion_name TEXT,
  promotion_description TEXT,
  member_only BOOLEAN DEFAULT false,      -- Só para membros do programa?
  
  -- ============================================================================
  -- CONTROLE
  -- ============================================================================
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,       -- Rate padrão para a propriedade?
  priority INTEGER DEFAULT 0,             -- Ordem de exibição
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  UNIQUE(organization_id, property_id, code)
);

CREATE INDEX IF NOT EXISTS idx_rate_plans_org ON rate_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_rate_plans_property ON rate_plans(property_id);
CREATE INDEX IF NOT EXISTS idx_rate_plans_active ON rate_plans(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_rate_plans_valid_dates ON rate_plans(valid_from, valid_to);

COMMENT ON TABLE rate_plans IS 'Planos de tarifa - conceito universal para todas as OTAs';
COMMENT ON COLUMN rate_plans.included_amenities IS 'Amenidades incluídas neste rate (usar IDs canônicos)';

-- ============================================================================
-- TABELA 4: OTA RATE PLAN MAPPINGS
-- Mapeamento de rate plans para cada OTA
-- ============================================================================
CREATE TABLE IF NOT EXISTS ota_rate_plan_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  rate_plan_id UUID NOT NULL REFERENCES rate_plans(id) ON DELETE CASCADE,
  
  ota TEXT NOT NULL,
  ota_rate_id TEXT,                       -- ID do rate na OTA (depois de criado)
  ota_rate_code TEXT,                     -- Código do rate na OTA
  
  -- Configuração específica da OTA
  ota_config JSONB DEFAULT '{}',
  /*
  Para Expedia:
  {
    "rate_type": "standard",
    "pricing_model": "per_night",
    "tax_inclusive": false,
    "inventory_count": 10
  }
  
  Para Booking:
  {
    "rate_plan_type": "standard",
    "meal_plan": "breakfast_included"
  }
  */
  
  -- Status de sincronização
  sync_enabled BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  sync_error TEXT,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(rate_plan_id, ota)
);

CREATE INDEX IF NOT EXISTS idx_ota_rate_plan_rate ON ota_rate_plan_mappings(rate_plan_id);
CREATE INDEX IF NOT EXISTS idx_ota_rate_plan_ota ON ota_rate_plan_mappings(ota);
CREATE INDEX IF NOT EXISTS idx_ota_rate_plan_sync ON ota_rate_plan_mappings(ota, sync_enabled) WHERE sync_enabled = true;

COMMENT ON TABLE ota_rate_plan_mappings IS 'Mapeamento de rate plans para cada OTA';

-- ============================================================================
-- TABELA 5: RATE PLAN PRICING OVERRIDES
-- Preços específicos por data/período para um rate plan
-- ============================================================================
CREATE TABLE IF NOT EXISTS rate_plan_pricing_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_plan_id UUID NOT NULL REFERENCES rate_plans(id) ON DELETE CASCADE,
  
  -- Período
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  
  -- Tipo de override
  override_type TEXT NOT NULL CHECK (override_type IN (
    'absolute',             -- Preço absoluto
    'adjustment',           -- Ajuste sobre o preço base
    'closed'                -- Não disponível
  )),
  
  -- Valor
  price_value DECIMAL(10,2),
  price_adjustment_type TEXT CHECK (price_adjustment_type IN ('percentage', 'fixed')),
  price_adjustment_value DECIMAL(10,2),
  
  -- Min stay específico para este período
  min_nights INTEGER,
  max_nights INTEGER,
  
  -- Motivo (para tracking)
  reason TEXT,                            -- 'high_season', 'event', 'promotion'
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_plan_pricing_rate ON rate_plan_pricing_overrides(rate_plan_id);
CREATE INDEX IF NOT EXISTS idx_rate_plan_pricing_dates ON rate_plan_pricing_overrides(date_from, date_to);

COMMENT ON TABLE rate_plan_pricing_overrides IS 'Preços específicos por período para rate plans';

-- ============================================================================
-- TABELA 6: RATE PLAN AVAILABILITY
-- Disponibilidade de inventário por rate plan e data
-- ============================================================================
CREATE TABLE IF NOT EXISTS rate_plan_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_plan_id UUID NOT NULL REFERENCES rate_plans(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Data
  date DATE NOT NULL,
  
  -- Disponibilidade
  available_units INTEGER DEFAULT 1,      -- Quantidade disponível
  is_closed BOOLEAN DEFAULT false,        -- Fechado para reservas
  
  -- Stop sell
  stop_sell BOOLEAN DEFAULT false,        -- Bloquear vendas
  stop_sell_reason TEXT,
  
  -- CTA (Closed to Arrival)
  closed_to_arrival BOOLEAN DEFAULT false,
  
  -- CTD (Closed to Departure)
  closed_to_departure BOOLEAN DEFAULT false,
  
  -- Min/Max stay para esta data específica
  min_nights INTEGER,
  max_nights INTEGER,
  
  -- Preço específico (override do rate plan)
  price_override DECIMAL(10,2),
  
  -- Última sincronização
  last_synced_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(rate_plan_id, property_id, date)
);

CREATE INDEX IF NOT EXISTS idx_rate_availability_rate ON rate_plan_availability(rate_plan_id);
CREATE INDEX IF NOT EXISTS idx_rate_availability_property ON rate_plan_availability(property_id);
CREATE INDEX IF NOT EXISTS idx_rate_availability_date ON rate_plan_availability(date);
CREATE INDEX IF NOT EXISTS idx_rate_availability_available ON rate_plan_availability(rate_plan_id, date, is_closed) WHERE is_closed = false;

COMMENT ON TABLE rate_plan_availability IS 'Disponibilidade diária por rate plan';

-- ============================================================================
-- TABELA 7: PROPERTY CANCELLATION PENALTIES
-- Penalidades de cancelamento específicas por propriedade/rate
-- (Para quando não usa template)
-- ============================================================================
CREATE TABLE IF NOT EXISTS property_cancellation_penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  rate_plan_id UUID REFERENCES rate_plans(id) ON DELETE CASCADE,
  
  -- Período da penalidade
  days_before_checkin_start INTEGER,      -- A partir de X dias antes (NULL = desde sempre)
  days_before_checkin_end INTEGER,        -- Até Y dias antes (NULL = até check-in)
  
  -- Alternativamente, pode usar horas
  hours_before_checkin_start INTEGER,
  hours_before_checkin_end INTEGER,
  
  -- Penalidade
  penalty_type TEXT NOT NULL CHECK (penalty_type IN ('percentage', 'fixed', 'nights')),
  penalty_value DECIMAL(10,2) NOT NULL,   -- % ou valor ou número de noites
  penalty_currency TEXT DEFAULT 'BRL',
  
  -- Para tipo 'nights'
  penalty_max_nights INTEGER,             -- Máximo de noites a cobrar
  
  -- Alternativa: nonrefundable date ranges (para épocas específicas)
  nonrefundable_start DATE,
  nonrefundable_end DATE,
  
  -- Descrição para o hóspede
  description_pt TEXT,
  description_en TEXT,
  
  priority INTEGER DEFAULT 0,             -- Ordem de avaliação
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_cancel_org ON property_cancellation_penalties(organization_id);
CREATE INDEX IF NOT EXISTS idx_property_cancel_property ON property_cancellation_penalties(property_id);
CREATE INDEX IF NOT EXISTS idx_property_cancel_rate ON property_cancellation_penalties(rate_plan_id);

COMMENT ON TABLE property_cancellation_penalties IS 'Penalidades de cancelamento customizadas por propriedade/rate';

-- ============================================================================
-- TABELA 8: DEPOSITS
-- Depósitos programados para reservas
-- ============================================================================
CREATE TABLE IF NOT EXISTS deposit_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rate_plan_id UUID REFERENCES rate_plans(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Configuração do depósito
  deposit_type TEXT NOT NULL CHECK (deposit_type IN (
    'percentage',           -- Percentual do total
    'fixed',                -- Valor fixo
    'first_night',          -- Primeira noite
    'first_nights',         -- Primeiras N noites
    'full'                  -- Valor total
  )),
  
  deposit_value DECIMAL(10,2),            -- Valor ou percentual
  deposit_currency TEXT DEFAULT 'BRL',
  nights_count INTEGER,                   -- Para 'first_nights'
  
  -- Quando o depósito é devido
  due_type TEXT NOT NULL CHECK (due_type IN (
    'at_booking',           -- No momento da reserva
    'days_before',          -- X dias antes do check-in
    'date'                  -- Data específica
  )),
  due_days_before INTEGER,                -- Para 'days_before'
  
  -- Reembolsável?
  is_refundable BOOLEAN DEFAULT true,
  refund_deadline_days INTEGER,           -- Até quantos dias antes pode reembolsar
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deposits_org ON deposit_schedules(organization_id);
CREATE INDEX IF NOT EXISTS idx_deposits_rate ON deposit_schedules(rate_plan_id);

COMMENT ON TABLE deposit_schedules IS 'Configuração de depósitos para reservas';

-- ============================================================================
-- INSERIR TEMPLATES PADRÃO DE CANCELAMENTO
-- ============================================================================
INSERT INTO cancellation_policy_templates (id, name_pt, name_en, description_pt, description_en, rules, airbnb_policy, is_refundable, is_system) VALUES

('flexible', 'Flexível', 'Flexible',
  'Cancelamento gratuito até 24 horas antes do check-in. Após esse prazo, a primeira noite não é reembolsável.',
  'Free cancellation up to 24 hours before check-in. After that, the first night is non-refundable.',
  '{
    "free_cancellation_hours": 24,
    "penalties": [
      {
        "days_before_checkin_min": 1,
        "days_before_checkin_max": null,
        "penalty_type": "percentage",
        "penalty_value": 0
      },
      {
        "days_before_checkin_min": 0,
        "days_before_checkin_max": 0,
        "penalty_type": "nights",
        "penalty_value": 1
      }
    ],
    "no_show_penalty_type": "percentage",
    "no_show_penalty_value": 100
  }',
  'flexible', true, true),

('moderate', 'Moderada', 'Moderate',
  'Cancelamento gratuito até 5 dias antes do check-in. Após esse prazo, 50% do valor é reembolsável.',
  'Free cancellation up to 5 days before check-in. After that, 50% is refundable.',
  '{
    "free_cancellation_days": 5,
    "penalties": [
      {
        "days_before_checkin_min": 5,
        "days_before_checkin_max": null,
        "penalty_type": "percentage",
        "penalty_value": 0
      },
      {
        "days_before_checkin_min": 0,
        "days_before_checkin_max": 4,
        "penalty_type": "percentage",
        "penalty_value": 50
      }
    ],
    "no_show_penalty_type": "percentage",
    "no_show_penalty_value": 100
  }',
  'moderate', true, true),

('strict', 'Rígida', 'Strict',
  'Cancelamento gratuito até 7 dias antes do check-in. Entre 7 e 2 dias, 50% reembolsável. Menos de 2 dias, sem reembolso.',
  'Free cancellation up to 7 days before check-in. Between 7 and 2 days, 50% refundable. Less than 2 days, non-refundable.',
  '{
    "free_cancellation_days": 7,
    "penalties": [
      {
        "days_before_checkin_min": 7,
        "days_before_checkin_max": null,
        "penalty_type": "percentage",
        "penalty_value": 0
      },
      {
        "days_before_checkin_min": 2,
        "days_before_checkin_max": 6,
        "penalty_type": "percentage",
        "penalty_value": 50
      },
      {
        "days_before_checkin_min": 0,
        "days_before_checkin_max": 1,
        "penalty_type": "percentage",
        "penalty_value": 100
      }
    ],
    "no_show_penalty_type": "percentage",
    "no_show_penalty_value": 100
  }',
  'strict', true, true),

('super_strict_30', 'Super Rígida (30 dias)', 'Super Strict (30 days)',
  'Cancelamento gratuito até 30 dias antes do check-in. Após esse prazo, 50% reembolsável. Menos de 7 dias, sem reembolso.',
  'Free cancellation up to 30 days before check-in. After that, 50% refundable. Less than 7 days, non-refundable.',
  '{
    "free_cancellation_days": 30,
    "penalties": [
      {
        "days_before_checkin_min": 30,
        "days_before_checkin_max": null,
        "penalty_type": "percentage",
        "penalty_value": 0
      },
      {
        "days_before_checkin_min": 7,
        "days_before_checkin_max": 29,
        "penalty_type": "percentage",
        "penalty_value": 50
      },
      {
        "days_before_checkin_min": 0,
        "days_before_checkin_max": 6,
        "penalty_type": "percentage",
        "penalty_value": 100
      }
    ],
    "no_show_penalty_type": "percentage",
    "no_show_penalty_value": 100
  }',
  'super_strict_30', true, true),

('non_refundable', 'Não Reembolsável', 'Non-Refundable',
  'Esta reserva não é reembolsável. Nenhum valor será devolvido em caso de cancelamento.',
  'This booking is non-refundable. No refunds will be given for cancellations.',
  '{
    "free_cancellation_hours": 0,
    "penalties": [
      {
        "days_before_checkin_min": 0,
        "days_before_checkin_max": null,
        "penalty_type": "percentage",
        "penalty_value": 100
      }
    ],
    "no_show_penalty_type": "percentage",
    "no_show_penalty_value": 100
  }',
  NULL, false, true)

ON CONFLICT (id) DO UPDATE SET
  rules = EXCLUDED.rules,
  description_pt = EXCLUDED.description_pt,
  description_en = EXCLUDED.description_en,
  airbnb_policy = EXCLUDED.airbnb_policy;

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_rate_plan_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_rate_plans_updated_at ON rate_plans;
CREATE TRIGGER update_rate_plans_updated_at
  BEFORE UPDATE ON rate_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_rate_plan_updated_at();

DROP TRIGGER IF EXISTS update_cancellation_policy_updated_at ON cancellation_policy_templates;
CREATE TRIGGER update_cancellation_policy_updated_at
  BEFORE UPDATE ON cancellation_policy_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================
-- NOTA: O Rendizy usa multi-tenancy via organization_id direto nas tabelas.
-- O backend (Edge Functions) é responsável por filtrar por organization_id.
-- RLS aqui é para proteção extra, permitindo acesso via service_role ou
-- para tabelas de sistema que são públicas.
-- ============================================================================
ALTER TABLE cancellation_policy_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_cancellation_policy_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_rate_plan_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_plan_pricing_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_plan_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_cancellation_penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_schedules ENABLE ROW LEVEL SECURITY;

-- Políticas para cancellation_policy_templates
-- Templates do sistema são públicos; customizados são por organização
CREATE POLICY "System templates readable by all" ON cancellation_policy_templates 
  FOR SELECT USING (is_system = true);

CREATE POLICY "Org templates readable by org" ON cancellation_policy_templates 
  FOR SELECT USING (
    is_system = false AND organization_id IN (
      SELECT organization_id FROM properties WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access cancellation templates" ON cancellation_policy_templates
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Políticas para rate_plans
CREATE POLICY "Rate plans readable by property owner" ON rate_plans 
  FOR SELECT USING (
    property_id IN (SELECT id FROM properties WHERE user_id = auth.uid())
    OR organization_id IN (SELECT organization_id FROM properties WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role full access rate plans" ON rate_plans
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Políticas para ota_rate_plan_mappings
CREATE POLICY "OTA rate mappings via rate plan" ON ota_rate_plan_mappings
  FOR SELECT USING (
    rate_plan_id IN (
      SELECT rp.id FROM rate_plans rp
      WHERE rp.property_id IN (SELECT id FROM properties WHERE user_id = auth.uid())
         OR rp.organization_id IN (SELECT organization_id FROM properties WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Service role full access ota rate mappings" ON ota_rate_plan_mappings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Políticas para rate_plan_pricing_overrides
CREATE POLICY "Pricing overrides via rate plan" ON rate_plan_pricing_overrides
  FOR SELECT USING (
    rate_plan_id IN (
      SELECT rp.id FROM rate_plans rp
      WHERE rp.property_id IN (SELECT id FROM properties WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Service role full access pricing overrides" ON rate_plan_pricing_overrides
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Políticas para rate_plan_availability
CREATE POLICY "Availability via property" ON rate_plan_availability
  FOR SELECT USING (
    property_id IN (SELECT id FROM properties WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role full access availability" ON rate_plan_availability
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Políticas para property_cancellation_penalties
CREATE POLICY "Penalties via property" ON property_cancellation_penalties
  FOR SELECT USING (
    property_id IN (SELECT id FROM properties WHERE user_id = auth.uid())
    OR organization_id IN (SELECT organization_id FROM properties WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role full access penalties" ON property_cancellation_penalties
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Políticas para deposit_schedules
CREATE POLICY "Deposits via property or rate" ON deposit_schedules
  FOR SELECT USING (
    property_id IN (SELECT id FROM properties WHERE user_id = auth.uid())
    OR rate_plan_id IN (
      SELECT rp.id FROM rate_plans rp
      WHERE rp.property_id IN (SELECT id FROM properties WHERE user_id = auth.uid())
    )
    OR organization_id IN (SELECT organization_id FROM properties WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role full access deposits" ON deposit_schedules
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Políticas para ota_cancellation_policy_mappings (tabela de mapeamento do sistema)
CREATE POLICY "OTA cancellation mappings readable" ON ota_cancellation_policy_mappings
  FOR SELECT USING (true);

CREATE POLICY "Service role full access ota cancellation mappings" ON ota_cancellation_policy_mappings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
COMMENT ON SCHEMA public IS 'Schema com modelo de dados universal para OTAs - Migração 2/5: Cancellation & Rate Plans';


-- ========== 2026020303_ota_reservations_multiroom.sql ==========
-- ============================================================================
-- RENDIZY - MODELO DE DADOS UNIVERSAL PARA OTAs
-- Migração 3 de 5: RESERVATIONS MULTI-ROOM & BILLING
-- ============================================================================
-- Versão: 1.0
-- Data: 2026-02-03
-- Objetivo: Suportar reservas multi-quarto e estrutura de billing para OTAs
-- ============================================================================

-- ============================================================================
-- ALTERAÇÕES NA TABELA RESERVATIONS
-- ============================================================================
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS itinerary_id TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS confirmation_expedia TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS confirmation_property TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS affiliate_reference_id TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS affiliate_metadata TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS travel_purpose TEXT CHECK (travel_purpose IN ('business', 'leisure', 'unspecified'));
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS adjustment_value DECIMAL(10,2);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS adjustment_type TEXT CHECK (adjustment_type IN ('percentage', 'fixed'));
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS adjustment_currency TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS invoicing_consent BOOLEAN DEFAULT false;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS invoicing_company_name TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS invoicing_vat_number TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS invoicing_email TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS merchant_of_record TEXT CHECK (merchant_of_record IN ('property', 'expedia', 'booking', 'ota'));
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS ota_links JSONB DEFAULT '{}';
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS rate_plan_id UUID REFERENCES rate_plans(id);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancellation_policy_id TEXT REFERENCES cancellation_policy_templates(id);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS is_refundable BOOLEAN DEFAULT true;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS refund_currency TEXT;

-- Índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_reservations_itinerary ON reservations(itinerary_id) WHERE itinerary_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reservations_rate_plan ON reservations(rate_plan_id) WHERE rate_plan_id IS NOT NULL;

COMMENT ON COLUMN reservations.itinerary_id IS 'ID do itinerary na OTA (ex: Expedia itinerary_id)';
COMMENT ON COLUMN reservations.merchant_of_record IS 'Quem processa o pagamento: property ou OTA';
COMMENT ON COLUMN reservations.ota_links IS 'Links HATEOAS da OTA (cancel, change, etc)';

-- ============================================================================
-- TABELA 1: RESERVATION ROOMS
-- Quartos individuais de uma reserva (suporte a multi-room)
-- ============================================================================
-- ARQUITETURA RENDIZY:
-- No Rendizy, um "quarto" é um registro em `properties` com locationId apontando
-- para o "local" pai (hotel, pousada). Estrutura:
--   properties (type='location', id=A) ← Hotel
--      └── properties (type='accommodation', locationId=A) ← Quarto 101
--      └── properties (type='accommodation', locationId=A) ← Quarto 102
--
-- Então `property_id` aqui referencia o ANÚNCIO/QUARTO específico reservado.
-- ============================================================================
CREATE TABLE IF NOT EXISTS reservation_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  
  -- Quarto reservado (FK para properties - um anúncio/accommodation)
  property_id UUID REFERENCES properties(id),  -- FK para properties (anúncio/quarto)
  room_type TEXT,                              -- Tipo do quarto (canonical_room_types)
  room_name TEXT,                              -- Nome do quarto/anúncio                         -- Nome do quarto
  
  -- Rate Plan deste quarto
  rate_plan_id UUID REFERENCES rate_plans(id),
  
  -- Confirmações por OTA
  confirmation_expedia TEXT,
  confirmation_property TEXT,
  confirmation_booking TEXT,
  confirmation_airbnb TEXT,
  
  -- ============================================================================
  -- OCUPAÇÃO DESTE QUARTO
  -- ============================================================================
  number_of_adults INTEGER DEFAULT 1,
  number_of_children INTEGER DEFAULT 0,
  child_ages INTEGER[],                   -- Array de idades das crianças
  
  -- ============================================================================
  -- HÓSPEDE PRINCIPAL DESTE QUARTO
  -- ============================================================================
  guest_given_name TEXT NOT NULL,
  guest_family_name TEXT NOT NULL,
  guest_middle_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  guest_date_of_birth DATE,
  
  -- Documento do hóspede
  guest_document_type TEXT,               -- 'cpf', 'passport', 'rg'
  guest_document_number TEXT,
  guest_nationality TEXT,                 -- ISO country code
  
  -- ============================================================================
  -- PREFERÊNCIAS DO QUARTO
  -- ============================================================================
  smoking BOOLEAN DEFAULT false,
  special_request TEXT,
  loyalty_id TEXT,
  loyalty_program_name TEXT,
  
  -- Cama selecionada
  bed_group_id TEXT,                      -- ID do grupo de camas selecionado
  bed_preference TEXT,                    -- 'king', 'twin', 'any'
  
  -- ============================================================================
  -- PRICING DESTE QUARTO
  -- ============================================================================
  -- Breakdown do preço (Expedia fornece por noite)
  pricing_nightly JSONB,
  /*
  [
    {
      "date": "2026-03-01",
      "components": [
        {"type": "base_rate", "value": "150.00", "currency": "BRL"},
        {"type": "tax", "value": "15.00", "currency": "BRL"},
        {"type": "resort_fee", "value": "10.00", "currency": "BRL"}
      ]
    },
    ...
  ]
  */
  
  -- Totais do quarto
  pricing_subtotal DECIMAL(10,2),
  pricing_taxes DECIMAL(10,2),
  pricing_fees DECIMAL(10,2),
  pricing_total DECIMAL(10,2),
  pricing_currency TEXT DEFAULT 'BRL',
  
  -- ============================================================================
  -- STATUS
  -- ============================================================================
  status TEXT DEFAULT 'confirmed' CHECK (status IN (
    'pending',
    'confirmed',
    'checked_in',
    'checked_out',
    'cancelled',
    'no_show'
  )),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  -- ============================================================================
  -- METADADOS
  -- ============================================================================
  ota_room_data JSONB DEFAULT '{}',       -- Dados adicionais da OTA
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservation_rooms_reservation ON reservation_rooms(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_rooms_property ON reservation_rooms(property_id);
CREATE INDEX IF NOT EXISTS idx_reservation_rooms_rate_plan ON reservation_rooms(rate_plan_id);
CREATE INDEX IF NOT EXISTS idx_reservation_rooms_status ON reservation_rooms(status);
CREATE INDEX IF NOT EXISTS idx_reservation_rooms_guest_name ON reservation_rooms(guest_family_name, guest_given_name);

COMMENT ON TABLE reservation_rooms IS 'Quartos individuais de uma reserva multi-room. property_id referencia properties (anúncio/accommodation)';
COMMENT ON COLUMN reservation_rooms.property_id IS 'FK para properties - o anúncio/quarto específico reservado';
COMMENT ON COLUMN reservation_rooms.pricing_nightly IS 'Breakdown de preço por noite no formato universal';

-- ============================================================================
-- TABELA 2: BILLING CONTACTS
-- Contato de cobrança separado do hóspede
-- ============================================================================
CREATE TABLE IF NOT EXISTS billing_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  
  -- Pode também ser um contato geral (sem reserva)
  crm_contact_id UUID REFERENCES crm_contacts(id),
  
  -- ============================================================================
  -- DADOS PESSOAIS
  -- ============================================================================
  given_name TEXT NOT NULL,
  family_name TEXT NOT NULL,
  company_name TEXT,                      -- Para reservas corporativas
  
  -- ============================================================================
  -- ENDEREÇO ESTRUTURADO
  -- ============================================================================
  address_line_1 TEXT,
  address_line_2 TEXT,
  address_line_3 TEXT,
  address_city TEXT,
  address_state_code TEXT,                -- Código do estado (ex: 'SP')
  address_state_name TEXT,                -- Nome do estado (ex: 'São Paulo')
  address_postal_code TEXT,
  address_country_code TEXT NOT NULL DEFAULT 'BR',  -- ISO 2-letter
  
  -- ============================================================================
  -- CONTATO
  -- ============================================================================
  email TEXT,
  
  -- Telefone estruturado
  phone_country_code TEXT,                -- '+55'
  phone_area_code TEXT,                   -- '11'
  phone_number TEXT,                      -- '999999999'
  phone_full TEXT,                        -- Para compatibilidade: '+5511999999999'
  
  -- ============================================================================
  -- DADOS FISCAIS
  -- ============================================================================
  vat_number TEXT,                        -- CNPJ ou VAT number
  tax_id TEXT,                            -- CPF ou Tax ID
  
  -- ============================================================================
  -- METADADOS
  -- ============================================================================
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_contacts_org ON billing_contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_contacts_reservation ON billing_contacts(reservation_id);
CREATE INDEX IF NOT EXISTS idx_billing_contacts_crm ON billing_contacts(crm_contact_id);

COMMENT ON TABLE billing_contacts IS 'Contato de cobrança separado do hóspede - requerido por Expedia';

-- ============================================================================
-- TABELA 3: ADDITIONAL GUESTS
-- Hóspedes adicionais de uma reserva/quarto
-- ============================================================================
CREATE TABLE IF NOT EXISTS reservation_additional_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  reservation_room_id UUID REFERENCES reservation_rooms(id) ON DELETE CASCADE,
  
  -- Dados do hóspede
  given_name TEXT NOT NULL,
  family_name TEXT NOT NULL,
  date_of_birth DATE,
  age INTEGER,                            -- Calculado ou informado
  
  -- Tipo
  guest_type TEXT DEFAULT 'adult' CHECK (guest_type IN ('adult', 'child', 'infant')),
  
  -- Documento
  document_type TEXT,
  document_number TEXT,
  nationality TEXT,
  
  -- Contato (opcional)
  email TEXT,
  phone TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_additional_guests_reservation ON reservation_additional_guests(reservation_id);
CREATE INDEX IF NOT EXISTS idx_additional_guests_room ON reservation_additional_guests(reservation_room_id);

COMMENT ON TABLE reservation_additional_guests IS 'Hóspedes adicionais de uma reserva';

-- ============================================================================
-- TABELA 4: RESERVATION PRICING BREAKDOWN
-- Breakdown detalhado do preço da reserva
-- ============================================================================
CREATE TABLE IF NOT EXISTS reservation_pricing_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  reservation_room_id UUID REFERENCES reservation_rooms(id) ON DELETE CASCADE,
  
  -- Tipo de componente
  component_type TEXT NOT NULL CHECK (component_type IN (
    'base_rate',            -- Tarifa base
    'extra_guest',          -- Taxa por hóspede extra
    'extra_child',          -- Taxa por criança
    'cleaning_fee',         -- Taxa de limpeza
    'resort_fee',           -- Resort fee
    'service_fee',          -- Taxa de serviço
    'tax',                  -- Imposto genérico
    'sales_tax',            -- Imposto de venda
    'occupancy_tax',        -- Imposto de ocupação
    'tourism_tax',          -- Taxa de turismo
    'marketing_fee',        -- Taxa de marketing (OTA)
    'platform_commission',  -- Comissão da plataforma
    'property_fee',         -- Taxa da propriedade
    'discount',             -- Desconto
    'promotion',            -- Promoção
    'adjustment',           -- Ajuste manual
    'deposit',              -- Depósito
    'other'                 -- Outro
  )),
  
  -- Descrição
  description TEXT,
  description_en TEXT,
  
  -- Valor
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  
  -- Se é por noite ou por estadia
  calculation_type TEXT DEFAULT 'per_stay' CHECK (calculation_type IN (
    'per_stay',             -- Total da estadia
    'per_night',            -- Por noite
    'per_guest',            -- Por hóspede
    'per_guest_per_night'   -- Por hóspede por noite
  )),
  
  -- Data específica (se per_night)
  date DATE,
  
  -- Flags
  is_inclusive BOOLEAN DEFAULT true,      -- Incluído no total?
  is_paid_at_property BOOLEAN DEFAULT false,  -- Pago no local?
  is_refundable BOOLEAN DEFAULT true,
  
  -- Metadados OTA
  ota_component_id TEXT,                  -- ID do componente na OTA
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_breakdown_reservation ON reservation_pricing_breakdown(reservation_id);
CREATE INDEX IF NOT EXISTS idx_pricing_breakdown_room ON reservation_pricing_breakdown(reservation_room_id);
CREATE INDEX IF NOT EXISTS idx_pricing_breakdown_type ON reservation_pricing_breakdown(component_type);
CREATE INDEX IF NOT EXISTS idx_pricing_breakdown_date ON reservation_pricing_breakdown(date);

COMMENT ON TABLE reservation_pricing_breakdown IS 'Breakdown detalhado do preço - compatível com formato Expedia';

-- ============================================================================
-- TABELA 5: RESERVATION DEPOSITS
-- Depósitos programados/pagos de uma reserva
-- ============================================================================
CREATE TABLE IF NOT EXISTS reservation_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  
  -- Valor
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  
  -- Tipo
  deposit_type TEXT NOT NULL CHECK (deposit_type IN (
    'booking',              -- Depósito na reserva
    'damage',               -- Caução/dano
    'security',             -- Depósito de segurança
    'other'
  )),
  
  -- Vencimento
  due_date DATE,
  due_datetime TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',              -- Aguardando
    'paid',                 -- Pago
    'refunded',             -- Reembolsado
    'retained',             -- Retido (dano, etc)
    'cancelled'             -- Cancelado
  )),
  
  -- Pagamento
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  payment_reference TEXT,
  
  -- Reembolso
  refunded_at TIMESTAMPTZ,
  refunded_amount DECIMAL(10,2),
  refund_reason TEXT,
  
  -- Metadados
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservation_deposits_reservation ON reservation_deposits(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_deposits_status ON reservation_deposits(status);
CREATE INDEX IF NOT EXISTS idx_reservation_deposits_due ON reservation_deposits(due_date);

COMMENT ON TABLE reservation_deposits IS 'Depósitos e cauções de reservas';

-- ============================================================================
-- TABELA 6: RESERVATION HISTORY
-- Histórico de mudanças na reserva (audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS reservation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  reservation_room_id UUID REFERENCES reservation_rooms(id) ON DELETE CASCADE,
  
  -- Tipo de evento
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created',              -- Reserva criada
    'confirmed',            -- Confirmada
    'modified',             -- Modificada
    'cancelled',            -- Cancelada
    'checked_in',           -- Check-in realizado
    'checked_out',          -- Check-out realizado
    'no_show',              -- No-show
    'price_changed',        -- Preço alterado
    'dates_changed',        -- Datas alteradas
    'guests_changed',       -- Hóspedes alterados
    'room_changed',         -- Quarto alterado
    'payment_received',     -- Pagamento recebido
    'refund_issued',        -- Reembolso emitido
    'note_added',           -- Nota adicionada
    'synced'                -- Sincronizado com OTA
  )),
  
  -- Descrição
  description TEXT,
  
  -- Dados anteriores (snapshot)
  previous_data JSONB,
  
  -- Dados novos
  new_data JSONB,
  
  -- Quem fez
  actor_type TEXT CHECK (actor_type IN ('user', 'system', 'ota', 'guest')),
  actor_id UUID,                          -- User ID se 'user'
  actor_name TEXT,
  
  -- OTA info
  ota TEXT,
  ota_event_id TEXT,
  
  -- Metadados
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservation_history_reservation ON reservation_history(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_history_room ON reservation_history(reservation_room_id);
CREATE INDEX IF NOT EXISTS idx_reservation_history_type ON reservation_history(event_type);
CREATE INDEX IF NOT EXISTS idx_reservation_history_created ON reservation_history(created_at DESC);

COMMENT ON TABLE reservation_history IS 'Histórico de mudanças na reserva - audit trail completo';

-- ============================================================================
-- TABELA 7: RESERVATION CANCELLATIONS
-- Detalhes de cancelamento de reservas
-- ============================================================================
CREATE TABLE IF NOT EXISTS reservation_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  reservation_room_id UUID REFERENCES reservation_rooms(id) ON DELETE CASCADE,
  
  -- Quando foi cancelada
  cancelled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Por quem
  cancelled_by_type TEXT CHECK (cancelled_by_type IN ('guest', 'host', 'ota', 'system')),
  cancelled_by_id UUID,
  cancelled_by_name TEXT,
  
  -- Motivo
  cancellation_reason TEXT,
  cancellation_code TEXT,                 -- Código padronizado se houver
  
  -- Política aplicada
  cancellation_policy_id TEXT REFERENCES cancellation_policy_templates(id),
  
  -- Penalidade aplicada
  penalty_amount DECIMAL(10,2),
  penalty_currency TEXT DEFAULT 'BRL',
  penalty_type TEXT,                      -- 'percentage', 'fixed', 'nights'
  
  -- Reembolso
  refund_amount DECIMAL(10,2),
  refund_currency TEXT DEFAULT 'BRL',
  refund_status TEXT CHECK (refund_status IN ('pending', 'processing', 'completed', 'failed')),
  refund_processed_at TIMESTAMPTZ,
  refund_reference TEXT,
  
  -- OTA info
  ota TEXT,
  ota_cancellation_id TEXT,
  
  -- Metadados
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservation_cancellations_reservation ON reservation_cancellations(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_cancellations_date ON reservation_cancellations(cancelled_at);

COMMENT ON TABLE reservation_cancellations IS 'Detalhes de cancelamento de reservas';

-- ============================================================================
-- ALTERAÇÕES NA TABELA CRM_CONTACTS
-- Adicionar campos estruturados
-- ============================================================================
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS phone_country_code TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS phone_area_code TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS phone_number_only TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS address_country_code TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS loyalty_program_name TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS loyalty_program_id TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS loyalty_id TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS prefers_smoking BOOLEAN DEFAULT false;

COMMENT ON COLUMN crm_contacts.phone_country_code IS 'Código do país do telefone (ex: +55)';
COMMENT ON COLUMN crm_contacts.address_country_code IS 'Código ISO 2-letter do país';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger para atualizar updated_at em reservation_rooms
DROP TRIGGER IF EXISTS update_reservation_rooms_updated_at ON reservation_rooms;
CREATE TRIGGER update_reservation_rooms_updated_at
  BEFORE UPDATE ON reservation_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar updated_at em billing_contacts
DROP TRIGGER IF EXISTS update_billing_contacts_updated_at ON billing_contacts;
CREATE TRIGGER update_billing_contacts_updated_at
  BEFORE UPDATE ON billing_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para criar histórico automaticamente quando reserva muda
CREATE OR REPLACE FUNCTION log_reservation_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Só loga se houve mudança real
  IF TG_OP = 'UPDATE' AND OLD IS DISTINCT FROM NEW THEN
    INSERT INTO reservation_history (
      reservation_id,
      event_type,
      description,
      previous_data,
      new_data,
      actor_type
    ) VALUES (
      NEW.id,
      CASE 
        WHEN OLD.status != NEW.status THEN NEW.status
        WHEN OLD.check_in != NEW.check_in OR OLD.check_out != NEW.check_out THEN 'dates_changed'
        WHEN OLD.pricing_total != NEW.pricing_total THEN 'price_changed'
        ELSE 'modified'
      END,
      'Reserva atualizada automaticamente',
      to_jsonb(OLD),
      to_jsonb(NEW),
      'system'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_reservation_changes_trigger ON reservations;
CREATE TRIGGER log_reservation_changes_trigger
  AFTER UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION log_reservation_changes();

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================
-- NOTA: O Rendizy usa multi-tenancy via organization_id direto nas tabelas.
-- O backend (Edge Functions) é responsável por filtrar por organization_id.
-- RLS aqui é para proteção extra via service_role.
-- ============================================================================
ALTER TABLE reservation_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_additional_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_pricing_breakdown ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_cancellations ENABLE ROW LEVEL SECURITY;

-- Políticas baseadas na reserva
CREATE POLICY "Reservation rooms via reservation" ON reservation_rooms
  FOR SELECT USING (
    reservation_id IN (
      SELECT id FROM reservations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access reservation rooms" ON reservation_rooms
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Billing contacts via org" ON billing_contacts
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM properties WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role full access billing contacts" ON billing_contacts
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Additional guests via reservation" ON reservation_additional_guests
  FOR SELECT USING (
    reservation_id IN (
      SELECT id FROM reservations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access additional guests" ON reservation_additional_guests
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Pricing breakdown via reservation" ON reservation_pricing_breakdown
  FOR SELECT USING (
    reservation_id IN (
      SELECT id FROM reservations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access pricing breakdown" ON reservation_pricing_breakdown
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Reservation deposits via reservation" ON reservation_deposits
  FOR SELECT USING (
    reservation_id IN (
      SELECT id FROM reservations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access reservation deposits" ON reservation_deposits
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Reservation history via reservation" ON reservation_history
  FOR SELECT USING (
    reservation_id IN (
      SELECT id FROM reservations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access reservation history" ON reservation_history
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Reservation cancellations via reservation" ON reservation_cancellations
  FOR SELECT USING (
    reservation_id IN (
      SELECT id FROM reservations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access reservation cancellations" ON reservation_cancellations
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
COMMENT ON SCHEMA public IS 'Schema com modelo de dados universal para OTAs - Migração 3/5: Reservations Multi-Room & Billing';


-- ========== 2026020304_ota_payments_3dsecure.sql ==========
-- ============================================================================
-- RENDIZY - MODELO DE DADOS UNIVERSAL PARA OTAs
-- Migração 4 de 5: PAYMENTS & 3D SECURE
-- ============================================================================
-- Versão: 1.0
-- Data: 2026-02-03
-- Objetivo: Suportar pagamentos, 3D Secure e fluxos de OTA
-- ============================================================================

-- ============================================================================
-- TABELA 1: PAYMENT SESSIONS
-- Sessões de pagamento (3D Secure flow para Expedia e outras OTAs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  
  -- Identificadores
  session_id TEXT UNIQUE,                 -- ID da sessão na OTA (ex: Expedia payment session)
  external_reference TEXT,                -- Referência externa
  
  -- OTA
  ota TEXT NOT NULL,                      -- 'expedia', 'booking', etc
  
  -- ============================================================================
  -- 3D SECURE DATA
  -- ============================================================================
  three_ds_version TEXT,                  -- '2.2.0', '1.0', etc
  
  -- Dados de autenticação 3DS
  cavv TEXT,                              -- Cardholder Authentication Verification Value
  eci TEXT,                               -- Electronic Commerce Indicator
  ds_transaction_id TEXT,                 -- Directory Server Transaction ID
  acs_transaction_id TEXT,                -- Access Control Server Transaction ID
  pa_res_status TEXT,                     -- Payer Authentication Response Status
  ve_res_status TEXT,                     -- Verification Response Status
  xid TEXT,                               -- Transaction ID (3DS 1.0)
  cavv_algorithm TEXT,                    -- Algoritmo usado para CAVV
  ucaf_indicator TEXT,                    -- Universal Cardholder Authentication Field (Mastercard)
  
  -- ============================================================================
  -- STATUS DA SESSÃO
  -- ============================================================================
  status TEXT DEFAULT 'created' CHECK (status IN (
    'created',              -- Sessão criada
    'challenge_required',   -- Challenge 3DS necessário
    'challenge_sent',       -- Challenge enviado ao usuário
    'authenticated',        -- Autenticação bem-sucedida
    'authentication_failed',-- Autenticação falhou
    'completed',            -- Pagamento concluído
    'expired',              -- Sessão expirada
    'cancelled',            -- Sessão cancelada
    'error'                 -- Erro
  )),
  
  -- ============================================================================
  -- CHALLENGE DATA
  -- ============================================================================
  challenge_required BOOLEAN DEFAULT false,
  challenge_url TEXT,                     -- URL para iframe de challenge
  encoded_challenge_config TEXT,          -- Configuração codificada do challenge
  preferred_challenge_window_size TEXT,   -- 'fullPage', '250x400', etc
  challenge_completed_at TIMESTAMPTZ,
  
  -- ============================================================================
  -- BROWSER DATA
  -- ============================================================================
  browser_accept_header TEXT,
  browser_user_agent TEXT,
  browser_language TEXT,
  browser_color_depth INTEGER,
  browser_screen_height INTEGER,
  browser_screen_width INTEGER,
  browser_time_zone INTEGER,
  browser_java_enabled BOOLEAN,
  browser_javascript_enabled BOOLEAN,
  encoded_browser_metadata TEXT,
  
  -- IP do cliente
  client_ip TEXT,
  
  -- ============================================================================
  -- DADOS DO CARTÃO (tokenizado/mascarado)
  -- ============================================================================
  card_last_four TEXT,                    -- Últimos 4 dígitos
  card_brand TEXT,                        -- 'visa', 'mastercard', 'amex', etc
  card_expiration_month TEXT,             -- 'MM'
  card_expiration_year TEXT,              -- 'YYYY'
  card_holder_name TEXT,
  
  -- Token do cartão (se usar tokenização)
  card_token TEXT,
  card_token_provider TEXT,               -- 'stripe', 'pagarme', 'cielo', etc
  
  -- ============================================================================
  -- PAYMENT TYPE
  -- ============================================================================
  payment_type TEXT CHECK (payment_type IN (
    'customer_card',        -- Cartão do cliente
    'corporate_card',       -- Cartão corporativo
    'virtual_card',         -- Cartão virtual (gerado pela OTA)
    'affiliate_collect',    -- Coletado pelo afiliado
    'property_collect',     -- Coletado pela propriedade
    'pix',                  -- PIX
    'boleto',               -- Boleto
    'bank_transfer',        -- Transferência bancária
    'other'
  )),
  
  -- ============================================================================
  -- VALORES
  -- ============================================================================
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'BRL',
  
  -- ============================================================================
  -- EXPIRATION
  -- ============================================================================
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- ============================================================================
  -- ERROR HANDLING
  -- ============================================================================
  error_code TEXT,
  error_message TEXT,
  error_details JSONB,
  
  -- ============================================================================
  -- METADATA
  -- ============================================================================
  metadata JSONB DEFAULT '{}',
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_sessions_org ON payment_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_reservation ON payment_sessions(reservation_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_session_id ON payment_sessions(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_sessions_status ON payment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_ota ON payment_sessions(ota);

COMMENT ON TABLE payment_sessions IS 'Sessões de pagamento para 3D Secure e fluxos de OTA';
COMMENT ON COLUMN payment_sessions.cavv IS 'Cardholder Authentication Verification Value - prova de autenticação 3DS';

-- ============================================================================
-- TABELA 2: PAYMENTS
-- Pagamentos recebidos de reservas
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  payment_session_id UUID REFERENCES payment_sessions(id),
  
  -- Identificadores externos
  external_id TEXT,                       -- ID no gateway de pagamento
  ota_payment_id TEXT,                    -- ID de pagamento na OTA
  
  -- ============================================================================
  -- TIPO E MÉTODO
  -- ============================================================================
  payment_type TEXT NOT NULL CHECK (payment_type IN (
    'booking',              -- Pagamento da reserva
    'deposit',              -- Depósito/caução
    'additional',           -- Cobrança adicional
    'refund',               -- Reembolso (valor negativo)
    'chargeback',           -- Chargeback
    'adjustment'            -- Ajuste
  )),
  
  payment_method TEXT CHECK (payment_method IN (
    'credit_card',
    'debit_card',
    'pix',
    'boleto',
    'bank_transfer',
    'cash',
    'check',
    'virtual_card',         -- Cartão virtual da OTA
    'ota_collect',          -- Coletado pela OTA
    'other'
  )),
  
  -- ============================================================================
  -- VALORES
  -- ============================================================================
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  
  -- Taxas
  gateway_fee DECIMAL(10,2) DEFAULT 0,
  ota_fee DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2),               -- amount - fees
  
  -- ============================================================================
  -- STATUS
  -- ============================================================================
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',              -- Aguardando
    'processing',           -- Em processamento
    'authorized',           -- Autorizado (não capturado)
    'captured',             -- Capturado/pago
    'completed',            -- Concluído
    'failed',               -- Falhou
    'cancelled',            -- Cancelado
    'refunded',             -- Reembolsado
    'partially_refunded',   -- Parcialmente reembolsado
    'disputed',             -- Em disputa
    'chargeback'            -- Chargeback
  )),
  
  -- ============================================================================
  -- DATAS
  -- ============================================================================
  authorized_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  -- ============================================================================
  -- CARTÃO (mascarado)
  -- ============================================================================
  card_last_four TEXT,
  card_brand TEXT,
  card_holder_name TEXT,
  
  -- ============================================================================
  -- BILLING CONTACT
  -- ============================================================================
  billing_contact_id UUID REFERENCES billing_contacts(id),
  
  -- ============================================================================
  -- OTA INFO
  -- ============================================================================
  ota TEXT,                               -- 'expedia', 'booking', etc
  merchant_of_record TEXT,                -- 'property', 'ota', 'expedia'
  
  -- ============================================================================
  -- GATEWAY INFO
  -- ============================================================================
  gateway TEXT,                           -- 'stripe', 'pagarme', 'cielo'
  gateway_transaction_id TEXT,
  gateway_response JSONB,
  
  -- ============================================================================
  -- PIX INFO (se aplicável)
  -- ============================================================================
  pix_key TEXT,
  pix_qr_code TEXT,
  pix_copy_paste TEXT,
  pix_expires_at TIMESTAMPTZ,
  
  -- ============================================================================
  -- BOLETO INFO (se aplicável)
  -- ============================================================================
  boleto_barcode TEXT,
  boleto_url TEXT,
  boleto_expires_at TIMESTAMPTZ,
  
  -- ============================================================================
  -- ERROR HANDLING
  -- ============================================================================
  error_code TEXT,
  error_message TEXT,
  
  -- ============================================================================
  -- METADATA
  -- ============================================================================
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_reservation ON payments(reservation_id);
CREATE INDEX IF NOT EXISTS idx_payments_session ON payments(payment_session_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_ota ON payments(ota);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);

COMMENT ON TABLE payments IS 'Pagamentos recebidos de reservas';

-- ============================================================================
-- TABELA 3: REFUNDS
-- Reembolsos de pagamentos
-- ============================================================================
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id),
  
  -- Identificadores externos
  external_id TEXT,                       -- ID no gateway
  ota_refund_id TEXT,                     -- ID de reembolso na OTA
  
  -- ============================================================================
  -- VALORES
  -- ============================================================================
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  
  -- ============================================================================
  -- TIPO E MOTIVO
  -- ============================================================================
  refund_type TEXT NOT NULL CHECK (refund_type IN (
    'full',                 -- Reembolso total
    'partial',              -- Reembolso parcial
    'cancellation',         -- Por cancelamento
    'dispute',              -- Por disputa
    'error',                -- Por erro
    'goodwill',             -- Boa vontade/cortesia
    'other'
  )),
  
  reason TEXT,
  reason_code TEXT,
  
  -- ============================================================================
  -- STATUS
  -- ============================================================================
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled'
  )),
  
  -- ============================================================================
  -- DATAS
  -- ============================================================================
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- ============================================================================
  -- QUEM SOLICITOU
  -- ============================================================================
  requested_by_type TEXT CHECK (requested_by_type IN ('user', 'guest', 'ota', 'system')),
  requested_by_id UUID,
  requested_by_name TEXT,
  
  -- ============================================================================
  -- GATEWAY INFO
  -- ============================================================================
  gateway TEXT,
  gateway_refund_id TEXT,
  gateway_response JSONB,
  
  -- ============================================================================
  -- ERROR
  -- ============================================================================
  error_code TEXT,
  error_message TEXT,
  
  -- ============================================================================
  -- METADATA
  -- ============================================================================
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refunds_org ON refunds(organization_id);
CREATE INDEX IF NOT EXISTS idx_refunds_payment ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_reservation ON refunds(reservation_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);

COMMENT ON TABLE refunds IS 'Reembolsos de pagamentos';

-- ============================================================================
-- TABELA 4: VIRTUAL CARDS
-- Cartões virtuais gerados por OTAs (Expedia Collect, Booking VCC)
-- ============================================================================
CREATE TABLE IF NOT EXISTS virtual_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  
  -- OTA que gerou
  ota TEXT NOT NULL,                      -- 'expedia', 'booking'
  
  -- ============================================================================
  -- DADOS DO CARTÃO
  -- ============================================================================
  card_number TEXT,                       -- Criptografado ou tokenizado
  card_last_four TEXT,
  card_brand TEXT,
  card_expiration_month TEXT,
  card_expiration_year TEXT,
  card_cvv TEXT,                          -- Criptografado
  card_holder_name TEXT,
  
  -- ============================================================================
  -- VALORES E LIMITES
  -- ============================================================================
  authorized_amount DECIMAL(10,2),
  currency TEXT DEFAULT 'BRL',
  available_amount DECIMAL(10,2),         -- Disponível para cobrança
  
  -- ============================================================================
  -- JANELA DE USO
  -- ============================================================================
  valid_from DATE,                        -- Quando pode começar a usar
  valid_to DATE,                          -- Até quando pode usar
  activation_date DATE,                   -- Data de ativação
  
  -- ============================================================================
  -- STATUS
  -- ============================================================================
  status TEXT DEFAULT 'active' CHECK (status IN (
    'pending',              -- Aguardando ativação
    'active',               -- Ativo
    'used',                 -- Usado (cobrança realizada)
    'expired',              -- Expirado
    'cancelled',            -- Cancelado
    'declined'              -- Negado
  )),
  
  -- ============================================================================
  -- COBRANÇAS REALIZADAS
  -- ============================================================================
  total_charged DECIMAL(10,2) DEFAULT 0,
  charge_count INTEGER DEFAULT 0,
  last_charged_at TIMESTAMPTZ,
  
  -- ============================================================================
  -- METADATA
  -- ============================================================================
  ota_card_id TEXT,                       -- ID do cartão na OTA
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_virtual_cards_org ON virtual_cards(organization_id);
CREATE INDEX IF NOT EXISTS idx_virtual_cards_reservation ON virtual_cards(reservation_id);
CREATE INDEX IF NOT EXISTS idx_virtual_cards_status ON virtual_cards(status);
CREATE INDEX IF NOT EXISTS idx_virtual_cards_ota ON virtual_cards(ota);

COMMENT ON TABLE virtual_cards IS 'Cartões virtuais gerados por OTAs para pagamento de reservas';

-- ============================================================================
-- TABELA 5: PAYMENT METHODS (saved cards)
-- Métodos de pagamento salvos dos hóspedes
-- ============================================================================
CREATE TABLE IF NOT EXISTS saved_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  crm_contact_id UUID REFERENCES crm_contacts(id) ON DELETE CASCADE,
  
  -- ============================================================================
  -- TIPO
  -- ============================================================================
  payment_method_type TEXT NOT NULL CHECK (payment_method_type IN (
    'credit_card',
    'debit_card',
    'pix_key',
    'bank_account'
  )),
  
  -- ============================================================================
  -- CARTÃO (mascarado)
  -- ============================================================================
  card_last_four TEXT,
  card_brand TEXT,
  card_expiration_month TEXT,
  card_expiration_year TEXT,
  card_holder_name TEXT,
  
  -- Token do gateway
  card_token TEXT,
  gateway TEXT,
  
  -- ============================================================================
  -- PIX
  -- ============================================================================
  pix_key TEXT,
  pix_key_type TEXT,                      -- 'cpf', 'phone', 'email', 'random'
  
  -- ============================================================================
  -- CONTA BANCÁRIA
  -- ============================================================================
  bank_code TEXT,
  bank_name TEXT,
  bank_branch TEXT,
  bank_account TEXT,
  bank_account_type TEXT,                 -- 'checking', 'savings'
  
  -- ============================================================================
  -- BILLING ADDRESS
  -- ============================================================================
  billing_address_line_1 TEXT,
  billing_address_city TEXT,
  billing_address_state TEXT,
  billing_address_postal_code TEXT,
  billing_address_country TEXT,
  
  -- ============================================================================
  -- FLAGS
  -- ============================================================================
  is_default BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  
  -- ============================================================================
  -- METADATA
  -- ============================================================================
  nickname TEXT,                          -- Nome dado pelo usuário
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_saved_payment_methods_org ON saved_payment_methods(organization_id);
CREATE INDEX IF NOT EXISTS idx_saved_payment_methods_contact ON saved_payment_methods(crm_contact_id);
CREATE INDEX IF NOT EXISTS idx_saved_payment_methods_default ON saved_payment_methods(crm_contact_id, is_default) WHERE is_default = true;

COMMENT ON TABLE saved_payment_methods IS 'Métodos de pagamento salvos dos hóspedes';

-- ============================================================================
-- TABELA 6: CORPORATE PAYMENT HANDLING
-- Configurações especiais para pagamentos corporativos (Expedia)
-- ============================================================================
CREATE TABLE IF NOT EXISTS corporate_payment_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  
  -- ============================================================================
  -- AUTHORIZED EXPENSES
  -- ============================================================================
  authorized_expenses TEXT,               -- Descrição de despesas autorizadas
  specified_incidental_expenses TEXT[],   -- Lista de despesas específicas
  
  -- ============================================================================
  -- LIMITES
  -- ============================================================================
  total_charges_allowed DECIMAL(10,2),
  total_charges_currency TEXT DEFAULT 'BRL',
  
  -- ============================================================================
  -- AUTORIZAÇÃO
  -- ============================================================================
  is_cvc_required BOOLEAN DEFAULT true,
  authorizing_company TEXT,
  
  -- ============================================================================
  -- CONTATO DO CARTÃO
  -- ============================================================================
  card_contact_given_name TEXT,
  card_contact_family_name TEXT,
  card_contact_email TEXT,
  card_contact_phone TEXT,
  
  -- ============================================================================
  -- PERÍODO DE PAGAMENTO
  -- ============================================================================
  payment_allowable_period_start TIMESTAMPTZ,
  payment_allowable_period_end TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corporate_payment_reservation ON corporate_payment_configs(reservation_id);

COMMENT ON TABLE corporate_payment_configs IS 'Configurações especiais para pagamentos corporativos';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_payment_sessions_updated_at ON payment_sessions;
CREATE TRIGGER update_payment_sessions_updated_at
  BEFORE UPDATE ON payment_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_refunds_updated_at ON refunds;
CREATE TRIGGER update_refunds_updated_at
  BEFORE UPDATE ON refunds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_virtual_cards_updated_at ON virtual_cards;
CREATE TRIGGER update_virtual_cards_updated_at
  BEFORE UPDATE ON virtual_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar net_amount em payments
CREATE OR REPLACE FUNCTION calculate_payment_net_amount()
RETURNS TRIGGER AS $$
BEGIN
  NEW.net_amount = COALESCE(NEW.amount, 0) - COALESCE(NEW.gateway_fee, 0) - COALESCE(NEW.ota_fee, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_payment_net_amount_trigger ON payments;
CREATE TRIGGER calculate_payment_net_amount_trigger
  BEFORE INSERT OR UPDATE OF amount, gateway_fee, ota_fee ON payments
  FOR EACH ROW
  EXECUTE FUNCTION calculate_payment_net_amount();

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================
-- NOTA: O Rendizy usa multi-tenancy via organization_id direto nas tabelas.
-- O backend (Edge Functions) é responsável por filtrar por organization_id.
-- RLS aqui é para proteção extra via service_role.
-- ============================================================================
ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE virtual_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_payment_configs ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Payment sessions via org" ON payment_sessions
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM properties WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role full access payment sessions" ON payment_sessions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Payments via org" ON payments
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM properties WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role full access payments" ON payments
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Refunds via org" ON refunds
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM properties WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role full access refunds" ON refunds
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Virtual cards via org" ON virtual_cards
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM properties WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role full access virtual cards" ON virtual_cards
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Saved payment methods via org" ON saved_payment_methods
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM properties WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role full access saved payment methods" ON saved_payment_methods
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Corporate payment configs via reservation" ON corporate_payment_configs
  FOR SELECT USING (
    reservation_id IN (SELECT id FROM reservations WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role full access corporate payment configs" ON corporate_payment_configs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
COMMENT ON SCHEMA public IS 'Schema com modelo de dados universal para OTAs - Migração 4/5: Payments & 3D Secure';


-- ========== 2026020305_ota_webhooks_extensions.sql ==========
-- ============================================================================
-- RENDIZY - MODELO DE DADOS UNIVERSAL PARA OTAs
-- Migração 5 de 5: WEBHOOKS, PROPERTY EXTENSIONS & SYNC
-- ============================================================================
-- Versão: 1.0
-- Data: 2026-02-03
-- Objetivo: Suportar webhooks de OTAs, extensões de propriedade e sincronização
-- ============================================================================

-- ============================================================================
-- TABELA 1: OTA WEBHOOKS
-- Webhooks recebidos de todas as OTAs
-- ============================================================================
CREATE TABLE IF NOT EXISTS ota_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- ============================================================================
  -- IDENTIFICAÇÃO DO EVENTO
  -- ============================================================================
  event_id TEXT,                          -- ID único do evento na OTA (idempotency)
  event_type TEXT NOT NULL,               -- Tipo do evento (ex: 'itinerary.agent.create')
  event_time TIMESTAMPTZ,                 -- Timestamp do evento na OTA
  
  -- OTA
  ota TEXT NOT NULL,                      -- 'expedia', 'booking', 'airbnb', 'staysnet'
  
  -- ============================================================================
  -- REFERÊNCIAS
  -- ============================================================================
  -- IDs externos
  ota_itinerary_id TEXT,                  -- ID do itinerary/booking na OTA
  ota_property_id TEXT,                   -- ID da property na OTA
  ota_room_id TEXT,                       -- ID do room na OTA
  
  -- IDs internos (preenchidos após processamento)
  reservation_id UUID REFERENCES reservations(id),
  property_id UUID REFERENCES properties(id),
  
  -- ============================================================================
  -- PAYLOAD
  -- ============================================================================
  payload JSONB NOT NULL,                 -- Payload completo do webhook
  headers JSONB,                          -- Headers do request (para debug)
  
  -- ============================================================================
  -- PROCESSAMENTO
  -- ============================================================================
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  processing_attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  
  -- Resultado do processamento
  processing_result TEXT CHECK (processing_result IN (
    'success',              -- Processado com sucesso
    'skipped',              -- Ignorado (duplicado, irrelevante, etc)
    'failed',               -- Falhou
    'pending'               -- Pendente de processamento manual
  )),
  processing_error TEXT,
  processing_details JSONB,
  
  -- ============================================================================
  -- VALIDAÇÃO
  -- ============================================================================
  signature TEXT,                         -- Assinatura do webhook
  signature_valid BOOLEAN,                -- Assinatura válida?
  
  -- ============================================================================
  -- FLAGS
  -- ============================================================================
  is_test BOOLEAN DEFAULT false,          -- Evento de teste?
  requires_action BOOLEAN DEFAULT false,  -- Requer ação manual?
  
  -- ============================================================================
  -- METADATA
  -- ============================================================================
  source_ip TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para busca e processamento
CREATE INDEX IF NOT EXISTS idx_ota_webhooks_org ON ota_webhooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_ota_webhooks_ota ON ota_webhooks(ota);
CREATE INDEX IF NOT EXISTS idx_ota_webhooks_event_id ON ota_webhooks(ota, event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ota_webhooks_event_type ON ota_webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_ota_webhooks_processed ON ota_webhooks(processed) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_ota_webhooks_reservation ON ota_webhooks(reservation_id) WHERE reservation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ota_webhooks_property ON ota_webhooks(property_id) WHERE property_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ota_webhooks_created ON ota_webhooks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ota_webhooks_requires_action ON ota_webhooks(requires_action) WHERE requires_action = true;

-- Índice único para idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_ota_webhooks_idempotency ON ota_webhooks(ota, event_id) WHERE event_id IS NOT NULL;

COMMENT ON TABLE ota_webhooks IS 'Webhooks recebidos de todas as OTAs - log centralizado';
COMMENT ON COLUMN ota_webhooks.event_id IS 'ID único do evento na OTA - usado para idempotency';

-- ============================================================================
-- TABELA 2: OTA WEBHOOK SUBSCRIPTIONS
-- Configuração de subscriptions de webhook por organização
-- ============================================================================
CREATE TABLE IF NOT EXISTS ota_webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- OTA
  ota TEXT NOT NULL,
  
  -- ============================================================================
  -- CONFIGURAÇÃO
  -- ============================================================================
  endpoint_url TEXT,                      -- URL do webhook (se configurável)
  secret_key TEXT,                        -- Chave para validar assinaturas
  
  -- Eventos subscritos (NULL = todos)
  subscribed_events TEXT[],               -- ['itinerary.agent.create', 'itinerary.agent.cancel', ...]
  
  -- ============================================================================
  -- STATUS
  -- ============================================================================
  is_active BOOLEAN DEFAULT true,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  
  -- Último evento recebido
  last_event_at TIMESTAMPTZ,
  last_event_type TEXT,
  
  -- Estatísticas
  total_events_received INTEGER DEFAULT 0,
  total_events_processed INTEGER DEFAULT 0,
  total_events_failed INTEGER DEFAULT 0,
  
  -- ============================================================================
  -- METADATA
  -- ============================================================================
  ota_subscription_id TEXT,               -- ID da subscription na OTA
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ota_webhook_subs_org ON ota_webhook_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_ota_webhook_subs_ota ON ota_webhook_subscriptions(ota);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ota_webhook_subs_unique ON ota_webhook_subscriptions(organization_id, ota);

COMMENT ON TABLE ota_webhook_subscriptions IS 'Configuração de subscriptions de webhook por organização';

-- ============================================================================
-- TABELA 3: PROPERTY OTA EXTENSIONS
-- Dados específicos de OTA que não fazem sentido no modelo principal
-- ============================================================================
CREATE TABLE IF NOT EXISTS property_ota_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  ota TEXT NOT NULL,
  
  -- ============================================================================
  -- IDENTIFICADORES NA OTA
  -- ============================================================================
  ota_property_id TEXT,                   -- ID da property na OTA
  ota_listing_id TEXT,                    -- ID do listing (se diferente)
  ota_listing_url TEXT,                   -- URL do anúncio
  
  -- ============================================================================
  -- STATUS NA OTA
  -- ============================================================================
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',                -- Rascunho
    'pending_review',       -- Aguardando revisão
    'active',               -- Ativo/publicado
    'inactive',             -- Inativo
    'suspended',            -- Suspenso
    'archived'              -- Arquivado
  )),
  
  status_reason TEXT,
  status_updated_at TIMESTAMPTZ,
  
  -- ============================================================================
  -- DADOS ESPECÍFICOS DA OTA (JSONB flexível)
  -- ============================================================================
  ota_data JSONB DEFAULT '{}',
  /*
  Para Expedia:
  {
    "supply_source": "vrbo",
    "category_id": "15",
    "category_name": "Apartment",
    "registry_number": "ABC123",
    "tax_id": "12.345.678/0001-00",
    "business_model": {
      "expedia_collect": true,
      "property_collect": true
    },
    "payment_registration_recommended": true,
    "rank": 4.5,
    "chain": { "id": "123", "name": "Chain Name" },
    "brand": { "id": "456", "name": "Brand Name" }
  }
  
  Para Airbnb:
  {
    "listing_status": "published",
    "instant_book": true,
    "professional_host": true,
    "superhost": false,
    "listing_type": "entire_home"
  }
  
  Para Booking:
  {
    "property_class": 4,
    "review_score": 8.5,
    "genius_eligible": true,
    "preferred_partner": false,
    "commission_rate": 15
  }
  
  Para Stays.net:
  {
    "internal_code": "APT001",
    "channel_manager_id": "xyz"
  }
  */
  
  -- ============================================================================
  -- CONFIGURAÇÕES DE SYNC
  -- ============================================================================
  sync_enabled BOOLEAN DEFAULT true,
  
  -- O que sincronizar
  sync_content BOOLEAN DEFAULT true,      -- Dados do imóvel
  sync_rates BOOLEAN DEFAULT true,        -- Preços/tarifas
  sync_availability BOOLEAN DEFAULT true, -- Disponibilidade
  sync_reservations BOOLEAN DEFAULT true, -- Reservas
  
  -- Última sincronização
  last_synced_at TIMESTAMPTZ,
  last_sync_result TEXT,
  last_sync_error TEXT,
  
  -- Próxima sincronização agendada
  next_sync_at TIMESTAMPTZ,
  
  -- ============================================================================
  -- ESTATÍSTICAS
  -- ============================================================================
  total_reservations INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  average_rating DECIMAL(3,2),
  review_count INTEGER DEFAULT 0,
  
  -- ============================================================================
  -- METADATA
  -- ============================================================================
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(property_id, ota)
);

CREATE INDEX IF NOT EXISTS idx_property_ota_ext_property ON property_ota_extensions(property_id);
CREATE INDEX IF NOT EXISTS idx_property_ota_ext_ota ON property_ota_extensions(ota);
CREATE INDEX IF NOT EXISTS idx_property_ota_ext_ota_id ON property_ota_extensions(ota, ota_property_id) WHERE ota_property_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_property_ota_ext_sync ON property_ota_extensions(sync_enabled, next_sync_at) WHERE sync_enabled = true;

COMMENT ON TABLE property_ota_extensions IS 'Dados específicos de OTA para cada propriedade';
COMMENT ON COLUMN property_ota_extensions.ota_data IS 'Dados flexíveis específicos da OTA em formato JSON';

-- ============================================================================
-- TABELA 4: SYNC LOGS
-- Log de sincronizações com OTAs
-- ============================================================================
CREATE TABLE IF NOT EXISTS ota_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Referências
  property_id UUID REFERENCES properties(id),
  reservation_id UUID REFERENCES reservations(id),
  rate_plan_id UUID REFERENCES rate_plans(id),
  
  -- OTA
  ota TEXT NOT NULL,
  
  -- ============================================================================
  -- TIPO DE SINCRONIZAÇÃO
  -- ============================================================================
  sync_type TEXT NOT NULL CHECK (sync_type IN (
    'content_push',         -- Enviar conteúdo para OTA
    'content_pull',         -- Buscar conteúdo da OTA
    'rates_push',           -- Enviar preços para OTA
    'rates_pull',           -- Buscar preços da OTA
    'availability_push',    -- Enviar disponibilidade
    'availability_pull',    -- Buscar disponibilidade
    'reservation_create',   -- Criar reserva na OTA
    'reservation_update',   -- Atualizar reserva na OTA
    'reservation_cancel',   -- Cancelar reserva na OTA
    'reservation_pull',     -- Buscar reservas da OTA
    'full_sync'             -- Sincronização completa
  )),
  
  -- Direção
  direction TEXT NOT NULL CHECK (direction IN ('push', 'pull')),
  
  -- ============================================================================
  -- STATUS
  -- ============================================================================
  status TEXT DEFAULT 'started' CHECK (status IN (
    'started',
    'in_progress',
    'completed',
    'partial',              -- Parcialmente completado
    'failed',
    'cancelled'
  )),
  
  -- ============================================================================
  -- DADOS DA SINCRONIZAÇÃO
  -- ============================================================================
  request_data JSONB,                     -- Dados enviados
  response_data JSONB,                    -- Resposta recebida
  
  -- Estatísticas
  items_total INTEGER DEFAULT 0,
  items_processed INTEGER DEFAULT 0,
  items_succeeded INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  items_skipped INTEGER DEFAULT 0,
  
  -- ============================================================================
  -- TEMPOS
  -- ============================================================================
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- ============================================================================
  -- ERROS
  -- ============================================================================
  error_code TEXT,
  error_message TEXT,
  error_details JSONB,
  
  -- ============================================================================
  -- METADATA
  -- ============================================================================
  triggered_by TEXT,                      -- 'manual', 'scheduled', 'webhook', 'api'
  triggered_by_user_id UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_org ON ota_sync_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_property ON ota_sync_logs(property_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_ota ON ota_sync_logs(ota);
CREATE INDEX IF NOT EXISTS idx_sync_logs_type ON ota_sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON ota_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created ON ota_sync_logs(created_at DESC);

COMMENT ON TABLE ota_sync_logs IS 'Log de sincronizações com OTAs';

-- ============================================================================
-- TABELA 5: OTA API CREDENTIALS
-- Credenciais de API para cada OTA por organização
-- ============================================================================
CREATE TABLE IF NOT EXISTS ota_api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- OTA
  ota TEXT NOT NULL,
  
  -- ============================================================================
  -- CREDENCIAIS (criptografadas no application layer)
  -- ============================================================================
  api_key TEXT,
  api_secret TEXT,
  access_token TEXT,
  refresh_token TEXT,
  
  -- OAuth
  oauth_client_id TEXT,
  oauth_client_secret TEXT,
  oauth_scope TEXT,
  
  -- Expiration
  token_expires_at TIMESTAMPTZ,
  
  -- ============================================================================
  -- AMBIENTE
  -- ============================================================================
  environment TEXT DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  
  -- ============================================================================
  -- ENDPOINT CUSTOMIZADO
  -- ============================================================================
  api_base_url TEXT,                      -- URL base customizada (se houver)
  
  -- ============================================================================
  -- STATUS
  -- ============================================================================
  is_active BOOLEAN DEFAULT true,
  is_valid BOOLEAN,                       -- Credenciais válidas?
  last_validated_at TIMESTAMPTZ,
  validation_error TEXT,
  
  -- ============================================================================
  -- RATE LIMITS
  -- ============================================================================
  rate_limit_requests INTEGER,            -- Requests por minuto/hora
  rate_limit_window TEXT,                 -- 'minute', 'hour', 'day'
  current_usage INTEGER DEFAULT 0,
  usage_reset_at TIMESTAMPTZ,
  
  -- ============================================================================
  -- METADATA
  -- ============================================================================
  account_id TEXT,                        -- ID da conta na OTA
  account_name TEXT,                      -- Nome da conta
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, ota, environment)
);

CREATE INDEX IF NOT EXISTS idx_ota_credentials_org ON ota_api_credentials(organization_id);
CREATE INDEX IF NOT EXISTS idx_ota_credentials_ota ON ota_api_credentials(ota);
CREATE INDEX IF NOT EXISTS idx_ota_credentials_active ON ota_api_credentials(is_active) WHERE is_active = true;

COMMENT ON TABLE ota_api_credentials IS 'Credenciais de API para cada OTA por organização';

-- ============================================================================
-- ALTERAÇÕES NA TABELA PROPERTIES
-- Adicionar campos universais para OTAs
-- ============================================================================
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_rating DECIMAL(2,1);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_rating_type TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS category_id TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS category_name TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS supply_source TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS expedia_collect BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_collect BOOLEAN DEFAULT true;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS registry_number TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS chain_id TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS chain_name TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS brand_id TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS brand_name TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS multi_unit BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS payment_registration_recommended BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS descriptions JSONB DEFAULT '{}';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS statistics JSONB DEFAULT '{}';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS spoken_languages TEXT[];
ALTER TABLE properties ADD COLUMN IF NOT EXISTS themes TEXT[];
ALTER TABLE properties ADD COLUMN IF NOT EXISTS onsite_payment_types TEXT[];

COMMENT ON COLUMN properties.category_id IS 'ID da categoria canônica do tipo de propriedade';
COMMENT ON COLUMN properties.descriptions IS 'Descrições categorizadas: amenities, dining, location, etc';
COMMENT ON COLUMN properties.statistics IS 'Estatísticas: total_rooms, floors, year_built, etc';

-- ============================================================================
-- TABELA 6: GEOGRAPHIC REGIONS
-- Regiões geográficas (para Geography API do Expedia)
-- ============================================================================
CREATE TABLE IF NOT EXISTS geographic_regions (
  id TEXT PRIMARY KEY,                    -- ID da região (pode ser do Expedia ou interno)
  
  -- ============================================================================
  -- DADOS DA REGIÃO
  -- ============================================================================
  name TEXT NOT NULL,
  name_full TEXT,                         -- Nome completo com hierarquia
  
  type TEXT NOT NULL CHECK (type IN (
    'continent',
    'country',
    'province_state',
    'multi_city_vicinity',
    'city',
    'neighborhood',
    'airport',
    'poi',                  -- Point of Interest
    'metro_station',
    'train_station'
  )),
  
  -- Hierarquia
  parent_id TEXT REFERENCES geographic_regions(id),
  country_code TEXT,                      -- ISO 2-letter
  
  -- Coordenadas
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  
  -- Bounding box (para busca)
  bbox_north DECIMAL(10,7),
  bbox_south DECIMAL(10,7),
  bbox_east DECIMAL(10,7),
  bbox_west DECIMAL(10,7),
  
  -- ============================================================================
  -- METADADOS
  -- ============================================================================
  categories TEXT[],                      -- ['hotel', 'vacation_rental', etc]
  property_count INTEGER DEFAULT 0,
  
  -- Tags de busca
  tags TEXT[],
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regions_type ON geographic_regions(type);
CREATE INDEX IF NOT EXISTS idx_regions_parent ON geographic_regions(parent_id);
CREATE INDEX IF NOT EXISTS idx_regions_country ON geographic_regions(country_code);
CREATE INDEX IF NOT EXISTS idx_regions_coords ON geographic_regions(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_regions_name ON geographic_regions USING gin(to_tsvector('portuguese', name));

COMMENT ON TABLE geographic_regions IS 'Regiões geográficas para busca e filtro';

-- ============================================================================
-- TABELA 7: OTA REGION MAPPINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS ota_region_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  region_id TEXT NOT NULL REFERENCES geographic_regions(id) ON DELETE CASCADE,
  ota TEXT NOT NULL,
  ota_region_id TEXT NOT NULL,
  ota_region_name TEXT,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(ota, ota_region_id)
);

CREATE INDEX IF NOT EXISTS idx_ota_region_region ON ota_region_mappings(region_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_ota_webhooks_updated_at ON ota_webhooks;
CREATE TRIGGER update_ota_webhooks_updated_at
  BEFORE UPDATE ON ota_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_property_ota_ext_updated_at ON property_ota_extensions;
CREATE TRIGGER update_property_ota_ext_updated_at
  BEFORE UPDATE ON property_ota_extensions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ota_credentials_updated_at ON ota_api_credentials;
CREATE TRIGGER update_ota_credentials_updated_at
  BEFORE UPDATE ON ota_api_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar estatísticas de webhook subscription
CREATE OR REPLACE FUNCTION update_webhook_subscription_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ota_webhook_subscriptions 
  SET 
    total_events_received = total_events_received + 1,
    last_event_at = NEW.created_at,
    last_event_type = NEW.event_type,
    total_events_processed = total_events_processed + CASE WHEN NEW.processed THEN 1 ELSE 0 END
  WHERE organization_id = NEW.organization_id AND ota = NEW.ota;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_webhook_stats_trigger ON ota_webhooks;
CREATE TRIGGER update_webhook_stats_trigger
  AFTER INSERT ON ota_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_subscription_stats();

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================
-- NOTA: O Rendizy usa multi-tenancy via organization_id direto nas tabelas.
-- O backend (Edge Functions) é responsável por filtrar por organization_id.
-- RLS aqui é para proteção extra via service_role.
-- ============================================================================
ALTER TABLE ota_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_ota_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_api_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE geographic_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_region_mappings ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "OTA webhooks via org" ON ota_webhooks
  FOR SELECT USING (
    organization_id IS NULL OR
    organization_id IN (SELECT organization_id FROM properties WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role full access ota webhooks" ON ota_webhooks
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "OTA webhook subscriptions via org" ON ota_webhook_subscriptions
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM properties WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role full access ota webhook subscriptions" ON ota_webhook_subscriptions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Property OTA extensions via property" ON property_ota_extensions
  FOR SELECT USING (
    property_id IN (SELECT id FROM properties WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role full access property ota extensions" ON property_ota_extensions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "OTA sync logs via org" ON ota_sync_logs
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM properties WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role full access ota sync logs" ON ota_sync_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "OTA credentials via org" ON ota_api_credentials
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM properties WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role full access ota api credentials" ON ota_api_credentials
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Geographic regions readable by all" ON geographic_regions
  FOR SELECT USING (true);

CREATE POLICY "Service role full access geographic regions" ON geographic_regions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "OTA region mappings readable by all" ON ota_region_mappings
  FOR SELECT USING (true);

CREATE POLICY "Service role full access ota region mappings" ON ota_region_mappings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- FUNÇÃO: Processar webhook de OTA
-- ============================================================================
CREATE OR REPLACE FUNCTION process_ota_webhook(webhook_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_webhook RECORD;
  v_result JSONB;
BEGIN
  -- Buscar webhook
  SELECT * INTO v_webhook FROM ota_webhooks WHERE id = webhook_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Webhook not found');
  END IF;
  
  -- Marcar como em processamento
  UPDATE ota_webhooks 
  SET 
    processing_attempts = processing_attempts + 1,
    last_attempt_at = NOW()
  WHERE id = webhook_id;
  
  -- Lógica de processamento por OTA e tipo de evento
  -- (implementar no application layer, mas registrar resultado aqui)
  
  RETURN jsonb_build_object('success', true, 'webhook_id', webhook_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS ÚTEIS
-- ============================================================================

-- View: Propriedades com status de sincronização
CREATE OR REPLACE VIEW v_property_sync_status AS
SELECT 
  p.id AS property_id,
  p.organization_id,
  p.status AS property_status,
  poe.ota,
  poe.ota_property_id,
  poe.status AS ota_status,
  poe.sync_enabled,
  poe.last_synced_at,
  poe.last_sync_result,
  CASE 
    WHEN poe.last_synced_at IS NULL THEN 'never'
    WHEN poe.last_synced_at > NOW() - INTERVAL '1 hour' THEN 'recent'
    WHEN poe.last_synced_at > NOW() - INTERVAL '24 hours' THEN 'today'
    ELSE 'stale'
  END AS sync_freshness
FROM properties p
LEFT JOIN property_ota_extensions poe ON p.id = poe.property_id
WHERE p.status = 'active';

-- View: Webhooks pendentes de processamento
CREATE OR REPLACE VIEW v_pending_webhooks AS
SELECT 
  id,
  ota,
  event_type,
  event_id,
  created_at,
  processing_attempts,
  last_attempt_at,
  CASE 
    WHEN processing_attempts = 0 THEN 'new'
    WHEN processing_attempts < 3 THEN 'retrying'
    ELSE 'failing'
  END AS status_hint
FROM ota_webhooks
WHERE processed = false
ORDER BY created_at;

-- ============================================================================
COMMENT ON SCHEMA public IS 'Schema com modelo de dados universal para OTAs - Migração 5/5: Webhooks, Extensions & Sync';



