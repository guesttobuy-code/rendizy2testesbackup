# 🔍 Solução para Acessar Logs do Supabase via Terminal

**Data:** 2024-11-21  
**Status:** ✅ Diagnóstico completo realizado

---

## 📋 Resultados dos Testes

### **1. Versão do CLI**

```
Versão atual: 2.58.5
Versão latest: 2.58.5
```

**Conclusão:** Mesma versão, não há atualização disponível.

---

### **2. Comandos Disponíveis**

**Comandos principais:**
- ✅ `login`, `logout` - Autenticação
- ✅ `functions` - Gerenciar Edge Functions
- ✅ `projects` - Gerenciar projetos
- ✅ `db` - Gerenciar banco de dados
- ❌ `logs` - **NÃO EXISTE nesta versão**

**Subcomandos de functions:**
- ✅ `delete` - Deletar função
- ✅ `deploy` - Deploy de função
- ✅ `download` - Baixar função
- ✅ `list` - Listar funções
- ✅ `new` - Criar nova função
- ✅ `serve` - Servir funções localmente
- ❌ `logs` - **NÃO EXISTE**

---

### **3. Tentativa com Versão Latest**

```
Comando: npx supabase@latest logs --help
Resultado: "unknown command 'logs' for 'supabase'"
```

**Conclusão:** O comando `logs` não existe nem na versão latest (2.58.5).

---

## ✅ SOLUÇÕES DISPONÍVEIS

### **Opção 1: Dashboard do Supabase (Recomendado)**

🔗 **Link Direto:**
- **Logs Gerais:** https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/logs
- **Edge Functions:** https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions/rendizy-server/logs
- **Postgres Logs:** https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/logs/postgres
- **API Logs:** https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/logs/api
- **Auth Logs:** https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/logs/auth

**Vantagens:**
- ✅ Interface visual
- ✅ Filtros integrados
- ✅ Histórico completo
- ✅ Diferentes tipos de logs

---

### **Opção 2: API do Supabase (Via PowerShell)**

Criei o script `buscar-logs-supabase.ps1` que tenta buscar logs via API:

```powershell
.\buscar-logs-supabase.ps1
```

**Como usar:**
```powershell
# Com parâmetros opcionais
.\buscar-logs-supabase.ps1 -ProjectId "odcgnzfremrqnvtitpcc" -FunctionName "rendizy-server" -Limit 50
```

**Limitações:**
- ⚠️ Requer token de acesso
- ⚠️ Pode não funcionar dependendo do plano
- ⚠️ API pode não estar disponível para todos os tipos de logs

---

### **Opção 3: Logs Locais (Se Desenvolvendo Localmente)**

Se você estiver usando Supabase localmente:

```powershell
# Iniciar Supabase local
npx supabase start

# Servir funções localmente (mostra logs no terminal)
npx supabase functions serve

# Ver logs do Docker (se usando Docker)
docker logs supabase_db
docker logs supabase_api
docker logs supabase_functions
```

---

### **Opção 4: Abrir Dashboard Automaticamente**

Criei script para abrir o dashboard:

```powershell
# Abrir logs no navegador
Start-Process "https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/logs"
```

---

## 🔧 Scripts Criados

### **1. `buscar-logs-supabase.ps1`**

Tenta buscar logs via API do Supabase:

```powershell
.\buscar-logs-supabase.ps1
```

**Funcionalidades:**
- ✅ Carrega token do `.env.local`
- ✅ Tenta múltiplos endpoints da API
- ✅ Mostra logs formatados em JSON
- ✅ Fallback para dashboard se API falhar

---

## 📊 Comparação das Soluções

| Método | Terminal | Visual | Tempo Real | Fácil |
|--------|----------|--------|------------|-------|
| **Dashboard** | ❌ | ✅ | Manual (F5) | ✅✅✅ |
| **API (Script)** | ✅ | ❌ | Sim | ✅✅ |
| **Local (serve)** | ✅ | ❌ | Sim | ✅✅ |
| **CLI logs** | ✅ | ❌ | Sim | ❌ Não disponível |

---

## 🎯 RECOMENDAÇÃO FINAL

**Para uso imediato:**
1. Use o **Dashboard** do Supabase (link direto acima)
2. Ou execute o script: `.\buscar-logs-supabase.ps1`

**Para desenvolvimento local:**
1. Use `npx supabase functions serve` (mostra logs no terminal)

**Para automação:**
1. Use o script `buscar-logs-supabase.ps1`
2. Ou faça requisições diretas à API do Supabase

---

## 🆘 Se Nenhuma Opção Funcionar

**Última alternativa:**
1. Abra o Dashboard manualmente
2. Navegue para: Settings > Logs
3. Ou use o link direto: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/logs

---

## 📝 CONCLUSÃO

O comando `logs` **não existe** na versão 2.58.5 do Supabase CLI (nem na latest).

**Alternativas funcionais:**
- ✅ Dashboard do Supabase (mais completo)
- ✅ Script via API (para terminal)
- ✅ Logs locais (se desenvolvendo localmente)

**Próximos passos:**
- Use o Dashboard para logs em produção
- Use `supabase functions serve` para logs locais
- Use o script `buscar-logs-supabase.ps1` para terminal

---

**Última atualização:** 2024-11-21  
**Versão do CLI testada:** 2.58.5  
**Comando logs:** ❌ Não disponível nesta versão

