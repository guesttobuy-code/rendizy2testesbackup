# 🚨 RECUPERAÇÃO DO TRABALHO - Sessão 18/12/2024

> **STATUS**: As mudanças NÃO foram commitadas e se perderam. Este documento contém TODAS as alterações necessárias para recuperar o trabalho.

---

## 📋 ÍNDICE DE RECUPERAÇÃO

1. [✅ FormularioAnuncio - CRÍTICO](#1-formularioanuncio---crítico)
2. [✅ CalendarPage - Bloqueios](#2-calendarpage---bloqueios)
3. [✅ CalendarGrid - Date Range](#3-calendargrid---date-range)
4. [✅ CalendarModule - Props](#4-calendarmodule---props)
5. [✅ useCalendarData - Filtro Canceladas](#5-usecalendardata---filtro-canceladas)
6. [✅ ReservationDetailsModal - Cancelamento](#6-reservationdetailsmodal---cancelamento)
7. [✅ API Utils - getBlocks()](#7-api-utils---getblocks)
8. [✅ BlockModal - Snake Case](#8-blockmodal---snake-case)
9. [✅ App.tsx - Renderização Modals](#9-apptsx---renderização-modals)
10. [⚠️ Backend Routes (JÁ DEPLOYADO)](#10-backend-routes-já-deployado)

---

## 1. FormularioAnuncio - CRÍTICO ⚠️

**Arquivo**: `components/anuncio-ultimate/FormularioAnuncio.tsx`  
**Linhas**: ~1779-1850  
**Problema Atual**: Não permite criar novos drafts (exige anuncioId)

### ❌ CÓDIGO ATUAL (ERRADO):
```typescript
const handleSaveAll = async () => {
  if (!anuncioId) {
    toast.error('ID do anúncio não encontrado');
    return;
  }
  
  setIsSaving(true);
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/anuncios_drafts?id=eq.${anuncioId}`, {
      method: 'PATCH',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        data: formData,
        updated_at: new Date().toISOString()
      })
    });
    
    if (!response.ok) throw new Error('Erro ao salvar');
    
    toast.success('✅ Anúncio salvo com sucesso!');
    calculateProgress(formData);
  } catch (error) {
    console.error('Erro:', error);
    toast.error('Erro ao salvar anúncio');
  } finally {
    setIsSaving(false);
  }
};
```

### ✅ CÓDIGO CORRETO (SUBSTITUIR COMPLETO):
```typescript
const handleSaveAll = async () => {
  setIsSaving(true);
  try {
    // ✅ NOVO ANÚNCIO: Criar com INSERT
    if (!anuncioId) {
      const novoId = crypto.randomUUID();
      
      // Obter user_id e organization_id do localStorage
      const userDataStr = localStorage.getItem('user');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const userId = userData?.id || '00000000-0000-0000-0000-000000000002';
      const organizationId = userData?.organization?.id || '00000000-0000-0000-0000-000000000000';
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/anuncios_drafts`, {
        method: 'POST',
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          id: novoId,
          organization_id: organizationId,
          user_id: userId,
          title: formData.title || 'Sem título',
          data: formData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      });
      
      if (!response.ok) throw new Error('Erro ao criar anúncio');
      
      const [created] = await response.json();
      toast.success('✅ Rascunho criado com sucesso!');
      calculateProgress(formData);
      
      // Redirecionar para a URL de edição com o ID
      navigate(`/anuncios-ultimate/${novoId}`);
      return;
    }
    
    // ✅ ANÚNCIO EXISTENTE: Atualizar com PATCH
    const response = await fetch(`${SUPABASE_URL}/rest/v1/anuncios_drafts?id=eq.${anuncioId}`, {
      method: 'PATCH',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        title: formData.title || 'Sem título',
        data: formData,
        updated_at: new Date().toISOString()
      })
    });
    
    if (!response.ok) throw new Error('Erro ao salvar');
    
    toast.success('✅ Anúncio salvo com sucesso!');
    calculateProgress(formData);
  } catch (error) {
    console.error('Erro:', error);
    toast.error('Erro ao salvar anúncio');
  } finally {
    setIsSaving(false);
  }
};
```

### 🎯 O QUE FOI CORRIGIDO:
1. ✅ Permite criar novos drafts sem `anuncioId` prévio
2. ✅ Gera UUID com `crypto.randomUUID()`
3. ✅ Busca `user_id` e `organization_id` do localStorage
4. ✅ Salva `title` no top-level (obrigatório para reservas)
5. ✅ Redireciona para URL de edição após criar

---

## 2. CalendarPage - Bloqueios

**Arquivo**: `components/calendar/CalendarPage.tsx`  
**Linhas**: ~51-115  
**Problema**: Bloqueios não aparecem no calendário

### ✅ ADICIONAR IMPORTS (NO TOPO):
```typescript
import { useQuery } from '@tanstack/react-query';
import { calendarApi } from '../../utils/api';
```

### ✅ ADICIONAR DENTRO DO COMPONENTE (APÓS useReservations):
```typescript
// ✅ BUSCAR BLOQUEIOS diretamente (bypassing useCalendarData)
const { 
  data: blocksData,
  isLoading: blocksLoading,
  error: blocksError
} = useQuery({
  queryKey: ['blocks', state.selectedProperties],
  queryFn: async () => {
    if (state.selectedProperties.length === 0) {
      console.log('⏭️ [CalendarPage] Nenhuma propriedade selecionada, pulando busca de bloqueios');
      return [];
    }
    
    console.log(`🔄 [CalendarPage] Buscando bloqueios para ${state.selectedProperties.length} propriedades`);
    console.log(`📤 [CalendarPage] PropertyIDs: ${JSON.stringify(state.selectedProperties)}`);
    
    const blocksResponse = await calendarApi.getBlocks(state.selectedProperties);
    console.log(`📥 [CalendarPage] Resposta da API de bloqueios:`, blocksResponse);
    
    const blocks = blocksResponse.success ? blocksResponse.data : [];
    console.log(`✅ [CalendarPage] ${blocks.length} bloqueios carregados`);
    
    if (blocksResponse.error) {
      console.error(`❌ [CalendarPage] Erro ao buscar bloqueios:`, blocksResponse.error);
    }
    
    return blocks;
  },
  enabled: state.selectedProperties.length > 0,
  staleTime: 1 * 60 * 1000,
  gcTime: 5 * 60 * 1000,
  retry: 1,
});

console.log('🔍 [CalendarPage] Bloqueios:', { blocksData, blocksLoading, blocksError });
```

### ✅ ADICIONAR useEffect PARA SINCRONIZAR BLOQUEIOS:
```typescript
useEffect(() => {
  console.log('🔄 [CalendarPage] blocksData changed:', blocksData);
  if (blocksData && Array.isArray(blocksData)) {
    console.log('📊 [CalendarPage] Sincronizando bloqueios:', blocksData.length);
    setBlocks(blocksData);
  } else {
    console.log('⚠️ [CalendarPage] blocksData não é array:', blocksData);
  }
}, [blocksData]);
```

---

## 3. CalendarGrid - Date Range

**Arquivo**: `components/CalendarGrid.tsx`  
**Linhas**: ~10-68  
**Problema**: Calendário não scrolla corretamente através de múltiplos meses

### ✅ MODIFICAR FUNÇÃO getDaysInMonth:

**Localização**: Procurar por `function getDaysInMonth`

**SUBSTITUIR TODA A FUNÇÃO** por:

```typescript
function getDaysInMonth(
  year: number, 
  month: number,
  dateRange?: { start: Date; end: Date } | null
): Date[] {
  // Se dateRange for fornecido, gerar dias através do intervalo
  if (dateRange && dateRange.start && dateRange.end) {
    const days: Date[] = [];
    const currentDate = new Date(dateRange.start);
    currentDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(dateRange.end);
    endDate.setHours(0, 0, 0, 0);
    
    // Adicionar todos os dias entre start e end (inclusive)
    while (currentDate <= endDate) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }
  
  // Comportamento padrão: dias do mês específico
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  
  const days: Date[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }
  
  return days;
}
```

### ✅ MODIFICAR CHAMADA DA FUNÇÃO (LINHA ~191):

**Procurar por**: `const days = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());`

**SUBSTITUIR POR**: 
```typescript
const days = getDaysInMonth(
  currentMonth.getFullYear(), 
  currentMonth.getMonth(),
  dateRange  // ✅ Passa dateRange como terceiro parâmetro
);
```

---

## 4. CalendarModule - Props

**Arquivo**: `components/calendar/CalendarModule.tsx`  
**Linha**: ~122  
**Problema**: dateRange não é passado para Calendar

### ✅ LOCALIZAR:
```typescript
<Calendar
  properties={properties.filter((p) => selectedProperties.includes(p.id))}
  // ... outras props
/>
```

### ✅ ADICIONAR PROP:
```typescript
<Calendar
  properties={properties.filter((p) => selectedProperties.includes(p.id))}
  dateRange={dateRange}  // ✅ ADICIONAR ESTA LINHA
  // ... outras props
/>
```

---

## 5. useCalendarData - Filtro Canceladas

**Arquivo**: `hooks/useCalendarData.ts`  
**Linhas**: ~86-92  
**Problema**: Reservas canceladas aparecem no calendário

### ✅ LOCALIZAR (dentro de useReservations):
```typescript
if (result.ok && result.reservas) {
  console.log(`✅ [useReservations] ${result.reservas.length} reservas carregadas`);
  return result.reservas as Reservation[];
}
```

### ✅ SUBSTITUIR POR:
```typescript
if (result.ok && result.reservas) {
  // ✅ Filtrar reservas canceladas
  const activeReservations = result.reservas.filter((r: any) => r.status !== 'cancelled');
  console.log(`✅ [useReservations] ${activeReservations.length} reservas ativas carregadas (${result.reservas.length} total, ${result.reservas.length - activeReservations.length} canceladas)`);
  return activeReservations as Reservation[];
}
```

---

## 6. ReservationDetailsModal - Cancelamento

**Arquivo**: `components/ReservationDetailsModal.tsx`  
**Linhas**: ~128-154  
**Problema**: Cancelamento não chama API nem invalida cache

### ✅ ADICIONAR IMPORTS (NO TOPO):
```typescript
import { useQueryClient } from '@tanstack/react-query';
import { reservationsApi } from '../utils/api';
```

### ✅ ADICIONAR DENTRO DO COMPONENTE:
```typescript
const queryClient = useQueryClient();
```

### ✅ MODIFICAR handleCancelReservation:

**LOCALIZAR**:
```typescript
const handleCancelReservation = () => {
  if (!reservation) return;
  
  onClose();
  toast.success('Reserva cancelada com sucesso');
};
```

**SUBSTITUIR POR**:
```typescript
const handleCancelReservation = async () => {
  if (!reservation) return;
  
  try {
    // ✅ Chamar API para atualizar status
    const response = await reservationsApi.update(reservation.id, {
      status: 'cancelled'
    });
    
    if (response.success) {
      // ✅ Invalidar cache do React Query
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      
      toast.success(
        `Reserva cancelada com sucesso! Valor a devolver: R$ ${reservation.totalPrice?.toFixed(2) || '0.00'}`
      );
      onClose();
    } else {
      throw new Error(response.error || 'Erro ao cancelar reserva');
    }
  } catch (error) {
    console.error('Erro ao cancelar reserva:', error);
    toast.error('Erro ao cancelar reserva');
  }
};
```

---

## 7. API Utils - getBlocks()

**Arquivo**: `utils/api.ts`  
**Linhas**: ~893-900  
**Problema**: Método getBlocks() não existe

### ✅ ADICIONAR DENTRO DO OBJETO calendarApi:

**LOCALIZAR**: `export const calendarApi = {`

**ADICIONAR MÉTODO**:
```typescript
export const calendarApi = {
  // ... métodos existentes
  
  /**
   * Busca bloqueios por IDs de propriedades
   */
  getBlocks: async (propertyIds: string[]): Promise<ApiResponse<any[]>> => {
    try {
      const idsParam = propertyIds.join(',');
      const response = await apiRequest<any[]>(
        `/calendar/blocks?propertyIds=${idsParam}`,
        { method: 'GET' }
      );
      return response;
    } catch (error) {
      console.error('❌ [calendarApi.getBlocks] Erro:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        data: []
      };
    }
  },
};
```

---

## 8. BlockModal - Snake Case

**Arquivo**: `components/BlockModal.tsx`  
**Linhas**: ~73-80  
**Problema**: Envia camelCase mas backend espera snake_case

### ✅ LOCALIZAR handleSubmit:

**PROCURAR POR**:
```typescript
const blockData = {
  propertyId: property.id,
  startDate: format(startDate, 'yyyy-MM-dd'),
  endDate: format(endDate, 'yyyy-MM-dd'),
  // ...
```

### ✅ SUBSTITUIR POR:
```typescript
const blockData = {
  property_id: property.id,  // ✅ snake_case
  start_date: format(startDate, 'yyyy-MM-dd'),  // ✅ snake_case
  end_date: format(endDate, 'yyyy-MM-dd'),  // ✅ snake_case
  type: blockType,
  subtype: subType || null,
  reason: reason || null,
  notes: notes || null,
};
```

---

## 9. App.tsx - Renderização Modals

**Arquivo**: `App.tsx`  
**Linhas**: ~1476-1507  
**Problema**: BlockModal e BlockDetailsModal não renderizam

### ✅ VERIFICAR SE JÁ EXISTE:

Procurar por `<BlockModal` e `<BlockDetailsModal`

### ✅ SE NÃO EXISTIR, ADICIONAR ANTES DO FECHAMENTO DO COMPONENTE:

```typescript
{/* Block Modals */}
<BlockModal
  isOpen={blockModal.isOpen}
  property={properties.find((p) => p.id === blockModal.propertyId)}
  propertyName={properties.find((p) => p.id === blockModal.propertyId)?.name || "Propriedade"}
  startDate={blockModal.startDate}
  endDate={blockModal.endDate}
  onClose={() => setBlockModal({ isOpen: false, propertyId: '', startDate: null, endDate: null })}
  onSave={async (data: any) => {
    console.log('📝 Salvando bloqueio:', data);
    await handleSaveBlock(data);
    setBlockModal({ isOpen: false, propertyId: '', startDate: null, endDate: null });
  }}
/>

<BlockDetailsModal
  isOpen={blockDetailsModal.isOpen}
  block={blockDetailsModal.block}
  onClose={() => setBlockDetailsModal({ isOpen: false, block: null })}
  onDelete={async (id: string) => {
    console.log('🗑️ Deletando bloqueio:', id);
    await handleDeleteBlock(id);
    setBlockDetailsModal({ isOpen: false, block: null });
  }}
/>
```

**⚠️ NOTA**: Verificar se `handleSaveBlock` e `handleDeleteBlock` existem. Se não, implementar.

---

## 10. Backend Routes (JÁ DEPLOYADO) ✅

**Arquivo**: `supabase/functions/rendizy-server/routes-blocks.ts`

### ✅ VERIFICAÇÕES:

1. **Linha ~165**: Validação de conflito removida
2. **Linhas ~20-27**: Suporte a múltiplos propertyIds
3. **Linha ~226**: UUID generation com `crypto.randomUUID()`

**STATUS**: Estas mudanças já foram deployadas com:
```powershell
npx supabase functions deploy rendizy-server
```

**Para verificar**: Testar endpoint:
```powershell
$headers = @{
  'apikey' = 'ANON_KEY'
  'Authorization' = 'Bearer ANON_KEY'
}
Invoke-RestMethod -Uri "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/calendar/blocks?propertyIds=ID" -Headers $headers
```

---

## 🎯 ORDEM DE EXECUÇÃO RECOMENDADA

### PRIORIDADE 1 - CRÍTICA (Impede funcionalidade básica):
1. ✅ **FormularioAnuncio** - Sem isso não cria novos imóveis
2. ✅ **API Utils - getBlocks()** - Sem isso bloqueios não carregam

### PRIORIDADE 2 - ALTA (Features importantes):
3. ✅ **CalendarPage** - Exibe bloqueios no calendário
4. ✅ **ReservationDetailsModal** - Cancelamento de reservas
5. ✅ **useCalendarData** - Filtro de canceladas

### PRIORIDADE 3 - MÉDIA (Melhorias UX):
6. ✅ **CalendarGrid** - Date range scrolling
7. ✅ **CalendarModule** - Props dateRange
8. ✅ **BlockModal** - Snake case
9. ✅ **App.tsx** - Renderização modals

---

## 🧪 TESTES APÓS RECUPERAÇÃO

### Teste 1: Criar Draft
1. Ir em `/anuncios-ultimate/novo`
2. Preencher "Identificação Interna"
3. Clicar "Salvar Tudo"
4. ✅ Deve criar e redirecionar para URL de edição

### Teste 2: Criar Bloqueio
1. Ir em `/calendario`
2. Clicar em data vazia
3. Escolher "Criar Bloqueio"
4. ✅ Deve aparecer card laranja

### Teste 3: Criar Reserva
1. Selecionar imóvel com `title` preenchido
2. Clicar em data vazia
3. Preencher hóspede
4. ✅ Deve criar reserva

### Teste 4: Cancelar Reserva
1. Clicar em reserva existente
2. Clicar "Cancelar Reserva"
3. ✅ Deve desaparecer do calendário

### Teste 5: Date Range
1. Filtrar calendário de "18 dez - 16 fev"
2. ✅ Deve scrollar todos os 60 dias

---

## 📦 SCRIPT DE RECUPERAÇÃO AUTOMÁTICA

**Criar arquivo**: `recuperar-trabalho.ps1`

```powershell
Write-Host "🔧 RECUPERANDO TRABALHO DA SESSÃO 18/12/2024" -ForegroundColor Cyan
Write-Host ""

# Backup antes de modificar
Write-Host "📦 Criando backup..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = ".\backup_pre_recuperacao_$timestamp"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

Copy-Item "components\anuncio-ultimate\FormularioAnuncio.tsx" "$backupDir\" -Force
Copy-Item "components\calendar\CalendarPage.tsx" "$backupDir\" -Force
Copy-Item "components\CalendarGrid.tsx" "$backupDir\" -Force
Copy-Item "utils\api.ts" "$backupDir\" -Force

Write-Host "✅ Backup criado em: $backupDir" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️ IMPORTANTE: Aplicar mudanças MANUALMENTE seguindo RECUPERACAO_TRABALHO_18_12_2024.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 Ordem recomendada:" -ForegroundColor Cyan
Write-Host "  1. FormularioAnuncio.tsx (CRÍTICO)" -ForegroundColor White
Write-Host "  2. utils/api.ts - getBlocks()" -ForegroundColor White
Write-Host "  3. CalendarPage.tsx" -ForegroundColor White
Write-Host "  4. CalendarGrid.tsx" -ForegroundColor White
Write-Host "  5. ReservationDetailsModal.tsx" -ForegroundColor White
Write-Host "  6. useCalendarData.ts" -ForegroundColor White
Write-Host ""
Write-Host "✅ Após aplicar: npm run dev" -ForegroundColor Green
```

---

## 🆘 SUPORTE ADICIONAL

Se precisar de ajuda para localizar algum trecho específico:

```
"Onde está a função X no arquivo Y?"
"Qual a linha exata para modificar Z?"
"Mostre o código completo do handleSaveAll"
```

Posso fornecer snippets completos, números de linha aproximados, e contexto adicional de qualquer alteração listada acima.

---

**Última Atualização**: 19/12/2024 02:30  
**Versão**: v1.0 - Recuperação Completa  
**Total de Arquivos**: 9 modificados + 1 backend deployado
