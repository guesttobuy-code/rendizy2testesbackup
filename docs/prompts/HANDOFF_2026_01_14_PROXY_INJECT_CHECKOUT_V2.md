# 🔄 PROMPT DE HANDOFF — Rendizy — 2026-01-14 — Proxy (/site) + Inject (booking-v2) + Checkout v2 + Guest Area

> **Use este prompt para iniciar um novo chat e continuar o trabalho.**
> Objetivo desta sessão: padronizar e estabilizar **reservas + login do hóspede + checkout Stripe em nova aba + confirmação por webhook** em sites estáticos hospedados no Storage, via **proxy de HTML** no domínio da Vercel.

---

## 0) TL;DR (o que precisa continuar funcionando)

Padrão Rendizy (contrato de UX/plataforma):
- Checkout (Stripe) abre em **nova aba**.
- Stripe retorna para páginas no **domínio Rendizy**:
  - `/api/checkout/success?...`
  - `/api/checkout/cancel?...`
- A página de **success** faz *poll* até o webhook confirmar e então:
  - notifica a aba original (site)
  - tenta fechar a aba do checkout
  - oferece deep-link para a Guest Area com foco na reserva.
- Telefone é **obrigatório** com país/prefixo (E.164). Se o hóspede estiver logado, nome/email/telefone ficam **travados** (edita apenas no Perfil).
- “Site antigo / regras não aplicadas” deve ser diagnosticável por headers e por marcador JS.

---

## 1) Onde você está (workspace/repo)

