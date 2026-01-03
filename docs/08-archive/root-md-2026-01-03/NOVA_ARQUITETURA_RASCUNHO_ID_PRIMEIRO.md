# 🆕 NOVA ARQUITETURA: ID PRIMEIRO, DADOS DEPOIS

**Data:** 02/12/2025  
**Objetivo:** Criar rascunho imediatamente com ID gerado pelo banco, sem validações complexas

---

## 🎯 PROBLEMA RESOLVIDO

**Antes:** Tentávamos criar rascunho com dados completos → validações falhavam → rascunho não era criado

**Agora:** Criamos registro mínimo primeiro → banco gera ID → retornamos ID → atualizamos com dados gradualmente

---

## 🔄 FLUXO NOVO

### 1. Primeiro Step (Criar Rascunho)

```
Frontend → Backend: { status: "draft" } (sem ID)
Backend → createDraftPropertyMinimal()
  - Cria registro mínimo com apenas campos essenciais
  - PostgreSQL gera ID automaticamente (gen_random_uuid())
  - Retorna: { id: "uuid-gerado", status: "draft", ... }
Frontend recebe ID → Atualiza imediatamente com dados do wizard
```

### 2. Steps Seguintes (Atualizar Rascunho)

```
Frontend → Backend: { id: "uuid-existente", ...dados do wizard }
Backend → createProperty() detecta ID → Faz UPDATE direto
```

---

## 📝 MUDANÇAS IMPLEMENTADAS

### Backend (`routes-properties.ts`)

1. **Nova função `createDraftPropertyMinimal()`:**

   - Cria registro mínimo com apenas campos essenciais
   - Não faz validações complexas
   - ID gerado pelo PostgreSQL automaticamente

2. **`createProperty()` modificado:**
   - Se `status === "draft"` e `!body.id` → chama `createDraftPropertyMinimal()`
   - Se `body.id` existe → faz UPDATE direto (não precisa chamar `updateProperty`)

### Frontend (`PropertyEditWizard.tsx`)

1. **Primeiro step:**

   - Envia dados mínimos: `{ status: "draft", type: "...", wizardData: {...} }`
   - Recebe ID do backend
   - Atualiza imediatamente com dados completos

2. **Steps seguintes:**
   - Envia `{ id: "uuid-existente", ...dados completos }`
   - Backend detecta ID e faz UPDATE

---

## ✅ VANTAGENS

- ✅ **ID gerado pelo banco** (confiável, não pode duplicar)
- ✅ **Sem validações complexas** para criar rascunho
- ✅ **Tudo vinculado ao ID** (não depende de dados temporários)
- ✅ **Dados preenchidos gradualmente** via updates
- ✅ **Rascunho sempre existe no banco** (não se perde)

---

## 🔍 DEBUG

Logs adicionados:

- `🔍 [createProperty] Body recebido (DETALHADO)` - mostra status, id, etc.
- `🆕 [createProperty] Rascunho sem ID - criando registro mínimo primeiro`
- `🆕 [createDraftPropertyMinimal] Criando rascunho mínimo`
- `✅ [createDraftPropertyMinimal] Rascunho criado com ID (gerado pelo banco)`

---

## 🧪 TESTE

1. Abrir preview: `http://localhost:5173/properties`
2. Clicar em "Nova Propriedade"
3. Preencher primeiro step (tipo, modalidade)
4. Clicar em "Salvar e Avançar"
5. Verificar logs do console:
   - Deve aparecer: `🆕 [createProperty] Rascunho sem ID - criando registro mínimo primeiro`
   - Deve aparecer: `✅ [createDraftPropertyMinimal] Rascunho criado com ID`
6. Verificar se rascunho aparece na lista de propriedades

---

## ⚠️ IMPORTANTE

- O backend precisa estar atualizado (deploy do Supabase Functions)
- Se ainda der erro de validação, verificar logs do backend no Supabase Dashboard
- O rascunho deve aparecer na lista mesmo com dados mínimos
