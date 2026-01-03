# 🔗 SISTEMA DE WEBHOOKS - Evolution API v1.0.103.322

## 📊 VISÃO GERAL

Sistema completo de configuração e monitoramento de webhooks para receber eventos em tempo real da Evolution API.

---

## ✨ FEATURES IMPLEMENTADAS

### 1️⃣ **Configuração Automática**
- ✅ Ativação de webhook com 1 clique
- ✅ Seleção de 19 eventos diferentes
- ✅ URL gerada automaticamente
- ✅ Configuração salva no Supabase (KV Store)

### 2️⃣ **Monitoramento em Tempo Real**
- ✅ Visualização dos últimos 50 eventos
- ✅ Detalhes completos de cada evento
- ✅ Timestamp de recebimento
- ✅ Auto-refresh dos eventos

### 3️⃣ **Gestão de Eventos**
- ✅ 19 tipos de eventos disponíveis
- ✅ Ativar/desativar eventos individualmente
- ✅ Modo "webhook por evento" opcional
- ✅ Persistência no KV Store

---

## 🛠️ EVENTOS DISPONÍVEIS

| Evento | Descrição | Quando é disparado |
|--------|-----------|-------------------|
| `APPLICATION_STARTUP` | Inicialização | Quando a aplicação inicia |
| `QRCODE_UPDATED` | QR Code | Quando QR Code é atualizado |
| `MESSAGES_SET` | Mensagens (Set) | Conjunto de mensagens |
| `MESSAGES_UPSERT` | Mensagens (Nova) | Nova mensagem recebida |
| `MESSAGES_UPDATE` | Mensagens (Update) | Mensagem atualizada |
| `SEND_MESSAGE` | Envio | Mensagem enviada |
| `CHATS_SET` | Chats (Set) | Conjunto de chats |
| `CHATS_UPSERT` | Chats (Novo) | Novo chat criado |
| `CHATS_UPDATE` | Chats (Update) | Chat atualizado |
| `CHATS_DELETE` | Chats (Delete) | Chat deletado |
| `CONTACTS_SET` | Contatos (Set) | Conjunto de contatos |
| `CONTACTS_UPSERT` | Contatos (Novo) | Novo contato |
| `CONTACTS_UPDATE` | Contatos (Update) | Contato atualizado |
| `PRESENCE_UPDATE` | Presença | Status de presença |
| `CONNECTION_UPDATE` | Conexão | Status de conexão |
| `GROUPS_UPSERT` | Grupos (Novo) | Novo grupo |
| `GROUPS_UPDATE` | Grupos (Update) | Grupo atualizado |
| `GROUP_PARTICIPANTS_UPDATE` | Participantes | Membros do grupo |
| `CALL` | Chamadas | Chamadas recebidas |

---

## 🚀 COMO USAR

### **1. Acessar a Tela de Webhooks**

1. Acesse **Integrações → WhatsApp**
2. Clique na aba **"Webhooks"**

### **2. Configurar Webhook**

1. Selecione os eventos desejados (ou clique em "Marcar Todos")
2. Configure o modo "webhook por evento" se necessário
3. Clique em **"Ativar Webhook"**
4. Aguarde a confirmação de sucesso

### **3. Monitorar Eventos**

- Os eventos recebidos aparecem automaticamente na lista
- Clique em "Ver dados do evento" para detalhes
- Use o botão refresh para atualizar a lista

### **4. Desativar Webhook**

- Clique no botão **"Remover"** (vermelho)
- Confirme a ação

---

## 🔧 ROTAS DO BACKEND

### **POST /make-server-67caf26a/whatsapp/webhook/setup**
Configura o webhook automaticamente na Evolution API.

**Request:**
```json
{
  "webhookUrl": "https://xxx.supabase.co/functions/v1/make-server-67caf26a/whatsapp/webhook",
  "events": ["MESSAGES_UPSERT", "CHATS_UPDATE", ...],
  "webhookByEvents": false
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "config": {
    "enabled": true,
    "url": "...",
    "events": [...],
    "configuredAt": "2025-11-06T..."
  }
}
```

---

### **GET /make-server-67caf26a/whatsapp/webhook/status**
Verifica o status atual do webhook.

**Response:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "configured": true,
    "url": "...",
    "events": [...]
  }
}
```

---

### **GET /make-server-67caf26a/whatsapp/webhook/events**
Lista os últimos 50 eventos recebidos.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "event": "MESSAGES_UPSERT",
      "data": { ... },
      "receivedAt": "2025-11-06T..."
    },
    ...
  ],
  "count": 50
}
```

---

### **DELETE /make-server-67caf26a/whatsapp/webhook**
Remove a configuração do webhook.

