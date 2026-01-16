# Implementação — Calendário (regras em lote, base_price e descontos por pacote)

Data: 2026-01-15

## Objetivo

- Garantir persistência independente por linha (condição, mínimo de noites, restrições, base).
- Salvar base_price por dia e exibir no calendário.
- Exibir descontos por pacote com default global e override por anúncio.
- Mitigar travamento de carregamento e sumiço de imóveis.

## O que foi implementado

1) Edge Function calendar-rules-batch
- Estratégia de upsert agora é merge parcial por coluna.
- Evita apagar colunas não editadas (ex.: editar min_nights não zera condition_percent).
- Suporte a GET para leitura via token.
- Campo base_price incluído.

2) UI do calendário
- Linha Base (R$) usa base_price por dia quando existir, com fallback no basePrice do anúncio.
- Linhas de pacote (Semanal/Mensal/Personalizado) usam base_price diário.
- Default global de pacotes é aplicado quando não há override no anúncio.

3) MinNightsEditModal
- Salva mesmo quando objeto property não está carregado (usa propertyId).

4) Carregamento e estabilidade
- Timeout de 12s na busca de imóveis.
- Cache local de imóveis para evitar lista vazia em falha temporária.

## Tags de estabilidade no código

Marcadores adicionados para preservar comportamento:
- RENDIZY_STABLE_TAG v1.0.103.600 (2026-01-15)

Arquivos com tag:
- components/CalendarGrid.tsx
- components/MinNightsEditModal.tsx
- hooks/useCalendarData.ts
- supabase/functions/calendar-rules-batch/index.ts

## Impacto em “Componentes e dados (catalogs)” e sites do cliente

Estado atual:
- Os descontos por pacote global/override foram aplicados ao calendário admin.
- O endpoint público (rendizy-public) calcula weeklyRate/monthlyRate usando discount_packages (global/override) quando o anúncio não define valores explícitos.
- Catálogo público documenta o cálculo atualizado.

Impacto no site do cliente:
- A exibição de “Semanal/Mensal” do site depende de weeklyRate/monthlyRate do endpoint público.
- Como esses valores ainda não são derivados dos pacotes de desconto globais, o site não reflete automaticamente o default global.

Recomendação futura (não aplicada aqui):
- Considerar base_price por dia (calendar_pricing_rules) para compor weekly/monthly por período.

## Arquivos principais alterados

- supabase/functions/calendar-rules-batch/index.ts
- components/CalendarGrid.tsx
- hooks/useCalendarData.ts
- components/MinNightsEditModal.tsx
- App.tsx
- components/calendar/CalendarModule.tsx
- components/calendar/CalendarPage.tsx
- supabase/migrations/20260115_add_base_price_to_calendar_pricing_rules.sql

## Validação feita

- Persistência independente: condição (%) não apaga min_nights e vice-versa.
- base_price salva e aparece no calendário.
- descontos por pacote mostram valores calculados por dia.
