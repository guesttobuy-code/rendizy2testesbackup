# 🔍 ANÁLISE: Feedback do Codex - Header apikey

**Data:** 02/12/2025  
**Feedback:** Adicionar header `apikey` junto com `Authorization`

---

## ✅ ANÁLISE DO FEEDBACK

### **1. Feedback do Codex está CORRETO:**

- ✅ Supabase Edge Functions **REQUEREM** o header `apikey`
- ✅ O header `apikey` é obrigatório para autenticação de Edge Functions
- ✅ Deve ser usado junto com `Authorization: Bearer ${anonKey}`

### **2. Evidência no Código:**

#### **AuthContext.tsx (FUNCIONA):**

```typescript
headers: {
  'Content-Type': 'application/json',
  'apikey': publicAnonKey, // ✅ Obrigatório para Supabase Edge Functions
  'Authorization': `Bearer ${publicAnonKey}`, // ✅ Obrigatório para Supabase Edge Functions
  'X-Auth-Token': token
}
```

#### **api.ts (USADO PELO WIZARD - FALTA apikey):**

```typescript
headers: {
  "Content-Type": "application/json",
  Authorization: `Bearer ${publicAnonKey}`, // ✅ Tem
  // ❌ FALTA: apikey: publicAnonKey
  "X-Auth-Token": userToken
}
```

---

## 🎯 CONCLUSÃO

### **O feedback do Codex está CORRETO e pode ser a causa do erro 400!**

**Razão:**

- ✅ `AuthContext.tsx` usa ambos os headers e funciona
- ❌ `api.ts` (usado pelo wizard) só tem `Authorization`
- ⚠️ Supabase pode estar rejeitando requisições sem `apikey`

---

## 💡 RECOMENDAÇÃO

### **Aplicar correção do Codex:**

Adicionar o header `apikey` em `api.ts`:

```typescript
const headers: Record<string, string> = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${publicAnonKey}`,
  apikey: publicAnonKey, // ✅ ADICIONAR ESTE HEADER
  ...((options.headers as Record<string, string>) || {}),
};
```

**Por que isso pode resolver:**

- ✅ Supabase Edge Functions requerem `apikey` para autenticação
- ✅ Sem `apikey`, o Supabase pode retornar 400 Bad Request
- ✅ `AuthContext.tsx` já usa e funciona

---

## 🔍 COMPARAÇÃO

| Arquivo           | Authorization | apikey | Status    |
| ----------------- | ------------- | ------ | --------- |
| `AuthContext.tsx` | ✅            | ✅     | Funciona  |
| `api.ts` (wizard) | ✅            | ❌     | Erro 400? |

---

## ✅ DECISÃO

**Recomendação:** **APLICAR a correção do Codex**

**Razões:**

1. ✅ Baseado em evidência (AuthContext funciona com ambos)
2. ✅ Documentação Supabase confirma necessidade de `apikey`
3. ✅ Baixo risco (apenas adicionar header)
4. ✅ Pode ser a causa real do erro 400

**Risco:** Muito baixo - apenas adicionar um header obrigatório

---

## 📋 PRÓXIMOS PASSOS

1. ✅ Aplicar correção do Codex (adicionar `apikey`)
2. ✅ Testar salvamento de rascunho
3. ✅ Verificar se erro 400 desaparece
4. ✅ Se não resolver, investigar `routes-properties.ts`

---

**Conclusão:** O feedback do Codex está correto e deve ser aplicado! ✅
