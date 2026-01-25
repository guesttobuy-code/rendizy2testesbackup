# Arquitetura do Módulo de Chat - Rendizy PMS

## Visão Geral

O módulo de Chat do Rendizy permite comunicação com hóspedes via WhatsApp, 
utilizando a API WAHA (WhatsApp HTTP API) como backend de mensageria.

## Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React/Vite)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                          ChatModule.tsx                              │   │
│   │                    (Container Principal - /chat)                     │   │
│   └──────────────────────────────┬──────────────────────────────────────┘   │
│                                  │                                           │
│   ┌──────────────────────────────▼──────────────────────────────────────┐   │
│   │                        SimpleChatInbox.tsx                           │   │
│   │                      (Layout 3 Colunas)                              │   │
│   │                                                                      │   │
│   │  ┌────────────────┬────────────────────────┬───────────────────┐    │   │
│   │  │   COLUNA 1     │      COLUNA 2          │     COLUNA 3      │    │   │
│   │  │   (320px)      │      (flex-1)          │     (280px)       │    │   │
│   │  │                │                        │                   │    │   │
│   │  │ Conversation   │   ChatMessagePanel     │   ChatDetails     │    │   │
│   │  │    List        │   ⭐ CRÍTICO           │     Sidebar       │    │   │
│   │  │                │                        │                   │    │   │
│   │  │ • Lista chats  │ • Exibe mensagens      │ • Info contato    │    │   │
│   │  │ • Busca        │ • Envia texto/mídia    │ • Observações     │    │   │
│   │  │ • Filtros      │ • Realtime updates     │ • Ações rápidas   │    │   │
│   │  └────────────────┴────────────────────────┴───────────────────┘    │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                       whatsappChatApi.ts                             │   │
│   │                     (API Layer - Comunicação)                        │   │
│   │                                                                      │   │
│   │  • fetchWhatsAppChats()    → GET /api/{session}/chats                │   │
│   │  • fetchWhatsAppMessages() → GET /api/{session}/chats/{id}/messages  │   │
│   │  • sendWhatsAppMessage()   → POST /api/sendText                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                              BACKEND (Supabase)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Edge Functions:                                                            │
│   • rendizy-server/whatsapp/*  → Proxy para WAHA (com auth)                 │
│                                                                              │
│   Tabelas:                                                                   │
│   • conversations              → Metadados das conversas                    │
│   • messages                   → Histórico de mensagens (opcional)          │
│   • contacts                   → Contatos sincronizados                     │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                              WAHA API (VPS)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   URL: http://76.13.82.60:3001                                              │
│   API Key: rendizy-waha-secret-2026                                         │
│   Session: default                                                           │
│                                                                              │
│   Endpoints:                                                                 │
│   • GET  /api/{session}/chats                    → Lista conversas          │
│   • GET  /api/{session}/chats/{chatId}/messages  → Lista mensagens          │
│   • POST /api/sendText                           → Envia texto              │
│   • POST /api/sendImage                          → Envia imagem             │
│   • POST /api/sendFile                           → Envia arquivo            │
│                                                                              │
│   Webhooks:                                                                  │
│   • message.any                → Nova mensagem recebida                     │
│   • message.ack                → Status de leitura                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Componentes

### ChatModule.tsx
- **Localização**: `components/chat/ChatModule.tsx`
- **Responsabilidade**: Container principal, integra com MainSidebar
- **Rota**: `/chat`

### SimpleChatInbox.tsx
- **Localização**: `components/chat/SimpleChatInbox.tsx`
- **Responsabilidade**: Layout 3 colunas, gerencia estado de seleção
- **Estado**: `selectedContact`, `showDetails`

### ChatConversationList.tsx ⚠️
- **Localização**: `components/chat/ChatConversationList.tsx`
- **Responsabilidade**: Lista de conversas, filtros, categorização
- **Tags**: `🔒 ZONA_CRITICA_CHAT`, `📱 WHATSAPP_JID`
- **Atenção**: Extração de JID deve ser robusta (pode ser objeto!)

### ChatMessagePanel.tsx ⭐ CRÍTICO
- **Localização**: `components/chat/ChatMessagePanel.tsx`
- **Responsabilidade**: Exibição de mensagens, envio, mídia
- **Tags**: `🔒 ZONA_CRITICA_CHAT`, `⚠️ WAHA_INTEGRATION`
- **Versão**: 2.0.9

### ChatDetailsSidebar.tsx
- **Localização**: `components/chat/ChatDetailsSidebar.tsx`
- **Responsabilidade**: Detalhes do contato, observações, ações

### whatsappChatApi.ts ⚠️
- **Localização**: `utils/whatsappChatApi.ts`
- **Responsabilidade**: Comunicação com WAHA API
- **Tags**: `🔒 ZONA_CRITICA_CHAT`, `⚠️ WAHA_INTEGRATION`, `🔑 API_KEY_REQUIRED`

## Fluxo de Dados

### Carregamento de Conversas
```
1. SimpleChatInbox monta
2. ChatConversationList.useEffect → loadContacts()
3. fetchWhatsAppChats() → WAHA /api/default/chats
4. Extrai JID (⚠️ pode ser objeto!)
5. Cruza com Supabase conversations (guest_name)
6. Renderiza lista ordenada por last_message_at
```

### Carregamento de Mensagens
```
1. Usuário clica em conversa
2. SimpleChatInbox.handleSelectConversation(contact)
3. ChatMessagePanel recebe conversationId
4. loadMessages():
   a. Detecta se é JID WhatsApp (@c.us, @s.whatsapp.net)
   b. SIM → fetchWhatsAppMessages() → WAHA direto
   c. NÃO → fetchUnifiedMessages() → Supabase
5. Converte para ChatMessage[]
6. setMessages() → React renderiza
```

### Envio de Mensagens
```
1. Usuário digita texto e clica Enviar
2. ChatMessagePanel.handleSend()
3. Adiciona mensagem otimística (status: pending)
4. sendWhatsAppMessage() → WAHA /api/sendText
5. Atualiza status: sent → delivered → read
```

## Limitações Conhecidas

### WAHA CORE (versão gratuita)
- **Mídia**: Só retorna thumbnails Base64 (~700-800 bytes)
- **URLs**: Requerem API Key no header (browsers não suportam)
- **Solução**: Usar `_data.body` Base64 quando disponível

### Áudios
- Não reproduzem no browser (WAHA CORE não retorna Base64 de áudios)
- **Solução futura**: WAHA PRO ou proxy no backend

## Configuração

### Variáveis de Ambiente
```env
VITE_WAHA_API_URL=http://76.13.82.60:3001
VITE_WAHA_API_KEY=rendizy-waha-secret-2026
```

### WAHA Session
- Nome: `default`
- Status: Conectado
- Número: +55 21 ...

---

## 🗺️ Roadmap de Funcionalidades

O módulo de Chat está em desenvolvimento ativo. Consulte o roadmap completo para acompanhar o progresso:

### Status Atual (2026-01-25)

| Fase | Status | Funcionalidades |
|------|--------|-----------------|
| **Fase 1** | ✅ Completo | WAHA, envio/recebimento, multi-provider, ordenação dinâmica |
| **Fase 2** | 🔄 Em progresso | Fila offline, ACK, typing, templates, send seen |
| **Fase 3** | ⏳ Pendente | Reações, quote, forward, editar, deletar, mídia |
| **Fase 4** | ⏳ Pendente | Agendamento, AI, Airbnb, Booking |

**➡️ Ver roadmap completo: [ROADMAP-CHAT.md](./ROADMAP-CHAT.md)**

---

## Referências

- [ADR-007: Chat Module WAHA Integration](./adr/ADR-007-CHAT-MODULE-WAHA-INTEGRATION.md)
- [ADR-009: WhatsApp Multi-Provider](./adr/ADR-009-WHATSAPP-MULTI-PROVIDER.md)
- [ROADMAP-CHAT.md](./ROADMAP-CHAT.md) - Roadmap de funcionalidades
- [CHANGELOG-CHAT.md](./CHANGELOG-CHAT.md)
- [WAHA Documentation](https://waha.devlike.pro/docs/)
