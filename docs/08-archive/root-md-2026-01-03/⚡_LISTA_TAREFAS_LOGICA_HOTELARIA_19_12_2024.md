# ✅ LISTA DE TAREFAS E VERIFICAÇÃO - LÓGICA HOTELEIRA
**Data**: 19 de Dezembro de 2024  
**Versão**: v1.0.103.403  
**Contexto**: Bug de contagem de diárias (seleciona 2 noites mas conta 3)

---

## 🔴 PROBLEMA CRÍTICO IDENTIFICADO

### **BUG: Contagem incorreta de diárias**

**COMPORTAMENTO ATUAL (ERRADO):**
```
Usuário seleciona: 26/12 → 28/12 (2 noites)
Sistema calcula: 3 diárias ❌
Razão: checkOut - checkIn = 28-26 = 2 dias, mas adiciona +1 = 3 diárias
```

**COMPORTAMENTO ESPERADO (CORRETO):**
```
Check-in: 26/12 (14:00)
Check-out: 28/12 (12:00)
Noites ocupadas: 26/12 (noite) + 27/12 (noite) = 2 NOITES ✅
Diárias: 2 ✅
```

**LÓGICA HOTELEIRA CORRETA:**
- **Check-in**: Dia 26 às 14:00 → Hóspede dorme dia 26
- **Noite 1**: Dia 26/12 (dorme e acorda dia 27)
- **Noite 2**: Dia 27/12 (dorme e acorda dia 28)
- **Check-out**: Dia 28 às 12:00 → NÃO dorme dia 28
- **Total**: 2 noites, 2 diárias

---

## 📋 CHECKLIST DE VERIFICAÇÃO E CORREÇÃO

### **TAREFA 1: Verificar Cálculo de Noites no CreateReservationWizard** 🔴 CRÍTICO

**Arquivo**: `components/CreateReservationWizard.tsx` (linha ~373)

**Código Atual**:
```typescript
const nights = effectiveStartDate && effectiveEndDate 
  ? Math.ceil((effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (1000 * 60 * 60 * 24))
  : 0;
```

**PROBLEMA**: `Math.ceil()` sempre arredonda para cima, mesmo quando não deveria.

**Teste**:
- [ ] Selecionar: 26/12 → 28/12
- [ ] Verificar: `nights` mostra 3 ❌ (ERRADO)
- [ ] Deveria mostrar: 2 ✅ (CORRETO)

**Solução Correta**:
```typescript
const nights = effectiveStartDate && effectiveEndDate 
  ? Math.floor((effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (1000 * 60 * 60 * 24))
  : 0;
```

**OU (mais seguro)**:
```typescript
const calculateNights = (checkIn: Date, checkOut: Date): number => {
  const checkInDate = new Date(checkIn);
  checkInDate.setHours(0, 0, 0, 0);
  
  const checkOutDate = new Date(checkOut);
  checkOutDate.setHours(0, 0, 0, 0);
  
  const diffTime = checkOutDate.getTime() - checkInDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  return Math.floor(diffDays); // Nunca arredondar para cima
};

const nights = effectiveStartDate && effectiveEndDate 
  ? calculateNights(effectiveStartDate, effectiveEndDate)
  : 0;
```

**Ações**:
- [ ] Substituir `Math.ceil` por `Math.floor`
- [ ] Testar com datas: 26/12 → 28/12
- [ ] Verificar resultado: 2 noites ✅
- [ ] Testar com outras datas
- [ ] Verificar preço total atualiza corretamente

---

### **TAREFA 2: Verificar Cálculo de Noites no ReservationDetailsModal** 🔴 CRÍTICO

**Arquivo**: `components/ReservationDetailsModal.tsx` (linha ~208)

**Código Atual**:
```typescript
const nights = Math.ceil((reservation.checkOut.getTime() - reservation.checkIn.getTime()) / (1000 * 60 * 60 * 24));
```

**PROBLEMA**: Mesmo erro - `Math.ceil()` arredonda para cima.

**Solução Correta**:
```typescript
const calculateNights = (checkIn: Date, checkOut: Date): number => {
  const checkInDate = new Date(checkIn);
  checkInDate.setHours(0, 0, 0, 0);
  
  const checkOutDate = new Date(checkOut);
  checkOutDate.setHours(0, 0, 0, 0);
  
  const diffTime = checkOutDate.getTime() - checkInDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  return Math.floor(diffDays);
};

const nights = calculateNights(reservation.checkIn, reservation.checkOut);
```

**Ações**:
- [ ] Substituir `Math.ceil` por função `calculateNights`
- [ ] Testar com reserva existente
- [ ] Verificar modal mostra noites corretas
- [ ] Verificar cálculo de preço por noite correto

---

### **TAREFA 3: Verificar Lógica Hoteleira no Backend** 🔴 CRÍTICO

