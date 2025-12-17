# 🧪 TESTE: Modalidade "Compra e Venda"

## 📋 Comportamento Esperado

Quando o usuário seleciona **APENAS** a modalidade "Compra e Venda" (`buy_sell`), os seguintes steps devem aparecer:

### ✅ BLOCO 1: CONTEÚDO (7 steps - TODOS aparecem)

1. ✅ Tipo e Identificação (`content-type`)
2. ✅ Localização (`content-location`)
3. ✅ Cômodos e Distribuição (`content-rooms`)
4. ✅ Amenidades do Local (`content-location-amenities`)
5. ✅ Amenidades da Acomodação (`content-property-amenities`)
6. ✅ Fotos e Mídia (`content-photos`)
7. ✅ Descrição (`content-description`)

### ✅ BLOCO 2: FINANCEIRO (2 de 5 steps aparecem)

1. ✅ Contrato e Taxas (`financial-contract`) - **APARECE** (todas modalidades)
2. ✅ Precificação Residencial (`financial-residential-pricing`) - **APARECE** (residential_rental, buy_sell)
3. ❌ Taxas (`financial-fees`) - **NÃO APARECE** (apenas short_term_rental)
4. ❌ Precificação Sazonal (`financial-pricing`) - **NÃO APARECE** (apenas short_term_rental)
5. ❌ Precificação Derivada (`financial-derived-pricing`) - **NÃO APARECE** (apenas short_term_rental)

### ✅ BLOCO 3: CONFIGURAÇÕES (3 de 5 steps aparecem)

1. ✅ Regras (`settings-rules`) - **APARECE** (todas modalidades)
2. ❌ Reservas (`settings-booking`) - **NÃO APARECE** (apenas short_term_rental)
3. ✅ Tags (`settings-tags`) - **APARECE** (todas modalidades)
4. ❌ Calendário iCal (`settings-ical`) - **NÃO APARECE** (apenas short_term_rental)
5. ❌ OTAs (`settings-otas`) - **NÃO APARECE** (apenas short_term_rental)

## 📊 Resumo

- **Total de steps:** 14
- **Steps que aparecem para "Compra e Venda":** 12
- **Steps que NÃO aparecem:** 2 (financial-fees, financial-pricing, financial-derived-pricing, settings-booking, settings-ical, settings-otas)

## 🔍 Como Testar

1. Acesse `/properties/new`
2. No Step 1 (Tipo e Identificação), marque **APENAS** o checkbox "Compra e venda"
3. Verifique na sidebar se apenas os 12 steps relevantes aparecem
4. Verifique se os steps irrelevantes estão ocultos ou desabilitados
5. Navegue pelos steps e confirme que não consegue acessar os steps irrelevantes

## ✅ Critérios de Sucesso

- [ ] Checkbox "Compra e venda" pode ser marcado
- [ ] Sidebar mostra apenas 12 steps (não 14)
- [ ] Steps de temporada (financial-fees, financial-pricing, financial-derived-pricing, settings-booking, settings-ical, settings-otas) estão ocultos
- [ ] Navegação automática pula os steps irrelevantes
- [ ] Contador de progresso considera apenas steps relevantes
