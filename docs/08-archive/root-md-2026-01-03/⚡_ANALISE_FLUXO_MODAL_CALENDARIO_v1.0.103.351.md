# 🔍 ANÁLISE COMPLETA: Fluxo Modal Calendário → Imóveis + Hóspedes

**Data:** 16 de Dezembro de 2025  
**Versão:** v1.0.103.351  
**Componente:** CreateReservationWizard + CalendarPage

---

## 📊 FLUXO COMPLETO DO MODAL

### 1️⃣ **USUÁRIO CLICA EM DATA VAZIA NO CALENDÁRIO**

**Componente:** CalendarModule (visualização calendário)  
**Ação:** Usuário clica em célula vazia de uma data

```typescript
onClick={() => handleEmptyClick(propertyId, startDate, endDate)}
```

---

### 2️⃣ **APP.TSX INTERCEPTA E ABRE MODAL DE AÇÕES RÁPIDAS**

**Arquivo:** `App.tsx` linha 467-475

```typescript
const handleEmptyClick = (propertyId: string, startDate: Date, endDate: Date) => {
  setQuickActionsModal({
    open: true,
    propertyId,
    startDate,
    endDate
  });
};
```

**O que acontece:**
- ✅ Captura `propertyId` (ID do imóvel clicado)
- ✅ Captura `startDate` (data inicial)
- ✅ Captura `endDate` (data final)
- ✅ Abre modal com opções (Reserva, Cotação, Bloqueio, etc.)

---

### 3️⃣ **USUÁRIO ESCOLHE "CRIAR RESERVA"**

**Arquivo:** `App.tsx` linha 477-490

```typescript
const handleQuickAction = (action: 'reservation' | 'quote' | ...) => {
  const { propertyId, startDate, endDate } = quickActionsModal;
  setQuickActionsModal({ open: false });

  setTimeout(() => {
    if (action === 'reservation') {
      setCreateReservationWizard({
        open: true,
        propertyId,      // ✅ IMÓVEL IDENTIFICADO
        startDate,       // ✅ DATAS DEFINIDAS
        endDate
      });
    }
  }, 100);
};
```

**Estado criado:**
```typescript
createReservationWizard = {
  open: true,
  propertyId: "abc123",     // ✅ ID do imóvel
  startDate: Date object,
  endDate: Date object
}
```

---

### 4️⃣ **MODAL CreateReservationWizard ABRE**

**Arquivo:** `App.tsx` linha 1536-1543

```typescript
<CreateReservationWizard
  open={createReservationWizard.open}
  onClose={() => setCreateReservationWizard({ open: false })}
  
  // ✅ BUSCA IMÓVEL NA LISTA
  property={properties.find(p => p.id === createReservationWizard.propertyId)}
  
  startDate={createReservationWizard.startDate}
  endDate={createReservationWizard.endDate}
  onComplete={handleReservationComplete}
/>
```

**PROBLEMA IDENTIFICADO #1:**
```typescript
property={properties.find(p => p.id === createReservationWizard.propertyId)}
```

❌ **O App.tsx ainda usa o estado antigo `properties` do useState**  
❌ **NÃO está usando os imóveis da nova arquitetura (CalendarContext + React Query)**

**Onde `properties` está definido no App.tsx:**
```typescript
// Linha ~210
const [properties, setProperties] = useState<Property[]>([]);
```

Este estado está VAZIO porque a nova arquitetura usa CalendarContext!

---

## 🔴 PROBLEMA: DESCONEXÃO ENTRE CONTEXTOS

### Estado ANTIGO (App.tsx) - ❌ VAZIO
```typescript
const [properties, setProperties] = useState<Property[]>([]);
const [reservations, setReservations] = useState<Reservation[]>([]);
const [blocks, setBlocks] = useState<any[]>([]);
```

### Estado NOVO (CalendarContext) - ✅ POPULADO
```typescript
// contexts/CalendarContext.tsx
const [state, dispatch] = useReducer(calendarReducer, {
  properties: [],           // ✅ Populado via React Query
  selectedProperties: [],
  reservations: [],        // ✅ Populado via React Query
  blocks: [],              // ✅ Populado via React Query
  // ...
});
```

