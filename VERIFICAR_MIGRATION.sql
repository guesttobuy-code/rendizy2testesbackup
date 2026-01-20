-- ============================================================================
-- VERIFICAÇÃO: Migration RLS + Índices + Soft Deletes
-- ============================================================================
-- Execute este SQL para verificar se tudo foi aplicado corretamente

-- 1. Verificar se coluna deleted_at existe
SELECT 
  '1. Coluna deleted_at' as verificacao,
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'organization_channel_config' 
  AND column_name = 'deleted_at';

-- 2. Verificar se RLS está habilitado
SELECT 
  '2. RLS habilitado' as verificacao,
  tablename, 
  rowsecurity,
  CASE WHEN rowsecurity THEN '✅ SIM' ELSE '❌ NÃO' END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'organization_channel_config';

-- 3. Verificar policies criadas
SELECT 
  '3. Policies criadas' as verificacao,
  policyname,
  cmd,
  CASE WHEN policyname IS NOT NULL THEN '✅ CRIADA' ELSE '❌ NÃO CRIADA' END as status
FROM pg_policies 
WHERE tablename = 'organization_channel_config'
ORDER BY policyname;

-- 4. Verificar índices compostos
SELECT 
  '4. Índices compostos' as verificacao,
  indexname,
  CASE WHEN indexname LIKE 'idx_channel_config%' THEN '✅ CRIADO' ELSE '❌ NÃO CRIADO' END as status
FROM pg_indexes 
WHERE tablename = 'organization_channel_config' 
  AND indexname LIKE 'idx_channel_config%'
ORDER BY indexname;

-- 5. Resumo final
SELECT 
  '5. RESUMO FINAL' as verificacao,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'organization_channel_config' AND column_name = 'deleted_at') as coluna_deleted_at,
  (SELECT CASE WHEN rowsecurity THEN 1 ELSE 0 END FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organization_channel_config') as rls_habilitado,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'organization_channel_config') as total_policies,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'organization_channel_config' AND indexname LIKE 'idx_channel_config%') as total_indices;

