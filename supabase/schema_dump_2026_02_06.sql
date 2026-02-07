


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'Schema com modelo de dados universal para OTAs - Migração 7: Seed Amenities';



CREATE TYPE "public"."mapping_scope" AS ENUM (
    'property',
    'location',
    'room',
    'rate',
    'reservation'
);


ALTER TYPE "public"."mapping_scope" OWNER TO "postgres";


CREATE TYPE "public"."ota_channel" AS ENUM (
    'expedia',
    'booking',
    'airbnb',
    'vrbo',
    'decolar',
    'despegar',
    'trivago',
    'google_vacation',
    'tripadvisor',
    'direct'
);


ALTER TYPE "public"."ota_channel" OWNER TO "postgres";


CREATE TYPE "public"."stay_price_result" AS (
	"total_price" numeric(12,2),
	"average_per_night" numeric(12,2),
	"nights_count" integer,
	"currency" "text",
	"rate_plan_id" "uuid",
	"price_breakdown" "jsonb"
);


ALTER TYPE "public"."stay_price_result" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_effective_price"("p_property_id" "uuid", "p_rate_plan_id" "uuid", "p_date" "date") RETURNS numeric
    LANGUAGE "plpgsql" STABLE
    AS $$
    DECLARE
    v_base_price DECIMAL(10,2);
    v_rate_plan RECORD;
    v_override RECORD;
    v_availability RECORD;
    v_effective_price DECIMAL(10,2);
    BEGIN
    -- 1. Buscar preço base da property (do JSONB)
    SELECT 
        COALESCE((data->>'preco_base_noite')::DECIMAL, 0)
    INTO v_base_price
    FROM properties
    WHERE id = p_property_id;
    
    -- Se não houver preço base, retorna 0
    IF v_base_price IS NULL OR v_base_price = 0 THEN
        RETURN 0;
    END IF;
    
    -- 2. Buscar rate_plan para ver ajustes
    SELECT * INTO v_rate_plan
    FROM rate_plans
    WHERE id = p_rate_plan_id;
    
    -- Aplicar ajuste do rate_plan
    IF v_rate_plan IS NOT NULL THEN
        CASE v_rate_plan.price_adjustment_type
        WHEN 'percentage' THEN
            v_effective_price := v_base_price * (1 + v_rate_plan.price_adjustment_value / 100);
        WHEN 'fixed' THEN
            v_effective_price := v_base_price + v_rate_plan.price_adjustment_value;
        ELSE
            v_effective_price := v_base_price;
        END CASE;
    ELSE
        v_effective_price := v_base_price;
    END IF;
    
    -- 3. Verificar override de período (rate_plan_pricing_overrides)
    SELECT * INTO v_override
    FROM rate_plan_pricing_overrides
    WHERE rate_plan_id = p_rate_plan_id
        AND p_date >= date_from
        AND p_date <= date_to
        AND is_active = true
    ORDER BY date_from DESC
    LIMIT 1;
    
    IF v_override IS NOT NULL THEN
        CASE v_override.override_type
        WHEN 'absolute' THEN
            v_effective_price := v_override.price_value;
        WHEN 'adjustment' THEN
            IF v_override.price_adjustment_type = 'percentage' THEN
            v_effective_price := v_effective_price * (1 + v_override.price_adjustment_value / 100);
            ELSE
            v_effective_price := v_effective_price + v_override.price_adjustment_value;
            END IF;
        WHEN 'closed' THEN
            RETURN 0; -- Fechado para reservas
        END CASE;
    END IF;
    
    -- 4. Verificar override diário (rate_plan_availability)
    SELECT * INTO v_availability
    FROM rate_plan_availability
    WHERE rate_plan_id = p_rate_plan_id
        AND property_id = p_property_id
        AND date = p_date;
    
    IF v_availability IS NOT NULL THEN
        -- Se tem price_override, usa ele
        IF v_availability.price_override IS NOT NULL THEN
        v_effective_price := v_availability.price_override;
        END IF;
        
        -- Se está fechado, retorna 0
        IF v_availability.is_closed OR v_availability.stop_sell THEN
        RETURN 0;
        END IF;
    END IF;
    
    RETURN ROUND(v_effective_price, 2);
    END;
    $$;


ALTER FUNCTION "public"."calculate_effective_price"("p_property_id" "uuid", "p_rate_plan_id" "uuid", "p_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_effective_price"("p_property_id" "uuid", "p_rate_plan_id" "uuid", "p_date" "date") IS 'Calcula o preço efetivo para uma data considerando rate_plan + overrides + availability';



CREATE OR REPLACE FUNCTION "public"."calculate_payment_net_amount"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.net_amount = COALESCE(NEW.amount, 0) - COALESCE(NEW.gateway_fee, 0) - COALESCE(NEW.ota_fee, 0);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_payment_net_amount"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_stay_price"("p_property_id" "uuid", "p_checkin" "date", "p_checkout" "date", "p_rate_plan_code" "text" DEFAULT 'STANDARD'::"text") RETURNS TABLE("total_price" numeric, "nightly_rate" numeric, "nights" integer, "cleaning_fee" numeric, "currency" "text", "rate_plan_id" "uuid", "breakdown" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  v_rate_plan_id UUID;
  v_base_price NUMERIC;
  v_cleaning_fee NUMERIC;
  v_currency TEXT;
  v_nights INTEGER;
  v_total NUMERIC;
  v_adjustment_percent NUMERIC := 0;
  v_breakdown JSONB;
BEGIN
  -- Calcular número de noites
  v_nights := p_checkout - p_checkin;
  
  IF v_nights <= 0 THEN
    RAISE EXCEPTION 'Checkout deve ser após checkin';
  END IF;
  
  -- Buscar rate plan e preço base da propriedade
  SELECT 
    rp.id,
    COALESCE((p.data->>'preco_base_noite')::NUMERIC, 0),
    COALESCE((p.data->>'taxa_limpeza')::NUMERIC, 0),
    COALESCE(p.data->>'moeda', 'BRL')
  INTO v_rate_plan_id, v_base_price, v_cleaning_fee, v_currency
  FROM rate_plans rp
  INNER JOIN properties p ON p.id = rp.property_id
  WHERE rp.property_id = p_property_id
    AND rp.code = p_rate_plan_code
    AND rp.is_active = true;
  
  IF v_rate_plan_id IS NULL THEN
    RAISE EXCEPTION 'Rate plan % não encontrado para property %', p_rate_plan_code, p_property_id;
  END IF;
  
  IF v_base_price = 0 THEN
    RAISE EXCEPTION 'Preço base não configurado para property %', p_property_id;
  END IF;
  
  -- Buscar ajuste de preço do rate plan (se houver)
  -- Ex: NON_REFUNDABLE pode ter -15%
  SELECT COALESCE(rp.price_adjustment_value, 0)
  INTO v_adjustment_percent
  FROM rate_plans rp
  WHERE rp.id = v_rate_plan_id
    AND rp.price_adjustment_type = 'percentage';
  
  -- TODO: Considerar overrides por data (rate_plan_pricing_overrides)
  -- TODO: Considerar descontos por pacote (7d, 14d, 28d)
  
  -- Calcular total: (base × noites) + taxa_limpeza
  v_total := (v_base_price * v_nights) + v_cleaning_fee;
  
  -- Aplicar ajuste percentual do rate plan se houver
  IF v_adjustment_percent != 0 THEN
    v_total := v_total * (1 + v_adjustment_percent / 100);
  END IF;
  
  -- Montar breakdown
  v_breakdown := jsonb_build_object(
    'base_price_per_night', v_base_price,
    'nights', v_nights,
    'accommodation_total', v_base_price * v_nights,
    'cleaning_fee', v_cleaning_fee,
    'rate_plan_adjustment_percent', v_adjustment_percent,
    'currency', v_currency,
    'calculation', format('%s × %s noites = %s + %s (limpeza) = %s', 
      v_base_price, v_nights, v_base_price * v_nights, v_cleaning_fee, v_total)
  );
  
  RETURN QUERY SELECT 
    v_total AS total_price,
    v_base_price AS nightly_rate,
    v_nights AS nights,
    v_cleaning_fee AS cleaning_fee,
    v_currency AS currency,
    v_rate_plan_id AS rate_plan_id,
    v_breakdown AS breakdown;
END;
$$;


ALTER FUNCTION "public"."calculate_stay_price"("p_property_id" "uuid", "p_checkin" "date", "p_checkout" "date", "p_rate_plan_code" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_stay_price"("p_property_id" "uuid", "p_checkin" "date", "p_checkout" "date", "p_rate_plan_code" "text") IS 'Calcula preço total de estadia incluindo taxa de limpeza.
Taxa de limpeza é SEMPRE somada ao total (inclusa na primeira diária).
Retorna: total_price, nightly_rate, nights, cleaning_fee, currency, rate_plan_id, breakdown';



CREATE OR REPLACE FUNCTION "public"."cancel_operational_tasks_on_reservation_cancel"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Se a reserva foi cancelada, cancela as tarefas pendentes relacionadas
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE operational_tasks
    SET 
      status = 'cancelled',
      updated_at = NOW(),
      metadata = metadata || jsonb_build_object('cancelled_reason', 'Reserva cancelada', 'cancelled_at', NOW())
    WHERE 
      reservation_id = NEW.id::TEXT
      AND status IN ('pending', 'in_progress');
    
    RAISE NOTICE 'Tarefas operacionais canceladas para reserva %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."cancel_operational_tasks_on_reservation_cancel"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cancel_operational_tasks_on_reservation_cancel"() IS 'Trigger function que cancela tarefas pendentes quando uma reserva é cancelada';



CREATE OR REPLACE FUNCTION "public"."check_deal_has_contact_or_company"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Se ambos forem NULL, erro
  IF NEW.crm_contact_id IS NULL AND NEW.crm_company_id IS NULL THEN
    RAISE EXCEPTION 'Deal deve ter pelo menos um contato ou empresa vinculado';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_deal_has_contact_or_company"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_owner_user_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
BEGIN
  -- Contar usuários existentes do proprietário
  SELECT COUNT(*) INTO current_count
  FROM owner_users
  WHERE owner_id = NEW.owner_id AND status != 'revoked';
  
  -- Obter limite do proprietário
  SELECT COALESCE(max_users, 3) INTO max_allowed
  FROM owners
  WHERE id = NEW.owner_id;
  
  -- Validar limite
  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Limite de usuários atingido (max: %)', max_allowed;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_owner_user_limit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_sessions"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_sessions_v2"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sessions 
  WHERE 
    (access_expires_at IS NOT NULL AND access_expires_at < NOW())
    OR (refresh_expires_at IS NOT NULL AND refresh_expires_at < NOW())
    OR (revoked_at IS NOT NULL);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_sessions_v2"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_expired_sessions_v2"() IS 'Limpa sessões expiradas ou revogadas (versão 2 com access/refresh tokens)';



CREATE OR REPLACE FUNCTION "public"."create_standard_rate_plan_for_property"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
    BEGIN
    -- Só criar se não existir ainda
    IF NOT EXISTS (
        SELECT 1 FROM rate_plans 
        WHERE property_id = NEW.id AND code = 'STANDARD'
    ) THEN
        INSERT INTO rate_plans (
        organization_id,
        property_id,
        code,
        name_pt,
        name_en,
        description_pt,
        price_adjustment_type,
        price_adjustment_value,
        price_adjustment_currency,
        cancellation_policy_id,
        min_nights,
        is_refundable,
        is_active,
        is_default,
        priority
        ) VALUES (
        NEW.organization_id,
        NEW.id,
        'STANDARD',
        'Tarifa Padrão',
        'Standard Rate',
        'Tarifa padrão da propriedade. Preço base sem ajustes.',
        'none',
        0,
        COALESCE((NEW.data->>'moeda')::TEXT, 'BRL'),
        'flexible',
        COALESCE((NEW.data->>'minimo_noites')::INTEGER, 1),
        true,
        true,
        true,
        0
        );
    END IF;
    
    RETURN NEW;
    END;
    $$;


ALTER FUNCTION "public"."create_standard_rate_plan_for_property"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_from_contact"("p_contact_id" "uuid", "p_role" character varying DEFAULT 'proprietario'::character varying, "p_send_invite" boolean DEFAULT true) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_contact RECORD;
  v_new_user_id UUID;
BEGIN
  -- Buscar contato
  SELECT * INTO v_contact FROM crm_contacts WHERE id = p_contact_id;
  
  IF v_contact IS NULL THEN
    RAISE EXCEPTION 'Contato não encontrado: %', p_contact_id;
  END IF;
  
  IF v_contact.email IS NULL THEN
    RAISE EXCEPTION 'Contato precisa ter email para criar usuário';
  END IF;
  
  IF v_contact.user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Contato já possui usuário vinculado: %', v_contact.user_id;
  END IF;
  
  -- Verificar se email já existe em users
  IF EXISTS (SELECT 1 FROM users WHERE email = v_contact.email AND organization_id = v_contact.organization_id) THEN
    RAISE EXCEPTION 'Já existe usuário com este email: %', v_contact.email;
  END IF;
  
  -- Criar usuário (sem senha - convite por email)
  -- Nota: password_hash temporário, username gerado do email
  INSERT INTO users (
    organization_id,
    email,
    username,
    name,
    password_hash,
    type,
    status,
    created_at,
    updated_at
  ) VALUES (
    v_contact.organization_id,
    v_contact.email,
    LOWER(REPLACE(v_contact.email, '@', '_')), -- username do email
    COALESCE(v_contact.first_name || ' ' || COALESCE(v_contact.last_name, ''), v_contact.email),
    'PENDING_INVITE', -- Marcador - usuário precisa definir senha
    CASE WHEN p_role = 'proprietario' THEN 'staff' ELSE 'staff' END,
    'invited',
    NOW(),
    NOW()
  ) RETURNING id INTO v_new_user_id;
  
  -- Vincular contato ao usuário
  UPDATE crm_contacts 
  SET user_id = v_new_user_id, updated_at = NOW()
  WHERE id = p_contact_id;
  
  -- TODO: Se p_send_invite = true, disparar email de convite via edge function
  
  RETURN v_new_user_id;
END;
$$;


ALTER FUNCTION "public"."create_user_from_contact"("p_contact_id" "uuid", "p_role" character varying, "p_send_invite" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_version_snapshot"("p_anuncio_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_current_data jsonb;
  v_current_title text;
  v_last_version int := 0;
  v_new_version int;
  v_version_id uuid;
BEGIN
  -- Recuperar dados atuais da properties
  SELECT data, data->>'title' INTO v_current_data, v_current_title 
  FROM public.properties 
  WHERE id = p_anuncio_id;

  IF v_current_data IS NULL THEN
    RAISE EXCEPTION 'Imóvel não encontrado: %', p_anuncio_id;
  END IF;

  -- Recuperar última versão (se tabela existir)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'anuncios_versions') THEN
    SELECT COALESCE(MAX(version_number), 0) INTO v_last_version
    FROM public.anuncios_versions
    WHERE anuncio_id = p_anuncio_id;

    v_new_version := v_last_version + 1;

    -- Criar snapshot
    INSERT INTO public.anuncios_versions (anuncio_id, version_number, data)
    VALUES (p_anuncio_id, v_new_version, v_current_data)
    RETURNING id INTO v_version_id;
  ELSE
    v_version_id := p_anuncio_id; -- retorna o próprio ID se não há versionamento
  END IF;

  RETURN v_version_id;
END;
$$;


ALTER FUNCTION "public"."create_version_snapshot"("p_anuncio_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_version_snapshot"("p_anuncio_id" "uuid") IS '[CANÔNICO 2026-01-06] Cria snapshot de versão de properties';



CREATE OR REPLACE FUNCTION "public"."criar_plano_contas_para_organizacao"("org_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  cat_3_1_id UUID;
  cat_3_2_id UUID;
  cat_3_3_id UUID;
  cat_3_4_id UUID;
  cat_3_5_id UUID;
  cat_4_1_id UUID;
  cat_4_2_id UUID;
  cat_4_3_id UUID;
  cat_5_1_id UUID;
  cat_5_2_id UUID;
  cat_5_3_id UUID;
  cat_5_4_id UUID;
  cat_5_5_id UUID;
  cat_5_6_id UUID;
  cat_6_1_id UUID;
  cat_6_2_id UUID;
  cat_6_3_id UUID;
  cat_6_4_id UUID;
  cat_6_5_id UUID;
  cat_6_6_id UUID;
  cat_7_1_id UUID;
BEGIN
  -- Verificar se organizaÃ§Ã£o existe
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = org_id) THEN
    RAISE EXCEPTION 'OrganizaÃ§Ã£o % nÃ£o encontrada', org_id;
  END IF;

  -- ============================================================================
  -- RECEITAS OPERACIONAIS (3.x)
  -- ============================================================================

  -- 3.1 - RECEITA DE ALUGUÃ‰IS DE TEMPORADA
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '3.1', 'Receita de AluguÃ©is de Temporada', 'receita', 'credora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_3_1_id;
  
  -- Buscar ID se jÃ¡ existir
  IF cat_3_1_id IS NULL THEN
    SELECT id INTO cat_3_1_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.1' LIMIT 1;
  END IF;

  -- 3.1.1 - AluguÃ©is por Plataforma
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.1.1', 'AluguÃ©is - Airbnb', 'receita', 'credora', 2, cat_3_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.1.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.1.2', 'AluguÃ©is - Booking.com', 'receita', 'credora', 2, cat_3_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.1.2');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.1.3', 'AluguÃ©is - Decolar', 'receita', 'credora', 2, cat_3_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.1.3');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.1.4', 'AluguÃ©is - Vrbo/HomeAway', 'receita', 'credora', 2, cat_3_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.1.4');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.1.5', 'AluguÃ©is - Expedia', 'receita', 'credora', 2, cat_3_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.1.5');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.1.6', 'AluguÃ©is - Agoda', 'receita', 'credora', 2, cat_3_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.1.6');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.1.7', 'AluguÃ©is - Direto (Site PrÃ³prio)', 'receita', 'credora', 2, cat_3_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.1.7');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.1.8', 'AluguÃ©is - Outras Plataformas', 'receita', 'credora', 2, cat_3_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.1.8');

  -- 3.2 - RECEITA DE SERVIÃ‡OS ADICIONAIS
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '3.2', 'Receita de ServiÃ§os Adicionais', 'receita', 'credora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_3_2_id;
  
  IF cat_3_2_id IS NULL THEN
    SELECT id INTO cat_3_2_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.2' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.2.1', 'Taxa de Limpeza', 'receita', 'credora', 2, cat_3_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.2.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.2.2', 'Taxa de ServiÃ§o', 'receita', 'credora', 2, cat_3_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.2.2');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.2.3', 'Taxa de HÃ³spede Adicional', 'receita', 'credora', 2, cat_3_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.2.3');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.2.4', 'Taxa de Pet', 'receita', 'credora', 2, cat_3_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.2.4');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.2.5', 'Estacionamento', 'receita', 'credora', 2, cat_3_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.2.5');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.2.6', 'ServiÃ§os de Concierge', 'receita', 'credora', 2, cat_3_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.2.6');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.2.7', 'Roupa de Cama e Toalhas', 'receita', 'credora', 2, cat_3_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.2.7');

  -- 3.3 - RECEITA DE COMISSÃ•ES
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '3.3', 'Receita de ComissÃµes', 'receita', 'credora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_3_3_id;
  
  IF cat_3_3_id IS NULL THEN
    SELECT id INTO cat_3_3_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.3' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.3.1', 'ComissÃ£o de GestÃ£o de ImÃ³veis', 'receita', 'credora', 2, cat_3_3_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.3.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.3.2', 'ComissÃ£o de Venda de ImÃ³veis', 'receita', 'credora', 2, cat_3_3_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.3.2');

  -- 3.4 - RECEITA DE VENDAS
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '3.4', 'Receita de Vendas de ImÃ³veis', 'receita', 'credora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING;

  -- 3.5 - OUTRAS RECEITAS OPERACIONAIS
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '3.5', 'Outras Receitas Operacionais', 'receita', 'credora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_3_5_id;
  
  IF cat_3_5_id IS NULL THEN
    SELECT id INTO cat_3_5_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.5' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.5.1', 'Multas e Penalidades', 'receita', 'credora', 2, cat_3_5_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.5.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '3.5.2', 'Receita de DepÃ³sitos NÃ£o Devolvidos', 'receita', 'credora', 2, cat_3_5_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '3.5.2');

  -- ============================================================================
  -- DEDUÃ‡Ã•ES DA RECEITA (4.x)
  -- ============================================================================

  -- 4.1 - IMPOSTOS SOBRE RECEITA
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '4.1', 'Impostos sobre Receita', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_4_1_id;
  
  IF cat_4_1_id IS NULL THEN
    SELECT id INTO cat_4_1_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '4.1' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '4.1.1', 'ISS (Imposto Sobre ServiÃ§os)', 'despesa', 'devedora', 2, cat_4_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '4.1.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '4.1.2', 'ICMS', 'despesa', 'devedora', 2, cat_4_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '4.1.2');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '4.1.3', 'PIS', 'despesa', 'devedora', 2, cat_4_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '4.1.3');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '4.1.4', 'COFINS', 'despesa', 'devedora', 2, cat_4_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '4.1.4');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '4.1.5', 'IRRF (Imposto de Renda Retido na Fonte)', 'despesa', 'devedora', 2, cat_4_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '4.1.5');

  -- 4.2 - COMISSÃ•ES PAGAS A OTAs
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '4.2', 'ComissÃµes Pagas a OTAs', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_4_2_id;
  
  IF cat_4_2_id IS NULL THEN
    SELECT id INTO cat_4_2_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '4.2' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '4.2.1', 'ComissÃ£o Airbnb', 'despesa', 'devedora', 2, cat_4_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '4.2.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '4.2.2', 'ComissÃ£o Booking.com', 'despesa', 'devedora', 2, cat_4_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '4.2.2');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '4.2.3', 'ComissÃ£o Decolar', 'despesa', 'devedora', 2, cat_4_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '4.2.3');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '4.2.4', 'ComissÃ£o Vrbo/HomeAway', 'despesa', 'devedora', 2, cat_4_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '4.2.4');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '4.2.5', 'ComissÃ£o Expedia', 'despesa', 'devedora', 2, cat_4_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '4.2.5');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '4.2.6', 'ComissÃ£o Agoda', 'despesa', 'devedora', 2, cat_4_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '4.2.6');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '4.2.7', 'ComissÃ£o Outras OTAs', 'despesa', 'devedora', 2, cat_4_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '4.2.7');

  -- 4.3 - DESCONTOS CONCEDIDOS
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '4.3', 'Descontos Concedidos', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING;

  -- ============================================================================
  -- CUSTOS OPERACIONAIS (5.x)
  -- ============================================================================

  -- 5.1 - CUSTOS COM LIMPEZA E CONSERVAÃ‡ÃƒO
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '5.1', 'Custos com Limpeza e ConservaÃ§Ã£o', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_5_1_id;
  
  IF cat_5_1_id IS NULL THEN
    SELECT id INTO cat_5_1_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.1' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.1.1', 'ServiÃ§os de Limpeza', 'despesa', 'devedora', 2, cat_5_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.1.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.1.2', 'Material de Limpeza', 'despesa', 'devedora', 2, cat_5_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.1.2');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.1.3', 'Roupa de Cama e Toalhas', 'despesa', 'devedora', 2, cat_5_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.1.3');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.1.4', 'Lavanderia', 'despesa', 'devedora', 2, cat_5_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.1.4');

  -- 5.2 - CUSTOS COM MANUTENÃ‡ÃƒO E REPAROS
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '5.2', 'Custos com ManutenÃ§Ã£o e Reparos', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_5_2_id;
  
  IF cat_5_2_id IS NULL THEN
    SELECT id INTO cat_5_2_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.2' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.2.1', 'ManutenÃ§Ã£o Preventiva', 'despesa', 'devedora', 2, cat_5_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.2.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.2.2', 'Reparos e Corretivas', 'despesa', 'devedora', 2, cat_5_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.2.2');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.2.3', 'MÃ£o de Obra', 'despesa', 'devedora', 2, cat_5_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.2.3');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.2.4', 'Material de ConstruÃ§Ã£o e Reparos', 'despesa', 'devedora', 2, cat_5_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.2.4');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.2.5', 'Equipamentos e Ferramentas', 'despesa', 'devedora', 2, cat_5_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.2.5');

  -- 5.3 - CUSTOS COM CONSUMO (UTILIDADES)
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '5.3', 'Custos com Consumo (Utilidades)', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_5_3_id;
  
  IF cat_5_3_id IS NULL THEN
    SELECT id INTO cat_5_3_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.3' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.3.1', 'Energia ElÃ©trica', 'despesa', 'devedora', 2, cat_5_3_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.3.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.3.2', 'Ãgua e Esgoto', 'despesa', 'devedora', 2, cat_5_3_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.3.2');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.3.3', 'GÃ¡s', 'despesa', 'devedora', 2, cat_5_3_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.3.3');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.3.4', 'Internet e Telefonia', 'despesa', 'devedora', 2, cat_5_3_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.3.4');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.3.5', 'TV a Cabo/Streaming', 'despesa', 'devedora', 2, cat_5_3_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.3.5');

  -- 5.4 - CUSTOS COM CONDOMÃNIO
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '5.4', 'Custos com CondomÃ­nio', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_5_4_id;
  
  IF cat_5_4_id IS NULL THEN
    SELECT id INTO cat_5_4_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.4' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.4.1', 'Taxa de CondomÃ­nio', 'despesa', 'devedora', 2, cat_5_4_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.4.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.4.2', 'Taxa ExtraordinÃ¡ria', 'despesa', 'devedora', 2, cat_5_4_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.4.2');

  -- 5.5 - CUSTOS COM SEGUROS
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '5.5', 'Custos com Seguros', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_5_5_id;
  
  IF cat_5_5_id IS NULL THEN
    SELECT id INTO cat_5_5_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.5' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.5.1', 'Seguro do ImÃ³vel', 'despesa', 'devedora', 2, cat_5_5_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.5.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.5.2', 'Seguro de Responsabilidade Civil', 'despesa', 'devedora', 2, cat_5_5_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.5.2');

  -- 5.6 - CUSTOS COM FORNECIMENTOS E SUPRIMENTOS
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '5.6', 'Custos com Fornecimentos e Suprimentos', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_5_6_id;
  
  IF cat_5_6_id IS NULL THEN
    SELECT id INTO cat_5_6_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.6' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.6.1', 'Produtos de Higiene e Limpeza', 'despesa', 'devedora', 2, cat_5_6_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.6.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.6.2', 'Papel HigiÃªnico e Toalhas', 'despesa', 'devedora', 2, cat_5_6_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.6.2');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '5.6.3', 'CafÃ©, ChÃ¡ e AÃ§Ãºcar', 'despesa', 'devedora', 2, cat_5_6_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '5.6.3');

  -- ============================================================================
  -- DESPESAS OPERACIONAIS (6.x)
  -- ============================================================================

  -- 6.1 - DESPESAS ADMINISTRATIVAS
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '6.1', 'Despesas Administrativas', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_6_1_id;
  
  IF cat_6_1_id IS NULL THEN
    SELECT id INTO cat_6_1_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.1' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.1.1', 'SalÃ¡rios e Encargos', 'despesa', 'devedora', 2, cat_6_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.1.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.1.2', 'Aluguel de EscritÃ³rio', 'despesa', 'devedora', 2, cat_6_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.1.2');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.1.3', 'Material de EscritÃ³rio', 'despesa', 'devedora', 2, cat_6_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.1.3');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.1.4', 'ServiÃ§os ContÃ¡beis', 'despesa', 'devedora', 2, cat_6_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.1.4');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.1.5', 'ServiÃ§os JurÃ­dicos', 'despesa', 'devedora', 2, cat_6_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.1.5');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.1.6', 'HonorÃ¡rios de GestÃ£o', 'despesa', 'devedora', 2, cat_6_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.1.6');

  -- 6.2 - DESPESAS COMERCIALES E MARKETING
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '6.2', 'Despesas Comerciais e Marketing', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_6_2_id;
  
  IF cat_6_2_id IS NULL THEN
    SELECT id INTO cat_6_2_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.2' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.2.1', 'Publicidade e Propaganda', 'despesa', 'devedora', 2, cat_6_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.2.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.2.2', 'Fotografia e VÃ­deo', 'despesa', 'devedora', 2, cat_6_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.2.2');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.2.3', 'Marketing Digital', 'despesa', 'devedora', 2, cat_6_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.2.3');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.2.4', 'Google Ads / Facebook Ads', 'despesa', 'devedora', 2, cat_6_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.2.4');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.2.5', 'ComissÃ£o de Vendas', 'despesa', 'devedora', 2, cat_6_2_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.2.5');

  -- 6.3 - DESPESAS COM TECNOLOGIA
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '6.3', 'Despesas com Tecnologia', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_6_3_id;
  
  IF cat_6_3_id IS NULL THEN
    SELECT id INTO cat_6_3_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.3' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.3.1', 'Software e Sistemas', 'despesa', 'devedora', 2, cat_6_3_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.3.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.3.2', 'Hospedagem e DomÃ­nio', 'despesa', 'devedora', 2, cat_6_3_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.3.2');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.3.3', 'Equipamentos de TI', 'despesa', 'devedora', 2, cat_6_3_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.3.3');

  -- 6.4 - DESPESAS FINANCEIRAS
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '6.4', 'Despesas Financeiras', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_6_4_id;
  
  IF cat_6_4_id IS NULL THEN
    SELECT id INTO cat_6_4_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.4' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.4.1', 'Juros e Encargos', 'despesa', 'devedora', 2, cat_6_4_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.4.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.4.2', 'Tarifas BancÃ¡rias', 'despesa', 'devedora', 2, cat_6_4_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.4.2');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.4.3', 'Taxa de CÃ¢mbio', 'despesa', 'devedora', 2, cat_6_4_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.4.3');

  -- 6.5 - DESPESAS COM IMPOSTOS E TAXAS
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '6.5', 'Despesas com Impostos e Taxas', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_6_5_id;
  
  IF cat_6_5_id IS NULL THEN
    SELECT id INTO cat_6_5_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.5' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.5.1', 'IRPJ (Imposto de Renda Pessoa JurÃ­dica)', 'despesa', 'devedora', 2, cat_6_5_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.5.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.5.2', 'CSLL (ContribuiÃ§Ã£o Social sobre Lucro LÃ­quido)', 'despesa', 'devedora', 2, cat_6_5_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.5.2');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.5.3', 'Taxas e ContribuiÃ§Ãµes', 'despesa', 'devedora', 2, cat_6_5_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.5.3');

  -- 6.6 - OUTRAS DESPESAS OPERACIONAIS
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '6.6', 'Outras Despesas Operacionais', 'despesa', 'devedora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_6_6_id;
  
  IF cat_6_6_id IS NULL THEN
    SELECT id INTO cat_6_6_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.6' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.6.1', 'Despesas com Viagens', 'despesa', 'devedora', 2, cat_6_6_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.6.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.6.2', 'Despesas com Treinamento', 'despesa', 'devedora', 2, cat_6_6_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.6.2');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '6.6.3', 'Despesas Diversas', 'despesa', 'devedora', 2, cat_6_6_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '6.6.3');

  -- ============================================================================
  -- RESULTADO FINANCEIRO (7.x)
  -- ============================================================================

  -- 7.1 - RECEITAS FINANCEIRAS
  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), org_id, '7.1', 'Receitas Financeiras', 'receita', 'credora', 1, NULL, true, NOW(), NOW())
  ON CONFLICT (organization_id, codigo) DO NOTHING
  RETURNING id INTO cat_7_1_id;
  
  IF cat_7_1_id IS NULL THEN
    SELECT id INTO cat_7_1_id FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '7.1' LIMIT 1;
  END IF;

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '7.1.1', 'Rendimentos de AplicaÃ§Ãµes', 'receita', 'credora', 2, cat_7_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '7.1.1');

  INSERT INTO financeiro_categorias (id, organization_id, codigo, nome, tipo, natureza, nivel, parent_id, ativo, created_at, updated_at)
  SELECT gen_random_uuid(), org_id, '7.1.2', 'Juros Recebidos', 'receita', 'credora', 2, cat_7_1_id, true, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM financeiro_categorias WHERE organization_id = org_id AND codigo = '7.1.2');

END;
$$;


ALTER FUNCTION "public"."criar_plano_contas_para_organizacao"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_reservation_property_link"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  prop_org uuid;
BEGIN
  IF NEW.property_id IS NULL THEN
    RAISE EXCEPTION 'RESERVATION_ORPHAN_FORBIDDEN: property_id é obrigatório'
      USING ERRCODE = 'not_null_violation';
  END IF;

  -- ✅ CORREÇÃO: Usar 'properties' em vez de 'anuncios_ultimate'
  SELECT p.organization_id INTO prop_org
  FROM public.properties p
  WHERE p.id = NEW.property_id;

  IF prop_org IS NULL THEN
    RAISE EXCEPTION 'RESERVATION_ORPHAN_FORBIDDEN: property_id não existe em properties (%).', NEW.property_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF prop_org IS DISTINCT FROM NEW.organization_id THEN
    RAISE EXCEPTION 'RESERVATION_ORPHAN_FORBIDDEN: org mismatch (reservation.org=% property.org=%).', NEW.organization_id, prop_org
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_reservation_property_link"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_property_owner"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_profile_id uuid;
  v_slug text;
BEGIN
  IF NEW.owner_id IS NULL OR NEW.owner_id = '00000000-0000-0000-0000-000000000000' THEN
    -- find organization slug
    SELECT slug INTO v_slug FROM public.organizations WHERE id = NEW.organization_id LIMIT 1;

    IF v_slug IS NULL THEN
      -- no organization found; leave owner as is (NULL) so DB can still enforce constraints upstream
      RETURN NEW;
    END IF;

    -- try to find profile for organization
    SELECT id INTO v_profile_id FROM public.profiles WHERE email = concat('org+', v_slug, '@internal.rendizy') LIMIT 1;

    IF v_profile_id IS NULL THEN
      -- create a profile record for the organization
      INSERT INTO public.profiles (id, email, full_name, created_at)
      VALUES (uuid_generate_v4(), concat('org+', v_slug, '@internal.rendizy'), (SELECT name FROM public.organizations WHERE slug = v_slug LIMIT 1), now())
      RETURNING id INTO v_profile_id;
    END IF;

    NEW.owner_id := v_profile_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_property_owner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_single_active_ai_config"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Se estamos ativando uma configuração, desativar todas as outras da mesma organização
  IF NEW.is_active = true THEN
    UPDATE ai_provider_configs
    SET is_active = false
    WHERE organization_id = NEW.organization_id
      AND id != NEW.id
      AND is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_single_active_ai_config"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expand_date_range"("start_date" "date", "end_date" "date") RETURNS TABLE("date" "date")
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT generate_series(start_date, end_date, '1 day'::interval)::DATE;
END;
$$;


ALTER FUNCTION "public"."expand_date_range"("start_date" "date", "end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_instance_by_name"("p_provider" "text", "p_instance_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM public.channel_instances
  WHERE provider = p_provider
    AND instance_name = p_instance_name
    AND deleted_at IS NULL
    AND is_enabled = TRUE
  LIMIT 1;
  
  RETURN v_org_id;
END;
$$;


ALTER FUNCTION "public"."find_instance_by_name"("p_provider" "text", "p_instance_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."find_instance_by_name"("p_provider" "text", "p_instance_name" "text") IS 'Encontra organization_id por provider e instance_name';



CREATE OR REPLACE FUNCTION "public"."generate_operational_tasks_from_reservation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_template RECORD;
  v_checkin_date DATE;
  v_checkout_date DATE;
  v_property_id UUID;
  v_reservation_id TEXT;
  v_org_id UUID;
  v_scheduled_date DATE;
  v_scheduled_time TIME;
  v_task_title TEXT;
  v_days_offset INTEGER;
  v_event_config JSONB;
BEGIN
  -- Pega dados da reserva
  -- Tabela reservations usa colunas diretas: check_in DATE, check_out DATE
  v_org_id := NEW.organization_id;
  v_property_id := NEW.property_id;
  v_reservation_id := NEW.id::TEXT;
  v_checkin_date := NEW.check_in;
  v_checkout_date := NEW.check_out;
  
  -- Se não conseguiu pegar as datas, sai
  IF v_checkin_date IS NULL OR v_checkout_date IS NULL THEN
    RAISE NOTICE 'Reserva % sem datas de check-in/check-out definidas', v_reservation_id;
    RETURN NEW;
  END IF;

  -- Busca templates ativos para esta organização
  FOR v_template IN 
    SELECT * FROM operational_task_templates 
    WHERE organization_id = v_org_id 
      AND is_active = true 
      AND trigger_type = 'event'
      AND (
        property_scope = 'all'
        OR (property_scope = 'selected' AND v_property_id = ANY(property_ids))
      )
  LOOP
    v_event_config := v_template.event_trigger;
    
    -- Verifica qual evento dispara o template
    CASE v_event_config->>'event'
      WHEN 'checkin_day' THEN
        v_days_offset := COALESCE((v_event_config->>'days_offset')::INTEGER, 0);
        v_scheduled_date := v_checkin_date + v_days_offset;
        v_task_title := v_template.name || ' - Reserva ' || v_reservation_id;
        
      WHEN 'checkout_day' THEN
        v_days_offset := COALESCE((v_event_config->>'days_offset')::INTEGER, 0);
        v_scheduled_date := v_checkout_date + v_days_offset;
        v_task_title := v_template.name || ' - Reserva ' || v_reservation_id;
        
      WHEN 'reservation_confirmed' THEN
        v_days_offset := COALESCE((v_event_config->>'days_offset')::INTEGER, 0);
        v_scheduled_date := CURRENT_DATE + v_days_offset;
        v_task_title := v_template.name || ' - Reserva ' || v_reservation_id;
        
      WHEN 'checkin_approaching' THEN
        -- X dias antes do check-in
        v_days_offset := COALESCE((v_event_config->>'days_offset')::INTEGER, -1);
        v_scheduled_date := v_checkin_date + v_days_offset;
        v_task_title := v_template.name || ' - Reserva ' || v_reservation_id;
        
      ELSE
        -- Evento desconhecido, pula
        CONTINUE;
    END CASE;
    
    -- Define horário
    IF v_event_config->>'time_mode' = 'fixed' THEN
      v_scheduled_time := (v_event_config->>'fixed_time')::TIME;
    ELSE
      v_scheduled_time := '09:00'::TIME;
    END IF;
    
    -- Verifica se já existe tarefa para este template/reserva
    IF NOT EXISTS (
      SELECT 1 FROM operational_tasks 
      WHERE template_id = v_template.id 
        AND reservation_id = v_reservation_id
        AND triggered_by_event = v_event_config->>'event'
    ) THEN
      -- Cria a tarefa operacional
      INSERT INTO operational_tasks (
        organization_id,
        template_id,
        title,
        description,
        instructions,
        status,
        priority,
        assignee_id,
        team_id,
        property_id,
        reservation_id,
        scheduled_date,
        scheduled_time,
        triggered_by_event,
        triggered_by_entity_id,
        metadata,
        created_at
      ) VALUES (
        v_org_id,
        v_template.id,
        v_task_title,
        v_template.description,
        v_template.instructions,
        'pending',
        v_template.priority,
        v_template.assigned_user_id,
        v_template.assigned_team_id,
        v_property_id,
        v_reservation_id,
        v_scheduled_date,
        v_scheduled_time,
        v_event_config->>'event',
        v_reservation_id,
        jsonb_build_object(
          'checkin_date', v_checkin_date,
          'checkout_date', v_checkout_date,
          'generated_at', NOW(),
          'trigger_template', v_template.name
        ),
        NOW()
      );
      
      RAISE NOTICE 'Tarefa operacional criada: % para reserva %', v_task_title, v_reservation_id;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_operational_tasks_from_reservation"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_operational_tasks_from_reservation"() IS 'Trigger function que cria tarefas operacionais automaticamente quando uma reserva é criada';



CREATE OR REPLACE FUNCTION "public"."generate_scheduled_operational_tasks"("p_organization_id" "uuid", "p_date" "date" DEFAULT CURRENT_DATE) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_template RECORD;
  v_property RECORD;
  v_count INTEGER := 0;
  v_schedule JSONB;
  v_should_create BOOLEAN;
  v_day_of_week INTEGER;
  v_day_of_month INTEGER;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date);
  v_day_of_month := EXTRACT(DAY FROM p_date);
  
  FOR v_template IN 
    SELECT * FROM operational_task_templates 
    WHERE organization_id = p_organization_id 
      AND is_active = true 
      AND trigger_type = 'scheduled'
  LOOP
    v_schedule := v_template.schedule_config;
    v_should_create := false;
    
    -- Verifica frequência
    CASE v_schedule->>'frequency'
      WHEN 'daily' THEN
        v_should_create := true;
      WHEN 'weekly' THEN
        IF v_schedule->'weekly_days' ? v_day_of_week::TEXT THEN
          v_should_create := true;
        END IF;
      WHEN 'biweekly' THEN
        IF v_schedule->'weekly_days' ? v_day_of_week::TEXT AND EXTRACT(WEEK FROM p_date)::INTEGER % 2 = 0 THEN
          v_should_create := true;
        END IF;
      WHEN 'monthly' THEN
        IF (v_schedule->>'monthly_day')::INTEGER = v_day_of_month THEN
          v_should_create := true;
        END IF;
      WHEN 'quarterly' THEN
        IF EXTRACT(MONTH FROM p_date)::INTEGER IN (1, 4, 7, 10) AND (v_schedule->>'monthly_day')::INTEGER = v_day_of_month THEN
          v_should_create := true;
        END IF;
      ELSE
        v_should_create := false;
    END CASE;
    
    IF v_should_create THEN
      -- Cria tarefa para cada imóvel no escopo
      FOR v_property IN
        SELECT id, data->>'name' as name FROM properties 
        WHERE organization_id = p_organization_id
          AND (
            v_template.property_scope = 'all'
            OR (v_template.property_scope = 'selected' AND id = ANY(v_template.property_ids))
          )
      LOOP
        -- Verifica se já existe tarefa para este template/data/imóvel
        IF NOT EXISTS (
          SELECT 1 FROM operational_tasks 
          WHERE template_id = v_template.id 
            AND scheduled_date = p_date 
            AND property_id = v_property.id
        ) THEN
          -- Cria a tarefa
          INSERT INTO operational_tasks (
            organization_id, template_id, title, description, instructions,
            priority, assignee_id, team_id, property_id,
            scheduled_date, scheduled_time,
            created_at
          ) VALUES (
            p_organization_id, v_template.id, 
            v_template.name || COALESCE(' - ' || v_property.name, ''),
            v_template.description, v_template.instructions,
            v_template.priority, v_template.assigned_user_id, v_template.assigned_team_id, v_property.id,
            p_date, (v_schedule->>'time')::TIME,
            NOW()
          );
          v_count := v_count + 1;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
  
  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."generate_scheduled_operational_tasks"("p_organization_id" "uuid", "p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_secure_token"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN encode(gen_random_bytes(64), 'hex');
END;
$$;


ALTER FUNCTION "public"."generate_secure_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_tasks_for_existing_reservations"("p_organization_id" "uuid", "p_from_date" "date" DEFAULT CURRENT_DATE, "p_to_date" "date" DEFAULT (CURRENT_DATE + '30 days'::interval)) RETURNS TABLE("reservation_id" "text", "tasks_created" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_reservation RECORD;
  v_template RECORD;
  v_count INTEGER;
  v_total INTEGER := 0;
  v_checkin_date DATE;
  v_checkout_date DATE;
  v_scheduled_date DATE;
  v_scheduled_time TIME;
  v_event_config JSONB;
  v_days_offset INTEGER;
BEGIN
  -- Itera sobre reservas no período (colunas diretas check_in/check_out)
  FOR v_reservation IN 
    SELECT * FROM reservations 
    WHERE organization_id = p_organization_id
      AND status NOT IN ('cancelled')
      AND (
        check_in BETWEEN p_from_date AND p_to_date
        OR check_out BETWEEN p_from_date AND p_to_date
      )
  LOOP
    v_count := 0;
    v_checkin_date := v_reservation.check_in;
    v_checkout_date := v_reservation.check_out;
    
    -- Itera sobre templates ativos
    FOR v_template IN 
      SELECT * FROM operational_task_templates 
      WHERE organization_id = p_organization_id 
        AND is_active = true 
        AND trigger_type = 'event'
    LOOP
      v_event_config := v_template.event_trigger;
      
      -- Calcula data baseado no evento
      CASE v_event_config->>'event'
        WHEN 'checkin_day' THEN
          v_days_offset := COALESCE((v_event_config->>'days_offset')::INTEGER, 0);
          v_scheduled_date := v_checkin_date + v_days_offset;
        WHEN 'checkout_day' THEN
          v_days_offset := COALESCE((v_event_config->>'days_offset')::INTEGER, 0);
          v_scheduled_date := v_checkout_date + v_days_offset;
        ELSE
          CONTINUE;
      END CASE;
      
      -- Define horário
      IF v_event_config->>'time_mode' = 'fixed' THEN
        v_scheduled_time := (v_event_config->>'fixed_time')::TIME;
      ELSE
        v_scheduled_time := '09:00'::TIME;
      END IF;
      
      -- Verifica se já existe
      IF NOT EXISTS (
        SELECT 1 FROM operational_tasks 
        WHERE template_id = v_template.id 
          AND reservation_id = v_reservation.id::TEXT
          AND triggered_by_event = v_event_config->>'event'
      ) THEN
        -- Cria tarefa
        INSERT INTO operational_tasks (
          organization_id, template_id, title, description, instructions,
          status, priority, assignee_id, team_id, property_id, reservation_id,
          scheduled_date, scheduled_time, triggered_by_event, triggered_by_entity_id,
          created_at
        ) VALUES (
          p_organization_id, v_template.id,
          v_template.name || ' - Reserva ' || v_reservation.id::TEXT,
          v_template.description, v_template.instructions,
          'pending', v_template.priority, v_template.assigned_user_id, v_template.assigned_team_id,
          v_reservation.property_id, v_reservation.id::TEXT,
          v_scheduled_date, v_scheduled_time,
          v_event_config->>'event', v_reservation.id::TEXT,
          NOW()
        );
        
        v_count := v_count + 1;
        v_total := v_total + 1;
      END IF;
    END LOOP;
    
    reservation_id := v_reservation.id::TEXT;
    tasks_created := v_count;
    RETURN NEXT;
  END LOOP;
  
  RAISE NOTICE 'Total de tarefas criadas: %', v_total;
END;
$$;


ALTER FUNCTION "public"."generate_tasks_for_existing_reservations"("p_organization_id" "uuid", "p_from_date" "date", "p_to_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_tasks_for_existing_reservations"("p_organization_id" "uuid", "p_from_date" "date", "p_to_date" "date") IS 'RPC para gerar tarefas retroativamente para reservas já existentes no sistema';



CREATE OR REPLACE FUNCTION "public"."generate_unique_short_id"("p_organization_id" "uuid", "p_length" integer DEFAULT 6) RETURNS character varying
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result VARCHAR;
    attempts INTEGER := 0;
    exists_count INTEGER;
BEGIN
    LOOP
        -- Gerar ID aleatório
        result := '';
        FOR i IN 1..p_length LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
        END LOOP;
        
        -- Verificar se já existe
        SELECT COUNT(*) INTO exists_count
        FROM short_ids
        WHERE organization_id = p_organization_id
        AND short_id = result;
        
        EXIT WHEN exists_count = 0;
        
        attempts := attempts + 1;
        IF attempts > 100 THEN
            RAISE EXCEPTION 'Could not generate unique short_id after 100 attempts';
        END IF;
    END LOOP;
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."generate_unique_short_id"("p_organization_id" "uuid", "p_length" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_calendar_rule_for_date"("p_organization_id" "uuid", "p_property_id" "uuid", "p_date" "date", "p_apply_batch_rules" boolean DEFAULT false) RETURNS TABLE("condition_percent" numeric, "min_nights" integer, "restriction" "text", "is_batch_rule" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH ranked_rules AS (
    SELECT 
      r.condition_percent,
      r.min_nights,
      r.restriction,
      r.property_id IS NULL AS is_batch_rule,
      CASE 
        -- Se apply_batch_rules=true E regra é batch, dá prioridade máxima
        WHEN p_apply_batch_rules AND r.property_id IS NULL THEN 1000 + r.priority
        -- Regras específicas do imóvel têm prioridade maior que batch
        WHEN r.property_id IS NOT NULL THEN 100 + r.priority
        -- Regras batch têm prioridade menor
        ELSE r.priority
      END AS effective_priority
    FROM calendar_pricing_rules r
    WHERE r.organization_id = p_organization_id
      AND p_date BETWEEN r.start_date AND r.end_date
      AND (r.property_id = p_property_id OR r.property_id IS NULL)
    ORDER BY effective_priority DESC
    LIMIT 1
  )
  SELECT 
    ranked_rules.condition_percent,
    ranked_rules.min_nights,
    ranked_rules.restriction,
    ranked_rules.is_batch_rule
  FROM ranked_rules;
END;
$$;


ALTER FUNCTION "public"."get_calendar_rule_for_date"("p_organization_id" "uuid", "p_property_id" "uuid", "p_date" "date", "p_apply_batch_rules" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_calendar_rule_for_date"("p_organization_id" "uuid", "p_property_id" "uuid", "p_date" "date", "p_apply_batch_rules" boolean) IS 'Retorna a regra de calendário aplicável para uma data específica. Se p_apply_batch_rules=true, regras em lote têm prioridade sobre regras do imóvel.';



CREATE OR REPLACE FUNCTION "public"."get_default_rate_plan_id"("p_property_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
    SELECT id FROM rate_plans
    WHERE property_id = p_property_id
        AND is_default = true
        AND is_active = true
    ORDER BY priority ASC
    LIMIT 1;
    $$;


ALTER FUNCTION "public"."get_default_rate_plan_id"("p_property_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_default_rate_plan_id"("p_property_id" "uuid") IS 'Retorna o ID do rate_plan padrão (STANDARD) de uma property';



CREATE OR REPLACE FUNCTION "public"."get_hosting_provider_token"("site_id" "uuid", "provider" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  token TEXT;
BEGIN
  SELECT hosting_providers->provider->>'access_token'
  INTO token
  FROM client_sites
  WHERE id = site_id;
  
  RETURN token;
END;
$$;


ALTER FUNCTION "public"."get_hosting_provider_token"("site_id" "uuid", "provider" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_or_create_conversation"("p_organization_id" "uuid", "p_channel_type" "text", "p_external_id" "text", "p_contact_name" "text" DEFAULT NULL::"text", "p_contact_identifier" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_conversation_id UUID;
BEGIN
    -- Tentar encontrar conversa existente
    SELECT id INTO v_conversation_id
    FROM chat_conversations
    WHERE organization_id = p_organization_id
      AND channel_type = p_channel_type
      AND external_id = p_external_id;
    
    -- Se não existir, criar nova
    IF v_conversation_id IS NULL THEN
        INSERT INTO chat_conversations (
            organization_id,
            channel_type,
            external_id,
            contact_name,
            contact_identifier
        ) VALUES (
            p_organization_id,
            p_channel_type,
            p_external_id,
            COALESCE(p_contact_name, 'Desconhecido'),
            COALESCE(p_contact_identifier, p_external_id)
        )
        RETURNING id INTO v_conversation_id;
    END IF;
    
    RETURN v_conversation_id;
END;
$$;


ALTER FUNCTION "public"."get_or_create_conversation"("p_organization_id" "uuid", "p_channel_type" "text", "p_external_id" "text", "p_contact_name" "text", "p_contact_identifier" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_or_create_marketplace_conversation"("p_my_org_id" "uuid", "p_target_org_id" "uuid", "p_related_type" "text" DEFAULT NULL::"text", "p_related_id" "uuid" DEFAULT NULL::"uuid", "p_title" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_conversation_id UUID;
  v_org_a UUID;
  v_org_b UUID;
BEGIN
  -- Ordenar IDs para consistência
  IF p_my_org_id < p_target_org_id THEN
    v_org_a := p_my_org_id;
    v_org_b := p_target_org_id;
  ELSE
    v_org_a := p_target_org_id;
    v_org_b := p_my_org_id;
  END IF;
  
  -- Verificar se já existe
  SELECT id INTO v_conversation_id
  FROM re_marketplace_conversations
  WHERE org_a_id = v_org_a AND org_b_id = v_org_b
    AND (
      (p_related_type IS NULL AND related_type IS NULL)
      OR (related_type = p_related_type AND related_id = p_related_id)
    )
  LIMIT 1;
  
  -- Se não existe, criar
  IF v_conversation_id IS NULL THEN
    INSERT INTO re_marketplace_conversations (
      org_a_id, org_b_id, related_type, related_id, title
    ) VALUES (
      v_org_a, v_org_b, p_related_type, p_related_id, p_title
    )
    RETURNING id INTO v_conversation_id;
  END IF;
  
  RETURN v_conversation_id;
END;
$$;


ALTER FUNCTION "public"."get_or_create_marketplace_conversation"("p_my_org_id" "uuid", "p_target_org_id" "uuid", "p_related_type" "text", "p_related_id" "uuid", "p_title" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_or_create_marketplace_conversation"("p_my_org_id" "uuid", "p_target_org_id" "uuid", "p_related_type" "text", "p_related_id" "uuid", "p_title" "text") IS 'Retorna ID de conversa existente ou cria nova se não existir';



CREATE OR REPLACE FUNCTION "public"."get_property_responsibility_stats"("p_organization_id" "uuid") RETURNS TABLE("total_properties" bigint, "cleaning_by_company" bigint, "cleaning_by_owner" bigint, "maintenance_by_company" bigint, "maintenance_by_owner" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_properties,
    COUNT(*) FILTER (WHERE cleaning_responsibility = 'company')::BIGINT as cleaning_by_company,
    COUNT(*) FILTER (WHERE cleaning_responsibility = 'owner')::BIGINT as cleaning_by_owner,
    COUNT(*) FILTER (WHERE maintenance_responsibility = 'company')::BIGINT as maintenance_by_company,
    COUNT(*) FILTER (WHERE maintenance_responsibility = 'owner')::BIGINT as maintenance_by_owner
  FROM properties
  WHERE organization_id = p_organization_id;
END;
$$;


ALTER FUNCTION "public"."get_property_responsibility_stats"("p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_stay_total_price"("p_property_id" "uuid", "p_check_in" "date", "p_check_out" "date", "p_rate_plan_id" "uuid" DEFAULT NULL::"uuid") RETURNS numeric
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  v_result stay_price_result;
BEGIN
  v_result := calculate_stay_price(p_property_id, p_check_in, p_check_out, p_rate_plan_id);
  RETURN COALESCE(v_result.total_price, 0);
END;
$$;


ALTER FUNCTION "public"."get_stay_total_price"("p_property_id" "uuid", "p_check_in" "date", "p_check_out" "date", "p_rate_plan_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_stay_total_price"("p_property_id" "uuid", "p_check_in" "date", "p_check_out" "date", "p_rate_plan_id" "uuid") IS 'Wrapper simples que retorna apenas o valor total da estadia.';



CREATE OR REPLACE FUNCTION "public"."get_tasks_with_hierarchy"("p_organization_id" "uuid", "p_parent_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "title" character varying, "status" character varying, "priority" character varying, "parent_id" "uuid", "depth" integer, "assignee_id" "uuid", "assignee_name" "text", "due_date" timestamp with time zone, "subtask_count" bigint, "completed_subtask_count" bigint, "display_order" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE task_tree AS (
    -- Base: tarefas raiz
    SELECT 
      t.id,
      t.title,
      t.status,
      t.priority,
      t.parent_id,
      0 as depth,
      t.assignee_id,
      t.due_date,
      t.display_order
    FROM crm_tasks t
    WHERE t.organization_id = p_organization_id
      AND (p_parent_id IS NULL AND t.parent_id IS NULL OR t.parent_id = p_parent_id)
    
    UNION ALL
    
    -- Recursivo: subtarefas
    SELECT 
      t.id,
      t.title,
      t.status,
      t.priority,
      t.parent_id,
      tt.depth + 1,
      t.assignee_id,
      t.due_date,
      t.display_order
    FROM crm_tasks t
    JOIN task_tree tt ON t.parent_id = tt.id
    WHERE tt.depth < 5 -- Limite de profundidade
  )
  SELECT 
    tt.id,
    tt.title::VARCHAR,
    tt.status::VARCHAR,
    tt.priority::VARCHAR,
    tt.parent_id,
    tt.depth::INTEGER,
    tt.assignee_id,
    u.name::TEXT as assignee_name,
    tt.due_date,
    (SELECT COUNT(*) FROM crm_tasks st WHERE st.parent_id = tt.id)::BIGINT,
    (SELECT COUNT(*) FROM crm_tasks st WHERE st.parent_id = tt.id AND st.status = 'completed')::BIGINT,
    tt.display_order::INTEGER
  FROM task_tree tt
  LEFT JOIN users u ON tt.assignee_id = u.id
  ORDER BY tt.depth, tt.display_order;
END;
$$;


ALTER FUNCTION "public"."get_tasks_with_hierarchy"("p_organization_id" "uuid", "p_parent_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.users (id, email, raw_user_meta_data)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hash_password"("password" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Hash simples para MVP (substituir por bcrypt em produção)
  RETURN encode(digest('rendizy_salt_' || password, 'sha256'), 'hex');
END;
$$;


ALTER FUNCTION "public"."hash_password"("password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_template_use_count"("template_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE crm_templates 
  SET 
    use_count = use_count + 1,
    last_used_at = NOW()
  WHERE id = template_id;
END;
$$;


ALTER FUNCTION "public"."increment_template_use_count"("template_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_reservation_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_change_type TEXT;
  v_old_vals JSONB;
  v_new_vals JSONB;
BEGIN
  -- Determinar tipo de mudança
  IF TG_OP = 'INSERT' THEN
    v_change_type := 'created';
    v_old_vals := NULL;
    v_new_vals := to_jsonb(NEW);
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'confirmed' THEN
        v_change_type := 'confirmed';
      ELSIF NEW.status = 'checked_in' THEN
        v_change_type := 'checked_in';
      ELSIF NEW.status = 'checked_out' THEN
        v_change_type := 'checked_out';
      ELSIF NEW.status = 'cancelled' THEN
        v_change_type := 'cancelled';
      ELSIF NEW.status = 'no_show' THEN
        v_change_type := 'no_show';
      ELSE
        v_change_type := 'status_changed';
      END IF;
      
    -- Date changes
    ELSIF OLD.check_in IS DISTINCT FROM NEW.check_in 
       OR OLD.check_out IS DISTINCT FROM NEW.check_out THEN
      v_change_type := 'dates_changed';
      
    -- Guest changes
    ELSIF OLD.guests_adults IS DISTINCT FROM NEW.guests_adults 
       OR OLD.guests_children IS DISTINCT FROM NEW.guests_children THEN
      v_change_type := 'guests_changed';
      
    -- Price changes
    ELSIF OLD.pricing_total IS DISTINCT FROM NEW.pricing_total THEN
      v_change_type := 'price_adjusted';
      
    -- Payment changes
    ELSIF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
      IF NEW.payment_status = 'paid' THEN
        v_change_type := 'payment_received';
      ELSIF NEW.payment_status = 'refunded' THEN
        v_change_type := 'payment_refunded';
      ELSE
        v_change_type := 'modified';
      END IF;
      
    ELSE
      v_change_type := 'modified';
    END IF;
    
    -- Capturar valores anteriores e novos
    v_old_vals := jsonb_build_object(
      'status', OLD.status,
      'check_in', OLD.check_in,
      'check_out', OLD.check_out,
      'guests_adults', OLD.guests_adults,
      'guests_children', OLD.guests_children,
      'pricing_total', OLD.pricing_total,
      'payment_status', OLD.payment_status
    );
    v_new_vals := jsonb_build_object(
      'status', NEW.status,
      'check_in', NEW.check_in,
      'check_out', NEW.check_out,
      'guests_adults', NEW.guests_adults,
      'guests_children', NEW.guests_children,
      'pricing_total', NEW.pricing_total,
      'payment_status', NEW.payment_status
    );
  END IF;
  
  -- Inserir no histórico
  INSERT INTO reservation_history (
    reservation_id,
    change_type,
    changed_by_type,
    old_values,
    new_values,
    source
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    v_change_type,
    'system',
    v_old_vals,
    v_new_vals,
    'trigger'
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_reservation_change"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_reservation_change"() IS '[OTA-UNIVERSAL] Trigger function para audit log de reservas';



CREATE OR REPLACE FUNCTION "public"."log_reservation_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD IS DISTINCT FROM NEW THEN
    INSERT INTO reservation_history (
      reservation_id,
      change_type,
      change_reason,
      old_values,
      new_values,
      changed_by_type,
      source
    ) VALUES (
      NEW.id,
      CASE 
        WHEN OLD.status IS DISTINCT FROM NEW.status THEN NEW.status
        WHEN OLD.check_in IS DISTINCT FROM NEW.check_in OR OLD.check_out IS DISTINCT FROM NEW.check_out THEN 'dates_changed'
        WHEN OLD.pricing_total IS DISTINCT FROM NEW.pricing_total THEN 'price_changed'
        ELSE 'modified'
      END,
      'Reserva atualizada automaticamente',
      to_jsonb(OLD),
      to_jsonb(NEW),
      'system',
      'trigger'
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_reservation_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lookup_organization_id_by_imobiliaria_id"("p_imobiliaria_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  v_organization_id UUID;
BEGIN
  -- Buscar organizationId via legacy_imobiliaria_id
  SELECT id INTO v_organization_id
  FROM organizations
  WHERE legacy_imobiliaria_id = p_imobiliaria_id
  LIMIT 1;
  
  -- Se não encontrou, retornar NULL
  RETURN v_organization_id;
END;
$$;


ALTER FUNCTION "public"."lookup_organization_id_by_imobiliaria_id"("p_imobiliaria_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."lookup_organization_id_by_imobiliaria_id"("p_imobiliaria_id" "text") IS 'Lookup function: imobiliariaId (TEXT do KV Store) → organizationId (UUID do SQL). Retorna NULL se não encontrado.';



CREATE OR REPLACE FUNCTION "public"."mark_marketplace_conversation_as_read"("p_conversation_id" "uuid", "p_profile_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_org_id UUID;
  v_is_org_a BOOLEAN;
BEGIN
  -- Pegar org do usuário (usando tabela users)
  SELECT organization_id INTO v_org_id FROM users WHERE id = p_profile_id;
  
  -- Verificar se é org_a ou org_b
  SELECT org_a_id = v_org_id INTO v_is_org_a 
  FROM re_marketplace_conversations 
  WHERE id = p_conversation_id;
  
  -- Marcar mensagens como lidas
  UPDATE re_marketplace_messages
  SET read_at = NOW(), read_by_profile_id = p_profile_id
  WHERE conversation_id = p_conversation_id
    AND sender_org_id != v_org_id
    AND read_at IS NULL;
  
  -- Zerar contador de unread
  IF v_is_org_a THEN
    UPDATE re_marketplace_conversations
    SET unread_count_org_a = 0
    WHERE id = p_conversation_id;
  ELSE
    UPDATE re_marketplace_conversations
    SET unread_count_org_b = 0
    WHERE id = p_conversation_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."mark_marketplace_conversation_as_read"("p_conversation_id" "uuid", "p_profile_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."mark_marketplace_conversation_as_read"("p_conversation_id" "uuid", "p_profile_id" "uuid") IS 'Marca todas as mensagens de uma conversa como lidas para o usuário';



CREATE OR REPLACE FUNCTION "public"."migrate_guest_to_crm_contact"("p_guest_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_guest RECORD;
  v_existing_contact UUID;
  v_new_contact_id UUID;
BEGIN
  -- Buscar guest
  SELECT * INTO v_guest FROM guests WHERE id = p_guest_id;
  
  IF v_guest IS NULL THEN
    RAISE EXCEPTION 'Guest não encontrado: %', p_guest_id;
  END IF;
  
  -- Verificar se já existe contato com mesmo email
  IF v_guest.email IS NOT NULL THEN
    SELECT id INTO v_existing_contact 
    FROM crm_contacts 
    WHERE organization_id = v_guest.organization_id 
      AND email = v_guest.email
    LIMIT 1;
    
    IF v_existing_contact IS NOT NULL THEN
      -- Já existe, apenas retornar o ID existente
      RETURN v_existing_contact;
    END IF;
  END IF;
  
  -- Criar novo contato
  INSERT INTO crm_contacts (
    organization_id,
    first_name,
    last_name,
    email,
    phone,
    mobile,
    contact_type,
    is_type_locked,
    source,
    source_detail,
    notes,
    custom_fields,
    created_at,
    updated_at
  ) VALUES (
    v_guest.organization_id,
    SPLIT_PART(v_guest.name, ' ', 1), -- Primeiro nome
    NULLIF(TRIM(SUBSTRING(v_guest.name FROM POSITION(' ' IN v_guest.name))), ''), -- Resto do nome
    v_guest.email,
    v_guest.phone,
    v_guest.phone, -- mobile = phone
    'guest',
    true, -- Tipo bloqueado
    'RESERVA',
    'Migrado de guests',
    v_guest.notes,
    COALESCE(v_guest.metadata, '{}'::jsonb),
    v_guest.created_at,
    NOW()
  ) RETURNING id INTO v_new_contact_id;
  
  RETURN v_new_contact_id;
END;
$$;


ALTER FUNCTION "public"."migrate_guest_to_crm_contact"("p_guest_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."parse_phone_number"("phone_raw" "text") RETURNS TABLE("country_code" "text", "area_code" "text", "number_only" "text")
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  cleaned TEXT;
BEGIN
  -- Remove caracteres não numéricos
  cleaned := regexp_replace(phone_raw, '[^0-9]', '', 'g');
  
  -- Telefone brasileiro com código de país (55DDNNNNNNNNN)
  IF length(cleaned) >= 12 AND cleaned LIKE '55%' THEN
    RETURN QUERY SELECT 
      '55'::TEXT,
      substring(cleaned from 3 for 2),
      substring(cleaned from 5);
  -- Telefone brasileiro sem código de país (DDNNNNNNNNN)
  ELSIF length(cleaned) >= 10 AND length(cleaned) <= 11 THEN
    RETURN QUERY SELECT 
      '55'::TEXT,
      substring(cleaned from 1 for 2),
      substring(cleaned from 3);
  -- Outros formatos - retorna como está
  ELSE
    RETURN QUERY SELECT 
      NULL::TEXT,
      NULL::TEXT,
      cleaned;
  END IF;
END;
$$;


ALTER FUNCTION "public"."parse_phone_number"("phone_raw" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_properties_staysnet_placeholder"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."prevent_properties_staysnet_placeholder"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."prevent_properties_staysnet_placeholder"() IS '[2026-01-31] Bloqueia imóveis placeholder: sem título, "Propriedade Stays.net xxx", "Property <uuid>"';



CREATE OR REPLACE FUNCTION "public"."process_ota_webhook"("webhook_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_webhook RECORD;
  v_result JSONB;
BEGIN
  -- Buscar webhook
  SELECT * INTO v_webhook FROM ota_webhooks WHERE id = webhook_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Webhook not found');
  END IF;
  
  -- Marcar como em processamento
  UPDATE ota_webhooks 
  SET 
    processing_attempts = processing_attempts + 1,
    last_attempt_at = NOW()
  WHERE id = webhook_id;
  
  -- Lógica de processamento por OTA e tipo de evento
  -- (implementar no application layer, mas registrar resultado aqui)
  
  RETURN jsonb_build_object('success', true, 'webhook_id', webhook_id);
END;
$$;


ALTER FUNCTION "public"."process_ota_webhook"("webhook_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."publish_anuncio"("p_draft_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_property record;
  v_slug text;
BEGIN
  -- Recuperar do properties
  SELECT * INTO v_property FROM public.properties WHERE id = p_draft_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Imóvel não encontrado: %', p_draft_id;
  END IF;

  IF v_property.completion_percentage < 100 THEN
    RAISE EXCEPTION 'Imóvel incompleto (% %%)', v_property.completion_percentage;
  END IF;

  -- Gerar slug único
  v_slug := lower(regexp_replace(COALESCE(v_property.data->>'title', 'imovel'), '[^a-zA-Z0-9]+', '-', 'g')) 
            || '-' || substring(v_property.id::text from 1 for 8);

  -- Atualizar status para published
  UPDATE public.properties
    SET status = 'published',
        data = data || jsonb_build_object('slug', v_slug),
        updated_at = now()
    WHERE id = p_draft_id;

  RETURN p_draft_id;
END;
$$;


ALTER FUNCTION "public"."publish_anuncio"("p_draft_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."publish_anuncio"("p_draft_id" "uuid") IS '[CANÔNICO 2026-01-06] Publica imóvel (properties)';



CREATE OR REPLACE FUNCTION "public"."registrar_campo_financeiro"("p_organization_id" "uuid", "p_modulo" "text", "p_campo_codigo" "text", "p_campo_nome" "text", "p_campo_tipo" "text", "p_descricao" "text" DEFAULT NULL::"text", "p_registered_by_module" "text" DEFAULT NULL::"text", "p_obrigatorio" boolean DEFAULT false) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_campo_id UUID;
BEGIN
  -- Verificar se campo já existe
  SELECT id INTO v_campo_id
  FROM financeiro_campo_plano_contas_mapping
  WHERE organization_id = p_organization_id
    AND modulo = p_modulo
    AND campo_codigo = p_campo_codigo;
  
  IF v_campo_id IS NOT NULL THEN
    -- Atualizar campo existente
    UPDATE financeiro_campo_plano_contas_mapping
    SET campo_nome = p_campo_nome,
        campo_tipo = p_campo_tipo,
        descricao = COALESCE(p_descricao, descricao),
        is_system_field = true,
        registered_by_module = COALESCE(p_registered_by_module, registered_by_module),
        obrigatorio = p_obrigatorio,
        updated_at = NOW()
    WHERE id = v_campo_id;
    
    RETURN v_campo_id;
  ELSE
    -- Criar novo campo
    INSERT INTO financeiro_campo_plano_contas_mapping (
      organization_id,
      modulo,
      campo_codigo,
      campo_nome,
      campo_tipo,
      descricao,
      is_system_field,
      registered_by_module,
      obrigatorio,
      ativo,
      created_at,
      updated_at
    )
    VALUES (
      p_organization_id,
      p_modulo,
      p_campo_codigo,
      p_campo_nome,
      p_campo_tipo,
      p_descricao,
      true, -- Sempre é campo do sistema quando registrado via função
      p_registered_by_module,
      p_obrigatorio,
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_campo_id;
    
    RETURN v_campo_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."registrar_campo_financeiro"("p_organization_id" "uuid", "p_modulo" "text", "p_campo_codigo" "text", "p_campo_nome" "text", "p_campo_tipo" "text", "p_descricao" "text", "p_registered_by_module" "text", "p_obrigatorio" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."registrar_campo_financeiro"("p_organization_id" "uuid", "p_modulo" "text", "p_campo_codigo" "text", "p_campo_nome" "text", "p_campo_tipo" "text", "p_descricao" "text", "p_registered_by_module" "text", "p_obrigatorio" boolean) IS 'Registra ou atualiza um campo financeiro do sistema. Se já existir, atualiza. Se não existir, cria.';



CREATE OR REPLACE FUNCTION "public"."restore_version"("p_version_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_version record;
  v_result jsonb;
BEGIN
  -- Verificar se tabela de versões existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'anuncios_versions') THEN
    RAISE EXCEPTION 'Tabela anuncios_versions não existe';
  END IF;

  -- Recuperar versão
  SELECT * INTO v_version FROM public.anuncios_versions WHERE id = p_version_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Versão não encontrada: %', p_version_id;
  END IF;

  -- Restaurar dados em properties
  UPDATE public.properties
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
  FROM public.properties WHERE id = v_version.anuncio_id;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."restore_version"("p_version_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."restore_version"("p_version_id" "uuid") IS '[CANÔNICO 2026-01-06] Restaura versão em properties';



CREATE OR REPLACE FUNCTION "public"."retry_failed_changes"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_count int := 0;
  v_change record;
BEGIN
  -- Verificar se tabela existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'anuncios_field_changes') THEN
    RETURN 0;
  END IF;

  -- Reprocessar mudanças com status 'failed' ou 'pending'
  FOR v_change IN 
    SELECT * FROM public.anuncios_field_changes 
    WHERE status IN ('pending', 'failed')
    ORDER BY created_at
    LIMIT 100
  LOOP
    BEGIN
      -- Aplicar mudança em properties
      UPDATE public.properties
        SET data = jsonb_set(COALESCE(data, '{}'::jsonb), 
                             string_to_array(v_change.field, '.'), 
                             v_change.value, true),
            updated_at = now()
        WHERE id = v_change.anuncio_id;

      -- Marcar como processado
      UPDATE public.anuncios_field_changes
        SET status = 'applied'
        WHERE id = v_change.id;

      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Marcar como falha
      UPDATE public.anuncios_field_changes
        SET status = 'failed',
            error_message = SQLERRM
        WHERE id = v_change.id;
    END;
  END LOOP;

  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."retry_failed_changes"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."retry_failed_changes"() IS '[CANÔNICO 2026-01-06] Reprocessa mudanças pendentes/falhas para properties';



CREATE OR REPLACE FUNCTION "public"."save_anuncio_batch"("p_anuncio_id" "uuid", "p_changes" "jsonb", "p_organization_id" "uuid" DEFAULT NULL::"uuid", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_id uuid;
  v_change jsonb;
  v_applied int := 0;
  v_skipped int := 0;
  v_result jsonb;
  v_now timestamptz := now();
BEGIN
  IF p_changes IS NULL OR jsonb_typeof(p_changes) <> 'array' THEN
    RAISE EXCEPTION 'changes must be a jsonb array';
  END IF;

  -- Multi-tenant: nunca criar/salvar sem organization_id
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required';
  END IF;

  -- Criar ou recuperar imóvel
  IF p_anuncio_id IS NULL THEN
    INSERT INTO public.properties (organization_id, user_id, data, status, created_at, updated_at)
    VALUES (p_organization_id, p_user_id, '{}'::jsonb, 'draft', v_now, v_now)
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
      v_path text[];
    BEGIN
      IF v_field IS NULL OR length(trim(v_field)) = 0 THEN
        RAISE EXCEPTION 'field is required';
      END IF;

      -- Suporte a path "a.b.c" (padrão simples)
      v_path := string_to_array(v_field, '.');

      -- Checar idempotência
      IF v_idem_key IS NOT NULL AND length(trim(v_idem_key)) > 0 THEN
        SELECT EXISTS(
          SELECT 1 FROM public.anuncios_field_changes c
          WHERE c.idempotency_key = v_idem_key
          LIMIT 1
        ) INTO v_exists;

        IF v_exists THEN
          v_skipped := v_skipped + 1;
          CONTINUE;
        END IF;
      END IF;

      -- Aplicar mudança (somente dentro do tenant)
      UPDATE public.properties
        SET data = jsonb_set(COALESCE(data, '{}'::jsonb), v_path, v_value, true),
            updated_at = v_now,
            user_id = COALESCE(p_user_id, user_id)
      WHERE id = v_id
        AND organization_id = p_organization_id;

      -- Se não existia (ou org não bateu), criar no tenant
      IF NOT FOUND THEN
        INSERT INTO public.properties (id, organization_id, user_id, data, status, created_at, updated_at)
        VALUES (
          v_id,
          p_organization_id,
          p_user_id,
          jsonb_set('{}'::jsonb, v_path, v_value, true),
          'draft',
          v_now,
          v_now
        )
        ON CONFLICT (id) DO UPDATE
          SET data = jsonb_set(COALESCE(public.properties.data, '{}'::jsonb), v_path, v_value, true),
              updated_at = v_now,
              user_id = COALESCE(p_user_id, public.properties.user_id)
          WHERE public.properties.organization_id = p_organization_id;
      END IF;

      -- Logar mudança (idempotência garante reprocessamento seguro)
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'anuncios_field_changes') THEN
        INSERT INTO public.anuncios_field_changes (anuncio_id, field, value, idempotency_key, created_at)
          VALUES (v_id, v_field, v_value, v_idem_key, v_now)
          ON CONFLICT (idempotency_key) DO NOTHING;
      END IF;

      v_applied := v_applied + 1;
    END;
  END LOOP;

  SELECT jsonb_build_object(
    'id', a.id,
    'data', a.data,
    'organization_id', a.organization_id,
    'user_id', a.user_id,
    'status', a.status,
    'updated_at', a.updated_at,
    'changes_applied', v_applied,
    'changes_skipped', v_skipped
  ) INTO v_result
  FROM public.properties a
  WHERE a.id = v_id
    AND a.organization_id = p_organization_id;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."save_anuncio_batch"("p_anuncio_id" "uuid", "p_changes" "jsonb", "p_organization_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."save_anuncio_batch"("p_anuncio_id" "uuid", "p_changes" "jsonb", "p_organization_id" "uuid", "p_user_id" "uuid") IS '[CANÔNICO 2026-01-06] Batch save em properties.data com idempotência';



CREATE OR REPLACE FUNCTION "public"."save_anuncio_field"("p_anuncio_id" "uuid" DEFAULT NULL::"uuid", "p_field" "text" DEFAULT NULL::"text", "p_value" "text" DEFAULT NULL::"text", "p_idempotency_key" "text" DEFAULT NULL::"text", "p_organization_id" "uuid" DEFAULT NULL::"uuid", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result jsonb;
  v_changes jsonb;
BEGIN
  -- Validação básica
  IF p_field IS NULL THEN
    RAISE EXCEPTION 'field is required';
  END IF;

  -- Converte campo único em array de changes para save_anuncio_batch
  v_changes := jsonb_build_array(
    jsonb_build_object(
      'field', p_field,
      'value', p_value,
      'idempotency_key', COALESCE(p_idempotency_key, p_field || '-' || extract(epoch from now())::text)
    )
  );

  -- Chama função V2 com batch de 1 item
  v_result := save_anuncio_batch(
    p_anuncio_id := p_anuncio_id,
    p_changes := v_changes,
    p_organization_id := p_organization_id,
    p_user_id := p_user_id
  );

  -- Retorna resultado no formato esperado pelo frontend
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."save_anuncio_field"("p_anuncio_id" "uuid", "p_field" "text", "p_value" "text", "p_idempotency_key" "text", "p_organization_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."save_anuncio_field"("p_anuncio_id" "uuid", "p_field" "text", "p_value" "text", "p_idempotency_key" "text", "p_organization_id" "uuid", "p_user_id" "uuid") IS '[WRAPPER V1→V2] Mantém compatibilidade com frontend antigo, converte campo único em batch';



CREATE OR REPLACE FUNCTION "public"."set_organization_currency_settings"("org_id" "uuid", "settings" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  new_metadata jsonb;
begin
  update public.organizations
  set
    metadata = jsonb_set(
      coalesce(metadata, '{}'::jsonb),
      '{currency_settings}',
      coalesce(settings, '{}'::jsonb),
      true
    ),
    updated_at = now()
  where id = org_id
  returning metadata into new_metadata;

  if new_metadata is null then
    raise exception 'Organization not found';
  end if;

  return new_metadata -> 'currency_settings';
end;
$$;


ALTER FUNCTION "public"."set_organization_currency_settings"("org_id" "uuid", "settings" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_organization_discount_packages"("p_organization_id" "uuid", "p_settings" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_updated jsonb;
BEGIN
  UPDATE public.organizations
    SET metadata = jsonb_set(
      coalesce(metadata, '{}'::jsonb),
      '{discount_packages}',
      coalesce(p_settings, '{}'::jsonb),
      true
    )
  WHERE id = p_organization_id
  RETURNING coalesce(metadata, '{}'::jsonb) -> 'discount_packages' INTO v_updated;

  IF v_updated IS NULL THEN
    -- Organization not found or metadata missing
    RETURN '{}'::jsonb;
  END IF;

  RETURN v_updated;
END;
$$;


ALTER FUNCTION "public"."set_organization_discount_packages"("p_organization_id" "uuid", "p_settings" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_timestamp_drafts"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_timestamp_drafts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at_evolution_instances"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at_evolution_instances"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at_staysnet_import_issues"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at_staysnet_import_issues"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at_stripe_checkout_sessions"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at_stripe_checkout_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at_stripe_configs"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at_stripe_configs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."try_parse_jsonb"("p_text" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
begin
  if p_text is null then
    return null;
  end if;

  begin
    return p_text::jsonb;
  exception when others then
    return null;
  end;
end;
$$;


ALTER FUNCTION "public"."try_parse_jsonb"("p_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_ai_agent_unidades_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_ai_agent_unidades_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_ai_provider_configs_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_ai_provider_configs_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_automations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_automations_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_campo_mapping_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_campo_mapping_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_channel_contacts_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_channel_contacts_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_channel_instances_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_channel_instances_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_chat_channel_configs_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_chat_channel_configs_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_chat_conversations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_chat_conversations_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_client_sites_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_client_sites_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_completion_percentage"("p_anuncio_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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
  SELECT data INTO v_data FROM public.properties WHERE id = p_anuncio_id;

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
  UPDATE public.properties
    SET completion_percentage = v_percentage,
        status = CASE
          WHEN v_percentage = 100 THEN 'ready_to_publish'
          WHEN v_percentage >= 50 THEN 'validating'
          ELSE 'draft'
        END
    WHERE id = p_anuncio_id;
END;
$$;


ALTER FUNCTION "public"."update_completion_percentage"("p_anuncio_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_completion_percentage"("p_anuncio_id" "uuid") IS '[CANÔNICO 2026-01-06] Atualiza completion_percentage em properties';



CREATE OR REPLACE FUNCTION "public"."update_conversation_on_new_message"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE chat_conversations
    SET 
        last_message_at = NEW.sent_at,
        last_message_preview = LEFT(NEW.content, 100),
        last_message_direction = NEW.direction,
        unread_count = CASE 
            WHEN NEW.direction = 'inbound' THEN unread_count + 1 
            ELSE unread_count 
        END,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_on_new_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversations_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_crm_card_items_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_crm_card_items_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_crm_companies_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_crm_companies_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_crm_contacts_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_crm_contacts_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_crm_lost_reasons_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_crm_lost_reasons_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_crm_notes_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_crm_notes_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_crm_products_services_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_crm_products_services_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_crm_tasks_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_crm_tasks_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_crm_templates_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_crm_templates_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_financeiro_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_financeiro_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_guest_users_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_guest_users_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_kv_store_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Sempre atualizar updated_at quando a trigger for executada (BEFORE UPDATE)
  -- A coluna updated_at sempre existe na tabela kv_store_67caf26a
  NEW.updated_at = NOW();
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Se houver qualquer erro, apenas retornar NEW sem modificar
    -- Isso previne erros como "record "new" has no field "updated_at""
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_kv_store_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_lost_reason_usage"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Se está setando um novo motivo de perda
  IF NEW.lost_reason_id IS NOT NULL AND (OLD.lost_reason_id IS NULL OR OLD.lost_reason_id != NEW.lost_reason_id) THEN
    UPDATE crm_lost_reasons 
    SET usage_count = usage_count + 1, last_used_at = NOW()
    WHERE id = NEW.lost_reason_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_lost_reason_usage"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_marketplace_conversation_last_message"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE re_marketplace_conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100),
    last_message_sender_id = NEW.sender_profile_id,
    updated_at = NOW(),
    -- Incrementar unread para a org que NÃO enviou
    unread_count_org_a = CASE 
      WHEN org_a_id != NEW.sender_org_id THEN unread_count_org_a + 1 
      ELSE unread_count_org_a 
    END,
    unread_count_org_b = CASE 
      WHEN org_b_id != NEW.sender_org_id THEN unread_count_org_b + 1 
      ELSE unread_count_org_b 
    END
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_marketplace_conversation_last_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_messages_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_messages_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_notifications_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_notifications_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_operational_tasks_on_reservation_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_old_checkin DATE;
  v_new_checkin DATE;
  v_old_checkout DATE;
  v_new_checkout DATE;
  v_date_diff INTERVAL;
BEGIN
  -- Pega datas antigas e novas (colunas diretas check_in/check_out)
  v_old_checkin := OLD.check_in;
  v_old_checkout := OLD.check_out;
  v_new_checkin := NEW.check_in;
  v_new_checkout := NEW.check_out;
  
  -- Se check-in mudou, atualiza tarefas de check-in
  IF v_old_checkin IS DISTINCT FROM v_new_checkin AND v_new_checkin IS NOT NULL THEN
    v_date_diff := v_new_checkin - v_old_checkin;
    
    UPDATE operational_tasks
    SET 
      scheduled_date = scheduled_date + v_date_diff,
      original_scheduled_date = COALESCE(original_scheduled_date, scheduled_date),
      postpone_reason = 'Reserva alterada: check-in mudou de ' || v_old_checkin || ' para ' || v_new_checkin,
      updated_at = NOW()
    WHERE 
      reservation_id = NEW.id::TEXT
      AND triggered_by_event IN ('checkin_day', 'checkin_approaching')
      AND status = 'pending';
    
    RAISE NOTICE 'Tarefas de check-in atualizadas para reserva %', NEW.id;
  END IF;
  
  -- Se check-out mudou, atualiza tarefas de check-out
  IF v_old_checkout IS DISTINCT FROM v_new_checkout AND v_new_checkout IS NOT NULL THEN
    v_date_diff := v_new_checkout - v_old_checkout;
    
    UPDATE operational_tasks
    SET 
      scheduled_date = scheduled_date + v_date_diff,
      original_scheduled_date = COALESCE(original_scheduled_date, scheduled_date),
      postpone_reason = 'Reserva alterada: check-out mudou de ' || v_old_checkout || ' para ' || v_new_checkout,
      updated_at = NOW()
    WHERE 
      reservation_id = NEW.id::TEXT
      AND triggered_by_event IN ('checkout_day')
      AND status = 'pending';
    
    RAISE NOTICE 'Tarefas de check-out atualizadas para reserva %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_operational_tasks_on_reservation_change"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_operational_tasks_on_reservation_change"() IS 'Trigger function que atualiza datas das tarefas quando uma reserva muda de data';



CREATE OR REPLACE FUNCTION "public"."update_owner_users_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_owner_users_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_predetermined_funnels_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_predetermined_funnels_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_predetermined_items_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_predetermined_items_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_project_progress"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_project_id UUID;
BEGIN
  -- Para DELETE, usa OLD; para INSERT/UPDATE, usa NEW
  IF TG_OP = 'DELETE' THEN
    v_project_id := OLD.project_id;
    IF v_project_id IS NOT NULL THEN
      UPDATE crm_projects
      SET 
        total_tasks = (SELECT COUNT(*) FROM crm_tasks WHERE project_id = v_project_id),
        completed_tasks = (SELECT COUNT(*) FROM crm_tasks WHERE project_id = v_project_id AND status = 'completed'),
        updated_at = NOW()
      WHERE id = v_project_id;
    END IF;
    RETURN OLD;
  END IF;
  
  -- Para INSERT ou UPDATE
  IF NEW.project_id IS NOT NULL THEN
    UPDATE crm_projects
    SET 
      total_tasks = (SELECT COUNT(*) FROM crm_tasks WHERE project_id = NEW.project_id),
      completed_tasks = (SELECT COUNT(*) FROM crm_tasks WHERE project_id = NEW.project_id AND status = 'completed'),
      updated_at = NOW()
    WHERE id = NEW.project_id;
  END IF;
  
  -- Se projeto mudou no UPDATE, atualiza o antigo também
  IF TG_OP = 'UPDATE' AND OLD.project_id IS DISTINCT FROM NEW.project_id AND OLD.project_id IS NOT NULL THEN
    UPDATE crm_projects
    SET 
      total_tasks = (SELECT COUNT(*) FROM crm_tasks WHERE project_id = OLD.project_id),
      completed_tasks = (SELECT COUNT(*) FROM crm_tasks WHERE project_id = OLD.project_id AND status = 'completed'),
      updated_at = NOW()
    WHERE id = OLD.project_id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_project_progress"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_property_channel_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_property_channel_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_property_rooms_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_property_rooms_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_rate_plan_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_rate_plan_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_reservations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_reservations_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_sales_deals_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_sales_deals_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_sales_funnels_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_sales_funnels_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_service_funnels_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_service_funnels_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_service_tickets_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_service_tickets_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_staysnet_config_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_staysnet_config_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_users_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_users_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_webhook_subscription_stats"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE ota_webhook_subscriptions 
  SET 
    total_events_received = total_events_received + 1,
    last_event_at = NEW.created_at,
    last_event_type = NEW.event_type,
    total_events_processed = total_events_processed + CASE WHEN NEW.processed THEN 1 ELSE 0 END
  WHERE organization_id = NEW.organization_id AND ota = NEW.ota;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_webhook_subscription_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_categoria_parent_org"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Se parent_id é NULL, permitir (categoria raiz)
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Verificar se parent_id existe e pertence à mesma organização
  IF NOT EXISTS (
    SELECT 1 FROM financeiro_categorias p 
    WHERE p.id = NEW.parent_id 
    AND p.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'parent_id deve pertencer à mesma organização';
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_categoria_parent_org"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_tenant_by_imobiliaria_id"("p_imobiliaria_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  v_organization_id UUID;
BEGIN
  -- Buscar organizationId via legacy_imobiliaria_id
  v_organization_id := lookup_organization_id_by_imobiliaria_id(p_imobiliaria_id);
  
  -- Se não encontrou, lançar exceção
  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION 'Tenant inválido: imobiliariaId % não encontrado na tabela organizations', p_imobiliaria_id;
  END IF;
  
  RETURN v_organization_id;
END;
$$;


ALTER FUNCTION "public"."validate_tenant_by_imobiliaria_id"("p_imobiliaria_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_tenant_by_imobiliaria_id"("p_imobiliaria_id" "text") IS 'Valida se imobiliariaId existe e retorna organizationId. Lança exceção se tenant não encontrado.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."accommodation_rules" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "listing_id" "uuid" NOT NULL,
    "max_adults" integer NOT NULL,
    "min_age" integer DEFAULT 18,
    "accepts_children" boolean DEFAULT true,
    "max_children" integer DEFAULT 0,
    "children_rules_pt" "text",
    "children_rules_en" "text",
    "children_rules_es" "text",
    "accepts_babies" boolean DEFAULT true,
    "max_babies" integer DEFAULT 0,
    "provides_cribs" boolean DEFAULT false,
    "max_cribs" integer DEFAULT 0,
    "babies_rules_pt" "text",
    "babies_rules_en" "text",
    "babies_rules_es" "text",
    "allows_pets" character varying(20) DEFAULT 'no'::character varying,
    "pet_fee" integer,
    "max_pets" integer,
    "pet_rules_pt" "text",
    "pet_rules_en" "text",
    "pet_rules_es" "text",
    "smoking_allowed" character varying(20) DEFAULT 'no'::character varying,
    "events_allowed" character varying(20) DEFAULT 'no'::character varying,
    "quiet_hours" boolean DEFAULT false,
    "quiet_hours_start" time without time zone,
    "quiet_hours_end" time without time zone,
    "additional_rules_pt" "text",
    "additional_rules_en" "text",
    "additional_rules_es" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "accommodation_rules_allows_pets_check" CHECK ((("allows_pets")::"text" = ANY ((ARRAY['no'::character varying, 'yes_free'::character varying, 'yes_chargeable'::character varying, 'upon_request'::character varying])::"text"[]))),
    CONSTRAINT "accommodation_rules_events_allowed_check" CHECK ((("events_allowed")::"text" = ANY ((ARRAY['yes'::character varying, 'no'::character varying, 'on_request'::character varying])::"text"[]))),
    CONSTRAINT "accommodation_rules_smoking_allowed_check" CHECK ((("smoking_allowed")::"text" = ANY ((ARRAY['yes'::character varying, 'no'::character varying, 'outdoor_only'::character varying])::"text"[])))
);


ALTER TABLE "public"."accommodation_rules" OWNER TO "postgres";


COMMENT ON TABLE "public"."accommodation_rules" IS 'Regras das acomodações';



CREATE TABLE IF NOT EXISTS "public"."activity_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_name" character varying(255) NOT NULL,
    "action" character varying(100) NOT NULL,
    "resource" character varying(50) NOT NULL,
    "resource_id" "uuid",
    "details" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."activity_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."activity_logs" IS 'Log de atividades do sistema';



CREATE TABLE IF NOT EXISTS "public"."ai_agent_construtoras" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "linktree_url" "text" NOT NULL,
    "website_url" "text",
    "notes" "text",
    "is_active" boolean DEFAULT true,
    "last_scraped_at" timestamp with time zone,
    "empreendimentos_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_agent_construtoras" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_agent_construtoras" IS 'Construtoras cadastradas para monitoramento pelo agente de IA';



COMMENT ON COLUMN "public"."ai_agent_construtoras"."linktree_url" IS 'URL do Linktree da construtora para scraping';



COMMENT ON COLUMN "public"."ai_agent_construtoras"."last_scraped_at" IS 'Data/hora da última coleta de dados';



COMMENT ON COLUMN "public"."ai_agent_construtoras"."empreendimentos_count" IS 'Quantidade de empreendimentos encontrados na última coleta';



CREATE TABLE IF NOT EXISTS "public"."ai_agent_empreendimentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "construtora_id" "uuid",
    "nome" character varying(255) NOT NULL,
    "slug" character varying(255),
    "bairro" character varying(255),
    "cidade" character varying(100) DEFAULT 'Rio de Janeiro'::character varying,
    "estado" character varying(2) DEFAULT 'RJ'::character varying,
    "endereco" "text",
    "tipologias" "jsonb" DEFAULT '[]'::"jsonb",
    "area_min" numeric(10,2),
    "area_max" numeric(10,2),
    "andares" integer,
    "unidades_total" integer,
    "unidades_disponiveis" integer,
    "preco_min" numeric(15,2),
    "preco_max" numeric(15,2),
    "condicao_pagamento" "text",
    "status" character varying(50),
    "previsao_entrega" "date",
    "percentual_vendido" numeric(5,2),
    "links" "jsonb" DEFAULT '{}'::"jsonb",
    "dados_raw" "jsonb" DEFAULT '{}'::"jsonb",
    "last_scraped_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "resumo_vendas" "jsonb"
);


ALTER TABLE "public"."ai_agent_empreendimentos" OWNER TO "postgres";


COMMENT ON COLUMN "public"."ai_agent_empreendimentos"."resumo_vendas" IS 'Resumo de vendas: {total, disponiveis, reservadas, vendidas, percentual_vendido, atualizado_em}';



CREATE TABLE IF NOT EXISTS "public"."ai_agent_unidades" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empreendimento_id" "uuid",
    "construtora_id" "uuid",
    "organization_id" "uuid",
    "codigo" character varying(50) NOT NULL,
    "bloco" character varying(50),
    "andar" integer,
    "tipologia" character varying(50),
    "tipologia_descricao" character varying(200),
    "area_privativa" numeric(10,2),
    "area_total" numeric(10,2),
    "quartos" integer,
    "suites" integer,
    "vagas" integer,
    "status" character varying(50) DEFAULT 'disponivel'::character varying,
    "preco" numeric(15,2),
    "preco_m2" numeric(10,2),
    "imobiliaria" character varying(200),
    "corretor" character varying(200),
    "data_venda" "date",
    "data_reserva" "date",
    "dados_raw" "jsonb",
    "fonte" character varying(200),
    "scraped_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_agent_unidades" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_agent_unidades" IS 'Unidades individuais de empreendimentos (apartamentos, salas, etc)';



COMMENT ON COLUMN "public"."ai_agent_unidades"."codigo" IS 'Código único da unidade dentro do empreendimento';



COMMENT ON COLUMN "public"."ai_agent_unidades"."tipologia" IS 'Tipo da unidade: 1Q, 2Q, DS, COB, etc';



COMMENT ON COLUMN "public"."ai_agent_unidades"."status" IS 'Status: disponivel, reservado, vendido, indisponivel';



COMMENT ON COLUMN "public"."ai_agent_unidades"."imobiliaria" IS 'Imobiliária responsável pela venda';



CREATE TABLE IF NOT EXISTS "public"."ai_provider_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "base_url" "text" NOT NULL,
    "default_model" "text" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "temperature" numeric(3,2) DEFAULT 0.20 NOT NULL,
    "max_tokens" integer DEFAULT 512 NOT NULL,
    "prompt_template" "text",
    "notes" "text",
    "api_key_encrypted" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "name" "text"
);


ALTER TABLE "public"."ai_provider_configs" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_provider_configs" IS 'Configurações do provedor de IA por organização.';



COMMENT ON COLUMN "public"."ai_provider_configs"."provider" IS 'Identificador do provedor (openai, azure-openai, huggingface, custom).';



COMMENT ON COLUMN "public"."ai_provider_configs"."api_key_encrypted" IS 'API key criptografada. Nunca retorna em claro.';



CREATE TABLE IF NOT EXISTS "public"."anuncios_field_changes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "anuncio_id" "uuid",
    "field" "text" NOT NULL,
    "value" "jsonb",
    "idempotency_key" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."anuncios_field_changes" OWNER TO "postgres";


COMMENT ON TABLE "public"."anuncios_field_changes" IS 'Histórico de mudanças de campos em properties (antes anuncios_ultimate). 
       FK anuncio_id referencia properties(id).';



CREATE TABLE IF NOT EXISTS "public"."anuncios_pending_changes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "anuncio_id" "uuid" NOT NULL,
    "field" "text" NOT NULL,
    "value" "jsonb",
    "priority" integer DEFAULT 50,
    "attempt_count" integer DEFAULT 0,
    "last_error" "text",
    "next_retry_at" timestamp with time zone DEFAULT "now"(),
    "idempotency_key" "text",
    "status" character varying(32) DEFAULT 'pending'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."anuncios_pending_changes" OWNER TO "postgres";


COMMENT ON TABLE "public"."anuncios_pending_changes" IS 'Fila de mudanças pendentes para recovery automático';



CREATE TABLE IF NOT EXISTS "public"."anuncios_published" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "draft_id" "uuid",
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "tipo_local" character varying(64) NOT NULL,
    "tipo_acomodacao" character varying(64) NOT NULL,
    "subtype" character varying(64),
    "modalidades" "text"[],
    "estrutura" character varying(32) DEFAULT 'individual'::character varying,
    "cidade" "text",
    "estado" character varying(2),
    "pais" character varying(2) DEFAULT 'BR'::character varying,
    "data" "jsonb" NOT NULL,
    "status" character varying(32) DEFAULT 'active'::character varying,
    "visibility" character varying(32) DEFAULT 'public'::character varying,
    "slug" "text",
    "published_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."anuncios_published" OWNER TO "postgres";


COMMENT ON TABLE "public"."anuncios_published" IS 'Anúncios publicados com schema normalizado para queries rápidas';



CREATE TABLE IF NOT EXISTS "public"."properties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text",
    "status" character varying(32) DEFAULT 'draft'::character varying,
    "completion_percentage" integer DEFAULT 0,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "step_completed" integer DEFAULT 0,
    "last_edited_field" "text",
    "last_edited_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "owner_contact_id" "uuid",
    "cleaning_responsibility" "text" DEFAULT 'company'::"text",
    "maintenance_responsibility" "text" DEFAULT 'company'::"text",
    "checkin_category" "text",
    "checkin_config" "jsonb" DEFAULT '{}'::"jsonb",
    "property_rating" numeric(2,1),
    "property_rating_type" "text",
    "category_id" "text",
    "category_name" "text",
    "supply_source" "text",
    "expedia_collect" boolean DEFAULT false,
    "property_collect" boolean DEFAULT true,
    "registry_number" "text",
    "tax_id" "text",
    "chain_id" "text",
    "chain_name" "text",
    "brand_id" "text",
    "brand_name" "text",
    "multi_unit" boolean DEFAULT false,
    "payment_registration_recommended" boolean DEFAULT false,
    "descriptions" "jsonb" DEFAULT '{}'::"jsonb",
    "statistics" "jsonb" DEFAULT '{}'::"jsonb",
    "spoken_languages" "text"[],
    "themes" "text"[],
    "onsite_payment_types" "text"[],
    "checkin_begin_time" time without time zone,
    "checkin_end_time" time without time zone,
    "checkout_time" time without time zone,
    "checkin_instructions" "text",
    "checkin_special_instructions" "text",
    "checkout_instructions" "text",
    "min_age_checkin" integer DEFAULT 18,
    "know_before_you_go" "text",
    "mandatory_fees_description" "text",
    "optional_fees_description" "text",
    "all_inclusive_details" "text",
    "obfuscation_required" boolean DEFAULT false,
    "vrbo_listing_id" "text",
    "vrbo_srp_id" "text",
    "private_host" boolean DEFAULT true,
    "pets_policy" "jsonb" DEFAULT '{"allowed": false}'::"jsonb",
    "smoking_policy" "text" DEFAULT 'no_smoking'::"text",
    "party_policy" "text" DEFAULT 'no_parties'::"text",
    "quiet_hours_start" time without time zone,
    "quiet_hours_end" time without time zone,
    "emergency_contact_name" "text",
    "emergency_contact_phone" "text",
    "property_manager_name" "text",
    "property_manager_phone" "text",
    "property_manager_email" "text",
    "parking_details" "jsonb" DEFAULT '{}'::"jsonb",
    "accessibility_features" "text"[] DEFAULT '{}'::"text"[],
    "nearby_attractions" "jsonb" DEFAULT '[]'::"jsonb",
    "transportation_options" "jsonb" DEFAULT '[]'::"jsonb",
    "license_number" "text",
    "license_type" "text",
    "license_expiry" "date",
    "tax_registration" "text",
    "insurance_policy" "text",
    CONSTRAINT "check_completion" CHECK ((("completion_percentage" >= 0) AND ("completion_percentage" <= 100))),
    CONSTRAINT "check_step" CHECK ((("step_completed" >= 0) AND ("step_completed" <= 7))),
    CONSTRAINT "properties_cleaning_responsibility_check" CHECK (("cleaning_responsibility" = ANY (ARRAY['company'::"text", 'owner'::"text"]))),
    CONSTRAINT "properties_maintenance_responsibility_check" CHECK (("maintenance_responsibility" = ANY (ARRAY['company'::"text", 'owner'::"text"])))
);


ALTER TABLE "public"."properties" OWNER TO "postgres";


COMMENT ON TABLE "public"."properties" IS 'Tabela principal de imóveis/propriedades do sistema Rendizy. 
   Renomeada de anuncios_ultimate em 2026-01-07 para maior clareza.
   Contém coluna JSONB "data" com todos os atributos do imóvel.';



COMMENT ON COLUMN "public"."properties"."owner_contact_id" IS 'FK para crm_contacts - vincula propriedade ao proprietário';



COMMENT ON COLUMN "public"."properties"."cleaning_responsibility" IS 'Quem é responsável pela limpeza: company (empresa de gestão) ou owner (proprietário)';



COMMENT ON COLUMN "public"."properties"."maintenance_responsibility" IS 'Quem é responsável pela manutenção: company (empresa de gestão) ou owner (proprietário)';



COMMENT ON COLUMN "public"."properties"."category_id" IS 'ID da categoria canônica do tipo de propriedade';



COMMENT ON COLUMN "public"."properties"."descriptions" IS 'Descrições categorizadas: amenities, dining, location, etc';



COMMENT ON COLUMN "public"."properties"."statistics" IS 'Estatísticas: total_rooms, floors, year_built, etc';



COMMENT ON COLUMN "public"."properties"."checkin_begin_time" IS '[OTA-UNIVERSAL] Horário início check-in (ex: 14:00)';



COMMENT ON COLUMN "public"."properties"."checkin_end_time" IS '[OTA-UNIVERSAL] Horário fim check-in (ex: 22:00)';



COMMENT ON COLUMN "public"."properties"."checkout_time" IS '[OTA-UNIVERSAL] Horário limite checkout (ex: 11:00)';



COMMENT ON COLUMN "public"."properties"."checkin_instructions" IS '[OTA-UNIVERSAL] Instruções gerais de check-in';



COMMENT ON COLUMN "public"."properties"."checkin_special_instructions" IS '[OTA-UNIVERSAL] Instruções especiais (late check-in, etc)';



COMMENT ON COLUMN "public"."properties"."checkout_instructions" IS '[OTA-UNIVERSAL] Instruções de checkout';



COMMENT ON COLUMN "public"."properties"."min_age_checkin" IS '[OTA-UNIVERSAL] Idade mínima para check-in (padrão 18)';



COMMENT ON COLUMN "public"."properties"."know_before_you_go" IS '[OTA-UNIVERSAL] Informações importantes antes da reserva';



COMMENT ON COLUMN "public"."properties"."mandatory_fees_description" IS '[OTA-UNIVERSAL] Descrição de taxas obrigatórias';



COMMENT ON COLUMN "public"."properties"."optional_fees_description" IS '[OTA-UNIVERSAL] Descrição de taxas opcionais';



COMMENT ON COLUMN "public"."properties"."all_inclusive_details" IS '[OTA-UNIVERSAL] Detalhes se for all-inclusive';



COMMENT ON COLUMN "public"."properties"."obfuscation_required" IS '[OTA-UNIVERSAL] Se endereço deve ser ocultado (VRBO privacy)';



COMMENT ON COLUMN "public"."properties"."vrbo_listing_id" IS '[VRBO] ID do listing no VRBO';



COMMENT ON COLUMN "public"."properties"."vrbo_srp_id" IS '[VRBO] ID SRP no VRBO';



COMMENT ON COLUMN "public"."properties"."private_host" IS '[OTA-UNIVERSAL] Se é anfitrião privado (não empresa)';



COMMENT ON COLUMN "public"."properties"."pets_policy" IS '[OTA-UNIVERSAL] Política de pets: {"allowed": true, "fee": 50, "max": 2}';



COMMENT ON COLUMN "public"."properties"."smoking_policy" IS '[OTA-UNIVERSAL] no_smoking, designated_areas, allowed';



COMMENT ON COLUMN "public"."properties"."party_policy" IS '[OTA-UNIVERSAL] no_parties, small_gatherings, allowed';



COMMENT ON COLUMN "public"."properties"."quiet_hours_start" IS '[OTA-UNIVERSAL] Início horário de silêncio';



COMMENT ON COLUMN "public"."properties"."quiet_hours_end" IS '[OTA-UNIVERSAL] Fim horário de silêncio';



COMMENT ON COLUMN "public"."properties"."emergency_contact_name" IS '[OTA-UNIVERSAL] Nome contato de emergência';



COMMENT ON COLUMN "public"."properties"."emergency_contact_phone" IS '[OTA-UNIVERSAL] Telefone emergência';



COMMENT ON COLUMN "public"."properties"."property_manager_name" IS '[OTA-UNIVERSAL] Nome do gerente/responsável';



COMMENT ON COLUMN "public"."properties"."property_manager_phone" IS '[OTA-UNIVERSAL] Telefone do gerente';



COMMENT ON COLUMN "public"."properties"."property_manager_email" IS '[OTA-UNIVERSAL] Email do gerente';



COMMENT ON COLUMN "public"."properties"."parking_details" IS '[OTA-UNIVERSAL] {"available": true, "type": "free", "spaces": 2}';



COMMENT ON COLUMN "public"."properties"."accessibility_features" IS '[OTA-UNIVERSAL] Array: wheelchair, elevator, ground_floor, etc';



COMMENT ON COLUMN "public"."properties"."nearby_attractions" IS '[OTA-UNIVERSAL] [{name, distance_km, type}]';



COMMENT ON COLUMN "public"."properties"."transportation_options" IS '[OTA-UNIVERSAL] [{type: "airport", name: "GRU", distance_km: 15}]';



COMMENT ON COLUMN "public"."properties"."license_number" IS '[OTA-UNIVERSAL] Número da licença/alvará';



COMMENT ON COLUMN "public"."properties"."license_type" IS '[OTA-UNIVERSAL] Tipo: tourism, short_term_rental, hotel, etc';



COMMENT ON COLUMN "public"."properties"."license_expiry" IS '[OTA-UNIVERSAL] Data expiração da licença';



COMMENT ON COLUMN "public"."properties"."tax_registration" IS '[OTA-UNIVERSAL] Registro fiscal/ISS';



COMMENT ON COLUMN "public"."properties"."insurance_policy" IS '[OTA-UNIVERSAL] Número apólice de seguro';



CREATE OR REPLACE VIEW "public"."anuncios_health" AS
 SELECT ( SELECT "count"(*) AS "count"
           FROM "public"."properties"
          WHERE (("properties"."status")::"text" = 'draft'::"text")) AS "drafts_active",
    ( SELECT "count"(*) AS "count"
           FROM "public"."properties"
          WHERE (("properties"."status")::"text" = 'ready_to_publish'::"text")) AS "drafts_ready",
    ( SELECT "count"(*) AS "count"
           FROM "public"."anuncios_pending_changes"
          WHERE (("anuncios_pending_changes"."status")::"text" = 'pending'::"text")) AS "changes_pending",
    ( SELECT "count"(*) AS "count"
           FROM "public"."anuncios_pending_changes"
          WHERE ((("anuncios_pending_changes"."status")::"text" = 'failed'::"text") AND ("anuncios_pending_changes"."created_at" > ("now"() - '24:00:00'::interval)))) AS "changes_failed_24h",
    ( SELECT "count"(*) AS "count"
           FROM "public"."anuncios_published"
          WHERE (("anuncios_published"."status")::"text" = 'active'::"text")) AS "published_active",
    ( SELECT "round"(((("count"(*) FILTER (WHERE (("anuncios_pending_changes"."status")::"text" = 'completed'::"text")))::numeric / (NULLIF("count"(*), 0))::numeric) * (100)::numeric), 2) AS "round"
           FROM "public"."anuncios_pending_changes"
          WHERE ("anuncios_pending_changes"."created_at" > ("now"() - '24:00:00'::interval))) AS "success_rate_24h",
    "now"() AS "checked_at";


ALTER VIEW "public"."anuncios_health" OWNER TO "postgres";


COMMENT ON VIEW "public"."anuncios_health" IS 'Métricas de saúde do sistema de anúncios';



CREATE TABLE IF NOT EXISTS "public"."anuncios_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "anuncio_id" "uuid" NOT NULL,
    "version_number" integer NOT NULL,
    "data" "jsonb" NOT NULL,
    "changed_fields" "text"[],
    "change_summary" "text",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."anuncios_versions" OWNER TO "postgres";


COMMENT ON TABLE "public"."anuncios_versions" IS 'Snapshots automáticos para versionamento e rollback';



CREATE TABLE IF NOT EXISTS "public"."automation_executions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "automation_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "trigger_event" "text",
    "conditions_met" boolean DEFAULT false NOT NULL,
    "actions_executed" "jsonb",
    "error_message" "text",
    "execution_time_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "automation_executions_status_check" CHECK (("status" = ANY (ARRAY['success'::"text", 'failed'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."automation_executions" OWNER TO "postgres";


COMMENT ON TABLE "public"."automation_executions" IS 'Log de execuções das automações para auditoria e debugging.';



CREATE TABLE IF NOT EXISTS "public"."automations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "definition" "jsonb" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "module" "text",
    "channel" "text",
    "priority" "text" DEFAULT 'media'::"text",
    "trigger_count" integer DEFAULT 0 NOT NULL,
    "last_triggered_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "modules" "text"[],
    "properties" "text"[],
    "ai_interpretation_summary" "text",
    "impact_description" "text",
    CONSTRAINT "automations_priority_check" CHECK (("priority" = ANY (ARRAY['baixa'::"text", 'media'::"text", 'alta'::"text"]))),
    CONSTRAINT "automations_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'paused'::"text"])))
);


ALTER TABLE "public"."automations" OWNER TO "postgres";


COMMENT ON TABLE "public"."automations" IS 'Automações criadas pelos usuários para notificações e relatórios automáticos.';



COMMENT ON COLUMN "public"."automations"."definition" IS 'JSON estruturado com trigger, conditions, actions e metadata.';



COMMENT ON COLUMN "public"."automations"."status" IS 'Estado da automação: draft (rascunho), active (ativa), paused (pausada).';



COMMENT ON COLUMN "public"."automations"."trigger_count" IS 'Contador de quantas vezes a automação foi executada.';



COMMENT ON COLUMN "public"."automations"."modules" IS 'Array de módulos relacionados à automação (ex: ["reservas", "chat", "notificacoes"])';



COMMENT ON COLUMN "public"."automations"."properties" IS 'Array de IDs de imóveis onde a automação se aplica. Vazio = global (todos os imóveis)';



COMMENT ON COLUMN "public"."automations"."ai_interpretation_summary" IS 'Resumo do que a IA interpretou da descrição do usuário';



COMMENT ON COLUMN "public"."automations"."impact_description" IS 'Descrição do impacto e do que esta automação faz';



CREATE TABLE IF NOT EXISTS "public"."bed_types" (
    "id" "text" NOT NULL,
    "name_en" "text" NOT NULL,
    "name_pt" "text" NOT NULL,
    "category" "text" NOT NULL,
    "typical_width_cm" integer,
    "typical_length_cm" integer,
    "max_persons" integer DEFAULT 1
);


ALTER TABLE "public"."bed_types" OWNER TO "postgres";


COMMENT ON TABLE "public"."bed_types" IS '[OTA-UNIVERSAL] Tipos de cama padronizados';



CREATE TABLE IF NOT EXISTS "public"."beds" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "room_id" "uuid" NOT NULL,
    "type" character varying(20) NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "capacity" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "beds_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['casal'::character varying, 'solteiro'::character varying, 'solteiro-twin'::character varying, 'beliche-single'::character varying, 'beliche-double'::character varying, 'king'::character varying, 'queen'::character varying, 'futon-casal'::character varying, 'futon-individual'::character varying, 'sofa-cama'::character varying, 'sofa-cama-casal'::character varying])::"text"[])))
);


ALTER TABLE "public"."beds" OWNER TO "postgres";


COMMENT ON TABLE "public"."beds" IS 'Camas dos cômodos';



CREATE TABLE IF NOT EXISTS "public"."billing_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "reservation_id" "text",
    "crm_contact_id" "uuid",
    "given_name" "text" NOT NULL,
    "family_name" "text" NOT NULL,
    "company_name" "text",
    "address_line_1" "text",
    "address_line_2" "text",
    "address_line_3" "text",
    "address_city" "text",
    "address_state_code" "text",
    "address_state_name" "text",
    "address_postal_code" "text",
    "address_country_code" "text" DEFAULT 'BR'::"text" NOT NULL,
    "email" "text",
    "phone_country_code" "text",
    "phone_area_code" "text",
    "phone_number" "text",
    "phone_full" "text",
    "vat_number" "text",
    "tax_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."billing_contacts" OWNER TO "postgres";


COMMENT ON TABLE "public"."billing_contacts" IS 'Contato de cobrança separado do hóspede - requerido por Expedia';



CREATE TABLE IF NOT EXISTS "public"."blocks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "nights" integer NOT NULL,
    "type" character varying(20) DEFAULT 'block'::character varying NOT NULL,
    "subtype" character varying(20),
    "reason" character varying(255) NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid" NOT NULL,
    CONSTRAINT "blocks_subtype_check" CHECK ((("subtype")::"text" = ANY ((ARRAY['simple'::character varying, 'maintenance'::character varying, 'predictive'::character varying])::"text"[]))),
    CONSTRAINT "blocks_type_check" CHECK ((("type")::"text" = 'block'::"text"))
);


ALTER TABLE "public"."blocks" OWNER TO "postgres";


COMMENT ON TABLE "public"."blocks" IS 'Bloqueios de calendário';



CREATE TABLE IF NOT EXISTS "public"."calendar_pricing_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "property_id" "uuid",
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "condition_percent" numeric(5,2) DEFAULT 0,
    "min_nights" integer DEFAULT 1,
    "restriction" "text",
    "priority" integer DEFAULT 0,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "base_price" numeric(12,2) DEFAULT NULL::numeric,
    "migrated_to_rate_plans" boolean DEFAULT false,
    "migrated_at" timestamp with time zone,
    CONSTRAINT "calendar_pricing_rules_min_nights_check" CHECK (("min_nights" >= 1)),
    CONSTRAINT "valid_condition_percent" CHECK ((("condition_percent" >= ('-100'::integer)::numeric) AND ("condition_percent" <= (500)::numeric))),
    CONSTRAINT "valid_date_range" CHECK (("end_date" >= "start_date"))
);


ALTER TABLE "public"."calendar_pricing_rules" OWNER TO "postgres";


COMMENT ON TABLE "public"."calendar_pricing_rules" IS 'Regras de precificação e restrições de calendário por organização (multi-tenant). property_id NULL = Regras em Lote (aplicam a todos os imóveis filtrados). property_id NOT NULL = Regra específica do imóvel.';



COMMENT ON COLUMN "public"."calendar_pricing_rules"."property_id" IS 'ID do imóvel em anuncios_ultimate (sem FK por design - fonte é anuncios_ultimate)';



COMMENT ON COLUMN "public"."calendar_pricing_rules"."condition_percent" IS 'Percentual de condição a aplicar no preço base. Positivo = acréscimo (ex: +15 para alta temporada). Negativo = desconto (ex: -10 para baixa temporada).';



COMMENT ON COLUMN "public"."calendar_pricing_rules"."min_nights" IS 'Mínimo de noites exigido para reservas neste período.';



COMMENT ON COLUMN "public"."calendar_pricing_rules"."restriction" IS 'Tipo de restrição: no_checkin, no_checkout, blocked, ou texto livre.';



COMMENT ON COLUMN "public"."calendar_pricing_rules"."base_price" IS 'Preço base da diária para a data/período';



CREATE TABLE IF NOT EXISTS "public"."cancellation_policy_templates" (
    "id" "text" NOT NULL,
    "organization_id" "uuid",
    "name_pt" "text" NOT NULL,
    "name_en" "text",
    "name_es" "text",
    "description_pt" "text",
    "description_en" "text",
    "description_es" "text",
    "rules" "jsonb" DEFAULT '{"penalties": [], "no_show_penalty_type": "percentage", "no_show_penalty_value": 100, "free_cancellation_hours": 48}'::"jsonb" NOT NULL,
    "airbnb_policy" "text",
    "booking_policy" "text",
    "is_refundable" boolean DEFAULT true,
    "is_system" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cancellation_policy_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."cancellation_policy_templates" IS 'Templates de políticas de cancelamento reutilizáveis';



COMMENT ON COLUMN "public"."cancellation_policy_templates"."rules" IS 'Regras em formato universal traduzível para qualquer OTA';



CREATE TABLE IF NOT EXISTS "public"."canonical_amenities" (
    "id" "text" NOT NULL,
    "name_pt" "text" NOT NULL,
    "name_en" "text",
    "name_es" "text",
    "category" "text" NOT NULL,
    "subcategory" "text",
    "scope" "public"."mapping_scope" DEFAULT 'property'::"public"."mapping_scope" NOT NULL,
    "icon" "text",
    "description_pt" "text",
    "description_en" "text",
    "is_highlight" boolean DEFAULT false,
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."canonical_amenities" OWNER TO "postgres";


COMMENT ON TABLE "public"."canonical_amenities" IS 'Lista canônica de amenidades do Rendizy - fonte de verdade para todas as OTAs';



COMMENT ON COLUMN "public"."canonical_amenities"."scope" IS 'Escopo: property (imóvel), location (prédio), room (quarto), rate (incluso em tarifa)';



CREATE TABLE IF NOT EXISTS "public"."canonical_bed_types" (
    "id" "text" NOT NULL,
    "name_pt" "text" NOT NULL,
    "name_en" "text",
    "name_es" "text",
    "width_cm" integer,
    "length_cm" integer,
    "typical_capacity" integer DEFAULT 1,
    "icon" "text",
    "description_pt" "text",
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."canonical_bed_types" OWNER TO "postgres";


COMMENT ON TABLE "public"."canonical_bed_types" IS 'Tipos de cama canônicos do Rendizy';



CREATE TABLE IF NOT EXISTS "public"."canonical_fee_types" (
    "id" "text" NOT NULL,
    "name_pt" "text" NOT NULL,
    "name_en" "text",
    "name_es" "text",
    "is_mandatory" boolean DEFAULT false,
    "is_refundable" boolean DEFAULT true,
    "applies_to" "text" DEFAULT 'stay'::"text",
    "description_pt" "text",
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."canonical_fee_types" OWNER TO "postgres";


COMMENT ON TABLE "public"."canonical_fee_types" IS 'Tipos de taxas canônicos';



CREATE TABLE IF NOT EXISTS "public"."canonical_image_categories" (
    "id" "text" NOT NULL,
    "name_pt" "text" NOT NULL,
    "name_en" "text",
    "name_es" "text",
    "applies_to" "text"[] DEFAULT ARRAY['property'::"text"],
    "icon" "text",
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."canonical_image_categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."canonical_image_categories" IS 'Categorias de imagem canônicas';



CREATE TABLE IF NOT EXISTS "public"."canonical_languages" (
    "id" "text" NOT NULL,
    "name_pt" "text" NOT NULL,
    "name_en" "text",
    "name_native" "text",
    "iso_639_1" "text",
    "iso_639_2" "text",
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."canonical_languages" OWNER TO "postgres";


COMMENT ON TABLE "public"."canonical_languages" IS 'Idiomas canônicos do Rendizy';



CREATE TABLE IF NOT EXISTS "public"."canonical_payment_types" (
    "id" "text" NOT NULL,
    "name_pt" "text" NOT NULL,
    "name_en" "text",
    "category" "text" NOT NULL,
    "icon" "text",
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."canonical_payment_types" OWNER TO "postgres";


COMMENT ON TABLE "public"."canonical_payment_types" IS 'Tipos de pagamento canônicos';



CREATE TABLE IF NOT EXISTS "public"."canonical_property_types" (
    "id" "text" NOT NULL,
    "name_pt" "text" NOT NULL,
    "name_en" "text",
    "name_es" "text",
    "parent_type" "text",
    "typical_min_guests" integer DEFAULT 1,
    "typical_max_guests" integer DEFAULT 10,
    "typical_bedrooms_min" integer DEFAULT 1,
    "typical_bedrooms_max" integer DEFAULT 5,
    "icon" "text",
    "description_pt" "text",
    "description_en" "text",
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."canonical_property_types" OWNER TO "postgres";


COMMENT ON TABLE "public"."canonical_property_types" IS 'Tipos de propriedade canônicos do Rendizy';



CREATE TABLE IF NOT EXISTS "public"."canonical_reservation_statuses" (
    "id" "text" NOT NULL,
    "name_pt" "text" NOT NULL,
    "name_en" "text",
    "is_active_booking" boolean DEFAULT true,
    "is_final" boolean DEFAULT false,
    "allows_checkin" boolean DEFAULT false,
    "color" "text",
    "icon" "text",
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."canonical_reservation_statuses" OWNER TO "postgres";


COMMENT ON TABLE "public"."canonical_reservation_statuses" IS 'Status de reserva canônicos';



CREATE TABLE IF NOT EXISTS "public"."canonical_room_types" (
    "id" "text" NOT NULL,
    "name_pt" "text" NOT NULL,
    "name_en" "text",
    "name_es" "text",
    "description_pt" "text",
    "typical_beds" integer DEFAULT 1,
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."canonical_room_types" OWNER TO "postgres";


COMMENT ON TABLE "public"."canonical_room_types" IS 'Tipos de quarto canônicos do Rendizy';



CREATE TABLE IF NOT EXISTS "public"."canonical_room_views" (
    "id" "text" NOT NULL,
    "name_pt" "text" NOT NULL,
    "name_en" "text",
    "name_es" "text",
    "icon" "text",
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."canonical_room_views" OWNER TO "postgres";


COMMENT ON TABLE "public"."canonical_room_views" IS 'Tipos de vista do quarto canônicos';



CREATE TABLE IF NOT EXISTS "public"."canonical_themes" (
    "id" "text" NOT NULL,
    "name_pt" "text" NOT NULL,
    "name_en" "text",
    "name_es" "text",
    "icon" "text",
    "description_pt" "text",
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."canonical_themes" OWNER TO "postgres";


COMMENT ON TABLE "public"."canonical_themes" IS 'Temas/categorias de propriedade canônicos';



CREATE TABLE IF NOT EXISTS "public"."channel_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "instance_id" "uuid" NOT NULL,
    "channel" "text" NOT NULL,
    "external_id" "text" NOT NULL,
    "contact_type" "text" DEFAULT 'user'::"text" NOT NULL,
    "phone_number" "text",
    "email" "text",
    "display_name" "text" NOT NULL,
    "saved_name" "text",
    "profile_picture_url" "text",
    "is_business" boolean DEFAULT false,
    "is_blocked" boolean DEFAULT false,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen_at" timestamp with time zone,
    CONSTRAINT "channel_contacts_channel_check" CHECK (("channel" = ANY (ARRAY['whatsapp'::"text", 'airbnb'::"text", 'booking'::"text", 'sms'::"text", 'email'::"text", 'site'::"text", 'system'::"text"]))),
    CONSTRAINT "channel_contacts_contact_type_check" CHECK (("contact_type" = ANY (ARRAY['user'::"text", 'group'::"text", 'broadcast'::"text", 'channel'::"text", 'lid'::"text", 'unknown'::"text"])))
);


ALTER TABLE "public"."channel_contacts" OWNER TO "postgres";


COMMENT ON TABLE "public"."channel_contacts" IS 'Contatos de todos os canais de comunicação';



COMMENT ON COLUMN "public"."channel_contacts"."external_id" IS 'Identificador externo: JID para WhatsApp, guest_id para Airbnb, email para Email, etc';



COMMENT ON COLUMN "public"."channel_contacts"."contact_type" IS 'Tipo: user (individual), group, broadcast, channel (WhatsApp Channels), lid (link ID)';



CREATE TABLE IF NOT EXISTS "public"."channel_instances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "channel" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "instance_name" "text" NOT NULL,
    "api_url" "text",
    "api_key" "text",
    "instance_token" "text",
    "status" "text" DEFAULT 'disconnected'::"text" NOT NULL,
    "error_message" "text",
    "connected_identifier" "text",
    "profile_name" "text",
    "profile_picture_url" "text",
    "webhook_url" "text",
    "webhook_events" "text"[],
    "qr_code" "text",
    "qr_code_updated_at" timestamp with time zone,
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "is_enabled" boolean DEFAULT true NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_connected_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "description" "text",
    "color" "text" DEFAULT '#10B981'::"text",
    CONSTRAINT "channel_instances_channel_check" CHECK (("channel" = ANY (ARRAY['whatsapp'::"text", 'airbnb'::"text", 'booking'::"text", 'sms'::"text", 'email'::"text", 'site'::"text", 'system'::"text"]))),
    CONSTRAINT "channel_instances_status_check" CHECK (("status" = ANY (ARRAY['connected'::"text", 'disconnected'::"text", 'qr_pending'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."channel_instances" OWNER TO "postgres";


COMMENT ON TABLE "public"."channel_instances" IS 'Instâncias de canais de comunicação (WhatsApp, SMS, etc) por organização';



COMMENT ON COLUMN "public"."channel_instances"."provider" IS 'Provider do canal: evolution, waha, twilio, vonage, etc';



COMMENT ON COLUMN "public"."channel_instances"."instance_name" IS 'Nome único da instância no provider. DEVE ser único globalmente para evitar conflitos de webhook.';



COMMENT ON COLUMN "public"."channel_instances"."is_default" IS 'Se TRUE, esta instância é usada como padrão para envio neste canal';



COMMENT ON COLUMN "public"."channel_instances"."description" IS 'Descrição personalizada da instância. Ex: "Rafael Corretor - Região Barra"';



COMMENT ON COLUMN "public"."channel_instances"."color" IS 'Cor para identificação visual no ChatInbox (hex)';



CREATE TABLE IF NOT EXISTS "public"."channex_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "api_key" "text" NOT NULL,
    "environment" "text" DEFAULT 'staging'::"text" NOT NULL,
    "channex_group_id" "text",
    "channex_user_id" "text",
    "is_active" boolean DEFAULT true,
    "last_connection_test_at" timestamp with time zone,
    "last_connection_status" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "channex_accounts_environment_check" CHECK (("environment" = ANY (ARRAY['staging'::"text", 'production'::"text"]))),
    CONSTRAINT "channex_accounts_last_connection_status_check" CHECK ((("last_connection_status" IS NULL) OR ("last_connection_status" = ANY (ARRAY['ok'::"text", 'error'::"text", 'unauthorized'::"text"]))))
);


ALTER TABLE "public"."channex_accounts" OWNER TO "postgres";


COMMENT ON TABLE "public"."channex_accounts" IS 'Contas Channex por organização. Cada org pode ter N API keys.';



CREATE TABLE IF NOT EXISTS "public"."channex_channel_connections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "channel_code" "text" NOT NULL,
    "label" "text" NOT NULL,
    "channex_channel_id" "text",
    "is_active" boolean DEFAULT true,
    "sync_status" "text" DEFAULT 'pending'::"text",
    "last_sync_at" timestamp with time zone,
    "last_error" "text",
    "ota_account_email" "text",
    "ota_account_name" "text",
    "listings_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "channex_channel_connections_sync_status_check" CHECK (("sync_status" = ANY (ARRAY['synced'::"text", 'error'::"text", 'pending'::"text", 'syncing'::"text"])))
);


ALTER TABLE "public"."channex_channel_connections" OWNER TO "postgres";


COMMENT ON TABLE "public"."channex_channel_connections" IS 'Conexões com canais OTA via Channex. Cada conta pode ter N canais.';



CREATE TABLE IF NOT EXISTS "public"."channex_listing_connections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_mapping_id" "uuid" NOT NULL,
    "channel_connection_id" "uuid" NOT NULL,
    "ota_listing_id" "text",
    "ota_listing_url" "text",
    "is_active" boolean DEFAULT true,
    "sync_status" "text" DEFAULT 'pending'::"text",
    "last_sync_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "channex_listing_connections_sync_status_check" CHECK (("sync_status" = ANY (ARRAY['synced'::"text", 'error'::"text", 'pending'::"text", 'syncing'::"text"])))
);


ALTER TABLE "public"."channex_listing_connections" OWNER TO "postgres";


COMMENT ON TABLE "public"."channex_listing_connections" IS 'Conexão entre property mapeada e canal OTA. Rastreia listing IDs por canal.';



CREATE TABLE IF NOT EXISTS "public"."channex_property_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "rendizy_property_id" "uuid" NOT NULL,
    "channex_property_id" "text" NOT NULL,
    "sync_status" "text" DEFAULT 'pending'::"text",
    "last_sync_at" timestamp with time zone,
    "sync_error" "text",
    "last_synced_hash" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "channex_property_mappings_sync_status_check" CHECK (("sync_status" = ANY (ARRAY['synced'::"text", 'error'::"text", 'pending'::"text", 'syncing'::"text"])))
);


ALTER TABLE "public"."channex_property_mappings" OWNER TO "postgres";


COMMENT ON TABLE "public"."channex_property_mappings" IS 'Mapeamento property Rendizy ↔ Channex. Uma property Rendizy mapeia para exatamente 1 property Channex.';



CREATE TABLE IF NOT EXISTS "public"."channex_rate_plan_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_type_mapping_id" "uuid" NOT NULL,
    "rendizy_rate_plan_id" "uuid" NOT NULL,
    "channex_rate_plan_id" "text" NOT NULL,
    "sell_mode" "text" DEFAULT 'per_room'::"text",
    "currency" "text" DEFAULT 'BRL'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "channex_rate_plan_mappings_sell_mode_check" CHECK (("sell_mode" = ANY (ARRAY['per_room'::"text", 'per_person'::"text"])))
);


ALTER TABLE "public"."channex_rate_plan_mappings" OWNER TO "postgres";


COMMENT ON TABLE "public"."channex_rate_plan_mappings" IS 'Mapeamento rate_plan Rendizy ↔ Channex. Rate deve ser integer no Channex.';



CREATE TABLE IF NOT EXISTS "public"."channex_room_type_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_mapping_id" "uuid" NOT NULL,
    "rendizy_room_id" "uuid" NOT NULL,
    "channex_room_type_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."channex_room_type_mappings" OWNER TO "postgres";


COMMENT ON TABLE "public"."channex_room_type_mappings" IS 'Mapeamento room Rendizy ↔ room_type Channex.';



CREATE TABLE IF NOT EXISTS "public"."channex_webhook_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid",
    "property_mapping_id" "uuid",
    "event_type" "text" NOT NULL,
    "event_id" "text",
    "channex_property_id" "text",
    "ota_name" "text",
    "payload" "jsonb" NOT NULL,
    "processed" boolean DEFAULT false,
    "processed_at" timestamp with time zone,
    "processing_error" "text",
    "retry_count" integer DEFAULT 0,
    "max_retries" integer DEFAULT 3,
    "next_retry_at" timestamp with time zone,
    "result_type" "text",
    "result_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."channex_webhook_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."channex_webhook_logs" IS 'Log de todos os eventos webhook recebidos do Channex. Armazena payload bruto para auditoria e retry.';



CREATE TABLE IF NOT EXISTS "public"."channex_webhooks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "property_mapping_id" "uuid",
    "channex_webhook_id" "text" NOT NULL,
    "event_mask" "text" DEFAULT '*'::"text" NOT NULL,
    "callback_url" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "send_data" boolean DEFAULT true,
    "secret_header_name" "text",
    "secret_header_value" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."channex_webhooks" OWNER TO "postgres";


COMMENT ON TABLE "public"."channex_webhooks" IS 'Webhooks registrados na API Channex. Criados via POST /api/v1/webhooks.';



CREATE TABLE IF NOT EXISTS "public"."chat_channel_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "channel_type" "text" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "connected" boolean DEFAULT false NOT NULL,
    "last_connected_at" timestamp with time zone,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chat_channel_configs_channel_type_check" CHECK (("channel_type" = ANY (ARRAY['whatsapp'::"text", 'airbnb'::"text", 'booking'::"text", 'sms'::"text", 'email'::"text"])))
);


ALTER TABLE "public"."chat_channel_configs" OWNER TO "postgres";


COMMENT ON TABLE "public"."chat_channel_configs" IS 'Configuração de canais de comunicação por organização';



CREATE TABLE IF NOT EXISTS "public"."chat_channels_config" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "whatsapp_enabled" boolean DEFAULT false,
    "whatsapp_api_url" "text",
    "whatsapp_instance_name" character varying(255),
    "whatsapp_api_key" "text",
    "whatsapp_instance_token" "text",
    "whatsapp_status" character varying(20),
    "whatsapp_phone" character varying(50),
    "whatsapp_profile_name" character varying(255),
    "whatsapp_profile_picture_url" "text",
    "whatsapp_connected_at" timestamp with time zone,
    "whatsapp_last_sync" timestamp with time zone,
    "email_enabled" boolean DEFAULT false,
    "email_provider" character varying(50),
    "email_smtp_host" character varying(255),
    "email_smtp_port" integer,
    "email_smtp_user" character varying(255),
    "email_smtp_password" "text",
    "email_from_address" character varying(255),
    "email_from_name" character varying(255),
    "sms_enabled" boolean DEFAULT false,
    "sms_provider" character varying(50),
    "sms_api_key" "text",
    "sms_api_secret" "text",
    "sms_from_number" character varying(50),
    "webhook_url" "text",
    "webhook_events" "text"[],
    "webhook_secret" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chat_channels_config_whatsapp_status_check" CHECK ((("whatsapp_status")::"text" = ANY ((ARRAY['connected'::character varying, 'disconnected'::character varying, 'connecting'::character varying, 'error'::character varying])::"text"[])))
);


ALTER TABLE "public"."chat_channels_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."chat_channels_config" IS 'Configuração dos canais de comunicação (WhatsApp, Email, SMS)';



CREATE TABLE IF NOT EXISTS "public"."chat_contacts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "channel" character varying(20) NOT NULL,
    "external_id" character varying(255) NOT NULL,
    "name" character varying(255),
    "avatar_url" "text",
    "phone" character varying(50),
    "email" character varying(255),
    "guest_id" "uuid",
    "message_count" integer DEFAULT 0,
    "last_message_at" timestamp with time zone,
    "is_blocked" boolean DEFAULT false,
    "is_business" boolean DEFAULT false,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "pushname" character varying(255),
    "conversation_type" character varying(20) DEFAULT 'contact'::character varying,
    "group_name" character varying(255),
    "profile_pic_url" "text",
    "is_group" boolean DEFAULT false,
    "is_broadcast" boolean DEFAULT false,
    "phone_raw" character varying(50),
    "last_message" "text",
    "unread_count" integer DEFAULT 0,
    "is_online" boolean DEFAULT false,
    "last_seen" timestamp with time zone,
    "last_sync_at" timestamp with time zone,
    "source" character varying(50) DEFAULT 'evolution'::character varying,
    "labels" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "chat_contacts_channel_check" CHECK ((("channel")::"text" = ANY ((ARRAY['whatsapp'::character varying, 'email'::character varying, 'sms'::character varying, 'webchat'::character varying])::"text"[]))),
    CONSTRAINT "chat_contacts_conversation_type_check" CHECK ((("conversation_type")::"text" = ANY ((ARRAY['contact'::character varying, 'group'::character varying, 'broadcast'::character varying, 'unknown'::character varying])::"text"[])))
);


ALTER TABLE "public"."chat_contacts" OWNER TO "postgres";


COMMENT ON TABLE "public"."chat_contacts" IS 'Contatos de todos os canais';



COMMENT ON COLUMN "public"."chat_contacts"."pushname" IS 'Nome configurado pelo usuário no WhatsApp';



COMMENT ON COLUMN "public"."chat_contacts"."conversation_type" IS 'Tipo: contact, group, broadcast, unknown';



COMMENT ON COLUMN "public"."chat_contacts"."group_name" IS 'Nome do grupo (apenas para grupos @g.us)';



COMMENT ON COLUMN "public"."chat_contacts"."profile_pic_url" IS 'URL da foto de perfil (quando disponível)';



COMMENT ON COLUMN "public"."chat_contacts"."is_group" IS 'true se for grupo (@g.us)';



COMMENT ON COLUMN "public"."chat_contacts"."is_broadcast" IS 'true se for lista de transmissão (@lid)';



COMMENT ON COLUMN "public"."chat_contacts"."phone_raw" IS 'Número limpo: só dígitos, ex: 5522988783610';



COMMENT ON COLUMN "public"."chat_contacts"."labels" IS 'Etiquetas da Evolution API em formato JSON';



CREATE OR REPLACE VIEW "public"."chat_contacts_display" AS
 SELECT "id",
    "organization_id",
    "external_id",
    COALESCE(NULLIF(("group_name")::"text", ''::"text"), NULLIF(("pushname")::"text", ''::"text"), NULLIF(("name")::"text", ''::"text"),
        CASE
            WHEN "is_group" THEN 'Grupo sem nome'::"text"
            WHEN "is_broadcast" THEN 'Lista de transmissão'::"text"
            ELSE "concat"('+', "substring"(("phone_raw")::"text", 1, 2), ' ', "substring"(("phone_raw")::"text", 3, 2), ' ', "substring"(("phone_raw")::"text", 5))
        END) AS "display_name",
        CASE
            WHEN "is_group" THEN 'group'::"text"
            WHEN "is_broadcast" THEN 'broadcast'::"text"
            ELSE 'contact'::"text"
        END AS "icon_type",
    "phone",
    "phone_raw",
    "pushname",
    "group_name",
    "profile_pic_url",
    "is_group",
    "is_broadcast",
    "conversation_type",
    "last_message",
    "unread_count",
    "is_online",
    "last_seen",
    "last_sync_at",
    "created_at",
    "updated_at"
   FROM "public"."chat_contacts";


ALTER VIEW "public"."chat_contacts_display" OWNER TO "postgres";


COMMENT ON VIEW "public"."chat_contacts_display" IS 'View com nome formatado para exibição no Chat Inbox';



CREATE TABLE IF NOT EXISTS "public"."chat_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "channel_type" "text" NOT NULL,
    "external_id" "text" NOT NULL,
    "contact_name" "text",
    "contact_identifier" "text" NOT NULL,
    "contact_avatar_url" "text",
    "reservation_id" "text",
    "property_id" "uuid",
    "guest_id" "uuid",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "unread_count" integer DEFAULT 0 NOT NULL,
    "last_message_at" timestamp with time zone,
    "last_message_preview" "text",
    "last_message_direction" "text",
    "assigned_to" "uuid",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "priority" "text" DEFAULT 'normal'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chat_conversations_channel_type_check" CHECK (("channel_type" = ANY (ARRAY['whatsapp'::"text", 'airbnb'::"text", 'booking'::"text", 'sms'::"text", 'email'::"text"]))),
    CONSTRAINT "chat_conversations_last_message_direction_check" CHECK (("last_message_direction" = ANY (ARRAY['inbound'::"text", 'outbound'::"text"]))),
    CONSTRAINT "chat_conversations_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "chat_conversations_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'closed'::"text", 'archived'::"text", 'spam'::"text"])))
);


ALTER TABLE "public"."chat_conversations" OWNER TO "postgres";


COMMENT ON TABLE "public"."chat_conversations" IS 'Conversas unificadas de todos os canais de comunicação';



COMMENT ON COLUMN "public"."chat_conversations"."channel_type" IS 'Tipo do canal: whatsapp, airbnb, booking, sms, email';



COMMENT ON COLUMN "public"."chat_conversations"."external_id" IS 'ID da conversa no sistema externo (JID do WhatsApp, thread do Airbnb, etc)';



CREATE TABLE IF NOT EXISTS "public"."chat_message_templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "shortcut" character varying(50),
    "category" character varying(50),
    "content_text" "text" NOT NULL,
    "variables" "text"[],
    "channel" character varying(20),
    "is_active" boolean DEFAULT true,
    "usage_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid" NOT NULL,
    CONSTRAINT "chat_message_templates_category_check" CHECK ((("category")::"text" = ANY ((ARRAY['check-in'::character varying, 'check-out'::character varying, 'confirmacao'::character varying, 'cobranca'::character varying, 'suporte'::character varying, 'promocao'::character varying, 'outros'::character varying])::"text"[]))),
    CONSTRAINT "chat_message_templates_channel_check" CHECK ((("channel")::"text" = ANY ((ARRAY['whatsapp'::character varying, 'email'::character varying, 'sms'::character varying, 'all'::character varying])::"text"[])))
);


ALTER TABLE "public"."chat_message_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."chat_message_templates" IS 'Templates de mensagens rápidas';



CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "external_id" "text",
    "direction" "text" NOT NULL,
    "content_type" "text" DEFAULT 'text'::"text" NOT NULL,
    "content" "text",
    "media_url" "text",
    "media_mime_type" "text",
    "media_file_name" "text",
    "media_file_size" integer,
    "media_thumbnail_url" "text",
    "status" "text" DEFAULT 'sent'::"text" NOT NULL,
    "sender_name" "text",
    "sender_identifier" "text",
    "sender_user_id" "uuid",
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "delivered_at" timestamp with time zone,
    "read_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chat_messages_content_type_check" CHECK (("content_type" = ANY (ARRAY['text'::"text", 'image'::"text", 'audio'::"text", 'video'::"text", 'document'::"text", 'location'::"text", 'contact'::"text", 'sticker'::"text"]))),
    CONSTRAINT "chat_messages_direction_check" CHECK (("direction" = ANY (ARRAY['inbound'::"text", 'outbound'::"text"]))),
    CONSTRAINT "chat_messages_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'delivered'::"text", 'read'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."chat_messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."chat_messages" IS 'Mensagens de todas as conversas';



COMMENT ON COLUMN "public"."chat_messages"."direction" IS 'Direção da mensagem: inbound (recebida) ou outbound (enviada)';



COMMENT ON COLUMN "public"."chat_messages"."content_type" IS 'Tipo de conteúdo: text, image, audio, video, document, location, contact, sticker';



CREATE TABLE IF NOT EXISTS "public"."chat_webhooks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "channel" character varying(20) NOT NULL,
    "event" character varying(100) NOT NULL,
    "payload" "jsonb" NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "processed_at" timestamp with time zone,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chat_webhooks_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'processed'::character varying, 'failed'::character varying, 'ignored'::character varying])::"text"[])))
);


ALTER TABLE "public"."chat_webhooks" OWNER TO "postgres";


COMMENT ON TABLE "public"."chat_webhooks" IS 'Log de webhooks recebidos dos canais';



CREATE TABLE IF NOT EXISTS "public"."client_sites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "site_name" character varying(255) NOT NULL,
    "subdomain" character varying(100) NOT NULL,
    "domain" character varying(255),
    "template" character varying(50) DEFAULT 'moderno'::character varying,
    "source" character varying(50) DEFAULT 'custom'::character varying,
    "theme" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "site_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "features" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "logo_url" "text",
    "favicon_url" "text",
    "site_code" "text",
    "archive_path" "text",
    "archive_url" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "extracted_base_url" "text",
    "extracted_files_count" integer,
    "vercel_deployment_id" character varying(100),
    "vercel_deployment_url" "text",
    "vercel_deployment_status" character varying(50) DEFAULT 'NONE'::character varying,
    "hosting_providers" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "repo_provider" "text" DEFAULT 'github'::"text",
    "repo_url" "text",
    "repo_branch" "text" DEFAULT 'main'::"text",
    "repo_deploy_hook_url" "text",
    "repo_vercel_project_url" "text",
    "repo_last_deploy_status" "text",
    "repo_last_deploy_at" timestamp with time zone,
    "repo_last_deploy_error" "text",
    "repo_webhook_secret" "text",
    CONSTRAINT "valid_source" CHECK ((("source")::"text" = ANY ((ARRAY['bolt'::character varying, 'v0'::character varying, 'figma'::character varying, 'custom'::character varying])::"text"[]))),
    CONSTRAINT "valid_template" CHECK ((("template")::"text" = ANY ((ARRAY['custom'::character varying, 'moderno'::character varying, 'classico'::character varying, 'luxo'::character varying])::"text"[])))
);


ALTER TABLE "public"."client_sites" OWNER TO "postgres";


COMMENT ON TABLE "public"."client_sites" IS 'Sites de clientes - dados permanentes (migrado de KV Store)';



COMMENT ON COLUMN "public"."client_sites"."organization_id" IS 'Referência à organização dona do site';



COMMENT ON COLUMN "public"."client_sites"."subdomain" IS 'Subdomínio único (ex: medhome.rendizy.app)';



COMMENT ON COLUMN "public"."client_sites"."site_code" IS 'Código HTML/React do site (se enviado via código)';



COMMENT ON COLUMN "public"."client_sites"."archive_path" IS 'Caminho do arquivo ZIP no Storage';



COMMENT ON COLUMN "public"."client_sites"."archive_url" IS 'URL assinada do arquivo ZIP no Storage';



COMMENT ON COLUMN "public"."client_sites"."hosting_providers" IS 'Configurações de provedores de hospedagem (Vercel, Netlify, Cloudflare Pages, etc.)';



COMMENT ON COLUMN "public"."client_sites"."repo_provider" IS 'Provedor do repositório (github, gitlab, bitbucket)';



COMMENT ON COLUMN "public"."client_sites"."repo_url" IS 'URL do repositório do site';



COMMENT ON COLUMN "public"."client_sites"."repo_branch" IS 'Branch principal do deploy';



COMMENT ON COLUMN "public"."client_sites"."repo_deploy_hook_url" IS 'Deploy Hook da Vercel para disparar deploy';



COMMENT ON COLUMN "public"."client_sites"."repo_vercel_project_url" IS 'URL do projeto na Vercel';



COMMENT ON COLUMN "public"."client_sites"."repo_last_deploy_status" IS 'Status do último deploy via hook';



COMMENT ON COLUMN "public"."client_sites"."repo_last_deploy_at" IS 'Data/hora do último deploy via hook';



COMMENT ON COLUMN "public"."client_sites"."repo_last_deploy_error" IS 'Erro do último deploy via hook';



COMMENT ON COLUMN "public"."client_sites"."repo_webhook_secret" IS 'Secret do webhook GitHub (por site)';



CREATE TABLE IF NOT EXISTS "public"."conversation_activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "contact_phone" "text" NOT NULL,
    "action_type" "text" NOT NULL,
    "action_data" "jsonb" DEFAULT '{}'::"jsonb",
    "user_id" "uuid",
    "user_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."conversation_activity_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."conversation_activity_logs" IS 'Histórico de atividades/ações realizadas em conversas do chat';



COMMENT ON COLUMN "public"."conversation_activity_logs"."contact_phone" IS 'Telefone do contato (normalizado, sem @s.whatsapp.net)';



COMMENT ON COLUMN "public"."conversation_activity_logs"."action_type" IS 'Tipo de ação: quotation, checkin_status, observation, reservation, deal_created, block_created, message_sent';



COMMENT ON COLUMN "public"."conversation_activity_logs"."action_data" IS 'Dados específicos da ação em formato JSON';



CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "guest_name" "text",
    "guest_email" "text",
    "guest_phone" "text",
    "channel" "text" NOT NULL,
    "status" "text" DEFAULT 'normal'::"text",
    "category" "text" DEFAULT 'normal'::"text",
    "conversation_type" "text" DEFAULT 'guest'::"text",
    "last_message" "text",
    "last_message_at" timestamp with time zone,
    "unread_count" integer DEFAULT 0,
    "external_conversation_id" "text",
    "last_channel" "text",
    "channel_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "instance_id" "uuid",
    "contact_id" "uuid",
    CONSTRAINT "conversations_channel_check" CHECK (("channel" = ANY (ARRAY['whatsapp'::"text", 'email'::"text", 'sms'::"text", 'internal'::"text"]))),
    CONSTRAINT "conversations_conversation_type_check" CHECK (("conversation_type" = ANY (ARRAY['guest'::"text", 'staff'::"text", 'system'::"text"]))),
    CONSTRAINT "conversations_status_check" CHECK (("status" = ANY (ARRAY['pinned'::"text", 'urgent'::"text", 'normal'::"text", 'resolved'::"text"])))
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


COMMENT ON TABLE "public"."conversations" IS 'Armazena conversas de todos os canais (WhatsApp, Email, SMS, etc)';



COMMENT ON COLUMN "public"."conversations"."external_conversation_id" IS 'ID externo da conversa (ex: remoteJid do WhatsApp)';



CREATE TABLE IF NOT EXISTS "public"."corporate_payment_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reservation_id" "text" NOT NULL,
    "authorized_expenses" "text",
    "specified_incidental_expenses" "text"[],
    "total_charges_allowed" numeric(10,2),
    "total_charges_currency" "text" DEFAULT 'BRL'::"text",
    "is_cvc_required" boolean DEFAULT true,
    "authorizing_company" "text",
    "card_contact_given_name" "text",
    "card_contact_family_name" "text",
    "card_contact_email" "text",
    "card_contact_phone" "text",
    "payment_allowable_period_start" timestamp with time zone,
    "payment_allowable_period_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."corporate_payment_configs" OWNER TO "postgres";


COMMENT ON TABLE "public"."corporate_payment_configs" IS 'Configurações especiais para pagamentos corporativos';



CREATE TABLE IF NOT EXISTS "public"."country_iso_codes" (
    "code" "text" NOT NULL,
    "name_en" "text" NOT NULL,
    "name_pt" "text",
    "phone_code" "text"
);


ALTER TABLE "public"."country_iso_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_card_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "product_service_id" "uuid" NOT NULL,
    "sales_deal_id" "uuid",
    "service_ticket_id" "uuid",
    "predetermined_item_id" "uuid",
    "name" character varying(255),
    "description" "text",
    "quantity" numeric(10,2) DEFAULT 1,
    "unit_price" numeric(15,2) NOT NULL,
    "discount_percent" numeric(5,2) DEFAULT 0,
    "discount_amount" numeric(15,2) DEFAULT 0,
    "subtotal" numeric(15,2) GENERATED ALWAYS AS (("quantity" * "unit_price")) STORED,
    "total" numeric(15,2) GENERATED ALWAYS AS (((("quantity" * "unit_price") - "discount_amount") - ((("quantity" * "unit_price") * "discount_percent") / (100)::numeric))) STORED,
    "billing_type" character varying(20) DEFAULT 'one_time'::character varying,
    "recurrence_start" "date",
    "recurrence_end" "date",
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "crm_card_items_billing_type_check" CHECK ((("billing_type")::"text" = ANY ((ARRAY['one_time'::character varying, 'recurring'::character varying, 'per_unit'::character varying, 'per_night'::character varying])::"text"[]))),
    CONSTRAINT "crm_card_items_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'delivered'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."crm_card_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."crm_card_items" IS 'Itens (produtos/serviços) vinculados aos cards do CRM';



CREATE TABLE IF NOT EXISTS "public"."crm_companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "trading_name" character varying(255),
    "cnpj" character varying(20),
    "state_registration" character varying(50),
    "address_street" "text",
    "address_number" character varying(20),
    "address_complement" character varying(100),
    "address_neighborhood" character varying(100),
    "address_city" character varying(100),
    "address_state" character varying(50),
    "address_country" character varying(50) DEFAULT 'Brasil'::character varying,
    "address_zip" character varying(20),
    "phone" character varying(50),
    "email" character varying(255),
    "website" "text",
    "linkedin_url" "text",
    "instagram_url" "text",
    "facebook_url" "text",
    "industry" character varying(100),
    "annual_revenue" numeric(15,2),
    "employee_count" integer,
    "owner_id" "uuid",
    "owner_name" character varying(255),
    "labels" "jsonb" DEFAULT '[]'::"jsonb",
    "company_type" character varying(50),
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."crm_companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "first_name" character varying(100),
    "last_name" character varying(100),
    "full_name" character varying(255) GENERATED ALWAYS AS (TRIM(BOTH FROM (((COALESCE("first_name", ''::character varying))::"text" || ' '::"text") || (COALESCE("last_name", ''::character varying))::"text"))) STORED,
    "email" character varying(255),
    "phone" character varying(50),
    "mobile" character varying(50),
    "whatsapp_jid" character varying(100),
    "chat_contact_id" "uuid",
    "company_id" "uuid",
    "job_title" character varying(100),
    "department" character varying(100),
    "address_street" "text",
    "address_city" character varying(100),
    "address_state" character varying(50),
    "address_country" character varying(50) DEFAULT 'Brasil'::character varying,
    "address_zip" character varying(20),
    "linkedin_url" "text",
    "instagram_url" "text",
    "facebook_url" "text",
    "twitter_url" "text",
    "source" character varying(50),
    "source_detail" "text",
    "labels" "jsonb" DEFAULT '[]'::"jsonb",
    "contact_type" character varying(50) DEFAULT 'lead'::character varying,
    "birth_date" "date",
    "gender" character varying(20),
    "owner_id" "uuid",
    "owner_name" character varying(255),
    "visible_to" character varying(20) DEFAULT 'everyone'::character varying,
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "property_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "is_type_locked" boolean DEFAULT false,
    "cpf" character varying(20),
    "passport" character varying(50),
    "rg" character varying(30),
    "document_number" character varying(50),
    "address_number" character varying(20),
    "address_complement" character varying(100),
    "address_neighborhood" character varying(100),
    "nationality" character varying(50),
    "language" character varying(10) DEFAULT 'pt-BR'::character varying,
    "stats_total_reservations" integer DEFAULT 0,
    "stats_total_nights" integer DEFAULT 0,
    "stats_total_spent" numeric(12,2) DEFAULT 0,
    "stats_average_rating" numeric(3,2),
    "stats_last_stay_date" timestamp with time zone,
    "preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "is_blacklisted" boolean DEFAULT false,
    "blacklist_reason" "text",
    "blacklisted_at" timestamp with time zone,
    "blacklisted_by" "uuid",
    "staysnet_client_id" character varying(100),
    "staysnet_raw" "jsonb",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "contract_type" character varying(20),
    "contract_start_date" "date",
    "contract_end_date" "date",
    "contract_status" character varying(20) DEFAULT 'active'::character varying,
    "bank_data" "jsonb" DEFAULT '{}'::"jsonb",
    "taxa_comissao" numeric(5,2),
    "forma_pagamento_comissao" character varying(50),
    "is_premium" boolean DEFAULT false,
    "profissao" character varying(100),
    "renda_mensal" numeric(12,2),
    "phone_country_code" "text",
    "phone_area_code" "text",
    "phone_number_only" "text",
    "middle_name" "text",
    "date_of_birth" "date",
    "address_country_code" "text",
    "loyalty_program_name" "text",
    "loyalty_program_id" "text",
    "loyalty_id" "text",
    "prefers_smoking" boolean DEFAULT false,
    CONSTRAINT "crm_contacts_contact_type_check" CHECK ((("contact_type" IS NULL) OR (("contact_type")::"text" = ANY ((ARRAY['guest'::character varying, 'lead'::character varying, 'cliente'::character varying, 'ex-cliente'::character varying, 'proprietario'::character varying, 'parceiro'::character varying, 'fornecedor'::character varying, 'outro'::character varying])::"text"[])))),
    CONSTRAINT "crm_contacts_contract_type_check" CHECK ((("contract_type" IS NULL) OR (("contract_type")::"text" = ANY ((ARRAY['exclusivity'::character varying, 'non_exclusive'::character varying, 'temporary'::character varying])::"text"[]))))
);


ALTER TABLE "public"."crm_contacts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."crm_contacts"."contact_type" IS 'Tipo do contato: guest, lead, cliente, ex-cliente, proprietario, parceiro, fornecedor, outro';



COMMENT ON COLUMN "public"."crm_contacts"."user_id" IS 'Se o contato foi transformado em usuário, referência para users.id';



COMMENT ON COLUMN "public"."crm_contacts"."property_ids" IS 'Array de IDs de imóveis vinculados (para tipo proprietario)';



COMMENT ON COLUMN "public"."crm_contacts"."is_type_locked" IS 'Se true, tipo não pode ser alterado pelo usuário (ex: guest importado)';



COMMENT ON COLUMN "public"."crm_contacts"."cpf" IS 'CPF do contato (para guests e proprietários brasileiros)';



COMMENT ON COLUMN "public"."crm_contacts"."passport" IS 'Passaporte (para guests estrangeiros)';



COMMENT ON COLUMN "public"."crm_contacts"."preferences" IS 'Preferências do hóspede: {early_check_in, late_check_out, quiet_floor, high_floor, pets}';



COMMENT ON COLUMN "public"."crm_contacts"."staysnet_client_id" IS 'ID do cliente na StaysNet (para dedupe de importação)';



COMMENT ON COLUMN "public"."crm_contacts"."contract_type" IS 'Tipo de contrato (proprietário): exclusivity, non_exclusive, temporary';



COMMENT ON COLUMN "public"."crm_contacts"."bank_data" IS 'Dados bancários: {banco, agencia, conta, tipo_conta, chave_pix}';



COMMENT ON COLUMN "public"."crm_contacts"."phone_country_code" IS 'Código do país (ex: 55 para Brasil)';



COMMENT ON COLUMN "public"."crm_contacts"."phone_area_code" IS 'Código de área/DDD (ex: 11 para SP)';



COMMENT ON COLUMN "public"."crm_contacts"."phone_number_only" IS 'Número sem código de país/área';



COMMENT ON COLUMN "public"."crm_contacts"."middle_name" IS 'Nome do meio (opcional para Expedia)';



COMMENT ON COLUMN "public"."crm_contacts"."date_of_birth" IS 'Data de nascimento (obrigatório para algumas reservas)';



COMMENT ON COLUMN "public"."crm_contacts"."address_country_code" IS 'Código ISO do país (2 letras: BR, US, etc)';



COMMENT ON COLUMN "public"."crm_contacts"."loyalty_program_name" IS 'Nome do programa de fidelidade';



COMMENT ON COLUMN "public"."crm_contacts"."loyalty_program_id" IS 'ID do programa de fidelidade';



COMMENT ON COLUMN "public"."crm_contacts"."loyalty_id" IS 'ID do hóspede no programa de fidelidade';



COMMENT ON COLUMN "public"."crm_contacts"."prefers_smoking" IS 'Preferência por quarto para fumantes';



CREATE TABLE IF NOT EXISTS "public"."sales_deals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "funnel_id" "uuid" NOT NULL,
    "stage_id" "uuid" NOT NULL,
    "title" character varying(500) NOT NULL,
    "description" "text",
    "value" numeric(15,2) DEFAULT 0,
    "currency" character varying(3) DEFAULT 'BRL'::character varying,
    "probability" integer DEFAULT 50,
    "expected_close_date" "date",
    "contact_id" "uuid",
    "contact_name" character varying(255),
    "contact_email" character varying(255),
    "contact_phone" character varying(50),
    "contact_whatsapp_jid" character varying(100),
    "source" character varying(50) DEFAULT 'MANUAL'::character varying,
    "source_metadata" "jsonb",
    "owner_id" "uuid",
    "owner_name" character varying(255),
    "status" character varying(20) DEFAULT 'active'::character varying,
    "won_at" timestamp with time zone,
    "lost_at" timestamp with time zone,
    "lost_reason" "text",
    "tags" "text"[],
    "custom_fields" "jsonb",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "lost_reason_id" "uuid",
    "crm_contact_id" "uuid",
    "crm_company_id" "uuid",
    CONSTRAINT "sales_deals_probability_check" CHECK ((("probability" >= 0) AND ("probability" <= 100))),
    CONSTRAINT "sales_deals_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'won'::character varying, 'lost'::character varying])::"text"[])))
);


ALTER TABLE "public"."sales_deals" OWNER TO "postgres";


COMMENT ON COLUMN "public"."sales_deals"."contact_name" IS 'DEPRECATED: usar crm_contact_id. Mantido para retrocompatibilidade';



COMMENT ON COLUMN "public"."sales_deals"."crm_contact_id" IS 'FK para crm_contacts - pessoa vinculada ao deal';



COMMENT ON COLUMN "public"."sales_deals"."crm_company_id" IS 'FK para crm_companies - empresa vinculada ao deal';



CREATE OR REPLACE VIEW "public"."crm_companies_with_stats" AS
 SELECT "co"."id",
    "co"."organization_id",
    "co"."name",
    "co"."trading_name",
    "co"."cnpj",
    "co"."state_registration",
    "co"."address_street",
    "co"."address_number",
    "co"."address_complement",
    "co"."address_neighborhood",
    "co"."address_city",
    "co"."address_state",
    "co"."address_country",
    "co"."address_zip",
    "co"."phone",
    "co"."email",
    "co"."website",
    "co"."linkedin_url",
    "co"."instagram_url",
    "co"."facebook_url",
    "co"."industry",
    "co"."annual_revenue",
    "co"."employee_count",
    "co"."owner_id",
    "co"."owner_name",
    "co"."labels",
    "co"."company_type",
    "co"."custom_fields",
    "co"."notes",
    "co"."created_by",
    "co"."created_at",
    "co"."updated_at",
    COALESCE("contact_count"."total", (0)::bigint) AS "total_contacts",
    COALESCE("deal_stats"."total_deals", (0)::bigint) AS "total_deals",
    COALESCE("deal_stats"."active_deals", (0)::bigint) AS "active_deals",
    COALESCE("deal_stats"."won_deals", (0)::bigint) AS "won_deals",
    COALESCE("deal_stats"."total_value", (0)::numeric) AS "total_deals_value"
   FROM (("public"."crm_companies" "co"
     LEFT JOIN LATERAL ( SELECT "count"(*) AS "total"
           FROM "public"."crm_contacts"
          WHERE ("crm_contacts"."company_id" = "co"."id")) "contact_count" ON (true))
     LEFT JOIN LATERAL ( SELECT "count"(*) AS "total_deals",
            "count"(*) FILTER (WHERE (("sales_deals"."status")::"text" = 'active'::"text")) AS "active_deals",
            "count"(*) FILTER (WHERE (("sales_deals"."status")::"text" = 'won'::"text")) AS "won_deals",
            COALESCE("sum"("sales_deals"."value") FILTER (WHERE (("sales_deals"."status")::"text" = 'won'::"text")), (0)::numeric) AS "total_value"
           FROM "public"."sales_deals"
          WHERE ("sales_deals"."crm_company_id" = "co"."id")) "deal_stats" ON (true));


ALTER VIEW "public"."crm_companies_with_stats" OWNER TO "postgres";


COMMENT ON VIEW "public"."crm_companies_with_stats" IS 'Empresas CRM com estatísticas de contatos e deals';



CREATE OR REPLACE VIEW "public"."crm_contacts_expedia_format" AS
 SELECT "id",
    "organization_id",
    "first_name" AS "given_name",
    "last_name" AS "family_name",
    "middle_name",
    "email",
    "jsonb_build_object"('country_code', COALESCE("phone_country_code", '55'::"text"), 'area_code', "phone_area_code", 'number', "phone_number_only") AS "phone",
    "jsonb_build_object"('line_1', ("address_street" || COALESCE((' '::"text" || ("address_number")::"text"), ''::"text")), 'line_2', "address_complement", 'line_3', "address_neighborhood", 'city', "address_city", 'state_province_code', "address_state", 'postal_code', "address_zip", 'country_code', COALESCE("address_country_code", 'BR'::"text")) AS "address",
        CASE
            WHEN ("loyalty_id" IS NOT NULL) THEN "jsonb_build_object"('program_name', "loyalty_program_name", 'program_id', "loyalty_program_id", 'id', "loyalty_id")
            ELSE NULL::"jsonb"
        END AS "loyalty",
    "prefers_smoking" AS "smoking",
    "date_of_birth"
   FROM "public"."crm_contacts";


ALTER VIEW "public"."crm_contacts_expedia_format" OWNER TO "postgres";


COMMENT ON VIEW "public"."crm_contacts_expedia_format" IS 'Contatos formatados para API Expedia';



CREATE OR REPLACE VIEW "public"."crm_contacts_summary" AS
 SELECT "organization_id",
    "contact_type",
    "count"(*) AS "total",
    "count"(*) FILTER (WHERE ("is_blacklisted" = true)) AS "blacklisted",
    "count"(*) FILTER (WHERE ("is_premium" = true)) AS "premium"
   FROM "public"."crm_contacts"
  GROUP BY "organization_id", "contact_type";


ALTER VIEW "public"."crm_contacts_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."crm_contacts_with_stats" AS
 SELECT "c"."id",
    "c"."organization_id",
    "c"."first_name",
    "c"."last_name",
    "c"."full_name",
    "c"."email",
    "c"."phone",
    "c"."mobile",
    "c"."whatsapp_jid",
    "c"."chat_contact_id",
    "c"."company_id",
    "c"."job_title",
    "c"."department",
    "c"."address_street",
    "c"."address_city",
    "c"."address_state",
    "c"."address_country",
    "c"."address_zip",
    "c"."linkedin_url",
    "c"."instagram_url",
    "c"."facebook_url",
    "c"."twitter_url",
    "c"."source",
    "c"."source_detail",
    "c"."labels",
    "c"."contact_type",
    "c"."birth_date",
    "c"."gender",
    "c"."owner_id",
    "c"."owner_name",
    "c"."visible_to",
    "c"."custom_fields",
    "c"."notes",
    "c"."created_by",
    "c"."created_at",
    "c"."updated_at",
    "co"."name" AS "company_name",
    COALESCE("deal_stats"."total_deals", (0)::bigint) AS "total_deals",
    COALESCE("deal_stats"."active_deals", (0)::bigint) AS "active_deals",
    COALESCE("deal_stats"."won_deals", (0)::bigint) AS "won_deals",
    COALESCE("deal_stats"."total_value", (0)::numeric) AS "total_deals_value"
   FROM (("public"."crm_contacts" "c"
     LEFT JOIN "public"."crm_companies" "co" ON (("c"."company_id" = "co"."id")))
     LEFT JOIN LATERAL ( SELECT "count"(*) AS "total_deals",
            "count"(*) FILTER (WHERE (("sales_deals"."status")::"text" = 'active'::"text")) AS "active_deals",
            "count"(*) FILTER (WHERE (("sales_deals"."status")::"text" = 'won'::"text")) AS "won_deals",
            COALESCE("sum"("sales_deals"."value") FILTER (WHERE (("sales_deals"."status")::"text" = 'won'::"text")), (0)::numeric) AS "total_value"
           FROM "public"."sales_deals"
          WHERE ("sales_deals"."crm_contact_id" = "c"."id")) "deal_stats" ON (true));


ALTER VIEW "public"."crm_contacts_with_stats" OWNER TO "postgres";


COMMENT ON VIEW "public"."crm_contacts_with_stats" IS 'Contatos CRM com estatísticas de deals';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "username" character varying(255) NOT NULL,
    "password_hash" "text" NOT NULL,
    "name" character varying(255),
    "email" character varying(255),
    "type" character varying(50) DEFAULT 'staff'::character varying NOT NULL,
    "status" character varying(20) DEFAULT 'active'::character varying NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "last_login_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "owner_id" "uuid",
    "avatar_url" "text",
    "role" "text" DEFAULT 'staff'::"text",
    "email_verified" boolean DEFAULT false,
    "invited_by" "uuid",
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'manager'::"text", 'staff'::"text", 'readonly'::"text"]))),
    CONSTRAINT "users_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['superadmin'::character varying, 'imobiliaria'::character varying, 'staff'::character varying, 'owner'::character varying, 'owner_user'::character varying])::"text"[])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."owner_id" IS 'ID do proprietário (para usuários do tipo owner ou owner_user)';



COMMENT ON COLUMN "public"."users"."avatar_url" IS 'URL da foto de perfil do usuário (armazenada no Supabase Storage)';



CREATE OR REPLACE VIEW "public"."crm_contacts_with_user_access" AS
 SELECT "c"."id",
    "c"."organization_id",
    "c"."first_name",
    "c"."last_name",
    "c"."full_name",
    "c"."email",
    "c"."phone",
    "c"."mobile",
    "c"."whatsapp_jid",
    "c"."chat_contact_id",
    "c"."company_id",
    "c"."job_title",
    "c"."department",
    "c"."address_street",
    "c"."address_city",
    "c"."address_state",
    "c"."address_country",
    "c"."address_zip",
    "c"."linkedin_url",
    "c"."instagram_url",
    "c"."facebook_url",
    "c"."twitter_url",
    "c"."source",
    "c"."source_detail",
    "c"."labels",
    "c"."contact_type",
    "c"."birth_date",
    "c"."gender",
    "c"."owner_id",
    "c"."owner_name",
    "c"."visible_to",
    "c"."custom_fields",
    "c"."notes",
    "c"."created_by",
    "c"."created_at",
    "c"."updated_at",
    "c"."user_id",
    "c"."property_ids",
    "c"."is_type_locked",
    "u"."email" AS "user_email",
    "u"."type" AS "user_type",
    "u"."last_login_at" AS "user_last_login",
        CASE
            WHEN ("u"."id" IS NOT NULL) THEN true
            ELSE false
        END AS "has_user_access"
   FROM ("public"."crm_contacts" "c"
     LEFT JOIN "public"."users" "u" ON (("c"."user_id" = "u"."id")));


ALTER VIEW "public"."crm_contacts_with_user_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_lost_reasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "category" character varying(100),
    "apply_to_sales" boolean DEFAULT true,
    "apply_to_services" boolean DEFAULT true,
    "apply_to_predetermined" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "is_default" boolean DEFAULT false,
    "requires_notes" boolean DEFAULT false,
    "usage_count" integer DEFAULT 0,
    "last_used_at" timestamp with time zone,
    "sort_order" integer DEFAULT 0,
    "color" character varying(20) DEFAULT '#ef4444'::character varying,
    "icon" character varying(50),
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."crm_lost_reasons" OWNER TO "postgres";


COMMENT ON TABLE "public"."crm_lost_reasons" IS 'Motivos de perda cadastráveis para uso no botão Lost do CRM';



CREATE TABLE IF NOT EXISTS "public"."crm_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "deal_id" "uuid",
    "contact_id" "uuid",
    "company_id" "uuid",
    "task_id" "uuid",
    "ticket_id" "uuid",
    "note_type" character varying(20) DEFAULT 'general'::character varying,
    "created_by" "uuid",
    "created_by_name" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."crm_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_products_services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "code" character varying(50),
    "name" character varying(255) NOT NULL,
    "description" "text",
    "type" character varying(20) NOT NULL,
    "category" character varying(100),
    "price" numeric(15,2) DEFAULT 0 NOT NULL,
    "currency" character varying(3) DEFAULT 'BRL'::character varying,
    "billing_type" character varying(20) DEFAULT 'one_time'::character varying,
    "recurrence_interval" character varying(20),
    "recurrence_count" integer,
    "unit_name" character varying(50),
    "min_quantity" integer DEFAULT 1,
    "max_quantity" integer,
    "cost_price" numeric(15,2),
    "discount_allowed" boolean DEFAULT true,
    "max_discount_percent" numeric(5,2),
    "tax_rate" numeric(5,2) DEFAULT 0,
    "tax_included" boolean DEFAULT true,
    "is_active" boolean DEFAULT true,
    "available_from" "date",
    "available_until" "date",
    "apply_to_sales" boolean DEFAULT true,
    "apply_to_services" boolean DEFAULT true,
    "apply_to_predetermined" boolean DEFAULT false,
    "image_url" "text",
    "icon" character varying(50),
    "tags" "text"[],
    "custom_fields" "jsonb",
    "notes" "text",
    "sort_order" integer DEFAULT 0,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "crm_products_services_billing_type_check" CHECK ((("billing_type")::"text" = ANY ((ARRAY['one_time'::character varying, 'recurring'::character varying, 'per_unit'::character varying, 'per_night'::character varying])::"text"[]))),
    CONSTRAINT "crm_products_services_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['product'::character varying, 'service'::character varying])::"text"[])))
);


ALTER TABLE "public"."crm_products_services" OWNER TO "postgres";


COMMENT ON TABLE "public"."crm_products_services" IS 'Catálogo de produtos e serviços que podem ser vinculados aos cards do CRM';



CREATE TABLE IF NOT EXISTS "public"."crm_projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(200) NOT NULL,
    "description" "text",
    "project_type" character varying(20) DEFAULT 'project'::character varying,
    "template_id" "uuid",
    "status" character varying(20) DEFAULT 'active'::character varying,
    "client_name" character varying(200),
    "client_id" "uuid",
    "total_tasks" integer DEFAULT 0,
    "completed_tasks" integer DEFAULT 0,
    "color" character varying(7) DEFAULT '#3b82f6'::character varying,
    "icon" character varying(50) DEFAULT 'folder'::character varying,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."crm_projects" OWNER TO "postgres";


COMMENT ON TABLE "public"."crm_projects" IS 'Projetos e templates de projeto';



CREATE TABLE IF NOT EXISTS "public"."crm_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "title" character varying(500) NOT NULL,
    "description" "text",
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "priority" character varying(10) DEFAULT 'medium'::character varying,
    "task_type" character varying(20) DEFAULT 'task'::character varying,
    "parent_id" "uuid",
    "depth" integer DEFAULT 0,
    "path" "text",
    "assignee_id" "uuid",
    "team_id" "uuid",
    "due_date" timestamp with time zone,
    "start_date" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "estimated_minutes" integer,
    "actual_minutes" integer,
    "project_id" "uuid",
    "deal_id" "uuid",
    "ticket_id" "uuid",
    "property_id" "uuid",
    "reservation_id" "text",
    "display_order" integer DEFAULT 0,
    "section_name" character varying(100),
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."crm_tasks" OWNER TO "postgres";


COMMENT ON TABLE "public"."crm_tasks" IS 'Tarefas do CRM com suporte a hierarquia (subtarefas)';



CREATE TABLE IF NOT EXISTS "public"."crm_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "template_type" character varying(20) NOT NULL,
    "is_public" boolean DEFAULT false,
    "template_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "icon" character varying(50) DEFAULT 'file-text'::character varying,
    "color" character varying(7) DEFAULT '#6366f1'::character varying,
    "category" character varying(100),
    "tags" "text"[] DEFAULT ARRAY[]::"text"[],
    "use_count" integer DEFAULT 0,
    "last_used_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."crm_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."crm_templates" IS 'Templates reutilizáveis de tarefas e projetos do CRM';



COMMENT ON COLUMN "public"."crm_templates"."template_type" IS 'Tipo: task (tarefa individual) ou project (projeto completo com estrutura)';



COMMENT ON COLUMN "public"."crm_templates"."is_public" IS 'Se true, todos os usuários da organização podem usar este template';



COMMENT ON COLUMN "public"."crm_templates"."template_data" IS 'JSON com a estrutura completa do template (campos variam por tipo)';



COMMENT ON COLUMN "public"."crm_templates"."use_count" IS 'Contador de quantas vezes este template foi usado';



CREATE TABLE IF NOT EXISTS "public"."custom_field_values" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "custom_field_id" "uuid" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "entity_type" character varying(20) NOT NULL,
    "value_text" "text",
    "value_number" numeric(15,2),
    "value_date" "date",
    "value_json" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."custom_field_values" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_fields" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "field_type" character varying(20) NOT NULL,
    "options" "jsonb" DEFAULT '[]'::"jsonb",
    "is_required" boolean DEFAULT false,
    "is_visible_in_list" boolean DEFAULT true,
    "default_value" "text",
    "scope" character varying(20) DEFAULT 'task'::character varying,
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."custom_fields" OWNER TO "postgres";


COMMENT ON TABLE "public"."custom_fields" IS 'Campos customizados dinâmicos para tarefas, deals, etc';



CREATE TABLE IF NOT EXISTS "public"."custom_min_nights" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "min_nights" integer NOT NULL,
    "reason" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid" NOT NULL
);


ALTER TABLE "public"."custom_min_nights" OWNER TO "postgres";


COMMENT ON TABLE "public"."custom_min_nights" IS 'Mínimo de noites customizado por data';



CREATE TABLE IF NOT EXISTS "public"."custom_prices" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "price" integer NOT NULL,
    "type" character varying(20) NOT NULL,
    "reason" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid" NOT NULL,
    CONSTRAINT "custom_prices_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['special'::character varying, 'seasonal'::character varying, 'event'::character varying])::"text"[])))
);


ALTER TABLE "public"."custom_prices" OWNER TO "postgres";


COMMENT ON TABLE "public"."custom_prices" IS 'Preços customizados por data';



CREATE TABLE IF NOT EXISTS "public"."deposit_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "rate_plan_id" "uuid",
    "property_id" "uuid",
    "deposit_type" "text" NOT NULL,
    "deposit_value" numeric(10,2),
    "deposit_currency" "text" DEFAULT 'BRL'::"text",
    "nights_count" integer,
    "due_type" "text" NOT NULL,
    "due_days_before" integer,
    "is_refundable" boolean DEFAULT true,
    "refund_deadline_days" integer,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "deposit_schedules_deposit_type_check" CHECK (("deposit_type" = ANY (ARRAY['percentage'::"text", 'fixed'::"text", 'first_night'::"text", 'first_nights'::"text", 'full'::"text"]))),
    CONSTRAINT "deposit_schedules_due_type_check" CHECK (("due_type" = ANY (ARRAY['at_booking'::"text", 'days_before'::"text", 'date'::"text"])))
);


ALTER TABLE "public"."deposit_schedules" OWNER TO "postgres";


COMMENT ON TABLE "public"."deposit_schedules" IS 'Configuração de depósitos para reservas';



CREATE TABLE IF NOT EXISTS "public"."evolution_instances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" integer NOT NULL,
    "instance_name" "text" NOT NULL,
    "instance_api_key" "text" NOT NULL,
    "global_api_key" "text",
    "base_url" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."evolution_instances" OWNER TO "postgres";


COMMENT ON TABLE "public"."evolution_instances" IS 'Instâncias Evolution API por usuário (multi-tenant)';



COMMENT ON COLUMN "public"."evolution_instances"."user_id" IS 'ID do usuário dono da instância';



COMMENT ON COLUMN "public"."evolution_instances"."instance_name" IS 'Nome da instância (ex: TESTE)';



COMMENT ON COLUMN "public"."evolution_instances"."instance_api_key" IS 'API Key específica da instância';



COMMENT ON COLUMN "public"."evolution_instances"."global_api_key" IS 'Global API Key (opcional)';



COMMENT ON COLUMN "public"."evolution_instances"."base_url" IS 'URL base da Evolution API';



CREATE TABLE IF NOT EXISTS "public"."evolution_instances_backup" (
    "id" "uuid",
    "user_id" integer,
    "instance_name" "text",
    "instance_api_key" "text",
    "global_api_key" "text",
    "base_url" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."evolution_instances_backup" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."financeiro_campo_plano_contas_mapping" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "modulo" "text" NOT NULL,
    "campo_codigo" "text" NOT NULL,
    "campo_nome" "text" NOT NULL,
    "campo_tipo" "text" NOT NULL,
    "categoria_id" "uuid",
    "descricao" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "text",
    "is_system_field" boolean DEFAULT false,
    "registered_by_module" "text",
    "obrigatorio" boolean DEFAULT false,
    CONSTRAINT "financeiro_campo_plano_contas_mapping_campo_tipo_check" CHECK (("campo_tipo" = ANY (ARRAY['receita'::"text", 'despesa'::"text"])))
);


ALTER TABLE "public"."financeiro_campo_plano_contas_mapping" OWNER TO "postgres";


COMMENT ON COLUMN "public"."financeiro_campo_plano_contas_mapping"."is_system_field" IS 'Indica se é um campo do sistema que deve aparecer sempre na interface';



COMMENT ON COLUMN "public"."financeiro_campo_plano_contas_mapping"."registered_by_module" IS 'Módulo que registrou este campo (ex: integracoes.airbnb, pagamentos.stripe)';



COMMENT ON COLUMN "public"."financeiro_campo_plano_contas_mapping"."obrigatorio" IS 'Se true, o campo DEVE ter um mapeamento para conta do plano de contas';



CREATE TABLE IF NOT EXISTS "public"."financeiro_categorias" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "codigo" "text" NOT NULL,
    "nome" "text" NOT NULL,
    "descricao" "text",
    "parent_id" "uuid",
    "nivel" integer NOT NULL,
    "tipo" "text" NOT NULL,
    "natureza" "text" NOT NULL,
    "mapeamento_dre" "text",
    "mapeamento_ifrs" "text",
    "ativo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "financeiro_categorias_natureza_check" CHECK (("natureza" = ANY (ARRAY['devedora'::"text", 'credora'::"text"]))),
    CONSTRAINT "financeiro_categorias_nivel_check" CHECK ((("nivel" >= 1) AND ("nivel" <= 5))),
    CONSTRAINT "financeiro_categorias_tipo_check" CHECK (("tipo" = ANY (ARRAY['receita'::"text", 'despesa'::"text", 'transferencia'::"text"])))
);


ALTER TABLE "public"."financeiro_categorias" OWNER TO "postgres";


COMMENT ON TABLE "public"."financeiro_categorias" IS 'Plano de contas hierárquico (até 5 níveis)';



CREATE TABLE IF NOT EXISTS "public"."financeiro_centro_custos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "codigo" "text" NOT NULL,
    "nome" "text" NOT NULL,
    "descricao" "text",
    "tipo" "text" NOT NULL,
    "property_id" "uuid",
    "orcamento_anual" numeric(15,2),
    "orcamento_mensal" numeric(15,2),
    "ativo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "financeiro_centro_custos_tipo_check" CHECK (("tipo" = ANY (ARRAY['propriedade'::"text", 'projeto'::"text", 'departamento'::"text", 'outro'::"text"])))
);


ALTER TABLE "public"."financeiro_centro_custos" OWNER TO "postgres";


COMMENT ON TABLE "public"."financeiro_centro_custos" IS 'Centros de custo por propriedade/projeto/departamento';



CREATE TABLE IF NOT EXISTS "public"."financeiro_contas_bancarias" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "banco" "text",
    "agencia" "text",
    "numero" "text",
    "tipo" "text" NOT NULL,
    "moeda" "text" DEFAULT 'BRL'::"text" NOT NULL,
    "saldo_inicial" numeric(15,2) DEFAULT 0 NOT NULL,
    "saldo_atual" numeric(15,2) DEFAULT 0 NOT NULL,
    "status_feed" "text",
    "ultima_sincronizacao" timestamp with time zone,
    "consentimento_id" "text",
    "consentimento_validade" timestamp with time zone,
    "ativo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "financeiro_contas_bancarias_moeda_check" CHECK (("moeda" = ANY (ARRAY['BRL'::"text", 'USD'::"text", 'EUR'::"text"]))),
    CONSTRAINT "financeiro_contas_bancarias_status_feed_check" CHECK (("status_feed" = ANY (ARRAY['conectado'::"text", 'desconectado'::"text", 'erro'::"text", 'expirado'::"text"]))),
    CONSTRAINT "financeiro_contas_bancarias_tipo_check" CHECK (("tipo" = ANY (ARRAY['corrente'::"text", 'poupanca'::"text", 'investimento'::"text"])))
);


ALTER TABLE "public"."financeiro_contas_bancarias" OWNER TO "postgres";


COMMENT ON TABLE "public"."financeiro_contas_bancarias" IS 'Contas bancárias da organização';



CREATE TABLE IF NOT EXISTS "public"."financeiro_lancamentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "tipo" "text" NOT NULL,
    "data" "date" NOT NULL,
    "competencia" "date" NOT NULL,
    "valor" numeric(15,2) NOT NULL,
    "moeda" "text" DEFAULT 'BRL'::"text" NOT NULL,
    "valor_convertido" numeric(15,2),
    "descricao" "text" NOT NULL,
    "documento" "text",
    "nota_fiscal" "text",
    "categoria_id" "uuid",
    "conta_id" "uuid" NOT NULL,
    "centro_custo_id" "uuid",
    "property_id" "uuid",
    "conta_origem_id" "uuid",
    "conta_destino_id" "uuid",
    "has_split" boolean DEFAULT false NOT NULL,
    "conciliado" boolean DEFAULT false NOT NULL,
    "linha_extrato_id" "uuid",
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "check_categoria_required" CHECK (((("tipo" <> 'transferencia'::"text") AND ("categoria_id" IS NOT NULL)) OR ("tipo" = 'transferencia'::"text"))),
    CONSTRAINT "check_transferencia_contas" CHECK (((("tipo" = 'transferencia'::"text") AND ("conta_origem_id" IS NOT NULL) AND ("conta_destino_id" IS NOT NULL)) OR (("tipo" <> 'transferencia'::"text") AND ("conta_origem_id" IS NULL) AND ("conta_destino_id" IS NULL)))),
    CONSTRAINT "financeiro_lancamentos_moeda_check" CHECK (("moeda" = ANY (ARRAY['BRL'::"text", 'USD'::"text", 'EUR'::"text"]))),
    CONSTRAINT "financeiro_lancamentos_tipo_check" CHECK (("tipo" = ANY (ARRAY['entrada'::"text", 'saida'::"text", 'transferencia'::"text"]))),
    CONSTRAINT "financeiro_lancamentos_valor_check" CHECK (("valor" > (0)::numeric))
);


ALTER TABLE "public"."financeiro_lancamentos" OWNER TO "postgres";


COMMENT ON TABLE "public"."financeiro_lancamentos" IS 'Lançamentos contábeis (entrada/saída/transferência)';



CREATE TABLE IF NOT EXISTS "public"."financeiro_lancamentos_splits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lancamento_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "tipo_split" "text" NOT NULL,
    "valor_percentual" numeric(5,2),
    "valor_fixo" numeric(15,2),
    "categoria_id" "uuid",
    "conta_id" "uuid",
    "centro_custo_id" "uuid",
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_split_valor" CHECK (((("tipo_split" = 'percentual'::"text") AND ("valor_percentual" IS NOT NULL) AND ("valor_fixo" IS NULL)) OR (("tipo_split" = 'valor_fixo'::"text") AND ("valor_fixo" IS NOT NULL) AND ("valor_percentual" IS NULL)))),
    CONSTRAINT "financeiro_lancamentos_splits_tipo_split_check" CHECK (("tipo_split" = ANY (ARRAY['percentual'::"text", 'valor_fixo'::"text"])))
);


ALTER TABLE "public"."financeiro_lancamentos_splits" OWNER TO "postgres";


COMMENT ON TABLE "public"."financeiro_lancamentos_splits" IS 'Rateio de lançamentos (split)';



CREATE TABLE IF NOT EXISTS "public"."financeiro_linhas_extrato" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "conta_id" "uuid" NOT NULL,
    "data" "date" NOT NULL,
    "descricao" "text" NOT NULL,
    "valor" numeric(15,2) NOT NULL,
    "moeda" "text" DEFAULT 'BRL'::"text" NOT NULL,
    "tipo" "text" NOT NULL,
    "ref" "text",
    "ref_banco" "text",
    "hash_unico" "text" NOT NULL,
    "origem" "text" NOT NULL,
    "conciliado" boolean DEFAULT false NOT NULL,
    "lancamento_id" "uuid",
    "confianca_ml" numeric(5,2),
    "sugestao_categoria_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "financeiro_linhas_extrato_moeda_check" CHECK (("moeda" = ANY (ARRAY['BRL'::"text", 'USD'::"text", 'EUR'::"text"]))),
    CONSTRAINT "financeiro_linhas_extrato_origem_check" CHECK (("origem" = ANY (ARRAY['ofx'::"text", 'csv'::"text", 'open_finance'::"text", 'manual'::"text"]))),
    CONSTRAINT "financeiro_linhas_extrato_tipo_check" CHECK (("tipo" = ANY (ARRAY['debito'::"text", 'credito'::"text"])))
);


ALTER TABLE "public"."financeiro_linhas_extrato" OWNER TO "postgres";


COMMENT ON TABLE "public"."financeiro_linhas_extrato" IS 'Linhas de extrato bancário importadas';



CREATE TABLE IF NOT EXISTS "public"."financeiro_regras_conciliacao" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "descricao" "text",
    "ativo" boolean DEFAULT true NOT NULL,
    "prioridade" integer DEFAULT 50 NOT NULL,
    "padrao_operador" "text" NOT NULL,
    "padrao_termo" "text" NOT NULL,
    "valor_operador" "text",
    "valor_a" numeric(15,2),
    "valor_b" numeric(15,2),
    "tipo_lancamento" "text",
    "categoria_id" "uuid",
    "conta_contrapartida_id" "uuid",
    "centro_custo_id" "uuid",
    "acao" "text" NOT NULL,
    "aplicacoes" integer DEFAULT 0 NOT NULL,
    "ultima_aplicacao" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "financeiro_regras_conciliacao_acao_check" CHECK (("acao" = ANY (ARRAY['sugerir'::"text", 'auto_conciliar'::"text", 'auto_criar'::"text"]))),
    CONSTRAINT "financeiro_regras_conciliacao_padrao_operador_check" CHECK (("padrao_operador" = ANY (ARRAY['contains'::"text", 'equals'::"text", 'regex'::"text"]))),
    CONSTRAINT "financeiro_regras_conciliacao_prioridade_check" CHECK ((("prioridade" >= 0) AND ("prioridade" <= 100))),
    CONSTRAINT "financeiro_regras_conciliacao_tipo_lancamento_check" CHECK (("tipo_lancamento" = ANY (ARRAY['entrada'::"text", 'saida'::"text", 'transferencia'::"text"]))),
    CONSTRAINT "financeiro_regras_conciliacao_valor_operador_check" CHECK (("valor_operador" = ANY (ARRAY['eq'::"text", 'gte'::"text", 'lte'::"text", 'between'::"text"])))
);


ALTER TABLE "public"."financeiro_regras_conciliacao" OWNER TO "postgres";


COMMENT ON TABLE "public"."financeiro_regras_conciliacao" IS 'Regras automáticas de conciliação bancária';



CREATE TABLE IF NOT EXISTS "public"."financeiro_titulos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "tipo" "text" NOT NULL,
    "numero" "text" NOT NULL,
    "descricao" "text" NOT NULL,
    "valor_original" numeric(15,2) NOT NULL,
    "valor_pago" numeric(15,2) DEFAULT 0 NOT NULL,
    "valor_restante" numeric(15,2) NOT NULL,
    "moeda" "text" DEFAULT 'BRL'::"text" NOT NULL,
    "emissao" "date" NOT NULL,
    "vencimento" "date" NOT NULL,
    "pagamento" "date",
    "categoria_id" "uuid",
    "conta_id" "uuid",
    "centro_custo_id" "uuid",
    "property_id" "uuid",
    "guest_id" "uuid",
    "reservation_id" "text",
    "status" "text" DEFAULT 'aberto'::"text" NOT NULL,
    "taxa_juros_mensal" numeric(5,2) DEFAULT 1.00,
    "taxa_multa" numeric(5,2) DEFAULT 2.00,
    "juros_calculado" numeric(15,2) DEFAULT 0,
    "multa_calculada" numeric(15,2) DEFAULT 0,
    "desconto_antecipacao" numeric(15,2) DEFAULT 0,
    "recorrente" boolean DEFAULT false NOT NULL,
    "frequencia" "text",
    "proxima_parcela" "date",
    "total_parcelas" integer,
    "parcela_atual" integer,
    "titulo_pai_id" "uuid",
    "enviar_cobranca" boolean DEFAULT false NOT NULL,
    "ultima_cobranca" timestamp with time zone,
    "proxima_cobranca" "date",
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "check_status_pago" CHECK (((("status" = 'pago'::"text") AND ("pagamento" IS NOT NULL)) OR ("status" <> 'pago'::"text"))),
    CONSTRAINT "check_valor_pago" CHECK (("valor_pago" <= "valor_original")),
    CONSTRAINT "check_valor_restante" CHECK (("valor_restante" >= (0)::numeric)),
    CONSTRAINT "financeiro_titulos_frequencia_check" CHECK (("frequencia" = ANY (ARRAY['mensal'::"text", 'trimestral'::"text", 'semestral'::"text", 'anual'::"text"]))),
    CONSTRAINT "financeiro_titulos_moeda_check" CHECK (("moeda" = ANY (ARRAY['BRL'::"text", 'USD'::"text", 'EUR'::"text"]))),
    CONSTRAINT "financeiro_titulos_status_check" CHECK (("status" = ANY (ARRAY['aberto'::"text", 'pago'::"text", 'vencido'::"text", 'cancelado'::"text", 'parcial'::"text"]))),
    CONSTRAINT "financeiro_titulos_tipo_check" CHECK (("tipo" = ANY (ARRAY['receber'::"text", 'pagar'::"text"]))),
    CONSTRAINT "financeiro_titulos_valor_original_check" CHECK (("valor_original" > (0)::numeric))
);


ALTER TABLE "public"."financeiro_titulos" OWNER TO "postgres";


COMMENT ON TABLE "public"."financeiro_titulos" IS 'Títulos a receber e a pagar';



CREATE TABLE IF NOT EXISTS "public"."geographic_regions" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "name_full" "text",
    "type" "text" NOT NULL,
    "parent_id" "text",
    "country_code" "text",
    "latitude" numeric(10,7),
    "longitude" numeric(10,7),
    "bbox_north" numeric(10,7),
    "bbox_south" numeric(10,7),
    "bbox_east" numeric(10,7),
    "bbox_west" numeric(10,7),
    "categories" "text"[],
    "property_count" integer DEFAULT 0,
    "tags" "text"[],
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "geographic_regions_type_check" CHECK (("type" = ANY (ARRAY['continent'::"text", 'country'::"text", 'province_state'::"text", 'multi_city_vicinity'::"text", 'city'::"text", 'neighborhood'::"text", 'airport'::"text", 'poi'::"text", 'metro_station'::"text", 'train_station'::"text"])))
);


ALTER TABLE "public"."geographic_regions" OWNER TO "postgres";


COMMENT ON TABLE "public"."geographic_regions" IS 'Regiões geográficas para busca e filtro';



CREATE TABLE IF NOT EXISTS "public"."guest_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text",
    "avatar_url" "text",
    "google_id" "text",
    "apple_id" "text",
    "password_hash" "text",
    "organization_id" "uuid",
    "status" "text" DEFAULT 'active'::"text",
    "email_verified" boolean DEFAULT false,
    "preferred_language" "text" DEFAULT 'pt-BR'::"text",
    "marketing_opt_in" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_login_at" timestamp with time zone,
    CONSTRAINT "guest_users_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'blocked'::"text"])))
);


ALTER TABLE "public"."guest_users" OWNER TO "postgres";


COMMENT ON TABLE "public"."guest_users" IS 'Hóspedes dos sites clientes (login via Google, Apple ou email)';



COMMENT ON COLUMN "public"."guest_users"."google_id" IS 'ID único do usuário no Google (sub do JWT)';



COMMENT ON COLUMN "public"."guest_users"."apple_id" IS 'ID único do usuário no Apple (sub do JWT)';



COMMENT ON COLUMN "public"."guest_users"."password_hash" IS 'Hash bcrypt da senha (apenas para login email/senha)';



COMMENT ON COLUMN "public"."guest_users"."organization_id" IS 'Qual cliente do Rendizy este hóspede pertence';



CREATE TABLE IF NOT EXISTS "public"."guests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "first_name" character varying(100) NOT NULL,
    "last_name" character varying(100) NOT NULL,
    "email" character varying(255) NOT NULL,
    "phone" character varying(50) NOT NULL,
    "cpf" character varying(14),
    "passport" character varying(50),
    "rg" character varying(20),
    "address_street" character varying(255),
    "address_number" character varying(20),
    "address_complement" character varying(100),
    "address_neighborhood" character varying(100),
    "address_city" character varying(100),
    "address_state" character varying(50),
    "address_zip_code" character varying(20),
    "address_country" character varying(50),
    "birth_date" "date",
    "nationality" character varying(50),
    "language" character varying(10) DEFAULT 'pt-BR'::character varying,
    "stats_total_reservations" integer DEFAULT 0,
    "stats_total_nights" integer DEFAULT 0,
    "stats_total_spent" integer DEFAULT 0,
    "stats_average_rating" numeric(3,2),
    "stats_last_stay_date" "date",
    "preferences_early_check_in" boolean DEFAULT false,
    "preferences_late_check_out" boolean DEFAULT false,
    "preferences_quiet_floor" boolean DEFAULT false,
    "preferences_high_floor" boolean DEFAULT false,
    "preferences_pets" boolean DEFAULT false,
    "tags" "text"[],
    "is_blacklisted" boolean DEFAULT false,
    "blacklist_reason" "text",
    "blacklisted_at" timestamp with time zone,
    "blacklisted_by" "uuid",
    "notes" "text",
    "source" character varying(20) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "full_name" "text",
    "document_number" "text",
    "staysnet_client_id" "text",
    "staysnet_raw" "jsonb",
    CONSTRAINT "guests_source_check" CHECK ((("source")::"text" = ANY ((ARRAY['airbnb'::character varying, 'booking'::character varying, 'decolar'::character varying, 'direct'::character varying, 'other'::character varying])::"text"[])))
);


ALTER TABLE "public"."guests" OWNER TO "postgres";


COMMENT ON TABLE "public"."guests" IS 'Complete guest management with multi-tenant support';



COMMENT ON COLUMN "public"."guests"."organization_id" IS 'Organization/imobiliaria ID (multi-tenant)';



COMMENT ON COLUMN "public"."guests"."first_name" IS 'Guest first name';



COMMENT ON COLUMN "public"."guests"."last_name" IS 'Guest last name';



COMMENT ON COLUMN "public"."guests"."is_blacklisted" IS 'Flag indicating if guest is blacklisted';



COMMENT ON COLUMN "public"."guests"."source" IS 'Guest acquisition source (airbnb, booking, decolar, direct, other)';



COMMENT ON COLUMN "public"."guests"."staysnet_client_id" IS 'ID do cliente na Stays (ex.: reservations.staysnet_client_id)';



COMMENT ON COLUMN "public"."guests"."staysnet_raw" IS 'Payload bruto do hóspede/cliente vindo da Stays (quando disponível)';



CREATE TABLE IF NOT EXISTS "public"."integration_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "integration_name" "text" NOT NULL,
    "config" "jsonb" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."integration_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "email" character varying(255) NOT NULL,
    "role" character varying(20) NOT NULL,
    "token" character varying(255) NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "accepted_at" timestamp with time zone,
    CONSTRAINT "invitations_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'expired'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."invitations" OWNER TO "postgres";


COMMENT ON TABLE "public"."invitations" IS 'Convites para novos usuários';



CREATE TABLE IF NOT EXISTS "public"."kv_backups" (
    "kv_key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "backed_up_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."kv_backups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kv_store_67caf26a" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."kv_store_67caf26a" OWNER TO "postgres";


COMMENT ON TABLE "public"."kv_store_67caf26a" IS 'Tabela principal Key-Value Store para todos os dados do sistema Rendizy';



COMMENT ON COLUMN "public"."kv_store_67caf26a"."key" IS 'Chave única (ex: org:123, acc:456, reservation:789)';



COMMENT ON COLUMN "public"."kv_store_67caf26a"."value" IS 'Valor em formato JSON (JSONB)';



CREATE TABLE IF NOT EXISTS "public"."listing_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "listing_id" "uuid" NOT NULL,
    "overrides" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."listing_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."listings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "accommodation_id" "uuid" NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "title_pt" "text",
    "title_en" "text",
    "title_es" "text",
    "description_pt" "text",
    "description_en" "text",
    "description_es" "text",
    "platforms_airbnb_enabled" boolean DEFAULT false,
    "platforms_airbnb_status" character varying(20),
    "platforms_airbnb_listing_url" "text",
    "platforms_airbnb_external_id" character varying(100),
    "platforms_airbnb_last_sync" timestamp with time zone,
    "platforms_airbnb_sync_calendar" boolean DEFAULT false,
    "platforms_airbnb_sync_pricing" boolean DEFAULT false,
    "platforms_airbnb_sync_availability" boolean DEFAULT false,
    "platforms_booking_enabled" boolean DEFAULT false,
    "platforms_booking_status" character varying(20),
    "platforms_booking_listing_url" "text",
    "platforms_booking_external_id" character varying(100),
    "platforms_booking_last_sync" timestamp with time zone,
    "platforms_booking_sync_calendar" boolean DEFAULT false,
    "platforms_booking_sync_pricing" boolean DEFAULT false,
    "platforms_booking_sync_availability" boolean DEFAULT false,
    "platforms_decolar_enabled" boolean DEFAULT false,
    "platforms_decolar_status" character varying(20),
    "platforms_decolar_listing_url" "text",
    "platforms_decolar_external_id" character varying(100),
    "platforms_decolar_last_sync" timestamp with time zone,
    "platforms_decolar_sync_calendar" boolean DEFAULT false,
    "platforms_decolar_sync_pricing" boolean DEFAULT false,
    "platforms_decolar_sync_availability" boolean DEFAULT false,
    "platforms_direct_enabled" boolean DEFAULT true,
    "platforms_direct_status" character varying(20),
    "platforms_direct_booking_url" "text",
    "seo_slug" character varying(255),
    "seo_meta_title" character varying(255),
    "seo_meta_description" "text",
    "seo_keywords" "text"[],
    "ical_urls_airbnb" "text",
    "ical_urls_booking" "text",
    "ical_urls_decolar" "text",
    "ical_urls_vrbo" "text",
    "ical_urls_homeaway" "text",
    "ical_urls_other" "text"[],
    "stats_total_views" integer DEFAULT 0,
    "stats_total_bookings" integer DEFAULT 0,
    "stats_average_rating" numeric(3,2),
    "stats_response_rate" numeric(5,2),
    "stats_response_time" integer,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "published_at" timestamp with time zone
);


ALTER TABLE "public"."listings" OWNER TO "postgres";


COMMENT ON TABLE "public"."listings" IS 'Anúncios publicados em plataformas';



CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "code" character varying(50) NOT NULL,
    "address_street" character varying(255) NOT NULL,
    "address_number" character varying(20) NOT NULL,
    "address_neighborhood" character varying(100) NOT NULL,
    "address_city" character varying(100) NOT NULL,
    "address_state" character varying(50) NOT NULL,
    "address_zip_code" character varying(20) NOT NULL,
    "address_country" character varying(50) DEFAULT 'BR'::character varying,
    "address_coordinates_lat" numeric(10,8),
    "address_coordinates_lng" numeric(11,8),
    "shared_amenities" "text"[],
    "management_company" character varying(255),
    "management_manager" character varying(255),
    "management_phone" character varying(50),
    "management_email" character varying(255),
    "building_access_type" character varying(20),
    "building_access_instructions" "text",
    "building_access_has_elevator" boolean DEFAULT false,
    "building_access_has_parking" boolean DEFAULT false,
    "building_access_parking_type" character varying(20),
    "photos" "text"[],
    "cover_photo" "text",
    "description" "text",
    "show_building_number" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "locations_building_access_parking_type_check" CHECK ((("building_access_parking_type")::"text" = ANY ((ARRAY['gratuito'::character varying, 'pago'::character varying, 'rotativo'::character varying])::"text"[]))),
    CONSTRAINT "locations_building_access_type_check" CHECK ((("building_access_type")::"text" = ANY ((ARRAY['portaria'::character varying, 'código'::character varying, 'livre'::character varying, 'outro'::character varying])::"text"[])))
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


COMMENT ON TABLE "public"."locations" IS 'Localizações/Prédios (container físico das unidades)';



CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_type" "text" NOT NULL,
    "sender_name" "text" NOT NULL,
    "sender_id" "text",
    "content" "text" NOT NULL,
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "channel" "text" NOT NULL,
    "direction" "text" NOT NULL,
    "external_id" "text",
    "external_status" "text",
    "external_error" "text",
    "sent_at" timestamp with time zone NOT NULL,
    "read_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "messages_channel_check" CHECK (("channel" = ANY (ARRAY['whatsapp'::"text", 'email'::"text", 'sms'::"text", 'internal'::"text"]))),
    CONSTRAINT "messages_direction_check" CHECK (("direction" = ANY (ARRAY['incoming'::"text", 'outgoing'::"text"]))),
    CONSTRAINT "messages_external_status_check" CHECK (("external_status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'delivered'::"text", 'read'::"text", 'failed'::"text"]))),
    CONSTRAINT "messages_sender_type_check" CHECK (("sender_type" = ANY (ARRAY['guest'::"text", 'staff'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."messages" IS 'Armazena mensagens individuais de conversas';



COMMENT ON COLUMN "public"."messages"."external_id" IS 'ID externo da mensagem (ex: messageId do WhatsApp)';



CREATE TABLE IF NOT EXISTS "public"."notification_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "internal_code" character varying(100),
    "trigger_event" character varying(100) NOT NULL,
    "trigger_config" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "is_system" boolean DEFAULT false,
    "channels" "jsonb" DEFAULT '[]'::"jsonb",
    "email_subject" character varying(500),
    "email_body" "text",
    "email_provider" character varying(50),
    "sms_body" character varying(480),
    "sms_provider" character varying(50),
    "whatsapp_body" "text",
    "whatsapp_provider" character varying(50),
    "in_app_title" character varying(255),
    "in_app_body" "text",
    "variables_used" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."notification_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."notification_templates" IS 'Templates customizáveis para notificações multi-canal';



COMMENT ON COLUMN "public"."notification_templates"."trigger_event" IS 'Evento que dispara a notificação';



COMMENT ON COLUMN "public"."notification_templates"."channels" IS 'Array de canais habilitados: email, sms, whatsapp, in_app';



COMMENT ON COLUMN "public"."notification_templates"."variables_used" IS 'Lista de variáveis dinâmicas usadas no template';



CREATE TABLE IF NOT EXISTS "public"."notification_trigger_types" (
    "id" character varying(100) NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "category" character varying(50) NOT NULL,
    "available_variables" "jsonb" DEFAULT '[]'::"jsonb",
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0
);


ALTER TABLE "public"."notification_trigger_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "type" character varying(50) DEFAULT 'system'::character varying,
    "source" character varying(100),
    "title" character varying(255) NOT NULL,
    "message" "text",
    "priority" character varying(20) DEFAULT 'normal'::character varying,
    "read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications" IS 'Notificações do dashboard para usuários';



COMMENT ON COLUMN "public"."notifications"."type" IS 'Tipo: automation, system, alert, reminder';



COMMENT ON COLUMN "public"."notifications"."source" IS 'Origem da notificação (ex: automation:uuid)';



COMMENT ON COLUMN "public"."notifications"."priority" IS 'Prioridade: low, normal, high, urgent';



CREATE TABLE IF NOT EXISTS "public"."operational_task_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(200) NOT NULL,
    "description" "text",
    "instructions" "text",
    "priority" character varying(10) DEFAULT 'medium'::character varying,
    "estimated_duration_minutes" integer DEFAULT 30,
    "trigger_type" character varying(20) NOT NULL,
    "event_trigger" "jsonb",
    "schedule_config" "jsonb",
    "assignment_type" character varying(20) DEFAULT 'team'::character varying,
    "assigned_user_id" "uuid",
    "assigned_team_id" "uuid",
    "property_scope" character varying(20) DEFAULT 'all'::character varying,
    "property_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "property_tag" character varying(50),
    "property_owner_id" "uuid",
    "color" character varying(7) DEFAULT '#3b82f6'::character varying,
    "icon" character varying(50) DEFAULT 'clipboard-list'::character varying,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "responsibility_filter" "text" DEFAULT 'all'::"text",
    "operation_category" "text" DEFAULT 'other'::"text",
    CONSTRAINT "operational_task_templates_operation_category_check" CHECK (("operation_category" = ANY (ARRAY['checkin'::"text", 'checkout'::"text", 'cleaning'::"text", 'maintenance'::"text", 'other'::"text"]))),
    CONSTRAINT "operational_task_templates_responsibility_filter_check" CHECK (("responsibility_filter" = ANY (ARRAY['company'::"text", 'owner'::"text", 'all'::"text"])))
);


ALTER TABLE "public"."operational_task_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."operational_task_templates" IS 'Templates de tarefas operacionais (check-in, limpeza, etc)';



COMMENT ON COLUMN "public"."operational_task_templates"."responsibility_filter" IS 'Filtrar tarefas por responsabilidade: company (só imóveis da empresa), owner (só do proprietário), all (todos)';



COMMENT ON COLUMN "public"."operational_task_templates"."operation_category" IS 'Categoria da operação: checkin, checkout, cleaning, maintenance, other';



CREATE TABLE IF NOT EXISTS "public"."operational_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "template_id" "uuid",
    "title" character varying(500) NOT NULL,
    "description" "text",
    "instructions" "text",
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "priority" character varying(10) DEFAULT 'medium'::character varying,
    "assignee_id" "uuid",
    "team_id" "uuid",
    "scheduled_date" "date" NOT NULL,
    "scheduled_time" time without time zone,
    "due_datetime" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "property_id" "uuid",
    "reservation_id" "text",
    "triggered_by_event" character varying(50),
    "triggered_by_entity_id" "text",
    "original_scheduled_date" "date",
    "postpone_reason" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_by" "uuid",
    "completed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."operational_tasks" OWNER TO "postgres";


COMMENT ON TABLE "public"."operational_tasks" IS 'Instâncias de tarefas operacionais geradas';



CREATE TABLE IF NOT EXISTS "public"."organization_channel_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "whatsapp_enabled" boolean DEFAULT false,
    "whatsapp_api_url" "text",
    "whatsapp_instance_name" "text",
    "whatsapp_api_key" "text",
    "whatsapp_instance_token" "text",
    "whatsapp_connected" boolean DEFAULT false,
    "whatsapp_phone_number" "text",
    "whatsapp_qr_code" "text",
    "whatsapp_connection_status" "text" DEFAULT 'disconnected'::"text",
    "whatsapp_last_connected_at" timestamp with time zone,
    "whatsapp_error_message" "text",
    "sms_enabled" boolean DEFAULT false,
    "sms_account_sid" "text",
    "sms_auth_token" "text",
    "sms_phone_number" "text",
    "sms_credits_used" integer DEFAULT 0,
    "sms_last_recharged_at" timestamp with time zone,
    "automation_reservation_confirmation" boolean DEFAULT false,
    "automation_checkin_reminder" boolean DEFAULT false,
    "automation_checkout_review" boolean DEFAULT false,
    "automation_payment_reminder" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid" NOT NULL,
    "deleted_at" timestamp with time zone,
    "webhook_url" "text",
    "webhook_events" "text"[],
    "webhook_by_events" boolean DEFAULT false
);


ALTER TABLE "public"."organization_channel_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."organization_channel_config" IS 'Configurações de canais de comunicação (WhatsApp, SMS, Email) por organização';



COMMENT ON COLUMN "public"."organization_channel_config"."whatsapp_api_url" IS 'URL base da Evolution API';



COMMENT ON COLUMN "public"."organization_channel_config"."whatsapp_instance_name" IS 'Nome da instância no Evolution API';



COMMENT ON COLUMN "public"."organization_channel_config"."whatsapp_api_key" IS 'Global API Key do Evolution API';



COMMENT ON COLUMN "public"."organization_channel_config"."whatsapp_instance_token" IS 'Token específico da instância';



COMMENT ON COLUMN "public"."organization_channel_config"."organization_id" IS 'ID único da organização/imobiliária';



COMMENT ON COLUMN "public"."organization_channel_config"."deleted_at" IS 'Soft delete - quando deletado, marca timestamp ao invés de deletar';



COMMENT ON COLUMN "public"."organization_channel_config"."webhook_url" IS 'URL do webhook configurado na Evolution API';



COMMENT ON COLUMN "public"."organization_channel_config"."webhook_events" IS 'Array de eventos monitorados pelo webhook';



COMMENT ON COLUMN "public"."organization_channel_config"."webhook_by_events" IS 'Se true, cria uma rota de webhook diferente para cada tipo de evento';



CREATE TABLE IF NOT EXISTS "public"."organization_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organization_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "slug" character varying(100) NOT NULL,
    "is_master" boolean DEFAULT false,
    "logo" "text",
    "status" character varying(20) DEFAULT 'trial'::character varying NOT NULL,
    "plan" character varying(20) DEFAULT 'free'::character varying NOT NULL,
    "trading_name" character varying(255),
    "legal_name" character varying(255),
    "tax_id" character varying(50),
    "email" character varying(255) NOT NULL,
    "phone" character varying(50),
    "address_street" character varying(255),
    "address_number" character varying(20),
    "address_complement" character varying(100),
    "address_neighborhood" character varying(100),
    "address_city" character varying(100),
    "address_state" character varying(50),
    "address_zip_code" character varying(20),
    "address_country" character varying(50) DEFAULT 'BR'::character varying,
    "settings_language" character varying(5) DEFAULT 'pt'::character varying,
    "settings_timezone" character varying(50) DEFAULT 'America/Sao_Paulo'::character varying,
    "settings_currency" character varying(3) DEFAULT 'BRL'::character varying,
    "settings_date_format" character varying(20) DEFAULT 'DD/MM/YYYY'::character varying,
    "settings_max_users" integer DEFAULT 5,
    "settings_max_properties" integer DEFAULT 10,
    "limits_users" integer DEFAULT 5,
    "limits_properties" integer DEFAULT 10,
    "limits_reservations" integer DEFAULT 100,
    "limits_storage" integer DEFAULT 1024,
    "usage_users" integer DEFAULT 0,
    "usage_properties" integer DEFAULT 0,
    "usage_reservations" integer DEFAULT 0,
    "usage_storage" integer DEFAULT 0,
    "billing_email" character varying(255),
    "billing_cycle" character varying(10),
    "next_billing_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "trial_ends_at" timestamp with time zone,
    "suspended_at" timestamp with time zone,
    "legacy_imobiliaria_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "pending_reservation_enabled" boolean DEFAULT true,
    "pending_reservation_timeout_hours" integer DEFAULT 24,
    "pending_reservation_auto_cancel" boolean DEFAULT true,
    "pending_reservation_notify_guest" boolean DEFAULT true,
    "pending_reservation_notify_admin" boolean DEFAULT true,
    "pending_reservation_reminder_hours" integer DEFAULT 6,
    "signup_source" "text" DEFAULT 'admin'::"text",
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    CONSTRAINT "organizations_billing_cycle_check" CHECK ((("billing_cycle")::"text" = ANY ((ARRAY['monthly'::character varying, 'yearly'::character varying])::"text"[]))),
    CONSTRAINT "organizations_plan_check" CHECK ((("plan")::"text" = ANY ((ARRAY['free'::character varying, 'basic'::character varying, 'professional'::character varying, 'enterprise'::character varying])::"text"[]))),
    CONSTRAINT "organizations_signup_source_check" CHECK (("signup_source" = ANY (ARRAY['admin'::"text", 'self_signup'::"text", 'referral'::"text", 'api'::"text"]))),
    CONSTRAINT "organizations_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'suspended'::character varying, 'trial'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


COMMENT ON TABLE "public"."organizations" IS 'Tabela de organizações (tenants). Inclui organização padrão para usuários não autenticados.';



COMMENT ON COLUMN "public"."organizations"."legacy_imobiliaria_id" IS 'Mapeamento para imobiliariaId do KV Store. Usado para lookup: imobiliariaId → organizationId (UUID)';



COMMENT ON COLUMN "public"."organizations"."pending_reservation_enabled" IS 'Enables pre-reservation (pending) feature where calendar is blocked awaiting payment';



COMMENT ON COLUMN "public"."organizations"."pending_reservation_timeout_hours" IS 'Hours until pending reservation expires (default 24h)';



COMMENT ON COLUMN "public"."organizations"."pending_reservation_auto_cancel" IS 'Automatically cancel expired pending reservations';



COMMENT ON COLUMN "public"."organizations"."pending_reservation_notify_guest" IS 'Notify guest when pending reservation is about to expire';



COMMENT ON COLUMN "public"."organizations"."pending_reservation_notify_admin" IS 'Notify admin when pending reservation expires';



COMMENT ON COLUMN "public"."organizations"."pending_reservation_reminder_hours" IS 'Hours before expiration to send reminder (default 6h)';



CREATE TABLE IF NOT EXISTS "public"."ota_amenity_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "canonical_id" "text" NOT NULL,
    "ota" "text" NOT NULL,
    "ota_id" "text" NOT NULL,
    "ota_name" "text",
    "ota_category" "text",
    "ota_scope" "text",
    "confidence" numeric(3,2) DEFAULT 1.0,
    "is_auto_mapped" boolean DEFAULT false,
    "notes" "text",
    "accepts_value" boolean DEFAULT false,
    "value_type" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ota_amenity_mappings_confidence_check" CHECK ((("confidence" >= (0)::numeric) AND ("confidence" <= (1)::numeric)))
);


ALTER TABLE "public"."ota_amenity_mappings" OWNER TO "postgres";


COMMENT ON TABLE "public"."ota_amenity_mappings" IS 'Mapeamento bidirecional de amenidades Rendizy ↔ OTA';



CREATE TABLE IF NOT EXISTS "public"."ota_api_credentials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "ota" "text" NOT NULL,
    "api_key" "text",
    "api_secret" "text",
    "access_token" "text",
    "refresh_token" "text",
    "oauth_client_id" "text",
    "oauth_client_secret" "text",
    "oauth_scope" "text",
    "token_expires_at" timestamp with time zone,
    "environment" "text" DEFAULT 'sandbox'::"text",
    "api_base_url" "text",
    "is_active" boolean DEFAULT true,
    "is_valid" boolean,
    "last_validated_at" timestamp with time zone,
    "validation_error" "text",
    "rate_limit_requests" integer,
    "rate_limit_window" "text",
    "current_usage" integer DEFAULT 0,
    "usage_reset_at" timestamp with time zone,
    "account_id" "text",
    "account_name" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ota_api_credentials_environment_check" CHECK (("environment" = ANY (ARRAY['sandbox'::"text", 'production'::"text"])))
);


ALTER TABLE "public"."ota_api_credentials" OWNER TO "postgres";


COMMENT ON TABLE "public"."ota_api_credentials" IS 'Credenciais de API para cada OTA por organização';



CREATE TABLE IF NOT EXISTS "public"."ota_bed_type_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "canonical_id" "text" NOT NULL,
    "ota" "text" NOT NULL,
    "ota_id" "text" NOT NULL,
    "ota_name" "text",
    "ota_size" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ota_bed_type_mappings" OWNER TO "postgres";


COMMENT ON TABLE "public"."ota_bed_type_mappings" IS 'Mapeamento de tipos de cama Rendizy ↔ OTA';



CREATE TABLE IF NOT EXISTS "public"."ota_cancellation_policy_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "text",
    "ota" "text" NOT NULL,
    "ota_policy_id" "text",
    "ota_policy_name" "text",
    "export_format" "jsonb",
    "notes" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ota_cancellation_policy_mappings" OWNER TO "postgres";


COMMENT ON TABLE "public"."ota_cancellation_policy_mappings" IS 'Mapeamento de políticas de cancelamento para formato específico de cada OTA';



CREATE TABLE IF NOT EXISTS "public"."ota_fee_type_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "canonical_id" "text" NOT NULL,
    "ota" "text" NOT NULL,
    "ota_id" "text" NOT NULL,
    "ota_name" "text",
    "ota_calculation_type" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ota_fee_type_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ota_image_category_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "canonical_id" "text" NOT NULL,
    "ota" "text" NOT NULL,
    "ota_id" "text" NOT NULL,
    "ota_name" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ota_image_category_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ota_language_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "canonical_id" "text" NOT NULL,
    "ota" "text" NOT NULL,
    "ota_id" "text" NOT NULL,
    "ota_name" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ota_language_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ota_payment_type_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "canonical_id" "text" NOT NULL,
    "ota" "text" NOT NULL,
    "ota_id" "text" NOT NULL,
    "ota_name" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ota_payment_type_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ota_property_type_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "canonical_id" "text" NOT NULL,
    "ota" "text" NOT NULL,
    "ota_id" "text" NOT NULL,
    "ota_name" "text",
    "ota_parent_id" "text",
    "confidence" numeric(3,2) DEFAULT 1.0,
    "requires_subtype" boolean DEFAULT false,
    "default_subtype" "text",
    "notes" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ota_property_type_mappings" OWNER TO "postgres";


COMMENT ON TABLE "public"."ota_property_type_mappings" IS 'Mapeamento de tipos de propriedade Rendizy ↔ OTA';



CREATE TABLE IF NOT EXISTS "public"."ota_rate_plan_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rate_plan_id" "uuid" NOT NULL,
    "ota" "text" NOT NULL,
    "ota_rate_id" "text",
    "ota_rate_code" "text",
    "ota_config" "jsonb" DEFAULT '{}'::"jsonb",
    "sync_enabled" boolean DEFAULT true,
    "last_synced_at" timestamp with time zone,
    "sync_error" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ota_rate_plan_mappings" OWNER TO "postgres";


COMMENT ON TABLE "public"."ota_rate_plan_mappings" IS 'Mapeamento de rate plans para cada OTA';



CREATE TABLE IF NOT EXISTS "public"."ota_region_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "region_id" "text" NOT NULL,
    "ota" "text" NOT NULL,
    "ota_region_id" "text" NOT NULL,
    "ota_region_name" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ota_region_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ota_reservation_status_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "canonical_id" "text" NOT NULL,
    "ota" "text" NOT NULL,
    "ota_id" "text" NOT NULL,
    "ota_name" "text",
    "direction" "text" DEFAULT 'both'::"text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ota_reservation_status_mappings" OWNER TO "postgres";


COMMENT ON TABLE "public"."ota_reservation_status_mappings" IS 'Mapeamento de status de reserva Rendizy ↔ OTA';



CREATE TABLE IF NOT EXISTS "public"."ota_room_type_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "canonical_id" "text" NOT NULL,
    "ota" "text" NOT NULL,
    "ota_id" "text" NOT NULL,
    "ota_name" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ota_room_type_mappings" OWNER TO "postgres";


COMMENT ON TABLE "public"."ota_room_type_mappings" IS 'Mapeamento de tipos de quarto Rendizy ↔ OTA';



CREATE TABLE IF NOT EXISTS "public"."ota_room_view_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "canonical_id" "text" NOT NULL,
    "ota" "text" NOT NULL,
    "ota_id" "text" NOT NULL,
    "ota_name" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ota_room_view_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ota_sync_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "property_id" "uuid",
    "reservation_id" "text",
    "rate_plan_id" "uuid",
    "ota" "text" NOT NULL,
    "sync_type" "text" NOT NULL,
    "direction" "text" NOT NULL,
    "status" "text" DEFAULT 'started'::"text",
    "request_data" "jsonb",
    "response_data" "jsonb",
    "items_total" integer DEFAULT 0,
    "items_processed" integer DEFAULT 0,
    "items_succeeded" integer DEFAULT 0,
    "items_failed" integer DEFAULT 0,
    "items_skipped" integer DEFAULT 0,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "duration_ms" integer,
    "error_code" "text",
    "error_message" "text",
    "error_details" "jsonb",
    "triggered_by" "text",
    "triggered_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ota_sync_logs_direction_check" CHECK (("direction" = ANY (ARRAY['push'::"text", 'pull'::"text"]))),
    CONSTRAINT "ota_sync_logs_status_check" CHECK (("status" = ANY (ARRAY['started'::"text", 'in_progress'::"text", 'completed'::"text", 'partial'::"text", 'failed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "ota_sync_logs_sync_type_check" CHECK (("sync_type" = ANY (ARRAY['content_push'::"text", 'content_pull'::"text", 'rates_push'::"text", 'rates_pull'::"text", 'availability_push'::"text", 'availability_pull'::"text", 'reservation_create'::"text", 'reservation_update'::"text", 'reservation_cancel'::"text", 'reservation_pull'::"text", 'full_sync'::"text"])))
);


ALTER TABLE "public"."ota_sync_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."ota_sync_logs" IS 'Log de sincronizações com OTAs';



CREATE TABLE IF NOT EXISTS "public"."ota_theme_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "canonical_id" "text" NOT NULL,
    "ota" "text" NOT NULL,
    "ota_id" "text" NOT NULL,
    "ota_name" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ota_theme_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ota_webhook_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "ota" "text" NOT NULL,
    "endpoint_url" "text",
    "secret_key" "text",
    "subscribed_events" "text"[],
    "is_active" boolean DEFAULT true,
    "verified" boolean DEFAULT false,
    "verified_at" timestamp with time zone,
    "last_event_at" timestamp with time zone,
    "last_event_type" "text",
    "total_events_received" integer DEFAULT 0,
    "total_events_processed" integer DEFAULT 0,
    "total_events_failed" integer DEFAULT 0,
    "ota_subscription_id" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ota_webhook_subscriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."ota_webhook_subscriptions" IS 'Configuração de subscriptions de webhook por organização';



CREATE TABLE IF NOT EXISTS "public"."ota_webhooks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "event_id" "text",
    "event_type" "text" NOT NULL,
    "event_time" timestamp with time zone,
    "ota" "text" NOT NULL,
    "ota_itinerary_id" "text",
    "ota_property_id" "text",
    "ota_room_id" "text",
    "reservation_id" "text",
    "property_id" "uuid",
    "payload" "jsonb" NOT NULL,
    "headers" "jsonb",
    "processed" boolean DEFAULT false,
    "processed_at" timestamp with time zone,
    "processing_attempts" integer DEFAULT 0,
    "last_attempt_at" timestamp with time zone,
    "processing_result" "text",
    "processing_error" "text",
    "processing_details" "jsonb",
    "signature" "text",
    "signature_valid" boolean,
    "is_test" boolean DEFAULT false,
    "requires_action" boolean DEFAULT false,
    "source_ip" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ota_webhooks_processing_result_check" CHECK (("processing_result" = ANY (ARRAY['success'::"text", 'skipped'::"text", 'failed'::"text", 'pending'::"text"])))
);


ALTER TABLE "public"."ota_webhooks" OWNER TO "postgres";


COMMENT ON TABLE "public"."ota_webhooks" IS 'Webhooks recebidos de todas as OTAs - log centralizado';



COMMENT ON COLUMN "public"."ota_webhooks"."event_id" IS 'ID único do evento na OTA - usado para idempotency';



CREATE TABLE IF NOT EXISTS "public"."owner_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "auth_user_id" "uuid",
    "email" "text" NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text",
    "role" "text" DEFAULT 'viewer'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "permissions" "jsonb" DEFAULT '[]'::"jsonb",
    "invited_at" timestamp with time zone,
    "invited_by" "uuid",
    "accepted_at" timestamp with time zone,
    "last_login_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "owner_users_role_check" CHECK (("role" = ANY (ARRAY['manager'::"text", 'viewer'::"text", 'accountant'::"text"]))),
    CONSTRAINT "owner_users_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'pending'::"text", 'suspended'::"text", 'revoked'::"text"])))
);


ALTER TABLE "public"."owner_users" OWNER TO "postgres";


COMMENT ON TABLE "public"."owner_users" IS 'Usuários criados por proprietários para acessar dados do proprietário';



COMMENT ON COLUMN "public"."owner_users"."role" IS 'Papel do usuário: manager (gerente do proprietário), viewer (visualização), accountant (contador)';



COMMENT ON COLUMN "public"."owner_users"."permissions" IS 'Permissões específicas em JSON';



CREATE TABLE IF NOT EXISTS "public"."owners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "document" "text",
    "cpf" "text",
    "rg" "text",
    "profissao" "text",
    "renda_mensal" numeric(15,2),
    "contract_type" "text" DEFAULT 'non_exclusive'::"text",
    "contract_start_date" "date",
    "contract_end_date" "date",
    "bank_data" "jsonb" DEFAULT '{}'::"jsonb",
    "taxa_comissao" numeric(5,2),
    "forma_pagamento_comissao" "text",
    "is_premium" boolean DEFAULT false,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "auth_user_id" "uuid",
    "can_login" boolean DEFAULT false,
    "max_users" integer DEFAULT 3,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "owners_contract_type_check" CHECK (("contract_type" = ANY (ARRAY['exclusivity'::"text", 'non_exclusive'::"text", 'temporary'::"text"]))),
    CONSTRAINT "owners_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."owners" OWNER TO "postgres";


COMMENT ON TABLE "public"."owners" IS 'Proprietários de imóveis vinculados a uma organização (imobiliária)';



COMMENT ON COLUMN "public"."owners"."auth_user_id" IS 'ID do usuário Supabase Auth (se o proprietário tiver acesso ao sistema)';



COMMENT ON COLUMN "public"."owners"."can_login" IS 'Se o proprietário pode fazer login no sistema';



COMMENT ON COLUMN "public"."owners"."max_users" IS 'Limite de usuários que o proprietário pode criar';



CREATE TABLE IF NOT EXISTS "public"."pagarme_configs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "is_test_mode" boolean DEFAULT true NOT NULL,
    "public_key" "text",
    "secret_key_encrypted" "text",
    "encryption_key_encrypted" "text",
    "webhook_url" "text",
    "webhook_secret_encrypted" "text",
    "recipient_id" "text",
    "settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payment_methods" "jsonb" DEFAULT '["pix", "boleto"]'::"jsonb" NOT NULL,
    "priority" integer DEFAULT 2 NOT NULL
);


ALTER TABLE "public"."pagarme_configs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."pagarme_configs"."payment_methods" IS 'Array of enabled payment methods: credit_card, pix, boleto';



COMMENT ON COLUMN "public"."pagarme_configs"."priority" IS 'Priority for gateway selection (lower = higher priority)';



CREATE TABLE IF NOT EXISTS "public"."pagarme_orders" (
    "id" "text" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "reservation_id" "text",
    "amount" integer NOT NULL,
    "currency" "text" DEFAULT 'brl'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "payment_method" "text" DEFAULT 'credit_card'::"text" NOT NULL,
    "checkout_url" "text",
    "pix_qr_code" "text",
    "pix_qr_code_url" "text",
    "boleto_url" "text",
    "boleto_barcode" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pagarme_orders" OWNER TO "postgres";


COMMENT ON TABLE "public"."pagarme_orders" IS 'Stores Pagar.me checkout orders created from client sites';



COMMENT ON COLUMN "public"."pagarme_orders"."payment_method" IS 'credit_card, pix, or boleto';



COMMENT ON COLUMN "public"."pagarme_orders"."pix_qr_code" IS 'PIX QR code string for PIX payments';



COMMENT ON COLUMN "public"."pagarme_orders"."boleto_url" IS 'URL to boleto PDF for boleto payments';



CREATE TABLE IF NOT EXISTS "public"."pagarme_payment_links" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "reservation_id" "uuid",
    "pagarme_link_id" "text",
    "url" "text",
    "amount_total_cents" integer,
    "currency" "text",
    "request_payload" "jsonb",
    "response_payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pagarme_payment_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pagarme_webhook_events" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "event_id" "text",
    "event_type" "text",
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed" boolean DEFAULT false NOT NULL,
    "processed_at" timestamp with time zone,
    "error_message" "text",
    "payload" "jsonb",
    "headers" "jsonb"
);


ALTER TABLE "public"."pagarme_webhook_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."password_recovery_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "code_hash" "text" NOT NULL,
    "token_hash" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "request_ip" "text",
    "user_agent" "text"
);


ALTER TABLE "public"."password_recovery_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."password_recovery_requests" IS 'Solicitações de recuperação de senha (hash de código/token, expiração e uso único).';



CREATE TABLE IF NOT EXISTS "public"."password_reset_tokens" (
    "token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."password_reset_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "reservation_id" "text",
    "session_id" "text",
    "external_reference" "text",
    "ota" "text" NOT NULL,
    "three_ds_version" "text",
    "cavv" "text",
    "eci" "text",
    "ds_transaction_id" "text",
    "acs_transaction_id" "text",
    "pa_res_status" "text",
    "ve_res_status" "text",
    "xid" "text",
    "cavv_algorithm" "text",
    "ucaf_indicator" "text",
    "status" "text" DEFAULT 'created'::"text",
    "challenge_required" boolean DEFAULT false,
    "challenge_url" "text",
    "encoded_challenge_config" "text",
    "preferred_challenge_window_size" "text",
    "challenge_completed_at" timestamp with time zone,
    "browser_accept_header" "text",
    "browser_user_agent" "text",
    "browser_language" "text",
    "browser_color_depth" integer,
    "browser_screen_height" integer,
    "browser_screen_width" integer,
    "browser_time_zone" integer,
    "browser_java_enabled" boolean,
    "browser_javascript_enabled" boolean,
    "encoded_browser_metadata" "text",
    "client_ip" "text",
    "card_last_four" "text",
    "card_brand" "text",
    "card_expiration_month" "text",
    "card_expiration_year" "text",
    "card_holder_name" "text",
    "card_token" "text",
    "card_token_provider" "text",
    "payment_type" "text",
    "amount" numeric(10,2),
    "currency" "text" DEFAULT 'BRL'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "error_code" "text",
    "error_message" "text",
    "error_details" "jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payment_sessions_payment_type_check" CHECK (("payment_type" = ANY (ARRAY['customer_card'::"text", 'corporate_card'::"text", 'virtual_card'::"text", 'affiliate_collect'::"text", 'property_collect'::"text", 'pix'::"text", 'boleto'::"text", 'bank_transfer'::"text", 'other'::"text"]))),
    CONSTRAINT "payment_sessions_status_check" CHECK (("status" = ANY (ARRAY['created'::"text", 'challenge_required'::"text", 'challenge_sent'::"text", 'authenticated'::"text", 'authentication_failed'::"text", 'completed'::"text", 'expired'::"text", 'cancelled'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."payment_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_sessions" IS 'Sessões de pagamento para 3D Secure e fluxos de OTA';



COMMENT ON COLUMN "public"."payment_sessions"."cavv" IS 'Cardholder Authentication Verification Value - prova de autenticação 3DS';



CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "reservation_id" "text",
    "payment_session_id" "uuid",
    "external_id" "text",
    "ota_payment_id" "text",
    "payment_type" "text" NOT NULL,
    "payment_method" "text",
    "amount" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'BRL'::"text",
    "gateway_fee" numeric(10,2) DEFAULT 0,
    "ota_fee" numeric(10,2) DEFAULT 0,
    "net_amount" numeric(10,2),
    "status" "text" DEFAULT 'pending'::"text",
    "authorized_at" timestamp with time zone,
    "captured_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "failed_at" timestamp with time zone,
    "card_last_four" "text",
    "card_brand" "text",
    "card_holder_name" "text",
    "billing_contact_id" "uuid",
    "ota" "text",
    "merchant_of_record" "text",
    "gateway" "text",
    "gateway_transaction_id" "text",
    "gateway_response" "jsonb",
    "pix_key" "text",
    "pix_qr_code" "text",
    "pix_copy_paste" "text",
    "pix_expires_at" timestamp with time zone,
    "boleto_barcode" "text",
    "boleto_url" "text",
    "boleto_expires_at" timestamp with time zone,
    "error_code" "text",
    "error_message" "text",
    "notes" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payments_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['credit_card'::"text", 'debit_card'::"text", 'pix'::"text", 'boleto'::"text", 'bank_transfer'::"text", 'cash'::"text", 'check'::"text", 'virtual_card'::"text", 'ota_collect'::"text", 'other'::"text"]))),
    CONSTRAINT "payments_payment_type_check" CHECK (("payment_type" = ANY (ARRAY['booking'::"text", 'deposit'::"text", 'additional'::"text", 'refund'::"text", 'chargeback'::"text", 'adjustment'::"text"]))),
    CONSTRAINT "payments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'authorized'::"text", 'captured'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text", 'refunded'::"text", 'partially_refunded'::"text", 'disputed'::"text", 'chargeback'::"text"])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


COMMENT ON TABLE "public"."payments" IS 'Pagamentos recebidos de reservas';



CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "resource" character varying(50) NOT NULL,
    "actions" "text"[] NOT NULL,
    "conditions" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."permissions" IS 'Permissões customizadas por usuário';



CREATE TABLE IF NOT EXISTS "public"."predetermined_funnel_stages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "funnel_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "color" character varying(20) DEFAULT '#3b82f6'::character varying,
    "order" integer DEFAULT 1 NOT NULL,
    "auto_actions" "jsonb",
    "required_fields" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."predetermined_funnel_stages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."predetermined_funnels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "is_default" boolean DEFAULT false,
    "trigger_type" character varying(50),
    "auto_create" boolean DEFAULT false,
    "status_config" "jsonb" DEFAULT '{"cancelledStatus": "Cancelado", "completedStatus": "Concluído", "inProgressStatus": "Em Andamento"}'::"jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."predetermined_funnels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."predetermined_item_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "type" character varying(50) NOT NULL,
    "description" "text",
    "metadata" "jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."predetermined_item_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."predetermined_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "funnel_id" "uuid" NOT NULL,
    "stage_id" "uuid" NOT NULL,
    "title" character varying(500) NOT NULL,
    "description" "text",
    "property_id" "uuid",
    "reservation_id" "uuid",
    "guest_id" "uuid",
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "completed_at" timestamp with time zone,
    "form_data" "jsonb",
    "checklist" "jsonb",
    "assignee_id" "uuid",
    "assignee_name" character varying(255),
    "due_date" "date",
    "started_at" timestamp with time zone,
    "tags" "text"[],
    "custom_fields" "jsonb",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "cancelled_reason_id" "uuid",
    CONSTRAINT "predetermined_items_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'skipped'::character varying])::"text"[])))
);


ALTER TABLE "public"."predetermined_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pricing_settings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "listing_id" "uuid" NOT NULL,
    "base_price_per_night" integer NOT NULL,
    "max_guests_included" integer DEFAULT 2,
    "extra_guest_fee_per_night" integer DEFAULT 0,
    "charge_for_children" boolean DEFAULT false,
    "cleaning_fee" integer DEFAULT 0,
    "cleaning_fee_is_pass_through" boolean DEFAULT false,
    "currency" character varying(3) DEFAULT 'BRL'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pricing_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."pricing_settings" IS 'Configurações de preços';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."properties_drafts" (
    "id" "text" NOT NULL,
    "tenant_id" "text" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "basic_info" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "address" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "pricing" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "gallery" "jsonb" DEFAULT '{"images": []}'::"jsonb" NOT NULL,
    "completed_steps" integer[] DEFAULT '{}'::integer[] NOT NULL,
    "step_errors" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "properties_drafts_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"]))),
    CONSTRAINT "tenant_exists" CHECK (("tenant_id" IS NOT NULL))
);


ALTER TABLE "public"."properties_drafts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_cancellation_penalties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "property_id" "uuid",
    "rate_plan_id" "uuid",
    "days_before_checkin_start" integer,
    "days_before_checkin_end" integer,
    "hours_before_checkin_start" integer,
    "hours_before_checkin_end" integer,
    "penalty_type" "text" NOT NULL,
    "penalty_value" numeric(10,2) NOT NULL,
    "penalty_currency" "text" DEFAULT 'BRL'::"text",
    "penalty_max_nights" integer,
    "nonrefundable_start" "date",
    "nonrefundable_end" "date",
    "description_pt" "text",
    "description_en" "text",
    "priority" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "property_cancellation_penalties_penalty_type_check" CHECK (("penalty_type" = ANY (ARRAY['percentage'::"text", 'fixed'::"text", 'nights'::"text"])))
);


ALTER TABLE "public"."property_cancellation_penalties" OWNER TO "postgres";


COMMENT ON TABLE "public"."property_cancellation_penalties" IS 'Penalidades de cancelamento customizadas por propriedade/rate';



CREATE TABLE IF NOT EXISTS "public"."property_channel_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "channel_code" "text" NOT NULL,
    "status" "text" DEFAULT 'not_connected'::"text" NOT NULL,
    "external_listing_id" "text",
    "external_listing_url" "text",
    "cancellation_policy_id" "uuid",
    "price_correction_percent" numeric(5,2),
    "require_payment_guarantee" boolean,
    "no_show_rule" "text",
    "no_show_penalty_percent" numeric(5,2),
    "sync_photos" boolean DEFAULT true,
    "sync_amenities" boolean DEFAULT true,
    "sync_content" boolean DEFAULT true,
    "sync_prices" boolean DEFAULT true,
    "sync_availability" boolean DEFAULT true,
    "checkin_time" time without time zone,
    "checkout_time" time without time zone,
    "checkin_instructions" "text",
    "checkin_method" "text",
    "mobile_promo_enabled" boolean DEFAULT false,
    "mobile_promo_percent" numeric(5,2) DEFAULT 10.00,
    "mobile_promo_excluded_periods" "jsonb" DEFAULT '[]'::"jsonb",
    "meal_plan_included" "jsonb" DEFAULT '[]'::"jsonb",
    "meal_plan_prices" "jsonb" DEFAULT '{}'::"jsonb",
    "room_type_mappings" "jsonb" DEFAULT '{}'::"jsonb",
    "tax_mappings" "jsonb" DEFAULT '{}'::"jsonb",
    "last_sync_at" timestamp with time zone,
    "last_sync_status" "text",
    "last_sync_error" "text",
    "sync_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "property_channel_settings_channel_code_check" CHECK (("channel_code" = ANY (ARRAY['airbnb'::"text", 'booking'::"text", 'expedia'::"text", 'decolar'::"text", 'vrbo'::"text", 'hotelscom'::"text"]))),
    CONSTRAINT "property_channel_settings_checkin_method_check" CHECK ((("checkin_method" IS NULL) OR ("checkin_method" = ANY (ARRAY['reception'::"text", 'lockbox'::"text", 'smart_lock'::"text", 'key_handoff'::"text", 'self_checkin'::"text"])))),
    CONSTRAINT "property_channel_settings_no_show_rule_check" CHECK ((("no_show_rule" IS NULL) OR ("no_show_rule" = ANY (ARRAY['default'::"text", 'first_night'::"text", 'full_amount'::"text", 'custom'::"text"])))),
    CONSTRAINT "property_channel_settings_status_check" CHECK (("status" = ANY (ARRAY['published'::"text", 'paused'::"text", 'not_connected'::"text", 'pending'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."property_channel_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."property_channel_settings" IS 'Configurações específicas de cada canal OTA por anúncio. Implementa o Nível 3 da triangulação: Global (org) → Individual (anúncio) → Por Canal';



COMMENT ON COLUMN "public"."property_channel_settings"."channel_code" IS 'Código do canal: airbnb, booking, expedia, decolar, vrbo, hotelscom';



COMMENT ON COLUMN "public"."property_channel_settings"."status" IS 'Status do anúncio no canal: published, paused, not_connected, pending, error';



COMMENT ON COLUMN "public"."property_channel_settings"."cancellation_policy_id" IS 'Override de política de cancelamento para este canal (null = herda do anúncio/org)';



COMMENT ON COLUMN "public"."property_channel_settings"."price_correction_percent" IS 'Ajuste de preço em % (positivo ou negativo). Ex: 5.00 = +5%';



COMMENT ON COLUMN "public"."property_channel_settings"."require_payment_guarantee" IS 'Exigir garantia de pagamento? (null = herda)';



COMMENT ON COLUMN "public"."property_channel_settings"."no_show_rule" IS 'Regra de no-show: default, first_night, full_amount, custom';



COMMENT ON COLUMN "public"."property_channel_settings"."mobile_promo_enabled" IS 'Ativar promoção para reservas mobile (Booking)';



COMMENT ON COLUMN "public"."property_channel_settings"."room_type_mappings" IS 'Mapeamento de quartos: {our_room_id: external_room_type_code}';



COMMENT ON COLUMN "public"."property_channel_settings"."tax_mappings" IS 'Mapeamento de taxas: {our_tax_id: external_tax_code}';



CREATE TABLE IF NOT EXISTS "public"."property_ota_extensions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "ota" "text" NOT NULL,
    "ota_property_id" "text",
    "ota_listing_id" "text",
    "ota_listing_url" "text",
    "status" "text" DEFAULT 'draft'::"text",
    "status_reason" "text",
    "status_updated_at" timestamp with time zone,
    "ota_data" "jsonb" DEFAULT '{}'::"jsonb",
    "sync_enabled" boolean DEFAULT true,
    "sync_content" boolean DEFAULT true,
    "sync_rates" boolean DEFAULT true,
    "sync_availability" boolean DEFAULT true,
    "sync_reservations" boolean DEFAULT true,
    "last_synced_at" timestamp with time zone,
    "last_sync_result" "text",
    "last_sync_error" "text",
    "next_sync_at" timestamp with time zone,
    "total_reservations" integer DEFAULT 0,
    "total_revenue" numeric(12,2) DEFAULT 0,
    "average_rating" numeric(3,2),
    "review_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "property_ota_extensions_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending_review'::"text", 'active'::"text", 'inactive'::"text", 'suspended'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."property_ota_extensions" OWNER TO "postgres";


COMMENT ON TABLE "public"."property_ota_extensions" IS 'Dados específicos de OTA para cada propriedade';



COMMENT ON COLUMN "public"."property_ota_extensions"."ota_data" IS 'Dados flexíveis específicos da OTA em formato JSON';



CREATE TABLE IF NOT EXISTS "public"."property_rooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "room_type_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "internal_code" "text",
    "area_sqm" numeric(6,2),
    "area_sqft" numeric(6,2),
    "max_occupancy" integer DEFAULT 2 NOT NULL,
    "max_adults" integer,
    "max_children" integer,
    "standard_occupancy" integer DEFAULT 2,
    "base_price" numeric(10,2),
    "extra_person_fee" numeric(10,2) DEFAULT 0,
    "currency" "text" DEFAULT 'BRL'::"text",
    "bed_configuration" "jsonb" DEFAULT '[]'::"jsonb",
    "images" "jsonb" DEFAULT '[]'::"jsonb",
    "amenity_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "views" "text"[] DEFAULT '{}'::"text"[],
    "is_smoking_allowed" boolean DEFAULT false,
    "is_accessible" boolean DEFAULT false,
    "floor_number" integer,
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "ota_room_ids" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."property_rooms" OWNER TO "postgres";


COMMENT ON TABLE "public"."property_rooms" IS '[OTA-UNIVERSAL] Quartos/unidades de cada propriedade';



COMMENT ON COLUMN "public"."property_rooms"."bed_configuration" IS '[OTA-UNIVERSAL] Config de camas: [{"type":"double","size":"king","count":1}]';



COMMENT ON COLUMN "public"."property_rooms"."ota_room_ids" IS '[OTA-UNIVERSAL] IDs do quarto em cada OTA';



CREATE TABLE IF NOT EXISTS "public"."public.users" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."public.users" OWNER TO "postgres";


ALTER TABLE "public"."public.users" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."public.users_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."rate_plan_availability" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rate_plan_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "available_units" integer DEFAULT 1,
    "is_closed" boolean DEFAULT false,
    "stop_sell" boolean DEFAULT false,
    "stop_sell_reason" "text",
    "closed_to_arrival" boolean DEFAULT false,
    "closed_to_departure" boolean DEFAULT false,
    "min_nights" integer,
    "max_nights" integer,
    "price_override" numeric(10,2),
    "last_synced_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rate_plan_availability" OWNER TO "postgres";


COMMENT ON TABLE "public"."rate_plan_availability" IS 'Disponibilidade diária por rate plan';



CREATE TABLE IF NOT EXISTS "public"."rate_plan_pricing_overrides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rate_plan_id" "uuid" NOT NULL,
    "date_from" "date" NOT NULL,
    "date_to" "date" NOT NULL,
    "override_type" "text" NOT NULL,
    "price_value" numeric(10,2),
    "price_adjustment_type" "text",
    "price_adjustment_value" numeric(10,2),
    "min_nights" integer,
    "max_nights" integer,
    "reason" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "rate_plan_pricing_overrides_override_type_check" CHECK (("override_type" = ANY (ARRAY['absolute'::"text", 'adjustment'::"text", 'closed'::"text"]))),
    CONSTRAINT "rate_plan_pricing_overrides_price_adjustment_type_check" CHECK (("price_adjustment_type" = ANY (ARRAY['percentage'::"text", 'fixed'::"text"])))
);


ALTER TABLE "public"."rate_plan_pricing_overrides" OWNER TO "postgres";


COMMENT ON TABLE "public"."rate_plan_pricing_overrides" IS 'Preços específicos por período para rate plans';



CREATE TABLE IF NOT EXISTS "public"."rate_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "property_id" "uuid",
    "code" "text" NOT NULL,
    "name_pt" "text" NOT NULL,
    "name_en" "text",
    "name_es" "text",
    "description_pt" "text",
    "description_en" "text",
    "price_adjustment_type" "text" DEFAULT 'none'::"text",
    "price_adjustment_value" numeric(10,2) DEFAULT 0,
    "price_adjustment_currency" "text" DEFAULT 'BRL'::"text",
    "cancellation_policy_id" "text",
    "min_nights" integer DEFAULT 1,
    "max_nights" integer,
    "advance_booking_min_days" integer,
    "advance_booking_max_days" integer,
    "booking_window_start" time without time zone,
    "booking_window_end" time without time zone,
    "included_amenities" "text"[],
    "max_adults" integer,
    "max_children" integer,
    "max_occupancy" integer,
    "payment_type" "text" DEFAULT 'property_collect'::"text",
    "merchant_of_record" "text" DEFAULT 'property'::"text",
    "deposit_required" boolean DEFAULT false,
    "deposit_type" "text",
    "deposit_value" numeric(10,2),
    "deposit_currency" "text" DEFAULT 'BRL'::"text",
    "deposit_due_days" integer,
    "is_refundable" boolean DEFAULT true,
    "valid_from" "date",
    "valid_to" "date",
    "valid_days_of_week" integer[],
    "checkin_days_allowed" integer[],
    "checkout_days_allowed" integer[],
    "is_promotional" boolean DEFAULT false,
    "promotion_name" "text",
    "promotion_description" "text",
    "member_only" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "is_default" boolean DEFAULT false,
    "priority" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "rate_plans_deposit_type_check" CHECK (("deposit_type" = ANY (ARRAY['percentage'::"text", 'fixed'::"text", 'first_night'::"text", 'full'::"text"]))),
    CONSTRAINT "rate_plans_merchant_of_record_check" CHECK (("merchant_of_record" = ANY (ARRAY['property'::"text", 'expedia'::"text", 'ota'::"text"]))),
    CONSTRAINT "rate_plans_payment_type_check" CHECK (("payment_type" = ANY (ARRAY['property_collect'::"text", 'ota_collect'::"text", 'both'::"text"]))),
    CONSTRAINT "rate_plans_price_adjustment_type_check" CHECK (("price_adjustment_type" = ANY (ARRAY['none'::"text", 'percentage'::"text", 'fixed'::"text"])))
);


ALTER TABLE "public"."rate_plans" OWNER TO "postgres";


COMMENT ON TABLE "public"."rate_plans" IS 'Planos de tarifa - conceito universal para todas as OTAs';



COMMENT ON COLUMN "public"."rate_plans"."included_amenities" IS 'Amenidades incluídas neste rate (usar IDs canônicos)';



CREATE TABLE IF NOT EXISTS "public"."re_broker_campaign_participation" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "broker_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'invited'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "re_broker_campaign_participation_status_check" CHECK (("status" = ANY (ARRAY['invited'::"text", 'confirmed'::"text", 'completed'::"text", 'no_show'::"text"])))
);


ALTER TABLE "public"."re_broker_campaign_participation" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."re_broker_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "type" "text",
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "target_brokers" "uuid"[],
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'active'::"text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "re_broker_campaigns_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'completed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "re_broker_campaigns_type_check" CHECK (("type" = ANY (ARRAY['training'::"text", 'plantation'::"text", 'goal'::"text", 'announcement'::"text", 'promotion'::"text"])))
);


ALTER TABLE "public"."re_broker_campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."re_broker_chat_channels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "type" "text" DEFAULT 'group'::"text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "re_broker_chat_channels_type_check" CHECK (("type" = ANY (ARRAY['group'::"text", 'direct'::"text", 'announcement'::"text"])))
);


ALTER TABLE "public"."re_broker_chat_channels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."re_broker_chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "channel_id" "uuid" NOT NULL,
    "broker_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "read_by" "uuid"[] DEFAULT '{}'::"uuid"[],
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."re_broker_chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."re_broker_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "broker_email" "text",
    "broker_creci" "text",
    "link_type" "text" NOT NULL,
    "permissions" "jsonb" DEFAULT '{"can_see_chat": true, "can_see_ranking": false, "can_receive_leads": true, "can_see_campaigns": true, "can_make_reservations": false}'::"jsonb",
    "commission_split" "jsonb" DEFAULT '{"broker": 70, "company": 30}'::"jsonb",
    "status" "text" DEFAULT 'pending'::"text",
    "invited_by" "uuid",
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "re_broker_invites_link_type_check" CHECK (("link_type" = ANY (ARRAY['employee'::"text", 'associate'::"text", 'guest'::"text"]))),
    CONSTRAINT "re_broker_invites_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."re_broker_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."re_broker_rankings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "broker_id" "uuid" NOT NULL,
    "period_type" "text" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "total_sales" integer DEFAULT 0,
    "total_volume" numeric(15,2) DEFAULT 0,
    "total_reservations" integer DEFAULT 0,
    "total_leads" integer DEFAULT 0,
    "rank_position" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "re_broker_rankings_period_type_check" CHECK (("period_type" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'monthly'::"text", 'quarterly'::"text", 'yearly'::"text"])))
);


ALTER TABLE "public"."re_broker_rankings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."re_brokers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "photo_url" "text",
    "creci" "text" NOT NULL,
    "cpf" "text",
    "location" "jsonb" DEFAULT '{}'::"jsonb",
    "experience" "text",
    "specialties" "text"[] DEFAULT '{}'::"text"[],
    "regions" "text"[] DEFAULT '{}'::"text"[],
    "rating" numeric(3,2),
    "reviews_count" integer DEFAULT 0,
    "sales_last_year" integer DEFAULT 0,
    "vinculo" "text" DEFAULT 'autonomo'::"text",
    "agency_id" "uuid",
    "available" boolean DEFAULT true,
    "bio" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "broker_type" "text" DEFAULT 'solo'::"text",
    "linked_company_id" "uuid",
    "link_type" "text",
    "link_status" "text" DEFAULT 'active'::"text",
    "linked_at" timestamp with time zone,
    "permissions" "jsonb" DEFAULT '{"can_see_chat": true, "can_see_ranking": false, "can_receive_leads": true, "can_see_campaigns": true, "can_make_reservations": false}'::"jsonb",
    "commission_split" "jsonb" DEFAULT '{"broker": 70, "company": 30}'::"jsonb",
    "email" "text",
    "phone" "text",
    "verified" boolean DEFAULT false,
    "total_sales" integer DEFAULT 0,
    "total_volume" numeric(15,2) DEFAULT 0,
    CONSTRAINT "re_brokers_experience_check" CHECK (("experience" = ANY (ARRAY['1-3 anos'::"text", '3-5 anos'::"text", '5-10 anos'::"text", '10+ anos'::"text"]))),
    CONSTRAINT "re_brokers_vinculo_check" CHECK (("vinculo" = ANY (ARRAY['autonomo'::"text", 'imobiliaria'::"text"])))
);


ALTER TABLE "public"."re_brokers" OWNER TO "postgres";


COMMENT ON TABLE "public"."re_brokers" IS 'Corretores cadastrados';



CREATE TABLE IF NOT EXISTS "public"."re_companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "cnpj" "text",
    "creci" "text",
    "description" "text",
    "logo_url" "text",
    "location" "jsonb" DEFAULT '{}'::"jsonb",
    "partnership_status" "text" DEFAULT 'open'::"text",
    "partnership_terms" "jsonb" DEFAULT '{}'::"jsonb",
    "verified" boolean DEFAULT false,
    "rating" numeric(3,2),
    "reviews_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "re_companies_partnership_status_check" CHECK (("partnership_status" = ANY (ARRAY['open'::"text", 'closed'::"text"]))),
    CONSTRAINT "re_companies_type_check" CHECK (("type" = ANY (ARRAY['constructor'::"text", 'real_estate_agency'::"text"])))
);


ALTER TABLE "public"."re_companies" OWNER TO "postgres";


COMMENT ON TABLE "public"."re_companies" IS 'Construtoras e Imobiliárias do marketplace Real Estate';



CREATE TABLE IF NOT EXISTS "public"."re_demands" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agency_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "budget" "jsonb" DEFAULT '{}'::"jsonb",
    "location_preferences" "text"[] DEFAULT '{}'::"text"[],
    "typology_preferences" "text"[] DEFAULT '{}'::"text"[],
    "urgency" "text" DEFAULT 'medium'::"text",
    "deadline" "date",
    "status" "text" DEFAULT 'open'::"text",
    "interested_companies" "uuid"[] DEFAULT '{}'::"uuid"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "re_demands_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'closed'::"text", 'expired'::"text"]))),
    CONSTRAINT "re_demands_urgency_check" CHECK (("urgency" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'urgent'::"text"])))
);


ALTER TABLE "public"."re_demands" OWNER TO "postgres";


COMMENT ON TABLE "public"."re_demands" IS 'Demandas publicadas por imobiliárias';



CREATE TABLE IF NOT EXISTS "public"."re_developments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "location" "jsonb" DEFAULT '{}'::"jsonb",
    "phase" "text" DEFAULT 'launch'::"text",
    "delivery_date" "date",
    "total_units" integer DEFAULT 0,
    "available_units" integer DEFAULT 0,
    "sold_percentage" numeric(5,2) DEFAULT 0,
    "price_range" "jsonb" DEFAULT '{}'::"jsonb",
    "typologies" "text"[] DEFAULT '{}'::"text"[],
    "towers" integer,
    "images" "text"[] DEFAULT '{}'::"text"[],
    "virtual_tour_url" "text",
    "marketing_materials" "jsonb" DEFAULT '[]'::"jsonb",
    "active_campaign" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "re_developments_phase_check" CHECK (("phase" = ANY (ARRAY['launch'::"text", 'construction'::"text", 'ready'::"text"])))
);


ALTER TABLE "public"."re_developments" OWNER TO "postgres";


COMMENT ON TABLE "public"."re_developments" IS 'Empreendimentos imobiliários (lançamentos)';



CREATE TABLE IF NOT EXISTS "public"."re_marketplace_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_a_id" "uuid" NOT NULL,
    "org_b_id" "uuid" NOT NULL,
    "related_type" "text",
    "related_id" "uuid",
    "title" "text",
    "status" "text" DEFAULT 'active'::"text",
    "last_message_at" timestamp with time zone,
    "last_message_preview" "text",
    "last_message_sender_id" "uuid",
    "unread_count_org_a" integer DEFAULT 0,
    "unread_count_org_b" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "different_orgs" CHECK (("org_a_id" <> "org_b_id")),
    CONSTRAINT "re_marketplace_conversations_related_type_check" CHECK (("related_type" = ANY (ARRAY['partnership'::"text", 'demand'::"text", 'development'::"text", 'reservation'::"text", 'inquiry'::"text"]))),
    CONSTRAINT "re_marketplace_conversations_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'archived'::"text", 'blocked'::"text"])))
);


ALTER TABLE "public"."re_marketplace_conversations" OWNER TO "postgres";


COMMENT ON TABLE "public"."re_marketplace_conversations" IS 'Conversas B2B entre organizações diferentes no marketplace';



CREATE TABLE IF NOT EXISTS "public"."re_marketplace_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_profile_id" "uuid" NOT NULL,
    "sender_org_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "content_type" "text" DEFAULT 'text'::"text",
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "read_at" timestamp with time zone,
    "read_by_profile_id" "uuid",
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "re_marketplace_messages_content_type_check" CHECK (("content_type" = ANY (ARRAY['text'::"text", 'image'::"text", 'file'::"text", 'audio'::"text", 'video'::"text", 'location'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."re_marketplace_messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."re_marketplace_messages" IS 'Mensagens das conversas do marketplace';



CREATE TABLE IF NOT EXISTS "public"."re_marketplace_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "org_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text",
    "muted_until" timestamp with time zone,
    "pinned" boolean DEFAULT false,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "left_at" timestamp with time zone,
    CONSTRAINT "re_marketplace_participants_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."re_marketplace_participants" OWNER TO "postgres";


COMMENT ON TABLE "public"."re_marketplace_participants" IS 'Participantes das conversas (para futuras extensões como grupos)';



CREATE TABLE IF NOT EXISTS "public"."re_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partnership_id" "uuid" NOT NULL,
    "sender_company_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."re_messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."re_messages" IS 'Chat entre parceiros';



CREATE TABLE IF NOT EXISTS "public"."re_partnerships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_a_id" "uuid" NOT NULL,
    "company_b_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "terms" "jsonb" DEFAULT '{}'::"jsonb",
    "contract_url" "text",
    "signed_at" timestamp with time zone,
    "valid_until" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "re_partnerships_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'negotiating'::"text", 'active'::"text", 'rejected'::"text", 'terminated'::"text"])))
);


ALTER TABLE "public"."re_partnerships" OWNER TO "postgres";


COMMENT ON TABLE "public"."re_partnerships" IS 'Parcerias entre empresas';



CREATE TABLE IF NOT EXISTS "public"."re_reservations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "unit_id" "uuid" NOT NULL,
    "agency_id" "uuid" NOT NULL,
    "client_name" "text" NOT NULL,
    "client_cpf" "text",
    "client_email" "text",
    "client_phone" "text",
    "signal_amount" numeric(15,2),
    "signal_status" "text" DEFAULT 'pending'::"text",
    "signal_paid_at" timestamp with time zone,
    "expires_at" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "re_reservations_signal_status_check" CHECK (("signal_status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'expired'::"text"]))),
    CONSTRAINT "re_reservations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'cancelled'::"text", 'converted'::"text"])))
);


ALTER TABLE "public"."re_reservations" OWNER TO "postgres";


COMMENT ON TABLE "public"."re_reservations" IS 'Reservas de unidades';



CREATE TABLE IF NOT EXISTS "public"."re_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reservation_id" "uuid",
    "partnership_id" "uuid",
    "sale_value" numeric(15,2) NOT NULL,
    "commission_total" numeric(15,2) NOT NULL,
    "commission_agency_a" numeric(15,2),
    "commission_agency_b" numeric(15,2),
    "platform_fee" numeric(15,2) NOT NULL,
    "platform_fee_percent" numeric(5,4) NOT NULL,
    "payment_status" "text" DEFAULT 'pending'::"text",
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "re_transactions_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."re_transactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."re_transactions" IS 'Transações financeiras para monetização';



CREATE TABLE IF NOT EXISTS "public"."re_units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "development_id" "uuid" NOT NULL,
    "unit_number" "text" NOT NULL,
    "floor" integer,
    "tower" "text",
    "block" "text",
    "typology" "text",
    "area_sqm" numeric(10,2),
    "price" numeric(15,2),
    "status" "text" DEFAULT 'available'::"text",
    "reserved_by" "uuid",
    "reserved_at" timestamp with time zone,
    "reservation_expires_at" timestamp with time zone,
    "sold_by" "uuid",
    "sold_at" timestamp with time zone,
    "sold_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "payment_conditions" "jsonb",
    "price_updated_at" timestamp with time zone,
    "price_source" "text",
    CONSTRAINT "re_units_status_check" CHECK (("status" = ANY (ARRAY['available'::"text", 'reserved'::"text", 'signed'::"text", 'signal_paid'::"text", 'sold'::"text", 'deed_signed'::"text", 'unavailable'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."re_units" OWNER TO "postgres";


COMMENT ON TABLE "public"."re_units" IS 'Unidades individuais dos empreendimentos';



COMMENT ON COLUMN "public"."re_units"."payment_conditions" IS 'Condições de pagamento extraídas do PDF:
{
  "campanha": "FEVEREIRO-26",
  "sinal": { "percentual": 12, "valor": 99116, "data_inicio": "2026-02" },
  "mensais": { "quantidade": 33, "percentual": 45.4, "valor_parcela": 11364, "data_inicio": "2026-03" },
  "intermediarias": { "quantidade": 5, "percentual": 32.6, "valor_parcela": 53853, "data_inicio": "2026-08" },
  "balao_final": { "percentual": 10, "valor": 82567, "data": "2028-12" }
}';



CREATE TABLE IF NOT EXISTS "public"."reconciliation_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "finished_at" timestamp with time zone,
    "duration_ms" integer,
    "status" "text" DEFAULT 'running'::"text" NOT NULL,
    "total_checked" integer DEFAULT 0,
    "found_deleted" integer DEFAULT 0,
    "found_modified" integer DEFAULT 0,
    "found_orphan" integer DEFAULT 0,
    "action_cancelled" integer DEFAULT 0,
    "action_updated" integer DEFAULT 0,
    "action_skipped" integer DEFAULT 0,
    "error_message" "text",
    "summary" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reconciliation_runs_status_check" CHECK (("status" = ANY (ARRAY['running'::"text", 'completed'::"text", 'failed'::"text", 'partial'::"text"])))
);


ALTER TABLE "public"."reconciliation_runs" OWNER TO "postgres";


COMMENT ON TABLE "public"."reconciliation_runs" IS 'Log de execuções do job de reconciliação de reservas com Stays.net';



COMMENT ON COLUMN "public"."reconciliation_runs"."found_deleted" IS 'Reservas que não existem mais na API da Stays (foram deletadas)';



COMMENT ON COLUMN "public"."reconciliation_runs"."found_modified" IS 'Reservas que existem mas com dados diferentes (status, datas, etc.)';



CREATE OR REPLACE VIEW "public"."reconciliation_dashboard" AS
 SELECT "organization_id",
    "id" AS "run_id",
    "started_at",
    "duration_ms",
    "status",
    "total_checked",
    (("found_deleted" + "found_modified") + "found_orphan") AS "total_issues",
    ("action_cancelled" + "action_updated") AS "total_fixed",
    "found_deleted",
    "found_modified",
    "found_orphan",
    "action_cancelled",
    "action_updated",
    "action_skipped",
        CASE
            WHEN ("total_checked" = 0) THEN (100)::numeric
            ELSE "round"((((("total_checked" - (("found_deleted" + "found_modified") + "found_orphan")))::numeric / ("total_checked")::numeric) * (100)::numeric), 2)
        END AS "sync_health_percentage"
   FROM "public"."reconciliation_runs" "rr"
  ORDER BY "started_at" DESC;


ALTER VIEW "public"."reconciliation_dashboard" OWNER TO "postgres";


COMMENT ON VIEW "public"."reconciliation_dashboard" IS 'Dashboard de saúde da sincronização de reservas';



CREATE TABLE IF NOT EXISTS "public"."reconciliation_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "run_id" "uuid" NOT NULL,
    "reservation_id" "text" NOT NULL,
    "external_id" "text",
    "confirmation_code" "text",
    "property_id" "uuid",
    "issue_type" "text" NOT NULL,
    "local_status" "text",
    "api_status" "text",
    "local_data" "jsonb",
    "api_data" "jsonb",
    "action_taken" "text",
    "action_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reconciliation_items_action_taken_check" CHECK (("action_taken" = ANY (ARRAY['cancelled'::"text", 'updated'::"text", 'skipped'::"text", 'error'::"text"]))),
    CONSTRAINT "reconciliation_items_issue_type_check" CHECK (("issue_type" = ANY (ARRAY['deleted'::"text", 'status_changed'::"text", 'dates_changed'::"text", 'guest_changed'::"text", 'orphan'::"text"])))
);


ALTER TABLE "public"."reconciliation_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."reconciliation_items" IS 'Detalhes de cada reserva afetada em uma execução de reconciliação';



CREATE TABLE IF NOT EXISTS "public"."refunds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "payment_id" "uuid" NOT NULL,
    "reservation_id" "text",
    "external_id" "text",
    "ota_refund_id" "text",
    "amount" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'BRL'::"text",
    "refund_type" "text" NOT NULL,
    "reason" "text",
    "reason_code" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "processed_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "requested_by_type" "text",
    "requested_by_id" "uuid",
    "requested_by_name" "text",
    "gateway" "text",
    "gateway_refund_id" "text",
    "gateway_response" "jsonb",
    "error_code" "text",
    "error_message" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "refunds_refund_type_check" CHECK (("refund_type" = ANY (ARRAY['full'::"text", 'partial'::"text", 'cancellation'::"text", 'dispute'::"text", 'error'::"text", 'goodwill'::"text", 'other'::"text"]))),
    CONSTRAINT "refunds_requested_by_type_check" CHECK (("requested_by_type" = ANY (ARRAY['user'::"text", 'guest'::"text", 'ota'::"text", 'system'::"text"]))),
    CONSTRAINT "refunds_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."refunds" OWNER TO "postgres";


COMMENT ON TABLE "public"."refunds" IS 'Reembolsos de pagamentos';



CREATE TABLE IF NOT EXISTS "public"."reservation_additional_guests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reservation_id" "text" NOT NULL,
    "reservation_room_id" "uuid",
    "given_name" "text" NOT NULL,
    "family_name" "text" NOT NULL,
    "date_of_birth" "date",
    "age" integer,
    "guest_type" "text" DEFAULT 'adult'::"text",
    "document_type" "text",
    "document_number" "text",
    "nationality" "text",
    "email" "text",
    "phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reservation_additional_guests_guest_type_check" CHECK (("guest_type" = ANY (ARRAY['adult'::"text", 'child'::"text", 'infant'::"text"])))
);


ALTER TABLE "public"."reservation_additional_guests" OWNER TO "postgres";


COMMENT ON TABLE "public"."reservation_additional_guests" IS 'Hóspedes adicionais de uma reserva';



CREATE TABLE IF NOT EXISTS "public"."reservation_cancellations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reservation_id" "text" NOT NULL,
    "reservation_room_id" "uuid",
    "cancelled_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cancelled_by_type" "text",
    "cancelled_by_id" "uuid",
    "cancelled_by_name" "text",
    "cancellation_reason" "text",
    "cancellation_code" "text",
    "cancellation_policy_id" "text",
    "penalty_amount" numeric(10,2),
    "penalty_currency" "text" DEFAULT 'BRL'::"text",
    "penalty_type" "text",
    "refund_amount" numeric(10,2),
    "refund_currency" "text" DEFAULT 'BRL'::"text",
    "refund_status" "text",
    "refund_processed_at" timestamp with time zone,
    "refund_reference" "text",
    "ota" "text",
    "ota_cancellation_id" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reservation_cancellations_cancelled_by_type_check" CHECK (("cancelled_by_type" = ANY (ARRAY['guest'::"text", 'host'::"text", 'ota'::"text", 'system'::"text"]))),
    CONSTRAINT "reservation_cancellations_refund_status_check" CHECK (("refund_status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."reservation_cancellations" OWNER TO "postgres";


COMMENT ON TABLE "public"."reservation_cancellations" IS 'Detalhes de cancelamento de reservas';



CREATE TABLE IF NOT EXISTS "public"."reservation_deposits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reservation_id" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'BRL'::"text",
    "deposit_type" "text" NOT NULL,
    "due_date" "date",
    "due_datetime" timestamp with time zone,
    "status" "text" DEFAULT 'pending'::"text",
    "paid_at" timestamp with time zone,
    "payment_method" "text",
    "payment_reference" "text",
    "refunded_at" timestamp with time zone,
    "refunded_amount" numeric(10,2),
    "refund_reason" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reservation_deposits_deposit_type_check" CHECK (("deposit_type" = ANY (ARRAY['booking'::"text", 'damage'::"text", 'security'::"text", 'other'::"text"]))),
    CONSTRAINT "reservation_deposits_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'refunded'::"text", 'retained'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."reservation_deposits" OWNER TO "postgres";


COMMENT ON TABLE "public"."reservation_deposits" IS 'Depósitos e cauções de reservas';



CREATE TABLE IF NOT EXISTS "public"."reservation_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reservation_id" "text" NOT NULL,
    "change_type" "text" NOT NULL,
    "changed_by" "uuid",
    "changed_by_type" "text",
    "changed_by_name" "text",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "change_reason" "text",
    "source" "text",
    "source_reference" "text",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reservation_history_changed_by_type_check" CHECK (("changed_by_type" = ANY (ARRAY['user'::"text", 'guest'::"text", 'system'::"text", 'ota'::"text"])))
);


ALTER TABLE "public"."reservation_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reservation_pricing_breakdown" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reservation_id" "text" NOT NULL,
    "reservation_room_id" "uuid",
    "component_type" "text" NOT NULL,
    "description" "text",
    "description_en" "text",
    "amount" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'BRL'::"text",
    "calculation_type" "text" DEFAULT 'per_stay'::"text",
    "date" "date",
    "is_inclusive" boolean DEFAULT true,
    "is_paid_at_property" boolean DEFAULT false,
    "is_refundable" boolean DEFAULT true,
    "ota_component_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reservation_pricing_breakdown_calculation_type_check" CHECK (("calculation_type" = ANY (ARRAY['per_stay'::"text", 'per_night'::"text", 'per_guest'::"text", 'per_guest_per_night'::"text"]))),
    CONSTRAINT "reservation_pricing_breakdown_component_type_check" CHECK (("component_type" = ANY (ARRAY['base_rate'::"text", 'extra_guest'::"text", 'extra_child'::"text", 'cleaning_fee'::"text", 'resort_fee'::"text", 'service_fee'::"text", 'tax'::"text", 'sales_tax'::"text", 'occupancy_tax'::"text", 'tourism_tax'::"text", 'marketing_fee'::"text", 'platform_commission'::"text", 'property_fee'::"text", 'discount'::"text", 'promotion'::"text", 'adjustment'::"text", 'deposit'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."reservation_pricing_breakdown" OWNER TO "postgres";


COMMENT ON TABLE "public"."reservation_pricing_breakdown" IS 'Breakdown detalhado do preço - compatível com formato Expedia';



CREATE TABLE IF NOT EXISTS "public"."reservation_room_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reservation_room_id" "uuid" NOT NULL,
    "reservation_id" "text" NOT NULL,
    "change_type" "text" NOT NULL,
    "changed_by" "uuid",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "change_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reservation_room_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reservation_rooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reservation_id" "text" NOT NULL,
    "property_id" "uuid",
    "room_type" "text",
    "room_name" "text",
    "rate_plan_id" "uuid",
    "confirmation_expedia" "text",
    "confirmation_property" "text",
    "confirmation_booking" "text",
    "confirmation_airbnb" "text",
    "number_of_adults" integer DEFAULT 1,
    "number_of_children" integer DEFAULT 0,
    "child_ages" integer[],
    "guest_given_name" "text" NOT NULL,
    "guest_family_name" "text" NOT NULL,
    "guest_middle_name" "text",
    "guest_email" "text",
    "guest_phone" "text",
    "guest_date_of_birth" "date",
    "guest_document_type" "text",
    "guest_document_number" "text",
    "guest_nationality" "text",
    "smoking" boolean DEFAULT false,
    "special_request" "text",
    "loyalty_id" "text",
    "loyalty_program_name" "text",
    "bed_group_id" "text",
    "bed_preference" "text",
    "pricing_nightly" "jsonb",
    "pricing_subtotal" numeric(10,2),
    "pricing_taxes" numeric(10,2),
    "pricing_fees" numeric(10,2),
    "pricing_total" numeric(10,2),
    "pricing_currency" "text" DEFAULT 'BRL'::"text",
    "status" "text" DEFAULT 'confirmed'::"text",
    "cancelled_at" timestamp with time zone,
    "cancellation_reason" "text",
    "ota_room_data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reservation_rooms_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'checked_in'::"text", 'checked_out'::"text", 'cancelled'::"text", 'no_show'::"text"])))
);


ALTER TABLE "public"."reservation_rooms" OWNER TO "postgres";


COMMENT ON TABLE "public"."reservation_rooms" IS 'Quartos individuais de uma reserva multi-room. property_id referencia properties (anúncio/accommodation)';



COMMENT ON COLUMN "public"."reservation_rooms"."property_id" IS 'FK para properties - o anúncio/quarto específico reservado';



COMMENT ON COLUMN "public"."reservation_rooms"."pricing_nightly" IS 'Breakdown de preço por noite no formato universal';



CREATE TABLE IF NOT EXISTS "public"."reservations" (
    "id" "text" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "guest_id" "uuid",
    "check_in" "date" NOT NULL,
    "check_out" "date" NOT NULL,
    "nights" integer NOT NULL,
    "guests_adults" integer DEFAULT 1 NOT NULL,
    "guests_children" integer DEFAULT 0,
    "guests_infants" integer DEFAULT 0,
    "guests_pets" integer DEFAULT 0,
    "guests_total" integer NOT NULL,
    "pricing_price_per_night" integer NOT NULL,
    "pricing_base_total" integer,
    "pricing_cleaning_fee" integer DEFAULT 0,
    "pricing_service_fee" integer DEFAULT 0,
    "pricing_taxes" integer DEFAULT 0,
    "pricing_discount" integer DEFAULT 0,
    "pricing_total" integer,
    "pricing_currency" character varying(3) DEFAULT 'BRL'::character varying,
    "pricing_applied_tier" character varying(20),
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "platform" character varying(20) NOT NULL,
    "external_id" character varying(100),
    "external_url" "text",
    "payment_status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "payment_method" character varying(20),
    "payment_transaction_id" character varying(100),
    "payment_paid_at" timestamp with time zone,
    "payment_refunded_at" timestamp with time zone,
    "notes" "text",
    "internal_comments" "text",
    "special_requests" "text",
    "check_in_time" time without time zone,
    "check_out_time" time without time zone,
    "actual_check_in" timestamp with time zone,
    "actual_check_out" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "cancelled_by" character varying(100),
    "cancellation_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid" NOT NULL,
    "confirmed_at" timestamp with time zone,
    "source_created_at" timestamp with time zone,
    "staysnet_raw" "jsonb",
    "staysnet_listing_id" "text",
    "staysnet_client_id" "text",
    "staysnet_reservation_code" "text",
    "staysnet_partner_code" "text",
    "staysnet_partner_id" "text",
    "staysnet_partner_name" "text",
    "staysnet_type" "text",
    "payment_expires_at" timestamp with time zone,
    "pricing_platform_commission" integer DEFAULT 0 NOT NULL,
    "platform_partner_name" "text",
    "platform_commission_type" "text",
    "crm_contact_id" "uuid",
    "itinerary_id" "text",
    "confirmation_expedia" "text",
    "confirmation_property" "text",
    "affiliate_reference_id" "text",
    "affiliate_metadata" "text",
    "travel_purpose" "text",
    "adjustment_value" numeric(10,2),
    "adjustment_type" "text",
    "adjustment_currency" "text",
    "invoicing_consent" boolean DEFAULT false,
    "invoicing_company_name" "text",
    "invoicing_vat_number" "text",
    "invoicing_email" "text",
    "merchant_of_record" "text",
    "ota_links" "jsonb" DEFAULT '{}'::"jsonb",
    "rate_plan_id" "uuid",
    "cancellation_policy_id" "text",
    "is_refundable" boolean DEFAULT true,
    "refund_amount" numeric(10,2),
    "refund_currency" "text",
    "adjustment_reason" "text",
    "invoicing_company_address" "jsonb",
    "trader_information" "jsonb",
    "supplier_transparency" "jsonb",
    CONSTRAINT "check_dates" CHECK (("check_out" > "check_in")),
    CONSTRAINT "check_pricing_total" CHECK (("pricing_total" >= 0)),
    CONSTRAINT "reservations_adjustment_type_check" CHECK (("adjustment_type" = ANY (ARRAY['percentage'::"text", 'fixed'::"text"]))),
    CONSTRAINT "reservations_merchant_of_record_check" CHECK (("merchant_of_record" = ANY (ARRAY['property'::"text", 'expedia'::"text", 'booking'::"text", 'ota'::"text"]))),
    CONSTRAINT "reservations_payment_method_check" CHECK ((("payment_method")::"text" = ANY ((ARRAY['credit_card'::character varying, 'debit_card'::character varying, 'pix'::character varying, 'bank_transfer'::character varying, 'cash'::character varying, 'platform'::character varying])::"text"[]))),
    CONSTRAINT "reservations_payment_status_check" CHECK ((("payment_status")::"text" = ANY ((ARRAY['pending'::character varying, 'partial'::character varying, 'paid'::character varying, 'refunded'::character varying, 'failed'::character varying])::"text"[]))),
    CONSTRAINT "reservations_platform_check" CHECK ((("platform")::"text" = ANY ((ARRAY['airbnb'::character varying, 'booking'::character varying, 'decolar'::character varying, 'direct'::character varying, 'other'::character varying])::"text"[]))),
    CONSTRAINT "reservations_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'checked_in'::character varying, 'checked_out'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'no_show'::character varying])::"text"[]))),
    CONSTRAINT "reservations_travel_purpose_check" CHECK (("travel_purpose" = ANY (ARRAY['business'::"text", 'leisure'::"text", 'unspecified'::"text"])))
);


ALTER TABLE "public"."reservations" OWNER TO "postgres";


COMMENT ON TABLE "public"."reservations" IS 'Tabela de reservas com estrutura flat (30+ colunas) para performance';



COMMENT ON COLUMN "public"."reservations"."id" IS 'ID único da reserva (TEXT format: res-{timestamp}-{random})';



COMMENT ON COLUMN "public"."reservations"."organization_id" IS 'UUID da organização (multi-tenant)';



COMMENT ON COLUMN "public"."reservations"."property_id" IS 'UUID da propriedade (FK: properties.id)';



COMMENT ON COLUMN "public"."reservations"."guest_id" IS 'UUID do hóspede (FK: guests.id)';



COMMENT ON COLUMN "public"."reservations"."check_in" IS 'Data de check-in (DATE)';



COMMENT ON COLUMN "public"."reservations"."check_out" IS 'Data de check-out (DATE)';



COMMENT ON COLUMN "public"."reservations"."nights" IS 'Número de noites (calculado)';



COMMENT ON COLUMN "public"."reservations"."status" IS 'Status: pending, confirmed, checked_in, checked_out, cancelled, no_show';



COMMENT ON COLUMN "public"."reservations"."platform" IS 'Plataforma de origem: airbnb, booking, decolar, direct, other';



COMMENT ON COLUMN "public"."reservations"."payment_status" IS 'Status pagamento: pending, paid, partial, refunded, cancelled';



COMMENT ON COLUMN "public"."reservations"."cancellation_reason" IS 'Reason for cancellation: payment_timeout, guest_cancelled, admin_cancelled, etc';



COMMENT ON COLUMN "public"."reservations"."staysnet_listing_id" IS 'ID do listing/imóvel na Stays (ex.: staysnet_raw._idlisting)';



COMMENT ON COLUMN "public"."reservations"."staysnet_client_id" IS 'ID do cliente na Stays (ex.: staysnet_raw._idclient)';



COMMENT ON COLUMN "public"."reservations"."staysnet_reservation_code" IS 'Código curto da reserva na Stays (ex.: staysnet_raw.id)';



COMMENT ON COLUMN "public"."reservations"."staysnet_partner_code" IS 'Código do parceiro/canal na Stays (ex.: staysnet_raw.partnerCode)';



COMMENT ON COLUMN "public"."reservations"."staysnet_partner_id" IS 'ID do parceiro/canal na Stays (ex.: staysnet_raw.partner._id)';



COMMENT ON COLUMN "public"."reservations"."staysnet_partner_name" IS 'Nome do parceiro/canal na Stays (ex.: staysnet_raw.partner.name)';



COMMENT ON COLUMN "public"."reservations"."staysnet_type" IS 'Tipo macro na Stays (ex.: staysnet_raw.type = booked/canceled/blocked etc)';



COMMENT ON COLUMN "public"."reservations"."payment_expires_at" IS 'When this pending reservation expires if payment not received';



COMMENT ON COLUMN "public"."reservations"."pricing_platform_commission" IS 'Comissão cobrada pela plataforma (Airbnb, Booking, etc) em CENTAVOS. Vem do campo partner.commission._mcval.BRL do Stays.net';



COMMENT ON COLUMN "public"."reservations"."platform_partner_name" IS 'Nome do parceiro/plataforma que cobra a comissão (ex: API booking.com, Airbnb)';



COMMENT ON COLUMN "public"."reservations"."platform_commission_type" IS 'Tipo de comissão (fixed, percentage, etc) conforme definido no Stays.net';



COMMENT ON COLUMN "public"."reservations"."crm_contact_id" IS 'Vínculo com crm_contacts (novo). guest_id mantido para compatibilidade.';



COMMENT ON COLUMN "public"."reservations"."itinerary_id" IS 'ID do itinerary na OTA (ex: Expedia itinerary_id)';



COMMENT ON COLUMN "public"."reservations"."merchant_of_record" IS 'Quem processa o pagamento: property ou OTA';



COMMENT ON COLUMN "public"."reservations"."ota_links" IS 'Links HATEOAS da OTA (cancel, change, etc)';



CREATE TABLE IF NOT EXISTS "public"."room_photos" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "room_id" "uuid" NOT NULL,
    "url" "text" NOT NULL,
    "tag" character varying(50) NOT NULL,
    "caption" "text",
    "order_index" integer DEFAULT 0,
    "is_main" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."room_photos" OWNER TO "postgres";


COMMENT ON TABLE "public"."room_photos" IS 'Fotos dos cômodos';



CREATE TABLE IF NOT EXISTS "public"."room_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "name_pt" "text",
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."room_types" OWNER TO "postgres";


COMMENT ON TABLE "public"."room_types" IS '[OTA-UNIVERSAL] Tipos de quarto padrão';



CREATE TABLE IF NOT EXISTS "public"."rooms" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "accommodation_id" "uuid" NOT NULL,
    "type" character varying(20) NOT NULL,
    "name" character varying(100),
    "is_shared" boolean DEFAULT false,
    "has_lock" boolean DEFAULT true,
    "capacity" integer DEFAULT 0,
    "photos" "text"[],
    "order_index" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "rooms_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['banheiro'::character varying, 'meio-banheiro'::character varying, 'quadruplo'::character varying, 'suite'::character varying, 'triplo'::character varying, 'twin'::character varying, 'duplo'::character varying, 'individual'::character varying, 'studio'::character varying, 'sala'::character varying, 'outras'::character varying])::"text"[])))
);


ALTER TABLE "public"."rooms" OWNER TO "postgres";


COMMENT ON TABLE "public"."rooms" IS 'Cômodos das acomodações';



CREATE TABLE IF NOT EXISTS "public"."sales_deal_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "deal_id" "uuid" NOT NULL,
    "type" character varying(50) NOT NULL,
    "description" "text",
    "metadata" "jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sales_deal_activities" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."sales_deals_expanded" AS
 SELECT "d"."id",
    "d"."organization_id",
    "d"."funnel_id",
    "d"."stage_id",
    "d"."title",
    "d"."description",
    "d"."value",
    "d"."currency",
    "d"."probability",
    "d"."expected_close_date",
    "d"."contact_id",
    "d"."contact_name",
    "d"."contact_email",
    "d"."contact_phone",
    "d"."contact_whatsapp_jid",
    "d"."source",
    "d"."source_metadata",
    "d"."owner_id",
    "d"."owner_name",
    "d"."status",
    "d"."won_at",
    "d"."lost_at",
    "d"."lost_reason",
    "d"."tags",
    "d"."custom_fields",
    "d"."notes",
    "d"."created_by",
    "d"."created_at",
    "d"."updated_at",
    "d"."lost_reason_id",
    "d"."crm_contact_id",
    "d"."crm_company_id",
    "c"."full_name" AS "crm_contact_full_name",
    "c"."email" AS "crm_contact_email",
    "c"."phone" AS "crm_contact_phone",
    "c"."mobile" AS "crm_contact_mobile",
    "c"."job_title" AS "crm_contact_job_title",
    "co"."name" AS "crm_company_name",
    "co"."cnpj" AS "crm_company_cnpj",
    "co"."industry" AS "crm_company_industry",
    "co"."phone" AS "crm_company_phone"
   FROM (("public"."sales_deals" "d"
     LEFT JOIN "public"."crm_contacts" "c" ON (("d"."crm_contact_id" = "c"."id")))
     LEFT JOIN "public"."crm_companies" "co" ON (("d"."crm_company_id" = "co"."id")));


ALTER VIEW "public"."sales_deals_expanded" OWNER TO "postgres";


COMMENT ON VIEW "public"."sales_deals_expanded" IS 'Deals com dados expandidos de contato e empresa CRM';



CREATE TABLE IF NOT EXISTS "public"."sales_funnel_stages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "funnel_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "color" character varying(20) DEFAULT '#3b82f6'::character varying,
    "order" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sales_funnel_stages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_funnels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "is_default" boolean DEFAULT false,
    "status_config" "jsonb" DEFAULT '{"wonStatus": "Ganho", "lostStatus": "Perdido", "inProgressStatus": "Em Negociação"}'::"jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sales_funnels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saved_payment_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "crm_contact_id" "uuid",
    "payment_method_type" "text" NOT NULL,
    "card_last_four" "text",
    "card_brand" "text",
    "card_expiration_month" "text",
    "card_expiration_year" "text",
    "card_holder_name" "text",
    "card_token" "text",
    "gateway" "text",
    "pix_key" "text",
    "pix_key_type" "text",
    "bank_code" "text",
    "bank_name" "text",
    "bank_branch" "text",
    "bank_account" "text",
    "bank_account_type" "text",
    "billing_address_line_1" "text",
    "billing_address_city" "text",
    "billing_address_state" "text",
    "billing_address_postal_code" "text",
    "billing_address_country" "text",
    "is_default" boolean DEFAULT false,
    "is_verified" boolean DEFAULT false,
    "nickname" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_used_at" timestamp with time zone,
    CONSTRAINT "saved_payment_methods_payment_method_type_check" CHECK (("payment_method_type" = ANY (ARRAY['credit_card'::"text", 'debit_card'::"text", 'pix_key'::"text", 'bank_account'::"text"])))
);


ALTER TABLE "public"."saved_payment_methods" OWNER TO "postgres";


COMMENT ON TABLE "public"."saved_payment_methods" IS 'Métodos de pagamento salvos dos hóspedes';



CREATE TABLE IF NOT EXISTS "public"."service_funnel_stages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "funnel_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "color" character varying(20) DEFAULT '#3b82f6'::character varying,
    "order" integer DEFAULT 1 NOT NULL,
    "is_resolved" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."service_funnel_stages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_funnels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "is_default" boolean DEFAULT false,
    "status_config" "jsonb" DEFAULT '{"resolvedStatus": "Resolvido", "inProgressStatus": "Em Análise", "unresolvedStatus": "Não Resolvido"}'::"jsonb",
    "sla_config" "jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."service_funnels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_ticket_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "type" character varying(50) NOT NULL,
    "description" "text",
    "metadata" "jsonb",
    "is_internal" boolean DEFAULT false,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."service_ticket_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "funnel_id" "uuid" NOT NULL,
    "stage_id" "uuid" NOT NULL,
    "title" character varying(500) NOT NULL,
    "description" "text",
    "priority" character varying(20) DEFAULT 'medium'::character varying,
    "category" character varying(100),
    "property_id" "uuid",
    "reservation_id" "uuid",
    "guest_id" "uuid",
    "requester_type" character varying(20) DEFAULT 'guest'::character varying,
    "requester_id" "uuid",
    "requester_name" character varying(255),
    "requester_email" character varying(255),
    "requester_phone" character varying(50),
    "assignee_id" "uuid",
    "assignee_name" character varying(255),
    "status" character varying(20) DEFAULT 'open'::character varying,
    "resolved_at" timestamp with time zone,
    "resolution_notes" "text",
    "sla_due_at" timestamp with time zone,
    "sla_breached" boolean DEFAULT false,
    "tags" "text"[],
    "custom_fields" "jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "unresolved_reason_id" "uuid",
    CONSTRAINT "service_tickets_priority_check" CHECK ((("priority")::"text" = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying])::"text"[]))),
    CONSTRAINT "service_tickets_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['open'::character varying, 'in_progress'::character varying, 'resolved'::character varying, 'closed'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."service_tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "type" "text" NOT NULL,
    "organization_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "last_activity" timestamp with time zone DEFAULT "now"() NOT NULL,
    "access_token" "text",
    "refresh_token" "text",
    "access_expires_at" timestamp with time zone,
    "refresh_expires_at" timestamp with time zone,
    "rotated_from" "uuid",
    "rotated_to" "uuid",
    "user_agent" "text",
    "ip_hash" "text",
    "revoked_at" timestamp with time zone,
    CONSTRAINT "sessions_type_check" CHECK (("type" = ANY (ARRAY['superadmin'::"text", 'imobiliaria'::"text", 'staff'::"text"])))
);


ALTER TABLE "public"."sessions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."sessions"."access_token" IS 'Token de acesso (curto, 15-30 min) - usado em todas as chamadas de API';



COMMENT ON COLUMN "public"."sessions"."refresh_token" IS 'Token de renovação (longo, 30-60 dias) - usado apenas para renovar access_token';



COMMENT ON COLUMN "public"."sessions"."access_expires_at" IS 'Data de expiração do access token';



COMMENT ON COLUMN "public"."sessions"."refresh_expires_at" IS 'Data de expiração do refresh token';



COMMENT ON COLUMN "public"."sessions"."rotated_from" IS 'ID da sessão anterior (para rotação de refresh tokens)';



COMMENT ON COLUMN "public"."sessions"."rotated_to" IS 'ID da sessão seguinte (para rotação de refresh tokens)';



COMMENT ON COLUMN "public"."sessions"."user_agent" IS 'User agent do navegador (para segurança)';



COMMENT ON COLUMN "public"."sessions"."ip_hash" IS 'Hash do IP do usuário (para segurança)';



COMMENT ON COLUMN "public"."sessions"."revoked_at" IS 'Data de revogação da sessão (logout ou segurança)';



CREATE TABLE IF NOT EXISTS "public"."short_ids" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "short_id" character varying(6) NOT NULL,
    "resource_type" character varying(20) NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "short_ids_resource_type_check" CHECK ((("resource_type")::"text" = ANY ((ARRAY['property'::character varying, 'location'::character varying])::"text"[])))
);


ALTER TABLE "public"."short_ids" OWNER TO "postgres";


COMMENT ON TABLE "public"."short_ids" IS 'Mapeamento de Short IDs de 6 caracteres para UUIDs longos';



CREATE TABLE IF NOT EXISTS "public"."staysnet_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "api_key" "text" NOT NULL,
    "api_secret" "text",
    "base_url" "text" DEFAULT 'https://stays.net/external/v1'::"text" NOT NULL,
    "account_name" "text",
    "notification_webhook_url" "text",
    "scope" "text" DEFAULT 'global'::"text" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "last_sync" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "text",
    "updated_by" "text",
    CONSTRAINT "staysnet_config_scope_check" CHECK (("scope" = ANY (ARRAY['global'::"text", 'individual'::"text"])))
);


ALTER TABLE "public"."staysnet_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."staysnet_config" IS 'Configuração da integração Stays.net por organização';



CREATE TABLE IF NOT EXISTS "public"."staysnet_import_issues" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "platform" "text" DEFAULT 'staysnet'::"text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "issue_type" "text" NOT NULL,
    "external_id" "text",
    "reservation_code" "text",
    "listing_id" "text",
    "listing_candidates" "jsonb",
    "check_in" "date",
    "check_out" "date",
    "partner" "text",
    "platform_source" "text",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "message" "text",
    "raw_payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone
);


ALTER TABLE "public"."staysnet_import_issues" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staysnet_properties_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "staysnet_property_id" "text" NOT NULL,
    "property_data" "jsonb" NOT NULL,
    "synced_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."staysnet_properties_cache" OWNER TO "postgres";


COMMENT ON TABLE "public"."staysnet_properties_cache" IS 'Cache de propriedades sincronizadas do Stays.net';



CREATE TABLE IF NOT EXISTS "public"."staysnet_raw_objects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "domain" "text" NOT NULL,
    "external_id" "text",
    "external_code" "text",
    "endpoint" "text",
    "payload" "jsonb" NOT NULL,
    "payload_hash" "text" NOT NULL,
    "fetched_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."staysnet_raw_objects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staysnet_reservations_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "staysnet_reservation_id" "text" NOT NULL,
    "reservation_data" "jsonb" NOT NULL,
    "synced_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."staysnet_reservations_cache" OWNER TO "postgres";


COMMENT ON TABLE "public"."staysnet_reservations_cache" IS 'Cache de reservas sincronizadas do Stays.net';



CREATE TABLE IF NOT EXISTS "public"."staysnet_sync_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "sync_type" "text" NOT NULL,
    "status" "text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "items_synced" integer DEFAULT 0,
    "items_created" integer DEFAULT 0,
    "items_updated" integer DEFAULT 0,
    "items_failed" integer DEFAULT 0,
    "error_message" "text",
    "metadata" "jsonb",
    CONSTRAINT "staysnet_sync_log_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'running'::"text", 'success'::"text", 'error'::"text", 'partial'::"text"]))),
    CONSTRAINT "staysnet_sync_log_sync_type_check" CHECK (("sync_type" = ANY (ARRAY['properties'::"text", 'reservations'::"text", 'calendar'::"text", 'prices'::"text", 'clients'::"text", 'full'::"text"])))
);


ALTER TABLE "public"."staysnet_sync_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."staysnet_sync_log" IS 'Log de sincronizações realizadas com o Stays.net';



CREATE TABLE IF NOT EXISTS "public"."staysnet_webhooks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "action" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed" boolean DEFAULT false,
    "processed_at" timestamp with time zone,
    "error_message" "text",
    "metadata" "jsonb",
    "retry_count" integer DEFAULT 0
);


ALTER TABLE "public"."staysnet_webhooks" OWNER TO "postgres";


COMMENT ON TABLE "public"."staysnet_webhooks" IS 'Histórico de webhooks recebidos do Stays.net';



COMMENT ON COLUMN "public"."staysnet_webhooks"."retry_count" IS 'Number of retry attempts for failed webhook processing';



CREATE TABLE IF NOT EXISTS "public"."stripe_checkout_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "reservation_id" "text",
    "checkout_session_id" "text" NOT NULL,
    "payment_intent_id" "text",
    "customer_id" "text",
    "status" "text",
    "livemode" boolean,
    "currency" "text",
    "amount_total" integer,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stripe_checkout_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."stripe_checkout_sessions" IS 'Mapeia reservation ↔ Stripe Checkout Session/PaymentIntent.';



CREATE TABLE IF NOT EXISTS "public"."stripe_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "is_test_mode" boolean DEFAULT true NOT NULL,
    "publishable_key" "text",
    "secret_key_encrypted" "text",
    "webhook_signing_secret_encrypted" "text",
    "restricted_key_encrypted" "text",
    "webhook_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "stripe_webhook_id" "text",
    "payment_methods" "jsonb" DEFAULT '["credit_card"]'::"jsonb" NOT NULL,
    "priority" integer DEFAULT 1 NOT NULL
);


ALTER TABLE "public"."stripe_configs" OWNER TO "postgres";


COMMENT ON TABLE "public"."stripe_configs" IS 'Configuração Stripe por organização. Secrets ficam criptografados.';



COMMENT ON COLUMN "public"."stripe_configs"."secret_key_encrypted" IS 'Secret key criptografada. Nunca retornar em claro.';



COMMENT ON COLUMN "public"."stripe_configs"."webhook_signing_secret_encrypted" IS 'Webhook signing secret (whsec_) criptografado. Nunca retornar em claro.';



COMMENT ON COLUMN "public"."stripe_configs"."payment_methods" IS 'Array of enabled payment methods: credit_card, pix, boleto, paypal';



COMMENT ON COLUMN "public"."stripe_configs"."priority" IS 'Priority for gateway selection (lower = higher priority)';



CREATE TABLE IF NOT EXISTS "public"."stripe_webhook_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "stripe_event_id" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "livemode" boolean,
    "api_version" "text",
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed" boolean DEFAULT false NOT NULL,
    "processed_at" timestamp with time zone,
    "error_message" "text",
    "payload" "jsonb" NOT NULL
);


ALTER TABLE "public"."stripe_webhook_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."stripe_webhook_events" IS 'Eventos recebidos do Stripe (idempotência por stripe_event_id).';



CREATE TABLE IF NOT EXISTS "public"."task_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "activity_type" character varying(50) NOT NULL,
    "old_value" "jsonb",
    "new_value" "jsonb",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_activities" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_activities" IS 'Log de atividades/histórico de tarefas';



CREATE TABLE IF NOT EXISTS "public"."task_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "mentions" "uuid"[] DEFAULT '{}'::"uuid"[],
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "parent_comment_id" "uuid",
    "is_edited" boolean DEFAULT false,
    "edited_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_comments" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_comments" IS 'Comentários em tarefas (separado de atividades/log)';



CREATE TABLE IF NOT EXISTS "public"."task_dependencies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "depends_on_task_id" "uuid" NOT NULL,
    "dependency_type" character varying(20) DEFAULT 'finish_to_start'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "no_self_dependency" CHECK (("task_id" <> "depends_on_task_id"))
);


ALTER TABLE "public"."task_dependencies" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_dependencies" IS 'Dependências entre tarefas (finish-to-start, etc)';



CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "external_name" character varying(100),
    "external_phone" character varying(20),
    "external_email" character varying(255),
    "role" character varying(20) DEFAULT 'member'::character varying,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chk_team_member_identity" CHECK ((("user_id" IS NOT NULL) OR (("external_name" IS NOT NULL) AND (("external_phone" IS NOT NULL) OR ("external_email" IS NOT NULL)))))
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."team_members" IS 'Membros de cada time (internos ou externos)';



CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "notification_on_task_created" boolean DEFAULT true,
    "notification_on_sla_approaching" boolean DEFAULT true,
    "notification_on_task_overdue" boolean DEFAULT true,
    "notification_on_any_update" boolean DEFAULT false,
    "notification_channels" "text"[] DEFAULT ARRAY['push'::"text"],
    "assignment_rule" character varying(20) DEFAULT 'notify_all'::character varying,
    "fixed_assignee_id" "uuid",
    "color" character varying(7) DEFAULT '#3b82f6'::character varying,
    "icon" character varying(50) DEFAULT 'users'::character varying,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


COMMENT ON TABLE "public"."teams" IS 'Times/Equipes para atribuição e notificação de tarefas';



CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "slug" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "owner_id" "uuid",
    "email" "text" NOT NULL,
    "name" "text",
    "role" "text" NOT NULL,
    "user_type" "text" NOT NULL,
    "token" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "permissions" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "user_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'expired'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "user_invitations_user_type_check" CHECK (("user_type" = ANY (ARRAY['staff'::"text", 'owner'::"text", 'owner_user'::"text"])))
);


ALTER TABLE "public"."user_invitations" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_invitations" IS 'Convites pendentes para novos usuários';



COMMENT ON COLUMN "public"."user_invitations"."user_type" IS 'Tipo de usuário: staff (equipe), owner (proprietário), owner_user (usuário de proprietário)';



CREATE TABLE IF NOT EXISTS "public"."users_kv_mappings" (
    "kv_key" "text" NOT NULL,
    "user_id" "uuid",
    "migrated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."users_kv_mappings" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_ai_agent_disponibilidade" AS
 SELECT "e"."id" AS "empreendimento_id",
    "e"."nome" AS "empreendimento",
    "c"."name" AS "construtora",
    "e"."organization_id",
    "count"(*) AS "total_unidades",
    "count"(*) FILTER (WHERE (("u"."status")::"text" = 'disponivel'::"text")) AS "disponiveis",
    "count"(*) FILTER (WHERE (("u"."status")::"text" = 'reservado'::"text")) AS "reservadas",
    "count"(*) FILTER (WHERE (("u"."status")::"text" = 'vendido'::"text")) AS "vendidas",
    "round"(((100.0 * ("count"(*) FILTER (WHERE (("u"."status")::"text" = 'vendido'::"text")))::numeric) / (NULLIF("count"(*), 0))::numeric), 2) AS "percentual_vendido",
    "max"("u"."scraped_at") AS "ultima_atualizacao"
   FROM (("public"."ai_agent_empreendimentos" "e"
     LEFT JOIN "public"."ai_agent_unidades" "u" ON (("u"."empreendimento_id" = "e"."id")))
     LEFT JOIN "public"."ai_agent_construtoras" "c" ON (("c"."id" = "e"."construtora_id")))
  GROUP BY "e"."id", "e"."nome", "c"."name", "e"."organization_id";


ALTER VIEW "public"."v_ai_agent_disponibilidade" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_ai_agent_disponibilidade" IS 'Resumo de disponibilidade por empreendimento';



CREATE OR REPLACE VIEW "public"."v_all_users" AS
 SELECT "u"."id",
    "u"."username",
    "u"."email",
    "u"."name",
    "u"."type",
    "u"."status",
    "u"."organization_id",
    "u"."owner_id",
    "o"."name" AS "organization_name",
    "ow"."name" AS "owner_name",
    "u"."last_login_at",
    "u"."created_at",
        CASE
            WHEN (("u"."type")::"text" = 'superadmin'::"text") THEN 'Super Admin'::"text"
            WHEN (("u"."type")::"text" = 'imobiliaria'::"text") THEN 'Admin da Imobiliária'::"text"
            WHEN (("u"."type")::"text" = 'staff'::"text") THEN 'Equipe'::"text"
            WHEN (("u"."type")::"text" = 'owner'::"text") THEN 'Proprietário'::"text"
            WHEN (("u"."type")::"text" = 'owner_user'::"text") THEN 'Usuário de Proprietário'::"text"
            ELSE NULL::"text"
        END AS "type_label"
   FROM (("public"."users" "u"
     LEFT JOIN "public"."organizations" "o" ON (("u"."organization_id" = "o"."id")))
     LEFT JOIN "public"."owners" "ow" ON (("u"."owner_id" = "ow"."id")));


ALTER VIEW "public"."v_all_users" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_channel_instances_active" AS
 SELECT "ci"."id",
    "ci"."organization_id",
    "ci"."channel",
    "ci"."provider",
    "ci"."instance_name",
    "ci"."api_url",
    "ci"."api_key",
    "ci"."instance_token",
    "ci"."status",
    "ci"."error_message",
    "ci"."connected_identifier",
    "ci"."profile_name",
    "ci"."profile_picture_url",
    "ci"."webhook_url",
    "ci"."webhook_events",
    "ci"."qr_code",
    "ci"."qr_code_updated_at",
    "ci"."settings",
    "ci"."is_enabled",
    "ci"."is_default",
    "ci"."created_at",
    "ci"."updated_at",
    "ci"."last_connected_at",
    "ci"."deleted_at",
    "o"."name" AS "organization_name"
   FROM ("public"."channel_instances" "ci"
     JOIN "public"."organizations" "o" ON (("o"."id" = "ci"."organization_id")))
  WHERE (("ci"."deleted_at" IS NULL) AND ("ci"."is_enabled" = true));


ALTER VIEW "public"."v_channel_instances_active" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_channel_instances_active" IS 'Instâncias de canal ativas (não deletadas e habilitadas)';



CREATE OR REPLACE VIEW "public"."v_operations_today" AS
 SELECT "ot"."id",
    "ot"."title",
    "ot"."status",
    "ot"."priority",
    "ot"."scheduled_date",
    "ot"."scheduled_time",
    "ot"."due_datetime",
    "ot"."property_id",
    "ot"."reservation_id",
    "ot"."triggered_by_event",
    "ot"."assignee_id",
    "u"."name" AS "assignee_name",
    "ot"."team_id",
    "tm"."name" AS "team_name",
    "tpl"."name" AS "template_name",
    "tpl"."icon" AS "template_icon",
    "tpl"."color" AS "template_color"
   FROM ((("public"."operational_tasks" "ot"
     LEFT JOIN "public"."users" "u" ON (("ot"."assignee_id" = "u"."id")))
     LEFT JOIN "public"."teams" "tm" ON (("ot"."team_id" = "tm"."id")))
     LEFT JOIN "public"."operational_task_templates" "tpl" ON (("ot"."template_id" = "tpl"."id")))
  WHERE ("ot"."scheduled_date" = CURRENT_DATE)
  ORDER BY "ot"."scheduled_time", "ot"."priority" DESC;


ALTER VIEW "public"."v_operations_today" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_pending_webhooks" AS
 SELECT "id",
    "ota",
    "event_type",
    "event_id",
    "created_at",
    "processing_attempts",
    "last_attempt_at",
        CASE
            WHEN ("processing_attempts" = 0) THEN 'new'::"text"
            WHEN ("processing_attempts" < 3) THEN 'retrying'::"text"
            ELSE 'failing'::"text"
        END AS "status_hint"
   FROM "public"."ota_webhooks"
  WHERE ("processed" = false)
  ORDER BY "created_at";


ALTER VIEW "public"."v_pending_webhooks" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_properties_ota_ready" AS
 SELECT "id",
    "organization_id",
    "status",
    "checkin_begin_time",
    "checkin_end_time",
    "checkout_time",
    "min_age_checkin",
    "obfuscation_required",
    "private_host",
    "pets_policy",
    "smoking_policy",
    ( SELECT "count"(*) AS "count"
           FROM "public"."property_rooms" "pr"
          WHERE (("pr"."property_id" = "p"."id") AND ("pr"."is_active" = true))) AS "room_count",
    ( SELECT COALESCE("sum"("pr"."max_occupancy"), (0)::bigint) AS "coalesce"
           FROM "public"."property_rooms" "pr"
          WHERE (("pr"."property_id" = "p"."id") AND ("pr"."is_active" = true))) AS "total_capacity",
    "vrbo_listing_id",
    "vrbo_srp_id",
    "property_rating",
    "property_rating_type",
    "created_at",
    "updated_at"
   FROM "public"."properties" "p"
  WHERE (("status")::"text" = 'active'::"text");


ALTER VIEW "public"."v_properties_ota_ready" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_properties_with_responsibilities" AS
 SELECT "id",
    "title",
    "organization_id",
    "cleaning_responsibility",
    "maintenance_responsibility",
        CASE
            WHEN ("cleaning_responsibility" = 'company'::"text") THEN 'Empresa'::"text"
            WHEN ("cleaning_responsibility" = 'owner'::"text") THEN 'Proprietário'::"text"
            ELSE 'Não definido'::"text"
        END AS "cleaning_responsibility_label",
        CASE
            WHEN ("maintenance_responsibility" = 'company'::"text") THEN 'Empresa'::"text"
            WHEN ("maintenance_responsibility" = 'owner'::"text") THEN 'Proprietário'::"text"
            ELSE 'Não definido'::"text"
        END AS "maintenance_responsibility_label"
   FROM "public"."properties" "p";


ALTER VIEW "public"."v_properties_with_responsibilities" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_property_pricing" AS
 SELECT "p"."id" AS "property_id",
    COALESCE(("p"."data" ->> 'title'::"text"), 'Sem nome'::"text") AS "property_name",
    "p"."organization_id",
    "rp"."id" AS "rate_plan_id",
    "rp"."code" AS "rate_plan_code",
    "rp"."name_pt" AS "rate_plan_name",
    "rp"."is_default",
    COALESCE((("p"."data" ->> 'preco_base_noite'::"text"))::numeric, (0)::numeric) AS "base_price",
    COALESCE(("p"."data" ->> 'moeda'::"text"), 'BRL'::"text") AS "currency",
    "rp"."price_adjustment_type",
    "rp"."price_adjustment_value",
    "rp"."min_nights",
    "rp"."cancellation_policy_id"
   FROM ("public"."properties" "p"
     LEFT JOIN "public"."rate_plans" "rp" ON ((("rp"."property_id" = "p"."id") AND ("rp"."is_active" = true))))
  WHERE (("p"."status")::"text" = 'active'::"text");


ALTER VIEW "public"."v_property_pricing" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_property_pricing" IS 'View que combina property + rate_plans para facilitar consultas de pricing';



CREATE OR REPLACE VIEW "public"."v_property_rooms_detailed" AS
 SELECT "pr"."id",
    "pr"."property_id",
    "pr"."room_type_id",
    "pr"."name",
    "pr"."description",
    "pr"."internal_code",
    "pr"."area_sqm",
    "pr"."area_sqft",
    "pr"."max_occupancy",
    "pr"."max_adults",
    "pr"."max_children",
    "pr"."standard_occupancy",
    "pr"."base_price",
    "pr"."extra_person_fee",
    "pr"."currency",
    "pr"."bed_configuration",
    "pr"."images",
    "pr"."amenity_ids",
    "pr"."views",
    "pr"."is_smoking_allowed",
    "pr"."is_accessible",
    "pr"."floor_number",
    "pr"."is_active",
    "pr"."sort_order",
    "pr"."ota_room_ids",
    "pr"."created_at",
    "pr"."updated_at",
    "p"."organization_id",
    "rt"."name" AS "room_type_name",
    "rt"."code" AS "room_type_code"
   FROM (("public"."property_rooms" "pr"
     LEFT JOIN "public"."properties" "p" ON (("p"."id" = "pr"."property_id")))
     LEFT JOIN "public"."room_types" "rt" ON (("rt"."id" = "pr"."room_type_id")));


ALTER VIEW "public"."v_property_rooms_detailed" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_property_sync_status" AS
 SELECT "p"."id" AS "property_id",
    "p"."organization_id",
    "p"."status" AS "property_status",
    "poe"."ota",
    "poe"."ota_property_id",
    "poe"."status" AS "ota_status",
    "poe"."sync_enabled",
    "poe"."last_synced_at",
    "poe"."last_sync_result",
        CASE
            WHEN ("poe"."last_synced_at" IS NULL) THEN 'never'::"text"
            WHEN ("poe"."last_synced_at" > ("now"() - '01:00:00'::interval)) THEN 'recent'::"text"
            WHEN ("poe"."last_synced_at" > ("now"() - '24:00:00'::interval)) THEN 'today'::"text"
            ELSE 'stale'::"text"
        END AS "sync_freshness"
   FROM ("public"."properties" "p"
     LEFT JOIN "public"."property_ota_extensions" "poe" ON (("p"."id" = "poe"."property_id")))
  WHERE (("p"."status")::"text" = 'active'::"text");


ALTER VIEW "public"."v_property_sync_status" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_tasks_complete" AS
 SELECT "t"."id",
    "t"."organization_id",
    "t"."title",
    "t"."description",
    "t"."status",
    "t"."priority",
    "t"."task_type",
    "t"."parent_id",
    "t"."depth",
    "t"."path",
    "t"."assignee_id",
    "t"."team_id",
    "t"."due_date",
    "t"."start_date",
    "t"."completed_at",
    "t"."estimated_minutes",
    "t"."actual_minutes",
    "t"."project_id",
    "t"."deal_id",
    "t"."ticket_id",
    "t"."property_id",
    "t"."reservation_id",
    "t"."display_order",
    "t"."section_name",
    "t"."tags",
    "t"."metadata",
    "t"."created_by",
    "t"."updated_by",
    "t"."created_at",
    "t"."updated_at",
    "u"."name" AS "assignee_name",
    "u"."email" AS "assignee_email",
    "tm"."name" AS "team_name",
    "p"."name" AS "project_name",
    ( SELECT "count"(*) AS "count"
           FROM "public"."crm_tasks" "st"
          WHERE ("st"."parent_id" = "t"."id")) AS "subtask_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."crm_tasks" "st"
          WHERE (("st"."parent_id" = "t"."id") AND (("st"."status")::"text" = 'completed'::"text"))) AS "completed_subtask_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."task_dependencies" "td"
          WHERE ("td"."task_id" = "t"."id")) AS "dependency_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."task_comments" "tc"
          WHERE ("tc"."task_id" = "t"."id")) AS "comment_count"
   FROM ((("public"."crm_tasks" "t"
     LEFT JOIN "public"."users" "u" ON (("t"."assignee_id" = "u"."id")))
     LEFT JOIN "public"."teams" "tm" ON (("t"."team_id" = "tm"."id")))
     LEFT JOIN "public"."crm_projects" "p" ON (("t"."project_id" = "p"."id")));


ALTER VIEW "public"."v_tasks_complete" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."virtual_cards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "reservation_id" "text" NOT NULL,
    "ota" "text" NOT NULL,
    "card_number" "text",
    "card_last_four" "text",
    "card_brand" "text",
    "card_expiration_month" "text",
    "card_expiration_year" "text",
    "card_cvv" "text",
    "card_holder_name" "text",
    "authorized_amount" numeric(10,2),
    "currency" "text" DEFAULT 'BRL'::"text",
    "available_amount" numeric(10,2),
    "valid_from" "date",
    "valid_to" "date",
    "activation_date" "date",
    "status" "text" DEFAULT 'active'::"text",
    "total_charged" numeric(10,2) DEFAULT 0,
    "charge_count" integer DEFAULT 0,
    "last_charged_at" timestamp with time zone,
    "ota_card_id" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "virtual_cards_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'used'::"text", 'expired'::"text", 'cancelled'::"text", 'declined'::"text"])))
);


ALTER TABLE "public"."virtual_cards" OWNER TO "postgres";


COMMENT ON TABLE "public"."virtual_cards" IS 'Cartões virtuais gerados por OTAs para pagamento de reservas';



CREATE OR REPLACE VIEW "public"."vw_lost_reasons_stats" AS
 SELECT "lr"."id",
    "lr"."organization_id",
    "lr"."name",
    "lr"."category",
    "count"(DISTINCT "sd"."id") AS "sales_deals_count",
    "count"(DISTINCT "st"."id") AS "service_tickets_count",
    "count"(DISTINCT "pi"."id") AS "predetermined_items_count",
    (("count"(DISTINCT "sd"."id") + "count"(DISTINCT "st"."id")) + "count"(DISTINCT "pi"."id")) AS "total_usage"
   FROM ((("public"."crm_lost_reasons" "lr"
     LEFT JOIN "public"."sales_deals" "sd" ON (("sd"."lost_reason_id" = "lr"."id")))
     LEFT JOIN "public"."service_tickets" "st" ON (("st"."unresolved_reason_id" = "lr"."id")))
     LEFT JOIN "public"."predetermined_items" "pi" ON (("pi"."cancelled_reason_id" = "lr"."id")))
  GROUP BY "lr"."id", "lr"."organization_id", "lr"."name", "lr"."category";


ALTER VIEW "public"."vw_lost_reasons_stats" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_sales_deal_totals" AS
 SELECT "d"."id" AS "deal_id",
    "d"."organization_id",
    "d"."title" AS "deal_title",
    "d"."value" AS "deal_value",
    COALESCE("sum"("ci"."total"), (0)::numeric) AS "items_total",
    "count"("ci"."id") AS "items_count",
    ("d"."value" + COALESCE("sum"("ci"."total"), (0)::numeric)) AS "grand_total"
   FROM ("public"."sales_deals" "d"
     LEFT JOIN "public"."crm_card_items" "ci" ON (("ci"."sales_deal_id" = "d"."id")))
  GROUP BY "d"."id", "d"."organization_id", "d"."title", "d"."value";


ALTER VIEW "public"."vw_sales_deal_totals" OWNER TO "postgres";


ALTER TABLE ONLY "public"."accommodation_rules"
    ADD CONSTRAINT "accommodation_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_agent_construtoras"
    ADD CONSTRAINT "ai_agent_construtoras_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_agent_empreendimentos"
    ADD CONSTRAINT "ai_agent_empreendimentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_agent_unidades"
    ADD CONSTRAINT "ai_agent_unidades_empreendimento_id_codigo_bloco_key" UNIQUE ("empreendimento_id", "codigo", "bloco");



ALTER TABLE ONLY "public"."ai_agent_unidades"
    ADD CONSTRAINT "ai_agent_unidades_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_provider_configs"
    ADD CONSTRAINT "ai_provider_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."anuncios_field_changes"
    ADD CONSTRAINT "anuncios_field_changes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."anuncios_pending_changes"
    ADD CONSTRAINT "anuncios_pending_changes_idempotency_key_key" UNIQUE ("idempotency_key");



ALTER TABLE ONLY "public"."anuncios_pending_changes"
    ADD CONSTRAINT "anuncios_pending_changes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."anuncios_published"
    ADD CONSTRAINT "anuncios_published_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."anuncios_published"
    ADD CONSTRAINT "anuncios_published_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "anuncios_ultimate_pkey_legacy" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."anuncios_versions"
    ADD CONSTRAINT "anuncios_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."automation_executions"
    ADD CONSTRAINT "automation_executions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."automations"
    ADD CONSTRAINT "automations_name_org_unique" UNIQUE ("organization_id", "name");



ALTER TABLE ONLY "public"."automations"
    ADD CONSTRAINT "automations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bed_types"
    ADD CONSTRAINT "bed_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."beds"
    ADD CONSTRAINT "beds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_contacts"
    ADD CONSTRAINT "billing_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blocks"
    ADD CONSTRAINT "blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_pricing_rules"
    ADD CONSTRAINT "calendar_pricing_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cancellation_policy_templates"
    ADD CONSTRAINT "cancellation_policy_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."canonical_amenities"
    ADD CONSTRAINT "canonical_amenities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."canonical_bed_types"
    ADD CONSTRAINT "canonical_bed_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."canonical_fee_types"
    ADD CONSTRAINT "canonical_fee_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."canonical_image_categories"
    ADD CONSTRAINT "canonical_image_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."canonical_languages"
    ADD CONSTRAINT "canonical_languages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."canonical_payment_types"
    ADD CONSTRAINT "canonical_payment_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."canonical_property_types"
    ADD CONSTRAINT "canonical_property_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."canonical_reservation_statuses"
    ADD CONSTRAINT "canonical_reservation_statuses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."canonical_room_types"
    ADD CONSTRAINT "canonical_room_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."canonical_room_views"
    ADD CONSTRAINT "canonical_room_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."canonical_themes"
    ADD CONSTRAINT "canonical_themes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channel_contacts"
    ADD CONSTRAINT "channel_contacts_external_unique" UNIQUE ("instance_id", "external_id");



ALTER TABLE ONLY "public"."channel_contacts"
    ADD CONSTRAINT "channel_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channel_instances"
    ADD CONSTRAINT "channel_instances_name_unique" UNIQUE ("provider", "instance_name");



ALTER TABLE ONLY "public"."channel_instances"
    ADD CONSTRAINT "channel_instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channex_accounts"
    ADD CONSTRAINT "channex_accounts_organization_id_label_key" UNIQUE ("organization_id", "label");



ALTER TABLE ONLY "public"."channex_accounts"
    ADD CONSTRAINT "channex_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channex_channel_connections"
    ADD CONSTRAINT "channex_channel_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channex_listing_connections"
    ADD CONSTRAINT "channex_listing_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channex_listing_connections"
    ADD CONSTRAINT "channex_listing_connections_property_mapping_id_channel_con_key" UNIQUE ("property_mapping_id", "channel_connection_id");



ALTER TABLE ONLY "public"."channex_property_mappings"
    ADD CONSTRAINT "channex_property_mappings_account_id_channex_property_id_key" UNIQUE ("account_id", "channex_property_id");



ALTER TABLE ONLY "public"."channex_property_mappings"
    ADD CONSTRAINT "channex_property_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channex_property_mappings"
    ADD CONSTRAINT "channex_property_mappings_rendizy_property_id_key" UNIQUE ("rendizy_property_id");



ALTER TABLE ONLY "public"."channex_rate_plan_mappings"
    ADD CONSTRAINT "channex_rate_plan_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channex_rate_plan_mappings"
    ADD CONSTRAINT "channex_rate_plan_mappings_rendizy_rate_plan_id_key" UNIQUE ("rendizy_rate_plan_id");



ALTER TABLE ONLY "public"."channex_rate_plan_mappings"
    ADD CONSTRAINT "channex_rate_plan_mappings_room_type_mapping_id_channex_rat_key" UNIQUE ("room_type_mapping_id", "channex_rate_plan_id");



ALTER TABLE ONLY "public"."channex_room_type_mappings"
    ADD CONSTRAINT "channex_room_type_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channex_room_type_mappings"
    ADD CONSTRAINT "channex_room_type_mappings_property_mapping_id_channex_room_key" UNIQUE ("property_mapping_id", "channex_room_type_id");



ALTER TABLE ONLY "public"."channex_room_type_mappings"
    ADD CONSTRAINT "channex_room_type_mappings_rendizy_room_id_key" UNIQUE ("rendizy_room_id");



ALTER TABLE ONLY "public"."channex_webhook_logs"
    ADD CONSTRAINT "channex_webhook_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channex_webhooks"
    ADD CONSTRAINT "channex_webhooks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_channel_configs"
    ADD CONSTRAINT "chat_channel_configs_organization_id_channel_type_key" UNIQUE ("organization_id", "channel_type");



ALTER TABLE ONLY "public"."chat_channel_configs"
    ADD CONSTRAINT "chat_channel_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_channels_config"
    ADD CONSTRAINT "chat_channels_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_contacts"
    ADD CONSTRAINT "chat_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_conversations"
    ADD CONSTRAINT "chat_conversations_organization_id_channel_type_external_id_key" UNIQUE ("organization_id", "channel_type", "external_id");



ALTER TABLE ONLY "public"."chat_conversations"
    ADD CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_message_templates"
    ADD CONSTRAINT "chat_message_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_webhooks"
    ADD CONSTRAINT "chat_webhooks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_sites"
    ADD CONSTRAINT "client_sites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_sites"
    ADD CONSTRAINT "client_sites_subdomain_key" UNIQUE ("subdomain");



ALTER TABLE ONLY "public"."conversation_activity_logs"
    ADD CONSTRAINT "conversation_activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."corporate_payment_configs"
    ADD CONSTRAINT "corporate_payment_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."country_iso_codes"
    ADD CONSTRAINT "country_iso_codes_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."crm_card_items"
    ADD CONSTRAINT "crm_card_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_companies"
    ADD CONSTRAINT "crm_companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_contacts"
    ADD CONSTRAINT "crm_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_lost_reasons"
    ADD CONSTRAINT "crm_lost_reasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_notes"
    ADD CONSTRAINT "crm_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_products_services"
    ADD CONSTRAINT "crm_products_services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_projects"
    ADD CONSTRAINT "crm_projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_tasks"
    ADD CONSTRAINT "crm_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_templates"
    ADD CONSTRAINT "crm_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_field_values"
    ADD CONSTRAINT "custom_field_values_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_fields"
    ADD CONSTRAINT "custom_fields_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_min_nights"
    ADD CONSTRAINT "custom_min_nights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_prices"
    ADD CONSTRAINT "custom_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deposit_schedules"
    ADD CONSTRAINT "deposit_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evolution_instances"
    ADD CONSTRAINT "evolution_instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evolution_instances"
    ADD CONSTRAINT "evolution_instances_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."financeiro_campo_plano_contas_mapping"
    ADD CONSTRAINT "financeiro_campo_plano_contas_mapping_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financeiro_categorias"
    ADD CONSTRAINT "financeiro_categorias_codigo_organization_unique" UNIQUE ("codigo", "organization_id");



ALTER TABLE ONLY "public"."financeiro_categorias"
    ADD CONSTRAINT "financeiro_categorias_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financeiro_centro_custos"
    ADD CONSTRAINT "financeiro_centro_custos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financeiro_contas_bancarias"
    ADD CONSTRAINT "financeiro_contas_bancarias_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financeiro_lancamentos"
    ADD CONSTRAINT "financeiro_lancamentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financeiro_lancamentos_splits"
    ADD CONSTRAINT "financeiro_lancamentos_splits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financeiro_linhas_extrato"
    ADD CONSTRAINT "financeiro_linhas_extrato_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financeiro_regras_conciliacao"
    ADD CONSTRAINT "financeiro_regras_conciliacao_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financeiro_titulos"
    ADD CONSTRAINT "financeiro_titulos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."geographic_regions"
    ADD CONSTRAINT "geographic_regions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guest_users"
    ADD CONSTRAINT "guest_users_apple_id_key" UNIQUE ("apple_id");



ALTER TABLE ONLY "public"."guest_users"
    ADD CONSTRAINT "guest_users_google_id_org_unique" UNIQUE ("google_id", "organization_id");



ALTER TABLE ONLY "public"."guest_users"
    ADD CONSTRAINT "guest_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guests"
    ADD CONSTRAINT "guests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integration_configs"
    ADD CONSTRAINT "integration_configs_organization_id_integration_name_key" UNIQUE ("organization_id", "integration_name");



ALTER TABLE ONLY "public"."integration_configs"
    ADD CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."kv_backups"
    ADD CONSTRAINT "kv_backups_pkey" PRIMARY KEY ("kv_key");



ALTER TABLE ONLY "public"."kv_store_67caf26a"
    ADD CONSTRAINT "kv_store_67caf26a_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."listing_settings"
    ADD CONSTRAINT "listing_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_templates"
    ADD CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_trigger_types"
    ADD CONSTRAINT "notification_trigger_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."operational_task_templates"
    ADD CONSTRAINT "operational_task_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."operational_tasks"
    ADD CONSTRAINT "operational_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_channel_config"
    ADD CONSTRAINT "organization_channel_config_organization_id_key" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."organization_channel_config"
    ADD CONSTRAINT "organization_channel_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_settings"
    ADD CONSTRAINT "organization_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."ota_amenity_mappings"
    ADD CONSTRAINT "ota_amenity_mappings_ota_ota_id_key" UNIQUE ("ota", "ota_id");



ALTER TABLE ONLY "public"."ota_amenity_mappings"
    ADD CONSTRAINT "ota_amenity_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ota_api_credentials"
    ADD CONSTRAINT "ota_api_credentials_organization_id_ota_environment_key" UNIQUE ("organization_id", "ota", "environment");



ALTER TABLE ONLY "public"."ota_api_credentials"
    ADD CONSTRAINT "ota_api_credentials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ota_bed_type_mappings"
    ADD CONSTRAINT "ota_bed_type_mappings_ota_ota_id_key" UNIQUE ("ota", "ota_id");



ALTER TABLE ONLY "public"."ota_bed_type_mappings"
    ADD CONSTRAINT "ota_bed_type_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ota_cancellation_policy_mappings"
    ADD CONSTRAINT "ota_cancellation_policy_mappings_ota_template_id_key" UNIQUE ("ota", "template_id");



ALTER TABLE ONLY "public"."ota_cancellation_policy_mappings"
    ADD CONSTRAINT "ota_cancellation_policy_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ota_fee_type_mappings"
    ADD CONSTRAINT "ota_fee_type_mappings_ota_ota_id_key" UNIQUE ("ota", "ota_id");



ALTER TABLE ONLY "public"."ota_fee_type_mappings"
    ADD CONSTRAINT "ota_fee_type_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ota_image_category_mappings"
    ADD CONSTRAINT "ota_image_category_mappings_ota_ota_id_key" UNIQUE ("ota", "ota_id");



ALTER TABLE ONLY "public"."ota_image_category_mappings"
    ADD CONSTRAINT "ota_image_category_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ota_language_mappings"
    ADD CONSTRAINT "ota_language_mappings_ota_ota_id_key" UNIQUE ("ota", "ota_id");



ALTER TABLE ONLY "public"."ota_language_mappings"
    ADD CONSTRAINT "ota_language_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ota_payment_type_mappings"
    ADD CONSTRAINT "ota_payment_type_mappings_ota_ota_id_key" UNIQUE ("ota", "ota_id");



ALTER TABLE ONLY "public"."ota_payment_type_mappings"
    ADD CONSTRAINT "ota_payment_type_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ota_property_type_mappings"
    ADD CONSTRAINT "ota_property_type_mappings_ota_canonical_id_key" UNIQUE ("ota", "canonical_id");



ALTER TABLE ONLY "public"."ota_property_type_mappings"
    ADD CONSTRAINT "ota_property_type_mappings_ota_ota_id_key" UNIQUE ("ota", "ota_id");



ALTER TABLE ONLY "public"."ota_property_type_mappings"
    ADD CONSTRAINT "ota_property_type_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ota_rate_plan_mappings"
    ADD CONSTRAINT "ota_rate_plan_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ota_rate_plan_mappings"
    ADD CONSTRAINT "ota_rate_plan_mappings_rate_plan_id_ota_key" UNIQUE ("rate_plan_id", "ota");



ALTER TABLE ONLY "public"."ota_region_mappings"
    ADD CONSTRAINT "ota_region_mappings_ota_ota_region_id_key" UNIQUE ("ota", "ota_region_id");



ALTER TABLE ONLY "public"."ota_region_mappings"
    ADD CONSTRAINT "ota_region_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ota_reservation_status_mappings"
    ADD CONSTRAINT "ota_reservation_status_mappings_ota_ota_id_direction_key" UNIQUE ("ota", "ota_id", "direction");



ALTER TABLE ONLY "public"."ota_reservation_status_mappings"
    ADD CONSTRAINT "ota_reservation_status_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ota_room_type_mappings"
    ADD CONSTRAINT "ota_room_type_mappings_ota_ota_id_key" UNIQUE ("ota", "ota_id");



ALTER TABLE ONLY "public"."ota_room_type_mappings"
    ADD CONSTRAINT "ota_room_type_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ota_room_view_mappings"
    ADD CONSTRAINT "ota_room_view_mappings_ota_ota_id_key" UNIQUE ("ota", "ota_id");



ALTER TABLE ONLY "public"."ota_room_view_mappings"
    ADD CONSTRAINT "ota_room_view_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ota_sync_logs"
    ADD CONSTRAINT "ota_sync_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ota_theme_mappings"
    ADD CONSTRAINT "ota_theme_mappings_ota_ota_id_key" UNIQUE ("ota", "ota_id");



ALTER TABLE ONLY "public"."ota_theme_mappings"
    ADD CONSTRAINT "ota_theme_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ota_webhook_subscriptions"
    ADD CONSTRAINT "ota_webhook_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ota_webhooks"
    ADD CONSTRAINT "ota_webhooks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."owner_users"
    ADD CONSTRAINT "owner_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."owners"
    ADD CONSTRAINT "owners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pagarme_configs"
    ADD CONSTRAINT "pagarme_configs_organization_id_key" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."pagarme_configs"
    ADD CONSTRAINT "pagarme_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pagarme_orders"
    ADD CONSTRAINT "pagarme_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pagarme_payment_links"
    ADD CONSTRAINT "pagarme_payment_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pagarme_webhook_events"
    ADD CONSTRAINT "pagarme_webhook_events_organization_id_event_id_key" UNIQUE ("organization_id", "event_id");



ALTER TABLE ONLY "public"."pagarme_webhook_events"
    ADD CONSTRAINT "pagarme_webhook_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."password_recovery_requests"
    ADD CONSTRAINT "password_recovery_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("token");



ALTER TABLE ONLY "public"."payment_sessions"
    ADD CONSTRAINT "payment_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_sessions"
    ADD CONSTRAINT "payment_sessions_session_id_key" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."predetermined_funnel_stages"
    ADD CONSTRAINT "predetermined_funnel_stages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."predetermined_funnels"
    ADD CONSTRAINT "predetermined_funnels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."predetermined_item_activities"
    ADD CONSTRAINT "predetermined_item_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."predetermined_items"
    ADD CONSTRAINT "predetermined_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pricing_settings"
    ADD CONSTRAINT "pricing_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."properties_drafts"
    ADD CONSTRAINT "properties_drafts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_cancellation_penalties"
    ADD CONSTRAINT "property_cancellation_penalties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_channel_settings"
    ADD CONSTRAINT "property_channel_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_channel_settings"
    ADD CONSTRAINT "property_channel_settings_property_id_channel_code_key" UNIQUE ("property_id", "channel_code");



ALTER TABLE ONLY "public"."property_ota_extensions"
    ADD CONSTRAINT "property_ota_extensions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_ota_extensions"
    ADD CONSTRAINT "property_ota_extensions_property_id_ota_key" UNIQUE ("property_id", "ota");



ALTER TABLE ONLY "public"."property_rooms"
    ADD CONSTRAINT "property_rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."public.users"
    ADD CONSTRAINT "public.users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_plan_availability"
    ADD CONSTRAINT "rate_plan_availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_plan_availability"
    ADD CONSTRAINT "rate_plan_availability_rate_plan_id_property_id_date_key" UNIQUE ("rate_plan_id", "property_id", "date");



ALTER TABLE ONLY "public"."rate_plan_pricing_overrides"
    ADD CONSTRAINT "rate_plan_pricing_overrides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_plans"
    ADD CONSTRAINT "rate_plans_organization_id_property_id_code_key" UNIQUE ("organization_id", "property_id", "code");



ALTER TABLE ONLY "public"."rate_plans"
    ADD CONSTRAINT "rate_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."re_broker_campaign_participation"
    ADD CONSTRAINT "re_broker_campaign_participation_campaign_id_broker_id_key" UNIQUE ("campaign_id", "broker_id");



ALTER TABLE ONLY "public"."re_broker_campaign_participation"
    ADD CONSTRAINT "re_broker_campaign_participation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."re_broker_campaigns"
    ADD CONSTRAINT "re_broker_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."re_broker_chat_channels"
    ADD CONSTRAINT "re_broker_chat_channels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."re_broker_chat_messages"
    ADD CONSTRAINT "re_broker_chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."re_broker_invites"
    ADD CONSTRAINT "re_broker_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."re_broker_rankings"
    ADD CONSTRAINT "re_broker_rankings_company_id_broker_id_period_type_period__key" UNIQUE ("company_id", "broker_id", "period_type", "period_start");



ALTER TABLE ONLY "public"."re_broker_rankings"
    ADD CONSTRAINT "re_broker_rankings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."re_brokers"
    ADD CONSTRAINT "re_brokers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."re_companies"
    ADD CONSTRAINT "re_companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."re_demands"
    ADD CONSTRAINT "re_demands_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."re_developments"
    ADD CONSTRAINT "re_developments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."re_marketplace_conversations"
    ADD CONSTRAINT "re_marketplace_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."re_marketplace_messages"
    ADD CONSTRAINT "re_marketplace_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."re_marketplace_participants"
    ADD CONSTRAINT "re_marketplace_participants_conversation_id_profile_id_key" UNIQUE ("conversation_id", "profile_id");



ALTER TABLE ONLY "public"."re_marketplace_participants"
    ADD CONSTRAINT "re_marketplace_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."re_messages"
    ADD CONSTRAINT "re_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."re_partnerships"
    ADD CONSTRAINT "re_partnerships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."re_reservations"
    ADD CONSTRAINT "re_reservations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."re_transactions"
    ADD CONSTRAINT "re_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."re_units"
    ADD CONSTRAINT "re_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reconciliation_items"
    ADD CONSTRAINT "reconciliation_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reconciliation_runs"
    ADD CONSTRAINT "reconciliation_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."refunds"
    ADD CONSTRAINT "refunds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservation_additional_guests"
    ADD CONSTRAINT "reservation_additional_guests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservation_cancellations"
    ADD CONSTRAINT "reservation_cancellations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservation_deposits"
    ADD CONSTRAINT "reservation_deposits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservation_history"
    ADD CONSTRAINT "reservation_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservation_pricing_breakdown"
    ADD CONSTRAINT "reservation_pricing_breakdown_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservation_room_history"
    ADD CONSTRAINT "reservation_room_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservation_rooms"
    ADD CONSTRAINT "reservation_rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room_photos"
    ADD CONSTRAINT "room_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room_types"
    ADD CONSTRAINT "room_types_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."room_types"
    ADD CONSTRAINT "room_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_deal_activities"
    ADD CONSTRAINT "sales_deal_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_deals"
    ADD CONSTRAINT "sales_deals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_funnel_stages"
    ADD CONSTRAINT "sales_funnel_stages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_funnels"
    ADD CONSTRAINT "sales_funnels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_payment_methods"
    ADD CONSTRAINT "saved_payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_funnel_stages"
    ADD CONSTRAINT "service_funnel_stages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_funnels"
    ADD CONSTRAINT "service_funnels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_ticket_activities"
    ADD CONSTRAINT "service_ticket_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_tickets"
    ADD CONSTRAINT "service_tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_refresh_token_key" UNIQUE ("refresh_token");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_token_unique" UNIQUE ("token");



ALTER TABLE ONLY "public"."short_ids"
    ADD CONSTRAINT "short_ids_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staysnet_config"
    ADD CONSTRAINT "staysnet_config_organization_id_key" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."staysnet_config"
    ADD CONSTRAINT "staysnet_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staysnet_import_issues"
    ADD CONSTRAINT "staysnet_import_issues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staysnet_properties_cache"
    ADD CONSTRAINT "staysnet_properties_cache_organization_id_staysnet_property_key" UNIQUE ("organization_id", "staysnet_property_id");



ALTER TABLE ONLY "public"."staysnet_properties_cache"
    ADD CONSTRAINT "staysnet_properties_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staysnet_raw_objects"
    ADD CONSTRAINT "staysnet_raw_objects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staysnet_reservations_cache"
    ADD CONSTRAINT "staysnet_reservations_cache_organization_id_staysnet_reserv_key" UNIQUE ("organization_id", "staysnet_reservation_id");



ALTER TABLE ONLY "public"."staysnet_reservations_cache"
    ADD CONSTRAINT "staysnet_reservations_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staysnet_sync_log"
    ADD CONSTRAINT "staysnet_sync_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staysnet_webhooks"
    ADD CONSTRAINT "staysnet_webhooks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stripe_checkout_sessions"
    ADD CONSTRAINT "stripe_checkout_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stripe_configs"
    ADD CONSTRAINT "stripe_configs_organization_id_key" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."stripe_configs"
    ADD CONSTRAINT "stripe_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stripe_webhook_events"
    ADD CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_activities"
    ADD CONSTRAINT "task_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_dependencies"
    ADD CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."financeiro_campo_plano_contas_mapping"
    ADD CONSTRAINT "unique_campo_organizacao" UNIQUE ("organization_id", "modulo", "campo_codigo");



ALTER TABLE ONLY "public"."chat_channels_config"
    ADD CONSTRAINT "unique_chat_config_per_org" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."financeiro_categorias"
    ADD CONSTRAINT "unique_codigo_org" UNIQUE ("organization_id", "codigo");



ALTER TABLE ONLY "public"."financeiro_centro_custos"
    ADD CONSTRAINT "unique_codigo_org_centro_custos" UNIQUE ("organization_id", "codigo");



ALTER TABLE ONLY "public"."chat_contacts"
    ADD CONSTRAINT "unique_contact_per_org_channel_external" UNIQUE ("organization_id", "channel", "external_id");



ALTER TABLE ONLY "public"."custom_fields"
    ADD CONSTRAINT "unique_custom_field_name" UNIQUE ("organization_id", "name", "scope");



ALTER TABLE ONLY "public"."custom_min_nights"
    ADD CONSTRAINT "unique_custom_min_nights_per_property_date" UNIQUE ("property_id", "date");



ALTER TABLE ONLY "public"."custom_prices"
    ADD CONSTRAINT "unique_custom_price_per_property_date" UNIQUE ("property_id", "date");



ALTER TABLE ONLY "public"."guest_users"
    ADD CONSTRAINT "unique_email_per_org" UNIQUE ("email", "organization_id");



ALTER TABLE ONLY "public"."custom_field_values"
    ADD CONSTRAINT "unique_field_value" UNIQUE ("custom_field_id", "entity_id");



ALTER TABLE ONLY "public"."guests"
    ADD CONSTRAINT "unique_guest_email_per_org" UNIQUE ("organization_id", "email");



ALTER TABLE ONLY "public"."financeiro_linhas_extrato"
    ADD CONSTRAINT "unique_hash_extrato" UNIQUE ("hash_unico");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "unique_location_code_per_org" UNIQUE ("organization_id", "code");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "unique_org_external_conversation" UNIQUE ("organization_id", "external_conversation_id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "unique_org_external_message" UNIQUE ("organization_id", "external_id");



ALTER TABLE ONLY "public"."client_sites"
    ADD CONSTRAINT "unique_org_site" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."owners"
    ADD CONSTRAINT "unique_owner_email_org" UNIQUE ("organization_id", "email");



ALTER TABLE ONLY "public"."owner_users"
    ADD CONSTRAINT "unique_owner_user_email" UNIQUE ("owner_id", "email");



ALTER TABLE ONLY "public"."short_ids"
    ADD CONSTRAINT "unique_resource_per_org" UNIQUE ("organization_id", "resource_type", "resource_id");



ALTER TABLE ONLY "public"."short_ids"
    ADD CONSTRAINT "unique_short_id_per_org" UNIQUE ("organization_id", "short_id");



ALTER TABLE ONLY "public"."task_dependencies"
    ADD CONSTRAINT "unique_task_dependency" UNIQUE ("task_id", "depends_on_task_id");



ALTER TABLE ONLY "public"."anuncios_versions"
    ADD CONSTRAINT "unique_version" UNIQUE ("anuncio_id", "version_number");



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."users_kv_mappings"
    ADD CONSTRAINT "users_kv_mappings_pkey" PRIMARY KEY ("kv_key");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."virtual_cards"
    ADD CONSTRAINT "virtual_cards_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_accommodation_rules_listing_id" ON "public"."accommodation_rules" USING "btree" ("listing_id");



CREATE INDEX "idx_activity_logs_created_at" ON "public"."activity_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_activity_logs_organization_id" ON "public"."activity_logs" USING "btree" ("organization_id");



CREATE INDEX "idx_activity_logs_resource" ON "public"."activity_logs" USING "btree" ("resource");



CREATE INDEX "idx_activity_logs_user_id" ON "public"."activity_logs" USING "btree" ("user_id");



CREATE INDEX "idx_additional_guests_reservation" ON "public"."reservation_additional_guests" USING "btree" ("reservation_id");



CREATE INDEX "idx_additional_guests_room" ON "public"."reservation_additional_guests" USING "btree" ("reservation_room_id");



CREATE INDEX "idx_ai_agent_construtoras_active" ON "public"."ai_agent_construtoras" USING "btree" ("organization_id", "is_active");



CREATE INDEX "idx_ai_agent_construtoras_org" ON "public"."ai_agent_construtoras" USING "btree" ("organization_id");



CREATE UNIQUE INDEX "idx_ai_agent_construtoras_unique_url" ON "public"."ai_agent_construtoras" USING "btree" ("organization_id", "linktree_url") WHERE ("is_active" = true);



CREATE INDEX "idx_ai_agent_unidades_codigo" ON "public"."ai_agent_unidades" USING "btree" ("codigo");



CREATE INDEX "idx_ai_agent_unidades_construtora" ON "public"."ai_agent_unidades" USING "btree" ("construtora_id");



CREATE INDEX "idx_ai_agent_unidades_empreendimento" ON "public"."ai_agent_unidades" USING "btree" ("empreendimento_id");



CREATE INDEX "idx_ai_agent_unidades_organization" ON "public"."ai_agent_unidades" USING "btree" ("organization_id");



CREATE INDEX "idx_ai_agent_unidades_status" ON "public"."ai_agent_unidades" USING "btree" ("status");



CREATE INDEX "idx_ai_agent_unidades_tipologia" ON "public"."ai_agent_unidades" USING "btree" ("tipologia");



CREATE INDEX "idx_ai_empreendimentos_active" ON "public"."ai_agent_empreendimentos" USING "btree" ("organization_id", "is_active");



CREATE INDEX "idx_ai_empreendimentos_construtora" ON "public"."ai_agent_empreendimentos" USING "btree" ("construtora_id");



CREATE INDEX "idx_ai_empreendimentos_org" ON "public"."ai_agent_empreendimentos" USING "btree" ("organization_id");



CREATE INDEX "idx_ai_provider_configs_active" ON "public"."ai_provider_configs" USING "btree" ("organization_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_ai_provider_configs_created" ON "public"."ai_provider_configs" USING "btree" ("organization_id", "created_at" DESC);



CREATE INDEX "idx_ai_provider_configs_org" ON "public"."ai_provider_configs" USING "btree" ("organization_id");



CREATE INDEX "idx_ai_provider_configs_provider" ON "public"."ai_provider_configs" USING "btree" ("organization_id", "provider");



CREATE UNIQUE INDEX "idx_anuncios_changes_idempotency" ON "public"."anuncios_field_changes" USING "btree" ("idempotency_key");



CREATE INDEX "idx_anuncios_ultimate_org" ON "public"."properties" USING "btree" ("organization_id");



CREATE INDEX "idx_anuncios_ultimate_status" ON "public"."properties" USING "btree" ("status");



CREATE INDEX "idx_anuncios_ultimate_user" ON "public"."properties" USING "btree" ("user_id");



CREATE INDEX "idx_automation_executions_automation" ON "public"."automation_executions" USING "btree" ("automation_id");



CREATE INDEX "idx_automation_executions_created" ON "public"."automation_executions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_automation_executions_org" ON "public"."automation_executions" USING "btree" ("organization_id");



CREATE INDEX "idx_automation_executions_status" ON "public"."automation_executions" USING "btree" ("status");



CREATE INDEX "idx_automations_definition_gin" ON "public"."automations" USING "gin" ("definition");



CREATE INDEX "idx_automations_module" ON "public"."automations" USING "btree" ("module");



CREATE INDEX "idx_automations_modules" ON "public"."automations" USING "gin" ("modules");



CREATE INDEX "idx_automations_org" ON "public"."automations" USING "btree" ("organization_id");



CREATE INDEX "idx_automations_org_status" ON "public"."automations" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_automations_properties" ON "public"."automations" USING "gin" ("properties");



CREATE INDEX "idx_automations_status" ON "public"."automations" USING "btree" ("status");



CREATE INDEX "idx_beds_room_id" ON "public"."beds" USING "btree" ("room_id");



CREATE INDEX "idx_billing_contacts_crm" ON "public"."billing_contacts" USING "btree" ("crm_contact_id");



CREATE INDEX "idx_billing_contacts_org" ON "public"."billing_contacts" USING "btree" ("organization_id");



CREATE INDEX "idx_billing_contacts_reservation" ON "public"."billing_contacts" USING "btree" ("reservation_id");



CREATE INDEX "idx_blocks_end_date" ON "public"."blocks" USING "btree" ("end_date");



CREATE INDEX "idx_blocks_organization_id" ON "public"."blocks" USING "btree" ("organization_id");



CREATE INDEX "idx_blocks_property_id" ON "public"."blocks" USING "btree" ("property_id");



CREATE INDEX "idx_blocks_start_date" ON "public"."blocks" USING "btree" ("start_date");



CREATE INDEX "idx_calendar_pricing_rules_dates" ON "public"."calendar_pricing_rules" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_calendar_pricing_rules_global" ON "public"."calendar_pricing_rules" USING "btree" ("organization_id", "start_date", "end_date") WHERE ("property_id" IS NULL);



CREATE INDEX "idx_calendar_pricing_rules_org" ON "public"."calendar_pricing_rules" USING "btree" ("organization_id");



CREATE INDEX "idx_calendar_pricing_rules_org_dates" ON "public"."calendar_pricing_rules" USING "btree" ("organization_id", "start_date", "end_date");



CREATE INDEX "idx_calendar_pricing_rules_property" ON "public"."calendar_pricing_rules" USING "btree" ("property_id") WHERE ("property_id" IS NOT NULL);



CREATE UNIQUE INDEX "idx_calendar_pricing_rules_unique_entry" ON "public"."calendar_pricing_rules" USING "btree" ("organization_id", "property_id", "start_date", "end_date") WHERE ("property_id" IS NOT NULL);



COMMENT ON INDEX "public"."idx_calendar_pricing_rules_unique_entry" IS 'Unique constraint for upsert: one rule per property/date range';



CREATE UNIQUE INDEX "idx_calendar_pricing_rules_unique_global" ON "public"."calendar_pricing_rules" USING "btree" ("organization_id", "start_date", "end_date") WHERE ("property_id" IS NULL);



COMMENT ON INDEX "public"."idx_calendar_pricing_rules_unique_global" IS 'Unique constraint for global rules: one rule per org/date range';



CREATE INDEX "idx_campo_mapping_ativo" ON "public"."financeiro_campo_plano_contas_mapping" USING "btree" ("ativo");



CREATE INDEX "idx_campo_mapping_categoria" ON "public"."financeiro_campo_plano_contas_mapping" USING "btree" ("categoria_id");



CREATE INDEX "idx_campo_mapping_modulo" ON "public"."financeiro_campo_plano_contas_mapping" USING "btree" ("modulo");



CREATE INDEX "idx_campo_mapping_organization" ON "public"."financeiro_campo_plano_contas_mapping" USING "btree" ("organization_id");



CREATE INDEX "idx_campo_mapping_registered_by" ON "public"."financeiro_campo_plano_contas_mapping" USING "btree" ("registered_by_module") WHERE ("registered_by_module" IS NOT NULL);



CREATE INDEX "idx_campo_mapping_system_field" ON "public"."financeiro_campo_plano_contas_mapping" USING "btree" ("is_system_field") WHERE ("is_system_field" = true);



CREATE INDEX "idx_channel_config_org" ON "public"."organization_channel_config" USING "btree" ("organization_id");



CREATE INDEX "idx_channel_config_org_connected" ON "public"."organization_channel_config" USING "btree" ("organization_id", "whatsapp_connected") WHERE ("deleted_at" IS NULL);



COMMENT ON INDEX "public"."idx_channel_config_org_connected" IS 'Índice composto para queries de status por organization_id + whatsapp_connected (exclui soft-deleted)';



CREATE INDEX "idx_channel_config_org_created" ON "public"."organization_channel_config" USING "btree" ("organization_id", "created_at" DESC) WHERE ("deleted_at" IS NULL);



COMMENT ON INDEX "public"."idx_channel_config_org_created" IS 'Índice composto para queries ordenadas por organization_id + created_at DESC (exclui soft-deleted)';



CREATE INDEX "idx_channel_config_org_enabled" ON "public"."organization_channel_config" USING "btree" ("organization_id", "whatsapp_enabled") WHERE ("deleted_at" IS NULL);



COMMENT ON INDEX "public"."idx_channel_config_org_enabled" IS 'Índice composto para queries filtradas por organization_id + whatsapp_enabled (exclui soft-deleted)';



CREATE INDEX "idx_channel_config_whatsapp_active" ON "public"."organization_channel_config" USING "btree" ("organization_id") WHERE (("whatsapp_enabled" = true) AND ("deleted_at" IS NULL));



COMMENT ON INDEX "public"."idx_channel_config_whatsapp_active" IS 'Índice parcial para queries de WhatsApp ativos apenas (otimiza queries de webhooks)';



CREATE INDEX "idx_channel_contacts_email" ON "public"."channel_contacts" USING "btree" ("email");



CREATE INDEX "idx_channel_contacts_external" ON "public"."channel_contacts" USING "btree" ("external_id");



CREATE INDEX "idx_channel_contacts_instance" ON "public"."channel_contacts" USING "btree" ("instance_id");



CREATE INDEX "idx_channel_contacts_lookup" ON "public"."channel_contacts" USING "btree" ("instance_id", "external_id");



CREATE INDEX "idx_channel_contacts_org" ON "public"."channel_contacts" USING "btree" ("organization_id");



CREATE INDEX "idx_channel_contacts_phone" ON "public"."channel_contacts" USING "btree" ("phone_number");



CREATE INDEX "idx_channel_instances_channel" ON "public"."channel_instances" USING "btree" ("channel");



CREATE INDEX "idx_channel_instances_lookup" ON "public"."channel_instances" USING "btree" ("provider", "instance_name") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_channel_instances_org" ON "public"."channel_instances" USING "btree" ("organization_id");



CREATE INDEX "idx_channel_instances_provider" ON "public"."channel_instances" USING "btree" ("provider");



CREATE INDEX "idx_channel_instances_status" ON "public"."channel_instances" USING "btree" ("status");



CREATE INDEX "idx_chat_channels_config_organization_id" ON "public"."chat_channels_config" USING "btree" ("organization_id");



CREATE INDEX "idx_chat_channels_config_whatsapp_enabled" ON "public"."chat_channels_config" USING "btree" ("whatsapp_enabled");



CREATE INDEX "idx_chat_contacts_channel" ON "public"."chat_contacts" USING "btree" ("channel");



CREATE INDEX "idx_chat_contacts_conversation_type" ON "public"."chat_contacts" USING "btree" ("conversation_type");



CREATE INDEX "idx_chat_contacts_email" ON "public"."chat_contacts" USING "btree" ("email");



CREATE INDEX "idx_chat_contacts_external_id" ON "public"."chat_contacts" USING "btree" ("external_id");



CREATE INDEX "idx_chat_contacts_guest_id" ON "public"."chat_contacts" USING "btree" ("guest_id");



CREATE INDEX "idx_chat_contacts_is_group" ON "public"."chat_contacts" USING "btree" ("is_group");



CREATE INDEX "idx_chat_contacts_last_sync_at" ON "public"."chat_contacts" USING "btree" ("last_sync_at");



CREATE INDEX "idx_chat_contacts_organization_id" ON "public"."chat_contacts" USING "btree" ("organization_id");



CREATE INDEX "idx_chat_contacts_phone" ON "public"."chat_contacts" USING "btree" ("phone");



CREATE INDEX "idx_chat_contacts_phone_raw" ON "public"."chat_contacts" USING "btree" ("phone_raw");



CREATE INDEX "idx_chat_conversations_contact_identifier" ON "public"."chat_conversations" USING "btree" ("contact_identifier");



CREATE INDEX "idx_chat_conversations_org_channel" ON "public"."chat_conversations" USING "btree" ("organization_id", "channel_type");



CREATE INDEX "idx_chat_conversations_org_last_message" ON "public"."chat_conversations" USING "btree" ("organization_id", "last_message_at" DESC);



CREATE INDEX "idx_chat_conversations_org_status" ON "public"."chat_conversations" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_chat_conversations_property" ON "public"."chat_conversations" USING "btree" ("property_id") WHERE ("property_id" IS NOT NULL);



CREATE INDEX "idx_chat_conversations_reservation" ON "public"."chat_conversations" USING "btree" ("reservation_id") WHERE ("reservation_id" IS NOT NULL);



CREATE INDEX "idx_chat_message_templates_category" ON "public"."chat_message_templates" USING "btree" ("category");



CREATE INDEX "idx_chat_message_templates_channel" ON "public"."chat_message_templates" USING "btree" ("channel");



CREATE INDEX "idx_chat_message_templates_organization_id" ON "public"."chat_message_templates" USING "btree" ("organization_id");



CREATE INDEX "idx_chat_message_templates_shortcut" ON "public"."chat_message_templates" USING "btree" ("shortcut");



CREATE INDEX "idx_chat_messages_conversation" ON "public"."chat_messages" USING "btree" ("conversation_id", "sent_at" DESC);



CREATE INDEX "idx_chat_messages_external_id" ON "public"."chat_messages" USING "btree" ("external_id") WHERE ("external_id" IS NOT NULL);



CREATE INDEX "idx_chat_messages_org" ON "public"."chat_messages" USING "btree" ("organization_id", "sent_at" DESC);



CREATE INDEX "idx_chat_webhooks_channel" ON "public"."chat_webhooks" USING "btree" ("channel");



CREATE INDEX "idx_chat_webhooks_created_at" ON "public"."chat_webhooks" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_chat_webhooks_event" ON "public"."chat_webhooks" USING "btree" ("event");



CREATE INDEX "idx_chat_webhooks_organization_id" ON "public"."chat_webhooks" USING "btree" ("organization_id");



CREATE INDEX "idx_chat_webhooks_status" ON "public"."chat_webhooks" USING "btree" ("status");



CREATE INDEX "idx_chx_accounts_active" ON "public"."channex_accounts" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_chx_accounts_org" ON "public"."channex_accounts" USING "btree" ("organization_id");



CREATE INDEX "idx_chx_channels_account" ON "public"."channex_channel_connections" USING "btree" ("account_id");



CREATE INDEX "idx_chx_channels_active" ON "public"."channex_channel_connections" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_chx_channels_code" ON "public"."channex_channel_connections" USING "btree" ("channel_code");



CREATE INDEX "idx_chx_listing_active" ON "public"."channex_listing_connections" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_chx_listing_channel" ON "public"."channex_listing_connections" USING "btree" ("channel_connection_id");



CREATE INDEX "idx_chx_listing_prop" ON "public"."channex_listing_connections" USING "btree" ("property_mapping_id");



CREATE INDEX "idx_chx_prop_map_account" ON "public"."channex_property_mappings" USING "btree" ("account_id");



CREATE INDEX "idx_chx_prop_map_channex" ON "public"."channex_property_mappings" USING "btree" ("channex_property_id");



CREATE INDEX "idx_chx_prop_map_rendizy" ON "public"."channex_property_mappings" USING "btree" ("rendizy_property_id");



CREATE INDEX "idx_chx_prop_map_sync" ON "public"."channex_property_mappings" USING "btree" ("sync_status") WHERE ("sync_status" <> 'synced'::"text");



CREATE INDEX "idx_chx_rate_map_room" ON "public"."channex_rate_plan_mappings" USING "btree" ("room_type_mapping_id");



CREATE INDEX "idx_chx_room_map_prop" ON "public"."channex_room_type_mappings" USING "btree" ("property_mapping_id");



CREATE INDEX "idx_chx_webhook_account" ON "public"."channex_webhooks" USING "btree" ("account_id");



CREATE INDEX "idx_chx_webhook_prop" ON "public"."channex_webhooks" USING "btree" ("property_mapping_id") WHERE ("property_mapping_id" IS NOT NULL);



CREATE INDEX "idx_chx_wh_logs_created" ON "public"."channex_webhook_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_chx_wh_logs_event_type" ON "public"."channex_webhook_logs" USING "btree" ("event_type");



CREATE UNIQUE INDEX "idx_chx_wh_logs_idempotency" ON "public"."channex_webhook_logs" USING "btree" ("event_id") WHERE ("event_id" IS NOT NULL);



CREATE INDEX "idx_chx_wh_logs_ota" ON "public"."channex_webhook_logs" USING "btree" ("ota_name") WHERE ("ota_name" IS NOT NULL);



CREATE INDEX "idx_chx_wh_logs_processed" ON "public"."channex_webhook_logs" USING "btree" ("processed") WHERE (NOT "processed");



CREATE INDEX "idx_chx_wh_logs_property" ON "public"."channex_webhook_logs" USING "btree" ("channex_property_id") WHERE ("channex_property_id" IS NOT NULL);



CREATE INDEX "idx_chx_wh_logs_retry" ON "public"."channex_webhook_logs" USING "btree" ("next_retry_at") WHERE ((NOT "processed") AND ("retry_count" < "max_retries"));



CREATE INDEX "idx_client_sites_active" ON "public"."client_sites" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_client_sites_active_provider" ON "public"."client_sites" USING "gin" ((("hosting_providers" -> 'active_provider'::"text")));



CREATE INDEX "idx_client_sites_domain" ON "public"."client_sites" USING "btree" ("domain") WHERE ("domain" IS NOT NULL);



CREATE INDEX "idx_client_sites_organization_id" ON "public"."client_sites" USING "btree" ("organization_id");



CREATE INDEX "idx_client_sites_subdomain" ON "public"."client_sites" USING "btree" ("subdomain");



CREATE INDEX "idx_conv_activity_created" ON "public"."conversation_activity_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_conv_activity_org_phone" ON "public"."conversation_activity_logs" USING "btree" ("organization_id", "contact_phone");



CREATE INDEX "idx_conv_activity_type" ON "public"."conversation_activity_logs" USING "btree" ("action_type");



CREATE INDEX "idx_conversations_channel" ON "public"."conversations" USING "btree" ("channel");



CREATE INDEX "idx_conversations_contact" ON "public"."conversations" USING "btree" ("contact_id");



CREATE INDEX "idx_conversations_external_id" ON "public"."conversations" USING "btree" ("external_conversation_id");



CREATE INDEX "idx_conversations_guest_phone" ON "public"."conversations" USING "btree" ("guest_phone");



CREATE INDEX "idx_conversations_instance" ON "public"."conversations" USING "btree" ("instance_id");



CREATE INDEX "idx_conversations_last_message" ON "public"."conversations" USING "btree" ("last_message_at" DESC);



CREATE INDEX "idx_conversations_org" ON "public"."conversations" USING "btree" ("organization_id");



CREATE INDEX "idx_conversations_status" ON "public"."conversations" USING "btree" ("status");



CREATE INDEX "idx_conversations_unread" ON "public"."conversations" USING "btree" ("organization_id", "unread_count") WHERE ("unread_count" > 0);



CREATE INDEX "idx_corporate_payment_reservation" ON "public"."corporate_payment_configs" USING "btree" ("reservation_id");



CREATE INDEX "idx_crm_card_items_org" ON "public"."crm_card_items" USING "btree" ("organization_id");



CREATE INDEX "idx_crm_card_items_predetermined" ON "public"."crm_card_items" USING "btree" ("predetermined_item_id") WHERE ("predetermined_item_id" IS NOT NULL);



CREATE INDEX "idx_crm_card_items_product" ON "public"."crm_card_items" USING "btree" ("product_service_id");



CREATE INDEX "idx_crm_card_items_sales_deal" ON "public"."crm_card_items" USING "btree" ("sales_deal_id") WHERE ("sales_deal_id" IS NOT NULL);



CREATE INDEX "idx_crm_card_items_service_ticket" ON "public"."crm_card_items" USING "btree" ("service_ticket_id") WHERE ("service_ticket_id" IS NOT NULL);



CREATE INDEX "idx_crm_companies_cnpj" ON "public"."crm_companies" USING "btree" ("organization_id", "cnpj") WHERE ("cnpj" IS NOT NULL);



CREATE INDEX "idx_crm_companies_industry" ON "public"."crm_companies" USING "btree" ("industry") WHERE ("industry" IS NOT NULL);



CREATE INDEX "idx_crm_companies_name" ON "public"."crm_companies" USING "btree" ("organization_id", "name");



CREATE INDEX "idx_crm_companies_org" ON "public"."crm_companies" USING "btree" ("organization_id");



CREATE INDEX "idx_crm_companies_owner" ON "public"."crm_companies" USING "btree" ("owner_id");



CREATE INDEX "idx_crm_contacts_chat" ON "public"."crm_contacts" USING "btree" ("chat_contact_id") WHERE ("chat_contact_id" IS NOT NULL);



CREATE INDEX "idx_crm_contacts_company" ON "public"."crm_contacts" USING "btree" ("company_id") WHERE ("company_id" IS NOT NULL);



CREATE INDEX "idx_crm_contacts_contact_type" ON "public"."crm_contacts" USING "btree" ("contact_type");



CREATE INDEX "idx_crm_contacts_contract_type" ON "public"."crm_contacts" USING "btree" ("contract_type") WHERE ("contract_type" IS NOT NULL);



CREATE INDEX "idx_crm_contacts_cpf" ON "public"."crm_contacts" USING "btree" ("cpf") WHERE ("cpf" IS NOT NULL);



CREATE INDEX "idx_crm_contacts_dob" ON "public"."crm_contacts" USING "btree" ("date_of_birth") WHERE ("date_of_birth" IS NOT NULL);



CREATE INDEX "idx_crm_contacts_email" ON "public"."crm_contacts" USING "btree" ("organization_id", "email") WHERE ("email" IS NOT NULL);



CREATE INDEX "idx_crm_contacts_full_name" ON "public"."crm_contacts" USING "btree" ("organization_id", "full_name");



CREATE INDEX "idx_crm_contacts_is_blacklisted" ON "public"."crm_contacts" USING "btree" ("is_blacklisted") WHERE ("is_blacklisted" = true);



CREATE INDEX "idx_crm_contacts_is_premium" ON "public"."crm_contacts" USING "btree" ("is_premium") WHERE ("is_premium" = true);



CREATE INDEX "idx_crm_contacts_loyalty" ON "public"."crm_contacts" USING "btree" ("loyalty_program_name", "loyalty_id") WHERE ("loyalty_id" IS NOT NULL);



CREATE INDEX "idx_crm_contacts_org" ON "public"."crm_contacts" USING "btree" ("organization_id");



CREATE INDEX "idx_crm_contacts_owner" ON "public"."crm_contacts" USING "btree" ("owner_id");



CREATE INDEX "idx_crm_contacts_phone" ON "public"."crm_contacts" USING "btree" ("organization_id", "phone") WHERE ("phone" IS NOT NULL);



CREATE INDEX "idx_crm_contacts_properties" ON "public"."crm_contacts" USING "gin" ("property_ids") WHERE ("property_ids" <> '{}'::"uuid"[]);



CREATE INDEX "idx_crm_contacts_staysnet_client_id" ON "public"."crm_contacts" USING "btree" ("staysnet_client_id") WHERE ("staysnet_client_id" IS NOT NULL);



CREATE INDEX "idx_crm_contacts_tags" ON "public"."crm_contacts" USING "gin" ("tags") WHERE ("tags" <> '{}'::"text"[]);



CREATE INDEX "idx_crm_contacts_user" ON "public"."crm_contacts" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_crm_contacts_whatsapp" ON "public"."crm_contacts" USING "btree" ("whatsapp_jid") WHERE ("whatsapp_jid" IS NOT NULL);



CREATE INDEX "idx_crm_lost_reasons_active" ON "public"."crm_lost_reasons" USING "btree" ("is_active");



CREATE INDEX "idx_crm_lost_reasons_category" ON "public"."crm_lost_reasons" USING "btree" ("category");



CREATE INDEX "idx_crm_lost_reasons_org" ON "public"."crm_lost_reasons" USING "btree" ("organization_id");



CREATE INDEX "idx_crm_notes_company" ON "public"."crm_notes" USING "btree" ("company_id") WHERE ("company_id" IS NOT NULL);



CREATE INDEX "idx_crm_notes_contact" ON "public"."crm_notes" USING "btree" ("contact_id") WHERE ("contact_id" IS NOT NULL);



CREATE INDEX "idx_crm_notes_created" ON "public"."crm_notes" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_crm_notes_deal" ON "public"."crm_notes" USING "btree" ("deal_id") WHERE ("deal_id" IS NOT NULL);



CREATE INDEX "idx_crm_notes_org" ON "public"."crm_notes" USING "btree" ("organization_id");



CREATE INDEX "idx_crm_notes_task" ON "public"."crm_notes" USING "btree" ("task_id") WHERE ("task_id" IS NOT NULL);



CREATE INDEX "idx_crm_products_services_active" ON "public"."crm_products_services" USING "btree" ("is_active");



CREATE INDEX "idx_crm_products_services_category" ON "public"."crm_products_services" USING "btree" ("category");



CREATE INDEX "idx_crm_products_services_code" ON "public"."crm_products_services" USING "btree" ("organization_id", "code") WHERE ("code" IS NOT NULL);



CREATE INDEX "idx_crm_products_services_org" ON "public"."crm_products_services" USING "btree" ("organization_id");



CREATE INDEX "idx_crm_products_services_type" ON "public"."crm_products_services" USING "btree" ("type");



CREATE INDEX "idx_crm_projects_org" ON "public"."crm_projects" USING "btree" ("organization_id");



CREATE INDEX "idx_crm_projects_status" ON "public"."crm_projects" USING "btree" ("status");



CREATE INDEX "idx_crm_projects_type" ON "public"."crm_projects" USING "btree" ("project_type");



CREATE INDEX "idx_crm_tasks_assignee_id" ON "public"."crm_tasks" USING "btree" ("assignee_id");



CREATE INDEX "idx_crm_tasks_due_date" ON "public"."crm_tasks" USING "btree" ("due_date");



CREATE INDEX "idx_crm_tasks_organization_id" ON "public"."crm_tasks" USING "btree" ("organization_id");



CREATE INDEX "idx_crm_tasks_parent_id" ON "public"."crm_tasks" USING "btree" ("parent_id");



CREATE INDEX "idx_crm_tasks_path" ON "public"."crm_tasks" USING "btree" ("path");



CREATE INDEX "idx_crm_tasks_project_id" ON "public"."crm_tasks" USING "btree" ("project_id");



CREATE INDEX "idx_crm_tasks_property_id" ON "public"."crm_tasks" USING "btree" ("property_id");



CREATE INDEX "idx_crm_tasks_status" ON "public"."crm_tasks" USING "btree" ("status");



CREATE INDEX "idx_crm_tasks_team_id" ON "public"."crm_tasks" USING "btree" ("team_id");



CREATE INDEX "idx_crm_templates_active" ON "public"."crm_templates" USING "btree" ("is_active");



CREATE INDEX "idx_crm_templates_category" ON "public"."crm_templates" USING "btree" ("category");



CREATE INDEX "idx_crm_templates_created_by" ON "public"."crm_templates" USING "btree" ("created_by");



CREATE INDEX "idx_crm_templates_org" ON "public"."crm_templates" USING "btree" ("organization_id");



CREATE INDEX "idx_crm_templates_public" ON "public"."crm_templates" USING "btree" ("is_public");



CREATE INDEX "idx_crm_templates_search" ON "public"."crm_templates" USING "gin" ("to_tsvector"('"portuguese"'::"regconfig", ((("name")::"text" || ' '::"text") || COALESCE("description", ''::"text"))));



CREATE INDEX "idx_crm_templates_tags" ON "public"."crm_templates" USING "gin" ("tags");



CREATE INDEX "idx_crm_templates_type" ON "public"."crm_templates" USING "btree" ("template_type");



CREATE INDEX "idx_custom_field_values_entity_id" ON "public"."custom_field_values" USING "btree" ("entity_id");



CREATE INDEX "idx_custom_field_values_entity_type" ON "public"."custom_field_values" USING "btree" ("entity_type");



CREATE INDEX "idx_custom_field_values_field_id" ON "public"."custom_field_values" USING "btree" ("custom_field_id");



CREATE INDEX "idx_custom_fields_organization_id" ON "public"."custom_fields" USING "btree" ("organization_id");



CREATE INDEX "idx_custom_fields_scope" ON "public"."custom_fields" USING "btree" ("scope");



CREATE INDEX "idx_custom_min_nights_date" ON "public"."custom_min_nights" USING "btree" ("date");



CREATE INDEX "idx_custom_min_nights_property_id" ON "public"."custom_min_nights" USING "btree" ("property_id");



CREATE INDEX "idx_custom_prices_date" ON "public"."custom_prices" USING "btree" ("date");



CREATE INDEX "idx_custom_prices_property_id" ON "public"."custom_prices" USING "btree" ("property_id");



CREATE INDEX "idx_deposits_org" ON "public"."deposit_schedules" USING "btree" ("organization_id");



CREATE INDEX "idx_deposits_rate" ON "public"."deposit_schedules" USING "btree" ("rate_plan_id");



CREATE INDEX "idx_drafts_data" ON "public"."properties" USING "gin" ("data" "jsonb_path_ops");



CREATE INDEX "idx_drafts_org" ON "public"."properties" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_drafts_status" ON "public"."properties" USING "btree" ("status") WHERE (("status")::"text" = ANY ((ARRAY['draft'::character varying, 'ready_to_publish'::character varying])::"text"[]));



CREATE INDEX "idx_drafts_title" ON "public"."properties" USING "gin" ("to_tsvector"('"portuguese"'::"regconfig", COALESCE("title", ''::"text")));



CREATE INDEX "idx_drafts_user" ON "public"."properties" USING "btree" ("user_id", "updated_at" DESC);



CREATE INDEX "idx_evolution_instances_user" ON "public"."evolution_instances" USING "btree" ("user_id");



CREATE INDEX "idx_financeiro_categorias_codigo" ON "public"."financeiro_categorias" USING "btree" ("organization_id", "codigo");



CREATE INDEX "idx_financeiro_categorias_org" ON "public"."financeiro_categorias" USING "btree" ("organization_id");



CREATE INDEX "idx_financeiro_categorias_parent" ON "public"."financeiro_categorias" USING "btree" ("parent_id");



CREATE INDEX "idx_financeiro_categorias_tipo" ON "public"."financeiro_categorias" USING "btree" ("tipo");



CREATE INDEX "idx_financeiro_centro_custos_org" ON "public"."financeiro_centro_custos" USING "btree" ("organization_id");



CREATE INDEX "idx_financeiro_centro_custos_property" ON "public"."financeiro_centro_custos" USING "btree" ("property_id");



CREATE INDEX "idx_financeiro_centro_custos_tipo" ON "public"."financeiro_centro_custos" USING "btree" ("tipo");



CREATE INDEX "idx_financeiro_contas_bancarias_ativo" ON "public"."financeiro_contas_bancarias" USING "btree" ("ativo");



CREATE INDEX "idx_financeiro_contas_bancarias_org" ON "public"."financeiro_contas_bancarias" USING "btree" ("organization_id");



CREATE INDEX "idx_financeiro_lancamentos_categoria" ON "public"."financeiro_lancamentos" USING "btree" ("categoria_id");



CREATE INDEX "idx_financeiro_lancamentos_centro_custo" ON "public"."financeiro_lancamentos" USING "btree" ("centro_custo_id");



CREATE INDEX "idx_financeiro_lancamentos_competencia" ON "public"."financeiro_lancamentos" USING "btree" ("competencia" DESC);



CREATE INDEX "idx_financeiro_lancamentos_conciliado" ON "public"."financeiro_lancamentos" USING "btree" ("conciliado");



CREATE INDEX "idx_financeiro_lancamentos_conta" ON "public"."financeiro_lancamentos" USING "btree" ("conta_id");



CREATE INDEX "idx_financeiro_lancamentos_data" ON "public"."financeiro_lancamentos" USING "btree" ("data" DESC);



CREATE INDEX "idx_financeiro_lancamentos_org" ON "public"."financeiro_lancamentos" USING "btree" ("organization_id");



CREATE INDEX "idx_financeiro_lancamentos_org_competencia" ON "public"."financeiro_lancamentos" USING "btree" ("organization_id", "competencia" DESC);



CREATE INDEX "idx_financeiro_lancamentos_org_data" ON "public"."financeiro_lancamentos" USING "btree" ("organization_id", "data" DESC);



CREATE INDEX "idx_financeiro_lancamentos_property" ON "public"."financeiro_lancamentos" USING "btree" ("property_id");



CREATE INDEX "idx_financeiro_lancamentos_splits_lancamento" ON "public"."financeiro_lancamentos_splits" USING "btree" ("lancamento_id");



CREATE INDEX "idx_financeiro_lancamentos_splits_org" ON "public"."financeiro_lancamentos_splits" USING "btree" ("organization_id");



CREATE INDEX "idx_financeiro_lancamentos_tipo" ON "public"."financeiro_lancamentos" USING "btree" ("tipo");



CREATE INDEX "idx_financeiro_linhas_extrato_conciliado" ON "public"."financeiro_linhas_extrato" USING "btree" ("conciliado");



CREATE INDEX "idx_financeiro_linhas_extrato_conta" ON "public"."financeiro_linhas_extrato" USING "btree" ("conta_id");



CREATE INDEX "idx_financeiro_linhas_extrato_conta_data" ON "public"."financeiro_linhas_extrato" USING "btree" ("conta_id", "data" DESC);



CREATE INDEX "idx_financeiro_linhas_extrato_data" ON "public"."financeiro_linhas_extrato" USING "btree" ("data" DESC);



CREATE INDEX "idx_financeiro_linhas_extrato_hash" ON "public"."financeiro_linhas_extrato" USING "btree" ("hash_unico");



CREATE INDEX "idx_financeiro_linhas_extrato_lancamento" ON "public"."financeiro_linhas_extrato" USING "btree" ("lancamento_id");



CREATE INDEX "idx_financeiro_linhas_extrato_org" ON "public"."financeiro_linhas_extrato" USING "btree" ("organization_id");



CREATE INDEX "idx_financeiro_regras_conciliacao_ativo" ON "public"."financeiro_regras_conciliacao" USING "btree" ("ativo");



CREATE INDEX "idx_financeiro_regras_conciliacao_org" ON "public"."financeiro_regras_conciliacao" USING "btree" ("organization_id");



CREATE INDEX "idx_financeiro_regras_conciliacao_prioridade" ON "public"."financeiro_regras_conciliacao" USING "btree" ("prioridade" DESC);



CREATE INDEX "idx_financeiro_titulos_guest" ON "public"."financeiro_titulos" USING "btree" ("guest_id");



CREATE INDEX "idx_financeiro_titulos_org" ON "public"."financeiro_titulos" USING "btree" ("organization_id");



CREATE INDEX "idx_financeiro_titulos_org_tipo_status" ON "public"."financeiro_titulos" USING "btree" ("organization_id", "tipo", "status");



CREATE INDEX "idx_financeiro_titulos_org_vencimento" ON "public"."financeiro_titulos" USING "btree" ("organization_id", "vencimento");



CREATE INDEX "idx_financeiro_titulos_pai" ON "public"."financeiro_titulos" USING "btree" ("titulo_pai_id");



CREATE INDEX "idx_financeiro_titulos_reservation" ON "public"."financeiro_titulos" USING "btree" ("reservation_id");



CREATE INDEX "idx_financeiro_titulos_status" ON "public"."financeiro_titulos" USING "btree" ("status");



CREATE INDEX "idx_financeiro_titulos_tipo" ON "public"."financeiro_titulos" USING "btree" ("tipo");



CREATE INDEX "idx_financeiro_titulos_vencimento" ON "public"."financeiro_titulos" USING "btree" ("vencimento");



CREATE INDEX "idx_guest_users_apple_id" ON "public"."guest_users" USING "btree" ("apple_id") WHERE ("apple_id" IS NOT NULL);



CREATE INDEX "idx_guest_users_email" ON "public"."guest_users" USING "btree" ("email");



CREATE INDEX "idx_guest_users_google_id" ON "public"."guest_users" USING "btree" ("google_id") WHERE ("google_id" IS NOT NULL);



CREATE INDEX "idx_guest_users_organization" ON "public"."guest_users" USING "btree" ("organization_id");



CREATE INDEX "idx_guests_cpf" ON "public"."guests" USING "btree" ("cpf");



CREATE INDEX "idx_guests_email" ON "public"."guests" USING "btree" ("email");



CREATE INDEX "idx_guests_is_blacklisted" ON "public"."guests" USING "btree" ("is_blacklisted");



CREATE INDEX "idx_guests_organization_id" ON "public"."guests" USING "btree" ("organization_id");



CREATE INDEX "idx_guests_phone" ON "public"."guests" USING "btree" ("phone");



CREATE INDEX "idx_guests_source" ON "public"."guests" USING "btree" ("source");



CREATE INDEX "idx_guests_staysnet_raw_gin" ON "public"."guests" USING "gin" ("staysnet_raw") WHERE ("staysnet_raw" IS NOT NULL);



CREATE INDEX "idx_guests_tags" ON "public"."guests" USING "gin" ("tags");



CREATE INDEX "idx_invitations_email" ON "public"."invitations" USING "btree" ("email");



CREATE INDEX "idx_invitations_status" ON "public"."invitations" USING "btree" ("status");



CREATE INDEX "idx_invitations_token" ON "public"."invitations" USING "btree" ("token");



CREATE INDEX "idx_kv_backups_backed_up_at" ON "public"."kv_backups" USING "btree" ("backed_up_at");



CREATE INDEX "idx_kv_store_key_prefix" ON "public"."kv_store_67caf26a" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "idx_kv_store_value_gin" ON "public"."kv_store_67caf26a" USING "gin" ("value");



CREATE INDEX "idx_listings_accommodation_id" ON "public"."listings" USING "btree" ("accommodation_id");



CREATE INDEX "idx_listings_organization_id" ON "public"."listings" USING "btree" ("organization_id");



CREATE INDEX "idx_listings_seo_slug" ON "public"."listings" USING "btree" ("seo_slug");



CREATE INDEX "idx_locations_city" ON "public"."locations" USING "btree" ("address_city");



CREATE INDEX "idx_locations_code" ON "public"."locations" USING "btree" ("code");



CREATE INDEX "idx_locations_organization_id" ON "public"."locations" USING "btree" ("organization_id");



CREATE INDEX "idx_locations_owner_id" ON "public"."locations" USING "btree" ("owner_id");



CREATE INDEX "idx_locations_state" ON "public"."locations" USING "btree" ("address_state");



CREATE INDEX "idx_marketplace_conv_last_msg" ON "public"."re_marketplace_conversations" USING "btree" ("last_message_at" DESC);



CREATE INDEX "idx_marketplace_conv_org_a" ON "public"."re_marketplace_conversations" USING "btree" ("org_a_id");



CREATE INDEX "idx_marketplace_conv_org_b" ON "public"."re_marketplace_conversations" USING "btree" ("org_b_id");



CREATE INDEX "idx_marketplace_conv_related" ON "public"."re_marketplace_conversations" USING "btree" ("related_type", "related_id");



CREATE INDEX "idx_marketplace_conv_status" ON "public"."re_marketplace_conversations" USING "btree" ("status");



CREATE UNIQUE INDEX "idx_marketplace_conv_unique_pair" ON "public"."re_marketplace_conversations" USING "btree" (LEAST("org_a_id", "org_b_id"), GREATEST("org_a_id", "org_b_id")) WHERE ("related_type" IS NULL);



CREATE INDEX "idx_marketplace_msg_conv" ON "public"."re_marketplace_messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_marketplace_msg_created" ON "public"."re_marketplace_messages" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "idx_marketplace_msg_sender" ON "public"."re_marketplace_messages" USING "btree" ("sender_profile_id");



CREATE INDEX "idx_marketplace_msg_unread" ON "public"."re_marketplace_messages" USING "btree" ("conversation_id", "read_at") WHERE ("read_at" IS NULL);



CREATE INDEX "idx_marketplace_part_conv" ON "public"."re_marketplace_participants" USING "btree" ("conversation_id");



CREATE INDEX "idx_marketplace_part_profile" ON "public"."re_marketplace_participants" USING "btree" ("profile_id");



CREATE INDEX "idx_messages_channel" ON "public"."messages" USING "btree" ("channel");



CREATE INDEX "idx_messages_conversation" ON "public"."messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_messages_external" ON "public"."messages" USING "btree" ("external_id");



CREATE INDEX "idx_messages_external_id" ON "public"."messages" USING "btree" ("external_id");



CREATE INDEX "idx_messages_org" ON "public"."messages" USING "btree" ("organization_id");



CREATE INDEX "idx_messages_sent_at" ON "public"."messages" USING "btree" ("sent_at" DESC);



CREATE INDEX "idx_messages_unread" ON "public"."messages" USING "btree" ("conversation_id", "read_at") WHERE ("read_at" IS NULL);



CREATE INDEX "idx_notification_templates_active" ON "public"."notification_templates" USING "btree" ("organization_id", "is_active");



CREATE INDEX "idx_notification_templates_org" ON "public"."notification_templates" USING "btree" ("organization_id");



CREATE UNIQUE INDEX "idx_notification_templates_org_code" ON "public"."notification_templates" USING "btree" ("organization_id", "internal_code") WHERE ("internal_code" IS NOT NULL);



CREATE INDEX "idx_notification_templates_trigger" ON "public"."notification_templates" USING "btree" ("trigger_event");



CREATE INDEX "idx_notifications_org_created" ON "public"."notifications" USING "btree" ("organization_id", "created_at" DESC);



CREATE INDEX "idx_notifications_org_read" ON "public"."notifications" USING "btree" ("organization_id", "read");



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_op_task_templates_active" ON "public"."operational_task_templates" USING "btree" ("is_active");



CREATE INDEX "idx_op_task_templates_org" ON "public"."operational_task_templates" USING "btree" ("organization_id");



CREATE INDEX "idx_op_task_templates_trigger" ON "public"."operational_task_templates" USING "btree" ("trigger_type");



CREATE INDEX "idx_op_tasks_assignee" ON "public"."operational_tasks" USING "btree" ("assignee_id");



CREATE INDEX "idx_op_tasks_org" ON "public"."operational_tasks" USING "btree" ("organization_id");



CREATE INDEX "idx_op_tasks_property" ON "public"."operational_tasks" USING "btree" ("property_id");



CREATE INDEX "idx_op_tasks_scheduled_date" ON "public"."operational_tasks" USING "btree" ("scheduled_date");



CREATE INDEX "idx_op_tasks_status" ON "public"."operational_tasks" USING "btree" ("status");



CREATE INDEX "idx_op_tasks_team" ON "public"."operational_tasks" USING "btree" ("team_id");



CREATE INDEX "idx_op_tasks_template" ON "public"."operational_tasks" USING "btree" ("template_id");



CREATE INDEX "idx_operational_templates_category" ON "public"."operational_task_templates" USING "btree" ("operation_category");



CREATE INDEX "idx_operational_templates_responsibility" ON "public"."operational_task_templates" USING "btree" ("responsibility_filter");



CREATE UNIQUE INDEX "idx_organizations_legacy_imobiliaria_id" ON "public"."organizations" USING "btree" ("legacy_imobiliaria_id") WHERE ("legacy_imobiliaria_id" IS NOT NULL);



CREATE INDEX "idx_organizations_metadata_gin" ON "public"."organizations" USING "gin" ("metadata");



CREATE INDEX "idx_organizations_plan" ON "public"."organizations" USING "btree" ("plan");



CREATE INDEX "idx_organizations_slug" ON "public"."organizations" USING "btree" ("slug");



CREATE INDEX "idx_organizations_status" ON "public"."organizations" USING "btree" ("status");



CREATE INDEX "idx_organizations_trial_ends_at" ON "public"."organizations" USING "btree" ("trial_ends_at") WHERE ("trial_ends_at" IS NOT NULL);



CREATE INDEX "idx_ota_amenity_canonical" ON "public"."ota_amenity_mappings" USING "btree" ("canonical_id");



CREATE INDEX "idx_ota_amenity_ota" ON "public"."ota_amenity_mappings" USING "btree" ("ota", "ota_id");



CREATE INDEX "idx_ota_amenity_ota_scope" ON "public"."ota_amenity_mappings" USING "btree" ("ota", "ota_scope");



CREATE INDEX "idx_ota_bed_type_canonical" ON "public"."ota_bed_type_mappings" USING "btree" ("canonical_id");



CREATE INDEX "idx_ota_bed_type_ota" ON "public"."ota_bed_type_mappings" USING "btree" ("ota", "ota_id");



CREATE INDEX "idx_ota_cancellation_ota" ON "public"."ota_cancellation_policy_mappings" USING "btree" ("ota");



CREATE INDEX "idx_ota_cancellation_template" ON "public"."ota_cancellation_policy_mappings" USING "btree" ("template_id");



CREATE INDEX "idx_ota_credentials_active" ON "public"."ota_api_credentials" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_ota_credentials_org" ON "public"."ota_api_credentials" USING "btree" ("organization_id");



CREATE INDEX "idx_ota_credentials_ota" ON "public"."ota_api_credentials" USING "btree" ("ota");



CREATE INDEX "idx_ota_property_type_canonical" ON "public"."ota_property_type_mappings" USING "btree" ("canonical_id");



CREATE INDEX "idx_ota_property_type_ota" ON "public"."ota_property_type_mappings" USING "btree" ("ota", "ota_id");



CREATE INDEX "idx_ota_rate_plan_ota" ON "public"."ota_rate_plan_mappings" USING "btree" ("ota");



CREATE INDEX "idx_ota_rate_plan_rate" ON "public"."ota_rate_plan_mappings" USING "btree" ("rate_plan_id");



CREATE INDEX "idx_ota_rate_plan_sync" ON "public"."ota_rate_plan_mappings" USING "btree" ("ota", "sync_enabled") WHERE ("sync_enabled" = true);



CREATE INDEX "idx_ota_region_region" ON "public"."ota_region_mappings" USING "btree" ("region_id");



CREATE INDEX "idx_ota_reservation_status_canonical" ON "public"."ota_reservation_status_mappings" USING "btree" ("canonical_id");



CREATE INDEX "idx_ota_room_type_canonical" ON "public"."ota_room_type_mappings" USING "btree" ("canonical_id");



CREATE INDEX "idx_ota_webhook_subs_org" ON "public"."ota_webhook_subscriptions" USING "btree" ("organization_id");



CREATE INDEX "idx_ota_webhook_subs_ota" ON "public"."ota_webhook_subscriptions" USING "btree" ("ota");



CREATE UNIQUE INDEX "idx_ota_webhook_subs_unique" ON "public"."ota_webhook_subscriptions" USING "btree" ("organization_id", "ota");



CREATE INDEX "idx_ota_webhooks_created" ON "public"."ota_webhooks" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ota_webhooks_event_id" ON "public"."ota_webhooks" USING "btree" ("ota", "event_id") WHERE ("event_id" IS NOT NULL);



CREATE INDEX "idx_ota_webhooks_event_type" ON "public"."ota_webhooks" USING "btree" ("event_type");



CREATE UNIQUE INDEX "idx_ota_webhooks_idempotency" ON "public"."ota_webhooks" USING "btree" ("ota", "event_id") WHERE ("event_id" IS NOT NULL);



CREATE INDEX "idx_ota_webhooks_org" ON "public"."ota_webhooks" USING "btree" ("organization_id");



CREATE INDEX "idx_ota_webhooks_ota" ON "public"."ota_webhooks" USING "btree" ("ota");



CREATE INDEX "idx_ota_webhooks_processed" ON "public"."ota_webhooks" USING "btree" ("processed") WHERE ("processed" = false);



CREATE INDEX "idx_ota_webhooks_property" ON "public"."ota_webhooks" USING "btree" ("property_id") WHERE ("property_id" IS NOT NULL);



CREATE INDEX "idx_ota_webhooks_requires_action" ON "public"."ota_webhooks" USING "btree" ("requires_action") WHERE ("requires_action" = true);



CREATE INDEX "idx_ota_webhooks_reservation" ON "public"."ota_webhooks" USING "btree" ("reservation_id") WHERE ("reservation_id" IS NOT NULL);



CREATE INDEX "idx_owner_users_auth_user_id" ON "public"."owner_users" USING "btree" ("auth_user_id");



CREATE INDEX "idx_owner_users_email" ON "public"."owner_users" USING "btree" ("email");



CREATE INDEX "idx_owner_users_organization_id" ON "public"."owner_users" USING "btree" ("organization_id");



CREATE INDEX "idx_owner_users_owner_id" ON "public"."owner_users" USING "btree" ("owner_id");



CREATE INDEX "idx_owner_users_status" ON "public"."owner_users" USING "btree" ("status");



CREATE INDEX "idx_owners_auth_user_id" ON "public"."owners" USING "btree" ("auth_user_id");



CREATE INDEX "idx_owners_contract_type" ON "public"."owners" USING "btree" ("contract_type");



CREATE INDEX "idx_owners_email" ON "public"."owners" USING "btree" ("email");



CREATE INDEX "idx_owners_is_premium" ON "public"."owners" USING "btree" ("is_premium");



CREATE INDEX "idx_owners_organization_id" ON "public"."owners" USING "btree" ("organization_id");



CREATE INDEX "idx_owners_status" ON "public"."owners" USING "btree" ("status");



CREATE INDEX "idx_pagarme_configs_org" ON "public"."pagarme_configs" USING "btree" ("organization_id");



CREATE INDEX "idx_pagarme_orders_org" ON "public"."pagarme_orders" USING "btree" ("organization_id");



CREATE INDEX "idx_pagarme_orders_reservation" ON "public"."pagarme_orders" USING "btree" ("reservation_id");



CREATE INDEX "idx_pagarme_orders_status" ON "public"."pagarme_orders" USING "btree" ("status");



CREATE INDEX "idx_pagarme_payment_links_org" ON "public"."pagarme_payment_links" USING "btree" ("organization_id");



CREATE INDEX "idx_pagarme_payment_links_reservation" ON "public"."pagarme_payment_links" USING "btree" ("reservation_id");



CREATE INDEX "idx_pagarme_webhook_events_org" ON "public"."pagarme_webhook_events" USING "btree" ("organization_id");



CREATE INDEX "idx_pagarme_webhook_events_received" ON "public"."pagarme_webhook_events" USING "btree" ("received_at" DESC);



CREATE INDEX "idx_password_recovery_expires_at" ON "public"."password_recovery_requests" USING "btree" ("expires_at");



CREATE INDEX "idx_password_recovery_token_hash" ON "public"."password_recovery_requests" USING "btree" ("token_hash");



CREATE INDEX "idx_password_recovery_used_at" ON "public"."password_recovery_requests" USING "btree" ("used_at");



CREATE INDEX "idx_password_recovery_user_id" ON "public"."password_recovery_requests" USING "btree" ("user_id");



CREATE INDEX "idx_payment_sessions_org" ON "public"."payment_sessions" USING "btree" ("organization_id");



CREATE INDEX "idx_payment_sessions_ota" ON "public"."payment_sessions" USING "btree" ("ota");



CREATE INDEX "idx_payment_sessions_reservation" ON "public"."payment_sessions" USING "btree" ("reservation_id");



CREATE INDEX "idx_payment_sessions_session_id" ON "public"."payment_sessions" USING "btree" ("session_id") WHERE ("session_id" IS NOT NULL);



CREATE INDEX "idx_payment_sessions_status" ON "public"."payment_sessions" USING "btree" ("status");



CREATE INDEX "idx_payments_created" ON "public"."payments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_payments_org" ON "public"."payments" USING "btree" ("organization_id");



CREATE INDEX "idx_payments_ota" ON "public"."payments" USING "btree" ("ota");



CREATE INDEX "idx_payments_reservation" ON "public"."payments" USING "btree" ("reservation_id");



CREATE INDEX "idx_payments_session" ON "public"."payments" USING "btree" ("payment_session_id");



CREATE INDEX "idx_payments_status" ON "public"."payments" USING "btree" ("status");



CREATE INDEX "idx_payments_type" ON "public"."payments" USING "btree" ("payment_type");



CREATE INDEX "idx_pcs_channel" ON "public"."property_channel_settings" USING "btree" ("channel_code");



CREATE INDEX "idx_pcs_organization" ON "public"."property_channel_settings" USING "btree" ("organization_id");



CREATE INDEX "idx_pcs_property" ON "public"."property_channel_settings" USING "btree" ("property_id");



CREATE INDEX "idx_pcs_property_channel" ON "public"."property_channel_settings" USING "btree" ("property_id", "channel_code");



CREATE INDEX "idx_pcs_status" ON "public"."property_channel_settings" USING "btree" ("status");



CREATE INDEX "idx_pcs_sync_enabled" ON "public"."property_channel_settings" USING "btree" ("sync_enabled") WHERE ("sync_enabled" = true);



CREATE INDEX "idx_pending_retry" ON "public"."anuncios_pending_changes" USING "btree" ("status", "next_retry_at") WHERE (("status")::"text" = ANY ((ARRAY['pending'::character varying, 'failed'::character varying])::"text"[]));



CREATE INDEX "idx_permissions_resource" ON "public"."permissions" USING "btree" ("resource");



CREATE INDEX "idx_permissions_user_id" ON "public"."permissions" USING "btree" ("user_id");



CREATE INDEX "idx_predetermined_funnel_stages_funnel" ON "public"."predetermined_funnel_stages" USING "btree" ("funnel_id");



CREATE INDEX "idx_predetermined_funnel_stages_order" ON "public"."predetermined_funnel_stages" USING "btree" ("funnel_id", "order");



CREATE INDEX "idx_predetermined_funnels_org" ON "public"."predetermined_funnels" USING "btree" ("organization_id");



CREATE INDEX "idx_predetermined_item_activities_item" ON "public"."predetermined_item_activities" USING "btree" ("item_id");



CREATE INDEX "idx_predetermined_items_cancelled_reason" ON "public"."predetermined_items" USING "btree" ("cancelled_reason_id") WHERE ("cancelled_reason_id" IS NOT NULL);



CREATE INDEX "idx_predetermined_items_funnel" ON "public"."predetermined_items" USING "btree" ("funnel_id");



CREATE INDEX "idx_predetermined_items_org" ON "public"."predetermined_items" USING "btree" ("organization_id");



CREATE INDEX "idx_predetermined_items_property" ON "public"."predetermined_items" USING "btree" ("property_id");



CREATE INDEX "idx_predetermined_items_reservation" ON "public"."predetermined_items" USING "btree" ("reservation_id");



CREATE INDEX "idx_predetermined_items_stage" ON "public"."predetermined_items" USING "btree" ("stage_id");



CREATE INDEX "idx_predetermined_items_status" ON "public"."predetermined_items" USING "btree" ("status");



CREATE INDEX "idx_pricing_breakdown_date" ON "public"."reservation_pricing_breakdown" USING "btree" ("date");



CREATE INDEX "idx_pricing_breakdown_reservation" ON "public"."reservation_pricing_breakdown" USING "btree" ("reservation_id");



CREATE INDEX "idx_pricing_breakdown_room" ON "public"."reservation_pricing_breakdown" USING "btree" ("reservation_room_id");



CREATE INDEX "idx_pricing_breakdown_type" ON "public"."reservation_pricing_breakdown" USING "btree" ("component_type");



CREATE INDEX "idx_pricing_settings_listing_id" ON "public"."pricing_settings" USING "btree" ("listing_id");



CREATE INDEX "idx_properties_checkin_category" ON "public"."properties" USING "btree" ("checkin_category") WHERE ("checkin_category" IS NOT NULL);



CREATE INDEX "idx_properties_cleaning_responsibility" ON "public"."properties" USING "btree" ("cleaning_responsibility") WHERE ("cleaning_responsibility" IS NOT NULL);



CREATE INDEX "idx_properties_drafts_created_at" ON "public"."properties_drafts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_properties_drafts_status" ON "public"."properties_drafts" USING "btree" ("status");



CREATE INDEX "idx_properties_drafts_tenant_id" ON "public"."properties_drafts" USING "btree" ("tenant_id");



CREATE INDEX "idx_properties_drafts_updated_at" ON "public"."properties_drafts" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_properties_id" ON "public"."properties" USING "btree" ("id");



CREATE INDEX "idx_properties_maintenance_responsibility" ON "public"."properties" USING "btree" ("maintenance_responsibility") WHERE ("maintenance_responsibility" IS NOT NULL);



CREATE INDEX "idx_properties_organization_id" ON "public"."properties" USING "btree" ("organization_id");



CREATE INDEX "idx_properties_owner_contact_id" ON "public"."properties" USING "btree" ("owner_contact_id");



CREATE INDEX "idx_property_cancel_org" ON "public"."property_cancellation_penalties" USING "btree" ("organization_id");



CREATE INDEX "idx_property_cancel_property" ON "public"."property_cancellation_penalties" USING "btree" ("property_id");



CREATE INDEX "idx_property_cancel_rate" ON "public"."property_cancellation_penalties" USING "btree" ("rate_plan_id");



CREATE INDEX "idx_property_ota_ext_ota" ON "public"."property_ota_extensions" USING "btree" ("ota");



CREATE INDEX "idx_property_ota_ext_ota_id" ON "public"."property_ota_extensions" USING "btree" ("ota", "ota_property_id") WHERE ("ota_property_id" IS NOT NULL);



CREATE INDEX "idx_property_ota_ext_property" ON "public"."property_ota_extensions" USING "btree" ("property_id");



CREATE INDEX "idx_property_ota_ext_sync" ON "public"."property_ota_extensions" USING "btree" ("sync_enabled", "next_sync_at") WHERE ("sync_enabled" = true);



CREATE INDEX "idx_property_rooms_active" ON "public"."property_rooms" USING "btree" ("property_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_property_rooms_property" ON "public"."property_rooms" USING "btree" ("property_id");



CREATE INDEX "idx_property_rooms_type" ON "public"."property_rooms" USING "btree" ("room_type_id") WHERE ("room_type_id" IS NOT NULL);



CREATE INDEX "idx_published_org" ON "public"."anuncios_published" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_published_search" ON "public"."anuncios_published" USING "gin" ("to_tsvector"('"portuguese"'::"regconfig", (("title" || ' '::"text") || COALESCE(("data" ->> 'description'::"text"), ''::"text"))));



CREATE INDEX "idx_published_slug" ON "public"."anuncios_published" USING "btree" ("slug") WHERE ("slug" IS NOT NULL);



CREATE INDEX "idx_published_tipo" ON "public"."anuncios_published" USING "btree" ("tipo_local", "tipo_acomodacao");



CREATE INDEX "idx_rate_availability_available" ON "public"."rate_plan_availability" USING "btree" ("rate_plan_id", "date", "is_closed") WHERE ("is_closed" = false);



CREATE INDEX "idx_rate_availability_date" ON "public"."rate_plan_availability" USING "btree" ("date");



CREATE INDEX "idx_rate_availability_property" ON "public"."rate_plan_availability" USING "btree" ("property_id");



CREATE INDEX "idx_rate_availability_rate" ON "public"."rate_plan_availability" USING "btree" ("rate_plan_id");



CREATE INDEX "idx_rate_plan_availability_date" ON "public"."rate_plan_availability" USING "btree" ("rate_plan_id", "date");



CREATE INDEX "idx_rate_plan_pricing_dates" ON "public"."rate_plan_pricing_overrides" USING "btree" ("date_from", "date_to");



CREATE INDEX "idx_rate_plan_pricing_overrides_date_range" ON "public"."rate_plan_pricing_overrides" USING "btree" ("rate_plan_id", "date_from", "date_to") WHERE ("is_active" = true);



CREATE INDEX "idx_rate_plan_pricing_rate" ON "public"."rate_plan_pricing_overrides" USING "btree" ("rate_plan_id");



CREATE INDEX "idx_rate_plans_active" ON "public"."rate_plans" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_rate_plans_org" ON "public"."rate_plans" USING "btree" ("organization_id");



CREATE INDEX "idx_rate_plans_property" ON "public"."rate_plans" USING "btree" ("property_id");



CREATE INDEX "idx_rate_plans_valid_dates" ON "public"."rate_plans" USING "btree" ("valid_from", "valid_to");



CREATE INDEX "idx_re_broker_campaign_part_broker" ON "public"."re_broker_campaign_participation" USING "btree" ("broker_id");



CREATE INDEX "idx_re_broker_campaign_part_campaign" ON "public"."re_broker_campaign_participation" USING "btree" ("campaign_id");



CREATE INDEX "idx_re_broker_campaigns_company" ON "public"."re_broker_campaigns" USING "btree" ("company_id");



CREATE INDEX "idx_re_broker_campaigns_dates" ON "public"."re_broker_campaigns" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_re_broker_campaigns_status" ON "public"."re_broker_campaigns" USING "btree" ("status");



CREATE INDEX "idx_re_broker_chat_channels_company" ON "public"."re_broker_chat_channels" USING "btree" ("company_id");



CREATE INDEX "idx_re_broker_chat_messages_broker" ON "public"."re_broker_chat_messages" USING "btree" ("broker_id");



CREATE INDEX "idx_re_broker_chat_messages_channel" ON "public"."re_broker_chat_messages" USING "btree" ("channel_id");



CREATE INDEX "idx_re_broker_chat_messages_created" ON "public"."re_broker_chat_messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_re_broker_invites_company" ON "public"."re_broker_invites" USING "btree" ("company_id");



CREATE INDEX "idx_re_broker_invites_email" ON "public"."re_broker_invites" USING "btree" ("broker_email");



CREATE INDEX "idx_re_broker_invites_status" ON "public"."re_broker_invites" USING "btree" ("status");



CREATE INDEX "idx_re_broker_rankings_broker" ON "public"."re_broker_rankings" USING "btree" ("broker_id");



CREATE INDEX "idx_re_broker_rankings_company" ON "public"."re_broker_rankings" USING "btree" ("company_id");



CREATE INDEX "idx_re_broker_rankings_period" ON "public"."re_broker_rankings" USING "btree" ("period_type", "period_start");



CREATE INDEX "idx_re_brokers_agency" ON "public"."re_brokers" USING "btree" ("agency_id");



CREATE INDEX "idx_re_brokers_available" ON "public"."re_brokers" USING "btree" ("available");



CREATE INDEX "idx_re_brokers_creci" ON "public"."re_brokers" USING "btree" ("creci");



CREATE INDEX "idx_re_brokers_linked_company" ON "public"."re_brokers" USING "btree" ("linked_company_id");



CREATE INDEX "idx_re_brokers_org" ON "public"."re_brokers" USING "btree" ("organization_id");



CREATE INDEX "idx_re_brokers_type" ON "public"."re_brokers" USING "btree" ("broker_type");



CREATE INDEX "idx_re_companies_org" ON "public"."re_companies" USING "btree" ("organization_id");



CREATE INDEX "idx_re_companies_status" ON "public"."re_companies" USING "btree" ("partnership_status");



CREATE INDEX "idx_re_companies_type" ON "public"."re_companies" USING "btree" ("type");



CREATE INDEX "idx_re_demands_agency" ON "public"."re_demands" USING "btree" ("agency_id");



CREATE INDEX "idx_re_demands_status" ON "public"."re_demands" USING "btree" ("status");



CREATE INDEX "idx_re_demands_urgency" ON "public"."re_demands" USING "btree" ("urgency");



CREATE INDEX "idx_re_developments_company" ON "public"."re_developments" USING "btree" ("company_id");



CREATE INDEX "idx_re_developments_phase" ON "public"."re_developments" USING "btree" ("phase");



CREATE INDEX "idx_re_messages_partnership" ON "public"."re_messages" USING "btree" ("partnership_id");



CREATE INDEX "idx_re_messages_sender" ON "public"."re_messages" USING "btree" ("sender_company_id");



CREATE INDEX "idx_re_partnerships_company_a" ON "public"."re_partnerships" USING "btree" ("company_a_id");



CREATE INDEX "idx_re_partnerships_company_b" ON "public"."re_partnerships" USING "btree" ("company_b_id");



CREATE INDEX "idx_re_partnerships_status" ON "public"."re_partnerships" USING "btree" ("status");



CREATE INDEX "idx_re_reservations_agency" ON "public"."re_reservations" USING "btree" ("agency_id");



CREATE INDEX "idx_re_reservations_status" ON "public"."re_reservations" USING "btree" ("status");



CREATE INDEX "idx_re_reservations_unit" ON "public"."re_reservations" USING "btree" ("unit_id");



CREATE INDEX "idx_re_transactions_reservation" ON "public"."re_transactions" USING "btree" ("reservation_id");



CREATE INDEX "idx_re_transactions_status" ON "public"."re_transactions" USING "btree" ("payment_status");



CREATE INDEX "idx_re_units_development" ON "public"."re_units" USING "btree" ("development_id");



CREATE INDEX "idx_re_units_price_source" ON "public"."re_units" USING "btree" ("price_source");



CREATE INDEX "idx_re_units_status" ON "public"."re_units" USING "btree" ("status");



CREATE UNIQUE INDEX "idx_re_units_unique" ON "public"."re_units" USING "btree" ("development_id", "unit_number", "tower", "block");



CREATE INDEX "idx_reconciliation_items_reservation" ON "public"."reconciliation_items" USING "btree" ("reservation_id");



CREATE INDEX "idx_reconciliation_items_run" ON "public"."reconciliation_items" USING "btree" ("run_id");



CREATE INDEX "idx_reconciliation_items_type" ON "public"."reconciliation_items" USING "btree" ("issue_type");



CREATE INDEX "idx_reconciliation_runs_date" ON "public"."reconciliation_runs" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_reconciliation_runs_org" ON "public"."reconciliation_runs" USING "btree" ("organization_id");



CREATE INDEX "idx_reconciliation_runs_status" ON "public"."reconciliation_runs" USING "btree" ("status");



CREATE INDEX "idx_refunds_org" ON "public"."refunds" USING "btree" ("organization_id");



CREATE INDEX "idx_refunds_payment" ON "public"."refunds" USING "btree" ("payment_id");



CREATE INDEX "idx_refunds_reservation" ON "public"."refunds" USING "btree" ("reservation_id");



CREATE INDEX "idx_refunds_status" ON "public"."refunds" USING "btree" ("status");



CREATE INDEX "idx_regions_coords" ON "public"."geographic_regions" USING "btree" ("latitude", "longitude");



CREATE INDEX "idx_regions_country" ON "public"."geographic_regions" USING "btree" ("country_code");



CREATE INDEX "idx_regions_name" ON "public"."geographic_regions" USING "gin" ("to_tsvector"('"portuguese"'::"regconfig", "name"));



CREATE INDEX "idx_regions_parent" ON "public"."geographic_regions" USING "btree" ("parent_id");



CREATE INDEX "idx_regions_type" ON "public"."geographic_regions" USING "btree" ("type");



CREATE INDEX "idx_reservation_cancellations_date" ON "public"."reservation_cancellations" USING "btree" ("cancelled_at");



CREATE INDEX "idx_reservation_cancellations_reservation" ON "public"."reservation_cancellations" USING "btree" ("reservation_id");



CREATE INDEX "idx_reservation_deposits_due" ON "public"."reservation_deposits" USING "btree" ("due_date");



CREATE INDEX "idx_reservation_deposits_reservation" ON "public"."reservation_deposits" USING "btree" ("reservation_id");



CREATE INDEX "idx_reservation_deposits_status" ON "public"."reservation_deposits" USING "btree" ("status");



CREATE INDEX "idx_reservation_history_date" ON "public"."reservation_history" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_reservation_history_reservation" ON "public"."reservation_history" USING "btree" ("reservation_id");



CREATE INDEX "idx_reservation_history_type" ON "public"."reservation_history" USING "btree" ("change_type");



CREATE INDEX "idx_reservation_rooms_guest_name" ON "public"."reservation_rooms" USING "btree" ("guest_family_name", "guest_given_name");



CREATE INDEX "idx_reservation_rooms_property" ON "public"."reservation_rooms" USING "btree" ("property_id");



CREATE INDEX "idx_reservation_rooms_rate_plan" ON "public"."reservation_rooms" USING "btree" ("rate_plan_id");



CREATE INDEX "idx_reservation_rooms_reservation" ON "public"."reservation_rooms" USING "btree" ("reservation_id");



CREATE INDEX "idx_reservation_rooms_status" ON "public"."reservation_rooms" USING "btree" ("status");



CREATE INDEX "idx_reservations_check_in" ON "public"."reservations" USING "btree" ("check_in");



CREATE INDEX "idx_reservations_check_out" ON "public"."reservations" USING "btree" ("check_out");



CREATE INDEX "idx_reservations_created_at" ON "public"."reservations" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_reservations_crm_contact_id" ON "public"."reservations" USING "btree" ("crm_contact_id") WHERE ("crm_contact_id" IS NOT NULL);



CREATE INDEX "idx_reservations_external_id" ON "public"."reservations" USING "btree" ("external_id") WHERE ("external_id" IS NOT NULL);



CREATE INDEX "idx_reservations_guest" ON "public"."reservations" USING "btree" ("guest_id");



CREATE INDEX "idx_reservations_guest_id" ON "public"."reservations" USING "btree" ("guest_id");



CREATE INDEX "idx_reservations_itinerary" ON "public"."reservations" USING "btree" ("itinerary_id") WHERE ("itinerary_id" IS NOT NULL);



CREATE INDEX "idx_reservations_org_platform_external_id" ON "public"."reservations" USING "btree" ("organization_id", "platform", "external_id") WHERE ("external_id" IS NOT NULL);



CREATE INDEX "idx_reservations_organization" ON "public"."reservations" USING "btree" ("organization_id");



CREATE INDEX "idx_reservations_organization_dates" ON "public"."reservations" USING "btree" ("organization_id", "check_in" DESC);



CREATE INDEX "idx_reservations_organization_id" ON "public"."reservations" USING "btree" ("organization_id");



CREATE INDEX "idx_reservations_pending_expires" ON "public"."reservations" USING "btree" ("organization_id", "status", "payment_expires_at") WHERE ((("status")::"text" = 'pending'::"text") AND (("payment_status")::"text" = 'pending'::"text"));



CREATE INDEX "idx_reservations_platform" ON "public"."reservations" USING "btree" ("platform");



CREATE INDEX "idx_reservations_platform_commission" ON "public"."reservations" USING "btree" ("pricing_platform_commission") WHERE ("pricing_platform_commission" > 0);



CREATE INDEX "idx_reservations_property" ON "public"."reservations" USING "btree" ("property_id");



CREATE INDEX "idx_reservations_property_dates" ON "public"."reservations" USING "btree" ("property_id", "check_in", "check_out", "status");



CREATE INDEX "idx_reservations_property_id" ON "public"."reservations" USING "btree" ("property_id");



CREATE INDEX "idx_reservations_rate_plan" ON "public"."reservations" USING "btree" ("rate_plan_id") WHERE ("rate_plan_id" IS NOT NULL);



CREATE INDEX "idx_reservations_source_created_at" ON "public"."reservations" USING "btree" ("source_created_at" DESC) WHERE ("source_created_at" IS NOT NULL);



CREATE INDEX "idx_reservations_status" ON "public"."reservations" USING "btree" ("status");



CREATE INDEX "idx_reservations_staysnet_client_id" ON "public"."reservations" USING "btree" ("staysnet_client_id") WHERE ("staysnet_client_id" IS NOT NULL);



CREATE INDEX "idx_reservations_staysnet_listing_id" ON "public"."reservations" USING "btree" ("staysnet_listing_id") WHERE ("staysnet_listing_id" IS NOT NULL);



CREATE INDEX "idx_reservations_staysnet_partner_code" ON "public"."reservations" USING "btree" ("staysnet_partner_code") WHERE ("staysnet_partner_code" IS NOT NULL);



CREATE INDEX "idx_room_photos_room_id" ON "public"."room_photos" USING "btree" ("room_id");



CREATE INDEX "idx_rooms_accommodation_id" ON "public"."rooms" USING "btree" ("accommodation_id");



CREATE INDEX "idx_sales_deal_activities_deal" ON "public"."sales_deal_activities" USING "btree" ("deal_id");



CREATE INDEX "idx_sales_deals_crm_company" ON "public"."sales_deals" USING "btree" ("crm_company_id") WHERE ("crm_company_id" IS NOT NULL);



CREATE INDEX "idx_sales_deals_crm_contact" ON "public"."sales_deals" USING "btree" ("crm_contact_id") WHERE ("crm_contact_id" IS NOT NULL);



CREATE INDEX "idx_sales_deals_funnel" ON "public"."sales_deals" USING "btree" ("funnel_id");



CREATE INDEX "idx_sales_deals_lost_reason" ON "public"."sales_deals" USING "btree" ("lost_reason_id") WHERE ("lost_reason_id" IS NOT NULL);



CREATE INDEX "idx_sales_deals_org" ON "public"."sales_deals" USING "btree" ("organization_id");



CREATE INDEX "idx_sales_deals_owner" ON "public"."sales_deals" USING "btree" ("owner_id");



CREATE INDEX "idx_sales_deals_stage" ON "public"."sales_deals" USING "btree" ("stage_id");



CREATE INDEX "idx_sales_deals_status" ON "public"."sales_deals" USING "btree" ("status");



CREATE INDEX "idx_sales_funnel_stages_funnel" ON "public"."sales_funnel_stages" USING "btree" ("funnel_id");



CREATE INDEX "idx_sales_funnel_stages_order" ON "public"."sales_funnel_stages" USING "btree" ("funnel_id", "order");



CREATE INDEX "idx_sales_funnels_org" ON "public"."sales_funnels" USING "btree" ("organization_id");



CREATE INDEX "idx_saved_payment_methods_contact" ON "public"."saved_payment_methods" USING "btree" ("crm_contact_id");



CREATE INDEX "idx_saved_payment_methods_default" ON "public"."saved_payment_methods" USING "btree" ("crm_contact_id", "is_default") WHERE ("is_default" = true);



CREATE INDEX "idx_saved_payment_methods_org" ON "public"."saved_payment_methods" USING "btree" ("organization_id");



CREATE INDEX "idx_service_funnel_stages_funnel" ON "public"."service_funnel_stages" USING "btree" ("funnel_id");



CREATE INDEX "idx_service_funnel_stages_order" ON "public"."service_funnel_stages" USING "btree" ("funnel_id", "order");



CREATE INDEX "idx_service_funnels_org" ON "public"."service_funnels" USING "btree" ("organization_id");



CREATE INDEX "idx_service_ticket_activities_ticket" ON "public"."service_ticket_activities" USING "btree" ("ticket_id");



CREATE INDEX "idx_service_tickets_assignee" ON "public"."service_tickets" USING "btree" ("assignee_id");



CREATE INDEX "idx_service_tickets_funnel" ON "public"."service_tickets" USING "btree" ("funnel_id");



CREATE INDEX "idx_service_tickets_org" ON "public"."service_tickets" USING "btree" ("organization_id");



CREATE INDEX "idx_service_tickets_property" ON "public"."service_tickets" USING "btree" ("property_id");



CREATE INDEX "idx_service_tickets_reservation" ON "public"."service_tickets" USING "btree" ("reservation_id");



CREATE INDEX "idx_service_tickets_stage" ON "public"."service_tickets" USING "btree" ("stage_id");



CREATE INDEX "idx_service_tickets_status" ON "public"."service_tickets" USING "btree" ("status");



CREATE INDEX "idx_service_tickets_unresolved_reason" ON "public"."service_tickets" USING "btree" ("unresolved_reason_id") WHERE ("unresolved_reason_id" IS NOT NULL);



CREATE INDEX "idx_sessions_access_expires_at" ON "public"."sessions" USING "btree" ("access_expires_at") WHERE ("access_expires_at" IS NOT NULL);



CREATE INDEX "idx_sessions_access_token" ON "public"."sessions" USING "btree" ("access_token") WHERE ("access_token" IS NOT NULL);



CREATE UNIQUE INDEX "idx_sessions_access_token_unique" ON "public"."sessions" USING "btree" ("access_token") WHERE ("access_token" IS NOT NULL);



CREATE INDEX "idx_sessions_expires_at" ON "public"."sessions" USING "btree" ("expires_at");



CREATE INDEX "idx_sessions_organization_id" ON "public"."sessions" USING "btree" ("organization_id");



CREATE INDEX "idx_sessions_refresh_expires_at" ON "public"."sessions" USING "btree" ("refresh_expires_at") WHERE ("refresh_expires_at" IS NOT NULL);



CREATE INDEX "idx_sessions_refresh_token" ON "public"."sessions" USING "btree" ("refresh_token") WHERE ("refresh_token" IS NOT NULL);



CREATE INDEX "idx_sessions_revoked_at" ON "public"."sessions" USING "btree" ("revoked_at") WHERE ("revoked_at" IS NOT NULL);



CREATE INDEX "idx_sessions_token" ON "public"."sessions" USING "btree" ("token");



CREATE INDEX "idx_sessions_user_id" ON "public"."sessions" USING "btree" ("user_id");



CREATE INDEX "idx_short_ids_organization_id" ON "public"."short_ids" USING "btree" ("organization_id");



CREATE INDEX "idx_short_ids_resource" ON "public"."short_ids" USING "btree" ("resource_type", "resource_id");



CREATE INDEX "idx_short_ids_short_id" ON "public"."short_ids" USING "btree" ("short_id");



CREATE INDEX "idx_staysnet_config_enabled" ON "public"."staysnet_config" USING "btree" ("enabled");



CREATE INDEX "idx_staysnet_config_org" ON "public"."staysnet_config" USING "btree" ("organization_id");



CREATE INDEX "idx_staysnet_config_scope" ON "public"."staysnet_config" USING "btree" ("scope");



CREATE INDEX "idx_staysnet_properties_cache_data_gin" ON "public"."staysnet_properties_cache" USING "gin" ("property_data");



CREATE INDEX "idx_staysnet_properties_cache_org" ON "public"."staysnet_properties_cache" USING "btree" ("organization_id");



CREATE INDEX "idx_staysnet_properties_cache_staysnet_id" ON "public"."staysnet_properties_cache" USING "btree" ("staysnet_property_id");



CREATE INDEX "idx_staysnet_properties_cache_synced" ON "public"."staysnet_properties_cache" USING "btree" ("synced_at" DESC);



CREATE INDEX "idx_staysnet_reservations_cache_data_gin" ON "public"."staysnet_reservations_cache" USING "gin" ("reservation_data");



CREATE INDEX "idx_staysnet_reservations_cache_org" ON "public"."staysnet_reservations_cache" USING "btree" ("organization_id");



CREATE INDEX "idx_staysnet_reservations_cache_staysnet_id" ON "public"."staysnet_reservations_cache" USING "btree" ("staysnet_reservation_id");



CREATE INDEX "idx_staysnet_reservations_cache_synced" ON "public"."staysnet_reservations_cache" USING "btree" ("synced_at" DESC);



CREATE INDEX "idx_staysnet_sync_log_org" ON "public"."staysnet_sync_log" USING "btree" ("organization_id");



CREATE INDEX "idx_staysnet_sync_log_started" ON "public"."staysnet_sync_log" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_staysnet_sync_log_status" ON "public"."staysnet_sync_log" USING "btree" ("status");



CREATE INDEX "idx_staysnet_sync_log_type" ON "public"."staysnet_sync_log" USING "btree" ("sync_type");



CREATE INDEX "idx_staysnet_webhooks_action" ON "public"."staysnet_webhooks" USING "btree" ("action");



CREATE INDEX "idx_staysnet_webhooks_org" ON "public"."staysnet_webhooks" USING "btree" ("organization_id");



CREATE INDEX "idx_staysnet_webhooks_payload_gin" ON "public"."staysnet_webhooks" USING "gin" ("payload");



CREATE INDEX "idx_staysnet_webhooks_processed" ON "public"."staysnet_webhooks" USING "btree" ("processed");



CREATE INDEX "idx_staysnet_webhooks_received" ON "public"."staysnet_webhooks" USING "btree" ("received_at" DESC);



CREATE INDEX "idx_staysnet_webhooks_retry" ON "public"."staysnet_webhooks" USING "btree" ("retry_count", "processed_at") WHERE ("error_message" IS NOT NULL);



CREATE INDEX "idx_stripe_checkout_sessions_org_created" ON "public"."stripe_checkout_sessions" USING "btree" ("organization_id", "created_at" DESC);



CREATE INDEX "idx_stripe_checkout_sessions_org_reservation" ON "public"."stripe_checkout_sessions" USING "btree" ("organization_id", "reservation_id");



CREATE INDEX "idx_stripe_configs_org" ON "public"."stripe_configs" USING "btree" ("organization_id");



CREATE INDEX "idx_stripe_webhook_events_org_received" ON "public"."stripe_webhook_events" USING "btree" ("organization_id", "received_at" DESC);



CREATE INDEX "idx_stripe_webhook_events_processed" ON "public"."stripe_webhook_events" USING "btree" ("processed", "received_at" DESC);



CREATE INDEX "idx_sync_logs_created" ON "public"."ota_sync_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_sync_logs_org" ON "public"."ota_sync_logs" USING "btree" ("organization_id");



CREATE INDEX "idx_sync_logs_ota" ON "public"."ota_sync_logs" USING "btree" ("ota");



CREATE INDEX "idx_sync_logs_property" ON "public"."ota_sync_logs" USING "btree" ("property_id");



CREATE INDEX "idx_sync_logs_status" ON "public"."ota_sync_logs" USING "btree" ("status");



CREATE INDEX "idx_sync_logs_type" ON "public"."ota_sync_logs" USING "btree" ("sync_type");



CREATE INDEX "idx_task_activities_created" ON "public"."task_activities" USING "btree" ("created_at");



CREATE INDEX "idx_task_activities_task_id" ON "public"."task_activities" USING "btree" ("task_id");



CREATE INDEX "idx_task_activities_type" ON "public"."task_activities" USING "btree" ("activity_type");



CREATE INDEX "idx_task_comments_parent" ON "public"."task_comments" USING "btree" ("parent_comment_id");



CREATE INDEX "idx_task_comments_task_id" ON "public"."task_comments" USING "btree" ("task_id");



CREATE INDEX "idx_task_comments_user_id" ON "public"."task_comments" USING "btree" ("user_id");



CREATE INDEX "idx_task_dependencies_depends_on" ON "public"."task_dependencies" USING "btree" ("depends_on_task_id");



CREATE INDEX "idx_task_dependencies_task_id" ON "public"."task_dependencies" USING "btree" ("task_id");



CREATE INDEX "idx_team_members_team_id" ON "public"."team_members" USING "btree" ("team_id");



CREATE INDEX "idx_team_members_user_id" ON "public"."team_members" USING "btree" ("user_id");



CREATE INDEX "idx_teams_is_active" ON "public"."teams" USING "btree" ("is_active");



CREATE INDEX "idx_teams_organization_id" ON "public"."teams" USING "btree" ("organization_id");



CREATE INDEX "idx_user_invitations_email" ON "public"."user_invitations" USING "btree" ("email");



CREATE INDEX "idx_user_invitations_organization_id" ON "public"."user_invitations" USING "btree" ("organization_id");



CREATE INDEX "idx_user_invitations_owner_id" ON "public"."user_invitations" USING "btree" ("owner_id");



CREATE INDEX "idx_user_invitations_status" ON "public"."user_invitations" USING "btree" ("status");



CREATE INDEX "idx_user_invitations_token" ON "public"."user_invitations" USING "btree" ("token");



CREATE INDEX "idx_users_organization_id" ON "public"."users" USING "btree" ("organization_id");



CREATE INDEX "idx_users_owner_id" ON "public"."users" USING "btree" ("owner_id");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE INDEX "idx_users_type" ON "public"."users" USING "btree" ("type");



CREATE INDEX "idx_users_username" ON "public"."users" USING "btree" ("username");



CREATE INDEX "idx_versions_anuncio" ON "public"."anuncios_versions" USING "btree" ("anuncio_id", "version_number" DESC);



CREATE INDEX "idx_virtual_cards_org" ON "public"."virtual_cards" USING "btree" ("organization_id");



CREATE INDEX "idx_virtual_cards_ota" ON "public"."virtual_cards" USING "btree" ("ota");



CREATE INDEX "idx_virtual_cards_reservation" ON "public"."virtual_cards" USING "btree" ("reservation_id");



CREATE INDEX "idx_virtual_cards_status" ON "public"."virtual_cards" USING "btree" ("status");



CREATE INDEX "kv_store_67caf26a_key_idx" ON "public"."kv_store_67caf26a" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_67caf26a_key_idx1" ON "public"."kv_store_67caf26a" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_67caf26a_key_idx10" ON "public"."kv_store_67caf26a" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_67caf26a_key_idx11" ON "public"."kv_store_67caf26a" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_67caf26a_key_idx12" ON "public"."kv_store_67caf26a" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_67caf26a_key_idx2" ON "public"."kv_store_67caf26a" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_67caf26a_key_idx3" ON "public"."kv_store_67caf26a" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_67caf26a_key_idx4" ON "public"."kv_store_67caf26a" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_67caf26a_key_idx5" ON "public"."kv_store_67caf26a" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_67caf26a_key_idx6" ON "public"."kv_store_67caf26a" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_67caf26a_key_idx7" ON "public"."kv_store_67caf26a" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_67caf26a_key_idx8" ON "public"."kv_store_67caf26a" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_67caf26a_key_idx9" ON "public"."kv_store_67caf26a" USING "btree" ("key" "text_pattern_ops");



CREATE UNIQUE INDEX "listing_settings_org_listing_unique" ON "public"."listing_settings" USING "btree" ("organization_id", "listing_id");



CREATE UNIQUE INDEX "organization_settings_org_unique" ON "public"."organization_settings" USING "btree" ("organization_id");



CREATE INDEX "properties_stays_property_idx" ON "public"."properties" USING "btree" (((("data" -> 'externalIds'::"text") ->> 'stays_property_id'::"text"))) WHERE ((("data" -> 'externalIds'::"text") ->> 'stays_property_id'::"text") IS NOT NULL);



CREATE UNIQUE INDEX "properties_stays_property_uidx" ON "public"."properties" USING "btree" (((("data" -> 'externalIds'::"text") ->> 'stays_property_id'::"text"))) WHERE ((("data" -> 'externalIds'::"text") ->> 'stays_property_id'::"text") IS NOT NULL);



CREATE INDEX "staysnet_import_issues_listing" ON "public"."staysnet_import_issues" USING "btree" ("organization_id", "listing_id");



CREATE INDEX "staysnet_import_issues_org_status" ON "public"."staysnet_import_issues" USING "btree" ("organization_id", "status", "created_at" DESC);



CREATE UNIQUE INDEX "staysnet_import_issues_unique_external" ON "public"."staysnet_import_issues" USING "btree" ("organization_id", "platform", "entity_type", "issue_type", "external_id") WHERE ("external_id" IS NOT NULL);



CREATE UNIQUE INDEX "staysnet_raw_objects_dedupe_idx" ON "public"."staysnet_raw_objects" USING "btree" ("organization_id", "domain", "external_id", "payload_hash");



CREATE INDEX "staysnet_raw_objects_external_id_idx" ON "public"."staysnet_raw_objects" USING "btree" ("organization_id", "domain", "external_id");



CREATE INDEX "staysnet_raw_objects_org_domain_idx" ON "public"."staysnet_raw_objects" USING "btree" ("organization_id", "domain");



CREATE UNIQUE INDEX "stripe_checkout_sessions_unique_cs" ON "public"."stripe_checkout_sessions" USING "btree" ("checkout_session_id");



CREATE UNIQUE INDEX "stripe_webhook_events_unique_evt" ON "public"."stripe_webhook_events" USING "btree" ("stripe_event_id");



CREATE UNIQUE INDEX "uidx_guests_org_staysnet_client_id" ON "public"."guests" USING "btree" ("organization_id", "staysnet_client_id") WHERE ("staysnet_client_id" IS NOT NULL);



CREATE UNIQUE INDEX "uniq_reservations_org_platform_external_id" ON "public"."reservations" USING "btree" ("organization_id", "platform", "external_id");



CREATE OR REPLACE TRIGGER "calculate_payment_net_amount_trigger" BEFORE INSERT OR UPDATE OF "amount", "gateway_fee", "ota_fee" ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_payment_net_amount"();



CREATE OR REPLACE TRIGGER "client_sites_updated_at" BEFORE UPDATE ON "public"."client_sites" FOR EACH ROW EXECUTE FUNCTION "public"."update_client_sites_updated_at"();



CREATE OR REPLACE TRIGGER "log_reservation_changes_trigger" AFTER UPDATE ON "public"."reservations" FOR EACH ROW EXECUTE FUNCTION "public"."log_reservation_changes"();



CREATE OR REPLACE TRIGGER "notifications_updated_at_trigger" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_notifications_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp" BEFORE UPDATE ON "public"."properties" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_timestamp_drafts" BEFORE UPDATE ON "public"."properties" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_timestamp_owners" BEFORE UPDATE ON "public"."owners" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "trg_ai_provider_configs_updated_at" BEFORE UPDATE ON "public"."ai_provider_configs" FOR EACH ROW EXECUTE FUNCTION "public"."update_ai_provider_configs_updated_at"();



CREATE OR REPLACE TRIGGER "trg_automations_updated_at" BEFORE UPDATE ON "public"."automations" FOR EACH ROW EXECUTE FUNCTION "public"."update_automations_updated_at"();



CREATE OR REPLACE TRIGGER "trg_cancel_tasks_on_reservation_cancel" AFTER UPDATE OF "status" ON "public"."reservations" FOR EACH ROW WHEN ((("new"."status")::"text" = 'cancelled'::"text")) EXECUTE FUNCTION "public"."cancel_operational_tasks_on_reservation_cancel"();



CREATE OR REPLACE TRIGGER "trg_create_standard_rate_plan" AFTER INSERT ON "public"."properties" FOR EACH ROW EXECUTE FUNCTION "public"."create_standard_rate_plan_for_property"();



CREATE OR REPLACE TRIGGER "trg_crm_templates_updated_at" BEFORE UPDATE ON "public"."crm_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_crm_templates_updated_at"();



CREATE OR REPLACE TRIGGER "trg_enforce_reservation_property_link" BEFORE INSERT OR UPDATE ON "public"."reservations" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_reservation_property_link"();



CREATE OR REPLACE TRIGGER "trg_ensure_single_active_ai_config" BEFORE INSERT OR UPDATE ON "public"."ai_provider_configs" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_single_active_ai_config"();



CREATE OR REPLACE TRIGGER "trg_generate_operational_tasks_on_reservation" AFTER INSERT ON "public"."reservations" FOR EACH ROW EXECUTE FUNCTION "public"."generate_operational_tasks_from_reservation"();



CREATE OR REPLACE TRIGGER "trg_marketplace_msg_update_conv" AFTER INSERT ON "public"."re_marketplace_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_marketplace_conversation_last_message"();



CREATE OR REPLACE TRIGGER "trg_prevent_properties_staysnet_placeholder" BEFORE INSERT OR UPDATE ON "public"."properties" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_properties_staysnet_placeholder"();



CREATE OR REPLACE TRIGGER "trg_property_channel_settings_updated_at" BEFORE UPDATE ON "public"."property_channel_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_property_channel_settings_updated_at"();



CREATE OR REPLACE TRIGGER "trg_property_rooms_updated_at" BEFORE UPDATE ON "public"."property_rooms" FOR EACH ROW EXECUTE FUNCTION "public"."update_property_rooms_updated_at"();



CREATE OR REPLACE TRIGGER "trg_reservation_history" AFTER INSERT OR UPDATE ON "public"."reservations" FOR EACH ROW EXECUTE FUNCTION "public"."log_reservation_change"();



COMMENT ON TRIGGER "trg_reservation_history" ON "public"."reservations" IS '[OTA-UNIVERSAL] Auto-log de todas as mudanças';



CREATE OR REPLACE TRIGGER "trg_set_updated_at_staysnet_import_issues" BEFORE UPDATE ON "public"."staysnet_import_issues" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_staysnet_import_issues"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_stripe_checkout_sessions" BEFORE UPDATE ON "public"."stripe_checkout_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_stripe_checkout_sessions"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_stripe_configs" BEFORE UPDATE ON "public"."stripe_configs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_stripe_configs"();



CREATE OR REPLACE TRIGGER "trg_update_project_progress" AFTER INSERT OR DELETE OR UPDATE ON "public"."crm_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_project_progress"();



CREATE OR REPLACE TRIGGER "trg_update_tasks_on_reservation_change" AFTER UPDATE OF "check_in", "check_out" ON "public"."reservations" FOR EACH ROW EXECUTE FUNCTION "public"."update_operational_tasks_on_reservation_change"();



CREATE OR REPLACE TRIGGER "trigger_ai_agent_unidades_updated_at" BEFORE UPDATE ON "public"."ai_agent_unidades" FOR EACH ROW EXECUTE FUNCTION "public"."update_ai_agent_unidades_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_channel_contacts_updated_at" BEFORE UPDATE ON "public"."channel_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_channel_contacts_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_channel_instances_updated_at" BEFORE UPDATE ON "public"."channel_instances" FOR EACH ROW EXECUTE FUNCTION "public"."update_channel_instances_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_chat_channel_configs_updated_at" BEFORE UPDATE ON "public"."chat_channel_configs" FOR EACH ROW EXECUTE FUNCTION "public"."update_chat_channel_configs_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_chat_conversations_updated_at" BEFORE UPDATE ON "public"."chat_conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_chat_conversations_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_check_owner_user_limit" BEFORE INSERT ON "public"."owner_users" FOR EACH ROW EXECUTE FUNCTION "public"."check_owner_user_limit"();



CREATE OR REPLACE TRIGGER "trigger_crm_card_items_updated_at" BEFORE UPDATE ON "public"."crm_card_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_crm_card_items_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_crm_companies_updated_at" BEFORE UPDATE ON "public"."crm_companies" FOR EACH ROW EXECUTE FUNCTION "public"."update_crm_companies_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_crm_contacts_updated_at" BEFORE UPDATE ON "public"."crm_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_crm_contacts_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_crm_lost_reasons_updated_at" BEFORE UPDATE ON "public"."crm_lost_reasons" FOR EACH ROW EXECUTE FUNCTION "public"."update_crm_lost_reasons_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_crm_notes_updated_at" BEFORE UPDATE ON "public"."crm_notes" FOR EACH ROW EXECUTE FUNCTION "public"."update_crm_notes_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_crm_products_services_updated_at" BEFORE UPDATE ON "public"."crm_products_services" FOR EACH ROW EXECUTE FUNCTION "public"."update_crm_products_services_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_deal_contact_or_company" BEFORE INSERT OR UPDATE ON "public"."sales_deals" FOR EACH ROW EXECUTE FUNCTION "public"."check_deal_has_contact_or_company"();



CREATE OR REPLACE TRIGGER "trigger_guest_users_updated_at" BEFORE UPDATE ON "public"."guest_users" FOR EACH ROW EXECUTE FUNCTION "public"."update_guest_users_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_predetermined_funnels_updated_at" BEFORE UPDATE ON "public"."predetermined_funnels" FOR EACH ROW EXECUTE FUNCTION "public"."update_predetermined_funnels_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_predetermined_items_updated_at" BEFORE UPDATE ON "public"."predetermined_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_predetermined_items_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_sales_deals_lost_reason_usage" AFTER UPDATE OF "lost_reason_id" ON "public"."sales_deals" FOR EACH ROW EXECUTE FUNCTION "public"."update_lost_reason_usage"();



CREATE OR REPLACE TRIGGER "trigger_sales_deals_updated_at" BEFORE UPDATE ON "public"."sales_deals" FOR EACH ROW EXECUTE FUNCTION "public"."update_sales_deals_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_sales_funnels_updated_at" BEFORE UPDATE ON "public"."sales_funnels" FOR EACH ROW EXECUTE FUNCTION "public"."update_sales_funnels_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_service_funnels_updated_at" BEFORE UPDATE ON "public"."service_funnels" FOR EACH ROW EXECUTE FUNCTION "public"."update_service_funnels_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_service_tickets_updated_at" BEFORE UPDATE ON "public"."service_tickets" FOR EACH ROW EXECUTE FUNCTION "public"."update_service_tickets_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_campo_mapping_updated_at" BEFORE UPDATE ON "public"."financeiro_campo_plano_contas_mapping" FOR EACH ROW EXECUTE FUNCTION "public"."update_campo_mapping_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_conversation_on_new_message" AFTER INSERT ON "public"."chat_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_on_new_message"();



CREATE OR REPLACE TRIGGER "trigger_update_conversations_updated_at" BEFORE UPDATE ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversations_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_financeiro_categorias_updated_at" BEFORE UPDATE ON "public"."financeiro_categorias" FOR EACH ROW EXECUTE FUNCTION "public"."update_financeiro_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_financeiro_centro_custos_updated_at" BEFORE UPDATE ON "public"."financeiro_centro_custos" FOR EACH ROW EXECUTE FUNCTION "public"."update_financeiro_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_financeiro_contas_bancarias_updated_at" BEFORE UPDATE ON "public"."financeiro_contas_bancarias" FOR EACH ROW EXECUTE FUNCTION "public"."update_financeiro_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_financeiro_lancamentos_updated_at" BEFORE UPDATE ON "public"."financeiro_lancamentos" FOR EACH ROW EXECUTE FUNCTION "public"."update_financeiro_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_financeiro_regras_conciliacao_updated_at" BEFORE UPDATE ON "public"."financeiro_regras_conciliacao" FOR EACH ROW EXECUTE FUNCTION "public"."update_financeiro_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_financeiro_titulos_updated_at" BEFORE UPDATE ON "public"."financeiro_titulos" FOR EACH ROW EXECUTE FUNCTION "public"."update_financeiro_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_kv_store_updated_at" BEFORE UPDATE ON "public"."kv_store_67caf26a" FOR EACH ROW EXECUTE FUNCTION "public"."update_kv_store_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_messages_updated_at" BEFORE UPDATE ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_messages_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_owner_users_updated_at" BEFORE UPDATE ON "public"."owner_users" FOR EACH ROW EXECUTE FUNCTION "public"."update_owner_users_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_reservations_updated_at" BEFORE UPDATE ON "public"."reservations" FOR EACH ROW EXECUTE FUNCTION "public"."update_reservations_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_staysnet_config_updated_at" BEFORE UPDATE ON "public"."staysnet_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_staysnet_config_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_validate_categoria_parent_org" BEFORE INSERT OR UPDATE ON "public"."financeiro_categorias" FOR EACH ROW EXECUTE FUNCTION "public"."validate_categoria_parent_org"();



CREATE OR REPLACE TRIGGER "update_billing_contacts_updated_at" BEFORE UPDATE ON "public"."billing_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_cancellation_policy_updated_at" BEFORE UPDATE ON "public"."cancellation_policy_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_canonical_amenities_updated_at" BEFORE UPDATE ON "public"."canonical_amenities" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_channex_accounts_updated_at" BEFORE UPDATE ON "public"."channex_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "update_channex_channel_connections_updated_at" BEFORE UPDATE ON "public"."channex_channel_connections" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "update_channex_property_mappings_updated_at" BEFORE UPDATE ON "public"."channex_property_mappings" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "update_listing_settings_updated_at" BEFORE UPDATE ON "public"."listing_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organization_settings_updated_at" BEFORE UPDATE ON "public"."organization_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ota_amenity_mappings_updated_at" BEFORE UPDATE ON "public"."ota_amenity_mappings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ota_credentials_updated_at" BEFORE UPDATE ON "public"."ota_api_credentials" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ota_webhooks_updated_at" BEFORE UPDATE ON "public"."ota_webhooks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_pagarme_configs_updated_at" BEFORE UPDATE ON "public"."pagarme_configs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payment_sessions_updated_at" BEFORE UPDATE ON "public"."payment_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payments_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_properties_drafts_updated_at" BEFORE UPDATE ON "public"."properties_drafts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_property_ota_ext_updated_at" BEFORE UPDATE ON "public"."property_ota_extensions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_rate_plans_updated_at" BEFORE UPDATE ON "public"."rate_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_rate_plan_updated_at"();



CREATE OR REPLACE TRIGGER "update_refunds_updated_at" BEFORE UPDATE ON "public"."refunds" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_reservation_rooms_updated_at" BEFORE UPDATE ON "public"."reservation_rooms" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_virtual_cards_updated_at" BEFORE UPDATE ON "public"."virtual_cards" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_webhook_stats_trigger" AFTER INSERT ON "public"."ota_webhooks" FOR EACH ROW EXECUTE FUNCTION "public"."update_webhook_subscription_stats"();



ALTER TABLE ONLY "public"."accommodation_rules"
    ADD CONSTRAINT "accommodation_rules_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."accommodation_rules"
    ADD CONSTRAINT "accommodation_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_agent_construtoras"
    ADD CONSTRAINT "ai_agent_construtoras_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_agent_empreendimentos"
    ADD CONSTRAINT "ai_agent_empreendimentos_construtora_id_fkey" FOREIGN KEY ("construtora_id") REFERENCES "public"."ai_agent_construtoras"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_agent_empreendimentos"
    ADD CONSTRAINT "ai_agent_empreendimentos_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_agent_unidades"
    ADD CONSTRAINT "ai_agent_unidades_construtora_id_fkey" FOREIGN KEY ("construtora_id") REFERENCES "public"."ai_agent_construtoras"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_agent_unidades"
    ADD CONSTRAINT "ai_agent_unidades_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "public"."ai_agent_empreendimentos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_agent_unidades"
    ADD CONSTRAINT "ai_agent_unidades_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_provider_configs"
    ADD CONSTRAINT "ai_provider_configs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."anuncios_published"
    ADD CONSTRAINT "anuncios_published_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "public"."properties"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."automation_executions"
    ADD CONSTRAINT "automation_executions_automation_id_fkey" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."automation_executions"
    ADD CONSTRAINT "automation_executions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."automations"
    ADD CONSTRAINT "automations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."beds"
    ADD CONSTRAINT "beds_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_contacts"
    ADD CONSTRAINT "billing_contacts_crm_contact_id_fkey" FOREIGN KEY ("crm_contact_id") REFERENCES "public"."crm_contacts"("id");



ALTER TABLE ONLY "public"."billing_contacts"
    ADD CONSTRAINT "billing_contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_contacts"
    ADD CONSTRAINT "billing_contacts_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blocks"
    ADD CONSTRAINT "blocks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_pricing_rules"
    ADD CONSTRAINT "calendar_pricing_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."calendar_pricing_rules"
    ADD CONSTRAINT "calendar_pricing_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cancellation_policy_templates"
    ADD CONSTRAINT "cancellation_policy_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."canonical_property_types"
    ADD CONSTRAINT "canonical_property_types_parent_type_fkey" FOREIGN KEY ("parent_type") REFERENCES "public"."canonical_property_types"("id");



ALTER TABLE ONLY "public"."channel_contacts"
    ADD CONSTRAINT "channel_contacts_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."channel_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channel_contacts"
    ADD CONSTRAINT "channel_contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channel_instances"
    ADD CONSTRAINT "channel_instances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channex_accounts"
    ADD CONSTRAINT "channex_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channex_channel_connections"
    ADD CONSTRAINT "channex_channel_connections_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."channex_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channex_listing_connections"
    ADD CONSTRAINT "channex_listing_connections_channel_connection_id_fkey" FOREIGN KEY ("channel_connection_id") REFERENCES "public"."channex_channel_connections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channex_listing_connections"
    ADD CONSTRAINT "channex_listing_connections_property_mapping_id_fkey" FOREIGN KEY ("property_mapping_id") REFERENCES "public"."channex_property_mappings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channex_property_mappings"
    ADD CONSTRAINT "channex_property_mappings_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."channex_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channex_property_mappings"
    ADD CONSTRAINT "channex_property_mappings_rendizy_property_id_fkey" FOREIGN KEY ("rendizy_property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channex_rate_plan_mappings"
    ADD CONSTRAINT "channex_rate_plan_mappings_rendizy_rate_plan_id_fkey" FOREIGN KEY ("rendizy_rate_plan_id") REFERENCES "public"."rate_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channex_rate_plan_mappings"
    ADD CONSTRAINT "channex_rate_plan_mappings_room_type_mapping_id_fkey" FOREIGN KEY ("room_type_mapping_id") REFERENCES "public"."channex_room_type_mappings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channex_room_type_mappings"
    ADD CONSTRAINT "channex_room_type_mappings_property_mapping_id_fkey" FOREIGN KEY ("property_mapping_id") REFERENCES "public"."channex_property_mappings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channex_room_type_mappings"
    ADD CONSTRAINT "channex_room_type_mappings_rendizy_room_id_fkey" FOREIGN KEY ("rendizy_room_id") REFERENCES "public"."property_rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channex_webhook_logs"
    ADD CONSTRAINT "channex_webhook_logs_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."channex_accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."channex_webhook_logs"
    ADD CONSTRAINT "channex_webhook_logs_property_mapping_id_fkey" FOREIGN KEY ("property_mapping_id") REFERENCES "public"."channex_property_mappings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."channex_webhooks"
    ADD CONSTRAINT "channex_webhooks_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."channex_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channex_webhooks"
    ADD CONSTRAINT "channex_webhooks_property_mapping_id_fkey" FOREIGN KEY ("property_mapping_id") REFERENCES "public"."channex_property_mappings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chat_channel_configs"
    ADD CONSTRAINT "chat_channel_configs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_channels_config"
    ADD CONSTRAINT "chat_channels_config_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_contacts"
    ADD CONSTRAINT "chat_contacts_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chat_contacts"
    ADD CONSTRAINT "chat_contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_conversations"
    ADD CONSTRAINT "chat_conversations_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chat_conversations"
    ADD CONSTRAINT "chat_conversations_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chat_conversations"
    ADD CONSTRAINT "chat_conversations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_conversations"
    ADD CONSTRAINT "chat_conversations_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chat_conversations"
    ADD CONSTRAINT "chat_conversations_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chat_message_templates"
    ADD CONSTRAINT "chat_message_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chat_webhooks"
    ADD CONSTRAINT "chat_webhooks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_sites"
    ADD CONSTRAINT "client_sites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."corporate_payment_configs"
    ADD CONSTRAINT "corporate_payment_configs_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_card_items"
    ADD CONSTRAINT "crm_card_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."crm_card_items"
    ADD CONSTRAINT "crm_card_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_card_items"
    ADD CONSTRAINT "crm_card_items_predetermined_item_id_fkey" FOREIGN KEY ("predetermined_item_id") REFERENCES "public"."predetermined_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_card_items"
    ADD CONSTRAINT "crm_card_items_product_service_id_fkey" FOREIGN KEY ("product_service_id") REFERENCES "public"."crm_products_services"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."crm_card_items"
    ADD CONSTRAINT "crm_card_items_sales_deal_id_fkey" FOREIGN KEY ("sales_deal_id") REFERENCES "public"."sales_deals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_card_items"
    ADD CONSTRAINT "crm_card_items_service_ticket_id_fkey" FOREIGN KEY ("service_ticket_id") REFERENCES "public"."service_tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_companies"
    ADD CONSTRAINT "crm_companies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."crm_companies"
    ADD CONSTRAINT "crm_companies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_companies"
    ADD CONSTRAINT "crm_companies_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."crm_contacts"
    ADD CONSTRAINT "crm_contacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."crm_companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."crm_contacts"
    ADD CONSTRAINT "crm_contacts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."crm_contacts"
    ADD CONSTRAINT "crm_contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_contacts"
    ADD CONSTRAINT "crm_contacts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."crm_contacts"
    ADD CONSTRAINT "crm_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."crm_lost_reasons"
    ADD CONSTRAINT "crm_lost_reasons_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."crm_lost_reasons"
    ADD CONSTRAINT "crm_lost_reasons_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_notes"
    ADD CONSTRAINT "crm_notes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."crm_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_notes"
    ADD CONSTRAINT "crm_notes_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_notes"
    ADD CONSTRAINT "crm_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."crm_notes"
    ADD CONSTRAINT "crm_notes_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "public"."sales_deals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_notes"
    ADD CONSTRAINT "crm_notes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_notes"
    ADD CONSTRAINT "crm_notes_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."service_tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_products_services"
    ADD CONSTRAINT "crm_products_services_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."crm_products_services"
    ADD CONSTRAINT "crm_products_services_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_projects"
    ADD CONSTRAINT "crm_projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."crm_projects"
    ADD CONSTRAINT "crm_projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_projects"
    ADD CONSTRAINT "crm_projects_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."crm_projects"("id");



ALTER TABLE ONLY "public"."crm_tasks"
    ADD CONSTRAINT "crm_tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."crm_tasks"
    ADD CONSTRAINT "crm_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."crm_tasks"
    ADD CONSTRAINT "crm_tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_tasks"
    ADD CONSTRAINT "crm_tasks_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."crm_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_tasks"
    ADD CONSTRAINT "crm_tasks_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."crm_tasks"
    ADD CONSTRAINT "crm_tasks_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."crm_templates"
    ADD CONSTRAINT "crm_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_templates"
    ADD CONSTRAINT "crm_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."custom_field_values"
    ADD CONSTRAINT "custom_field_values_custom_field_id_fkey" FOREIGN KEY ("custom_field_id") REFERENCES "public"."custom_fields"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."custom_fields"
    ADD CONSTRAINT "custom_fields_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."custom_min_nights"
    ADD CONSTRAINT "custom_min_nights_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."custom_prices"
    ADD CONSTRAINT "custom_prices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deposit_schedules"
    ADD CONSTRAINT "deposit_schedules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deposit_schedules"
    ADD CONSTRAINT "deposit_schedules_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deposit_schedules"
    ADD CONSTRAINT "deposit_schedules_rate_plan_id_fkey" FOREIGN KEY ("rate_plan_id") REFERENCES "public"."rate_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financeiro_campo_plano_contas_mapping"
    ADD CONSTRAINT "financeiro_campo_plano_contas_mapping_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."financeiro_categorias"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."financeiro_campo_plano_contas_mapping"
    ADD CONSTRAINT "financeiro_campo_plano_contas_mapping_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financeiro_categorias"
    ADD CONSTRAINT "financeiro_categorias_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financeiro_categorias"
    ADD CONSTRAINT "financeiro_categorias_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."financeiro_categorias"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financeiro_centro_custos"
    ADD CONSTRAINT "financeiro_centro_custos_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financeiro_contas_bancarias"
    ADD CONSTRAINT "financeiro_contas_bancarias_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financeiro_lancamentos"
    ADD CONSTRAINT "financeiro_lancamentos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."financeiro_categorias"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."financeiro_lancamentos"
    ADD CONSTRAINT "financeiro_lancamentos_centro_custo_id_fkey" FOREIGN KEY ("centro_custo_id") REFERENCES "public"."financeiro_centro_custos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."financeiro_lancamentos"
    ADD CONSTRAINT "financeiro_lancamentos_conta_destino_id_fkey" FOREIGN KEY ("conta_destino_id") REFERENCES "public"."financeiro_contas_bancarias"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."financeiro_lancamentos"
    ADD CONSTRAINT "financeiro_lancamentos_conta_id_fkey" FOREIGN KEY ("conta_id") REFERENCES "public"."financeiro_contas_bancarias"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."financeiro_lancamentos"
    ADD CONSTRAINT "financeiro_lancamentos_conta_origem_id_fkey" FOREIGN KEY ("conta_origem_id") REFERENCES "public"."financeiro_contas_bancarias"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."financeiro_lancamentos"
    ADD CONSTRAINT "financeiro_lancamentos_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financeiro_lancamentos_splits"
    ADD CONSTRAINT "financeiro_lancamentos_splits_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."financeiro_categorias"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."financeiro_lancamentos_splits"
    ADD CONSTRAINT "financeiro_lancamentos_splits_centro_custo_id_fkey" FOREIGN KEY ("centro_custo_id") REFERENCES "public"."financeiro_centro_custos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."financeiro_lancamentos_splits"
    ADD CONSTRAINT "financeiro_lancamentos_splits_conta_id_fkey" FOREIGN KEY ("conta_id") REFERENCES "public"."financeiro_contas_bancarias"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."financeiro_lancamentos_splits"
    ADD CONSTRAINT "financeiro_lancamentos_splits_lancamento_id_fkey" FOREIGN KEY ("lancamento_id") REFERENCES "public"."financeiro_lancamentos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financeiro_lancamentos_splits"
    ADD CONSTRAINT "financeiro_lancamentos_splits_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financeiro_linhas_extrato"
    ADD CONSTRAINT "financeiro_linhas_extrato_conta_id_fkey" FOREIGN KEY ("conta_id") REFERENCES "public"."financeiro_contas_bancarias"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financeiro_linhas_extrato"
    ADD CONSTRAINT "financeiro_linhas_extrato_lancamento_id_fkey" FOREIGN KEY ("lancamento_id") REFERENCES "public"."financeiro_lancamentos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."financeiro_linhas_extrato"
    ADD CONSTRAINT "financeiro_linhas_extrato_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financeiro_linhas_extrato"
    ADD CONSTRAINT "financeiro_linhas_extrato_sugestao_categoria_id_fkey" FOREIGN KEY ("sugestao_categoria_id") REFERENCES "public"."financeiro_categorias"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."financeiro_regras_conciliacao"
    ADD CONSTRAINT "financeiro_regras_conciliacao_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."financeiro_categorias"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."financeiro_regras_conciliacao"
    ADD CONSTRAINT "financeiro_regras_conciliacao_centro_custo_id_fkey" FOREIGN KEY ("centro_custo_id") REFERENCES "public"."financeiro_centro_custos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."financeiro_regras_conciliacao"
    ADD CONSTRAINT "financeiro_regras_conciliacao_conta_contrapartida_id_fkey" FOREIGN KEY ("conta_contrapartida_id") REFERENCES "public"."financeiro_contas_bancarias"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."financeiro_regras_conciliacao"
    ADD CONSTRAINT "financeiro_regras_conciliacao_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financeiro_titulos"
    ADD CONSTRAINT "financeiro_titulos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."financeiro_categorias"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."financeiro_titulos"
    ADD CONSTRAINT "financeiro_titulos_centro_custo_id_fkey" FOREIGN KEY ("centro_custo_id") REFERENCES "public"."financeiro_centro_custos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."financeiro_titulos"
    ADD CONSTRAINT "financeiro_titulos_conta_id_fkey" FOREIGN KEY ("conta_id") REFERENCES "public"."financeiro_contas_bancarias"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."financeiro_titulos"
    ADD CONSTRAINT "financeiro_titulos_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."financeiro_titulos"
    ADD CONSTRAINT "financeiro_titulos_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financeiro_titulos"
    ADD CONSTRAINT "financeiro_titulos_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financeiro_titulos"
    ADD CONSTRAINT "financeiro_titulos_titulo_pai_id_fkey" FOREIGN KEY ("titulo_pai_id") REFERENCES "public"."financeiro_titulos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_channel_config"
    ADD CONSTRAINT "fk_channel_config_organization" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."geographic_regions"
    ADD CONSTRAINT "geographic_regions_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."geographic_regions"("id");



ALTER TABLE ONLY "public"."guest_users"
    ADD CONSTRAINT "guest_users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guests"
    ADD CONSTRAINT "guests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listing_settings"
    ADD CONSTRAINT "listing_settings_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listing_settings"
    ADD CONSTRAINT "listing_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_templates"
    ADD CONSTRAINT "notification_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."notification_templates"
    ADD CONSTRAINT "notification_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_templates"
    ADD CONSTRAINT "notification_templates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operational_task_templates"
    ADD CONSTRAINT "operational_task_templates_assigned_team_id_fkey" FOREIGN KEY ("assigned_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."operational_task_templates"
    ADD CONSTRAINT "operational_task_templates_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."operational_task_templates"
    ADD CONSTRAINT "operational_task_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operational_tasks"
    ADD CONSTRAINT "operational_tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."operational_tasks"
    ADD CONSTRAINT "operational_tasks_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."operational_tasks"
    ADD CONSTRAINT "operational_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."operational_tasks"
    ADD CONSTRAINT "operational_tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operational_tasks"
    ADD CONSTRAINT "operational_tasks_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."operational_tasks"
    ADD CONSTRAINT "operational_tasks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."operational_task_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_settings"
    ADD CONSTRAINT "organization_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ota_amenity_mappings"
    ADD CONSTRAINT "ota_amenity_mappings_canonical_id_fkey" FOREIGN KEY ("canonical_id") REFERENCES "public"."canonical_amenities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ota_api_credentials"
    ADD CONSTRAINT "ota_api_credentials_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ota_bed_type_mappings"
    ADD CONSTRAINT "ota_bed_type_mappings_canonical_id_fkey" FOREIGN KEY ("canonical_id") REFERENCES "public"."canonical_bed_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ota_cancellation_policy_mappings"
    ADD CONSTRAINT "ota_cancellation_policy_mappings_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."cancellation_policy_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ota_fee_type_mappings"
    ADD CONSTRAINT "ota_fee_type_mappings_canonical_id_fkey" FOREIGN KEY ("canonical_id") REFERENCES "public"."canonical_fee_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ota_image_category_mappings"
    ADD CONSTRAINT "ota_image_category_mappings_canonical_id_fkey" FOREIGN KEY ("canonical_id") REFERENCES "public"."canonical_image_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ota_language_mappings"
    ADD CONSTRAINT "ota_language_mappings_canonical_id_fkey" FOREIGN KEY ("canonical_id") REFERENCES "public"."canonical_languages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ota_payment_type_mappings"
    ADD CONSTRAINT "ota_payment_type_mappings_canonical_id_fkey" FOREIGN KEY ("canonical_id") REFERENCES "public"."canonical_payment_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ota_property_type_mappings"
    ADD CONSTRAINT "ota_property_type_mappings_canonical_id_fkey" FOREIGN KEY ("canonical_id") REFERENCES "public"."canonical_property_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ota_rate_plan_mappings"
    ADD CONSTRAINT "ota_rate_plan_mappings_rate_plan_id_fkey" FOREIGN KEY ("rate_plan_id") REFERENCES "public"."rate_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ota_region_mappings"
    ADD CONSTRAINT "ota_region_mappings_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."geographic_regions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ota_reservation_status_mappings"
    ADD CONSTRAINT "ota_reservation_status_mappings_canonical_id_fkey" FOREIGN KEY ("canonical_id") REFERENCES "public"."canonical_reservation_statuses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ota_room_type_mappings"
    ADD CONSTRAINT "ota_room_type_mappings_canonical_id_fkey" FOREIGN KEY ("canonical_id") REFERENCES "public"."canonical_room_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ota_room_view_mappings"
    ADD CONSTRAINT "ota_room_view_mappings_canonical_id_fkey" FOREIGN KEY ("canonical_id") REFERENCES "public"."canonical_room_views"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ota_sync_logs"
    ADD CONSTRAINT "ota_sync_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ota_sync_logs"
    ADD CONSTRAINT "ota_sync_logs_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id");



ALTER TABLE ONLY "public"."ota_sync_logs"
    ADD CONSTRAINT "ota_sync_logs_rate_plan_id_fkey" FOREIGN KEY ("rate_plan_id") REFERENCES "public"."rate_plans"("id");



ALTER TABLE ONLY "public"."ota_sync_logs"
    ADD CONSTRAINT "ota_sync_logs_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id");



ALTER TABLE ONLY "public"."ota_sync_logs"
    ADD CONSTRAINT "ota_sync_logs_triggered_by_user_id_fkey" FOREIGN KEY ("triggered_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ota_theme_mappings"
    ADD CONSTRAINT "ota_theme_mappings_canonical_id_fkey" FOREIGN KEY ("canonical_id") REFERENCES "public"."canonical_themes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ota_webhook_subscriptions"
    ADD CONSTRAINT "ota_webhook_subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ota_webhooks"
    ADD CONSTRAINT "ota_webhooks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ota_webhooks"
    ADD CONSTRAINT "ota_webhooks_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id");



ALTER TABLE ONLY "public"."ota_webhooks"
    ADD CONSTRAINT "ota_webhooks_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id");



ALTER TABLE ONLY "public"."owner_users"
    ADD CONSTRAINT "owner_users_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."owner_users"
    ADD CONSTRAINT "owner_users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."owner_users"
    ADD CONSTRAINT "owner_users_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."owners"
    ADD CONSTRAINT "owners_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."owners"
    ADD CONSTRAINT "owners_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pagarme_orders"
    ADD CONSTRAINT "pagarme_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pagarme_orders"
    ADD CONSTRAINT "pagarme_orders_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."password_recovery_requests"
    ADD CONSTRAINT "password_recovery_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_sessions"
    ADD CONSTRAINT "payment_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_sessions"
    ADD CONSTRAINT "payment_sessions_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_billing_contact_id_fkey" FOREIGN KEY ("billing_contact_id") REFERENCES "public"."billing_contacts"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_payment_session_id_fkey" FOREIGN KEY ("payment_session_id") REFERENCES "public"."payment_sessions"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."predetermined_funnel_stages"
    ADD CONSTRAINT "predetermined_funnel_stages_funnel_id_fkey" FOREIGN KEY ("funnel_id") REFERENCES "public"."predetermined_funnels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."predetermined_funnels"
    ADD CONSTRAINT "predetermined_funnels_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."predetermined_funnels"
    ADD CONSTRAINT "predetermined_funnels_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."predetermined_item_activities"
    ADD CONSTRAINT "predetermined_item_activities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."predetermined_item_activities"
    ADD CONSTRAINT "predetermined_item_activities_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."predetermined_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."predetermined_items"
    ADD CONSTRAINT "predetermined_items_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."predetermined_items"
    ADD CONSTRAINT "predetermined_items_cancelled_reason_id_fkey" FOREIGN KEY ("cancelled_reason_id") REFERENCES "public"."crm_lost_reasons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."predetermined_items"
    ADD CONSTRAINT "predetermined_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."predetermined_items"
    ADD CONSTRAINT "predetermined_items_funnel_id_fkey" FOREIGN KEY ("funnel_id") REFERENCES "public"."predetermined_funnels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."predetermined_items"
    ADD CONSTRAINT "predetermined_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."predetermined_items"
    ADD CONSTRAINT "predetermined_items_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "public"."predetermined_funnel_stages"("id");



ALTER TABLE ONLY "public"."pricing_settings"
    ADD CONSTRAINT "pricing_settings_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pricing_settings"
    ADD CONSTRAINT "pricing_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_owner_contact_id_fkey" FOREIGN KEY ("owner_contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."property_cancellation_penalties"
    ADD CONSTRAINT "property_cancellation_penalties_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_cancellation_penalties"
    ADD CONSTRAINT "property_cancellation_penalties_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_cancellation_penalties"
    ADD CONSTRAINT "property_cancellation_penalties_rate_plan_id_fkey" FOREIGN KEY ("rate_plan_id") REFERENCES "public"."rate_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_channel_settings"
    ADD CONSTRAINT "property_channel_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_channel_settings"
    ADD CONSTRAINT "property_channel_settings_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_ota_extensions"
    ADD CONSTRAINT "property_ota_extensions_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_rooms"
    ADD CONSTRAINT "property_rooms_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_rooms"
    ADD CONSTRAINT "property_rooms_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id");



ALTER TABLE ONLY "public"."rate_plan_availability"
    ADD CONSTRAINT "rate_plan_availability_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rate_plan_availability"
    ADD CONSTRAINT "rate_plan_availability_rate_plan_id_fkey" FOREIGN KEY ("rate_plan_id") REFERENCES "public"."rate_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rate_plan_pricing_overrides"
    ADD CONSTRAINT "rate_plan_pricing_overrides_rate_plan_id_fkey" FOREIGN KEY ("rate_plan_id") REFERENCES "public"."rate_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rate_plans"
    ADD CONSTRAINT "rate_plans_cancellation_policy_id_fkey" FOREIGN KEY ("cancellation_policy_id") REFERENCES "public"."cancellation_policy_templates"("id");



ALTER TABLE ONLY "public"."rate_plans"
    ADD CONSTRAINT "rate_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."rate_plans"
    ADD CONSTRAINT "rate_plans_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rate_plans"
    ADD CONSTRAINT "rate_plans_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."re_broker_campaign_participation"
    ADD CONSTRAINT "re_broker_campaign_participation_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "public"."re_brokers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."re_broker_campaign_participation"
    ADD CONSTRAINT "re_broker_campaign_participation_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."re_broker_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."re_broker_campaigns"
    ADD CONSTRAINT "re_broker_campaigns_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."re_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."re_broker_campaigns"
    ADD CONSTRAINT "re_broker_campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."re_broker_chat_channels"
    ADD CONSTRAINT "re_broker_chat_channels_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."re_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."re_broker_chat_channels"
    ADD CONSTRAINT "re_broker_chat_channels_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."re_broker_chat_messages"
    ADD CONSTRAINT "re_broker_chat_messages_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "public"."re_brokers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."re_broker_chat_messages"
    ADD CONSTRAINT "re_broker_chat_messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."re_broker_chat_channels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."re_broker_invites"
    ADD CONSTRAINT "re_broker_invites_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."re_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."re_broker_invites"
    ADD CONSTRAINT "re_broker_invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."re_broker_rankings"
    ADD CONSTRAINT "re_broker_rankings_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "public"."re_brokers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."re_broker_rankings"
    ADD CONSTRAINT "re_broker_rankings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."re_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."re_brokers"
    ADD CONSTRAINT "re_brokers_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."re_companies"("id");



ALTER TABLE ONLY "public"."re_brokers"
    ADD CONSTRAINT "re_brokers_linked_company_id_fkey" FOREIGN KEY ("linked_company_id") REFERENCES "public"."re_companies"("id");



ALTER TABLE ONLY "public"."re_brokers"
    ADD CONSTRAINT "re_brokers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."re_companies"
    ADD CONSTRAINT "re_companies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."re_demands"
    ADD CONSTRAINT "re_demands_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."re_companies"("id");



ALTER TABLE ONLY "public"."re_developments"
    ADD CONSTRAINT "re_developments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."re_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."re_marketplace_conversations"
    ADD CONSTRAINT "re_marketplace_conversations_last_message_sender_id_fkey" FOREIGN KEY ("last_message_sender_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."re_marketplace_conversations"
    ADD CONSTRAINT "re_marketplace_conversations_org_a_id_fkey" FOREIGN KEY ("org_a_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."re_marketplace_conversations"
    ADD CONSTRAINT "re_marketplace_conversations_org_b_id_fkey" FOREIGN KEY ("org_b_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."re_marketplace_messages"
    ADD CONSTRAINT "re_marketplace_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."re_marketplace_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."re_marketplace_messages"
    ADD CONSTRAINT "re_marketplace_messages_read_by_profile_id_fkey" FOREIGN KEY ("read_by_profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."re_marketplace_messages"
    ADD CONSTRAINT "re_marketplace_messages_sender_org_id_fkey" FOREIGN KEY ("sender_org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."re_marketplace_messages"
    ADD CONSTRAINT "re_marketplace_messages_sender_profile_id_fkey" FOREIGN KEY ("sender_profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."re_marketplace_participants"
    ADD CONSTRAINT "re_marketplace_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."re_marketplace_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."re_marketplace_participants"
    ADD CONSTRAINT "re_marketplace_participants_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."re_marketplace_participants"
    ADD CONSTRAINT "re_marketplace_participants_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."re_messages"
    ADD CONSTRAINT "re_messages_partnership_id_fkey" FOREIGN KEY ("partnership_id") REFERENCES "public"."re_partnerships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."re_messages"
    ADD CONSTRAINT "re_messages_sender_company_id_fkey" FOREIGN KEY ("sender_company_id") REFERENCES "public"."re_companies"("id");



ALTER TABLE ONLY "public"."re_partnerships"
    ADD CONSTRAINT "re_partnerships_company_a_id_fkey" FOREIGN KEY ("company_a_id") REFERENCES "public"."re_companies"("id");



ALTER TABLE ONLY "public"."re_partnerships"
    ADD CONSTRAINT "re_partnerships_company_b_id_fkey" FOREIGN KEY ("company_b_id") REFERENCES "public"."re_companies"("id");



ALTER TABLE ONLY "public"."re_reservations"
    ADD CONSTRAINT "re_reservations_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."re_companies"("id");



ALTER TABLE ONLY "public"."re_reservations"
    ADD CONSTRAINT "re_reservations_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."re_units"("id");



ALTER TABLE ONLY "public"."re_transactions"
    ADD CONSTRAINT "re_transactions_partnership_id_fkey" FOREIGN KEY ("partnership_id") REFERENCES "public"."re_partnerships"("id");



ALTER TABLE ONLY "public"."re_transactions"
    ADD CONSTRAINT "re_transactions_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."re_reservations"("id");



ALTER TABLE ONLY "public"."re_units"
    ADD CONSTRAINT "re_units_development_id_fkey" FOREIGN KEY ("development_id") REFERENCES "public"."re_developments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."re_units"
    ADD CONSTRAINT "re_units_reserved_by_fkey" FOREIGN KEY ("reserved_by") REFERENCES "public"."re_companies"("id");



ALTER TABLE ONLY "public"."re_units"
    ADD CONSTRAINT "re_units_sold_by_fkey" FOREIGN KEY ("sold_by") REFERENCES "public"."re_companies"("id");



ALTER TABLE ONLY "public"."reconciliation_items"
    ADD CONSTRAINT "reconciliation_items_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reconciliation_items"
    ADD CONSTRAINT "reconciliation_items_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."reconciliation_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reconciliation_runs"
    ADD CONSTRAINT "reconciliation_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."refunds"
    ADD CONSTRAINT "refunds_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."refunds"
    ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."refunds"
    ADD CONSTRAINT "refunds_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id");



ALTER TABLE ONLY "public"."reservation_additional_guests"
    ADD CONSTRAINT "reservation_additional_guests_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservation_additional_guests"
    ADD CONSTRAINT "reservation_additional_guests_reservation_room_id_fkey" FOREIGN KEY ("reservation_room_id") REFERENCES "public"."reservation_rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservation_cancellations"
    ADD CONSTRAINT "reservation_cancellations_cancellation_policy_id_fkey" FOREIGN KEY ("cancellation_policy_id") REFERENCES "public"."cancellation_policy_templates"("id");



ALTER TABLE ONLY "public"."reservation_cancellations"
    ADD CONSTRAINT "reservation_cancellations_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservation_cancellations"
    ADD CONSTRAINT "reservation_cancellations_reservation_room_id_fkey" FOREIGN KEY ("reservation_room_id") REFERENCES "public"."reservation_rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservation_deposits"
    ADD CONSTRAINT "reservation_deposits_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservation_history"
    ADD CONSTRAINT "reservation_history_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservation_pricing_breakdown"
    ADD CONSTRAINT "reservation_pricing_breakdown_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservation_pricing_breakdown"
    ADD CONSTRAINT "reservation_pricing_breakdown_reservation_room_id_fkey" FOREIGN KEY ("reservation_room_id") REFERENCES "public"."reservation_rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservation_room_history"
    ADD CONSTRAINT "reservation_room_history_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservation_room_history"
    ADD CONSTRAINT "reservation_room_history_reservation_room_id_fkey" FOREIGN KEY ("reservation_room_id") REFERENCES "public"."reservation_rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservation_rooms"
    ADD CONSTRAINT "reservation_rooms_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id");



ALTER TABLE ONLY "public"."reservation_rooms"
    ADD CONSTRAINT "reservation_rooms_rate_plan_id_fkey" FOREIGN KEY ("rate_plan_id") REFERENCES "public"."rate_plans"("id");



ALTER TABLE ONLY "public"."reservation_rooms"
    ADD CONSTRAINT "reservation_rooms_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_cancellation_policy_id_fkey" FOREIGN KEY ("cancellation_policy_id") REFERENCES "public"."cancellation_policy_templates"("id");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_crm_contact_id_fkey" FOREIGN KEY ("crm_contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_rate_plan_id_fkey" FOREIGN KEY ("rate_plan_id") REFERENCES "public"."rate_plans"("id");



ALTER TABLE ONLY "public"."room_photos"
    ADD CONSTRAINT "room_photos_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales_deal_activities"
    ADD CONSTRAINT "sales_deal_activities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."sales_deal_activities"
    ADD CONSTRAINT "sales_deal_activities_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "public"."sales_deals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales_deals"
    ADD CONSTRAINT "sales_deals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."sales_deals"
    ADD CONSTRAINT "sales_deals_crm_company_id_fkey" FOREIGN KEY ("crm_company_id") REFERENCES "public"."crm_companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sales_deals"
    ADD CONSTRAINT "sales_deals_crm_contact_id_fkey" FOREIGN KEY ("crm_contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sales_deals"
    ADD CONSTRAINT "sales_deals_funnel_id_fkey" FOREIGN KEY ("funnel_id") REFERENCES "public"."sales_funnels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales_deals"
    ADD CONSTRAINT "sales_deals_lost_reason_id_fkey" FOREIGN KEY ("lost_reason_id") REFERENCES "public"."crm_lost_reasons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sales_deals"
    ADD CONSTRAINT "sales_deals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales_deals"
    ADD CONSTRAINT "sales_deals_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."sales_deals"
    ADD CONSTRAINT "sales_deals_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "public"."sales_funnel_stages"("id");



ALTER TABLE ONLY "public"."sales_funnel_stages"
    ADD CONSTRAINT "sales_funnel_stages_funnel_id_fkey" FOREIGN KEY ("funnel_id") REFERENCES "public"."sales_funnels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales_funnels"
    ADD CONSTRAINT "sales_funnels_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."sales_funnels"
    ADD CONSTRAINT "sales_funnels_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_payment_methods"
    ADD CONSTRAINT "saved_payment_methods_crm_contact_id_fkey" FOREIGN KEY ("crm_contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_payment_methods"
    ADD CONSTRAINT "saved_payment_methods_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_funnel_stages"
    ADD CONSTRAINT "service_funnel_stages_funnel_id_fkey" FOREIGN KEY ("funnel_id") REFERENCES "public"."service_funnels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_funnels"
    ADD CONSTRAINT "service_funnels_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."service_funnels"
    ADD CONSTRAINT "service_funnels_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_ticket_activities"
    ADD CONSTRAINT "service_ticket_activities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."service_ticket_activities"
    ADD CONSTRAINT "service_ticket_activities_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."service_tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_tickets"
    ADD CONSTRAINT "service_tickets_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."service_tickets"
    ADD CONSTRAINT "service_tickets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."service_tickets"
    ADD CONSTRAINT "service_tickets_funnel_id_fkey" FOREIGN KEY ("funnel_id") REFERENCES "public"."service_funnels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_tickets"
    ADD CONSTRAINT "service_tickets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_tickets"
    ADD CONSTRAINT "service_tickets_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "public"."service_funnel_stages"("id");



ALTER TABLE ONLY "public"."service_tickets"
    ADD CONSTRAINT "service_tickets_unresolved_reason_id_fkey" FOREIGN KEY ("unresolved_reason_id") REFERENCES "public"."crm_lost_reasons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_rotated_from_fkey" FOREIGN KEY ("rotated_from") REFERENCES "public"."sessions"("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_rotated_to_fkey" FOREIGN KEY ("rotated_to") REFERENCES "public"."sessions"("id");



ALTER TABLE ONLY "public"."short_ids"
    ADD CONSTRAINT "short_ids_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staysnet_raw_objects"
    ADD CONSTRAINT "staysnet_raw_objects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stripe_checkout_sessions"
    ADD CONSTRAINT "stripe_checkout_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stripe_checkout_sessions"
    ADD CONSTRAINT "stripe_checkout_sessions_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stripe_configs"
    ADD CONSTRAINT "stripe_configs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stripe_webhook_events"
    ADD CONSTRAINT "stripe_webhook_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_activities"
    ADD CONSTRAINT "task_activities_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."crm_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_activities"
    ADD CONSTRAINT "task_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."task_comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."crm_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."task_dependencies"
    ADD CONSTRAINT "task_dependencies_depends_on_task_id_fkey" FOREIGN KEY ("depends_on_task_id") REFERENCES "public"."crm_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_dependencies"
    ADD CONSTRAINT "task_dependencies_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."crm_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_fixed_assignee_id_fkey" FOREIGN KEY ("fixed_assignee_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."virtual_cards"
    ADD CONSTRAINT "virtual_cards_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."virtual_cards"
    ADD CONSTRAINT "virtual_cards_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE CASCADE;



CREATE POLICY "Additional guests readable" ON "public"."reservation_additional_guests" FOR SELECT USING (true);



CREATE POLICY "Admin can view all instances" ON "public"."evolution_instances" USING ((((("current_setting"('request.jwt.claims'::"text"))::json ->> 'user_id'::"text"))::integer = 1));



CREATE POLICY "Admins can create templates" ON "public"."notification_templates" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."type")::"text" = ANY ((ARRAY['superadmin'::character varying, 'imobiliaria'::character varying])::"text"[]))))));



CREATE POLICY "Admins can delete templates" ON "public"."notification_templates" FOR DELETE USING ((("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."type")::"text" = ANY ((ARRAY['superadmin'::character varying, 'imobiliaria'::character varying])::"text"[]))))) AND ("is_system" = false)));



CREATE POLICY "Admins can update templates" ON "public"."notification_templates" FOR UPDATE USING (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."type")::"text" = ANY ((ARRAY['superadmin'::character varying, 'imobiliaria'::character varying])::"text"[]))))));



CREATE POLICY "Agencies can manage own demands" ON "public"."re_demands" USING (("agency_id" IN ( SELECT "re_companies"."id"
   FROM "public"."re_companies"
  WHERE ("re_companies"."organization_id" IN ( SELECT "re_companies"."organization_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Allow all for staysnet_config" ON "public"."staysnet_config" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all for staysnet_properties_cache" ON "public"."staysnet_properties_cache" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all for staysnet_reservations_cache" ON "public"."staysnet_reservations_cache" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all for staysnet_sync_log" ON "public"."staysnet_sync_log" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all for staysnet_webhooks" ON "public"."staysnet_webhooks" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all operations on channel_config" ON "public"."organization_channel_config" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all operations via service role" ON "public"."financeiro_categorias" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all operations via service role" ON "public"."financeiro_centro_custos" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all operations via service role" ON "public"."financeiro_contas_bancarias" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all operations via service role" ON "public"."financeiro_lancamentos" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all operations via service role" ON "public"."financeiro_lancamentos_splits" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all operations via service role" ON "public"."financeiro_linhas_extrato" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all operations via service role" ON "public"."financeiro_regras_conciliacao" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all operations via service role" ON "public"."financeiro_titulos" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all operations via service role" ON "public"."organizations" USING (true) WITH CHECK (true);



COMMENT ON POLICY "Allow all operations via service role" ON "public"."organizations" IS 'Policy permite acesso via service role (Edge Functions). Ajustar conforme necessário para produção.';



CREATE POLICY "Allow all operations via service role" ON "public"."owner_users" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all operations via service role" ON "public"."sessions" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all operations via service role" ON "public"."staysnet_raw_objects" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all operations via service role" ON "public"."user_invitations" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all operations via service role on owners" ON "public"."owners" USING (true) WITH CHECK (true);



CREATE POLICY "Allow insert for all" ON "public"."conversation_activity_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow select for all" ON "public"."conversation_activity_logs" FOR SELECT USING (true);



CREATE POLICY "Anyone can read available brokers" ON "public"."re_brokers" FOR SELECT USING (("available" = true));



CREATE POLICY "Anyone can read developments" ON "public"."re_developments" FOR SELECT USING (true);



CREATE POLICY "Anyone can read open demands" ON "public"."re_demands" FOR SELECT USING (("status" = 'open'::"text"));



CREATE POLICY "Anyone can read units" ON "public"."re_units" FOR SELECT USING (true);



CREATE POLICY "Anyone can view trigger types" ON "public"."notification_trigger_types" FOR SELECT USING (true);



CREATE POLICY "Availability via property" ON "public"."rate_plan_availability" FOR SELECT USING (("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."user_id" = "auth"."uid"()))));



CREATE POLICY "Billing contacts readable" ON "public"."billing_contacts" FOR SELECT USING (true);



CREATE POLICY "Canonical amenities are readable by all" ON "public"."canonical_amenities" FOR SELECT USING (true);



CREATE POLICY "Canonical amenities writable by service" ON "public"."canonical_amenities" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Canonical property types readable by all" ON "public"."canonical_property_types" FOR SELECT USING (true);



CREATE POLICY "Canonical property types writable by service" ON "public"."canonical_property_types" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Company owners can manage developments" ON "public"."re_developments" USING (("company_id" IN ( SELECT "re_companies"."id"
   FROM "public"."re_companies"
  WHERE ("re_companies"."organization_id" IN ( SELECT "re_companies"."organization_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Corporate payment configs via reservation" ON "public"."corporate_payment_configs" FOR SELECT USING (true);



CREATE POLICY "Deposits via property or rate" ON "public"."deposit_schedules" FOR SELECT USING ((("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."user_id" = "auth"."uid"()))) OR ("rate_plan_id" IN ( SELECT "rp"."id"
   FROM "public"."rate_plans" "rp"
  WHERE ("rp"."property_id" IN ( SELECT "properties"."id"
           FROM "public"."properties"
          WHERE ("properties"."user_id" = "auth"."uid"()))))) OR ("organization_id" IN ( SELECT "properties"."organization_id"
   FROM "public"."properties"
  WHERE ("properties"."user_id" = "auth"."uid"())))));



CREATE POLICY "Funcionario access employer org reservations" ON "public"."reservations" FOR SELECT USING (("organization_id" IN ( SELECT "organizations"."id"
   FROM (("public"."organizations"
     JOIN "public"."users" "employer" ON (("employer"."organization_id" = "organizations"."id")))
     JOIN "public"."users" "employee" ON (("employee"."organization_id" = "employer"."organization_id")))
  WHERE (("employee"."id" = "auth"."uid"()) AND (("employee"."type")::"text" = 'funcionario'::"text")))));



CREATE POLICY "Geographic regions readable by all" ON "public"."geographic_regions" FOR SELECT USING (true);



CREATE POLICY "Imobiliaria access own org reservations" ON "public"."reservations" USING (("organization_id" IN ( SELECT "organizations"."id"
   FROM ("public"."organizations"
     JOIN "public"."users" ON (("users"."organization_id" = "organizations"."id")))
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."type")::"text" = 'imobiliaria'::"text"))))) WITH CHECK (("organization_id" IN ( SELECT "organizations"."id"
   FROM ("public"."organizations"
     JOIN "public"."users" ON (("users"."organization_id" = "organizations"."id")))
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."type")::"text" = 'imobiliaria'::"text")))));



CREATE POLICY "OTA amenity mappings readable by all" ON "public"."ota_amenity_mappings" FOR SELECT USING (true);



CREATE POLICY "OTA amenity mappings writable by service" ON "public"."ota_amenity_mappings" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "OTA cancellation mappings readable" ON "public"."ota_cancellation_policy_mappings" FOR SELECT USING (true);



CREATE POLICY "OTA credentials via org" ON "public"."ota_api_credentials" FOR SELECT USING (("organization_id" IN ( SELECT "properties"."organization_id"
   FROM "public"."properties"
  WHERE ("properties"."user_id" = "auth"."uid"()))));



CREATE POLICY "OTA property type mappings readable by all" ON "public"."ota_property_type_mappings" FOR SELECT USING (true);



CREATE POLICY "OTA property type mappings writable by service" ON "public"."ota_property_type_mappings" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "OTA rate mappings via rate plan" ON "public"."ota_rate_plan_mappings" FOR SELECT USING (("rate_plan_id" IN ( SELECT "rp"."id"
   FROM "public"."rate_plans" "rp"
  WHERE (("rp"."property_id" IN ( SELECT "properties"."id"
           FROM "public"."properties"
          WHERE ("properties"."user_id" = "auth"."uid"()))) OR ("rp"."organization_id" IN ( SELECT "properties"."organization_id"
           FROM "public"."properties"
          WHERE ("properties"."user_id" = "auth"."uid"())))))));



CREATE POLICY "OTA region mappings readable by all" ON "public"."ota_region_mappings" FOR SELECT USING (true);



CREATE POLICY "OTA sync logs via org" ON "public"."ota_sync_logs" FOR SELECT USING (("organization_id" IN ( SELECT "properties"."organization_id"
   FROM "public"."properties"
  WHERE ("properties"."user_id" = "auth"."uid"()))));



CREATE POLICY "OTA webhook subscriptions via org" ON "public"."ota_webhook_subscriptions" FOR SELECT USING (("organization_id" IN ( SELECT "properties"."organization_id"
   FROM "public"."properties"
  WHERE ("properties"."user_id" = "auth"."uid"()))));



CREATE POLICY "OTA webhooks via org" ON "public"."ota_webhooks" FOR SELECT USING ((("organization_id" IS NULL) OR ("organization_id" IN ( SELECT "properties"."organization_id"
   FROM "public"."properties"
  WHERE ("properties"."user_id" = "auth"."uid"())))));



CREATE POLICY "Org templates readable by org" ON "public"."cancellation_policy_templates" FOR SELECT USING ((("is_system" = false) AND ("organization_id" IN ( SELECT "properties"."organization_id"
   FROM "public"."properties"
  WHERE ("properties"."user_id" = "auth"."uid"())))));



CREATE POLICY "Payment sessions via org" ON "public"."payment_sessions" FOR SELECT USING (("organization_id" IN ( SELECT "properties"."organization_id"
   FROM "public"."properties"
  WHERE ("properties"."user_id" = "auth"."uid"()))));



CREATE POLICY "Payments via org" ON "public"."payments" FOR SELECT USING (("organization_id" IN ( SELECT "properties"."organization_id"
   FROM "public"."properties"
  WHERE ("properties"."user_id" = "auth"."uid"()))));



CREATE POLICY "Penalties via property" ON "public"."property_cancellation_penalties" FOR SELECT USING ((("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."user_id" = "auth"."uid"()))) OR ("organization_id" IN ( SELECT "properties"."organization_id"
   FROM "public"."properties"
  WHERE ("properties"."user_id" = "auth"."uid"())))));



CREATE POLICY "Pricing breakdown readable" ON "public"."reservation_pricing_breakdown" FOR SELECT USING (true);



CREATE POLICY "Pricing overrides via rate plan" ON "public"."rate_plan_pricing_overrides" FOR SELECT USING (("rate_plan_id" IN ( SELECT "rp"."id"
   FROM "public"."rate_plans" "rp"
  WHERE ("rp"."property_id" IN ( SELECT "properties"."id"
           FROM "public"."properties"
          WHERE ("properties"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Property OTA extensions via property" ON "public"."property_ota_extensions" FOR SELECT USING (("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."user_id" = "auth"."uid"()))));



CREATE POLICY "Rate plans readable by property owner" ON "public"."rate_plans" FOR SELECT USING ((("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."user_id" = "auth"."uid"()))) OR ("organization_id" IN ( SELECT "properties"."organization_id"
   FROM "public"."properties"
  WHERE ("properties"."user_id" = "auth"."uid"())))));



CREATE POLICY "Refunds via org" ON "public"."refunds" FOR SELECT USING (("organization_id" IN ( SELECT "properties"."organization_id"
   FROM "public"."properties"
  WHERE ("properties"."user_id" = "auth"."uid"()))));



CREATE POLICY "Reservation cancellations readable" ON "public"."reservation_cancellations" FOR SELECT USING (true);



CREATE POLICY "Reservation deposits readable" ON "public"."reservation_deposits" FOR SELECT USING (true);



CREATE POLICY "Reservation rooms readable" ON "public"."reservation_rooms" FOR SELECT USING (true);



CREATE POLICY "Saved payment methods via org" ON "public"."saved_payment_methods" FOR SELECT USING (("organization_id" IN ( SELECT "properties"."organization_id"
   FROM "public"."properties"
  WHERE ("properties"."user_id" = "auth"."uid"()))));



CREATE POLICY "Service role can do everything" ON "public"."client_sites" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."guests" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."properties" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."reservations" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access additional guests" ON "public"."reservation_additional_guests" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access availability" ON "public"."rate_plan_availability" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access billing contacts" ON "public"."billing_contacts" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access cancellation templates" ON "public"."cancellation_policy_templates" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access contacts" ON "public"."channel_contacts" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access corporate payment configs" ON "public"."corporate_payment_configs" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access deposits" ON "public"."deposit_schedules" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access geographic regions" ON "public"."geographic_regions" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access instances" ON "public"."channel_instances" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access ota api credentials" ON "public"."ota_api_credentials" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access ota cancellation mappings" ON "public"."ota_cancellation_policy_mappings" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access ota rate mappings" ON "public"."ota_rate_plan_mappings" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access ota region mappings" ON "public"."ota_region_mappings" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access ota sync logs" ON "public"."ota_sync_logs" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access ota webhook subscriptions" ON "public"."ota_webhook_subscriptions" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access ota webhooks" ON "public"."ota_webhooks" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access payment sessions" ON "public"."payment_sessions" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access payments" ON "public"."payments" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access penalties" ON "public"."property_cancellation_penalties" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access pricing breakdown" ON "public"."reservation_pricing_breakdown" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access pricing overrides" ON "public"."rate_plan_pricing_overrides" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access property ota extensions" ON "public"."property_ota_extensions" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access rate plans" ON "public"."rate_plans" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access refunds" ON "public"."refunds" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access reservation cancellations" ON "public"."reservation_cancellations" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access reservation deposits" ON "public"."reservation_deposits" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access reservation rooms" ON "public"."reservation_rooms" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access saved payment methods" ON "public"."saved_payment_methods" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access to reconciliation_items" ON "public"."reconciliation_items" USING (((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access to reconciliation_runs" ON "public"."reconciliation_runs" USING (((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access virtual cards" ON "public"."virtual_cards" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Superadmin full access to reservations" ON "public"."reservations" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."type")::"text" = 'superadmin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."type")::"text" = 'superadmin'::"text")))));



CREATE POLICY "System templates readable by all" ON "public"."cancellation_policy_templates" FOR SELECT USING (("is_system" = true));



CREATE POLICY "Users can delete own org construtoras" ON "public"."ai_agent_construtoras" FOR DELETE USING (("organization_id" IN ( SELECT "ai_agent_construtoras"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete own organization channel settings" ON "public"."property_channel_settings" FOR DELETE USING (("organization_id" IN ( SELECT "property_channel_settings"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete properties in their tenant" ON "public"."properties_drafts" FOR DELETE USING (("tenant_id" = ("auth"."uid"())::"text"));



CREATE POLICY "Users can insert own org companies" ON "public"."re_companies" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "re_companies"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can insert own org construtoras" ON "public"."ai_agent_construtoras" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "ai_agent_construtoras"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can insert own organization channel settings" ON "public"."property_channel_settings" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "property_channel_settings"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can insert own organization logs" ON "public"."conversation_activity_logs" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "Users can insert properties for their tenant" ON "public"."properties_drafts" FOR INSERT WITH CHECK (("tenant_id" = ("auth"."uid"())::"text"));



CREATE POLICY "Users can insert their own instance" ON "public"."evolution_instances" FOR INSERT WITH CHECK (("user_id" = ((("current_setting"('request.jwt.claims'::"text"))::json ->> 'user_id'::"text"))::integer));



CREATE POLICY "Users can manage own org brokers" ON "public"."re_brokers" USING (("organization_id" IN ( SELECT "re_brokers"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can only access their tenant's properties" ON "public"."properties_drafts" USING (("tenant_id" = ("auth"."uid"())::"text"));



CREATE POLICY "Users can read own org companies" ON "public"."re_companies" FOR SELECT USING (("organization_id" IN ( SELECT "re_companies"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can read own org construtoras" ON "public"."ai_agent_construtoras" FOR SELECT USING (("organization_id" IN ( SELECT "ai_agent_construtoras"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update own org companies" ON "public"."re_companies" FOR UPDATE USING (("organization_id" IN ( SELECT "re_companies"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update own org construtoras" ON "public"."ai_agent_construtoras" FOR UPDATE USING (("organization_id" IN ( SELECT "ai_agent_construtoras"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update own organization channel settings" ON "public"."property_channel_settings" FOR UPDATE USING (("organization_id" IN ( SELECT "property_channel_settings"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update properties in their tenant" ON "public"."properties_drafts" FOR UPDATE USING (("tenant_id" = ("auth"."uid"())::"text"));



CREATE POLICY "Users can update their own instance" ON "public"."evolution_instances" FOR UPDATE USING (("user_id" = ((("current_setting"('request.jwt.claims'::"text"))::json ->> 'user_id'::"text"))::integer));



CREATE POLICY "Users can view own organization channel settings" ON "public"."property_channel_settings" FOR SELECT USING (("organization_id" IN ( SELECT "property_channel_settings"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view own organization logs" ON "public"."conversation_activity_logs" FOR SELECT USING (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view templates of their organization" ON "public"."notification_templates" FOR SELECT USING (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their org reconciliation items" ON "public"."reconciliation_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."reconciliation_runs" "rr"
     JOIN "public"."users" "u" ON (("u"."organization_id" = "rr"."organization_id")))
  WHERE (("rr"."id" = "reconciliation_items"."run_id") AND ("u"."id" = "auth"."uid"())))));



CREATE POLICY "Users can view their org reconciliation runs" ON "public"."reconciliation_runs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."organization_id" = "reconciliation_runs"."organization_id") AND ("u"."id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own instance" ON "public"."evolution_instances" FOR SELECT USING (("user_id" = ((("current_setting"('request.jwt.claims'::"text"))::json ->> 'user_id'::"text"))::integer));



CREATE POLICY "Usuários podem gerenciar próprios anúncios" ON "public"."properties" USING (true);



CREATE POLICY "Virtual cards via org" ON "public"."virtual_cards" FOR SELECT USING (("organization_id" IN ( SELECT "properties"."organization_id"
   FROM "public"."properties"
  WHERE ("properties"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."accommodation_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_agent_construtoras" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_agent_unidades" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ai_agent_unidades_org_policy" ON "public"."ai_agent_unidades" USING ((("organization_id" = (("auth"."jwt"() ->> 'organization_id'::"text"))::"uuid") OR ("organization_id" = '00000000-0000-0000-0000-000000000000'::"uuid")));



CREATE POLICY "ai_agent_unidades_service_policy" ON "public"."ai_agent_unidades" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "allow_org_users_guests" ON "public"."guests" TO "authenticated" USING (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))) WITH CHECK (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "allow_superadmin_all_guests" ON "public"."guests" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."type")::"text" = 'superadmin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."type")::"text" = 'superadmin'::"text")))));



CREATE POLICY "anon_insert_guest_users" ON "public"."guest_users" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "anon_select_own_guest_users" ON "public"."guest_users" FOR SELECT TO "anon" USING (true);



ALTER TABLE "public"."automation_executions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "automation_executions_org_isolation" ON "public"."automation_executions" USING (("organization_id" = ("current_setting"('app.current_organization_id'::"text", true))::"uuid"));



ALTER TABLE "public"."automations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "automations_org_isolation" ON "public"."automations" USING (("organization_id" = ("current_setting"('app.current_organization_id'::"text", true))::"uuid"));



ALTER TABLE "public"."beds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_pricing_rules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "calendar_pricing_rules_delete_policy" ON "public"."calendar_pricing_rules" FOR DELETE USING (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "calendar_pricing_rules_insert_policy" ON "public"."calendar_pricing_rules" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "calendar_pricing_rules_select_policy" ON "public"."calendar_pricing_rules" FOR SELECT USING (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "calendar_pricing_rules_update_policy" ON "public"."calendar_pricing_rules" FOR UPDATE USING (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



ALTER TABLE "public"."cancellation_policy_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."canonical_amenities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."canonical_bed_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."canonical_fee_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."canonical_image_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."canonical_languages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."canonical_payment_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."canonical_property_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."canonical_reservation_statuses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."canonical_room_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."canonical_room_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."canonical_themes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."channex_accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "channex_accounts_select_own_org" ON "public"."channex_accounts" FOR SELECT USING (("organization_id" IN ( SELECT "properties"."organization_id"
   FROM "public"."properties"
  WHERE ("properties"."user_id" = "auth"."uid"()))));



CREATE POLICY "channex_accounts_service_role" ON "public"."channex_accounts" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



ALTER TABLE "public"."channex_channel_connections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "channex_channels_select_own_org" ON "public"."channex_channel_connections" FOR SELECT USING (("account_id" IN ( SELECT "channex_accounts"."id"
   FROM "public"."channex_accounts"
  WHERE ("channex_accounts"."organization_id" IN ( SELECT "properties"."organization_id"
           FROM "public"."properties"
          WHERE ("properties"."user_id" = "auth"."uid"()))))));



CREATE POLICY "channex_channels_service_role" ON "public"."channex_channel_connections" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



ALTER TABLE "public"."channex_listing_connections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "channex_listing_select_own" ON "public"."channex_listing_connections" FOR SELECT USING (("property_mapping_id" IN ( SELECT "channex_property_mappings"."id"
   FROM "public"."channex_property_mappings"
  WHERE ("channex_property_mappings"."rendizy_property_id" IN ( SELECT "properties"."id"
           FROM "public"."properties"
          WHERE ("properties"."user_id" = "auth"."uid"()))))));



CREATE POLICY "channex_listing_service_role" ON "public"."channex_listing_connections" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "channex_prop_map_select_own" ON "public"."channex_property_mappings" FOR SELECT USING (("rendizy_property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."user_id" = "auth"."uid"()))));



CREATE POLICY "channex_prop_map_service_role" ON "public"."channex_property_mappings" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



ALTER TABLE "public"."channex_property_mappings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "channex_rate_map_select_own" ON "public"."channex_rate_plan_mappings" FOR SELECT USING (("room_type_mapping_id" IN ( SELECT "channex_room_type_mappings"."id"
   FROM "public"."channex_room_type_mappings"
  WHERE ("channex_room_type_mappings"."property_mapping_id" IN ( SELECT "channex_property_mappings"."id"
           FROM "public"."channex_property_mappings"
          WHERE ("channex_property_mappings"."rendizy_property_id" IN ( SELECT "properties"."id"
                   FROM "public"."properties"
                  WHERE ("properties"."user_id" = "auth"."uid"()))))))));



CREATE POLICY "channex_rate_map_service_role" ON "public"."channex_rate_plan_mappings" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



ALTER TABLE "public"."channex_rate_plan_mappings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "channex_room_map_select_own" ON "public"."channex_room_type_mappings" FOR SELECT USING (("property_mapping_id" IN ( SELECT "channex_property_mappings"."id"
   FROM "public"."channex_property_mappings"
  WHERE ("channex_property_mappings"."rendizy_property_id" IN ( SELECT "properties"."id"
           FROM "public"."properties"
          WHERE ("properties"."user_id" = "auth"."uid"()))))));



CREATE POLICY "channex_room_map_service_role" ON "public"."channex_room_type_mappings" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



ALTER TABLE "public"."channex_room_type_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."channex_webhook_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."channex_webhooks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "channex_webhooks_select_own_org" ON "public"."channex_webhooks" FOR SELECT USING (("account_id" IN ( SELECT "channex_accounts"."id"
   FROM "public"."channex_accounts"
  WHERE ("channex_accounts"."organization_id" IN ( SELECT "properties"."organization_id"
           FROM "public"."properties"
          WHERE ("properties"."user_id" = "auth"."uid"()))))));



CREATE POLICY "channex_webhooks_service_role" ON "public"."channex_webhooks" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "channex_wh_logs_select_own_org" ON "public"."channex_webhook_logs" FOR SELECT USING ((("account_id" IS NULL) OR ("account_id" IN ( SELECT "channex_accounts"."id"
   FROM "public"."channex_accounts"
  WHERE ("channex_accounts"."organization_id" IN ( SELECT "properties"."organization_id"
           FROM "public"."properties"
          WHERE ("properties"."user_id" = "auth"."uid"())))))));



CREATE POLICY "channex_wh_logs_service_role" ON "public"."channex_webhook_logs" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



ALTER TABLE "public"."chat_channel_configs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chat_channel_configs_all" ON "public"."chat_channel_configs" USING ((("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."type")::"text" = 'superadmin'::"text"))))));



CREATE POLICY "chat_channel_configs_select" ON "public"."chat_channel_configs" FOR SELECT USING ((("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."type")::"text" = 'superadmin'::"text"))))));



ALTER TABLE "public"."chat_channels_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chat_conversations_insert" ON "public"."chat_conversations" FOR INSERT WITH CHECK ((("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."type")::"text" = 'superadmin'::"text"))))));



CREATE POLICY "chat_conversations_select" ON "public"."chat_conversations" FOR SELECT USING ((("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."type")::"text" = 'superadmin'::"text"))))));



CREATE POLICY "chat_conversations_update" ON "public"."chat_conversations" FOR UPDATE USING ((("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."type")::"text" = 'superadmin'::"text"))))));



ALTER TABLE "public"."chat_message_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chat_messages_insert" ON "public"."chat_messages" FOR INSERT WITH CHECK ((("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."type")::"text" = 'superadmin'::"text"))))));



CREATE POLICY "chat_messages_select" ON "public"."chat_messages" FOR SELECT USING ((("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."type")::"text" = 'superadmin'::"text"))))));



ALTER TABLE "public"."chat_webhooks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_sites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversation_activity_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."corporate_payment_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."crm_card_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_card_items_org_policy" ON "public"."crm_card_items" USING (("organization_id" = ("current_setting"('app.current_organization_id'::"text", true))::"uuid"));



ALTER TABLE "public"."crm_companies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_companies_org_policy" ON "public"."crm_companies" USING (("organization_id" = ("current_setting"('app.current_organization_id'::"text", true))::"uuid"));



ALTER TABLE "public"."crm_contacts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_contacts_org_policy" ON "public"."crm_contacts" USING (("organization_id" = ("current_setting"('app.current_organization_id'::"text", true))::"uuid"));



ALTER TABLE "public"."crm_lost_reasons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_lost_reasons_org_policy" ON "public"."crm_lost_reasons" USING (("organization_id" = ("current_setting"('app.current_organization_id'::"text", true))::"uuid"));



ALTER TABLE "public"."crm_notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_notes_org_policy" ON "public"."crm_notes" USING (("organization_id" = ("current_setting"('app.current_organization_id'::"text", true))::"uuid"));



ALTER TABLE "public"."crm_products_services" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_products_services_org_policy" ON "public"."crm_products_services" USING (("organization_id" = ("current_setting"('app.current_organization_id'::"text", true))::"uuid"));



ALTER TABLE "public"."crm_projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_projects_insert_policy" ON "public"."crm_projects" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."id" = ANY (("current_setting"('app.current_org_ids'::"text", true))::"uuid"[])))));



CREATE POLICY "crm_projects_select_policy" ON "public"."crm_projects" FOR SELECT USING (("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."id" = ANY (("current_setting"('app.current_org_ids'::"text", true))::"uuid"[])))));



CREATE POLICY "crm_projects_update_policy" ON "public"."crm_projects" FOR UPDATE USING (("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."id" = ANY (("current_setting"('app.current_org_ids'::"text", true))::"uuid"[])))));



ALTER TABLE "public"."crm_tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_tasks_delete_policy" ON "public"."crm_tasks" FOR DELETE USING (("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."id" = ANY (("current_setting"('app.current_org_ids'::"text", true))::"uuid"[])))));



CREATE POLICY "crm_tasks_insert_policy" ON "public"."crm_tasks" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."id" = ANY (("current_setting"('app.current_org_ids'::"text", true))::"uuid"[])))));



CREATE POLICY "crm_tasks_select_policy" ON "public"."crm_tasks" FOR SELECT USING (("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."id" = ANY (("current_setting"('app.current_org_ids'::"text", true))::"uuid"[])))));



CREATE POLICY "crm_tasks_update_policy" ON "public"."crm_tasks" FOR UPDATE USING (("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."id" = ANY (("current_setting"('app.current_org_ids'::"text", true))::"uuid"[])))));



ALTER TABLE "public"."crm_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crm_templates_delete_policy" ON "public"."crm_templates" FOR DELETE USING ((("created_by" = "auth"."uid"()) AND ("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))));



CREATE POLICY "crm_templates_insert_policy" ON "public"."crm_templates" FOR INSERT WITH CHECK ((("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) AND ("created_by" = "auth"."uid"())));



CREATE POLICY "crm_templates_select_policy" ON "public"."crm_templates" FOR SELECT USING ((("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) AND (("created_by" = "auth"."uid"()) OR ("is_public" = true)) AND ("is_active" = true)));



CREATE POLICY "crm_templates_update_policy" ON "public"."crm_templates" FOR UPDATE USING ((("created_by" = "auth"."uid"()) AND ("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))));



ALTER TABLE "public"."custom_fields" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "custom_fields_insert_policy" ON "public"."custom_fields" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."id" = ANY (("current_setting"('app.current_org_ids'::"text", true))::"uuid"[])))));



CREATE POLICY "custom_fields_select_policy" ON "public"."custom_fields" FOR SELECT USING (("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."id" = ANY (("current_setting"('app.current_org_ids'::"text", true))::"uuid"[])))));



CREATE POLICY "custom_fields_update_policy" ON "public"."custom_fields" FOR UPDATE USING (("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."id" = ANY (("current_setting"('app.current_org_ids'::"text", true))::"uuid"[])))));



ALTER TABLE "public"."custom_min_nights" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."custom_prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."deposit_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evolution_instances" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "filter_deleted_channel_config" ON "public"."organization_channel_config" FOR SELECT USING (("deleted_at" IS NULL));



COMMENT ON POLICY "filter_deleted_channel_config" ON "public"."organization_channel_config" IS 'Policy para filtrar registros soft-deleted nas queries SELECT';



ALTER TABLE "public"."financeiro_categorias" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."financeiro_centro_custos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."financeiro_contas_bancarias" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."financeiro_lancamentos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."financeiro_lancamentos_splits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."financeiro_linhas_extrato" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."financeiro_regras_conciliacao" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."financeiro_titulos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."geographic_regions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guest_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kv_store_67caf26a" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."listing_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "listing_settings_delete_policy" ON "public"."listing_settings" FOR DELETE USING (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "listing_settings_insert_policy" ON "public"."listing_settings" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "listing_settings_select_policy" ON "public"."listing_settings" FOR SELECT USING (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "listing_settings_update_policy" ON "public"."listing_settings" FOR UPDATE USING (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



ALTER TABLE "public"."listings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "marketplace_conv_insert" ON "public"."re_marketplace_conversations" FOR INSERT WITH CHECK ((("org_a_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR ("org_b_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))));



CREATE POLICY "marketplace_conv_select" ON "public"."re_marketplace_conversations" FOR SELECT USING ((("org_a_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR ("org_b_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))));



CREATE POLICY "marketplace_conv_update" ON "public"."re_marketplace_conversations" FOR UPDATE USING ((("org_a_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR ("org_b_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))));



CREATE POLICY "marketplace_msg_insert" ON "public"."re_marketplace_messages" FOR INSERT WITH CHECK ((("sender_profile_id" = "auth"."uid"()) AND ("conversation_id" IN ( SELECT "re_marketplace_conversations"."id"
   FROM "public"."re_marketplace_conversations"
  WHERE (("re_marketplace_conversations"."org_a_id" IN ( SELECT "users"."organization_id"
           FROM "public"."users"
          WHERE ("users"."id" = "auth"."uid"()))) OR ("re_marketplace_conversations"."org_b_id" IN ( SELECT "users"."organization_id"
           FROM "public"."users"
          WHERE ("users"."id" = "auth"."uid"()))))))));



CREATE POLICY "marketplace_msg_select" ON "public"."re_marketplace_messages" FOR SELECT USING (("conversation_id" IN ( SELECT "re_marketplace_conversations"."id"
   FROM "public"."re_marketplace_conversations"
  WHERE (("re_marketplace_conversations"."org_a_id" IN ( SELECT "users"."organization_id"
           FROM "public"."users"
          WHERE ("users"."id" = "auth"."uid"()))) OR ("re_marketplace_conversations"."org_b_id" IN ( SELECT "users"."organization_id"
           FROM "public"."users"
          WHERE ("users"."id" = "auth"."uid"())))))));



CREATE POLICY "marketplace_msg_update" ON "public"."re_marketplace_messages" FOR UPDATE USING ((("sender_profile_id" = "auth"."uid"()) OR ("conversation_id" IN ( SELECT "re_marketplace_conversations"."id"
   FROM "public"."re_marketplace_conversations"
  WHERE (("re_marketplace_conversations"."org_a_id" IN ( SELECT "users"."organization_id"
           FROM "public"."users"
          WHERE ("users"."id" = "auth"."uid"()))) OR ("re_marketplace_conversations"."org_b_id" IN ( SELECT "users"."organization_id"
           FROM "public"."users"
          WHERE ("users"."id" = "auth"."uid"()))))))));



CREATE POLICY "marketplace_part_select" ON "public"."re_marketplace_participants" FOR SELECT USING ((("profile_id" = "auth"."uid"()) OR ("conversation_id" IN ( SELECT "re_marketplace_conversations"."id"
   FROM "public"."re_marketplace_conversations"
  WHERE (("re_marketplace_conversations"."org_a_id" IN ( SELECT "users"."organization_id"
           FROM "public"."users"
          WHERE ("users"."id" = "auth"."uid"()))) OR ("re_marketplace_conversations"."org_b_id" IN ( SELECT "users"."organization_id"
           FROM "public"."users"
          WHERE ("users"."id" = "auth"."uid"()))))))));



ALTER TABLE "public"."notification_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_trigger_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_insert_service" ON "public"."notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "notifications_select_policy" ON "public"."notifications" FOR SELECT USING (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "op_tasks_insert_policy" ON "public"."operational_tasks" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."id" = ANY (("current_setting"('app.current_org_ids'::"text", true))::"uuid"[])))));



CREATE POLICY "op_tasks_select_policy" ON "public"."operational_tasks" FOR SELECT USING (("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."id" = ANY (("current_setting"('app.current_org_ids'::"text", true))::"uuid"[])))));



CREATE POLICY "op_tasks_update_policy" ON "public"."operational_tasks" FOR UPDATE USING (("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."id" = ANY (("current_setting"('app.current_org_ids'::"text", true))::"uuid"[])))));



CREATE POLICY "op_templates_insert_policy" ON "public"."operational_task_templates" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."id" = ANY (("current_setting"('app.current_org_ids'::"text", true))::"uuid"[])))));



CREATE POLICY "op_templates_select_policy" ON "public"."operational_task_templates" FOR SELECT USING (("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."id" = ANY (("current_setting"('app.current_org_ids'::"text", true))::"uuid"[])))));



CREATE POLICY "op_templates_update_policy" ON "public"."operational_task_templates" FOR UPDATE USING (("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."id" = ANY (("current_setting"('app.current_org_ids'::"text", true))::"uuid"[])))));



ALTER TABLE "public"."operational_task_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."operational_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_channel_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_settings_delete_policy" ON "public"."organization_settings" FOR DELETE USING (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "organization_settings_insert_policy" ON "public"."organization_settings" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "organization_settings_select_policy" ON "public"."organization_settings" FOR SELECT USING (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "organization_settings_update_policy" ON "public"."organization_settings" FOR UPDATE USING (("organization_id" IN ( SELECT "users"."organization_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ota_amenity_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ota_api_credentials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ota_bed_type_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ota_cancellation_policy_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ota_fee_type_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ota_image_category_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ota_language_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ota_payment_type_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ota_property_type_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ota_rate_plan_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ota_region_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ota_reservation_status_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ota_room_type_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ota_room_view_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ota_sync_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ota_theme_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ota_webhook_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ota_webhooks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."owner_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."owners" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pagarme_orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pagarme_orders_service_policy" ON "public"."pagarme_orders" USING (true) WITH CHECK (true);



ALTER TABLE "public"."payment_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."predetermined_funnel_stages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "predetermined_funnel_stages_policy" ON "public"."predetermined_funnel_stages" USING ((EXISTS ( SELECT 1
   FROM "public"."predetermined_funnels" "f"
  WHERE (("f"."id" = "predetermined_funnel_stages"."funnel_id") AND ("f"."organization_id" = ("current_setting"('app.current_organization_id'::"text", true))::"uuid")))));



ALTER TABLE "public"."predetermined_funnels" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "predetermined_funnels_org_policy" ON "public"."predetermined_funnels" USING (("organization_id" = ("current_setting"('app.current_organization_id'::"text", true))::"uuid"));



ALTER TABLE "public"."predetermined_item_activities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "predetermined_item_activities_policy" ON "public"."predetermined_item_activities" USING ((EXISTS ( SELECT 1
   FROM "public"."predetermined_items" "i"
  WHERE (("i"."id" = "predetermined_item_activities"."item_id") AND ("i"."organization_id" = ("current_setting"('app.current_organization_id'::"text", true))::"uuid")))));



ALTER TABLE "public"."predetermined_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "predetermined_items_org_policy" ON "public"."predetermined_items" USING (("organization_id" = ("current_setting"('app.current_organization_id'::"text", true))::"uuid"));



ALTER TABLE "public"."pricing_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."properties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."property_cancellation_penalties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."property_channel_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."property_ota_extensions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."public.users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rate_plan_availability" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rate_plan_pricing_overrides" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rate_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."re_broker_campaign_participation" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."re_broker_campaigns" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "re_broker_campaigns_insert" ON "public"."re_broker_campaigns" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "re_companies"."id"
   FROM "public"."re_companies"
  WHERE ("re_companies"."organization_id" = ( SELECT "re_companies"."organization_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "re_broker_campaigns_select" ON "public"."re_broker_campaigns" FOR SELECT USING (("company_id" IN ( SELECT "re_companies"."id"
   FROM "public"."re_companies"
  WHERE ("re_companies"."organization_id" = ( SELECT "re_companies"."organization_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"())))
UNION
 SELECT "re_brokers"."linked_company_id"
   FROM "public"."re_brokers"
  WHERE (("re_brokers"."organization_id" = ( SELECT "re_brokers"."organization_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))) AND ("re_brokers"."broker_type" = 'linked'::"text") AND ((("re_brokers"."permissions" ->> 'can_see_campaigns'::"text"))::boolean = true)))));



ALTER TABLE "public"."re_broker_chat_channels" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "re_broker_chat_channels_insert" ON "public"."re_broker_chat_channels" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "re_companies"."id"
   FROM "public"."re_companies"
  WHERE ("re_companies"."organization_id" = ( SELECT "re_companies"."organization_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "re_broker_chat_channels_select" ON "public"."re_broker_chat_channels" FOR SELECT USING (("company_id" IN ( SELECT "re_companies"."id"
   FROM "public"."re_companies"
  WHERE ("re_companies"."organization_id" = ( SELECT "re_companies"."organization_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"())))
UNION
 SELECT "re_brokers"."linked_company_id"
   FROM "public"."re_brokers"
  WHERE (("re_brokers"."organization_id" = ( SELECT "re_brokers"."organization_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))) AND ("re_brokers"."broker_type" = 'linked'::"text") AND ((("re_brokers"."permissions" ->> 'can_see_chat'::"text"))::boolean = true)))));



ALTER TABLE "public"."re_broker_chat_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "re_broker_chat_messages_insert" ON "public"."re_broker_chat_messages" FOR INSERT WITH CHECK (("broker_id" IN ( SELECT "re_brokers"."id"
   FROM "public"."re_brokers"
  WHERE ("re_brokers"."organization_id" = ( SELECT "re_brokers"."organization_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "re_broker_chat_messages_select" ON "public"."re_broker_chat_messages" FOR SELECT USING (("channel_id" IN ( SELECT "re_broker_chat_channels"."id"
   FROM "public"."re_broker_chat_channels"
  WHERE ("re_broker_chat_channels"."company_id" IN ( SELECT "re_companies"."id"
           FROM "public"."re_companies"
          WHERE ("re_companies"."organization_id" = ( SELECT "re_companies"."organization_id"
                   FROM "public"."profiles"
                  WHERE ("profiles"."id" = "auth"."uid"())))
        UNION
         SELECT "re_brokers"."linked_company_id"
           FROM "public"."re_brokers"
          WHERE (("re_brokers"."organization_id" = ( SELECT "re_brokers"."organization_id"
                   FROM "public"."profiles"
                  WHERE ("profiles"."id" = "auth"."uid"()))) AND ("re_brokers"."broker_type" = 'linked'::"text") AND ((("re_brokers"."permissions" ->> 'can_see_chat'::"text"))::boolean = true)))))));



ALTER TABLE "public"."re_broker_invites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "re_broker_invites_insert" ON "public"."re_broker_invites" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "re_companies"."id"
   FROM "public"."re_companies"
  WHERE ("re_companies"."organization_id" = ( SELECT "re_companies"."organization_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "re_broker_invites_select" ON "public"."re_broker_invites" FOR SELECT USING ((("company_id" IN ( SELECT "re_companies"."id"
   FROM "public"."re_companies"
  WHERE ("re_companies"."organization_id" = ( SELECT "re_companies"."organization_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))) OR ("broker_email" = (( SELECT "users"."email"
   FROM "auth"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text")));



CREATE POLICY "re_broker_invites_update" ON "public"."re_broker_invites" FOR UPDATE USING ((("company_id" IN ( SELECT "re_companies"."id"
   FROM "public"."re_companies"
  WHERE ("re_companies"."organization_id" = ( SELECT "re_companies"."organization_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))) OR ("broker_email" = (( SELECT "users"."email"
   FROM "auth"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text")));



ALTER TABLE "public"."re_broker_rankings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "re_broker_rankings_select" ON "public"."re_broker_rankings" FOR SELECT USING ((("company_id" IN ( SELECT "re_companies"."id"
   FROM "public"."re_companies"
  WHERE ("re_companies"."organization_id" = ( SELECT "re_companies"."organization_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"())))
UNION
 SELECT "re_brokers"."linked_company_id"
   FROM "public"."re_brokers"
  WHERE (("re_brokers"."organization_id" = ( SELECT "re_brokers"."organization_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))) AND ("re_brokers"."broker_type" = 'linked'::"text") AND ((("re_brokers"."permissions" ->> 'can_see_ranking'::"text"))::boolean = true)))) OR ("broker_id" IN ( SELECT "re_brokers"."id"
   FROM "public"."re_brokers"
  WHERE ("re_brokers"."organization_id" = ( SELECT "re_brokers"."organization_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"())))))));



ALTER TABLE "public"."re_brokers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."re_companies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "re_companies_org_write" ON "public"."re_companies" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "re_companies_public_read" ON "public"."re_companies" FOR SELECT USING (true);



ALTER TABLE "public"."re_demands" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."re_developments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "re_developments_public_read" ON "public"."re_developments" FOR SELECT USING (true);



ALTER TABLE "public"."re_marketplace_conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."re_marketplace_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."re_marketplace_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."re_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."re_partnerships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."re_reservations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."re_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."re_units" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "re_units_public_read" ON "public"."re_units" FOR SELECT USING (true);



ALTER TABLE "public"."reconciliation_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reconciliation_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."refunds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reservation_additional_guests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reservation_cancellations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reservation_deposits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reservation_pricing_breakdown" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reservation_rooms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reservations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."room_photos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rooms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales_deal_activities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sales_deal_activities_policy" ON "public"."sales_deal_activities" USING ((EXISTS ( SELECT 1
   FROM "public"."sales_deals" "d"
  WHERE (("d"."id" = "sales_deal_activities"."deal_id") AND ("d"."organization_id" = ("current_setting"('app.current_organization_id'::"text", true))::"uuid")))));



ALTER TABLE "public"."sales_deals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sales_deals_org_policy" ON "public"."sales_deals" USING (("organization_id" = ("current_setting"('app.current_organization_id'::"text", true))::"uuid"));



ALTER TABLE "public"."sales_funnel_stages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sales_funnel_stages_policy" ON "public"."sales_funnel_stages" USING ((EXISTS ( SELECT 1
   FROM "public"."sales_funnels" "f"
  WHERE (("f"."id" = "sales_funnel_stages"."funnel_id") AND ("f"."organization_id" = ("current_setting"('app.current_organization_id'::"text", true))::"uuid")))));



ALTER TABLE "public"."sales_funnels" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sales_funnels_org_policy" ON "public"."sales_funnels" USING (("organization_id" = ("current_setting"('app.current_organization_id'::"text", true))::"uuid"));



ALTER TABLE "public"."saved_payment_methods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_funnel_stages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_funnel_stages_policy" ON "public"."service_funnel_stages" USING ((EXISTS ( SELECT 1
   FROM "public"."service_funnels" "f"
  WHERE (("f"."id" = "service_funnel_stages"."funnel_id") AND ("f"."organization_id" = ("current_setting"('app.current_organization_id'::"text", true))::"uuid")))));



ALTER TABLE "public"."service_funnels" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_funnels_org_policy" ON "public"."service_funnels" USING (("organization_id" = ("current_setting"('app.current_organization_id'::"text", true))::"uuid"));



CREATE POLICY "service_role_all_guest_users" ON "public"."guest_users" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."service_ticket_activities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_ticket_activities_policy" ON "public"."service_ticket_activities" USING ((EXISTS ( SELECT 1
   FROM "public"."service_tickets" "t"
  WHERE (("t"."id" = "service_ticket_activities"."ticket_id") AND ("t"."organization_id" = ("current_setting"('app.current_organization_id'::"text", true))::"uuid")))));



ALTER TABLE "public"."service_tickets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_tickets_org_policy" ON "public"."service_tickets" USING (("organization_id" = ("current_setting"('app.current_organization_id'::"text", true))::"uuid"));



ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."short_ids" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staysnet_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staysnet_properties_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staysnet_raw_objects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staysnet_reservations_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staysnet_sync_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staysnet_webhooks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teams_delete_policy" ON "public"."teams" FOR DELETE USING (("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."id" = ANY (("current_setting"('app.current_org_ids'::"text", true))::"uuid"[])))));



CREATE POLICY "teams_insert_policy" ON "public"."teams" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."id" = ANY (("current_setting"('app.current_org_ids'::"text", true))::"uuid"[])))));



CREATE POLICY "teams_select_policy" ON "public"."teams" FOR SELECT USING (("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."id" = ANY (("current_setting"('app.current_org_ids'::"text", true))::"uuid"[])))));



CREATE POLICY "teams_update_policy" ON "public"."teams" FOR UPDATE USING (("organization_id" IN ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."id" = ANY (("current_setting"('app.current_org_ids'::"text", true))::"uuid"[])))));



CREATE POLICY "tenant_isolation_channel_config" ON "public"."organization_channel_config" USING ((("auth"."role"() = 'service_role'::"text") OR (("organization_id")::"text" = COALESCE("current_setting"('app.current_organization_id'::"text", true), ''::"text")))) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR (("organization_id")::"text" = COALESCE("current_setting"('app.current_organization_id'::"text", true), ''::"text"))));



COMMENT ON POLICY "tenant_isolation_channel_config" ON "public"."organization_channel_config" IS 'Policy multi-tenant: isola dados por organization_id. Service role (Edge Functions) tem acesso total.';



ALTER TABLE "public"."user_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."virtual_cards" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "readonly_user";



GRANT ALL ON FUNCTION "public"."calculate_effective_price"("p_property_id" "uuid", "p_rate_plan_id" "uuid", "p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_effective_price"("p_property_id" "uuid", "p_rate_plan_id" "uuid", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_effective_price"("p_property_id" "uuid", "p_rate_plan_id" "uuid", "p_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_payment_net_amount"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_payment_net_amount"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_payment_net_amount"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_stay_price"("p_property_id" "uuid", "p_checkin" "date", "p_checkout" "date", "p_rate_plan_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_stay_price"("p_property_id" "uuid", "p_checkin" "date", "p_checkout" "date", "p_rate_plan_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_stay_price"("p_property_id" "uuid", "p_checkin" "date", "p_checkout" "date", "p_rate_plan_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_operational_tasks_on_reservation_cancel"() TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_operational_tasks_on_reservation_cancel"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_operational_tasks_on_reservation_cancel"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_deal_has_contact_or_company"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_deal_has_contact_or_company"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_deal_has_contact_or_company"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_owner_user_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_owner_user_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_owner_user_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions_v2"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions_v2"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions_v2"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_standard_rate_plan_for_property"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_standard_rate_plan_for_property"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_standard_rate_plan_for_property"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_from_contact"("p_contact_id" "uuid", "p_role" character varying, "p_send_invite" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_from_contact"("p_contact_id" "uuid", "p_role" character varying, "p_send_invite" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_from_contact"("p_contact_id" "uuid", "p_role" character varying, "p_send_invite" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_version_snapshot"("p_anuncio_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_version_snapshot"("p_anuncio_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_version_snapshot"("p_anuncio_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."criar_plano_contas_para_organizacao"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."criar_plano_contas_para_organizacao"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."criar_plano_contas_para_organizacao"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_reservation_property_link"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_reservation_property_link"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_reservation_property_link"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_property_owner"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_property_owner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_property_owner"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_single_active_ai_config"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_single_active_ai_config"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_single_active_ai_config"() TO "service_role";



GRANT ALL ON FUNCTION "public"."expand_date_range"("start_date" "date", "end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."expand_date_range"("start_date" "date", "end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."expand_date_range"("start_date" "date", "end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."find_instance_by_name"("p_provider" "text", "p_instance_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."find_instance_by_name"("p_provider" "text", "p_instance_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_instance_by_name"("p_provider" "text", "p_instance_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_operational_tasks_from_reservation"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_operational_tasks_from_reservation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_operational_tasks_from_reservation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_scheduled_operational_tasks"("p_organization_id" "uuid", "p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_scheduled_operational_tasks"("p_organization_id" "uuid", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_scheduled_operational_tasks"("p_organization_id" "uuid", "p_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_secure_token"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_secure_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_secure_token"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_tasks_for_existing_reservations"("p_organization_id" "uuid", "p_from_date" "date", "p_to_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_tasks_for_existing_reservations"("p_organization_id" "uuid", "p_from_date" "date", "p_to_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_tasks_for_existing_reservations"("p_organization_id" "uuid", "p_from_date" "date", "p_to_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_unique_short_id"("p_organization_id" "uuid", "p_length" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_unique_short_id"("p_organization_id" "uuid", "p_length" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_unique_short_id"("p_organization_id" "uuid", "p_length" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_calendar_rule_for_date"("p_organization_id" "uuid", "p_property_id" "uuid", "p_date" "date", "p_apply_batch_rules" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_calendar_rule_for_date"("p_organization_id" "uuid", "p_property_id" "uuid", "p_date" "date", "p_apply_batch_rules" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_calendar_rule_for_date"("p_organization_id" "uuid", "p_property_id" "uuid", "p_date" "date", "p_apply_batch_rules" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_default_rate_plan_id"("p_property_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_default_rate_plan_id"("p_property_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_default_rate_plan_id"("p_property_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_hosting_provider_token"("site_id" "uuid", "provider" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_hosting_provider_token"("site_id" "uuid", "provider" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_hosting_provider_token"("site_id" "uuid", "provider" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_or_create_conversation"("p_organization_id" "uuid", "p_channel_type" "text", "p_external_id" "text", "p_contact_name" "text", "p_contact_identifier" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_or_create_conversation"("p_organization_id" "uuid", "p_channel_type" "text", "p_external_id" "text", "p_contact_name" "text", "p_contact_identifier" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_or_create_conversation"("p_organization_id" "uuid", "p_channel_type" "text", "p_external_id" "text", "p_contact_name" "text", "p_contact_identifier" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_or_create_marketplace_conversation"("p_my_org_id" "uuid", "p_target_org_id" "uuid", "p_related_type" "text", "p_related_id" "uuid", "p_title" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_or_create_marketplace_conversation"("p_my_org_id" "uuid", "p_target_org_id" "uuid", "p_related_type" "text", "p_related_id" "uuid", "p_title" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_or_create_marketplace_conversation"("p_my_org_id" "uuid", "p_target_org_id" "uuid", "p_related_type" "text", "p_related_id" "uuid", "p_title" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_property_responsibility_stats"("p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_property_responsibility_stats"("p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_property_responsibility_stats"("p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_stay_total_price"("p_property_id" "uuid", "p_check_in" "date", "p_check_out" "date", "p_rate_plan_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_stay_total_price"("p_property_id" "uuid", "p_check_in" "date", "p_check_out" "date", "p_rate_plan_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_stay_total_price"("p_property_id" "uuid", "p_check_in" "date", "p_check_out" "date", "p_rate_plan_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tasks_with_hierarchy"("p_organization_id" "uuid", "p_parent_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_tasks_with_hierarchy"("p_organization_id" "uuid", "p_parent_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tasks_with_hierarchy"("p_organization_id" "uuid", "p_parent_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hash_password"("password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."hash_password"("password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hash_password"("password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_template_use_count"("template_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_template_use_count"("template_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_template_use_count"("template_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_reservation_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_reservation_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_reservation_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_reservation_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_reservation_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_reservation_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."lookup_organization_id_by_imobiliaria_id"("p_imobiliaria_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."lookup_organization_id_by_imobiliaria_id"("p_imobiliaria_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lookup_organization_id_by_imobiliaria_id"("p_imobiliaria_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_marketplace_conversation_as_read"("p_conversation_id" "uuid", "p_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_marketplace_conversation_as_read"("p_conversation_id" "uuid", "p_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_marketplace_conversation_as_read"("p_conversation_id" "uuid", "p_profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."migrate_guest_to_crm_contact"("p_guest_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."migrate_guest_to_crm_contact"("p_guest_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."migrate_guest_to_crm_contact"("p_guest_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."parse_phone_number"("phone_raw" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."parse_phone_number"("phone_raw" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."parse_phone_number"("phone_raw" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_properties_staysnet_placeholder"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_properties_staysnet_placeholder"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_properties_staysnet_placeholder"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_ota_webhook"("webhook_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."process_ota_webhook"("webhook_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_ota_webhook"("webhook_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."publish_anuncio"("p_draft_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."publish_anuncio"("p_draft_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."publish_anuncio"("p_draft_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."registrar_campo_financeiro"("p_organization_id" "uuid", "p_modulo" "text", "p_campo_codigo" "text", "p_campo_nome" "text", "p_campo_tipo" "text", "p_descricao" "text", "p_registered_by_module" "text", "p_obrigatorio" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."registrar_campo_financeiro"("p_organization_id" "uuid", "p_modulo" "text", "p_campo_codigo" "text", "p_campo_nome" "text", "p_campo_tipo" "text", "p_descricao" "text", "p_registered_by_module" "text", "p_obrigatorio" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."registrar_campo_financeiro"("p_organization_id" "uuid", "p_modulo" "text", "p_campo_codigo" "text", "p_campo_nome" "text", "p_campo_tipo" "text", "p_descricao" "text", "p_registered_by_module" "text", "p_obrigatorio" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."restore_version"("p_version_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."restore_version"("p_version_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_version"("p_version_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."retry_failed_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."retry_failed_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."retry_failed_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."save_anuncio_batch"("p_anuncio_id" "uuid", "p_changes" "jsonb", "p_organization_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."save_anuncio_batch"("p_anuncio_id" "uuid", "p_changes" "jsonb", "p_organization_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_anuncio_batch"("p_anuncio_id" "uuid", "p_changes" "jsonb", "p_organization_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_anuncio_field"("p_anuncio_id" "uuid", "p_field" "text", "p_value" "text", "p_idempotency_key" "text", "p_organization_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."save_anuncio_field"("p_anuncio_id" "uuid", "p_field" "text", "p_value" "text", "p_idempotency_key" "text", "p_organization_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_anuncio_field"("p_anuncio_id" "uuid", "p_field" "text", "p_value" "text", "p_idempotency_key" "text", "p_organization_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_organization_currency_settings"("org_id" "uuid", "settings" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."set_organization_currency_settings"("org_id" "uuid", "settings" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_organization_currency_settings"("org_id" "uuid", "settings" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_organization_discount_packages"("p_organization_id" "uuid", "p_settings" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_organization_discount_packages"("p_organization_id" "uuid", "p_settings" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."set_organization_discount_packages"("p_organization_id" "uuid", "p_settings" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_organization_discount_packages"("p_organization_id" "uuid", "p_settings" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_timestamp_drafts"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_timestamp_drafts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_timestamp_drafts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at_evolution_instances"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at_evolution_instances"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at_evolution_instances"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at_staysnet_import_issues"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at_staysnet_import_issues"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at_staysnet_import_issues"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at_stripe_checkout_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at_stripe_checkout_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at_stripe_checkout_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at_stripe_configs"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at_stripe_configs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at_stripe_configs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."try_parse_jsonb"("p_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."try_parse_jsonb"("p_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."try_parse_jsonb"("p_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ai_agent_unidades_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_ai_agent_unidades_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ai_agent_unidades_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ai_provider_configs_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_ai_provider_configs_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ai_provider_configs_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_automations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_automations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_automations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_campo_mapping_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_campo_mapping_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_campo_mapping_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_channel_contacts_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_channel_contacts_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_channel_contacts_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_channel_instances_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_channel_instances_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_channel_instances_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_chat_channel_configs_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_chat_channel_configs_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_chat_channel_configs_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_chat_conversations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_chat_conversations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_chat_conversations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_client_sites_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_client_sites_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_client_sites_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_completion_percentage"("p_anuncio_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_completion_percentage"("p_anuncio_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_completion_percentage"("p_anuncio_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_on_new_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_on_new_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_on_new_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_crm_card_items_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_crm_card_items_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_crm_card_items_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_crm_companies_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_crm_companies_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_crm_companies_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_crm_contacts_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_crm_contacts_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_crm_contacts_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_crm_lost_reasons_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_crm_lost_reasons_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_crm_lost_reasons_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_crm_notes_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_crm_notes_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_crm_notes_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_crm_products_services_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_crm_products_services_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_crm_products_services_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_crm_tasks_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_crm_tasks_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_crm_tasks_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_crm_templates_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_crm_templates_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_crm_templates_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_financeiro_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_financeiro_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_financeiro_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_guest_users_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_guest_users_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_guest_users_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_kv_store_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_kv_store_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_kv_store_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_lost_reason_usage"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_lost_reason_usage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_lost_reason_usage"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_marketplace_conversation_last_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_marketplace_conversation_last_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_marketplace_conversation_last_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_messages_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_messages_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_messages_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_notifications_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_notifications_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_notifications_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_operational_tasks_on_reservation_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_operational_tasks_on_reservation_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_operational_tasks_on_reservation_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_owner_users_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_owner_users_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_owner_users_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_predetermined_funnels_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_predetermined_funnels_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_predetermined_funnels_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_predetermined_items_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_predetermined_items_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_predetermined_items_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_project_progress"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_project_progress"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_project_progress"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_property_channel_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_property_channel_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_property_channel_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_property_rooms_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_property_rooms_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_property_rooms_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_rate_plan_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_rate_plan_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_rate_plan_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_reservations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_reservations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_reservations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_sales_deals_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_sales_deals_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_sales_deals_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_sales_funnels_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_sales_funnels_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_sales_funnels_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_service_funnels_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_service_funnels_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_service_funnels_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_service_tickets_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_service_tickets_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_service_tickets_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_staysnet_config_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_staysnet_config_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_staysnet_config_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_users_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_users_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_users_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_webhook_subscription_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_webhook_subscription_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_webhook_subscription_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_categoria_parent_org"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_categoria_parent_org"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_categoria_parent_org"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_tenant_by_imobiliaria_id"("p_imobiliaria_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_tenant_by_imobiliaria_id"("p_imobiliaria_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_tenant_by_imobiliaria_id"("p_imobiliaria_id" "text") TO "service_role";



GRANT ALL ON TABLE "public"."accommodation_rules" TO "anon";
GRANT ALL ON TABLE "public"."accommodation_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."accommodation_rules" TO "service_role";
GRANT SELECT ON TABLE "public"."accommodation_rules" TO "readonly_user";



GRANT ALL ON TABLE "public"."activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_logs" TO "service_role";
GRANT SELECT ON TABLE "public"."activity_logs" TO "readonly_user";



GRANT ALL ON TABLE "public"."ai_agent_construtoras" TO "anon";
GRANT ALL ON TABLE "public"."ai_agent_construtoras" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_agent_construtoras" TO "service_role";
GRANT SELECT ON TABLE "public"."ai_agent_construtoras" TO "readonly_user";



GRANT ALL ON TABLE "public"."ai_agent_empreendimentos" TO "anon";
GRANT ALL ON TABLE "public"."ai_agent_empreendimentos" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_agent_empreendimentos" TO "service_role";
GRANT SELECT ON TABLE "public"."ai_agent_empreendimentos" TO "readonly_user";



GRANT ALL ON TABLE "public"."ai_agent_unidades" TO "anon";
GRANT ALL ON TABLE "public"."ai_agent_unidades" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_agent_unidades" TO "service_role";
GRANT SELECT ON TABLE "public"."ai_agent_unidades" TO "readonly_user";



GRANT ALL ON TABLE "public"."ai_provider_configs" TO "anon";
GRANT ALL ON TABLE "public"."ai_provider_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_provider_configs" TO "service_role";
GRANT SELECT ON TABLE "public"."ai_provider_configs" TO "readonly_user";



GRANT ALL ON TABLE "public"."anuncios_field_changes" TO "anon";
GRANT ALL ON TABLE "public"."anuncios_field_changes" TO "authenticated";
GRANT ALL ON TABLE "public"."anuncios_field_changes" TO "service_role";
GRANT SELECT ON TABLE "public"."anuncios_field_changes" TO "readonly_user";



GRANT ALL ON TABLE "public"."anuncios_pending_changes" TO "anon";
GRANT ALL ON TABLE "public"."anuncios_pending_changes" TO "authenticated";
GRANT ALL ON TABLE "public"."anuncios_pending_changes" TO "service_role";
GRANT SELECT ON TABLE "public"."anuncios_pending_changes" TO "readonly_user";



GRANT ALL ON TABLE "public"."anuncios_published" TO "anon";
GRANT ALL ON TABLE "public"."anuncios_published" TO "authenticated";
GRANT ALL ON TABLE "public"."anuncios_published" TO "service_role";
GRANT SELECT ON TABLE "public"."anuncios_published" TO "readonly_user";



GRANT ALL ON TABLE "public"."properties" TO "anon";
GRANT ALL ON TABLE "public"."properties" TO "authenticated";
GRANT ALL ON TABLE "public"."properties" TO "service_role";
GRANT SELECT ON TABLE "public"."properties" TO "readonly_user";



GRANT ALL ON TABLE "public"."anuncios_health" TO "anon";
GRANT ALL ON TABLE "public"."anuncios_health" TO "authenticated";
GRANT ALL ON TABLE "public"."anuncios_health" TO "service_role";
GRANT SELECT ON TABLE "public"."anuncios_health" TO "readonly_user";



GRANT ALL ON TABLE "public"."anuncios_versions" TO "anon";
GRANT ALL ON TABLE "public"."anuncios_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."anuncios_versions" TO "service_role";
GRANT SELECT ON TABLE "public"."anuncios_versions" TO "readonly_user";



GRANT ALL ON TABLE "public"."automation_executions" TO "anon";
GRANT ALL ON TABLE "public"."automation_executions" TO "authenticated";
GRANT ALL ON TABLE "public"."automation_executions" TO "service_role";
GRANT SELECT ON TABLE "public"."automation_executions" TO "readonly_user";



GRANT ALL ON TABLE "public"."automations" TO "anon";
GRANT ALL ON TABLE "public"."automations" TO "authenticated";
GRANT ALL ON TABLE "public"."automations" TO "service_role";
GRANT SELECT ON TABLE "public"."automations" TO "readonly_user";



GRANT ALL ON TABLE "public"."bed_types" TO "anon";
GRANT ALL ON TABLE "public"."bed_types" TO "authenticated";
GRANT ALL ON TABLE "public"."bed_types" TO "service_role";
GRANT SELECT ON TABLE "public"."bed_types" TO "readonly_user";



GRANT ALL ON TABLE "public"."beds" TO "anon";
GRANT ALL ON TABLE "public"."beds" TO "authenticated";
GRANT ALL ON TABLE "public"."beds" TO "service_role";
GRANT SELECT ON TABLE "public"."beds" TO "readonly_user";



GRANT ALL ON TABLE "public"."billing_contacts" TO "anon";
GRANT ALL ON TABLE "public"."billing_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_contacts" TO "service_role";
GRANT SELECT ON TABLE "public"."billing_contacts" TO "readonly_user";



GRANT ALL ON TABLE "public"."blocks" TO "anon";
GRANT ALL ON TABLE "public"."blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."blocks" TO "service_role";
GRANT SELECT ON TABLE "public"."blocks" TO "readonly_user";



GRANT ALL ON TABLE "public"."calendar_pricing_rules" TO "anon";
GRANT ALL ON TABLE "public"."calendar_pricing_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_pricing_rules" TO "service_role";
GRANT SELECT ON TABLE "public"."calendar_pricing_rules" TO "readonly_user";



GRANT ALL ON TABLE "public"."cancellation_policy_templates" TO "anon";
GRANT ALL ON TABLE "public"."cancellation_policy_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."cancellation_policy_templates" TO "service_role";
GRANT SELECT ON TABLE "public"."cancellation_policy_templates" TO "readonly_user";



GRANT ALL ON TABLE "public"."canonical_amenities" TO "anon";
GRANT ALL ON TABLE "public"."canonical_amenities" TO "authenticated";
GRANT ALL ON TABLE "public"."canonical_amenities" TO "service_role";
GRANT SELECT ON TABLE "public"."canonical_amenities" TO "readonly_user";



GRANT ALL ON TABLE "public"."canonical_bed_types" TO "anon";
GRANT ALL ON TABLE "public"."canonical_bed_types" TO "authenticated";
GRANT ALL ON TABLE "public"."canonical_bed_types" TO "service_role";
GRANT SELECT ON TABLE "public"."canonical_bed_types" TO "readonly_user";



GRANT ALL ON TABLE "public"."canonical_fee_types" TO "anon";
GRANT ALL ON TABLE "public"."canonical_fee_types" TO "authenticated";
GRANT ALL ON TABLE "public"."canonical_fee_types" TO "service_role";
GRANT SELECT ON TABLE "public"."canonical_fee_types" TO "readonly_user";



GRANT ALL ON TABLE "public"."canonical_image_categories" TO "anon";
GRANT ALL ON TABLE "public"."canonical_image_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."canonical_image_categories" TO "service_role";
GRANT SELECT ON TABLE "public"."canonical_image_categories" TO "readonly_user";



GRANT ALL ON TABLE "public"."canonical_languages" TO "anon";
GRANT ALL ON TABLE "public"."canonical_languages" TO "authenticated";
GRANT ALL ON TABLE "public"."canonical_languages" TO "service_role";
GRANT SELECT ON TABLE "public"."canonical_languages" TO "readonly_user";



GRANT ALL ON TABLE "public"."canonical_payment_types" TO "anon";
GRANT ALL ON TABLE "public"."canonical_payment_types" TO "authenticated";
GRANT ALL ON TABLE "public"."canonical_payment_types" TO "service_role";
GRANT SELECT ON TABLE "public"."canonical_payment_types" TO "readonly_user";



GRANT ALL ON TABLE "public"."canonical_property_types" TO "anon";
GRANT ALL ON TABLE "public"."canonical_property_types" TO "authenticated";
GRANT ALL ON TABLE "public"."canonical_property_types" TO "service_role";
GRANT SELECT ON TABLE "public"."canonical_property_types" TO "readonly_user";



GRANT ALL ON TABLE "public"."canonical_reservation_statuses" TO "anon";
GRANT ALL ON TABLE "public"."canonical_reservation_statuses" TO "authenticated";
GRANT ALL ON TABLE "public"."canonical_reservation_statuses" TO "service_role";
GRANT SELECT ON TABLE "public"."canonical_reservation_statuses" TO "readonly_user";



GRANT ALL ON TABLE "public"."canonical_room_types" TO "anon";
GRANT ALL ON TABLE "public"."canonical_room_types" TO "authenticated";
GRANT ALL ON TABLE "public"."canonical_room_types" TO "service_role";
GRANT SELECT ON TABLE "public"."canonical_room_types" TO "readonly_user";



GRANT ALL ON TABLE "public"."canonical_room_views" TO "anon";
GRANT ALL ON TABLE "public"."canonical_room_views" TO "authenticated";
GRANT ALL ON TABLE "public"."canonical_room_views" TO "service_role";
GRANT SELECT ON TABLE "public"."canonical_room_views" TO "readonly_user";



GRANT ALL ON TABLE "public"."canonical_themes" TO "anon";
GRANT ALL ON TABLE "public"."canonical_themes" TO "authenticated";
GRANT ALL ON TABLE "public"."canonical_themes" TO "service_role";
GRANT SELECT ON TABLE "public"."canonical_themes" TO "readonly_user";



GRANT ALL ON TABLE "public"."channel_contacts" TO "anon";
GRANT ALL ON TABLE "public"."channel_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."channel_contacts" TO "service_role";
GRANT SELECT ON TABLE "public"."channel_contacts" TO "readonly_user";



GRANT ALL ON TABLE "public"."channel_instances" TO "anon";
GRANT ALL ON TABLE "public"."channel_instances" TO "authenticated";
GRANT ALL ON TABLE "public"."channel_instances" TO "service_role";
GRANT SELECT ON TABLE "public"."channel_instances" TO "readonly_user";



GRANT ALL ON TABLE "public"."channex_accounts" TO "anon";
GRANT ALL ON TABLE "public"."channex_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."channex_accounts" TO "service_role";
GRANT SELECT ON TABLE "public"."channex_accounts" TO "readonly_user";



GRANT ALL ON TABLE "public"."channex_channel_connections" TO "anon";
GRANT ALL ON TABLE "public"."channex_channel_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."channex_channel_connections" TO "service_role";
GRANT SELECT ON TABLE "public"."channex_channel_connections" TO "readonly_user";



GRANT ALL ON TABLE "public"."channex_listing_connections" TO "anon";
GRANT ALL ON TABLE "public"."channex_listing_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."channex_listing_connections" TO "service_role";
GRANT SELECT ON TABLE "public"."channex_listing_connections" TO "readonly_user";



GRANT ALL ON TABLE "public"."channex_property_mappings" TO "anon";
GRANT ALL ON TABLE "public"."channex_property_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."channex_property_mappings" TO "service_role";
GRANT SELECT ON TABLE "public"."channex_property_mappings" TO "readonly_user";



GRANT ALL ON TABLE "public"."channex_rate_plan_mappings" TO "anon";
GRANT ALL ON TABLE "public"."channex_rate_plan_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."channex_rate_plan_mappings" TO "service_role";
GRANT SELECT ON TABLE "public"."channex_rate_plan_mappings" TO "readonly_user";



GRANT ALL ON TABLE "public"."channex_room_type_mappings" TO "anon";
GRANT ALL ON TABLE "public"."channex_room_type_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."channex_room_type_mappings" TO "service_role";
GRANT SELECT ON TABLE "public"."channex_room_type_mappings" TO "readonly_user";



GRANT ALL ON TABLE "public"."channex_webhook_logs" TO "anon";
GRANT ALL ON TABLE "public"."channex_webhook_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."channex_webhook_logs" TO "service_role";
GRANT SELECT ON TABLE "public"."channex_webhook_logs" TO "readonly_user";



GRANT ALL ON TABLE "public"."channex_webhooks" TO "anon";
GRANT ALL ON TABLE "public"."channex_webhooks" TO "authenticated";
GRANT ALL ON TABLE "public"."channex_webhooks" TO "service_role";
GRANT SELECT ON TABLE "public"."channex_webhooks" TO "readonly_user";



GRANT ALL ON TABLE "public"."chat_channel_configs" TO "anon";
GRANT ALL ON TABLE "public"."chat_channel_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_channel_configs" TO "service_role";
GRANT SELECT ON TABLE "public"."chat_channel_configs" TO "readonly_user";



GRANT ALL ON TABLE "public"."chat_channels_config" TO "anon";
GRANT ALL ON TABLE "public"."chat_channels_config" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_channels_config" TO "service_role";
GRANT SELECT ON TABLE "public"."chat_channels_config" TO "readonly_user";



GRANT ALL ON TABLE "public"."chat_contacts" TO "anon";
GRANT ALL ON TABLE "public"."chat_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_contacts" TO "service_role";
GRANT SELECT ON TABLE "public"."chat_contacts" TO "readonly_user";



GRANT ALL ON TABLE "public"."chat_contacts_display" TO "anon";
GRANT ALL ON TABLE "public"."chat_contacts_display" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_contacts_display" TO "service_role";
GRANT SELECT ON TABLE "public"."chat_contacts_display" TO "readonly_user";



GRANT ALL ON TABLE "public"."chat_conversations" TO "anon";
GRANT ALL ON TABLE "public"."chat_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_conversations" TO "service_role";
GRANT SELECT ON TABLE "public"."chat_conversations" TO "readonly_user";



GRANT ALL ON TABLE "public"."chat_message_templates" TO "anon";
GRANT ALL ON TABLE "public"."chat_message_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_message_templates" TO "service_role";
GRANT SELECT ON TABLE "public"."chat_message_templates" TO "readonly_user";



GRANT ALL ON TABLE "public"."chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages" TO "service_role";
GRANT SELECT ON TABLE "public"."chat_messages" TO "readonly_user";



GRANT ALL ON TABLE "public"."chat_webhooks" TO "anon";
GRANT ALL ON TABLE "public"."chat_webhooks" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_webhooks" TO "service_role";
GRANT SELECT ON TABLE "public"."chat_webhooks" TO "readonly_user";



GRANT ALL ON TABLE "public"."client_sites" TO "anon";
GRANT ALL ON TABLE "public"."client_sites" TO "authenticated";
GRANT ALL ON TABLE "public"."client_sites" TO "service_role";
GRANT SELECT ON TABLE "public"."client_sites" TO "readonly_user";



GRANT ALL ON TABLE "public"."conversation_activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."conversation_activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_activity_logs" TO "service_role";
GRANT SELECT ON TABLE "public"."conversation_activity_logs" TO "readonly_user";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";
GRANT SELECT ON TABLE "public"."conversations" TO "readonly_user";



GRANT ALL ON TABLE "public"."corporate_payment_configs" TO "anon";
GRANT ALL ON TABLE "public"."corporate_payment_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."corporate_payment_configs" TO "service_role";
GRANT SELECT ON TABLE "public"."corporate_payment_configs" TO "readonly_user";



GRANT ALL ON TABLE "public"."country_iso_codes" TO "anon";
GRANT ALL ON TABLE "public"."country_iso_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."country_iso_codes" TO "service_role";
GRANT SELECT ON TABLE "public"."country_iso_codes" TO "readonly_user";



GRANT ALL ON TABLE "public"."crm_card_items" TO "anon";
GRANT ALL ON TABLE "public"."crm_card_items" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_card_items" TO "service_role";
GRANT SELECT ON TABLE "public"."crm_card_items" TO "readonly_user";



GRANT ALL ON TABLE "public"."crm_companies" TO "anon";
GRANT ALL ON TABLE "public"."crm_companies" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_companies" TO "service_role";
GRANT SELECT ON TABLE "public"."crm_companies" TO "readonly_user";



GRANT ALL ON TABLE "public"."crm_contacts" TO "anon";
GRANT ALL ON TABLE "public"."crm_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_contacts" TO "service_role";
GRANT SELECT ON TABLE "public"."crm_contacts" TO "readonly_user";



GRANT ALL ON TABLE "public"."sales_deals" TO "anon";
GRANT ALL ON TABLE "public"."sales_deals" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_deals" TO "service_role";
GRANT SELECT ON TABLE "public"."sales_deals" TO "readonly_user";



GRANT ALL ON TABLE "public"."crm_companies_with_stats" TO "anon";
GRANT ALL ON TABLE "public"."crm_companies_with_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_companies_with_stats" TO "service_role";
GRANT SELECT ON TABLE "public"."crm_companies_with_stats" TO "readonly_user";



GRANT ALL ON TABLE "public"."crm_contacts_expedia_format" TO "anon";
GRANT ALL ON TABLE "public"."crm_contacts_expedia_format" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_contacts_expedia_format" TO "service_role";
GRANT SELECT ON TABLE "public"."crm_contacts_expedia_format" TO "readonly_user";



GRANT ALL ON TABLE "public"."crm_contacts_summary" TO "anon";
GRANT ALL ON TABLE "public"."crm_contacts_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_contacts_summary" TO "service_role";
GRANT SELECT ON TABLE "public"."crm_contacts_summary" TO "readonly_user";



GRANT ALL ON TABLE "public"."crm_contacts_with_stats" TO "anon";
GRANT ALL ON TABLE "public"."crm_contacts_with_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_contacts_with_stats" TO "service_role";
GRANT SELECT ON TABLE "public"."crm_contacts_with_stats" TO "readonly_user";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";
GRANT SELECT ON TABLE "public"."users" TO "readonly_user";



GRANT ALL ON TABLE "public"."crm_contacts_with_user_access" TO "anon";
GRANT ALL ON TABLE "public"."crm_contacts_with_user_access" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_contacts_with_user_access" TO "service_role";
GRANT SELECT ON TABLE "public"."crm_contacts_with_user_access" TO "readonly_user";



GRANT ALL ON TABLE "public"."crm_lost_reasons" TO "anon";
GRANT ALL ON TABLE "public"."crm_lost_reasons" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_lost_reasons" TO "service_role";
GRANT SELECT ON TABLE "public"."crm_lost_reasons" TO "readonly_user";



GRANT ALL ON TABLE "public"."crm_notes" TO "anon";
GRANT ALL ON TABLE "public"."crm_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_notes" TO "service_role";
GRANT SELECT ON TABLE "public"."crm_notes" TO "readonly_user";



GRANT ALL ON TABLE "public"."crm_products_services" TO "anon";
GRANT ALL ON TABLE "public"."crm_products_services" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_products_services" TO "service_role";
GRANT SELECT ON TABLE "public"."crm_products_services" TO "readonly_user";



GRANT ALL ON TABLE "public"."crm_projects" TO "anon";
GRANT ALL ON TABLE "public"."crm_projects" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_projects" TO "service_role";
GRANT SELECT ON TABLE "public"."crm_projects" TO "readonly_user";



GRANT ALL ON TABLE "public"."crm_tasks" TO "anon";
GRANT ALL ON TABLE "public"."crm_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_tasks" TO "service_role";
GRANT SELECT ON TABLE "public"."crm_tasks" TO "readonly_user";



GRANT ALL ON TABLE "public"."crm_templates" TO "anon";
GRANT ALL ON TABLE "public"."crm_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_templates" TO "service_role";
GRANT SELECT ON TABLE "public"."crm_templates" TO "readonly_user";



GRANT ALL ON TABLE "public"."custom_field_values" TO "anon";
GRANT ALL ON TABLE "public"."custom_field_values" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_field_values" TO "service_role";
GRANT SELECT ON TABLE "public"."custom_field_values" TO "readonly_user";



GRANT ALL ON TABLE "public"."custom_fields" TO "anon";
GRANT ALL ON TABLE "public"."custom_fields" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_fields" TO "service_role";
GRANT SELECT ON TABLE "public"."custom_fields" TO "readonly_user";



GRANT ALL ON TABLE "public"."custom_min_nights" TO "anon";
GRANT ALL ON TABLE "public"."custom_min_nights" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_min_nights" TO "service_role";
GRANT SELECT ON TABLE "public"."custom_min_nights" TO "readonly_user";



GRANT ALL ON TABLE "public"."custom_prices" TO "anon";
GRANT ALL ON TABLE "public"."custom_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_prices" TO "service_role";
GRANT SELECT ON TABLE "public"."custom_prices" TO "readonly_user";



GRANT ALL ON TABLE "public"."deposit_schedules" TO "anon";
GRANT ALL ON TABLE "public"."deposit_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."deposit_schedules" TO "service_role";
GRANT SELECT ON TABLE "public"."deposit_schedules" TO "readonly_user";



GRANT ALL ON TABLE "public"."evolution_instances" TO "anon";
GRANT ALL ON TABLE "public"."evolution_instances" TO "authenticated";
GRANT ALL ON TABLE "public"."evolution_instances" TO "service_role";
GRANT SELECT ON TABLE "public"."evolution_instances" TO "readonly_user";



GRANT ALL ON TABLE "public"."evolution_instances_backup" TO "anon";
GRANT ALL ON TABLE "public"."evolution_instances_backup" TO "authenticated";
GRANT ALL ON TABLE "public"."evolution_instances_backup" TO "service_role";
GRANT SELECT ON TABLE "public"."evolution_instances_backup" TO "readonly_user";



GRANT ALL ON TABLE "public"."financeiro_campo_plano_contas_mapping" TO "anon";
GRANT ALL ON TABLE "public"."financeiro_campo_plano_contas_mapping" TO "authenticated";
GRANT ALL ON TABLE "public"."financeiro_campo_plano_contas_mapping" TO "service_role";
GRANT SELECT ON TABLE "public"."financeiro_campo_plano_contas_mapping" TO "readonly_user";



GRANT ALL ON TABLE "public"."financeiro_categorias" TO "anon";
GRANT ALL ON TABLE "public"."financeiro_categorias" TO "authenticated";
GRANT ALL ON TABLE "public"."financeiro_categorias" TO "service_role";
GRANT SELECT ON TABLE "public"."financeiro_categorias" TO "readonly_user";



GRANT ALL ON TABLE "public"."financeiro_centro_custos" TO "anon";
GRANT ALL ON TABLE "public"."financeiro_centro_custos" TO "authenticated";
GRANT ALL ON TABLE "public"."financeiro_centro_custos" TO "service_role";
GRANT SELECT ON TABLE "public"."financeiro_centro_custos" TO "readonly_user";



GRANT ALL ON TABLE "public"."financeiro_contas_bancarias" TO "anon";
GRANT ALL ON TABLE "public"."financeiro_contas_bancarias" TO "authenticated";
GRANT ALL ON TABLE "public"."financeiro_contas_bancarias" TO "service_role";
GRANT SELECT ON TABLE "public"."financeiro_contas_bancarias" TO "readonly_user";



GRANT ALL ON TABLE "public"."financeiro_lancamentos" TO "anon";
GRANT ALL ON TABLE "public"."financeiro_lancamentos" TO "authenticated";
GRANT ALL ON TABLE "public"."financeiro_lancamentos" TO "service_role";
GRANT SELECT ON TABLE "public"."financeiro_lancamentos" TO "readonly_user";



GRANT ALL ON TABLE "public"."financeiro_lancamentos_splits" TO "anon";
GRANT ALL ON TABLE "public"."financeiro_lancamentos_splits" TO "authenticated";
GRANT ALL ON TABLE "public"."financeiro_lancamentos_splits" TO "service_role";
GRANT SELECT ON TABLE "public"."financeiro_lancamentos_splits" TO "readonly_user";



GRANT ALL ON TABLE "public"."financeiro_linhas_extrato" TO "anon";
GRANT ALL ON TABLE "public"."financeiro_linhas_extrato" TO "authenticated";
GRANT ALL ON TABLE "public"."financeiro_linhas_extrato" TO "service_role";
GRANT SELECT ON TABLE "public"."financeiro_linhas_extrato" TO "readonly_user";



GRANT ALL ON TABLE "public"."financeiro_regras_conciliacao" TO "anon";
GRANT ALL ON TABLE "public"."financeiro_regras_conciliacao" TO "authenticated";
GRANT ALL ON TABLE "public"."financeiro_regras_conciliacao" TO "service_role";
GRANT SELECT ON TABLE "public"."financeiro_regras_conciliacao" TO "readonly_user";



GRANT ALL ON TABLE "public"."financeiro_titulos" TO "anon";
GRANT ALL ON TABLE "public"."financeiro_titulos" TO "authenticated";
GRANT ALL ON TABLE "public"."financeiro_titulos" TO "service_role";
GRANT SELECT ON TABLE "public"."financeiro_titulos" TO "readonly_user";



GRANT ALL ON TABLE "public"."geographic_regions" TO "anon";
GRANT ALL ON TABLE "public"."geographic_regions" TO "authenticated";
GRANT ALL ON TABLE "public"."geographic_regions" TO "service_role";
GRANT SELECT ON TABLE "public"."geographic_regions" TO "readonly_user";



GRANT ALL ON TABLE "public"."guest_users" TO "anon";
GRANT ALL ON TABLE "public"."guest_users" TO "authenticated";
GRANT ALL ON TABLE "public"."guest_users" TO "service_role";
GRANT SELECT ON TABLE "public"."guest_users" TO "readonly_user";



GRANT ALL ON TABLE "public"."guests" TO "anon";
GRANT ALL ON TABLE "public"."guests" TO "authenticated";
GRANT ALL ON TABLE "public"."guests" TO "service_role";
GRANT SELECT ON TABLE "public"."guests" TO "readonly_user";



GRANT ALL ON TABLE "public"."integration_configs" TO "anon";
GRANT ALL ON TABLE "public"."integration_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."integration_configs" TO "service_role";
GRANT SELECT ON TABLE "public"."integration_configs" TO "readonly_user";



GRANT ALL ON TABLE "public"."invitations" TO "anon";
GRANT ALL ON TABLE "public"."invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."invitations" TO "service_role";
GRANT SELECT ON TABLE "public"."invitations" TO "readonly_user";



GRANT ALL ON TABLE "public"."kv_backups" TO "anon";
GRANT ALL ON TABLE "public"."kv_backups" TO "authenticated";
GRANT ALL ON TABLE "public"."kv_backups" TO "service_role";
GRANT SELECT ON TABLE "public"."kv_backups" TO "readonly_user";



GRANT ALL ON TABLE "public"."kv_store_67caf26a" TO "anon";
GRANT ALL ON TABLE "public"."kv_store_67caf26a" TO "authenticated";
GRANT ALL ON TABLE "public"."kv_store_67caf26a" TO "service_role";
GRANT SELECT ON TABLE "public"."kv_store_67caf26a" TO "readonly_user";



GRANT ALL ON TABLE "public"."listing_settings" TO "anon";
GRANT ALL ON TABLE "public"."listing_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."listing_settings" TO "service_role";
GRANT SELECT ON TABLE "public"."listing_settings" TO "readonly_user";



GRANT ALL ON TABLE "public"."listings" TO "anon";
GRANT ALL ON TABLE "public"."listings" TO "authenticated";
GRANT ALL ON TABLE "public"."listings" TO "service_role";
GRANT SELECT ON TABLE "public"."listings" TO "readonly_user";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";
GRANT SELECT ON TABLE "public"."locations" TO "readonly_user";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";
GRANT SELECT ON TABLE "public"."messages" TO "readonly_user";



GRANT ALL ON TABLE "public"."notification_templates" TO "anon";
GRANT ALL ON TABLE "public"."notification_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_templates" TO "service_role";
GRANT SELECT ON TABLE "public"."notification_templates" TO "readonly_user";



GRANT ALL ON TABLE "public"."notification_trigger_types" TO "anon";
GRANT ALL ON TABLE "public"."notification_trigger_types" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_trigger_types" TO "service_role";
GRANT SELECT ON TABLE "public"."notification_trigger_types" TO "readonly_user";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";
GRANT SELECT ON TABLE "public"."notifications" TO "readonly_user";



GRANT ALL ON TABLE "public"."operational_task_templates" TO "anon";
GRANT ALL ON TABLE "public"."operational_task_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."operational_task_templates" TO "service_role";
GRANT SELECT ON TABLE "public"."operational_task_templates" TO "readonly_user";



GRANT ALL ON TABLE "public"."operational_tasks" TO "anon";
GRANT ALL ON TABLE "public"."operational_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."operational_tasks" TO "service_role";
GRANT SELECT ON TABLE "public"."operational_tasks" TO "readonly_user";



GRANT ALL ON TABLE "public"."organization_channel_config" TO "anon";
GRANT ALL ON TABLE "public"."organization_channel_config" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_channel_config" TO "service_role";
GRANT SELECT ON TABLE "public"."organization_channel_config" TO "readonly_user";



GRANT ALL ON TABLE "public"."organization_settings" TO "anon";
GRANT ALL ON TABLE "public"."organization_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_settings" TO "service_role";
GRANT SELECT ON TABLE "public"."organization_settings" TO "readonly_user";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";
GRANT SELECT ON TABLE "public"."organizations" TO "readonly_user";



GRANT ALL ON TABLE "public"."ota_amenity_mappings" TO "anon";
GRANT ALL ON TABLE "public"."ota_amenity_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."ota_amenity_mappings" TO "service_role";
GRANT SELECT ON TABLE "public"."ota_amenity_mappings" TO "readonly_user";



GRANT ALL ON TABLE "public"."ota_api_credentials" TO "anon";
GRANT ALL ON TABLE "public"."ota_api_credentials" TO "authenticated";
GRANT ALL ON TABLE "public"."ota_api_credentials" TO "service_role";
GRANT SELECT ON TABLE "public"."ota_api_credentials" TO "readonly_user";



GRANT ALL ON TABLE "public"."ota_bed_type_mappings" TO "anon";
GRANT ALL ON TABLE "public"."ota_bed_type_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."ota_bed_type_mappings" TO "service_role";
GRANT SELECT ON TABLE "public"."ota_bed_type_mappings" TO "readonly_user";



GRANT ALL ON TABLE "public"."ota_cancellation_policy_mappings" TO "anon";
GRANT ALL ON TABLE "public"."ota_cancellation_policy_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."ota_cancellation_policy_mappings" TO "service_role";
GRANT SELECT ON TABLE "public"."ota_cancellation_policy_mappings" TO "readonly_user";



GRANT ALL ON TABLE "public"."ota_fee_type_mappings" TO "anon";
GRANT ALL ON TABLE "public"."ota_fee_type_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."ota_fee_type_mappings" TO "service_role";
GRANT SELECT ON TABLE "public"."ota_fee_type_mappings" TO "readonly_user";



GRANT ALL ON TABLE "public"."ota_image_category_mappings" TO "anon";
GRANT ALL ON TABLE "public"."ota_image_category_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."ota_image_category_mappings" TO "service_role";
GRANT SELECT ON TABLE "public"."ota_image_category_mappings" TO "readonly_user";



GRANT ALL ON TABLE "public"."ota_language_mappings" TO "anon";
GRANT ALL ON TABLE "public"."ota_language_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."ota_language_mappings" TO "service_role";
GRANT SELECT ON TABLE "public"."ota_language_mappings" TO "readonly_user";



GRANT ALL ON TABLE "public"."ota_payment_type_mappings" TO "anon";
GRANT ALL ON TABLE "public"."ota_payment_type_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."ota_payment_type_mappings" TO "service_role";
GRANT SELECT ON TABLE "public"."ota_payment_type_mappings" TO "readonly_user";



GRANT ALL ON TABLE "public"."ota_property_type_mappings" TO "anon";
GRANT ALL ON TABLE "public"."ota_property_type_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."ota_property_type_mappings" TO "service_role";
GRANT SELECT ON TABLE "public"."ota_property_type_mappings" TO "readonly_user";



GRANT ALL ON TABLE "public"."ota_rate_plan_mappings" TO "anon";
GRANT ALL ON TABLE "public"."ota_rate_plan_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."ota_rate_plan_mappings" TO "service_role";
GRANT SELECT ON TABLE "public"."ota_rate_plan_mappings" TO "readonly_user";



GRANT ALL ON TABLE "public"."ota_region_mappings" TO "anon";
GRANT ALL ON TABLE "public"."ota_region_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."ota_region_mappings" TO "service_role";
GRANT SELECT ON TABLE "public"."ota_region_mappings" TO "readonly_user";



GRANT ALL ON TABLE "public"."ota_reservation_status_mappings" TO "anon";
GRANT ALL ON TABLE "public"."ota_reservation_status_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."ota_reservation_status_mappings" TO "service_role";
GRANT SELECT ON TABLE "public"."ota_reservation_status_mappings" TO "readonly_user";



GRANT ALL ON TABLE "public"."ota_room_type_mappings" TO "anon";
GRANT ALL ON TABLE "public"."ota_room_type_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."ota_room_type_mappings" TO "service_role";
GRANT SELECT ON TABLE "public"."ota_room_type_mappings" TO "readonly_user";



GRANT ALL ON TABLE "public"."ota_room_view_mappings" TO "anon";
GRANT ALL ON TABLE "public"."ota_room_view_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."ota_room_view_mappings" TO "service_role";
GRANT SELECT ON TABLE "public"."ota_room_view_mappings" TO "readonly_user";



GRANT ALL ON TABLE "public"."ota_sync_logs" TO "anon";
GRANT ALL ON TABLE "public"."ota_sync_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."ota_sync_logs" TO "service_role";
GRANT SELECT ON TABLE "public"."ota_sync_logs" TO "readonly_user";



GRANT ALL ON TABLE "public"."ota_theme_mappings" TO "anon";
GRANT ALL ON TABLE "public"."ota_theme_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."ota_theme_mappings" TO "service_role";
GRANT SELECT ON TABLE "public"."ota_theme_mappings" TO "readonly_user";



GRANT ALL ON TABLE "public"."ota_webhook_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."ota_webhook_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."ota_webhook_subscriptions" TO "service_role";
GRANT SELECT ON TABLE "public"."ota_webhook_subscriptions" TO "readonly_user";



GRANT ALL ON TABLE "public"."ota_webhooks" TO "anon";
GRANT ALL ON TABLE "public"."ota_webhooks" TO "authenticated";
GRANT ALL ON TABLE "public"."ota_webhooks" TO "service_role";
GRANT SELECT ON TABLE "public"."ota_webhooks" TO "readonly_user";



GRANT ALL ON TABLE "public"."owner_users" TO "anon";
GRANT ALL ON TABLE "public"."owner_users" TO "authenticated";
GRANT ALL ON TABLE "public"."owner_users" TO "service_role";
GRANT SELECT ON TABLE "public"."owner_users" TO "readonly_user";



GRANT ALL ON TABLE "public"."owners" TO "anon";
GRANT ALL ON TABLE "public"."owners" TO "authenticated";
GRANT ALL ON TABLE "public"."owners" TO "service_role";
GRANT SELECT ON TABLE "public"."owners" TO "readonly_user";



GRANT ALL ON TABLE "public"."pagarme_configs" TO "anon";
GRANT ALL ON TABLE "public"."pagarme_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."pagarme_configs" TO "service_role";
GRANT SELECT ON TABLE "public"."pagarme_configs" TO "readonly_user";



GRANT ALL ON TABLE "public"."pagarme_orders" TO "anon";
GRANT ALL ON TABLE "public"."pagarme_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."pagarme_orders" TO "service_role";
GRANT SELECT ON TABLE "public"."pagarme_orders" TO "readonly_user";



GRANT ALL ON TABLE "public"."pagarme_payment_links" TO "anon";
GRANT ALL ON TABLE "public"."pagarme_payment_links" TO "authenticated";
GRANT ALL ON TABLE "public"."pagarme_payment_links" TO "service_role";
GRANT SELECT ON TABLE "public"."pagarme_payment_links" TO "readonly_user";



GRANT ALL ON TABLE "public"."pagarme_webhook_events" TO "anon";
GRANT ALL ON TABLE "public"."pagarme_webhook_events" TO "authenticated";
GRANT ALL ON TABLE "public"."pagarme_webhook_events" TO "service_role";
GRANT SELECT ON TABLE "public"."pagarme_webhook_events" TO "readonly_user";



GRANT ALL ON TABLE "public"."password_recovery_requests" TO "anon";
GRANT ALL ON TABLE "public"."password_recovery_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."password_recovery_requests" TO "service_role";
GRANT SELECT ON TABLE "public"."password_recovery_requests" TO "readonly_user";



GRANT ALL ON TABLE "public"."password_reset_tokens" TO "anon";
GRANT ALL ON TABLE "public"."password_reset_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."password_reset_tokens" TO "service_role";
GRANT SELECT ON TABLE "public"."password_reset_tokens" TO "readonly_user";



GRANT ALL ON TABLE "public"."payment_sessions" TO "anon";
GRANT ALL ON TABLE "public"."payment_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_sessions" TO "service_role";
GRANT SELECT ON TABLE "public"."payment_sessions" TO "readonly_user";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";
GRANT SELECT ON TABLE "public"."payments" TO "readonly_user";



GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";
GRANT SELECT ON TABLE "public"."permissions" TO "readonly_user";



GRANT ALL ON TABLE "public"."predetermined_funnel_stages" TO "anon";
GRANT ALL ON TABLE "public"."predetermined_funnel_stages" TO "authenticated";
GRANT ALL ON TABLE "public"."predetermined_funnel_stages" TO "service_role";
GRANT SELECT ON TABLE "public"."predetermined_funnel_stages" TO "readonly_user";



GRANT ALL ON TABLE "public"."predetermined_funnels" TO "anon";
GRANT ALL ON TABLE "public"."predetermined_funnels" TO "authenticated";
GRANT ALL ON TABLE "public"."predetermined_funnels" TO "service_role";
GRANT SELECT ON TABLE "public"."predetermined_funnels" TO "readonly_user";



GRANT ALL ON TABLE "public"."predetermined_item_activities" TO "anon";
GRANT ALL ON TABLE "public"."predetermined_item_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."predetermined_item_activities" TO "service_role";
GRANT SELECT ON TABLE "public"."predetermined_item_activities" TO "readonly_user";



GRANT ALL ON TABLE "public"."predetermined_items" TO "anon";
GRANT ALL ON TABLE "public"."predetermined_items" TO "authenticated";
GRANT ALL ON TABLE "public"."predetermined_items" TO "service_role";
GRANT SELECT ON TABLE "public"."predetermined_items" TO "readonly_user";



GRANT ALL ON TABLE "public"."pricing_settings" TO "anon";
GRANT ALL ON TABLE "public"."pricing_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."pricing_settings" TO "service_role";
GRANT SELECT ON TABLE "public"."pricing_settings" TO "readonly_user";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT SELECT ON TABLE "public"."profiles" TO "readonly_user";



GRANT ALL ON TABLE "public"."properties_drafts" TO "anon";
GRANT ALL ON TABLE "public"."properties_drafts" TO "authenticated";
GRANT ALL ON TABLE "public"."properties_drafts" TO "service_role";
GRANT SELECT ON TABLE "public"."properties_drafts" TO "readonly_user";



GRANT ALL ON TABLE "public"."property_cancellation_penalties" TO "anon";
GRANT ALL ON TABLE "public"."property_cancellation_penalties" TO "authenticated";
GRANT ALL ON TABLE "public"."property_cancellation_penalties" TO "service_role";
GRANT SELECT ON TABLE "public"."property_cancellation_penalties" TO "readonly_user";



GRANT ALL ON TABLE "public"."property_channel_settings" TO "anon";
GRANT ALL ON TABLE "public"."property_channel_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."property_channel_settings" TO "service_role";
GRANT SELECT ON TABLE "public"."property_channel_settings" TO "readonly_user";



GRANT ALL ON TABLE "public"."property_ota_extensions" TO "anon";
GRANT ALL ON TABLE "public"."property_ota_extensions" TO "authenticated";
GRANT ALL ON TABLE "public"."property_ota_extensions" TO "service_role";
GRANT SELECT ON TABLE "public"."property_ota_extensions" TO "readonly_user";



GRANT ALL ON TABLE "public"."property_rooms" TO "anon";
GRANT ALL ON TABLE "public"."property_rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."property_rooms" TO "service_role";
GRANT SELECT ON TABLE "public"."property_rooms" TO "readonly_user";



GRANT ALL ON TABLE "public"."public.users" TO "anon";
GRANT ALL ON TABLE "public"."public.users" TO "authenticated";
GRANT ALL ON TABLE "public"."public.users" TO "service_role";
GRANT SELECT ON TABLE "public"."public.users" TO "readonly_user";



GRANT ALL ON SEQUENCE "public"."public.users_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."public.users_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."public.users_id_seq" TO "service_role";
GRANT SELECT ON SEQUENCE "public"."public.users_id_seq" TO "readonly_user";



GRANT ALL ON TABLE "public"."rate_plan_availability" TO "anon";
GRANT ALL ON TABLE "public"."rate_plan_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_plan_availability" TO "service_role";
GRANT SELECT ON TABLE "public"."rate_plan_availability" TO "readonly_user";



GRANT ALL ON TABLE "public"."rate_plan_pricing_overrides" TO "anon";
GRANT ALL ON TABLE "public"."rate_plan_pricing_overrides" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_plan_pricing_overrides" TO "service_role";
GRANT SELECT ON TABLE "public"."rate_plan_pricing_overrides" TO "readonly_user";



GRANT ALL ON TABLE "public"."rate_plans" TO "anon";
GRANT ALL ON TABLE "public"."rate_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_plans" TO "service_role";
GRANT SELECT ON TABLE "public"."rate_plans" TO "readonly_user";



GRANT ALL ON TABLE "public"."re_broker_campaign_participation" TO "anon";
GRANT ALL ON TABLE "public"."re_broker_campaign_participation" TO "authenticated";
GRANT ALL ON TABLE "public"."re_broker_campaign_participation" TO "service_role";
GRANT SELECT ON TABLE "public"."re_broker_campaign_participation" TO "readonly_user";



GRANT ALL ON TABLE "public"."re_broker_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."re_broker_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."re_broker_campaigns" TO "service_role";
GRANT SELECT ON TABLE "public"."re_broker_campaigns" TO "readonly_user";



GRANT ALL ON TABLE "public"."re_broker_chat_channels" TO "anon";
GRANT ALL ON TABLE "public"."re_broker_chat_channels" TO "authenticated";
GRANT ALL ON TABLE "public"."re_broker_chat_channels" TO "service_role";
GRANT SELECT ON TABLE "public"."re_broker_chat_channels" TO "readonly_user";



GRANT ALL ON TABLE "public"."re_broker_chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."re_broker_chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."re_broker_chat_messages" TO "service_role";
GRANT SELECT ON TABLE "public"."re_broker_chat_messages" TO "readonly_user";



GRANT ALL ON TABLE "public"."re_broker_invites" TO "anon";
GRANT ALL ON TABLE "public"."re_broker_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."re_broker_invites" TO "service_role";
GRANT SELECT ON TABLE "public"."re_broker_invites" TO "readonly_user";



GRANT ALL ON TABLE "public"."re_broker_rankings" TO "anon";
GRANT ALL ON TABLE "public"."re_broker_rankings" TO "authenticated";
GRANT ALL ON TABLE "public"."re_broker_rankings" TO "service_role";
GRANT SELECT ON TABLE "public"."re_broker_rankings" TO "readonly_user";



GRANT ALL ON TABLE "public"."re_brokers" TO "anon";
GRANT ALL ON TABLE "public"."re_brokers" TO "authenticated";
GRANT ALL ON TABLE "public"."re_brokers" TO "service_role";
GRANT SELECT ON TABLE "public"."re_brokers" TO "readonly_user";



GRANT ALL ON TABLE "public"."re_companies" TO "anon";
GRANT ALL ON TABLE "public"."re_companies" TO "authenticated";
GRANT ALL ON TABLE "public"."re_companies" TO "service_role";
GRANT SELECT ON TABLE "public"."re_companies" TO "readonly_user";



GRANT ALL ON TABLE "public"."re_demands" TO "anon";
GRANT ALL ON TABLE "public"."re_demands" TO "authenticated";
GRANT ALL ON TABLE "public"."re_demands" TO "service_role";
GRANT SELECT ON TABLE "public"."re_demands" TO "readonly_user";



GRANT ALL ON TABLE "public"."re_developments" TO "anon";
GRANT ALL ON TABLE "public"."re_developments" TO "authenticated";
GRANT ALL ON TABLE "public"."re_developments" TO "service_role";
GRANT SELECT ON TABLE "public"."re_developments" TO "readonly_user";



GRANT ALL ON TABLE "public"."re_marketplace_conversations" TO "anon";
GRANT ALL ON TABLE "public"."re_marketplace_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."re_marketplace_conversations" TO "service_role";
GRANT SELECT ON TABLE "public"."re_marketplace_conversations" TO "readonly_user";



GRANT ALL ON TABLE "public"."re_marketplace_messages" TO "anon";
GRANT ALL ON TABLE "public"."re_marketplace_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."re_marketplace_messages" TO "service_role";
GRANT SELECT ON TABLE "public"."re_marketplace_messages" TO "readonly_user";



GRANT ALL ON TABLE "public"."re_marketplace_participants" TO "anon";
GRANT ALL ON TABLE "public"."re_marketplace_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."re_marketplace_participants" TO "service_role";
GRANT SELECT ON TABLE "public"."re_marketplace_participants" TO "readonly_user";



GRANT ALL ON TABLE "public"."re_messages" TO "anon";
GRANT ALL ON TABLE "public"."re_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."re_messages" TO "service_role";
GRANT SELECT ON TABLE "public"."re_messages" TO "readonly_user";



GRANT ALL ON TABLE "public"."re_partnerships" TO "anon";
GRANT ALL ON TABLE "public"."re_partnerships" TO "authenticated";
GRANT ALL ON TABLE "public"."re_partnerships" TO "service_role";
GRANT SELECT ON TABLE "public"."re_partnerships" TO "readonly_user";



GRANT ALL ON TABLE "public"."re_reservations" TO "anon";
GRANT ALL ON TABLE "public"."re_reservations" TO "authenticated";
GRANT ALL ON TABLE "public"."re_reservations" TO "service_role";
GRANT SELECT ON TABLE "public"."re_reservations" TO "readonly_user";



GRANT ALL ON TABLE "public"."re_transactions" TO "anon";
GRANT ALL ON TABLE "public"."re_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."re_transactions" TO "service_role";
GRANT SELECT ON TABLE "public"."re_transactions" TO "readonly_user";



GRANT ALL ON TABLE "public"."re_units" TO "anon";
GRANT ALL ON TABLE "public"."re_units" TO "authenticated";
GRANT ALL ON TABLE "public"."re_units" TO "service_role";
GRANT SELECT ON TABLE "public"."re_units" TO "readonly_user";



GRANT ALL ON TABLE "public"."reconciliation_runs" TO "anon";
GRANT ALL ON TABLE "public"."reconciliation_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."reconciliation_runs" TO "service_role";
GRANT SELECT ON TABLE "public"."reconciliation_runs" TO "readonly_user";



GRANT ALL ON TABLE "public"."reconciliation_dashboard" TO "anon";
GRANT ALL ON TABLE "public"."reconciliation_dashboard" TO "authenticated";
GRANT ALL ON TABLE "public"."reconciliation_dashboard" TO "service_role";
GRANT SELECT ON TABLE "public"."reconciliation_dashboard" TO "readonly_user";



GRANT ALL ON TABLE "public"."reconciliation_items" TO "anon";
GRANT ALL ON TABLE "public"."reconciliation_items" TO "authenticated";
GRANT ALL ON TABLE "public"."reconciliation_items" TO "service_role";
GRANT SELECT ON TABLE "public"."reconciliation_items" TO "readonly_user";



GRANT ALL ON TABLE "public"."refunds" TO "anon";
GRANT ALL ON TABLE "public"."refunds" TO "authenticated";
GRANT ALL ON TABLE "public"."refunds" TO "service_role";
GRANT SELECT ON TABLE "public"."refunds" TO "readonly_user";



GRANT ALL ON TABLE "public"."reservation_additional_guests" TO "anon";
GRANT ALL ON TABLE "public"."reservation_additional_guests" TO "authenticated";
GRANT ALL ON TABLE "public"."reservation_additional_guests" TO "service_role";
GRANT SELECT ON TABLE "public"."reservation_additional_guests" TO "readonly_user";



GRANT ALL ON TABLE "public"."reservation_cancellations" TO "anon";
GRANT ALL ON TABLE "public"."reservation_cancellations" TO "authenticated";
GRANT ALL ON TABLE "public"."reservation_cancellations" TO "service_role";
GRANT SELECT ON TABLE "public"."reservation_cancellations" TO "readonly_user";



GRANT ALL ON TABLE "public"."reservation_deposits" TO "anon";
GRANT ALL ON TABLE "public"."reservation_deposits" TO "authenticated";
GRANT ALL ON TABLE "public"."reservation_deposits" TO "service_role";
GRANT SELECT ON TABLE "public"."reservation_deposits" TO "readonly_user";



GRANT ALL ON TABLE "public"."reservation_history" TO "anon";
GRANT ALL ON TABLE "public"."reservation_history" TO "authenticated";
GRANT ALL ON TABLE "public"."reservation_history" TO "service_role";
GRANT SELECT ON TABLE "public"."reservation_history" TO "readonly_user";



GRANT ALL ON TABLE "public"."reservation_pricing_breakdown" TO "anon";
GRANT ALL ON TABLE "public"."reservation_pricing_breakdown" TO "authenticated";
GRANT ALL ON TABLE "public"."reservation_pricing_breakdown" TO "service_role";
GRANT SELECT ON TABLE "public"."reservation_pricing_breakdown" TO "readonly_user";



GRANT ALL ON TABLE "public"."reservation_room_history" TO "anon";
GRANT ALL ON TABLE "public"."reservation_room_history" TO "authenticated";
GRANT ALL ON TABLE "public"."reservation_room_history" TO "service_role";
GRANT SELECT ON TABLE "public"."reservation_room_history" TO "readonly_user";



GRANT ALL ON TABLE "public"."reservation_rooms" TO "anon";
GRANT ALL ON TABLE "public"."reservation_rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."reservation_rooms" TO "service_role";
GRANT SELECT ON TABLE "public"."reservation_rooms" TO "readonly_user";



GRANT ALL ON TABLE "public"."reservations" TO "anon";
GRANT ALL ON TABLE "public"."reservations" TO "authenticated";
GRANT ALL ON TABLE "public"."reservations" TO "service_role";
GRANT SELECT ON TABLE "public"."reservations" TO "readonly_user";



GRANT ALL ON TABLE "public"."room_photos" TO "anon";
GRANT ALL ON TABLE "public"."room_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."room_photos" TO "service_role";
GRANT SELECT ON TABLE "public"."room_photos" TO "readonly_user";



GRANT ALL ON TABLE "public"."room_types" TO "anon";
GRANT ALL ON TABLE "public"."room_types" TO "authenticated";
GRANT ALL ON TABLE "public"."room_types" TO "service_role";
GRANT SELECT ON TABLE "public"."room_types" TO "readonly_user";



GRANT ALL ON TABLE "public"."rooms" TO "anon";
GRANT ALL ON TABLE "public"."rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."rooms" TO "service_role";
GRANT SELECT ON TABLE "public"."rooms" TO "readonly_user";



GRANT ALL ON TABLE "public"."sales_deal_activities" TO "anon";
GRANT ALL ON TABLE "public"."sales_deal_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_deal_activities" TO "service_role";
GRANT SELECT ON TABLE "public"."sales_deal_activities" TO "readonly_user";



GRANT ALL ON TABLE "public"."sales_deals_expanded" TO "anon";
GRANT ALL ON TABLE "public"."sales_deals_expanded" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_deals_expanded" TO "service_role";
GRANT SELECT ON TABLE "public"."sales_deals_expanded" TO "readonly_user";



GRANT ALL ON TABLE "public"."sales_funnel_stages" TO "anon";
GRANT ALL ON TABLE "public"."sales_funnel_stages" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_funnel_stages" TO "service_role";
GRANT SELECT ON TABLE "public"."sales_funnel_stages" TO "readonly_user";



GRANT ALL ON TABLE "public"."sales_funnels" TO "anon";
GRANT ALL ON TABLE "public"."sales_funnels" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_funnels" TO "service_role";
GRANT SELECT ON TABLE "public"."sales_funnels" TO "readonly_user";



GRANT ALL ON TABLE "public"."saved_payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."saved_payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_payment_methods" TO "service_role";
GRANT SELECT ON TABLE "public"."saved_payment_methods" TO "readonly_user";



GRANT ALL ON TABLE "public"."service_funnel_stages" TO "anon";
GRANT ALL ON TABLE "public"."service_funnel_stages" TO "authenticated";
GRANT ALL ON TABLE "public"."service_funnel_stages" TO "service_role";
GRANT SELECT ON TABLE "public"."service_funnel_stages" TO "readonly_user";



GRANT ALL ON TABLE "public"."service_funnels" TO "anon";
GRANT ALL ON TABLE "public"."service_funnels" TO "authenticated";
GRANT ALL ON TABLE "public"."service_funnels" TO "service_role";
GRANT SELECT ON TABLE "public"."service_funnels" TO "readonly_user";



GRANT ALL ON TABLE "public"."service_ticket_activities" TO "anon";
GRANT ALL ON TABLE "public"."service_ticket_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."service_ticket_activities" TO "service_role";
GRANT SELECT ON TABLE "public"."service_ticket_activities" TO "readonly_user";



GRANT ALL ON TABLE "public"."service_tickets" TO "anon";
GRANT ALL ON TABLE "public"."service_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."service_tickets" TO "service_role";
GRANT SELECT ON TABLE "public"."service_tickets" TO "readonly_user";



GRANT ALL ON TABLE "public"."sessions" TO "anon";
GRANT ALL ON TABLE "public"."sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."sessions" TO "service_role";
GRANT SELECT ON TABLE "public"."sessions" TO "readonly_user";



GRANT ALL ON TABLE "public"."short_ids" TO "anon";
GRANT ALL ON TABLE "public"."short_ids" TO "authenticated";
GRANT ALL ON TABLE "public"."short_ids" TO "service_role";
GRANT SELECT ON TABLE "public"."short_ids" TO "readonly_user";



GRANT ALL ON TABLE "public"."staysnet_config" TO "anon";
GRANT ALL ON TABLE "public"."staysnet_config" TO "authenticated";
GRANT ALL ON TABLE "public"."staysnet_config" TO "service_role";
GRANT SELECT ON TABLE "public"."staysnet_config" TO "readonly_user";



GRANT ALL ON TABLE "public"."staysnet_import_issues" TO "anon";
GRANT ALL ON TABLE "public"."staysnet_import_issues" TO "authenticated";
GRANT ALL ON TABLE "public"."staysnet_import_issues" TO "service_role";
GRANT SELECT ON TABLE "public"."staysnet_import_issues" TO "readonly_user";



GRANT ALL ON TABLE "public"."staysnet_properties_cache" TO "anon";
GRANT ALL ON TABLE "public"."staysnet_properties_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."staysnet_properties_cache" TO "service_role";
GRANT SELECT ON TABLE "public"."staysnet_properties_cache" TO "readonly_user";



GRANT ALL ON TABLE "public"."staysnet_raw_objects" TO "anon";
GRANT ALL ON TABLE "public"."staysnet_raw_objects" TO "authenticated";
GRANT ALL ON TABLE "public"."staysnet_raw_objects" TO "service_role";
GRANT SELECT ON TABLE "public"."staysnet_raw_objects" TO "readonly_user";



GRANT ALL ON TABLE "public"."staysnet_reservations_cache" TO "anon";
GRANT ALL ON TABLE "public"."staysnet_reservations_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."staysnet_reservations_cache" TO "service_role";
GRANT SELECT ON TABLE "public"."staysnet_reservations_cache" TO "readonly_user";



GRANT ALL ON TABLE "public"."staysnet_sync_log" TO "anon";
GRANT ALL ON TABLE "public"."staysnet_sync_log" TO "authenticated";
GRANT ALL ON TABLE "public"."staysnet_sync_log" TO "service_role";
GRANT SELECT ON TABLE "public"."staysnet_sync_log" TO "readonly_user";



GRANT ALL ON TABLE "public"."staysnet_webhooks" TO "anon";
GRANT ALL ON TABLE "public"."staysnet_webhooks" TO "authenticated";
GRANT ALL ON TABLE "public"."staysnet_webhooks" TO "service_role";
GRANT SELECT ON TABLE "public"."staysnet_webhooks" TO "readonly_user";



GRANT ALL ON TABLE "public"."stripe_checkout_sessions" TO "anon";
GRANT ALL ON TABLE "public"."stripe_checkout_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."stripe_checkout_sessions" TO "service_role";
GRANT SELECT ON TABLE "public"."stripe_checkout_sessions" TO "readonly_user";



GRANT ALL ON TABLE "public"."stripe_configs" TO "anon";
GRANT ALL ON TABLE "public"."stripe_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."stripe_configs" TO "service_role";
GRANT SELECT ON TABLE "public"."stripe_configs" TO "readonly_user";



GRANT ALL ON TABLE "public"."stripe_webhook_events" TO "anon";
GRANT ALL ON TABLE "public"."stripe_webhook_events" TO "authenticated";
GRANT ALL ON TABLE "public"."stripe_webhook_events" TO "service_role";
GRANT SELECT ON TABLE "public"."stripe_webhook_events" TO "readonly_user";



GRANT ALL ON TABLE "public"."task_activities" TO "anon";
GRANT ALL ON TABLE "public"."task_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."task_activities" TO "service_role";
GRANT SELECT ON TABLE "public"."task_activities" TO "readonly_user";



GRANT ALL ON TABLE "public"."task_comments" TO "anon";
GRANT ALL ON TABLE "public"."task_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."task_comments" TO "service_role";
GRANT SELECT ON TABLE "public"."task_comments" TO "readonly_user";



GRANT ALL ON TABLE "public"."task_dependencies" TO "anon";
GRANT ALL ON TABLE "public"."task_dependencies" TO "authenticated";
GRANT ALL ON TABLE "public"."task_dependencies" TO "service_role";
GRANT SELECT ON TABLE "public"."task_dependencies" TO "readonly_user";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";
GRANT SELECT ON TABLE "public"."team_members" TO "readonly_user";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";
GRANT SELECT ON TABLE "public"."teams" TO "readonly_user";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";
GRANT SELECT ON TABLE "public"."tenants" TO "readonly_user";



GRANT ALL ON TABLE "public"."user_invitations" TO "anon";
GRANT ALL ON TABLE "public"."user_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."user_invitations" TO "service_role";
GRANT SELECT ON TABLE "public"."user_invitations" TO "readonly_user";



GRANT ALL ON TABLE "public"."users_kv_mappings" TO "anon";
GRANT ALL ON TABLE "public"."users_kv_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."users_kv_mappings" TO "service_role";
GRANT SELECT ON TABLE "public"."users_kv_mappings" TO "readonly_user";



GRANT ALL ON TABLE "public"."v_ai_agent_disponibilidade" TO "anon";
GRANT ALL ON TABLE "public"."v_ai_agent_disponibilidade" TO "authenticated";
GRANT ALL ON TABLE "public"."v_ai_agent_disponibilidade" TO "service_role";
GRANT SELECT ON TABLE "public"."v_ai_agent_disponibilidade" TO "readonly_user";



GRANT ALL ON TABLE "public"."v_all_users" TO "anon";
GRANT ALL ON TABLE "public"."v_all_users" TO "authenticated";
GRANT ALL ON TABLE "public"."v_all_users" TO "service_role";
GRANT SELECT ON TABLE "public"."v_all_users" TO "readonly_user";



GRANT ALL ON TABLE "public"."v_channel_instances_active" TO "anon";
GRANT ALL ON TABLE "public"."v_channel_instances_active" TO "authenticated";
GRANT ALL ON TABLE "public"."v_channel_instances_active" TO "service_role";
GRANT SELECT ON TABLE "public"."v_channel_instances_active" TO "readonly_user";



GRANT ALL ON TABLE "public"."v_operations_today" TO "anon";
GRANT ALL ON TABLE "public"."v_operations_today" TO "authenticated";
GRANT ALL ON TABLE "public"."v_operations_today" TO "service_role";
GRANT SELECT ON TABLE "public"."v_operations_today" TO "readonly_user";



GRANT ALL ON TABLE "public"."v_pending_webhooks" TO "anon";
GRANT ALL ON TABLE "public"."v_pending_webhooks" TO "authenticated";
GRANT ALL ON TABLE "public"."v_pending_webhooks" TO "service_role";
GRANT SELECT ON TABLE "public"."v_pending_webhooks" TO "readonly_user";



GRANT ALL ON TABLE "public"."v_properties_ota_ready" TO "anon";
GRANT ALL ON TABLE "public"."v_properties_ota_ready" TO "authenticated";
GRANT ALL ON TABLE "public"."v_properties_ota_ready" TO "service_role";
GRANT SELECT ON TABLE "public"."v_properties_ota_ready" TO "readonly_user";



GRANT ALL ON TABLE "public"."v_properties_with_responsibilities" TO "anon";
GRANT ALL ON TABLE "public"."v_properties_with_responsibilities" TO "authenticated";
GRANT ALL ON TABLE "public"."v_properties_with_responsibilities" TO "service_role";
GRANT SELECT ON TABLE "public"."v_properties_with_responsibilities" TO "readonly_user";



GRANT ALL ON TABLE "public"."v_property_pricing" TO "anon";
GRANT ALL ON TABLE "public"."v_property_pricing" TO "authenticated";
GRANT ALL ON TABLE "public"."v_property_pricing" TO "service_role";
GRANT SELECT ON TABLE "public"."v_property_pricing" TO "readonly_user";



GRANT ALL ON TABLE "public"."v_property_rooms_detailed" TO "anon";
GRANT ALL ON TABLE "public"."v_property_rooms_detailed" TO "authenticated";
GRANT ALL ON TABLE "public"."v_property_rooms_detailed" TO "service_role";
GRANT SELECT ON TABLE "public"."v_property_rooms_detailed" TO "readonly_user";



GRANT ALL ON TABLE "public"."v_property_sync_status" TO "anon";
GRANT ALL ON TABLE "public"."v_property_sync_status" TO "authenticated";
GRANT ALL ON TABLE "public"."v_property_sync_status" TO "service_role";
GRANT SELECT ON TABLE "public"."v_property_sync_status" TO "readonly_user";



GRANT ALL ON TABLE "public"."v_tasks_complete" TO "anon";
GRANT ALL ON TABLE "public"."v_tasks_complete" TO "authenticated";
GRANT ALL ON TABLE "public"."v_tasks_complete" TO "service_role";
GRANT SELECT ON TABLE "public"."v_tasks_complete" TO "readonly_user";



GRANT ALL ON TABLE "public"."virtual_cards" TO "anon";
GRANT ALL ON TABLE "public"."virtual_cards" TO "authenticated";
GRANT ALL ON TABLE "public"."virtual_cards" TO "service_role";
GRANT SELECT ON TABLE "public"."virtual_cards" TO "readonly_user";



GRANT ALL ON TABLE "public"."vw_lost_reasons_stats" TO "anon";
GRANT ALL ON TABLE "public"."vw_lost_reasons_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_lost_reasons_stats" TO "service_role";
GRANT SELECT ON TABLE "public"."vw_lost_reasons_stats" TO "readonly_user";



GRANT ALL ON TABLE "public"."vw_sales_deal_totals" TO "anon";
GRANT ALL ON TABLE "public"."vw_sales_deal_totals" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_sales_deal_totals" TO "service_role";
GRANT SELECT ON TABLE "public"."vw_sales_deal_totals" TO "readonly_user";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT ON TABLES TO "readonly_user";







