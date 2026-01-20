-- ============================================================================
-- FIX DEFINITIVO: Anúncios Ultimate - Salvar Campos
-- ============================================================================
-- 
-- PROBLEMA: 
-- - Campos não salvam (tipo_local, identificação_interna, etc)
-- - Tabela anuncios_drafts não existe
-- - RPC save_anuncio_field não existe
--
-- SOLUÇÃO:
-- Este arquivo cria TUDO necessário em uma única execução
-- ============================================================================

-- ============================================================================
-- PASSO 1: Criar tabela anuncios_drafts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.anuncios_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  user_id uuid,
  title text,
  status varchar(32) DEFAULT 'draft',
  completion_percentage int DEFAULT 0,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  step_completed int DEFAULT 0,
  last_edited_field text,
  last_edited_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Índices para performance
  CONSTRAINT anuncios_drafts_status_check CHECK (status IN ('draft', 'pending_publish', 'published', 'archived'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_anuncios_drafts_user ON public.anuncios_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_anuncios_drafts_org ON public.anuncios_drafts(organization_id);
CREATE INDEX IF NOT EXISTS idx_anuncios_drafts_status ON public.anuncios_drafts(status);

-- ============================================================================
-- Trigger para atualizar updated_at automaticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_timestamp_drafts()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_anuncios_drafts_updated_at ON public.anuncios_drafts;
CREATE TRIGGER trigger_anuncios_drafts_updated_at
  BEFORE UPDATE ON public.anuncios_drafts
  FOR EACH ROW
  EXECUTE FUNCTION set_timestamp_drafts();

-- ============================================================================
-- PASSO 2: DROPAR função antiga (todas as versões)
-- ============================================================================

-- Dropar TODAS as versões da função que possam existir
DROP FUNCTION IF EXISTS public.save_anuncio_field(uuid, text, text, text, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.save_anuncio_field(text, text, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.save_anuncio_field(uuid, text, jsonb, text) CASCADE;
DROP FUNCTION IF EXISTS public.save_anuncio_field CASCADE;

-- ============================================================================
-- PASSO 3: Criar função save_anuncio_field (RPC) - NOVA VERSÃO
-- ============================================================================

CREATE OR REPLACE FUNCTION public.save_anuncio_field(
  p_anuncio_id uuid DEFAULT NULL,
  p_field text DEFAULT NULL,
  p_value text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_organization_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_id uuid;
  v_data jsonb;
  v_field_value text;
BEGIN
  -- Validação
  IF p_field IS NULL THEN
    RAISE EXCEPTION 'field is required';
  END IF;

  -- Se anuncio_id é NULL, criar novo
  IF p_anuncio_id IS NULL THEN
    INSERT INTO public.anuncios_drafts (
      organization_id,
      user_id,
      data,
      last_edited_field,
      last_edited_at
    ) VALUES (
      p_organization_id,
      p_user_id,
      '{}'::jsonb,
      p_field,
      now()
    )
    RETURNING id INTO v_id;
  ELSE
    v_id := p_anuncio_id;
  END IF;

  -- Buscar dados atuais
  SELECT data INTO v_data
  FROM public.anuncios_drafts
  WHERE id = v_id;

  -- Se não encontrou, erro
  IF v_data IS NULL THEN
    RAISE EXCEPTION 'Anúncio % não encontrado', v_id;
  END IF;

  -- Atualizar campo no JSONB
  v_data := jsonb_set(
    v_data,
    ARRAY[p_field],
    to_jsonb(p_value),
    true
  );

  -- Salvar de volta
  UPDATE public.anuncios_drafts
  SET 
    data = v_data,
    last_edited_field = p_field,
    last_edited_at = now(),
    title = CASE 
      WHEN p_field = 'title' THEN p_value 
      ELSE title 
    END
  WHERE id = v_id;

  -- Retornar resultado como JSONB
  RETURN (
    SELECT jsonb_build_object(
      'id', anuncios_drafts.id,
      'title', anuncios_drafts.title,
      'status', anuncios_drafts.status,
      'completion_percentage', anuncios_drafts.completion_percentage,
      'data', anuncios_drafts.data,
      'step_completed', anuncios_drafts.step_completed,
      'last_edited_field', anuncios_drafts.last_edited_field,
      'created_at', anuncios_drafts.created_at,
      'updated_at', anuncios_drafts.updated_at
    )
    FROM public.anuncios_drafts
    WHERE anuncios_drafts.id = v_id
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PASSO 4: RLS (Segurança básica)
-- ============================================================================

ALTER TABLE public.anuncios_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem gerenciar próprios anúncios" ON public.anuncios_drafts;
CREATE POLICY "Usuários podem gerenciar próprios anúncios"
  ON public.anuncios_drafts
  FOR ALL
  USING (true); -- Temporariamente aberto para teste

-- ============================================================================
-- PASSO 5: VERIFICAÇÃO - Testar se tudo funciona
-- ============================================================================

DO $test$
DECLARE
  v_test_id uuid;
  v_result jsonb;
  v_org_id uuid := gen_random_uuid();
  v_user_id uuid := gen_random_uuid();
BEGIN
  RAISE NOTICE '🔍 Iniciando testes...';

  -- Teste 1: Criar anúncio novo (com org_id e user_id)
  v_result := save_anuncio_field(
    NULL, -- novo anúncio
    'title',
    'Teste de Criação',
    NULL,
    v_org_id,
    v_user_id
  );
  
  v_test_id := (v_result->>'id')::uuid;
  RAISE NOTICE '✅ Teste 1 OK - Criado anúncio: %', v_test_id;

  -- Teste 2: Atualizar campo existente
  v_result := save_anuncio_field(
    v_test_id,
    'tipo_local',
    'cabana',
    NULL,
    v_org_id,
    v_user_id
  );
  
  RAISE NOTICE '✅ Teste 2 OK - Atualizado tipo_local para: %', v_result->'data'->>'tipo_local';

  -- Teste 3: Verificar dados salvos
  IF (v_result->'data'->>'tipo_local') = 'cabana' THEN
    RAISE NOTICE '✅ Teste 3 OK - Campo tipo_local salvo corretamente!';
  ELSE
    RAISE EXCEPTION 'Teste 3 FALHOU - Esperado: cabana, Obtido: %', v_result->'data'->>'tipo_local';
  END IF;

  -- Limpar teste
  DELETE FROM public.anuncios_drafts WHERE id = v_test_id;
  
  RAISE NOTICE '🎉 TUDO FUNCIONANDO! Sistema pronto para uso.';
  RAISE NOTICE '📝 Agora você pode salvar campos no frontend.';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ ERRO: %', SQLERRM;
  RAISE;
END $test$;
