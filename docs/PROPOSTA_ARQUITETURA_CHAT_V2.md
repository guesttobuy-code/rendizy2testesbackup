# 📋 PROPOSTA: Arquitetura Chat Multi-Tenant V2

**Data:** 2026-01-22  
**Autor:** Análise Claude (GitHub Copilot)  
**Status:** APROVADO - Implementação iniciada

---

## 🎯 VISÃO GERAL

Sistema de chat unificado multi-tenant que suporta múltiplos canais de comunicação:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CHAT UNIFICADO                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         UI (React)                                   │    │
│  │   ConversationList │ MessageView │ QuickActions │ Settings          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                  │                                           │
│                                  ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    ADAPTER LAYER (Cápsulas)                          │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐│    │
│  │  │ Evolution│  │   WAHA   │  │  Airbnb  │  │ Booking  │  │  SMS   ││    │
│  │  │  Adapter │  │  Adapter │  │  Adapter │  │  Adapter │  │ Adapter││    │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘│    │
│  └───────┼─────────────┼─────────────┼─────────────┼────────────┼─────┘    │
│          │             │             │             │            │           │
│          ▼             ▼             ▼             ▼            ▼           │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     UNIFIED MESSAGE MODEL                             │   │
│  │   UnifiedContact │ UnifiedMessage │ UnifiedConversation              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                  │                                           │
│                                  ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        BANCO DE DADOS                                 │   │
│  │   channel_instances │ conversations │ messages │ contacts            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Canais Suportados

| Canal | Tipo | Providers | Status |
|-------|------|-----------|--------|
| **WhatsApp** | Mensageria | Evolution API, WAHA | 🟡 Em refatoração |
| **Airbnb** | OTA | Airbnb API | 🔴 Futuro |
| **Booking** | OTA | Booking.com | 🔴 Futuro |
| **SMS** | Mensageria | Twilio, Vonage | 🔴 Futuro |
| **Email** | Email | SMTP/IMAP | 🔴 Futuro |
| **Site** | Chat interno | WebSocket | 🔴 Futuro |

---

## 📊 DIAGNÓSTICO DA SITUAÇÃO ATUAL

### Estatísticas do Banco
- **327 conversas** na tabela `conversations`
- **2 organizações** (Rendizy teste + Sua Casa Mobiliada)
- **1 instância WhatsApp** compartilhada entre orgs (❌ PROBLEMA)

### Problemas Identificados

| # | Problema | Impacto | Severidade |
|---|----------|---------|------------|
| 1 | Duas orgs com mesma `whatsapp_instance_name` | Mensagens vão para org errada | 🔴 CRÍTICO |
| 2 | Sem UNIQUE constraint no `instance_name` | Permite duplicatas | 🔴 CRÍTICO |
| 3 | Código usa `.find()` que pega primeiro match | Não determinístico | 🟠 ALTO |
| 4 | Tabela única `organization_channel_config` | Mistura WhatsApp, SMS, Email | 🟠 ALTO |
| 5 | Frontend mistura lógica de dados com UI | 1208 linhas no ChatInbox.tsx | 🟡 MÉDIO |
| 6 | Contatos @lid tratados como telefone | IDs internos vazam para UI | 🟡 MÉDIO |

---

## 🏗️ ARQUITETURA ATUAL

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
├─────────────────────────────────────────────────────────────────┤
│  ChatModule.tsx                                                  │
│       └── ChatInboxWithEvolution.tsx                            │
│               └── ChatInbox.tsx (1208 linhas!)                  │
│                       ├── WhatsAppConversation.tsx              │
│                       ├── ChatFilterSidebar.tsx                 │
│                       └── hooks/useChatData.ts                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE EDGE FUNCTIONS                       │
├─────────────────────────────────────────────────────────────────┤
│  routes-chat.ts (1650 linhas!)                                  │
│       ├── GET /conversations                                    │
│       ├── GET /conversations/:id                                │
│       ├── POST /conversations/:id/messages                      │
│       └── POST /channels/whatsapp/webhook                       │
│                                                                  │
│  routes-whatsapp-evolution.ts (1500+ linhas)                    │
│       ├── GET /contacts                                         │
│       ├── POST /send-message                                    │
│       └── POST /webhook (DUPLICADO! ❌)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BANCO DE DADOS                              │
├─────────────────────────────────────────────────────────────────┤
│  organizations                                                   │
│       └── id (UUID)                                             │
│       └── name                                                  │
│                                                                  │
│  organization_channel_config (MISTURA TUDO!)                    │
│       └── organization_id (FK)                                  │
│       └── whatsapp_enabled, whatsapp_api_url, whatsapp_instance │
│       └── sms_enabled, sms_account_sid, sms_auth_token          │
│       └── automation_* (configs de automação)                   │
│       └── SEM UNIQUE em whatsapp_instance_name! ❌              │
│                                                                  │
│  conversations                                                   │
│       └── organization_id (FK)                                  │
│       └── external_conversation_id (JID do WhatsApp)           │
│       └── guest_name, guest_phone, guest_email                  │
│       └── channel, status, category                             │
│       └── last_message, last_message_at                         │
│                                                                  │
│  messages                                                        │
│       └── organization_id (FK) - REDUNDÂNCIA!                   │
│       └── conversation_id (FK)                                  │
│       └── content, direction, channel                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EVOLUTION API                                 │
├─────────────────────────────────────────────────────────────────┤
│  http://76.13.82.60:8080                                        │
│       └── instance: rendizy-admin-master                        │
│       └── Webhook → Supabase Edge Function                      │
│       └── 4184 contatos, 322 chats, 107 mensagens               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 ARQUITETURA PROPOSTA V2

