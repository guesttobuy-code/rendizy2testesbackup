# 📬 ARQUITETURA DE NOTIFICAÇÕES - RENDIZY

> 📋 **Roadmap completo:** [ROADMAP_NOTIFICACOES.md](./ROADMAP_NOTIFICACOES.md)

## Visão Geral

Sistema modular de notificações usando **arquitetura de cápsulas**. Cada canal de envio é uma cápsula independente que implementa uma interface comum (`NotificationProvider`).

---

## 🏗️ Estrutura de Arquivos

```
supabase/functions/rendizy-server/services/notifications/
├── index.ts                     # Barrel exports
├── types.ts                     # Tipos TypeScript compartilhados
├── base-provider.ts             # Classe base abstrata
├── dispatcher.ts                # Orquestrador central
│
└── providers/                   # Cápsulas de providers
    ├── index.ts                 # Exports dos providers
    ├── resend-provider.ts       # 📧 Email via Resend
    ├── brevo-email-provider.ts  # 📧 Email via Brevo
    ├── brevo-sms-provider.ts    # 📱 SMS via Brevo
    ├── evolution-whatsapp-provider.ts  # 💬 WhatsApp via Evolution API
    ├── in-app-provider.ts       # 🔔 Notificações do dashboard
    │
    # FUTUROS:
    ├── twilio-sms-provider.ts   # 📱 SMS via Twilio
    ├── firebase-push-provider.ts # 📲 Push via Firebase
    └── onesignal-push-provider.ts # 📲 Push via OneSignal
```

---

## 📊 Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AUTOMATION ENGINE                                  │
│                    (automation-engine.ts / actions-service.ts)               │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NOTIFICATION DISPATCHER                              │
│                            (dispatcher.ts)                                   │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  sendEmail  │  │   sendSms   │  │ sendWhatsApp│  │  sendInApp  │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │                │
│         └────────────────┼────────────────┼────────────────┘                │
│                          │                │                                  │
│                          ▼                ▼                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │              ROUTING (por canal + fallback automático)               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  EMAIL CHANNEL  │    │   SMS CHANNEL   │    │ WHATSAPP CHANNEL│
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │   Resend    │ │    │ │    Brevo    │ │    │ │  Evolution  │ │
│ │  (primary)  │ │    │ │  (primary)  │ │    │ │    API      │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │                 │
│ │    Brevo    │ │    │ │   Twilio    │ │    │                 │
│ │ (fallback)  │ │    │ │ (fallback)  │ │    │                 │
│ └─────────────┘ │    │ └─────────────┘ │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                          │                          │
         ▼                          ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        notification_delivery_logs                            │
│                         (histórico de envios)                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 LISTA DE COMPONENTES

### 1. TIPOS CENTRAIS (`types.ts`)

| Tipo | Descrição |
|------|-----------|
| `NotificationChannel` | `'email' \| 'sms' \| 'whatsapp' \| 'push' \| 'in_app'` |
| `NotificationProvider` | Interface que todo provider implementa |
| `EmailPayload` | Payload para envio de email |
| `SmsPayload` | Payload para envio de SMS |
| `WhatsAppPayload` | Payload para envio de WhatsApp |
| `PushPayload` | Payload para push notification |
| `InAppPayload` | Payload para notificação do dashboard |
| `SendResult` | Resultado padronizado de envio |
| `DeliveryStatus` | Status de entrega |
| `ProviderConfig` | Configuração salva no banco |

---

### 2. DISPATCHER (`dispatcher.ts`)

| Função | Descrição |
|--------|-----------|
| `notificationDispatcher.send(payload)` | Envia para qualquer canal |
| `notificationDispatcher.sendMultiple(payloads[])` | Envia para múltiplos canais |
| `notificationDispatcher.getConfiguredProviders(orgId)` | Lista providers configurados |
| `sendEmail(orgId, to, subject, html)` | Helper para email |
| `sendSms(orgId, to, message)` | Helper para SMS |
| `sendWhatsApp(orgId, to, message)` | Helper para WhatsApp |
| `sendInApp(orgId, title, message)` | Helper para in-app |

---

### 3. PROVIDERS (Cápsulas)

#### 📧 EMAIL

| Provider | Arquivo | Preço |
|----------|---------|-------|
| **Resend** | `providers/resend-provider.ts` | Free: 3k/mês, $20: 50k/mês |
| **Brevo** | `providers/brevo-email-provider.ts` | Free: 9k/mês (300/dia) |

#### 📱 SMS

| Provider | Arquivo | Preço |
|----------|---------|-------|
| **Brevo** | `providers/brevo-sms-provider.ts` | ~R$0,05-0,15 por SMS |
| *Twilio* | `providers/twilio-sms-provider.ts` | *(futuro)* |

#### 💬 WHATSAPP

