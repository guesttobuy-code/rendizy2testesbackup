# 🔄 HANDOFF COMPLETO - Calendar Bulk Rules

**Data:** 06/01/2026  
**Sessão:** Debugging de regras de calendário em massa que não persistem na UI

---

## 📋 RESUMO EXECUTIVO

O usuário reportou que as regras de calendário em massa (ajuste de preço %, mínimo de noites, restrições) "salvam por um mero instante, depois some tudo". Investigamos e descobrimos que:

1. **CAUSA RAIZ RESOLVIDA:** A tabela `calendar_pricing_rules` tinha uma FK para `properties(id)`, mas a tabela `properties` foi **descontinuada** - o sistema usa `anuncios_ultimate` como fonte de imóveis. Isso causava erro de FK violation em todos os inserts.

2. **BACKEND FUNCIONANDO:** Após remover a FK, o Edge Function `calendar-rules-batch` salva corretamente (confirmado com 5 regras no banco).

3. **PROBLEMA RESTANTE:** A UI não exibe as regras salvas. Adicionamos logs de debug para investigar na próxima sessão.

---

## 🔍 PROBLEMA ORIGINAL

### Console do usuário (início da sessão):
```
Edge batch result: {success: false, processed: 0, failed: 4, errors: Array(4)}
```

### Console do usuário (após fix FK):
```
[useCalendarPricingRules] Edge batch result: {success: true, processed: 6, failed: 0, errors: Array(0), results: Array(6)}
```

**Observação do usuário:** "ele diz que salva, porem não salva de fato na tela"

---

## 🛠️ O QUE FOI FEITO

### 1. Identificação da causa raiz

Descobrimos via script de teste que o erro era:
```
"error": "insert or update on table \"calendar_pricing_rules\" violates foreign key constraint \"calendar_pricing_rules_property_id_fkey\""
```

A FK referenciava `properties(id)`, mas:
- A tabela `properties` só tinha 1 registro de teste (`cfd4c4d3-12bb-4d4a-a855-1912f1a6caee`)
- Os property IDs usados no calendário vêm de `anuncios_ultimate` (ex: `0e0a0f3d-cf93-4414-a731-e5d70d9a8258`)
- Usuário confirmou: **"properties não existe mais... usamos anuncios_ultimate como padrão"**

### 2. Remoção da FK (executado manualmente no Supabase SQL Editor)

```sql
ALTER TABLE calendar_pricing_rules
  DROP CONSTRAINT IF EXISTS calendar_pricing_rules_property_id_fkey;

COMMENT ON COLUMN calendar_pricing_rules.property_id IS 
  'ID do imóvel em anuncios_ultimate (sem FK por design - fonte é anuncios_ultimate)';
```

**Arquivo de referência:** `EXECUTE_NO_SUPABASE_SQL_EDITOR.sql` (na raiz do workspace)

### 3. Verificação do banco após fix

```
Rules found: 5
- 2026-01-06: condition_percent: -10.0
- 2026-01-07: condition_percent: -10.0
- 2026-01-08: condition_percent: -10.0
- 2026-01-09: condition_percent: -10.0
- 2026-01-10: condition_percent: +15.0
```

**As regras ESTÃO no banco de dados corretamente.**

### 4. Logs de debug adicionados

Adicionei logs em `hooks/useCalendarPricingRules.ts` na função `refreshRules`:

```typescript
console.log(`[useCalendarPricingRules] refreshRules with dateRange: ${fromStr} -> ${toStr}`);
console.log(`[useCalendarPricingRules] refreshRules loaded ${rulesArray.length} rules from DB`);
console.log(`[useCalendarPricingRules] First rule:`, rulesArray[0]);
```

---

## 📁 ARQUIVOS RELEVANTES

### Código Principal

| Arquivo | Descrição |
|---------|-----------|
| `hooks/useCalendarPricingRules.ts` | Hook que gerencia regras de calendário - contém `refreshRules`, `getRuleForDate`, `flushQueue` |
| `components/CalendarGrid.tsx` | Componente principal do calendário - usa o hook acima |
| `supabase/functions/calendar-rules-batch/index.ts` | Edge Function que processa operações em batch |

### Migrations

| Arquivo | Status |
|---------|--------|
| `supabase/migrations/20260105_create_calendar_pricing_rules.sql` | Criou a tabela (com FK problemática na linha 13) |
| `supabase/migrations/20260106_drop_calendar_pricing_rules_fk_properties.sql` | Migration para dropar FK (criada mas aplicada manualmente) |

### Scripts de Teste

| Arquivo | Descrição |
|---------|-----------|
| `_tmp_test_calendar_batch.ps1` | Testa Edge Function diretamente - MUITO ÚTIL |
| `EXECUTE_NO_SUPABASE_SQL_EDITOR.sql` | SQL para remover FK (já executado) |

---

## 🔧 CONFIGURAÇÃO DO AMBIENTE

### Banco de Dados
- **Project Ref:** `odcgnzfremrqnvtitpcc`
- **Supabase URL:** `https://odcgnzfremrqnvtitpcc.supabase.co`

### Tabelas Importantes
- `calendar_pricing_rules` - Regras de calendário (condição %, min_nights, restriction)
- `anuncios_ultimate` - Fonte correta de property IDs (NÃO usar `properties`)
- `organizations` - Multi-tenant (FK válida em calendar_pricing_rules)
- `sessions` - Autenticação customizada (não usa Supabase Auth)

### IDs de Teste
- **Organization ID:** `00000000-0000-0000-0000-000000000000`
- **Property ID de teste:** `0e0a0f3d-cf93-4414-a731-e5d70d9a8258`

