# ✅ CORREÇÃO: Filtro de organization_id para Rascunhos

**Data:** 02/12/2025  
**Status:** ✅ Implementado e deployado

---

## 🐛 PROBLEMA IDENTIFICADO

O backend estava filtrando rascunhos por `organization_id`, mas rascunhos criados via SQL primitivo podem ter `organization_id = NULL`.

**Query problemática:**

```typescript
query = query.eq("organization_id", organizationId);
```

**Resultado:**

- Rascunhos com `organization_id = NULL` não apareciam
- Rascunhos criados via SQL primitivo não apareciam

---

## ✅ CORREÇÃO APLICADA

**Arquivo:** `supabase/functions/rendizy-server/routes-properties.ts`

**Mudança:**

```typescript
// ANTES:
query = query.eq("organization_id", organizationId);

// DEPOIS:
if (tenant.type === "superadmin") {
  // Para superadmin, incluir também rascunhos com organization_id = NULL
  query = query.or(
    `organization_id.eq.${organizationId},organization_id.is.null`
  );
} else {
  query = query.eq("organization_id", organizationId);
}
```

---

## 🎯 RESULTADO

Agora o backend:

- ✅ Superadmin vê rascunhos com `organization_id = '00000000-0000-0000-0000-000000000000'` **OU** `NULL`
- ✅ Outros usuários veem apenas rascunhos da sua organização
- ✅ Rascunhos criados via SQL primitivo aparecem para superadmin

---

## 🧪 COMO TESTAR

1. **Criar rascunho via SQL:**

   ```sql
   INSERT INTO properties (id, status, name, code, type, ...)
   VALUES (gen_random_uuid(), 'draft', 'Teste', 'TEST-1', 'loc_casa', ...);
   ```

2. **Verificar no banco:**

   ```sql
   SELECT id, organization_id, status, name
   FROM properties
   WHERE status = 'draft';
   ```

3. **Verificar na tela:**
   - Acesse: `http://localhost:5173/properties`
   - Deve aparecer seção primitiva de rascunhos no topo
   - Deve mostrar o rascunho criado

---

## 📝 QUERY SQL PARA VERIFICAR

Use o arquivo `verificar-rascunho-simples.sql` que não depende de colunas opcionais.

---

**Correção aplicada! Rascunhos com organization_id = NULL agora aparecem para superadmin.** 🚀
