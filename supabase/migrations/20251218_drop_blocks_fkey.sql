-- Drop foreign key constraint blocks_property_id_fkey
-- A constraint aponta para tabela 'properties' antiga, mas agora usamos 'properties'
-- TODO: Criar nova constraint apontando para properties se necessário

ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_property_id_fkey;
