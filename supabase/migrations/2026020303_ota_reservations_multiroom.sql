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
  reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  
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
  reservation_id TEXT REFERENCES reservations(id) ON DELETE CASCADE,
  
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
  reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
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
  reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
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
  reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  
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
  reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
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
  reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
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
-- Tabelas filhas herdam acesso via reservations.organization_id
-- ============================================================================
ALTER TABLE reservation_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_additional_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_pricing_breakdown ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_cancellations ENABLE ROW LEVEL SECURITY;

-- Políticas: leitura pública (RLS real é feito no backend), escrita via service_role
CREATE POLICY "Reservation rooms readable" ON reservation_rooms
  FOR SELECT USING (true);

CREATE POLICY "Service role full access reservation rooms" ON reservation_rooms
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Billing contacts readable" ON billing_contacts
  FOR SELECT USING (true);

CREATE POLICY "Service role full access billing contacts" ON billing_contacts
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Additional guests readable" ON reservation_additional_guests
  FOR SELECT USING (true);

CREATE POLICY "Service role full access additional guests" ON reservation_additional_guests
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Pricing breakdown readable" ON reservation_pricing_breakdown
  FOR SELECT USING (true);

CREATE POLICY "Service role full access pricing breakdown" ON reservation_pricing_breakdown
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Reservation deposits readable" ON reservation_deposits
  FOR SELECT USING (true);

CREATE POLICY "Service role full access reservation deposits" ON reservation_deposits
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Reservation history readable" ON reservation_history
  FOR SELECT USING (true);

CREATE POLICY "Service role full access reservation history" ON reservation_history
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Reservation cancellations readable" ON reservation_cancellations
  FOR SELECT USING (true);

CREATE POLICY "Service role full access reservation cancellations" ON reservation_cancellations
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
COMMENT ON SCHEMA public IS 'Schema com modelo de dados universal para OTAs - Migração 3/5: Reservations Multi-Room & Billing';