**Conclusão:**
- CalendarPage carrega imóveis via React Query → salva no CalendarContext
- App.tsx NÃO tem acesso ao CalendarContext
- CreateReservationWizard recebe `property={undefined}` ❌

---

## 5️⃣ **MODAL CARREGA HÓSPEDES (FUNCIONA!)**

**Arquivo:** `CreateReservationWizard.tsx` linha 206-228

```typescript
const loadGuests = async () => {
  setLoadingGuests(true);
  console.log('🔍 Carregando hóspedes...');
  try {
    const response = await guestsApi.list();  // ✅ CHAMA API DIRETAMENTE
    console.log('📦 Resposta da API de hóspedes:', response);
    if (response.success && response.data) {
      console.log(`✅ ${response.data.length} hóspedes carregados`);
      setGuests(response.data);
    } else {
      toast.info('Nenhum hóspede encontrado.');
    }
  } catch (error) {
    toast.error('Erro ao carregar hóspedes');
  } finally {
    setLoadingGuests(false);
  }
};

// Carrega quando abre step 2
useEffect(() => {
  if (open && step === 2 && guests.length === 0) {
    loadGuests();
  }
}, [open, step]);
```

✅ **HÓSPEDES FUNCIONAM** porque o modal chama `guestsApi.list()` diretamente, não depende de App.tsx!

---

## 6️⃣ **STEP 1: EXIBE IMÓVEL (PROBLEMA!)**

**Arquivo:** `CreateReservationWizard.tsx` linha 350-380

```typescript
{step === 1 && (
  <div className="p-4 border border-gray-200 rounded-lg">
    <div className="flex items-start gap-3">
      <img
        src={property?.image || 'https://...default'}  // ❌ property undefined
        alt={property?.name}                            // ❌ property undefined
        className="w-20 h-20 rounded-lg"
      />
      <div className="flex-1">
        <div className="text-gray-900">{property?.name}</div>  // ❌ undefined
        <div className="text-gray-900">R$ {totalPrice}</div>
        <div className="text-sm">R$ {basePrice} / noite</div>
        <div className="text-sm">{property?.location}</div>    // ❌ undefined
      </div>
    </div>
  </div>
)}
```

**Resultado Visual:**
- ✅ Mostra imagem padrão (fallback funciona)
- ❌ Nome do imóvel: vazio
- ❌ Localização: vazia
- ⚠️ Preço: usa `basePrice = 350.00` hardcoded (não vem do imóvel)

---

## 7️⃣ **STEP 2: SELECIONA HÓSPEDE (FUNCIONA!)**

**Arquivo:** `CreateReservationWizard.tsx` linha 490-550

```typescript
{step === 2 && (
  <div className="space-y-4">
    <div className="flex items-center gap-2 mb-4">
      <Input
        placeholder="Buscar por nome, email ou telefone..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="flex-1"
      />
      <Button onClick={() => setShowNewGuestForm(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Novo Hóspede
      </Button>
    </div>

    {/* Lista de hóspedes carregados */}
    {filteredGuests.map(guest => (
      <div
        key={guest.id}
        onClick={() => setSelectedGuest(guest)}
        className={cn(
          "p-4 border rounded-lg cursor-pointer",
          selectedGuest?.id === guest.id && "border-blue-500"
        )}
      >
        <div className="font-medium">{guest.fullName}</div>  // ✅ Funciona
        <div className="text-sm text-gray-500">{guest.email}</div>  // ✅ Funciona
        <div className="text-sm text-gray-500">{guest.phone}</div>  // ✅ Funciona
      </div>
    ))}
  </div>
)}
```

✅ **HÓSPEDES FUNCIONAM PERFEITAMENTE**

---

## 8️⃣ **STEP 3: CRIA RESERVA**

**Arquivo:** `CreateReservationWizard.tsx` linha 267-305

