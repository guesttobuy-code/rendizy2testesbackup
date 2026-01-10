# 📊 ANÁLISE COMPLETA DO SCHEMA DO BANCO DE DADOS

**Data:** 06/11/2025  
**Versão:** v1.0.103.322  
**Status:** ✅ Schema Relacional Completo Implementado

---

## 🎯 RESUMO EXECUTIVO

### **Mudança Arquitetural Importante:**

**ANTES:** Sistema baseado em **KV Store** (1 tabela única: `kv_store_67caf26a`)  
**AGORA:** Sistema **SQL Relacional Completo** (35 tabelas estruturadas)

### **Total de Tabelas:** 35

---

## 📋 LISTA COMPLETA DE TABELAS

### **1. Core / Multi-Tenant**
- ✅ `organizations` - Organizações/Imobiliárias
- ✅ `users` - Usuários do sistema
- ✅ `invitations` - Convites para usuários
- ✅ `permissions` - Permissões granulares
- ✅ `activity_logs` - Log de atividades

### **2. Propriedades e Acomodações**
- ✅ `properties` - Imóveis/Acomodações
- ✅ `locations` - Locais/Edifícios
- ✅ `listings` - Anúncios nas plataformas
- ✅ `rooms` - Quartos/Cômodos
- ✅ `beds` - Camas dos quartos
- ✅ `room_photos` - Fotos dos quartos
- ✅ `accommodation_rules` - Regras de acomodação (crianças, pets, etc)

### **3. Reservas e Hóspedes**
- ✅ `reservations` - Reservas
- ✅ `guests` - Hóspedes
- ✅ `blocks` - Bloqueios de calendário

### **4. Precificação**
- ✅ `pricing_settings` - Configurações de preço
- ✅ `custom_prices` - Preços customizados por data
- ✅ `custom_min_nights` - Mínimo de noites customizado

### **5. Chat e Comunicação**
- ✅ `chat_channels_config` - Configuração de canais (WhatsApp, Email, SMS)
- ✅ `chat_contacts` - Contatos do chat
- ✅ `chat_conversations` - Conversas
- ✅ `chat_messages` - Mensagens
- ✅ `chat_message_templates` - Templates de mensagens
- ✅ `chat_webhooks` - Webhooks de chat

### **6. WhatsApp / Evolution API**
- ✅ `evolution_instances` - Instâncias Evolution API
- ✅ `evolution_instances_backup` - Backup das instâncias
- ✅ `organization_channel_config` - Config antiga (manter compatibilidade?)

### **7. Integrações**
- ✅ `staysnet_config` - Configuração Stays.net
- ✅ `staysnet_webhooks` - Webhooks Stays.net
- ✅ `staysnet_sync_log` - Log de sincronização
- ✅ `staysnet_reservations_cache` - Cache de reservas
- ✅ `staysnet_properties_cache` - Cache de propriedades

### **8. Utilitários**
- ✅ `short_ids` - IDs curtos para URLs
- ✅ `kv_store_67caf26a` - KV Store (mantido para compatibilidade?)

---

## 🔍 MUDANÇAS CRÍTICAS IDENTIFICADAS

### **1. evolution_instances - MUDANÇA IMPORTANTE**

**ANTES (nas migrations):**
```sql
CREATE TABLE evolution_instances (
  id UUID PRIMARY KEY,
  user_id INTEGER NOT NULL,  -- ❌ REMOVIDO
  instance_name TEXT NOT NULL,
  instance_api_key TEXT NOT NULL,
  global_api_key TEXT,
  base_url TEXT NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(user_id)  -- ❌ REMOVIDO
);
```

**AGORA (schema atual):**
```sql
CREATE TABLE evolution_instances (
  id UUID PRIMARY KEY,
  instance_name TEXT NOT NULL,
  instance_api_key TEXT NOT NULL,
  global_api_key TEXT,
  base_url TEXT NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  instance_token TEXT,  -- ✅ NOVO CAMPO
  -- ❌ user_id REMOVIDO
  -- ❌ UNIQUE(user_id) REMOVIDO
);
```

**⚠️ IMPACTO:**
- Sistema multi-tenant por `user_id` foi removido
- Agora parece ser uma instância global única
- Tabela `evolution_instances_backup` mantém estrutura antiga

---

### **2. Duas Tabelas de Configuração WhatsApp**

**Tabela 1:** `organization_channel_config` (antiga)
- Mantida no schema
- Usa `organization_id TEXT`

**Tabela 2:** `chat_channels_config` (nova)
- Estrutura mais completa
- Usa `organization_id UUID` (foreign key)
- Mais campos (webhook_url, webhook_events, etc)

