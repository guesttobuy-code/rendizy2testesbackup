# 🔧 PATCH: Correção Criação de Rascunho Mínimo

**Data:** 02/12/2025  
**Status:** ✅ Patch aplicado

---

## 🐛 PROBLEMA IDENTIFICADO

O backend estava validando **ANTES** de verificar se é rascunho, causando erro:

- ❌ "Name, code, and type are required"
- ❌ "Address with city and state is required"

---

## ✅ CORREÇÃO APLICADA

### **1. Reordenação da Verificação de Rascunho**

A verificação de rascunho agora é a **PRIMEIRA** coisa a ser feita, antes de:

- ❌ Logs (`logInfo`)
- ❌ Normalização (`normalizeWizardData`)
- ❌ Validações

### **2. Código Corrigido:**

```typescript
export async function createProperty(c: Context) {
  try {
    const body = await c.req.json<CreatePropertyDTO>();

    // 🆕 CRÍTICO: Verificar rascunho ANTES de QUALQUER coisa
    const statusValue = String(body.status || "").trim().toLowerCase();
    const isDraft = statusValue === "draft";
    const hasId = !!body.id;
    const willCreateMinimal = isDraft && !hasId;

    // Logs e processamento APÓS verificação de rascunho
    // ...

    if (willCreateMinimal) {
      // Criar rascunho mínimo imediatamente
      return await createDraftPropertyMinimal(c, body);
    }
    // ...
  }
}
```

---

## 📋 ARQUIVOS MODIFICADOS

- ✅ `supabase/functions/rendizy-server/routes-properties.ts` - Verificação de rascunho movida para o início

---

## 🚀 DEPLOY REALIZADO

- ✅ Backend deployado no Supabase

---

**Patch aplicado! O backend agora verifica rascunho ANTES de qualquer validação.** 🚀
