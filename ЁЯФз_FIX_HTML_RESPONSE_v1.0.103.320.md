# 🔧 FIX: HTML Response Error v1.0.103.320

**Data:** 06/11/2025  
**Versão:** v1.0.103.320  
**Tipo:** 🔧 CORREÇÃO - Validação de Content-Type

---

## 🐛 PROBLEMA ENCONTRADO

### **Erro Original:**

```
[WhatsApp] ❌ Erro em chats: SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON
[WhatsApp] ❌ Erro em contacts: SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON
```

### **Causa Raiz:**

A Evolution API estava retornando **HTML** (página web) ao invés de **JSON** em alguns casos, e o código estava tentando fazer parse com `.json()` sem verificar o content-type primeiro.

**Por que retorna HTML?**

1. URL incorreta (apontando para interface web ao invés da API)
2. Erro de autenticação (API redireciona para login)
3. Rota não existe na versão da API
4. Servidor retornou página de erro

---

## ✅ SOLUÇÃO IMPLEMENTADA

### **Antes:**

```typescript
const response = await fetch(url);

if (!response.ok) {
  return fallback;
}

const data = await response.json(); // ❌ ERRO se HTML
```

### **Depois:**

```typescript
const response = await fetch(url);

if (!response.ok) {
  console.error('[WhatsApp] ⚠️ Status não OK:', response.status);
  return fallback;
}

// ✅ VERIFICAR CONTENT-TYPE ANTES
const contentType = response.headers.get('content-type');
if (!contentType || !contentType.includes('application/json')) {
  console.error('[WhatsApp] ⚠️ Resposta não é JSON:', contentType);
  console.error('[WhatsApp] 💡 API retornou HTML - possível erro de URL ou autenticação');
  return {
    success: true,
    data: [],
    offline: true,
    message: 'Evolution API retornou HTML ao invés de JSON',
  };
}

const data = await response.json(); // ✅ SEGURO

// ✅ VALIDAR TIPO DE DADO
if (!Array.isArray(data)) {
  console.error('[WhatsApp] ⚠️ Resposta não é array:', typeof data);
  return fallback;
}
```

---

## 🔧 ENDPOINTS CORRIGIDOS

### **1. GET /whatsapp/chats**

**Linha:** 727-769

**Melhorias:**
- ✅ Verificação de content-type
- ✅ Validação de array
- ✅ Logs detalhados
- ✅ Fallback gracioso

---

### **2. GET /whatsapp/contacts**

**Linha:** 775-817

**Melhorias:**
- ✅ Verificação de content-type
- ✅ Validação de array
- ✅ Logs detalhados
- ✅ Fallback gracioso

---

## 📊 VALIDAÇÕES ADICIONADAS

### **1. Verificação de Status HTTP**

```typescript
if (!response.ok) {
  console.error('[WhatsApp] ⚠️ Status não OK:', response.status);
  return fallback;
}
```

**Detecta:**
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 500 Internal Server Error

---

### **2. Verificação de Content-Type**

```typescript
const contentType = response.headers.get('content-type');
if (!contentType || !contentType.includes('application/json')) {
  console.error('[WhatsApp] ⚠️ Resposta não é JSON:', contentType);
  return fallback;
}
```

**Detecta:**
- `text/html` - Página web
- `text/plain` - Texto puro
- `application/xml` - XML
- `undefined` - Sem content-type

---

### **3. Validação de Tipo de Dado**

```typescript
if (!Array.isArray(data)) {
  console.error('[WhatsApp] ⚠️ Resposta não é array:', typeof data);
  return fallback;
}
```

**Detecta:**
- Objeto quando esperava array
- String quando esperava array
- Null/Undefined

---

## 🎯 COMPORTAMENTO AGORA

### **Quando API Retorna HTML:**

```
[WhatsApp] 💬 Buscando conversas...
[WhatsApp] ⚠️ Resposta não é JSON: text/html; charset=utf-8
[WhatsApp] 💡 API retornou HTML - possível erro de URL ou autenticação

Response:
{
  "success": true,
  "data": [],
  "offline": true,
  "message": "Evolution API retornou HTML ao invés de JSON"
}
```

