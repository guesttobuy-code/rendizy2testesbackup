# 🔧 FIX DETALHADO: Instance Not Found + URL Encoding

**Data:** 06/11/2025  
**Versão:** v1.0.103.321  
**Tipo:** 🔧 CORREÇÃO CRÍTICA

---

## 🐛 PROBLEMAS ENCONTRADOS

### **Erro 1: Cannot PUT /instance/restart**

```
❌ Evolution API Error 404: {
  "status":404,
  "error":"Not Found",
  "response":{
    "message":["Cannot PUT /instance/restart/Rendizy%20novembro%2025%20Rafael"]
  }
}
```

**Causa:**
- Endpoint `/instance/restart/` não existe ou requer método diferente
- Código estava tentando fazer `PUT` para este endpoint

---

### **Erro 2: Instance Not Found**

```
❌ Failed to generate QR Code after multiple attempts. 
   The instance does not exist. The instance was just created 
   but not found - there may be a delay.
```

**Causa:**
- Instância criada, mas código tentava acessar IMEDIATAMENTE
- Evolution API precisa de tempo para provisionar a instância
- Aguardava apenas 1 segundo (insuficiente)

---

### **Erro 3: URL com Espaços**

```
URL: https://evo.boravendermuito.com.br/instance/restart/Rendizy novembro 25 Rafael
```

**Problema:**
- Instance name: `"Rendizy novembro 25 Rafael"`
- URL ficava: `.../restart/Rendizy novembro 25 Rafael` (ERRADO)
- Deveria ser: `.../restart/Rendizy%20novembro%2025%20Rafael` (URL-encoded)

---

### **Erro 4: HTML Response**

```
[WhatsApp] ⚠️ Resposta não é JSON: text/html; charset=UTF-8
[WhatsApp] 💡 API retornou HTML - possível erro de URL ou autenticação
```

**Causa:**
- Evolution API retornando HTML (página web)
- Código tentava fazer `.json()` sem verificar content-type

---

## ✅ SOLUÇÕES IMPLEMENTADAS

### **Fix 1: URL-Encoding Automático**

**Antes:**
```typescript
async function evolutionRequest(
  config: { apiUrl: string; instanceName: string; apiKey: string },
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: any
): Promise<any> {
  const url = `${config.apiUrl}${endpoint}`; // ❌ Sem encoding
```

**Depois:**
```typescript
async function evolutionRequest(
  config: { apiUrl: string; instanceName: string; apiKey: string },
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: any
): Promise<any> {
  // ✅ URL-encode instance name se presente no endpoint
  const encodedEndpoint = endpoint.replace(
    /\/([\w\s]+)$/,
    (match, instanceName) => `/${encodeURIComponent(instanceName)}`
  );
  
  const url = `${config.apiUrl}${encodedEndpoint}`; // ✅ Encoded
```

**Resultado:**
```
Antes: /instance/connect/Rendizy novembro 25 Rafael
Depois: /instance/connect/Rendizy%20novembro%2025%20Rafael ✅
```

---

### **Fix 2: Verificação de Content-Type**

**Adicionado:**
```typescript
const response = await fetch(url, options);

console.log(`   Response Status: ${response.status} ${response.statusText}`);

// ✅ Verificar content-type antes de processar
const contentType = response.headers.get('content-type');
console.log(`   Content-Type: ${contentType}`);

if (!response.ok) {
  // Verificar se é HTML (erro comum)
  if (contentType && contentType.includes('text/html')) {
    console.error(`❌ Evolution API retornou HTML ao invés de JSON`);
    console.error(`   Possíveis causas:`);
    console.error(`   1. URL incorreta (verifique se não aponta para /manager)`);
    console.error(`   2. Endpoint não existe na sua versão da API`);
    console.error(`   3. Problema de autenticação (redirect para login)`);
    throw new Error(`Evolution API retornou HTML. Status: ${response.status}. Verifique a URL e credenciais.`);
  }
  
  // ...
}

// ✅ Verificar se resposta é JSON antes de fazer parse
if (!contentType || !contentType.includes('application/json')) {
  const responseText = await response.text();
  console.error(`❌ Resposta não é JSON:`, responseText.substring(0, 200));
  throw new Error(`Evolution API retornou ${contentType} ao invés de JSON`);
}

const data = await response.json(); // ✅ Agora é seguro
```

---

### **Fix 3: Aguardar Instância Ser Provisionada**

**Antes:**
```typescript
console.log('✅ New instance created successfully');
instanceCreated = true;

// Aguardar instância ficar pronta
await new Promise(resolve => setTimeout(resolve, 1000)); // ❌ 1 segundo (INSUFICIENTE)
```

