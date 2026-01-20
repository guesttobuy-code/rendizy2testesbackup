# Changelog v1.0.104.002

> **Data**: 2026-01-13  
> **Autor**: Copilot + Rafael  
> **Sessão**: Consolidação de branches e validação

---

## 🔀 Consolidação de Branches

### Branches Mergeadas para Main

| Branch | Conteúdo | Conflitos |
|--------|----------|-----------|
| `fix/vite-hmr-onedrive` | Fix HMR para paths OneDrive | Nenhum |
| `fix/cron-rpc-params` | Fix parâmetros RPC save_anuncio_field | Nenhum |
| `fix/integrations-useeffect-import` | Fix import useEffect | Auto-merge |
| `feat/staysnet-auto-fetch-properties-sync` | Sync automático de properties | Resolvido (HEAD) |
| `feat/ai-prompt-v3-stripe-checkout` | Prompt IA Stripe | Resolvido (HEAD + OAuth) |
| `feat/stripe-products-api` | API Products & Prices Stripe | Auto-merge |
| `feat/stripe-products-catalog` | UI catálogo Stripe | Auto-merge |
| `feat/whatsapp-multitenant-webhook-pr` | Webhook multi-tenant | Nenhum |

### Branches Deletadas (Remote + Local)

```
✅ feat/ai-prompt-v3-stripe-checkout
✅ feat/payments-stripe-pagarme (duplicado)
✅ feat/staysnet-auto-fetch-properties-sync
✅ feat/stripe-products-api
✅ feat/stripe-products-catalog
✅ feat/whatsapp-multitenant-webhook
✅ feat/whatsapp-multitenant-webhook-pr
✅ fix/cron-rpc-params
✅ fix/integrations-useeffect-import
✅ fix/vite-hmr-onedrive
```

---

## 🔐 OAuth Social Login - v1.0.104.001

### Componentes Implementados

| Componente | Status | Descrição |
|------------|--------|-----------|
| `GoogleOneTap.tsx` | ✅ Criado | Popup One Tap automático |
| `SocialLoginButtons.tsx` | ✅ Criado | Botões Google + Apple |
| `routes-auth-social.ts` | ✅ Criado | Backend OAuth |
| `guest_users` table | ✅ Migrado | Hóspedes dos sites |

### Endpoints Adicionados

```
POST /auth/social/google     → Validar ID token Google
POST /auth/social/apple      → Validar ID token Apple (futuro)
GET  /auth/guest/me          → Dados do hóspede logado
POST /auth-guest-google      → (rendizy-public) Login guest
GET  /auth-guest-me          → (rendizy-public) Dados guest
```

### Catálogo Atualizado

- Novos endpoints: `auth-guest-google`, `auth-guest-me`
- Novo bloco: `guest-login-social`
- Integration Guide: Código exemplo para IA

---

## 📋 Sistema de Pré-Reservas

### Funcionalidades

| Feature | Status |
|---------|--------|
| Timer visual no card | ✅ |
| Countdown no modal | ✅ |
| Cron de expiração | ✅ |
| Settings por organização | ✅ |

### Endpoints

```
POST /cron/cancel-expired-pending → Cancela reservas pendentes expiradas
```

---

## 💳 Sistema de Pagamentos

### Multi-Gateway Support

| Gateway | Status | Arquivo |
|---------|--------|---------|
| Stripe | ✅ Completo | `routes-stripe.ts` (1242 linhas) |
| Pagar.me | ⏳ Parcial | `routes-payments.ts` |

### Tabelas

| Tabela | Status |
|--------|--------|
| `stripe_configs` | ✅ Existe |
| `stripe_checkout_sessions` | ✅ Existe |
| `stripe_webhook_events` | ✅ Existe |
| `pagarme_orders` | ✅ Migrado |

---

## 🚀 Deploys

| Function | Status | Comando |
|----------|--------|---------|
| rendizy-server | ✅ Deployed | `supabase functions deploy rendizy-server` |
| rendizy-public | ✅ Deployed | `supabase functions deploy rendizy-public` |

---

## ✅ Validação

| Check | Resultado |
|-------|-----------|
| `npm run build` | ✅ 3510 modules, 17s |
| VS Code Errors | ✅ No errors |
| Git conflicts | ✅ Nenhum pendente |
| Branches cleanup | ✅ Só main resta |

---

## 📁 Arquivos Modificados

### Frontend

| Arquivo | Mudança |
|---------|---------|
| `components/IntegrationsManager.tsx` | Stripe products integration |
| `components/ClientSitesManager.tsx` | Prompt IA com OAuth |
| `components/client-sites/ComponentsAndDataTab.tsx` | Catálogo UI |
| `components/client-sites/catalog.ts` | OAuth endpoints + blocks |
| `src/components/LoginPage.tsx` | Versão v1.0.104.001 |

### Backend

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/rendizy-server/index.ts` | Novas rotas registradas |
| `supabase/functions/rendizy-server/routes-stripe.ts` | Products API |
| `supabase/functions/rendizy-server/routes-auth-social.ts` | NOVO |
| `supabase/functions/rendizy-server/routes-cron-pending-reservations.ts` | NOVO |
| `supabase/functions/rendizy-public/index.ts` | Guest auth endpoints |

### Migrations

| Migration | Descrição |
|-----------|-----------|
| `20260113_create_guest_users_table.sql` | Tabela guest_users |
| `20260113_add_pending_reservation_settings.sql` | Settings expiração |
| `20260113_create_pagarme_orders_table.sql` | Tabela Pagar.me |

---

## 📝 Commits da Sessão

```
696b9c7 merge: whatsapp-multitenant-webhook-pr
8861c09 merge: stripe-products-catalog
7e2cb8d merge: stripe-products-api
f51b13d merge: ai-prompt-v3-stripe-checkout (kept main with OAuth)
5006526 merge: staysnet auto-fetch properties sync (kept main version)
c6e0c04 merge: fix integrations useEffect import
b468cd2 merge: fix cron RPC params
d014e66 merge: fix vite HMR for OneDrive
4e9dd12 feat(auth): implement Google OAuth social login for guests v1.0.104.001 (#11)
f117a04 feat(pre-reservas): implement pending reservation system with payment timeout
```

---

## 🔗 Relacionado

- PR #10: feat(pre-reservas): implement pending reservation system
- PR #11: feat(auth): implement Google OAuth social login for guests
- Changelog anterior: [CHANGELOG_V1.0.104.001.md](./CHANGELOG_V1.0.104.001.md)
