# 💬 PLANEJAMENTO: MÓDULO CENTRAL DE MENSAGENS

**Criado em:** 29 OUT 2025  
**Status:** 📋 PLANEJADO (Não implementado)  
**Prioridade:** 🟡 MÉDIA (P2)  
**Versão Prevista:** v1.0.85  
**Tempo Estimado:** 6-8 horas  

---

## 🎯 OBJETIVO

Criar uma **Central de Mensagens Unificada** que permita comunicação centralizada com hóspedes através de múltiplos canais (WhatsApp, Email, Airbnb, Booking.com, Direct), com histórico completo, templates, automação e integração com reservas.

---

## 🔍 ANÁLISE DO MERCADO

### BVM Stays - Central de Mensagens

**Funcionalidades Observadas:**
- ✅ Inbox unificado (todos os canais em uma interface)
- ✅ Filtros por canal (WhatsApp, Email, Airbnb, etc.)
- ✅ Busca por hóspede/reserva
- ✅ Templates de mensagens predefinidos
- ✅ Automação de respostas
- ✅ Histórico completo por hóspede
- ✅ Indicadores visuais (lido/não lido)
- ✅ Respostas rápidas (quick replies)
- ✅ Anexos (fotos, PDFs)
- ✅ Tags e categorização

### Hostfully - Mensagens

**Funcionalidades Observadas:**
- ✅ Templates multilíngues (PT/EN/ES)
- ✅ Variáveis dinâmicas ({guest_name}, {checkin_date}, etc.)
- ✅ Agendamento de mensagens
- ✅ Triggers automáticos (reserva confirmada, 24h antes checkin, etc.)
- ✅ Integração com WhatsApp Business API
- ✅ Histórico de mensagens por reserva

### Guesty - Communication Hub

**Funcionalidades Observadas:**
- ✅ Unified Inbox (todos os canais)
- ✅ Auto-resposta inteligente (AI)
- ✅ Tradução automática
- ✅ SLA tracking (tempo de resposta)
- ✅ Notas internas (não visíveis para hóspede)
- ✅ Atribuição de conversas a usuários

---

## 📦 FUNCIONALIDADES PLANEJADAS

### 1. INBOX UNIFICADO 📥

**Interface Principal:**
```
┌─────────────────────────────────────────────────────┐
│  💬 Central de Mensagens                       [⚙️]  │
├─────────────────┬───────────────────────────────────┤
│                 │                                   │
│  FILTROS        │  CONVERSAS                        │
│  ─────────      │  ─────────                        │
│                 │                                   │
│  📱 WhatsApp    │  ┌─────────────────────────────┐ │
│  ✉️ Email       │  │ 🟢 João Silva               │ │
│  🏠 Airbnb      │  │ Casa 003 - Itaúnas         │ │
│  🔵 Booking     │  │ Check-in: 25/12/2025       │ │
│  👤 Direct      │  │ Última msg: 10:30          │ │
│                 │  │ "Qual o código WiFi?"      │ │
│  STATUS         │  └─────────────────────────────┘ │
│  ─────────      │                                   │
│  🔴 Não lidas   │  ┌─────────────────────────────┐ │
│  ⚪ Lidas       │  │ ⚪ Maria Santos             │ │
│  ⏳ Pendente    │  │ Arraial Novo - Barra       │ │
│  ✅ Resolvida   │  │ Check-out: 20/12/2025      │ │
│                 │  │ Última msg: ontem          │ │
│                 │  │ "Obrigada pela estadia!"   │ │
│                 │  └─────────────────────────────┘ │
│                 │                                   │
└─────────────────┴───────────────────────────────────┘
```

**Componentes:**
- `MessagesInbox.tsx` - Componente principal
- `ConversationList.tsx` - Lista de conversas
- `MessageThread.tsx` - Thread de mensagens
- `MessageComposer.tsx` - Área de composição
- `ChannelFilter.tsx` - Filtro por canal
- `StatusFilter.tsx` - Filtro por status

---

### 2. CANAIS DE COMUNICAÇÃO 📡

#### 2.1 WhatsApp Business API

**Integração Oficial:**
- WhatsApp Business API (oficial)
- Webhook para receber mensagens
- Envio de mensagens de texto
- Envio de mídia (imagens, PDFs)
- Templates aprovados pelo WhatsApp
- Status de entrega (enviado, entregue, lido)

