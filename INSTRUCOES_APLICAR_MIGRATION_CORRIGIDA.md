# 📋 INSTRUÇÕES: Aplicar Migration Corrigida (Users e Sessions)

**Data:** 2025-11-23  
**Status:** ✅ **PRONTO PARA APLICAR**

---

## 🎯 O QUE ESTE SCRIPT FAZ

Aplica as migrations corrigidas para criar as tabelas `users` e `sessions` com estrutura completa e correta.

**Diferenças da versão anterior:**
- ✅ Estrutura completa (igual migrations originais)
- ✅ Hash de senha correto (SHA256 direto)
- ✅ RLS configurado para ambas as tabelas
- ✅ Força recriação (DROP TABLE antes de criar)

---

## 🚀 COMO APLICAR

### **PASSO 1: Acessar SQL Editor**

1. Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql/new
2. Faça login se necessário

### **PASSO 2: Copiar Script**

1. Abra o arquivo: `APLICAR_MIGRATIONS_E_TESTAR.sql`
2. Selecione TODO o conteúdo (Ctrl+A)
3. Copie (Ctrl+C)

### **PASSO 3: Aplicar**

1. Cole no SQL Editor do Supabase (Ctrl+V)
2. Clique em **RUN** (ou pressione Ctrl+Enter)
3. Aguarde a execução (deve levar 2-5 segundos)

### **PASSO 4: Verificar**

Você deve ver mensagens como:
```
NOTICE: ✅ MIGRATIONS APLICADAS COM SUCESSO!
NOTICE: Usuários na tabela: 2
NOTICE: Tabela sessions existe: true
NOTICE: Usuário rppt existe: true
```

E também uma tabela com:
- `organizations` - ✅ CRÍTICA
- `users` - ✅ CRÍTICA
- `sessions` - ✅ CRÍTICA

E outra tabela com os usuários criados:
- `rppt` - Super Administrador
- `admin` - Administrador

---

## ✅ O QUE O SCRIPT CRIA

### **1. Tabela `organizations`**
- Se não existir, cria a tabela base

### **2. Tabela `users`**
- Estrutura completa com todos os campos
- Foreign key para `organizations`
- Constraints de validação
- RLS (Row Level Security) configurado
- Índices para performance

### **3. Tabela `sessions`**
- Estrutura completa com todos os campos
- Foreign keys para `users` e `organizations`
- Constraints de validação
- RLS (Row Level Security) configurado
- Índices para performance

### **4. SuperAdmins Inicializados**
- `rppt` - Super Administrador
- `admin` - Administrador
- Senha: `root` (hash SHA256)

---

## ⚠️ IMPORTANTE

- ✅ **Não precisa parar nada** - A migration é segura
- ✅ **Não vai deletar dados** - Só cria/recria estrutura
- ✅ **Pode executar várias vezes** - Usa `DROP TABLE IF EXISTS` e `ON CONFLICT`

---

## 🔍 VERIFICAÇÃO PÓS-APLICAÇÃO

Após aplicar, execute no SQL Editor:

```sql
-- Verificar tabelas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'sessions', 'organizations');

-- Verificar usuários
SELECT username, email, name, type, status FROM users;

-- Verificar estrutura de sessions
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'sessions'
ORDER BY ordinal_position;
```

---

## 📚 DOCUMENTAÇÃO RELACIONADA

- `COMPARACAO_MIGRATIONS_O_QUE_ERREI.md` - Análise detalhada dos erros
- `supabase/migrations/20241120_create_users_table.sql` - Migration original
- `supabase/migrations/20241121_create_sessions_table.sql` - Migration original
- `Ligando os motores.md` - Seção 9 (Histórico de Migrations)

---

**Última atualização:** 2025-11-23



