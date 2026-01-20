# 🔍 DIAGNÓSTICO: Erro 400 ao Salvar Rascunho

## ❌ PROBLEMA

Ao tentar salvar rascunho via API, recebemos:

- **Erro 400 (Bad Request)**: "O servidor remoto retornou um erro: (400) Solicitação Incorreta"
- **Query SQL retorna**: "No rows returned" - nenhum rascunho foi salvo

---

## 🔍 ANÁLISE

### **1. Script PowerShell executado:**

```powershell
Payload: {"status":"draft"}
URL: https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/properties
Token: bdf900df83d641f8cad5716b16ed97588790dc0057ff568f998d0d217ff57d6b4e180cb56843dbc4a3c781efd296acade723c2c70fd61a2f3cc414fee5ae36a9
```

### **2. Backend esperado:**

O código em `routes-properties.ts` deveria:

1. ✅ Detectar `status === "draft"`
2. ✅ Verificar que não tem `id`
3. ✅ Chamar `createDraftPropertyMinimal()`
4. ✅ Criar registro mínimo no banco

### **3. Possíveis causas do erro 400:**

#### **A. Middleware de autenticação bloqueando**

- O `tenancyMiddleware` pode estar rejeitando antes de chegar em `createProperty`
- Verificar logs do backend para ver se a requisição chega em `createProperty`

#### **B. Detecção de `isDraft` falhando**

- O backend pode não estar detectando `status: "draft"` corretamente
- Verificar logs: `🔍 [createProperty] Verificação de rascunho`

#### **C. Validação executando antes da detecção de rascunho**

- Alguma validação pode estar rodando antes da verificação de `isDraft`
- Verificar se há middleware de validação

#### **D. Erro no `createDraftPropertyMinimal`**

- A função pode estar falhando ao inserir no banco
- Verificar logs: `❌ [createDraftPropertyMinimal] Erro ao criar rascunho`

---

## 🧪 PRÓXIMOS PASSOS

### **1. Verificar logs do backend (SUPABASE):**

```bash
# Acessar logs do Supabase
# Procurar por:
# - "🔍 [createProperty] Body recebido"
# - "🔍 [createProperty] Verificação de rascunho"
# - "🆕 [createProperty] Rascunho sem ID"
# - "❌ [createDraftPropertyMinimal] Erro"
```

### **2. Testar com curl (para ver resposta completa):**

```powershell
curl.exe -X POST "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/properties" `
  -H "Content-Type: application/json" `
  -H "X-Auth-Token: bdf900df83d641f8cad5716b16ed97588790dc0057ff568f998d0d217ff57d6b4e180cb56843dbc4a3c781efd296acade723c2c70fd61a2f3cc414fee5ae36a9" `
  -d '{"status":"draft"}' `
  -v
```

### **3. Verificar se o endpoint está correto:**

- URL: `/functions/v1/rendizy-server/properties`
- Método: `POST`
- Header: `X-Auth-Token` (não `Authorization`)

### **4. Verificar se o token está válido:**

- O token pode ter expirado
- Verificar se o usuário está autenticado

---

## 📋 CHECKLIST DE VERIFICAÇÃO

- [ ] Verificar logs do Supabase Edge Functions
- [ ] Testar com curl para ver resposta completa
- [ ] Verificar se o token está válido
- [ ] Verificar se o endpoint está correto
- [ ] Verificar se há middleware bloqueando
- [ ] Verificar se `isDraft` está sendo detectado corretamente

---

## 🎯 AÇÃO IMEDIATA

**Execute este comando para ver a resposta completa do erro:**

```powershell
.\teste-rascunho-simples.ps1
```

**E verifique os logs do Supabase para ver o que o backend está recebendo.**
