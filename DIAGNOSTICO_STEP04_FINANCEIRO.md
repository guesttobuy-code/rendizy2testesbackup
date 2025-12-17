# 🔍 DIAGNÓSTICO: Step 04 Financeiro - Tela em Branco

## 📋 CHECKLIST DE DIAGNÓSTICO

Execute os seguintes passos para identificar o problema:

### 1️⃣ ABRIR O DEVTOOLS (F12)

1. Acesse: `https://suacasaavenda.com.br/properties/PRP-AI7U07/edit`
2. Abra o DevTools (F12)
3. Vá na aba **Console**
4. Clique em "Clear console" (ícone 🚫)

### 2️⃣ NAVEGAR PARA O STEP 04

1. Clique na aba **Financeira** (segunda aba)
2. Clique no **Step 04: Precificação Individual de Temporada**
3. **OBSERVE O CONSOLE** - Copie TODOS os erros em vermelho

### 3️⃣ VERIFICAR COMPONENTE

Abra a aba **Elements** (ou Elementos) do DevTools:

1. Use o seletor (ícone 🔍 no canto superior esquerdo do DevTools)
2. Clique na área onde deveria aparecer o conteúdo do Step 04
3. Verifique se há algum elemento renderizado
4. Copie a estrutura HTML que você vê

### 4️⃣ VERIFICAR NETWORK

1. Abra a aba **Network** (Rede)
2. Recarregue a página (F5)
3. Navegue novamente para Step 04
4. Veja se há alguma requisição falhando (em vermelho)

---

## 🐛 ERROS POSSÍVEIS E SOLUÇÕES

### ERRO 1: "Cannot read property 'pricingMode' of undefined"

**Causa:** O prop `data` está undefined

**Solução:** Verificar se o PropertyEditWizard está passando o data corretamente

```typescript
// No PropertyEditWizard.tsx, linha ~800
<FinancialIndividualPricingStep
  data={formData.financialIndividualPricing || {
    pricingMode: 'global', // ← Deve ter valor padrão
    basePricePerNight: 0,
    // ...
  }}
  onChange={(data) => { /* ... */ }}
/>
```

### ERRO 2: "Sparkles is not defined"

**Causa:** Import faltando

**Já corrigido!** ✅ O import já está na linha 33 do arquivo.

### ERRO 3: Component rendering blank/null

**Causa:** Renderização condicional retornando vazio

**Já corrigido!** ✅ Agora o modo Global mostra conteúdo completo.

### ERRO 4: "Failed to compile" ou erro de build

**Causa:** Sintaxe inválida no componente

**Solução:** Verifique se o arquivo foi salvo corretamente após a edição

---

## 📝 O QUE VOCÊ DEVE VER AGORA

### Modo GLOBAL (padrão):
```
✅ Card com botões "Global" / "Individual" 
✅ Alert azul explicando modo global
✅ Card "Configurações Globais Aplicadas" com 4 itens
✅ Alert azul com link para configurações
```

### Modo INDIVIDUAL (após clicar em "Individual"):
```
✅ Todo o formulário de precificação
✅ Preço base
✅ Descontos por permanência  
✅ Períodos sazonais
✅ Preços por dia da semana
✅ Datas especiais
```

---

## 🔧 AÇÕES DE EMERGÊNCIA

### Se ainda estiver em branco após a correção:

#### Opção 1: Limpar cache do navegador
```bash
1. Pressione Ctrl+Shift+Delete
2. Selecione "Cached images and files"
3. Clique em "Clear data"
4. Recarregue a página (Ctrl+F5)
```

#### Opção 2: Verificar se o build foi atualizado
```bash
1. Abra o DevTools
2. Vá em Network
3. Procure por "FinancialIndividualPricingStep" ou arquivo .js do componente
4. Veja a data de modificação
5. Se estiver antiga, force rebuild
```

#### Opção 3: Adicionar Error Boundary

Se houver erro não capturado, adicione um Error Boundary:

```typescript
// No PropertyEditWizard.tsx, envolva o step:
{step.id === 'financial-pricing' && (
  <ErrorBoundary fallback={<div>Erro no componente de pricing</div>}>
    <FinancialIndividualPricingStep
      data={formData.financialIndividualPricing || { /* defaults */ }}
      onChange={(data) => { /* ... */ }}
    />
  </ErrorBoundary>
)}
```

---

## 📊 INFORMAÇÕES PARA ENVIAR

Por favor, envie as seguintes informações:

### Console Errors (F12 → Console):
```
[Cole aqui todos os erros em vermelho]
```

### Network Errors (F12 → Network):
```
[Cole aqui requisições falhadas]
```

### Elements (F12 → Elements):
```
[Cole aqui a estrutura HTML da área vazia]
```

### Screenshot:
```
[Tire um print da tela em branco e do console]
```

---

## 🎯 PRÓXIMOS PASSOS

Com essas informações, poderei:
1. Identificar o erro exato
2. Aplicar a correção específica
3. Testar preventivamente os outros steps

---

**Data:** 03/11/2025 20:42 UTC-3
**Versão:** v1.0.103.266
**Componente:** FinancialIndividualPricingStep.tsx
**Status:** Correção aplicada - Aguardando teste
