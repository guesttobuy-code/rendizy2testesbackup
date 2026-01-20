# 🚀 Como Fazer Upload para o GitHub

## 📋 Pré-requisitos

1. **Conta no GitHub:** https://github.com/signup
2. **Git instalado:** https://git-scm.com/downloads
3. **Projeto pronto** (você já tem!)

---

## 🎯 Passo a Passo

### **1️⃣ Inicializar Git no Projeto**

Abra o PowerShell na pasta do projeto e execute:

```powershell
cd "D:\Projetos\Rendizy - Figma\Rendizy2"

# Inicializar repositório Git
git init

# Adicionar todos os arquivos
git add .

# Fazer primeiro commit
git commit -m "Initial commit: Rendizy Production v1.0.103"
```

---

### **2️⃣ Criar Repositório no GitHub**

1. Acesse: https://github.com/new

2. Preencha:
   - **Repository name:** `rendizy-production` (ou o nome que preferir)
   - **Description:** `Rendizy - Sistema de Gestão de Imóveis e Reservas`
   - **Visibility:** 
     - ✅ **Private** (recomendado - código privado)
     - ⚠️ **Public** (código visível para todos)
   - **NÃO marque:** "Add a README file" (já temos arquivos)
   - **NÃO marque:** "Add .gitignore" (já criamos)
   - **NÃO marque:** "Choose a license"

3. Clique em **"Create repository"**

4. **Copie a URL** que aparece (exemplo):
   ```
   https://github.com/seu-usuario/rendizy-production.git
   ```

---

### **3️⃣ Conectar ao GitHub e Fazer Upload**

Volte ao PowerShell e execute:

```powershell
# Adicionar repositório remoto (SUBSTITUA pela sua URL)
git remote add origin https://github.com/SEU-USUARIO/rendizy-production.git

# Renomear branch principal para 'main' (padrão GitHub)
git branch -M main

# Fazer upload
git push -u origin main
```

**Se pedir login:**
- **Username:** Seu usuário do GitHub
- **Password:** Use um **Personal Access Token** (não a senha normal)

---

### **4️⃣ Criar Personal Access Token (se necessário)**

Se o Git pedir senha, você precisa criar um token:

1. Acesse: https://github.com/settings/tokens

2. Clique em **"Generate new token"** → **"Generate new token (classic)"**

3. Preencha:
   - **Note:** `Rendizy Upload`
   - **Expiration:** `90 days` (ou o que preferir)
   - **Scopes:** Marque `repo` (tudo)

4. Clique em **"Generate token"**

5. **COPIE O TOKEN** (você não verá novamente!)

6. Use o token como senha quando o Git pedir

---

## 🔄 Comandos para Atualizações Futuras

Depois do primeiro upload, para atualizar o GitHub:

```powershell
# Ver status das mudanças
git status

# Adicionar arquivos modificados
git add .

# Fazer commit
git commit -m "Descrição das mudanças"

# Fazer upload
git push
```

---

## 📝 Exemplo Completo (Copiar e Colar)

```powershell
# 1. Navegar até o projeto
cd "D:\Projetos\Rendizy - Figma\Rendizy2"

# 2. Inicializar Git
git init

# 3. Adicionar arquivos
git add .

# 4. Primeiro commit
git commit -m "Initial commit: Rendizy Production v1.0.103"

# 5. Adicionar repositório remoto (SUBSTITUA pela sua URL do GitHub)
git remote add origin https://github.com/SEU-USUARIO/rendizy-production.git

# 6. Renomear branch
git branch -M main

# 7. Fazer upload
git push -u origin main
```

---

## ⚠️ Arquivos que NÃO serão enviados

O `.gitignore` já está configurado para **NÃO enviar**:

- ❌ `node_modules/` (dependências - muito pesado)
- ❌ `.env` (variáveis de ambiente - segredo!)
- ❌ `build/`, `dist/` (arquivos compilados)
- ❌ `.vite/` (cache)
- ❌ Logs e arquivos temporários

**✅ Serão enviados:**
- ✅ Código-fonte (`src/`)
- ✅ Configurações (`package.json`, `vite.config.ts`)
- ✅ Documentação (`*.md`)
- ✅ SQL migrations (`supabase/migrations/`)

---

## 🆘 Problemas Comuns

### **Erro: "fatal: not a git repository"**
```powershell
# Execute primeiro:
git init
```

### **Erro: "remote origin already exists"**
```powershell
# Remover e adicionar novamente:
git remote remove origin
git remote add origin https://github.com/SEU-USUARIO/rendizy-production.git
```

### **Erro: "Authentication failed"**
- Use **Personal Access Token** ao invés de senha
- Veja passo 4 acima

### **Erro: "large files"**
```powershell
# Se tiver arquivos muito grandes, remova do commit:
git rm --cached arquivo-grande.zip
git commit -m "Remove large file"
```

---

## ✅ Verificar se Funcionou

1. Acesse seu repositório no GitHub:
   ```
   https://github.com/SEU-USUARIO/rendizy-production
   ```

2. Você deve ver:
   - ✅ Todos os arquivos do projeto
   - ✅ README.md
   - ✅ Estrutura de pastas completa

---

## 📚 Próximos Passos

Após fazer upload:

1. ✅ **Proteja informações sensíveis:**
   - Nunca commite `.env` com credenciais reais
   - Use variáveis de ambiente no Supabase

2. ✅ **Adicione README:**
   - Descreva o projeto
   - Como instalar e rodar
   - Como fazer deploy

3. ✅ **Configure GitHub Actions (opcional):**
   - Deploy automático
   - Testes automatizados

---

**🎉 Pronto! Seu código está no GitHub!**

