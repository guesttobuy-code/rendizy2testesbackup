-- ============================================================================
-- MIGRAÇÃO: Criar tabela reservations completa
-- Data: 14/12/2025
-- Projeto: Rendizy
-- Objetivo: Corrigir persistência de reservas (mesmo padrão guests/properties)
-- ============================================================================

-- ============================================================================
-- 1. CRIAR TABELA reservations
-- ============================================================================

CREATE TABLE IF NOT EXISTS reservations (
  -- Identificadores
  id TEXT PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  
  -- Datas
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INTEGER NOT NULL CHECK (nights >= 1),
  
  -- Hóspedes (flat structure)
  guests_adults INTEGER NOT NULL DEFAULT 1 CHECK (guests_adults >= 1),
  guests_children INTEGER NOT NULL DEFAULT 0 CHECK (guests_children >= 0),
  guests_infants INTEGER NOT NULL DEFAULT 0 CHECK (guests_infants >= 0),
  guests_pets INTEGER NOT NULL DEFAULT 0 CHECK (guests_pets >= 0),
  guests_total INTEGER NOT NULL DEFAULT 1 CHECK (guests_total >= 1),
  
  -- Precificação (flat structure)
  pricing_price_per_night NUMERIC(10, 2) NOT NULL DEFAULT 0,
  pricing_base_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  pricing_cleaning_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  pricing_service_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  pricing_taxes NUMERIC(10, 2) NOT NULL DEFAULT 0,
  pricing_discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  pricing_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  pricing_currency TEXT NOT NULL DEFAULT 'BRL',
  pricing_applied_tier TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
  
  -- Plataforma
  platform TEXT NOT NULL DEFAULT 'direct' CHECK (platform IN ('airbnb', 'booking', 'decolar', 'direct', 'other')),
  external_id TEXT,
  external_url TEXT,
  
  -- Pagamento (flat structure)
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'refunded', 'cancelled')),
  payment_method TEXT,
  payment_transaction_id TEXT,
  payment_paid_at TIMESTAMPTZ,
  payment_refunded_at TIMESTAMPTZ,
  
  -- Comunicação
  notes TEXT,
  internal_comments TEXT,
  special_requests TEXT,
  
  -- Check-in/out times
  check_in_time TEXT,
  check_out_time TEXT,
  actual_check_in TIMESTAMPTZ,
  actual_check_out TIMESTAMPTZ,
  
  -- Cancelamento
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID,
  cancellation_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  confirmed_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT check_dates CHECK (check_out > check_in),
  CONSTRAINT check_pricing_total CHECK (pricing_total >= 0)
);

-- ============================================================================
-- 2. CRIAR ÍNDICES
-- ============================================================================

-- Busca por organização (multi-tenant)
CREATE INDEX IF NOT EXISTS idx_reservations_organization 
ON reservations(organization_id);

-- Busca por propriedade
CREATE INDEX IF NOT EXISTS idx_reservations_property 
ON reservations(property_id);

-- Busca por hóspede
CREATE INDEX IF NOT EXISTS idx_reservations_guest 
ON reservations(guest_id);

-- Busca por datas (range queries)
CREATE INDEX IF NOT EXISTS idx_reservations_check_in 
ON reservations(check_in);

CREATE INDEX IF NOT EXISTS idx_reservations_check_out 
ON reservations(check_out);

-- Busca por status
CREATE INDEX IF NOT EXISTS idx_reservations_status 
ON reservations(status);

-- Busca por plataforma
CREATE INDEX IF NOT EXISTS idx_reservations_platform 
ON reservations(platform);

-- Busca por ID externo (integrações)
CREATE INDEX IF NOT EXISTS idx_reservations_external_id 
ON reservations(external_id) WHERE external_id IS NOT NULL;

-- Busca por data de criação
CREATE INDEX IF NOT EXISTS idx_reservations_created_at 
ON reservations(created_at DESC);

-- ✅ COMPOSTO: Buscar conflitos de data por propriedade
CREATE INDEX IF NOT EXISTS idx_reservations_property_dates 
ON reservations(property_id, check_in, check_out, status);

-- ============================================================================
-- 3. TRIGGER AUTO-UPDATE updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_reservations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_reservations_updated_at ON reservations;
CREATE TRIGGER trigger_update_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_reservations_updated_at();

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- ✅ Superadmin: acesso total (Rendizy master org)
DROP POLICY IF EXISTS "Superadmin full access to reservations" ON reservations;
CREATE POLICY "Superadmin full access to reservations"
ON reservations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.type = 'superadmin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.type = 'superadmin'
  )
);

