# ADR-009: Arquitetura WhatsApp Multi-Provider (WAHA vs Evolution)

## Status: ✅ APROVADO E IMPLEMENTADO
**Data:** 2026-01-23  
**Versão:** 1.0.0  
**Autor:** Rendizy AI Architecture Team

---

## 1. Contexto

O Rendizy PMS suporta integração com WhatsApp através de dois providers:

| Provider | Descrição | Porta | Status |
|----------|-----------|-------|--------|
| **WAHA** | WhatsApp HTTP API (open-source) | 3001 | ✅ Preferencial |
| **Evolution API** | API Evolution (legado) | 8080 | ⚠️ Legado |

### Problema Anterior
O código estava **monolítico** - o endpoint `/whatsapp/chats` só chamava Evolution API, mesmo quando a organização tinha WAHA configurado. Isso causava:
- Chat vazio para usuários WAHA
- Duplicação de código
- Confusão para manutenção

---

## 2. Decisão

### Arquitetura de Cápsulas Separadas

Implementamos **detecção automática de provider** no backend. O fluxo é:

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND                                │
│  ChatConversationList.tsx / SimpleChatInbox.tsx             │
│                         │                                    │
│                         ▼                                    │
│           fetchWhatsAppChats() ou chatUnifiedApi            │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND                                 │
│           GET /whatsapp/chats                               │
│                         │                                    │
│                         ▼                                    │
│         detectActiveWhatsAppProvider(orgId)                 │
│                         │                                    │
│            ┌────────────┴────────────┐                      │
│            │                         │                      │
│            ▼                         ▼                      │
│    ┌───────────────┐        ┌───────────────┐              │
│    │  CÁPSULA WAHA │        │CÁPSULA EVOLUT.│              │
│    │               │        │               │              │
│    │ Busca do banco│        │ Busca da API  │              │
│    │ conversations │        │ Evolution API │              │
│    └───────────────┘        └───────────────┘              │
│            │                         │                      │
│            └────────────┬────────────┘                      │
│                         ▼                                    │
│              Resposta Unificada JSON                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Componentes da Arquitetura

### 3.1. Backend (Edge Functions)

#### Arquivo: `routes-whatsapp-evolution.ts`

| Função | Tag | Descrição |
|--------|-----|-----------|
| `detectActiveWhatsAppProvider()` | `@CAPSULE:PROVIDER-DETECT` | Detecta WAHA vs Evolution |
| `getConversationsFromDatabase()` | `@CAPSULE:WAHA-DATA` | Busca do banco para WAHA |
| `handleGetWhatsAppChats()` | `@CAPSULE:UNIFIED-CHATS` | Endpoint unificado |

#### Arquivo: `routes-chat.ts`

| Função | Tag | Descrição |
|--------|-----|-----------|
| `processWahaWebhook()` | `@CAPSULE:WAHA-WEBHOOK` | Processa webhooks WAHA |
| `GET /conversations` | `@CAPSULE:DB-CONVERSATIONS` | Busca direta do banco |

### 3.2. Frontend (React)

#### Arquivo: `chatUnifiedApi.ts` (NOVO)

| Função | Tag | Descrição |
|--------|-----|-----------|
| `detectProvider()` | `@CAPSULE:FRONTEND-DETECT` | Detecta provider no frontend |
| `fetchConversations()` | `@CAPSULE:UNIFIED-FETCH` | Busca unificada |
| `sendMessage()` | `@CAPSULE:UNIFIED-SEND` | Envia via provider correto |

### 3.3. Tabelas do Banco

| Tabela | Uso |
|--------|-----|
| `channel_instances` | Configuração de providers (WAHA/Evolution) |
| `conversations` | Conversas unificadas de AMBOS providers |
| `messages` | Mensagens de ambos providers |

---

## 4. Tags de Contrato (Para IAs)

### Tags Obrigatórias no Código

```typescript
// ============================================================================
// @ARCHITECTURE: WHATSAPP-MULTI-PROVIDER
// @ADR: docs/ADR/ADR-009-WHATSAPP-MULTI-PROVIDER.md
// @CAPSULE: [NOME-DA-CÁPSULA]
// ============================================================================
```