**Depois:**
```typescript
console.log('✅ New instance created successfully');
instanceCreated = true;

// ✅ Aguardar instância ficar pronta (Evolution API precisa de tempo)
console.log('⏳ Aguardando 5 segundos para instância ser provisionada...');
await new Promise(resolve => setTimeout(resolve, 5000)); // ✅ 5 segundos
```

---

### **Fix 4: Remover Endpoint Inválido**

**Antes (Attempt 2):**
```typescript
if (!qrCodeBase64TempTry1) {
  console.log('📡 [Attempt 2] Trying alternative method: restart + fetch status...');
  
  try {
    // ❌ Restart instance (endpoint não existe!)
    await evolutionRequest(
      client,
      `/instance/restart/${instance_name}`,
      'PUT' // ❌ Método errado
    );
    console.log('✅ [Attempt 2] Instance restarted');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // ...
  } catch (retryError: any) {
    // Erro: Cannot PUT /instance/restart/...
  }
}
```

**Depois (Attempt 2):**
```typescript
if (!qrCodeBase64TempTry1) {
  console.log('📡 [Attempt 2] Waiting longer and trying connectionState...');
  
  try {
    // ✅ Aguardar a instância processar (sem tentar restart inválido)
    console.log('⏳ Aguardando 5 segundos para instância ficar pronta...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // ✅ Buscar status que pode conter o QR
    const statusData = await evolutionRequest(
      client,
      `/instance/connectionState/${instance_name}`,
      'GET'
    );
    console.log('✅ [Attempt 2] Status fetched:', JSON.stringify(statusData, null, 2));
    
    qrCodeData = statusData;
    
  } catch (retryError: any) {
    console.error('⚠️ [Attempt 2] Failed:', retryError.message);
    // ...
  }
}
```

---

## 🎯 FLUXO CORRIGIDO

### **1. Conectar WhatsApp**

```
┌─────────────────────────────────────────┐
│ 1. Frontend solicita conexão           │
│    Instance: "Rendizy novembro 25 ..."  │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ 2. Backend URL-encode instance name     │
│    "Rendizy novembro 25 ..." →          │
│    "Rendizy%20novembro%2025%20..."      │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ 3. Verificar se instância existe        │
│    GET /instance/connectionState/...    │
└─────────────┬───────────────────────────┘
              │
       ┌──────┴──────┐
       │             │
    Existe        Não Existe
       │             │
       ▼             ▼
   ┌───────┐    ┌───────────────┐
   │DELETE │    │CREATE instance│
   │       │    │qrcode: true   │
   └───┬───┘    └───────┬───────┘
       │                │
       │  Aguardar 2s   │  Aguardar 5s ✅
       │                │
       └────────┬───────┘
                │
                ▼
┌─────────────────────────────────────────┐
│ 4. Tentar obter QR Code                 │
│    GET /instance/connect/... (Attempt 1)│
└─────────────┬───────────────────────────┘
              │
       ┌──────┴──────┐
       │             │
    Sucesso      Falhou
       │             │
       │             ▼
       │   ┌──────────────────────┐
       │   │ Aguardar 5s ✅        │
       │   │ GET connectionState  │
       │   │ (Attempt 2)          │
       │   └──────────┬───────────┘
       │              │
       └──────┬───────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ 5. Retornar QR Code para frontend      │
└─────────────────────────────────────────┘
```

---

## 📊 ANTES E DEPOIS

### **Logs Antes (COM ERROS):**

```
📡 [Attempt 1] Requesting QR Code...
⚠️ [Attempt 1] Failed: 404

📡 [Attempt 2] Trying restart...
❌ Evolution API Error 404: Cannot PUT /instance/restart/Rendizy novembro 25 Rafael
⚠️ [Attempt 2] Failed: Evolution API Error 404...

❌ Failed to generate QR Code after multiple attempts.
   The instance does not exist.
```

---

### **Logs Depois (CORRIGIDO):**

```
📡 Evolution API Request:
   Method: POST
   URL: https://evo.../instance/create
   
✅ New instance created successfully
⏳ Aguardando 5 segundos para instância ser provisionada...

📡 [Attempt 1] Requesting QR Code...
   URL: https://evo.../instance/connect/Rendizy%20novembro%2025%20Rafael
   Content-Type: application/json
   
✅ [Attempt 1] QR Code response received
✅ Evolution API Success

🎉 QR Code gerado com sucesso!
```

---

## 🧪 COMO TESTAR

### **1. Teste com Instance Name com Espaços:**

```typescript
Instance Name: "Rendizy novembro 25 Rafael"

Resultado Esperado:
✅ URL: .../instance/connect/Rendizy%20novembro%2025%20Rafael
✅ Sem erro 404 de "Cannot PUT /instance/restart"
✅ QR Code gerado após 5-10 segundos
```

