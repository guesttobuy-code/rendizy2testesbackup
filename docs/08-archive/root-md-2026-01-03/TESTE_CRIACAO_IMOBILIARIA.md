# 🧪 Guia de Teste: Criação de Imobiliária

**Data:** 2025-11-30  
**Objetivo:** Testar criação de imobiliária via UI após aplicação dos patches do Codex

---

## ✅ VERIFICAÇÕES PRÉ-TESTE

### **1. Backend - Rotas Registradas** ✅
- ✅ Rota POST registrada: `/rendizy-server/make-server-67caf26a/organizations`
- ✅ Função `createOrganization` exportada em `routes-organizations.ts`
- ✅ Debug logs ativos no `index.ts` e middleware

### **2. Frontend - URLs Corrigidas** ✅
- ✅ `CreateOrganizationModal.tsx` usa URL correta: `rendizy-server/make-server-67caf26a/organizations`
- ✅ `AuthContext.tsx` usa URL correta
- ✅ `AdminMasterFunctional.tsx` usa URL correta
- ✅ Todos os 13 arquivos atualizados com URLs corretas

### **3. Autenticação**
- ⚠️ Verificar se usuário está logado
- ⚠️ Verificar se token está no `localStorage`
- ⚠️ Verificar se token é válido

---

## 🧪 PASSOS PARA TESTE

### **Passo 1: Verificar Autenticação**
1. Abrir DevTools (F12)
2. Ir em `Application` > `Local Storage`
3. Verificar se existe `authToken` ou similar
4. Se não existir, fazer login primeiro

### **Passo 2: Acessar Admin Master**
1. Navegar para `/admin` no frontend
2. Verificar se a página carrega corretamente
3. Verificar se lista de organizações aparece

### **Passo 3: Abrir Modal de Criação**
1. Clicar em botão "Criar Imobiliária" ou similar
2. Verificar se modal abre
3. Verificar se campos aparecem corretamente

### **Passo 4: Preencher Formulário**
- **Nome:** `Teste Imobiliária`
- **Email:** `teste@imobiliaria.com`
- **Telefone:** `(11) 99999-9999`
- **Plano:** `free`

### **Passo 5: Submeter Formulário**
1. Clicar em "Criar" ou "Salvar"
2. **Observar console do navegador** (F12 > Console)
3. **Observar Network tab** (F12 > Network)
4. Verificar requisição POST para `/rendizy-server/make-server-67caf26a/organizations`

### **Passo 6: Verificar Resposta**
- ✅ **Sucesso (200/201):** Imobiliária criada
- ❌ **Erro 404:** Rota não encontrada (verificar backend)
- ❌ **Erro 401:** Problema de autenticação
- ❌ **Erro 500:** Erro no servidor (verificar logs)

### **Passo 7: Verificar Logs do Backend**
1. Acessar Supabase Dashboard
2. Ir em `Edge Functions` > `rendizy-server` > `Logs`
3. Procurar por logs com `🚨 [DEBUG ORGANIZATIONS]`
4. Verificar se requisição chegou ao servidor

### **Passo 8: Verificar Banco de Dados**
1. Acessar Supabase Dashboard
2. Ir em `Table Editor` > `organizations`
3. Procurar por registro com `name = 'Teste Imobiliária'`
4. Verificar se slug foi gerado corretamente (`rendizy_teste_imobiliaria`)

### **Passo 9: Verificar Lista no Admin Master**
1. Voltar para `/admin`
2. Verificar se nova imobiliária aparece na lista
3. Verificar se dados estão corretos

---

## 🔍 DEBUG: O QUE VERIFICAR

### **Console do Navegador:**
```javascript
// Deve aparecer:
🚀 Enviando requisição para criar organização: {...}
📍 URL: https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/organizations
📥 Resposta recebida: 200 OK
✅ Resultado: {success: true, data: {...}}
```

### **Network Tab:**
- **Request URL:** `https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/organizations`
- **Method:** `POST`
- **Status:** `200` ou `201`
- **Request Headers:** `Authorization: Bearer ...`
- **Request Body:** `{name: "Teste Imobiliária", email: "...", ...}`

### **Backend Logs (Supabase):**
```
🚨 [DEBUG ORGANIZATIONS] === REQUISIÇÃO POST /organizations DETECTADA ===
🚨 [DEBUG ORGANIZATIONS] Path: /rendizy-server/make-server-67caf26a/organizations
🚨 [DEBUG ORGANIZATIONS] Method: POST
🚨 [DEBUG ORGANIZATIONS] Body: {"name":"Teste Imobiliária",...}
🚨 [createOrganization] === FUNÇÃO CHAMADA ===
📥 Recebendo requisição POST /organizations
```

---

## ❌ POSSÍVEIS ERROS E SOLUÇÕES

### **Erro 404: Route not found**
- **Causa:** Rota não registrada ou path incorreto
- **Solução:** Verificar `index.ts` linha 463
- **Verificar:** URL no frontend está exatamente igual à rota registrada

### **Erro 401: Unauthorized**
- **Causa:** Token inválido ou ausente
- **Solução:** Fazer login novamente
- **Verificar:** Token no `localStorage`

### **Erro 500: Internal Server Error**
- **Causa:** Erro no backend (SQL, validação, etc.)
- **Solução:** Verificar logs do Supabase
- **Verificar:** Função `createOrganization` em `routes-organizations.ts`

### **Requisição não chega ao servidor**
- **Causa:** Problema de rede ou Supabase offline
- **Solução:** Verificar conexão, verificar status do Supabase
- **Verificar:** Network tab mostra requisição?

---

## ✅ CHECKLIST FINAL

- [ ] Usuário está logado
- [ ] Token está no localStorage
- [ ] Backend está rodando (Supabase Edge Functions)
- [ ] URL no frontend está correta
- [ ] Rota está registrada no backend
- [ ] Formulário preenchido corretamente
- [ ] Requisição enviada (Network tab)
- [ ] Resposta recebida (200/201)
- [ ] Imobiliária criada no banco
- [ ] Imobiliária aparece na lista

---

**Última atualização:** 2025-11-30 21:45
