# Bibliotecas do Módulo de Chat

## Dependências Principais

### @chatscope/chat-ui-kit-react
- **Versão**: Instalada
- **Uso**: Componentes de UI para chat (não utilizado atualmente no SimpleChatInbox)
- **Rota de teste**: `/chat-test` (ChatScopeTest.tsx)
- **Status**: Disponível para uso futuro

### @chatscope/chat-ui-kit-styles
- **Versão**: Instalada
- **Uso**: Estilos CSS para os componentes chatscope
- **Status**: Disponível para uso futuro

## Dependências de UI

### lucide-react
- **Uso**: Ícones do chat
- **Ícones utilizados**:
  - `MessageCircle` - Ícone de mensagem
  - `Send` - Botão enviar
  - `Check`, `CheckCheck` - Status de mensagem
  - `Image`, `Paperclip` - Anexos
  - `RefreshCw` - Sincronizar
  - `Loader2` - Loading spinner

### date-fns
- **Uso**: Formatação de datas relativas
- **Funções**: `formatDistanceToNow` com locale `ptBR`

### sonner
- **Uso**: Toast notifications
- **Funções**: `toast.success()`, `toast.error()`

## Componentes UI Internos

### Shadcn/UI (Radix)
- `Button` - Botões de ação
- `Avatar` - Foto do contato
- `ScrollArea` - Área de scroll das mensagens
- `Textarea` - Input de mensagem
- `Badge` - Tags e status
- `Input` - Campo de busca

## APIs Externas

### WAHA (WhatsApp HTTP API)
- **URL**: http://76.13.82.60:3001
- **Autenticação**: Header `X-Api-Key`
- **Documentação**: https://waha.devlike.pro/docs/

### Supabase
- **Edge Functions**: rendizy-server/whatsapp/*
- **Tabelas**: conversations, messages, contacts
- **Realtime**: Subscription para novas mensagens

## Utilitários

### whatsappChatApi.ts
```typescript
// Funções exportadas
export function fetchWhatsAppChats(): Promise<WhatsAppChat[]>
export function fetchWhatsAppMessages(chatId: string): Promise<WhatsAppMessage[]>
export function sendWhatsAppMessage(chatId: string, message: string): Promise<boolean>
export function extractMessageText(msg: any): string
```

### chatUnifiedApi.ts
```typescript
// Funções exportadas (fallback para banco)
export function fetchMessages(conversationId: string): Promise<Message[]>
export function sendMessage(conversationId: string, content: string): Promise<Message>
export function syncConversationHistory(chatId: string): Promise<void>
```

## Estrutura de Tipos

### ChatContact
```typescript
interface ChatContact {
  id: string;              // JID ou UUID
  name: string;            // Nome do contato
  phone: string;           // Telefone formatado
  avatar?: string;         // URL da foto
  lastMessage?: string;    // Última mensagem
  lastMessageAt?: Date;    // Timestamp
  unreadCount: number;     // Não lidas
  channel: 'whatsapp' | 'email' | 'phone';
  category: 'pinned' | 'urgent' | 'normal' | 'resolved';
  type: 'guest' | 'lead';
}
```

### ChatMessage
```typescript
interface ChatMessage {
  id: string;
  text: string;
  fromMe: boolean;
  timestamp: Date;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'error';
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  mediaUrl?: string;
}
```

## Versões

| Biblioteca | Versão | Atualizado |
|------------|--------|------------|
| react | 18.x | ✅ |
| vite | 6.3.5 | ✅ |
| @chatscope/chat-ui-kit-react | latest | ✅ |
| lucide-react | latest | ✅ |
| date-fns | latest | ✅ |
| sonner | latest | ✅ |
