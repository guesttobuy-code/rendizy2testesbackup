# CHANGELOG - Módulo de Chat

Todas as mudanças notáveis do módulo de Chat serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

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
