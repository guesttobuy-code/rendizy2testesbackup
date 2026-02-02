-- =====================================================
-- 🔍 DIAGNÓSTICO: Verificar estado real do schema
-- =====================================================
-- Execute este script no Supabase SQL Editor ANTES da migration 09
-- Copie TODO o resultado e cole aqui
-- =====================================================

-- 1. Tabela reservation_history existe?
SELECT 'reservation_history exists?' AS check_name,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'reservation_history') AS result;

-- 2. Se existe, quais colunas tem?
SELECT 'reservation_history columns' AS check_name, 
       column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'reservation_history'
ORDER BY ordinal_position;

-- 3. Tabela reservation_room_history existe?
SELECT 'reservation_room_history exists?' AS check_name,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'reservation_room_history') AS result;

-- 4. Função log_reservation_change existe?
SELECT 'log_reservation_change exists?' AS check_name,
       EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'log_reservation_change') AS result;

-- 5. Trigger trg_reservation_history existe?
SELECT 'trg_reservation_history exists?' AS check_name,
       EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'trg_reservation_history') AS result;

-- 6. Colunas da migration 09 já existem em reservations?
SELECT 'reservations columns check' AS check_name,
       column_name
FROM information_schema.columns 
WHERE table_name = 'reservations' 
  AND column_name IN ('travel_purpose', 'adjustment_value', 'adjustment_type', 
                      'invoicing_consent', 'ota_links', 'trader_information');

-- 7. Coluna child_ages existe em reservation_rooms?
SELECT 'child_ages in reservation_rooms?' AS check_name,
       EXISTS(
         SELECT 1 FROM information_schema.columns 
         WHERE table_name = 'reservation_rooms' AND column_name = 'child_ages'
       ) AS result;

-- =====================================================
-- 📋 RESULTADO ESPERADO:
-- Se reservation_history existe MAS falta change_type = PROBLEMA!
-- Significa que uma execução anterior criou a tabela incompleta
-- =====================================================
