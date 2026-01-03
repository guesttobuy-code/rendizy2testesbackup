# ✅ CORREÇÃO CRÍTICA: Sistema de Rascunhos

**Data:** 02/12/2025  
**Status:** ✅ Correção aplicada e deploy realizado

---

## 🐛 PROBLEMA IDENTIFICADO

O backend estava validando `name`, `code` e `type` **ANTES** de verificar se era um rascunho. Isso causava erro mesmo quando o frontend enviava `status: "draft"` corretamente.

### **Erro Observado:**

```
❌ [apiRequest] ERRO COMPLETO: {
  "success": false,
  "error": "Validation error",
  "message": "Name, code, and type are required"
}
```

### **Causa Raiz:**

A validação estava sendo executada na linha 549-570 **ANTES** do código verificar se era rascunho na linha 402. O fluxo estava:

1. ❌ Normalizar dados (linha 437)
2. ❌ Validar `name`, `code`, `type` (linha 549)
3. ⚠️ Só depois verificar se é rascunho (linha 402) - **NUNCA CHEGAVA AQUI**

---

## ✅ SOLUÇÃO APLICADA

### **Mudança Arquitetural:**

Reorganizei o código para verificar rascunhos **ANTES** de qualquer validação ou normalização:

1. ✅ **PRIORIDADE 1:** Verificar se é rascunho sem ID → criar mínimo
2. ✅ **PRIORIDADE 2:** Verificar se tem ID → atualizar rascunho existente
3. ✅ **PRIORIDADE 3:** Normalizar e validar (apenas para propriedades normais)

### **Código Modificado:**

```typescript
// 🆕 CRÍTICO: Verificar rascunho ANTES de qualquer validação ou normalização
const isDraft = body.status === "draft";
const hasId = !!body.id;
const willCreateMinimal = isDraft && !hasId;

// 🆕 PRIORIDADE 1: Se for rascunho sem ID, criar mínimo imediatamente
if (willCreateMinimal) {
  return await createDraftPropertyMinimal(c, body);
}

// 🆕 PRIORIDADE 2: Se tem ID, é atualização de rascunho existente
if (hasId) {
  // ... código de atualização ...
  return c.json(successResponse(updatedProperty), 200);
}

// ✅ Só depois: Normalizar e validar (propriedades normais)
const normalized = normalizeWizardData(body);
// ... validações ...
```

---

## 🚀 DEPLOY REALIZADO

```powershell
npx supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc
```

**Status:** ✅ Deploy concluído

---

## 🧪 TESTE AGORA

### **1. Criar Rascunho:**

1. Abrir: `http://localhost:5173/properties`
2. Clicar em "Nova Propriedade"
3. Preencher primeiro step (tipo, modalidade)
4. Clicar em "Salvar e Avançar"

### **2. Verificar Logs do Backend:**

No Supabase Dashboard → Logs, você deve ver:

- `🔍 [createProperty] Verificação de rascunho (ANTES DE TUDO):`
- `🆕 [createProperty] Rascunho sem ID - criando registro mínimo primeiro (PRIORIDADE)`
- `✅ [createProperty] createDraftPropertyMinimal retornou:`

### **3. Verificar se Rascunho Aparece na Lista:**

1. Voltar para lista de propriedades
2. Verificar se rascunho aparece
3. Verificar se tem badge "Rascunho" e barra de progresso

---

## 📊 ARQUIVOS MODIFICADOS

### Backend:

- `supabase/functions/rendizy-server/routes-properties.ts`
  - Reorganizado fluxo de verificação de rascunhos
  - Movido verificação para ANTES de validações
  - Removido código duplicado

---

## ✅ RESULTADO ESPERADO

Agora o fluxo está correto:

1. ✅ Frontend envia: `{ status: "draft", type: "loc_casa", ... }`
2. ✅ Backend detecta: `isDraft = true`, `hasId = false`
3. ✅ Backend cria: rascunho mínimo com ID gerado pelo banco
4. ✅ Backend retorna: ID do rascunho criado
5. ✅ Frontend atualiza: rascunho com dados completos
6. ✅ Rascunho aparece: na lista de propriedades

---

**Correção crítica aplicada! Teste agora e verifique os logs.** 🚀