### Princípios

1. **Uma instância WhatsApp = Uma organização** (1:1 ESTRITO)
2. **Separação de responsabilidades** (cada canal tem sua tabela)
3. **Constraints no banco** (impossível duplicar)
4. **Adapters para cada provider** (Evolution, Z-API, Twilio...)
5. **Frontend desacoplado** (componentes menores, hooks especializados)

### Novo Modelo de Dados

```sql
-- ============================================================
-- 1. TABELA DE INSTÂNCIAS WHATSAPP (NOVA)
-- ============================================================
CREATE TABLE whatsapp_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    
    -- Identificação única da instância
    instance_name VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'evolution', -- evolution, z-api, twilio, etc
    
    -- Conexão
    api_url VARCHAR(500) NOT NULL,
    api_key VARCHAR(500) NOT NULL,
    instance_token VARCHAR(500),
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'disconnected', -- connected, disconnected, qr_pending
    phone_number VARCHAR(20), -- Preenchido após conectar
    profile_name VARCHAR(255),
    profile_picture_url TEXT,
    
    -- Webhook
    webhook_url TEXT,
    webhook_events JSONB DEFAULT '[]',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_connected_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    
    -- ✅ CONSTRAINT CRÍTICA: Uma instância por organização
    CONSTRAINT uq_whatsapp_instance_name UNIQUE (instance_name),
    CONSTRAINT uq_org_whatsapp_instance UNIQUE (organization_id, deleted_at)
);

-- Índices
CREATE INDEX idx_whatsapp_instances_org ON whatsapp_instances(organization_id);
CREATE INDEX idx_whatsapp_instances_name ON whatsapp_instances(instance_name) WHERE deleted_at IS NULL;

-- ============================================================
-- 2. TABELA DE CONTATOS WHATSAPP (NOVA)
-- ============================================================
CREATE TABLE whatsapp_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES whatsapp_instances(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    
    -- Identificação WhatsApp
    jid VARCHAR(100) NOT NULL, -- 5521999999999@s.whatsapp.net
    jid_type VARCHAR(20) NOT NULL DEFAULT 'user', -- user, group, broadcast, lid
    
    -- Dados do contato
    phone_number VARCHAR(20), -- NULL para grupos/lid
    push_name VARCHAR(255),
    saved_name VARCHAR(255),
    profile_picture_url TEXT,
    
    -- Metadata
    is_business BOOLEAN DEFAULT FALSE,
    is_enterprise BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ,
    
    -- ✅ CONSTRAINT: JID único por instância
    CONSTRAINT uq_contact_jid_instance UNIQUE (instance_id, jid)
);

-- Índices
CREATE INDEX idx_whatsapp_contacts_instance ON whatsapp_contacts(instance_id);
CREATE INDEX idx_whatsapp_contacts_jid ON whatsapp_contacts(jid);
CREATE INDEX idx_whatsapp_contacts_phone ON whatsapp_contacts(phone_number) WHERE phone_number IS NOT NULL;

-- ============================================================
-- 3. CONVERSAS REFATORADA
-- ============================================================
-- Manter conversations mas simplificar:
-- - Remover campos redundantes
-- - Adicionar foreign key para whatsapp_contact

ALTER TABLE conversations ADD COLUMN whatsapp_contact_id UUID REFERENCES whatsapp_contacts(id);
ALTER TABLE conversations ADD COLUMN whatsapp_instance_id UUID REFERENCES whatsapp_instances(id);

-- ============================================================
-- 4. VIEW PARA CONSULTA OTIMIZADA
-- ============================================================
CREATE OR REPLACE VIEW v_conversations_with_contacts AS
SELECT 
    c.id,
    c.organization_id,
    c.status,
    c.category,
    c.last_message,
    c.last_message_at,
    c.unread_count,
    c.created_at,
    
    -- Dados do contato WhatsApp
    wc.jid,
    wc.jid_type,
    wc.phone_number,
    COALESCE(wc.saved_name, wc.push_name, wc.phone_number, 'Desconhecido') AS display_name,
    wc.profile_picture_url,
    wc.is_blocked,
    
    -- Dados da instância
    wi.instance_name,
    wi.provider,
    wi.status AS instance_status
    
FROM conversations c
LEFT JOIN whatsapp_contacts wc ON c.whatsapp_contact_id = wc.id
LEFT JOIN whatsapp_instances wi ON c.whatsapp_instance_id = wi.id
WHERE c.channel = 'whatsapp';
```

