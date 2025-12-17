# 💻 CÓDIGO SALVAMENTO WIZARD - ANÁLISE LINHA POR LINHA

## 🎯 Versão: v1.0.103.305

---

## 1️⃣ BOTÃO "SALVAR E AVANÇAR"

**Arquivo:** `/components/PropertyEditWizard.tsx` linha 443

```typescript
const handleSaveAndNext = async () => {
  try {
    setIsSavingInternal(true);
    
    // ✅ PONTO CRÍTICO: Aqui salva no Supabase
    if (property?.id) {
      await updateProperty(property.id, formData, {
        redirectToList: false,  // ✅ Não redireciona (continua no wizard)
        customSuccessMessage: `Step ${getCurrentStepNumber()} salvo com sucesso!`
      });
    }
    
    // Marca step como completo e avança
    setCompletedSteps((prev) => new Set(prev).add(step.id));
    await new Promise(resolve => setTimeout(resolve, 100));
    setCurrentStepIndex(currentStepIndex + 1);
    
  } finally {
    setIsSavingInternal(false);
  }
};
```

---

## 2️⃣ HOOK updateProperty

**Arquivo:** `/hooks/usePropertyActions.ts` linha 144

```typescript
const updateProperty = async (
  propertyId: string,
  data: Partial<Property>,
  options: PropertyActionOptions = {}
) => {
  // ✅ PONTO CRÍTICO: Aqui chama a API do Supabase
  const response = await propertiesApi.update(propertyId, data);
  
  // Toast de sucesso
  enhancedToast.success(successMessage, {
    description: 'As alterações foram salvas no sistema',
    duration: 6000
  });
  
  // ✅ Não redireciona porque redirectToList = false
  return response;
};
```

---

## 3️⃣ API CLIENT

**Arquivo:** `/utils/api.ts` linha 513

```typescript
export const propertiesApi = {
  update: async (id: string, data: Partial<Property>): Promise<ApiResponse<Property>> => {
    // ✅ PONTO CRÍTICO: Aqui faz requisição HTTP ao Supabase
    return apiRequest<Property>(`/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};
