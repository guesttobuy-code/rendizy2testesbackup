-- ============================================================================
-- ENCONTRAR RASCUNHO CRIADO VIA API
-- ============================================================================
-- Execute esta query para encontrar o rascunho que foi criado
-- ============================================================================

-- 1. Último rascunho criado (mais recente)
SELECT 
  id,
  organization_id,
  status,
  name,
  code,
  type,
  address_city,
  address_state,
  max_guests,
  pricing_base_price,
  pricing_currency,
  created_at
FROM properties
WHERE status = 'draft'
ORDER BY created_at DESC
LIMIT 1;

-- 2. Todos os rascunhos (últimos 5)
SELECT 
  id,
  status,
  name,
  code,
  type,
  created_at
FROM properties
WHERE status = 'draft'
ORDER BY created_at DESC
LIMIT 5;

-- 3. Buscar por ID específico (substitua 'SEU_ID_AQUI' pelo ID retornado pela API)
-- SELECT 
--   id,
--   status,
--   name,
--   code,
--   type,
--   created_at
-- FROM properties
-- WHERE id = 'SEU_ID_AQUI';
