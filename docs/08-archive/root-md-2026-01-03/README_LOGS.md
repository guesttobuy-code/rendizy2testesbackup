# 📋 GUIA: Monitorar Logs do Supabase em Tempo Real

## 🎯 Opções Disponíveis

### 1️⃣ **Supabase CLI Direto (Mais Simples)**

```powershell
# Ver últimos logs
supabase logs --service edge-function --project-ref odcgnzfremrqnvtitpcc

# Filtrar apenas logs de erro
supabase logs --service edge-function --project-ref odcgnzfremrqnvtitpcc | Select-String "ERROR|❌"

# Filtrar apenas logs de login
supabase logs --service edge-function --project-ref odcgnzfremrqnvtitpcc | Select-String "login|auth|rppt"
```

---

### 2️⃣ **Script PowerShell - Monitoramento Contínuo**

#### **watch-supabase-logs.ps1** - Todos os logs relevantes

```powershell
.\watch-supabase-logs.ps1
```

**Funcionalidades:**
- ✅ Busca logs a cada 3 segundos
- ✅ Colorização por nível (ERROR=vermelho, WARNING=amarelo, INFO=cyan)
- ✅ Filtra logs relevantes automaticamente
- ✅ Modo contínuo ou único

#### **watch-login-attempts.ps1** - Apenas login

```powershell
.\watch-login-attempts.ps1
```

**Funcionalidades:**
- ✅ Foca apenas em tentativas de login
- ✅ Mostra timestamps
- ✅ Destaque visual para sucesso/erro

---

### 3️⃣ **Logging Estruturado no Banco (Recomendado para Produção)**

#### **Passo 1: Criar tabela de logs**

```sql
-- Já criado em: supabase/migrations/20241120_create_function_logs_table.sql
-- Aplicar via Supabase Dashboard → SQL Editor
```

#### **Passo 2: Usar nas Edge Functions**

```typescript
// Em routes-auth.ts ou qualquer Edge Function:
import { logErrorToDatabase } from './instrument-logging.ts';

// Logar erro
await logErrorToDatabase(
  'rendizy-server/auth/login',
  'error',
  'Usuário não encontrado',
  { username: 'rppt' }
);

// Logar sucesso
await logErrorToDatabase(
  'rendizy-server/auth/login',
  'info',
  'Login bem-sucedido',
  { username: 'rppt', type: 'superadmin' }
);
```

#### **Passo 3: Consultar logs via SQL**

```sql
-- Últimos 100 erros
SELECT * FROM function_logs 
WHERE level = 'error' 
ORDER BY created_at DESC 
LIMIT 100;

-- Erros de login hoje
SELECT * FROM function_logs 
WHERE function_name LIKE '%auth/login%'
  AND level = 'error'
  AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;

-- Todos os logs de uma função específica
SELECT * FROM function_logs 
WHERE function_name = 'rendizy-server/auth/login'
ORDER BY created_at DESC;
```

---

### 4️⃣ **Realtime no Frontend (Opcional)**

Se quiser receber notificações de erro em tempo real no frontend:

```typescript
// No frontend (React)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);

// Inscrever-se em novos logs de erro
supabase
  .channel('function_logs')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'function_logs',
      filter: 'level=eq.error'
    },
    (payload) => {
      console.error('🚨 NOVO ERRO:', payload.new);
      // Mostrar notificação para o usuário
    }
  )
  .subscribe();
```

---

## 🚀 Uso Rápido

### **Para debug imediato:**
```powershell
.\watch-login-attempts.ps1
```

### **Para ver todos os logs:**
```powershell
.\watch-supabase-logs.ps1
```

### **Para ver logs no dashboard:**
https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions/rendizy-server/logs

---

## 📊 Comparação das Opções

| Método | Tempo Real | Histórico | Fácil de Usar | Produção |
|--------|-----------|-----------|---------------|----------|
| **CLI direto** | ❌ | ✅ | ✅✅✅ | ❌ |
| **Script PowerShell** | ✅ | ❌ | ✅✅ | ❌ |
| **Tabela SQL** | ✅ (Realtime) | ✅✅ | ✅ | ✅✅✅ |

---

**Recomendação:** Use scripts PowerShell para debug rápido, e tabela SQL para produção.

