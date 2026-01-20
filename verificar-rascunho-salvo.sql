-- ============================================================================
-- VERIFICAR RASCUNHO SALVO NO BANCO
-- ============================================================================
-- Esta query verifica se o rascunho foi salvo e mostra todos os detalhes
-- ============================================================================

-- 0. Verificar quais colunas existem na tabela properties
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'properties'
  AND column_name IN ('status', 'wizard_data', 'completion_percentage', 'completed_steps')
ORDER BY column_name;

-- 1. Verificar TODOS os rascunhos (sem filtro de organization_id)
-- Usando apenas colunas que sempre existem
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
ORDER BY created_at DESC
LIMIT 10;

-- 2. Verificar rascunhos com organization_id NULL (superadmin)
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
  AND organization_id IS NULL
ORDER BY created_at DESC;

-- 3. Verificar rascunhos com organization_id específico
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
  AND organization_id IS NOT NULL
ORDER BY created_at DESC;

-- 4. Contar rascunhos por organization_id
SELECT 
  organization_id,
  COUNT(*) as total_rascunhos
FROM properties
WHERE status = 'draft'
GROUP BY organization_id
ORDER BY total_rascunhos DESC;

-- 5. Verificar último rascunho criado (mais recente)
SELECT 
  id,
  organization_id,
  status,
  name,
  code,
  type,
  address_city,
  address_state,
  created_at
FROM properties
WHERE status = 'draft'
ORDER BY created_at DESC
LIMIT 1;

-- 6. Verificar se colunas de rascunho existem (executar migration se necessário)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'properties' AND column_name = 'wizard_data'
    ) THEN '✅ wizard_data existe'
    ELSE '❌ wizard_data NÃO existe - Execute migration: 20251202_add_draft_system_properties.sql'
  END as wizard_data_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'properties' AND column_name = 'completion_percentage'
    ) THEN '✅ completion_percentage existe'
    ELSE '❌ completion_percentage NÃO existe'
  END as completion_percentage_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'properties' AND column_name = 'completed_steps'
    ) THEN '✅ completed_steps existe'
    ELSE '❌ completed_steps NÃO existe'
  END as completed_steps_status;
