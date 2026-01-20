# 🎯 PLANO COMPLETO: VENCER CONVERSAS E CONTATOS DO WHATSAPP

**Data:** 2024-11-20  
**Status:** 🔄 **EM ANDAMENTO**

---

## 🔍 PROBLEMAS IDENTIFICADOS

### **1. Frontend não envia token de autenticação**
- ❌ `whatsappChatApi.ts` usa `publicAnonKey` ao invés do token do usuário
- ❌ `evolutionContactsService.ts` usa `publicAnonKey` ao invés do token do usuário
- ❌ Backend não consegue identificar `organizationId` sem token válido

### **2. Backend não encontra credenciais**
- ⚠️ `getEvolutionConfigForOrganization()` pode não encontrar credenciais
- ⚠️ `organization_id` pode não estar sendo identificado corretamente

### **3. Evolution API pode estar offline**
- ⚠️ Instância pode não estar conectada
- ⚠️ Credenciais podem estar incorretas

---

## ✅ SOLUÇÃO COMPLETA

### **ETAPA 1: Corrigir frontend para enviar token**

**Problema:** Frontend usa `publicAnonKey` ao invés do token do usuário autenticado.

**Solução:**
1. ✅ Criar hook `useAuthToken()` para obter token do AuthContext
2. ✅ Modificar `whatsappChatApi.ts` para usar token do usuário
3. ✅ Modificar `evolutionContactsService.ts` para usar token do usuário
4. ✅ Adicionar logs detalhados para debug

### **ETAPA 2: Melhorar identificação de organizationId no backend**

**Problema:** Backend pode não identificar `organizationId` corretamente.

**Solução:**
1. ✅ Adicionar logs detalhados em `getOrganizationIdOrThrow()`
2. ✅ Adicionar logs detalhados em `getEvolutionConfigForOrganization()`
3. ✅ Adicionar fallback para buscar organização padrão se não encontrar

### **ETAPA 3: Testar conexão com Evolution API**

**Problema:** Pode haver erro na conexão com Evolution API.

**Solução:**
1. ✅ Adicionar logs detalhados nas requisições à Evolution API
2. ✅ Validar credenciais antes de fazer requisições
3. ✅ Melhorar mensagens de erro

---

## 🔧 IMPLEMENTAÇÃO

### **PASSO 1: Corrigir frontend (whatsappChatApi.ts)**

```typescript
// ❌ ANTES:
const response = await fetch(`${BASE_URL}/whatsapp/chats`, {
  headers: {
    'Authorization': `Bearer ${publicAnonKey}`, // ❌ ERRADO!
  },
});

// ✅ DEPOIS:
const token = localStorage.getItem('rendizy-token'); // ✅ Token do usuário
const response = await fetch(`${BASE_URL}/whatsapp/chats`, {
  headers: {
    'Authorization': `Bearer ${token}`, // ✅ CORRETO!
    'Content-Type': 'application/json',
  },
});
```

### **PASSO 2: Corrigir frontend (evolutionContactsService.ts)**

```typescript
// ❌ ANTES:
const response = await fetch(
  `https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/whatsapp/chats`,
  {
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`, // ❌ ERRADO!
    }
  }
);

// ✅ DEPOIS:
const token = localStorage.getItem('rendizy-token'); // ✅ Token do usuário
const response = await fetch(
  `https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/whatsapp/chats`,
  {
    headers: {
      'Authorization': `Bearer ${token}`, // ✅ CORRETO!
      'Content-Type': 'application/json',
    }
  }
);
```

### **PASSO 3: Adicionar logs detalhados no backend**

```typescript
// ✅ Adicionar logs em getOrganizationIdOrThrow()
console.log(`🔍 [getOrganizationIdOrThrow] Buscando organization_id...`);
console.log(`🔍 [getOrganizationIdOrThrow] Token recebido:`, token ? `${token.substring(0, 20)}...` : 'NONE');

// ✅ Adicionar logs em getEvolutionConfigForOrganization()
console.log(`🔍 [getEvolutionConfigForOrganization] Buscando config para org:`, organizationId);
console.log(`✅ [getEvolutionConfigForOrganization] Config encontrada:`, config ? 'SIM' : 'NÃO');
```

---

## 📝 CHECKLIST

- [ ] Corrigir `whatsappChatApi.ts` para usar token do usuário
- [ ] Corrigir `evolutionContactsService.ts` para usar token do usuário
- [ ] Adicionar logs detalhados no backend
- [ ] Testar requisições com token válido
- [ ] Verificar se credenciais estão no banco
- [ ] Testar conexão com Evolution API diretamente
- [ ] Verificar se instância está conectada

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ **Corrigir frontend para enviar token**
2. ✅ **Adicionar logs detalhados**
3. ✅ **Testar requisições**
4. ✅ **Verificar credenciais no banco**

---

**Última atualização:** 2024-11-20

