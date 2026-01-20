# 📋 RESUMO: Como Aplicar Migration do Módulo Financeiro

**Data:** 23/11/2025

---

## 🎯 OBJETIVO

Aplicar a migration `20241123_create_financeiro_tables.sql` no banco de dados Supabase para criar as 8 tabelas do módulo financeiro.

---

## ✅ MÉTODO RECOMENDADO: SQL Editor (Mais Simples)

### **Passo a Passo:**

1. **Acessar SQL Editor:**
   - URL: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql/new
   - Faça login se necessário

2. **Copiar Migration:**
   - Abra o arquivo: `supabase/migrations/20241123_create_financeiro_tables.sql`
   - Selecione TODO o conteúdo (Ctrl+A)
   - Copie (Ctrl+C)

3. **Aplicar:**
   - Cole no SQL Editor do Supabase
   - Clique em **"Run"** ou pressione **Ctrl+Enter**
   - Aguarde alguns segundos

4. **Verificar:**
   - Execute esta query para confirmar:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name LIKE 'financeiro_%'
   ORDER BY table_name;
   ```
   - Deve retornar 8 tabelas

---

## ⚠️ PROBLEMA COM SUPABASE CLI

O comando `npx supabase db push` está falhando porque há uma migration anterior (`0003_insert_superadmin_instance_SIMPLES.sql`) com erro.

**Solução:** Aplicar manualmente via SQL Editor (método recomendado acima).

---

## 📊 TABELAS QUE SERÃO CRIADAS

1. `financeiro_categorias` - Plano de contas
2. `financeiro_centro_custos` - Centros de custo
3. `financeiro_contas_bancarias` - Contas bancárias
4. `financeiro_lancamentos` - Lançamentos contábeis
5. `financeiro_lancamentos_splits` - Rateio de lançamentos
6. `financeiro_titulos` - Títulos a receber/pagar
7. `financeiro_linhas_extrato` - Linhas de extrato bancário
8. `financeiro_regras_conciliacao` - Regras de conciliação

---

## ✅ APÓS APLICAR

1. ✅ Backend já está deployado
2. ✅ Frontend está conectado
3. ⏳ Testar criação de lançamento
4. ⏳ Testar listagem de lançamentos

---

**Status:** ⚠️ **Aguardando aplicação da migration**

