# Stays.net — Import Issues (Reservas sem imóvel)

Este documento define o **comportamento canônico** quando o import Stays.net encontra dados que **não podem ser persistidos** por falta de vínculo com imóvel (`properties`).

## Problema que isso resolve

Em produção, pode existir reserva na Stays.net cujo `listing/property id` ainda **não está mapeado** em `properties`.

Sem governança, isso vira o pior bug:
- a importação “passa”
- a reserva **some** (SKIP silencioso)
- a conciliação (Stays × Rendizy) fica errada

A solução é: **não criar placeholder de imóvel** e **não perder a informação**.

## Regra canônica

- `reservations.property_id` **sempre** deve apontar para um registro existente em `public.properties` **da mesma organization**.
- Se não for possível resolver o imóvel:
  - a reserva **não pode** ser criada (SKIP)
  - deve ser registrado um **Import Issue durável** em `public.staysnet_import_issues`
  - o UI deve exibir o alerta e permitir **reprocessamento** após importar/vincular imóveis

Essa regra complementa (e não contradiz) o princípio “reservas sem imóvel não existem”.

## Persistência (tabela)

Tabela: `public.staysnet_import_issues`

Campos relevantes:
- `organization_id` (tenant)
- `platform` (fixo: `staysnet`)
- `entity_type` (ex: `reservation`)
- `issue_type` (ex: `missing_property_mapping`)
- `status` (`open` | `resolved`)
- `external_id` (id externo da reserva quando disponível)
- `reservation_code` (fallback de rastreio)
- `listing_id` (id do imóvel/listing na Stays)
- `listing_candidates` (lista de candidatos extraídos do payload)
- `check_in` / `check_out`
- `raw_payload` (payload bruto mínimo necessário para auditoria/replay)

Índice/garantia de idempotência:
- quando `external_id` existe, a combinação `(organization_id, platform, entity_type, issue_type, external_id)` deve ser **única** (upsert)

Migration: `supabase/migrations/20251230_create_staysnet_import_issues.sql`

## Backend (Edge Function)

### Endpoint

- `GET /rendizy-server/make-server-67caf26a/staysnet/import/issues`
  - Query: `status=open|resolved|all`, `limit`, `offset`

Arquivo: `supabase/functions/rendizy-server/import-staysnet-issues.ts`

### Criação de issue (reservations)

Durante `import-staysnet-reservations.ts`:

1) Resolver `listing/property id` da Stays → `properties.id` via JSONB `data`.
2) Se não resolver:
- registrar issue `missing_property_mapping` (best-effort; não quebrar o import)
- **SKIP** da reserva (por regra canônica)

### Resolução de issue

Quando a reserva é importada com sucesso (já existe mapping):
- marcar issue correspondente como `resolved` (por `external_id` e/ou `reservation_code`)

## Frontend (Modal)

- O UI lista issues abertas e exibe alerta explícito.
- O reprocessamento é **targeted reimport**:
  - chamar import de reservas com `selectedPropertyIds = [listing_id, ...]`
  - após a importação, reconsultar issues para validar que foram resolvidas

Arquivo: `components/StaysNetIntegration/services/staysnet.service.ts`

Compatibilidade:
- se o endpoint ainda não existe no backend (HTTP 404), o UI deve tratar como “redeploy pendente” (não quebrar a tela).

## Como o mapping é encontrado (regra de resolução)

A resolução do `properties.id` para um `staysId` consulta `properties.data` com `.contains(...)` em ordem:
- `data.externalIds.staysnet_property_id`
- `data.externalIds.staysnet_listing_id`
- `data.staysnet_raw._id`
- `data.staysnet_raw.id`
- `data.codigo` (fallback legado)

Isso existe para suportar diferentes históricos de import/migração.

## Operação (runbook rápido)

1) Importar imóveis/properties primeiro.
2) Importar reservas.
3) Se houver divergência Stays × Rendizy:
- abrir issues (UI ou endpoint)
- reprocessar pelas `listing_id` que aparecem nas issues

Script de teste E2E (local): `scripts/run-reprocess-staysnet-orphan-issue.ps1`
