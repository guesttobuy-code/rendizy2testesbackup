# 🚀 APLICAR MIGRATION DE AUTOMAÇÕES

**Tempo estimado:** 2 minutos

---

## ✅ PASSO 1: APLICAR MIGRATION NO SUPABASE

### **1.1. Acessar SQL Editor**

1. Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql/new

### **1.2. Copiar e Colar Migration**

1. Abra o arquivo: `supabase/migrations/20241126_create_automations_table.sql`
2. **Copie TODO o conteúdo** (Ctrl+A, Ctrl+C)
3. **Cole no SQL Editor** do Supabase
4. **Clique em "Run"** (ou pressione `Ctrl+Enter`)
5. Aguarde a execução (~5 segundos)

### **1.3. Verificar se Funcionou**

Execute este SQL para verificar:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('automations', 'automation_executions')
ORDER BY table_name;
```

**Resultado esperado:**
```
automation_executions
automations
```

---

## ✅ PASSO 2: DEPLOY DO BACKEND

### **Opção A: Via CLI (RECOMENDADO)**

```powershell
cd "C:\Users\rafae\Downloads\login-que-funcionou-20251124-172504 BACKUP"
npx supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc
```

### **Opção B: Via Dashboard**

1. Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions
2. Clique em **"rendizy-server"**
3. Clique em **"Redeploy"** ou **"Update"**
4. Aguarde o deploy completar (~30 segundos)

---

## ✅ PRONTO!

Depois disso, você pode:
1. Acessar `/automacoes` no sistema
2. Criar automações no Lab
3. Testar o fluxo completo

---

## 🧪 TESTE RÁPIDO

1. Acesse: `/crm/automacoes-lab`
2. Digite: "Quando uma reserva for criada, me avise no chat"
3. Clique em "Gerar automação"
4. Clique em "Salvar Automação"
5. Ative a automação em `/automacoes`
6. Crie uma reserva
7. Verifique se a automação foi executada

---

**Pronto para testar!** 🎉

