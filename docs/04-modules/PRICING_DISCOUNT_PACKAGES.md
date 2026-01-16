# Módulo: Descontos por pacote de dias

Este documento define o **modelo canônico** de descontos por pacote de dias (ex.: 7+ noites, 28+ noites, regras customizadas), incluindo **precedência**, **persistência** e **pontos de integração**.

## Modelo canônico (dados)

### 1) Configuração global por organização

- Local: `organizations.metadata.discount_packages`
- Tipo: objeto com `rules[]`

Exemplo:

```json
{
  "discount_packages": {
    "rules": [
      { "id": "weekly", "preset": "weekly", "min_nights": 7, "discount_percent": 5 },
      { "id": "monthly", "preset": "monthly", "min_nights": 28, "discount_percent": 15 },
      { "id": "custom_15", "preset": "custom", "min_nights": 15, "discount_percent": 10 }
    ]
  }
}
```

### 2) Override por anúncio

- Local: `properties.data.discount_packages_override`
- Tipo: objeto com `rules[]` (mesmo formato do global)

## Precedência

Regra de precedência (sempre):

1. Se existir override no anúncio (`properties.data.discount_packages_override`), usar ele.
2. Senão, usar o global da organização (`organizations.metadata.discount_packages`).

Nota (2026-01-15): override vazio/nulo não deve bloquear o default global. Se `rules` vier vazio, o sistema aplica o global.

## UI (frontend)

### Editor canônico

O editor de regras é o componente:

- [Rendizyoficial-main/components/pricing/DiscountPackagesEditor.tsx](../../components/pricing/DiscountPackagesEditor.tsx)

Formato esperado:

- `DiscountPackagesSettings = { rules: Array<{ id, preset, min_nights, discount_percent }> }`

### Wizard (precificação individual)

O step de precificação individual foi atualizado para exibir **Descontos por pacote de dias** e editar `discountPackages`:

- [Rendizyoficial-main/components/wizard-steps/FinancialIndividualPricingStep.tsx](../../components/wizard-steps/FinancialIndividualPricingStep.tsx)

Observação: esse step pertence ao wizard de propriedades e mantém compatibilidade com dados legados (semanal/mensal) apenas para migração de UI.

## Backend (cálculo)

O cálculo deve aplicar a precedência override > global e normalizar regras.

Referência: implementação em `routes-reservations` (compatibilidade com semanal/mensal/biweekly via regras).

## Impacto no site do cliente (rendizy-public)

Estado atual:
- O endpoint público calcula weeklyRate/monthlyRate aplicando discount_packages (global ou override) quando o anúncio não define valores explícitos.
- Se o anúncio definir preco_semanal/preco_mensal, esses valores têm precedência.

Próximo passo (evolução futura):
- Considerar base_price por dia (calendar_pricing_rules) para compor weekly/monthly em períodos específicos.
