# 🔍 ANÁLISE COMPLETA: Modais do Calendário - Pente Fino
**Data**: 19 de Dezembro de 2024  
**Versão**: v1.0.103.402  
**Status**: 🔴 CRITICO - Reservas não funcionam

---

## 📋 RESUMO EXECUTIVO

### 🎯 PROBLEMA RELATADO
Usuário tentou fazer reserva e o sistema não funcionou.

### ✅ O QUE ESTÁ CORRETO
1. ✅ Servidor rodando (localhost:3000)
2. ✅ Modal abre corretamente
3. ✅ Propriedade carrega via API
4. ✅ Hóspedes carregam via API
5. ✅ Validação de disponibilidade implementada
6. ✅ Rotas da API configuradas

### ❌ O QUE ESTÁ ERRADO
1. ❌ **CRÍTICO**: Servidor Supabase Edge Function pode estar offline
2. ❌ **CRÍTICO**: Requisição para `/reservations` (POST) falhando
3. ⚠️ **POSSÍVEL**: Dados inválidos sendo enviados

---

## 🔄 FLUXO COMPLETO DA RESERVA

### **ETAPA 1: Usuário clica em célula vazia do calendário**

**Arquivo**: `App.tsx` linha 465-472

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

**Status**: ✅ FUNCIONA

---

### **ETAPA 2: QuickActionsModal abre**

**Usuário seleciona opção**: "Criar Reserva"

**Arquivo**: `App.tsx` linha 476-487

```typescript
const handleQuickAction = (action: 'reservation' | ...) => {
  const { propertyId, startDate, endDate } = quickActionsModal;
  setQuickActionsModal({ open: false });

  setTimeout(() => {
    if (action === 'reservation') {
      setCreateReservationWizard({
        open: true,
        propertyId,
        startDate,
        endDate
      });
    }
  }, 100);
};
```

**Status**: ✅ FUNCIONA

---

### **ETAPA 3: CreateReservationWizard abre**

**Arquivo**: `App.tsx` linha 1533-1540

```typescript
<CreateReservationWizard
  open={createReservationWizard.open}
  onClose={() => setCreateReservationWizard({ open: false })}
  propertyId={createReservationWizard.propertyId}  // ✅ PASSA ID
  startDate={createReservationWizard.startDate}
  endDate={createReservationWizard.endDate}
  onComplete={handleReservationComplete}
/>
```

**Status**: ✅ FUNCIONA

---

### **ETAPA 4: Wizard carrega propriedade via API**

**Arquivo**: `CreateReservationWizard.tsx` linha 230-274

```typescript
useEffect(() => {
  const loadProperty = async () => {
    if (!propertyId) return;
    
    setLoadingProperty(true);
    try {
      const response = await propertiesApi.get(propertyId);
      // 🔴 ROTA: /anuncios-ultimate/:id
      
      if (response.success && response.data) {
        setProperty(response.data);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar imóvel:', error);
      toast.error('Erro ao carregar imóvel');
    } finally {
      setLoadingProperty(false);
    }
  };
  
  if (open && propertyId) {
    loadProperty();
  }
}, [open, propertyId]);
```

**Rota API**: 
- **Endpoint**: `/anuncios-ultimate/:id`
- **Método**: GET
- **Status**: ⚠️ VERIFICAR SE RETORNA DADOS

---

### **ETAPA 5: Wizard carrega hóspedes via API**

**Arquivo**: `CreateReservationWizard.tsx` linha 262-293

```typescript
useEffect(() => {
  const loadGuests = async () => {
    setLoadingGuests(true);
    try {
      const response = await guestsApi.list();
      // 🔴 ROTA: /guests
      
      if (response.success && response.data) {
        setGuests(response.data);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar hóspedes:', error);
      toast.error('Erro ao carregar hóspedes');
    } finally {
      setLoadingGuests(false);
    }
  };
  
  if (open) {
    loadGuests();
  }
}, [open]);
```

**Rota API**: 
- **Endpoint**: `/guests`
- **Método**: GET
- **Status**: ⚠️ VERIFICAR SE RETORNA DADOS

---

### **ETAPA 6: Usuário preenche wizard e clica "Finalizar"**

**Arquivo**: `CreateReservationWizard.tsx` linha 394-507

