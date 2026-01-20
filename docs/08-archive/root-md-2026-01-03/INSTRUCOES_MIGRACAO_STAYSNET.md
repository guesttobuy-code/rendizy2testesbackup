# 📋 INSTRUÇÕES - Executar Migration Stays.net

## ✅ Arquivo Criado

O arquivo `supabase/migrations/0004_staysnet_tables.sql` foi **recriado** com todas as tabelas e campos necessários.

---

## 🚀 Como Executar

### 1. **Acesse o Supabase Dashboard**
   - Vá para: https://supabase.com/dashboard
   - Selecione seu projeto

### 2. **Abra o SQL Editor**
   - No menu lateral, clique em **"SQL Editor"**
   - Clique em **"New query"**

### 3. **Copie e Cole o Script**
   - Abra o arquivo: `supabase/migrations/0004_staysnet_tables.sql`
   - **Copie TODO o conteúdo**
   - **Cole no SQL Editor do Supabase**

### 4. **Execute o Script**
   - Clique no botão **"Run"** (ou pressione `Ctrl+Enter`)
   - Aguarde a execução (pode levar alguns segundos)

### 5. **Verifique o Resultado**
   - Você deve ver mensagens de sucesso no console
   - Se houver erros, verifique se a tabela `kv_store_67caf26a` existe

---

## 📊 Tabelas que Serão Criadas

1. ✅ **staysnet_config** - Configuração da integração
2. ✅ **staysnet_webhooks** - Histórico de webhooks
3. ✅ **staysnet_sync_log** - Log de sincronizações
4. ✅ **staysnet_reservations_cache** - Cache de reservas
5. ✅ **staysnet_properties_cache** - Cache de propriedades

---

## 🔍 Verificação Pós-Execução

Execute este SQL para verificar se as tabelas foram criadas:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'staysnet%'
ORDER BY table_name;
```

**Resultado esperado:**
```
staysnet_config
staysnet_properties_cache
staysnet_reservations_cache
staysnet_sync_log
staysnet_webhooks
```

---

## 📝 Campos da Tabela Principal

### **staysnet_config**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Chave primária |
| `organization_id` | TEXT | ID da organização (padrão: 'global') |
| `api_key` | TEXT | Login da API Stays.net |
| `api_secret` | TEXT | Senha da API Stays.net |
| `base_url` | TEXT | URL base da API (padrão: 'https://stays.net/external/v1') |
| `account_name` | TEXT | Nome da conta |
| `notification_webhook_url` | TEXT | URL para receber webhooks |
| `scope` | TEXT | Escopo: 'global' ou 'individual' |
| `enabled` | BOOLEAN | Se a integração está ativa |
| `last_sync` | TIMESTAMPTZ | Data da última sincronização |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

---

## ⚠️ Importante

- ✅ A migration é **idempotente** (pode ser executada múltiplas vezes)
- ✅ Se já existir configuração no KV Store, ela será **migrada automaticamente**
- ✅ Todas as tabelas têm **Row Level Security (RLS)** habilitado
- ✅ Índices otimizados para performance

---

## 🎯 Próximos Passos

Após executar a migration:

1. ✅ As tabelas estarão prontas para uso
2. ✅ O código backend pode salvar dados diretamente no banco
3. ✅ Webhooks podem ser salvos automaticamente
4. ✅ Logs de sincronização podem ser registrados

---

## ❓ Problemas Comuns

### **Erro: "relation kv_store_67caf26a does not exist"**
- **Solução:** Execute primeiro a migration `0001_setup_completo.sql`

### **Erro: "permission denied"**
- **Solução:** Verifique se você tem permissões de administrador no projeto

### **Tabelas não aparecem**
- **Solução:** Recarregue a página do Supabase Dashboard e verifique novamente

---

## ✅ Status

**Arquivo:** `supabase/migrations/0004_staysnet_tables.sql` ✅ **CRIADO**

**Pronto para executar no Supabase!** 🚀

