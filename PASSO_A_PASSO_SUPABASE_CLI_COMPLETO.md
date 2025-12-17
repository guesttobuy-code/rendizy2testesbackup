# 🚀 PASSO A PASSO COMPLETO - SUPABASE CLI

**Objetivo:** Configurar acesso total ao Supabase via CLI desde o início

**Data:** 25/11/2025

---

## 📋 PRÉ-REQUISITOS

1. ✅ Node.js instalado (v18 ou superior)
2. ✅ PowerShell ou Terminal
3. ✅ Acesso à conta Supabase (você está logado no preview)

---

## 🔧 PASSO 1: VERIFICAR INSTALAÇÃO DO SUPABASE CLI

```powershell
# Verificar se o Supabase CLI está disponível
npx supabase --version

# Se não estiver instalado, será baixado automaticamente ao usar npx
```

**Resultado esperado:**
```
supabase/2.x.x
```

---

## 🔐 PASSO 2: FAZER LOGIN NO SUPABASE CLI

### **OPÇÃO A: Login Interativo (RECOMENDADO - MAIS FÁCIL)**

```powershell
# Executar login interativo (abre navegador)
npx supabase login
```

**O que acontece:**
1. Abre o navegador automaticamente
2. Você faz login na sua conta Supabase
3. Autoriza o CLI a acessar sua conta
4. Retorna ao terminal com confirmação

**Resultado esperado:**
```
> Logged in as: seu-email@exemplo.com
```

### **OPÇÃO B: Login com Token (ALTERNATIVA)**

Se o login interativo não funcionar, use um token:

1. **Obter token:**
   - Acesse: https://supabase.com/dashboard/account/tokens
   - Clique em "Generate new token"
   - Copie o token (formato: `sbp_...`)

2. **Fazer login com token:**
```powershell
# Definir token como variável de ambiente
$env:SUPABASE_ACCESS_TOKEN = "sbp_SEU_TOKEN_AQUI"

# Fazer login
npx supabase login --token $env:SUPABASE_ACCESS_TOKEN
```

**⚠️ IMPORTANTE:**
- Token deve ter formato: `sbp_0102...1920` (40 caracteres após `sbp_`)
- Se o formato estiver errado, use login interativo

---

## 🔗 PASSO 3: VERIFICAR LOGIN E LISTAR PROJETOS

```powershell
# Listar todos os projetos da sua conta
npx supabase projects list
```

**Resultado esperado:**
```
   LINKED | ORG ID               | REFERENCE ID         | NAME             | REGION
  --------|----------------------|----------------------|------------------|---------------------------
     ●    | elluualthmrihaqpushs | odcgnzfremrqnvtitpcc | Rendizy2producao | South America (São Paulo)
```

**O que significa:**
- `●` = Projeto linkado (conectado)
- `REFERENCE ID` = ID do projeto (`odcgnzfremrqnvtitpcc`)
- `NAME` = Nome do projeto

---

## 🔗 PASSO 4: LINKAR O PROJETO (SE NÃO ESTIVER LINKADO)

```powershell
# Linkar projeto específico
npx supabase link --project-ref odcgnzfremrqnvtitpcc
```

**Resultado esperado:**
```
> Linked to project odcgnzfremrqnvtitpcc
```

**O que faz:**
- Cria arquivo `.supabase/config.toml` com configurações do projeto
- Permite executar comandos específicos do projeto

---

## ✅ PASSO 5: VERIFICAR STATUS DO PROJETO

```powershell
# Ver status completo do projeto
npx supabase status
```

**Resultado esperado:**
```
API URL: https://odcgnzfremrqnvtitpcc.supabase.co
DB URL: postgresql://postgres.odcgnzfremrqnvtitpcc:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
Studio URL: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc
```

---

## 🧪 PASSO 6: TESTAR COMANDOS BÁSICOS

### **6.1. Listar Migrations**

```powershell
# Ver migrations disponíveis
npx supabase migration list
```

### **6.2. Ver Schema do Banco**

```powershell
# Ver schema atual
npx supabase db dump --schema public
```

