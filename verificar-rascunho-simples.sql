-- ============================================================================
-- VERIFICAR RASCUNHO SALVO - QUERY SIMPLES (SEM COLUNAS OPCIONAIS)
-- ============================================================================
-- Esta query funciona mesmo se as colunas wizard_data não existirem ainda
-- ============================================================================

-- Verificar TODOS os rascunhos (apenas colunas básicas que sempre existem)
SELECT 
  id,
  organization_id,
  status,
  name,
  code,
  type,
  address_city,
  address_state,
  address_country,
  max_guests,
  pricing_base_price,
  pricing_currency,
  created_at,
  updated_at
FROM properties
WHERE status = 'draft'
ORDER BY created_at DESC;

-- Contar rascunhos
SELECT 
  COUNT(*) as total_rascunhos,
  COUNT(CASE WHEN organization_id IS NULL THEN 1 END) as rascunhos_sem_org,
  COUNT(CASE WHEN organization_id IS NOT NULL THEN 1 END) as rascunhos_com_org
FROM properties
WHERE status = 'draft';

-- Último rascunho criado
SELECT 
  id,
  organization_id,
  status,
  name,
  code,
  type,
  created_at
FROM properties
WHERE status = 'draft'
ORDER BY created_at DESC
LIMIT 1;