| Provider | Arquivo | Preço |
|----------|---------|-------|
| **Evolution API** | `providers/evolution-whatsapp-provider.ts` | Self-hosted (grátis) |

#### 🔔 IN-APP

| Provider | Arquivo | Preço |
|----------|---------|-------|
| **In-App** | `providers/in-app-provider.ts` | Grátis (banco interno) |

#### 📲 PUSH (FUTURO)

| Provider | Arquivo | Preço |
|----------|---------|-------|
| *Firebase* | `providers/firebase-push-provider.ts` | *(futuro)* |
| *OneSignal* | `providers/onesignal-push-provider.ts` | *(futuro)* |

---

### 4. BANCO DE DADOS

| Tabela | Descrição |
|--------|-----------|
| `notifications` | Notificações do dashboard (in-app) |
| `notification_delivery_logs` | Histórico de envios (todos os canais) |
| `organization_settings.settings` | Configurações dos providers por org |

---

## ⚙️ CONFIGURAÇÃO POR ORGANIZAÇÃO

Cada organização configura seus providers em `organization_settings.settings`:

```json
{
  "notification_email_resend": {
    "provider": "resend",
    "channel": "email",
    "enabled": true,
    "apiKey": "re_xxx...",
    "fromEmail": "noreply@empresa.com",
    "fromName": "Minha Empresa"
  },
  "notification_email_brevo": {
    "provider": "brevo",
    "channel": "email",
    "enabled": false,
    "apiKey": "xkeysib-xxx..."
  },
  "notification_sms_brevo": {
    "provider": "brevo_sms",
    "channel": "sms",
    "enabled": true,
    "apiKey": "xkeysib-xxx...",
    "customConfig": {
      "smsSender": "Rendizy"
    }
  },
  "notification_whatsapp_evolution": {
    "provider": "evolution",
    "channel": "whatsapp",
    "enabled": true,
    "apiKey": "Rendizy2026EvolutionAPI",
    "customConfig": {
      "serverUrl": "http://76.13.82.60:8080",
      "instanceName": "org-00000000-mkt36t2s"
    }
  }
}
```

---

## 🔗 INTEGRAÇÃO COM AUTOMAÇÕES

O `actions-service.ts` precisa ser atualizado para usar o novo dispatcher:

```typescript
// ANTES (mock)
async function notifyEmail(message, recipient, organizationId) {
  logInfo('[ActionsService] Notificação por email', { ... });
  return { success: true, channel: 'email', recipient };
}

// DEPOIS (real)
import { sendEmail } from './notifications/dispatcher.ts';

async function notifyEmail(message, recipient, organizationId) {
  return await sendEmail(organizationId, recipient, 'Notificação', message);
}
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### ✅ CONCLUÍDO
- [x] Tipos centrais (`types.ts`)
- [x] Classe base (`base-provider.ts`)
- [x] Dispatcher (`dispatcher.ts`)
- [x] Provider Resend (`resend-provider.ts`)
- [x] Provider Brevo Email (`brevo-email-provider.ts`)
- [x] Provider Brevo SMS (`brevo-sms-provider.ts`)
- [x] Provider Evolution WhatsApp (`evolution-whatsapp-provider.ts`)
- [x] Provider In-App (`in-app-provider.ts`)
- [x] Migration logs de entrega
- [x] Cards de integração no Settings (Resend, Brevo)

### ⏳ PENDENTE
- [ ] Conectar dispatcher ao `actions-service.ts`
- [ ] Criar rotas de API para salvar configs dos providers
- [ ] Templates de email (check-in, confirmação, etc.)
- [ ] Provider Firebase Push
- [ ] Provider OneSignal
- [ ] Provider Twilio SMS
- [ ] UI para testar envio de notificações
- [ ] Dashboard de métricas de envio

---

## 📖 USO RÁPIDO

```typescript
import { sendEmail, sendSms, sendWhatsApp, sendInApp } from './services/notifications';

// Enviar email
await sendEmail(
  'org-id-123',
  'cliente@email.com',
  'Confirmação de Reserva',
  '<h1>Sua reserva foi confirmada!</h1>'
);

// Enviar SMS
await sendSms(
  'org-id-123',
  '+5521999999999',
  'Sua reserva foi confirmada! Check-in: 25/01/2026'
);

// Enviar WhatsApp
await sendWhatsApp(
  'org-id-123',
  '5521999999999',
  'Olá! Sua reserva foi confirmada.'
);

// Notificação no dashboard
await sendInApp(
  'org-id-123',
  'Nova Reserva',
  'João Silva confirmou reserva para Casa da Praia'
);
```

---

## 🔒 SEGURANÇA

- API Keys são armazenadas criptografadas no `organization_settings`
- RLS garante que cada org só vê seus logs
- Providers nunca expõem chaves nos logs
- Rate limiting pode ser adicionado no dispatcher

---

**Última atualização:** 2026-01-27
