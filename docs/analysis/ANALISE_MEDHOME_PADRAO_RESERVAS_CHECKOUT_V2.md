qu# Análise — MedHome (Proxy/Inject) vs Catálogo (Componentes & Dados) vs Prompt (IA)

**Data:** 2026-01-14  
**Objetivo:** registrar, com rigor, **o que foi necessário ajustar para fazer o MedHome funcionar** com o padrão Rendizy (checkout em nova aba + reserva pendente + confirmação por webhook + área do cliente), e **o que ainda precisa ser testado** antes de atualizar:
- a tela **Edição de Sites → Componentes & Dados** (catálogos)
- o **Prompt de construção (Bolt/IA)**

> Princípio norteador: **O Rendizy propõe o padrão; o site externo executa exatamente o que pedimos.**
> Se algo não funciona em um site, o ideal é corrigir o *prompt* (e/ou o *catálogo*) — não “remendar por site”.
>
> Porém, no caso de sites estáticos hospedados no Storage, existe um modo “servido pelo Rendizy” que injeta comportamento. Essa camada precisa ser tratada como parte do *padrão* (e não como exceção MedHome).

---

## 1) Onde está o “padrão” hoje (estado real)

### 1.1 Proxy (HTML + patches) — modo servido pelo Rendizy
- Endpoint: `/site/:slug/*` → reescreve para `api/site.js`.
- Responsabilidades:
  - Entregar HTML como `text/html` (evitar `text/plain` do Storage/Edge).
  - Inserir `window.RENDIZY_CONFIG` (supabaseUrl/anonKey/publicApiBase).
  - Injetar script externo versionado: `/api/inject/booking-v2.js?v=<deploy>`.
  - Garantir **HTML não-cacheável** (evitar “site antigo”).
  - (Patch de compat) Ajustar bundle quando o site do Bolt faz navegação/redirect “errado” pro padrão Rendizy.

### 1.2 Inject (browser script) — regras de booking + checkout v2
- Endpoint: `api/inject/booking-v2.js`.
- Responsabilidades:
  - Descobrir `siteSlug` a partir de `/site/<slug>/...`.
  - Hidratar sessão via cookie (`/api/auth/me?siteSlug=...`).
  - Aplicar regra de **telefone obrigatório com país/prefixo (E.164)**.
  - Se logado: **autofill + lock** (nome/email/telefone imutáveis no formulário).
  - Interceptar fluxo de checkout e forçar retorno para domínio Rendizy:
    - `/api/checkout/success?...`
    - `/api/checkout/cancel?...`
  - Sinalizar confirmação “de volta” para a aba original (BroadcastChannel/localStorage/opener).

### 1.3 Checkout success/cancel (domínio Rendizy)
- Endpoints:
  - `api/checkout/success.js`
  - `api/checkout/cancel.js`
- Responsabilidades:
  - Lidar com a limitação: **não existe JS custom em `stripe.com`**.
  - Em `success`: *poll* até webhook confirmar (via `/api/guest/reservations/mine?siteSlug=...`), emitir evento de confirmação, tentar fechar aba.
  - Em `cancel`: emitir evento de cancelamento e permitir voltar/fechar.

### 1.4 Guest Area (SPA)
- Papel: fonte de verdade dos dados do hóspede e da “visão de reservas”.
- Padrão desejado:
  - Login persistente via cookies BFF.
  - Perfil com telefone + dial (E.164), usado pelo inject.
  - Página de reservas com `?focus=<reservationId>`.

---

## 2) O que foi necessário “mexer” para o MedHome funcionar

> Importante: a maioria das mudanças foram **para tornar o padrão executável em qualquer site** (não apenas MedHome). O MedHome foi o primeiro a revelar os pontos fracos.

### 2.1 Problema: “parece site antigo / inject não carregou”
**Sintoma:** no Network não aparecia request para `booking-v2.js`.

