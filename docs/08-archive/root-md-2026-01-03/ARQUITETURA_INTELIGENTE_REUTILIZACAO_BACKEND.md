# 🧠 Arquitetura Inteligente: Reutilização do Backend Existente

**Data:** 2025-12-02  
**Objetivo:** Evitar duplicação e reutilizar ao máximo o que já existe no RENDIZY

---

## ✅ O QUE JÁ EXISTE NO BACKEND

### **1. Sistema de Reservas Completo** (`routes-reservations.ts`)

#### **Funções Exportadas:**
- ✅ `listReservations(c: Context)` - Lista reservas
- ✅ `getReservation(c: Context)` - Busca reserva por ID
- ✅ `checkAvailability(c: Context)` - **Verifica disponibilidade completa**
- ✅ `createReservation(c: Context)` - **Cria reserva completa**
- ✅ `updateReservation(c: Context)` - Atualiza reserva
- ✅ `cancelReservation(c: Context)` - Cancela reserva
- ✅ `deleteReservation(c: Context)` - Deleta reserva
- ✅ `detectConflicts(c: Context)` - Detecta conflitos

#### **Rotas Já Registradas** (`index.ts`):
```
POST /reservations/check-availability
GET  /reservations
POST /reservations
GET  /reservations/:id
PUT  /reservations/:id
DELETE /reservations/:id
POST /reservations/:id/cancel
GET  /reservations/detect-conflicts
```

#### **Funcionalidades Implementadas:**
- ✅ Validação de datas (`validateDateRange`)
- ✅ Cálculo de noites (`calculateNights`)
- ✅ Verificação de sobreposição (`datesOverlap`)
- ✅ Verificação de conflitos com reservas existentes
- ✅ Verificação de blocks
- ✅ Cálculo de preços (com descontos semanais/mensais)
- ✅ Validação de mínimo de noites
- ✅ Multi-tenant (filtro por `organization_id`)
- ✅ Migração para SQL completa

### **2. Sistema de Blocks** (`routes-blocks.ts`)
- ✅ Criação, listagem, atualização, deleção de blocks
- ✅ Integrado com sistema de disponibilidade

### **3. Sistema de Hóspedes** (`routes-guests.ts`)
- ✅ Criação, listagem, busca de hóspedes
- ✅ Integrado com reservas

### **4. Sistema de Propriedades** (`routes-properties.ts`)
- ✅ Listagem, criação, atualização de propriedades
- ✅ Busca por organização

---

## ❌ O QUE EU FIZ DE ERRADO

### **Duplicação de Código:**
1. **Reimplementei `checkAvailability`** quando já existe uma função completa
2. **Reimplementei `createReservation`** quando já existe uma função completa
3. **Reimplementei validações** que já existem (`validateDateRange`, `calculateNights`, etc)
4. **Criei novas rotas** quando deveria reutilizar as existentes

