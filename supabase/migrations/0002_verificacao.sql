-- ============================================================================
-- SCRIPT DE VERIFICAÇÃO - Verificar se todas as tabelas foram criadas
-- Data: 15/11/2025
-- ============================================================================
-- 
-- Execute este script após executar o 0001_setup_completo.sql
-- para verificar se tudo foi configurado corretamente.
--
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAR TABELAS
-- ============================================================================

SELECT 
  'kv_store_67caf26a' AS tabela,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kv_store_67caf26a')
    THEN '✅ Existe'
    ELSE '❌ Não existe'
  END AS status,
  COALESCE((SELECT COUNT(*) FROM kv_store_67caf26a), 0) AS total_registros
UNION ALL

SELECT 
  'organization_channel_config' AS tabela,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_channel_config')
    THEN '✅ Existe'
    ELSE '❌ Não existe'
  END AS status,
  COALESCE((SELECT COUNT(*) FROM organization_channel_config), 0) AS total_registros
UNION ALL

SELECT 
  'evolution_instances' AS tabela,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'evolution_instances')
    THEN '✅ Existe'
    ELSE '❌ Não existe'
  END AS status,
  COALESCE((SELECT COUNT(*) FROM evolution_instances), 0) AS total_registros;

-- ============================================================================
-- 2. VERIFICAR ÍNDICES
-- ============================================================================

SELECT 
  tablename AS tabela,
  indexname AS indice,
  '✅ Existe' AS status
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    tablename = 'kv_store_67caf26a' 
    OR tablename = 'organization_channel_config'
    OR tablename = 'evolution_instances'
  )
ORDER BY tablename, indexname;

-- ============================================================================
-- 3. VERIFICAR INSTÂNCIA DO SUPERADMIN
-- ============================================================================

SELECT 
  user_id,
  instance_name,
  base_url,
  CASE 
    WHEN instance_api_key IS NOT NULL AND LENGTH(instance_api_key) > 0 
      AND global_api_key IS NOT NULL AND LENGTH(global_api_key) > 0
    THEN '✅ Configurado'
    ELSE '⚠️ Parcialmente configurado'
  END AS status_credenciais,
  created_at,
  updated_at
FROM evolution_instances
WHERE user_id = 1;

-- ============================================================================
-- 4. VERIFICAR TRIGGERS
-- ============================================================================

SELECT 
  trigger_name AS trigger_nome,
  event_object_table AS tabela,
  action_timing AS timing,
  event_manipulation AS evento,
  '✅ Ativo' AS status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND (
    event_object_table = 'kv_store_67caf26a'
    OR event_object_table = 'organization_channel_config'
    OR event_object_table = 'evolution_instances'
  )
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- 5. VERIFICAR RLS (Row Level Security)
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ Habilitado'
    ELSE '❌ Desabilitado'
  END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND (
    tablename = 'organization_channel_config'
    OR tablename = 'evolution_instances'
  );

-- ============================================================================
-- RESUMO FINAL
-- ============================================================================

SELECT 
  'RESUMO' AS tipo,
  COUNT(*) FILTER (WHERE table_name IN ('kv_store_67caf26a', 'organization_channel_config', 'evolution_instances')) AS tabelas_criadas,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('kv_store_67caf26a', 'organization_channel_config', 'evolution_instances')) AS indices_criados,
  (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public' AND event_object_table IN ('kv_store_67caf26a', 'organization_channel_config', 'evolution_instances')) AS triggers_criados,
  (SELECT COUNT(*) FROM evolution_instances WHERE user_id = 1) AS instancias_superadmin
FROM information_schema.tables
WHERE table_schema = 'public';

