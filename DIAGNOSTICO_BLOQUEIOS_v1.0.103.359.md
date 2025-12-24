# 🔍 DIAGNÓSTICO: Bloqueios no Banco mas Não Aparecem no Calendário

## 📊 Análise do Problema

### Fluxo Esperado
```
1. CalendarPage.tsx → useQuery(['blocks']) → calendarApi.getBlocks()
2. calendarApi.getBlocks() → Backend /blocks?propertyIds=X,Y
3. Backend → Retorna snake_case (property_id, start_date, end_date)
4. calendarApi → Transforma para camelCase + calcula nights
5. CalendarPage → Sincroniza blocksData com context via setBlocks()
6. CalendarModule → Recebe blocks via props
7. Calendar → Renderiza CalendarGrid com blocks
8. CalendarGrid → getBlockForPropertyAndDate() filtra bloqueios por data/propriedade
9. Orange cards aparecem no calendário
```

### ✅ O Que JÁ Está Funcionando

1. **Transformação de Dados** (utils/api.ts linhas 930-958):
   - ✅ Snake_case → CamelCase implementado
   - ✅ Campo `nights` calculado automaticamente
   - ✅ Log: `✅ [calendarApi.getBlocks] X bloqueios transformados`

2. **Busca de Bloqueios** (CalendarPage.tsx linhas 63-92):
   - ✅ useQuery configurado corretamente
   - ✅ queryKey: ['blocks', selectedProperties]
   - ✅ Enabled apenas quando tem propriedades selecionadas
   - ✅ Logs de debug implementados

3. **Sincronização com Context** (CalendarPage.tsx linhas 122-130):
   - ✅ useEffect sincroniza blocksData → setBlocks()
   - ✅ Validação de Array implementada
   - ✅ Logs de debug implementados

## 🔍 Checklist de Diagnóstico

Execute os seguintes passos e anote os resultados:

### 1️⃣ Verificar Bloqueios no Banco de Dados

```powershell
# PowerShell
$headers = @{
  'apikey' = '<SUPABASE_ANON_KEY>'
  'Authorization' = 'Bearer <SUPABASE_ANON_KEY>'
}

# Listar todos os bloqueios
Invoke-RestMethod -Uri "https://odcgnzfremrqnvtitpcc.supabase.co/rest/v1/blocks?select=*&order=created_at.desc" -Headers $headers | ConvertTo-Json -Depth 10
```

**Resultado Esperado**: Lista com bloqueios existentes, campos: `property_id`, `start_date`, `end_date`, etc.

**✅ VERIFICAR**:
- [ ] Bloqueios existem no banco?
- [ ] Campos estão em snake_case?
- [ ] property_id corresponde a um imóvel existente?
- [ ] Datas estão no formato YYYY-MM-DD?

---

### 2️⃣ Verificar Propriedades Selecionadas no Frontend

**No Console do Navegador (F12)**:

```javascript
// Verificar quais propriedades estão selecionadas
console.log('Propriedades selecionadas:', JSON.parse(localStorage.getItem('calendar-selected-properties')));
```

**✅ VERIFICAR**:
- [ ] Há propriedades selecionadas?
- [ ] Os IDs correspondem aos `property_id` dos bloqueios no banco?
- [ ] Array não está vazio?

---

### 3️⃣ Verificar Logs da Busca de Bloqueios

**No Console do Navegador**, procure por:

```
🔄 [CalendarPage] Buscando bloqueios para X propriedades
📤 [CalendarPage] PropertyIDs: ["id1", "id2", ...]
📥 [CalendarPage] Resposta da API de bloqueios: {...}
✅ [CalendarPage] X bloqueios carregados
```

**E também**:

```
✅ [calendarApi.getBlocks] X bloqueios transformados
```

**✅ VERIFICAR**:
- [ ] Log "Buscando bloqueios" aparece?
- [ ] PropertyIDs está correto (não vazio)?
- [ ] API retorna success: true?
- [ ] API retorna data com bloqueios?
- [ ] Transformação foi executada?
- [ ] Número de bloqueios > 0?

---

