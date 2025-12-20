-- ============================================================================
-- MIGRAÇÃO: Adiciona campo external_ids para rastreamento de IDs externos
-- Data: 20/12/2024
-- Objetivo: Permitir deduplicação correta de propriedades importadas
-- ============================================================================

-- Adicionar coluna external_ids como JSONB se não existir
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS external_ids JSONB DEFAULT '{}'::jsonb;

-- Criar índice GIN para busca eficiente em external_ids
CREATE INDEX IF NOT EXISTS idx_properties_external_ids 
ON properties USING GIN (external_ids);

-- Comentário explicativo
COMMENT ON COLUMN properties.external_ids IS 
'IDs externos de integrações (ex: {"stays_net_id": "abc123", "airbnb_id": "456"})';

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================