**⚠️ DECISÃO NECESSÁRIA:**
- Qual usar?
- Migrar dados?
- Manter ambas?

---

### **3. Estrutura de Usuários**

**Tabela 1:** `public.users` (Supabase Auth)
```sql
CREATE TABLE public.users (
  id BIGINT GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Tabela 2:** `users` (Custom)
```sql
CREATE TABLE users (
  id UUID NOT NULL,
  email TEXT,
  raw_user_meta_data JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  organization_id UUID
);
```

**⚠️ RELACIONAMENTO:**
- `users.id` (UUID) provavelmente referencia `auth.users.id`
- `users.organization_id` referencia `organizations.id`

---

### **4. Estrutura de Propriedades**

**Nova estrutura relacional:**
```
organizations (1) ──┐
                    ├──> properties (N)
locations (1) ──────┘
owners (1) ─────────┘

properties (1) ────> listings (N)
properties (1) ────> rooms (N)
rooms (1) ─────────> beds (N)
rooms (1) ─────────> room_photos (N)
listings (1) ──────> accommodation_rules (1)
listings (1) ──────> pricing_settings (1)
```

**Campos importantes em `properties`:**
- `organization_id UUID` (FK)
- `owner_id UUID` (FK - provavelmente users)
- `location_id UUID` (FK - nullable)
- `type` (apartment, house, studio, etc)
- `status` (active, inactive, maintenance, draft)
- Campos de plataformas (airbnb, booking, decolar)
- Arrays: `amenities`, `tags`, `photos`

---

### **5. Sistema de Chat Completo**

**Estrutura:**
```
chat_channels_config (1) ──> chat_conversations (N)
chat_conversations (1) ────> chat_messages (N)
chat_conversations (1) ────> chat_contacts (1)
chat_messages (1) ─────────> chat_messages (reply_to_id)
chat_message_templates (N) ─ (standalone)
chat_webhooks (N) ────────── (standalone)
```

**Canais suportados:**
- whatsapp
- email
- sms
- webchat
- instagram
- facebook

---

## 📊 RELACIONAMENTOS PRINCIPAIS

### **Hierarquia de Organizações:**
```
organizations (1)
  ├── users (N)
  ├── locations (N)
  ├── properties (N)
  ├── guests (N)
  ├── reservations (N)
  ├── blocks (N)
  └── chat_channels_config (1)
```

### **Hierarquia de Propriedades:**
```
properties (1)
  ├── listings (N)
  │   ├── accommodation_rules (1)
  │   └── pricing_settings (1)
  ├── rooms (N)
  │   ├── beds (N)
  │   └── room_photos (N)
  ├── reservations (N)
  └── blocks (N)
```

### **Hierarquia de Reservas:**
```
reservations (1)
  ├── guest_id → guests (1)
  ├── property_id → properties (1)
  └── organization_id → organizations (1)
```

---

## 🔐 CONSTRAINTS E VALIDAÇÕES

### **CHECK Constraints Importantes:**

**accommodation_rules:**
- `allows_pets`: 'no', 'yes_free', 'yes_chargeable', 'upon_request'
- `smoking_allowed`: 'yes', 'no', 'outdoor_only'
- `events_allowed`: 'yes', 'no', 'on_request'

**beds:**
- `type`: 11 tipos diferentes (casal, solteiro, king, queen, etc)

**blocks:**
- `type`: 'block' (fixo)
- `subtype`: 'simple', 'maintenance', 'predictive'

**chat_conversations:**
- `channel`: whatsapp, email, sms, webchat, instagram, facebook
- `status`: active, archived, closed, spam
- `last_message_from`: guest, agent, system

**chat_messages:**
- `direction`: incoming, outgoing
- `content_type`: text, image, video, audio, document, location, contact, sticker, poll, list
- `status`: pending, sent, delivered, read, failed, deleted

**custom_prices:**
- `type`: 'special', 'seasonal', 'event'

**guests:**
- `source`: airbnb, booking, decolar, direct, other

**invitations:**
- `status`: pending, accepted, expired, cancelled

**organizations:**
- `status`: active, suspended, trial, cancelled
- `plan`: free, basic, professional, enterprise
- `billing_cycle`: monthly, yearly

**properties:**
- `type`: apartment, house, studio, loft, condo, villa, other
- `status`: active, inactive, maintenance, draft

**reservations:**
- `status`: pending, confirmed, checked_in, checked_out, completed, cancelled, no_show
- `platform`: airbnb, booking, decolar, direct, other
- `payment_status`: pending, partial, paid, refunded, failed
- `payment_method`: credit_card, debit_card, pix, bank_transfer, cash, platform

**rooms:**
- `type`: banheiro, meio-banheiro, quadruplo, suite, triplo, twin, duplo, individual, studio, sala, outras

**short_ids:**
- `resource_type`: property, location

---

## 🗄️ ÍNDICES E PERFORMANCE

### **Índices Identificados (implícitos via Foreign Keys):**

Todas as foreign keys criam índices automáticos:
- `organization_id` em todas as tabelas
- `property_id` em listings, reservations, blocks
- `guest_id` em reservations, chat_contacts
- `conversation_id` em chat_messages
- `room_id` em beds, room_photos

### **Índices Recomendados (não vistos no schema):**

```sql
-- Busca por email
CREATE INDEX idx_users_email ON users(email);

