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
  reservation_id TEXT REFERENCES reservations(id) ON DELETE CASCADE,
  
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
  reservation_id TEXT REFERENCES reservations(id) ON DELETE CASCADE,
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
  reservation_id TEXT REFERENCES reservations(id),
  
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
  reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  
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
  reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  
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
  FOR SELECT USING (true);

CREATE POLICY "Service role full access corporate payment configs" ON corporate_payment_configs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
COMMENT ON SCHEMA public IS 'Schema com modelo de dados universal para OTAs - Migração 4/5: Payments & 3D Secure';
