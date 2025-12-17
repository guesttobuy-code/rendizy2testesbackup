# 🔗 Conectar ao GitHub - MIGGRO

## ✅ Git Inicializado Localmente!

O repositório Git foi inicializado e o primeiro commit foi feito.

---

## 📋 Próximos Passos

### 1. Criar Repositório no GitHub

1. **Acesse:** https://github.com/new
2. **Nome:** `miggro` (ou outro nome de sua escolha)
3. **Descrição:** "MIGGRO - Comunidade de Apoio ao Imigrante"
4. **Visibilidade:** Público ou Privado
5. **NÃO** marque "Add a README file"
6. **Clique em "Create repository"**

### 2. Conectar ao Repositório

Após criar o repositório, GitHub mostrará comandos. Execute:

```powershell
cd "C:\Users\rafae\OneDrive\Documentos\MIGGRO"

# Adicionar remote (substitua SEU_USUARIO pelo seu username do GitHub)
git remote add origin https://github.com/SEU_USUARIO/miggro.git

# Ou se preferir SSH:
# git remote add origin git@github.com:SEU_USUARIO/miggro.git

# Verificar
git remote -v
```

### 3. Fazer Push

```powershell
git push -u origin main
```

Se pedir autenticação:

- Use **Personal Access Token** (não senha)
- Ou configure SSH keys

---

## 🚀 Depois do Push - Deploy no Vercel

### Passo a Passo Rápido:

1. **Acesse:** https://vercel.com
2. **Login** com GitHub
3. **"Add New Project"**
4. **Import** repositório `miggro`
5. **Configurar Environment Variables:**
   ```
   VITE_SUPABASE_URL=https://gjphsheavnkdtmsrxmtl.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqcGhzaGVhdm5rZHRtc3J4bXRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyODE1NzMsImV4cCI6MjA3OTg1NzU3M30.GH8_htMszSrylCd6rMXNXioZUKNE303T6QeTBrevAbs
   ```
6. **Deploy!**

---

## ✅ O Que Já Está Pronto

- ✅ Git inicializado
- ✅ Commit inicial feito
- ✅ `.gitignore` configurado
- ✅ `vercel.json` criado
- ✅ Build configurado
- ⏳ Apenas falta conectar ao GitHub e fazer push

---

## 📝 Comandos Rápidos

```powershell
# Ver status
git status

# Ver remote
git remote -v

# Adicionar remote (após criar no GitHub)
git remote add origin https://github.com/SEU_USUARIO/miggro.git

# Push
git push -u origin main
```

---

**🎯 Crie o repositório no GitHub e me diga a URL para eu ajudar a conectar!**