**Mudanças realizadas (back-end/proxy):**
- `Cache-Control` do HTML ficou estrito (`no-store`), com headers redundantes (`CDN-Cache-Control`, `Vercel-CDN-Cache-Control`, `Pragma`).
- Adicionamos `X-Rendizy-Proxy-Version` para provar qual deploy está respondendo.
- O script de injeção passou a ser **externo e versionado** (cacheable + bust).

**Risco residual:** se o usuário cai em outro domínio/deploy, o comportamento “antigo” volta. Por isso a necessidade de smoke-check e headers.

### 2.2 Problema: inputs do formulário no MedHome não batiam com seletores simples
**Sintoma:** autofill/lock/validação não aplicavam porque o Bolt às vezes muda `name`, placeholder, estrutura.

**Mudança (inject):**
- Seleção tolerante com fallback por `label` (texto “Nome/E-mail/Telefone/Whats”).

**Risco residual:** sites com componentes não-semânticos (sem `label`/`input` padrão) podem exigir outro fallback.

### 2.3 Problema: Stripe Checkout abrindo na mesma aba
**Sintoma:** o site redirecionava a aba atual (`window.location.href = checkoutUrl`).

**Mudança (proxy patch JS):**
- Patch em bundle para substituir redirects envolvendo `checkoutUrl` por `window.open(url, "_blank")`.

**Risco residual (alto):** patch por regex em JS compilado é frágil (minificação muda). O ideal é:
1) o prompt do Bolt implementar o padrão corretamente; e/ou
2) termos um hook público estável no front (evento/callback) ao invés de regex.

### 2.4 Problema: “pending vs confirmed” e confirmação por webhook
**Premissa do padrão:** a reserva nasce em estado pendente e só vira confirmada quando o webhook confirma o pagamento.

**O que implementamos na prática:**
- `success.js` faz poll de `/api/guest/reservations/mine` e procura a reserva com status/payment confirmado.

**Ponto para validar:**
- O backend de reservas/webhook realmente atualiza `status/payment_status` no objeto retornado por `mine` de forma consistente.
- Quais são os valores canônicos aceitos (ex.: `pending`, `confirmed`, `paid`, etc.).

---

## 2.5) Mapa de mudanças por arquivo (auditável)

### Proxy / infraestrutura
- `api/site.js`
  - Injeta `/api/inject/booking-v2.js?v=<deploy>`.
  - Headers anti-cache no HTML (`no-store`) + `X-Rendizy-Proxy-Version`.
  - Patch em bundle para abrir `checkoutUrl` em nova aba (muleta necessária no MedHome).
- `vercel.json`
  - Força `/site/*` como `no-store`.
  - Força `/api/checkout/*` como `no-store`.
  - Permite `/api/inject/*` como `immutable` (desde que versionado).

### Inject + checkout pages
- `api/inject/booking-v2.js`
  - Regras do booking form + intercept do checkout + marcador `window.__RENDIZY_BOOKING_V2__`.
- `api/checkout/success.js`
  - Página de retorno do Stripe que faz polling até confirmação e notifica a aba original.
- `api/checkout/cancel.js`
  - Página de cancelamento (notifica e permite voltar/fechar).

### Guest Area
- `guest-area/src/contexts/GuestAuthContext.tsx`
  - Hidrata sessão via `/api/auth/me` e mantém compat via `localStorage`.
- `guest-area/src/pages/MyProfilePage.tsx`
  - Telefone com país/prefixo e persistência em `rendizy_guest_profile`.
- `guest-area/src/pages/MyReservationsPage.tsx`
  - `?focus=<reservationId>` para destacar/rolar até a reserva.

### Build artefatos
- `public/guest-area/index.html` e `public/guest-area/assets/*`
  - Atualizados pelo build (hash). Devem ser commitados juntos para não quebrar o deploy.

---

## 3) Comparação com “Componentes & Dados” (catálogo interno)

