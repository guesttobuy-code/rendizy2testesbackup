# 🔧 DIAGNÓSTICO: Cards de Propriedades Vazios - v1.0.103.313

**Data:** 05/11/2025 21:00  
**Tipo:** Critical Bug - Frontend Display  
**Prioridade:** CRÍTICA  
**Status:** 🔍 DIAGNOSTICADO

---

## 🚨 PROBLEMA RELATADO

### Sintoma:
```
- Imóvel cadastrado ID: acc_97239cad-4b8d-46c0-82a3-28673ae4cfc1
- ✅ Wizard completado com sucesso (todos os steps)
- ❌ Card de propriedade aparece VAZIO
- ❌ Foto de capa NÃO aparece
- ❌ Nome do imóvel NÃO aparece
- ❌ Nenhuma informação cadastrada aparece
```

---

## 🔍 DIAGNÓSTICO COMPLETO

### 1️⃣ BACKEND - Como os Dados São Salvos

**Arquivo:** `/supabase/functions/server/routes-properties.ts`

```typescript
// Linha 274 - Campo salvo:
name: sanitizeString(body.name)

// Linha 324-325 - Fotos salvas:
photos: [],              // ❌ ARRAY VAZIO por padrão
coverPhoto: undefined,   // ❌ UNDEFINED por padrão
```

**❌ PROBLEMA #1: Backend salva `name`, NÃO `internalName`**

---

### 2️⃣ FRONTEND - Como os Cards Exibem

**Arquivo:** `/components/PropertiesManagement.tsx`

```typescript
// Linha 113 - Mapeamento (TEM FALLBACK!):
internalName: prop.internalName || prop.name  // ✅ Fallback existe!

// Linha 529 - ALT da imagem:
alt={property.internalName}  // ❌ Usa internalName direto

// Linha 581 - Nome exibido:
{property.internalName}  // ❌ Usa internalName direto
```

**❌ PROBLEMA #2: Card acessa `internalName` sem fallback visual**

---

### 3️⃣ FOTOS - Por Que Não Aparecem

**Arquivo:** `/components/wizard-steps/ContentPhotosStep.tsx`

```typescript
// Linha 177-185 - Como as fotos são armazenadas:
const photo: Photo = {
  id: `photo_${Date.now()}_${i}`,
  url,                   // ✅ URL local (blob://)
  file: processedFile,   // ✅ Arquivo processado
  category: 'other',
  isCover: data.photos.length === 0 && i === 0,
  order: data.photos.length + i,
  descriptions: {},
};

// Linha 191-194 - Salva em formData:
onChange({
  ...data,
  photos: [...data.photos, ...newPhotos],
});
```

**✅ Fotos são salvas em:** `formData.contentPhotos.photos`

---

### 4️⃣ WIZARD - Como Envia Para Backend

**Arquivo:** `/components/PropertyEditWizard.tsx`

```typescript
// Linha 447-464 - handleSaveAndNext:
console.log('💾 [Wizard] Salvando E avançando...');

if (property?.id) {
  await updateProperty(property.id, formData, {
    redirectToList: false,
    customSuccessMessage: `Step ${getCurrentStepNumber()} salvo com sucesso!`,
    onSuccess: () => {
      clearDraft();
    }
  });
}
```

**❌ PROBLEMA #3: `formData` contém `contentPhotos.photos`, mas backend espera `photos`**

---

### 5️⃣ HOOK - Como Envia Para API

**Arquivo:** `/hooks/usePropertyActions.ts`

```typescript
// Linha 168 - Envia direto:
response = await propertiesApi.update(propertyId, data);

// data = formData completo do wizard
// Sem transformação de estrutura!
```

**❌ PROBLEMA #4: Nenhuma transformação de `contentPhotos.photos` → `photos`**

---

## 📊 ESTRUTURA DE DADOS

### O Que o Wizard Salva:
```javascript
{
  contentType: { ... },
  contentLocation: { ... },
  contentPhotos: {
    photos: [
      {
        id: "photo_1730841234_0",
        url: "blob://...",
        file: File,
        category: "exterior",
        isCover: true,
        order: 0,
        descriptions: {}
      }
    ]
  },
  // ... outros steps
}
```

### O Que o Backend Espera:
```javascript
{
  name: "Meu Imóvel",
  code: "ABC123",
  type: "casa",
  photos: [
    {
      id: "photo_1730841234_0",
      url: "https://...",
      category: "exterior",
      isCover: true,
      order: 0
    }
  ],
  coverPhoto: "https://..."
}
```

### O Que o Card Procura:
```javascript
{
  internalName: "Meu Imóvel",  // ❌ Campo não existe!
  photos: ["https://..."],      // ❌ Array vazio!
}
```

---

## 🎯 CAUSAS RAIZ IDENTIFICADAS

### ❌ CAUSA #1: Incompatibilidade de Nomes de Campos
```
Wizard salva:  contentPhotos.photos
Backend salva: photos: []
Card busca:    property.photos[0]
```

### ❌ CAUSA #2: Fotos com URL Blob (não persistida)
```
Wizard: url: "blob://..."
Backend: Não faz upload para Supabase Storage
Card: Tenta exibir URL inexistente
```

### ❌ CAUSA #3: CoverPhoto Não Calculada
```
Wizard: isCover: true (em uma foto)
Backend: coverPhoto: undefined
Card: Não sabe qual foto é a capa
```

### ❌ CAUSA #4: Mapeamento de Campos Incompleto
```
Backend: name
Frontend: internalName (sem fallback visual)
Card: Tenta exibir internalName que não existe
```

