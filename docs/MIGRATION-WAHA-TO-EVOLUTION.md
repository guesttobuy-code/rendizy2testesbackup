# 📋 Análise de Migração: WAHA → Evolution API

## 📊 Resumo Executivo

Este documento analisa a arquitetura atual do chat com WAHA e planeja a migração/suporte para Evolution API.

---

## 🏗️ Arquitetura Atual (WAHA)

### Componentes Funcionais

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────┐  │
│  │ ChatMessagePanel    │    │ useWahaPolling      │    │ useWahaWebSocket│  │
│  │ (v3.0.0)           │───▶│ (polling 2s)        │    │ (futuro Plus)   │  │
│  │                     │    └─────────────────────┘    └─────────────────┘  │
│  │ - Exibe mensagens   │              │                                      │
│  │ - Envia texto       │              │                                      │
│  │ - Recebe em tempo   │              ▼                                      │
│  │   real (polling)    │    ┌─────────────────────┐                         │
│  └─────────────────────┘    │ whatsappChatApi.ts  │                         │
│                             │ (v2.0.8)            │                         │
│                             │                     │                         │
│                             │ - fetchMessages()   │                         │
│                             │ - sendMessage()     │                         │
│                             │ - extractText()     │                         │
│                             └─────────────────────┘                         │
│                                       │                                      │
└───────────────────────────────────────┼──────────────────────────────────────┘
                                        │
                            ┌───────────┴───────────┐
                            │   Backend Supabase    │
                            │   (fallback)          │
                            └───────────┬───────────┘
                                        │
                            ┌───────────┴───────────┐
                            │     WAHA API          │
                            │  http://76.13.82.60   │
                            │  :3001                │
                            │                       │
                            │  Endpoints:           │
                            │  - GET /chats         │
                            │  - GET /messages      │
                            │  - POST /sendText     │
                            └───────────────────────┘
```

### Arquivos Críticos

| Arquivo | Função | Dependência WAHA |
|---------|--------|------------------|
| `components/chat/ChatMessagePanel.tsx` | UI principal | 🟡 Média (usa hooks) |
| `hooks/useWahaPolling.ts` | Polling 2s | 🔴 Alta (WAHA direto) |
| `hooks/useWahaWebSocket.ts` | WebSocket | 🔴 Alta (WAHA direto) |
| `utils/whatsappChatApi.ts` | API client | 🔴 Alta (endpoints WAHA) |
| `utils/chatUnifiedApi.ts` | Abstração | 🟢 Baixa (detecta provider) |

---

## 🔄 Comparação: WAHA vs Evolution API

### Endpoints Equivalentes

| Funcionalidade | WAHA | Evolution API |
|----------------|------|---------------|
| **Status conexão** | `GET /api/{session}/status` | `GET /instance/connectionState/{instance}` |
| **QR Code** | `GET /api/{session}/auth/qr` | `GET /instance/connect/{instance}` |
| **Listar chats** | `GET /api/{session}/chats` | `GET /chat/findChats/{instance}` |
| **Mensagens** | `GET /api/{session}/chats/{chatId}/messages` | `GET /chat/findMessages/{instance}?where[key.remoteJid]={jid}` |
| **Enviar texto** | `POST /api/sendText` | `POST /message/sendText/{instance}` |
| **Enviar mídia** | `POST /api/sendImage` (Plus only) | `POST /message/sendMedia/{instance}` ✅ |
| **Logout** | `POST /api/{session}/auth/logout` | `DELETE /instance/logout/{instance}` |

### Headers de Autenticação

| Provider | Header | Exemplo |
|----------|--------|---------|
| **WAHA** | `X-Api-Key` | `X-Api-Key: rendizy-waha-secret-2026` |
| **Evolution** | `apikey` | `apikey: evolution-api-key-xxx` |

### Formato de JID

| Provider | Formato |
|----------|---------|
| **WAHA** | `5521999999999@c.us` |
| **Evolution** | `5521999999999@s.whatsapp.net` |

### Estrutura de Mensagem

**WAHA:**
```json
{
  "id": "true_5521999@c.us_ABC123",
  "from": "5521994414512@c.us",
  "fromMe": true,
  "body": "Texto da mensagem",
  "timestamp": 1769303942,
  "hasMedia": false
}
```

**Evolution:**
```json
{
  "key": {
    "remoteJid": "5521999999999@s.whatsapp.net",
    "fromMe": true,
    "id": "ABC123"
  },
  "message": {
    "conversation": "Texto da mensagem"
  },
  "messageTimestamp": 1769303942
}
```

---

## 🎯 Plano de Migração

### Fase 1: Criar Camada de Abstração (Provider Pattern)

**Objetivo:** Isolar código específico de cada provider.

```
utils/
├── chat/
│   ├── providers/
│   │   ├── types.ts           # Interfaces comuns
│   │   ├── waha-provider.ts   # Específico WAHA
│   │   └── evolution-provider.ts  # Específico Evolution
│   └── ChatProvider.ts        # Factory + Abstração
```

**Interface Unificada:**
```typescript
interface IChatProvider {
  // Conexão
  getStatus(): Promise<ConnectionStatus>;
  getQrCode(): Promise<QrCodeResult>;
  logout(): Promise<void>;
  
  // Conversas
  fetchChats(limit?: number): Promise<Chat[]>;
  
  // Mensagens
  fetchMessages(chatId: string, limit?: number): Promise<Message[]>;
  sendText(chatId: string, text: string): Promise<SendResult>;
  sendMedia(chatId: string, media: MediaPayload): Promise<SendResult>;
  
