# 🔧 Resolver Erro 403 no Deploy

**Erro:** `unexpected deploy status 403: Your account does not have the necessary privileges`

---

## 🔍 **CAUSA**

O erro 403 indica que:
1. **Não está autenticado** no Supabase CLI
2. **Não tem permissões** no projeto
3. **Token de acesso expirado** ou inválido

---

## ✅ **SOLUÇÕES**

### **Opção 1: Autenticar no Supabase CLI**

```powershell
# Verificar se está autenticado
npx supabase login

# Se não estiver, fazer login
npx supabase login
```

**Ou usar token de acesso:**
```powershell
# Obter access token do Supabase Dashboard
# https://supabase.com/dashboard/account/tokens

# Configurar token
npx supabase link --project-ref odcgnzfremrqnvtitpcc
```

---

### **Opção 2: Verificar Projeto Linkado**

```powershell
# Verificar projeto atual
npx supabase status

# Se não estiver linkado, linkar projeto
npx supabase link --project-ref odcgnzfremrqnvtitpcc
```

---

### **Opção 3: Usar Access Token Diretamente**

1. **Obter Access Token:**
   - Acesse: https://supabase.com/dashboard/account/tokens
   - Crie um novo token (se não tiver)
   - Copie o token

2. **Configurar variável de ambiente:**
```powershell
$env:SUPABASE_ACCESS_TOKEN = "seu-token-aqui"
npx supabase functions deploy rendizy-server --no-verify-jwt
```

---

### **Opção 4: Verificar Permissões no Projeto**

1. Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/settings/team
2. Verifique se você tem permissão de **Owner** ou **Admin**
3. Se não tiver, peça para o owner do projeto adicionar você

---

### **Opção 5: Deploy Manual via Dashboard (Alternativa)**

Se o CLI não funcionar, você pode:
1. Acessar o código via Supabase Dashboard
2. Ou fazer deploy via Git (se o projeto estiver conectado ao Git)

---

## 🎯 **COMANDO RECOMENDADO**

```powershell
# 1. Fazer login
npx supabase login

# 2. Linkar projeto (se necessário)
npx supabase link --project-ref odcgnzfremrqnvtitpcc

# 3. Verificar status
npx supabase status

# 4. Fazer deploy
cd supabase/functions/rendizy-server
npx supabase functions deploy rendizy-server --no-verify-jwt
```

---

## 🔍 **DEBUG**

Se ainda não funcionar, execute com `--debug`:

```powershell
npx supabase functions deploy rendizy-server --no-verify-jwt --debug
```

Isso mostrará mais detalhes sobre o erro.

---

**STATUS:** 🔧 **AGUARDANDO AUTENTICAÇÃO NO SUPABASE CLI**