**Setup Necessário:**
- Meta Business Manager
- Número verificado
- API Token
- Webhook URL

**Exemplo de Template WhatsApp:**
```
Olá {{guest_name}}! 

Sua reserva em {{property_name}} foi confirmada! ✅

📅 Check-in: {{checkin_date}} às {{checkin_time}}
📅 Check-out: {{checkout_date}} às {{checkout_time}}

📍 Endereço: {{property_address}}

Em breve enviaremos mais informações. 😊

Equipe {{organization_name}}
```

#### 2.2 Email

**Funcionalidades:**
- SMTP integrado (SendGrid, AWS SES, Mailgun)
- Templates HTML responsivos
- Anexos
- CC/BCC
- Assinatura personalizada
- Tracking de abertura/cliques

**Exemplo de Email HTML:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Confirmação de Reserva</title>
</head>
<body style="font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto;">
    <h1>🏠 Reserva Confirmada!</h1>
    <p>Olá <strong>{{guest_name}}</strong>,</p>
    <p>Sua reserva foi confirmada com sucesso!</p>
    
    <div style="background: #f5f5f5; padding: 20px;">
      <h3>📋 Detalhes da Reserva</h3>
      <p><strong>Imóvel:</strong> {{property_name}}</p>
      <p><strong>Check-in:</strong> {{checkin_date}}</p>
      <p><strong>Check-out:</strong> {{checkout_date}}</p>
      <p><strong>Hóspedes:</strong> {{guests_count}}</p>
      <p><strong>Total:</strong> R$ {{total_price}}</p>
    </div>
    
    <p>Aguardamos você! 😊</p>
  </div>
</body>
</html>
```

#### 2.3 Airbnb Messaging API

**Integração:**
- Airbnb Messaging API
- Receber mensagens do hóspede
- Enviar respostas
- Sincronização bidirecional
- Indicadores de leitura

**Limitações:**
- Rate limits da API
- Mensagens apenas para reservas ativas

#### 2.4 Booking.com Messaging

**Integração:**
- Booking.com Partner Hub API
- Receber mensagens via webhook
- Enviar respostas
- Templates pré-aprovados

#### 2.5 Direct (Sistema Interno)

**Para reservas diretas:**
- Email automático
- SMS (Twilio)
- Notificações push
- Link de acesso ao portal do hóspede

---

### 3. TEMPLATES DE MENSAGENS 📝

#### 3.1 Templates Predefinidos

**Categorias de Templates:**

**Pré Check-in:**
- ✅ Confirmação de reserva
- ✅ Lembrete 7 dias antes
- ✅ Lembrete 24h antes
- ✅ Instruções de check-in
- ✅ Código de acesso
- ✅ Manual do hóspede

**Durante Estadia:**
- ✅ Boas-vindas
- ✅ Lembrete de regras
- ✅ Ofertas de extensão
- ✅ Suporte disponível

**Pós Check-out:**
- ✅ Agradecimento
- ✅ Pedido de review
- ✅ Cupom de desconto (próxima reserva)
- ✅ Pesquisa de satisfação

**Exemplo de Estrutura:**
```typescript
interface MessageTemplate {
  id: string;
  name: string;
  category: 'pre_checkin' | 'during_stay' | 'post_checkout' | 'custom';
  trigger?: 'booking_confirmed' | 'checkin_minus_7d' | 'checkin_minus_24h' | 'checkin' | 'checkout';
  channels: ('whatsapp' | 'email' | 'sms')[];
  languages: {
    pt: {
      subject?: string;
      body: string;
    };
    en: {
      subject?: string;
      body: string;
    };
    es: {
      subject?: string;
      body: string;
    };
  };
  variables: string[]; // ['guest_name', 'property_name', 'checkin_date']
  attachments?: string[];
  autoSend: boolean;
}
```

#### 3.2 Variáveis Dinâmicas

**Variáveis Disponíveis:**
```typescript
{
  // Hóspede
  guest_name: "João Silva",
  guest_email: "joao@email.com",
  guest_phone: "+55 21 99999-9999",
  
  // Reserva
  reservation_id: "RES-001",
  checkin_date: "25/12/2025",
  checkin_time: "14:00",
  checkout_date: "30/12/2025",
  checkout_time: "11:00",
  nights: 5,
  guests_count: 4,
  total_price: "R$ 2.500,00",
  
  // Imóvel
  property_name: "Casa 003 - Itaúnas",
  property_address: "Rua das Flores, 123",
  property_city: "Itaúnas",
  property_state: "RJ",
  wifi_name: "Casa003_WiFi",
  wifi_password: "senha123",
  access_code: "1234",
  
  // Organização
  organization_name: "Imobiliária XYZ",
  organization_phone: "+55 21 3333-3333",
  organization_email: "contato@xyz.com.br",
  support_whatsapp: "+55 21 99999-8888"
}
```

#### 3.3 Editor de Templates

**Interface:**
```
┌─────────────────────────────────────────────────────┐
│  ✏️ Editar Template                                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Nome: Confirmação de Reserva                       │
│  Categoria: Pré Check-in                            │
│  Idiomas: [PT] [EN] [ES]                            │
│  Canais: [✅ WhatsApp] [✅ Email] [ ] SMS           │
│                                                     │
│  ─────────────────────────────────────────────────  │
│  CONTEÚDO (PT)                                      │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  Assunto: Confirmação de Reserva - {property_name}  │
│                                                     │
│  Mensagem:                                          │
│  ┌───────────────────────────────────────────────┐ │
│  │ Olá {guest_name}!                             │ │
│  │                                               │ │
│  │ Sua reserva foi confirmada! ✅               │ │
│  │                                               │ │
│  │ 📅 Check-in: {checkin_date} às {checkin_time}│ │
│  │ 📅 Check-out: {checkout_date}                │ │
│  │ 🏠 Imóvel: {property_name}                   │ │
│  │ 👥 Hóspedes: {guests_count}                  │ │
│  │ 💰 Total: {total_price}                      │ │
│  │                                               │ │
│  │ Em breve enviaremos mais informações. 😊     │ │
│  │                                               │ │
│  │ Equipe {organization_name}                   │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  Variáveis disponíveis:                             │
│  [guest_name] [property_name] [checkin_date] ...    │
│                                                     │
│  [ Testar Template ]    [ Salvar ]    [ Cancelar ]  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### 4. AUTOMAÇÃO DE MENSAGENS 🤖

