# 🔍 DIAGNÓSTICO COMPLETO - CRIAÇÃO DE IMÓVEL

## 🎯 Objetivo
Identificar EXATAMENTE onde o sistema está quebrando ao tentar criar um imóvel.

---

## 📊 Análise do Fluxo Completo

### FLUXO DE CRIAÇÃO:
```
1. Usuário acessa: /properties/new
   ↓
2. PropertyWizardPage.tsx carrega
   ↓
3. Como id='new', NÃO carrega propriedade existente
   ↓
4. Renderiza <PropertyEditWizard /> com property={}
   ↓
5. Wizard inicializa no Step 1 (content-type)
   ↓
6. Renderiza <ContentTypeStep />
   ↓
7. ContentTypeStep faz fetch de property types
   ↓
8. Usuário seleciona tipo (ex: "Casa")
   ↓
9. onChange() atualiza formData.contentType
   ↓
10. PROBLEMA: Tela fica branca aqui? Ou depois?
```

---

## 🐛 Problemas Potenciais Identificados

### 1. ⚠️ CRÍTICO: Import do toast no PropertyEditWizard
**Arquivo**: `/components/PropertyEditWizard.tsx`  
**Linha 44**: `import { toast } from 'sonner';`

**PROBLEMA**: Deveria ser `import { toast } from 'sonner@2.0.3';`

Isso pode causar erro silencioso que quebra a página.

### 2. ⚠️ ContentTypeStep - Possível erro em .map()
**Arquivo**: `/components/wizard-steps/ContentTypeStep.tsx`  
**Linhas 207-211**:

```tsx
{locationTypes.map((type) => (
  <SelectItem key={type.id} value={type.id}>
    {type.name}
  </SelectItem>
))}
```

**PROBLEMA POTENCIAL**: Se `locationTypes` for undefined ou não for array, o `.map()` quebra.

### 3. ⚠️ Estado inicial do formData
**Arquivo**: `/components/PropertyEditWizard.tsx`  
**Linha 318-324**:

```tsx
contentType: {
  propertyTypeId: property?.propertyTypeId || undefined,
  accommodationTypeId: property?.accommodationTypeId || undefined,
  subtipo: property?.subtipo || undefined,
  categoria: property?.categoria || undefined,
  registrationNumber: property?.registrationNumber || '',
},
```

**PROBLEMA**: Falta o campo `modalidades` que o ContentTypeStep espera!

### 4. ⚠️ ContentTypeStep não trata modalidades undefined
**Arquivo**: `/components/wizard-steps/ContentTypeStep.tsx`  
**Linhas 286-293**:

```tsx
checked={data.modalidades?.includes('short_term_rental') || false}
```

Usa optional chaining (OK), mas se `data.modalidades` for `null` em vez de `undefined`, pode quebrar.

---

## 🔧 Correções Necessárias

### Correção 1: Import do toast no PropertyEditWizard
```tsx
// ❌ ERRADO (linha 44)
import { toast } from 'sonner';

// ✅ CORRETO
import { toast } from 'sonner@2.0.3';
```

### Correção 2: Inicializar modalidades no formData
```tsx
contentType: {
  propertyTypeId: property?.propertyTypeId || undefined,
  accommodationTypeId: property?.accommodationTypeId || undefined,
  subtipo: property?.subtipo || undefined,
  modalidades: property?.modalidades || [], // ✅ ADICIONAR ESTA LINHA
  registrationNumber: property?.registrationNumber || '',
  propertyType: property?.propertyType || 'individual', // ✅ ADICIONAR ESTA LINHA
},
```

### Correção 3: Garantir que locationTypes é sempre array
```tsx
// No ContentTypeStep.tsx, no catch do useEffect:
setLocationTypes(mockLocationTypes || []);
setAccommodationTypes(mockAccommodationTypes || []);
```

### Correção 4: Adicionar try-catch no renderStep
```tsx
const renderStep = (step: WizardStep) => {
  try {
    // código existente...
  } catch (error) {
    console.error('❌ Erro ao renderizar step:', step.id, error);
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3>Erro ao carregar este passo</h3>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }
};
```

---

## 🧪 Como Testar Cada Etapa

