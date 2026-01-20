# 🔄 Plano de Migração: Supabase (Conta Antiga → Conta Nova)

**Objetivo:** Migrar todo o banco de dados, configurações e Edge Functions de uma conta Supabase para outra, mantendo 100% de fidelidade.

**Motivo:** Segurança - nova conta sem acesso de funcionários.

---

## 📋 **CHECKLIST PRÉ-MIGRAÇÃO**

### **1. Informações Necessárias**

- [ ] **Conta Antiga:**
  - Project ID: `odcgnzfremrqnvtitpcc` (atual)
  - URL: `https://odcgnzfremrqnvtitpcc.supabase.co`
  - Access Token (para CLI)
  - Service Role Key (para migração de dados)

- [ ] **Conta Nova:**
  - Criar novo projeto no Supabase
  - Anotar novo Project ID
  - Anotar nova URL
  - Obter Access Token (para CLI)
  - Obter Service Role Key (para migração)

---

## 🎯 **ETAPAS DA MIGRAÇÃO**

### **FASE 1: Preparação (Conta Antiga)**

#### **1.1. Exportar Schema Completo**

```bash
# Conectar na conta antiga
npx supabase link --project-ref odcgnzfremrqnvtitpcc

# Exportar schema completo (tabelas, tipos, funções, triggers, policies)
npx supabase db dump --schema public --schema auth --schema storage -f schema_completo.sql

# Exportar apenas estrutura (sem dados)
npx supabase db dump --schema public --schema-only -f schema_estrutura.sql

# Exportar dados (sem estrutura)
npx supabase db dump --schema public --data-only -f dados_completos.sql
```

#### **1.2. Exportar Migrations**

```bash
# Copiar todas as migrations
cp -r supabase/migrations migrations_backup/

# Ou exportar via SQL direto
npx supabase db dump --schema public -f migrations_export.sql
```

#### **1.3. Exportar Edge Functions**

```bash
# Edge Functions já estão no código, mas verificar se estão atualizadas
npx supabase functions list

# Fazer backup das Edge Functions
cp -r supabase/functions functions_backup/
```

#### **1.4. Exportar Configurações**

- [ ] Row Level Security (RLS) Policies
- [ ] Database Functions (SQL)
- [ ] Triggers
- [ ] Views
- [ ] Extensions
- [ ] Storage Buckets (se houver)
- [ ] Auth Providers (se configurados)

---

### **FASE 2: Criação do Novo Projeto**

#### **2.1. Criar Novo Projeto no Supabase**

1. Acessar: https://supabase.com/dashboard
2. Fazer login na **nova conta**
3. Criar novo projeto:
   - Nome: `rendizy-producao` (ou similar)
   - Database Password: **ANOTAR** (importante!)
   - Region: Mesma da conta antiga (se possível)
   - Plan: Mesmo plano da conta antiga

#### **2.2. Anotar Credenciais**

```markdown
## NOVA CONTA SUPABASE

- Project ID: `[NOVO_PROJECT_ID]`
- URL: `https://[NOVO_PROJECT_ID].supabase.co`
- Database Password: `[SENHA_DO_BANCO]`
- Anon Key: `[NOVA_ANON_KEY]`
- Service Role Key: `[NOVA_SERVICE_ROLE_KEY]`
```

---

### **FASE 3: Migração do Schema**

#### **3.1. Conectar na Nova Conta**

```bash
# Desconectar da conta antiga
npx supabase unlink

# Conectar na conta nova
npx supabase link --project-ref [NOVO_PROJECT_ID]
```

#### **3.2. Aplicar Schema Completo**

```bash
# Opção 1: Via arquivo SQL exportado
psql "postgresql://postgres:[SENHA]@db.[NOVO_PROJECT_ID].supabase.co:5432/postgres" -f schema_completo.sql

# Opção 2: Via Supabase CLI (recomendado)
npx supabase db push

