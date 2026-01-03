# ⚡ INÍCIO RÁPIDO - Rendizy

> **Para:** Desenvolvedores que já têm ambiente configurado  
> **Tempo:** 5 minutos

---

## 🎯 PRÉ-REQUISITOS

✅ Node.js 18+ instalado  
✅ Git instalado  
✅ VS Code (recomendado)  
✅ Credenciais Supabase configuradas

---

## 🚀 INICIAR EM 5 PASSOS

### **1️⃣ Navegar para Pasta**
```powershell
cd "c:\Users\rafae\OneDrive\Desktop\Rendizyoficial-main arquivos mais atualizado do github 09 12 2025\Rendizyoficial-main"
```

### **2️⃣ Verificar Dependências**
```powershell
# Se é primeira vez ou houve mudanças
npm install
```

### **3️⃣ Iniciar Servidor Dev**
```powershell
npm run dev
```

### **4️⃣ Abrir Navegador**
```
http://localhost:3001
```

### **5️⃣ Login no Sistema**
```
Email: [seu email cadastrado]
Senha: [sua senha]
```

**Pronto!** 🎉 Sistema rodando localmente.

---

## 🔧 COMANDOS ÚTEIS

### **Backend (Supabase)**
```powershell
# Ver logs em tempo real
npx supabase functions logs rendizy-server --tail

# Deploy de mudanças
npx supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc
```

### **Frontend**
```powershell
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

### **Git**
```powershell
# (Política do projeto) Trabalhar SOMENTE no branch main
git checkout main

# Atualizar main (use o remote correto: normalmente `testes` ou `origin`)
git pull <remote> main

# Commit com padrão
git commit -m "feat(modulo): descrição"

# Push
git push <remote> main
```

---

## 🐛 PROBLEMAS COMUNS

### **Porta 3001 já está em uso**
```powershell
# Encontrar processo
netstat -ano | findstr :3001

# Matar processo (substitua PID)
taskkill /PID [PID] /F
```

### **Erro de dependências**
```powershell
# Limpar e reinstalar
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json
npm install
```

### **Supabase não conecta**
```powershell
# Verificar .env.local
cat .env.local

# Deve ter:
# VITE_SUPABASE_URL=https://odcgnzfremrqnvtitpcc.supabase.co
# VITE_SUPABASE_ANON_KEY=[sua key]
```

---

## 📚 DOCUMENTAÇÃO COMPLETA

Para setup completo de ambiente, veja:
- [SETUP_COMPLETO.md](SETUP_COMPLETO.md) - Setup detalhado
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Solução de problemas
- [AMBIENTE_LOCAL.md](AMBIENTE_LOCAL.md) - Configuração de ambiente

---

**Última Atualização:** 2024-12-19  
**Tempo de Leitura:** 5 minutos
