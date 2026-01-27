# Referência Rápida: Sistema de Notificações

## Quick Reference para Continuação

### Onde está cada coisa:

```
📁 Notificações
├── 🎨 FRONTEND
│   ├── components/NotificationTemplatesPage.tsx    # Página listagem
│   ├── components/NotificationTemplateEditor.tsx   # Modal editor (5 tabs)
│   ├── utils/api-notification-templates.ts         # API helper templates
│   └── utils/api-notification-providers.ts         # API helper providers
│
├── 🔧 BACKEND (Edge Functions)
│   ├── routes-notification-templates.ts            # 10 endpoints CRUD
│   ├── routes-notification-providers.ts            # 5 endpoints config
│   └── services/notifications/
│       ├── base-provider.ts                        # Classe abstrata
│       ├── dispatcher.ts                           # Envia multi-canal
│       ├── types.ts                                # Interfaces TS
│       └── providers/
│           ├── resend-provider.ts                  # Email Resend
│           ├── brevo-email-provider.ts             # Email Brevo
│           ├── brevo-sms-provider.ts               # SMS Brevo
│           ├── evolution-whatsapp-provider.ts      # WhatsApp
│           └── in-app-provider.ts                  # Notificação interna
│
├── 🗄️ DATABASE
│   ├── notification_templates                      # Templates por org
│   ├── notification_trigger_types                  # 15 triggers padrão
│   └── notification_delivery_logs                  # Logs de envio
│
└── 📚 DOCS
    ├── ARQUITETURA_NOTIFICACOES.md                # Arquitetura completa
    ├── ROADMAP_NOTIFICACOES.md                    # Plano de implementação
    └── CHANGELOG_2026-01-27.md                    # Este changelog
```

### Rotas Registradas em `index.ts`:

```typescript
// Linha ~1235 do index.ts
// 📝 NOTIFICATION TEMPLATES
app.get("/notifications/templates", ...)
app.get("/notifications/templates/:id", ...)
app.post("/notifications/templates", ...)
app.put("/notifications/templates/:id", ...)
app.delete("/notifications/templates/:id", ...)
app.patch("/notifications/templates/:id/status", ...)
app.post("/notifications/templates/:id/duplicate", ...)
app.get("/notifications/triggers", ...)
app.post("/notifications/templates/preview", ...)
app.post("/notifications/templates/:id/test", ...)
```

### Rota Frontend em `App.tsx`:

```tsx
// Linha ~1530 do App.tsx
<Route path="/notificacoes/templates" element={
  <ProtectedRoute>
    <NotificationTemplatesPage />
  </ProtectedRoute>
} />
```

### Menu em `MainSidebar.tsx`:

```tsx
// Notificações tem submenu:
// - Central → /notificacoes (NotificationsModule existente)
// - Templates → /notificacoes/templates (novo)
```

---

## Comandos Úteis

```powershell
# Deploy Edge Functions
npx supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc

# Deploy Vercel
npx vercel deploy --prod --force

# Testar local
npm run dev

# Git
git add -A && git commit -m "mensagem" && git push origin main
```

---

## Variáveis Disponíveis nos Templates

```
{{guestName}}        - Nome do hóspede
{{guestEmail}}       - Email do hóspede
{{guestPhone}}       - Telefone do hóspede
{{checkInDate}}      - Data check-in
{{checkInTime}}      - Horário check-in
{{checkOutDate}}     - Data check-out
{{checkOutTime}}     - Horário check-out
{{propertyName}}     - Nome do imóvel
{{propertyAddress}}  - Endereço completo
{{totalAmount}}      - Valor total formatado
{{reservationCode}}  - Código da reserva
{{nights}}           - Número de noites
{{wifiName}}         - Nome da rede WiFi
{{wifiPassword}}     - Senha do WiFi
{{accessCode}}       - Código de acesso
```

---

## Triggers Disponíveis

| ID | Nome | Categoria |
|----|------|-----------|
| `reservation_created` | Nova Reserva | reservations |
| `reservation_confirmed` | Reserva Confirmada | reservations |
| `reservation_cancelled` | Reserva Cancelada | reservations |
| `checkin_minus_72h` | Lembrete 72h | reservations |
| `checkin_minus_24h` | Lembrete 24h | reservations |
| `checkin_day` | Dia do Check-in | reservations |
| `checkout_day` | Dia do Check-out | reservations |
| `checkout_plus_24h` | Pós Check-out | reservations |
| `payment_received` | Pagamento Recebido | payments |
| `payment_pending` | Pagamento Pendente | payments |
| `payment_overdue` | Pagamento Atrasado | payments |
| `new_message` | Nova Mensagem | communication |
| `new_review` | Nova Avaliação | communication |
| `welcome_guest` | Boas-vindas | system |
| `custom` | Personalizado | system |

---

*Criado em: 2026-01-27*
