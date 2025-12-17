# 🔐 Como Autenticar e Fazer Deploy no Supabase

**Data:** 2025-11-30  
**Problema:** Erro 403 ao tentar fazer deploy

---

## 🎯 SOLUÇÃO: Autenticar e Linkar Projeto

### **Passo 1: Fazer Login no Supabase**

Execute no PowerShell:
```powershell
cd "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL\supabase"
npx supabase login
```

Isso abrirá o navegador para você fazer login na sua conta Supabase.

---

### **Passo 2: Linkar o Projeto**

Após login, linke o projeto usando o Project ID:

```powershell
cd "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL\supabase"
npx supabase link --project-ref odcgnzfremrqnvtitpcc
```

**Project ID:** `odcgnzfremrqnvtitpcc`

---

### **Passo 3: Fazer Deploy**

Após autenticar e linkar, faça o deploy:

```powershell
cd "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL\supabase"
npx supabase functions deploy rendizy-server --no-verify-jwt
```

---

## 🔍 VERIFICAR STATUS

### **Verificar se está autenticado:**

```powershell
npx supabase projects list
```

Se mostrar seus projetos, está autenticado.

---

### **Verificar se projeto está linkado:**

```powershell
cd "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL\supabase"
npx supabase status
```

---

## ⚠️ ALTERNATIVA: Deploy via Dashboard

Se o CLI continuar dando erro 403, você pode fazer deploy via Dashboard do Supabase:

1. Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc
2. Vá em **Edge Functions**
3. Selecione **rendizy-server**
4. Faça upload dos arquivos ou use o editor online

---

## 📋 COMANDOS RÁPIDOS

```powershell
# 1. Login
cd "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL\supabase"
npx supabase login

# 2. Linkar projeto
npx supabase link --project-ref odcgnzfremrqnvtitpcc

# 3. Deploy
npx supabase functions deploy rendizy-server --no-verify-jwt
```

---

**Última atualização:** 2025-11-30