### 3.1 O que o catálogo já deixa claro (alinhado com o padrão)
- “O Rendizy propõe o padrão. Sites externos seguem.”
- Contrato público e shapes (properties/calendar etc).
- Guia de Google One Tap e integração.

### 3.2 O que ainda NÃO está formalizado (mas já virou realidade do produto)
Para o padrão “site de reservas” ficar verdadeiro, o catálogo (tela) precisará ter blocos/documentação para:
- **Checkout v2** (nova aba + success/cancel no domínio Rendizy + confirmação via webhook + evento para aba original)
- **Regras de booking do hóspede** (telefone obrigatório com país/prefixo, autofill/lock quando autenticado)
- **Integração com Guest Area** (link de “Ver reserva”, foco, perfil como fonte de verdade)

> Mas: por pedido seu, **NÃO vamos atualizar o catálogo ainda**. Este arquivo existe para guiar os testes e só depois refletir a verdade no catálogo/prompt.

---

## 4) Comparação com o Prompt (IA/Bolt)

### 4.1 O que o prompt faz bem (intenção)
- Ser imperativo e anti-ambíguo.
- Proibir supabase-js e exigir `fetch` do contrato público.

### 4.2 O que precisa virar “regra padrão” no prompt (após validação)
- Checkout sempre abre em nova aba.
- Success/cancel sempre retornam pro domínio Rendizy.
- Reserva inicial é “pending” e confirmação é assíncrona via webhook.
- A aba original recebe evento/confirm.
- Formulário deve respeitar autofill/lock quando logado.

---

## 5) Plano de teste (antes de atualizar catálogo/prompt)

### 5.1 Testes de infraestrutura (anti-cache / versão)
- `GET /site/medhome/`:
  - Deve ter `X-Rendizy-Proxy-Version`
  - Deve ter `Cache-Control: no-store` (ou equivalente)
- Network deve mostrar `GET /api/inject/booking-v2.js?v=...`
- Console deve ter `window.__RENDIZY_BOOKING_V2__` com `loadedAt` e `scriptSrc`.

### 5.2 Testes de login/sessão (cookies)
- Login Google deve setar cookie (ver `Set-Cookie`).
- `GET /api/auth/me?siteSlug=medhome` deve retornar `authenticated=true`.

### 5.3 Testes do booking form (sem login)
- Telefone obrigatório com país/prefixo.
- Não permitir submit sem telefone válido.

### 5.4 Testes do booking form (com login)
- Autofill nome/email/telefone.
- Campos travados (readonly/disabled).
- Mensagem clara: edições no perfil da Guest Area.

### 5.5 Testes do checkout v2
- Ao clicar em pagar: checkout em **nova aba**.
- Ao concluir pagamento:
  - Redireciona para `/api/checkout/success?...`.
  - A aba original recebe evento/aviso.
  - Link “Ver reserva” abre `/guest-area/#/reservas?focus=<id>`.

### 5.6 Evidências obrigatórias se algo falhar
- Prints do Network (document / booking-v2 / checkout).
- Headers do HTML (`X-Rendizy-Proxy-Version`).
- Console (`window.__RENDIZY_BOOKING_V2__`).

---

## 6) Decisões e dívidas técnicas (documentadas)

1) **Patch por regex em bundle**: funciona como “muleta” para MedHome, mas não é o padrão ideal.
2) **Selectors por label**: é o mínimo para suportar variação Bolt; ideal é o site respeitar `name/id` canônicos.
3) **Status/PaymentStatus**: precisamos validar os valores finais reais expostos em `reservations/mine` para não depender de heurística.

---

## 7) Quando atualizar catálogo/prompt

Somente após:
- smoke test passar em `medhome`
- checkout em nova aba confirmado em 100% dos paths
- status/confirm por webhook consistente

Aí sim:
- atualizar a tela “Componentes & Dados” (catálogo)
- atualizar o prompt (IA/Bolt)
- remover/afrouxar patches frágeis (quando o front já obedecer o padrão)
