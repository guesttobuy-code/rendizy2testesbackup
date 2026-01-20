# 🧪 TESTE: Criar Anúncio de Compra e Venda

## Passos para Testar

1. Acesse: `http://localhost:5173/properties/new`

2. **PASSO 1: Tipo e Identificação**

   - Selecione "Tipo do local": Casa
   - Selecione "Tipo de acomodação": Casa
   - ✅ Marque APENAS "Compra e venda"
   - ❌ Desmarque "Aluguel por temporada" (se estiver marcado)
   - ❌ Desmarque "Locação residencial" (se estiver marcado)
   - Preencha "Preço de Venda" (ex: 500000)

3. **Verificar:**

   - ✅ Passos irrelevantes devem desaparecer da sidebar
   - ✅ Apenas 12 passos devem aparecer (não 17)

4. **PASSO 2: Localização**

   - Preencha cidade: "Rio de Janeiro"
   - Preencha estado: "RJ"
   - Preencha outros campos opcionais

5. **PASSO 3: Descrição**

   - Preencha descrição

6. **PASSO FINANCEIRO: Preços Locação e Venda**

   - Preencha "Preço de Venda": 500000

7. **Salvar:**
   - Clique em "Salvar e Avançar" em cada passo
   - No último passo, clique em "Finalizar"
   - ✅ Deve redirecionar para `/properties`
   - ✅ Imóvel deve aparecer na lista

## Problemas Conhecidos e Correções

### ✅ CORRIGIDO: basePrice obrigatório

- Backend agora aceita `salePrice` como `basePrice` para compra e venda
- Frontend normaliza `salePrice` para `basePrice` automaticamente

### ✅ CORRIGIDO: Validação de basePrice

- Backend não exige `basePrice > 0` se tiver `salePrice` ou `monthlyRent`
- Frontend sempre envia `basePrice` (usa `salePrice` se disponível)

### ✅ CORRIGIDO: Filtragem de passos

- Passos irrelevantes são ocultados automaticamente
- Navegação pula passos irrelevantes

## Logs para Debug

Verifique o console do navegador para:

- `💾 [PropertyWizardPage] handleSave chamado`
- `✅ [PropertyWizardPage] Dados normalizados:`
- `📡 [PropertyWizardPage] Resposta da API:`
- `✅ [PropertyWizardPage] Sucesso!`

Se houver erro:

- `❌ [PropertyWizardPage] Erro na resposta:`
- Verifique se `basePrice` está sendo enviado
- Verifique se `modalities` contém `buy_sell`
- Verifique se `financialInfo.salePrice` está sendo enviado
