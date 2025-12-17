-- ============================================================================
-- MIGRAÇÃO: Converter organization_id de TEXT para UUID
-- Tabela: organization_channel_config
-- Data: 2025-11-17
-- Versão: 1.0.103.400
-- ============================================================================
-- 
-- PROBLEMA:
-- organization_channel_config.organization_id é TEXT, mas deveria ser UUID
-- para consistência com outras tabelas e permitir foreign keys.
--
-- SOLUÇÃO:
-- 1. Validar dados existentes (remover inválidos)
-- 2. Converter TEXT → UUID
-- 3. Adicionar foreign key para organizations (se existir)
-- 4. Recriar índices
-- ============================================================================

-- Passo 1: Validar e limpar dados existentes inválidos
-- Remove registros com organization_id que não são UUIDs válidos
DELETE FROM organization_channel_config
WHERE organization_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Passo 2: Remover constraint UNIQUE temporariamente (será recriado depois)
ALTER TABLE organization_channel_config
DROP CONSTRAINT IF EXISTS organization_channel_config_organization_id_key;

-- Passo 3: Remover índice existente (será recriado depois)
DROP INDEX IF EXISTS idx_channel_config_org;

-- Passo 4: Converter coluna de TEXT para UUID
-- Primeiro, criar uma nova coluna temporária
ALTER TABLE organization_channel_config
ADD COLUMN organization_id_new UUID;

-- Copiar dados válidos para a nova coluna
UPDATE organization_channel_config
SET organization_id_new = organization_id::UUID
WHERE organization_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Remover a coluna antiga
ALTER TABLE organization_channel_config
DROP COLUMN organization_id;

-- Renomear a nova coluna
ALTER TABLE organization_channel_config
RENAME COLUMN organization_id_new TO organization_id;

-- Passo 5: Tornar a coluna NOT NULL (após conversão)
ALTER TABLE organization_channel_config
ALTER COLUMN organization_id SET NOT NULL;

-- Passo 6: Recriar constraint UNIQUE
ALTER TABLE organization_channel_config
ADD CONSTRAINT organization_channel_config_organization_id_key UNIQUE (organization_id);

-- Passo 7: Recriar índice
CREATE INDEX IF NOT EXISTS idx_channel_config_org 
ON organization_channel_config(organization_id);

-- Passo 8: Adicionar foreign key para organizations (se a tabela existir)
-- Verificar se a tabela organizations existe antes de criar FK
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
  ) THEN
    -- Adicionar foreign key
    ALTER TABLE organization_channel_config
    ADD CONSTRAINT fk_channel_config_organization
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;
    
    RAISE NOTICE 'Foreign key adicionada: organization_channel_config.organization_id → organizations.id';
  ELSE
    RAISE NOTICE 'Tabela organizations não encontrada. Foreign key não criada.';
  END IF;
END $$;

-- Passo 9: Comentários para documentação
COMMENT ON COLUMN organization_channel_config.organization_id IS 
'UUID da organização (FK para organizations.id). Convertido de TEXT para UUID em 2025-11-17.';

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Verificar se a conversão foi bem-sucedida
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  -- Contar registros com organization_id inválido (não deveria haver nenhum)
  SELECT COUNT(*) INTO invalid_count
  FROM organization_channel_config
  WHERE organization_id IS NULL;
  
  IF invalid_count > 0 THEN
    RAISE WARNING 'Atenção: % registros com organization_id NULL encontrados', invalid_count;
  ELSE
    RAISE NOTICE '✅ Conversão concluída com sucesso. Todos os organization_id são UUIDs válidos.';
  END IF;
END $$;

