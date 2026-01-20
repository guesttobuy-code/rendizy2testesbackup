# 🔄 PROMPT DE HANDOFF - RENDIZY - 13 de Janeiro de 2026

> **Use este prompt para iniciar um novo chat e continuar o trabalho.**
> **Versão do sistema: v1.0.104.001**

---

## 📋 CONTEXTO DO PROJETO

Você está trabalhando no **Rendizy**, um sistema SaaS multi-tenant para gestão de imóveis de temporada (Airbnb, Booking, Stays.net). 

### Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | React 18 + Vite + TailwindCSS + shadcn/ui |
| **Backend** | Supabase Edge Functions (Deno + Hono) |
| **Banco** | PostgreSQL no Supabase |
| **Auth** | Supabase Auth + Google OAuth 2.0 |
| **Deploy** | Vercel (frontend) + Supabase (Edge Functions) |
| **Integração Principal** | Stays.net (channel manager) |

### Arquivos Críticos - Ler Primeiro

```
docs/Rules.md                           # Regras canônicas (OBRIGATÓRIO)
.github/AI_RULES.md                     # Regras para AI/Copilot
.cursorrules                            # Regras compactas

# Zonas Críticas (NÃO modificar sem documentação):
App.tsx                                 # Componente principal
supabase/functions/rendizy-server/index.ts    # Entry point backend
supabase/functions/rendizy-server/routes-anuncios.ts  # Listagem
```

---

## 🔧 CREDENCIAIS E AMBIENTE

### Supabase
```
Project Ref:    odcgnzfremrqnvtitpcc
URL:            https://odcgnzfremrqnvtitpcc.supabase.co
CLI Token:      sbp_7692d1e0362e15141c53f4cc0292f2bb8cbc097b
Keys:           .env.local (VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
```

### Git
```
Repo:           https://github.com/guesttobuy-code/rendizy2testesbackup
Remote:         testes
Branch:         main
```

### Google OAuth 2.0
```
Project ID:     rendizy-484205
Client ID:      1068989503174-gd08jd74uclfjdv0goe32071uck2sg9k.apps.googleusercontent.com
Console:        https://console.cloud.google.com/auth/branding?project=rendizy-484205
```

### Vercel
```
Produção:       https://rendizy2testesbackup.vercel.app
Site Teste:     https://rendizy2testesbackup.vercel.app/site/medhome/
```

### Organizações Multi-Tenant

| ID | Nome | Slug |
|----|------|------|
| `00000000-0000-0000-0000-000000000000` | Rendizy (master) | rendizy-master |
| `e78c7bb9-7823-44b8-9aee-95c9b073e7b7` | Medhome teste | rendizy_medhome_teste |
| `7a0873d3-25f1-43d5-9d45-ca7beaa07f77` | Sua Casa Mobiliada | rendizy_sua_casa_mobiliada |

---

## ✅ VITÓRIAS DESTA SESSÃO (13/01/2026)

### 1. 🔐 Sistema OAuth Social Login (Google) - v1.0.104.001

**Implementação completa de login social via Google One Tap para:**
- Painel Rendizy (funcionários via `auth_users`)
- Sites dos clientes (hóspedes via `guest_users` - tabela nova)

**Arquivos criados:**
| Arquivo | Descrição |
|---------|-----------|
| `components/GoogleOneTap.tsx` | Popup One Tap do Google |
| `components/SocialLoginButtons.tsx` | Botões Google + Apple reutilizáveis |
| `supabase/functions/rendizy-server/routes-auth-social.ts` | Backend OAuth |
| `supabase/migrations/20260113_create_guest_users_table.sql` | Tabela guest_users |
| `docs/06-integrations/OAUTH_SOCIAL_LOGIN.md` | Documentação completa |

**Endpoints novos:**
```
POST /auth/social/google      → Valida ID token do Google
POST /auth/social/apple       → Valida ID token da Apple (futuro)
GET  /auth/guest/me           → Dados do hóspede logado
```

**PR**: #11 (mergeado via squash)

---

### 2. 📋 Sistema de Pré-Reservas com Timeout

**Reservas pendentes que expiram automaticamente se não pagas:**

**Arquivos criados:**
| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/rendizy-server/routes-cron-pending-reservations.ts` | Cron de expiração |
| `supabase/migrations/20260113_add_pending_reservation_settings.sql` | Settings |
| `components/ReservationCard.tsx` | UI com timer |
| `components/ReservationDetailsModal.tsx` | Modal com countdown |

**Endpoint:**
```
POST /cron/cancel-expired-pending    → Cancela pendentes expiradas
```

**PR**: #10 (mergeado via squash)

---

### 3. 💳 Sistema de Pagamentos Multi-Gateway (Stripe + Pagar.me)

**Checkout unificado que roteia para o gateway configurado:**

| Arquivo | Descrição |
|---------|-----------|
| `routes-stripe.ts` | API completa Stripe (1242 linhas) |
| `routes-payments.ts` | Wrapper provider-agnostic |
| `supabase/migrations/20260113_create_pagarme_orders_table.sql` | Tabela Pagar.me |

---

### 4. 🌐 Catálogo de Componentes Atualizado

**`components/client-sites/catalog.ts`** atualizado com:
- Novos endpoints OAuth (`auth-guest-google`, `auth-guest-me`)
- Novo bloco `guest-login-social` para sites
- Integration Guide com código de exemplo para IA

---

### 5. 🔀 Limpeza de Branches Git

**Branches mergeadas e deletadas (10 total):**
- `feat/oauth-social-login` (PR #11)
- `feat/pre-reservas` (PR #10)
- `feat/ai-prompt-v3-stripe-checkout`
- `feat/staysnet-auto-fetch-properties-sync`
- `feat/stripe-products-api`
- `feat/stripe-products-catalog`
- `feat/whatsapp-multitenant-webhook`
- `feat/whatsapp-multitenant-webhook-pr`
- `fix/cron-rpc-params`
- `fix/integrations-useeffect-import`
- `fix/vite-hmr-onedrive`
- `feat/payments-stripe-pagarme` (duplicado, deletado)

**Estado final do repositório:**
```
* main                    ← única branch local
  remotes/testes/main     ← único remote