### 4️⃣ Verificar Sincronização com Context

**No Console do Navegador**, procure por:

```
🔄 [CalendarPage] blocksData changed: [...]
📊 [CalendarPage] Sincronizando bloqueios: X
```

**✅ VERIFICAR**:
- [ ] blocksData mudou?
- [ ] Array foi sincronizado?
- [ ] Número de bloqueios bate?

---

### 5️⃣ Verificar Props no CalendarGrid

**No Console do Navegador**, adicione temporariamente:

```javascript
// Em CalendarGrid.tsx, linha ~50
console.log('🎨 [CalendarGrid] Recebendo blocks prop:', blocks);
console.log('🎨 [CalendarGrid] Número de bloqueios:', blocks?.length);
```

**✅ VERIFICAR**:
- [ ] Prop `blocks` está sendo recebida?
- [ ] Array não é null/undefined?
- [ ] Bloqueios têm formato camelCase?
- [ ] Campos propertyId, startDate, endDate existem?
- [ ] Campo nights existe e é > 0?

---

### 6️⃣ Verificar Filtro de Bloqueios por Data/Propriedade

**Adicionar log temporário em CalendarGrid.tsx**, na função `getBlockForPropertyAndDate`:

```typescript
const getBlockForPropertyAndDate = (propertyId: string, date: Date, blocks: any[]): any | null => {
  if (!blocks || blocks.length === 0) {
    console.log('⚠️ [getBlockForPropertyAndDate] Nenhum bloqueio disponível');
    return null;
  }
  
  console.log(`🔍 [getBlockForPropertyAndDate] Buscando bloqueio para property=${propertyId}, date=${date.toISOString().split('T')[0]}`);
  console.log(`🔍 [getBlockForPropertyAndDate] Bloqueios disponíveis:`, blocks.map(b => ({
    propertyId: b.propertyId,
    startDate: b.startDate,
    endDate: b.endDate
  })));
  
  const found = blocks.find(b => {
    if (b.propertyId !== propertyId) return false;
    
    const [startYear, startMonth, startDay] = b.startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = b.endDate.split('-').map(Number);
    
    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);
    
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    
    const currentDate = new Date(date);
    currentDate.setHours(0, 0, 0, 0);
    
    const matches = currentDate >= startDate && currentDate < endDate;
    
    if (matches) {
      console.log(`✅ [getBlockForPropertyAndDate] MATCH encontrado!`, b);
    }
    
    return matches;
  });
  
  if (!found) {
    console.log(`❌ [getBlockForPropertyAndDate] Nenhum match para property=${propertyId}, date=${date.toISOString().split('T')[0]}`);
  }
  
  return found || null;
};
```

**✅ VERIFICAR**:
- [ ] Função está sendo chamada?
- [ ] propertyId corresponde ao bloqueio?
- [ ] Datas estão sendo comparadas corretamente?
- [ ] Match está sendo encontrado?

---

## 🐛 Possíveis Causas do Problema

### Causa 1: Propriedades Não Selecionadas
**Sintoma**: `selectedProperties` está vazio  
**Log Esperado**: `⏭️ [CalendarPage] Nenhuma propriedade selecionada, pulando busca de bloqueios`

**Solução**:
```typescript
// Verificar auto-seleção em CalendarPage.tsx linha 135
if (propertiesData && state.selectedProperties.length === 0) {
  setSelectedProperties(propertiesData.map((p: Property) => p.id));
}
```

---

### Causa 2: property_id Não Corresponde
**Sintoma**: Bloqueios no banco têm `property_id` diferente dos IDs das propriedades  
**Log Esperado**: `❌ [getBlockForPropertyAndDate] Nenhum match` (propertyId não bate)

**Solução**: Atualizar `property_id` no banco ou verificar qual ID correto usar

---

### Causa 3: Formato de Data Incorreto
**Sintoma**: Backend retorna datas em formato diferente de YYYY-MM-DD  
**Log Esperado**: Erro ao fazer split('-') em startDate/endDate

**Solução**: Verificar formato retornado pelo backend, ajustar transformação se necessário