### **6.3. Executar SQL Diretamente**

```powershell
# Executar SQL via CLI (exemplo)
npx supabase db execute --sql "SELECT COUNT(*) FROM organizations;"
```

**⚠️ NOTA:** O comando `db execute` pode não estar disponível em todas as versões. Use o SQL Editor do Dashboard como alternativa.

---

## 🔍 PASSO 7: VERIFICAR CONFIGURAÇÃO COMPLETA

```powershell
# Verificar arquivo de configuração
Get-Content .supabase\config.toml

# Verificar se está linkado
npx supabase projects list
```

**Arquivo `.supabase/config.toml` deve conter:**
```toml
project_id = "Rendizy2producao"
[api]
enabled = true
port = 54321
# ... outras configurações
```

---

## 🚀 PASSO 8: COMANDOS ÚTEIS PARA USO DIÁRIO

### **Deploy de Edge Functions**

```powershell
# Deploy de uma função específica
npx supabase functions deploy rendizy-server

# Deploy de todas as funções
npx supabase functions deploy
```

### **Ver Logs (via Dashboard)**

Como o CLI pode não ter comando `logs`, use:
- Dashboard: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/logs
- Edge Functions: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions/rendizy-server/logs

### **Aplicar Migrations**

```powershell
# Aplicar todas as migrations pendentes
npx supabase db push

# Aplicar migrations específicas
npx supabase db push --include-all
```

---

## 📝 PASSO 9: SALVAR CONFIGURAÇÃO (OPCIONAL)

Criar script para facilitar uso futuro:

```powershell
# Criar arquivo: conectar-supabase.ps1
@"
# Conectar ao Supabase
Write-Host "🔗 Conectando ao Supabase..." -ForegroundColor Cyan

# Verificar login
npx supabase projects list

# Linkar projeto (se necessário)
npx supabase link --project-ref odcgnzfremrqnvtitpcc

Write-Host "✅ Conectado ao Supabase!" -ForegroundColor Green
"@ | Out-File -FilePath conectar-supabase.ps1 -Encoding UTF8
```

---

## ✅ CHECKLIST FINAL

- [ ] ✅ Supabase CLI instalado/verificado
- [ ] ✅ Login realizado com sucesso
- [ ] ✅ Projetos listados corretamente
- [ ] ✅ Projeto linkado (`odcgnzfremrqnvtitpcc`)
- [ ] ✅ Status verificado
- [ ] ✅ Comandos básicos testados

---

## 🆘 TROUBLESHOOTING

### **Erro: "Not logged in"**

**Solução:**
```powershell
# Fazer login novamente
npx supabase login
```

### **Erro: "Invalid access token format"**

**Solução:**
- Use login interativo: `npx supabase login`
- Não use token manual se o formato estiver errado

### **Erro: "Project not found"**

**Solução:**
```powershell
# Verificar se o Project ID está correto
npx supabase projects list

# Linkar novamente com o ID correto
npx supabase link --project-ref odcgnzfremrqnvtitpcc
```

### **Erro: "Command not found: db execute"**

**Solução:**
- Use o SQL Editor do Dashboard: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql/new
- Ou use `npx supabase db push` para aplicar migrations

---

## 📊 RESUMO DOS COMANDOS ESSENCIAIS

```powershell
# 1. Login
npx supabase login

# 2. Listar projetos
npx supabase projects list

# 3. Linkar projeto
npx supabase link --project-ref odcgnzfremrqnvtitpcc

# 4. Ver status
npx supabase status

# 5. Deploy Edge Functions
npx supabase functions deploy rendizy-server

# 6. Aplicar migrations
npx supabase db push
```

---

## 🎯 PRÓXIMOS PASSOS

Após configurar o CLI:

1. ✅ Testar deploy de Edge Functions
2. ✅ Aplicar migrations pendentes
3. ✅ Verificar logs do projeto
4. ✅ Testar conexão com banco de dados

---

**✅ Configuração completa! Agora você tem acesso total ao Supabase via CLI.**

