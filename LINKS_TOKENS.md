# 🔗 Links para Obter Tokens

**Data:** 2024-11-21

---

## 🐙 GitHub - Personal Access Token (Classic)

### **Link Direto:**
🔗 **https://github.com/settings/tokens/new**

### **Ou navegue:**
1. Acesse: https://github.com/settings/tokens
2. Clique em **"Generate new token"** → **"Generate new token (classic)"**
3. Ou acesse diretamente: https://github.com/settings/tokens/new

### **Passo a Passo:**

1. **Acesse o link acima**
2. **Preencha:**
   - **Note:** `Rendizy Push` (ou nome de sua preferência)
   - **Expiration:** Escolha (recomendo `90 days` ou `No expiration`)
   - **Scopes:** Marque:
     - ✅ `repo` (acesso completo a repositórios)
       - Isso inclui: repo:status, repo_deployment, public_repo, repo:invite, security_events
3. **Clique em "Generate token"** (rolar para baixo)
4. **COPIE O TOKEN** (só aparece uma vez!)
5. **Guarde em local seguro**

### **Uso do Token:**

```powershell
# Configurar token como variável de ambiente
$env:GITHUB_TOKEN = "SEU_TOKEN_AQUI"

# Configurar remote do Git com token
git remote set-url origin "https://$env:GITHUB_TOKEN@github.com/suacasarendemais-png/Rendizy2producao.git"

# Ou usar no push diretamente
git push https://SEU_TOKEN@github.com/suacasarendemais-png/Rendizy2producao.git
```

---

## 📦 Supabase - Access Token

### **Link Direto:**
🔗 **https://supabase.com/dashboard/account/tokens**

### **Ou navegue:**
1. Acesse: https://supabase.com/dashboard
2. Clique no seu **avatar/perfil** (canto superior direito)
3. Vá em **"Account Settings"**
4. Aba **"Access Tokens"**
5. Clique em **"Generate new token"**

### **Passo a Passo:**

1. **Acesse o link acima**
2. **Preencha:**
   - **Name:** `Rendizy CLI` (ou nome de sua preferência)
   - **Expires in:** Escolha (recomendo `Never` para desenvolvimento)
3. **Clique em "Generate token"**
4. **COPIE O TOKEN** (só aparece uma vez!)
5. **Guarde em local seguro**

### **Uso do Token:**

```powershell
# Configurar token como variável de ambiente
$env:SUPABASE_ACCESS_TOKEN = "SEU_TOKEN_AQUI"

# Fazer login no Supabase CLI
npx supabase login --token $env:SUPABASE_ACCESS_TOKEN

# Verificar login
npx supabase projects list
```

---

## 📝 Resumo dos Links

| Serviço | Tipo de Token | Link |
|---------|---------------|------|
| **GitHub** | Personal Access Token (Classic) | https://github.com/settings/tokens/new |
| **Supabase** | Access Token | https://supabase.com/dashboard/account/tokens |

---

## ⚠️ Importante

1. **Tokens são sensíveis** - Nunca commite tokens no Git
2. **Tokens só aparecem uma vez** - Copie imediatamente
3. **Guarde em local seguro** - Use variáveis de ambiente ou arquivo `.env.local` (não versionado)
4. **Expiração** - Verifique periodicamente se os tokens ainda são válidos

---

## 🔒 Segurança

### **Recomendação: Variáveis de Ambiente**

```powershell
# Por sessão (temporário)
$env:GITHUB_TOKEN = "seu-token"
$env:SUPABASE_ACCESS_TOKEN = "seu-token"

# Permanente (User)
[Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "seu-token", "User")
[Environment]::SetEnvironmentVariable("SUPABASE_ACCESS_TOKEN", "seu-token", "User")
```

### **Ou arquivo .env.local (não versionado)**

Crie `.env.local` na raiz do projeto:
```env
GITHUB_TOKEN=seu-token-github
SUPABASE_ACCESS_TOKEN=seu-token-supabase
```

⚠️ **IMPORTANTE:** Certifique-se que `.env.local` está no `.gitignore`!

---

**Última atualização:** 2024-11-21

