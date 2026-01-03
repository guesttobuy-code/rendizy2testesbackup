# 🔧 CORREÇÃO: organization_channel_config.organization_id TEXT → UUID

**Data:** 17/11/2025  
**Versão:** 1.0.103.400  
**Status:** ✅ **MIGRAÇÃO CRIADA**

---

## 🎯 PROBLEMA IDENTIFICADO

A tabela `organization_channel_config` tem `organization_id` como `TEXT`, mas deveria ser `UUID` para:

1. ✅ **Consistência entre tabelas** - Todas as outras tabelas usam `UUID`
2. ✅ **Queries customizadas mais fáceis** - JOINs funcionam corretamente
3. ✅ **Ferramentas de BI** - Funcionam melhor com tipos consistentes
4. ✅ **Chaves estrangeiras** - Permite FK para `organizations.id`
5. ✅ **Performance** - UUIDs são mais eficientes para índices

---

## 📋 TABELAS AFETADAS

### ✅ **`organization_channel_config`** (CRÍTICO)

**Status:** ✅ **MIGRAÇÃO CRIADA**

**Arquivo de Migração:**
- `supabase/migrations/20241117_convert_organization_channel_config_to_uuid.sql`

**Mudanças:**
- ✅ `organization_id TEXT` → `organization_id UUID`
- ✅ Validação e limpeza de dados inválidos
- ✅ Recriação de índices e constraints
- ✅ Adição de foreign key para `organizations.id` (se existir)

---

### ⚠️ **Tabelas `staysnet_*`** (NÃO CRÍTICO)

**Status:** ⚠️ **MANTIDO COMO TEXT** (intencional)

**Razão:**
- Têm valor padrão `'global'` que não é UUID
- Permitem configurações globais (não específicas de organização)
- Podem ser migradas no futuro se necessário

**Tabelas:**
- `staysnet_config`
- `staysnet_webhooks`
- `staysnet_sync_log`
- `staysnet_reservations_cache`
- `staysnet_properties_cache`

---

## 🔧 MIGRAÇÃO SQL

### Arquivo: `supabase/migrations/20241117_convert_organization_channel_config_to_uuid.sql`

**Passos da Migração:**

1. ✅ **Validar e limpar dados inválidos**
   - Remove registros com `organization_id` que não são UUIDs válidos

2. ✅ **Remover constraints temporariamente**
   - Remove `UNIQUE` constraint
   - Remove índice existente

3. ✅ **Converter coluna**
   - Cria coluna temporária `organization_id_new UUID`
   - Copia dados válidos convertendo `TEXT → UUID`
   - Remove coluna antiga
   - Renomeia nova coluna

4. ✅ **Recriar constraints**
   - Adiciona `NOT NULL`
   - Recria `UNIQUE` constraint
   - Recria índice

5. ✅ **Adicionar foreign key**
   - Verifica se tabela `organizations` existe
   - Adiciona FK `organization_id → organizations.id`
   - `ON DELETE CASCADE` e `ON UPDATE CASCADE`

6. ✅ **Verificação final**
   - Valida que todos os `organization_id` são UUIDs válidos
   - Log de sucesso/erro

---

## 📝 CÓDIGO AFETADO

### ✅ **Arquivos que usam `organization_channel_config`:**

1. **`supabase/functions/rendizy-server/routes-chat.ts`:**
   - ✅ `GET /channels/config` - Já usa `ensureOrganizationId()` que retorna UUID
   - ✅ `POST /channels/config` - Já usa `ensureOrganizationId()` que retorna UUID

2. **`supabase/functions/rendizy-server/routes-organizations.ts`:**
   - ✅ `GET /:id/settings/global` - Já usa `ensureOrganizationId()` que retorna UUID
   - ✅ `PUT /:id/settings/global` - Já usa `ensureOrganizationId()` que retorna UUID

### ✅ **Verificação de `ensureOrganizationId()`:**

