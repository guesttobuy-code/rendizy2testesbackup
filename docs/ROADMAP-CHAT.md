# 🗺️ Roadmap - Módulo de Chat Rendizy

> **Última atualização**: 2026-01-25
> **Status**: Em desenvolvimento ativo
> **Responsável**: Equipe Rendizy

---

## 📊 Visão Geral do Progresso

| Fase | Status | Conclusão |
|------|--------|-----------|
| Fase 1 - Fundação | ✅ Completo | 100% |
| Fase 2 - Funcionalidades Críticas | 🔄 Em progresso | 20% |
| Fase 3 - Funcionalidades Importantes | ⏳ Pendente | 0% |
| Fase 4 - Diferenciais | ⏳ Pendente | 0% |

---

## ✅ FASE 1 - FUNDAÇÃO (Concluído)

**Período**: 2026-01-18 a 2026-01-25

### Funcionalidades Entregues

| # | Funcionalidade | Data | Status |
|---|----------------|------|--------|
| 1.1 | Integração WAHA API | 2026-01-22 | ✅ |
| 1.2 | Lista de conversas | 2026-01-22 | ✅ |
| 1.3 | Visualização de mensagens | 2026-01-23 | ✅ |
| 1.4 | Envio de mensagens texto | 2026-01-24 | ✅ |
| 1.5 | Multi-provider (WAHA + Evolution) | 2026-01-25 | ✅ |
| 1.6 | Ordenação dinâmica por última mensagem | 2026-01-25 | ✅ |
| 1.7 | Auto-refresh lista (10s) | 2026-01-25 | ✅ |
| 1.8 | Aumento limite mensagens (50→100) | 2026-01-25 | ✅ |

### Decisões Arquiteturais
- [x] Usar WAHA Core (gratuito) em vez de Evolution
- [x] Adapters pattern para multi-provider
- [x] Polling em vez de WebSocket (simplicidade)
- [x] Backend Supabase Edge Functions como proxy

---

## 🔄 FASE 2 - FUNCIONALIDADES CRÍTICAS

**Período Estimado**: 2026-01-26 a 2026-02-05

> Funcionalidades essenciais que todo chat profissional precisa ter.

### 2.1 Fila de Mensagens Offline (Queue)
**Prioridade**: 🔴 Crítica  
**Estimativa**: 2 dias  
**Data Alvo**: 2026-01-27

**Descrição**:
- Salvar mensagens não enviadas em `localStorage`
- Reenviar automaticamente quando voltar online
- Indicador visual "⏳ Aguardando conexão..."
- Retry com backoff exponencial (3s, 6s, 12s...)
- Limite de 50 mensagens na fila

**Implementação**:
```typescript
interface QueuedMessage {
  id: string;
  chatId: string;
  text: string;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'sending' | 'failed';
}
```

**Arquivos a modificar**:
- [ ] `utils/chat/messageQueue.ts` (novo)
- [ ] `components/chat/ChatMessagePanel.tsx`
- [ ] `hooks/useMessageQueue.ts` (novo)

---

### 2.2 Status de Entrega (ACK Indicators)
**Prioridade**: 🔴 Crítica  
**Estimativa**: 1 dia  
**Data Alvo**: 2026-01-28

**Descrição**:
Mostrar status de entrega das mensagens enviadas:
- ⏳ `ack=0` - Pendente (relógio)
- ✓ `ack=1` - Enviado ao servidor (1 check cinza)
- ✓✓ `ack=2` - Entregue ao dispositivo (2 checks cinza)
- ✓✓ `ack=3` - Lido (2 checks azuis)
- ▶️ `ack=4` - Reproduzido (para áudios)

**API WAHA utilizada**:
```
GET /api/{session}/chats/{chatId}/messages
Response: { ack: 0|1|2|3|4, ackName: "PENDING"|"SERVER"|"DEVICE"|"READ"|"PLAYED" }
```

**Arquivos a modificar**:
- [ ] `components/chat/MessageBubble.tsx`
- [ ] `types/chat.ts` (adicionar ack)

---

### 2.3 Indicador "Digitando..."
**Prioridade**: 🔴 Crítica  
**Estimativa**: 2 dias  
**Data Alvo**: 2026-01-30

**Descrição**:
- Mostrar "Fulano está digitando..." quando outro usuário digita
- Enviar typing indicator quando usuário local digita
- Auto-timeout após 5 segundos sem atividade

**API WAHA utilizada**:
```
POST /api/{session}/presence
Body: { chatId: "123@c.us", presence: "typing" }

Webhook: presence.update
{ event: "presence.update", payload: { presences: [{ lastKnownPresence: "typing" }] } }
```

**Arquivos a modificar**:
- [ ] `hooks/useTypingIndicator.ts` (novo)
- [ ] `components/chat/ChatMessagePanel.tsx`
- [ ] `components/chat/TypingIndicator.tsx` (novo)

---

### 2.4 Respostas Rápidas / Templates
**Prioridade**: 🔴 Crítica  
**Estimativa**: 3 dias  
**Data Alvo**: 2026-02-02

**Descrição**:
- Atalho `/` para abrir menu de templates
- Templates pré-definidos por organização
- Variáveis dinâmicas: `{nome}`, `{propriedade}`, `{checkin}`
- CRUD de templates no painel admin

**Templates padrão**:
```
/boas-vindas → "Olá {nome}! Seja bem-vindo(a) ao {propriedade}. 🏠"
/checkin → "Seu check-in está confirmado para {checkin}. Endereço: {endereco}"
/checkout → "Esperamos que tenha tido uma ótima estadia! ⭐"
/wifi → "Rede: {wifi_nome} | Senha: {wifi_senha}"
/urgente → "Recebemos sua mensagem e vamos responder em breve! 🚨"
```

