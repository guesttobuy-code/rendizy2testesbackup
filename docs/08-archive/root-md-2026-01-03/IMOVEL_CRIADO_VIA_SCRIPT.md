# ✅ IMÓVEL CRIADO VIA SCRIPT

**Data:** 23/11/2025  
**Status:** ⚠️ **ERRO NO BACKEND - Requer Correção**

---

## 🧪 TESTE REALIZADO

### **1. Login Realizado com Sucesso**
- ✅ Login funcionou corretamente
- ✅ Token obtido: `mibxwvvv_113i8u264hl_rpwikitb4zj`
- ✅ Usuário autenticado: Super Administrador

### **2. Tentativa de Criação de Imóvel**
- ✅ Requisição chegou ao backend
- ❌ **ERRO:** `invalid input syntax for type uuid: "acc_677d25a4-3b46-41f7-9809-d2a01a6c2853"`

---

## 🔍 PROBLEMA IDENTIFICADO

O backend está tentando inserir um valor com prefixo `acc_` em um campo UUID do banco de dados. O erro ocorre na função `createProperty` em `routes-properties.ts`.

### **Possíveis Causas:**
1. A função `normalizeWizardData` está gerando um valor `accommodationTypeId` com prefixo `acc_`
2. O campo `locationId` ou algum outro campo UUID está recebendo esse valor incorretamente
3. Há um campo no banco de dados que espera UUID mas está recebendo um valor com prefixo `acc_`

---

## 📋 DADOS DO IMÓVEL (Script)

```javascript
{
  name: 'Casa Completa de Teste - Recreio dos Bandeirantes',
  code: `CASA${Date.now().toString(36).toUpperCase()}`,
  type: 'loc_casa',
  propertyType: 'individual',
  subtype: 'entire_place',
  modalities: ['short_term_rental', 'buy_sell', 'residential_rental'],
  address: {
    street: 'Rua Lady Laura',
    number: '100',
    complement: 'Casa',
    neighborhood: 'Recreio dos Bandeirantes',
    city: 'Rio de Janeiro',
    state: 'Rio de Janeiro',
    stateCode: 'RJ',
    zipCode: '22790-673',
    country: 'BR',
    coordinates: { lat: -23.0065, lng: -43.4728 }
  },
  maxGuests: 6,
  bedrooms: 3,
  beds: 4,
  bathrooms: 2,
  basePrice: 500,
  currency: 'BRL',
  minNights: 2,
  maxNights: 365,
  advanceBooking: 365,
  preparationTime: 1,
  financialInfo: {
    monthlyRent: 3000,
    iptu: 200,
    condo: 400,
    fees: 0,
    salePrice: 800000,
    iptuAnnual: 2400
  },
  description: 'Casa completa de teste criada automaticamente para validação do sistema. Localizada no Recreio dos Bandeirantes, Rio de Janeiro. Casa espaçosa com 3 quartos, 4 camas, 2 banheiros, capacidade para 6 hóspedes. Ideal para temporada, locação ou compra.',
  tags: ['teste', 'automático', 'recreio', 'casa'],
  amenities: ['wifi', 'parking', 'pool', 'air_conditioning', 'tv', 'kitchen', 'washing_machine'],
  status: 'active',
  isActive: true
}
```

---

## 🔧 PRÓXIMOS PASSOS

1. **Verificar o backend** (`supabase/functions/rendizy-server/routes-properties.ts`):
   - Verificar a função `normalizeWizardData`
   - Verificar a função `propertyToSql`
   - Verificar se há algum campo UUID que está recebendo valores com prefixo `acc_`

2. **Verificar o schema do banco de dados**:
   - Verificar se há algum campo UUID que está recebendo valores incorretos
   - Verificar se há algum trigger ou função que está gerando valores com prefixo `acc_`

3. **Corrigir o backend**:
   - Remover ou corrigir a geração de valores com prefixo `acc_` para campos UUID
   - Garantir que apenas valores UUID válidos sejam inseridos no banco

---

## 📝 SCRIPT DISPONÍVEL

O script está disponível em: `RendizyPrincipal/scripts/criar-imovel-node.js`

**Para executar:**
```bash
node RendizyPrincipal/scripts/criar-imovel-node.js
```

---

**Status Final:** ⚠️ **REQUER CORREÇÃO NO BACKEND**  
**Versão:** v1.0.103.1001

