# ADR-010: Chat Multi-Provider Architecture

## Status
**IMPLEMENTED** - 2026-01-24 (commit b683b66)

## Context

O sistema Rendizy precisa suportar múltiplos canais de comunicação com hóspedes:
- **WhatsApp** (via Evolution API ou WAHA)
- **Airbnb** (mensagens do app)
- **Booking.com** (mensagens do extranet)
- **SMS** (para números internacionais)
- **Email** (futuro)

Cada canal tem APIs completamente diferentes, mas o frontend precisa de uma interface unificada.

### Problema Atual
O código atual (`whatsappChatApi.ts`) assume que sempre vai usar WAHA, mesmo quando a instância configurada é Evolution API. Isso causa:
1. Mensagens não carregando (JID format mismatch: `@c.us` vs `@s.whatsapp.net`)
2. Envios falhando
3. Código espalhado e difícil de manter

## Decision

Implementar arquitetura **Strategy Pattern + Registry Pattern** com:

### 1. Camada de Abstração (Interface Unificada)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                     │
│                    (ChatInbox, WhatsAppConversation)                │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     CHAT UNIFIED LAYER                               │
│                   (utils/chat/unifiedChatService.ts)                │
│                                                                      │
│  • getActiveProviders(): Provider[]                                  │
│  • fetchConversations(channel?): Conversation[]                     │
│  • fetchMessages(conversationId): Message[]                         │
│  • sendMessage(conversationId, content): Result                     │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       PROVIDER REGISTRY                              │
│                     (utils/chat/registry.ts)                         │
│                                                                      │
│  • register(provider): void                                          │
│  • get(channel): Provider                                           │
│  • getEnabled(): Provider[]                                         │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
┌───────────────┐    ┌───────────────────┐    ┌──────────────────┐
│   WhatsApp    │    │      Airbnb       │    │    Booking       │
│   Provider    │    │      Provider     │    │    Provider      │
│               │    │                   │    │                  │
│ ┌───────────┐ │    │  ┌─────────────┐  │    │ ┌──────────────┐ │
│ │ Evolution │ │    │  │ Airbnb API  │  │    │ │ Booking API  │ │
│ │   Adapter │ │    │  │   Adapter   │  │    │ │   Adapter    │ │
│ └───────────┘ │    │  └─────────────┘  │    │ └──────────────┘ │
│ ┌───────────┐ │    │                   │    │                  │
│ │   WAHA    │ │    │                   │    │                  │
│ │   Adapter │ │    │                   │    │                  │
│ └───────────┘ │    │                   │    │                  │
└───────────────┘    └───────────────────┘    └──────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       DATABASE (Supabase)                            │
│                                                                      │
│  channel_instances  │  conversations  │  messages  │  contacts      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. Sub-Provider Pattern para WhatsApp

Como WhatsApp pode ter múltiplos backends (Evolution, WAHA, Cloud API), usamos adapters internos:

```typescript
// Detecção automática baseada em channel_instances
async function getWhatsAppAdapter(orgId: string): Promise<WhatsAppAdapter> {
  const instance = await getActiveInstance(orgId, 'whatsapp');
  
  if (instance.provider === 'evolution') {
    return new EvolutionAdapter(instance);
  } else if (instance.provider === 'waha') {
    return new WahaAdapter(instance);
  }
  
  throw new Error('No WhatsApp provider configured');
}
```

### 3. JID Normalization

Cada adapter normaliza JIDs para seu formato esperado:

| Provider   | User Format              | Group Format       |
|------------|--------------------------|-------------------|
| Evolution  | `5521999@s.whatsapp.net` | `123456@g.us`     |
| WAHA       | `5521999@c.us`           | `123456@g.us`     |
| Cloud API  | `5521999`                | `group_id`        |

**⚠️ IMPORTANTE - Quirks da Evolution API descobertos em 2026-01-24:**

1. **Chat IDs**: Evolution retorna `remoteJid` (não `id`) como o WhatsApp JID:
   ```typescript
   // Errado: raw.id → retorna ID interno do banco
   // Correto: raw.remoteJid → retorna o JID do WhatsApp
   const jid = raw.remoteJid || raw.id;
   ```

2. **Messages Response**: Evolution retorna nested object:
   ```typescript
   // Response structure:
   { messages: { records: [...] } }
   // NÃO:
   { messages: [...] }
   
   // Parse correto:
   const msgs = response.messages?.records || response.messages || [];
   ```

```typescript
interface WhatsAppAdapter {
  normalizeJid(input: string): string;
  fetchMessages(jid: string, limit?: number): Promise<Message[]>;
  sendText(jid: string, text: string): Promise<Result>;
}
```

