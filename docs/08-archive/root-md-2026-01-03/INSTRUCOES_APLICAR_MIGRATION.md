# 📋 INSTRUÇÕES: APLICAR MIGRATION TABELA USERS

**Data:** 20/11/2025  
**Migration:** `20241120_create_users_table.sql`  
**Objetivo:** Criar tabela SQL para usuários (migrar login de KV Store para SQL)

---

## 🚀 COMO APLICAR A MIGRATION

### PASSO 1: Acessar Supabase Dashboard
1. Acesse: https://supabase.com/dashboard
2. Selecione o projeto: `odcgnzfremrqnvtitpcc`
3. Vá para: **SQL Editor** (menu lateral)

### PASSO 2: Abrir o arquivo de migration
1. Abra o arquivo: `supabase/migrations/20241120_create_users_table.sql`
2. Copie TODO o conteúdo do arquivo

### PASSO 3: Executar no Supabase
1. Cole o SQL no SQL Editor do Supabase
2. Clique em **Run** (ou pressione Ctrl+Enter)
3. Aguarde confirmação de sucesso

### PASSO 4: Verificar
Execute esta query para verificar:

```sql
-- Verificar se tabela users foi criada
SELECT * FROM users WHERE type = 'superadmin';

-- Deve retornar 2 usuários:
-- - rppt (Super Administrador)
-- - admin (Administrador)
```

---

## ✅ O QUE A MIGRATION FAZ

1. **Cria tabela `users`** com:
   - Campos de identificação (username, email, name)
   - Hash de senha (password_hash)
   - Tipo de usuário (superadmin, imobiliaria, staff)
   - Relacionamento com organizations (foreign key)
   - Constraints de validação

2. **Cria índices** para busca rápida:
   - username
   - email
   - type
   - status
   - organization_id

3. **Inicializa SuperAdmins**:
   - rppt / root
   - admin / root

4. **Configura RLS** (Row Level Security)

---

## 🎯 PRÓXIMOS PASSOS

Após aplicar a migration:

1. ✅ Fazer deploy da Edge Function (já refatorada)
2. ✅ Testar login com SQL
3. ✅ Verificar se funciona 100%

---

**VERSÃO:** 1.0  
**STATUS:** ⏳ AGUARDANDO APLICAÇÃO DA MIGRATION

