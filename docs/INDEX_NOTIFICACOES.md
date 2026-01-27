# 📚 Índice de Documentação - Sistema de Notificações

## Documentos Disponíveis

| Documento | Descrição | Quando Usar |
|-----------|-----------|-------------|
| [ARQUITETURA_NOTIFICACOES.md](ARQUITETURA_NOTIFICACOES.md) | Arquitetura completa do sistema | Entender visão geral e decisões técnicas |
| [ROADMAP_NOTIFICACOES.md](ROADMAP_NOTIFICACOES.md) | Plano de implementação em fases | Ver próximos passos e prioridades |
| [REFERENCIA_NOTIFICACOES.md](REFERENCIA_NOTIFICACOES.md) | Quick reference para devs | Encontrar arquivos e comandos rápido |
| [CHANGELOG_2026-01-27.md](CHANGELOG_2026-01-27.md) | Changelog da sessão | Ver o que foi feito hoje |
| [ROADMAP_TYPESCRIPT_VSCODE_ISSUES.md](ROADMAP_TYPESCRIPT_VSCODE_ISSUES.md) | Issues pendentes | Resolver problemas de cache TS |

---

## Mapa de Arquivos

### Frontend
```
components/
├── NotificationTemplatesPage.tsx    # Página principal de templates
├── NotificationTemplateEditor.tsx   # Modal de edição
└── MainSidebar.tsx                  # Menu com submenu Notificações

utils/
├── api-notification-templates.ts    # API helper templates
└── api-notification-providers.ts    # API helper providers
```

### Backend (Edge Functions)
```
supabase/functions/rendizy-server/
├── index.ts                         # Registro de rotas (~linha 1235)
├── routes-notification-templates.ts # CRUD templates
├── routes-notification-providers.ts # Config providers
└── services/notifications/
    ├── base-provider.ts             # Classe abstrata
    ├── dispatcher.ts                # Multi-canal
    ├── types.ts                     # Interfaces
    └── providers/
        ├── resend-provider.ts
        ├── brevo-email-provider.ts
        ├── brevo-sms-provider.ts
        ├── evolution-whatsapp-provider.ts
        └── in-app-provider.ts
```

### Database
```
supabase/migrations/
├── 2026012704_create_notification_delivery_logs.sql
└── 2026012705_create_notification_templates.sql

Tabelas:
├── notification_templates           # Templates por org
├── notification_trigger_types       # 15 triggers padrão
└── notification_delivery_logs       # Logs de envio
```

---

## Fluxo de Desenvolvimento

```
1. ENTENDER
   └── Ler ARQUITETURA_NOTIFICACOES.md

2. LOCALIZAR
   └── Usar REFERENCIA_NOTIFICACOES.md

3. IMPLEMENTAR
   └── Seguir ROADMAP_NOTIFICACOES.md

4. DOCUMENTAR
   └── Atualizar CHANGELOG_YYYY-MM-DD.md
```

---

## Links Úteis

- **App Local:** http://localhost:3000/notificacoes/templates
- **Vercel:** https://rendizy2testesbackup.vercel.app
- **Supabase:** https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc

---

*Atualizado: 2026-01-27*
