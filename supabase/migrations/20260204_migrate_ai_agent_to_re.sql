-- ============================================================================
-- MIGRATION: Migrar dados do AI Agent para tabelas Real Estate (re_*)
-- Data: 04/02/2026
-- Objetivo: Unificar dados extraídos pelo scraper com módulo Real Estate
-- ============================================================================

-- 1. LIMPAR DADOS MOCK de re_developments e re_units
-- ============================================================================
DELETE FROM re_units;
DELETE FROM re_developments;
DELETE FROM re_companies;

-- 2. CRIAR CONSTRUTORA CALPER em re_companies
-- ============================================================================
INSERT INTO re_companies (
  id,
  organization_id,
  type,
  name,
  description,
  logo_url,
  location,
  partnership_status,
  verified,
  rating,
  reviews_count,
  created_at
) VALUES (
  'a1b2c3d4-0000-0000-0000-calper000001',
  '00000000-0000-0000-0000-000000000000',
  'constructor',
  'Construtora Calper',
  'Especializada em empreendimentos de médio e alto padrão no Rio de Janeiro. Mais de 20 anos de tradição no mercado imobiliário.',
  'https://ui-avatars.com/api/?name=Calper&background=1e40af&color=fff&size=128',
  '{"city": "Rio de Janeiro", "state": "RJ", "address": "Recreio dos Bandeirantes"}',
  'open',
  true,
  4.8,
  45,
  NOW()
);

-- 3. MIGRAR EMPREENDIMENTOS de ai_agent_empreendimentos para re_developments
-- ============================================================================
INSERT INTO re_developments (
  id,
  company_id,
  name,
  description,
  location,
  phase,
  total_units,
  available_units,
  sold_percentage,
  price_range,
  typologies,
  virtual_tour_url,
  marketing_materials,
  created_at,
  updated_at
)
SELECT 
  ae.id,
  'a1b2c3d4-0000-0000-0000-calper000001',
  ae.nome,
  'Empreendimento ' || ae.nome || ' - ' || COALESCE(ae.bairro, 'Rio de Janeiro'),
  jsonb_build_object(
    'city', COALESCE(ae.cidade, 'Rio de Janeiro'),
    'state', COALESCE(ae.estado, 'RJ'),
    'address', COALESCE(ae.endereco, ae.bairro)
  ),
  CASE 
    WHEN ae.status = 'em_construcao' THEN 'construction'
    WHEN ae.status = 'pronto' THEN 'ready'
    ELSE 'launch'
  END,
  COALESCE((ae.resumo_vendas->>'total')::int, 0),
  COALESCE((ae.resumo_vendas->>'disponiveis')::int, 0),
  CASE 
    WHEN (ae.resumo_vendas->>'total')::int > 0 
    THEN ROUND(((ae.resumo_vendas->>'vendidas')::numeric / (ae.resumo_vendas->>'total')::numeric) * 100, 1)
    ELSE 0
  END,
  jsonb_build_object(
    'min', ae.preco_min,
    'max', ae.preco_max,
    'currency', 'BRL'
  ),
  COALESCE(ae.tipologias, '{}'),
  ae.links->>'decorado_virtual',
  COALESCE(
    jsonb_build_array(
      jsonb_build_object('name', 'Tabela de Preços', 'type', 'pdf', 'url', ae.links->>'tabela_precos'),
      jsonb_build_object('name', 'Disponibilidade', 'type', 'link', 'url', ae.links->>'disponibilidade'),
      jsonb_build_object('name', 'Book Digital', 'type', 'pdf', 'url', ae.links->>'book_digital')
    ),
    '[]'
  ),
  ae.created_at,
  NOW()
FROM ai_agent_empreendimentos ae
WHERE ae.organization_id = '00000000-0000-0000-0000-000000000000';

-- 4. MIGRAR UNIDADES de ai_agent_unidades para re_units
-- ============================================================================
INSERT INTO re_units (
  id,
  development_id,
  unit_number,
  block,
  typology,
  status,
  sold_at,
  sold_date,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.empreendimento_id,
  au.codigo,
  au.bloco,
  au.tipologia,
  CASE 
    WHEN au.status = 'vendido' THEN 'sold'
    WHEN au.status = 'reservado' THEN 'reserved'
    WHEN au.status = 'disponivel' THEN 'available'
    ELSE 'available'
  END,
  CASE WHEN au.status = 'vendido' THEN au.scraped_at ELSE NULL END,
  au.data_venda,
  au.created_at,
  NOW()
FROM ai_agent_unidades au
WHERE au.organization_id = '00000000-0000-0000-0000-000000000000';

-- 5. ATUALIZAR CONTAGENS em re_developments baseado em re_units
-- ============================================================================
UPDATE re_developments rd
SET 
  total_units = (SELECT COUNT(*) FROM re_units ru WHERE ru.development_id = rd.id),
  available_units = (SELECT COUNT(*) FROM re_units ru WHERE ru.development_id = rd.id AND ru.status = 'available'),
  sold_percentage = CASE 
    WHEN (SELECT COUNT(*) FROM re_units ru WHERE ru.development_id = rd.id) > 0
    THEN ROUND(
      (SELECT COUNT(*) FROM re_units ru WHERE ru.development_id = rd.id AND ru.status = 'sold')::numeric 
      / (SELECT COUNT(*) FROM re_units ru WHERE ru.development_id = rd.id)::numeric * 100, 1
    )
    ELSE 0
  END,
  updated_at = NOW();

-- 6. LOG de migração
-- ============================================================================
DO $$
DECLARE
  companies_count INT;
  developments_count INT;
  units_count INT;
BEGIN
  SELECT COUNT(*) INTO companies_count FROM re_companies;
  SELECT COUNT(*) INTO developments_count FROM re_developments;
  SELECT COUNT(*) INTO units_count FROM re_units;
  
  RAISE NOTICE 'Migração concluída!';
  RAISE NOTICE 'Construtoras: %', companies_count;
  RAISE NOTICE 'Empreendimentos: %', developments_count;
  RAISE NOTICE 'Unidades: %', units_count;
END $$;
