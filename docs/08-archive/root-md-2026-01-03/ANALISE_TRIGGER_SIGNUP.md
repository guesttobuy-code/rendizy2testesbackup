# 🔍 ANÁLISE - Trigger de Signup Automático

**Data:** 06/11/2025  
**Status:** ⚠️ Código precisa de ajustes para o schema relacional

---

## 🎯 OBJETIVO DO CÓDIGO

Criar automaticamente uma organização quando um novo usuário se registra no Supabase Auth.

---

## ❌ PROBLEMAS IDENTIFICADOS

### **1. Estrutura da Tabela `organizations`**

**Código do ChatGPT:**
```sql
INSERT INTO organizations (id, name, slug, email)
VALUES (new_org_id, 'Minha Organização', 'minha-organizacao', NEW.email);
```

**Schema Atual (relacional):**
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  slug VARCHAR NOT NULL UNIQUE,
  email VARCHAR NOT NULL,
  -- MUITOS outros campos obrigatórios:
  status VARCHAR NOT NULL DEFAULT 'trial',
  plan VARCHAR NOT NULL DEFAULT 'free',
  -- etc
);
```

**Problema:** ❌ Faltam campos obrigatórios (`status`, `plan`, etc)

---

### **2. Estrutura da Tabela `users`**

**Código do ChatGPT:**
```sql
INSERT INTO public.users (id, email, organization_id)
VALUES (NEW.id, NEW.email, new_org_id)
```

**Schema Atual:**
```sql
CREATE TABLE users (
  id UUID NOT NULL,  -- Referencia auth.users.id
  email TEXT,
  raw_user_meta_data JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  organization_id UUID  -- FK para organizations
);
```

**Problema:** ⚠️ Pode funcionar, mas falta `created_at` e `updated_at`

---

### **3. Atualização de `auth.users`**

**Código do ChatGPT:**
```sql
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(...)
WHERE id = NEW.id;
```

**Problema:** ⚠️ Funciona, mas pode ter problemas de permissão

---

### **4. Geração de Slug**

**Problema:** ❌ Slug hardcoded `'minha-organizacao'` vai causar conflitos

---

## ✅ VERSÃO CORRIGIDA

### **Trigger Corrigido:**

```sql
-- ============================================================================
-- TRIGGER: Criação Automática de Organização ao Registrar Usuário
-- ============================================================================
-- 
-- Quando um novo usuário se registra no Supabase Auth:
-- 1. Cria uma organização padrão
-- 2. Vincula o usuário à organização
-- 3. Atualiza metadata do usuário
--
-- Data: 06/11/2025
-- Versão: 1.0.103.323
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_user_signup()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_org_id UUID := gen_random_uuid();
  org_slug TEXT;
  base_slug TEXT;
  slug_counter INTEGER := 1;
  user_email TEXT;
  user_name TEXT;