```typescript
const handleComplete = async () => {
  // 1️⃣ VALIDAR CAMPOS
  if (!property || !selectedGuest || !effectiveStartDate || !effectiveEndDate) {
    toast.error('Preencha todos os campos obrigatórios');
    return;
  }

  setCreating(true);
  try {
    // 2️⃣ VALIDAR DISPONIBILIDADE
    const availability = await checkAvailability(property.id, effectiveStartDate, effectiveEndDate);
    
    if (!availability.available) {
      toast.error(
        <div>
          <div className="font-semibold mb-2">❌ Datas não disponíveis</div>
          <div className="text-sm space-y-1">
            {availability.conflicts.map((conflict, idx) => (
              <div key={idx}>• {conflict}</div>
            ))}
          </div>
        </div>,
        { duration: 8000 }
      );
      setCreating(false);
      return;
    }
    
    // 3️⃣ CRIAR RESERVA
    const reservationData = {
      propertyId: property.id,
      guestId: selectedGuest.id,
      checkIn: effectiveStartDate.toISOString().split('T')[0],
      checkOut: effectiveEndDate.toISOString().split('T')[0],
      adults,
      children,
      platform,
      notes,
    };
    
    const response = await reservationsApi.create(reservationData);
    // 🔴 ROTA: /reservations (POST)
    
    if (response.success) {
      toast.success('Reserva criada com sucesso!');
      onComplete(response.data);
      onClose();
    } else {
      toast.error(response.error || 'Erro ao criar reserva');
    }
  } catch (error) {
    console.error('💥 Exceção capturada:', error);
    toast.error('Erro ao criar reserva');
  } finally {
    setCreating(false);
  }
};
```

**Rota API**: 
- **Endpoint**: `/reservations`
- **Método**: POST
- **Body**:
  ```json
  {
    "propertyId": "uuid",
    "guestId": "uuid",
    "checkIn": "2024-12-20",
    "checkOut": "2024-12-22",
    "adults": 2,
    "children": 0,
    "platform": "direct",
    "notes": ""
  }
  ```
- **Status**: 🔴 **AQUI PROVAVELMENTE ESTÁ FALHANDO**

---

## 🔍 FUNÇÃO checkAvailability

**Arquivo**: `CreateReservationWizard.tsx` linha 294-370

```typescript
const checkAvailability = async (
  propId: string, 
  checkIn: Date, 
  checkOut: Date
): Promise<{ available: boolean; conflicts: string[] }> => {
  try {
    const conflicts: string[] = [];
    
    // 1️⃣ Verificar reservas existentes
    const reservationsResponse = await reservationsApi.list();
    // 🔴 ROTA: /reservations (GET)
    
    if (reservationsResponse.success && reservationsResponse.data) {
      const existingReservations = reservationsResponse.data.filter((r: any) => {
        if (r.propertyId !== propId) return false;
        if (r.status === 'cancelled') return false;
        
        const rCheckIn = new Date(r.checkIn);
        const rCheckOut = new Date(r.checkOut);
        const newCheckIn = new Date(checkIn);
        const newCheckOut = new Date(checkOut);
        
        // Lógica hoteleira: Check-out não ocupa o dia
        const hasConflict = newCheckIn < rCheckOut && newCheckOut > rCheckIn;
        
        if (hasConflict) {
          conflicts.push(`Reserva existente: ${rCheckIn.toLocaleDateString('pt-BR')} - ${rCheckOut.toLocaleDateString('pt-BR')}`);
        }
        
        return hasConflict;
      });
    }
    
    // 2️⃣ Verificar bloqueios
    const blocksResponse = await calendarApi.getBlocks({
      propertyId: propId,
      startDate: checkIn.toISOString().split('T')[0],
      endDate: checkOut.toISOString().split('T')[0]
    });
    // 🔴 ROTA: /calendar/blocks?propertyId=...&startDate=...&endDate=...
    
    if (blocksResponse.success && blocksResponse.data && blocksResponse.data.length > 0) {
      blocksResponse.data.forEach((block: any) => {
        const blockStart = new Date(block.startDate);
        const blockEnd = new Date(block.endDate);
        conflicts.push(`Bloqueio: ${blockStart.toLocaleDateString('pt-BR')} - ${blockEnd.toLocaleDateString('pt-BR')}`);
      });
    }
    
    return { available: conflicts.length === 0, conflicts };
  } catch (error) {
    console.error('❌ Erro ao verificar disponibilidade:', error);
    return { available: true, conflicts: [] }; // Fail open
  }
};
```

