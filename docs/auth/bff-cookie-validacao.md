# Validação — Auth BFF com cookies (site + guest-area)

Objetivo: validar que o login é **persistente** entre `/site/<slug>/...` e `/guest-area/` usando **cookies httpOnly**.

## Pré-requisitos (Vercel env)

- `AUTH_COOKIE_DOMAIN` configurado para o domínio do cliente (ex: `.medhome.com.br`) quando estiver em produção.
- `VERCEL_ENV=production` (ou `NODE_ENV=production`) para `Secure` em cookies.

## Fluxo 1 — Login no guest-area e persistência no site

1. Abrir `/guest-area/?siteSlug=<slug>`
2. Fazer login (Google)
3. Verificar:
   - `GET /api/auth/me?siteSlug=<slug>` retorna `{ authenticated: true, user: ... }`
   - Navegar para `/site/<slug>/` e confirmar que o header/autofill reconhece o usuário

Critério: não exigir novo login ao alternar entre site e guest-area.

## Fluxo 2 — Migração do token legacy (`?t=`)

1. Abrir `/guest-area/?siteSlug=<slug>&t=<token_legacy>`
2. Verificar que o guest-area chama `POST /api/auth/session` e estabelece cookies.
3. Recarregar a página e confirmar:
   - `GET /api/auth/me` continua autenticado

Critério: `?t=` vira sessão cookie e continua funcionando.

## Fluxo 3 — Reservas do hóspede

1. Estando logado, abrir `Minhas Reservas`
2. Verificar que o front chama:
   - `GET /api/guest/reservations/mine?siteSlug=<slug>` (sem token no JS)
3. Confirmar que lista está correta.

Critério: não existe token exposto no front-end.

## Fluxo 4 — Logout

1. Clicar em logout no guest-area
2. Verificar:
   - `POST /api/auth/logout` limpa `rendizy_guest_token` e `rendizy_site_slug`
   - `GET /api/auth/me` retorna `{ authenticated: false }`

Critério: a sessão é removida e o site também deixa de reconhecer.

## Observações de produção

- Se o cliente estiver em subdomínios diferentes, `SameSite=Lax` normalmente funciona para navegação normal; se houver iframes/fluxos cross-site, avaliar `SameSite=None; Secure`.
- Para evitar cache ruim no guest-area, manter headers `no-store` para HTML do `/guest-area/`.
