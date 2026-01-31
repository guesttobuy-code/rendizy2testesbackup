-- ============================================================================
-- Migration: Bloquear criação de imóveis com título vazio
-- Data: 2026-01-31
-- Objetivo: Evitar que imóveis "Sem título" sejam criados por integrações/bugs
-- ============================================================================

-- Atualiza o trigger existente para também bloquear títulos vazios
CREATE OR REPLACE FUNCTION public.prevent_properties_staysnet_placeholder()
RETURNS TRIGGER AS $$
DECLARE
  title_text text;
  internal_text text;
  is_settings boolean;
BEGIN
  -- Verificar se é um registro de settings (não é imóvel real)
  is_settings := COALESCE(NEW.data->>'__kind', '') = 'settings';
  
  -- Settings são permitidos sem título
  IF is_settings THEN
    RETURN NEW;
  END IF;

  -- Título canônico usado pelo app (salvo em JSONB)
  title_text := NULLIF(btrim(COALESCE(NEW.data->>'title', '')), '');
  internal_text := NULLIF(btrim(COALESCE(NEW.data->>'internalId', NEW.data->>'nome_interno', '')), '');

  -- ⚠️ NOVO: Bloquear imóveis sem título nem internalId (placeholders vazios)
  -- Isso evita que integrações criem registros "Sem título"
  IF title_text IS NULL AND internal_text IS NULL THEN
    -- Permite apenas se tem externalIds (pode ser imóvel em processo de importação)
    -- mas apenas na CRIAÇÃO (INSERT), não em UPDATE
    IF TG_OP = 'INSERT' AND (NEW.data->'externalIds' IS NULL OR NEW.data->'externalIds' = '{}'::jsonb) THEN
      RAISE EXCEPTION 'PLACEHOLDER_IMOVEL_FORBIDDEN: imóvel sem título ou identificação não é permitido'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Bloqueio forte do padrão conhecido de placeholder "Propriedade Stays.net xxx"
  IF title_text IS NOT NULL AND title_text ~* '^propriedade\s+stays\.net\s+' THEN
    RAISE EXCEPTION 'PLACEHOLDER_IMOVEL_FORBIDDEN: titulo placeholder staysnet não é permitido ("%")', title_text
      USING ERRCODE = 'check_violation';
  END IF;

  -- Bloqueio de padrão "Property <uuid>" (fallback do auto-fetch)
  IF title_text IS NOT NULL AND title_text ~* '^property\s+[0-9a-f-]{20,}' THEN
    RAISE EXCEPTION 'PLACEHOLDER_IMOVEL_FORBIDDEN: titulo placeholder "Property <id>" não é permitido ("%")', title_text
      USING ERRCODE = 'check_violation';
  END IF;

  -- Defesa extra: alguns fluxos antigos gravavam nome interno com o mesmo padrão
  IF internal_text IS NOT NULL AND internal_text ~* '^propriedade\s+stays\.net\s+' THEN
    RAISE EXCEPTION 'PLACEHOLDER_IMOVEL_FORBIDDEN: nome interno placeholder staysnet não é permitido ("%")', internal_text
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- O trigger já existe, mas garantir que está ativo
DROP TRIGGER IF EXISTS trg_prevent_properties_staysnet_placeholder ON public.properties;
CREATE TRIGGER trg_prevent_properties_staysnet_placeholder
BEFORE INSERT OR UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.prevent_properties_staysnet_placeholder();

-- ============================================================================
-- LIMPEZA: Deletar imóveis placeholder existentes
-- ============================================================================

-- Deletar imóveis draft sem título nem internalId (placeholders vazios)
-- CUIDADO: Isso deleta apenas imóveis que são claramente placeholders
DELETE FROM public.properties
WHERE status = 'draft'
  AND COALESCE(data->>'__kind', '') != 'settings'
  AND NULLIF(btrim(COALESCE(data->>'title', '')), '') IS NULL
  AND NULLIF(btrim(COALESCE(data->>'internalId', '')), '') IS NULL
  AND (data->'externalIds' IS NULL OR data->'externalIds' = '{}'::jsonb OR data->'externalIds' = 'null'::jsonb);

-- Registrar quantos foram deletados
DO $$
DECLARE
  deleted_count int;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Imóveis placeholder vazios deletados: %', deleted_count;
END $$;

COMMENT ON FUNCTION public.prevent_properties_staysnet_placeholder IS
  '[2026-01-31] Bloqueia imóveis placeholder: sem título, "Propriedade Stays.net xxx", "Property <uuid>"';
