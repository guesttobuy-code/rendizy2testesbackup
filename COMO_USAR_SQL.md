# 📋 COMO USAR: Arquivos SQL

**IMPORTANTE:** Não execute o nome do arquivo! Execute o **CONTEÚDO** do arquivo.

---

## ❌ **ERRADO:**

```
VERIFICAR_EXECUCOES_CRON_JOB.sql
```

Isso vai dar erro de sintaxe porque você está tentando executar o **nome do arquivo**.

---

## ✅ **CORRETO:**

1. **Abra o arquivo** `VERIFICAR_EXECUCOES_CRON_JOB.sql`
2. **Copie TODO o conteúdo** do arquivo (o código SQL dentro dele)
3. **Cole no Supabase SQL Editor**
4. **Execute** (`Ctrl+Enter` ou botão RUN)

---

## 🚀 **VERSÃO RÁPIDA (SQL DIRETO):**

Se preferir, use o arquivo `VERIFICAR_CRON_JOB_SQL_DIRETO.sql` que tem apenas o SQL essencial:

### **Conteúdo do arquivo:**

```sql
-- VERIFICAR: Histórico de Execuções do Cron Job
-- Execute este SQL para ver se o cron job está rodando

-- 1. Ver últimas 10 execuções
SELECT 
  runid,
  status,
  return_message,
  start_time,
  end_time,
  (end_time - start_time) AS duration
FROM cron.job_run_details 
WHERE jobid = 1
ORDER BY start_time DESC
LIMIT 10;
```

**Como usar:**
1. Copie o SQL acima (entre as linhas ```sql e ```)
2. Cole no Supabase SQL Editor
3. Execute (`Ctrl+Enter`)

---

## 📝 **INSTRUÇÕES PASSO A PASSO:**

1. ✅ Abra o arquivo `.sql` no seu editor
2. ✅ Selecione TODO o conteúdo do arquivo (`Ctrl+A`)
3. ✅ Copie o conteúdo (`Ctrl+C`)
4. ✅ Vá para Supabase Dashboard → SQL Editor
5. ✅ Cole o conteúdo (`Ctrl+V`)
6. ✅ Execute (`Ctrl+Enter`)

---

## ⚠️ **NÃO FAÇA:**

- ❌ Não copie o nome do arquivo
- ❌ Não execute `VERIFICAR_EXECUCOES_CRON_JOB.sql`
- ❌ Não copie apenas parte do conteúdo

---

## ✅ **FAÇA:**

- ✅ Copie TODO o conteúdo do arquivo
- ✅ Execute o código SQL
- ✅ Veja os resultados na tabela

---

**DICA:** Sempre abra o arquivo `.sql` e copie o código que está **dentro** dele, não o nome do arquivo!