```typescript
const handleComplete = async () => {
  if (!property || !selectedGuest || !effectiveStartDate || !effectiveEndDate) {
    toast.error('Preencha todos os campos obrigatórios');
    return;
  }

  setCreating(true);
  try {
    const reservationData = {
      propertyId: property.id,        // ❌ property undefined → ERRO!
      guestId: selectedGuest.id,      // ✅ Funciona
      checkIn: effectiveStartDate.toISOString().split('T')[0],
      checkOut: effectiveEndDate.toISOString().split('T')[0],
      adults,
      children,
      platform,
      notes,
    };
    
    console.log('📤 Enviando dados da reserva:', reservationData);
    
    const response = await reservationsApi.create(reservationData);

    if (response.success) {
      toast.success('Reserva criada com sucesso!');
      onComplete(response.data);
      onClose();
    } else {
      toast.error(response.error || 'Erro ao criar reserva');
    }
  } catch (error) {
    toast.error('Erro ao criar reserva');
  } finally {
    setCreating(false);
  }
};
```

**Validação no início:**
```typescript
if (!property || !selectedGuest || !effectiveStartDate || !effectiveEndDate) {
  toast.error('Preencha todos os campos obrigatórios');
  return;  // ❌ PARA AQUI! property é undefined
}
```

---

## 🔴 PROBLEMAS IDENTIFICADOS

### 1. **Imóvel não é passado corretamente**

**Causa:** App.tsx usa `properties` do useState (vazio) ao invés do CalendarContext

**Linha problemática:**
```typescript
// App.tsx linha 1539
property={properties.find(p => p.id === createReservationWizard.propertyId)}
```

**Solução necessária:**
- App.tsx precisa acessar `properties` do CalendarContext
- Ou CreateReservationWizard precisa carregar o imóvel via API diretamente

### 2. **Preço hardcoded**

**Arquivo:** `CreateReservationWizard.tsx` linha 241
```typescript
const basePrice = 350.00;  // ❌ HARDCODED
```

**Solução necessária:**
- Usar `property?.pricing?.basePrice` quando property existir
- Fallback para 350 apenas se property for undefined

### 3. **Cálculo de pricing incompleto**

**Arquivo:** `CreateReservationWizard.tsx` linha 242-243
```typescript
const totalPrice = basePrice * nights;  // ❌ Não aplica descontos
```

**Backend calcula corretamente:**
- Desconto por duração (weekly, biweekly, monthly)
- Cleaning fee, service fee, taxes
- Tier aplicado (base, weekly, biweekly, monthly)

**Problema:** Frontend mostra preço simplificado que não bate com o real

---

## ✅ PONTOS POSITIVOS

### 1. **Hóspedes funcionam perfeitamente**
- ✅ Carrega lista via `guestsApi.list()`
- ✅ Permite busca por nome/email/telefone
- ✅ Permite criar novo hóspede inline
- ✅ Exibe informações completas (nome, email, telefone)

### 2. **Datas funcionam perfeitamente**
- ✅ Recebe datas do calendário
- ✅ Permite editar datas via DateRangePicker
- ✅ Calcula número de noites corretamente
- ✅ Valida período

### 3. **API de reservations está pronta**
- ✅ Backend valida property_id
- ✅ Backend valida guest_id
- ✅ Backend calcula pricing correto
- ✅ Backend cria reserva no banco

---

## 🔧 SOLUÇÕES PROPOSTAS

### **Solução 1: CreateReservationWizard carrega imóvel via API** ⭐ RECOMENDADA

**Vantagem:** Não depende de App.tsx ou CalendarContext  
**Implementação:** Similar ao que já funciona para hóspedes

```typescript
// CreateReservationWizard.tsx
const [property, setProperty] = useState<Property | null>(null);
const [loadingProperty, setLoadingProperty] = useState(false);

useEffect(() => {
  if (open && propertyId) {
    loadProperty(propertyId);
  }
}, [open, propertyId]);

const loadProperty = async (id: string) => {
  setLoadingProperty(true);
  try {
    const response = await propertiesApi.get(id);  // ✅ Chama API
    if (response.success && response.data) {
      setProperty(response.data);
    }
  } catch (error) {
    toast.error('Erro ao carregar imóvel');
  } finally {
    setLoadingProperty(false);
  }
};
```