### Lista de Tags Válidas

| Tag | Arquivo | Significado |
|-----|---------|-------------|
| `@CAPSULE:PROVIDER-DETECT` | routes-whatsapp-evolution.ts | Detecção de provider |
| `@CAPSULE:WAHA-DATA` | routes-whatsapp-evolution.ts | Dados específicos WAHA |
| `@CAPSULE:EVOLUTION-DATA` | routes-whatsapp-evolution.ts | Dados específicos Evolution |
| `@CAPSULE:UNIFIED-CHATS` | routes-whatsapp-evolution.ts | Endpoint unificado |
| `@CAPSULE:WAHA-WEBHOOK` | routes-chat.ts | Webhook WAHA |
| `@CAPSULE:FRONTEND-DETECT` | chatUnifiedApi.ts | Detecção frontend |
| `@CAPSULE:UNIFIED-FETCH` | chatUnifiedApi.ts | Fetch unificado |
| `@CAPSULE:UNIFIED-SEND` | chatUnifiedApi.ts | Send unificado |

---

## 5. Regras para IAs (IMPORTANTE)

### ❌ NUNCA FAZER

1. **Nunca assumir que só existe Evolution API**
2. **Nunca chamar Evolution API sem verificar provider primeiro**
3. **Nunca ignorar a tabela `channel_instances`**
4. **Nunca criar endpoints duplicados para WAHA/Evolution**

### ✅ SEMPRE FAZER

1. **Sempre usar `detectActiveWhatsAppProvider()` no backend**
2. **Sempre usar `detectProvider()` no frontend**
3. **Sempre verificar `channel_instances.provider`**
4. **Sempre manter as cápsulas separadas**

---

## 6. Fluxo de Dados

### 6.1. Recebimento de Mensagem (Webhook)

```
WhatsApp → WAHA/Evolution → Webhook → processWahaWebhook() → conversations table
```

### 6.2. Listagem de Conversas

```
Frontend → /whatsapp/chats → detectProvider() → 
  - WAHA: SELECT * FROM conversations
  - Evolution: POST /chat/findChats
```

### 6.3. Envio de Mensagem

```
Frontend → sendMessage() → detectProvider() →
  - WAHA: POST /api/sendText
  - Evolution: POST /message/sendText
```

---

## 7. Configuração por Organização

### Tabela: `channel_instances`

```sql
SELECT * FROM channel_instances 
WHERE organization_id = 'xxx' 
  AND channel_type = 'whatsapp';
```

| Campo | Descrição |
|-------|-----------|
| `provider` | 'waha' ou 'evolution' |
| `status` | 'connected', 'disconnected', 'qr_pending', 'error' |
| `instance_name` | Nome da sessão |
| `waha_base_url` | URL do WAHA (se provider=waha) |
| `waha_api_key` | API Key WAHA |
| `api_url` | URL Evolution (se provider=evolution) |
| `api_key` | API Key Evolution |

---

## 8. Testes de Validação

### Teste 1: WAHA Configurado
```bash
# Verificar se provider = 'waha' retorna dados do banco
curl -X GET /whatsapp/chats -H "x-organization-id: ORG_COM_WAHA"
# Esperado: { provider: 'waha', source: 'database', data: [...] }
```

### Teste 2: Evolution Configurado
```bash
# Verificar se provider = 'evolution' retorna dados da API
curl -X GET /whatsapp/chats -H "x-organization-id: ORG_COM_EVOLUTION"
# Esperado: { provider: 'evolution', data: [...] }
```

---

## 9. Histórico de Mudanças

| Data | Versão | Mudança |
|------|--------|---------|
| 2026-01-23 | 1.0.0 | Arquitetura inicial com cápsulas separadas |

---

## 10. Referências

- [ADR-002: WhatsApp Evolution API Connection](./ADR-002-WHATSAPP-EVOLUTION-API-CONNECTION.md)
- [ADR-007: Multi-Channel Chat Architecture](./ADR-007-MULTI-CHANNEL-CHAT-ARCHITECTURE.md)
- [Documentação WAHA](../documentação%20completa%20api%20Waha%20whatsapp.md)
