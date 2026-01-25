# CHANGELOG - Chat Multi-Provider Architecture v2.1.0

**Data**: 2026-01-24 (atualizado 2026-01-24 17:30)  
**Versão**: 2.1.0  
**ADR**: [ADR-010-CHAT-MULTI-PROVIDER-ARCHITECTURE.md](./ADR/ADR-010-CHAT-MULTI-PROVIDER-ARCHITECTURE.md)  
**Commit**: `b683b66` (21 files changed, 4268 insertions)

---

## 🎯 Resumo

Implementação de arquitetura escalável para suportar múltiplos providers de chat (WhatsApp Evolution, WhatsApp WAHA, Airbnb, Booking, SMS) com detecção automática de provider e normalização de JIDs.

---

## 🔥 Correções v2.1.0 (Latest)

### Evolution API Response Structure Fixes

**Problema**: Evolution estava mostrando "offline" e não carregava mensagens.

**Causa raiz descoberta**:
1. Evolution API retorna `remoteJid` (não `id`) como identificador WhatsApp JID
2. Evolution API retorna `{ messages: { records: [...] } }` (não `{ messages: [...] }`)

**Arquivos corrigidos**:

| Arquivo | Correção |
|---------|----------|
| `evolutionAdapter.ts` | `normalizeChat()`: Usar `raw.remoteJid \|\| raw.id` |
| `evolutionAdapter.ts` | `fetchMessages()`: Parse `response.messages.records` |
| `useChatPolling.ts` | **NOVO** - Hook unificado Evolution + WAHA |
| `ChatMessagePanel.tsx` | Usa `useChatPolling` em vez de `useWahaPolling` |
| `ChatConversationList.tsx` | UI de filtro por provider + botão testar |
| `instanceCleanupService.ts` | **NOVO** - Auto-cleanup ghost instances |

### Detalhes Técnicos

```typescript
// ANTES (errado) - evolutionAdapter.ts normalizeChat()
const jid = raw.id || raw.remoteJid;

// DEPOIS (correto)
const jid = raw.remoteJid || raw.id;
// Evolution retorna 'id' como ID interno do banco, 'remoteJid' é o WhatsApp JID

// ANTES (errado) - evolutionAdapter.ts fetchMessages()
const msgs = response.messages || [];

// DEPOIS (correto)
const msgs = response.messages?.records || response.messages || [];
// Evolution API v2 retorna { messages: { records: [...] } }
```

### Novo Hook `useChatPolling`

```typescript
// Suporta AMBOS os providers automaticamente
const { messages, loading, error } = useChatPolling({
  conversationId: '5521999887766@s.whatsapp.net',
  isEnabled: true,
  pollingInterval: 2000,
});
// Auto-detecta provider pelo formato do JID:
// - @s.whatsapp.net → Evolution
// - @c.us ou @lid → WAHA
```

---

## 🆕 Novos Arquivos

### Adapters (`utils/chat/adapters/`)

| Arquivo | Descrição |
|---------|-----------|
| `types.ts` | Interfaces `IWhatsAppAdapter`, `NormalizedWhatsAppMessage`, `NormalizedWhatsAppChat` |
| `evolutionAdapter.ts` | Adapter para Evolution API v2 (JID: `@s.whatsapp.net`) - **corrigido v2.1** |
| `wahaAdapter.ts` | Adapter para WAHA (JID: `@c.us`) |
| `index.ts` | Factory com `getWhatsAppAdapter()` e cache de adapters |

### Hooks (`hooks/`)

| Arquivo | Descrição |
|---------|-----------|
| `useChatPolling.ts` | **NOVO v2.1** - Hook unificado para polling de mensagens Evolution + WAHA |

### Serviços (`utils/chat/`)

| Arquivo | Descrição |
|---------|-----------|
| `unifiedChatService.ts` | Camada de abstração que auto-detecta provider + `fetchMessagesForChat()` |
| `instanceCleanupService.ts` | **NOVO v2.1** - Auto-cleanup de ghost/orphan instances |

### Documentação

| Arquivo | Descrição |
|---------|-----------|
| `docs/ADR/ADR-010-CHAT-MULTI-PROVIDER-ARCHITECTURE.md` | ADR completo da arquitetura |
| `docs/CHANGELOG-2026-01-24-CHAT-MULTI-PROVIDER.md` | Este arquivo |
| `docs/GUIA_IA_CHAT_MULTI_PROVIDER.md` | Guia rápido para IA |

---

## 📝 Arquivos Modificados

### `components/chat/ChatConversationList.tsx`
- **Versão**: v2.1.0
- **Mudanças**:
  - Adicionado filtro `🧪 Testar Provider` (Evolution/WAHA/Todos)
  - Botão "Aplicar Filtro / Recarregar" para testar providers isoladamente
  - Indicadores visuais de provider nos botões de instância (🟢 E / 🟢 W)
  - Cores distintas: Evolution `#128C7E` (verde escuro), WAHA `#25D366` (verde claro)

### `components/chat/ChatMessagePanel.tsx`
- **Versão**: v2.1.0
- **Mudanças**:
  - Usa novo hook `useChatPolling` em vez de `useWahaPolling`
  - Auto-detecção de provider pelo formato do JID
  - Suporte a polling unificado para ambos providers

### `utils/chat/adapters/evolutionAdapter.ts`
- **Versão**: v2.1.0
- **Correções críticas**:
  - `normalizeChat()`: Usa `raw.remoteJid || raw.id` (antes era invertido)
  - `fetchMessages()`: Parse correto de `response.messages.records`

