# 🚀 GUIA: Implementação de Chat em Tempo Real

> **Objetivo:** Implementar chat fluido no Rendizy, onde mensagens enviadas pelo celular (WhatsApp) aparecem automaticamente na interface sem refresh manual.

---

## 📊 Análise de Soluções Existentes

### 1. Chatwoot - Como Funciona

O Chatwoot usa um sistema dual para tempo real:

```
┌─────────────────┐     WebSocket (ActionCable)     ┌─────────────────┐
│   Frontend UI   │◄───────────────────────────────►│   Chatwoot      │
│  (React/Vue)    │    message.created events       │   Server        │
└─────────────────┘                                 └────────┬────────┘
                                                            │
                                              HTTP Webhooks │
                                                            ▼
                                                  ┌─────────────────┐
                                                  │   WhatsApp      │
                                                  │   Provider      │
                                                  └─────────────────┘
```

**Chatwoot WebSocket Pattern:**
```javascript
// URL: wss://app.chatwoot.com/cable
const connection = new WebSocket("wss://app.chatwoot.com/cable");

// Subscribe ao canal
connection.send(JSON.stringify({
  command: "subscribe",
  identifier: JSON.stringify({
    channel: "RoomChannel",
    pubsub_token: pubSubToken,  // Token de autenticação
    account_id: accountId
  })
}));

// Eventos recebidos:
// - message.created
// - message.updated
// - conversation.created
// - conversation.typing_on/off
// - presence.update
```

**Chatwoot Webhooks (backup):**
- `message_created` → Nova mensagem recebida
- `conversation_created` → Nova conversa
- `conversation_status_changed` → Status mudou

### 2. WAHA - Como Funciona

O WAHA oferece **DUAS** opções para tempo real:

#### Opção A: WebSocket Nativo do WAHA ✅ (RECOMENDADO)
```javascript
// URL: ws://76.13.82.60:3001/ws
const wsUrl = 'ws://76.13.82.60:3001/ws?' + new URLSearchParams({
  'x-api-key': 'rendizy-waha-secret-2026',
  'session': 'default',
  'events': 'message'  // Pode adicionar mais eventos
});

const socket = new WebSocket(wsUrl);

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Nova mensagem:', data);
  // { event: 'message', session: 'default', payload: { from, body, ... } }
};
```

**Eventos disponíveis:**
- `message` → Mensagem recebida (de outros)
- `message.any` → TODAS as mensagens (incluindo suas)
- `message.ack` → Confirmação de leitura
- `presence.update` → Digitando...
- `session.status` → Status da sessão

#### Opção B: Webhooks HTTP
```javascript
// Configurar webhook na sessão WAHA
POST /api/sessions/
{
  "name": "default",
  "config": {
    "webhooks": [{
      "url": "https://seu-backend.com/api/waha-webhook",
      "events": ["message", "message.any"]
    }]
  }
}
```

---

## 🏗️ Arquitetura Recomendada para Rendizy

### Opção 1: WebSocket Direto (MAIS SIMPLES) ⭐

```
┌─────────────────────┐                    ┌─────────────────────┐
│    React Frontend   │  WebSocket Direto  │       WAHA          │
│  ChatMessagePanel   │◄──────────────────►│   76.13.82.60:3001  │
│                     │   ws://waha/ws     │                     │
└─────────────────────┘                    └─────────────────────┘
```

**Prós:**
- Implementação simples
- Tempo real instantâneo
- Sem servidor intermediário

**Contras:**
- API Key exposta no frontend
- Todas as mensagens chegam (precisa filtrar por chat)

### Opção 2: Webhook + Supabase Realtime (MAIS SEGURO) ⭐⭐

```
┌─────────────────────┐  Supabase Realtime  ┌─────────────────────┐
│    React Frontend   │◄───────────────────►│     Supabase        │
│  ChatMessagePanel   │                     │     Database        │
└─────────────────────┘                     └──────────┬──────────┘
                                                       │
                                                       │ INSERT
                                                       │
┌─────────────────────┐   HTTP Webhook      ┌──────────┴──────────┐
│        WAHA         │────────────────────►│   Edge Function     │
│   76.13.82.60:3001  │   message events    │   /waha-webhook     │
└─────────────────────┘                     └─────────────────────┘
```