A função `ensureOrganizationId()` em `utils-organization.ts`:
- ✅ Busca `organization_id` da tabela `organizations` (que é UUID)
- ✅ Retorna UUID válido
- ✅ Não precisa de alterações

**Conclusão:** ✅ O código já está preparado para usar UUIDs!

---

## 🚀 COMO APLICAR A MIGRAÇÃO

### Opção 1: Via Supabase Dashboard

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole o conteúdo de `20241117_convert_organization_channel_config_to_uuid.sql`
4. Execute a migração

### Opção 2: Via CLI

```bash
# No diretório do projeto
supabase db push
```

### Opção 3: Manual (SQL direto)

```sql
-- Executar o arquivo de migração diretamente no banco
\i supabase/migrations/20241117_convert_organization_channel_config_to_uuid.sql
```

---

## ⚠️ AVISOS IMPORTANTES

### ⚠️ **Dados Existentes**

A migração **REMOVE** registros com `organization_id` inválido (não UUID).

**Antes de executar:**
1. ✅ Verificar se há dados importantes com `organization_id` não-UUID
2. ✅ Fazer backup do banco de dados
3. ✅ Testar em ambiente de desenvolvimento primeiro

### ⚠️ **Compatibilidade**

Após a migração:
- ✅ Código existente continua funcionando (já usa UUIDs)
- ✅ Frontend não precisa de alterações
- ✅ APIs continuam funcionando normalmente

---

## ✅ CHECKLIST DE APLICAÇÃO

### Antes de Executar

- [ ] ✅ Backup do banco de dados criado
- [ ] ✅ Testado em ambiente de desenvolvimento
- [ ] ✅ Verificado dados existentes em `organization_channel_config`
- [ ] ✅ Confirmado que `ensureOrganizationId()` retorna UUIDs

### Após Executar

- [ ] ✅ Verificar que migração executou sem erros
- [ ] ✅ Confirmar que `organization_id` é agora `UUID`
- [ ] ✅ Verificar que foreign key foi criada (se `organizations` existe)
- [ ] ✅ Testar APIs que usam `organization_channel_config`
- [ ] ✅ Verificar logs para erros

---

## 📊 RESULTADO ESPERADO

### Antes

```sql
CREATE TABLE organization_channel_config (
  id UUID PRIMARY KEY,
  organization_id TEXT NOT NULL UNIQUE,  -- ❌ TEXT
  ...
);
```

### Depois

```sql
CREATE TABLE organization_channel_config (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL UNIQUE,  -- ✅ UUID
  ...
  CONSTRAINT fk_channel_config_organization
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
```

---

## 🎯 BENEFÍCIOS

1. ✅ **Consistência:** Todas as tabelas usam `UUID` para `organization_id`
2. ✅ **Integridade:** Foreign key garante que `organization_id` sempre existe em `organizations`
3. ✅ **Performance:** Índices em UUID são mais eficientes
4. ✅ **Queries:** JOINs funcionam corretamente
5. ✅ **BI Tools:** Ferramentas de BI funcionam melhor com tipos consistentes
6. ✅ **Manutenção:** Código mais fácil de manter e entender

---

## 📝 PRÓXIMOS PASSOS (Opcional)

### Migrar Tabelas `staysnet_*`

Se no futuro quiser migrar as tabelas `staysnet_*`:

1. Decidir estratégia para valor `'global'`:
   - Opção A: Criar organização especial com UUID fixo
   - Opção B: Permitir `NULL` para configurações globais
   - Opção C: Manter como `TEXT` (atual)

2. Criar migração similar para cada tabela

---

## ✅ CONCLUSÃO

✅ **Migração SQL criada e pronta para execução**

**Status:**
- ✅ Migração SQL criada
- ✅ Código já compatível (usa UUIDs)
- ✅ Documentação completa
- ⏳ Aguardando execução no banco de dados

**Próximo passo:** Executar a migração no banco de dados.

---

**Última atualização:** 17/11/2025  
**Versão:** 1.0.103.400

