# 🤖 GUIA RÁPIDO IA - Chat Multi-Provider v2.1

> **LEIA ANTES DE MODIFICAR QUALQUER CÓDIGO DE CHAT**
> **Última atualização**: 2026-01-24 17:30

---

## 🔥 CORREÇÕES CRÍTICAS v2.1 (DEVE SABER)

### Evolution API Quirks (descoberto 2026-01-24)

**1. Chat ID usa `remoteJid`, NÃO `id`:**
```typescript
// ❌ ERRADO - raw.id é ID interno do banco
const jid = raw.id || raw.remoteJid;

// ✅ CORRETO - raw.remoteJid é o WhatsApp JID
const jid = raw.remoteJid || raw.id;
```

**2. Messages vem em nested object:**
```typescript
// ❌ ERRADO - não existe response.messages como array
const msgs = response.messages || [];

// ✅ CORRETO - Evolution retorna { messages: { records: [...] } }
const msgs = response.messages?.records || response.messages || [];
```

**3. JID Detection por formato:**
```typescript
// Detectar provider pelo JID
if (jid.includes('@s.whatsapp.net')) return 'evolution';
if (jid.includes('@c.us') || jid.includes('@lid')) return 'waha';
```

---

## ⚠️ REGRAS ABSOLUTAS

### 1. NUNCA chame APIs diretamente
```typescript
// ❌ ERRADO - Não fazer isso
fetch('http://76.13.82.60:8080/message/sendText/...')
fetch('http://76.13.82.60:3001/api/default/chats/...')

// ✅ CORRETO - Usar serviço unificado
import { fetchChatMessages, sendChatMessage } from '../utils/chat';
const messages = await fetchChatMessages(chatId);
await sendChatMessage(chatId, 'Olá!');
```

### 2. NUNCA assuma qual provider está ativo
```typescript
// ❌ ERRADO - Assumir formato de JID
const jid = `${phone}@c.us`;  // WAHA format
const jid = `${phone}@s.whatsapp.net`;  // Evolution format

// ✅ CORRETO - Deixar o adapter normalizar
import { normalizeJidForCurrentProvider } from '../utils/chat';
const jid = await normalizeJidForCurrentProvider(phone);
```

### 3. NUNCA modifique adapters existentes sem criar teste
- `evolutionAdapter.ts` - Testado e funcionando
- `wahaAdapter.ts` - Testado e funcionando

---

## 📁 Estrutura de Arquivos

```
src/
├── components/chat/
│   ├── ChatConversationList.tsx  # Lista + filtro por provider
│   ├── ChatMessagePanel.tsx      # Painel com useChatPolling
│   └── ChatInbox.tsx             # Inbox principal
├── hooks/
│   ├── useChatPolling.ts         # ✅ NOVO - Hook unificado Evolution+WAHA
│   └── useWahaPolling.ts         # Legacy - ainda funciona
└── utils/chat/
    ├── index.ts                   # ✅ Entry point - USE ESTE
    ├── unifiedChatService.ts      # ✅ Serviço unificado (auto-detecta provider)
    ├── instanceCleanupService.ts  # ✅ NOVO - Cleanup ghost instances
    ├── adapters/
    │   ├── index.ts               # Factory com getWhatsAppAdapter()
    │   ├── types.ts               # IWhatsAppAdapter, NormalizedWhatsAppMessage
    │   ├── evolutionAdapter.ts    # Adapter Evolution API (@s.whatsapp.net) - CORRIGIDO
    │   └── wahaAdapter.ts         # Adapter WAHA (@c.us)
    ├── providers/
    │   ├── whatsapp.ts            # Provider alto nível (usa adapters)
    │   ├── airbnb.ts              # Stub - implementar
    │   └── booking.ts             # Stub - implementar
    └── registry.ts                # Registry de providers
```

---

## 🔌 Como Usar

### Polling de Mensagens (Recomendado v2.1)
```typescript
import { useChatPolling } from '../hooks/useChatPolling';

// Hook unificado - auto-detecta Evolution vs WAHA pelo JID
const { messages, loading, error } = useChatPolling({
  conversationId: '5521999887766@s.whatsapp.net', // ou @c.us
  isEnabled: true,
  pollingInterval: 2000,
});
```

### Buscar Mensagens (API direta)
```typescript
import { fetchChatMessages } from '../utils/chat';

// Aceita qualquer formato - o adapter normaliza automaticamente
const messages = await fetchChatMessages('5521999887766');
const messages = await fetchChatMessages('5521999887766@s.whatsapp.net');
const messages = await fetchChatMessages('5521999887766@c.us');
```

### Enviar Mensagem
```typescript
import { sendChatMessage } from '../utils/chat';

const result = await sendChatMessage('5521999887766', 'Olá!');
if (result.success) {
  console.log('Enviado:', result.messageId);
} else {
  console.error('Erro:', result.error);
}
```

### Verificar Provider Ativo
```typescript
import { getActiveProvider } from '../utils/chat';

const { provider, instanceName, status } = await getActiveProvider();
console.log('Provider:', provider); // 'evolution' ou 'waha'
```

### Acesso Direto ao Adapter (quando necessário)
```typescript
import { getWhatsAppAdapter } from '../utils/chat';

const adapter = await getWhatsAppAdapter();
if (adapter) {
  const chats = await adapter.fetchChats();
  const isConnected = await adapter.isConnected();
}
```

---

## 🔄 Fluxo de Detecção

```
1. Frontend chama fetchChatMessages()
            ↓
2. unifiedChatService chama getWhatsAppAdapter()
            ↓
3. Factory consulta channel_instances no Supabase
   SELECT * FROM channel_instances 
   WHERE org_id = X AND channel = 'whatsapp'
            ↓
4. Baseado no campo 'provider':
   - 'evolution' → EvolutionAdapter
   - 'waha' → WahaAdapter
            ↓
5. Adapter normaliza JID e chama API correta
```

---

## 📊 Diferenças entre Providers

| Aspecto | Evolution | WAHA |
|---------|-----------|------|
| JID Format | `@s.whatsapp.net` | `@c.us` |
| Auth Header | `apikey` | `X-Api-Key` |
| Fetch Messages | `POST /chat/findMessages/{instance}` | `GET /api/{session}/chats/{id}/messages` |
| Send Text | `POST /message/sendText/{instance}` | `POST /api/sendText` |
| Mídia | URL direta | Base64 (WAHA CORE) |

---

## 🚫 O que NÃO fazer

1. **Não criar novos arquivos para chamadas de API WhatsApp**
   - Use os adapters existentes

2. **Não hardcodar URLs de API**
   - Estão em `.env` e são lidas pelos adapters

3. **Não assumir formato de resposta**
   - Todos os adapters retornam `NormalizedWhatsAppMessage`

4. **Não modificar `whatsappChatApi.ts` para novos features**
   - É legacy, use os adapters

---

## 📚 Documentação Relacionada

- [ADR-010: Chat Multi-Provider Architecture](./ADR/ADR-010-CHAT-MULTI-PROVIDER-ARCHITECTURE.md)
- [CHANGELOG-2026-01-24-CHAT-MULTI-PROVIDER.md](./CHANGELOG-2026-01-24-CHAT-MULTI-PROVIDER.md)
- [MIGRATION-WAHA-TO-EVOLUTION.md](./MIGRATION-WAHA-TO-EVOLUTION.md)

---

**Última atualização**: 2026-01-24
