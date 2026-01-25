# ADR-007: Módulo de Chat com Integração WAHA WhatsApp

## Status
**ACEITO** - 2026-01-24

## Contexto

O Rendizy PMS precisa de um módulo de chat para comunicação com hóspedes via WhatsApp. 
A solução deve:
- Exibir conversas e mensagens em tempo real
- Suportar texto, imagens, vídeos, áudios e documentos
- Funcionar com a API WAHA (WhatsApp HTTP API)
- Ser resiliente quando o backend estiver offline

## Decisão

### Arquitetura de 3 Camadas

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  ChatModule.tsx                                                 │
│  ├── SimpleChatInbox.tsx (Layout 3 colunas)                     │
│  │   ├── ChatConversationList.tsx (Lista de conversas)          │
│  │   ├── ChatMessagePanel.tsx (Área de mensagens) ⭐ CRÍTICO    │
│  │   └── ChatDetailsSidebar.tsx (Detalhes do contato)           │
│  └── whatsappChatApi.ts (API Layer)                             │
├─────────────────────────────────────────────────────────────────┤
│                        BACKEND (Supabase)                        │
│  └── rendizy-server/whatsapp/* (Proxy para WAHA)                │
├─────────────────────────────────────────────────────────────────┤
│                        WAHA API (VPS)                            │
│  └── http://76.13.82.60:3001 (WhatsApp HTTP API)                │
└─────────────────────────────────────────────────────────────────┘
```

### Fluxo de Dados para Mensagens

```
1. Usuário clica em conversa
   │
2. ChatMessagePanel recebe conversationId (JID: 5521999999999@c.us)
   │
3. Detecta se é JID WhatsApp (@c.us, @s.whatsapp.net, @broadcast)
   │
4. ┌── SIM: Busca direto do WAHA via fetchWhatsAppMessages()
   │        └── Fallback: WAHA direto se backend offline
   │
   └── NÃO (UUID): Busca do banco via fetchUnifiedMessages()
   │
5. Converte mensagens para formato ChatMessage[]
   │
6. setMessages(converted) → React renderiza
```

### Decisões Técnicas Críticas

#### 1. WAHA CORE vs PRO
- **WAHA CORE** (gratuito): Só retorna thumbnails Base64 (~700-800 bytes)
- URLs de mídia requerem API Key no header
- Browsers não conseguem enviar headers em `<img src>` ou `<video src>`
- **SOLUÇÃO**: Usar Base64 thumbnail quando disponível

#### 2. Sempre Buscar do WAHA para JIDs
```typescript
// ✅ CORRETO - v2.0.9
const isWhatsAppJid = safeConversationId.includes('@c.us') || 
                     safeConversationId.includes('@s.whatsapp.net');
if (isWhatsAppJid) {
  // SEMPRE buscar do WAHA, não do banco
  const rawMessages = await fetchWhatsAppMessages(chatId);
}
```

**Razão**: O banco pode estar desatualizado. WAHA sempre tem as mensagens mais recentes.

#### 3. Extração Robusta de JID
```typescript
// ✅ CORRETO - Evita [object Object] como key
if (typeof rawJid === 'object' && rawJid !== null) {
  rawJid = objJid.id || objJid._serialized || objJid.remoteJid || '';
}
```

#### 4. Formatação de Telefone com DDD
```typescript
// ✅ CORRETO - Mostra (21) 99588-5999
const formattedPhone = formatPhone(phone);
```

## Consequências

### Positivas
- ✅ Mensagens sempre atualizadas (direto do WAHA)
- ✅ Thumbnails funcionam sem proxy
- ✅ Resiliente quando backend offline
- ✅ Suporta texto, imagens, vídeos

### Negativas
- ❌ Mídia completa requer WAHA PRO ou proxy backend
- ❌ Áudios não reproduzem (sem Base64 no WAHA CORE)

## Componentes Envolvidos

| Componente | Arquivo | Responsabilidade |
|------------|---------|------------------|
| ChatModule | `components/chat/ChatModule.tsx` | Container principal |
| SimpleChatInbox | `components/chat/SimpleChatInbox.tsx` | Layout 3 colunas |
| ChatConversationList | `components/chat/ChatConversationList.tsx` | Lista de conversas |
| ChatMessagePanel | `components/chat/ChatMessagePanel.tsx` | **⭐ CRÍTICO** - Exibe mensagens |
| ChatDetailsSidebar | `components/chat/ChatDetailsSidebar.tsx` | Detalhes do contato |
| whatsappChatApi | `utils/whatsappChatApi.ts` | API Layer WAHA |

## Tags de Proteção no Código

```typescript
// 🔒 ZONA_CRITICA_CHAT - NÃO MODIFICAR SEM REVISAR ADR-007
// ⚠️ WAHA_INTEGRATION - Mudanças afetam carregamento de mensagens
// 📱 WHATSAPP_JID - Lógica de identificação de conversas
```

## Referências

- WAHA API Docs: https://waha.devlike.pro/docs/
- ADR-001: Arquitetura Geral
- CHANGELOG-CHAT.md

## Autores

- Copilot Assistant
- Data: 2026-01-24
- Versão do Chat: v2.0.9
