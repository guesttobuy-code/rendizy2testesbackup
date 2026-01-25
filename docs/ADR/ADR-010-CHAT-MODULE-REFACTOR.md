# ADR-010: Refatoração do Módulo de Chat WhatsApp

**Status:** Implementado  
**Data:** 2026-01-23  
**Decisores:** Rafael, Copilot  

## Contexto

O módulo de chat WhatsApp apresentava diversos problemas críticos:

1. **API Key hardcoded**: O arquivo `wahaApi.ts` tinha a chave WAHA hardcoded como `"rendizy_waha_2025_super_secret_key_change_this"`
2. **Sem suporte a mídia**: Não era possível enviar/receber imagens, vídeos, áudios ou documentos
3. **Mensagens antigas não carregavam**: Não havia mecanismo para sincronizar histórico do WAHA
4. **Realtime incompleto**: A subscription do Supabase Realtime não capturava informações de mídia
5. **Arquitetura confusa**: Código de providers misturado, violando ADR-008 (Modular Integrations)

## Decisão

### 1. Hierarquia de Configuração WAHA

Implementamos uma função `getWahaConfig()` com hierarquia clara:

```
1. setWahaConfig() - Configuração dinâmica em runtime
2. Variáveis de ambiente VITE_WAHA_*
3. Tabela channel_instances no banco
4. Fallback para http://76.13.82.60:3001
```

**Nunca mais hardcode de API keys.**

### 2. Suporte a Mídia

Adicionamos suporte completo para envio e recebimento de mídia:

- **Tipos suportados**: `image`, `video`, `audio`, `document`
- **Envio**: Via `sendUnifiedMedia()` que aceita arquivo em base64
- **Recebimento**: `ChatMessagePanel` agora renderiza imagens, vídeos, áudio e links de documentos

### 3. Sincronização de Histórico

Nova função `syncConversationHistory()` que:

- Aceita telefone ou UUID de conversa
- Busca mensagens do WAHA via `/api/sessions/{session}/chats/{chatId}/messages`
- Persiste no banco Supabase para consultas futuras
- Cria conversa automaticamente se não existir

### 4. UI Melhorada

`ChatMessagePanel.tsx` agora inclui:

- Botão de sincronizar histórico (ícone de refresh no header)
- Botão de anexar arquivo (ícone de clipe na área de input)
- Preview de mídia antes de enviar
- Renderização inline de imagens, player de vídeo/áudio
- Download de documentos

## Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `utils/wahaApi.ts` | Removido hardcode, adicionado `getWahaConfig()`, suporte a mídia |
| `utils/chatUnifiedApi.ts` | Adicionado `sendUnifiedMedia()`, `syncConversationHistory()` melhorado |
| `components/chat/ChatMessagePanel.tsx` | Suporte completo a mídia (UI), sync button, file input |

## Consequências

### Positivas

- ✅ Configuração centralizada e segura
- ✅ Suporte a mídia (imagens, vídeos, áudios, documentos)
- ✅ Mensagens antigas podem ser sincronizadas
- ✅ Realtime funciona com informações de mídia
- ✅ Arquitetura limpa seguindo ADR-008 e ADR-009

### Negativas

- ⚠️ Requer configuração de variáveis de ambiente ou tabela `channel_instances`
- ⚠️ Sync de histórico pode ser lento para conversas com muitas mensagens

## Configuração Necessária

### Opção 1: Variáveis de Ambiente

```env
VITE_WAHA_API_URL=http://76.13.82.60:3001
VITE_WAHA_API_KEY=sua_chave_aqui
VITE_WAHA_SESSION=default
```

### Opção 2: Tabela channel_instances

```sql
INSERT INTO channel_instances (
  organization_id,
  channel,
  provider,
  instance_name,
  waha_base_url,
  waha_api_key,
  status
) VALUES (
  'seu-org-id',
  'whatsapp',
  'waha',
  'default',
  'http://76.13.82.60:3001',
  'sua_chave_aqui',
  'connected'
);
```

## Referências

- [ADR-008: Modular Integrations](./ADR-008-MODULAR-INTEGRATIONS.md)
- [ADR-009: WhatsApp Multi-Provider](./ADR-009-WHATSAPP-MULTI-PROVIDER.md)
- [WAHA Documentation](https://waha.devlike.pro/)
