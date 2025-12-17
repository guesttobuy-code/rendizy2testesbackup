-- ============================================================================
-- LIMPEZA DE ORGANIZAÇÕES - Manter apenas Rendizy (Master)
-- ============================================================================
-- Este script remove TODAS as organizações e seus dados, EXCETO a organização
-- Rendizy (master) com ID: 00000000-0000-0000-0000-000000000000
-- 
-- ⚠️ ATENÇÃO: Esta operação é IRREVERSÍVEL!
-- Execute apenas se tiver certeza de que deseja limpar o banco.
-- ============================================================================

-- ============================================================================
-- PASSO 1: Verificar organizações existentes
-- ============================================================================
DO $$
DECLARE
  rendizy_org_id UUID := '00000000-0000-0000-0000-000000000000';
  total_orgs INT;
  orgs_to_delete TEXT;
BEGIN
  -- Contar organizações
  SELECT COUNT(*) INTO total_orgs
  FROM organizations
  WHERE id != rendizy_org_id;
  
  -- Listar organizações que serão deletadas
  SELECT string_agg(name || ' (' || id::text || ')', ', ')
  INTO orgs_to_delete
  FROM organizations
  WHERE id != rendizy_org_id;
  
  RAISE NOTICE '📊 Organizações encontradas:';
  RAISE NOTICE '   - Rendizy (master): %', rendizy_org_id;
  RAISE NOTICE '   - Outras organizações: %', total_orgs;
  IF orgs_to_delete IS NOT NULL THEN
    RAISE NOTICE '   - Serão deletadas: %', orgs_to_delete;
  END IF;
END $$;

-- ============================================================================
-- PASSO 2: Deletar dados financeiros de outras organizações
-- ============================================================================
DO $$
DECLARE
  rendizy_org_id UUID := '00000000-0000-0000-0000-000000000000';
  deleted_count INT;
BEGIN
  RAISE NOTICE '🗑️ Deletando dados financeiros de outras organizações...';
  
  -- Deletar mapeamentos de campos (se a tabela existir)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financeiro_campo_plano_contas_mapping') THEN
    EXECUTE format('DELETE FROM financeiro_campo_plano_contas_mapping WHERE organization_id != %L', rendizy_org_id);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '   ✅ financeiro_campo_plano_contas_mapping: % registros deletados', deleted_count;
  ELSE
    RAISE NOTICE '   ⚠️ financeiro_campo_plano_contas_mapping: tabela não existe, pulando...';
  END IF;
  
  -- Deletar splits de lançamentos (se a tabela existir)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financeiro_lancamentos_splits') THEN
    EXECUTE format('DELETE FROM financeiro_lancamentos_splits WHERE lancamento_id IN (SELECT id FROM financeiro_lancamentos WHERE organization_id != %L)', rendizy_org_id);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '   ✅ financeiro_lancamentos_splits: % registros deletados', deleted_count;
  ELSE
    RAISE NOTICE '   ⚠️ financeiro_lancamentos_splits: tabela não existe, pulando...';
  END IF;
  
  -- Deletar lançamentos
  DELETE FROM financeiro_lancamentos
  WHERE organization_id != rendizy_org_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '   ✅ financeiro_lancamentos: % registros deletados', deleted_count;
  
  -- Deletar títulos
  DELETE FROM financeiro_titulos
  WHERE organization_id != rendizy_org_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '   ✅ financeiro_titulos: % registros deletados', deleted_count;
  
  -- Deletar contas bancárias
  DELETE FROM financeiro_contas_bancarias
  WHERE organization_id != rendizy_org_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '   ✅ financeiro_contas_bancarias: % registros deletados', deleted_count;
  
  -- Deletar centros de custo
  DELETE FROM financeiro_centro_custos
  WHERE organization_id != rendizy_org_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '   ✅ financeiro_centro_custos: % registros deletados', deleted_count;
  
  -- Deletar categorias (plano de contas)
  DELETE FROM financeiro_categorias
  WHERE organization_id != rendizy_org_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '   ✅ financeiro_categorias: % registros deletados', deleted_count;
