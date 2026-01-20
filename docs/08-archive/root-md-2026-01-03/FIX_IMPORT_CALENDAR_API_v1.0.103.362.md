# 🐛 FIX: Import Faltando Causava Erro em Bloqueios - v1.0.103.362

**Data**: 19/12/2024 23:08  
**Problema**: `ReferenceError: calendarApi is not defined` em useCalendarData.ts

## 🔍 Diagnóstico

### Erro Identificado nos Logs:
```javascript
useCalendarData.ts:153 ❌ [useCalendarData] Erro ao buscar bloqueios: ReferenceError: calendarApi is not defined
    at useCalendarData.ts:135:23
```

### Sintomas:
1. ❌ useCalendarData.ts tentava usar `calendarApi.getBlocks()` sem importar
2. ✅ CalendarPage.tsx funcionava porque importava corretamente
3. ❌ CalendarGrid recebia `blocks = []` (array vazio) devido ao erro
4. 🔄 124 chamadas a `getBlockForPropertyAndDate()` retornavam "Sem bloqueios ou array vazio"

## 🛠️ Solução Aplicada

### 1. Corrigir Import em useCalendarData.ts (linha ~9):

**ANTES**:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertiesApi, reservationsApi } from '../utils/api';
import { toast } from 'sonner';
import type { Property } from '../App';
```

**DEPOIS**:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertiesApi, reservationsApi, calendarApi } from '../utils/api'; // ✅ ADICIONADO
import { toast } from 'sonner';
import type { Property } from '../App';
```

### 2. Melhorar Debug Logs em CalendarGrid.tsx (linha ~190):

**ADICIONADO**:
```typescript
if (blocks && blocks.length > 0) {
  console.log('🔍 [CalendarGrid] Primeiro bloqueio:', {
    id: blocks[0].id,
    propertyId: blocks[0].propertyId,
    startDate: blocks[0].startDate,
    endDate: blocks[0].endDate,
    nights: blocks[0].nights
  });
}
```

## 📊 Arquitetura: Dois Pontos de Busca de Bloqueios

### 1. **CalendarPage.tsx** (Funcionando ✅)
```typescript
const { 
  data: blocksData,
  isLoading: blocksLoading,
  error: blocksError
} = useQuery({
  queryKey: ['blocks', state.selectedProperties],
  queryFn: async () => {
    const blocksResponse = await calendarApi.getBlocks(state.selectedProperties);
    return blocksResponse.success ? blocksResponse.data : [];
  },
  enabled: state.selectedProperties.length > 0
});
```

### 2. **useCalendarData.ts** (Estava falhando ❌ → Agora corrigido ✅)
```typescript
const blocksPromises = propertyIds.map(propertyId => 
  calendarApi.getBlocks({ // ❌ calendarApi não estava importado
    propertyId,
    startDate: dateRange.from.toISOString().split('T')[0],
    endDate: dateRange.to.toISOString().split('T')[0]
  })
);
```

### ⚠️ Redundância Identificada

Há **duplicação de lógica**:
- CalendarPage busca bloqueios via useQuery direto
- useCalendarData também tenta buscar bloqueios
- Ambos passam dados para CalendarContext

**Recomendação**: Consolidar em um único ponto (preferencialmente useCalendarData) em refactoring futuro.

## 🎯 Próximos Passos para Validação

1. **Recarregar página** (F5)
2. **Verificar logs**:
   - ✅ Não deve mais aparecer "calendarApi is not defined"
   - ✅ Deve aparecer `🔍 [CalendarGrid] Primeiro bloqueio: { id, propertyId, startDate, endDate, nights }`
   - ✅ Não deve mais aparecer 124x "Sem bloqueios ou array vazio"

3. **Validar renderização**:
   - ✅ Cards laranjas devem aparecer nas datas corretas
   - ✅ Hover deve mostrar tooltip com motivo do bloqueio
   - ✅ Click deve abrir BlockDetailsModal

## 📦 Arquivos Modificados

- `hooks/useCalendarData.ts` (linha 9: import statement)
- `components/CalendarGrid.tsx` (linhas 190-208: debug logs expandidos)

## 🔗 Contexto Histórico

**v1.0.103.361**: Adicionados logs de debug mas não identificou import faltando  
**v1.0.103.360**: Fixed duplicated `/rendizy-server` prefix  
**v1.0.103.359**: Created diagnostic guide  
**v1.0.103.358**: Fixed infinite loading loop

---

**Status**: 🔄 Aguardando reload para validação visual dos bloqueios
