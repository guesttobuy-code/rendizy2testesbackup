-- MIGRATION: Anúncio Ultimate V2 - Sistema de Rascunhos e Versionamento
-- Data: 2025-12-13
-- Objetivo: Garantir salvamento 100% confiável com rascunhos, versões e recovery

-- ============================================================================
-- 1. TABELA DE RASCUNHOS (substitui anuncios_ultimate)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.anuncios_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  
  -- Metadata para busca rápida
  title text,
  status varchar(32) DEFAULT 'draft', -- draft|validating|ready_to_publish|published
  completion_percentage int DEFAULT 0,
  
  -- Dados flexíveis (JSONB)
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Tracking
  step_completed int DEFAULT 0, -- último step completo (1-7)
  last_edited_field text,
  last_edited_at timestamptz DEFAULT now(),
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT check_completion CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  CONSTRAINT check_step CHECK (step_completed >= 0 AND step_completed <= 7)
);

-- Índices críticos para performance
CREATE INDEX IF NOT EXISTS idx_drafts_user ON anuncios_drafts(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_drafts_org ON anuncios_drafts(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON anuncios_drafts(status) WHERE status IN ('draft', 'ready_to_publish');
CREATE INDEX IF NOT EXISTS idx_drafts_title ON anuncios_drafts USING gin(to_tsvector('portuguese', coalesce(title, '')));
CREATE INDEX IF NOT EXISTS idx_drafts_data ON anuncios_drafts USING gin(data jsonb_path_ops);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_drafts ON public.anuncios_drafts;
CREATE TRIGGER set_timestamp_drafts
BEFORE UPDATE ON public.anuncios_drafts
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- ============================================================================
-- 2. TABELA DE ANÚNCIOS PUBLICADOS (normalizada)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.anuncios_published (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid REFERENCES anuncios_drafts(id) ON DELETE SET NULL,
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  
  -- Campos normalizados (extraídos do JSONB para queries rápidas)
  title text NOT NULL,
  tipo_local varchar(64) NOT NULL,
  tipo_acomodacao varchar(64) NOT NULL,
  subtype varchar(64),
  modalidades text[], -- array de modalidades
  estrutura varchar(32) DEFAULT 'individual',
  
  -- Localização (para busca geográfica)
  cidade text,
  estado varchar(2),
  pais varchar(2) DEFAULT 'BR',
  -- location geography(POINT, 4326), -- PostGIS (descomentar se tiver extensão)
  
  -- Dados completos (backup do wizard)
  data jsonb NOT NULL,
  
  -- Status
  status varchar(32) DEFAULT 'active', -- active|paused|archived
  visibility varchar(32) DEFAULT 'public', -- public|private|unlisted
  
  -- SEO
  slug text UNIQUE,
  
  -- Timestamps
  published_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Índices para busca e filtros
CREATE INDEX IF NOT EXISTS idx_published_org ON anuncios_published(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_published_tipo ON anuncios_published(tipo_local, tipo_acomodacao);
CREATE INDEX IF NOT EXISTS idx_published_slug ON anuncios_published(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_published_search ON anuncios_published USING gin(
  to_tsvector('portuguese', title || ' ' || coalesce(data->>'description', ''))
);

-- ============================================================================
-- 3. TABELA DE VERSIONAMENTO (snapshots automáticos)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.anuncios_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anuncio_id uuid NOT NULL, -- referencia draft ou published
  version_number int NOT NULL,
  
  -- Snapshot completo
  data jsonb NOT NULL,
  
  -- Metadata da mudança
  changed_fields text[], -- campos que mudaram nesta versão
  change_summary text, -- descrição opcional
  
  -- Autoria
  user_id uuid,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_version UNIQUE(anuncio_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_versions_anuncio ON anuncios_versions(anuncio_id, version_number DESC);

-- ============================================================================
-- 4. FILA DE MUDANÇAS PENDENTES (recovery automático)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.anuncios_pending_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anuncio_id uuid NOT NULL,
  field text NOT NULL,
  value jsonb,
  
  -- Prioridade (0 = baixa, 100 = alta)
  priority int DEFAULT 50,
  
  -- Tracking
  attempt_count int DEFAULT 0,
  last_error text,
  next_retry_at timestamptz DEFAULT now(),
  
  -- Idempotency
  idempotency_key text UNIQUE,
  
  -- Status
  status varchar(32) DEFAULT 'pending', -- pending|processing|completed|failed
  
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_pending_retry ON anuncios_pending_changes(status, next_retry_at) 
  WHERE status IN ('pending', 'failed');

-- ============================================================================
-- 5. RPC: Salvamento em Lote (Batch Save)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.save_anuncio_batch(
  p_anuncio_id uuid,
  p_changes jsonb, -- array de {field, value, idempotency_key}
  p_organization_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_id uuid;
  v_change jsonb;
  v_applied int := 0;
  v_skipped int := 0;
  v_result jsonb;
BEGIN
  -- Criar ou recuperar anúncio
  IF p_anuncio_id IS NULL THEN
    INSERT INTO public.anuncios_drafts (organization_id, user_id, data)
    VALUES (COALESCE(p_organization_id, '00000000-0000-0000-0000-000000000000'::uuid), 
            COALESCE(p_user_id, '00000000-0000-0000-0000-000000000000'::uuid), 
            '{}'::jsonb)
    RETURNING id INTO v_id;
  ELSE
    v_id := p_anuncio_id;
  END IF;

  -- Processar mudanças em ordem
  FOR v_change IN SELECT * FROM jsonb_array_elements(p_changes) LOOP
    DECLARE
      v_field text := v_change->>'field';
      v_value jsonb := v_change->'value';
      v_idem_key text := v_change->>'idempotency_key';
      v_exists bool;
    BEGIN
      -- Checar idempotência
      IF v_idem_key IS NOT NULL THEN
        SELECT EXISTS(SELECT 1 FROM anuncios_field_changes WHERE idempotency_key = v_idem_key) INTO v_exists;
        IF v_exists THEN
          v_skipped := v_skipped + 1;
          CONTINUE;
        END IF;
      END IF;

      -- Aplicar mudança
      UPDATE public.anuncios_drafts
        SET data = jsonb_set(COALESCE(data, '{}'::jsonb), ARRAY[v_field], v_value, true),
            last_edited_field = v_field,
            last_edited_at = now()
        WHERE id = v_id;

      -- Se não existia, criar
      IF NOT FOUND THEN
        INSERT INTO public.anuncios_drafts (id, organization_id, user_id, data, last_edited_field)
        VALUES (v_id, 
                COALESCE(p_organization_id, '00000000-0000-0000-0000-000000000000'::uuid),
                COALESCE(p_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
                jsonb_build_object(v_field, v_value),
                v_field);
      END IF;

      -- Logar mudança
      INSERT INTO anuncios_field_changes (anuncio_id, field, value, idempotency_key)
        VALUES (v_id, v_field, v_value, v_idem_key)
        ON CONFLICT (idempotency_key) DO NOTHING;

      v_applied := v_applied + 1;
    END;
  END LOOP;

  -- Atualizar porcentagem de completude
  PERFORM update_completion_percentage(v_id);

  -- Criar snapshot se mudanças significativas
  IF v_applied >= 3 THEN
    PERFORM create_version_snapshot(v_id);
  END IF;

  -- Retornar resultado
  SELECT jsonb_build_object(
    'id', id,
    'data', data,
    'completion_percentage', completion_percentage,
    'status', status,
    'updated_at', updated_at,
    'changes_applied', v_applied,
    'changes_skipped', v_skipped
  ) INTO v_result
  FROM anuncios_drafts WHERE id = v_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. FUNÇÃO: Calcular Completude
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_completion_percentage(p_anuncio_id uuid)
RETURNS void AS $$
DECLARE
  v_data jsonb;
  v_required_fields text[] := ARRAY[
    'title', 'tipoLocal', 'tipoAcomodacao', 'modalidades',
    'cidade', 'estado', 'endereco',
    'quartos', 'banheiros', 'fotos',
    'description'
  ];
  v_field text;
  v_completed int := 0;
  v_total int := array_length(v_required_fields, 1);
  v_percentage int;
BEGIN
  SELECT data INTO v_data FROM anuncios_drafts WHERE id = p_anuncio_id;

  IF v_data IS NULL THEN
    RETURN;
  END IF;

  -- Contar campos preenchidos
  FOREACH v_field IN ARRAY v_required_fields LOOP
    IF v_data ? v_field AND v_data->>v_field IS NOT NULL AND v_data->>v_field != '' AND v_data->>v_field != '[]' THEN
      v_completed := v_completed + 1;
    END IF;
  END LOOP;

  v_percentage := (v_completed * 100) / v_total;

  -- Atualizar status baseado na completude
  UPDATE anuncios_drafts
    SET completion_percentage = v_percentage,
        status = CASE
          WHEN v_percentage = 100 THEN 'ready_to_publish'
          WHEN v_percentage >= 50 THEN 'validating'
          ELSE 'draft'
        END
    WHERE id = p_anuncio_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. FUNÇÃO: Criar Snapshot de Versão
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_version_snapshot(p_anuncio_id uuid)
RETURNS uuid AS $$
DECLARE
  v_current_data jsonb;
  v_last_version int := 0;
  v_new_version int;
  v_version_id uuid;
BEGIN
  -- Recuperar dados atuais
  SELECT data INTO v_current_data FROM anuncios_drafts WHERE id = p_anuncio_id;

  IF v_current_data IS NULL THEN
    RAISE EXCEPTION 'Anúncio não encontrado: %', p_anuncio_id;
  END IF;

  -- Recuperar última versão
  SELECT COALESCE(MAX(version_number), 0) INTO v_last_version
  FROM anuncios_versions
  WHERE anuncio_id = p_anuncio_id;

  v_new_version := v_last_version + 1;

  -- Criar snapshot
  INSERT INTO anuncios_versions (anuncio_id, version_number, data)
  VALUES (p_anuncio_id, v_new_version, v_current_data)
  RETURNING id INTO v_version_id;

  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. FUNÇÃO: Restaurar Versão
-- ============================================================================

CREATE OR REPLACE FUNCTION public.restore_version(p_version_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_version anuncios_versions%ROWTYPE;
  v_result jsonb;
BEGIN
  -- Recuperar versão
  SELECT * INTO v_version FROM anuncios_versions WHERE id = p_version_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Versão não encontrada: %', p_version_id;
  END IF;

  -- Restaurar dados
  UPDATE anuncios_drafts
    SET data = v_version.data,
        updated_at = now()
    WHERE id = v_version.anuncio_id;

  -- Criar nova versão (snapshot do restore)
  PERFORM create_version_snapshot(v_version.anuncio_id);

  -- Retornar resultado
  SELECT jsonb_build_object(
    'id', id,
    'data', data,
    'updated_at', updated_at
  ) INTO v_result
  FROM anuncios_drafts WHERE id = v_version.anuncio_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. FUNÇÃO: Publicar Anúncio
-- ============================================================================

CREATE OR REPLACE FUNCTION public.publish_anuncio(p_draft_id uuid)
RETURNS uuid AS $$
DECLARE
  v_draft anuncios_drafts%ROWTYPE;
  v_published_id uuid;
  v_slug text;
BEGIN
  -- Recuperar rascunho
  SELECT * INTO v_draft FROM anuncios_drafts WHERE id = p_draft_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Draft não encontrado: %', p_draft_id;
  END IF;

  IF v_draft.completion_percentage < 100 THEN
    RAISE EXCEPTION 'Anúncio incompleto (% %%)', v_draft.completion_percentage;
  END IF;

  -- Gerar slug único
  v_slug := lower(regexp_replace(v_draft.title, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substring(v_draft.id::text from 1 for 8);

  -- Criar registro publicado
  INSERT INTO anuncios_published (
    draft_id, organization_id, user_id,
    title, tipo_local, tipo_acomodacao, subtype, modalidades, estrutura,
    cidade, estado, pais,
    data, status, visibility, slug
  ) VALUES (
    v_draft.id,
    v_draft.organization_id,
    v_draft.user_id,
    v_draft.title,
    v_draft.data->>'tipoLocal',
    v_draft.data->>'tipoAcomodacao',
    v_draft.data->>'subtype',
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_draft.data->'modalidades', '[]'::jsonb))),
    COALESCE(v_draft.data->>'estrutura', 'individual'),
    v_draft.data->>'cidade',
    v_draft.data->>'estado',
    'BR',
    v_draft.data,
    'active',
    'public',
    v_slug
  ) RETURNING id INTO v_published_id;

  -- Marcar draft como publicado
  UPDATE anuncios_drafts
    SET status = 'published'
    WHERE id = p_draft_id;

  RETURN v_published_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. VIEW: Saúde do Sistema
-- ============================================================================

CREATE OR REPLACE VIEW public.anuncios_health AS
SELECT
  -- Rascunhos ativos
  (SELECT count(*) FROM anuncios_drafts WHERE status = 'draft') as drafts_active,
  
  -- Prontos para publicar
  (SELECT count(*) FROM anuncios_drafts WHERE status = 'ready_to_publish') as drafts_ready,
  
  -- Mudanças pendentes
  (SELECT count(*) FROM anuncios_pending_changes WHERE status = 'pending') as changes_pending,
  
  -- Mudanças falhadas (últimas 24h)
  (SELECT count(*) FROM anuncios_pending_changes 
   WHERE status = 'failed' AND created_at > now() - interval '24 hours') as changes_failed_24h,
  
  -- Publicados ativos
  (SELECT count(*) FROM anuncios_published WHERE status = 'active') as published_active,
  
  -- Taxa de sucesso (últimas 24h)
  (SELECT 
    ROUND((count(*) FILTER (WHERE status = 'completed')::numeric / 
           NULLIF(count(*), 0)) * 100, 2)
   FROM anuncios_pending_changes
   WHERE created_at > now() - interval '24 hours') as success_rate_24h,
   
  -- Última atualização
  now() as checked_at;

-- ============================================================================
-- 11. FUNÇÃO: Recovery Automático
-- ============================================================================

CREATE OR REPLACE FUNCTION public.retry_failed_changes()
RETURNS void AS $$
BEGIN
  -- Reprocessar mudanças falhadas que já passaram do retry_at
  UPDATE anuncios_pending_changes
    SET status = 'pending',
        next_retry_at = now() + (interval '1 second' * power(2, attempt_count)),
        attempt_count = attempt_count + 1
    WHERE status = 'failed'
      AND next_retry_at <= now()
      AND attempt_count < 5;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMENTÁRIOS FINAIS
-- ============================================================================

COMMENT ON TABLE anuncios_drafts IS 'Rascunhos de anúncios com salvamento automático campo-por-campo';
COMMENT ON TABLE anuncios_published IS 'Anúncios publicados com schema normalizado para queries rápidas';
COMMENT ON TABLE anuncios_versions IS 'Snapshots automáticos para versionamento e rollback';
COMMENT ON TABLE anuncios_pending_changes IS 'Fila de mudanças pendentes para recovery automático';
COMMENT ON FUNCTION save_anuncio_batch IS 'Salva múltiplos campos em uma transação atômica com idempotência';
COMMENT ON FUNCTION publish_anuncio IS 'Migra rascunho completo para tabela de publicados (normalizada)';
COMMENT ON VIEW anuncios_health IS 'Métricas de saúde do sistema de anúncios';
