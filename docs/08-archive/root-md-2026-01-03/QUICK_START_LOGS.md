# ⚡ QUICK START: Ver Logs do Supabase em Tempo Real

## ✅ CLI Funcionando!

O Supabase CLI está instalado e funcionando via `npx` (versão 2.58.5).

---

## 🚀 Comandos Rápidos

### **1. Ver logs direto no terminal:**
```powershell
npx supabase logs --service edge-function --project-ref odcgnzfremrqnvtitpcc --limit 50
```

### **2. Filtrar apenas erros:**
```powershell
npx supabase logs --service edge-function --project-ref odcgnzfremrqnvtitpcc --limit 100 | Select-String "ERROR|❌"
```

### **3. Filtrar apenas login:**
```powershell
npx supabase logs --service edge-function --project-ref odcgnzfremrqnvtitpcc --limit 100 | Select-String "login|auth|rppt|🔐"
```

### **4. Monitorar em tempo real (script):**
```powershell
.\watch-login-attempts.ps1
```

---

## 📊 Scripts Disponíveis

### **watch-login-attempts.ps1**
Monitora apenas tentativas de login em tempo real.

```powershell
.\watch-login-attempts.ps1
```

**Funcionalidades:**
- ✅ Busca logs a cada 2 segundos
- ✅ Filtra apenas logs relacionados a login
- ✅ Mostra timestamps
- ✅ Destaque visual para sucesso/erro

### **watch-supabase-logs.ps1**
Monitora todos os logs relevantes.

```powershell
.\watch-supabase-logs.ps1
```

**Funcionalidades:**
- ✅ Busca logs a cada 3 segundos
- ✅ Colorização por nível (ERROR=vermelho, WARNING=amarelo)
- ✅ Filtra logs relevantes automaticamente

---

## 🎯 Para Debug do Login Agora:

**Opção 1: Script automatizado**
```powershell
.\watch-login-attempts.ps1
```

**Opção 2: Comando manual**
```powershell
npx supabase logs --service edge-function --project-ref odcgnzfremrqnvtitpcc --limit 50 | Select-String "login|auth|rppt"
```

**Opção 3: Dashboard (navegador)**
https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions/rendizy-server/logs

---

## 📋 Para Produção (Logging Estruturado):

### **1. Aplicar migration de logs:**
```sql
-- Aplicar no Supabase Dashboard → SQL Editor
-- Arquivo: supabase/migrations/20241120_create_function_logs_table.sql
```

### **2. Usar nas Edge Functions:**
```typescript
import { logErrorToDatabase } from './instrument-logging.ts';

await logErrorToDatabase(
  'rendizy-server/auth/login',
  'error',
  'Usuário não encontrado',
  { username: 'rppt' }
);
```

### **3. Consultar logs:**
```sql
SELECT * FROM function_logs 
WHERE function_name LIKE '%auth/login%'
ORDER BY created_at DESC 
LIMIT 50;
```

---

**Recomendação:** Use o script `watch-login-attempts.ps1` para debug rápido agora! 🚀