  // Normalização
  normalizeJid(phone: string): string;
  extractPhone(jid: string): string;
}
```

### Fase 2: Criar Evolution Provider

**Arquivo:** `utils/chat/providers/evolution-provider.ts`

```typescript
export class EvolutionProvider implements IChatProvider {
  private apiUrl: string;
  private apiKey: string;
  private instanceName: string;

  async fetchMessages(chatId: string, limit = 20): Promise<Message[]> {
    const jid = this.normalizeJid(chatId); // @s.whatsapp.net
    
    const response = await fetch(
      `${this.apiUrl}/chat/findMessages/${this.instanceName}?where[key.remoteJid]=${jid}&limit=${limit}`,
      { headers: { 'apikey': this.apiKey } }
    );
    
    const data = await response.json();
    return this.convertMessages(data);
  }

  normalizeJid(phone: string): string {
    const clean = phone.replace(/\D/g, '');
    if (phone.includes('@')) return phone.replace('@c.us', '@s.whatsapp.net');
    return `${clean}@s.whatsapp.net`;
  }
}
```

### Fase 3: Adaptar Hook de Polling

**De:** `useWahaPolling.ts` (específico WAHA)
**Para:** `useChatPolling.ts` (genérico)

```typescript
import { getChatProvider } from '../utils/chat/ChatProvider';

export function useChatPolling(options: PollingOptions) {
  const provider = getChatProvider(); // Detecta automaticamente
  
  const fetchMessages = useCallback(async () => {
    const messages = await provider.fetchMessages(chatId, limit);
    // ... resto da lógica (igual para ambos)
  }, [chatId, limit, provider]);
}
```

### Fase 4: Adaptar ChatMessagePanel

**Mudanças necessárias:**
1. Usar `useChatPolling` em vez de `useWahaPolling`
2. Usar `sendMessage` do provider em vez de direto
3. Normalizar JID baseado no provider ativo

---

## 📁 O Que Compartilhar vs Separar

### ✅ COMPARTILHAR (Provider-agnostic)

| Componente | Motivo |
|------------|--------|
| `ChatMessagePanel.tsx` | UI é igual para ambos |
| `ChatConversationList.tsx` | Lista conversas de forma igual |
| Tipos `UnifiedMessage`, `UnifiedConversation` | Formato interno padronizado |
| Lógica de deduplicação de mensagens | Algoritmo independente |
| Polling interval e refresh | Mecânica igual |

### 🔀 SEPARAR (Provider-specific)

| Componente | WAHA | Evolution |
|------------|------|-----------|
| **API Client** | `waha-provider.ts` | `evolution-provider.ts` |
| **JID Format** | `@c.us` | `@s.whatsapp.net` |
| **Auth Header** | `X-Api-Key` | `apikey` |
| **Message Parsing** | `msg.body` | `msg.message.conversation` |
| **fromMe Location** | `msg.fromMe` | `msg.key.fromMe` |
| **Endpoints** | `/api/{session}/...` | `/.../{instance}` |

---

## 🚀 Vantagens da Evolution API

| Feature | WAHA CORE | Evolution |
|---------|-----------|-----------|
| Envio de mídia | ❌ (Plus) | ✅ |
| WebSocket eventos | ❌ (Plus) | ✅ |
| Preço | Gratuito | Gratuito |
| Auto-hospedado | ✅ | ✅ |
| Multi-device | ✅ | ✅ |

---

## 📝 Checklist de Implementação

### Pré-requisitos
- [ ] Evolution API rodando e conectada
- [ ] Credenciais configuradas no `channel_instances`
- [ ] `provider` = 'evolution' no banco

### Código Frontend
- [ ] Criar `utils/chat/providers/types.ts`
- [ ] Criar `utils/chat/providers/evolution-provider.ts`
- [ ] Criar `utils/chat/providers/waha-provider.ts` (extrair de whatsappChatApi)
- [ ] Criar `utils/chat/ChatProvider.ts` (factory)
- [ ] Renomear `useWahaPolling.ts` → `useChatPolling.ts`
- [ ] Adaptar `ChatMessagePanel.tsx`

### Testes
- [ ] Testar conexão Evolution
- [ ] Testar fetch de conversas
- [ ] Testar fetch de mensagens
- [ ] Testar envio de texto
- [ ] Testar polling em tempo real
- [ ] Testar envio de mídia (vantagem!)

---

## 🔧 Configuração Evolution no Banco

```sql
UPDATE channel_instances 
SET 
  provider = 'evolution',
  api_url = 'http://SEU_IP:8080',
  api_key = 'sua-evolution-api-key',
  instance_name = 'rendizy'
WHERE organization_id = 'xxx' AND channel = 'whatsapp';
```

---

## ⏱️ Estimativa de Tempo

| Fase | Horas |
|------|-------|
| Criar providers abstratos | 2h |
| Implementar Evolution provider | 2h |
| Extrair WAHA provider | 1h |
| Adaptar polling hook | 1h |
| Adaptar ChatMessagePanel | 1h |
| Testes e debug | 2h |
| **Total** | **~9h** |

---

## 🎯 Próximos Passos

1. **Você:** Conectar Evolution API
2. **Eu:** Criar a camada de abstração com providers
3. **Testar:** Verificar se fetch de mensagens funciona
4. **Iterar:** Ajustar conforme necessário

---

*Documento gerado em 2026-01-24*
*Versão: 1.0.0*