-- ✅ Imobiliária: acesso apenas à sua organização
DROP POLICY IF EXISTS "Imobiliaria access own org reservations" ON reservations;
CREATE POLICY "Imobiliaria access own org reservations"
ON reservations
FOR ALL
USING (
  organization_id IN (
    SELECT organizations.id FROM organizations
    INNER JOIN users ON users.organization_id = organizations.id
    WHERE users.id = auth.uid()
    AND users.type = 'imobiliaria'
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organizations.id FROM organizations
    INNER JOIN users ON users.organization_id = organizations.id
    WHERE users.id = auth.uid()
    AND users.type = 'imobiliaria'
  )
);

-- ✅ Funcionário: acesso apenas à organização do employer
DROP POLICY IF EXISTS "Funcionario access employer org reservations" ON reservations;
CREATE POLICY "Funcionario access employer org reservations"
ON reservations
FOR SELECT
USING (
  organization_id IN (
    SELECT organizations.id FROM organizations
    INNER JOIN users employer ON employer.organization_id = organizations.id
    INNER JOIN users employee ON employee.organization_id = employer.organization_id
    WHERE employee.id = auth.uid()
    AND employee.type = 'funcionario'
  )
);

-- ============================================================================
-- 5. COMENTÁRIOS
-- ============================================================================

COMMENT ON TABLE reservations IS 'Tabela de reservas com estrutura flat (30+ colunas) para performance';
COMMENT ON COLUMN reservations.id IS 'ID único da reserva (TEXT format: res-{timestamp}-{random})';
COMMENT ON COLUMN reservations.organization_id IS 'UUID da organização (multi-tenant)';
COMMENT ON COLUMN reservations.property_id IS 'UUID da propriedade (FK: properties.id)';
COMMENT ON COLUMN reservations.guest_id IS 'UUID do hóspede (FK: guests.id)';
COMMENT ON COLUMN reservations.check_in IS 'Data de check-in (DATE)';
COMMENT ON COLUMN reservations.check_out IS 'Data de check-out (DATE)';
COMMENT ON COLUMN reservations.nights IS 'Número de noites (calculado)';
COMMENT ON COLUMN reservations.status IS 'Status: pending, confirmed, checked_in, checked_out, cancelled, no_show';
COMMENT ON COLUMN reservations.platform IS 'Plataforma de origem: airbnb, booking, decolar, direct, other';
COMMENT ON COLUMN reservations.payment_status IS 'Status pagamento: pending, paid, partial, refunded, cancelled';

-- ============================================================================
-- 6. MIGRAÇÃO DE DADOS DO KV STORE (se houver)
-- ============================================================================

-- ⚠️ Este bloco só executa se houver reservas no kv_store_67caf26a
-- Se a tabela kv_store não existir ou não tiver reservas, será ignorado

DO $$
DECLARE
  reservation_key TEXT;
  reservation_data JSONB;
  org_id_rendizy UUID;
