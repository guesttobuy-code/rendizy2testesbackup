# 📦 GUIA: Deploy Backend no Supabase

**Data:** 17/11/2025  
**Versão:** 1.0.103.400

---

## 📂 PASTA PARA DEPLOY

### **Pasta Completa:**
```
supabase/functions/rendizy-server/
```

### **Explicação:**
- A Supabase Edge Function espera a pasta `rendizy-server` completa
- Nome da função: `rendizy-server` (deve ser igual ao nome da pasta)
- Todos os arquivos `.ts` e pastas dentro de `rendizy-server/` devem ser incluídos

---

## 🚀 COMO FAZER DEPLOY

### **Opção 1: Via Dashboard do Supabase (Mais Fácil)**

1. Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions

2. Clique em **Deploy a new function** ou selecione `rendizy-server` existente

3. Se for função nova:
   - **Name:** `rendizy-server`
   - **Method:** Import from local project

4. **Faça upload da pasta COMPLETA:**
   ```
   supabase/functions/rendizy-server/
   ```
   
   ⚠️ **IMPORTANTE:** Você deve fazer upload da PASTA `rendizy-server/` inteira, não apenas do conteúdo.

5. Clique em **Deploy**

6. Aguarde 1-2 minutos até o deploy finalizar

---

### **Opção 2: Via Supabase CLI (Recomendado para Automação)**

```bash
# 1. Instalar Supabase CLI (se não tiver)
npm install -g supabase

# 2. Login
supabase login

# 3. Link com o projeto
supabase link --project-ref odcgnzfremrqnvtitpcc

# 4. Deploy (na raiz do projeto)
supabase functions deploy rendizy-server
```

---

### **Opção 3: ZIP do Backend (Usando Script)**

Se você extraiu o ZIP completo e quer fazer deploy apenas do backend:

1. **No ZIP extraído, pegue a pasta:**
   ```
   supabase/functions/rendizy-server/
   ```

2. **Crie um ZIP apenas dessa pasta:**
   ```powershell
   # Execute o script:
   .\criar-zip-backend.ps1
   ```

3. **No Supabase Dashboard:**
   - Vá em **Functions** → `rendizy-server` (ou Deploy new)
   - Selecione **Upload ZIP**
   - Faça upload do ZIP gerado em `Downloads/`

---

## 📋 ESTRUTURA DA PASTA `rendizy-server/`

```
rendizy-server/
├── index.ts                    ✅ Obrigatório (entry point)
├── types.ts                    ✅ Obrigatório (tipos TypeScript)
├── kv_store.tsx               ✅ Obrigatório (cliente Supabase)
├── utils.ts                    ✅ Obrigatório (helpers)
├── utils-*.ts                  ✅ Helpers específicos (property, listing, etc.)
├── routes-*.ts                 ✅ Todas as rotas
├── evolution-credentials.ts    ✅ Credenciais Evolution API
└── routes/                     ✅ Pasta de rotas (se existir)
```

**Todos esses arquivos devem estar no deploy!**

---

## ✅ VERIFICAÇÃO PÓS-DEPLOY

### **Teste 1: Health Check**

```bash
curl https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-17T...",
  "service": "Rendizy Backend API"
}
```

### **Teste 2: Listar Properties**

```bash
curl -X GET \
  "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/properties" \
  -H "Authorization: Bearer {SEU_TOKEN}"
```

---

## 🔍 TROUBLESHOOTING

### **Erro: "404 Not Found"**
- ✅ Verifique se o nome da função é exatamente `rendizy-server`
- ✅ Verifique se todos os arquivos foram incluídos no upload

### **Erro: "Module not found"**
- ✅ Verifique se todos os arquivos `.ts` estão na pasta
- ✅ Verifique se não há imports faltando

### **Erro: "Function timeout"**
- ✅ Verifique se não há loops infinitos
- ✅ Verifique logs na aba **Logs** do Supabase Dashboard

---

## 📝 RESUMO RÁPIDO

**Pasta para deploy:** `supabase/functions/rendizy-server/`

**Conteúdo:**
- ✅ Todos os arquivos `.ts` dentro da pasta
- ✅ Todas as subpastas (ex: `routes/`)
- ✅ Todos os arquivos necessários (types.ts, utils.ts, etc.)

**Não incluir:**
- ❌ `node_modules/` (já é instalado pelo Supabase)
- ❌ `.git/` (não necessário)
- ❌ Arquivos de documentação `.md` (opcional, mas não necessário)

---

**Última atualização:** 17/11/2025

