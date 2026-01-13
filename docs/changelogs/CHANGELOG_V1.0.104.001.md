# Changelog v1.0.104.001

> **Data**: 2026-01-13  
> **Autor**: Copilot + Rafael  
> **Branch**: feat/oauth-social-login

---

## 🆕 Novas Funcionalidades

### 🔐 Sistema de Autenticação Social OAuth

Implementação de login social via Google (One Tap) e Apple Sign In para:
- **Painel Rendizy** (funcionários)
- **Sites dos clientes** (hóspedes)

#### Componentes Adicionados

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `GoogleOneTap` | `components/GoogleOneTap.tsx` | Popup One Tap do Google |
| `SocialLoginButtons` | `components/SocialLoginButtons.tsx` | Botões Google + Apple |
| `GuestAuthProvider` | `contexts/GuestAuthContext.tsx` | Contexto auth para hóspedes |

#### Backend Endpoints

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/auth/social/google` | POST | Valida ID token do Google |
| `/auth/social/apple` | POST | Valida ID token da Apple |
| `/auth/guest/me` | GET | Dados do hóspede logado |

#### Tabelas de Banco

| Tabela | Descrição |
|--------|-----------|
| `guest_users` | Hóspedes dos sites (separado de auth_users) |

---

## ⚙️ Configurações

### Google OAuth 2.0

- **Project ID**: `rendizy-484205`
- **Client ID**: `1068989503174-gd08jd74uclfjdv0goe32071uck2sg9k.apps.googleusercontent.com`
- **Console**: [Google Cloud Console](https://console.cloud.google.com/auth/branding?project=rendizy-484205)

### Variáveis de Ambiente

```env
VITE_GOOGLE_CLIENT_ID=1068989503174-...
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_PROJECT_ID=rendizy-484205
```

---

## 📝 Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `.env.local` | Adicionadas credenciais Google OAuth |
| `docs/06-integrations/OAUTH_SOCIAL_LOGIN.md` | Nova documentação |
| `src/components/LoginPage.tsx` | Adicionados botões Google/Apple |
| `components/ClientSitesManager.tsx` | Prompt IA atualizado com auth |

---

## 🔄 Relacionado a

- PR #10: feat(pre-reservas): implement pending reservation system
- Issue: Login social para hóspedes

---

## ✅ Checklist de Implementação

- [x] Configurar Google OAuth no GCP
- [x] Salvar credenciais em `.env.local`
- [x] Documentar em `/docs`
- [x] Implementar componente GoogleOneTap
- [ ] Implementar SocialLoginButtons
- [ ] Atualizar LoginPage.tsx
- [ ] Backend: endpoint /auth/social/google
- [ ] Migration: tabela guest_users
- [ ] Atualizar prompt IA dos sites
- [ ] Testar fluxo completo

---

## 🔗 Documentação

- [OAUTH_SOCIAL_LOGIN.md](../06-integrations/OAUTH_SOCIAL_LOGIN.md)
- [Google Identity Services](https://developers.google.com/identity/gsi/web)