#### 4.1 Triggers Automáticos

**Eventos Suportados:**
```typescript
type MessageTrigger = 
  | 'booking_confirmed'       // Reserva confirmada
  | 'booking_cancelled'       // Reserva cancelada
  | 'checkin_minus_7d'        // 7 dias antes check-in
  | 'checkin_minus_24h'       // 24h antes check-in
  | 'checkin_minus_2h'        // 2h antes check-in
  | 'checkin'                 // No momento do check-in
  | 'during_stay'             // Durante estadia (diário)
  | 'checkout_minus_24h'      // 24h antes check-out
  | 'checkout'                // No momento do check-out
  | 'checkout_plus_2h'        // 2h após check-out
  | 'checkout_plus_24h'       // 24h após check-out (review)
  | 'payment_received'        // Pagamento recebido
  | 'payment_pending'         // Pagamento pendente
  | 'custom_date';            // Data customizada
```

**Exemplo de Configuração:**
```typescript
interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: MessageTrigger;
  template_id: string;
  conditions?: {
    property_ids?: string[];      // Apenas para propriedades específicas
    platform?: string[];          // Apenas para plataformas específicas
    min_nights?: number;          // Apenas reservas com X noites ou mais
    guest_type?: 'new' | 'returning'; // Apenas hóspedes novos/recorrentes
  };
  delay_minutes?: number;         // Delay opcional
  channels: ('whatsapp' | 'email' | 'sms')[];
}
```

**Exemplo Prático:**
```typescript
const automationRules: AutomationRule[] = [
  {
    id: 'auto-001',
    name: 'Confirmação Imediata',
    enabled: true,
    trigger: 'booking_confirmed',
    template_id: 'tpl-confirmation',
    channels: ['whatsapp', 'email'],
    delay_minutes: 0
  },
  {
    id: 'auto-002',
    name: 'Lembrete 24h Antes',
    enabled: true,
    trigger: 'checkin_minus_24h',
    template_id: 'tpl-reminder-24h',
    channels: ['whatsapp'],
    delay_minutes: 0
  },
  {
    id: 'auto-003',
    name: 'Pedido de Review',
    enabled: true,
    trigger: 'checkout_plus_24h',
    template_id: 'tpl-review-request',
    channels: ['email'],
    conditions: {
      min_nights: 2 // Apenas reservas de 2+ noites
    },
    delay_minutes: 0
  }
];
```

