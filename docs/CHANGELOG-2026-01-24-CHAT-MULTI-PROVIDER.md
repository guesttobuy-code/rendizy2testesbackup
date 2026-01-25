# CHANGELOG - Chat Multi-Provider Architecture v2.0.0

**Data**: 2026-01-24  
**Versão**: 2.0.0  
**ADR**: [ADR-010-CHAT-MULTI-PROVIDER-ARCHITECTURE.md](./ADR/ADR-010-CHAT-MULTI-PROVIDER-ARCHITECTURE.md)

---

## 🎯 Resumo

Implementação de arquitetura escalável para suportar múltiplos providers de chat (WhatsApp Evolution, WhatsApp WAHA, Airbnb, Booking, SMS) com detecção automática de provider e normalização de JIDs.

---

## 🆕 Novos Arquivos

### Adapters (`utils/chat/adapters/`)

| Arquivo | Descrição |
|---------|-----------|
| `types.ts` | Interfaces `IWhatsAppAdapter`, `NormalizedWhatsAppMessage`, `NormalizedWhatsAppChat` |
| `evolutionAdapter.ts` | Adapter para Evolution API v2 (JID: `@s.whatsapp.net`) |
| `wahaAdapter.ts` | Adapter para WAHA (JID: `@c.us`) |
| `index.ts` | Factory com `getWhatsAppAdapter()` e cache de adapters |

### Serviço Unificado

| Arquivo | Descrição |
|---------|-----------|
| `unifiedChatService.ts` | Camada de abstração que auto-detecta provider |

### Documentação

| Arquivo | Descrição |
|---------|-----------|
| `docs/ADR/ADR-010-CHAT-MULTI-PROVIDER-ARCHITECTURE.md` | ADR completo da arquitetura |
| `docs/CHANGELOG-2026-01-24-CHAT-MULTI-PROVIDER.md` | Este arquivo |

---

## 📝 Arquivos Modificados

### `components/WhatsAppConversation.tsx`
- **Versão**: 1.0.104.001 → 2.0.0
- **Mudanças**:
  - Importa `fetchChatMessages` e `sendChatMessage` do `unifiedChatService`
  - Função `loadMessages()` simplificada - adapter normaliza JID automaticamente
  - Função `handleSendMessage()` usa `sendChatMessage()` unificado
  - Suporte a mídia Base64 (WAHA) e URL (Evolution)

### `utils/chat/index.ts`
- **Versão**: 1.0.0 → 2.0.0
- **Mudanças**:
  - Novos exports: `fetchChatMessages`, `sendChatMessage`, `getWhatsAppAdapter`, etc.
  - Header atualizado com diagrama da arquitetura
  - Re-export de tipos dos adapters

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
