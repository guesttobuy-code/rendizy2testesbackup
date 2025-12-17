# 🔄 REFATORAÇÃO: LOGIN PARA SQL

**Data:** 20/11/2025  
**Objetivo:** Migrar login de KV Store para SQL  
**Status:** 🚀 EM EXECUÇÃO

---

## 📋 PLANO DE EXECUÇÃO

### FASE 1: Criar Tabela SQL `users` ✅
- ✅ Migration criada: `20241120_create_users_table.sql`
- ✅ SuperAdmins inicializados na migration
- ✅ Constraints e índices criados

### FASE 2: Atualizar routes-auth.ts
- 🔄 Substituir `kv.get('superadmin:...')` por SQL query
- 🔄 Usar tabela `users` ao invés de KV Store
- 🔄 Manter hash de senha (bcrypt)

### FASE 3: Remover Dependência KV Store
- 🔄 Remover `kv.set('superadmin:...')` do login
- 🔄 Remover `kv.set('session:...')` (já removido parcialmente)
- 🔄 Usar apenas SQL para autenticação

---

## 🔧 MUDANÇAS NECESSÁRIAS

### ANTES (KV Store):
```typescript
// Buscar SuperAdmin do KV Store
const superAdmin = await kv.get(`superadmin:${username}`);
if (!superAdmin) {
  // Criar inline ou chamar initializeSuperAdmin()
}
```

### DEPOIS (SQL):
```typescript
// Buscar usuário do SQL
const { data: user, error } = await supabase
  .from('users')
  .select('*')
  .eq('username', username)
  .eq('type', 'superadmin')
  .maybeSingle();

if (!user) {
  // Erro: usuário não encontrado
}
```

---

## ✅ VANTAGENS DA MIGRAÇÃO

1. **Integridade garantida** - Foreign keys e constraints
2. **Queries otimizadas** - Índices SQL
3. **Validação no banco** - CHECK constraints
4. **Sem erros de schema** - Tabela estruturada corretamente
5. **Migração fácil** - SQL padrão

---

**VERSÃO:** 1.0  
**STATUS:** 🚀 EM EXECUÇÃO

