# ✅ PROBLEMA RESOLVIDO: Constraint CHECK em `type`

**Data:** 02/12/2025  
**Status:** ✅ CORRIGIDO

---

## 🐛 PROBLEMA IDENTIFICADO

A constraint CHECK na coluna `type` da tabela `properties` só aceita valores específicos:

```sql
CHECK (type IN ('apartment', 'house', 'studio', 'loft', 'condo', 'villa', 'other'))
```

**Mas o código estava usando:**

- ❌ `'loc_casa'` (não está na lista)
- ❌ `'location_casa_...'` (não está na lista)

**Resultado:**

- ❌ INSERT falhava silenciosamente
- ❌ Rascunhos não eram salvos
- ❌ Erro não era mostrado claramente

---

## ✅ CORREÇÃO APLICADA

### **1. Backend - `createDraftPropertyMinimal`:**

**Antes:**

```typescript
const type = body.type || ... || "loc_casa"; // ❌ Valor inválido
```

**Depois:**

```typescript
const typeRaw = body.type || ... || "house"; // ✅ Valor válido

// Mapear valores antigos/inválidos para valores válidos
const type = (() => {
  const typeStr = String(typeRaw).toLowerCase();
  if (['apartment', 'house', 'studio', 'loft', 'condo', 'villa', 'other'].includes(typeStr)) {
    return typeStr;
  }
  // Mapear valores antigos
  if (typeStr.includes('casa') || typeStr.includes('house')) return 'house';
  if (typeStr.includes('apartamento')) return 'apartment';
  // ... outros mapeamentos
  return 'house'; // Fallback
})();
```

### **2. Backend - Validação de rascunho:**

**Antes:**

```typescript
dataToValidate.type = "loc_casa"; // ❌
```

**Depois:**

```typescript
dataToValidate.type = "house"; // ✅
```

### **3. Scripts SQL:**

**Corrigidos:**

- ✅ `criar-rascunho-primitivo.sql` → usa `'house'`
- ✅ `testar-inserir-rascunho-direto.sql` → usa `'house'`
- ✅ `diagnostico-completo-rascunho.sql` → usa `'house'`

---

## 🎯 VALORES VÁLIDOS PARA `type`

A constraint CHECK aceita apenas:

- ✅ `'apartment'`
- ✅ `'house'`
- ✅ `'studio'`
- ✅ `'loft'`
- ✅ `'condo'`
- ✅ `'villa'`
- ✅ `'other'`

**Mapeamento sugerido:**

- `'loc_casa'` → `'house'`
- `'location_casa_...'` → `'house'`
- `'apartamento'` → `'apartment'`

---

## 🧪 TESTE AGORA

Execute o script SQL corrigido:

```sql
-- Agora deve funcionar!
INSERT INTO properties (
  id, status, name, code, type, ...
) VALUES (
  gen_random_uuid(),
  'draft',
  'Teste Rascunho',
  'TEST-1',
  'house',  -- ✅ Valor válido
  ...
);
```

---

## ✅ RESULTADO ESPERADO

Agora:

- ✅ Rascunhos são salvos com `type = 'house'` (ou outro valor válido)
- ✅ Valores antigos são mapeados automaticamente
- ✅ INSERT não falha mais por constraint CHECK

---

**Problema resolvido! Rascunhos devem salvar agora.** 🚀
