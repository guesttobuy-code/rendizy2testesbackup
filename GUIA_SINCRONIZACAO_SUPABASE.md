# 🔄 Guia Completo: Sincronização Supabase com Cursor

Este guia mostra as **melhores formas** de manter seu código do Supabase Edge Functions sincronizado diretamente do Cursor, sem precisar fazer upload manual via interface web.

---

## 🎯 **Resumo Rápido**

### ✅ **MELHOR OPÇÃO: Supabase CLI** (Recomendado)
- ⚡ Deploy direto do terminal
- 🔄 Sincronização automática
- 🚀 Mais rápido e confiável
- 📝 Mantém histórico de deploys

### ⚙️ **OPÇÃO 2: Scripts PowerShell**
- 🔧 Deploy automatizado
- 📦 Gera ZIP e instruções
- 🖱️ Requer upload manual no dashboard

### 🌐 **OPÇÃO 3: GitHub Integration** (Futuro)
- 🔗 Sync automático via Git
- ⚠️ Requer configuração adicional

---

## 🚀 **OPÇÃO 1: Supabase CLI (RECOMENDADO)**

### 📋 **Pré-requisitos**

1. **Verificar Node.js** (necessário)
   ```powershell
   # Verificar se já tem Node.js
   node --version
   ```

2. **Supabase CLI via npx** (não precisa instalar!)
   ```powershell
   # O CLI funciona via npx, sem instalação global
   npx supabase --version
   ```

### 🔐 **Configuração Inicial (Uma vez só)**

1. **Login no Supabase**
   ```powershell
   npx supabase login
   ```
   - Isso abrirá seu navegador para autenticação
   - Você precisará fazer login com sua conta Supabase

2. **Linkar com seu projeto**
   ```powershell
   npx supabase link --project-ref odcgnzfremrqnvtitpcc
   ```
   - Isso conecta o CLI com seu projeto remoto
   - Precisa fazer apenas uma vez

### 🚀 **Deploy Rápido (Sempre que mudar o código)**

Depois de fazer alterações no código, simplesmente execute:

```powershell
npx supabase functions deploy rendizy-server
```

**Isso vai:**
- ✅ Fazer upload de todos os arquivos da pasta `supabase/functions/rendizy-server/`
- ✅ Fazer deploy automaticamente
- ✅ Mostrar logs em tempo real
- ✅ Confirmar quando o deploy terminar

### 📝 **Exemplo Completo de Workflow**

```powershell
# 1. Você edita um arquivo no Cursor
# Exemplo: supabase/functions/rendizy-server/index.ts

# 2. Salva o arquivo (Ctrl+S)

# 3. Deploy direto do terminal:
cd "c:\Users\rafae\Downloads\Rendizy2producao-main github 15 11 2025\Rendizy2producao-main"
npx supabase functions deploy rendizy-server

# 4. Aguarda (~30-60 segundos)
# ✅ Deployed function rendizy-server

# 5. Pronto! Código já está no Supabase
```

### 🎯 **Vantagens do Supabase CLI**

✅ **Rápido**: Deploy em 30-60 segundos  
✅ **Automático**: Detecta todos os arquivos automaticamente  
✅ **Confiável**: Menos erros que upload manual  
✅ **Logs**: Vê erros em tempo real  
✅ **Histórico**: Mantém versões anteriores  
✅ **Rollback**: Pode voltar versões se necessário

---

## ⚙️ **OPÇÃO 2: Script PowerShell Melhorado**

Criei um script que facilita o deploy via CLI:

### 📄 **Arquivo: `deploy-supabase-cli.ps1`**

```powershell
# Use este script:
.\deploy-supabase-cli.ps1
```

**O script faz:**
1. Verifica se Supabase CLI está instalado
2. Faz login (se necessário)
3. Linka com o projeto (se necessário)
4. Faz deploy da função
5. Testa se está funcionando

---

## 🔧 **OPÇÃO 3: Criar Script de Deploy Automatizado**

### 📝 **Script Personalizado para Cursor**

Posso criar um script que você pode chamar diretamente do terminal do Cursor:

```powershell
# Exemplo de uso:
deploy-backend
# ou
.\deploy-backend.ps1
```

**O script vai:**
- ✅ Verificar mudanças nos arquivos
- ✅ Fazer deploy apenas se necessário
- ✅ Testar automaticamente após deploy
- ✅ Mostrar status visual (✅ ou ❌)

---

## 🌐 **OPÇÃO 4: GitHub Integration (Futuro)**

O Supabase suporta integração com GitHub para deploy automático via Git.

### 📋 **Configuração**

1. Conectar repositório GitHub ao Supabase
2. Configurar webhook para deploy automático
3. Push no GitHub = Deploy automático no Supabase

### ⚠️ **Limitações**

- Requer repositório GitHub configurado
- Deploy só acontece após push no Git
- Pode levar mais tempo que CLI direto

---

## 🎯 **Recomendação Final**

### 🥇 **Para Desenvolvimento Diário:**
Use **Supabase CLI** (`npx supabase functions deploy rendizy-server`)

### 🥈 **Para Backup/Versionamento:**
Use **GitHub** + **Supabase CLI**

### 🥉 **Para Deploy Manual (fallback):**
Use **Dashboard do Supabase**

---

## 📚 **Comandos Úteis do Supabase CLI**

```powershell
# Ver status do projeto
npx supabase status

# Ver logs da função
npx supabase functions logs rendizy-server

# Listar funções deployadas
npx supabase functions list

# Deploy de uma função específica
npx supabase functions deploy rendizy-server

# Deploy com verbose (mais detalhes)
npx supabase functions deploy rendizy-server --debug

# Ver versões anteriores
npx supabase functions list rendizy-server
```

---

## 🔍 **Troubleshooting**

### ❌ **Erro: "command not found: supabase"**
```powershell
# Use npx (não precisa instalar globalmente)
npx supabase --version
```

### ❌ **Erro: "not logged in"**
```powershell
# Fazer login novamente
npx supabase login
```

### ❌ **Erro: "project not linked"**
```powershell
# Linkar projeto
npx supabase link --project-ref odcgnzfremrqnvtitpcc
```

### ❌ **Erro: "Module not found"**
- Verificar se todos os arquivos estão na pasta `supabase/functions/rendizy-server/`
- Verificar imports no `index.ts`

---

## ✅ **Próximos Passos**

1. **Verificar Node.js** (já tem: v25.0.0 ✅)
2. **Configurar login e link** (uma vez só via `npx supabase`)
3. **Testar deploy** com `npx supabase functions deploy rendizy-server`
4. **Usar o script** `.\deploy-supabase-cli.ps1` para automatizar tudo

---

**🎉 Com o Supabase CLI, você tem sincronização quase em tempo real entre Cursor e Supabase!**