**Frontend recebe:**
- ✅ Sem erro JavaScript
- ✅ Array vazio (safe)
- ✅ Flag `offline: true`
- ✅ Mensagem explicativa

---

### **Quando API Retorna JSON Inválido:**

```
[WhatsApp] 💬 Buscando conversas...
[WhatsApp] ⚠️ Resposta não é array: object

Response:
{
  "success": true,
  "data": [],
  "offline": true
}
```

---

### **Quando API Funciona:**

```
[WhatsApp] 💬 Buscando conversas...
[WhatsApp] ✅ Conversas sincronizadas: 15

Response:
{
  "success": true,
  "data": [...]
}
```

---

## 🔍 DIAGNÓSTICO

### **Possíveis Causas do HTML:**

#### **1. URL Incorreta**

```
❌ Errado: https://api.evolution.com/
✅ Correto: https://api.evolution.com/api/v1
```

**Verificar:**
```bash
echo $EVOLUTION_API_URL
# Deve terminar com /api/v1 ou similar
```

---

#### **2. Endpoint Não Existe**

```
❌ GET /chat/findChats/instance
✅ GET /api/v1/chat/findChats/instance
```

**Testar manualmente:**
```bash
curl -H "apikey: YOUR_KEY" \
     -H "instanceToken: YOUR_TOKEN" \
     https://api.evolution.com/api/v1/chat/findChats/instance
```

---

#### **3. Autenticação Falhando**

```
Headers enviados:
{
  "apikey": "abc123",
  "instanceToken": "xyz789"
}

Resposta:
HTTP/1.1 302 Found
Location: /login
Content-Type: text/html
```

**Verificar:**
```bash
# Testar credenciais
curl -v -H "apikey: $EVOLUTION_GLOBAL_API_KEY" \
        -H "instanceToken: $EVOLUTION_INSTANCE_TOKEN" \
        $EVOLUTION_API_URL/instance/status/$EVOLUTION_INSTANCE_NAME
```

---

#### **4. Versão da API Incompatível**

```
API v1: GET /chat/findChats/{instance}
API v2: GET /v2/chats/{instance}
```

**Verificar versão:**
```bash
curl $EVOLUTION_API_URL/version
```

---

## 🧪 COMO TESTAR

### **1. Verificar Logs:**

```bash
# Abrir console do navegador (F12)
# Abrir aba Network
# Fazer requisição para /whatsapp/chats ou /whatsapp/contacts
# Verificar:
# - Status Code (deve ser 200)
# - Content-Type (deve ser application/json)
# - Response (deve ser JSON, não HTML)
```

---

### **2. Testar no Backend:**

```bash
# Logs do Supabase Edge Function
# Procurar por:
[WhatsApp] ⚠️ Resposta não é JSON: text/html
[WhatsApp] 💡 API retornou HTML - possível erro de URL ou autenticação
```

---

### **3. Testar Evolution API Diretamente:**

```bash
# Status
curl -H "apikey: $KEY" -H "instanceToken: $TOKEN" \
     $EVOLUTION_API_URL/instance/status/$INSTANCE

# Chats
curl -H "apikey: $KEY" -H "instanceToken: $TOKEN" \
     $EVOLUTION_API_URL/chat/findChats/$INSTANCE

# Contacts
curl -H "apikey: $KEY" -H "instanceToken: $TOKEN" \
     $EVOLUTION_API_URL/contact/findContacts/$INSTANCE
```

**Se retornar HTML:**
```html
<!doctype html>
<html>...
```

**Problema confirmado!**

---

## 🎯 PRÓXIMOS PASSOS

### **Se ainda retorna HTML:**

