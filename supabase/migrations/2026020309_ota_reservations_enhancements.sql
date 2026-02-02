-- =====================================================
-- Migration 09: OTA Reservations Enhancements
-- =====================================================
-- 🎯 PROPÓSITO: Campos universais para TODAS as OTAs
-- 📋 ADR: ADR-002-OTA-UNIVERSAL-SCHEMA
-- 
-- ⚠️  IMPORTANTE: Esta migration é UNIVERSAL - não específica para Expedia!
-- Os campos aqui suportam: Expedia, Booking.com, Airbnb, Decolar, etc.
-- 
-- DEPENDÊNCIAS:
--   - Migration 03: reservation_rooms deve existir
--   - Migration 08: crm_contacts_expedia_format (para views)
-- =====================================================

-- =====================================================
-- 1. CHILD AGES ARRAY (reservation_rooms)
-- =====================================================
-- 🌐 UNIVERSAL: Todas OTAs precisam de idades de crianças
-- - Expedia: child_ages[] array
-- - Booking: children_ages array
-- - Airbnb: guest_details.children
-- =====================================================

DO $$
BEGIN
  -- Verificar se tabela existe antes de alterar
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reservation_rooms') THEN
    ALTER TABLE reservation_rooms ADD COLUMN IF NOT EXISTS child_ages INTEGER[];
    COMMENT ON COLUMN reservation_rooms.child_ages IS '[OTA-UNIVERSAL] Array com idades das crianças (ex: [5, 8, 12])';
  END IF;
END $$;

-- =====================================================
-- 2. TRAVEL PURPOSE (reservations)
-- =====================================================
-- 🌐 UNIVERSAL: Propósito da viagem
-- - Expedia: travel_purpose (business/leisure/unspecified)
-- - Booking: travel_purpose
-- - Airbnb: trip_purpose
-- =====================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reservations' AND column_name = 'travel_purpose'
  ) THEN
    ALTER TABLE reservations ADD COLUMN travel_purpose TEXT 
      CHECK (travel_purpose IN ('business', 'leisure', 'unspecified'));
    COMMENT ON COLUMN reservations.travel_purpose IS '[OTA-UNIVERSAL] Propósito: business, leisure ou unspecified';
  END IF;
END $$;

-- =====================================================
-- 3. ADJUSTMENT/AJUSTES DE PREÇO
-- =====================================================
-- 🌐 UNIVERSAL: Ajustes manuais em reservas
-- - Expedia: adjustment object
-- - Booking: price_adjustments
-- - Airbnb: price_adjustments
-- =====================================================

ALTER TABLE reservations 
  ADD COLUMN IF NOT EXISTS adjustment_value DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS adjustment_type TEXT,
  ADD COLUMN IF NOT EXISTS adjustment_currency TEXT DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS adjustment_reason TEXT;

COMMENT ON COLUMN reservations.adjustment_value IS '[OTA-UNIVERSAL] Valor do ajuste (positivo ou negativo)';
COMMENT ON COLUMN reservations.adjustment_type IS '[OTA-UNIVERSAL] Tipo: discount, fee, compensation, etc';
COMMENT ON COLUMN reservations.adjustment_reason IS '[OTA-UNIVERSAL] Motivo do ajuste';

-- =====================================================
-- 4. INVOICING/FATURAMENTO
-- =====================================================
-- 🌐 UNIVERSAL: Dados para notas fiscais corporativas
-- Usado por todas OTAs para reservas business
-- =====================================================

ALTER TABLE reservations 
  ADD COLUMN IF NOT EXISTS invoicing_consent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoicing_company_name TEXT,
  ADD COLUMN IF NOT EXISTS invoicing_company_address JSONB,
  ADD COLUMN IF NOT EXISTS invoicing_vat_number TEXT,
  ADD COLUMN IF NOT EXISTS invoicing_email TEXT;

COMMENT ON COLUMN reservations.invoicing_consent IS '[OTA-UNIVERSAL] Consentimento para emitir fatura';
COMMENT ON COLUMN reservations.invoicing_company_name IS '[OTA-UNIVERSAL] Nome da empresa para fatura';
COMMENT ON COLUMN reservations.invoicing_vat_number IS '[OTA-UNIVERSAL] CNPJ/VAT Number';