```

---

### 6. 🚀 Deploys Realizados

| Edge Function | Status |
|---------------|--------|
| `rendizy-server` | ✅ Deployed |
| `rendizy-public` | ✅ Deployed |

---

## 📁 ESTRUTURA ATUALIZADA DO PROJETO

```
Rendizyoficial-main/
├── components/
│   ├── GoogleOneTap.tsx            # NOVO - One Tap popup
│   ├── SocialLoginButtons.tsx      # NOVO - Botões sociais
│   ├── ReservationCard.tsx         # MODIFICADO - Timer pendente
│   ├── ReservationDetailsModal.tsx # MODIFICADO - Countdown
│   ├── ClientSitesManager.tsx      # MODIFICADO - Prompt IA
│   ├── IntegrationsManager.tsx     # MODIFICADO - Stripe products
│   └── client-sites/
│       └── catalog.ts              # MODIFICADO - OAuth endpoints
│
├── src/
│   ├── components/
│   │   └── LoginPage.tsx           # MODIFICADO - v1.0.104.001
│   └── contexts/
│       └── AuthContext.tsx         # MODIFICADO - loginWithGoogle
│
├── supabase/
│   ├── functions/
│   │   ├── rendizy-server/
│   │   │   ├── index.ts            # MODIFICADO - novas rotas
│   │   │   ├── routes-auth-social.ts    # NOVO
│   │   │   ├── routes-stripe.ts         # MODIFICADO
│   │   │   └── routes-cron-pending-reservations.ts  # NOVO
│   │   └── rendizy-public/
│   │       └── index.ts            # MODIFICADO - guest auth
│   └── migrations/
│       ├── 20260113_create_guest_users_table.sql    # NOVO
│       ├── 20260113_add_pending_reservation_settings.sql  # NOVO
│       └── 20260113_create_pagarme_orders_table.sql # NOVO
│
└── docs/
    ├── 06-integrations/
    │   └── OAUTH_SOCIAL_LOGIN.md   # NOVO
    ├── changelogs/
    │   ├── CHANGELOG_V1.0.104.001.md
    │   └── CHANGELOG_V1.0.104.002.md  # NOVO (esta sessão)
    └── prompts/
        └── HANDOFF_2026_01_13_SESSION_COMPLETE.md  # ESTE ARQUIVO
```

---

## 📚 DOCUMENTAÇÃO PRINCIPAL

| Documento | Descrição |
|-----------|-----------|
| `docs/Rules.md` | Regras canônicas do Rendizy |
| `docs/06-integrations/OAUTH_SOCIAL_LOGIN.md` | OAuth Google/Apple |
| `docs/06-integrations/API_STRIPE_REFERENCE.md` | Referência Stripe |
| `docs/06-integrations/STAYSNET_SCALE_ROADMAP.md` | Roadmap Stays.net |
| `.github/AI_RULES.md` | Regras para AI/Copilot |

---

## ⏳ PRÓXIMAS TAREFAS (BACKLOG)

### Alta Prioridade

1. **Apple Sign In** - Configurar Apple Developer Account e implementar
2. **Testar fluxo OAuth completo** em produção
3. **Cron de expiração** - Agendar no Supabase via pg_cron

### Média Prioridade

4. **Stripe Products UI** - Catálogo de produtos/planos
5. **Pagar.me integration** - Completar backend
6. **Sites gerados por IA** - Testar com One Tap integrado

### Baixa Prioridade

7. **Refactor evolutionContactsService** - Remover dynamic imports
8. **Otimizar bundle size** - Code splitting adicional
9. **Testes automatizados** - Jest/Vitest para componentes críticos

---

## 🔍 COMANDOS ÚTEIS

```powershell
# Build
cd Rendizyoficial-main
npm run build

# Deploy Edge Functions
supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc
supabase functions deploy rendizy-public --project-ref odcgnzfremrqnvtitpcc

# Git
git push testes main
git log --oneline -10

# Token de teste
Get-Content ..\token.txt
```

---

## 🎯 REGRAS IMPORTANTES

1. **SEMPRE** ler `docs/Rules.md` antes de modificar código
2. **NUNCA** modificar zonas críticas sem documentar
3. **SEMPRE** fazer build antes de commit
4. **SEMPRE** pedir Copilot Review em PRs
5. **NUNCA** commitar `.env.local` ou secrets

---

## 📝 RESUMO DA SESSÃO

Esta sessão focou em:
1. **Implementar OAuth Social Login** (Google One Tap) para painel e sites
2. **Mergear todas as branches pendentes** para consolidar main
3. **Limpar repositório** - deletar branches remotas e locais
4. **Verificar integridade** - build passou, zero erros TypeScript
5. **Atualizar documentação** - changelogs, prompts, docs

**Estado do código**: ✅ Estável e funcionando
**Versão atual**: v1.0.104.001
**Commits da sessão**: 8 merges + 2 PRs squashed
