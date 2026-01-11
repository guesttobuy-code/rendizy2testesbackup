-- ============================================================
-- MIGRAÇÃO: anuncios_ultimate_old → properties
-- Data: 2026-01-11
-- Objetivo: Migrar todos os dados e eliminar a tabela antiga
-- ============================================================

-- PASSO 1: Verificar se o registro já existe em properties (para evitar duplicatas)
-- Se não existir, inserir

INSERT INTO public.properties (
  id,
  organization_id,
  user_id,
  title,
  status,
  data,
  created_at,
  updated_at
)
SELECT 
  a.id,
  a.organization_id,
  a.user_id,
  (a.data->>'title')::text as title,
  COALESCE(a.status, 'draft') as status,
  a.data,
  a.created_at,
  a.updated_at
FROM public.anuncios_ultimate_old a
WHERE NOT EXISTS (
  SELECT 1 FROM public.properties p WHERE p.id = a.id
);

-- Verificar quantos foram inseridos
-- SELECT COUNT(*) as migrados FROM properties WHERE id IN (SELECT id FROM anuncios_ultimate_old);

-- PASSO 2: Remover FKs que apontem para anuncios_ultimate_old
-- (Já removemos anuncios_field_changes_anuncio_id_fkey anteriormente)

-- PASSO 3: Verificar outras tabelas que podem ter FK para anuncios_ultimate_old
-- Executar isso para verificar:
-- SELECT 
--   tc.table_name, 
--   tc.constraint_name,
--   ccu.table_name AS foreign_table_name
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.constraint_column_usage ccu 
--   ON tc.constraint_name = ccu.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY' 
--   AND ccu.table_name = 'anuncios_ultimate_old';

-- PASSO 4: Deletar todos os registros da tabela antiga
DELETE FROM public.anuncios_ultimate_old;

-- PASSO 5: Dropar a tabela (CUIDADO - irreversível!)
DROP TABLE IF EXISTS public.anuncios_ultimate_old CASCADE;

-- Verificação final
-- SELECT COUNT(*) as total_properties FROM properties;
