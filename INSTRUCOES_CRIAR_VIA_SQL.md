# 📋 Instruções: Criar Organização via SQL Editor do Supabase

**Data:** 2025-11-30  
**Método:** SQL Editor do Supabase Dashboard (mais confiável que CLI)

---

## 🎯 Objetivo

Criar a organização "Sua Casa Mobiliada" diretamente no banco de dados enquanto investigamos o problema da rota API.

---

## 📋 Passo a Passo

### 1. Acessar SQL Editor do Supabase

1. Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc
2. Vá em **SQL Editor** no menu lateral
3. Clique em **New query**

### 2. Executar o SQL

Cole e execute o seguinte SQL:

```sql
-- ✅ VERSÃO MÍNIMA: Apenas colunas básicas que definitivamente existem
-- Primeiro, verificar estrutura: SELECT column_name FROM information_schema.columns WHERE table_name = 'organizations';
INSERT INTO organizations (
    id,
    name,
    slug,
    email,
    phone,
    plan,
    status,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Sua Casa Mobiliada',
    'rendizy_sua_casa_mobiliada',
    'suacasamobiliada@gmail.com',
    NULL,
    'enterprise',
    'active',
    NOW(),
    NOW()
)
ON CONFLICT (slug) DO UPDATE
SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    plan = EXCLUDED.plan,
    status = EXCLUDED.status,
    updated_at = NOW()
RETURNING id, name, slug, email, plan, status;
```

### 3. Verificar Criação

Execute esta query para verificar:

```sql
SELECT 
    id,
    name,
    slug,
    email,
    plan,
    status,
    created_at
FROM organizations
WHERE email = 'suacasamobiliada@gmail.com'
ORDER BY created_at DESC
LIMIT 1;
```

---

## ✅ Resultado Esperado

Você deve ver a organização criada com:
- **Nome:** Sua Casa Mobiliada
- **Slug:** rendizy_sua_casa_mobiliada
- **Email:** suacasamobiliada@gmail.com
- **Plano:** enterprise
- **Status:** active

---

## 📝 Notas

- O `ON CONFLICT (slug)` garante que não haverá duplicatas
- Os limites do plano "enterprise" são `-1` (ilimitado)
- O `RETURNING` mostra os dados criados/atualizados

---

**Última atualização:** 2025-11-30 19:45
