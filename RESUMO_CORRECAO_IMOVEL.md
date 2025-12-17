# ✅ RESUMO: Correção de Criação de Imóvel

**Data:** 23/11/2025  
**Status:** ✅ **CORREÇÕES APLICADAS - AGUARDANDO DEPLOY DO SUPABASE**

---

## 🔧 PROBLEMA IDENTIFICADO

O backend estava tentando inserir um ID com prefixo `acc_` (ex: `acc_7c4ac103-9900-44fa-8ed1-e94ec12528cd`) em um campo UUID do banco de dados, causando o erro:

```
invalid input syntax for type uuid: "acc_7c4ac103-9900-44fa-8ed1-e94ec12528cd"
```

---

## ✅ CORREÇÕES APLICADAS

### **1. Remoção de Prefixo `acc_` do ID** (`utils-property-mapper.ts`)
```typescript
// ✅ CORREÇÃO: Remover prefixo do ID se existir (ex: "acc_" -> UUID puro)
let propertyId = property.id;
if (propertyId && propertyId.includes('_')) {
  const parts = propertyId.split('_');
  if (parts.length > 1) {
    propertyId = parts.slice(1).join('_');
  }
}
```

### **2. Correção de `organizationId`**
```typescript
// ✅ CORREÇÃO: organizationId deve ser UUID válido ou null (não 'system')
let orgId = organizationId;
if (orgId === 'system' || !orgId) {
  orgId = null;
}
```

### **3. Correção de `locationId` e `ownerId`**
```typescript
// ✅ Remover prefixos de locationId e ownerId antes de inserir
location_id: (() => {
  const locationId = property.locationId || null;
  if (locationId && typeof locationId === 'string' && locationId.includes('_')) {
    const parts = locationId.split('_');
    return parts.length > 1 ? parts.slice(1).join('_') : locationId;
  }
  return locationId;
})(),
```

---

## 📋 COMMITS REALIZADOS

1. **`68c456cd`** - fix: remover prefixo acc_ do ID antes de inserir no banco SQL
2. **`c35d035e`** - fix: remover prefixos de location_id e owner_id antes de inserir no SQL
3. **`e4286d79`** - fix: corrigir organizationId e adicionar logs de debug para UUID
4. **`d7f9d748`** - debug: adicionar logs detalhados para identificar campo UUID com problema

---

## ⏳ AGUARDANDO DEPLOY

O Supabase Edge Functions pode levar **5-10 minutos** para fazer o deploy das correções. 

**Após o deploy, execute:**
```bash
node RendizyPrincipal/scripts/criar-imovel-node.js
```

---

## 📝 SCRIPT DISPONÍVEL

O script está em: `RendizyPrincipal/scripts/criar-imovel-node.js`

**Dados do imóvel que será criado:**
- **Nome:** Casa Completa de Teste - Recreio dos Bandeirantes
- **Endereço:** Rua Lady Laura, 100 - Recreio dos Bandeirantes, Rio de Janeiro
- **Capacidade:** 6 hóspedes, 3 quartos, 4 camas, 2 banheiros
- **Preço:** R$ 500/dia
- **Modalidades:** Temporada, Compra/Venda, Locação Residencial

---

**Status Final:** ✅ **CORREÇÕES APLICADAS - AGUARDANDO DEPLOY**  
**Versão:** v1.0.103.1001

