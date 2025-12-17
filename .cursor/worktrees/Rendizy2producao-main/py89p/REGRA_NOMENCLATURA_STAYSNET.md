# 🚨 REGRA DE OURO: NOMENCLATURA PRÓPRIA - NUNCA COPIAR CAMPOS DA STAYS.NET

**Data:** 22/11/2025  
**Status:** ✅ **REGRA ESTABELECIDA**

---

## 🎯 **REGRA FUNDAMENTAL**

> **❌ NUNCA copie nomes de campos específicos da Stays.net**  
> **✅ SEMPRE use nomenclatura própria do Rendizy**  
> **✅ SEMPRE converta campos da Stays.net para nomenclatura Rendizy**

---

## 📋 **POR QUE ISSO É IMPORTANTE?**

1. **Identidade Própria:** Rendizy é um sistema novo, não uma cópia
2. **Evitar Confusão:** Não queremos ser confundidos com plágio
3. **Manutenibilidade:** Nomenclatura consistente facilita manutenção
4. **Escalabilidade:** Sistema próprio pode evoluir independentemente

---

## 🔴 **O QUE NUNCA FAZER**

### **❌ NUNCA use prefixos específicos da Stays.net:**

- `_id` → `_idlisting`, `_idclient`, `_idreservation`, `_idproperty`
- `_f_` → `_f_total`, `_f_expected`, `_f_nightPrice`
- `_i_` → `_i_maxGuests`, `_i_rooms`, `_i_beds`
- `_t_` → `_t_typeMeta`, `_t_propertyTypeMeta`
- `_ms` → `_msdesc`, `_mstitle`
- `_mcval` → Valores multi-moeda

### **❌ NUNCA deixe campos da Stays.net sem conversão:**

```typescript
// ❌ ERRADO - Copiando nomenclatura da Stays.net
interface Reservation {
  _idlisting: string;      // ❌ Prefixo _id da Stays.net
  _idclient: string;       // ❌ Prefixo _id da Stays.net
  _f_total: number;        // ❌ Prefixo _f_ da Stays.net
  _i_maxGuests: number;   // ❌ Prefixo _i_ da Stays.net
  _t_typeMeta: any;        // ❌ Prefixo _t_ da Stays.net
  _msdesc: string;         // ❌ Prefixo _ms da Stays.net
}
```

---

## ✅ **O QUE SEMPRE FAZER**

### **✅ SEMPRE converta em mappers dedicados:**

```typescript
// ✅ CORRETO - Interface Rendizy com nomenclatura própria
interface Reservation {
  listing_id: string;      // ✅ Nomenclatura Rendizy
  client_id: string;       // ✅ Nomenclatura Rendizy
  total: number;           // ✅ Nomenclatura universal
  max_guests: number;      // ✅ Nomenclatura Rendizy
  type_metadata: any;      // ✅ Nomenclatura Rendizy
  description: string;     // ✅ Nomenclatura universal
}

// ✅ CORRETO - Mapper que converte
function staysNetToRendizy(staysReservation: StaysNetReservation): Reservation {
  return {
    listing_id: staysReservation._idlisting,      // ✅ Conversão
    client_id: staysReservation._idclient,        // ✅ Conversão
    total: staysReservation._f_total,              // ✅ Conversão
    max_guests: staysReservation._i_maxGuests,     // ✅ Conversão
    type_metadata: staysReservation._t_typeMeta,   // ✅ Conversão
    description: staysReservation._msdesc,         // ✅ Conversão
  };
}
```

---

## 📊 **TABELA DE CONVERSÃO OBRIGATÓRIA**

| Stays.net | Rendizy | Tipo | Exemplo |
|-----------|---------|------|---------|
| `_idlisting` | `listing_id` | ID de referência | `"684588d637afedcfad050fdf"` |
| `_idclient` | `client_id` | ID de referência | `"6911f167f874c6f3dfbff3f1"` |
| `_idreservation` | `reservation_id` | ID de referência | `"6911f168f874c6f3dfbff43e"` |
| `_idproperty` | `property_id` | ID de referência | `"68fa7c7dbbef2f46d5bff961"` |
| `_f_total` | `total` ou `total_amount` | Valor monetário | `3859.85` |
| `_f_expected` | `expected_total` | Valor esperado | `3540.05` |
| `_f_nightPrice` | `price_per_night` | Preço por noite | `2820.05` |
| `_i_maxGuests` | `max_guests` | Número inteiro | `4` |
| `_i_rooms` | `bedrooms` | Número de quartos | `1` |
| `_i_beds` | `beds` | Número de camas | `2` |
| `_t_typeMeta` | `type_metadata` | Metadados de tipo | `{ _mstitle: {...} }` |
| `_msdesc` | `description` | Descrição | `"Apartamento..."` |
| `_mstitle` | `title` | Título | `"Apartamento(1)..."` |
| `_mcval` | `currency_values` | Valores multi-moeda | `{ BRL: 3859.85 }` |

---

## 🔍 **CAMPOS UNIVERSAIS (PODEM SER USADOS)**