### Nova Estrutura de Código

```
/supabase/functions/rendizy-server/
├── index.ts                        # Router principal
├── routes/
│   ├── chat.ts                     # Rotas genéricas de chat
│   ├── whatsapp.ts                 # Rotas WhatsApp
│   └── webhooks.ts                 # Webhooks de todos os providers
├── adapters/
│   ├── base-adapter.ts             # Interface base
│   ├── evolution-adapter.ts        # Evolution API v2
│   ├── z-api-adapter.ts            # Z-API (futuro)
│   └── twilio-adapter.ts           # Twilio WhatsApp (futuro)
├── services/
│   ├── conversation-service.ts     # CRUD de conversas
│   ├── message-service.ts          # CRUD de mensagens
│   └── contact-service.ts          # CRUD de contatos
└── repositories/
    ├── conversation-repository.ts
    ├── message-repository.ts
    └── whatsapp-instance-repository.ts

/components/chat/
├── ChatPage.tsx                    # Container principal (~50 linhas)
├── ConversationList/
│   ├── index.tsx                   # Lista de conversas
│   ├── ConversationItem.tsx        # Item individual
│   └── ConversationFilters.tsx     # Filtros
├── ConversationView/
│   ├── index.tsx                   # Área de conversa
│   ├── MessageList.tsx             # Lista de mensagens
│   ├── MessageInput.tsx            # Input de mensagem
│   └── ConversationHeader.tsx      # Header com info do contato
├── hooks/
│   ├── useConversations.ts         # Gerencia lista
│   ├── useMessages.ts              # Gerencia mensagens
│   └── useWhatsAppStatus.ts        # Status da conexão
└── types.ts                        # Tipos TypeScript
```

---

## 📋 PLANO DE MIGRAÇÃO

### Fase 1: Banco de Dados (1-2 dias)
1. ✅ Criar tabela `channel_instances` (substitui `whatsapp_instances`)
2. ✅ Criar tabela `channel_contacts`
3. ⏳ Migrar dados de `organization_channel_config`
4. ✅ Adicionar constraints UNIQUE
5. ✅ Criar views otimizadas

**Arquivo criado:** `supabase/migrations/20260122_chat_v2_schema.sql`

### Fase 2: Backend - Adapters (2-3 dias)
1. ✅ Criar interface `IChatAdapter` em `types.ts`
2. ✅ Implementar `EvolutionAdapter` (Evolution API v2)
3. ✅ Implementar `WahaAdapter` (WAHA)
4. ✅ Implementar `AirbnbAdapter` (via Stays.net)
5. ✅ Implementar `BookingAdapter` (via Stays.net)
6. ✅ Implementar `SmsAdapter` (Twilio/Vonage)
7. ✅ Criar `AdapterRegistry` (factory e detecção)
8. ⏳ Refatorar webhook para usar adapters
9. ⏳ Criar services desacoplados
10. ⏳ Testes unitários

**Arquivos criados:**
```
supabase/functions/rendizy-server/adapters/chat/
├── types.ts              # Tipos unificados e interface IChatAdapter
├── evolution-adapter.ts  # Adapter Evolution API v2
├── waha-adapter.ts       # Adapter WAHA
├── airbnb-adapter.ts     # Adapter Airbnb (Stays.net)
├── booking-adapter.ts    # Adapter Booking.com (Stays.net)
├── sms-adapter.ts        # Adapter SMS (Twilio/Vonage)
└── index.ts              # Registry e exports
```

### Fase 3: Frontend (3-4 dias)
1. ⏳ Criar novos componentes modulares
2. ⏳ Criar hooks especializados
3. ⏳ Migrar ChatInbox.tsx para nova estrutura
4. ⏳ Criar modal de configuração por provider
5. ⏳ Remover código legado
6. ⏳ Testes e2e

### Fase 4: Multi-tenant (1-2 dias)
1. ⏳ UI para criar nova instância WhatsApp
2. ⏳ Fluxo de QR Code por organização
3. ⏳ Dashboard de status das instâncias
4. ⏳ Modal separado para cada provider (Evolution, WAHA)

---

## ✅ BENEFÍCIOS ESPERADOS

