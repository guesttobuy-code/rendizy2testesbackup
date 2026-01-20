# Smoke Test — MedHome (/site/medhome) Proxy + Booking Inject + Checkout v2

Este checklist existe pra resolver rápido o sintoma: **“parece que está servindo o site antigo / não aplicou as regras / não abriu checkout em nova aba”**.

## Pré-requisitos

- Use uma janela anônima OU faça logout e limpe storage.
- Abra o DevTools com Network aberto.
- Ative `Disable cache` no DevTools (apenas durante o teste).

## 1) Confirmação de deploy/versão (anti-cache)

1. Abra:
   - `/site/medhome/` (página inicial)
   - e também um deep-link (exemplo): `/site/medhome/#/imovel/<id>`
2. Clique no request do **document** (o HTML) e confira os headers:
   - `X-Rendizy-Proxy-Version` deve existir.
   - `Cache-Control` deve estar como `no-store` (ou equivalente).

Se `X-Rendizy-Proxy-Version` não aparece, você provavelmente está em um deploy antigo, ou não está passando pela função `api/site`.

## 2) Confirmação de injeção do booking

Na aba Network, tem que existir um request para:

- `/api/inject/booking-v2.js?v=<algo>`

Se NÃO existir:
- o HTML não injetou o script (ou você está vendo HTML antigo cacheado).

Se existir, valide no Console:

- `window.__RENDIZY_BOOKING_V2__`

Deve retornar um objeto com `loadedAt` e `scriptSrc`.

## 3) Booking form (regra do telefone + lock quando logado)

Com login ativo (ex: botão com seu nome no topo):

- Nome/E-mail/Telefone devem vir preenchidos.
- Nome/E-mail/Telefone devem ficar travados (readonly/disabled).
- Telefone deve exigir país/prefixo (E.164) e não permitir submit sem isso.

Sem login:

- Telefone deve ser obrigatório com país/prefixo.

## 4) Checkout v2 (nova aba + retorno + confirmação)

1. Clique para pagar.
2. Stripe Checkout deve abrir em **nova aba**.
3. No final do pagamento, Stripe deve retornar para:
   - `/api/checkout/success?...`
4. A aba original deve receber um aviso (toast) e oferecer link para:
   - `/guest-area/#/reservas?focus=<reservationId>`

## 5) Se falhar, capture evidências

- Print da aba Network filtrando por:
  - `booking-v2`
  - `checkout`
  - `document`
- Print dos headers do document com `X-Rendizy-Proxy-Version`.
- Print do console com `window.__RENDIZY_BOOKING_V2__`.