**Prós:**
- API Key segura no backend
- Histórico salvo automaticamente
- Pode adicionar lógica (auto-resposta, etc)

**Contras:**
- Mais complexo
- Latência ligeiramente maior

### Opção 3: Polling Simples (FALLBACK)

```javascript
// Polling a cada 5 segundos
setInterval(async () => {
  const messages = await fetchWhatsAppMessages(chatId);
  if (messages.length !== currentCount) {
    setMessages(messages);
  }
}, 5000);
```

**Prós:**
- Funciona sempre
- Não precisa WebSocket

**Contras:**
- Não é tempo real (delay de 5s)
- Mais requests

---

## 🔧 IMPLEMENTAÇÃO RECOMENDADA: WebSocket Direto

### Passo 1: Criar Hook de WebSocket WAHA

```typescript
// src/hooks/useWahaWebSocket.ts
import { useEffect, useRef, useCallback } from 'react';

interface WAHAMessage {
  event: 'message' | 'message.any' | 'message.ack';
  session: string;
  payload: {
    id: string;
    from: string;
    to: string;
    body: string;
    timestamp: number;
    fromMe: boolean;
    hasMedia: boolean;
    media?: {
      url: string;
      mimetype: string;
    };
  };
}

interface UseWahaWebSocketOptions {
  onMessage?: (message: WAHAMessage) => void;
  onError?: (error: Event) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  enabled?: boolean;
}

export function useWahaWebSocket(options: UseWahaWebSocketOptions = {}) {
  const { onMessage, onError, onConnected, onDisconnected, enabled = true } = options;
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    // 🔒 ZONA_CRITICA: Configuração do WebSocket WAHA
    const wsUrl = new URL('ws://76.13.82.60:3001/ws');
    wsUrl.searchParams.set('x-api-key', 'rendizy-waha-secret-2026');
    wsUrl.searchParams.set('session', 'default');
    wsUrl.searchParams.set('events', 'message');      // Mensagens recebidas
    wsUrl.searchParams.append('events', 'message.any'); // Todas (incluindo enviadas)
    wsUrl.searchParams.append('events', 'presence.update'); // Digitando...

    console.log('[WAHA-WS] Conectando...', wsUrl.toString());
    
    const socket = new WebSocket(wsUrl.toString());
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('[WAHA-WS] ✅ Conectado!');
      onConnected?.();
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WAHAMessage;
        console.log('[WAHA-WS] 📨 Evento recebido:', data.event, data.payload?.from);
        onMessage?.(data);
      } catch (err) {
        console.error('[WAHA-WS] Erro ao parsear:', err);
      }
    };

    socket.onerror = (error) => {
      console.error('[WAHA-WS] ❌ Erro:', error);
      onError?.(error);
    };

    socket.onclose = () => {
      console.log('[WAHA-WS] 🔌 Desconectado. Reconectando em 5s...');
      onDisconnected?.();
      
      // Auto-reconnect
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };
  }, [onMessage, onError, onConnected, onDisconnected]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected: socketRef.current?.readyState === WebSocket.OPEN,
    connect,
    disconnect,
  };
}
```

### Passo 2: Integrar no ChatMessagePanel