-- =====================================================
-- 5. OTA LINKS (HATEOAS)
-- =====================================================
-- 🌐 UNIVERSAL: Links dinâmicos retornados por OTAs
-- Renomeado de expedia_links para ota_links
-- =====================================================

ALTER TABLE reservations 
  ADD COLUMN IF NOT EXISTS ota_links JSONB;

COMMENT ON COLUMN reservations.ota_links IS '[OTA-UNIVERSAL] Links HATEOAS da OTA (cancel, change, etc)';

-- =====================================================
-- 6. TABELA DE HISTÓRICO DE RESERVAS
-- =====================================================
-- 🌐 UNIVERSAL: Audit trail de TODAS as mudanças
-- Independente de OTA - usado para qualquer reserva
-- =====================================================

CREATE TABLE IF NOT EXISTS reservation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  
  -- Tipo de mudança (ENUM universal)
  change_type TEXT NOT NULL,
  
  -- Quem fez a mudança
  changed_by UUID,
  changed_by_type TEXT CHECK (changed_by_type IN ('user', 'guest', 'system', 'ota')),
  changed_by_name TEXT,
  
  -- Valores antes e depois
  old_values JSONB,
  new_values JSONB,
  
  -- Detalhes adicionais
  change_reason TEXT,
  source TEXT, -- 'manual', 'api', 'webhook', 'automation'
  source_reference TEXT, -- ID externo, webhook event_id, etc
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_reservation_history_reservation 
  ON reservation_history(reservation_id);

CREATE INDEX IF NOT EXISTS idx_reservation_history_type 
  ON reservation_history(change_type);

CREATE INDEX IF NOT EXISTS idx_reservation_history_date 
  ON reservation_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reservation_history_changed_by 
  ON reservation_history(changed_by) 
  WHERE changed_by IS NOT NULL;

COMMENT ON TABLE reservation_history IS '[OTA-UNIVERSAL] Histórico completo de mudanças em reservas (audit trail)';

-- =====================================================
-- 7. ROOM HISTORY (histórico por quarto)
-- =====================================================
-- 🌐 UNIVERSAL: Para reservas multi-room de qualquer OTA
-- =====================================================

DO $$
BEGIN
  -- Só criar se reservation_rooms existir
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reservation_rooms') THEN
    CREATE TABLE IF NOT EXISTS reservation_room_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reservation_room_id UUID NOT NULL REFERENCES reservation_rooms(id) ON DELETE CASCADE,
      reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
      
      change_type TEXT NOT NULL,
      changed_by UUID,
      old_values JSONB,
      new_values JSONB,
      change_reason TEXT,
      
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Criar índices apenas se tabela existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reservation_room_history') THEN
    CREATE INDEX IF NOT EXISTS idx_room_history_room 
      ON reservation_room_history(reservation_room_id);
    CREATE INDEX IF NOT EXISTS idx_room_history_reservation 
      ON reservation_room_history(reservation_id);
  END IF;
END $$;

-- =====================================================
-- 8. TRIGGER PARA AUTO-LOG DE MUDANÇAS
-- =====================================================
-- ⚠️ MOVIDO PARA MIGRATION 10!
-- O PostgreSQL valida funções no momento da criação,
-- mesmo dentro de EXECUTE. O trigger precisa ser criado
-- em uma transação separada, após a tabela estar commitada.
-- 
-- Ver: 2026020310_ota_reservation_history_trigger.sql
-- =====================================================

-- =====================================================
-- 9. TRADER/SUPPLIER INFO
-- =====================================================
-- 🌐 UNIVERSAL: Transparência do fornecedor/vendedor
-- Usado para compliance em várias OTAs
-- =====================================================

ALTER TABLE reservations 
  ADD COLUMN IF NOT EXISTS trader_information JSONB,
  ADD COLUMN IF NOT EXISTS supplier_transparency JSONB;

COMMENT ON COLUMN reservations.trader_information IS '[OTA-UNIVERSAL] Informações do vendedor/trader';
COMMENT ON COLUMN reservations.supplier_transparency IS '[OTA-UNIVERSAL] Dados de transparência do fornecedor';

-- =====================================================
-- FIM DA MIGRATION 09
-- =====================================================
-- 📋 Próxima: Criar views OTA-específicas em migrations separadas
-- 📋 Nota: Função get_reservation_history_formatted será criada na migration 10
-- =====================================================
