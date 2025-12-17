# ✅ MIGRATION IDEMPOTENTE - MÓDULO FINANCEIRO

**Data:** 23/11/2025  
**Status:** ✅ **CORRIGIDA - PODE SER EXECUTADA MÚLTIPLAS VEZES**

---

## 🔧 CORREÇÕES APLICADAS

### **1. DROP TABLE CASCADE**
Todas as tabelas agora são dropadas antes de criar:
```sql
DROP TABLE IF EXISTS financeiro_categorias CASCADE;
CREATE TABLE financeiro_categorias (...);
```

**Por quê?** Permite re-executar a migration sem erros de "já existe".

### **2. DROP FUNCTIONS E TRIGGERS**
Todas as funções e triggers são dropadas antes de criar:
```sql
DROP TRIGGER IF EXISTS trigger_validate_categoria_parent_org ON financeiro_categorias;
DROP FUNCTION IF EXISTS validate_categoria_parent_org();
-- ... (outros drops)
```

**Por quê?** Evita conflitos se a migration foi executada parcialmente antes.

### **3. REMOVIDA SUBQUERY DE CHECK CONSTRAINT**
Substituída por trigger que valida `parent_id`:
```sql
-- ❌ Antes (não funciona):
CONSTRAINT check_parent_same_org CHECK (
  EXISTS (SELECT 1 FROM ...)
)

-- ✅ Depois (funciona):
CREATE TRIGGER trigger_validate_categoria_parent_org
  BEFORE INSERT OR UPDATE ON financeiro_categorias
  FOR EACH ROW
  EXECUTE FUNCTION validate_categoria_parent_org();
```

---

## ✅ AGORA A MIGRATION É IDEMPOTENTE

**Pode ser executada múltiplas vezes sem erros!**

1. ✅ Dropa tabelas existentes (se houver)
2. ✅ Dropa funções e triggers existentes (se houver)
3. ✅ Cria tudo do zero
4. ✅ Funciona mesmo se executada parcialmente antes

---

## 🚀 APLICAR NOVAMENTE

1. Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql/new
2. Copie TODO o conteúdo de `supabase/migrations/20241123_create_financeiro_tables.sql`
3. Cole e execute (Ctrl+Enter)
4. ✅ Deve funcionar agora!

---

**Commits:**
- `fix: remover subquery de CHECK constraint e usar trigger para validar parent_id`
- `fix: adicionar DROP TABLE CASCADE para evitar conflitos em re-execução da migration`
- `fix: adicionar DROP de funções e triggers antes de criar para evitar conflitos`

