# ✅ SOLUÇÃO FINAL: Monitorar Logs do Supabase

## 🎯 **SOLUÇÕES PRÁTICAS CRIADAS**

### **1️⃣ Dashboard do Supabase (Funciona Agora)**

**Acesse:**
```
https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions/rendizy-server/logs
```

**Ou execute:**
```powershell
Start-Process "https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions/rendizy-server/logs"
```

**Vantagens:**
- ✅ Funciona imediatamente (sem instalar nada)
- ✅ Interface visual completa
- ✅ Filtros e busca integrados
- ✅ Atualização manual (F5 para refresh)

---

### **2️⃣ SQL Editor (Para Logs Estruturados)**

Se você aplicou a migration `20241120_create_function_logs_table.sql`, pode consultar via SQL:

**Acesse:**
```
https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql/new
```

**Queries úteis:**

```sql
-- Últimos erros de login
SELECT * FROM function_logs
WHERE function_name LIKE '%auth/login%'
  AND level = 'error'
ORDER BY created_at DESC
LIMIT 50;

-- Últimas 100 tentativas de login
SELECT * FROM function_logs
WHERE function_name LIKE '%auth/login%'
ORDER BY created_at DESC
LIMIT 100;
```

---

### **3️⃣ Script PowerShell (Automação)**

**Para abrir dashboard automaticamente:**
```powershell
.\abrir-logs-dashboard.ps1
```

**Arquivos criados:**
- ✅ `abrir-logs-dashboard.ps1` - Abre dashboard no navegador
- ✅ `query-logs.sql` - Queries SQL prontas
- ✅ `instrument-logging.ts` - Instrumentação para Edge Functions
- ✅ `20241120_create_function_logs_table.sql` - Migration para tabela de logs

---

## 📊 **COMO USAR AGORA**

### **Para Debug Imediato:**

1. **Abra o dashboard** (já está aberto no navegador):
   - https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions/rendizy-server/logs

2. **Teste o login** para gerar novos logs:
   - https://rendizy2producao-am7c.vercel.app/login
   - Usuário: `rppt`
   - Senha: `root`

3. **Atualize o dashboard** (F5) para ver os logs

### **Para Logs Estruturados (Produção):**

1. **Aplique migration:**
   ```sql
   -- Execute no SQL Editor:
   -- Arquivo: supabase/migrations/20241120_create_function_logs_table.sql
   ```

2. **Use nas Edge Functions:**
   ```typescript
   import { logErrorToDatabase } from './instrument-logging.ts';
   
   await logErrorToDatabase(
     'rendizy-server/auth/login',
     'error',
     'Erro ao fazer login',
     { username, error: err.message }
   );
   ```

3. **Consulte via SQL:**
   ```sql
   SELECT * FROM function_logs 
   ORDER BY created_at DESC 
   LIMIT 50;
   ```

---

## 🔍 **STATUS ATUAL**

✅ **Dashboard aberto no navegador**  
✅ **Scripts PowerShell criados**  
✅ **Migration SQL criada**  
✅ **Instrumentação TypeScript criada**  
⚠️ **CLI do Supabase** (instalação complexa no Windows - use dashboard por enquanto)

---

**Recomendação:** Use o dashboard para debug imediato. Para produção, aplique a migration SQL e use `logErrorToDatabase()` nas Edge Functions.

