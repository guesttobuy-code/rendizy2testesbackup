# 🚀 DEPLOY MANUAL VIA DASHBOARD

**Versão:** V1.0.103.332  
**Data:** 2025-12-13  
**Método:** Deploy via Supabase Dashboard (SEM CLI)

---

## ⚡ SITUAÇÃO ATUAL

- ✅ Código local atualizado
- ✅ Function `anuncio-ultimate` deletada localmente
- ✅ Function `rendizy-server` consolidada (tem todas as rotas)
- ⏳ **PENDENTE:** Fazer deploy no Supabase

---

## 📋 OPÇÕES DE DEPLOY

### ❌ OPÇÃO 1: CLI (NÃO DISPONÍVEL)
Supabase CLI não pode ser instalado via npm global.  
Ignorar esta opção.

### ✅ OPÇÃO 2: DASHBOARD (RECOMENDADO)
Deploy direto pelo Supabase Dashboard web.

---

## 🎯 PASSO A PASSO - DEPLOY VIA DASHBOARD

### 1️⃣ **Acessar Edge Functions**
1. Abra: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions
2. Localize a function **`rendizy-server`**
3. Clique em **`rendizy-server`** para abrir os detalhes

### 2️⃣ **Deploy Nova Versão**
1. Clique no botão **"Deploy a new version"** (ou similar)
2. O Dashboard vai abrir um editor ou pedir para fazer upload

### 3️⃣ **Upload do Código**
Você tem duas opções:

**OPÇÃO A: Upload via ZIP**
1. Crie um ZIP da pasta:
   ```
   supabase/functions/rendizy-server/
   ```
2. Faça upload no Dashboard
3. Confirme o deploy

**OPÇÃO B: Editor Web (se disponível)**
1. Cole o código diretamente no editor web
2. Salve e faça deploy

### 4️⃣ **Verificar Deploy**
Após o deploy, você verá:
- Número do deployment (deve ser #418 ou superior)
- Status: "Active"
- Timestamp do deploy

---

## 🗑️ DELETAR FUNCTION OBSOLETA

### Passo 1: Localizar
1. Na lista de functions, encontre **`anuncio-ultimate`**
2. Ela deve mostrar "8 deployments"

### Passo 2: Deletar
1. Clique nos 3 pontinhos ⋮ ao lado
2. Selecione **"Delete function"**
3. Confirme: "Yes, delete this function"

### ⚠️ IMPORTANTE
Esta ação é **IRREVERSÍVEL**, mas está tudo bem porque:
- ✅ `rendizy-server` já tem todas as rotas
- ✅ Frontend já usa `rendizy-server` (não `anuncio-ultimate`)
- ✅ Código local já foi limpo

---

## 🧪 ALTERNATIVA: DEPLOY VIA GITHUB ACTIONS

Se o Dashboard não permitir deploy manual, você pode:

### 1. Fazer commit do código atualizado
```bash
git add .
git commit -m "feat: consolidar anuncio-ultimate em rendizy-server"
git push
```

### 2. Configurar GitHub Action (se não tiver)
Criar: `.github/workflows/deploy-functions.yml`

```yaml
name: Deploy Supabase Functions

on:
  push:
    branches:
      - main
    paths:
      - 'supabase/functions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest
      
      - name: Deploy Functions
        run: |
          supabase functions deploy rendizy-server --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

---

## ✅ VERIFICAÇÃO PÓS-DEPLOY

### 1. Verificar no Dashboard
- `rendizy-server`: deployment #418+
- `anuncio-ultimate`: DELETADA

### 2. Testar Endpoint
Abra o DevTools Console e execute:
```javascript
fetch('https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/anuncios-ultimate/9f6cad48-42e9-4ed5-b766-82127a62dce2', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
  }
})
.then(r => r.json())
.then(d => console.log('✅ Endpoint funcionando:', d))
```

### 3. Testar Frontend
1. Recarregue: http://localhost:3001/anuncios-ultimate/9f6cad48-42e9-4ed5-b766-82127a62dce2/edit
2. Verifique os logs no console:
   ```
   🔥 NovoAnuncio.tsx CARREGADO - V1.0.103.332
   ```
3. Edite título e tipo de local
4. Clique em **SALVAR AGORA!**
5. Aguarde o reload
6. Confirme que os dados foram salvos

---

## 📞 SE HOUVER PROBLEMAS

### Erro: "Function not found"
- ✅ Verifique se `rendizy-server` foi deployada
- ✅ Aguarde 1-2 minutos para propagação

### Erro: "CORS"
- ✅ `rendizy-server` já tem CORS configurado
- ✅ Limpe o cache do navegador (Ctrl+Shift+Delete)

### Erro: "save-field failed"
- ✅ Verifique se a RPC `save_anuncio_field` existe no banco
- ✅ Veja logs no Supabase Dashboard > Functions > Logs

---

## 🎯 STATUS ATUAL

| Item | Status |
|------|--------|
| Código local limpo | ✅ Concluído |
| Function obsoleta removida localmente | ✅ Concluído |
| Documentação criada | ✅ Concluído |
| Deploy do rendizy-server | ⏳ **VOCÊ PRECISA FAZER** |
| Deletar function no Dashboard | ⏳ **VOCÊ PRECISA FAZER** |
| Teste frontend | ⏳ Aguardando deploy |

---

## 💡 RESUMO PARA VOCÊ

**O que EU fiz:**
- ✅ Deletei a pasta `anuncio-ultimate` localmente
- ✅ Verifiquei que `rendizy-server` tem todas as rotas
- ✅ Criei documentação completa
- ✅ Corrigi o código do frontend (V1.0.103.332)

**O que VOCÊ precisa fazer:**
1. 🔵 Acessar: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions
2. 🔵 Fazer deploy do `rendizy-server` (se necessário)
3. 🔵 Deletar a function `anuncio-ultimate` (botão delete)
4. 🔵 Testar o frontend

---

**Criado em:** 2025-12-13 18:01  
**Por:** Claude (Copilot AI)  
**Próximo:** Deploy manual via Dashboard
