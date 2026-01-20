# 🚀 Como Iniciar o Servidor Local do Rendizy

## 📋 Opções Disponíveis

### **Opção 1: Script Completo (Recomendado)**

Execute no PowerShell:

```powershell
cd "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL\RendizyPrincipal"
.\iniciar-localhost.ps1
```

### **Opção 2: Script Simplificado**

Execute no PowerShell:

```powershell
cd "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL"
.\iniciar-rendizy.ps1
```

### **Opção 3: Comandos Manuais**

Execute no PowerShell:

```powershell
# 1. Navegar para a pasta do projeto
cd "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL\RendizyPrincipal"

# 2. Instalar dependências (se necessário)
npm install

# 3. Iniciar servidor
npm run dev
```

---

## 📍 URL do Servidor

Após iniciar, o servidor estará disponível em:

**http://localhost:5173**

O navegador deve abrir automaticamente.

---

## ⚠️ Solução de Problemas

### **Erro: "Node.js não encontrado"**
- Instale o Node.js: https://nodejs.org/
- Reinicie o PowerShell após instalar

### **Erro: "npm não encontrado"**
- Verifique se o Node.js foi instalado corretamente
- Execute: `node --version` e `npm --version`

### **Erro: "Dependências não instaladas"**
- Execute: `npm install` na pasta `RendizyPrincipal`
- Aguarde a instalação completar

### **Porta 5173 já em uso**
- Feche outros processos usando a porta 5173
- Ou altere a porta no arquivo `vite.config.ts`

---

## ✅ Verificação Rápida

Para verificar se o servidor está rodando:

```powershell
# Verificar se a porta está em uso
Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue

# Ou acessar no navegador
Start-Process "http://localhost:5173"
```

---

**Última atualização:** 2025-01-28
