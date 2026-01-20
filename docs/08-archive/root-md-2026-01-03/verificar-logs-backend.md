# 📋 COMO VERIFICAR LOGS DO BACKEND

## 🔍 Verificar logs do Supabase Edge Functions

### **1. Via Supabase Dashboard:**

1. Acesse: https://supabase.com/dashboard
2. Selecione o projeto
3. Vá em **Edge Functions** → **rendizy-server**
4. Clique em **Logs**
5. Procure por requisições recentes com:
   - `POST /properties`
   - `🔍 [createProperty]`
   - `❌ [createDraftPropertyMinimal]`

### **2. Via Supabase CLI:**

```bash
supabase functions logs rendizy-server --follow
```

### **3. O que procurar nos logs:**

#### **✅ Se funcionou:**

```
🆕 [createProperty] Rascunho sem ID - criando registro mínimo primeiro
✅ [createDraftPropertyMinimal] Rascunho criado com ID
```

#### **❌ Se falhou:**

```
⚠️ [createProperty] NÃO entrou em createDraftPropertyMinimal
❌ [createDraftPropertyMinimal] Erro ao criar rascunho
```

---

## 🧪 Testar com curl (ver resposta completa)

```powershell
curl.exe -X POST "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/properties" `
  -H "Content-Type: application/json" `
  -H "X-Auth-Token: bdf900df83d641f8cad5716b16ed97588790dc0057ff568f998d0d217ff57d6b4e180cb56843dbc4a3c781efd296acade723c2c70fd61a2f3cc414fee5ae36a9" `
  -d '{"status":"draft"}' `
  -v
```

O `-v` mostra headers e resposta completa.
