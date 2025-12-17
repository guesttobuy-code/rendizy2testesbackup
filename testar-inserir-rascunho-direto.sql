-- ============================================================================
-- TESTE: INSERIR RASCUNHO DIRETAMENTE NO BANCO
-- ============================================================================
-- Este script tenta inserir um rascunho da forma mais simples possível
-- e mostra qualquer erro que ocorrer
-- ============================================================================

-- 1. Verificar estrutura da tabela properties
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'properties'
  AND column_name IN (
    'id', 'organization_id', 'status', 'name', 'code', 'type',
    'address_city', 'address_state', 'address_country',
    'max_guests', 'pricing_base_price', 'pricing_currency',
    'created_at', 'updated_at'
  )
ORDER BY ordinal_position;

-- 2. Verificar constraints NOT NULL
SELECT 
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'properties'
  AND is_nullable = 'NO'
  AND column_name IN (
    'id', 'organization_id', 'status', 'name', 'code', 'type',
    'address_city', 'address_state', 'address_country',
    'max_guests', 'pricing_base_price', 'pricing_currency'
  );

-- 3. Tentar inserir rascunho mínimo (com TODOS os campos obrigatórios)
BEGIN;

INSERT INTO properties (
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
) VALUES (
  gen_random_uuid(),
  NULL,
  'draft',
  'Teste Rascunho Direto',
  'TEST-DIRETO-' || to_char(now(), 'YYYYMMDDHH24MISS'),
      'house',  -- ✅ Valor válido na constraint CHECK (aceita: apartment, house, studio, loft, condo, villa, other)
  'Rio de Janeiro',
  'RJ',
  'BR',
  1,
  0,
  'BRL',
  NOW(),
  NOW()
)
RETURNING 
  id,
  organization_id,
  status,
  name,
  code,
  type,
  created_at;

-- Se chegou aqui, commit
COMMIT;

-- 4. Verificar se foi inserido
SELECT 
  id,
  organization_id,
  status,
  name,
  code,
  type,
  created_at
FROM properties
WHERE name = 'Teste Rascunho Direto'
ORDER BY created_at DESC
LIMIT 1;
