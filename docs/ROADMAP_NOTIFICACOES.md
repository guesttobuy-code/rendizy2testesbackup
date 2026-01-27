# 🗺️ ROADMAP - SISTEMA DE NOTIFICAÇÕES

## Visão Geral

Este roadmap documenta a evolução do sistema de notificações do Rendizy, desde a arquitetura inicial até a implementação completa de todos os canais de comunicação.

📖 **Documento relacionado:** [ARQUITETURA_NOTIFICACOES.md](./ARQUITETURA_NOTIFICACOES.md)

---

## 📊 Status Geral

| Fase | Descrição | Status | Progresso |
|------|-----------|--------|-----------|
| **Fase 1** | Arquitetura Base | ✅ Concluída | 100% |
| **Fase 2** | Providers de Envio | ✅ Concluída | 100% |
| **Fase 3** | Integração Backend | ✅ Concluída | 100% |
| **Fase 4** | UI de Configuração | ✅ Concluída | 100% |
| **Fase 5** | Templates | ⏳ Pendente | 0% |
| **Fase 6** | Métricas & Analytics | ⏳ Pendente | 0% |
| **Fase 7** | Providers Adicionais | ⏳ Pendente | 0% |

---

## ✅ FASE 1: Arquitetura Base (CONCLUÍDA)

**Data:** 2026-01-27

### Entregas

| # | Item | Arquivo | Status |
|---|------|---------|--------|
| 1.1 | Tipos centrais TypeScript | `services/notifications/types.ts` | ✅ |
| 1.2 | Interface `NotificationProvider` | `services/notifications/types.ts` | ✅ |
| 1.3 | Classe base `BaseProvider` | `services/notifications/base-provider.ts` | ✅ |
| 1.4 | Mock Provider para testes | `services/notifications/base-provider.ts` | ✅ |
| 1.5 | Dispatcher central | `services/notifications/dispatcher.ts` | ✅ |
| 1.6 | Barrel exports | `services/notifications/index.ts` | ✅ |
| 1.7 | Migration logs de entrega | `migrations/2026012704_create_notification_delivery_logs.sql` | ✅ |

### Decisões de Arquitetura

- ✅ Arquitetura de cápsulas (cada provider isolado)
- ✅ Interface comum para todos os providers
- ✅ Fallback automático entre providers do mesmo canal
- ✅ Logging centralizado de entregas
- ✅ Configuração por organização

---

## ✅ FASE 2: Providers de Envio (CONCLUÍDA)

**Data:** 2026-01-27

### Providers Implementados

| # | Provider | Canal | Arquivo | Status |
|---|----------|-------|---------|--------|
| 2.1 | **Resend** | Email | `providers/resend-provider.ts` | ✅ |
| 2.2 | **Brevo Email** | Email | `providers/brevo-email-provider.ts` | ✅ |
| 2.3 | **Brevo SMS** | SMS | `providers/brevo-sms-provider.ts` | ✅ |
| 2.4 | **Evolution API** | WhatsApp | `providers/evolution-whatsapp-provider.ts` | ✅ |
| 2.5 | **In-App** | Dashboard | `providers/in-app-provider.ts` | ✅ |

### Funcionalidades por Provider

| Provider | Envio | Logs | Fallback | Verificação Status |
|----------|-------|------|----------|-------------------|
| Resend | ✅ | ✅ | ✅ | ⏳ |
| Brevo Email | ✅ | ✅ | ✅ | ⏳ |
| Brevo SMS | ✅ | ✅ | - | ✅ Créditos |
| Evolution | ✅ | ✅ | - | ✅ Instance |
| In-App | ✅ | ✅ | - | ✅ |

---

## ✅ FASE 3: Integração Backend (CONCLUÍDA)

**Data:** 2026-01-27

### Tarefas

| # | Item | Descrição | Status |
|---|------|-----------|--------|
| 3.1 | Conectar `actions-service.ts` | Substituir mocks pelo dispatcher real | ✅ |
| 3.2 | Rotas API para configs | CRUD de configuração de providers | ✅ |
| 3.3 | Frontend API helper | `utils/api-notification-providers.ts` | ✅ |
| 3.4 | Registrar rotas | Adicionar ao `index.ts` | ✅ |

### Arquivos Criados/Modificados

- `services/actions-service.ts` - Agora usa dispatcher real
- `routes-notification-providers.ts` - API completa de configuração
- `utils/api-notification-providers.ts` - Helper para frontend
- `index.ts` - Rotas registradas

---

## ✅ FASE 4: UI de Configuração (CONCLUÍDA)

**Data:** 2026-01-27

### Tarefas