**Arquivos a criar**:
- [ ] `components/chat/QuickReplies.tsx`
- [ ] `utils/chat/templateParser.ts`
- [ ] Tabela `quick_reply_templates` no Supabase

---

### 2.5 Marcar como Lido (Send Seen)
**Prioridade**: 🔴 Crítica  
**Estimativa**: 1 dia  
**Data Alvo**: 2026-02-03

**Descrição**:
- Marcar mensagens como lidas ao abrir conversa
- Atualizar contador de não-lidas na lista
- Enviar double-check azul para o remetente

**API WAHA utilizada**:
```
POST /api/sendSeen
Body: { session: "default", chatId: "123@c.us" }

POST /api/{session}/chats/{chatId}/messages/read
```

**Arquivos a modificar**:
- [ ] `hooks/useChatPolling.ts`
- [ ] `components/chat/ChatConversationList.tsx`

---

## ⏳ FASE 3 - FUNCIONALIDADES IMPORTANTES

**Período Estimado**: 2026-02-06 a 2026-02-20

| # | Funcionalidade | Estimativa | Data Alvo | Prioridade |
|---|----------------|------------|-----------|------------|
| 3.1 | Reagir a mensagens (👍❤️😂) | 1 dia | 2026-02-06 | 🟡 |
| 3.2 | Responder mensagem específica (quote) | 2 dias | 2026-02-08 | 🟡 |
| 3.3 | Encaminhar mensagem | 1 dia | 2026-02-09 | 🟡 |
| 3.4 | Editar mensagem enviada | 1 dia | 2026-02-10 | 🟡 |
| 3.5 | Deletar mensagem ("apagar para todos") | 1 dia | 2026-02-11 | 🟡 |
| 3.6 | Envio de imagens | 2 dias | 2026-02-13 | 🟡 |
| 3.7 | Envio de arquivos/documentos | 2 dias | 2026-02-15 | 🟡 |
| 3.8 | Envio de áudio (gravar) | 3 dias | 2026-02-18 | 🟡 |
| 3.9 | Busca de mensagens | 2 dias | 2026-02-20 | 🟡 |

### APIs WAHA correspondentes:
```
PUT  /api/reaction                    → Reagir
POST /api/sendText + reply_to         → Responder
POST /api/forwardMessage              → Encaminhar
PUT  /api/{session}/chats/{id}/messages/{msgId} → Editar
DELETE /api/{session}/chats/{id}/messages/{msgId} → Deletar
POST /api/sendImage                   → Enviar imagem
POST /api/sendFile                    → Enviar arquivo
POST /api/sendVoice                   → Enviar áudio
```

---

## ⏳ FASE 4 - DIFERENCIAIS

**Período Estimado**: 2026-02-21 a 2026-03-15

| # | Funcionalidade | Estimativa | Data Alvo | Prioridade |
|---|----------------|------------|-----------|------------|
| 4.1 | Preview de link (OG tags) | 2 dias | 2026-02-23 | 🟢 |
| 4.2 | Enviar localização | 1 dia | 2026-02-24 | 🟢 |
| 4.3 | Enviar contato (vCard) | 1 dia | 2026-02-25 | 🟢 |
| 4.4 | Mensagens agendadas | 3 dias | 2026-02-28 | 🟢 |
| 4.5 | Fixar mensagem no chat | 1 dia | 2026-03-01 | 🟢 |
| 4.6 | Favoritar/estrelar mensagem | 1 dia | 2026-03-02 | 🟢 |
| 4.7 | Notas internas (visível só para equipe) | 2 dias | 2026-03-04 | 🟢 |
| 4.8 | Integração Airbnb mensagens | 5 dias | 2026-03-09 | 🟢 |
| 4.9 | Integração Booking mensagens | 5 dias | 2026-03-14 | 🟢 |
| 4.10 | AI Auto-responder | 5 dias | 2026-03-19 | 🟢 |

---

## 📈 Métricas de Sucesso

### KPIs do Módulo de Chat

| Métrica | Meta | Atual |
|---------|------|-------|
| Tempo médio de resposta | < 5 min | - |
| Taxa de mensagens entregues | > 99% | - |
| Uptime da integração WAHA | > 99.5% | ~100% |
| Satisfação do usuário (NPS) | > 8 | - |

---

## 🔗 Referências

### Documentação Interna
- [ARCHITECTURE-CHAT.md](./ARCHITECTURE-CHAT.md) - Arquitetura do módulo
- [ADR-007: WAHA Integration](./adr/ADR-007-CHAT-MODULE-WAHA-INTEGRATION.md)
- [ADR-009: Multi-Provider](./adr/ADR-009-WHATSAPP-MULTI-PROVIDER.md)
- [CHANGELOG-CHAT.md](./CHANGELOG-CHAT.md)

### Documentação Externa
- [WAHA API Docs](https://waha.devlike.pro/docs/)
- [WAHA Send Messages](https://waha.devlike.pro/docs/how-to/send-messages/)
- [WAHA Presence](https://waha.devlike.pro/docs/how-to/presence/)
- [WAHA Chats](https://waha.devlike.pro/docs/how-to/chats/)

### Benchmarks de Mercado
- [Respond.io](https://respond.io) - Referência em inbox unificado
- [Chatwoot](https://chatwoot.com) - Open source chat platform
- [Intercom](https://intercom.com) - Customer messaging

---

## 📝 Changelog do Roadmap

| Data | Mudança |
|------|---------|
| 2026-01-25 | Criação inicial do roadmap |
| 2026-01-25 | Fase 1 marcada como completa |
| 2026-01-25 | Adicionadas estimativas Fase 2-4 |

---

> **Nota**: Este roadmap é atualizado semanalmente. Datas são estimativas e podem mudar conforme prioridades do negócio.
