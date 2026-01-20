# 🔐 Sistema de Autenticação Social OAuth - Rendizy

> **Versão**: 1.0.0  
> **Data**: 2026-01-13  
> **Status**: ✅ Google Configurado | ⏳ Apple Pendente

---

## 📋 Visão Geral

O Rendizy suporta autenticação social via OAuth 2.0, permitindo que usuários façam login usando suas contas existentes do Google e Apple, sem precisar criar nova senha.

### Tipos de Usuário

| Tipo | Onde usa | Providers | Tabela |
|------|----------|-----------|--------|
| **Funcionários** | Painel Rendizy (`/login`) | Google, Apple, Email/Senha | `auth_users` |
| **Hóspedes** | Sites clientes (`#/area-interna`) | Google, Apple, Email/Senha | `guest_users` |

---

## 🔴 Google OAuth 2.0

### Status: ✅ CONFIGURADO

### Credenciais

```
Project ID: rendizy-484205
Client ID: 1068989503174-gd08jd74uclfjdv0goe32071uck2sg9k.apps.googleusercontent.com
Console: https://console.cloud.google.com/auth/branding?project=rendizy-484205
```

### Domínios Autorizados

- `rendizy2testesbackup.vercel.app`
- `rendizy.com`

### Origens JavaScript

| Ambiente | URL |
|----------|-----|
| Dev Local 1 | `http://localhost:5173` |
| Dev Local 2 | `http://localhost:3000` |
| Dev Local 3 | `http://localhost:3001` |
| Dev Local 4 | `http://localhost:5174` |
| Produção Vercel | `https://rendizy2testesbackup.vercel.app` |
| Produção Custom | `https://rendizy.com` |

### URIs de Redirecionamento

| Ambiente | URL |
|----------|-----|
| Dev Local 5173 | `http://localhost:5173/auth/callback` |
| Dev Local 3000 | `http://localhost:3000/auth/callback` |
| Produção Vercel | `https://rendizy2testesbackup.vercel.app/auth/callback` |
| Supabase Auth | `https://odcgnzfremrqnvtitpcc.supabase.co/auth/v1/callback` |

### Escopos Habilitados

- `.../auth/userinfo.email` - Email do usuário
- `.../auth/userinfo.profile` - Nome e foto
- `openid` - OpenID Connect

### Como funciona o One Tap

```
┌─────────────────────────────────────────────────────┐
│  Site do Cliente (medhome.rendizy.com)              │
├─────────────────────────────────────────────────────┤
│                                                     │
│   [Busca de propriedades...]                        │
│                                                     │
│         ┌──────────────────────────┐                │
│         │  G  Continuar como       │ ← One Tap     │
│         │     Rafael Oliveira      │   Automático  │
│         │     rafael@gmail.com     │                │
│         │  ─────────────────────── │                │
│         │  [Continuar] [Não agora] │                │
│         └──────────────────────────┘                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Benefícios:**
- Taxa de conversão 15-30% (vs 2-5% login tradicional)
- Captura automática de nome, email e foto
- Sem sair da página atual

---

## 🍎 Apple Sign In

### Status: ⏳ NÃO CONFIGURADO

**Requisitos:**
- Apple Developer Account ($99/ano)
- Service ID configurado
- Domain verification

**Quando configurar, adicionar ao `.env.local`:**

```env
VITE_APPLE_CLIENT_ID=com.rendizy.signin
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_KEY_ID=XXXXXXXXXX
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
```

---

## 🏗️ Arquitetura

### Variáveis de Ambiente

| Variável | Onde usar | Descrição |
|----------|-----------|-----------|
| `VITE_GOOGLE_CLIENT_ID` | Frontend | ID público do cliente Google |
| `GOOGLE_CLIENT_SECRET` | Backend | Chave secreta (NÃO expor!) |
| `GOOGLE_PROJECT_ID` | Referência | ID do projeto no GCP |

### Fluxo de Autenticação

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Usuário │────▶│  Frontend│────▶│  Google  │────▶│ Backend  │
│          │     │  (React) │     │  OAuth   │     │ (Edge Fn)│
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                │                 │                │
     │  1. Clica      │                 │                │
     │  "Login Google"│                 │                │
     │                │  2. Redirect    │                │
     │                │────────────────▶│                │
     │                │                 │  3. Autoriza   │
     │                │                 │◀───────────────│
     │                │  4. ID Token    │                │
     │                │◀────────────────│                │
     │                │                 │                │
     │                │  5. Valida Token│                │
     │                │────────────────────────────────▶│
     │                │                 │                │
     │                │  6. JWT Rendizy │                │
     │                │◀────────────────────────────────│
     │  7. Logado!    │                 │                │
     │◀───────────────│                 │                │
```

---

## 📁 Arquivos Relacionados

| Arquivo | Descrição |
|---------|-----------|
| `.env.local` | Credenciais (não commitar!) |
| `src/components/LoginPage.tsx` | Tela de login Rendizy (v1.0.104.001) |
| `src/contexts/AuthContext.tsx` | Gerenciamento de auth + loginWithGoogle |
| `components/GoogleOneTap.tsx` | Componente One Tap |
| `components/SocialLoginButtons.tsx` | Botões Google + Apple |
| `components/client-sites/catalog.ts` | Endpoints OAuth no catálogo |
| `supabase/functions/rendizy-server/routes-auth-social.ts` | Backend OAuth |
| `supabase/functions/rendizy-public/index.ts` | Guest auth endpoints |
| `supabase/migrations/20260113_create_guest_users_table.sql` | Tabela guest_users |

---

## 🔒 Segurança

### ⚠️ NUNCA expor:

- `GOOGLE_CLIENT_SECRET`
- `APPLE_PRIVATE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### ✅ Pode expor (são públicas):

- `VITE_GOOGLE_CLIENT_ID`
- `VITE_APPLE_CLIENT_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 📝 Changelog

### v1.0.1 (2026-01-13)
- ✅ Componentes implementados (GoogleOneTap, SocialLoginButtons)
- ✅ Backend completo (routes-auth-social.ts)
- ✅ Migration guest_users executada
- ✅ Catálogo atualizado com endpoints OAuth
- ✅ PR #11 mergeado
- ✅ Edge Functions deployed

### v1.0.0 (2026-01-13)
- ✅ Configuração inicial Google OAuth no GCP
- ✅ Credenciais salvas em `.env.local`
- ✅ Domínios e origens configurados
- ✅ Escopos email, profile, openid habilitados
- ⏳ Apple Sign In pendente (requer dev account)

---

## 🔗 Links Úteis

- [Google Cloud Console](https://console.cloud.google.com/auth/branding?project=rendizy-484205)
- [Google Identity Services Docs](https://developers.google.com/identity/gsi/web/guides/overview)
- [One Tap Reference](https://developers.google.com/identity/gsi/web/reference/js-reference)
- [Apple Sign In Docs](https://developer.apple.com/sign-in-with-apple/)
