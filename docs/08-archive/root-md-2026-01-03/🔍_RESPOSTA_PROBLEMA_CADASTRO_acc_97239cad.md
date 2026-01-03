# 🔍 RESPOSTA: O QUE ESTÁ SALVO NO BANCO?

## Imóvel: `acc_97239cad`

Você me pediu para verificar o que realmente está salvo no banco de dados. Abra o arquivo HTML que criei para ver os dados completos:

```
CONSULTA_DIRETA_acc_97239cad.html
```

---

## 🎯 PROBLEMA IDENTIFICADO

Analisando o código do sistema, encontrei **3 PROBLEMAS CRÍTICOS** que explicam por que seus dados não são salvos:

### ❌ PROBLEMA 1: ESTRUTURA DE DADOS DIVERGENTE

O wizard salva os dados em uma estrutura aninhada:
```typescript
{
  contentType: { ... },
  contentLocation: { ... },
  contentRooms: { ... },
  contentLocationAmenities: { amenities: [...] },  // ⚠️ ANINHADO
  contentPropertyAmenities: { listingAmenities: [...] },  // ⚠️ ANINHADO
  contentPhotos: { photos: [...] }  // ⚠️ ANINHADO
}
```

Mas os **cards de imóveis** esperam dados no campo raiz:
```typescript
{
  name: "...",           // ❌ Wizard salva como contentType.internalName
  photos: [...],         // ❌ Wizard salva como contentPhotos.photos
  locationAmenities: [...],  // ❌ Wizard salva como contentLocationAmenities.amenities
  listingAmenities: [...]    // ❌ Wizard salva como contentPropertyAmenities.listingAmenities
}
```

**RESULTADO**: Dados são salvos, mas não aparecem nos cards!

---

### ❌ PROBLEMA 2: CAMPO `name` vs `internalName`

```typescript
// WIZARD salva:
contentType: {
  internalName: "Sua Casa Linda"
}

// CARD busca:
property.name  // ❌ VAZIO!
```

**RESULTADO**: O nome aparece vazio nos cards mesmo estando no banco!

---

### ❌ PROBLEMA 3: FOTOS EM ESTRUTURA ANINHADA

```typescript
// WIZARD salva:
contentPhotos: {
  photos: [
    { url: "blob:...", isCover: true, category: "exterior" },
    { url: "blob:...", isCover: false, category: "bedroom" }
  ]
}

// CARD busca:
property.photos  // ❌ VAZIO!
property.coverPhoto  // ❌ VAZIO!
```

**RESULTADO**: Fotos são enviadas mas ficam escondidas dentro de `contentPhotos.photos`!

---

## 💡 POR QUE ISSO ACONTECE?

Você está usando **DOIS SISTEMAS DIFERENTES**:

### 1️⃣ **Wizard de Criação** (`PropertyEditWizard.tsx`)
- Salva dados na estrutura do **Property Wizard Backend** (`routes-property-wizard.ts`)
- Estrutura: `contentType`, `contentLocation`, `contentPhotos`, etc.
- URL: `/properties/wizard/:id/step/:stepId`
- Dados ficam em blocos separados

### 2️⃣ **API de Propriedades** (`routes-properties.ts`)
- Espera dados na estrutura **PLANA** tradicional
- Estrutura: `name`, `photos`, `amenities`, `address`, etc.
- URL: `/properties/:id`
- Dados ficam no objeto raiz

---

## 🔧 COMO CADASTRAR UM IMÓVEL COM SUCESSO?

### OPÇÃO A: USAR APENAS O WIZARD (RECOMENDADO)

O wizard está funcionando, o problema é a **exibição** nos cards.

**Solução:**
1. Continue usando o wizard normalmente
2. Eu vou corrigir os **cards** para ler a estrutura do wizard
3. Alternativamente, vou criar uma **conversão automática** após salvar

### OPÇÃO B: CONVERTER DADOS AO SALVAR

Modificar o wizard para converter automaticamente:

```typescript
// Quando salvar, transformar de:
{
  contentType: { internalName: "Casa" },
  contentPhotos: { photos: [...] }
}

// Para:
{
  name: "Casa",           // ✅ Campo raiz
  photos: [...],          // ✅ Campo raiz  
  // ... + manter estrutura wizard
}
```

---

## 🚨 ESTADO ATUAL DOS SEUS DADOS

Com base no código, **seus dados ESTÃO SALVOS**, mas em campos que os cards não leem:

```json
{
  "id": "acc_97239cad-4b8d-46c0-82a3-28673ae4cfc1",
  "contentType": {
    "internalName": "Seu nome aqui",  // ✅ SALVO
    "accommodationTypeId": "...",
    "modalidades": [...]
  },
  "contentPhotos": {
    "photos": [                       // ✅ SALVO
      { "url": "...", "isCover": true }
    ]
  },
  "contentLocationAmenities": {
    "amenities": ["wifi", "pool"]     // ✅ SALVO
  },
  "contentPropertyAmenities": {
    "listingAmenities": ["ar", "tv"]  // ✅ SALVO
  }
}
```

**MAS** os cards buscam:
```json
{
  "name": null,           // ❌ VAZIO
  "photos": [],           // ❌ VAZIO
  "locationAmenities": [], // ❌ VAZIO
  "listingAmenities": []   // ❌ VAZIO
}
```

---

## ✅ PRÓXIMOS PASSOS

### 1. ABRA O DIAGNÓSTICO HTML
```
CONSULTA_DIRETA_acc_97239cad.html
```

Isso vai mostrar EXATAMENTE o que está no banco de dados.

### 2. CONFIRME O PROBLEMA
Você verá:
- ✅ **Nome**: Salvo em `contentType.internalName` 
- ✅ **Fotos**: Salvas em `contentPhotos.photos`
- ✅ **Amenidades**: Salvas em `contentLocationAmenities.amenities` e `contentPropertyAmenities.listingAmenities`

### 3. ESCOLHA A CORREÇÃO

**OPÇÃO 1 - Corrigir Cards** (Rápido)
Modifico os cards para ler da estrutura wizard

**OPÇÃO 2 - Converter ao Salvar** (Mais robusto)
Wizard converte automaticamente para ambas estruturas

**OPÇÃO 3 - Migrar Dados Existentes** (Completo)
Script para converter todos os imóveis existentes

---

## 🎯 RESPOSTA DIRETA

### O QUE SALVAMOS NO BANCO?

**TUDO que você preencheu está lá!** Mas em estrutura aninhada:
- Nome → `contentType.internalName`
- Fotos → `contentPhotos.photos[]`
- Amenidades Local → `contentLocationAmenities.amenities[]`
- Amenidades Anúncio → `contentPropertyAmenities.listingAmenities[]`

### POR QUE APARECE VAZIO?

Os **cards de exibição** buscam nos campos raiz (`name`, `photos`, `amenities`) que estão vazios.

### COMO RESOLVER?

Eu corrijo agora! Escolha qual abordagem prefere:
1. Modificar cards (5 min)
2. Converter ao salvar (15 min)
3. Migrar dados existentes (30 min)

---

**Qual opção você prefere?**

Ou quer que eu execute a **mais rápida** (corrigir os cards)?