END $$;

-- ============================================================================
-- PASSO 3: Deletar dados de reservas de outras organizações
-- ============================================================================
DO $$
DECLARE
  rendizy_org_id UUID := '00000000-0000-0000-0000-000000000000';
  deleted_count INT;
BEGIN
  RAISE NOTICE '🗑️ Deletando reservas de outras organizações...';
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reservations') THEN
    EXECUTE format('DELETE FROM reservations WHERE organization_id != %L OR organization_id IS NULL', rendizy_org_id);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '   ✅ reservations: % registros deletados', deleted_count;
  ELSE
    RAISE NOTICE '   ⚠️ reservations: tabela não existe, pulando...';
  END IF;
END $$;

-- ============================================================================
-- PASSO 4: Deletar dados de propriedades de outras organizações
-- ============================================================================
DO $$
DECLARE
  rendizy_org_id UUID := '00000000-0000-0000-0000-000000000000';
  deleted_count INT;
BEGIN
  RAISE NOTICE '🗑️ Deletando propriedades de outras organizações...';
  
  -- Deletar listings primeiro (dependem de properties) - se a tabela existir
  -- Listings tem organization_id diretamente, então deletamos por ele
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'listings') THEN
    -- Verificar se tem organization_id (preferencial - mais direto)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'organization_id') THEN
      EXECUTE format('DELETE FROM listings WHERE organization_id != %L OR organization_id IS NULL', rendizy_org_id);
      GET DIAGNOSTICS deleted_count = ROW_COUNT;
      RAISE NOTICE '   ✅ listings (por organization_id): % registros deletados', deleted_count;
    -- Fallback: tentar deletar por property_id (se listings não tiver organization_id)
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'property_id') THEN
      EXECUTE format('DELETE FROM listings WHERE property_id IN (SELECT id FROM properties WHERE organization_id != %L OR organization_id IS NULL)', rendizy_org_id);
      GET DIAGNOSTICS deleted_count = ROW_COUNT;
      RAISE NOTICE '   ✅ listings (por property_id): % registros deletados', deleted_count;
    ELSE
      RAISE NOTICE '   ⚠️ listings: não foi possível determinar a coluna de relacionamento, pulando...';
    END IF;
  ELSE
    RAISE NOTICE '   ⚠️ listings: tabela não existe, pulando...';
  END IF;
  
  -- Deletar properties (se a tabela existir)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'properties') THEN
    EXECUTE format('DELETE FROM properties WHERE organization_id != %L OR organization_id IS NULL', rendizy_org_id);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '   ✅ properties: % registros deletados', deleted_count;
  ELSE
    RAISE NOTICE '   ⚠️ properties: tabela não existe, pulando...';
  END IF;
END $$;

-- ============================================================================
-- PASSO 5: Deletar dados de hóspedes de outras organizações
-- ============================================================================
DO $$
DECLARE
  rendizy_org_id UUID := '00000000-0000-0000-0000-000000000000';
  deleted_count INT;
BEGIN
  RAISE NOTICE '🗑️ Deletando hóspedes de outras organizações...';
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'guests') THEN
    EXECUTE format('DELETE FROM guests WHERE organization_id != %L OR organization_id IS NULL', rendizy_org_id);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '   ✅ guests: % registros deletados', deleted_count;
  ELSE
    RAISE NOTICE '   ⚠️ guests: tabela não existe, pulando...';
  END IF;
END $$;

-- ============================================================================
-- PASSO 6: Atualizar usuários de outras organizações
-- ============================================================================
DO $$
DECLARE
  rendizy_org_id UUID := '00000000-0000-0000-0000-000000000000';
  updated_count INT;
