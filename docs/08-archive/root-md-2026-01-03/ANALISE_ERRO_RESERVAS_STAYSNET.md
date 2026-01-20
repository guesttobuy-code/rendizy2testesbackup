# 🔍 ANÁLISE DO ERRO: Reservas Stays.net

**Data:** 23/11/2025  
**Erro:** `invalid input syntax for type integer: "28.2005"`

---

## 📋 CONTEXTO DO ERRO

### **Onde está acontecendo:**
- **Tabela:** `reservations`
- **Operação:** `INSERT` (criar nova reserva)
- **Fonte:** Sincronização completa Stays.net (`/staysnet/import/full`)

### **Erro específico:**
```
invalid input syntax for type integer: "28.2005"
```

Isso significa que o PostgreSQL está recebendo uma **string** `"28.2005"` quando espera um **INTEGER**.

---

## 🔍 ANÁLISE TÉCNICA

### **1. Campos INTEGER na tabela `reservations`:**

Baseado no schema, os campos INTEGER são:
- `nights` - Número de noites (INTEGER NOT NULL)
- `guests_adults` - Número de adultos (INTEGER)
- `guests_children` - Número de crianças (INTEGER)
- `guests_infants` - Número de bebês (INTEGER)
- `guests_pets` - Número de pets (INTEGER)
- `guests_total` - Total de hóspedes (INTEGER)

### **2. Valores sendo passados:**

**No código (`staysnet-full-sync.ts` linha 494-498):**
```typescript
guests: {
  adults: staysRes._i_maxGuests || staysRes.guests?.adults || 1,
  children: staysRes.guests?.children || 0,
  infants: staysRes.guests?.infants || 0,
  pets: staysRes.guests?.pets || 0,
  total: staysRes._i_maxGuests || staysRes.guests?.total || 1,
},
```

**Problema identificado:**
- `staysRes._i_maxGuests` pode ser um **número decimal** (ex: `28.2005`)
- `staysRes.guests?.adults` pode ser um **número decimal**
- `staysRes.guests?.total` pode ser um **número decimal**

### **3. Onde o erro está acontecendo:**

O erro está acontecendo no **mapper** (`utils-reservation-mapper.ts` linha 42-46):
```typescript
guests_adults: reservation.guests?.adults || 1,
guests_children: reservation.guests?.children || 0,
guests_infants: reservation.guests?.infants || 0,
guests_pets: reservation.guests?.pets || 0,
guests_total: reservation.guests?.total || reservation.guests?.adults || 1,
```

**Problema:** Esses valores podem ser decimais, mas o banco espera INTEGER.

---

## ✅ SOLUÇÃO

### **Correção necessária:**

1. **No `staysnet-full-sync.ts`:** Garantir que todos os valores de `guests` sejam INTEGER:
```typescript
guests: {
  adults: Math.round(staysRes._i_maxGuests || staysRes.guests?.adults || 1),
  children: Math.round(staysRes.guests?.children || 0),
  infants: Math.round(staysRes.guests?.infants || 0),
  pets: Math.round(staysRes.guests?.pets || 0),
  total: Math.round(staysRes._i_maxGuests || staysRes.guests?.total || 1),
},
```

2. **No `utils-reservation-mapper.ts`:** Garantir INTEGER no mapper também:
```typescript
guests_adults: Math.round(reservation.guests?.adults || 1),
guests_children: Math.round(reservation.guests?.children || 0),
guests_infants: Math.round(reservation.guests?.infants || 0),
guests_pets: Math.round(reservation.guests?.pets || 0),
guests_total: Math.round(reservation.guests?.total || reservation.guests?.adults || 1),
```

---

## 🎯 RESUMO

**Erro:** Campo INTEGER recebendo valor decimal `"28.2005"`  
**Causa:** Valores de `guests` (adults, children, total) vindos da Stays.net podem ser decimais  
**Solução:** Arredondar todos os valores de `guests` para INTEGER usando `Math.round()`  
**Onde corrigir:** 
1. `staysnet-full-sync.ts` (linha 494-498)
2. `utils-reservation-mapper.ts` (linha 42-46)

---

## 📊 IMPACTO

- **20 reservas** estão falhando por causa deste erro
- **0 reservas** foram criadas até agora
- **20 hóspedes** e **21 propriedades** já foram sincronizados com sucesso

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Aplicar correção nos campos `guests`
2. ✅ Testar sincronização novamente
3. ✅ Validar criação de reservas e blocks no calendário