---

### Causa 4: React Query Cache Stale
**Sintoma**: Dados antigos/vazios em cache  
**Log Esperado**: `✅ [CalendarPage] 0 bloqueios carregados` mesmo com dados no banco

**Solução**: Limpar cache e recarregar
```typescript
queryClient.invalidateQueries({ queryKey: ['blocks'] });
queryClient.refetchQueries({ queryKey: ['blocks'] });
```

---

### Causa 5: Bloqueios Fora do DateRange Visível
**Sintoma**: Bloqueios existem mas estão em datas não renderizadas no calendário  
**Log Esperado**: `getBlockForPropertyAndDate` não é chamado para essas datas

**Solução**: Verificar `dateRange` do calendário cobre período dos bloqueios

---

## 🔧 Solução Definitiva

### Passo 1: Adicionar Logs Completos

Adicione logs completos em **CalendarGrid.tsx** no início do componente:

```typescript
useEffect(() => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎨 [CalendarGrid] PROPS RECEBIDAS:');
  console.log('   - properties:', properties?.length, 'itens');
  console.log('   - reservations:', reservations?.length, 'itens');
  console.log('   - blocks:', blocks?.length, 'itens');
  console.log('   - blocks detalhes:', blocks);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}, [properties, reservations, blocks]);
```

---

### Passo 2: Validar Dados Chegando

Se `blocks?.length === 0` mas existem bloqueios no banco:
- **Problema na busca** (CalendarPage) ou **transformação** (api.ts)

Se `blocks?.length > 0` mas cards não aparecem:
- **Problema no filtro** (getBlockForPropertyAndDate) ou **renderização** (JSX do CalendarGrid)

---

### Passo 3: Hard Refresh

1. Abrir DevTools (F12)
2. Limpar localStorage: `localStorage.clear()`
3. Recarregar com Ctrl+Shift+R (hard refresh)
4. Fazer login novamente
5. Selecionar propriedades manualmente no calendário
6. Verificar logs

---

### Passo 4: Teste de Backend Direto

```powershell
# Testar rota de bloqueios diretamente
$token = Get-Content ".\token.txt" # Seu token SHA-512
$headers = @{
  'X-Auth-Token' = $token
  'apikey' = '<SUPABASE_ANON_KEY>'
}

Invoke-RestMethod -Uri "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/blocks?propertyIds=9f6cad48-42e9-4ed5-b766-82127a62dce2" -Headers $headers | ConvertTo-Json -Depth 10
```

**Resultado Esperado**:
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "property_id": "9f6cad48-42e9-4ed5-b766-82127a62dce2",
      "start_date": "2024-12-20",
      "end_date": "2024-12-25",
      "reason": "Manutenção"
    }
  ]
}
```

---

## 📋 Template de Relatório

Depois de executar o diagnóstico, forneça:

```
✅ 1. Bloqueios no banco: SIM/NÃO (quantos?)
✅ 2. Propriedades selecionadas: SIM/NÃO (quais IDs?)
✅ 3. Log "Buscando bloqueios": SIM/NÃO
✅ 4. API retornou bloqueios: SIM/NÃO (quantos?)
✅ 5. Transformação executada: SIM/NÃO
✅ 6. Sincronização com context: SIM/NÃO
✅ 7. CalendarGrid recebeu blocks: SIM/NÃO (quantos?)
✅ 8. getBlockForPropertyAndDate chamado: SIM/NÃO
✅ 9. Match encontrado: SIM/NÃO

📸 ANEXAR: Screenshot do console com logs completos
```

---

## 🎯 Próximos Passos Baseados no Diagnóstico

- **Se bloqueios não estão no banco** → Criar bloqueios via UI
- **Se API não retorna bloqueios** → Problema de backend/autenticação
- **Se transformação falha** → Corrigir utils/api.ts
- **Se CalendarGrid não recebe** → Problema de props/context
- **Se filtro não encontra match** → property_id ou datas não batem

---

**Versão**: v1.0.103.359  
**Data**: 19/12/2024 22:30  
**Status**: Aguardando diagnóstico do usuário