Workspace:
- `c:\Users\rafae\OneDrive\Desktop\Rendizyoficial-main arquivos mais atualizado do github 09 12 2025\`

Repo Git principal (onde estão as funções Vercel + guest-area):
- `Rendizyoficial-main/`

Branch atual:
- `main`

Commits recentes (últimos 5):
- `2739154` fix(medhome): repair inject parse + harden checkout patch
- `a166723` docs+auth: add MedHome standardization analysis; debug header
- `91b77fa` feat(proxy+checkout): inject booking-v2, no-store HTML, checkout pages
- `970db09` fix(guest-area): manual google login + session reset
- `02fd1cd` merge: auth bff cookie

---

## 2) Arquitetura (como a coisa funciona de verdade)

### 2.1 Proxy de site estático no domínio Rendizy
Entrada principal:
- URL pública: `/site/<slug>/...`
- Rewrite (Vercel): configurado em [vercel.json](../../vercel.json)
- Função: [api/site.js](../../api/site.js)

Responsabilidades do proxy:
- Buscar `index.html` e assets no Storage/Edge (`rendizy-public`) e servir corretamente no domínio Vercel.
- Garantir `Content-Type: text/html` e um CSP controlado.
- Injetar:
  - `<base href="/site/<slug>/" />`
  - `window.RENDIZY_CONFIG` (supabaseUrl/anonKey/publicApiBase)
  - script externo do padrão de reservas: `/api/inject/booking-v2.js?v=<deploy>`
- **Anti-cache forte** para HTML (evitar “site antigo”).
- Compat patches (MedHome): patch do bundle para correções e para “checkout em nova aba” (Patch #6).

### 2.2 Script injetado (browser)
- Função: [api/inject/booking-v2.js](../../api/inject/booking-v2.js)
- É servido como JS cacheável (`immutable`) e precisa ser **versionado** com `?v=`.
- Marca de debug:
  - `window.__RENDIZY_BOOKING_V2__` (prova que carregou e executou)

Responsabilidades do inject:
- Descobrir `siteSlug` pelo path `/site/<slug>/...`.
- Hidratar sessão do hóspede via BFF cookie:
  - `GET /api/auth/me?siteSlug=<slug>`
- Aplicar regras no formulário:
  - telefone obrigatório com país/prefixo (E.164)
  - se logado: autofill e lock (nome/email/telefone)
- Padronizar checkout:
  - forçar `success_url`/`cancel_url` para páginas Rendizy
  - sinalizar eventos entre abas (BroadcastChannel/localStorage/opener.postMessage)

### 2.3 Checkout v2 (páginas no domínio Rendizy)
- Success: [api/checkout/success.js](../../api/checkout/success.js)
- Cancel: [api/checkout/cancel.js](../../api/checkout/cancel.js)

Por que existem:
- Stripe Checkout não permite JS custom rodando em `stripe.com`.
- Então a lógica de confirmação precisa rodar no retorno (`success`) no domínio Rendizy.

Success flow real:
- Recebe `siteSlug`, `reservationId`, `returnUrl` por query.
- Faz poll:
  - `GET /api/guest/reservations/mine?siteSlug=<slug>`
- Quando encontrar a reserva e ela estiver confirmada/paga:
  - salva `rendizy_checkout_confirmed`
  - emite evento `confirmed`
  - tenta `window.close()` (funciona se abriu com `window.open`)

---

## 3) Contratos e endpoints (importante para manutenção)

### 3.1 Rotas /site
- Rewrite em [vercel.json](../../vercel.json):
  - `/site/:subdomain` → `/api/site?subdomain=:subdomain`
  - `/site/<slug>/<path>` → `/api/site?subdomain=<slug>&path=<path>`

Headers esperados no HTML:
- `Cache-Control: ... no-store ...`
- `CDN-Cache-Control: no-store`
- `Vercel-CDN-Cache-Control: no-store`
- `X-Rendizy-Proxy-Version: <cacheBuster>`

### 3.2 Auth BFF (cookie httpOnly)
- Login: [api/auth/google.js](../../api/auth/google.js)
  - `POST /api/auth/google` `{ credential, siteSlug }`
  - Seta cookies:
    - `rendizy_guest_token` (httpOnly)
    - `rendizy_site_slug` (httpOnly)
  - Header de debug (deploy): `X-Rendizy-Auth-Google`

- Sessão: [api/auth/me.js](../../api/auth/me.js)
  - `GET /api/auth/me?siteSlug=<slug>`
  - Lê cookies e valida upstream:
    - chama `rendizy-public` em `/auth/guest/me`

- Logout: [api/auth/logout.js](../../api/auth/logout.js) (best-effort: limpa cookie)

### 3.3 Reservas do hóspede (BFF)
- [api/guest/reservations/mine.js](../../api/guest/reservations/mine.js)
  - `GET /api/guest/reservations/mine?siteSlug=<slug>`
  - Valida cookie, chama upstream `rendizy-public` em `/reservations/mine`

### 3.4 Chaves de comunicação entre abas (checkout)
- BroadcastChannel: `rendizy_checkout_v1`
- localStorage:
  - `rendizy_checkout_pending`
  - `rendizy_checkout_confirmed`
  - `rendizy_checkout_event`

---

## 4) Caching/versionamento (onde mais dá ruim)

Pontos fixos:
- HTML do proxy (/site/*) deve ser **no-store** (browser + CDN).
- `/api/inject/*` pode ser `immutable`, mas o `<script src>` precisa ter `?v=<deploy>`.

Implementação real:
- [vercel.json](../../vercel.json)
  - `/site/(.*)` → `no-store`
  - `/api/checkout/(.*)` → `no-store`
  - `/api/inject/(.*)` → `public, max-age=31536000, immutable`
- [api/site.js](../../api/site.js)
  - gera `cacheBuster` com base em `VERCEL_GIT_COMMIT_SHA | VERCEL_DEPLOYMENT_ID | ...` (fallback por hora)
  - injeta `/api/inject/booking-v2.js?v=<cacheBuster>`

Sintomas típicos:
- “Parece site antigo”: não existe request para `booking-v2.js?v=...`.
- “Mudou no código mas não mudou no browser”: HTML está cacheado (ver headers /site).

---

## 5) Patch frágil (MedHome) — por que existe e como não quebrar

### PATCH #6 — checkout em nova aba
Local: [api/site.js](../../api/site.js)

O proxy faz patch em JS compilado para trocar redirecionamentos para Stripe por `window.open(..., "_blank")`.

Regra crítica (aprendida na dor):
- Só patchar **statements** (`...;`) e não expressões internas.
- Motivo: minificação pode gerar coisas como `foo(window.location.href=checkoutUrl)` e trocar isso quebra parsing.

Sintoma de quebra quando patch é agressivo:
- “Unexpected token ')'” em `index-*.js` e tela branca.

Mitigação aplicada:
- Regex com prefixo `(^|[;{}])` para reduzir falso positivo.

Ação futura recomendada:
- Tirar dependência desse patch movendo o padrão para o prompt/código do site (hook estável), e manter patch apenas como fallback temporário.

---

## 6) Guest Area (SPA) — estado atual

Arquivos relevantes:
- Contexto auth: [guest-area/src/contexts/GuestAuthContext.tsx](../../guest-area/src/contexts/GuestAuthContext.tsx)
  - sessão via `GET /api/auth/me?siteSlug=...`
  - login Google por clique (evita cooldown FedCM)
  - logout com limpeza best-effort

- Perfil (telefone E.164): [guest-area/src/pages/MyProfilePage.tsx](../../guest-area/src/pages/MyProfilePage.tsx)
  - salva `rendizy_guest_profile` com `{dial, phone}`

- Reservas com foco: [guest-area/src/pages/MyReservationsPage.tsx](../../guest-area/src/pages/MyReservationsPage.tsx)
  - aceita `/#/reservas?focus=<reservationId>` e faz scroll/highlight

---

## 7) Diagnóstico rápido (quando o usuário diz “não funciona”)

Ordem de investigação (sempre):
1) **Headers do HTML** de `/site/<slug>/`:
   - `X-Rendizy-Proxy-Version` existe?
   - `Cache-Control` é `no-store`?
2) Network:
   - carregou `/api/inject/booking-v2.js?v=...`?
3) Console:
   - `window.__RENDIZY_BOOKING_V2__` existe?
4) Checkout:
   - abriu Stripe em nova aba?
   - retorno foi para `/api/checkout/success`?
   - success confirmou via poll (reserva mudou para paid/confirmed)?

Checklist pronto:
- [docs/operations/SMOKE_MEDHOME_PROXY_CHECKLIST.md](../operations/SMOKE_MEDHOME_PROXY_CHECKLIST.md)

Script auxiliar (PowerShell):
- [../../_tmp_smoke_medhome_proxy_headers.ps1](../../_tmp_smoke_medhome_proxy_headers.ps1)
  - Uso:
    - `pwsh ./_tmp_smoke_medhome_proxy_headers.ps1 -BaseUrl https://rendizy2testesbackup.vercel.app -SiteSlug medhome`

---

## 8) Modo de falha que já aconteceu (e como evitar repetir)

### 8.1 Tela branca com erro de syntax no inject
- Sintoma: `Unexpected token 'var'` dentro do `booking-v2.js`.
- Causa real observada: string gerada contendo `//` acidentalmente (virou comentário e quebrou parsing).
- Regra: dentro de código “emitido” por template string, evite padrões que possam degradar em `//` quando concatenados.

### 8.2 Tela branca com erro de syntax no bundle do site
- Sintoma: `Unexpected token ')'` em `index-*.js`.
- Causa: patch por regex alterando expressão minificada.
- Regra: patchar apenas statements e usar prefixos seguros.

### 8.3 Google login não aparece / FedCM cooldown
- Sintoma: prompt do Google é “skipped/not displayed”.
- Mitigação: login por clique (não auto One Tap) + botão “Sair/limpar sessão”.

---

## 9) Próximos passos objetivos (curto e verificável)

1) Revalidar MedHome em produção com checklist:
   - /site/medhome carrega
   - `booking-v2.js?v=` aparece
   - checkout abre nova aba
   - success confirma e notifica aba original

2) Solidificar contrato de status de reserva:
   - alinhar quais campos e valores são canônicos no objeto retornado por `/reservations/mine` (ex.: `status`, `payment_status`).

3) Tirar o PATCH #6 do caminho:
   - mover padrão de checkout “nova aba + retorno” para o prompt/catalog do site e manter patch só como fallback.

4) Só depois disso: atualizar catálogo/prompt (canonical) usando:
   - [docs/analysis/ANALISE_MEDHOME_PADRAO_RESERVAS_CHECKOUT_V2.md](../analysis/ANALISE_MEDHOME_PADRAO_RESERVAS_CHECKOUT_V2.md)

---

## 10) Nota para o próximo agente

- Não colocar segredos em docs/commits.
- Sempre versionar o inject (`?v=`) e sempre `no-store` no HTML.
- Quando alguém reportar “site antigo”, trate como **problema de cache/roteamento** até prova em contrário.