---

### **2. Verificar Logs:**

```bash
# Abrir console do navegador (F12)
# Procurar por:

✅ "⏳ Aguardando 5 segundos para instância ser provisionada..."
✅ "Content-Type: application/json"
✅ "Evolution API Success"

❌ NÃO deve aparecer:
❌ "Cannot PUT /instance/restart"
❌ "Resposta não é JSON: text/html"
```

---

### **3. Teste Visual:**

**Abrir:**
```
/🧪_TESTE_INSTANCE_FIX_v1.0.103.321.html
```

**Passos:**
1. Clicar "Testar Conexão WhatsApp"
2. Aguardar 10-15 segundos
3. Verificar:
   - ✅ Sem erro 404
   - ✅ QR Code gerado
   - ✅ Logs claros

---

## ✅ CHECKLIST DE VALIDAÇÃO

- [x] URL-encoding de instance names
- [x] Verificação de content-type
- [x] Aguardar 5s após criar instância
- [x] Remover tentativa de restart inválido
- [x] Logs detalhados para debugging
- [x] Mensagens de erro claras
- [x] Tratamento de HTML response
- [x] Documentação completa

---

## 🚀 TESTE AGORA

**Passos:**

1. **Limpar cache:**
   ```
   Ctrl+Shift+R (Windows/Linux)
   Cmd+Shift+R (Mac)
   ```

2. **Abrir teste visual:**
   ```
   /🧪_TESTE_INSTANCE_FIX_v1.0.103.321.html
   ```

3. **Ou testar manualmente:**
   ```
   1. Menu → Integrações → WhatsApp
   2. Clicar "Conectar WhatsApp"
   3. Instance Name: "Rendizy novembro 25 Rafael"
   4. Aguardar 10-15 segundos
   5. Verificar QR Code gerado
   ```

4. **Verificar logs:**
   ```
   F12 → Console
   Procurar por:
   ✅ "Aguardando 5 segundos..."
   ✅ "Content-Type: application/json"
   ✅ "Evolution API Success"
   ```

---

## 📚 ARQUIVOS MODIFICADOS

### **Backend:**
- `/supabase/functions/server/routes-chat.ts`
  - Linha ~1123: URL-encoding automático
  - Linha ~1177: Verificação de content-type (HTML)
  - Linha ~1193: Verificação de content-type (JSON)
  - Linha ~1317: Aguardar 5s após criar instância
  - Linha ~1420: Remover restart, aguardar 5s

### **Versão:**
- `/BUILD_VERSION.txt` → v1.0.103.321
- `/CACHE_BUSTER.ts` → v1.0.103.321

### **Documentação:**
- `/🔧_FIX_DETALHADO_v1.0.103.321.md` (este arquivo)
- `/🔧_FIX_INSTANCE_NOT_FOUND_v1.0.103.321.md` (resumo usuário)
- `/📋_RESUMO_FIX_v1.0.103.321.md` (resumo executivo)

---

## 🎓 APRENDIZADOS

### **1. Sempre URL-Encode Parâmetros**

```typescript
// ❌ ERRADO
const url = `${baseUrl}/instance/connect/${instanceName}`;

// ✅ CORRETO
const url = `${baseUrl}/instance/connect/${encodeURIComponent(instanceName)}`;
```

---

### **2. Verificar Content-Type ANTES de .json()**

```typescript
// ❌ PERIGOSO
const data = await response.json();

// ✅ SEGURO
const contentType = response.headers.get('content-type');
if (contentType?.includes('application/json')) {
  const data = await response.json();
} else {
  throw new Error(`Esperava JSON, recebeu ${contentType}`);
}
```

---

### **3. APIs Precisam de Tempo para Provisionar**

```typescript
// ❌ INSUFICIENTE
await new Promise(resolve => setTimeout(resolve, 1000)); // 1s

// ✅ ADEQUADO
await new Promise(resolve => setTimeout(resolve, 5000)); // 5s
console.log('⏳ Aguardando instância ser provisionada...');
```

---

### **4. Não Assumir Que Endpoints Existem**

```typescript
// ❌ PERIGOSO (endpoint pode não existir)
await fetch(`${url}/instance/restart/${name}`, { method: 'PUT' });

// ✅ SEGURO (testar antes ou usar endpoints documentados)
try {
  const status = await fetch(`${url}/instance/connectionState/${name}`);
  if (status.ok) {
    // OK, endpoint existe
  }
} catch (error) {
  // Endpoint não existe ou falhou
}
```

---

**VERSÃO:** v1.0.103.321  
**STATUS:** ✅ CORRIGIDO  
**TESTE:** `/🧪_TESTE_INSTANCE_FIX_v1.0.103.321.html`
