-- ============================================================================
-- MIGRAÇÃO DE DADOS: anuncios_ultimate (V1) → anuncios_drafts (V2)
-- ============================================================================
-- Copia anúncios existentes da tabela antiga para nova estrutura V2

INSERT INTO anuncios_drafts (
  id,
  organization_id,
  user_id,
  title,
  status,
  completion_percentage,
  data,
  step_completed,
  created_at,
  updated_at
)
SELECT 
  id,
  organization_id,
  user_id,
  COALESCE(data->>'title', 'Sem título') as title,
  'draft' as status,
  CASE 
    WHEN data ? 'title' AND data ? 'tipoLocal' THEN 20
    WHEN data ? 'title' THEN 10
    ELSE 0
  END as completion_percentage,
  data,
  1 as step_completed,
  created_at,
  updated_at
FROM anuncios_ultimate
WHERE NOT EXISTS (
  SELECT 1 FROM anuncios_drafts WHERE anuncios_drafts.id = anuncios_ultimate.id
);

-- Log de quantos foram migrados
DO $$
DECLARE
  v_count integer;
BEGIN
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Migrados % anúncios de anuncios_ultimate → anuncios_drafts', v_count;
END $$;
