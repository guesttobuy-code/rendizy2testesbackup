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