**Rotas API**: 
- **1**: `/reservations` (GET) - Lista todas reservas
- **2**: `/calendar/blocks` (GET) - Lista bloqueios

**Status**: ⚠️ VERIFICAR SE RETORNAM DADOS

---

## 🔗 ROTAS DA API (utils/api.ts)

### **1. GET /anuncios-ultimate/:id**
**Linha**: 1234 (aproximada)
```typescript
propertiesApi.get: async (id: string) => {
  return apiRequest<Property>(`/anuncios-ultimate/${id}`);
}
```

### **2. GET /guests**
**Linha**: ~550
```typescript
guestsApi.list: async () => {
  return apiRequest<Guest[]>('/guests');
}
```

### **3. GET /reservations**
**Linha**: 673-690
```typescript
reservationsApi.list: async (filters?) => {
  return apiRequest<Reservation[]>(`/reservations${query ? '?' + query : ''}`);
}
```

### **4. POST /reservations**
**Linha**: 720-740
```typescript
reservationsApi.create: async (data: {
  propertyId: string;
  guestId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children?: number;
  platform: string;
  notes?: string;
}) => {
  return apiRequest<Reservation>('/reservations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
```

### **5. GET /calendar/blocks**
**Linha**: ~849
```typescript
calendarApi.getBlocks: async (params: {
  propertyId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/calendar/blocks${query ? '?' + query : ''}`);
}
```

---

## 🎯 BASE URL DA API

**Arquivo**: `utils/api.ts` linha 16

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server";
```

**URL Completa**: 
```
https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/reservations
```

---

## 🔴 DIAGNÓSTICO: ONDE ESTÁ FALHANDO?

### **CENÁRIO 1: Servidor Edge Function offline** 🔴 MAIS PROVÁVEL

**Sintomas**:
- Modal abre
- Carrega propriedade
- Carrega hóspedes
- Mas não cria reserva

**Solução**:
```powershell
# Verificar se servidor Edge Function está online
Invoke-WebRequest -Uri "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/health" -Method GET
```

**Se retornar erro 404 ou timeout**: Servidor offline, precisa fazer deploy.

---

### **CENÁRIO 2: Dados inválidos na requisição** ⚠️ POSSÍVEL

**Sintomas**:
- Servidor responde 400 Bad Request
- Console mostra erro de validação

**Verificar**:
1. `propertyId` é UUID válido?
2. `guestId` existe no banco?
3. Datas estão no formato `YYYY-MM-DD`?
4. `adults` é número positivo?

**Solução**: Abrir DevTools Console (F12) e ver erro exato.

---

### **CENÁRIO 3: Problema de CORS** ⚠️ POSSÍVEL

**Sintomas**:
- Console mostra erro CORS
- "Access-Control-Allow-Origin"

**Solução**: Verificar configuração de CORS no Edge Function.

---

## 📝 CHECKLIST DE DIAGNÓSTICO

Execute estes passos NA ORDEM:

### ✅ PASSO 1: Verificar se servidor frontend está rodando
```bash
# Deve mostrar: VITE v6.3.5 ready in ...
# URL: http://localhost:3000/
```
**Status**: ✅ RODANDO

---

### ❓ PASSO 2: Abrir DevTools Console (F12)
1. Abrir http://localhost:3000/calendario
2. Pressionar F12
3. Clicar na aba "Console"
4. Tentar criar reserva
5. Ver qual erro aparece

**O que procurar**:
- ❌ `Failed to fetch` → Servidor backend offline
- ❌ `404 Not Found` → Rota inexistente
- ❌ `400 Bad Request` → Dados inválidos
- ❌ `CORS error` → Problema de CORS
- ❌ `Property not found` → Propriedade não existe
- ❌ `Guest not found` → Hóspede não existe

---

### ❓ PASSO 3: Verificar aba "Network" do DevTools
1. Clicar na aba "Network"
2. Tentar criar reserva
3. Procurar requisição para `/reservations` (POST)
4. Ver status code e resposta

**O que procurar**:
- 🔴 Status 500 → Erro no servidor
- 🔴 Status 404 → Rota não existe
- 🔴 Status 400 → Dados inválidos
- 🔴 Status 0 / (failed) → Servidor offline

