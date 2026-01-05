# Protocolo de Defesa — Módulos Críticos (Tripé)

Este protocolo existe para garantir que alterações em **Anúncios Ultimate**, **Reservas** e **Calendário** não gerem regressões silenciosas.

A regra é simples:

> **Para editar qualquer coisa nesses 3 módulos, você precisa passar pelo “cadeado”.**

## 1) O que é “módulo crítico”

- **Anúncios Ultimate**
  - Backend: `supabase/functions/rendizy-server/routes-anuncios.ts`
  - Frontend: `components/anuncio-ultimate/*`
- **Reservas**
  - Backend: `supabase/functions/rendizy-server/routes-reservations.ts`
  - Frontend: telas de reservas/calendário que consomem `/reservations`
- **Calendário**
  - Backend: `supabase/functions/rendizy-server/routes-calendar.ts` + `routes-blocks.ts`
  - Frontend: calendar UI que consome `/calendar` e `/calendar/blocks`

## 2) Protocolo (obrigatório)

### Passo A — Antes de codar

- Leia os comentários de contrato no topo do arquivo (ex.: **“🔒 CADEADO DE CONTRATO”**).
- Defina claramente **qual contrato** você está alterando (input/output) e **quem consome**.

### Passo B — Durante a mudança

- Se mudar contrato/shape de retorno:
  - **Crie versão v2** (rota nova) mantendo v1.
  - Atualize o frontend de forma gradual.
  - Só depois descontinue v1.

### Passo C — Depois de codar (gate automático)

Rode os guards (eles precisam passar 100%):

- `npm run predev`
  - Inclui: `guardian` + `check-critical-modules`

Se o guard falhar:

- **proibido deploy**.
- ajuste o código, ou (se a mudança for intencional) atualize:
  - o guard
  - e a documentação.

## 3) Invariantes que NÃO podem quebrar

### Anúncios Ultimate

- `PATCH /anuncios-ultimate/:id` **não pode** sobrescrever `data` inteiro com objeto parcial.
  - Deve fazer merge server-side.
- `POST /anuncios-ultimate/save-field` deve manter idempotência/audit.
  - Se a RPC do banco evoluir, o sistema precisa continuar rastreável.

### Reservas

- `organization_id`/tenancy: nunca retornar reservas de outro tenant.
- Rotas base devem continuar existindo (compat). 

### Calendário

- `/calendar` e `/calendar/blocks` continuam funcionando com tenancy.
- Blocks não podem escapar do tenant.

## 4) Micro-cápsulas (o que é e como evoluir)

Hoje usamos um guard estático (offline) para garantir que:
- rotas/exportações-chave ainda existem
- sentinelas/invariantes críticas ainda estão no código

Arquivo:
- `scripts/check-critical-modules.mjs`

Evolução recomendada:
- Adicionar um smoke E2E (com `.env.local`) que valida persistência real no Supabase:
  - salva um campo em anúncio
  - valida que `anuncios_ultimate.data` mudou
  - valida que existe audit em `anuncios_field_changes`

## 5) Regra de ouro

Se consertar um bug e quebrar outro módulo, a mudança está incompleta.

O protocolo existe para impedir exatamente isso.