# Opção 3: Aplicar migrations uma por uma
for file in supabase/migrations/*.sql; do
  npx supabase db execute -f "$file"
done
```

#### **3.3. Verificar Schema**

```sql
-- Conectar no novo banco e verificar
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verificar número de tabelas
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';
```

---

### **FASE 4: Migração de Dados**

#### **4.1. Exportar Dados da Conta Antiga**

```bash
# Exportar dados de todas as tabelas
npx supabase db dump --data-only --schema public -f dados_export.sql

# Ou exportar tabela por tabela (mais seguro)
pg_dump "postgresql://postgres:[SENHA_ANTIGA]@db.odcgnzfremrqnvtitpcc.supabase.co:5432/postgres" \
  --data-only \
  --table=organizations \
  --table=users \
  --table=sessions \
  --table=properties \
  --table=reservations \
  --table=guests \
  --table=conversations \
  --table=messages \
  --table=organization_channel_config \
  --table=evolution_instances \
  --table=chat_conversations \
  --table=chat_messages \
  --table=chat_webhooks \
  --table=listings \
  --table=rooms \
  --table=beds \
  --table=accommodation_rules \
  --table=pricing_settings \
  --table=custom_prices \
  --table=custom_min_nights \
  --table=blocks \
  --table=locations \
  --table=short_ids \
  --table=staysnet_config \
  --table=staysnet_properties_cache \
  --table=staysnet_reservations_cache \
  --table=staysnet_sync_log \
  --table=staysnet_webhooks \
  --table=chat_channels_config \
  --table=chat_contacts \
  --table=chat_message_templates \
  --table=activity_logs \
  --table=invitations \
  --table=permissions \
  --table=kv_store_67caf26a \
  -f dados_export.sql
```

#### **4.2. Importar Dados na Conta Nova**

```bash
# Importar dados
psql "postgresql://postgres:[SENHA_NOVA]@db.[NOVO_PROJECT_ID].supabase.co:5432/postgres" -f dados_export.sql

# Ou via Supabase CLI
npx supabase db execute -f dados_export.sql
```

#### **4.3. Verificar Integridade dos Dados**

```sql
-- Comparar contagens de registros
SELECT 
  'organizations' as tabela,
  COUNT(*) as registros
FROM organizations
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'sessions', COUNT(*) FROM sessions
UNION ALL
SELECT 'properties', COUNT(*) FROM properties
UNION ALL
SELECT 'reservations', COUNT(*) FROM reservations
UNION ALL
SELECT 'guests', COUNT(*) FROM guests
UNION ALL
SELECT 'conversations', COUNT(*) FROM chat_conversations
UNION ALL
SELECT 'messages', COUNT(*) FROM chat_messages
ORDER BY tabela;
```

---

### **FASE 5: Migração de Edge Functions**

#### **5.1. Deploy das Edge Functions**

```bash
# Conectar na conta nova
npx supabase link --project-ref [NOVO_PROJECT_ID]

# Deploy de todas as Edge Functions
npx supabase functions deploy rendizy-server

# Verificar se deploy foi bem-sucedido
npx supabase functions list
```

#### **5.2. Atualizar Variáveis de Ambiente**

No Dashboard do Supabase (nova conta):
- Settings → Edge Functions → Secrets
- Adicionar todas as variáveis de ambiente:
  - `EVOLUTION_API_URL`
  - `EVOLUTION_GLOBAL_API_KEY`
  - `EVOLUTION_INSTANCE_TOKEN`
  - `EVOLUTION_INSTANCE_NAME`
  - Outras variáveis necessárias

---

### **FASE 6: Migração de Storage (se houver)**

#### **6.1. Exportar Storage**

```bash
# Listar buckets
npx supabase storage list

# Exportar arquivos (se houver)
# Usar Supabase Storage API ou CLI
```

#### **6.2. Importar Storage**

```bash
# Criar buckets na nova conta
# Upload de arquivos
```

---

### **FASE 7: Atualização do Frontend**

#### **7.1. Atualizar Variáveis de Ambiente**

```typescript
// src/utils/supabase/info.ts
export const projectId = '[NOVO_PROJECT_ID]';
export const publicAnonKey = '[NOVA_ANON_KEY]';
```

#### **7.2. Atualizar URLs no Código**

```bash
# Buscar e substituir
grep -r "odcgnzfremrqnvtitpcc" src/
grep -r "odcgnzfremrqnvtitpcc" supabase/

# Substituir em todos os arquivos
# Project ID antigo → Project ID novo
```

#### **7.3. Atualizar Vercel (se aplicável)**

No Vercel Dashboard:
- Settings → Environment Variables
- Atualizar:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - Outras variáveis relacionadas

---

### **FASE 8: Validação e Testes**

#### **8.1. Testes Funcionais**

- [ ] Login/Logout funciona
- [ ] Dados carregam corretamente
- [ ] Edge Functions respondem
- [ ] WhatsApp integration funciona
- [ ] Chat funciona
- [ ] Reservas funcionam
- [ ] Propriedades funcionam

#### **8.2. Verificação de Integridade**

```sql
-- Verificar foreign keys
SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE contype = 'f'
ORDER BY table_name;

-- Verificar se há registros órfãos
SELECT COUNT(*) FROM reservations r
LEFT JOIN properties p ON r.property_id = p.id
WHERE p.id IS NULL;

SELECT COUNT(*) FROM reservations r
LEFT JOIN guests g ON r.guest_id = g.id
WHERE g.id IS NULL;
```

---

## 🛠️ **SCRIPTS AUTOMATIZADOS (Windows PowerShell)**

### **Script 1: Exportar Banco Completo**

```powershell
# Executar script de exportação
.\exportar-banco-completo.ps1

# Ou especificar Project ID
.\exportar-banco-completo.ps1 -ProjectId "odcgnzfremrqnvtitpcc"
```

**O que faz:**
- ✅ Exporta schema completo
- ✅ Exporta dados completos
- ✅ Exporta estrutura (sem dados)
- ✅ Copia migrations
- ✅ Copia Edge Functions
- ✅ Cria backup em `backup_export_[DATA]`

### **Script 2: Migração Completa**

```powershell
# Executar migração completa
.\migrar-supabase.ps1

# Ou com parâmetros
.\migrar-supabase.ps1 -ProjectIdAntigo "odcgnzfremrqnvtitpcc" -ProjectIdNovo "[NOVO_ID]"
```

**O que faz:**
- ✅ Exporta da conta antiga
- ✅ Conecta na conta nova
- ✅ Aplica schema
- ✅ Importa dados (opcional)
- ✅ Deploy Edge Functions

---

## 🔧 **SCRIPTS MANUAIS (Linux/Mac)**

### **Script 1: Exportar Tudo (Conta Antiga)**

```bash
#!/bin/bash
# exportar-tudo.sh

PROJECT_ID_ANTIGO="odcgnzfremrqnvtitpcc"
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"

mkdir -p "$BACKUP_DIR"

echo "📦 Exportando schema..."
npx supabase db dump --schema public --schema auth --schema storage \
  -f "$BACKUP_DIR/schema_completo.sql"

echo "📦 Exportando dados..."
npx supabase db dump --schema public --data-only \
  -f "$BACKUP_DIR/dados_completos.sql"

echo "📦 Copiando migrations..."
cp -r supabase/migrations "$BACKUP_DIR/"

echo "📦 Copiando Edge Functions..."
cp -r supabase/functions "$BACKUP_DIR/"

echo "✅ Backup completo em: $BACKUP_DIR"
```

### **Script 2: Importar Tudo (Conta Nova)**

```bash
#!/bin/bash
# importar-tudo.sh

PROJECT_ID_NOVO="[NOVO_PROJECT_ID]"
BACKUP_DIR="backup_[DATA]"

echo "🔗 Conectando na conta nova..."
npx supabase link --project-ref "$PROJECT_ID_NOVO"

echo "📥 Aplicando schema..."
npx supabase db push

echo "📥 Importando dados..."
npx supabase db execute -f "$BACKUP_DIR/dados_completos.sql"

echo "📥 Deploy Edge Functions..."
npx supabase functions deploy rendizy-server

echo "✅ Migração completa!"
```

---

## ⚠️ **CUIDADOS IMPORTANTES**

### **1. Ordem de Migração**

1. ✅ Schema primeiro (estrutura)
2. ✅ Dados depois (conteúdo)
3. ✅ Edge Functions por último
4. ✅ Atualizar frontend

### **2. Validação de Dados**

- ✅ Comparar contagens de registros
- ✅ Verificar foreign keys
- ✅ Testar queries críticas
- ✅ Validar integridade referencial

### **3. Downtime**

- ⚠️ Planejar janela de manutenção
- ⚠️ Avisar usuários (se aplicável)
- ⚠️ Fazer backup completo antes
- ⚠️ Testar em ambiente de staging primeiro

### **4. Rollback**

- ✅ Manter conta antiga ativa por alguns dias
- ✅ Ter plano de rollback pronto
- ✅ Documentar diferenças (se houver)

---

## 📊 **COMPARAÇÃO: Antes vs Depois**

### **Checklist de Validação**

Após migração, comparar:

- [ ] Número de tabelas: `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';`
- [ ] Número de registros por tabela (comparar contagens)
- [ ] RLS Policies: `SELECT * FROM pg_policies;`
- [ ] Database Functions: `SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';`
- [ ] Triggers: `SELECT trigger_name, event_object_table FROM information_schema.triggers;`
- [ ] Edge Functions: `npx supabase functions list`

---

## 🚀 **PROCESSO RECOMENDADO (Passo a Passo)**

### **Dia 1: Preparação**

1. ✅ Criar nova conta no Supabase
2. ✅ Anotar todas as credenciais
3. ✅ Fazer backup completo da conta antiga
4. ✅ Exportar schema e dados

### **Dia 2: Migração (Janela de Manutenção)**

1. ✅ Aplicar schema na conta nova
2. ✅ Importar dados
3. ✅ Deploy Edge Functions
4. ✅ Configurar variáveis de ambiente
5. ✅ Testes básicos

### **Dia 3: Validação**

1. ✅ Testes funcionais completos
2. ✅ Verificação de integridade
3. ✅ Comparação de dados
4. ✅ Ajustes finais

### **Dia 4: Go-Live**

1. ✅ Atualizar frontend
2. ✅ Atualizar Vercel
3. ✅ Monitorar logs
4. ✅ Validar produção

### **Dia 5-7: Observação**

1. ✅ Monitorar erros
2. ✅ Validar performance
3. ✅ Manter conta antiga como backup
4. ✅ Desativar conta antiga (após validação)

---

## 📚 **COMANDOS ÚTEIS**

### **Supabase CLI**

```bash
# Listar projetos
npx supabase projects list

# Conectar em projeto
npx supabase link --project-ref [PROJECT_ID]

# Desconectar
npx supabase unlink

# Ver status
npx supabase status

# Exportar schema
npx supabase db dump --schema public -f schema.sql

# Aplicar migrations
npx supabase db push

# Executar SQL
npx supabase db execute -f arquivo.sql

# Listar Edge Functions
npx supabase functions list

# Deploy Edge Function
npx supabase functions deploy [FUNCTION_NAME]
```

### **PostgreSQL Direto**

```bash
# Conectar via psql
psql "postgresql://postgres:[SENHA]@db.[PROJECT_ID].supabase.co:5432/postgres"

# Exportar via pg_dump
pg_dump "postgresql://postgres:[SENHA]@db.[PROJECT_ID].supabase.co:5432/postgres" \
  --schema-only -f schema.sql

# Importar via psql
psql "postgresql://postgres:[SENHA]@db.[PROJECT_ID].supabase.co:5432/postgres" -f schema.sql
```

---

## 🔐 **SEGURANÇA**

### **Após Migração**

1. ✅ Revogar acesso de funcionários na conta antiga
2. ✅ Manter apenas você com acesso na conta nova
3. ✅ Atualizar todas as credenciais
4. ✅ Rotacionar Service Role Keys
5. ✅ Configurar 2FA na conta nova
6. ✅ Documentar novo Project ID e credenciais

---

## 📝 **NOTAS IMPORTANTES**

1. **KV Store:** A tabela `kv_store_67caf26a` também precisa ser migrada
2. **Sessions:** Sessões ativas serão perdidas (usuários precisarão fazer login novamente)
3. **Storage:** Se houver arquivos no Storage, migrar também
4. **Auth:** Configurações de Auth (providers, etc.) precisam ser recriadas
5. **Webhooks:** URLs de webhooks precisam ser atualizadas

---

## ✅ **CHECKLIST FINAL**

- [ ] Schema migrado e validado
- [ ] Dados migrados e validados
- [ ] Edge Functions deployadas
- [ ] Variáveis de ambiente configuradas
- [ ] Frontend atualizado
- [ ] Vercel atualizado
- [ ] Testes funcionais passando
- [ ] Integridade de dados verificada
- [ ] Performance validada
- [ ] Documentação atualizada
- [ ] Conta antiga desativada (após validação)

---

**VERSÃO:** v1.0.103.990  
**DATA:** 20/11/2025  
**STATUS:** 📋 Plano de Migração Completo

