# 🧪 TESTE Step 04 Financeiro - Guia Passo a Passo

## 🎯 OBJETIVO

Diagnosticar e corrigir a "tela em branco" no Step 04 da aba Financeira.

---

## 📋 PASSO 1: TESTE BÁSICO (5 minutos)

### 1.1 Limpar Cache do Navegador

```bash
1. Pressione Ctrl+Shift+Delete (Windows) ou Cmd+Shift+Delete (Mac)
2. Marque "Cached images and files"
3. Desmarque cookies/histórico
4. Clique em "Clear data"
```

### 1.2 Recarregar Página com Cache Limpo

```bash
1. Pressione Ctrl+F5 (Windows) ou Cmd+Shift+R (Mac)
2. Aguarde o carregamento completo
```

### 1.3 Testar Navegação

```bash
1. Acesse: https://suacasaavenda.com.br/properties/PRP-AI7U07/edit
2. Abra F12 (DevTools)
3. Vá na aba Console
4. Clique em "Financeira" (segunda aba do wizard)
5. Clique em "Step 04: Precificação Individual de Temporada"
6. OBSERVE O CONSOLE
```

### ✅ RESULTADO ESPERADO

Você deve ver:
- ✅ Card com botões "Global" / "Individual"
- ✅ Card "Configurações Globais Aplicadas" 
- ✅ 4 itens listados (preço base, períodos, descontos, datas)
- ✅ Alert azul com link para configurações

### ❌ SE NÃO FUNCIONAR

Vá para o **PASSO 2**.

---

## 📋 PASSO 2: TESTE COM COMPONENTE DIAGNÓSTICO (10 minutos)

### 2.1 Substituir Componente Temporariamente

Abra o arquivo `/components/PropertyEditWizard.tsx` e localize a linha ~56:

**ANTES:**
```typescript
import { FinancialIndividualPricingStep } from './wizard-steps/FinancialIndividualPricingStep';
```

**DEPOIS:**
```typescript
import { FinancialIndividualPricingStep } from './wizard-steps/FinancialIndividualPricingStep.test';
```

### 2.2 Salvar e Recarregar

```bash
1. Salve o arquivo (Ctrl+S)
2. Aguarde o rebuild automático
3. Recarregue a página (F5)
4. Navegue novamente para Step 04
```

### ✅ SE O TESTE FUNCIONAR

O problema está no **componente original**. Vá para **PASSO 3**.

### ❌ SE O TESTE NÃO FUNCIONAR

O problema está na **configuração do PropertyEditWizard**. Vá para **PASSO 4**.

---

## 📋 PASSO 3: CORRIGIR COMPONENTE ORIGINAL (15 minutos)

### 3.1 Verificar Imports

Abra `/components/wizard-steps/FinancialIndividualPricingStep.tsx` e verifique se TODOS os imports estão corretos:

```typescript
import { useState } from 'react';
import {
  DollarSign,
  Calendar,
  Percent,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Info,
  AlertCircle,
  Sun,
  Snowflake,
  Palmtree,
  Sparkles, // ← ESTE É CRÍTICO!
} from 'lucide-react';
```

### 3.2 Verificar Linha 335

Certifique-se de que a linha 335 está assim:

```typescript
<Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
  <Sparkles className="h-4 w-4 text-blue-600" />
  <AlertDescription className="text-xs">
    <strong>Gerenciar configurações globais:</strong> Acesse Configurações → Precificação
    para definir os preços padrão que serão aplicados a todos os anúncios configurados
    como "Global".
  </AlertDescription>
</Alert>
```

### 3.3 Verificar Sintaxe JSX

