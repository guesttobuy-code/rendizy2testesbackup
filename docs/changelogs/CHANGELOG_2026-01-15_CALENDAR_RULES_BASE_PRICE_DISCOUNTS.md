# Changelog — 2026-01-15

## Calendário (regras e preços)

- Ajustado batch de regras do calendário para merge parcial por coluna (não apaga dados de outras linhas).
- Persistência de base_price por dia e exibição na linha Base (R$).
- Linhas de descontos por pacote agora usam base_price diário e fallback em basePrice do anúncio.
- Default global de descontos aplicado quando não existe override por anúncio.

## Estabilidade e carregamento

- Timeout de 12s na busca de imóveis (evita loading infinito).
- Cache local de imóveis para impedir lista vazia em falha temporária.
- MinNightsEditModal salva mesmo sem objeto property (fallback por propertyId).

## Backend / Edge Functions

- calendar-rules-batch: GET habilitado para leitura e base_price persistido.
- calendar-rules-batch: upsert com update parcial + insert fallback.

## Site público (rendizy-public)

- weeklyRate/monthlyRate agora usam discount_packages (global/override) quando o anúncio não define valores explícitos.

## Tags de estabilidade

- RENDIZY_STABLE_TAG v1.0.103.600 em pontos críticos do calendário.
