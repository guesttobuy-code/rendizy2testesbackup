# 🚀 DEPLOY PARA PRODUÇÃO - INTEGRAÇÃO STAYS.NET

**Data:** 22/11/2025  
**Status:** ✅ Pronto para Deploy

---

## 📋 FUNCIONALIDADES IMPLEMENTADAS

### **Backend (Supabase Edge Functions)**
- ✅ Configuração da API Stays.net (`/settings/staysnet`)
- ✅ Teste de conexão (`/staysnet/test`)
- ✅ Importação completa (`/staysnet/import/full`)
  - Hóspedes (`/booking/clients`)
  - Propriedades (`/content/listings`)
  - Reservas (01/01/2025 - 31/12/2026)
- ✅ Preview de reservas (`/staysnet/reservations/preview`)
- ✅ Mapeamento de campos (Stays.net → Rendizy)
- ✅ Salvamento no banco SQL

### **Frontend (React)**
- ✅ Interface de configuração
- ✅ Teste de conexão
- ✅ Preview de reservas
- ✅ Análise de reservas
- ✅ Ambiente de teste
- ⚠️ Interface de importação (pendente - pode ser feito via console)

---

## 🚀 COMO FAZER DEPLOY

### **Opção 1: Script Automatizado (Recomendado)**

```powershell
.\deploy-producao.ps1
```

### **Opção 2: Manual**

#### **1. Deploy Backend (Supabase)**

```bash
# Login (se necessário)
supabase login

# Link do projeto (se necessário)
supabase link --project-ref make-server-67caf26a

# Deploy da função
supabase functions deploy rendizy-server --project-ref make-server-67caf26a
```

#### **2. Deploy Frontend (GitHub/Vercel)**

```bash
# Commit e push
git add .
git commit -m "🚀 Deploy: Integração Stays.net completa"
git push
```

O Vercel fará o deploy automaticamente após o push.

---

## ✅ VERIFICAÇÕES PÓS-DEPLOY

### **1. Backend**
- [ ] Função `rendizy-server` deployada
- [ ] Endpoint `/staysnet/test` funcionando
- [ ] Endpoint `/staysnet/import/full` funcionando
- [ ] Logs sem erros

### **2. Frontend**
- [ ] Aplicação acessível em produção
- [ ] Login funcionando
- [ ] Tela de configuração Stays.net acessível
- [ ] Teste de conexão funcionando

### **3. Integração**
- [ ] Configuração salva corretamente
- [ ] Teste de conexão bem-sucedido
- [ ] Importação completa executável (via console ou interface)

---

## 🧪 TESTE EM PRODUÇÃO

### **1. Configurar Stays.net**

1. Acesse: **Configuração > Integrações > Stays.net**
2. Preencha:
   - **Base URL:** `https://bvm.stays.net/external/v1`
   - **API Key:** `a5146970`
   - **API Secret:** `bfcf4daf`
3. Salve

### **2. Testar Conexão**

1. Na mesma tela, clique em **Testar Conexão**
2. Deve mostrar "Conexão estabelecida com sucesso!"

### **3. Executar Importação**

**Via Console do Navegador:**

1. Abra DevTools (F12) > Console
2. Execute:

```javascript
(async function testStaysNetImport() {
  const token = localStorage.getItem('rendizy-token');
  const projectId = 'make-server-67caf26a';
  const url = `https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/staysnet/import/full`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': token,
      'apikey': '<REDACTED>'
    },
    body: JSON.stringify({ selectedPropertyIds: [] })
  });
  
  const result = await response.json();
  console.log('📊 Resultado:', result);
})();
```

---

## 🔍 POSSÍVEIS PROBLEMAS

### **Erro: "Supabase CLI not found"**
```bash
npm install -g supabase
```

### **Erro: "Not logged in"**
```bash
supabase login
```

### **Erro: "Project not linked"**
```bash
supabase link --project-ref make-server-67caf26a
```

### **Erro: "Function deploy failed"**
- Verificar logs: `supabase functions logs rendizy-server`
- Verificar se todas as dependências estão corretas
- Verificar se o código está sem erros de sintaxe

---

## 📝 CHECKLIST FINAL

- [ ] Backend deployado
- [ ] Frontend deployado
- [ ] Configuração Stays.net salva
- [ ] Teste de conexão bem-sucedido
- [ ] Importação completa executada
- [ ] Dados aparecem no sistema (hóspedes, propriedades, reservas)
- [ ] Reservas aparecem no calendário
- [ ] Nenhum erro nos logs

---

**Última atualização:** 22/11/2025  
**Status:** ✅ Pronto para deploy em produção


