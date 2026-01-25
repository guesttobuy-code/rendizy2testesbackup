# CHANGELOG - Módulo de Chat

Todas as mudanças notáveis do módulo de Chat serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [4.0.0] - 2026-01-25 🎯

### 🎉 PHASE 3 COMPLETA: Funcionalidades Avançadas!

Implementação completa de recursos avançados de chat comparáveis ao WhatsApp Business.

### ✨ Adicionado

#### 3.1 Reações a Mensagens
- **MessageReactions**: Componente para reagir com 👍❤️😂😮😢🙏
- **ReactionPicker**: Picker flutuante com emojis do WhatsApp
- **useReactions**: Hook para enviar reações via WAHA API `PUT /api/reaction`
- **QuickReactionButton**: Botão de reação rápida no hover da mensagem

#### 3.2 Responder/Citar Mensagens
- **ReplyPreview**: Preview da mensagem sendo respondida no input
- **QuotedMessageDisplay**: Exibe citação dentro da bolha de mensagem
- **ReplyButton**: Botão "Responder" no menu de contexto

#### 3.3 Encaminhar Mensagens
- **ForwardDialog**: Dialog para selecionar múltiplos destinatários
- **ForwardButton**: Botão "Encaminhar" no menu de contexto
- **useForwardMessage**: Hook para `POST /api/forwardMessage`

#### 3.6/3.7/3.8 Envio de Mídia
- **useSendMedia**: Hook unificado para imagem/documento/áudio
  - `sendImage()`: POST /api/sendImage com caption
  - `sendDocument()`: POST /api/sendFile com caption
  - `sendVoice()`: POST /api/sendVoice (áudio OGG/Opus)
  - Progress tracking (0-100%)
  - Limite de 16MB (WhatsApp)
  
- **AudioRecorder**: Componente para gravar mensagens de voz
  - Gravação via MediaRecorder API
  - Preview com playback antes de enviar
  - Waveform visual (placeholder)
  - Timer de duração
  - Cancelar/Enviar

#### 3.9 Busca de Mensagens
- **MessageSearch**: Barra de busca com Ctrl+F
- **useMessageSearch**: Hook para busca local em mensagens
- **highlightSearchMatch**: Helper para destacar texto encontrado
- Navegação entre resultados (Enter/Shift+Enter)
- Contador de resultados "3/10"

### 📁 Arquivos Criados
- `components/chat/MessageReactions.tsx`
- `components/chat/ReplyMessage.tsx`
- `components/chat/ForwardMessage.tsx`
- `components/chat/AudioRecorder.tsx`
- `components/chat/MessageSearch.tsx`
- `hooks/useReactions.ts`
- `hooks/useSendMedia.ts`

### 📁 Arquivos Atualizados
- `components/chat/index.ts` → v4.0.0 com todos os exports

---

## [3.1.0] - 2026-01-25

### 🎉 PHASE 2 COMPLETA: Funcionalidades Críticas

### ✨ Adicionado
- **Fila de Mensagens Offline**: `messageQueue.ts` + `useMessageQueue.ts`
- **Status ACK Visual**: `MessageStatusIndicator.tsx` (✓ ✓✓ 🔵✓✓)
- **Indicador Digitando**: `TypingIndicator.tsx` + `useTypingIndicator.ts`
- **Respostas Rápidas**: `QuickReplies.tsx` com 8 templates padrão
- **Marcar como Lido**: `useSendSeen.ts` via WAHA API

### ⚠️ Limitação Descoberta
- WAHA Core (gratuito) NÃO suporta **enviar** presence/typing
- Retorna 501 Not Implemented para `POST /api/{session}/presence`
- Funcionalidade de "mostrar que estou digitando" desabilitada por padrão

---

## [3.0.0] - 2026-01-18 🚀

### 🎉 GRANDE NOVIDADE: Tempo Real via WebSocket!

Agora o chat funciona **em tempo real**! Mensagens aparecem instantaneamente sem precisar atualizar.

### ✨ Adicionado
- **🚀 useWahaWebSocket**: Novo hook para WebSocket WAHA
  - Reconexão automática (até 10 tentativas)
  - Eventos: `message`, `message.any`, `message.ack`, `presence.update`
  - Status de conexão em tempo real
  