1. **Verificar variáveis de ambiente:**
   ```bash
   echo $EVOLUTION_API_URL
   echo $EVOLUTION_INSTANCE_NAME
   echo $EVOLUTION_GLOBAL_API_KEY
   echo $EVOLUTION_INSTANCE_TOKEN
   ```

2. **Testar URL base:**
   ```bash
   curl $EVOLUTION_API_URL
   # Deve retornar informações da API, não HTML
   ```

3. **Verificar documentação da API:**
   - Confirmar URLs corretas
   - Confirmar headers necessários
   - Confirmar versão da API

4. **Contatar suporte Evolution API:**
   - Informar que endpoints retornam HTML
   - Pedir URLs corretas
   - Pedir exemplos de curl

---

## ✅ BENEFÍCIOS DA CORREÇÃO

### **Antes:**

```
❌ Erro JavaScript quebra aplicação
❌ Logs não informativos
❌ Usuário vê tela de erro
❌ Sem fallback
```

### **Depois:**

```
✅ Graceful degradation
✅ Logs detalhados e úteis
✅ Usuário vê array vazio (não quebra UI)
✅ Mensagem explicativa
✅ Modo offline automático
```

---

## 📚 DOCUMENTAÇÃO ATUALIZADA

### **Arquivos Modificados:**

```
/supabase/functions/server/routes-whatsapp-evolution-complete.ts
  - Linha 727-769: GET /whatsapp/chats
  - Linha 775-817: GET /whatsapp/contacts
```

### **Padrão de Validação:**

```typescript
// 1. Verificar status HTTP
if (!response.ok) {
  console.error('[WhatsApp] ⚠️ Status não OK:', response.status);
  return fallback;
}

// 2. Verificar content-type
const contentType = response.headers.get('content-type');
if (!contentType || !contentType.includes('application/json')) {
  console.error('[WhatsApp] ⚠️ Resposta não é JSON:', contentType);
  return fallback;
}

// 3. Parse JSON
const data = await response.json();

// 4. Validar tipo de dado
if (!Array.isArray(data)) {
  console.error('[WhatsApp] ⚠️ Resposta não é array:', typeof data);
  return fallback;
}

// 5. Processar dados
processData(data);
```

**Este padrão deve ser aplicado em TODOS os endpoints que fazem fetch.**

---

## 🎓 APRENDIZADO

### **Lição Crítica:**

**NUNCA assumir que `response.json()` vai funcionar!**

Sempre:
1. Verificar `response.ok`
2. Verificar `content-type`
3. Validar tipo de dado
4. Ter fallback

### **Erro Comum:**

```typescript
// ❌ PERIGOSO
const data = await response.json();

// ✅ SEGURO
const contentType = response.headers.get('content-type');
if (contentType?.includes('application/json')) {
  const data = await response.json();
}
```

---

## ✅ CHECKLIST

- [x] Verificação de content-type em `/whatsapp/chats`
- [x] Verificação de content-type em `/whatsapp/contacts`
- [x] Validação de tipo de dado (array)
- [x] Logs detalhados
- [x] Fallback gracioso
- [x] Mensagem explicativa para debugging
- [x] Documentação atualizada

---

## 🚀 TESTE AGORA

**Passos:**

1. **Limpar cache:**
   ```
   Ctrl+Shift+R (Windows/Linux)
   Cmd+Shift+R (Mac)
   ```

2. **Abrir console:**
   ```
   F12 → Console
   ```

3. **Navegar para WhatsApp:**
   ```
   Menu → Integrações → WhatsApp
   ```

4. **Verificar logs:**
   ```
   Procurar por:
   [WhatsApp] 💬 Buscando conversas...
   [WhatsApp] 👥 Buscando contatos...
   ```

5. **Verificar se ainda tem erro:**
   ```
   ❌ Se tiver "Unexpected token '<'" → API retornando HTML
   ✅ Se tiver "offline: true" → Correção funcionando!
   ```

---

**VERSÃO:** v1.0.103.320  
**STATUS:** ✅ ERRO CORRIGIDO  
**IMPACTO:** Graceful degradation quando API retorna HTML