BEGIN
  RAISE NOTICE '🔄 Atualizando usuários de outras organizações...';
  
  -- Atualizar usuários não-superadmin para usar organização Rendizy (ou NULL)
  UPDATE users
  SET organization_id = rendizy_org_id
  WHERE organization_id IS NOT NULL 
    AND organization_id != rendizy_org_id
    AND type != 'superadmin';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '   ✅ users atualizados: % registros', updated_count;
  
  -- Garantir que superadmins usem organização Rendizy
  UPDATE users
  SET organization_id = rendizy_org_id
  WHERE type = 'superadmin' 
    AND (organization_id IS NULL OR organization_id != rendizy_org_id);
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '   ✅ superadmins atualizados: % registros', updated_count;
END $$;

-- ============================================================================
-- PASSO 7: Deletar organizações (exceto Rendizy master)
-- ============================================================================
DO $$
DECLARE
  rendizy_org_id UUID := '00000000-0000-0000-0000-000000000000';
  deleted_count INT;
BEGIN
  RAISE NOTICE '🗑️ Deletando organizações (exceto Rendizy master)...';
  
  DELETE FROM organizations
  WHERE id != rendizy_org_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '   ✅ organizations deletadas: % registros', deleted_count;
END $$;

-- ============================================================================
-- PASSO 8: Verificação final
-- ============================================================================
DO $$
DECLARE
  rendizy_org_id UUID := '00000000-0000-0000-0000-000000000000';
  total_orgs INT;
  total_categorias INT;
  total_reservas INT;
  total_properties INT;
  total_guests INT;
BEGIN
  RAISE NOTICE '✅ Verificação final...';
  
  -- Contar organizações restantes
  SELECT COUNT(*) INTO total_orgs FROM organizations;
  RAISE NOTICE '   📊 Organizações restantes: % (deve ser 1)', total_orgs;
  
  -- Contar dados da organização Rendizy
  SELECT COUNT(*) INTO total_categorias
  FROM financeiro_categorias
  WHERE organization_id = rendizy_org_id;
  RAISE NOTICE '   📊 Categorias Rendizy: %', total_categorias;
  
  SELECT COUNT(*) INTO total_reservas
  FROM reservations
  WHERE organization_id = rendizy_org_id;
  RAISE NOTICE '   📊 Reservas Rendizy: %', total_reservas;
  
  SELECT COUNT(*) INTO total_properties
  FROM properties
  WHERE organization_id = rendizy_org_id;
  RAISE NOTICE '   📊 Propriedades Rendizy: %', total_properties;
  
  SELECT COUNT(*) INTO total_guests
  FROM guests
  WHERE organization_id = rendizy_org_id;
  RAISE NOTICE '   📊 Hóspedes Rendizy: %', total_guests;
  
  -- Verificar se há dados órfãos
  IF EXISTS (
    SELECT 1 FROM financeiro_categorias 
    WHERE organization_id IS NULL OR organization_id NOT IN (SELECT id FROM organizations)
  ) THEN
    RAISE WARNING '⚠️ ATENÇÃO: Existem categorias órfãs (sem organization_id válido)!';
  END IF;
  
  RAISE NOTICE '✅ Limpeza concluída!';
END $$;

-- ============================================================================
-- RESUMO FINAL
-- ============================================================================
SELECT 
  '✅ LIMPEZA CONCLUÍDA' as status,
  (SELECT COUNT(*) FROM organizations) as organizacoes_restantes,
  (SELECT COUNT(*) FROM financeiro_categorias WHERE organization_id = '00000000-0000-0000-0000-000000000000') as categorias_rendizy,
  (SELECT COUNT(*) FROM reservations WHERE organization_id = '00000000-0000-0000-0000-000000000000') as reservas_rendizy,
  (SELECT COUNT(*) FROM properties WHERE organization_id = '00000000-0000-0000-0000-000000000000') as propriedades_rendizy,
  (SELECT COUNT(*) FROM guests WHERE organization_id = '00000000-0000-0000-0000-000000000000') as hospedes_rendizy;

