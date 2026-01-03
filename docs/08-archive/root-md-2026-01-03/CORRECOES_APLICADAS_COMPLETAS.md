# ✅ CORREÇÕES APLICADAS - Resumo Completo

**Data:** 02/12/2025  
**Aplicadas:** Correção Codex + Correção Manus.IM (já aplicada anteriormente)

---

## 🔧 CORREÇÕES APLICADAS

### **1. ✅ Correção do Codex - Header `apikey`**

**Arquivo:** `RendizyPrincipal/utils/api.ts`  
**Linha:** ~356

**Problema:**

- Supabase Edge Functions requerem o header `apikey` para autenticação
- `api.ts` (usado pelo wizard) só tinha `Authorization`, faltava `apikey`
- `AuthContext.tsx` já usava ambos e funcionava

**Solução:**

```typescript
const headers: Record<string, string> = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${publicAnonKey}`,
  apikey: publicAnonKey, // ✅ ADICIONADO
  ...((options.headers as Record<string, string>) || {}),
};
```

**Impacto:**

- ✅ Pode resolver erro 400 Bad Request
- ✅ Alinha com padrão usado em `AuthContext.tsx`
- ✅ Segue documentação Supabase

---

### **2. ✅ Correção do Manus.IM - Prefixo `temp:` no KV Store**

**Arquivo:** `supabase/functions/rendizy-server/routes-property-wizard.ts`  
**Status:** Já aplicada anteriormente

**Problema:**

- `kv_store.tsx` bloqueia chaves críticas sem prefixo permitido
- Chaves `property:` e `tenant:...properties` sem `temp:` causavam erro

**Solução:**

- ✅ Todas as 14 ocorrências prefixadas com `temp:`
- ✅ `property:${id}` → `temp:property:${id}`
- ✅ `tenant:${id}:properties` → `temp:tenant:${id}:properties`

**Nota:** Este arquivo pode não estar em uso ativo (frontend usa `routes-properties.ts`), mas correção aplicada preventivamente.

---

## 📋 VERIFICAÇÕES REALIZADAS

### **1. Lógica de Draft no Backend**

- ✅ `routes-properties.ts` verifica `isDraft` ANTES de validações
- ✅ Validações condicionais: `if (!isDraft) { ... }`
- ✅ Rascunhos aceitam qualquer dado, sem validações cruzadas

### **2. Frontend - Envio de Status**

- ✅ `PropertyEditWizard.tsx` envia `status: "draft"` corretamente
- ✅ `saveDraftToBackend()` monta payload com `status: "draft"`

### **3. Headers de Autenticação**

- ✅ `api.ts` agora tem `apikey` + `Authorization`
- ✅ `AuthContext.tsx` já tinha ambos (referência)
- ⚠️ Outras chamadas diretas podem precisar de `apikey` (verificar se necessário)

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ **Deploy das correções** no Supabase
2. ✅ **Testar salvamento de rascunho** no preview
3. ✅ **Verificar se erro 400 desaparece**
4. ✅ **Se não resolver, investigar logs detalhados do backend**

---

## 🔍 ANÁLISE TÉCNICA

### **Por que o header `apikey` pode resolver o erro 400:**

1. **Supabase Edge Functions requerem `apikey`:**

   - Documentação oficial confirma necessidade
   - Sem `apikey`, Supabase pode rejeitar requisição antes de chegar ao código

2. **Evidência no código:**

   - `AuthContext.tsx` usa ambos e funciona
   - `api.ts` (wizard) só tinha `Authorization` → pode ser causa do erro

3. **Baixo risco:**
   - Apenas adicionar header obrigatório
   - Não altera lógica de negócio
   - Alinha com padrão já usado

---

## ✅ CONCLUSÃO

**Correções aplicadas:**

- ✅ Header `apikey` adicionado em `api.ts`
- ✅ Prefixo `temp:` já estava aplicado em `routes-property-wizard.ts`

**Próximo passo:** Deploy e teste

---

**Status:** ✅ Correções aplicadas e prontas para deploy
