# 🔧 APLICAR MIGRATION VIA PSQL (Alternativa)

Se o Supabase CLI não funcionar, você pode aplicar a migration diretamente via `psql`:

## 📋 Pré-requisitos

1. **Instalar PostgreSQL Client** (se não tiver):
   ```bash
   # Windows (via Chocolatey)
   choco install postgresql
   
   # Ou baixar de: https://www.postgresql.org/download/windows/
   ```

2. **Obter Connection String do Supabase:**
   - Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/settings/database
   - Copie a **Connection String** (URI mode)
   - Formato: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

## 🚀 Aplicar Migration

```bash
# Windows PowerShell
psql "postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" -f supabase/migrations/20241123_create_financeiro_tables.sql

# Ou via arquivo de conexão
psql -h aws-0-[region].pooler.supabase.com -p 6543 -U postgres.[ref] -d postgres -f supabase/migrations/20241123_create_financeiro_tables.sql
```

## ⚠️ IMPORTANTE

- Substitua `[ref]`, `[password]` e `[region]` pelos valores reais
- A senha está em `TOKENS_E_ACESSOS_COMPLETO.md` (não versionado)

---

## ✅ ALTERNATIVA MAIS SIMPLES: SQL Editor

Se `psql` não funcionar, a forma mais simples é:

1. Acessar: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql/new
2. Copiar TODO o conteúdo de `supabase/migrations/20241123_create_financeiro_tables.sql`
3. Colar e executar (Ctrl+Enter)

**Isso é a forma mais confiável e recomendada!**

