-- ============================================================================
-- MIGRATION: Renomear anuncios_ultimate → properties
-- Data: 2026-01-07
-- Objetivo: Tornar o nome da tabela intuitivo para desenvolvedores e IAs
-- ============================================================================
-- IMPORTANTE: Executar em horário de baixo tráfego
-- BACKUP: Certificar-se de ter backup antes de executar
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. RENOMEAR TABELA PRINCIPAL
-- ============================================================================
-- Nota: FKs de outras tabelas (reservations, blocks) seguem automaticamente
ALTER TABLE IF EXISTS public.anuncios_ultimate RENAME TO properties;

COMMENT ON TABLE public.properties IS 
  'Tabela principal de imóveis/propriedades do sistema Rendizy. 
   Renomeada de anuncios_ultimate em 2026-01-07 para maior clareza.
   Contém coluna JSONB "data" com todos os atributos do imóvel.';

-- ============================================================================
-- 2. RENOMEAR INDEXES
-- ============================================================================
ALTER INDEX IF EXISTS idx_anuncios_ultimate_id 
  RENAME TO idx_properties_id;

ALTER INDEX IF EXISTS idx_anuncios_ultimate_organization_id 
  RENAME TO idx_properties_organization_id;

ALTER INDEX IF EXISTS anuncios_ultimate_stays_property_uidx 
  RENAME TO properties_stays_property_uidx;

ALTER INDEX IF EXISTS anuncios_ultimate_stays_property_idx 
  RENAME TO properties_stays_property_idx;

-- Indexes genéricos que podem existir
ALTER INDEX IF EXISTS idx_anuncios_user 
  RENAME TO idx_properties_user;

ALTER INDEX IF EXISTS idx_anuncios_org 
  RENAME TO idx_properties_org;

ALTER INDEX IF EXISTS idx_anuncios_title 
  RENAME TO idx_properties_title;

ALTER INDEX IF EXISTS idx_anuncios_data 
  RENAME TO idx_properties_data;

-- ============================================================================
-- 3. RENOMEAR TRIGGER E FUNÇÃO
-- ============================================================================
-- 3.1 Dropar trigger antigo (se existir)
DROP TRIGGER IF EXISTS trg_prevent_anuncios_ultimate_staysnet_placeholder ON public.properties;

-- 3.2 Renomear a função do trigger (se existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proname = 'prevent_anuncios_ultimate_staysnet_placeholder'
  ) THEN
    ALTER FUNCTION public.prevent_anuncios_ultimate_staysnet_placeholder() 
      RENAME TO prevent_properties_staysnet_placeholder;
  END IF;
END $$;

-- 3.3 Recriar trigger com novo nome (se função existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proname = 'prevent_properties_staysnet_placeholder'
  ) THEN
    EXECUTE 'CREATE TRIGGER trg_prevent_properties_staysnet_placeholder
      BEFORE INSERT OR UPDATE ON public.properties
      FOR EACH ROW
      EXECUTE FUNCTION public.prevent_properties_staysnet_placeholder()';
  END IF;
END $$;

-- ============================================================================
-- 4. ATUALIZAR TABELA anuncios_field_changes (se existir)
-- ============================================================================
-- A FK anuncio_id já aponta para a tabela renomeada automaticamente
-- Apenas adicionar comentário para clareza
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'anuncios_field_changes'
  ) THEN
    COMMENT ON TABLE public.anuncios_field_changes IS 
      'Histórico de mudanças de campos em properties (antes anuncios_ultimate). 
       FK anuncio_id referencia properties(id).';
  END IF;
END $$;

-- ============================================================================
-- 5. ATUALIZAR RPC save_anuncio_field
-- ============================================================================
-- Dropar versões existentes para evitar conflito de assinaturas
DROP FUNCTION IF EXISTS public.save_anuncio_field(uuid, uuid, uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.save_anuncio_field(uuid, uuid, text, jsonb);

-- Recriar a função com referências atualizadas para 'properties'
CREATE OR REPLACE FUNCTION public.save_anuncio_field(
  p_anuncio_id uuid,
  p_organization_id uuid,
  p_user_id uuid,
  p_field text,
  p_value jsonb
)
RETURNS TABLE(id uuid, data jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_id uuid;
  v_existing_annuncio uuid;
BEGIN
  -- Se p_anuncio_id foi fornecido, verificar se existe
  IF p_anuncio_id IS NOT NULL THEN
    SELECT properties.id INTO v_existing_annuncio 
    FROM public.properties 
    WHERE properties.id = p_anuncio_id;
    
    IF v_existing_annuncio IS NOT NULL THEN
      -- Atualizar campo existente (merge com data existente)
      UPDATE public.properties
      SET data = COALESCE(properties.data, '{}'::jsonb) || jsonb_build_object(p_field, p_value),
          updated_at = now()
      WHERE properties.id = v_existing_annuncio;
      
      RETURN QUERY SELECT properties.id, properties.data 
      FROM public.properties 
      WHERE properties.id = v_existing_annuncio;
      RETURN;
    END IF;
  END IF;
  
  -- Criar novo registro
  v_id := COALESCE(p_anuncio_id, gen_random_uuid());
  
  -- Tentar inserir; se já existe, fazer update
  INSERT INTO public.properties (id, organization_id, user_id, data)
  VALUES (v_id, p_organization_id, p_user_id, jsonb_build_object(p_field, p_value))
  ON CONFLICT (id) DO UPDATE
  SET data = COALESCE(public.properties.data, '{}'::jsonb) || jsonb_build_object(p_field, p_value),
      updated_at = now();
  
  RETURN QUERY SELECT properties.id, properties.data 
  FROM public.properties 
  WHERE properties.id = v_id;
END;
$func$;

COMMENT ON FUNCTION public.save_anuncio_field(uuid, uuid, uuid, text, jsonb) IS 
  'RPC atômica para salvar campo por campo em properties. 
   Mantém nome save_anuncio_field por compatibilidade com código existente.';

-- ============================================================================
-- 6. VERIFICAÇÃO FINAL
-- ============================================================================
DO $$
DECLARE
  v_count integer;
BEGIN
  -- Verificar se a tabela foi renomeada
  SELECT COUNT(*) INTO v_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'properties';
  
  IF v_count = 0 THEN
    RAISE EXCEPTION 'ERRO: Tabela properties não encontrada após rename';
  END IF;
  
  -- Verificar se anuncios_ultimate não existe mais
  SELECT COUNT(*) INTO v_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'anuncios_ultimate';
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'ERRO: Tabela anuncios_ultimate ainda existe';
  END IF;
  
  RAISE NOTICE '✅ Migration concluída: anuncios_ultimate → properties';
END $$;

COMMIT;