Estes campos são universais e podem ser usados diretamente:

- ✅ `id` (sem prefixo)
- ✅ `name`
- ✅ `email`
- ✅ `phone`
- ✅ `status`
- ✅ `createdAt` / `created_at`
- ✅ `updatedAt` / `updated_at`
- ✅ `reservation` (conceito universal)
- ✅ `client` (conceito universal)
- ✅ `property` (conceito universal)

**Regra:** Se o campo não tem prefixo específico da Stays.net (`_id`, `_f_`, `_i_`, `_t_`, `_ms`, `_mcval`), pode ser usado diretamente.

---

## 📝 **CHECKLIST OBRIGATÓRIO**

Antes de usar qualquer campo da Stays.net:

- [ ] **O campo tem prefixo específico?** (`_id`, `_f_`, `_i_`, `_t_`, `_ms`, `_mcval`)
  - [ ] **SIM** → ❌ **NÃO USAR DIRETAMENTE** → ✅ **CONVERTER no mapper**
  - [ ] **NÃO** → ✅ **Pode usar diretamente** (se for universal)

- [ ] **Criei um mapper dedicado?**
  - [ ] **SIM** → ✅ **Bom!**
  - [ ] **NÃO** → ❌ **CRIAR mapper antes de usar**

- [ ] **O campo está na interface Rendizy?**
  - [ ] **SIM** → ✅ **Verificar se nomenclatura é própria**
  - [ ] **NÃO** → ❌ **Adicionar à interface com nomenclatura própria**

---

## 🛠️ **IMPLEMENTAÇÃO CORRETA**

### **1. Interface Stays.net (apenas para receber dados):**
```typescript
// ✅ OK - Interface apenas para receber dados da API
interface StaysNetReservation {
  _idlisting?: string;     // ✅ OK - apenas para receber
  _idclient?: string;      // ✅ OK - apenas para receber
  _f_total?: number;       // ✅ OK - apenas para receber
}
```

### **2. Interface Rendizy (nomenclatura própria):**
```typescript
// ✅ OK - Interface Rendizy com nomenclatura própria
interface Reservation {
  listing_id: string;      // ✅ Nomenclatura Rendizy
  client_id: string;       // ✅ Nomenclatura Rendizy
  total: number;           // ✅ Nomenclatura universal
}
```

### **3. Mapper (conversão obrigatória):**
```typescript
// ✅ OK - Mapper converte nomenclatura
function staysNetToRendizy(stays: StaysNetReservation): Reservation {
  return {
    listing_id: stays._idlisting || '',  // ✅ Conversão
    client_id: stays._idclient || '',     // ✅ Conversão
    total: stays._f_total || 0,           // ✅ Conversão
  };
}
```

---

## 🚨 **VALIDAÇÃO AUTOMÁTICA**

O script `validar-regras.ps1` deve verificar:

1. ❌ Campos com prefixos `_id`, `_f_`, `_i_`, `_t_`, `_ms`, `_mcval` em interfaces Rendizy
2. ❌ Uso direto de campos da Stays.net sem conversão
3. ✅ Mappers dedicados para conversão

---

## 📚 **EXEMPLOS PRÁTICOS**

### **✅ CORRETO:**
```typescript
// Mapper dedicado
export function staysNetReservationToRendizy(
  staysRes: StaysNetReservation,
  propertyId: string,  // ✅ Já convertido
  guestId: string     // ✅ Já convertido
): Reservation {
  return {
    id: staysRes._id || staysRes.id,  // ✅ OK - id é universal
    property_id: propertyId,           // ✅ Nomenclatura Rendizy
    guest_id: guestId,                 // ✅ Nomenclatura Rendizy
    total: staysRes._f_total || 0,     // ✅ Convertido de _f_total
    max_guests: staysRes._i_maxGuests || 2, // ✅ Convertido de _i_maxGuests
  };
}
```

### **❌ ERRADO:**
```typescript
// ❌ ERRADO - Usando campos da Stays.net diretamente
export function createReservation(staysRes: StaysNetReservation) {
  return {
    _idlisting: staysRes._idlisting,  // ❌ Prefixo _id da Stays.net
    _idclient: staysRes._idclient,   // ❌ Prefixo _id da Stays.net
    _f_total: staysRes._f_total,      // ❌ Prefixo _f_ da Stays.net
  };
}
```

---

## 🎯 **RESUMO**

### **❌ NUNCA:**
1. Copiar nomenclatura de campos específicos da Stays.net
2. Usar prefixos `_id`, `_f_`, `_i_`, `_t_`, `_ms`, `_mcval` no código Rendizy
3. Deixar campos da Stays.net sem conversão

### **✅ SEMPRE:**
1. Converter campos da Stays.net em mappers dedicados
2. Usar nomenclatura própria e consistente do Rendizy
3. Manter interfaces Rendizy limpas (sem prefixos da Stays.net)

---

**Última atualização:** 22/11/2025  
**Status:** ✅ **REGRA DE OURO ESTABELECIDA - NUNCA VIOLAR**

