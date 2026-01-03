# 🎯 GUIA RÁPIDO - Property Actions Hook

**Versão:** v1.0.103.280  
**Data:** 04/11/2025

---

## ⚡ USO RÁPIDO

### **1. Importar**

```typescript
import { usePropertyActions } from '../hooks/usePropertyActions';
```

---

### **2. Usar no Componente**

```typescript
const { createProperty, updateProperty, deleteProperty, cancelEditing } = usePropertyActions();
```

---

### **3. Criar Imóvel**

```typescript
await createProperty(propertyData);
// → Toast: "{nome} criado com sucesso!"
// → Redireciona para /properties
// → Recarrega página
```

---

### **4. Editar Imóvel**

```typescript
await updateProperty(propertyId, propertyData);
// → Toast: "{nome} editado com sucesso!"
// → Redireciona para /properties
// → Recarrega página
```

---

### **5. Deletar Imóvel**

```typescript
// Soft delete
await deleteProperty(property, true);
// → Toast: "{nome} desativado com sucesso!"

// Hard delete
await deleteProperty(property, false);
// → Toast: "{nome} deletado com sucesso!"
```

---

### **6. Cancelar**

```typescript
cancelEditing();
// → Toast: "Edição cancelada. Alterações não foram salvas."
// → Redireciona para /properties
```

---

## 🎨 OPÇÕES AVANÇADAS

### **Sem Recarregar Página**

```typescript
await createProperty(data, {
  reloadPage: false
});
```

---

### **Mensagem Customizada**

```typescript
await createProperty(data, {
  customSuccessMessage: "Imóvel cadastrado!"
});
```

---

### **Callback de Sucesso**

```typescript
await createProperty(data, {
  onSuccess: () => {
    console.log('Imóvel criado!');
    // Fazer outras ações
  }
});
```

---

### **Callback de Erro**

```typescript
await createProperty(data, {
  onError: (error) => {
    console.error('Erro:', error);
    // Tratamento customizado
  }
});
```

---

### **Todas as Opções Juntas**

```typescript
await createProperty(data, {
  reloadPage: false,
  redirectToList: true,
  customSuccessMessage: "Sucesso!",
  onSuccess: () => console.log('OK'),
  onError: (e) => console.error(e)
});
```

---

## ✅ REGRA DE OURO

> **SEMPRE use o hook `usePropertyActions` para criar, editar ou deletar imóveis!**

**❌ NÃO FAÇA:**
```typescript
const response = await propertiesApi.create(data);
toast.success('Criado!');
navigate('/properties');
```

**✅ FAÇA:**
```typescript
const { createProperty } = usePropertyActions();
await createProperty(data);
```

---

## 📊 COMPONENTES INTEGRADOS

| Componente | Função Usada |
|---|---|
| PropertiesManagement | `deleteProperty()` |
| PropertyEditWizard | `updateProperty()`, `cancelEditing()` |
| CreateIndividualPropertyModal | `createProperty()` |

---

## 🔗 DOCUMENTAÇÃO COMPLETA

Ver: `✅_SISTEMA_ACOES_PADRONIZADAS_v1.0.103.280.md`

---

**🎯 Status:** ✅ PRONTO PARA USO  
**📅 Data:** 04/11/2025