#### 4.2 Respostas Automáticas

**Baseado em Palavras-chave:**
```typescript
interface AutoReply {
  id: string;
  keywords: string[];
  response: string;
  channels: string[];
  enabled: boolean;
}

const autoReplies: AutoReply[] = [
  {
    id: 'ar-001',
    keywords: ['wifi', 'senha', 'internet'],
    response: 'O WiFi é: {wifi_name}\nSenha: {wifi_password}',
    channels: ['whatsapp'],
    enabled: true
  },
  {
    id: 'ar-002',
    keywords: ['código', 'acesso', 'portão'],
    response: 'O código de acesso é: {access_code}',
    channels: ['whatsapp'],
    enabled: true
  },
  {
    id: 'ar-003',
    keywords: ['checkout', 'saída', 'horário'],
    response: 'O checkout é às {checkout_time}. Por favor, deixe a chave no porta-chaves.',
    channels: ['whatsapp', 'email'],
    enabled: true
  }
];
```

---

### 5. HISTÓRICO E BUSCA 🔍

**Funcionalidades:**
- ✅ Histórico completo de mensagens por hóspede
- ✅ Busca por palavra-chave
- ✅ Filtro por data
- ✅ Filtro por canal
- ✅ Filtro por status (lida/não lida)
- ✅ Exportação de conversas (PDF/TXT)

**Interface de Busca:**
```
┌─────────────────────────────────────────────────────┐
│  🔍 Buscar mensagens                                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [____________ Digite sua busca ____________] 🔍    │
│                                                     │
│  Filtros:                                           │
│  ┌─ Canal ────────┐  ┌─ Status ────────┐           │
│  │ [ ] WhatsApp   │  │ [ ] Não lidas   │           │
│  │ [ ] Email      │  │ [ ] Lidas       │           │
│  │ [ ] Airbnb     │  │ [ ] Pendentes   │           │
│  │ [ ] Booking    │  │ [ ] Resolvidas  │           │
│  └────────────────┘  └─────────────────┘           │
│                                                     │
│  Período:                                           │
│  [01/10/2025] até [29/10/2025]                     │
│                                                     │
│  [ Buscar ]  [ Limpar Filtros ]                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### 6. ANEXOS E MÍDIA 📎

**Tipos Suportados:**
- 🖼️ Imagens (JPG, PNG, GIF)
- 📄 Documentos (PDF, DOC, DOCX)
- 📊 Planilhas (XLS, XLSX, CSV)
- 🎥 Vídeos (MP4, MOV) - limite 16MB

**Upload:**
```typescript
interface MessageAttachment {
  id: string;
  message_id: string;
  filename: string;
  filesize: number;
  mimetype: string;
  url: string;
  uploaded_at: Date;
}
```

**Exemplos de Uso:**
- Manual do hóspede (PDF)
- Mapa de localização (PNG)
- Vídeo tutorial check-in (MP4)
- Contrato de locação (PDF)

---

### 7. NOTAS INTERNAS 📝

**Funcionalidade:**
- Notas visíveis apenas para a equipe
- Não são enviadas ao hóspede
- Úteis para handoff entre atendentes
- Tags e menções (@usuario)

**Interface:**
```
┌─────────────────────────────────────────────────────┐
│  💬 Conversa com João Silva                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🟦 João Silva                           10:30      │
│  Qual o código do WiFi?                             │
│                                                     │
│  ✅ Você                                 10:32      │
│  O WiFi é: Casa003_WiFi                             │
│  Senha: senha123                                    │
│                                                     │
│  📝 NOTA INTERNA (não visível para hóspede)         │
│  ┌─────────────────────────────────────────────┐   │
│  │ @maria: Cliente perguntou sobre o WiFi.    │   │
│  │ Já enviei a senha. Checar se está          │   │
│  │ funcionando quando ele chegar.             │   │
│  └─────────────────────────────────────────────┘   │
│                                  Você - 10:33       │
│                                                     │
│  🟦 João Silva                           11:15      │
│  Perfeito, obrigado!                                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### 8. MÉTRICAS E ANALYTICS 📊

**KPIs Importantes:**
- ⏱️ Tempo médio de resposta
- 📨 Taxa de resposta
- 📬 Mensagens não respondidas
- 📊 Volume de mensagens por canal
- 👥 Conversas ativas
- ✅ Taxa de resolução

