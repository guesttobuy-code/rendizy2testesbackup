# ⚡ AÇÃO OBRIGATÓRIA: Aplicar Migration da Tabela Guests

## 🚨 PROBLEMA CRÍTICO ENCONTRADO

A tabela `guests` no Supabase tem **APENAS 6 colunas**:
```sql
id, name, email, phone, created_at, updated_at
```

Mas o código está tentando salvar **30+ colunas** que não existem!

Por isso os dados de hóspedes **NÃO ESTÃO SENDO SALVOS**.

## ✅ SOLUÇÃO

Migration criada em: `supabase/migrations/20241214_add_guests_columns.sql`

### 📋 PASSO A PASSO PARA APLICAR:

#### **Opção 1: Via Supabase Dashboard (RECOMENDADO)**

1. Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql/new

2. Copie e cole o conteúdo do arquivo:
   ```
   supabase/migrations/20241214_add_guests_columns.sql
   ```

3. Clique em **"RUN"** para executar

4. Aguarde mensagem de sucesso:
   ```
   ✅ Migration 20241214_add_guests_columns.sql completed successfully
   ```

#### **Opção 2: Via Supabase CLI**

```powershell
cd "C:\Users\rafae\OneDrive\Desktop\Rendizyoficial-main arquivos mais atualizado do github 09 12 2025\Rendizyoficial-main"

# Aplicar apenas esta migration
npx supabase db push --include-all --linked
```

## 📊 O QUE A MIGRATION FAZ

### ✅ Adiciona 30+ colunas necessárias:

1. **Multi-tenant**: `organization_id` (UUID)
2. **Dados Pessoais**: `first_name`, `last_name` (substitui `name`)
3. **Documentos**: `cpf`, `passport`, `rg`
4. **Endereço**: 8 campos (street, number, city, state, etc.)
5. **Demografia**: `birth_date`, `nationality`, `language`
6. **Estatísticas**: 5 campos (reservations, nights, spent, rating, etc.)
7. **Preferências**: 5 flags booleanas (early check-in, pets, etc.)
8. **Tags**: Array de tags
9. **Blacklist**: 4 campos (flag, reason, date, by)
10. **Source**: Campo com CHECK constraint (`airbnb`, `booking`, `decolar`, `direct`, `other`)

### ✅ Migra dados existentes:

- Separa campo `name` em `first_name` e `last_name`
- Preserva todos os dados atuais

### ✅ Cria índices de performance:

- `organization_id` (multi-tenant)
- `email` (busca rápida)
- `source` (filtros)
- `is_blacklisted` (segurança)

### ✅ Atualiza RLS Policies:

- Superadmin: acesso total
- Usuários normais: apenas sua organização

## 🎯 RESULTADO ESPERADO

Após aplicar a migration:

✅ Hóspedes serão salvos corretamente
✅ Todos os campos do formulário persistirão
✅ Multi-tenant funcionará
✅ Performance otimizada com índices

## ⚠️ AVISO

**NÃO TESTE** criar hóspedes antes de aplicar a migration!

Ela DEVE ser aplicada primeiro, senão continuará falhando.

## 📚 REFERÊNCIA

- **Padrão usado**: Mesmo de Anúncios Ultimate (sucesso comprovado)
- **Documento**: `Ligando os motores único.md`
- **Mapper**: `utils-guest-mapper.ts` (guestToSql / sqlToGuest)
- **Backend**: `routes-guests.ts` (createGuest function)

---

**Data**: 14/12/2024 20:47 BRT  
**Versão**: v1.0.103.340  
**Autor**: Claude Sonnet 4.5 + Rafael Milfont