BEGIN
  -- Buscar ID da organização Rendizy master
  SELECT id INTO org_id_rendizy FROM organizations WHERE name = 'Rendizy' OR id = '00000000-0000-0000-0000-000000000000' LIMIT 1;
  
  -- Se não encontrou, usar UUID padrão
  IF org_id_rendizy IS NULL THEN
    org_id_rendizy := '00000000-0000-0000-0000-000000000000';
  END IF;
  
  -- Migrar reservas do KV Store (se existirem)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kv_store_67caf26a') THEN
    FOR reservation_key, reservation_data IN 
      SELECT key, value 
      FROM kv_store_67caf26a 
      WHERE key LIKE 'reservation:%'
    LOOP
      -- Inserir reserva (ignorar se já existir)
      INSERT INTO reservations (
        id, organization_id, property_id, guest_id,
        check_in, check_out, nights,
        guests_adults, guests_children, guests_infants, guests_pets, guests_total,
        pricing_price_per_night, pricing_base_total, pricing_cleaning_fee,
        pricing_service_fee, pricing_taxes, pricing_discount, pricing_total,
        pricing_currency, pricing_applied_tier,
        status, platform, external_id, external_url,
        payment_status, payment_method, payment_transaction_id,
        payment_paid_at, payment_refunded_at,
        notes, internal_comments, special_requests,
        check_in_time, check_out_time, actual_check_in, actual_check_out,
        cancelled_at, cancelled_by, cancellation_reason,
        created_at, updated_at, created_by, confirmed_at
      )
      SELECT
        (reservation_data->>'id')::TEXT,
        COALESCE((reservation_data->>'organizationId')::UUID, org_id_rendizy),
        (reservation_data->>'propertyId')::UUID,
        NULLIF((reservation_data->>'guestId')::TEXT, 'system')::UUID,
        (reservation_data->>'checkIn')::DATE,
        (reservation_data->>'checkOut')::DATE,
        (reservation_data->>'nights')::INTEGER,
        COALESCE((reservation_data->'guests'->>'adults')::INTEGER, 1),
        COALESCE((reservation_data->'guests'->>'children')::INTEGER, 0),
        COALESCE((reservation_data->'guests'->>'infants')::INTEGER, 0),
        COALESCE((reservation_data->'guests'->>'pets')::INTEGER, 0),
        COALESCE((reservation_data->'guests'->>'total')::INTEGER, 1),
        COALESCE((reservation_data->'pricing'->>'pricePerNight')::NUMERIC, 0),
        COALESCE((reservation_data->'pricing'->>'baseTotal')::NUMERIC, 0),
        COALESCE((reservation_data->'pricing'->>'cleaningFee')::NUMERIC, 0),
        COALESCE((reservation_data->'pricing'->>'serviceFee')::NUMERIC, 0),
        COALESCE((reservation_data->'pricing'->>'taxes')::NUMERIC, 0),
        COALESCE((reservation_data->'pricing'->>'discount')::NUMERIC, 0),
        COALESCE((reservation_data->'pricing'->>'total')::NUMERIC, 0),
        COALESCE((reservation_data->'pricing'->>'currency')::TEXT, 'BRL'),
        (reservation_data->'pricing'->>'appliedTier')::TEXT,
        COALESCE((reservation_data->>'status')::TEXT, 'pending'),
        COALESCE((reservation_data->>'platform')::TEXT, 'direct'),
        (reservation_data->>'externalId')::TEXT,
        (reservation_data->>'externalUrl')::TEXT,
        COALESCE((reservation_data->'payment'->>'status')::TEXT, 'pending'),
        (reservation_data->'payment'->>'method')::TEXT,
        (reservation_data->'payment'->>'transactionId')::TEXT,
        (reservation_data->'payment'->>'paidAt')::TIMESTAMPTZ,
        (reservation_data->'payment'->>'refundedAt')::TIMESTAMPTZ,
        (reservation_data->>'notes')::TEXT,
        (reservation_data->>'internalComments')::TEXT,
        (reservation_data->>'specialRequests')::TEXT,
        (reservation_data->>'checkInTime')::TEXT,
        (reservation_data->>'checkOutTime')::TEXT,
        (reservation_data->>'actualCheckIn')::TIMESTAMPTZ,
        (reservation_data->>'actualCheckOut')::TIMESTAMPTZ,
        (reservation_data->>'cancelledAt')::TIMESTAMPTZ,
        NULLIF((reservation_data->>'cancelledBy')::TEXT, 'system')::UUID,
        (reservation_data->>'cancellationReason')::TEXT,
        COALESCE((reservation_data->>'createdAt')::TIMESTAMPTZ, NOW()),
        COALESCE((reservation_data->>'updatedAt')::TIMESTAMPTZ, NOW()),
        COALESCE(NULLIF((reservation_data->>'createdBy')::TEXT, 'system')::UUID, '00000000-0000-0000-0000-000000000001'),
        (reservation_data->>'confirmedAt')::TIMESTAMPTZ
      ON CONFLICT (id) DO NOTHING;
      
    END LOOP;
    
    RAISE NOTICE 'Reservations migration from KV Store completed';
  ELSE
    RAISE NOTICE 'KV Store table not found, skipping migration';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error during reservations migration: %', SQLERRM;
END $$;

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================

-- ✅ RESUMO:
-- - Tabela reservations criada com 30+ colunas
-- - Índices para performance (organization, property, dates, status)
-- - RLS configurado (superadmin, imobiliaria, funcionario)
-- - Trigger auto-update (updated_at)
-- - Migração de dados do KV Store (se existir)
-- - CHECK constraints para validação
-- - Foreign keys para integridade referencial

