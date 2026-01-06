# Changelog (Copilot) — 2025-12-28

Commit: `a0234f52370a27e7657bee549e73a5e9be0d99a8` (branch `final-clean`)

## Objetivo
- Garantir sincronização realtime via webhook Stays.net (reservas + bloqueios) sem “reservas órfãs”.
- Tratar cancelamentos de forma robusta (`deleted == canceled == cancelled`).
- Exportar Excel `.xls` no frontend respeitando filtros e além da paginação.
- Blindar regras canônicas no DB (identidade e vínculo obrigatório com imóvel).

## Backend — Webhooks Stays.net
- Processamento realtime após receber webhook (sem bloquear resposta), usando `executionCtx.waitUntil` quando disponível.
- Receiver alternativo (`staysnet-webhook-receiver`) passa a processar best-effort alguns itens pendentes imediatamente.
- Extração mais robusta de `listingId/propertyId` do payload (várias formas + fallback), para resolver `property_id` corretamente.
- Regra canônica aplicada no pipeline: reservas sem `property_id` não são persistidas (evita cards “propriedade não encontrada”).
- Cancelamento unificado:
  - `reservation.deleted`, `reservation.canceled`, `reservation.cancelled` aplicam a mesma regra.
  - Para bloqueios (`type=blocked`), o registro é removido.
  - Para reservas, o registro é marcado como `status=cancelled` e `cancelled_at`.
  - Fallback: se o cancelamento chegar antes de existir no banco, tenta buscar detalhes na API e criar/atualizar já como cancelada (quando houver `property_id`).
- Correção de consistência de `platform` no upsert:
  - `platform` passa a ser derivado do payload e/ou preservado do registro existente (evita conflitos de PK/unique em upserts).

## Backend — Import / Regras de integridade
- Import de reservas Stays:
  - Regra forte: **não criar imóvel/anúncio placeholder** ao importar reservas; se imóvel não existir, a reserva é pulada e reportada.
- Dedupe/identidade:
  - Upserts continuam idempotentes com `onConflict: organization_id,platform,external_id`.

## Banco (Supabase migrations)
- Blindagem de identidade canônica de reservas:
  - Ajustes em índice único para `(organization_id, platform, external_id)` sem depender de `WHERE external_id IS NOT NULL`.
- Blindagem de vínculo obrigatório com imóvel:
  - Limpa reservas órfãs (sem `property_id` / property inexistente / org mismatch).
  - Trigger bloqueia novas reservas órfãs e aplica `ALTER TABLE reservations ALTER COLUMN property_id SET NOT NULL`.
- Bloqueio de placeholders Stays em anúncios:
  - Trigger impede criar/atualizar `properties` com título/nome interno padrão “Propriedade Stays.net …”.

## Frontend — Exportação Excel (.xls)
- Botão “Exportar Excel (.xls)” exporta **todas** as reservas do filtro atual (busca todas as páginas), não só a página visível.

## Scripts / Auditoria
- Script `scripts/analyze-valores-nao-batem.mjs` criado para análise e geração de planilha `_analysis.xlsx` (auditoria linha-a-linha).

## Arquivos alterados
- Modificados:
  - `components/ReservationsManagement.tsx`
  - `components/StaysNetIntegration/components/ImportTab.tsx`
  - `components/StaysNetIntegration/components/PropertySelector.tsx`
  - `components/StaysNetIntegration/hooks/useStaysNetImport.ts`
  - `components/StaysNetIntegration/index.tsx`
  - `components/StaysNetIntegration/services/staysnet.service.ts`
  - `components/StaysNetIntegration/types.ts`
  - `supabase/functions/rendizy-server/import-staysnet-reservations.ts`
  - `supabase/functions/rendizy-server/routes-staysnet-import.ts`
  - `supabase/functions/rendizy-server/routes-staysnet.ts`
  - `supabase/functions/staysnet-webhook-receiver/index.ts`
  - `supabase/migrations/20251228_reservations_canonical_identity.sql`
- Adicionados:
  - `docs/03-conventions/RULE_RESERVAS_SEM_IMOVEL_NAO_EXISTEM.md`
  - `scripts/analyze-valores-nao-batem.mjs`
  - `supabase/migrations/20251228_block_staysnet_placeholders.sql`
  - `supabase/migrations/20251228_reservations_must_have_property.sql`

## Nota operacional
- Foi feito deploy do edge function `rendizy-server` com:
  - cancelamento unificado,
  - extração robusta de listing/property,
  - processamento realtime,
  - correção de `platform` no upsert.
