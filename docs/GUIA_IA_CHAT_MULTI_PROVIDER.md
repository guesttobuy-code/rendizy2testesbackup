# 🤖 GUIA RÁPIDO IA - Chat Multi-Provider v2.0

> **LEIA ANTES DE MODIFICAR QUALQUER CÓDIGO DE CHAT**

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
utils/chat/
├── index.ts                    # ✅ Entry point - USE ESTE
├── unifiedChatService.ts       # ✅ Serviço unificado (auto-detecta provider)
├── adapters/
│   ├── index.ts                # Factory com getWhatsAppAdapter()
│   ├── types.ts                # IWhatsAppAdapter, NormalizedWhatsAppMessage
│   ├── evolutionAdapter.ts     # Adapter Evolution API (@s.whatsapp.net)
│   └── wahaAdapter.ts          # Adapter WAHA (@c.us)
├── providers/
│   ├── whatsapp.ts             # Provider alto nível (usa adapters)
│   ├── airbnb.ts               # Stub - implementar
│   └── booking.ts              # Stub - implementar
└── registry.ts                 # Registry de providers
```

---

## 🔌 Como Usar

### Buscar Mensagens
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
