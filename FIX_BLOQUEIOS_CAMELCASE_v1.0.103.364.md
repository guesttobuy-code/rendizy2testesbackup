# 🔧 FIX: Bloqueios com campos undefined - v1.0.103.364

**Data**: 19/12/2024 23:28  
**Problema**: Bloqueios chegavam ao CalendarGrid com `propertyId: undefined`, `startDate: undefined`, `endDate: undefined`, `nights: NaN`  
**Causa Raiz**: Transformação duplicada de camelCase no frontend quando o backend já retornava em camelCase

---

## 🔍 DIAGNÓSTICO

### Sintomas no Console

```javascript
CalendarGrid.tsx:211 🔍 [CalendarGrid] Primeiro bloqueio: {
  id: '265507bf-f509-43ca-bc78-c350c2d8fc58',
  propertyId: undefined,  // ❌ Deveria ser UUID
  startDate: undefined,   // ❌ Deveria ser "2024-12-20"
  endDate: undefined,     // ❌ Deveria ser "2024-12-22"
  nights: NaN             // ❌ Deveria ser 2
}
```

### Causa Raiz

1. **Backend** (`routes-blocks.ts`):
   - Retorna bloqueios via `sqlToBlock()` que **já converte** snake_case → camelCase
   - Campos retornados: `propertyId`, `startDate`, `endDate` (camelCase) ✅

2. **Frontend** (`api.ts`):
   - Tentava fazer **segunda transformação**: `block.property_id` → `propertyId`
   - Mas como backend já retornou `propertyId`, `block.property_id` era `undefined` ❌

3. **Resultado**:
   - Todos os campos ficavam `undefined` porque a transformação procurava por campos que não existiam

---

## ✅ SOLUÇÃO APLICADA

### 1. **Frontend - utils/api.ts (linhas 922-944)**

**ANTES** (transformação duplicada):
```typescript
if (response.success && response.data) {
  const transformedBlocks = response.data.map((block: any) => ({
    id: block.id,
    propertyId: block.property_id,     // ❌ undefined (campo não existe)
    startDate: block.start_date,       // ❌ undefined
    endDate: block.end_date,           // ❌ undefined
    nights: (() => {
      const start = new Date(block.start_date);  // ❌ Invalid Date
      const end = new Date(block.end_date);      // ❌ Invalid Date
      return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    })()  // ❌ Result: NaN
  }));
  
  console.log(`✅ [calendarApi.getBlocks] ${transformedBlocks.length} bloqueios transformados`);
  
  return {
    ...response,
    data: transformedBlocks
  };
}
```

**DEPOIS** (remoção da transformação):
```typescript
if (response.success && response.data) {
  console.log(`✅ [calendarApi.getBlocks] ${response.data.length} bloqueios carregados`);
  console.log(`🔍 [calendarApi.getBlocks] Primeiro bloqueio:`, response.data[0]);
}

return response;  // ✅ Backend já retornou camelCase
```

**Mudança**:
- Removida transformação duplicada
- Backend já retorna `propertyId`, `startDate`, `endDate`, `nights` corretos
- Frontend apenas faz log e retorna os dados como vieram

### 2. **Backend - routes-blocks.ts (linhas 51-75)**

**ANTES** (suportava apenas `property_id` singular):
```typescript
const propertyId = c.req.query('property_id');
const startDate = c.req.query('start_date');
const endDate = c.req.query('end_date');

// ...

// Filtrar por propriedade se fornecido
if (propertyId) {
  query = query.eq('property_id', propertyId);
}
```

**DEPOIS** (suporte a `propertyIds` plural):
```typescript
// ✅ FIX v1.0.103.364: Suportar propertyIds (plural) para buscar múltiplas propriedades
const propertyIdsParam = c.req.query('propertyIds');
const propertyId = c.req.query('property_id');
const startDate = c.req.query('start_date');
const endDate = c.req.query('end_date');

// ...

// ✅ FIX v1.0.103.364: Filtrar por múltiplas propriedades ou uma propriedade
if (propertyIdsParam) {
  const idsArray = propertyIdsParam.split(',').map(id => id.trim());
  query = query.in('property_id', idsArray);
} else if (propertyId) {
  query = query.eq('property_id', propertyId);
}
```

**Mudança**:
- Adicionado suporte para `?propertyIds=id1,id2,id3` (comma-separated)
- Usa Supabase `.in()` para buscar múltiplas propriedades de uma vez
- Mantém retrocompatibilidade com `?property_id=single-id`

---

## 📊 ARQUITETURA - FLUXO DE DADOS

### Antes (Problema)

```
Backend (routes-blocks.ts)
   ↓ SELECT * FROM blocks WHERE property_id IN (...)
   ↓ rows[] (snake_case: property_id, start_date, end_date)
   ↓ sqlToBlock(rows) → CONVERTE para camelCase
   ↓ Response: { propertyId, startDate, endDate }  ✅ camelCase
   ↓
Frontend (api.ts)
   ↓ Recebe: { propertyId, startDate, endDate }
   ↓ TRANSFORMA NOVAMENTE: block.property_id → propertyId
   ↓ block.property_id não existe! → undefined  ❌
   ↓
CalendarGrid
   ↓ Recebe: { propertyId: undefined, startDate: undefined, nights: NaN }  ❌
   ↓ getBlockForPropertyAndDate(property, date, blocks) → null
   ↓ Orange cards não renderizam  ❌
```

