-- Drop foreign key constraint blocks_property_id_fkey
-- A constraint aponta para tabela 'properties' antiga, mas agora usamos 'anuncios_ultimate'
-- TODO: Criar nova constraint apontando para anuncios_ultimate se necessário

ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_property_id_fkey;
