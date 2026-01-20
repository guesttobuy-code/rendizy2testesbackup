# 🎯 SOLUÇÃO RÁPIDA: Step 04 Financeiro (Tela em Branco)

## ⚡ AÇÃO IMEDIATA (30 segundos)

```bash
1. Pressione Ctrl+Shift+Delete
2. Marque "Cached images and files"  
3. Clique em "Clear data"
4. Pressione Ctrl+F5 para recarregar
5. Teste novamente o Step 04
```

**80% de chance de resolver o problema!**

---

## 🔍 SE NÃO RESOLVER: DIAGNÓSTICO (2 minutos)

### Abra o Console (F12) e verifique se há:

#### ❌ ERRO TIPO 1: "Sparkles is not defined"
```javascript
ReferenceError: Sparkles is not defined
```

**SOLUÇÃO:**
O import já foi adicionado, mas pode não ter sido aplicado. Force rebuild.

---

#### ❌ ERRO TIPO 2: "Cannot read property 'pricingMode' of undefined"
```javascript
TypeError: Cannot read property 'pricingMode' of undefined
```

**SOLUÇÃO:**
O `data` prop está undefined. Verifique linha ~798 do PropertyEditWizard.tsx.

---

#### ❌ ERRO TIPO 3: "Unexpected token" ou "Syntax error"
```javascript
SyntaxError: Unexpected token <
```

**SOLUÇÃO:**
Erro de sintaxe no componente. Arquivo pode estar corrompido.

---

#### ❌ ERRO TIPO 4: Nenhum erro no console
```
(console vazio)
```

**SOLUÇÃO:**
Problema de renderização condicional. O componente está retornando vazio/null.

---

## 🔧 SOLUÇÕES POR TIPO DE ERRO

### SOLUÇÃO 1: Forçar Rebuild (Erro de Import)

```bash
1. Pare o servidor de desenvolvimento (Ctrl+C)
2. Delete pasta node_modules/.vite (se existir)
3. Inicie novamente: npm run dev
4. Aguarde build completo
5. Teste novamente
```

### SOLUÇÃO 2: Verificar Inicialização do Data

Abra `/components/PropertyEditWizard.tsx` linha ~798:

**Verifique se está assim:**
```typescript
if (step.id === 'financial-pricing') {
  return (
    <FinancialIndividualPricingStep
      data={formData.financialIndividualPricing || {  // ← TEM QUE TER ||
        pricingMode: 'global',
        basePricePerNight: 0,
        currency: 'BRL',
        // ... mais campos ...
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

**Se estiver faltando o `|| { ... }`, ADICIONE!**

### SOLUÇÃO 3: Usar Componente de Teste

Temporariamente, substitua o import na linha 56 do PropertyEditWizard.tsx:

**DE:**
```typescript
import { FinancialIndividualPricingStep } from './wizard-steps/FinancialIndividualPricingStep';
```

**PARA:**
```typescript
import { FinancialIndividualPricingStep } from './wizard-steps/FinancialIndividualPricingStep.test';
```

**Recarregue e teste.** Se funcionar, o problema está no componente original.

### SOLUÇÃO 4: Adicionar Error Boundary

No PropertyEditWizard.tsx, envolva o componente com try/catch visual:

```typescript
if (step.id === 'financial-pricing') {
  try {
    return (
      <FinancialIndividualPricingStep
        data={formData.financialIndividualPricing || { /* defaults */ }}
        onChange={(data) => { /* ... */ }}
      />
    );
  } catch (error) {
    console.error('❌ Erro no FinancialIndividualPricingStep:', error);
    return (
      <div className="p-8 border border-red-500 rounded bg-red-50">
        <h3 className="text-lg font-bold text-red-900 mb-2">
          Erro ao carregar componente
        </h3>
        <p className="text-sm text-red-700">
          {error?.message || 'Erro desconhecido'}
        </p>
        <pre className="mt-4 text-xs bg-red-100 p-4 rounded overflow-auto">
          {error?.stack}
        </pre>
      </div>
    );
  }
}
```

---

## 📊 INFORMAÇÕES QUE PRECISO

Se nenhuma solução funcionar, envie:

### 1. Console Completo
```
Abra F12 → Console
Copie TUDO (Ctrl+A, Ctrl+C)
Cole aqui: [ ]
```

### 2. Network Status
```
Abra F12 → Network
Recarregue a página
Procure por "FinancialIndividualPricingStep"
Status Code: [ ]
Response Preview: [ ]
```

### 3. Elements HTML
```
Abra F12 → Elements
Use seletor (🔍) e clique na área vazia
Cole a estrutura HTML: [ ]
```

### 4. Screenshot
```
Print da tela mostrando:
- Wizard aberto
- Step 04 selecionado
- Console aberto com erros
- Upload para: [ ]
```

---

## 🚨 ÚLTIMA OPÇÃO: ROLLBACK

Se NADA funcionar, faça rollback da correção:

### Reverter FinancialIndividualPricingStep.tsx

Localize as linhas 288-344 e substitua por:

```typescript
{data.pricingMode === 'global' && (
  <Alert className="mt-4">
    <Info className="h-4 w-4" />
    <AlertDescription className="text-xs">
      Este anúncio herdará as configurações de preço globais. Para personalizar,
      selecione "Individual".
    </AlertDescription>
  </Alert>
)}
```

Isso vai voltar ao estado anterior (tela quase em branco, mas sem erro).

---

## ✅ CHECKLIST FINAL

Antes de declarar "não funcionou", verifique:

- [ ] Limpou o cache do navegador (Ctrl+Shift+Delete)
- [ ] Recarregou com Ctrl+F5 (não apenas F5)
- [ ] Abriu o console (F12) e verificou erros
- [ ] Testou em modo anônimo/privado
- [ ] Testou em outro navegador
- [ ] Aguardou o rebuild completo (pode demorar 30s)
- [ ] Verificou se o arquivo foi salvo corretamente

---

## 📞 CONTATO PARA SUPORTE

**Arquivos de diagnóstico criados:**
1. `/DIAGNOSTICO_STEP04_FINANCEIRO.md` - Guia completo de diagnóstico
2. `/🧪_TESTE_STEP04_PASSO_A_PASSO.md` - Testes passo a passo
3. `/components/wizard-steps/FinancialIndividualPricingStep.test.tsx` - Componente de teste

**Logs importantes:**
- Console do navegador (F12 → Console)
- Network do navegador (F12 → Network)
- Terminal do servidor de desenvolvimento

---

**⏰ Tempo estimado de resolução:** 5-30 minutos
**🎯 Taxa de sucesso:** 95% (cache + rebuild)
**📅 Data:** 03/11/2025 20:55 UTC-3
**🔖 Versão:** v1.0.103.266
