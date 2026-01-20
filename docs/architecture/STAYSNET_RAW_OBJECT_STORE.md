# StaysNet — Raw Object Store (Fonte de Verdade)

## Objetivo

Garantir que **todo JSON retornado pela Stays** (reservas, hóspedes/clients, listings, financeiro) seja persistido no banco para:

- Auditoria (comparar Stays vs Rendizy campo-a-campo)
- Reprocessamento/backfill sem depender de reimport manual
- Investigação de bugs de normalização (ex: faltas no payload de lista)

> Regra: tabelas “flat” (`reservations`, `guests`, `properties`) continuam existindo por performance.
> O **RAW completo** fica em uma tabela genérica e versionada.

---

## Tabela `staysnet_raw_objects`

Migration: `supabase/migrations/20251227_create_staysnet_raw_objects.sql`

Campos principais:

- `organization_id` (multi-tenant)
- `domain` (ex: `reservations`, `clients`, `listings`, `finance`)
- `external_id` (ID estável do objeto no domínio; ou “chave sintética” para endpoints de lista)
- `external_code` (opcional: código curto / email / referência auxiliar)
- `endpoint` (ex: `/booking/clients/{clientId}`)
- `payload` (`jsonb`) — JSON completo
- `payload_hash` (SHA-256 do JSON) — versionamento/deduplicação
- `fetched_at` — timestamp do fetch

Índices:

- Único/dedupe: `(organization_id, domain, external_id, payload_hash)`
- Busca rápida: `(organization_id, domain, external_id)`

RLS:

- RLS habilitado com policy para service role (Edge Functions).

---

## Deduplicação (importante)

Postgres **não deduplica NULL** em índices UNIQUE.

Por isso:

- Endpoints de detalhe devem usar `external_id` real (ex: `clientId`, `reservationId`).
- Endpoints de lista/summary devem usar `external_id` **sintético e estável**.

A regra está implementada no helper:

- `supabase/functions/rendizy-server/utils-staysnet-raw-store.ts`

Se o código não fornecer `externalId`, o helper deriva um valor estável baseado em `endpoint`.

---

## Onde gravamos RAW hoje

- Reservations: `supabase/functions/rendizy-server/import-staysnet-reservations.ts`
  - Grava payload completo por reserva (domain `reservations`)

- Clients (hóspedes): `supabase/functions/rendizy-server/import-staysnet-guests.ts`
  - Quando existe `_idclient`, faz fetch em `/booking/clients/{clientId}`
  - Grava domain `clients` + atualiza `guests.staysnet_raw` com o JSON completo do client (quando disponível)

- Listings: `supabase/functions/rendizy-server/import-staysnet-properties.ts`
  - Além de `properties.data.staysnet_raw`, grava domain `listings`

- Finance: `supabase/functions/rendizy-server/import-staysnet-finance.ts`
  - Grava `/finance/payment-providers` e `/finance/owners` como RAW (domain `finance`)
  - Endpoint exposto em: `POST /rendizy-server/make-server-67caf26a/staysnet/import/finance`

---

## Operação / Checklist

1) Aplicar migration no Supabase antes de exigir RAW em produção:
   - `20251227_create_staysnet_raw_objects.sql`

2) Validar cobertura via auditoria (amostragem):
   - `scripts/audit-staysnet-raw-coverage.ps1`

3) Se necessário, rodar backfill/reenriquecimento (reservations/clients).

---

## Notas de implementação

- Persistência de RAW **não pode quebrar import**.
  - Se a tabela ainda não existe em um ambiente, logar warning e seguir.

- O RAW armazenado é “fonte de verdade”; as tabelas de domínio são “visão derivada”.