```typescript
// No ChatMessagePanel.tsx, adicionar:

import { useWahaWebSocket } from '@/hooks/useWahaWebSocket';

function ChatMessagePanel({ conversationId, selectedJid, ...props }) {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isWsConnected, setIsWsConnected] = useState(false);

  // 🔄 WebSocket para tempo real
  useWahaWebSocket({
    enabled: !!selectedJid, // Só conecta se tiver uma conversa selecionada
    
    onMessage: (wahaEvent) => {
      // Filtra apenas mensagens do chat atual
      const chatJid = selectedJid?.replace('@c.us', '').replace('@s.whatsapp.net', '');
      const messageFrom = wahaEvent.payload.from?.replace('@c.us', '').replace('@s.whatsapp.net', '');
      const messageTo = wahaEvent.payload.to?.replace('@c.us', '').replace('@s.whatsapp.net', '');
      
      // Verifica se a mensagem é deste chat
      const isThisChat = messageFrom === chatJid || messageTo === chatJid;
      
      if (isThisChat && wahaEvent.event === 'message') {
        console.log('[ChatPanel] 📬 Nova mensagem recebida em tempo real!');
        
        // Converte payload WAHA para formato interno
        const newMessage: MessageType = {
          id: wahaEvent.payload.id,
          body: wahaEvent.payload.body,
          fromMe: wahaEvent.payload.fromMe,
          timestamp: wahaEvent.payload.timestamp,
          hasMedia: wahaEvent.payload.hasMedia,
          mediaUrl: wahaEvent.payload.media?.url,
        };
        
        // Adiciona à lista (evitando duplicatas)
        setMessages(prev => {
          const exists = prev.some(m => m.id === newMessage.id);
          if (exists) return prev;
          return [...prev, newMessage].sort((a, b) => a.timestamp - b.timestamp);
        });
      }
    },
    
    onConnected: () => {
      console.log('[ChatPanel] 🟢 WebSocket conectado!');
      setIsWsConnected(true);
    },
    
    onDisconnected: () => {
      console.log('[ChatPanel] 🔴 WebSocket desconectado');
      setIsWsConnected(false);
    },
  });

  // ... resto do componente
  
  return (
    <div>
      {/* Indicador de conexão */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isWsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-xs text-gray-500">
          {isWsConnected ? 'Tempo real ativo' : 'Reconectando...'}
        </span>
      </div>
      
      {/* Lista de mensagens */}
      {messages.map(message => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}
```

### Passo 3: Indicador "Digitando..."

```typescript
// Adicionar ao hook:
const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});

useWahaWebSocket({
  onMessage: (wahaEvent) => {
    if (wahaEvent.event === 'presence.update') {
      const { id, presences } = wahaEvent.payload;
      presences.forEach(p => {
        if (p.lastKnownPresence === 'typing') {
          setTypingUsers(prev => ({ ...prev, [p.participant]: true }));
          // Remove após 3s
          setTimeout(() => {
            setTypingUsers(prev => ({ ...prev, [p.participant]: false }));
          }, 3000);
        }
      });
    }
  },
});

// No render:
{Object.entries(typingUsers).some(([_, isTyping]) => isTyping) && (
  <div className="text-gray-500 text-sm italic">Digitando...</div>
)}
```

---

## 📋 Checklist de Implementação

### Fase 1: WebSocket Básico
- [ ] Criar hook `useWahaWebSocket.ts`
- [ ] Integrar no `ChatMessagePanel.tsx`
- [ ] Testar recebimento de mensagens
- [ ] Adicionar indicador de conexão (bolinha verde/vermelha)

### Fase 2: Melhorias UX
- [ ] Indicador "Digitando..."
- [ ] Som de notificação para nova mensagem
- [ ] Auto-scroll para última mensagem
- [ ] Badge de mensagens não lidas

### Fase 3: Robustez
- [ ] Reconexão automática
- [ ] Fallback para polling se WS falhar
- [ ] Tratamento de duplicatas
- [ ] Sincronização com histórico

---

## 🔐 Considerações de Segurança

### API Key no Frontend

A abordagem WebSocket direto expõe a API Key no frontend. Opções:

1. **Aceitar o risco** - Se o WAHA está em rede privada/VPN
2. **Proxy no backend** - Edge function que faz relay do WebSocket
3. **Token temporário** - Gerar tokens de curta duração

### Proxy Recomendado (se necessário)

```typescript
// Supabase Edge Function - /functions/waha-ws-proxy
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // Autenticar usuário via Supabase
  const { user } = await supabase.auth.getUser(req.headers.get('Authorization'));
  if (!user) return new Response('Unauthorized', { status: 401 });
  
  // Conectar ao WAHA e fazer relay
  // ... (implementação de WebSocket proxy)
});
```

---

## 📚 Referências

- [WAHA Events Documentation](https://waha.devlike.pro/docs/how-to/events/)
- [WAHA WebSocket Guide](https://waha.devlike.pro/docs/how-to/events/#websockets)
- [Chatwoot WebSocket Events](https://www.chatwoot.com/docs/product/channels/live-chat/sdk/setup#websocket-events)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

---

## 🏷️ Tags

`🔒 ZONA_CRITICA_CHAT` `⚠️ WAHA_INTEGRATION` `📱 WHATSAPP_JID` `🚀 REALTIME`

---

**Versão:** 1.0.0  
**Data:** 2026-01-18  
**Autor:** Claude (GitHub Copilot)
