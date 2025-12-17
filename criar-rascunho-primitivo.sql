-- ============================================================================
-- CRIAR RASCUNHO PRIMITIVO - FORMA MAIS SIMPLES POSSÍVEL
-- ============================================================================
-- Este script cria um rascunho diretamente no banco de dados
-- sem passar pela interface ou API
-- ============================================================================

-- Inserir rascunho mínimo (apenas campos obrigatórios)
INSERT INTO properties (
  -- ID gerado automaticamente pelo banco
  id,
  
  -- Multi-tenant (null para superadmin)
  organization_id,
  
  -- Status obrigatório
  status,
  
  -- Identificação (obrigatórios)
  name,
  code,
  type,
  
  -- Endereço (obrigatórios)
  address_city,
  address_state,
  address_country,
  
  -- Capacidade (obrigatório)
  max_guests,
  
  -- Preço (obrigatório)
  pricing_base_price,
  pricing_currency,
  
  -- Sistema de rascunho
  wizard_data,
  completion_percentage,
  completed_steps,
  
  -- Timestamps (gerados automaticamente)
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),                    -- ID gerado pelo banco
  NULL,                                 -- organization_id (null para superadmin)
  'draft',                              -- status = draft
  'Rascunho Primitivo',                 -- name
  'DRAFT-PRIMITIVO-' || to_char(now(), 'YYYYMMDDHH24MISS'), -- code único
  'house',                              -- type (valor válido na constraint CHECK)
  'Rio de Janeiro',                     -- address_city
  'RJ',                                 -- address_state
  'BR',                                 -- address_country
  1,                                    -- max_guests
  0,                                    -- pricing_base_price
  'BRL',                                -- pricing_currency
  '{}'::jsonb,                          -- wizard_data (vazio)
  0,                                    -- completion_percentage
  ARRAY[]::TEXT[],                      -- completed_steps (vazio)
  NOW(),                                -- created_at
  NOW()                                 -- updated_at
)
RETURNING 
  id,
  status,
  name,
  code,
  type,
  wizard_data,
  completion_percentage,
  created_at;

-- ============================================================================
-- VERIFICAR SE FOI CRIADO
-- ============================================================================
SELECT 
  id,
  status,
  name,
  code,
  type,
  wizard_data,
  completion_percentage,
  completed_steps,
  created_at
FROM properties
WHERE status = 'draft'
ORDER BY created_at DESC
LIMIT 1;