| Métrica | Antes | Depois |
|---------|-------|--------|
| Linhas ChatInbox.tsx | 1208 | ~200 |
| Linhas routes-chat.ts | 1650 | ~400 |
| Instâncias por org | Indefinido | 1 (GARANTIDO) |
| Tempo para adicionar provider | ~2 dias | ~4 horas |
| Bugs de org errada | Frequente | IMPOSSÍVEL |
| Canais suportados | 1 (WhatsApp) | 6 (WhatsApp, Airbnb, Booking, SMS, Email, Site) |

---

## 🧩 ARQUITETURA DE ADAPTERS

### Interface IChatAdapter

Cada adapter de canal implementa a interface `IChatAdapter` com os seguintes métodos:

```typescript
interface IChatAdapter {
  // Identificação
  readonly name: string;
  readonly channel: ChannelType;
  readonly provider: string;
  
  // Parsing (Webhook → Unified)
  parseWebhook(payload: unknown): WebhookPayload | null;
  parseContact(data: unknown): Partial<UnifiedContact> | null;
  parseMessage(data: unknown): Partial<UnifiedMessage> | null;
  
  // Validação
  isValidContact(data: unknown): boolean;
  shouldProcessMessage(data: unknown): boolean;
  extractPhoneNumber(identifier: string): string | null;
  
  // Envio
  sendText(instance, recipientId, text, options?): Promise<SendMessageResult>;
  sendMedia(instance, recipientId, attachment, caption?): Promise<SendMessageResult>;
  
  // Status
  checkConnection(instance): Promise<{connected, phoneNumber?, profileName?, error?}>;
  getQrCode?(instance): Promise<{qrCode?, pairingCode?, error?}>;
  setupWebhook?(instance, webhookUrl, events): Promise<{success, error?}>;
}
```

### Adapters Implementados

| Adapter | Canal | Provider | Envio | Recebimento | Status |
|---------|-------|----------|-------|-------------|--------|
| `EvolutionAdapter` | WhatsApp | evolution | ✅ | ✅ | ✅ Pronto |
| `WahaAdapter` | WhatsApp | waha | ✅ | ✅ | ✅ Pronto |
| `AirbnbAdapter` | Airbnb | stays.net | ⚠️ | ✅ | ⏳ Parcial |
| `BookingAdapter` | Booking | stays.net | ⚠️ | ✅ | ⏳ Parcial |
| `SmsAdapter` | SMS | twilio | ✅ | ✅ | ✅ Pronto |

### Uso do Registry

```typescript
import { adapterRegistry, processIncomingWebhook } from './adapters/chat';

// Detectar adapter pelo payload
const adapter = adapterRegistry.detectFromPayload(webhookPayload);

// Obter adapter por channel + provider
const evolution = adapterRegistry.get('whatsapp', 'evolution');
const waha = adapterRegistry.get('whatsapp', 'waha');

// Listar providers de um canal
const whatsappProviders = adapterRegistry.getProviders('whatsapp');
// ['evolution', 'waha']

// Processar webhook completo
const result = await processIncomingWebhook(payload, instances);
```

---

## 🔄 COMPARAÇÃO: Evolution API vs WAHA

| Aspecto | Evolution API v2 | WAHA |
|---------|-----------------|------|
| **Auth Header** | `apikey: xxx` | `X-Api-Key: xxx` |
| **Identificador** | `instance` | `session` |
| **Endpoint envio** | `POST /message/sendText/{instance}` | `POST /api/sendText` |
| **Body envio** | `{number, text}` | `{session, chatId, text}` |
| **chatId format** | `@s.whatsapp.net` | `@c.us` |
| **Webhook event** | `messages.upsert` | `message` |
| **QR Code** | `GET /instance/connect/{instance}` | `GET /api/sessions/{session}/auth/qr` |
| **Status** | `GET /instance/connectionState/{instance}` | `GET /api/sessions/{session}` |
| **Licença** | MIT (Open Source) | Apache 2.0 (Open Source) |
| **Multi-device** | ✅ | ✅ |

---

## ❓ DECISÕES PENDENTES

1. **Manter Evolution API ou migrar para outra?**
   - Evolution: Open source, auto-hospedado
   - Z-API: SaaS, mais estável, pago
   - Twilio: Enterprise, caro

2. **Onde hospedar múltiplas instâncias?**
   - Opção A: Um Evolution por organização (custoso)
   - Opção B: Evolution multi-tenant (requer configuração)
   - Opção C: API oficial Meta Business (requer aprovação)

3. **Histórico de mensagens?**
   - Sincronizar tudo da Evolution?
   - Só mensagens novas após conectar?

---

## 🚀 PRÓXIMOS PASSOS

Se aprovado, começamos pela **Fase 1** (banco de dados) que pode ser feita sem afetar o sistema atual.

Aguardo sua decisão! 🎯
