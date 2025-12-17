-- ============================================================================
-- PLANO DE CONTAS DEFAULT - IMOBILIÁRIAS DE TEMPORADA
-- ============================================================================
-- Plano de contas completo e abrangente para gestão de imóveis de temporada
-- Inclui receitas e despesas com OTAs (Airbnb, Booking, Decolar, etc.)
-- Estrutura hierárquica com códigos numéricos
-- ============================================================================
-- 
-- ⚠️ IMPORTANTE: Este script cria categorias para TODAS as organizações existentes
-- Se você quiser criar apenas para uma organização específica, modifique a variável abaixo
-- ============================================================================

-- ============================================================================
-- FUNÇÃO: Criar plano de contas para uma organização específica
-- ============================================================================
CREATE OR REPLACE FUNCTION criar_plano_contas_para_organizacao(org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  cat_3_1_id UUID;
  cat_3_2_id UUID;
  cat_3_3_id UUID;
  cat_3_4_id UUID;
  cat_3_5_id UUID;
  cat_4_1_id UUID;
  cat_4_2_id UUID;
  cat_4_3_id UUID;
  cat_5_1_id UUID;
  cat_5_2_id UUID;
  cat_5_3_id UUID;
  cat_5_4_id UUID;
  cat_5_5_id UUID;
  cat_5_6_id UUID;
  cat_6_1_id UUID;
  cat_6_2_id UUID;
  cat_6_3_id UUID;
  cat_6_4_id UUID;
  cat_6_5_id UUID;
  cat_6_6_id UUID;
  cat_7_1_id UUID;
BEGIN
  -- Verificar se organização existe
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = org_id) THEN
    RAISE EXCEPTION 'Organização % não encontrada', org_id;
  END IF;

  -- ============================================================================
  -- RECEITAS OPERACIONAIS (3.x)
  -- ============================================================================

  -- 3.1 - RECEITA DE ALUGUÉIS DE TEMPORADA
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '3.1', 'Receita de Aluguéis de Temporada', 'receita', 'credora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_3_1_id;
  
  -- Buscar ID se já existir
  IF cat_3_1_id IS NULL THEN
    SELECT id INTO cat_3_1_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.1' LIMIT 1;
  END IF;

  -- 3.1.1 - Aluguéis por Plataforma
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.1.1', 'Aluguéis - Airbnb', 'receita', 'credora', 2, cat_3_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.1.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.1.2', 'Aluguéis - Booking.com', 'receita', 'credora', 2, cat_3_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.1.2');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.1.3', 'Aluguéis - Decolar', 'receita', 'credora', 2, cat_3_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.1.3');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.1.4', 'Aluguéis - Vrbo/HomeAway', 'receita', 'credora', 2, cat_3_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.1.4');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.1.5', 'Aluguéis - Expedia', 'receita', 'credora', 2, cat_3_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.1.5');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.1.6', 'Aluguéis - Agoda', 'receita', 'credora', 2, cat_3_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.1.6');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.1.7', 'Aluguéis - Direto (Site Próprio)', 'receita', 'credora', 2, cat_3_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.1.7');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.1.8', 'Aluguéis - Outras Plataformas', 'receita', 'credora', 2, cat_3_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.1.8');

  -- 3.2 - RECEITA DE SERVIÇOS ADICIONAIS
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '3.2', 'Receita de Serviços Adicionais', 'receita', 'credora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_3_2_id;
  
  IF cat_3_2_id IS NULL THEN
    SELECT id INTO cat_3_2_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.2' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.2.1', 'Taxa de Limpeza', 'receita', 'credora', 2, cat_3_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.2.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.2.2', 'Taxa de Serviço', 'receita', 'credora', 2, cat_3_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.2.2');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.2.3', 'Taxa de Hóspede Adicional', 'receita', 'credora', 2, cat_3_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.2.3');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.2.4', 'Taxa de Pet', 'receita', 'credora', 2, cat_3_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.2.4');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.2.5', 'Estacionamento', 'receita', 'credora', 2, cat_3_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.2.5');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.2.6', 'Serviços de Concierge', 'receita', 'credora', 2, cat_3_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.2.6');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.2.7', 'Roupa de Cama e Toalhas', 'receita', 'credora', 2, cat_3_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.2.7');

  -- 3.3 - RECEITA DE COMISSÕES
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '3.3', 'Receita de Comissões', 'receita', 'credora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_3_3_id;
  
  IF cat_3_3_id IS NULL THEN
    SELECT id INTO cat_3_3_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.3' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.3.1', 'Comissão de Gestão de Imóveis', 'receita', 'credora', 2, cat_3_3_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.3.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.3.2', 'Comissão de Venda de Imóveis', 'receita', 'credora', 2, cat_3_3_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.3.2');

  -- 3.4 - RECEITA DE VENDAS
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '3.4', 'Receita de Vendas de Imóveis', 'receita', 'credora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING;

  -- 3.5 - OUTRAS RECEITAS OPERACIONAIS
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '3.5', 'Outras Receitas Operacionais', 'receita', 'credora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_3_5_id;
  
  IF cat_3_5_id IS NULL THEN
    SELECT id INTO cat_3_5_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.5' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.5.1', 'Multas e Penalidades', 'receita', 'credora', 2, cat_3_5_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.5.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.5.2', 'Receita de Depósitos Não Devolvidos', 'receita', 'credora', 2, cat_3_5_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.5.2');

  -- ============================================================================
  -- DEDUÇÕES DA RECEITA (4.x)
  -- ============================================================================

  -- 4.1 - IMPOSTOS SOBRE RECEITA
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '4.1', 'Impostos sobre Receita', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_4_1_id;
  
  IF cat_4_1_id IS NULL THEN
    SELECT id INTO cat_4_1_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '4.1' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '4.1.1', 'ISS (Imposto Sobre Serviços)', 'despesa', 'devedora', 2, cat_4_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '4.1.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '4.1.2', 'ICMS', 'despesa', 'devedora', 2, cat_4_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '4.1.2');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '4.1.3', 'PIS', 'despesa', 'devedora', 2, cat_4_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '4.1.3');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '4.1.4', 'COFINS', 'despesa', 'devedora', 2, cat_4_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '4.1.4');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '4.1.5', 'IRRF (Imposto de Renda Retido na Fonte)', 'despesa', 'devedora', 2, cat_4_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '4.1.5');

  -- 4.2 - COMISSÕES PAGAS A OTAs
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '4.2', 'Comissões Pagas a OTAs', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_4_2_id;
  
  IF cat_4_2_id IS NULL THEN
    SELECT id INTO cat_4_2_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '4.2' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '4.2.1', 'Comissão Airbnb', 'despesa', 'devedora', 2, cat_4_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '4.2.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '4.2.2', 'Comissão Booking.com', 'despesa', 'devedora', 2, cat_4_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '4.2.2');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '4.2.3', 'Comissão Decolar', 'despesa', 'devedora', 2, cat_4_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '4.2.3');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '4.2.4', 'Comissão Vrbo/HomeAway', 'despesa', 'devedora', 2, cat_4_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '4.2.4');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '4.2.5', 'Comissão Expedia', 'despesa', 'devedora', 2, cat_4_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '4.2.5');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '4.2.6', 'Comissão Agoda', 'despesa', 'devedora', 2, cat_4_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '4.2.6');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '4.2.7', 'Comissão Outras OTAs', 'despesa', 'devedora', 2, cat_4_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '4.2.7');

  -- 4.3 - DESCONTOS CONCEDIDOS
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '4.3', 'Descontos Concedidos', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING;

  -- ============================================================================
  -- CUSTOS OPERACIONAIS (5.x)
  -- ============================================================================

  -- 5.1 - CUSTOS COM LIMPEZA E CONSERVAÇÃO
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '5.1', 'Custos com Limpeza e Conservação', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_5_1_id;
  
  IF cat_5_1_id IS NULL THEN
    SELECT id INTO cat_5_1_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.1' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.1.1', 'Serviços de Limpeza', 'despesa', 'devedora', 2, cat_5_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.1.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.1.2', 'Material de Limpeza', 'despesa', 'devedora', 2, cat_5_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.1.2');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.1.3', 'Roupa de Cama e Toalhas', 'despesa', 'devedora', 2, cat_5_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.1.3');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.1.4', 'Lavanderia', 'despesa', 'devedora', 2, cat_5_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.1.4');

  -- 5.2 - CUSTOS COM MANUTENÇÃO E REPAROS
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '5.2', 'Custos com Manutenção e Reparos', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_5_2_id;
  
  IF cat_5_2_id IS NULL THEN
    SELECT id INTO cat_5_2_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.2' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.2.1', 'Manutenção Preventiva', 'despesa', 'devedora', 2, cat_5_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.2.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.2.2', 'Reparos e Corretivas', 'despesa', 'devedora', 2, cat_5_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.2.2');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.2.3', 'Mão de Obra', 'despesa', 'devedora', 2, cat_5_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.2.3');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.2.4', 'Material de Construção e Reparos', 'despesa', 'devedora', 2, cat_5_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.2.4');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.2.5', 'Equipamentos e Ferramentas', 'despesa', 'devedora', 2, cat_5_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.2.5');

  -- 5.3 - CUSTOS COM CONSUMO (UTILIDADES)
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '5.3', 'Custos com Consumo (Utilidades)', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_5_3_id;
  
  IF cat_5_3_id IS NULL THEN
    SELECT id INTO cat_5_3_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.3' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.3.1', 'Energia Elétrica', 'despesa', 'devedora', 2, cat_5_3_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.3.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.3.2', 'Água e Esgoto', 'despesa', 'devedora', 2, cat_5_3_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.3.2');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.3.3', 'Gás', 'despesa', 'devedora', 2, cat_5_3_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.3.3');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.3.4', 'Internet e Telefonia', 'despesa', 'devedora', 2, cat_5_3_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.3.4');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.3.5', 'TV a Cabo/Streaming', 'despesa', 'devedora', 2, cat_5_3_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.3.5');

  -- 5.4 - CUSTOS COM CONDOMÍNIO
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '5.4', 'Custos com Condomínio', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_5_4_id;
  
  IF cat_5_4_id IS NULL THEN
    SELECT id INTO cat_5_4_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.4' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.4.1', 'Taxa de Condomínio', 'despesa', 'devedora', 2, cat_5_4_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.4.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.4.2', 'Taxa Extraordinária', 'despesa', 'devedora', 2, cat_5_4_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.4.2');

  -- 5.5 - CUSTOS COM SEGUROS
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '5.5', 'Custos com Seguros', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_5_5_id;
  
  IF cat_5_5_id IS NULL THEN
    SELECT id INTO cat_5_5_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.5' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.5.1', 'Seguro do Imóvel', 'despesa', 'devedora', 2, cat_5_5_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.5.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.5.2', 'Seguro de Responsabilidade Civil', 'despesa', 'devedora', 2, cat_5_5_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.5.2');

  -- 5.6 - CUSTOS COM FORNECIMENTOS E SUPRIMENTOS
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '5.6', 'Custos com Fornecimentos e Suprimentos', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_5_6_id;
  
  IF cat_5_6_id IS NULL THEN
    SELECT id INTO cat_5_6_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.6' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.6.1', 'Produtos de Higiene e Limpeza', 'despesa', 'devedora', 2, cat_5_6_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.6.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.6.2', 'Papel Higiênico e Toalhas', 'despesa', 'devedora', 2, cat_5_6_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.6.2');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.6.3', 'Café, Chá e Açúcar', 'despesa', 'devedora', 2, cat_5_6_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.6.3');

  -- ============================================================================
  -- DESPESAS OPERACIONAIS (6.x)
  -- ============================================================================

  -- 6.1 - DESPESAS ADMINISTRATIVAS
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '6.1', 'Despesas Administrativas', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_6_1_id;
  
  IF cat_6_1_id IS NULL THEN
    SELECT id INTO cat_6_1_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.1' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.1.1', 'Salários e Encargos', 'despesa', 'devedora', 2, cat_6_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.1.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.1.2', 'Aluguel de Escritório', 'despesa', 'devedora', 2, cat_6_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.1.2');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.1.3', 'Material de Escritório', 'despesa', 'devedora', 2, cat_6_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.1.3');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.1.4', 'Serviços Contábeis', 'despesa', 'devedora', 2, cat_6_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.1.4');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.1.5', 'Serviços Jurídicos', 'despesa', 'devedora', 2, cat_6_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.1.5');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.1.6', 'Honorários de Gestão', 'despesa', 'devedora', 2, cat_6_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.1.6');

  -- 6.2 - DESPESAS COMERCIALES E MARKETING
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '6.2', 'Despesas Comerciais e Marketing', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_6_2_id;
  
  IF cat_6_2_id IS NULL THEN
    SELECT id INTO cat_6_2_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.2' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.2.1', 'Publicidade e Propaganda', 'despesa', 'devedora', 2, cat_6_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.2.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.2.2', 'Fotografia e Vídeo', 'despesa', 'devedora', 2, cat_6_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.2.2');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.2.3', 'Marketing Digital', 'despesa', 'devedora', 2, cat_6_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.2.3');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.2.4', 'Google Ads / Facebook Ads', 'despesa', 'devedora', 2, cat_6_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.2.4');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.2.5', 'Comissão de Vendas', 'despesa', 'devedora', 2, cat_6_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.2.5');

  -- 6.3 - DESPESAS COM TECNOLOGIA
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '6.3', 'Despesas com Tecnologia', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_6_3_id;
  
  IF cat_6_3_id IS NULL THEN
    SELECT id INTO cat_6_3_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.3' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.3.1', 'Software e Sistemas', 'despesa', 'devedora', 2, cat_6_3_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.3.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.3.2', 'Hospedagem e Domínio', 'despesa', 'devedora', 2, cat_6_3_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.3.2');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.3.3', 'Equipamentos de TI', 'despesa', 'devedora', 2, cat_6_3_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.3.3');

  -- 6.4 - DESPESAS FINANCEIRAS
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '6.4', 'Despesas Financeiras', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_6_4_id;
  
  IF cat_6_4_id IS NULL THEN
    SELECT id INTO cat_6_4_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.4' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.4.1', 'Juros e Encargos', 'despesa', 'devedora', 2, cat_6_4_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.4.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.4.2', 'Tarifas Bancárias', 'despesa', 'devedora', 2, cat_6_4_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.4.2');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.4.3', 'Taxa de Câmbio', 'despesa', 'devedora', 2, cat_6_4_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.4.3');

  -- 6.5 - DESPESAS COM IMPOSTOS E TAXAS
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '6.5', 'Despesas com Impostos e Taxas', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_6_5_id;
  
  IF cat_6_5_id IS NULL THEN
    SELECT id INTO cat_6_5_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.5' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.5.1', 'IRPJ (Imposto de Renda Pessoa Jurídica)', 'despesa', 'devedora', 2, cat_6_5_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.5.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.5.2', 'CSLL (Contribuição Social sobre Lucro Líquido)', 'despesa', 'devedora', 2, cat_6_5_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.5.2');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.5.3', 'Taxas e Contribuições', 'despesa', 'devedora', 2, cat_6_5_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.5.3');

  -- 6.6 - OUTRAS DESPESAS OPERACIONAIS
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '6.6', 'Outras Despesas Operacionais', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_6_6_id;
  
  IF cat_6_6_id IS NULL THEN
    SELECT id INTO cat_6_6_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.6' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.6.1', 'Despesas com Viagens', 'despesa', 'devedora', 2, cat_6_6_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.6.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.6.2', 'Despesas com Treinamento', 'despesa', 'devedora', 2, cat_6_6_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.6.2');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.6.3', 'Despesas Diversas', 'despesa', 'devedora', 2, cat_6_6_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.6.3');

  -- ============================================================================
  -- RESULTADO FINANCEIRO (7.x)
  -- ============================================================================

  -- 7.1 - RECEITAS FINANCEIRAS
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '7.1', 'Receitas Financeiras', 'receita', 'credora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_7_1_id;
  
  IF cat_7_1_id IS NULL THEN
    SELECT id INTO cat_7_1_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '7.1' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '7.1.1', 'Rendimentos de Aplicações', 'receita', 'credora', 2, cat_7_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '7.1.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '7.1.2', 'Juros Recebidos', 'receita', 'credora', 2, cat_7_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '7.1.2');

END;
$$;

-- ============================================================================
-- EXECUTAR: Aplicar plano de contas para TODAS as organizações
-- ============================================================================
DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT id FROM organizations LOOP
    PERFORM criar_plano_contas_para_organizacao(org_record.id);
  END LOOP;
END $$;

-- ============================================================================
-- NOTA: Para aplicar apenas em uma organização específica, use:
-- SELECT criar_plano_contas_para_organizacao('UUID-DA-ORGANIZACAO');
-- ============================================================================
