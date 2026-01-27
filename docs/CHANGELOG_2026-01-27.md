# CHANGELOG - 2026-01-27

## Sessão: Sistema de Notificações Multi-Canal (Fase 5)

### 🎯 Objetivo da Sessão
Implementar sistema completo de templates de notificações com suporte a múltiplos canais (Email, SMS, WhatsApp, In-App).

---

## Arquivos Criados

### Backend (Edge Functions)

| Arquivo | Descrição |
|---------|-----------|
| `routes-notification-templates.ts` | API CRUD de templates (10 endpoints) |
| `routes-notification-providers.ts` | API de configuração de providers |
| `services/notifications/base-provider.ts` | Classe base abstrata para providers |
| `services/notifications/dispatcher.ts` | Dispatcher multi-canal |
| `services/notifications/index.ts` | Barrel export |
| `services/notifications/types.ts` | Tipos TypeScript |
| `services/notifications/providers/resend-provider.ts` | Provider Resend (email) |
| `services/notifications/providers/brevo-email-provider.ts` | Provider Brevo Email |
| `services/notifications/providers/brevo-sms-provider.ts` | Provider Brevo SMS |
| `services/notifications/providers/evolution-whatsapp-provider.ts` | Provider Evolution API |
| `services/notifications/providers/in-app-provider.ts` | Provider In-App |
| `services/notifications/providers/index.ts` | Barrel export providers |

### Frontend

| Arquivo | Descrição |
|---------|-----------|
| `components/NotificationTemplatesPage.tsx` | Página de listagem de templates |
| `components/NotificationTemplateEditor.tsx` | Modal de criação/edição |
| `utils/api-notification-templates.ts` | Helper API frontend |
| `utils/api-notification-providers.ts` | Helper API providers |

### Database (Migrations)

| Arquivo | Descrição |
|---------|-----------|
| `2026012704_create_notification_delivery_logs.sql` | Logs de envio |
| `2026012705_create_notification_templates.sql` | Templates + Trigger Types |

### Documentação

| Arquivo | Descrição |
|---------|-----------|
| `docs/ARQUITETURA_NOTIFICACOES.md` | Arquitetura completa do sistema |
| `docs/ROADMAP_NOTIFICACOES.md` | Roadmap de implementação |
| `docs/ROADMAP_TYPESCRIPT_VSCODE_ISSUES.md` | Issues pendentes TypeScript |

---

## Arquivos Modificados

### `components/MainSidebar.tsx`
- **Mudança:** Adicionado submenu em "Notificações"
- **Submenu:** Central → `/notificacoes`, Templates → `/notificacoes/templates`
- **Import:** Adicionado `FileEdit` do lucide-react

### `App.tsx`
- **Mudança:** Adicionada rota `/notificacoes/templates`
- **Import:** Lazy load de `NotificationTemplatesPage`

### `supabase/functions/rendizy-server/index.ts`
- **Mudança:** Registradas 20 novas rotas (10 com prefixo, 10 aliases)
- **Import:** `notificationTemplatesRoutes`

### `components/IntegrationsManager.tsx`
- **Mudança:** Atualizado para usar nova API de providers

---

## Correções de Bugs

### Migration SQL (2026012705)
- **Bug:** `auth_user_id` não existe na tabela `users`
- **Fix:** Alterado para `id` (que é o campo correto)
- **Bug:** `role` não existe, campo é `type`
- **Fix:** Alterado de `role IN ('admin', 'superadmin')` para `type IN ('superadmin', 'imobiliaria')`

---

## API Endpoints Criados

### Notification Templates
```
GET    /notifications/templates          - Lista templates
GET    /notifications/templates/:id      - Busca por ID
POST   /notifications/templates          - Cria template
PUT    /notifications/templates/:id      - Atualiza template
DELETE /notifications/templates/:id      - Deleta template
PATCH  /notifications/templates/:id/status - Toggle ativo/inativo
POST   /notifications/templates/:id/duplicate - Duplica template
GET    /notifications/triggers           - Lista trigger types
POST   /notifications/templates/preview  - Preview com variáveis
POST   /notifications/templates/:id/test - Envia teste
```

### Notification Providers
```
GET    /notifications/providers          - Lista providers configurados
GET    /notifications/providers/:channel - Config de um canal
POST   /notifications/providers          - Salva config
DELETE /notifications/providers/:channel/:provider - Remove config
POST   /notifications/providers/test     - Testa envio
```

---

## Tabelas Criadas

### `notification_templates`
- Templates customizáveis por organização
- Suporte multi-canal (email, sms, whatsapp, in_app)
- Sistema de variáveis `{{nomeVariavel}}`
- RLS por organização

### `notification_trigger_types`
- 15 triggers pré-configurados
- Categorias: reservations, payments, communication, system
- Variáveis disponíveis por trigger

### `notification_delivery_logs`
- Logs de envio
- Tracking de status (sent, delivered, failed, etc)

---

## Deploy

| Plataforma | Status | URL |
|------------|--------|-----|
| GitHub | ✅ Pushed | `origin/main` (ae8bb48) |
| Vercel | ✅ Deployed | https://rendizy2testesbackup.vercel.app |
| Supabase DB | ✅ Migration executada | `notification_templates`, `notification_trigger_types` |
| Edge Functions | ⏳ Pendente | Fazer deploy amanhã |

---

## Pendências para Próxima Sessão

1. [ ] Reiniciar VS Code (limpar cache TypeScript)
2. [ ] Deploy Edge Functions: `npx supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc`
3. [ ] Testar navegação `/notificacoes/templates`
4. [ ] Criar primeiro template de teste
5. [ ] Integrar dispatcher com automações existentes
6. [ ] Implementar cron job para triggers agendados

---

## Commits da Sessão

```
ae8bb48 - feat(notificacoes): sistema completo de templates multi-canal
```

---

*Documentado em: 2026-01-27 05:45*