---

## 📊 FLUXO DE DADOS

```
CalendarGrid.tsx
    │
    ├── useCalendarPricingRules({ organizationId, dateRange })
    │       │
    │       ├── refreshRules() → GET /rest/v1/calendar_pricing_rules
    │       │
    │       ├── bulkUpsertOptimistic(rules[]) → Adiciona à fila
    │       │
    │       └── flushQueue() → POST /functions/v1/calendar-rules-batch
    │               │
    │               └── Edge Function faz INSERT/UPDATE no banco
    │
    └── getRuleForDate(propertyId, date) → Busca no mapa indexado
```

---

## 🔴 PROBLEMA PENDENTE

A UI não exibe as regras salvas, apesar do backend confirmar sucesso.

### Hipóteses a investigar:

1. **`dateRange` não inclui as datas salvas**
   - O hook filtra por `dateRange` na query
   - Se o calendário está mostrando dezembro 2025, regras de janeiro 2026 não carregam
   - Verificar logs: `refreshRules with dateRange: X -> Y`

2. **`refreshRules` não é chamado após save**
   - O código chama `await refreshRules()` após `flushQueue()` no `catch` e no `finally`
   - Verificar se o log `refreshRules loaded X rules` aparece

3. **Indexação incorreta no mapa**
   - `getRuleForDate` usa `rulesByPropertyAndDate.get(propertyId)`
   - O `propertyId` pode não estar batendo (case sensitivity, UUID format)

4. **Componente não re-renderiza**
   - Mesmo que `rules` atualize, o React pode não re-renderizar as células

---

## 🧪 COMO TESTAR

### 1. Verificar regras no banco via script:
```powershell
cd "c:\Users\rafae\OneDrive\Desktop\Rendizyoficial-main arquivos mais atualizado do github 09 12 2025"
& .\_tmp_test_calendar_batch.ps1
```

### 2. Limpar todas as regras de teste:
```sql
DELETE FROM calendar_pricing_rules 
WHERE organization_id = '00000000-0000-0000-0000-000000000000';
```

### 3. Verificar FKs da tabela:
```sql
SELECT 
    tc.constraint_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'calendar_pricing_rules';
```

**Esperado após fix:** Apenas `calendar_pricing_rules_organization_id_fkey` → `organizations`

---

## 📝 COMMITS DESTA SESSÃO

```
be6baee - debug: add logs to calendar rules refreshRules
54cbe01 - fix(cors): add x-auth-token to calendar-rules-batch allowed headers
```

---

## 🚀 PRÓXIMOS PASSOS

1. **Iniciar o dev server:**
   ```powershell
   cd "c:\Users\rafae\OneDrive\Desktop\Rendizyoficial-main arquivos mais atualizado do github 09 12 2025\Rendizyoficial-main"
   npm run dev
   ```

2. **Abrir http://localhost:3000/calendario**

3. **Navegar para janeiro 2026** (onde estão as regras salvas)

4. **Observar console do browser:**
   - `[useCalendarPricingRules] refreshRules with dateRange: X -> Y`
   - `[useCalendarPricingRules] refreshRules loaded X rules from DB`
   - Se X = 0, problema é no filtro de data
   - Se X > 0 mas não exibe, problema é na renderização

5. **Se o dateRange não inclui as datas:**
   - Verificar como `CalendarGrid` calcula `dateRange`
   - Pode precisar expandir o range ou remover filtro

6. **Se carrega mas não exibe:**
   - Adicionar log em `getRuleForDate` para ver se é chamado
   - Verificar se o `propertyId` bate com o do mapa

---

## 🗂️ ESTRUTURA DE ARQUIVOS IMPORTANTE

```
Rendizyoficial-main/
├── hooks/
│   └── useCalendarPricingRules.ts    ← Hook principal (modificado)
├── components/
│   └── CalendarGrid.tsx               ← Componente do calendário
├── supabase/
│   ├── functions/
│   │   └── calendar-rules-batch/
│   │       └── index.ts               ← Edge Function
│   └── migrations/
│       ├── 20260105_create_calendar_pricing_rules.sql
│       └── 20260106_drop_calendar_pricing_rules_fk_properties.sql
└── ...

Workspace root/
├── _tmp_test_calendar_batch.ps1       ← Script de teste útil
├── EXECUTE_NO_SUPABASE_SQL_EDITOR.sql ← SQL já executado
└── _PROMPT_CALENDAR_RULES_DEBUG_2026_01_06.md ← Handoff anterior
```

---

## ⚠️ PONTOS CRÍTICOS

1. **NUNCA use tabela `properties`** - está descontinuada, usar `anuncios_ultimate`

2. **Autenticação customizada** - Sistema usa `sessions` table, não Supabase Auth. O token vem do header `x-auth-token`.

3. **Multi-tenant** - Todas as queries devem filtrar por `organization_id`

4. **Edge Functions precisam de CORS** - Headers allowed: `authorization, apikey, content-type, x-auth-token, x-client-info`

---

## 📞 CONTEXTO DO USUÁRIO

- Usuário disse que vai dormir e continua amanhã
- Quer que as regras de calendário em massa funcionem (salvar e exibir)
- Já confirmou que o sistema deve usar `anuncios_ultimate` como fonte de imóveis

---

## 🔗 LINKS ÚTEIS

- **Supabase Dashboard:** https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc
- **SQL Editor:** https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql
- **Edge Functions:** https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions

---

**FIM DO HANDOFF**