**Props do componente mudam:**
```typescript
interface CreateReservationWizardProps {
  open: boolean;
  onClose: () => void;
  propertyId?: string;      // ✅ Recebe só ID, não objeto
  startDate?: Date;
  endDate?: Date;
  onComplete: (data: any) => void;
}
```

**App.tsx simplifica:**
```typescript
<CreateReservationWizard
  open={createReservationWizard.open}
  propertyId={createReservationWizard.propertyId}  // ✅ Só passa ID
  startDate={createReservationWizard.startDate}
  endDate={createReservationWizard.endDate}
  onComplete={handleReservationComplete}
  onClose={() => setCreateReservationWizard({ open: false })}
/>
```

### **Solução 2: App.tsx consome CalendarContext**

**Vantagem:** Mantém prop `property={...}` funcionando  
**Desvantagem:** App.tsx fica dependente de CalendarContext (acoplamento)

```typescript
// App.tsx
import { useCalendar } from './contexts/CalendarContext';

function App() {
  const { state } = useCalendar();  // ✅ Acessa properties do context
  
  return (
    <CreateReservationWizard
      property={state.properties.find(p => p.id === createReservationWizard.propertyId)}
      // ...
    />
  );
}
```

**Problema:** App.tsx precisa estar dentro de `<CalendarProvider>` (reestruturação grande)

---

## 📋 CHECKLIST DE CORREÇÃO

- [ ] **Corrigir carregamento de imóvel no CreateReservationWizard**
  - [ ] Implementar `loadProperty()` via API (Solução 1)
  - [ ] Adicionar loading state
  - [ ] Adicionar error handling
  
- [ ] **Corrigir cálculo de preço**
  - [ ] Usar `property.pricing.basePrice`
  - [ ] Mostrar desconto por duração se aplicável
  - [ ] Sincronizar com cálculo do backend
  
- [ ] **Melhorar exibição no Step 1**
  - [ ] Mostrar nome do imóvel correto
  - [ ] Mostrar localização do imóvel
  - [ ] Mostrar amenidades principais
  - [ ] Mostrar foto correta (não placeholder)
  
- [ ] **Adicionar feedback visual**
  - [ ] Loading skeleton enquanto carrega imóvel
  - [ ] Mensagem de erro se imóvel não encontrado
  - [ ] Validação antes de permitir avançar

---

## 🎯 RESULTADO ESPERADO APÓS CORREÇÃO

### **Fluxo Ideal:**

1. Usuário clica em data → `propertyId` capturado ✅
2. Modal abre → Carrega imóvel via API ✅
3. Step 1 mostra:
   - ✅ Nome do imóvel correto
   - ✅ Foto do imóvel
   - ✅ Localização
   - ✅ Preço baseado no imóvel real
   - ✅ Descontos aplicáveis
4. Step 2 mostra:
   - ✅ Lista de hóspedes (já funciona)
   - ✅ Busca e filtro (já funciona)
   - ✅ Criar novo hóspede (já funciona)
5. Step 3 cria:
   - ✅ Reserva com `propertyId` correto
   - ✅ Reserva com `guestId` correto
   - ✅ Backend valida e calcula pricing
   - ✅ Reserva aparece no calendário

---

## 📊 CONEXÕES ENTRE ENTES

### **Imóveis ↔ Calendário**
- ✅ CalendarPage carrega imóveis via React Query
- ✅ CalendarModule exibe grid com imóveis
- ❌ CreateReservationWizard NÃO recebe imóvel corretamente

### **Hóspedes ↔ Modal**
- ✅ CreateReservationWizard carrega hóspedes via API
- ✅ Permite criar novo hóspede inline
- ✅ Valida seleção antes de prosseguir

### **Imóveis + Hóspedes → Reserva**
- ❌ Imóvel não está conectado (precisa correção)
- ✅ Hóspede está conectado
- ⚠️ Backend espera ambos (property_id + guest_id)

---

**Status:** 🔴 NECESSITA CORREÇÃO  
**Prioridade:** ALTA  
**Estimativa:** 1-2 horas de implementação

**Próximo passo:** Implementar Solução 1 (CreateReservationWizard carrega imóvel via API)
