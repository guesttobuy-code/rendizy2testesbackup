# 🐛 DEBUG: Bloqueios Não Aparecem no Calendário - v1.0.103.361

**Data**: 19/12/2024 22:56  
**Problema**: Bloqueios carregam com sucesso da API (2 bloqueios) mas não renderizam visualmente no calendário.

## 📊 Estado Atual (Logs do Console)

### ✅ O QUE FUNCIONA:
```javascript
✅ [calendarApi.getBlocks] 2 bloqueios transformados
📥 [CalendarPage] Resposta da API de bloqueios: {success: true, data: Array(2)}
✅ [CalendarPage] 2 bloqueios carregados
🔄 [CalendarPage] blocksData changed: (2) [{…}, {…}]
📊 [CalendarPage] Sincronizando bloqueios: 2
🔍 [CalendarPage] Bloqueios: {blocksData: Array(2), blocksLoading: false, blocksError: null}
```

### ❌ O QUE NÃO FUNCIONA:
- Os cards laranjas (`bg-orange-100 border-orange-400`) NÃO aparecem no calendário
- A UI não mostra os bloqueios visualmente

## 🔍 Investigação

### Fluxo de Dados Esperado:
1. ✅ API → `calendarApi.getBlocks()` → 2 bloqueios transformados
2. ✅ CalendarPage → `useQuery(['blocks'])` → blocksData populated
3. ✅ CalendarPage → `setBlocks(blocksData)` → CalendarContext atualizado
4. ✅ CalendarPage → `<CalendarModule blocks={state.blocks}/>` → Props passadas
5. ✅ CalendarModule → `<Calendar blocks={blocks}/>` → Props repassadas
6. ❓ CalendarGrid → Renderização dos cards laranjas → **FALHA AQUI**

### Código de Renderização (CalendarGrid.tsx linha ~905-920):

```typescript
// Verificar se o bloqueio COMEÇA neste dia
const blockStartsToday = blockOnDay && blockOnDay.startDate === day.toISOString().split('T')[0];

{blockStartsToday && (
  <div
    className="absolute top-0.5 h-11 bg-orange-100 border border-orange-400 rounded flex items-center justify-center z-10 cursor-pointer hover:bg-orange-200 transition-colors"
    style={{
      left: '40px',
      width: `${(blockOnDay.nights * 80) - 6}px`
    }}
    onClick={() => onBlockClick?.(blockOnDay)}
    title={`Bloqueio: ${blockOnDay.reason || 'Manutenção'}`}
  >
    <div className="text-xs text-orange-800 px-2 truncate">
      <span className="font-medium">🔧 {blockOnDay.reason || 'Manutenção'}</span>
      {blockOnDay.notes && <div className="text-2xs opacity-75 truncate">{blockOnDay.notes}</div>}
    </div>
  </div>
)}
```

### Possíveis Causas:

1. **Comparação de Datas Falhando**:
   - `blockOnDay.startDate` (string "YYYY-MM-DD")
   - `day.toISOString().split('T')[0]` (string "YYYY-MM-DD")
   - Se o formato não bater, `blockStartsToday` será sempre `false`

2. **Bloqueios Não Chegam Como Props**:
   - CalendarGrid pode não estar recebendo `blocks` corretamente
   - Default value `blocks = []` pode estar sendo usado

3. **Filtering Incorreto**:
   - `getBlockForPropertyAndDate()` pode estar retornando `null` sempre
   - PropertyID mismatch entre bloqueios e propriedades

## 🛠️ Alterações Aplicadas (v1.0.103.361)

### 1. Log na Função `getBlockForPropertyAndDate` (linha ~93):

```typescript
const getBlockForPropertyAndDate = (
  propertyId: string,
  date: Date,
  blocks: any[]
): any | null => {
  if (!blocks || blocks.length === 0) {
    console.log('🔍 [getBlockForPropertyAndDate] Sem bloqueios ou array vazio');
    return null;
  }
  
  const foundBlock = blocks.find(b => {
    // ... lógica de comparação ...
    
    if (matches) {
      console.log('✅ [getBlockForPropertyAndDate] Bloqueio encontrado:', {
        blockId: b.id,
        propertyId: b.propertyId,
        startDate: b.startDate,
        endDate: b.endDate,
        currentDateStr: currentDate.toISOString().split('T')[0],
        nights: b.nights
      });
    }
    
    return matches;
  }) || null;
  
  return foundBlock;
};
```

### 2. Log no Loop de Renderização (linha ~885):

```typescript
// Debug APENAS para primeiras iterações
if (idx < 5 && blockOnDay) {
  console.log('🔍 [CalendarGrid] Bloqueio detectado:', {
    dayStr: day.toISOString().split('T')[0],
    blockStartDate: blockOnDay.startDate,
    blockStartsToday,
    blockNights: blockOnDay.nights,
    propertyId: property.id
  });
}
```

### 3. Log nas Props do Componente (linha ~190):

```typescript
useEffect(() => {
  console.log('🔍 [CalendarGrid] Props recebidas:', {
    blocksCount: blocks?.length || 0,
    blocks: blocks,
    propertiesCount: properties.length,
    reservationsCount: reservations.length
  });
}, [blocks, properties, reservations]);
```

## 🎯 Próximos Passos

1. **Recarregar página** e verificar console
2. **Analisar logs**:
   - `[CalendarGrid] Props recebidas` → Confirmar se blocks chegam
   - `[getBlockForPropertyAndDate] Sem bloqueios` → Se aparecer, problema nas props
   - `[getBlockForPropertyAndDate] Bloqueio encontrado` → Se aparecer, problema na renderização
   - `[CalendarGrid] Bloqueio detectado` → Se aparecer, verificar `blockStartsToday`

3. **Diagnosticar causa raiz**:
   - Se `blocks = []` nas props → Problema no CalendarModule ou CalendarPage
   - Se bloqueio encontrado mas `blockStartsToday = false` → Problema na comparação de datas
   - Se bloqueio detectado mas não renderiza → Problema no JSX/CSS

## 📦 Arquivos Modificados

- `components/CalendarGrid.tsx` (linhas 93-137, 190-210, 885-905)

## 🔗 Contexto de Sessões Anteriores

**v1.0.103.360**: Fixed duplicated `/rendizy-server` prefix causing 404 on blocks endpoint  
**v1.0.103.359**: Created diagnostic guide DIAGNOSTICO_BLOQUEIOS  
**v1.0.103.358**: Fixed infinite loading loop with focus event throttling  
**v1.0.103.357**: Added snake_case → camelCase transformation + nights calculation

---

**Status**: 🔄 Aguardando reload da página para análise de logs de debug