**Arquivo**: `supabase/functions/rendizy-server/routes-reservations.ts`

**Funções a Verificar**:

#### 3.1. `calculateNights()`
```typescript
function calculateNights(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end.getTime() - start.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  // ✅ USAR Math.floor (nunca Math.ceil)
  return Math.floor(diffDays);
}
```

**Ações**:
- [ ] Localizar função `calculateNights` no backend
- [ ] Verificar se usa `Math.floor` ou `Math.ceil`
- [ ] Se usar `Math.ceil`, CORRIGIR para `Math.floor`
- [ ] Testar cálculo no backend

#### 3.2. `datesOverlap()` - Lógica de Sobreposição
```typescript
function datesOverlap(
  checkIn1: string, 
  checkOut1: string, 
  checkIn2: string, 
  checkOut2: string
): boolean {
  const start1 = new Date(checkIn1);
  const end1 = new Date(checkOut1);
  const start2 = new Date(checkIn2);
  const end2 = new Date(checkOut2);
  
  start1.setHours(0, 0, 0, 0);
  end1.setHours(0, 0, 0, 0);
  start2.setHours(0, 0, 0, 0);
  end2.setHours(0, 0, 0, 0);
  
  // ✅ LÓGICA HOTELEIRA: Check-out NÃO ocupa o dia
  // Reserva A (24→26) e Reserva B (26→28) NÃO se sobrepõem
  return start1 < end2 && end1 > start2;
}
```

**Ações**:
- [ ] Verificar implementação de `datesOverlap`
- [ ] Confirmar lógica: `start1 < end2 && end1 > start2`
- [ ] Testar cenário: Reserva (24→26) + Reserva (26→28) = SEM conflito ✅
- [ ] Testar cenário: Reserva (24→26) + Reserva (25→27) = COM conflito ❌

#### 3.3. `getOccupiedDates()` - Datas Ocupadas
```typescript
function getOccupiedDates(checkIn: string, checkOut: string): string[] {
  const dates: string[] = [];
  const current = new Date(checkIn);
  current.setHours(0, 0, 0, 0);
  
  const end = new Date(checkOut);
  end.setHours(0, 0, 0, 0);
  
  // ✅ Check-in ocupa, check-out NÃO ocupa
  while (current < end) { // <-- NÃO <=
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}
```

**Ações**:
- [ ] Verificar condição do loop: `current < end` (NÃO `<=`)
- [ ] Testar com (26→28): Deve retornar ['2024-12-26', '2024-12-27'] ✅
- [ ] Verificar não inclui check-out date

---

### **TAREFA 4: Verificar Validação de Disponibilidade** ⚠️ IMPORTANTE

**Arquivo**: `components/CreateReservationWizard.tsx` (função `checkAvailability`)

**Lógica Atual (linhas ~294-370)**:
```typescript
const checkAvailability = async (...) => {
  // Verificar reservas existentes
  const hasConflict = newCheckIn < rCheckOut && newCheckOut > rCheckIn;
  
  // ✅ Esta lógica está CORRETA
  // Reserva (24→26) + Nova (26→28) = NÃO conflita
  // Reserva (24→26) + Nova (25→27) = CONFLITA
}
```

**Ações**:
- [ ] Verificar lógica de overlap está correta
- [ ] Testar cenário: Criar reserva (26→28) após reserva (24→26)
- [ ] Deve permitir (sem conflito) ✅
- [ ] Testar cenário: Criar reserva (25→27) sobre reserva (24→26)
- [ ] Deve bloquear (com conflito) ❌

---

### **TAREFA 5: Verificar Renderização no Calendário** ⚠️ IMPORTANTE

**Arquivo**: `components/CalendarGrid.tsx`

**Funções a Verificar**:

#### 5.1. `getReservationForPropertyAndDate()`
```typescript
const getReservationForPropertyAndDate = (...): Reservation | null => {
  return reservations.find(r => {
    const checkIn = new Date(r.checkIn);
    const checkOut = new Date(r.checkOut);
    checkIn.setHours(0, 0, 0, 0);
    checkOut.setHours(0, 0, 0, 0);
    const currentDate = new Date(date);
    currentDate.setHours(0, 0, 0, 0);
    
    // ✅ LÓGICA HOTELEIRA: Check-in ocupa, check-out NÃO ocupa
    return currentDate >= checkIn && currentDate < checkOut; // <-- NÃO <=
  }) || null;
};
```

**Ações**:
- [ ] Verificar condição: `currentDate < checkOut` (NÃO `<=`)
- [ ] Testar reserva (26→28): Deve ocupar células 26 e 27 apenas
- [ ] Célula 28 deve estar livre ✅

#### 5.2. Renderização da barra de reserva
```typescript
// Linha ~904
style={{
  left: '40px', // Check-in às 14h (meio da célula)
  width: `${(reservation.nights * 80) - 6}px` // Termina às 12h do último dia
}}
```

