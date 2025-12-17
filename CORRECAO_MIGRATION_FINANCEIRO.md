# ✅ CORREÇÃO DA MIGRATION DO MÓDULO FINANCEIRO

**Data:** 23/11/2025  
**Problema:** Erro ao aplicar migration  
**Status:** ✅ **CORRIGIDO**

---

## 🐛 ERRO ENCONTRADO

```
ERROR: 0A000: cannot use subquery in check constraint
LINE 55: EXISTS (SELECT 1 FROM financeiro_categorias p WHERE p.id = parent_id AND p.organization_id = organization_id)
```

**Causa:** PostgreSQL não permite subconsultas (subqueries) em constraints `CHECK`.

---

## ✅ CORREÇÃO APLICADA

### **Antes (❌ Não funciona):**
```sql
CONSTRAINT check_parent_same_org CHECK (
  parent_id IS NULL OR 
  EXISTS (SELECT 1 FROM financeiro_categorias p WHERE p.id = parent_id AND p.organization_id = organization_id)
)
```

### **Depois (✅ Funciona):**
```sql
-- Removida constraint CHECK com subquery
-- Substituída por trigger que valida antes de INSERT/UPDATE

CREATE OR REPLACE FUNCTION validate_categoria_parent_org()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM financeiro_categorias p 
    WHERE p.id = NEW.parent_id 
    AND p.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'parent_id deve pertencer à mesma organização';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_categoria_parent_org
  BEFORE INSERT OR UPDATE ON financeiro_categorias
  FOR EACH ROW
  EXECUTE FUNCTION validate_categoria_parent_org();
```

---

## 📋 PRÓXIMOS PASSOS

1. ✅ Migration corrigida
2. ⏳ **Aplicar novamente no SQL Editor do Supabase**
3. ⏳ Verificar se as 8 tabelas foram criadas

---

## 🔗 INSTRUÇÕES

1. Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql/new
2. Copie TODO o conteúdo de `supabase/migrations/20241123_create_financeiro_tables.sql` (já corrigido)
3. Cole e execute (Ctrl+Enter)
4. Deve funcionar agora! ✅

---

**Commit:** `fix: remover subquery de CHECK constraint e usar trigger para validar parent_id`

