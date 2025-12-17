# ✅ USAR MIGRATION FIXED

**Data:** 23/11/2025  
**Problema:** Constraint `unique_codigo_org` já existe  
**Solução:** Migration com limpeza completa no início

---

## 🎯 SOLUÇÃO

Criei uma versão **FIXED** da migration que faz limpeza completa antes de criar:

### **Arquivo:** `supabase/migrations/20241123_create_financeiro_tables_FIXED.sql`

### **O que faz diferente:**

1. **Limpeza completa no início:**
   - Dropa triggers primeiro
   - Dropa funções
   - Dropa tabelas (em ordem reversa de dependências)

2. **Ordem correta:**
   ```sql
   -- 1. Dropar triggers
   DROP TRIGGER IF EXISTS ...;
   
   -- 2. Dropar funções
   DROP FUNCTION IF EXISTS ...;
   
   -- 3. Dropar tabelas (CASCADE remove tudo)
   DROP TABLE IF EXISTS financeiro_regras_conciliacao CASCADE;
   DROP TABLE IF EXISTS financeiro_linhas_extrato CASCADE;
   -- ... (em ordem reversa)
   DROP TABLE IF EXISTS financeiro_categorias CASCADE;
   
   -- 4. Criar tabelas do zero
   CREATE TABLE financeiro_categorias (...);
   ```

3. **Nome único de constraint:**
   - `unique_codigo_org` para categorias
   - `unique_codigo_org_centro_custos` para centro de custos (evita conflito)

---

## 🚀 APLICAR

1. **Acesse:** https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql/new

2. **Use o arquivo FIXED:**
   - Abra: `supabase/migrations/20241123_create_financeiro_tables_FIXED.sql`
   - Copie TODO o conteúdo (Ctrl+A, Ctrl+C)
   - Cole no SQL Editor
   - Execute (Ctrl+Enter)

3. **Verificar:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name LIKE 'financeiro_%'
   ORDER BY table_name;
   ```
   - Deve retornar 8 tabelas

---

## ✅ VANTAGENS DA VERSÃO FIXED

- ✅ **Limpeza completa** antes de criar
- ✅ **Ordem correta** de drops (triggers → funções → tabelas)
- ✅ **CASCADE** remove todas as dependências
- ✅ **Idempotente** - pode executar múltiplas vezes
- ✅ **Nomes únicos** de constraints (evita conflitos)

---

**Status:** ✅ **Pronto para aplicar!**

