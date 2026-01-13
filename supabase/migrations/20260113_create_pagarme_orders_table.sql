-- ============================================================================
-- Create pagarme_orders table to store Pagar.me checkout sessions
-- Similar to stripe_checkout_sessions but for Pagar.me gateway
-- ============================================================================

CREATE TABLE IF NOT EXISTS pagarme_orders (
  id TEXT PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'brl',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL DEFAULT 'credit_card',
  checkout_url TEXT,
  pix_qr_code TEXT,
  pix_qr_code_url TEXT,
  boleto_url TEXT,
  boleto_barcode TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pagarme_orders_org ON pagarme_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_pagarme_orders_reservation ON pagarme_orders(reservation_id);
CREATE INDEX IF NOT EXISTS idx_pagarme_orders_status ON pagarme_orders(status);

-- RLS Policies
ALTER TABLE pagarme_orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view orders from their organization
CREATE POLICY pagarme_orders_select_policy ON pagarme_orders
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Service role can do anything
CREATE POLICY pagarme_orders_service_policy ON pagarme_orders
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Comments
COMMENT ON TABLE pagarme_orders IS 'Stores Pagar.me checkout orders created from client sites';
COMMENT ON COLUMN pagarme_orders.payment_method IS 'credit_card, pix, or boleto';
COMMENT ON COLUMN pagarme_orders.pix_qr_code IS 'PIX QR code string for PIX payments';
COMMENT ON COLUMN pagarme_orders.boleto_url IS 'URL to boleto PDF for boleto payments';