---

## ✅ SOLUÇÕES NECESSÁRIAS

### 1️⃣ **Transformar formData Antes de Enviar**

**Local:** Hook `usePropertyActions.ts` ou `PropertyEditWizard.tsx`

```typescript
// ANTES de enviar para API:
const transformedData = {
  ...formData,
  
  // Extrair nome correto
  name: formData.contentType?.nome || formData.name,
  
  // Extrair fotos com upload para Supabase
  photos: await uploadPhotos(formData.contentPhotos?.photos || []),
  
  // Definir foto de capa
  coverPhoto: formData.contentPhotos?.photos?.find(p => p.isCover)?.url,
  
  // Remover campos aninhados temporários
  contentType: undefined,
  contentLocation: undefined,
  contentPhotos: undefined,
  // ... outros
};
```

### 2️⃣ **Upload Real de Fotos para Supabase**

```typescript
async function uploadPhotos(photos: Photo[]) {
  const uploadedPhotos = [];
  
  for (const photo of photos) {
    if (photo.file) {
      // Upload para Supabase Storage
      const formData = new FormData();
      formData.append('file', photo.file);
      formData.append('propertyId', propertyId);
      formData.append('room', photo.category);
      
      const response = await fetch('/photos/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      uploadedPhotos.push({
        id: data.photo.id,
        url: data.photo.url,
        category: photo.category,
        isCover: photo.isCover,
        order: photo.order
      });
    }
  }
  
  return uploadedPhotos;
}
```

### 3️⃣ **Corrigir Mapeamento no Card**

**Arquivo:** `/components/PropertiesManagement.tsx`

```typescript
// OPÇÃO A: Usar fallback em todos os lugares
{property.internalName || property.name}

// OPÇÃO B: Garantir mapeamento correto
internalName: prop.name,
publicName: prop.name,
```

### 4️⃣ **Corrigir Backend para Aceitar Estrutura do Wizard**

**Arquivo:** `/supabase/functions/server/routes-properties.ts`

```typescript
// No updateProperty, extrair dados aninhados:
const property: Property = {
  ...existing,
  
  // Extrair nome do contentType se existir
  name: body.contentType?.nome || body.name || existing.name,
  
  // Extrair fotos se vieram do wizard
  photos: body.contentPhotos?.photos || body.photos || existing.photos,
  
  // Calcular coverPhoto automaticamente
  coverPhoto: body.contentPhotos?.photos?.find(p => p.isCover)?.url || 
              body.coverPhoto || 
              existing.coverPhoto,
};
```

---

## 🧪 VALIDAÇÃO NECESSÁRIA

### 1. Verificar Dados no Supabase
```javascript
// No console do navegador:
const response = await fetch('/api/properties/acc_97239cad-4b8d-46c0-82a3-28673ae4cfc1');
const data = await response.json();
console.log('Dados salvos:', data);
```

### 2. Verificar Estrutura Salva
```javascript
// Ver o que realmente está salvo:
{
  id: "acc_97239cad-4b8d-46c0-82a3-28673ae4cfc1",
  name: "???",              // Verificar se existe
  internalName: "???",      // Verificar se existe
  photos: [],               // Verificar se está vazio
  coverPhoto: undefined,    // Verificar se está undefined
  contentPhotos: { ... }    // Verificar se foi salvo aninhado
}
```

---

## 📋 PRIORIDADES DE CORREÇÃO

### 🔥 CRÍTICO (Fazer Agora):
1. ✅ Transformar `formData` antes de enviar
2. ✅ Upload real de fotos para Supabase Storage
3. ✅ Corrigir mapeamento de campos (name vs internalName)

### ⚠️ IMPORTANTE (Próximo):
4. ✅ Calcular coverPhoto automaticamente
5. ✅ Validar estrutura salva no banco
6. ✅ Adicionar logs detalhados

### 📊 OPCIONAL (Depois):
7. ✅ Melhorar feedback visual durante upload
8. ✅ Adicionar preview antes de salvar
9. ✅ Implementar edição de fotos existentes

---

## 🎯 PLANO DE AÇÃO

### FASE 1: Diagnóstico (✅ CONCLUÍDO)
- [x] Identificar causa raiz
- [x] Mapear fluxo de dados
- [x] Documentar incompatibilidades

### FASE 2: Correção Backend (PRÓXIMO)
- [ ] Modificar `updateProperty` para extrair dados aninhados
- [ ] Implementar upload de fotos real
- [ ] Calcular coverPhoto automaticamente
- [ ] Testar com imóvel existente

### FASE 3: Correção Frontend
- [ ] Corrigir mapeamento no card
- [ ] Adicionar fallbacks
- [ ] Melhorar feedback visual

### FASE 4: Teste Completo
- [ ] Criar imóvel novo com fotos
- [ ] Editar imóvel existente
- [ ] Verificar cards exibindo corretamente
- [ ] Validar no Supabase

---

## 🚨 ATENÇÃO CRÍTICA

**O imóvel foi salvo, mas:**
1. ❌ Fotos estão em URLs blob:// locais (não persistidas)
2. ❌ Estrutura está aninhada (`contentPhotos.photos`)
3. ❌ Campo `name` pode estar vazio
4. ❌ `coverPhoto` está undefined

**Próximo passo:**
- Criar função de transformação de dados
- Implementar upload real de fotos
- Reprocessar imóvel salvo

---

**Versão:** v1.0.103.313  
**Build:** 2025-11-05T21:00:00.000Z  
**Status:** 🔍 Diagnosticado - Correção em andamento
