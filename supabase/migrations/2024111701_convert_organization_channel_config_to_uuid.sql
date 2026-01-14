-- ============================================================================
-- MIGRAÇÃO: Converter organization_id de TEXT para UUID
-- Tabela: organization_channel_config
-- Data: 2025-11-17
-- Versão: 1.0.103.401 (idempotente)
-- ============================================================================
-- 
-- PROBLEMA:
-- organization_channel_config.organization_id é TEXT, mas deveria ser UUID
-- para consistência com outras tabelas e permitir foreign keys.
--
-- SOLUÇÃO: Toda a migração é encapsulada em um bloco DO idempotente.
-- Se a coluna já é UUID, nada é feito.
-- ============================================================================

DO $$
DECLARE
    col_type TEXT;
BEGIN
    -- Verificar tipo atual da coluna organization_id
    SELECT data_type INTO col_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'organization_channel_config' 
    AND column_name = 'organization_id';
    
    -- Se já é UUID, pular toda a migração
    IF col_type = 'uuid' OR col_type IS NULL THEN
        RAISE NOTICE 'organization_id já é UUID ou tabela não existe, pulando migração';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Convertendo organization_id de % para UUID...', col_type;
    
    -- Passo 1: Limpar dados inválidos (não-UUID)
    DELETE FROM organization_channel_config
    WHERE organization_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    
    -- Passo 2: Remover constraint UNIQUE
    ALTER TABLE organization_channel_config
    DROP CONSTRAINT IF EXISTS organization_channel_config_organization_id_key;
    
    -- Passo 3: Remover índice existente
    DROP INDEX IF EXISTS idx_channel_config_org;
    
    -- Passo 4: Criar coluna temporária UUID
    ALTER TABLE organization_channel_config
    ADD COLUMN IF NOT EXISTS organization_id_new UUID;
    
    -- Passo 5: Copiar dados válidos
    UPDATE organization_channel_config
    SET organization_id_new = organization_id::UUID
    WHERE organization_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    
    -- Passo 6: Remover coluna antiga
    ALTER TABLE organization_channel_config
    DROP COLUMN organization_id;
    
    -- Passo 7: Renomear nova coluna
    ALTER TABLE organization_channel_config
    RENAME COLUMN organization_id_new TO organization_id;
    
    -- Passo 8: Tornar NOT NULL
    ALTER TABLE organization_channel_config
    ALTER COLUMN organization_id SET NOT NULL;
    
    -- Passo 9: Recriar constraint UNIQUE
    ALTER TABLE organization_channel_config
    ADD CONSTRAINT organization_channel_config_organization_id_key UNIQUE (organization_id);
    
    -- Passo 10: Recriar índice
    CREATE INDEX IF NOT EXISTS idx_channel_config_org 
    ON organization_channel_config(organization_id);
    
    -- Passo 11: Adicionar FK se tabela organizations existir
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'organizations'
    ) THEN
        BEGIN
            ALTER TABLE organization_channel_config
            ADD CONSTRAINT fk_channel_config_organization
            FOREIGN KEY (organization_id)
            REFERENCES organizations(id)
            ON DELETE CASCADE ON UPDATE CASCADE;
            RAISE NOTICE 'FK adicionada: organization_channel_config → organizations';
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE 'FK já existe, pulando';
        END;
    END IF;
    
    RAISE NOTICE 'Migração concluída com sucesso!';
END $$;

-- Comentários para documentação
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

