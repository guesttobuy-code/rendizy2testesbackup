-- =====================================================
-- 🧹 LIMPEZA + Migration 09 COMPLETA
-- =====================================================
-- Este script limpa qualquer estado quebrado e recria tudo
-- Execute de uma vez no Supabase SQL Editor
-- =====================================================

-- PASSO 1: LIMPAR ESTADO ANTERIOR (se existir)
DROP TRIGGER IF EXISTS trg_reservation_history ON reservations;
DROP FUNCTION IF EXISTS log_reservation_change() CASCADE;
DROP TABLE IF EXISTS reservation_room_history CASCADE;
DROP TABLE IF EXISTS reservation_history CASCADE;

-- =====================================================
-- PASSO 2: COLUNAS EM RESERVATIONS
-- =====================================================

-- Travel purpose
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reservations' AND column_name = 'travel_purpose'
  ) THEN
    ALTER TABLE reservations ADD COLUMN travel_purpose TEXT 
      CHECK (travel_purpose IN ('business', 'leisure', 'unspecified'));
  END IF;
END $$;

-- Adjustment fields
ALTER TABLE reservations 
  ADD COLUMN IF NOT EXISTS adjustment_value DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS adjustment_type TEXT,
  ADD COLUMN IF NOT EXISTS adjustment_currency TEXT DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS adjustment_reason TEXT;

-- Invoicing fields
ALTER TABLE reservations 
  ADD COLUMN IF NOT EXISTS invoicing_consent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoicing_company_name TEXT,
  ADD COLUMN IF NOT EXISTS invoicing_company_address JSONB,
  ADD COLUMN IF NOT EXISTS invoicing_vat_number TEXT,
  ADD COLUMN IF NOT EXISTS invoicing_email TEXT;

-- OTA links
ALTER TABLE reservations 
  ADD COLUMN IF NOT EXISTS ota_links JSONB;

-- Trader/Supplier
ALTER TABLE reservations 
  ADD COLUMN IF NOT EXISTS trader_information JSONB,
  ADD COLUMN IF NOT EXISTS supplier_transparency JSONB;

-- =====================================================
-- PASSO 3: CHILD AGES EM RESERVATION_ROOMS
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reservation_rooms') THEN
    ALTER TABLE reservation_rooms ADD COLUMN IF NOT EXISTS child_ages INTEGER[];
  END IF;
END $$;

-- =====================================================
-- PASSO 4: CRIAR TABELA RESERVATION_HISTORY
-- =====================================================
-- NOTA: reservations.id é TEXT, não UUID!

CREATE TABLE reservation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL,
  changed_by UUID,
  changed_by_type TEXT CHECK (changed_by_type IN ('user', 'guest', 'system', 'ota')),
  changed_by_name TEXT,
  old_values JSONB,
  new_values JSONB,
  change_reason TEXT,
  source TEXT,
  source_reference TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reservation_history_reservation ON reservation_history(reservation_id);
CREATE INDEX idx_reservation_history_type ON reservation_history(change_type);
CREATE INDEX idx_reservation_history_date ON reservation_history(created_at DESC);

-- =====================================================
-- PASSO 5: CRIAR TABELA RESERVATION_ROOM_HISTORY
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reservation_rooms') THEN
    CREATE TABLE IF NOT EXISTS reservation_room_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reservation_room_id UUID NOT NULL REFERENCES reservation_rooms(id) ON DELETE CASCADE,
      reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
      change_type TEXT NOT NULL,
      changed_by UUID,
      old_values JSONB,
      new_values JSONB,
      change_reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- =====================================================
-- ✅ FIM - NÃO INCLUI TRIGGER (será na migration 10)
-- =====================================================
SELECT 'Migration 09 executada com sucesso!' AS resultado;