Procure por:
- ❌ Tags não fechadas: `<div>` sem `</div>`
- ❌ Colchetes desbalanceados: `{` sem `}`
- ❌ Aspas não fechadas: `"texto sem fechar

### 3.4 Verificar Console

No DevTools, procure por erros como:
- "Unexpected token"
- "Syntax error"
- "Failed to compile"

---

## 📋 PASSO 4: CORRIGIR PROPERTYEDITWIZARD (20 minutos)

### 4.1 Verificar Inicialização do Data

Abra `/components/PropertyEditWizard.tsx` e localize a linha ~798:

```typescript
if (step.id === 'financial-pricing') {
  return (
    <FinancialIndividualPricingStep
      data={formData.financialIndividualPricing || {
        pricingMode: 'global', // ← DEVE EXISTIR
        basePricePerNight: 0,
        currency: 'BRL',
        enableStayDiscounts: false,
        weeklyDiscount: 0,
        monthlyDiscount: 0,
        enableSeasonalPricing: false,
        seasonalPeriods: [],
        enableWeekdayPricing: false,
        weekdayPricing: {
          monday: 0,
          tuesday: 0,
          wednesday: 0,
          thursday: 0,
          friday: 0,
          saturday: 0,
          sunday: 0,
        },
        enableSpecialDates: false,
        specialDates: [],
      }}
      onChange={(data) => {
        setFormData({
          ...formData,
          financialIndividualPricing: data,
        });
      }}
    />
  );
}
```

### 4.2 Adicionar Console.log para Debug

Adicione ANTES do return:

```typescript
if (step.id === 'financial-pricing') {
  console.log('🔍 [DEBUG] Renderizando financial-pricing');
  console.log('🔍 [DEBUG] formData:', formData);
  console.log('🔍 [DEBUG] financialIndividualPricing:', formData.financialIndividualPricing);
  
  return (
    // ...
  );
}
```

### 4.3 Verificar Output no Console

Quando clicar no Step 04, você deve ver:
```
🔍 [DEBUG] Renderizando financial-pricing
🔍 [DEBUG] formData: Object { ... }
🔍 [DEBUG] financialIndividualPricing: Object { pricingMode: 'global', ... }
```

### ❌ SE VER `undefined`

O problema está na inicialização do `formData`. Vá para **PASSO 5**.

---

## 📋 PASSO 5: INICIALIZAÇÃO DO FORMDATA (15 minutos)

### 5.1 Verificar useState Inicial

Localize a linha onde `formData` é inicializado (provavelmente ~400):

```typescript
const [formData, setFormData] = useState({
  // ... outros steps ...
  
  // ❌ SE FALTAR ESTA LINHA:
  financialIndividualPricing: {
    pricingMode: 'global',
    basePricePerNight: 0,
    currency: 'BRL',
    enableStayDiscounts: false,
    weeklyDiscount: 0,
    monthlyDiscount: 0,
    enableSeasonalPricing: false,
    seasonalPeriods: [],
    enableWeekdayPricing: false,
    weekdayPricing: {
      monday: 0, tuesday: 0, wednesday: 0, thursday: 0,
      friday: 0, saturday: 0, sunday: 0,
    },
    enableSpecialDates: false,
    specialDates: [],
  },
});
```

### 5.2 Verificar useEffect de Carregamento

Se houver um `useEffect` que carrega dados da propriedade, verifique:

```typescript
useEffect(() => {
  if (property) {
    setFormData({
      ...property,
      // ADICIONAR SE FALTAR:
      financialIndividualPricing: property.financialIndividualPricing || {
        pricingMode: 'global',
        basePricePerNight: 0,
        // ... defaults ...
      },
    });
  }
}, [property]);
```

---

## 📋 PASSO 6: VERIFICAÇÃO FINAL (5 minutos)

### 6.1 Restaurar Import Original

Se você trocou para `.test.tsx`, volte para:

```typescript
import { FinancialIndividualPricingStep } from './wizard-steps/FinancialIndividualPricingStep';
```

### 6.2 Teste Completo

1. Limpe o cache novamente (Ctrl+Shift+Delete)
2. Recarregue (Ctrl+F5)
3. Navegue para Step 04
4. Clique em "Global" e "Individual" alternadamente
5. Verifique se o conteúdo muda corretamente

### ✅ SUCESSO!

Se você vê conteúdo em ambos os modos, o problema está resolvido!

---

## 📊 RELATÓRIO DE ERRO

Se NENHUM dos passos acima funcionou, envie as seguintes informações:

### Console (F12 → Console):
```
[Cole TODOS os erros, warnings e mensagens de debug]
```

### Network (F12 → Network):
```
Status Code de FinancialIndividualPricingStep.tsx: [ ]
Data/hora do arquivo: [ ]
Tamanho do arquivo: [ ]
```

### Elements (F12 → Elements):
```
[Use o seletor e clique na área vazia, cole o HTML]
```

### Screenshot:
```
[Print da tela mostrando o problema]
```

### Informações do Sistema:
```
Navegador: [ ] Chrome [ ] Firefox [ ] Safari [ ] Edge
Versão: [ ]
Sistema: [ ] Windows [ ] Mac [ ] Linux
```

---

## 🆘 SOLUÇÃO EMERGENCIAL

Se TUDO falhar, use esta solução temporária:

### Opção 1: Desabilitar o Step 04 temporariamente

No `PropertyEditWizard.tsx`, comente o step:

```typescript
// {
//   id: 'financial-pricing',
//   title: 'Precificação Individual de Temporada',
//   description: 'Defina preços de diárias, períodos sazonais e descontos',
//   icon: DollarSign,
//   validation: 'required',
// },
```

### Opção 2: Usar versão simplificada

Substitua o conteúdo de `/components/wizard-steps/FinancialIndividualPricingStep.tsx` pelo arquivo `.test.tsx` temporariamente.

---

**Data:** 03/11/2025 20:50 UTC-3
**Versão:** v1.0.103.266
**Autor:** Sistema de Diagnóstico Automatizado
**Status:** Aguardando execução dos testes