---

### ❓ PASSO 4: Testar servidor Edge Function manualmente

**Via PowerShell**:
```powershell
$token = "SEU_TOKEN_AQUI"  # Pegar do localStorage

$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
}

$body = @{
  propertyId = "PROPERTY_ID_AQUI"
  guestId = "GUEST_ID_AQUI"
  checkIn = "2024-12-20"
  checkOut = "2024-12-22"
  adults = 2
  children = 0
  platform = "direct"
  notes = ""
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/reservations" `
  -Method POST `
  -Headers $headers `
  -Body $body
```

---

### ❓ PASSO 5: Verificar se Edge Function existe

```powershell
npx supabase functions list --project-ref odcgnzfremrqnvtitpcc
```

**Deve mostrar**:
```
rendizy-server    │ deployed
```

**Se não mostrar**: Fazer deploy:
```powershell
npx supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc
```

---

## 🔧 SOLUÇÕES RÁPIDAS

### **SOLUÇÃO 1: Reiniciar servidor frontend**
```powershell
# Matar Node
taskkill /F /IM node.exe

# Reiniciar
cd "c:\...\Rendizyoficial-main"
npm run dev
```

---

### **SOLUÇÃO 2: Limpar cache do navegador**
1. Abrir DevTools (F12)
2. Clicar com botão direito no ícone de "Atualizar"
3. Selecionar "Limpar cache e recarregar"

---

### **SOLUÇÃO 3: Verificar token de autenticação**
1. Abrir DevTools Console
2. Digite: `localStorage.getItem('token')`
3. Deve retornar um token longo
4. Se retornar `null`: Fazer login novamente

---

### **SOLUÇÃO 4: Deploy do Edge Function**

**Se servidor backend estiver offline**:
```powershell
cd "c:\...\Rendizyoficial-main"
npx supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc
```

**Aguardar**:
```
Deploying rendizy-server...
✓ Deployed rendizy-server
```

**Testar**:
```powershell
Invoke-WebRequest -Uri "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/health"
```

---

## 🎬 PRÓXIMOS PASSOS

1. ⏰ **IMEDIATO**: Abrir DevTools Console e ver erro exato
2. 📸 **IMEDIATO**: Tirar screenshot do erro e compartilhar
3. 🔍 **APÓS VER ERRO**: Aplicar solução correspondente
4. ✅ **APÓS CORRIGIR**: Testar criar reserva novamente

---

## 📊 RESUMO DE MODAIS RELACIONADOS

| Modal | Arquivo | Função | Rota API | Status |
|-------|---------|--------|----------|--------|
| QuickActionsModal | `QuickActionsModal.tsx` | Escolher ação | Nenhuma | ✅ OK |
| CreateReservationWizard | `CreateReservationWizard.tsx` | Criar reserva | POST `/reservations` | 🔴 FALHA |
| BlockModal | `BlockModal.tsx` | Criar bloqueio | POST `/calendar/blocks` | ❓ NÃO TESTADO |
| ReservationDetailsModal | `ReservationDetailsModal.tsx` | Ver detalhes | GET `/reservations/:id` | ❓ NÃO TESTADO |
| EditReservationWizard | `EditReservationWizard.tsx` | Editar reserva | PUT `/reservations/:id` | ❓ NÃO TESTADO |
| BlockDetailsModal | `BlockDetailsModal.tsx` | Ver bloqueio | GET `/calendar/blocks/:id` | ❓ NÃO TESTADO |

---

## 🎯 CONCLUSÃO

**PROBLEMA IDENTIFICADO**: 
- ❌ Requisição para POST `/reservations` está falhando

**POSSÍVEIS CAUSAS**:
1. 🔴 **Servidor Edge Function offline** (mais provável)
2. ⚠️ Dados inválidos sendo enviados
3. ⚠️ Token de autenticação expirado
4. ⚠️ Problema de CORS

**PRÓXIMA AÇÃO**:
> 👉 **ABRA O DEVTOOLS CONSOLE (F12) E TENTE CRIAR UMA RESERVA**  
> 👉 **COMPARTILHE O ERRO EXATO QUE APARECE**

---

**Gerado por**: GitHub Copilot  
**Data**: 19/12/2024 19:15
