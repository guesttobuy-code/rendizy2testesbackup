# ⚠️ APLICAR MIGRATION DO MÓDULO FINANCEIRO

**Data:** 23/11/2025  
**Status:** ⚠️ **OBRIGATÓRIO ANTES DE TESTAR**

---

## 📋 INSTRUÇÕES

### **1. Acessar SQL Editor do Supabase**

1. Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql/new
2. Faça login se necessário

### **2. Copiar Migration**

1. Abra o arquivo: `supabase/migrations/20241123_create_financeiro_tables.sql`
2. Copie **TODO** o conteúdo (Ctrl+A, Ctrl+C)

### **3. Aplicar Migration**

1. Cole o conteúdo no SQL Editor do Supabase
2. Clique em **"Run"** ou pressione **Ctrl+Enter**
3. Aguarde a execução (pode levar alguns segundos)

### **4. Verificar Tabelas Criadas**

Execute esta query para verificar se as tabelas foram criadas:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'financeiro_%'
ORDER BY table_name;
```

**Deve retornar 8 tabelas:**
- `financeiro_categorias`
- `financeiro_centro_custos`
- `financeiro_contas_bancarias`
- `financeiro_lancamentos`
- `financeiro_lancamentos_splits`
- `financeiro_titulos`
- `financeiro_linhas_extrato`
- `financeiro_regras_conciliacao`

---

## ✅ APÓS APLICAR A MIGRATION

1. ✅ Backend já está deployado
2. ✅ Frontend está sendo conectado
3. ⏳ Testar CRUD completo
4. ⏳ Testar multi-tenant e RLS

---

## 🚨 IMPORTANTE

**NÃO TESTE O MÓDULO FINANCEIRO ANTES DE APLICAR A MIGRATION!**

As rotas do backend retornarão erro 500 se as tabelas não existirem.

