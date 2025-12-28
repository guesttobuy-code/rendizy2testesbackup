-- Migration: Bloquear criação de imóveis placeholder (Stays.net)
-- Data: 2025-12-28
-- Objetivo: Regra de raiz (DB) para NUNCA permitir anúncios/"imóveis" placeholder.

-- 🔒 Política: qualquer tentativa de criar/atualizar um anúncio cujo título pareça
-- "Propriedade Stays.net <id>" deve falhar imediatamente.
-- Isso bloqueia tanto inserts diretos quanto a RPC save_anuncio_field.

CREATE OR REPLACE FUNCTION public.prevent_anuncios_ultimate_staysnet_placeholder()
RETURNS TRIGGER AS $$
DECLARE
  title_text text;
  internal_text text;
BEGIN
  -- Título canônico usado pelo app (salvo em JSONB)
  title_text := NULLIF(btrim(COALESCE(NEW.data->>'title', '')), '');
  internal_text := NULLIF(btrim(COALESCE(NEW.data->>'internalId', NEW.data->>'nome_interno', '')), '');

  -- Bloqueio forte do padrão conhecido de placeholder
  IF title_text IS NOT NULL AND title_text ~* '^propriedade\s+stays\.net\s+' THEN
    RAISE EXCEPTION 'PLACEHOLDER_IMOVEL_FORBIDDEN: titulo placeholder staysnet não é permitido ("%")', title_text
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

DROP TRIGGER IF EXISTS trg_prevent_anuncios_ultimate_staysnet_placeholder ON public.anuncios_ultimate;
CREATE TRIGGER trg_prevent_anuncios_ultimate_staysnet_placeholder
BEFORE INSERT OR UPDATE ON public.anuncios_ultimate
FOR EACH ROW
EXECUTE FUNCTION public.prevent_anuncios_ultimate_staysnet_placeholder();
