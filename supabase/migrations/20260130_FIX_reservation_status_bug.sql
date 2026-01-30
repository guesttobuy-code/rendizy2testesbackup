-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ MIGRATION URGENTE: Correção de Status de Reservas                            ║
-- ║                                                                               ║
-- ║ BUG IDENTIFICADO: staysnet-full-sync.ts linha 693                             ║
-- ║ Problema: status: staysRes.type === 'cancelled' ? 'cancelled' : 'confirmed'   ║
-- ║           O código não tratava 'canceled' (americano) vs 'cancelled' (britânico) ║
-- ║                                                                               ║
-- ║ IMPACTO: ~178 reservas incorretamente marcadas como 'cancelled'               ║
-- ║ DATA DO BUG: 2026-01-29 21:09-21:11 UTC (batch import de 94 segundos)         ║
-- ║                                                                               ║
-- ║ CORREÇÃO: Restaurar status para 'confirmed' onde:                             ║
-- ║ - staysnet_raw->>'type' = 'booked' (deveria ser 'confirmed')                  ║
-- ║ - status = 'cancelled' (status errado)                                        ║
-- ║ - check_in entre 2026-01-01 e 2026-02-28                                      ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- ==================================================================================
-- PASSO 1: VERIFICAÇÃO (DRY RUN) - Executar primeiro para ver quantas serão afetadas
-- ==================================================================================

-- Contar reservas que serão corrigidas
SELECT 
    COUNT(*) as total_a_corrigir,
    COUNT(CASE WHEN staysnet_raw->>'type' = 'booked' THEN 1 END) as tipo_booked,
    COUNT(CASE WHEN staysnet_raw->>'type' = 'new' THEN 1 END) as tipo_new,
    COUNT(CASE WHEN staysnet_raw->>'type' = 'contract' THEN 1 END) as tipo_contract
FROM reservations
WHERE status = 'cancelled'
  AND check_in >= '2026-01-01'
  AND check_in <= '2026-02-28'
  AND staysnet_raw IS NOT NULL
  AND (
    staysnet_raw->>'type' IN ('booked', 'new', 'contract', 'confirmed')
    OR staysnet_raw->>'type' IS NULL
  )
  -- Filtrar apenas aquelas que NÃO têm cancelledAt no raw (cancelamento real)
  AND staysnet_raw->>'cancelledAt' IS NULL
  AND staysnet_raw->>'cancelled_at' IS NULL;

-- Listar algumas para conferência manual
SELECT 
    id,
    staysnet_reservation_code,
    check_in,
    check_out,
    status as status_atual,
    'confirmed' as status_corrigido,
    staysnet_raw->>'type' as raw_type,
    cancelled_at,
    updated_at
FROM reservations
WHERE status = 'cancelled'
  AND check_in >= '2026-01-01'
  AND check_in <= '2026-02-28'
  AND staysnet_raw IS NOT NULL
  AND staysnet_raw->>'type' IN ('booked', 'new', 'contract', 'confirmed')
  AND staysnet_raw->>'cancelledAt' IS NULL
  AND staysnet_raw->>'cancelled_at' IS NULL
ORDER BY check_in
LIMIT 20;

-- ==================================================================================
-- PASSO 2: CORREÇÃO - EXECUTAR APENAS APÓS VERIFICAR O PASSO 1
-- ==================================================================================

-- DESCOMENTE AS LINHAS ABAIXO PARA APLICAR A CORREÇÃO:

/*
BEGIN;

-- Criar backup antes da correção
CREATE TABLE IF NOT EXISTS _backup_reservations_status_fix_20260130 AS
SELECT id, status, cancelled_at, updated_at, staysnet_raw->>'type' as raw_type
FROM reservations
WHERE status = 'cancelled'
  AND check_in >= '2026-01-01'
  AND check_in <= '2026-02-28'
  AND staysnet_raw IS NOT NULL
  AND staysnet_raw->>'type' IN ('booked', 'new', 'contract', 'confirmed')
  AND staysnet_raw->>'cancelledAt' IS NULL
  AND staysnet_raw->>'cancelled_at' IS NULL;

-- Aplicar correção
UPDATE reservations
SET 
    status = 'confirmed',
    cancelled_at = NULL,  -- Limpar data de cancelamento errada
    updated_at = NOW()
WHERE status = 'cancelled'
  AND check_in >= '2026-01-01'
  AND check_in <= '2026-02-28'
  AND staysnet_raw IS NOT NULL
  AND staysnet_raw->>'type' IN ('booked', 'new', 'contract', 'confirmed')
  AND staysnet_raw->>'cancelledAt' IS NULL
  AND staysnet_raw->>'cancelled_at' IS NULL;

-- Verificar resultado
SELECT 
    COUNT(*) as total_corrigidas,
    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmadas
FROM reservations
WHERE check_in >= '2026-01-01'
  AND check_in <= '2026-02-28'
  AND staysnet_raw IS NOT NULL
  AND staysnet_raw->>'type' IN ('booked', 'new', 'contract', 'confirmed');

COMMIT;
*/

-- ==================================================================================
-- PASSO 3: VERIFICAÇÃO PÓS-CORREÇÃO
-- ==================================================================================

-- Verificar distribuição de status após correção
-- SELECT 
--     status,
--     COUNT(*) as total
-- FROM reservations
-- WHERE check_in >= '2026-01-01'
--   AND check_in <= '2026-02-28'
-- GROUP BY status
-- ORDER BY total DESC;

-- ==================================================================================
-- ROLLBACK (caso necessário)
-- ==================================================================================

-- Se precisar reverter:
/*
UPDATE reservations r
SET 
    status = b.status,
    cancelled_at = b.cancelled_at,
    updated_at = NOW()
FROM _backup_reservations_status_fix_20260130 b
WHERE r.id = b.id;
*/