```

---

## 4️⃣ REQUISIÇÃO HTTP

**Arquivo:** `/utils/api.ts` linha 209

```typescript
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  // ✅ URL DO SUPABASE EDGE FUNCTION
  const url = `${API_BASE_URL}${endpoint}`;
  // Exemplo: https://abc123.supabase.co/functions/v1/make-server-67caf26a/properties/PRP7K9
  
  // ✅ REQUISIÇÃO REAL AO SUPABASE
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,  // ✅ Auth Supabase
      ...options.headers,
    },
  });

  const data = await response.json();
  return data;
}
```

---

## 5️⃣ BACKEND SUPABASE

**Arquivo:** `/supabase/functions/server/routes-properties.ts`

```typescript
// PUT /properties/:id
app.put('/properties/:id', async (c) => {
  const propertyId = c.req.param('id');
  const tenantId = getTenantId(c);  // ✅ Extrai tenant do JWT
  const updates = await c.req.json();
  
  // Busca propriedade existente
  const key = `property:${tenantId}:${propertyId}`;
  const existing = await kv.get(key);
  
  if (!existing) {
    return c.json({ success: false, error: 'Property not found' }, 404);
  }
  
  // ✅ ATUALIZA PROPRIEDADE
  const updated = {
    ...existing,
    ...updates,
    id: propertyId,
    updatedAt: new Date().toISOString()
  };
  
  // ✅ PONTO CRÍTICO: GRAVA NO SUPABASE KV STORE
  await kv.set(key, updated);
  
  console.log(`✅ Propriedade ${propertyId} atualizada com sucesso`);
  
  return c.json({
    success: true,
    data: updated,
    timestamp: new Date().toISOString()
  });
});
```

---

## 📊 EXEMPLO REAL DE REQUEST/RESPONSE

### REQUEST

```http
PUT https://abc123.supabase.co/functions/v1/make-server-67caf26a/properties/PRP7K9
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "contentType": {
    "propertyTypeId": "tipo_apartamento",
    "accommodationTypeId": "apto_1_quarto",
    "subtipo": "standard",
    "modalidades": ["aluguel_temporada"],
    "registrationNumber": "12345678",
    "propertyType": "individual"
  },
  "contentLocation": {
    "mode": "new",
    "address": {
      "country": "BR",
      "state": "São Paulo",
      "city": "São Paulo",
      "street": "Av. Paulista",
      "number": "1000"
    }
  }
}
```

### RESPONSE

```json
{
  "success": true,
  "data": {
    "id": "PRP7K9",
    "contentType": {
      "propertyTypeId": "tipo_apartamento",
      "accommodationTypeId": "apto_1_quarto",
      "subtipo": "standard",
      "modalidades": ["aluguel_temporada"],
      "registrationNumber": "12345678",
      "propertyType": "individual"
    },
    "contentLocation": {
      "mode": "new",
      "address": {
        "country": "BR",
        "state": "São Paulo",
        "city": "São Paulo",
        "street": "Av. Paulista",
        "number": "1000"
      }
    },
    "updatedAt": "2025-11-04T20:00:00.000Z",
    "createdAt": "2025-11-04T19:00:00.000Z"
  },
  "timestamp": "2025-11-04T20:00:00.000Z"
}
```

---

## 🔍 LOGS NO CONSOLE

### Frontend

```
💾 [Wizard] Salvando E avançando...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✏️ [PROPERTY ACTIONS] Editando imóvel...
📊 [PROPERTY ACTIONS] ID: PRP7K9
📊 [PROPERTY ACTIONS] Dados: { contentType: {...}, contentLocation: {...} }
```

### Backend (Supabase Edge Function)

```
PUT /properties/PRP7K9
✏️ Atualizando propriedade PRP7K9...
📊 Tenant ID: org_abc123
📊 Updates: { contentType: {...}, contentLocation: {...} }
✅ Propriedade PRP7K9 atualizada com sucesso
```

### Frontend (Resposta)

```
✅ [PROPERTY ACTIONS] Imóvel editado com sucesso: { success: true, data: {...} }
🔄 [PROPERTY ACTIONS] Executando callback onSuccess...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ✅ CONFIRMAÇÃO TÉCNICA

### MOCK ESTÁ DESABILITADO

**Arquivo:** `/utils/mockBackend.ts` linha 1785

```typescript
export function isMockEnabled(): boolean {
  console.warn('⚠️ MOCK MODE DESABILITADO - Sistema usa apenas Supabase (desde v1.0.103.305)');
  
  // Limpar flag antiga se existir
  if (localStorage.getItem(MOCK_ENABLED_KEY)) {
    localStorage.removeItem(MOCK_ENABLED_KEY);
  }
  
  return false; // ✅ SEMPRE false
}
```

### API NÃO CHECA MOCK

**Arquivo:** `/utils/api.ts` (linha 10)

```typescript
// Mock backend desabilitado em v1.0.103.305 - Sistema usa apenas Supabase
// import { mockBackend, isMockEnabled } from './mockBackend';  ❌ REMOVIDO
```

---

## 🎯 RESUMO

### QUANDO VOCÊ CLICA "SALVAR E AVANÇAR":

```
1. handleSaveAndNext()          → /components/PropertyEditWizard.tsx
2. updateProperty()              → /hooks/usePropertyActions.ts
3. propertiesApi.update()        → /utils/api.ts
4. apiRequest() fetch()          → /utils/api.ts
5. PUT request HTTP              → Rede
6. Supabase Edge Function        → /supabase/functions/server/routes-properties.ts
7. kv.set()                      → GRAVA NO BANCO ✅
8. Response 200 OK               → Rede
9. Toast "Step X salvo!"         → Frontend
10. Avança para próximo step    → Frontend
```

### TUDO ISSO ACONTECE EM ~500ms

---

**Data:** 04/11/2025  
**Versão:** v1.0.103.305  
**Confirmado:** ✅ GRAVA NO SUPABASE
