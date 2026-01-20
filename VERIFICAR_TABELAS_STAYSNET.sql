-- ============================================================================
-- VERIFICAÇÃO: Tabelas Stays.net
-- Execute este script para verificar se todas as tabelas foram criadas
-- ============================================================================

-- Verificar quais tabelas foram criadas
SELECT 
  table_name AS "Tabela",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = table_name
    )
    THEN '✅ Criada'
    ELSE '❌ Não encontrada'
  END AS "Status"
FROM (
  VALUES 
    ('staysnet_config'),
    ('staysnet_webhooks'),
    ('staysnet_sync_log'),
    ('staysnet_reservations_cache'),
    ('staysnet_properties_cache')
) AS expected_tables(table_name);

-- Verificar estrutura da tabela staysnet_config
SELECT 
  column_name AS "Campo",
  data_type AS "Tipo",
  is_nullable AS "Nullable",
  column_default AS "Padrão"
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'staysnet_config'
ORDER BY ordinal_position;

-- Contar registros em cada tabela
SELECT 
  'staysnet_config' AS tabela,
  COUNT(*) AS total_registros
FROM staysnet_config
UNION ALL
SELECT 
  'staysnet_webhooks' AS tabela,
  COUNT(*) AS total_registros
FROM staysnet_webhooks
UNION ALL
SELECT 
  'staysnet_sync_log' AS tabela,
  COUNT(*) AS total_registros
FROM staysnet_sync_log
UNION ALL
SELECT 
  'staysnet_reservations_cache' AS tabela,
  COUNT(*) AS total_registros
FROM staysnet_reservations_cache
UNION ALL
SELECT 
  'staysnet_properties_cache' AS tabela,
  COUNT(*) AS total_registros
FROM staysnet_properties_cache;