### Depois (Solução)

```
Backend (routes-blocks.ts)
   ↓ SELECT * FROM blocks WHERE property_id IN (id1, id2)  ✅
   ↓ rows[] (snake_case: property_id, start_date, end_date)
   ↓ sqlToBlock(rows) → CONVERTE para camelCase
   ↓ Response: { propertyId, startDate, endDate, nights }  ✅
   ↓
Frontend (api.ts)
   ↓ Recebe: { propertyId, startDate, endDate, nights }  ✅
   ↓ Apenas faz log e retorna direto (SEM transformação)  ✅
   ↓
CalendarGrid
   ↓ Recebe: { propertyId: "uuid", startDate: "2024-12-20", nights: 2 }  ✅
   ↓ getBlockForPropertyAndDate(property, date, blocks) → encontra bloqueio  ✅
   ↓ Orange cards renderizam com largura correta (nights * 80px)  ✅
```

---

## 🎯 VALIDAÇÃO

### Testes Realizados

1. ✅ **Deploy do Backend**: `npx supabase functions deploy rendizy-server`
2. ⏳ **Reload da Página**: Usuário deve recarregar `/calendario` para ver os bloqueios
3. ⏳ **Logs Esperados**:
   ```javascript
   api.ts:952 ✅ [calendarApi.getBlocks] 2 bloqueios carregados
   api.ts:953 🔍 [calendarApi.getBlocks] Primeiro bloqueio: {
     id: "265507bf-f509-43ca-bc78-c350c2d8fc58",
     propertyId: "3cabf06d-51c6-4e2b-b73e-520e018f1fce",  // ✅ UUID
     startDate: "2024-12-20",                              // ✅ Date
     endDate: "2024-12-22",                                // ✅ Date
     nights: 2,                                            // ✅ Number
     type: "block",
     reason: "Manutenção"
   }
   CalendarGrid.tsx:203 🔍 [CalendarGrid] Props recebidas: {blocksCount: 2}
   ```
4. ⏳ **Visual**: Orange cards `bg-orange-100 border-orange-400` aparecem em 20/12 e 21/12

---

## 📝 ARQUIVOS MODIFICADOS

### Frontend

1. **utils/api.ts** (linhas 922-944)
   - Removida transformação snake_case → camelCase duplicada
   - Backend já retorna camelCase via `sqlToBlock()`
   - Adicionados logs de debug para validar dados recebidos

### Backend

1. **supabase/functions/rendizy-server/routes-blocks.ts** (linhas 51-75)
   - Adicionado suporte para `?propertyIds=id1,id2,id3` (comma-separated)
   - Usa `.in('property_id', idsArray)` para buscar múltiplas propriedades
   - Mantém retrocompatibilidade com `?property_id=single-id`

---

## 🔑 APRENDIZADOS

### 1. Evitar Transformação Duplicada
- Se o backend já transforma snake_case → camelCase, **não transforme novamente no frontend**
- Usar mappers centralizados (`sqlToBlock`, `blockToSql`) para consistência
- Documentar onde acontece a transformação

### 2. Verificar Estrutura dos Dados
- Adicionar logs `console.log('Primeiro item:', data[0])` para debug
- Validar se campos existem antes de acessar (`block.property_id` vs `block.propertyId`)
- TypeScript ajuda mas não previne erros em runtime

### 3. Suporte a Filtros Múltiplos
- APIs devem suportar tanto singular quanto plural (`property_id` vs `propertyIds`)
- Use `.in()` do Supabase para filtros múltiplos (mais eficiente que N queries)
- Split com `.map(id => id.trim())` para remover espaços extras

---

## 🔄 PRÓXIMOS PASSOS

1. ⏳ **Usuário deve recarregar** `/calendario` para ver os bloqueios renderizados
2. ⏳ **Validar orange cards**: Devem aparecer em 20/12 (teste 30) e 20-22/12 (Dona Rosa)
3. ⏳ **Verificar width dos cards**: `(nights * 80) - 6px` → 154px para 2 noites
4. ⏳ **Testar modal de bloqueio**: Ao clicar no card laranja, deve abrir BlockDetailsModal
5. 🟡 **Remover logs de debug** após confirmar que bloqueios renderizam corretamente

---

## 📚 REFERÊNCIAS

- **utils-block-mapper.ts**: Funções `sqlToBlock()` e `blockToSql()`
- **CONTEXTO_SESSAO_18_12_2024_v2.md**: Sessão anterior de trabalho com bloqueios
- **DEBUG_BLOQUEIOS_NAO_APARECEM_v1.0.103.361.md**: Diagnóstico inicial do problema
- **FIX_IMPORT_CALENDAR_API_v1.0.103.362.md**: Correção de import anterior

---

**Status Final**: ✅ Deploy concluído, aguardando reload do usuário para validação visual