### 4. Database Schema

```sql
-- channel_instances: configuração de cada canal/provider
CREATE TABLE channel_instances (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  channel TEXT NOT NULL,           -- 'whatsapp', 'airbnb', 'booking', 'sms'
  provider TEXT NOT NULL,          -- 'evolution', 'waha', 'airbnb', 'booking_api'
  instance_name TEXT NOT NULL,     -- ex: 'org-00000000-mkt36t2s'
  status TEXT DEFAULT 'disconnected',
  phone_number TEXT,
  api_url TEXT,
  api_key TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- conversations: conversas de TODOS os canais
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  channel TEXT NOT NULL,           -- de qual canal veio
  external_conversation_id TEXT,   -- JID/thread_id/etc
  guest_name TEXT,
  guest_phone TEXT,
  guest_email TEXT,
  channel_metadata JSONB,          -- dados específicos do canal
  last_message JSONB,
  last_message_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,
  instance_id UUID REFERENCES channel_instances(id)
);
```

## Consequences

### Positivas
1. **Escalabilidade**: Adicionar novo canal = criar novo provider + adapter
2. **Manutenibilidade**: Código isolado por responsabilidade
3. **Testabilidade**: Cada adapter pode ser testado isoladamente
4. **Flexibilidade**: Trocar WAHA por Evolution sem mudar frontend
5. **Observabilidade**: Logs estruturados por provider/canal

### Negativas
1. **Complexidade inicial**: Mais arquivos e indireções
2. **Overhead**: Detecção de provider a cada request (mitigado com cache)

## Implementation Plan

### Fase 1 (Concluída - 2026-01-24)
- [x] Criar ADR-010
- [x] Implementar `EvolutionAdapter` com JID correto
- [x] Implementar `WahaAdapter` mantendo código atual
- [x] Criar `WhatsAppProviderFactory` com detecção automática
- [x] Corrigir `normalizeChat()` para usar `remoteJid`
- [x] Corrigir `fetchMessages()` para parse de `messages.records`
- [x] Criar `useChatPolling` hook unificado
- [x] Criar `instanceCleanupService` para ghost instances
- [x] Atualizar `ChatMessagePanel` para usar polling unificado
- [x] Adicionar UI de filtro por provider em `ChatConversationList`
- [x] Commit & push (b683b66)

### Fase 2 (Próxima)
- [ ] Implementar Airbnb Provider (API webhook)
- [ ] Implementar Booking Provider (API/scraping)

### Fase 3 (Futuro)
- [ ] SMS Provider (Twilio/MessageBird)
- [ ] Email Provider (integração com inbox)

## Related Documents

- [ADR-007: Chat Module WAHA Integration](./ADR-007-CHAT-MODULE-WAHA-INTEGRATION.md)
- [ADR-009: WhatsApp Multi-Provider](./ADR-009-WHATSAPP-MULTI-PROVIDER.md)
- [MIGRATION-WAHA-TO-EVOLUTION.md](../MIGRATION-WAHA-TO-EVOLUTION.md)

## Code References

```
src/
├── components/chat/
│   ├── ChatConversationList.tsx   # Lista + filtro provider (ATUALIZADO)
│   ├── ChatMessagePanel.tsx       # Painel mensagens + useChatPolling (ATUALIZADO)
│   └── ChatInbox.tsx              # Inbox principal
├── hooks/
│   ├── useChatPolling.ts          # NOVO - Hook unificado Evolution+WAHA
│   └── useWahaPolling.ts          # Legacy - ainda funciona
└── utils/chat/
    ├── index.ts                    # Entry point e exports
    ├── types.ts                    # Interfaces e tipos
    ├── registry.ts                 # Provider registry
    ├── unifiedChatService.ts       # Serviço unificado (ATUALIZADO)
    ├── instanceCleanupService.ts   # NOVO - Cleanup ghost instances
    ├── providers/
    │   ├── index.ts
    │   ├── whatsapp.ts             # WhatsApp provider
    │   ├── airbnb.ts               # Airbnb provider (stub)
    │   └── booking.ts              # Booking provider (stub)
    └── adapters/
        ├── index.ts                # Adapter exports + factory
        ├── evolutionAdapter.ts     # Evolution API adapter (CORRIGIDO)
        ├── wahaAdapter.ts          # WAHA adapter
        └── types.ts                # Adapter interfaces
```

---

**Author**: GitHub Copilot  
**Reviewers**: Equipe Rendizy  
**Last Updated**: 2026-01-24 17:30
