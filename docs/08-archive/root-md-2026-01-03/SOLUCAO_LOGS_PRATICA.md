# ✅ SOLUÇÃO PRÁTICA: Ver Logs do Supabase em Tempo Real

## 🎯 **SOLUÇÃO MAIS RÁPIDA (RECOMENDADA)**

### **1️⃣ Dashboard do Supabase (Mais Fácil)**

Execute o script:
```powershell
.\abrir-logs-dashboard.ps1
```

Ou acesse diretamente:
```
https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions/rendizy-server/logs
```

**Vantagens:**
- ✅ Interface visual completa
- ✅ Filtros e busca integrados
- ✅ Atualização manual (F5)
- ✅ Sem necessidade de instalar nada

---

### **2️⃣ SQL Editor (Para Logs Estruturados)**

Se você criou a tabela `function_logs` (via migration), use:

```sql
-- Últimos erros de login
SELECT * FROM function_logs
WHERE function_name LIKE '%auth/login%'
  AND level = 'error'
  AND created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC
LIMIT 50;

-- Últimas 100 tentativas de login
SELECT * FROM function_logs
WHERE function_name LIKE '%auth/login%'
ORDER BY created_at DESC
LIMIT 100;

-- Estatísticas de login (últimas 24h)
SELECT 
  level,
  COUNT(*) as total,
  MIN(created_at) as primeiro,
  MAX(created_at) as ultimo
FROM function_logs
WHERE function_name LIKE '%auth/login%'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY level
ORDER BY total DESC;
```

**Acesse:** https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql/new

---

### **3️⃣ CLI do Supabase (Se Instalado)**

**Instalação via Scoop (Windows):**
```powershell
# Se Scoop não estiver instalado:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

# Adicionar bucket do Supabase
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git

# Instalar CLI
scoop install supabase

# Autenticar
supabase login

# Linkar projeto
supabase link --project-ref odcgnzfremrqnvtitpcc

# Ver logs
supabase logs
```

---

## 📋 **COMPARAÇÃO DAS OPÇÕES**

| Método | Fácil | Tempo Real | Histórico | Instalação |
|--------|-------|------------|-----------|------------|
| **Dashboard** | ✅✅✅ | Manual (F5) | ✅ | Nenhuma |
| **SQL Editor** | ✅✅ | Manual (F5) | ✅✅✅ | Nenhuma |
| **CLI** | ✅ | ⚠️ Limitado | ✅✅ | Scoop/npm |

---

## 🚀 **RECOMENDAÇÃO PRÁTICA**

**Para agora (debug rápido):**
1. Execute: `.\abrir-logs-dashboard.ps1`
2. Pressione F5 no navegador para atualizar

**Para produção (logging estruturado):**
1. Aplique migration: `20241120_create_function_logs_table.sql`
2. Use `logErrorToDatabase()` nas Edge Functions
3. Consulte via SQL Editor

---

**Status:** Solução prática criada! Use o dashboard enquanto tentamos instalar o CLI.

