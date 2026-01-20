# ✅ CORREÇÃO - SINTAXE DA FUNÇÃO SQL

**Data:** 24/11/2025  
**Erro:** `no language specified`  
**Status:** ✅ **CORRIGIDO**

---

## 🐛 PROBLEMA

A função SQL estava com sintaxe incorreta:
```sql
RETURNS VOID AS $$
LANGUAGE plpgsql
AS $$
```

Isso causava o erro "no language specified" porque havia `AS $$` duplicado.

---

## ✅ SOLUÇÃO APLICADA

Corrigido para:
```sql
RETURNS VOID
LANGUAGE plpgsql
AS $$
```

---

## 🚀 APLICAR AGORA

1. **Acesse:** https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql/new
2. **Copie TODO o conteúdo** de `supabase/migrations/20241124_plano_contas_imobiliaria_temporada.sql` (já corrigido)
3. **Cole e execute** (Ctrl+Enter)
4. ✅ **Deve funcionar agora!**

---

**Commit:** `fix: corrigir sintaxe da função SQL (remover AS $$ duplicado)`