**Dashboard:**
```
┌─────────────────────────────────────────────────────┐
│  📊 Métricas de Mensagens - Outubro 2025            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ⏱️ Tempo Médio de Resposta: 12 min               │
│  📨 Taxa de Resposta: 98%                          │
│  📬 Mensagens Pendentes: 3                         │
│  👥 Conversas Ativas: 24                           │
│                                                     │
│  ─────────────────────────────────────────────────  │
│  MENSAGENS POR CANAL                                │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  WhatsApp:  ████████████████████ 450 (65%)         │
│  Email:     ██████████ 180 (26%)                   │
│  Airbnb:    ███ 45 (6%)                            │
│  Booking:   █ 15 (2%)                              │
│  Direct:    █ 5 (1%)                               │
│                                                     │
│  ─────────────────────────────────────────────────  │
│  TOP 5 PERGUNTAS                                    │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  1. WiFi/senha (89 vezes)                           │
│  2. Código de acesso (67 vezes)                     │
│  3. Horário check-in/out (54 vezes)                 │
│  4. Localização (32 vezes)                          │
│  5. Estacionamento (28 vezes)                       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🛠️ ARQUITETURA TÉCNICA

### Backend

**Endpoints API:**
```typescript
// Conversas
GET    /api/conversations                    // Listar conversas
GET    /api/conversations/:id                // Detalhes de conversa
POST   /api/conversations                    // Criar conversa
PUT    /api/conversations/:id/status         // Marcar como lida/resolvida

// Mensagens
GET    /api/messages?conversation_id=xxx     // Mensagens de uma conversa
POST   /api/messages                         // Enviar mensagem
GET    /api/messages/search                  // Buscar mensagens

// Templates
GET    /api/message-templates                // Listar templates
GET    /api/message-templates/:id            // Detalhes de template
POST   /api/message-templates                // Criar template
PUT    /api/message-templates/:id            // Atualizar template
DELETE /api/message-templates/:id            // Deletar template

// Automação
GET    /api/automation-rules                 // Listar regras
POST   /api/automation-rules                 // Criar regra
PUT    /api/automation-rules/:id             // Atualizar regra
DELETE /api/automation-rules/:id             // Deletar regra

// Webhooks (receber mensagens)
POST   /api/webhooks/whatsapp                // WhatsApp
POST   /api/webhooks/airbnb                  // Airbnb
POST   /api/webhooks/booking                 // Booking.com
```

**Tipos TypeScript:**
```typescript
interface Conversation {
  id: string;
  organization_id: string;
  guest_id: string;
  reservation_id?: string;
  channel: 'whatsapp' | 'email' | 'airbnb' | 'booking' | 'direct';
  status: 'unread' | 'read' | 'pending' | 'resolved';
  last_message: Message;
  unread_count: number;
  created_at: Date;
  updated_at: Date;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'guest' | 'agent' | 'system';
  sender_id?: string;
  content: string;
  attachments?: MessageAttachment[];
  is_internal_note: boolean;
  read_at?: Date;
  sent_at: Date;
  delivered_at?: Date;
  failed_at?: Date;
  error_message?: string;
}

interface MessageTemplate {
  id: string;
  organization_id: string;
  name: string;
  category: 'pre_checkin' | 'during_stay' | 'post_checkout' | 'custom';
  trigger?: string;
  channels: string[];
  languages: {
    [key: string]: {
      subject?: string;
      body: string;
    };
  };
  variables: string[];
  auto_send: boolean;
  created_at: Date;
  updated_at: Date;
}
```

### Frontend

**Componentes:**
```
/components/
  ├── MessagesInbox.tsx           (Componente principal)
  ├── ConversationList.tsx        (Lista de conversas)
  ├── ConversationItem.tsx        (Item da lista)
  ├── MessageThread.tsx           (Thread de mensagens)
  ├── MessageBubble.tsx           (Balão de mensagem)
  ├── MessageComposer.tsx         (Área de composição)
  ├── ChannelFilter.tsx           (Filtro por canal)
  ├── StatusFilter.tsx            (Filtro por status)
  ├── MessageTemplates.tsx        (Gerenciar templates)
  ├── TemplateEditor.tsx          (Editor de templates)
  ├── AutomationRules.tsx         (Regras de automação)
  ├── MessageSearch.tsx           (Busca de mensagens)
  ├── MessagesAnalytics.tsx       (Dashboard de métricas)
  └── QuickReplies.tsx            (Respostas rápidas)
