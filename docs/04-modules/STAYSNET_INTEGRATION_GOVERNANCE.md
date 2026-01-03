# Stays.net — Governança e Antirregressão

Este documento existe para **blindar** a integração Stays.net (modal + robôs + calendário) contra regressões.

## Escopo

- **Modal de Integração (UI)**: importa properties/reservations/guests/blocks sob demanda.
- **Robô de Webhooks**: processa eventos em tempo real e cria/atualiza/remover `blocks` sem virar `reservations`.
- **Calendário**: renderiza `reservations` e `blocks` com clipping/ancoragem e tolerância a formatos (ISO vs YYYY-MM-DD).

## Invariantes (NÃO QUEBRAR)

1) **Bloqueio nunca vira reserva**
- Tudo que é `blocked/maintenance` (ou equivalentes) deve persistir em `blocks`.
- Se existir histórico de misclassificação em `reservations`, o pipeline deve corrigir/migrar.

2) **Tenant correto é obrigatório quando há sessão**
- Se houver token (`X-Auth-Token`/cookie), o backend **não pode** cair no `DEFAULT_ORG_ID`.
- Falhar silenciosamente causa o pior bug: “importou, mas não aparece”.

3) **Modal envia IDs da Stays; DB usa UUID interno**
- A seleção no modal usa `property.id`/`_id` da Stays.
- O backend precisa **resolver** para `anuncios_ultimate.id` (UUID interno) antes de salvar em `blocks`/`reservations`.

4) **Em falha temporária, UI não pode zerar dados**
- Nunca retornar `[]` como “fallback” de erro para reservas/bloqueios.
- Em erro de rede/token, **lançar erro** para React Query manter o último cache bom.

5) **Reserva sem imóvel: SKIP + issue (nunca silencioso)**
- `reservations.property_id` precisa existir em `anuncios_ultimate`.
- Se não resolver mapping do listing da Stays: **SKIP** da reserva (não criar placeholder).
- Porém, deve persistir `staysnet_import_issues` (`missing_property_mapping`) para auditoria + reprocess.
- Documento canônico: `docs/04-modules/STAYSNET_IMPORT_ISSUES.md`.

## Cápsulas (isolamento obrigatório)

Para evitar acoplamento acidental, as rotas foram encapsuladas em dois módulos (“capsules”):

- `supabase/functions/rendizy-server/routes-staysnet-webhooks.ts`
  - Só exporta handlers de webhooks/cron/diagnostics.

- `supabase/functions/rendizy-server/routes-staysnet-import-modal.ts`
  - Só exporta handlers usados pelo modal (preview/full/debug).

Regra: **não** importar direto de `routes-staysnet.ts` em outros entrypoints.
Use sempre a cápsula correspondente.

## Contratos (frontend → backend)

### Modal → Import Blocks
- Endpoint: `POST /rendizy-server/make-server-67caf26a/staysnet/import/blocks`
- Payload (essencial):
  - `selectedPropertyIds`: IDs da Stays (não UUID interno)
  - `from`, `to`, `dateType`

Backend deve:
- Validar tenant (org) quando há token.
- Filtrar seleção por IDs Stays antes de resolver.
- Resolver para UUID interno (`anuncios_ultimate.id`).
- Persistir em `blocks` com `property_id`, `start_date`, `end_date`.

## Onde mexer (e onde NÃO mexer)

- UI modal: `components/StaysNetIntegration/**`
- Serviço: `components/StaysNetIntegration/services/staysnet.service.ts`
- Import blocks: `supabase/functions/rendizy-server/import-staysnet-blocks.ts`
- Render calendário: `components/CalendarGrid.tsx`
- Fetch calendário: `hooks/useCalendarData.ts` e `components/calendar/CalendarPage.tsx`

Evitar:
- Alterar rotas/paths sem atualizar o service + este documento.
- “Refatorar” fallback de erro para `[]` nos hooks.

## Checklist de validação (antes de push)

1) Rodar smoke test blocks:
- `pwsh .\TEST-STAYSNET-MODULAR.ps1 -IncludeBlocks -MaxPages 3 -MaxBatches 5`

2) Confirmar:
- `Saved > 0` em blocks (ou justificar por período/seleção).
- Calendário continua exibindo reservas mesmo que token expire (sem “sumir tudo”).

3) UI rápida:
- Abrir calendário e confirmar que há cards de `Reserva` e `Bloqueio (Stays.net)`.