**Ações**:
- [ ] Verificar `reservation.nights` usa cálculo correto
- [ ] Testar reserva (26→28): Barra deve cobrir 2 células
- [ ] Verificar barra não sobrepõe próxima reserva

---

### **TAREFA 6: Verificar "Property not found" no Bloqueio** 🔴 CRÍTICO

**Contexto**: Erro frequente ao criar bloqueios no calendário

**Arquivo**: `components/BlockModal.tsx`

**Possíveis Causas**:
1. PropertyId não está sendo passado corretamente
2. Property não existe em `anuncios_drafts`
3. Backend não encontra property no KV Store ou SQL

**Ações**:
- [ ] Abrir DevTools Console (F12)
- [ ] Tentar criar bloqueio
- [ ] Verificar logs:
  ```
  📤 [BlockModal] Property ID: [id]
  📤 [BlockModal] Enviando para API...
  📥 [BlockModal] Resposta: {error: "Property not found"}
  ```
- [ ] Se erro ocorrer, verificar:
  - [ ] PropertyId está correto?
  - [ ] Property existe em `anuncios_drafts`?
  - [ ] Backend está buscando em `anuncios_drafts`?

**Solução Provável**:
Backend deve buscar property em `anuncios_drafts` (SQL), não em KV Store.

```typescript
// Backend: routes-calendar.ts
const property = await db.query(
  'SELECT * FROM anuncios_drafts WHERE id = $1 AND organization_id = $2',
  [propertyId, tenantId]
);

if (!property.rows[0]) {
  return c.json({ success: false, error: 'Property not found' }, 404);
}
```

---

### **TAREFA 7: Verificar Modal de Detalhes da Reserva (5 Steps)** ⚠️ IMPORTANTE

**Arquivo**: `components/ReservationDetailsModal.tsx`

**Documentação Esperada**: Modal deve ter 5 tabs/steps

**Verificar**:
- [ ] Quantas tabs o modal tem atualmente?
- [ ] Quais são os steps esperados?
  1. **Informações Gerais** (hóspede, propriedade, datas)
  2. **Financeiro** (preços, pagamento)
  3. **Comunicação** (mensagens, notas)
  4. **Check-in/Check-out** (detalhes da estadia)
  5. **Histórico** (alterações, logs)

**Ações**:
- [ ] Abrir modal de detalhes de uma reserva
- [ ] Contar quantas tabs existem
- [ ] Verificar se todas as 5 estão implementadas
- [ ] Se faltam tabs, revisar documentação e implementar

---

### **TAREFA 8: Criar Função Utilitária Global** 🔵 MELHORIA

**Arquivo**: Criar `utils/dateHelpers.ts`

**Objetivo**: Centralizar lógica de cálculo de noites

```typescript
// utils/dateHelpers.ts

/**
 * Calcula número de noites entre duas datas
 * LÓGICA HOTELEIRA: Check-in ocupa, check-out NÃO ocupa
 * 
 * Exemplo:
 *   Check-in: 26/12, Check-out: 28/12
 *   Noites: 26 (noite) + 27 (noite) = 2 noites
 */
export function calculateNights(checkIn: Date | string, checkOut: Date | string): number {
  const startDate = typeof checkIn === 'string' ? new Date(checkIn) : new Date(checkIn);
  const endDate = typeof checkOut === 'string' ? new Date(checkOut) : new Date(checkOut);
  
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  // SEMPRE usar Math.floor (nunca Math.ceil)
  return Math.floor(diffDays);
}

/**
 * Verifica se duas reservas se sobrepõem
 * LÓGICA HOTELEIRA: Check-out NÃO ocupa o dia
 * 
 * Exemplo:
 *   Reserva A: 24→26
 *   Reserva B: 26→28
 *   Resultado: NÃO se sobrepõem (26 está livre após check-out de A)
 */
export function datesOverlap(
  checkIn1: Date | string,
  checkOut1: Date | string,
  checkIn2: Date | string,
  checkOut2: Date | string
): boolean {
  const start1 = typeof checkIn1 === 'string' ? new Date(checkIn1) : new Date(checkIn1);
  const end1 = typeof checkOut1 === 'string' ? new Date(checkOut1) : new Date(checkOut1);
  const start2 = typeof checkIn2 === 'string' ? new Date(checkIn2) : new Date(checkIn2);
  const end2 = typeof checkOut2 === 'string' ? new Date(checkOut2) : new Date(checkOut2);
  
  start1.setHours(0, 0, 0, 0);
  end1.setHours(0, 0, 0, 0);
  start2.setHours(0, 0, 0, 0);
  end2.setHours(0, 0, 0, 0);
  
  return start1.getTime() < end2.getTime() && end1.getTime() > start2.getTime();
}

/**
 * Retorna array de datas ocupadas por uma reserva
 * LÓGICA HOTELEIRA: Check-in ocupa, check-out NÃO ocupa
 * 
 * Exemplo:
 *   Check-in: 26/12, Check-out: 28/12
 *   Resultado: ['2024-12-26', '2024-12-27']
 */
export function getOccupiedDates(checkIn: Date | string, checkOut: Date | string): string[] {
  const dates: string[] = [];
  const current = typeof checkIn === 'string' ? new Date(checkIn) : new Date(checkIn);
  const end = typeof checkOut === 'string' ? new Date(checkOut) : new Date(checkOut);
  
  current.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  // Loop até (mas não incluindo) check-out
  while (current.getTime() < end.getTime()) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}
```