```

---

## 🚀 PLANO DE IMPLEMENTAÇÃO

### Fase 1 - MVP (v1.0.85) - 6-8 horas

**Escopo:**
- ✅ Interface básica (Inbox + Thread)
- ✅ Envio manual de mensagens
- ✅ Histórico de mensagens
- ✅ Filtros básicos (canal, status)
- ✅ Marcação lido/não lido
- ✅ Sistema de templates básico
- ✅ Email (SendGrid/AWS SES)
- ✅ Busca simples

**Entregas:**
- `MessagesInbox.tsx` - Interface principal
- `routes-messages.ts` - Backend básico
- Templates predefinidos (5 templates)
- Integração com SendGrid

### Fase 2 - WhatsApp (v1.0.86) - 4-6 horas

**Escopo:**
- ✅ Integração WhatsApp Business API
- ✅ Webhook para receber mensagens
- ✅ Status de entrega (enviado/entregue/lido)
- ✅ Templates aprovados WhatsApp
- ✅ Envio de mídia

**Entregas:**
- `whatsapp-api.ts` - Integração WhatsApp
- Webhook handler
- Templates WhatsApp

### Fase 3 - Automação (v1.0.87) - 4-5 horas

**Escopo:**
- ✅ Triggers automáticos
- ✅ Regras de automação
- ✅ Respostas automáticas
- ✅ Agendamento de mensagens
- ✅ Dashboard de automação

**Entregas:**
- `AutomationEngine.tsx` - Motor de automação
- `AutomationRules.tsx` - Interface de regras
- Cron jobs para triggers

### Fase 4 - Integrações OTA (v1.0.88) - 6-8 horas

**Escopo:**
- ✅ Airbnb Messaging API
- ✅ Booking.com Messaging
- ✅ Sincronização bidirecional
- ✅ Unified inbox completo

**Entregas:**
- `airbnb-messaging.ts`
- `booking-messaging.ts`
- Webhooks para cada canal

### Fase 5 - Analytics (v1.0.89) - 3-4 horas

**Escopo:**
- ✅ Dashboard de métricas
- ✅ Tempo médio de resposta
- ✅ Taxa de resposta
- ✅ Análise de perguntas frequentes
- ✅ Relatórios exportáveis

**Entregas:**
- `MessagesAnalytics.tsx`
- Gráficos e visualizações
- Exportação de dados

---

## 📊 PRIORIZAÇÃO

### Por que v1.0.85 (MÉDIA)?

**Prioridades Mais Altas:**
1. ✅ v1.0.82 - **iCal Sincronização** (evita overbooking - CRÍTICO!)
2. ✅ v1.0.83 - Configurações Global/Individual
3. ✅ v1.0.84 - Calendário de Precificação em Lote

**Depois:**
4. 💬 v1.0.85 - **Sistema de Mensagens** (você está aqui)

**Justificativa:**
- iCal evita perda de dinheiro (overbooking)
- Configurações e precificação afetam todas as reservas
- Mensagens é importante, mas não bloqueador

---

## 💡 DIFERENCIAIS COMPETITIVOS

**O que torna nosso sistema único:**
1. ✅ **Unified Inbox Real** - Todos os canais em uma interface
2. ✅ **Multilíngue Nativo** (PT/EN/ES desde o início)
3. ✅ **Automação Inteligente** - Triggers baseados em eventos
4. ✅ **Templates Flexíveis** - Variáveis dinâmicas ilimitadas
5. ✅ **Analytics Avançado** - KPIs em tempo real
6. ✅ **Notas Internas** - Colaboração entre equipe
7. ✅ **Integração Total** - Conectado com reservas/calendário

---

## 📝 CHECKLIST DE IMPLEMENTAÇÃO

### MVP (Fase 1)
- [ ] Criar `MessagesInbox.tsx`
- [ ] Criar `ConversationList.tsx`
- [ ] Criar `MessageThread.tsx`
- [ ] Criar `MessageComposer.tsx`
- [ ] Implementar `routes-messages.ts`
- [ ] Integrar SendGrid para email
- [ ] Criar 5 templates predefinidos
- [ ] Implementar busca básica
- [ ] Adicionar filtros (canal, status)
- [ ] Testar envio/recebimento

### WhatsApp (Fase 2)
- [ ] Setup Meta Business Manager
- [ ] Obter WhatsApp Business API token
- [ ] Implementar `whatsapp-api.ts`
- [ ] Criar webhook handler
- [ ] Testar envio de mensagens
- [ ] Testar recebimento via webhook
- [ ] Implementar status de entrega
- [ ] Criar templates aprovados

### Automação (Fase 3)
- [ ] Criar motor de automação
- [ ] Implementar triggers
- [ ] Interface de regras
- [ ] Respostas automáticas
- [ ] Agendamento de mensagens
- [ ] Testar todos os triggers

### Integrações OTA (Fase 4)
- [ ] Airbnb Messaging API
- [ ] Booking.com Messaging
- [ ] Webhooks para cada canal
- [ ] Sincronização bidirecional
- [ ] Testes de integração

### Analytics (Fase 5)
- [ ] Dashboard de métricas
- [ ] KPIs em tempo real
- [ ] Gráficos interativos
- [ ] Exportação de relatórios

---

## 🎯 MÉTRICAS DE SUCESSO

**KPIs para avaliar o módulo:**
- ✅ Tempo médio de resposta < 15 minutos
- ✅ Taxa de resposta > 95%
- ✅ Mensagens não respondidas < 5
- ✅ Automação: 60% das mensagens automáticas
- ✅ Satisfação do hóspede > 4.5/5

---

## 📚 DOCUMENTAÇÃO NECESSÁRIA

**Para criar:**
- [ ] `/docs/IMPLEMENTACAO_MENSAGENS_v1.0.85.md`
- [ ] `/docs/GUIA_WHATSAPP_BUSINESS_API.md`
- [ ] `/docs/TEMPLATES_MENSAGENS.md`
- [ ] `/docs/AUTOMACAO_MENSAGENS.md`
- [ ] `/docs/INTEGRACAO_OTA_MESSAGING.md`

---

## 🔗 INTEGRAÇÕES NECESSÁRIAS

### APIs Externas:
- **SendGrid** (Email)
  - API Key
  - Templates HTML
  - Webhook para tracking

- **WhatsApp Business API**
  - Meta Business Manager
  - Número verificado
  - API Token
  - Webhook URL

- **Airbnb Messaging API**
  - OAuth credentials
  - Webhook listener
  - Rate limits

- **Booking.com Partner Hub**
  - API credentials
  - Webhook configuration
  - Message templates

- **Twilio** (SMS - opcional)
  - Account SID
  - Auth Token
  - Phone number

---

## 💰 CUSTOS ESTIMADOS

**Serviços Necessários:**
```
SendGrid:
  - Free: 100 emails/dia (suficiente para MVP)
  - Essentials: $19.95/mês - 50k emails/mês

