# IMPLEMENTAÇÃO — StaysNet: reservas com pricing real + guest linkage + backfill (2025-12-25)

## Contexto
No módulo de reservas, vários cards estavam exibindo:
- **Hóspede** como “Hóspede #…/guest_id” (sem nome/email/telefone), e/ou
- **Valores** como `R$0,00` (ex.: `pricing_total=0`).

Isso acontecia especialmente em reservas importadas/vindas do Stays.net.

## Sintomas (observáveis no banco)
- `reservations.guest_id` nulo (sem join com `guests`).
- `reservations.pricing_*` (INTEGER) zerados.
- O payload real existia no Stays, mas não estava sendo mapeado para as colunas SQL (ou estava vindo com formato diferente do esperado).

## Causa raiz
1) **Parsing de preços incompleto**: o payload do Stays frequentemente entrega valores formatados em chaves “_f_*” (ex.: `_f_total`, `_f_expected`) e/ou fees em `hostingDetails.fees[]`. O mapeamento anterior não cobria bem esses formatos.
2) **Guest linkage ausente/insuficiente**: algumas reservas não trazem email/telefone/nome no objeto de reserva; podem trazer apenas `_idclient` (ou estrutura diferente), exigindo:
   - fallback de exibição via `staysnet_raw` quando existir; e/ou
   - um fluxo separado de import/lookup de hóspedes por `_idclient`.

## O que foi implementado

### 1) Backend: Edge Function `rendizy-server`
Arquivos principais:
- `supabase/functions/rendizy-server/routes-staysnet.ts`
  - `mapStaysReservationToSql`: reforçado o parsing de preços com múltiplos fallbacks.
  - Backfill: recalcula e atualiza reservas existentes com base no `staysnet_raw`.
- `supabase/functions/rendizy-server/utils-staysnet-guest-link.ts`
  - Helper para **resolver/criar** hóspede e retornar `guest_id` quando o payload permitir.
- `supabase/functions/rendizy-server/utils-reservation-mapper.ts`
  - Ajustes de “select fields” e fallback de `guestName` via `staysnet_raw` quando não houver join.
- `supabase/functions/rendizy-server/index.ts`
  - Registro de rotas de backfill também no path alternativo do gateway.

#### Parsing de preços (Stays)
O mapeamento passou a priorizar:
- `staysnet_raw.price._f_total` → total (ex.: `pricing_total`)
- `staysnet_raw.price._f_expected` → base/accommodation (ex.: `pricing_base_total`)
- `staysnet_raw.price.hostingDetails.fees[]` → soma de taxas/fees quando não houver campo direto

Além disso, o mapeamento evita gravar `pricing_*` com formatos inválidos para colunas INTEGER.

### 2) Automação StaysNet (webhook + cron)
Arquivos:
- `supabase/functions/staysnet-webhook-receiver/index.ts`
- `supabase/functions/staysnet-webhooks-cron/index.ts`
- `CRIAR_CRON_JOB_STAYSNET_WEBHOOKS_CRON.sql`
- `DEPLOY-AGENDA-STAYSNET-WEBHOOKS-CRON.ps1`

Objetivo: não depender de “clicar importar” para manter reservas atualizadas.

### 3) Frontend: busca global (sidebar)
Arquivos:
- `App.tsx`
- `components/MainSidebar.tsx`
- `components/GuestsManager.tsx`

Objetivo: permitir buscar e navegar rapidamente por **reservas**, **hóspedes** e **imóveis**, com deep-link.

## Endpoints úteis
- Backfill (reservas/guests/pricing):
  - `POST /staysnet/backfill/guests/:organizationId`
  - `POST /rendizy-server/staysnet/backfill/guests/:organizationId`

Observação: o gateway pode exigir `Authorization: Bearer <anonKey>` e o token real em `X-Auth-Token` (padrão do projeto).

## Como validar
1) Deploy do backend:
- `npx supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc --no-verify-jwt`

2) Rodar backfill para uma organização:
- Chamar `POST /staysnet/backfill/guests/:organizationId`

3) Conferir no banco:
- Uma reserva que tinha `pricing_total=0` deve passar a ter valores coerentes.

4) Teste modular (quando aplicável):
- `TEST-STAYSNET-MODULAR.ps1`

## Limitações / próximos passos recomendados
- Se o payload de reserva não contém dados suficientes do hóspede (apenas `_idclient`), o vínculo automático (`guest_id`) pode continuar nulo.
- Próximo passo: implementar lookup do cliente/hóspede via endpoint Stays usando `_idclient`, ou garantir que o import de hóspedes seja executado antes e com estrutura compatível.

## Referências
- `CHANGELOG.md` (Unreleased)
- `docs/README_PARA_IA.md` (regras de CORS/persistência e checklists)
- `docs/operations/SETUP_COMPLETO.md` (CORS/auth headers)