### `utils/chat/unifiedChatService.ts`
- **Versão**: v2.1.0
- **Adições**:
  - Interface `NormalizedMessage`
  - Função `fetchMessagesForChat()`
  - Suporte a multi-instância com mapeamento de providers

---

## 🔧 Como Funciona

### Fluxo de Detecção de Provider

```
1. Frontend chama fetchChatMessages('5521999887766')
                    ↓
2. unifiedChatService chama getWhatsAppAdapter()
                    ↓
3. AdapterFactory consulta channel_instances no Supabase
   - SELECT * FROM channel_instances WHERE org_id = X AND channel = 'whatsapp'
                    ↓
4. Baseado no campo 'provider':
   - 'evolution' → cria EvolutionAdapter
   - 'waha' → cria WahaAdapter
                    ↓
5. Adapter normaliza JID para seu formato:
   - Evolution: '5521999887766' → '5521999887766@s.whatsapp.net'
   - WAHA: '5521999887766' → '5521999887766@c.us'
                    ↓
6. Adapter chama API correta e retorna mensagens normalizadas
```

### Normalização de JID

| Input | Evolution Output | WAHA Output |
|-------|-----------------|-------------|
| `5521999887766` | `5521999887766@s.whatsapp.net` | `5521999887766@c.us` |
| `5521999887766@c.us` | `5521999887766@s.whatsapp.net` | `5521999887766@c.us` |
| `5521999887766@s.whatsapp.net` | `5521999887766@s.whatsapp.net` | `5521999887766@c.us` |
| `123456789@g.us` (grupo) | `123456789@g.us` | `123456789@g.us` |

---

## 🚀 Uso no Código

### Antes (v1.x - Hardcoded WAHA)
```typescript
import { fetchWhatsAppMessages } from '../utils/whatsappChatApi';

// ❌ Sempre usava WAHA com @c.us
const messages = await fetchWhatsAppMessages('5521999887766@c.us');
```

### Depois (v2.0 - Auto-detecta Provider)
```typescript
import { fetchChatMessages } from '../utils/chat';

// ✅ Detecta automaticamente Evolution vs WAHA
// ✅ Normaliza JID para o formato correto
const messages = await fetchChatMessages('5521999887766');
```

---

## 📊 Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND COMPONENTS                           │
│                 (ChatInbox, WhatsAppConversation)               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              UNIFIED CHAT SERVICE                                │
│           (utils/chat/unifiedChatService.ts)                    │
│                                                                  │
│  fetchChatMessages() • sendChatMessage() • markAsRead()         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ADAPTER FACTORY                                │
│              (utils/chat/adapters/index.ts)                      │
│                                                                  │
│  getWhatsAppAdapter() → detecta Evolution vs WAHA               │
│  Cache de adapters por organização (5 min TTL)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                                       ▼
┌─────────────────┐                   ┌─────────────────┐
│ Evolution       │                   │ WAHA            │
│ Adapter         │                   │ Adapter         │
│                 │                   │                 │
│ JID: @s.whats.. │                   │ JID: @c.us      │
│ Auth: apikey    │                   │ Auth: X-Api-Key │
└────────┬────────┘                   └────────┬────────┘
         │                                     │
         ▼                                     ▼
┌─────────────────┐                   ┌─────────────────┐
│ Evolution API   │                   │ WAHA API        │
│ :8080           │                   │ :3001           │
└─────────────────┘                   └─────────────────┘
```

---

## ⚠️ Breaking Changes

### Para desenvolvedores

1. **Imports mudaram** (opcional, legacy ainda funciona):
   ```typescript
   // Novo (recomendado)
   import { fetchChatMessages } from '../utils/chat';
   
   // Legacy (ainda funciona, mas deprecated)
   import { fetchWhatsAppMessages } from '../utils/whatsappChatApi';
   ```

2. **Formato de resposta**:
   - `fetchChatMessages()` retorna `NormalizedWhatsAppMessage[]`
   - Campos normalizados: `id`, `text`, `fromMe`, `timestamp`, `status`, `mediaType`, etc.
   - Não precisa mais de `msg.key.id` ou `msg.message.conversation`

---

## 🔮 Próximos Passos

### Fase 2 (Próxima Sprint)
- [ ] Implementar `AirbnbAdapter` para mensagens do Airbnb
- [ ] Implementar `BookingAdapter` para mensagens do Booking.com

### Fase 3 (Futuro)
- [ ] `SMSAdapter` para Twilio/MessageBird
- [ ] `EmailAdapter` para integração com inbox

---

## 🧪 Testes

Para testar a implementação:

1. **Verificar provider detectado**:
   ```typescript
   import { getActiveProvider } from '../utils/chat';
   const { provider, instanceName, status } = await getActiveProvider();
   console.log('Provider:', provider); // 'evolution' ou 'waha'
   ```

2. **Testar fetch de mensagens**:
   ```typescript
   import { fetchChatMessages } from '../utils/chat';
   const messages = await fetchChatMessages('5521999887766');
   console.log('Messages:', messages.length);
   ```

3. **Verificar logs no console**:
   - `[AdapterFactory] ✅ Detected provider: evolution`
   - `[EvolutionAdapter] 📥 Fetching messages for: 5521999887766@s.whatsapp.net`

---

**Autor**: GitHub Copilot  
**Revisado por**: Equipe Rendizy