### **Problemas:**
- Código duplicado = manutenção duplicada
- Lógica diferente pode causar bugs
- Não aproveita melhorias futuras do sistema principal
- Viola princípio DRY (Don't Repeat Yourself)

---

## ✅ SOLUÇÃO INTELIGENTE: ADAPTER PATTERN

### **Estratégia:**
Criar **wrappers/adapters** nas rotas de `client-sites` que:
1. **Mapeiam subdomain → organization_id**
2. **Criam um Context fake** com `organization_id` extraído do subdomain
3. **Chamam as funções existentes** (`checkAvailability`, `createReservation`)
4. **Adaptam a resposta** para o formato esperado pelo site público

### **Arquitetura:**

```
┌─────────────────────────────────────────────────┐
│  Site Público (medhome.rendizy.app)            │
│  GET /api/medhome/availability                  │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  routes-client-sites.ts                         │
│  - Extrai subdomain → organization_id           │
│  - Cria Context adaptado                        │
│  - Chama função existente                       │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  routes-reservations.ts                        │
│  - checkAvailability(c: Context) ✅ EXISTE     │
│  - createReservation(c: Context) ✅ EXISTE     │
└─────────────────────────────────────────────────┘
```

---

## 🛠️ IMPLEMENTAÇÃO CORRETA

### **1. Helper: Criar Context Adaptado**

```typescript
// routes-client-sites.ts

import { Context } from 'npm:hono';
import * as reservationsRoutes from './routes-reservations.ts';

/**
 * Cria um Context adaptado para chamar funções existentes
 * sem necessidade de autenticação
 */
function createPublicContext(
  originalContext: Context,
  organizationId: string
): Context {
  // Criar um novo request com organization_id no header
  const adaptedRequest = {
    ...originalContext.req,
    header: (name: string) => {
      if (name === 'X-Organization-Id') {
        return organizationId;
      }
      return originalContext.req.header(name);
    },
    // Adicionar organization_id ao query params se necessário
    query: (key: string) => {
      if (key === 'organization_id') {
        return organizationId;
      }
      return originalContext.req.query(key);
    },
  };

  // Criar Context adaptado
  const adaptedContext = {
    ...originalContext,
    req: adaptedRequest,
  } as Context;

  return adaptedContext;
}
```

### **2. API de Disponibilidade (Reutilizando)**

```typescript
// GET /api/:subdomain/availability
app.get("/api/:subdomain/availability", async (c) => {
  try {
    const subdomain = c.req.param("subdomain");

    // 1. Buscar organization_id pelo subdomain
    const supabase = getSupabaseClient();
    const { data: sqlSite } = await supabase
      .from("client_sites")
      .select("organization_id")
      .eq("subdomain", subdomain)
      .eq("is_active", true)
      .maybeSingle();

    if (!sqlSite) {
      return c.json({ success: false, error: "Site não encontrado" }, 404);
    }

    const organizationId = sqlSite.organization_id;

    // 2. Criar Context adaptado
    const adaptedContext = createPublicContext(c, organizationId);

    // 3. Chamar função existente
    return await reservationsRoutes.checkAvailability(adaptedContext);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
```

### **3. API de Reservas (Reutilizando)**

```typescript
// POST /api/:subdomain/bookings
app.post("/api/:subdomain/bookings", async (c) => {
  try {
    const subdomain = c.req.param("subdomain");
    const bookingData = await c.req.json();

    // 1. Buscar organization_id pelo subdomain
    const supabase = getSupabaseClient();
    const { data: sqlSite } = await supabase
      .from("client_sites")
      .select("organization_id")
      .eq("subdomain", subdomain)
      .eq("is_active", true)
      .maybeSingle();

    if (!sqlSite) {
      return c.json({ success: false, error: "Site não encontrado" }, 404);
    }

    const organizationId = sqlSite.organization_id;

    // 2. Adaptar dados para formato esperado pela função existente
    // A função createReservation espera guest_id, mas recebemos guestName/guestEmail
    // Precisamos criar ou buscar hóspede primeiro
    const guest = await findOrCreateGuest(organizationId, {
      name: bookingData.guestName,
      email: bookingData.guestEmail,
      phone: bookingData.guestPhone,
    });

    // 3. Criar payload no formato esperado
    const reservationPayload = {
      property_id: bookingData.propertyId,
      guest_id: guest.id,
      check_in: bookingData.checkIn,
      check_out: bookingData.checkOut,
      guests_count: bookingData.guestsCount || 1,
      // Outros campos opcionais
    };

    // 4. Criar Context adaptado e chamar função existente
    const adaptedContext = createPublicContext(c, organizationId);
    
    // Modificar o body do request para incluir o payload
    adaptedContext.req.json = async () => reservationPayload;

    return await reservationsRoutes.createReservation(adaptedContext);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
```

---

## 📋 CHECKLIST: O QUE PRECISA SER FEITO

### **✅ Reutilizar (Já Existe):**
- [x] `checkAvailability` - Função completa
- [x] `createReservation` - Função completa
- [x] `validateDateRange` - Validação de datas
- [x] `calculateNights` - Cálculo de noites
- [x] `datesOverlap` - Verificação de sobreposição
- [x] Sistema de blocks
- [x] Sistema de hóspedes
- [x] Sistema de propriedades

### **🔄 Adaptar (Precisa Wrapper):**
- [ ] Mapear subdomain → organization_id
- [ ] Criar Context adaptado (sem autenticação)
- [ ] Adaptar formato de entrada (guestName/guestEmail → guest_id)
- [ ] Adaptar formato de saída (se necessário)

### **➕ Criar (Novo):**
- [ ] Helper `createPublicContext()` - Context sem autenticação
- [ ] Helper `findOrCreateGuest()` - Buscar ou criar hóspede
- [ ] Rotas públicas `/api/:subdomain/availability` e `/api/:subdomain/bookings`
- [ ] Documentação de integração

---

## 🎯 VANTAGENS DESTA ABORDAGEM

1. **Zero Duplicação:** Reutiliza 100% da lógica existente
2. **Manutenção Única:** Melhorias no sistema principal beneficiam sites públicos
3. **Consistência:** Mesma lógica = mesmos resultados
4. **Testabilidade:** Funções já testadas continuam funcionando
5. **Simplicidade:** Menos código = menos bugs

---

## ⚠️ DESAFIOS E SOLUÇÕES

### **Desafio 1: Autenticação**
**Problema:** Funções existentes esperam autenticação  
**Solução:** Context adaptado com `organization_id` no header/query

### **Desafio 2: Formato de Dados**
**Problema:** Site público envia `guestName/guestEmail`, função espera `guest_id`  
**Solução:** Helper `findOrCreateGuest()` antes de chamar função

### **Desafio 3: Resposta**
**Problema:** Formato de resposta pode ser diferente  
**Solução:** Adapter na resposta (se necessário)

---

## 📝 PRÓXIMOS PASSOS

1. **Refatorar `routes-client-sites.ts`:**
   - Remover código duplicado
   - Criar helpers de adaptação
   - Reutilizar funções existentes

2. **Testar:**
   - Verificar que disponibilidade funciona
   - Verificar que criação de reserva funciona
   - Garantir que não quebrou nada existente

3. **Documentar:**
   - Como funciona a integração
   - Exemplos de uso
   - Troubleshooting

---

**Status:** Plano de refatoração criado. Pronto para implementar.