BEGIN
  -- Obter email do usuário
  user_email := COALESCE(NEW.email, '');
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário');
  
  -- Gerar slug único baseado no nome ou email
  base_slug := LOWER(REGEXP_REPLACE(
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(user_email, '@', 1)),
    '[^a-z0-9]+', '-', 'g'
  ));
  
  -- Remover hífens no início/fim
  base_slug := TRIM(BOTH '-' FROM base_slug);
  
  -- Se slug vazio, usar padrão
  IF base_slug = '' THEN
    base_slug := 'organizacao';
  END IF;
  
  org_slug := base_slug;
  
  -- Verificar se slug já existe e gerar único
  WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = org_slug) LOOP
    org_slug := base_slug || '-' || slug_counter;
    slug_counter := slug_counter + 1;
  END LOOP;
  
  -- Criar organização com todos os campos obrigatórios
  INSERT INTO organizations (
    id,
    name,
    slug,
    email,
    status,
    plan,
    settings_language,
    settings_timezone,
    settings_currency,
    settings_date_format,
    settings_max_users,
    settings_max_properties,
    limits_users,
    limits_properties,
    limits_reservations,
    limits_storage,
    created_at,
    updated_at
  ) VALUES (
    new_org_id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Minha Organização'),
    org_slug,
    user_email,
    'trial',  -- Status inicial: trial
    'free',   -- Plano inicial: free
    'pt',     -- Idioma padrão
    'America/Sao_Paulo',  -- Timezone padrão
    'BRL',    -- Moeda padrão
    'DD/MM/YYYY',  -- Formato de data
    5,        -- Max usuários (plano free)
    10,       -- Max propriedades (plano free)
    5,        -- Limite usuários
    10,       -- Limite propriedades
    100,      -- Limite reservas
    1024,     -- Limite storage (MB)
    NOW(),
    NOW()
  );
  
  -- Criar registro em public.users
  INSERT INTO public.users (
    id,
    email,
    organization_id,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    user_email,
    new_org_id,
    COALESCE(NEW.raw_user_meta_data, '{}'::jsonb),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE 
  SET 
    organization_id = new_org_id,
    updated_at = NOW();
  
  -- Atualizar metadata do usuário no auth.users
  -- NOTA: Isso pode não funcionar diretamente, pois auth.users é gerenciado pelo Supabase
  -- Alternativa: usar webhook ou Edge Function
  
  RETURN NEW;
END;
$$;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Criar trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_signup();
```

---

## ⚠️ LIMITAÇÕES IMPORTANTES

### **1. Acesso a `auth.users`**

**Problema:** O Supabase pode não permitir triggers diretos em `auth.users` dependendo da configuração.

**Solução Alternativa:** Usar **Webhook** ou **Edge Function**:

```typescript
// supabase/functions/handle-signup/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

serve(async (req) => {
  const { record } = await req.json()
  
  // Criar organização
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  const orgId = crypto.randomUUID()
  const slug = generateSlug(record.email)
  
  await supabase.from('organizations').insert({
    id: orgId,
    name: 'Minha Organização',
    slug: slug,
    email: record.email,
    status: 'trial',
    plan: 'free',
    // ... outros campos
  })
  
  // Atualizar public.users
  await supabase.from('users').upsert({
    id: record.id,
    email: record.email,
    organization_id: orgId
  })
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

---

### **2. Webhook do Supabase Auth**

**Configurar no Supabase Dashboard:**
1. Settings → Auth → Webhooks
2. Adicionar webhook: `https://[project].supabase.co/functions/v1/handle-signup`
3. Evento: `user.created`

---

## 📋 VERSÃO SIMPLIFICADA (Recomendada)

Se o trigger não funcionar, usar **Edge Function**:

```sql
-- Migration: 20241106_auto_create_org_on_signup.sql

-- NOTA: Este trigger pode não funcionar dependendo da configuração do Supabase
-- Alternativa: Usar Edge Function + Webhook (recomendado)

-- Criar função auxiliar para gerar slug único
CREATE OR REPLACE FUNCTION generate_unique_slug(base_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Normalizar nome para slug
  base_slug := LOWER(REGEXP_REPLACE(base_name, '[^a-z0-9]+', '-', 'g'));
  base_slug := TRIM(BOTH '-' FROM base_slug);
  
  IF base_slug = '' THEN
    base_slug := 'organizacao';
  END IF;
  
  final_slug := base_slug;
  
  -- Verificar unicidade
  WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = final_slug) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Função principal (pode não funcionar se auth.users não permitir triggers)
CREATE OR REPLACE FUNCTION public.handle_user_signup()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_org_id UUID := gen_random_uuid();
  org_slug TEXT;
  user_email TEXT;
  user_name TEXT;
BEGIN
  user_email := COALESCE(NEW.email, '');
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', 'Minha Organização');
  org_slug := generate_unique_slug(user_name);
  
  -- Criar organização
  INSERT INTO organizations (
    id, name, slug, email, status, plan,
    settings_language, settings_timezone, settings_currency,
    settings_date_format, settings_max_users, settings_max_properties,
    limits_users, limits_properties, limits_reservations, limits_storage,
    created_at, updated_at
  ) VALUES (
    new_org_id,
    user_name,
    org_slug,
    user_email,
    'trial',
    'free',
    'pt',
    'America/Sao_Paulo',
    'BRL',
    'DD/MM/YYYY',
    5, 10, 5, 10, 100, 1024,
    NOW(),
    NOW()
  );
  
  -- Criar/atualizar usuário
  INSERT INTO public.users (
    id, email, organization_id, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    NEW.id,
    user_email,
    new_org_id,
    COALESCE(NEW.raw_user_meta_data, '{}'::jsonb),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE 
  SET organization_id = new_org_id, updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log erro mas não quebra o signup
    RAISE WARNING 'Erro ao criar organização automática: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Tentar criar trigger (pode falhar se não tiver permissão)
DO $$
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_signup();
    
  RAISE NOTICE '✅ Trigger criado com sucesso';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE WARNING '⚠️ Sem permissão para criar trigger em auth.users. Use Edge Function + Webhook.';
  WHEN OTHERS THEN
    RAISE WARNING '⚠️ Erro ao criar trigger: %. Use Edge Function + Webhook.', SQLERRM;
END $$;
```

---

## 🚀 RECOMENDAÇÃO FINAL

### **Opção 1: Edge Function + Webhook (Recomendada)**

**Vantagens:**
- ✅ Funciona sempre
- ✅ Mais controle
- ✅ Melhor tratamento de erros
- ✅ Logs detalhados

**Implementação:**
1. Criar Edge Function `handle-signup`
2. Configurar webhook no Supabase Auth
3. Função cria organização e vincula usuário

---

### **Opção 2: Trigger SQL (Se funcionar)**

**Vantagens:**
- ✅ Automático
- ✅ Sem código adicional

**Desvantagens:**
- ❌ Pode não funcionar (permissões)
- ❌ Menos controle
- ❌ Difícil debugar

---

## 📝 CHECKLIST DE IMPLEMENTAÇÃO

### **Se usar Trigger:**
- [ ] Executar migration SQL
- [ ] Testar criação de usuário
- [ ] Verificar se organização foi criada
- [ ] Verificar se `organization_id` está no `users`

### **Se usar Edge Function:**
- [ ] Criar função `handle-signup`
- [ ] Configurar webhook no Supabase
- [ ] Testar criação de usuário
- [ ] Verificar logs

---

## ⚠️ PONTOS DE ATENÇÃO

1. **Slug único:** Sempre gerar slug único
2. **Campos obrigatórios:** Preencher todos os campos obrigatórios
3. **Tratamento de erros:** Não quebrar o signup se falhar
4. **Permissões:** Verificar se tem permissão para criar trigger

---

**Status:** ⚠️ Código precisa de ajustes  
**Recomendação:** Usar Edge Function + Webhook  
**Prioridade:** Média

