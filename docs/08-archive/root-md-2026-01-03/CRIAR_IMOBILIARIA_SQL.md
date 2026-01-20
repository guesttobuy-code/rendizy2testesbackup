# ✅ Criação de Organização via SQL

**Data:** 2025-11-30  
**Método:** SQL direto (bypass da rota API)

---

## 🎯 Objetivo

Criar a organização "Sua Casa Mobiliada" diretamente no banco de dados via SQL para:
1. ✅ Confirmar que a conexão com o banco está funcionando
2. ✅ Verificar se o problema é apenas com a rota API ou também com a lógica de criação
3. ✅ Ter a organização criada enquanto investigamos o problema da rota

---

## 📋 Dados da Organização

- **Nome:** Sua Casa Mobiliada
- **Email:** suacasamobiliada@gmail.com
- **Slug:** rendizy_sua_casa_mobiliada
- **Plano:** enterprise
- **Status:** active
- **Created By:** user_master_rendizy

---

## 🔧 Comando SQL Executado

```sql
INSERT INTO organizations (
  id, 
  name, 
  slug, 
  email, 
  phone, 
  plan, 
  status, 
  created_by, 
  settings, 
  billing, 
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
  'user_master_rendizy', 
  '{"maxUsers": -1, "maxProperties": -1, "maxReservations": -1, "features": ["all"]}'::jsonb, 
  '{"mrr": 0, "billingDate": 1}'::jsonb, 
  NOW(), 
  NOW()
) 
ON CONFLICT (slug) DO UPDATE 
SET 
  name = EXCLUDED.name, 
  email = EXCLUDED.email, 
  plan = EXCLUDED.plan, 
  updated_at = NOW() 
RETURNING id, name, slug, email, plan, status;
```

---

## ✅ Verificação

Para verificar se a organização foi criada:

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

## 📝 Notas

- O comando usa `ON CONFLICT (slug) DO UPDATE` para evitar duplicatas
- Os limites do plano "enterprise" são `-1` (ilimitado)
- O status é definido como `active` (não `trial` como seria para planos free)

---

**Última atualização:** 2025-11-30 19:40
