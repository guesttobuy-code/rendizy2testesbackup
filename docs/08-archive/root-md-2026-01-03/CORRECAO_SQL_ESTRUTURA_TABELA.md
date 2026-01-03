# ✅ Correção: Estrutura da Tabela `organizations`

**Data:** 2025-11-30  
**Problema:** Colunas `created_by`, `settings` e `billing` não existem na tabela

---

## 🔍 Problema Identificado

Ao tentar criar a organização via SQL, recebemos erros:
1. `ERROR: column "created_by" of relation "organizations" does not exist`
2. `ERROR: column "settings" of relation "organizations" does not exist`

---

## 🔧 Solução

Criado SQL **mínimo** usando apenas colunas básicas que definitivamente existem:
- `id` (UUID)
- `name` (TEXT)
- `slug` (TEXT)
- `email` (TEXT)
- `phone` (TEXT, opcional)
- `plan` (TEXT)
- `status` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### ✅ SQL Mínimo

```sql
-- Primeiro, verificar estrutura real da tabela
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'organizations' 
ORDER BY ordinal_position;

-- Inserir organização com apenas campos básicos
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

---

## 📝 Nota Importante

Embora as migrações mostrem que `created_by`, `settings` e `billing` deveriam existir, a tabela atual no banco de dados não possui essas colunas. Isso pode significar que:
- As migrações não foram aplicadas completamente
- A tabela foi criada manualmente sem essas colunas
- Há uma diferença entre a estrutura esperada (migrações) e a real (banco de dados)

**Recomendação:** Execute primeiro a query de verificação da estrutura para ver quais colunas realmente existem.

---

## ✅ Arquivos Criados

1. `SQL_CRIAR_IMOBILIARIA_MINIMO.sql` - Versão mínima com apenas colunas básicas
2. `SQL_CRIAR_IMOBILIARIA.sql` - Atualizado para versão mínima

---

**Última atualização:** 2025-11-30 20:00