- **⌨️ Indicador "digitando..."**: Aparece quando contato está digitando
- **📶 Indicador de conexão**: Ícone Wifi verde/cinza no header
- **📖 Confirmação de leitura**: Atualização automática de ✓✓ azul

### 🔧 Corrigido
- Mensagens do celular não apareciam sem refresh manual

### 📁 Arquivos Modificados
- `components/chat/ChatMessagePanel.tsx` → v3.0.0
- `hooks/useWahaWebSocket.ts` → NOVO

### 📚 Documentação
- `docs/REALTIME-CHAT-IMPLEMENTATION-GUIDE.md` → Guia completo de implementação

---

## [2.0.9] - 2026-01-24

### 🎉 Funcionalidades Completas
- **Mensagens funcionando 100%**: Texto, imagens, vídeos, emojis
- **Thumbnails de mídia**: Imagens e vídeos com preview Base64
- **Lista de conversas**: 177+ conversas carregadas do WAHA

### 🔧 Corrigido
- **Mensagens não apareciam**: Agora SEMPRE busca do WAHA para JIDs WhatsApp
- **Erro [object Object] como key**: Extração robusta de JID
- **Telefone sem DDD**: Formatação correta (+55 21 99588-5999)

### 🏗️ Arquitetura
- **ADR-007**: Documentação completa da integração WAHA
- **Tags de proteção**: `🔒 ZONA_CRITICA_CHAT` em todos os componentes

---

## [2.0.8] - 2026-01-24

### ✨ Adicionado
- Suporte a Base64 thumbnails do WAHA CORE
- Detecção robusta de tipo de mídia (image, video, audio, document)

### 🔧 Corrigido
- URLs de mídia não carregavam (requerem API Key no header)
- Solução: Usar `_data.body` Base64 que funciona no browser

---

## [2.0.7] - 2026-01-24

### ✨ Adicionado
- Debug logs detalhados para mídia
- Múltiplas fontes para detecção de mediaType

---

## [2.0.6] - 2026-01-24

### 🔧 Corrigido
- **CRÍTICO**: JID retornava como objeto, causando keys duplicadas
- Validação mínima de 8 dígitos para número válido

### 🏗️ Arquitetura
- Extração robusta de JID em ChatConversationList

```typescript
// ANTES (errado)
const jid = chat.remoteJid; // Podia ser objeto!

// DEPOIS (correto)
if (typeof rawJid === 'object' && rawJid !== null) {
  rawJid = objJid.id || objJid._serialized || '';
}
```

---

## [2.0.5] - 2026-01-24

### ✨ Adicionado
- Formatação de telefone com DDD: `+55 21 99588-5999`
- Fallback para WAHA direto quando backend retorna 0 mensagens

---

## [2.0.3] - 2026-01-24

### ✨ Adicionado
- Fallback direto para WAHA quando backend offline
- Header `x-organization-id` para autenticação alternativa

---

## [2.0.0] - 2026-01-22

### 🎉 Major Release
- **SimpleChatInbox**: Layout 3 colunas componentizado
- **ChatMessagePanel**: Área de mensagens isolada
- **ChatConversationList**: Lista com categorias visuais
- **ChatDetailsSidebar**: Detalhes do contato + observações

### 🏗️ Arquitetura
- Componentes 100% isolados e reutilizáveis
- Polling automático de conversas
- Suporte a múltiplos canais preparado

---

## [1.0.0] - 2026-01-15

### 🎉 Release Inicial
- Integração básica com Evolution API
- Lista de conversas
- Envio de mensagens de texto

---

## Legenda

- 🎉 **Major**: Nova versão principal
- ✨ **Adicionado**: Novas funcionalidades
- 🔧 **Corrigido**: Correções de bugs
- 🔒 **Segurança**: Correções de vulnerabilidades
- 🏗️ **Arquitetura**: Mudanças estruturais
- ⚠️ **Deprecado**: Funcionalidades que serão removidas
- 🗑️ **Removido**: Funcionalidades removidas
