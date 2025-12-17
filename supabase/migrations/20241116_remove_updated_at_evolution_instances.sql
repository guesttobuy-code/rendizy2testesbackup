-- ============================================================================
-- MIGRAÇÃO: Remover campo updated_at das tabelas evolution_instances e organization_channel_config
-- Data: 16/11/2025
-- Problema: Campo updated_at causa erro "record "new" has no field "updated_at""
-- ============================================================================
-- 
-- Esta migração remove o campo updated_at das tabelas:
-- - evolution_instances
-- - organization_channel_config
-- 
-- E remove qualquer trigger relacionado que possa estar causando o erro.
--
-- ORDEM DE EXECUÇÃO:
-- 1. Execute este script no SQL Editor do Supabase Dashboard
-- 2. Verifique se não há erros
-- 3. Faça deploy do backend atualizado
--
-- ============================================================================

-- ============================================================================
-- PARTE 1: evolution_instances
-- ============================================================================

-- Remover trigger que atualiza updated_at automaticamente (se existir)
DROP TRIGGER IF EXISTS trigger_update_evolution_instances_updated_at ON evolution_instances;
DROP TRIGGER IF EXISTS update_evolution_instances_updated_at ON evolution_instances;

-- Remover função do trigger (se existir)
DROP FUNCTION IF EXISTS update_evolution_instances_updated_at();

-- Remover a coluna updated_at se ela existir
ALTER TABLE IF EXISTS evolution_instances 
DROP COLUMN IF EXISTS updated_at;

-- ============================================================================
-- PARTE 2: organization_channel_config
-- ============================================================================

-- Remover trigger que atualiza updated_at automaticamente (se existir)
DROP TRIGGER IF EXISTS trigger_update_channel_config_updated_at ON organization_channel_config;
DROP TRIGGER IF EXISTS update_channel_config_updated_at ON organization_channel_config;

-- Remover função do trigger (se existir)
DROP FUNCTION IF EXISTS update_channel_config_updated_at();

-- Remover a coluna updated_at se ela existir
ALTER TABLE IF EXISTS organization_channel_config 
DROP COLUMN IF EXISTS updated_at;

-- ============================================================================
-- VERIFICAÇÃO (opcional - execute para confirmar)
-- ============================================================================

-- Descomente as linhas abaixo para verificar a estrutura das tabelas:

-- Verificar evolution_instances:
-- SELECT 
--   column_name, 
--   data_type, 
--   is_nullable,
--   column_default
-- FROM information_schema.columns
-- WHERE table_name = 'evolution_instances'
-- ORDER BY ordinal_position;

-- Verificar organization_channel_config:
-- SELECT 
--   column_name, 
--   data_type, 
--   is_nullable,
--   column_default
-- FROM information_schema.columns
-- WHERE table_name = 'organization_channel_config'
-- ORDER BY ordinal_position;

-- Verificar se não há mais triggers relacionados a updated_at:
-- SELECT 
--   trigger_name,
--   event_object_table,
--   action_statement
-- FROM information_schema.triggers
-- WHERE trigger_schema = 'public'
--   AND (event_object_table = 'evolution_instances' OR event_object_table = 'organization_channel_config')
--   AND action_statement LIKE '%updated_at%';

-- ============================================================================
-- ESTRUTURA ESPERADA APÓS MIGRAÇÃO
-- ============================================================================

-- evolution_instances deve ter apenas:
-- - id uuid PRIMARY KEY
-- - user_id integer NOT NULL
-- - instance_name text NOT NULL
-- - instance_api_key text
-- - global_api_key text
-- - base_url text
-- - created_at timestamptz NOT NULL DEFAULT now()

-- organization_channel_config deve ter apenas:
-- - id uuid PRIMARY KEY
-- - organization_id text NOT NULL UNIQUE
-- - whatsapp_* (vários campos)
-- - sms_* (vários campos)
-- - automation_* (vários campos)
-- - created_at timestamptz NOT NULL DEFAULT now()
-- - (SEM updated_at)

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================