### Teste 1: Verificar Console do Navegador
```
1. Abra o navegador (Chrome/Edge)
2. Pressione F12 para abrir DevTools
3. Vá na aba "Console"
4. Acesse: /properties/new
5. Observe TODOS os logs:
   - ℹ️ Logs normais (azul)
   - ⚠️ Warnings (amarelo)
   - ❌ Errors (vermelho)
```

**O QUE PROCURAR**:
- "Cannot read property 'map' of undefined"
- "Cannot read property 'includes' of undefined"
- "Module not found"
- "Failed to fetch"
- Qualquer erro em vermelho

### Teste 2: Verificar Network Tab
```
1. No DevTools, vá na aba "Network"
2. Acesse: /properties/new
3. Verifique se há requests para:
   - /make-server-67caf26a/property-types
   - Status 200 (sucesso) ou 404/500 (erro)?
```

### Teste 3: Testar Seleção Passo a Passo
```
1. Acesse: /properties/new
2. ANTES de clicar em qualquer coisa:
   - Veja se a página carrega
   - Veja se os dropdowns aparecem
3. Clique no dropdown "Tipo de propriedade"
   - Abre? Mostra opções?
4. Selecione "Casa"
   - O que acontece?
5. Observe o console a cada ação
```

---

## 📋 Checklist de Diagnóstico

### Console do Navegador
- [ ] Abri o console (F12)
- [ ] Vejo logs de "Carregando propriedade"?
- [ ] Vejo logs de fetch de property-types?
- [ ] Há algum erro em vermelho?
- [ ] Qual é a ÚLTIMA mensagem antes da tela branca?

### Interface Visual
- [ ] A página /properties/new carrega?
- [ ] Vejo o header "Nova Propriedade"?
- [ ] Vejo o botão "Voltar para Imóveis"?
- [ ] Vejo o Step 1 "Tipo e Identificação"?
- [ ] Vejo os 3 dropdowns (Tipo de propriedade, Tipo de anúncio, Subtipo)?
- [ ] Os dropdowns estão habilitados (não disabled)?

### Dropdowns
- [ ] Consigo clicar no dropdown "Tipo de propriedade"?
- [ ] Ele abre e mostra opções?
- [ ] Quais opções aparecem?
- [ ] Consigo selecionar "Casa"?
- [ ] O que acontece após selecionar?

### Network
- [ ] Request para /property-types foi feito?
- [ ] Status code: 200 ou erro?
- [ ] Response tem dados?

---

## 🎯 Próximos Passos

### Se tiver erro no console:
1. **Copie o erro COMPLETO**
2. **Tire screenshot do console**
3. **Me envie para eu analisar**

### Se não tiver erro no console mas tela ficar branca:
1. Pode ser **CSS** causando a tela parecer branca
2. Verifique se há um elemento cobrindo a tela
3. No DevTools, vá em "Elements" e veja o HTML

### Se os dropdowns não abrirem:
1. Pode ser problema de **z-index**
2. Pode ser problema de **portal do Select**
3. Tente clicar com botão direito → Inspecionar

---

## 💡 Dica de Ouro

**SEMPRE OLHE O CONSOLE PRIMEIRO!**

O React mostra erros MUITO claros no console. Se a tela ficar branca, 99% das vezes há um erro vermelho no console dizendo exatamente o que está errado.

**Erros comuns**:
- "Cannot read property X of undefined" → Variável não inicializada
- "X is not a function" → Import errado
- "Failed to compile" → Erro de sintaxe
- "Module not found" → Import de arquivo que não existe

---

## 📞 Me Envie Estes Dados

Para eu poder ajudar melhor, me envie:

1. **Screenshot do console completo** (F12 → Console)
2. **Última mensagem antes da tela branca**
3. **Network tab** (se fez requests)
4. **Em qual momento exato ficou branco**:
   - Logo ao carregar /properties/new?
   - Ao clicar no dropdown?
   - Ao selecionar uma opção?
   - Ao tentar avançar para próximo step?

---

## ⚡ Correções que Vou Aplicar AGORA

Vou corrigir os problemas que identifiquei:

1. ✅ Corrigir import do toast
2. ✅ Adicionar modalidades no formData inicial
3. ✅ Adicionar propertyType no formData inicial
4. ✅ Garantir arrays sempre inicializados
5. ✅ Adicionar try-catch em renderStep
6. ✅ Adicionar logs ultra-detalhados em CADA etapa

**Aguarde as correções...**
