# 🔐 GUIA RÁPIDO - Configurar Acessos

## 📋 Scripts Criados

1. **`configurar-acessos.ps1`** - Configura tudo de uma vez
2. **`login-supabase.ps1`** - Apenas login no Supabase CLI
3. **`login-github.ps1`** - Apenas login no GitHub

---

## 🚀 COMO USAR

### **Opção 1: Configurar Tudo (Recomendado)**

```powershell
.\configurar-acessos.ps1
```

O script vai perguntar os tokens e configurar tudo automaticamente.

---

### **Opção 2: Configurar Separadamente**

#### **1. Login no Supabase CLI**

```powershell
# Com token (recomendado)
.\login-supabase.ps1 -Token "seu_token_supabase_aqui"

# Ou interativo (perguntará o token)
.\login-supabase.ps1
```

**Onde obter o token do Supabase:**
- Acesse: https://supabase.com/dashboard/account/tokens
- Crie um novo token de acesso
- Copie e use no comando acima

#### **2. Login no GitHub**

```powershell
# Com token (recomendado)
.\login-github.ps1 -Token "seu_token_github_aqui"

# Ou interativo (perguntará o token)
.\login-github.ps1
```

**Onde obter o token do GitHub:**
- Acesse: https://github.com/settings/tokens
- Crie um novo token (fine-grained ou classic)
- Permissões necessárias:
  - `repo` (acesso ao repositório)
  - `workflow` (se usar GitHub Actions)
- Copie e use no comando acima

---

## ✅ VERIFICAR SE ESTÁ CONFIGURADO

### **Supabase CLI:**
```powershell
npx supabase projects list
```

Se mostrar seus projetos, está logado! ✅

### **GitHub:**
```powershell
git remote -v
git ls-remote origin
```

Se funcionar sem pedir senha, está configurado! ✅

---

## 🔧 TROUBLESHOOTING

### **Erro: "not authenticated" no Supabase**
```powershell
# Fazer login novamente
.\login-supabase.ps1 -Token "seu_token"
```

### **Erro: "authentication failed" no GitHub**
```powershell
# Verificar token
.\login-github.ps1 -Token "seu_token"

# Ou configurar manualmente
git remote set-url origin https://SEU_TOKEN@github.com/USER/REPO.git
```

### **Token não está sendo salvo**
Os tokens são salvos:
- **Supabase:** No arquivo de configuração do CLI (automático)
- **GitHub:** Via helper de credenciais do Git (configurado no script)

Para salvar permanentemente no Windows, adicione ao seu perfil PowerShell:
```powershell
# Editar: C:\Users\SeuUsuario\Documents\PowerShell\Microsoft.PowerShell_profile.ps1
$env:GH_TOKEN = "seu_token_github"
```

---

## 📝 PRÓXIMOS PASSOS

Após configurar os acessos:

1. **Testar Supabase:**
   ```powershell
   npx supabase projects list
   npx supabase link --project-ref odcgnzfremrqnvtitpcc
   ```

2. **Testar GitHub:**
   ```powershell
   git push origin main
   ```

3. **Ver logs do Supabase:**
   - Via Dashboard: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/logs
   - Via CLI: (quando disponível na versão mais recente)

---

## 🔒 SEGURANÇA

⚠️ **NUNCA** commite tokens no Git!

- Tokens são salvos localmente
- Não aparecem no histórico do Git
- Use `.gitignore` para arquivos sensíveis

---

**Pronto! Agora você pode usar Supabase CLI e GitHub com autenticação via token!** 🎉