| # | Item | Descrição | Status |
|---|------|-----------|--------|
| 4.1 | Card Resend | Configuração em Settings | ✅ |
| 4.2 | Card Brevo | Configuração em Settings | ✅ |
| 4.3 | Salvar configs | Persistir no banco via API | ✅ |
| 4.4 | Testar conexão | Botão "Testar" em cada card | ✅ |
| 4.5 | Status de providers | Badge mostrando status | ✅ |
| 4.6 | Carregar config existente | Preenchimento automático | ✅ |

### Componentes Atualizados

- `IntegrationsManager.tsx`
  - `ResendEmailIntegration` - Salva, carrega, testa
  - `BrevoIntegration` - Salva email e SMS, carrega, testa

---

## ⏳ FASE 5: Templates de Email (PENDENTE)

**Status:** Aguardando definição de UI

### Tarefas Planejadas

| # | Item | Descrição | Status |
|---|------|-----------|--------|
| 5.1 | Definir tela de templates | UX/UI a definir | ⏳ |
| 5.2 | CRUD de templates | Criar/editar/excluir | ⏳ |
| 5.3 | Editor visual | Drag & drop ou WYSIWYG | ⏳ |
| 5.4 | Variáveis dinâmicas | `{{guestName}}`, `{{checkIn}}`, etc. | ⏳ |
| 5.5 | Preview | Visualizar antes de salvar | ⏳ |
| 5.6 | Templates padrão | Check-in, checkout, confirmação | ⏳ |

### Templates Planejados

| Template | Trigger | Canais |
|----------|---------|--------|
| Confirmação de Reserva | `reservation_created` | Email, WhatsApp |
| Lembrete Check-in (24h) | `checkin_minus_24h` | Email, WhatsApp, SMS |
| Instruções de Acesso | `checkin_day` | WhatsApp |
| Lembrete Check-out | `checkout_day` | WhatsApp |
| Pedido de Avaliação | `checkout_plus_24h` | Email |
| Pagamento Recebido | `payment_received` | Email |
| Pagamento Pendente | `payment_pending` | Email, SMS |

---

## ⏳ FASE 6: Métricas & Analytics (PENDENTE)

### Tarefas Planejadas

| # | Item | Descrição | Status |
|---|------|-----------|--------|
| 6.1 | Dashboard de envios | Gráficos de volume | ⏳ |
| 6.2 | Taxa de entrega | Delivered vs Failed | ⏳ |
| 6.3 | Custo por canal | R$ gastos em SMS, etc. | ⏳ |
| 6.4 | Alertas de falha | Notificar quando muitos erros | ⏳ |
| 6.5 | Relatórios exportáveis | CSV/PDF | ⏳ |

---

## ⏳ FASE 7: Providers Adicionais (PENDENTE)

### Providers Futuros

| # | Provider | Canal | Prioridade | Status |
|---|----------|-------|------------|--------|
| 7.1 | Twilio | SMS | Média | ⏳ |
| 7.2 | Firebase FCM | Push | Média | ⏳ |
| 7.3 | OneSignal | Push | Baixa | ⏳ |
| 7.4 | AWS SES | Email | Baixa | ⏳ |
| 7.5 | SendGrid | Email | Baixa | ⏳ |
| 7.6 | Mailgun | Email | Baixa | ⏳ |

---

## 📅 Cronograma Sugerido

```
Janeiro 2026
├── Semana 4 (27-31)
│   ├── ✅ Fase 1: Arquitetura Base
│   ├── ✅ Fase 2: Providers de Envio
│   └── 🔄 Fase 3.1-3.2: Integração Backend
│
Fevereiro 2026
├── Semana 1 (01-07)
│   ├── Fase 3.3-3.4: Webhooks e validação
│   └── Fase 4.3-4.5: UI de configuração
│
├── Semana 2 (08-14)
│   └── Fase 5: Templates (após definição de UI)
│
├── Semana 3-4 (15-28)
│   ├── Fase 6: Métricas
│   └── Fase 7: Providers adicionais (conforme demanda)
```

---

## 🔗 Links Relacionados

- [Arquitetura de Notificações](./ARQUITETURA_NOTIFICACOES.md)
- [Catálogo de Automações](../components/crm/settings/automation-catalog.ts)
- [Actions Service](../supabase/functions/rendizy-server/services/actions-service.ts)

---

## 📝 Changelog

| Data | Versão | Alterações |
|------|--------|------------|
| 2026-01-27 | 1.0.0 | Criação inicial do roadmap |
| 2026-01-27 | 1.0.0 | Fase 1 e 2 concluídas |
| 2026-01-27 | 1.0.0 | Fase 3 e 4 iniciadas |

---

**Última atualização:** 2026-01-27
