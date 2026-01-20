# Arquitetura do Calendário - Sistema de Performance V2.1

> 📅 Criado: 2026-01-06  
> 📝 Versão: 1.0.103.601  
> 🔄 Atualizado: 2026-01-16  
> 🔗 Changelog: [CHANGELOG_2026-01-16_CALENDAR_UX_IMPROVEMENTS.md](changelogs/CHANGELOG_2026-01-16_CALENDAR_UX_IMPROVEMENTS.md)

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Componentes](#componentes)
4. [Hook Principal](#hook-principal)
5. [Edge Function](#edge-function)
6. [Configuração](#configuração)
7. [Troubleshooting](#troubleshooting)
8. [Roadmap](#roadmap)

---

## Visão Geral

O calendário do Rendizy foi otimizado para suportar cenários de alto volume:

- **1000+ imobiliárias** usando o sistema
- **100+ propriedades** por imobiliária
- **Alterações simultâneas** em lote

### Problema Resolvido

Antes da V2.1, cada clique no calendário gerava uma requisição individual ao Supabase, causando:
- Latência perceptível (200-500ms por operação)
- Sobrecarga no banco de dados
- UI travando durante salvamento

### Solução Implementada

1. **Optimistic Updates**: UI atualiza imediatamente
2. **Queue com Debounce**: Agrupa operações em janelas de 500ms
3. **Edge Function Batch**: Processa até 500 operações em uma requisição
4. **Indicador Visual**: Feedback claro do status de salvamento

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USUÁRIO                                     │
│                            │                                        │
│                      ┌─────▼─────┐                                  │
│                      │ CalendarGrid │                               │
│                      │   (UI)     │                                 │
│                      └─────┬─────┘                                  │
│                            │                                        │
│              ┌─────────────▼─────────────┐                          │
│              │ useCalendarPricingRules   │                          │
│              │        (V2.1)             │                          │
│              │  ┌───────────────────┐    │                          │
│              │  │ applyOptimisticRule│◄──┼── Atualiza UI imediato   │
│              │  └─────────┬─────────┘    │                          │
│              │            │              │                          │
│              │  ┌─────────▼─────────┐    │                          │
│              │  │  operationQueue   │◄───┼── Armazena operações     │
│              │  └─────────┬─────────┘    │                          │
│              │            │              │                          │
│              │  ┌─────────▼─────────┐    │                          │
│              │  │  debounce(500ms)  │◄───┼── Agrupa em janela       │
│              │  └─────────┬─────────┘    │                          │
│              │            │              │                          │
│              │  ┌─────────▼─────────┐    │                          │
│              │  │    flushQueue     │◄───┼── Envia ao servidor      │
│              │  └─────────┬─────────┘    │                          │
│              └────────────┼──────────────┘                          │
│                           │                                         │
│              ┌────────────▼──────────────┐                          │
│              │   CalendarQueueIndicator  │◄── Mostra status         │
│              └────────────┬──────────────┘                          │
│                           │                                         │
│              ┌────────────▼──────────────┐                          │
│              │   Edge Function           │                          │
│              │ calendar-rules-batch      │                          │
│              │   (até 500 ops/request)   │                          │
│              └────────────┬──────────────┘                          │
│                           │                                         │
│              ┌────────────▼──────────────┐                          │
│              │   Supabase PostgreSQL     │                          │
│              │ calendar_pricing_rules    │                          │
│              └───────────────────────────┘                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Componentes

### CalendarQueueIndicator

**Arquivo:** `components/CalendarQueueIndicator.tsx`

Indicador visual do status da fila de operações:

| Estado | Cor | Ícone | Descrição |
|--------|-----|-------|-----------|
| Salvo | Verde | ✓ | Operações salvas (2s feedback) |
| Pendente | Âmbar | ⏱ | Aguardando debounce |
| Processando | Azul | ⟳ | Enviando ao servidor |
| Erro | Vermelho | ⚠ | Falha (com retry) |

**Uso:**
```tsx
import { CalendarQueueIndicator } from './CalendarQueueIndicator';

// No componente do calendário:
const { queueStatus, flushQueue } = useCalendarPricingRules({ organizationId });

<CalendarQueueIndicator 
  status={queueStatus}
  onForceFlush={flushQueue}
  className="fixed bottom-4 right-4 z-50"
/>
```

### PropertyCalendarRow

**Arquivo:** `components/PropertyCalendarRow.tsx`

Linha de propriedade isolada com React.memo:

- **Status:** ✅ Criado, 🔄 Integração pendente
- **Propósito:** Evitar re-renders desnecessários
- **Futuro:** Virtualização com react-window

---

## Hook Principal

### useCalendarPricingRules

**Arquivo:** `hooks/useCalendarPricingRules.ts`

#### Métodos Principais

| Método | Tipo | Descrição |
|--------|------|-----------|
| `getRuleForDate` | Leitura | Busca regra para data específica |
| `upsertRule` | Escrita (síncrono) | Salva regra (aguarda resposta) |
| `upsertRuleOptimistic` | Escrita (async) | Salva com optimistic update |
| `bulkUpsertOptimistic` | Escrita (batch) | Salva múltiplas regras |
| `flushQueue` | Controle | Força envio da fila |

#### Retorno

```typescript
{
  rules: CalendarPricingRule[];
  rulesByPropertyAndDate: Map<string, Map<string, CalendarPricingRule>>;
  loading: boolean;
  error: string | null;
  
  // Métodos
  refreshRules: () => Promise<void>;
  getRuleForDate: (propertyId, date, applyBatch?) => CalendarPricingRule | null;
  upsertRule: (rule) => Promise<{ success, error? }>;
  deleteRule: (ruleId) => Promise<{ success, error? }>;
  bulkUpsertRules: (rules) => Promise<{ success, error? }>;
  
  // V2.1: Novos
  queueStatus: QueueStatus;
  flushQueue: () => Promise<void>;
  upsertRuleOptimistic: (rule) => void;
  bulkUpsertOptimistic: (rules) => void;
}
```

---

## Edge Function

### calendar-rules-batch

**Arquivo:** `supabase/functions/calendar-rules-batch/index.ts`

#### Endpoints

| Método | Path | Descrição |
|--------|------|-----------|
| POST | `/functions/v1/calendar-rules-batch` | Processar batch |

#### Request

```json
{
  "operations": [
    {
      "type": "upsert",
      "property_id": "uuid-da-propriedade",
      "date": "2026-01-06",
      "min_nights": 3,
      "condition_percent": 10,
      "restriction": null
    },
    {
      "type": "delete",
      "id": "uuid-da-regra",
      "property_id": "uuid-da-propriedade",
      "date": "2026-01-07"
    }
  ]
}
```

#### Response

```json
{
  "success": true,
  "processed": 2,
  "failed": 0,
  "errors": [],
  "results": [
    { "index": 0, "id": "uuid-gerado", "action": "updated" },
    { "index": 1, "id": "uuid-deletado", "action": "deleted" }
  ]
}
```

#### Deploy

```bash
cd Rendizyoficial-main
npx supabase functions deploy calendar-rules-batch --project-ref odcgnzfremrqnvtitpcc
```

---

## Configuração

**Arquivo:** `hooks/useCalendarPricingRules.ts` (topo)

```typescript
// ============================================================================
// CONFIGURAÇÃO DE PERFORMANCE
// ⚠️ Ajuste com cuidado - afeta diretamente a experiência do usuário
// ============================================================================
const DEBOUNCE_MS = 500;           // Janela de agrupamento (não diminuir muito!)
const MAX_QUEUE_SIZE = 100;        // Flush forçado se exceder
const RETRY_ATTEMPTS = 3;          // Tentativas em caso de falha
const RETRY_DELAY_MS = 1000;       // Delay entre tentativas
const USE_EDGE_FUNCTION = true;    // true = Edge Function, false = REST direto
```

### Quando Ajustar

| Parâmetro | Aumentar se... | Diminuir se... |
|-----------|----------------|----------------|
| DEBOUNCE_MS | Muitos requests | Usuário reclama de delay |
| MAX_QUEUE_SIZE | Operações complexas | Memória limitada |
| RETRY_ATTEMPTS | Rede instável | Servidor sobrecarregado |
| USE_EDGE_FUNCTION | ❌ Não desativar | Debug apenas |

---

## Troubleshooting

### Problema: Operações não salvam

1. Verificar console do navegador
2. Checar se Edge Function está deployed
3. Verificar token de autenticação
4. Checar logs da Edge Function no Supabase

### Problema: UI não atualiza

1. Verificar se está usando `upsertRuleOptimistic` (não `upsertRule`)
2. Checar se `queueStatus.errors` está vazio
3. Verificar se `CalendarQueueIndicator` está renderizando

### Problema: Muitos requests

1. Verificar se `USE_EDGE_FUNCTION = true`
2. Checar se debounce está funcionando (500ms)
3. Verificar se não há loop de refresh

---

## Modais do Calendário

> 📅 Atualizado: 2026-01-16 (v1.0.103.601)

### Lista de Modais

| Modal | Arquivo | Ação |
|-------|---------|------|
| BulkPriceConditionModal | `components/BulkPriceConditionModal.tsx` | Desconto/acréscimo % em lote |
| BulkRestrictionsModal | `components/BulkRestrictionsModal.tsx` | Restrições em lote |
| BulkMinNightsModal | `components/BulkMinNightsModal.tsx` | Mínimo de noites em lote |
| PropertyConditionModal | `components/PropertyConditionModal.tsx` | Condição por propriedade |
| PropertyRestrictionsModal | `components/PropertyRestrictionsModal.tsx` | Restrição por propriedade |
| MinNightsEditModal | `components/MinNightsEditModal.tsx` | Mín. noites por propriedade |
| QuotationModal | `components/QuotationModal.tsx` | Criar cotação |
| PriceEditModal | `components/PriceEditModal.tsx` | Editar preços base |

### Recursos Implementados (v1.0.103.601)

1. **Edição de Datas Inline**
   - Todos os modais possuem botão "Editar" ao lado do período
   - Usa `DateRangePicker` para ajustar datas antes de salvar
   - Não altera seleção original do calendário

2. **Loading States**
   - Spinner animado (`Loader2`) no botão durante processamento
   - Toast de loading (`sonner`) com descrição contextual
   - Toast de sucesso/erro ao finalizar
   - Botões desabilitados durante operação

### Padrão de Implementação

```tsx
// Interface permite Promise
onSave: (data: {...}) => void | Promise<void>;

// Estado de loading
const [saving, setSaving] = useState(false);

// Handler assíncrono
const handleSave = async () => {
  setSaving(true);
  const toastId = toast.loading('Aplicando...', {
    description: `${days} dias serão atualizados. Aguarde...`
  });

  try {
    await onSave({ ... });
    toast.success('Sucesso!', { id: toastId });
    onClose();
  } catch (error) {
    toast.error('Erro', { id: toastId, description: error.message });
  } finally {
    setSaving(false);
  }
};

// Botão com feedback visual
<Button disabled={saving}>
  {saving ? <><Loader2 className="animate-spin" /> Salvando...</> : 'Salvar'}
</Button>
```

---

## Roadmap

### ✅ Concluído (V1.0.103.408)

- [x] Sprint 1: Debouncing + Optimistic Updates
- [x] Sprint 2: Componente PropertyCalendarRow
- [x] Sprint 3: Edge Function calendar-rules-batch
- [x] Sprint 5: CalendarQueueIndicator

### ✅ Concluído (V1.0.103.601)

- [x] Edição de datas inline em todos os modais
- [x] Loading states com spinner e toast
- [x] Persistência de base_price no Save All

### 🔄 Pendente

- [ ] **Sprint 4: Zustand State**
  - Migrar estado para Zustand
  - Seletores granulares por propriedade
  - Persistência opcional

- [ ] **Integração PropertyCalendarRow**
  - Refatorar CalendarGrid.tsx
  - Substituir renderização inline
  - Testes de regressão

- [ ] **Virtualização com react-window**
  - Integrar VariableSizeList
  - Suportar 1000+ propriedades
  - Scroll fluido

---

## Referências

- **Commits:**
  - `0b3abf7` - Loading states em todos os modais (2026-01-16)
  - `34f8d0b` - Edição de datas nos modais (2026-01-16)
  - `dfcb863` - Persistência de base_price (2026-01-15)
  - `4a0a440` - Modais Condição/Restrições
  - `ea2f48e` - Optimistic updates + queue
  - `178ce7d` - Edge Function + componentes

- **Arquivos relacionados:**
  - [CalendarGrid.tsx](../components/CalendarGrid.tsx)
  - [useCalendarPricingRules.ts](../hooks/useCalendarPricingRules.ts)
  - [CalendarQueueIndicator.tsx](../components/CalendarQueueIndicator.tsx)
  - [PropertyCalendarRow.tsx](../components/PropertyCalendarRow.tsx)
  - [BulkPriceConditionModal.tsx](../components/BulkPriceConditionModal.tsx)
  - [BulkRestrictionsModal.tsx](../components/BulkRestrictionsModal.tsx)
  - [BulkMinNightsModal.tsx](../components/BulkMinNightsModal.tsx)
  - [PropertyConditionModal.tsx](../components/PropertyConditionModal.tsx)
  - [PropertyRestrictionsModal.tsx](../components/PropertyRestrictionsModal.tsx)
  - [MinNightsEditModal.tsx](../components/MinNightsEditModal.tsx)
  - [DateRangePicker.tsx](../components/DateRangePicker.tsx)