**Response:**
```json
{
  "success": true,
  "message": "Webhook removido com sucesso"
}
```

---

### **POST /make-server-67caf26a/whatsapp/webhook**
Recebe eventos da Evolution API (endpoint de recebimento).

**Payload Evolution API:**
```json
{
  "event": "MESSAGES_UPSERT",
  "instance": "rendizy_instance",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "..."
    },
    "message": { ... }
  }
}
```

---

## 💾 ESTRUTURA KV STORE

### **Configuração do Webhook**
```
Key: whatsapp:webhook:config:default
Value: {
  enabled: true,
  url: "...",
  events: [...],
  webhookByEvents: false,
  configuredAt: "2025-11-06T..."
}
```

### **Eventos Recebidos**
```
Key: whatsapp:webhook:message:{messageId}:default
Value: {
  event: "MESSAGES_UPSERT",
  data: { ... },
  receivedAt: "2025-11-06T..."
}
```

---

## 🎯 CASOS DE USO

### **1. Receber Mensagens em Tempo Real**
```typescript
// O webhook processa automaticamente
// Eventos são salvos no KV Store
// Frontend pode buscar via /webhook/events
```

### **2. Monitorar Status de Conexão**
```typescript
// Evento: CONNECTION_UPDATE
// Webhook notifica quando conexão muda
// Sistema pode alertar usuário automaticamente
```

### **3. Sincronizar Contatos**
```typescript
// Eventos: CONTACTS_SET, CONTACTS_UPSERT, CONTACTS_UPDATE
// Webhook mantém lista de contatos sincronizada
// Dados persistidos no KV Store
```

### **4. Gerenciar Grupos**
```typescript
// Eventos: GROUPS_UPSERT, GROUPS_UPDATE, GROUP_PARTICIPANTS_UPDATE
// Webhook rastreia mudanças em grupos
// Atualiza lista de participantes automaticamente
```

---

## 🔐 SEGURANÇA

### **Validação de Instância**
```typescript
// O webhook valida a instância recebida
if (instance && instance !== EVOLUTION_INSTANCE_NAME) {
  console.warn('Instância não reconhecida');
  return error(400);
}
```

### **Tenant Isolation**
```typescript
// Eventos são isolados por tenant
const key = `whatsapp:webhook:message:${id}:${tenantId}`;
```

---

## 📊 ESTATÍSTICAS

- **Total de Rotas:** 34 (antes: 30)
- **Novos Endpoints:** 4
- **Eventos Suportados:** 19
- **Componentes Novos:** 1 (WhatsAppWebhookManager.tsx)
- **Linhas de Código:** ~700

---

## 🎨 INTERFACE

### **Seção 1: Configuração**
- ✅ URL do webhook (read-only + botão copiar)
- ✅ Toggle "Webhook por Evento"
- ✅ Checkbox para cada tipo de evento
- ✅ Contador de eventos selecionados
- ✅ Botões "Ativar/Atualizar" e "Remover"

### **Seção 2: Eventos Recebidos**
- ✅ Lista scrollável dos últimos 50 eventos
- ✅ Badge com nome do evento
- ✅ Timestamp formatado
- ✅ Detalhes expandíveis (JSON)
- ✅ Botão refresh

---

## 🐛 TROUBLESHOOTING

### **Webhook não está recebendo eventos**
1. Verifique se o webhook está ativo: `GET /webhook/status`
2. Confirme a URL está correta
3. Teste enviar uma mensagem no WhatsApp
4. Verifique logs do backend

### **Eventos não aparecem na lista**
1. Clique no botão refresh
2. Verifique se os eventos estão sendo salvos no KV Store
3. Confirme que o webhook está processando corretamente

### **Erro ao configurar webhook**
1. Verifique suas credenciais Evolution API
2. Confirme que a instância existe
3. Teste conexão na aba "Testar"

---

## 🎉 PRÓXIMOS PASSOS

### **Melhorias Futuras**
- [ ] Filtros de eventos por tipo
- [ ] Busca em eventos recebidos
- [ ] Export de eventos para CSV
- [ ] Notificações push quando eventos específicos ocorrem
- [ ] Dashboard de estatísticas de eventos
- [ ] Retry automático de webhooks falhados

---

## 📚 REFERÊNCIAS

- [Evolution API Docs](https://doc.evolution-api.com/)
- [Supabase KV Store](/supabase/functions/server/kv_store.tsx)
- [WhatsApp Evolution Routes](/supabase/functions/server/routes-whatsapp-evolution-complete.ts)
- [Webhook Manager Component](/components/WhatsAppWebhookManager.tsx)

---

**Versão:** v1.0.103.322  
**Data:** 06 de novembro de 2025  
**Autor:** Sistema RENDIZY  
**Status:** ✅ Implementado e Testado