**Ações**:
- [ ] Criar arquivo `utils/dateHelpers.ts`
- [ ] Implementar as 3 funções acima
- [ ] Adicionar testes unitários
- [ ] Substituir cálculos inline nos componentes por estas funções

---

## 📊 RESUMO DE PRIORIDADES

### 🔴 CRÍTICO (Fazer AGORA)
1. ✅ **TAREFA 1**: Corrigir cálculo de noites no `CreateReservationWizard`
2. ✅ **TAREFA 2**: Corrigir cálculo de noites no `ReservationDetailsModal`
3. ✅ **TAREFA 3**: Verificar/corrigir backend (`calculateNights`, `datesOverlap`, `getOccupiedDates`)
4. ✅ **TAREFA 6**: Resolver "Property not found" nos bloqueios

### ⚠️ IMPORTANTE (Fazer DEPOIS)
5. ✅ **TAREFA 4**: Validar lógica de disponibilidade
6. ✅ **TAREFA 5**: Verificar renderização no calendário
7. ✅ **TAREFA 7**: Verificar modal de 5 steps

### 🔵 MELHORIA (Fazer QUANDO POSSÍVEL)
8. ✅ **TAREFA 8**: Criar funções utilitárias globais

---

## 🧪 PLANO DE TESTES

### Teste 1: Contagem de Noites
```
Cenário: Criar reserva 26/12 → 28/12
Resultado Esperado: 2 noites ✅
Verificar em:
- [ ] CreateReservationWizard (interface)
- [ ] ReservationDetailsModal (detalhes)
- [ ] Banco de dados (campo nights)
- [ ] Backend logs (cálculo)
```

### Teste 2: Check-out e Check-in no Mesmo Dia
```
Cenário: 
  Reserva A: 24/12 → 26/12 (2 noites)
  Reserva B: 26/12 → 28/12 (2 noites)
  
Resultado Esperado: 
  ✅ PERMITIDO (sem conflito)
  Dia 26: Hóspede A sai às 12:00, Hóspede B entra às 14:00

Verificar:
- [ ] Sistema permite criar Reserva B
- [ ] Não mostra conflito
- [ ] Calendário renderiza corretamente
```

### Teste 3: Bloqueio com Property
```
Cenário: Criar bloqueio para propriedade existente
Resultado Esperado: Bloqueio criado com sucesso ✅

Se falhar com "Property not found":
- [ ] Verificar propertyId está correto
- [ ] Verificar backend busca em SQL (não KV)
- [ ] Verificar organization_id correto
```

---

## 📝 DOCUMENTAÇÃO A REVISAR

**Documentos para Ler**:
- [x] `ARQUITETURA_MOTOR_RESERVAS_HOTELARIA.md`
- [x] `⚡_TESTE_CRIACAO_RESERVA_v1.0.103.352.md`
- [ ] `PADRONIZACAO_FINAL_RESERVA_BLOQUEIO_v1.0.59.md`
- [ ] `⚡_ANALISE_FLUXO_MODAL_CALENDARIO_v1.0.103.351.md`
- [ ] `ALINHAMENTO_MODULO_RESERVAS_v1.0.73.md`

**Buscar nos Documentos**:
- Lógica de cálculo de noites (diárias)
- Lógica de sobreposição (check-out + check-in mesmo dia)
- Implementações esperadas vs implementadas
- Property not found (causas e soluções)

---

## ✅ CHECKLIST FINAL

Após completar todas as tarefas acima:

- [ ] Código corrigido e commitado
- [ ] Testes manuais realizados
- [ ] Bug de 3 diárias resolvido
- [ ] Check-out + check-in mesmo dia funciona
- [ ] Property not found resolvido
- [ ] Modal de 5 steps verificado/implementado
- [ ] Documentação atualizada
- [ ] Edge Function re-deployada

---

**Gerado por**: GitHub Copilot  
**Data**: 19/12/2024 20:30  
**Próxima Ação**: Começar pela TAREFA 1 (corrigir `Math.ceil` → `Math.floor`)
