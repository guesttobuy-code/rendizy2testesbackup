# 🔐 Acessos Configurados

**Data:** 2024-11-21  
**Status:** ✅ Configuração de acessos organizada

---

## 📦 Supabase CLI

### **Status Atual:**
- ✅ CLI disponível via `npx supabase` (v2.58.5)
- ⚠️ Login necessário para acessar logs e projetos

### **Como Fazer Login:**

#### **Opção 1: Com Token (Recomendado)**
```powershell
# Se você tem o token do Supabase
npx supabase login --token SEU_TOKEN_AQUI
```

#### **Opção 2: Login Interativo**
```powershell
# Abre navegador para autenticação
npx supabase login
```

#### **Opção 3: Usar Script Automático**
```powershell
.\configurar-acessos.ps1
```

### **Verificar Status:**
```powershell
# Listar projetos
npx supabase projects list

# Linkar com projeto específico
npx supabase link --project-ref odcgnzfremrqnvtitpcc

# Verificar status
npx supabase status
```

### **Obter Token do Supabase:**
1. Acesse: https://supabase.com/dashboard/account/tokens
2. Clique em "Generate new token"
3. Dê um nome (ex: "Rendizy CLI")
4. Copie o token gerado

---

## 🐙 GitHub

### **Status Atual:**
- ✅ Repositório configurado: `https://github.com/suacasarendemais-png/Rendizy2producao.git`
- ⚠️ Autenticação necessária para push

### **Como Configurar Autenticação:**

#### **Opção 1: Personal Access Token (Recomendado)**
```powershell
# 1. Criar token em: https://github.com/settings/tokens
#    - Marque scope: repo (tudo)
#    - Copie o token

# 2. Configurar URL com token
$env:GITHUB_TOKEN = "SEU_TOKEN_AQUI"
git remote set-url origin "https://$env:GITHUB_TOKEN@github.com/suacasarendemais-png/Rendizy2producao.git"

# 3. Testar
git push
```

#### **Opção 2: Credential Helper (Windows)**
```powershell
# Configurar helper
git config --global credential.helper manager-core

# No primeiro push, o Windows vai pedir credenciais
# Use: username = seu-usuario
#      password = SEU_TOKEN (não sua senha!)
```

#### **Opção 3: GitHub CLI**
```powershell
# Instalar GitHub CLI
winget install GitHub.cli

# Fazer login
gh auth login

# Git vai usar autenticação do gh automaticamente
git push
```

### **Obter Token do GitHub:**
1. Acesse: https://github.com/settings/tokens
2. Clique em "Generate new token (classic)"
3. Dê um nome: "Rendizy Push"
4. Selecione escopo: `repo` (acesso completo)
5. Clique em "Generate token"
6. **COPIE O TOKEN** (só aparece uma vez!)

---

## 🔒 Armazenar Tokens com Segurança

### **Recomendação: Variáveis de Ambiente (PowerShell)**

#### **Opção 1: Por Sessão (Temporário)**
```powershell
$env:SUPABASE_ACCESS_TOKEN = "seu-token-supabase"
$env:GITHUB_TOKEN = "seu-token-github"
```

#### **Opção 2: Permanente (User)**
```powershell
# Adicionar ao perfil do PowerShell
[Environment]::SetEnvironmentVariable("SUPABASE_ACCESS_TOKEN", "seu-token", "User")
[Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "seu-token", "User")

# Reiniciar PowerShell ou recarregar:
$env:SUPABASE_ACCESS_TOKEN = [Environment]::GetEnvironmentVariable("SUPABASE_ACCESS_TOKEN", "User")
$env:GITHUB_TOKEN = [Environment]::GetEnvironmentVariable("GITHUB_TOKEN", "User")
```

#### **Opção 3: Arquivo .env.local (Não Versionado)**
Crie arquivo `.env.local` na raiz do projeto:
```env
SUPABASE_ACCESS_TOKEN=seu-token-supabase
GITHUB_TOKEN=seu-token-github
```

⚠️ **IMPORTANTE:** Adicione `.env.local` ao `.gitignore`:
```powershell
echo ".env.local" >> .gitignore
```

---

## 🧪 Testar Acessos

### **Testar Supabase:**
```powershell
# Verificar login
npx supabase projects list

# Linkar projeto (se necessário)
npx supabase link --project-ref odcgnzfremrqnvtitpcc
```

### **Testar GitHub:**
```powershell
# Verificar remote
git remote -v

# Testar conexão (fetch sem baixar)
git ls-remote --heads origin main

# Fazer push de teste (se houver mudanças)
git push
```

---

## 🚀 Uso Rápido

### **Supabase CLI:**
```powershell
# Login (com token)
npx supabase login --token $env:SUPABASE_ACCESS_TOKEN

# Linkar projeto
npx supabase link --project-ref odcgnzfremrqnvtitpcc

# Ver logs (se comando disponível na versão)
# Nota: v2.58.5 pode não ter comando logs
# Use Dashboard: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/logs
```

### **Git/GitHub:**
```powershell
# Configurar token (uma vez)
$env:GITHUB_TOKEN = "seu-token"
git remote set-url origin "https://$env:GITHUB_TOKEN@github.com/suacasarendemais-png/Rendizy2producao.git"

# Usar normalmente
git add .
git commit -m "Sua mensagem"
git push
```

---

## 📋 Checklist de Configuração

- [ ] Token do Supabase obtido
- [ ] Login no Supabase CLI feito (`npx supabase login`)
- [ ] Projeto linkado (`npx supabase link`)
- [ ] Token do GitHub obtido
- [ ] Git configurado para usar token
- [ ] Teste de conexão GitHub OK (`git ls-remote`)
- [ ] Teste de push OK (`git push`)

---

## 🆘 Problemas Comuns

### **Erro: "unauthorized" no Supabase**
- ✅ Verificar token está correto
- ✅ Fazer login novamente: `npx supabase login --token SEU_TOKEN`

### **Erro: "authentication failed" no GitHub**
- ✅ Verificar token tem escopo `repo`
- ✅ Verificar URL do remote está correta
- ✅ Tentar usar credential helper: `git config --global credential.helper manager-core`

### **Erro: "command not found: logs"**
- ✅ Versão 2.58.5 do CLI pode não ter comando `logs`
- ✅ Use Dashboard para ver logs: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/logs

---

## 📝 Notas

1. **Tokens são sensíveis** - nunca commite tokens no Git
2. **Tokens expiram** - verifique validade periodicamente
3. **Use variáveis de ambiente** - mais seguro que hardcoded
4. **Dashboard é mais fácil** - para ver logs, use o Dashboard do Supabase

---

**Última atualização:** 2024-11-21  
**Script de automação:** `configurar-acessos.ps1`

