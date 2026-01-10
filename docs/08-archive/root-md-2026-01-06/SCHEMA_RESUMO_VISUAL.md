# 📊 RESUMO VISUAL - SCHEMA DO BANCO DE DADOS

**Data:** 06/11/2025  
**Status:** ✅ Schema Relacional Completo

---

## 🎯 MUDANÇA ARQUITETURAL

```
┌─────────────────────────────────────────────────────────┐
│                    ANTES (KV Store)                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  kv_store_67caf26a (ÚNICA TABELA)                      │
│  ┌──────────────┬──────────────────────┐               │
│  │     key      │      value (JSONB)   │               │
│  ├──────────────┼──────────────────────┤               │
│  │ org:123      │ {org data}           │               │
│  │ user:456     │ {user data}          │               │
│  │ acc:789      │ {property data}      │               │
│  │ res:101      │ {reservation data}   │               │
│  └──────────────┴──────────────────────┘               │
│                                                         │
└─────────────────────────────────────────────────────────┘

                            ⬇️ MIGRAÇÃO ⬇️

┌─────────────────────────────────────────────────────────┐
│              AGORA (SQL Relacional)                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  organizations ──┬──> users                            │
│                  ├──> locations                        │
│                  ├──> properties ──┬──> listings       │
│                  │                 ├──> rooms          │
│                  │                 ├──> reservations   │
│                  │                 └──> blocks         │
│                  ├──> guests                           │
│                  └──> chat_channels_config             │
│                                                         │
│  35 TABELAS ESTRUTURADAS COM FOREIGN KEYS              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 TABELAS POR CATEGORIA

### **🏢 Core (5 tabelas)**
```
organizations ──┐
users ──────────┤
invitations ────┤
permissions ────┤
activity_logs ──┘
```

### **🏠 Propriedades (7 tabelas)**
```
properties ──┬──> listings ──┬──> accommodation_rules
             │               └──> pricing_settings
             ├──> rooms ─────┬──> beds
             │               └──> room_photos
             └──> locations
```

### **📅 Reservas (3 tabelas)**
```
reservations ──┬──> guests
               └──> blocks
```

### **💰 Precificação (3 tabelas)**
```
pricing_settings
custom_prices
custom_min_nights
```

### **💬 Chat (6 tabelas)**
```
chat_channels_config ──┬──> chat_conversations ──┬──> chat_messages
                       │                        └──> chat_contacts
                       ├──> chat_message_templates
                       └──> chat_webhooks
```

### **📱 WhatsApp (2 tabelas)**
```
evolution_instances
evolution_instances_backup
```

### **🔗 Integrações (5 tabelas)**
```
staysnet_config ──┬──> staysnet_webhooks
                  ├──> staysnet_sync_log
                  ├──> staysnet_reservations_cache
                  └──> staysnet_properties_cache
```

### **🛠️ Utilitários (2 tabelas)**
```
short_ids
kv_store_67caf26a (legado?)
```

---

## ⚠️ MUDANÇAS CRÍTICAS

### **1. evolution_instances**

**❌ ANTES:**
```sql
user_id INTEGER NOT NULL UNIQUE  -- Multi-tenant por usuário
```

**✅ AGORA:**
```sql
-- user_id REMOVIDO
instance_token TEXT  -- Novo campo
```

**⚠️ IMPACTO:** Perdeu isolamento por usuário

---

### **2. Duas Tabelas WhatsApp Config**

**Tabela Antiga:**
```
organization_channel_config
  - organization_id TEXT
  - Campos básicos
```

**Tabela Nova:**
```
chat_channels_config
  - organization_id UUID (FK)
  - Campos completos
  - webhook_url, webhook_events
```

**⚠️ DECISÃO:** Qual usar? Migrar dados?

---

### **3. Estrutura de Usuários**

**Supabase Auth:**
```
public.users
  - id BIGINT (auto)
```

**Custom:**
```
users
  - id UUID (referencia auth.users)
  - organization_id UUID (FK)
  - email, metadata
```

---

## 🔗 RELACIONAMENTOS PRINCIPAIS

```
organizations (1)
  │
  ├── users (N)
  │   └── organization_id → organizations.id
  │
  ├── locations (N)
  │   └── organization_id → organizations.id
  │
  ├── properties (N)
  │   ├── organization_id → organizations.id
  │   ├── owner_id → users.id
  │   ├── location_id → locations.id
  │   │
  │   ├── listings (N)
  │   │   ├── organization_id → organizations.id
  │   │   ├── accommodation_id → properties.id
  │   │   ├── owner_id → users.id
  │   │   │
  │   │   ├── accommodation_rules (1)
  │   │   │   ├── organization_id → organizations.id
  │   │   │   └── listing_id → listings.id
  │   │   │
  │   │   └── pricing_settings (1)
  │   │       ├── organization_id → organizations.id
  │   │       └── listing_id → listings.id
  │   │
  │   ├── rooms (N)
  │   │   ├── organization_id → organizations.id
  │   │   ├── accommodation_id → properties.id
  │   │   │
  │   │   ├── beds (N)
  │   │   │   └── room_id → rooms.id
  │   │   │
  │   │   └── room_photos (N)
  │   │       └── room_id → rooms.id
  │   │
  │   ├── reservations (N)
  │   │   ├── organization_id → organizations.id
  │   │   ├── property_id → properties.id
  │   │   └── guest_id → guests.id
  │   │
  │   └── blocks (N)
  │       ├── organization_id → organizations.id
  │       └── property_id → properties.id
  │
  ├── guests (N)
  │   └── organization_id → organizations.id
  │
  └── chat_channels_config (1)
      └── organization_id → organizations.id
          │
          └── chat_conversations (N)
              ├── organization_id → organizations.id
              ├── guest_id → guests.id
              ├── reservation_id → reservations.id
              ├── property_id → properties.id
              │
              └── chat_messages (N)
                  ├── organization_id → organizations.id
                  ├── conversation_id → chat_conversations.id
                  └── reply_to_id → chat_messages.id
```

---

## 📊 ESTATÍSTICAS

| Categoria | Quantidade |
|-----------|------------|
| **Total de Tabelas** | 35 |
| **Tabelas Core** | 5 |
| **Tabelas Propriedades** | 7 |
| **Tabelas Reservas** | 3 |
| **Tabelas Chat** | 6 |
| **Tabelas Integrações** | 5 |
| **Foreign Keys** | ~50+ |
| **CHECK Constraints** | ~30+ |
| **Campos ARRAY** | ~15+ |

---

## ✅ PRÓXIMOS PASSOS

1. **Decidir sobre `evolution_instances`**
   - Manter sem user_id?
   - Ou adicionar de volta?

2. **Resolver duplicação WhatsApp Config**
   - Usar apenas `chat_channels_config`?
   - Migrar dados de `organization_channel_config`?

3. **Migrar dados do KV Store**
   - Script de migração
   - Validar integridade

4. **Adicionar índices**
   - Performance
   - Queries comuns

5. **Implementar RLS**
   - Segurança
   - Multi-tenant

6. **Atualizar Backend**
   - Rotas para tabelas relacionais
   - Remover lógica KV Store

---

**Status:** ✅ Schema Analisado  
**Próximo:** Decisões arquiteturais