-- Busca por slug
CREATE INDEX idx_organizations_slug ON organizations(slug);

-- Busca por código
CREATE INDEX idx_properties_code ON properties(code);
CREATE INDEX idx_locations_code ON locations(code);

-- Busca por datas (reservas)
CREATE INDEX idx_reservations_dates ON reservations(check_in, check_out);
CREATE INDEX idx_reservations_status ON reservations(status);

-- Busca por datas (bloqueios)
CREATE INDEX idx_blocks_dates ON blocks(start_date, end_date);

-- Busca por datas (preços custom)
CREATE INDEX idx_custom_prices_date ON custom_prices(date);
CREATE INDEX idx_custom_min_nights_date ON custom_min_nights(date);

-- Busca de conversas
CREATE INDEX idx_chat_conversations_status ON chat_conversations(status);
CREATE INDEX idx_chat_conversations_last_message ON chat_conversations(last_message_at DESC);

-- Busca de mensagens
CREATE INDEX idx_chat_messages_conversation_created ON chat_messages(conversation_id, created_at DESC);
```

---

## ⚠️ PONTOS DE ATENÇÃO

### **1. kv_store_67caf26a**
- Tabela ainda existe no schema
- **Pergunta:** Ainda está sendo usada ou é legado?
- **Ação:** Decidir se mantém ou migra dados

### **2. evolution_instances sem user_id**
- Perdeu multi-tenant por usuário
- **Pergunta:** Como funciona multi-tenant agora?
- **Ação:** Verificar lógica de isolamento

### **3. Duas tabelas de config WhatsApp**
- `organization_channel_config` (antiga)
- `chat_channels_config` (nova)
- **Pergunta:** Qual usar?
- **Ação:** Decidir e migrar se necessário

### **4. Campos ARRAY sem tipo definido**
- Vários campos `ARRAY` sem especificar tipo
- Exemplo: `webhook_events ARRAY`, `tags ARRAY`
- **Ação:** Especificar tipos (TEXT[], UUID[], etc)

### **5. Falta de timestamps em algumas tabelas**
- `kv_store_67caf26a` não tem `created_at`/`updated_at` no schema
- Mas nas migrations tinha
- **Ação:** Verificar se precisa adicionar

### **6. RLS (Row Level Security)**
- Schema não mostra políticas RLS
- **Ação:** Verificar se estão implementadas
- **Ação:** Documentar políticas necessárias

---

## 📝 PRÓXIMOS PASSOS RECOMENDADOS

### **1. Criar Migration de Atualização**
```sql
-- Arquivo: 20241106_migrate_to_relational_schema.sql
-- Migrar dados do KV Store para tabelas relacionais
```

### **2. Atualizar Backend**
- Atualizar rotas para usar tabelas relacionais
- Remover lógica de KV Store
- Adicionar validações de foreign keys

### **3. Documentar Relacionamentos**
- Criar diagrama ER
- Documentar queries comuns
- Documentar índices

### **4. Resolver Conflitos**
- Decidir sobre `evolution_instances` (com ou sem user_id)
- Decidir sobre tabelas de config WhatsApp
- Migrar ou remover `kv_store_67caf26a`

### **5. Adicionar Índices**
- Criar migration com índices recomendados
- Testar performance

### **6. Implementar RLS**
- Criar políticas de segurança
- Testar isolamento multi-tenant

---

## ✅ CHECKLIST DE VALIDAÇÃO

- [ ] Todas as foreign keys estão corretas?
- [ ] Todos os CHECK constraints estão corretos?
- [ ] Índices necessários foram criados?
- [ ] RLS está implementado?
- [ ] Triggers de `updated_at` estão funcionando?
- [ ] Dados do KV Store foram migrados?
- [ ] Backend foi atualizado?
- [ ] Testes foram executados?

---

## 📚 REFERÊNCIAS

- Schema SQL fornecido pelo usuário
- Migrations existentes em `/supabase/migrations/`
- Documentação anterior do KV Store

---

**Última atualização:** 06/11/2025  
**Versão do Schema:** Relacional Completo  
**Status:** ✅ Analisado e Documentado

