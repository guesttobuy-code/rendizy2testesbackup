# ADR-007: Arquitetura Multi-Channel Chat

**Data:** 2026-01-22  
**Status:** Implementado  
**Autor:** Sistema Rendizy  
**Versão:** 1.0.0

---

## Contexto

O módulo de Chat do Rendizy estava acoplado diretamente à Evolution API (WhatsApp). Porém, o sistema precisa suportar múltiplos canais de comunicação:

- **WhatsApp** (via Evolution API, WAHA, ou Cloud API)
- **Airbnb** (mensagens de hóspedes)
- **Booking.com** (mensagens de hóspedes)
- **Email** (futuro)
- **Chat interno** (entre equipe)

A lógica específica de cada canal (formato de IDs, parsing de mensagens, etc) estava espalhada pelo código do componente `SimpleChatInbox.tsx`, tornando difícil:

1. Adicionar novos canais
2. Manter cada canal isolado
3. Ter conversas de canais diferentes na mesma inbox

---

## Decisão

Implementar **Arquitetura de Providers Multi-Canal** com:

### 1. Interface Comum (`IChatProvider`)

Todos os providers implementam a mesma interface:

```typescript
interface IChatProvider {
  channel: ChatChannel;
  displayName: string;
  isEnabled(): Promise<boolean>;
  getConversations(orgId: string): Promise<ChatConversation[]>;
  getMessages(convId: string): Promise<ChatMessage[]>;
  sendTextMessage(convId: string, text: string): Promise<ChatMessage>;
  markAsRead(convId: string): Promise<void>;
  parseExternalId(extId: string): ParsedExternalId;
  formatDisplayName(conv: ChatConversation): string;
}
```

### 2. Tipos Unificados (`ChatConversation`, `ChatMessage`)

Conversas e mensagens de qualquer canal usam a mesma estrutura:

```typescript
interface ChatConversation {
  id: string;
  externalId: string;
  channel: ChatChannel;  // 'whatsapp' | 'airbnb' | 'booking' | ...
  guestName: string;
  guestPhone?: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount: number;
  // ...
}
```

### 3. Registry Central (`ChatProviderRegistry`)

Gerencia todos os providers e permite buscar conversas de todos os canais:

```typescript
const registry = getChatRegistry();

// Buscar de TODOS os canais
const all = await registry.getAllConversations(orgId);

// Buscar de um canal específico
const whatsapp = registry.get('whatsapp');
const waConvs = await whatsapp?.getConversations(orgId);
```

---

## Estrutura de Arquivos

```
utils/
  chat/
    index.ts              # Entry point - exports principais
    types.ts              # Tipos e interfaces compartilhados
    registry.ts           # ChatProviderRegistry
    providers/
      index.ts            # Re-exports dos providers
      whatsapp.ts         # WhatsAppChatProvider (Evolution/WAHA)
      airbnb.ts           # AirbnbChatProvider (stub)
      booking.ts          # BookingChatProvider (stub)
```

---

## Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────┐
│                    SimpleChatInbox                          │
│                         (UI)                                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  ChatProviderRegistry                        │
│               getAllConversations(orgId)                     │
└─────────┬─────────────┬─────────────────┬───────────────────┘
          │             │                 │
          ▼             ▼                 ▼
┌─────────────┐ ┌──────────────┐ ┌────────────────┐
│  WhatsApp   │ │   Airbnb     │ │   Booking      │
│  Provider   │ │   Provider   │ │   Provider     │
└──────┬──────┘ └──────┬───────┘ └───────┬────────┘
       │               │                 │
       ▼               ▼                 ▼
┌─────────────┐ ┌──────────────┐ ┌────────────────┐
│ Evolution   │ │  Airbnb API  │ │  Booking API   │
│ API + DB    │ │  (futuro)    │ │  (futuro)      │
└─────────────┘ └──────────────┘ └────────────────┘
```

---

## Encapsulamento de Lógica Específica

Cada provider encapsula sua própria lógica:

### WhatsApp Provider

- **JIDs**: `@s.whatsapp.net` (usuários), `@g.us` (grupos), `@lid` (leads Meta)
- **Phone parsing**: Extrai número do JID
- **Display name**: Formata telefone brasileiro ou mostra "Lead #xxx..."

### Airbnb Provider (futuro)

- **Thread IDs**: Formato específico Airbnb
- **Display name**: Nome do hóspede ou "Hóspede Airbnb"

### Booking Provider (futuro)

- **Message IDs**: Formato Booking.com
- **Display name**: Nome do hóspede ou "Hóspede Booking"

---

## Como Adicionar Novo Canal

1. Criar arquivo `utils/chat/providers/novo-canal.ts`
2. Implementar `IChatProvider`
3. Adicionar tipo em `ChatChannel` (types.ts)
4. Registrar no `ChatProviderRegistry` (registry.ts)
5. Exportar no `providers/index.ts`

Exemplo:

```typescript
// utils/chat/providers/vrbo.ts
export class VRBOChatProvider implements IChatProvider {
  readonly channel: ChatChannel = 'vrbo';
  readonly displayName = 'VRBO';
  
  async getConversations(orgId: string) {
    // Implementar busca VRBO
  }
  
  parseExternalId(extId: string) {
    // Parsear formato VRBO
  }
  
  formatDisplayName(conv) {
    return conv.guestName || 'Hóspede VRBO';
  }
}
```

---

## Uso no SimpleChatInbox

```typescript
import { getAllChatConversations, getChatProvider } from '../../utils/chat';

// Buscar conversas de TODOS os canais unificados
const conversations = await getAllChatConversations(organizationId);

// Identificar canal de uma conversa
const channel = conversation.channel; // 'whatsapp' | 'airbnb' | ...

// Buscar provider específico para operações
const provider = getChatProvider(conversation.channel);
await provider?.sendTextMessage(conversation.externalId, 'Olá!');
```

---

## Consequências

### Positivas

✅ **Extensibilidade**: Adicionar novo canal = 1 arquivo novo  
✅ **Isolamento**: Lógica de cada canal encapsulada  
✅ **Testabilidade**: Cada provider pode ser testado isoladamente  
✅ **Inbox unificada**: Todas conversas num só lugar  
✅ **Type safety**: Tipos compartilhados garantem consistência  

### Negativas

⚠️ **Complexidade inicial**: Mais arquivos que antes  
⚠️ **Curva de aprendizado**: Devs precisam entender o padrão  

### Riscos

- Se um provider falhar, não deve afetar os outros (✅ tratado com `Promise.allSettled`)
- Performance: buscar de N canais pode ser lento (mitigar com cache)

---

## Referências

- [ADR-002 WhatsApp Evolution API](./ADR-002-WHATSAPP-EVOLUTION-API-CONNECTION.md)
- `utils/chat/types.ts` - Tipos completos
- `utils/chat/providers/whatsapp.ts` - Implementação de referência
