-- ============================================================================
-- MIGRAÇÃO: Adicionar campos de comissão de plataforma nas reservas
-- Data: 18/01/2026
-- Projeto: Rendizy
-- Objetivo: Armazenar comissão cobrada pelas plataformas (Airbnb, Booking, etc)
--           para cálculos financeiros precisos
-- ============================================================================

-- ============================================================================
-- 1. ADICIONAR CAMPOS DE COMISSÃO NA TABELA RESERVATIONS
-- ============================================================================

-- Comissão da plataforma (em centavos, assim como os outros campos pricing_*)
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS pricing_platform_commission INTEGER NOT NULL DEFAULT 0;

-- Nome da plataforma/partner que cobra a comissão (para referência)
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS platform_partner_name TEXT;

-- Tipo de comissão (fixed, percentage, etc - conforme vem do Stays)
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS platform_commission_type TEXT;

-- ============================================================================
-- 2. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON COLUMN reservations.pricing_platform_commission IS 
'Comissão cobrada pela plataforma (Airbnb, Booking, etc) em CENTAVOS. Vem do campo partner.commission._mcval.BRL do Stays.net';

COMMENT ON COLUMN reservations.platform_partner_name IS 
'Nome do parceiro/plataforma que cobra a comissão (ex: API booking.com, Airbnb)';

COMMENT ON COLUMN reservations.platform_commission_type IS 
'Tipo de comissão (fixed, percentage, etc) conforme definido no Stays.net';

-- ============================================================================
-- 3. ÍNDICE PARA ANÁLISES FINANCEIRAS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_reservations_platform_commission 
ON reservations(pricing_platform_commission) 
WHERE pricing_platform_commission > 0;

-- ============================================================================
-- 4. ATUALIZAR RESERVAS EXISTENTES COM DADOS DO STAYSNET_RAW
-- ============================================================================

-- Script para corrigir valores a partir do staysnet_raw
-- Atualiza pricing_platform_commission a partir de partner.commission._mcval.BRL
UPDATE reservations r
SET 
  pricing_platform_commission = COALESCE(
    ROUND(
      (r.staysnet_raw->'partner'->'commission'->'_mcval'->>'BRL')::NUMERIC * 100
    )::INTEGER,
    0
  ),
  platform_partner_name = r.staysnet_raw->'partner'->>'name',
  platform_commission_type = r.staysnet_raw->'partner'->'commission'->>'type'
WHERE r.staysnet_raw IS NOT NULL
  AND r.staysnet_raw->'partner'->'commission'->'_mcval'->>'BRL' IS NOT NULL;

-- ============================================================================
-- 5. CORRIGIR pricing_total ONDE ESTÁ ERRADO
-- ============================================================================

-- Corrige reservas onde pricing_total foi armazenado incorretamente
-- (quando _f_total veio como inteiro representando reais, não centavos)
-- A heurística: se a diferença entre _f_total*100 e pricing_total é > 90%,
-- significa que pricing_total foi armazenado sem multiplicar por 100

UPDATE reservations r
SET 
  pricing_total = ROUND(
    (r.staysnet_raw->'price'->>'_f_total')::NUMERIC * 100
  )::INTEGER,
  pricing_base_total = COALESCE(
    ROUND(
      (r.staysnet_raw->'price'->>'_f_expected')::NUMERIC * 100
    )::INTEGER,
    pricing_base_total
  )
WHERE r.staysnet_raw IS NOT NULL
  AND r.staysnet_raw->'price'->>'_f_total' IS NOT NULL
  AND ABS(
    ROUND((r.staysnet_raw->'price'->>'_f_total')::NUMERIC * 100)::INTEGER - r.pricing_total
  ) > (r.pricing_total * 0.9)  -- Diferença maior que 90% indica bug de conversão
  AND r.pricing_total > 0;

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================
