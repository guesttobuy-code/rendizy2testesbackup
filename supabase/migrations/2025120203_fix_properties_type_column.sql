-- Migration: Corrigir campo type da tabela properties
-- Data: 02/12/2025
-- Descrição: Altera o campo type de VARCHAR(20) para TEXT para aceitar valores maiores
--            (ex: "location_casa_1762487491813" tem 30 caracteres)

-- Verificar se a coluna existe e qual é o tipo atual
DO $$
BEGIN
  -- Alterar o tipo da coluna type de VARCHAR(20) para TEXT
  -- Isso permite valores de qualquer tamanho
  ALTER TABLE properties 
    ALTER COLUMN type TYPE TEXT;
  
  RAISE NOTICE '✅ Campo type alterado para TEXT com sucesso';
EXCEPTION
  WHEN OTHERS THEN
    -- Se a coluna já for TEXT ou não existir, apenas logar
    RAISE NOTICE 'ℹ️ Campo type: %', SQLERRM;
END $$;

-- Comentário para documentação
COMMENT ON COLUMN properties.type IS 'Tipo da propriedade (ex: apartment, house, location_casa_xxx, etc.) - TEXT para aceitar valores dinâmicos do wizard';