WhatsApp Business API:
  - Meta: ~$0.005 - $0.05 por mensagem (varia por país)
  - Estimativa: R$ 200-500/mês (1.000-5.000 msgs)

Twilio SMS (opcional):
  - ~R$ 0.15 por SMS
  - Estimativa: R$ 150/mês (1.000 SMS)

TOTAL: ~R$ 350-750/mês
```

---

## ✅ PRÓXIMOS PASSOS

**Antes de implementar Mensagens:**
1. ✅ Completar integração dos módulos v1.0.79-81
2. ✅ Implementar iCal Sincronização (v1.0.82)
3. ✅ Implementar Configurações Global/Individual (v1.0.83)
4. ✅ Implementar Calendário de Precificação em Lote (v1.0.84)

**Quando implementar:**
5. 💬 Implementar Sistema de Mensagens (v1.0.85) - ESTE DOCUMENTO

---

## 📋 CONCLUSÃO

O **Módulo Central de Mensagens** é uma funcionalidade **importante mas não crítica** para o RENDIZY. Está planejado para **v1.0.85** após a conclusão dos módulos mais urgentes (iCal, Configurações, Precificação).

**Estimativa Total:** 23-31 horas para implementação completa (todas as fases)  
**Estimativa MVP:** 6-8 horas para versão básica funcional  

**Status:** 📋 PLANEJADO - Aguardando implementação de prioridades mais altas

---

**Última atualização:** 29 OUT 2025  
**Próxima revisão:** Após implementação v1.0.84  
**Responsável:** Desenvolvimento RENDIZY
