# 🗄️ MIGRAÇÃO COMPLETA PARA SQL - PLANO EXECUTIVO

**Data:** 19/11/2025  
**Objetivo:** Migrar TODO o sistema para SQL relacional  
**Status:** 🚀 EM ANDAMENTO

---

## ✅ TABELAS SQL JÁ EXISTENTES

Baseado na análise do código:

1. ✅ **`organizations`** - Parcialmente implementada
2. ✅ **`organization_channel_config`** - Usada para WhatsApp
3. ✅ **`evolution_instances`** - Usada para Evolution API
4. ✅ **`staysnet_config`** - Usada para Stays.net

---

## 📋 TABELAS A CRIAR (PRIORIDADE)

### PRIORIDADE 1 - CRÍTICAS (Login e Autenticação):

1. **`users`** - Usuários do sistema
   - SuperAdmin
   - Usuários de organizações
   - Integrar com Supabase Auth (se possível)

2. **`sessions`** - Sessões de autenticação (OU usar JWT sem tabela)
   - Se usar JWT simples, não precisa desta tabela

---

### PRIORIDADE 2 - ESSENCIAIS (Core do negócio):

3. **`properties`** - Propriedades/imóveis
   - Relacionamento: `organization_id → organizations(id)`

4. **`reservations`** - Reservas
   - Relacionamento: `property_id → properties(id)`
   - Relacionamento: `organization_id → organizations(id)`
   - Relacionamento: `guest_id → guests(id)`

5. **`guests`** - Hóspedes
   - Relacionamento: `organization_id → organizations(id)`

6. **`blocks`** - Bloqueios de calendário
   - Relacionamento: `property_id → properties(id)`

---

### PRIORIDADE 3 - IMPORTANTES:

7. **`locations`** - Localizações
   - Relacionamento: `organization_id → organizations(id)`

8. **`rooms`** - Quartos
   - Relacionamento: `property_id → properties(id)`

9. **`listings`** - Listagens (Booking.com, etc)
   - Relacionamento: `property_id → properties(id)`

10. **`photos`** - Fotos de propriedades
    - Relacionamento: `property_id → properties(id)`

---

### PRIORIDADE 4 - PODE FICAR EM KV TEMPORARIAMENTE:

11. **`conversations`** - Conversas do WhatsApp (chat)
12. **`messages`** - Mensagens do chat

**Motivo:** Dados temporários, alta volumetria, podem usar KV Store por enquanto.

---

## 🏗️ ESTRUTURA DE MIGRAÇÕES SQL

### Migration 1: `20241119_create_users_table.sql`
- Tabela `users` completa
- Foreign keys para `organizations`
- Constraints de validação

### Migration 2: `20241119_create_properties_table.sql`
- Tabela `properties` completa
- Foreign keys para `organizations`
- Constraints e índices

### Migration 3: `20241119_create_guests_table.sql`
- Tabela `guests`
- Foreign keys

### Migration 4: `20241119_create_reservations_table.sql`
- Tabela `reservations`
- Foreign keys para `properties`, `guests`, `organizations`
- Constraints de data (check_in < check_out)

### Migration 5: `20241119_create_blocks_table.sql`
- Tabela `blocks`
- Foreign keys para `properties`

### Migration 6: `20241119_migrate_data_from_kv_store.sql`
- Script para migrar dados do KV Store para SQL
- Migração de organizações
- Migração de usuários
- Migração de propriedades
- Migração de reservas

---

## 🔄 ORDEM DE EXECUÇÃO

```
1. Criar migrations SQL (Migration 1-5)
   ↓
2. Aplicar migrations no Supabase
   ↓
3. Criar script de migração de dados (Migration 6)
   ↓
4. Migrar dados do KV Store para SQL
   ↓
5. Atualizar rotas para usar SQL direto
   ↓
6. Remover código KV Store (depois de validar)
   ↓
7. Testar tudo
```

---

## ✅ CRITÉRIOS DE SUCESSO

- ✅ Todas as entidades críticas em SQL
- ✅ Foreign keys funcionando
- ✅ Dados migrados sem perda
- ✅ Rotas atualizadas para SQL
- ✅ Integridade referencial garantida
- ✅ Login funcionando com SQL
- ✅ Salvar credenciais funcionando com SQL

---

**VERSÃO:** 1.0  
**STATUS:** 🚀 EM EXECUÇÃO

