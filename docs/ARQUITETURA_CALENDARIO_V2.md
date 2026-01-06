# Arquitetura do Calendário - Sistema de Performance V2.1

> 📅 Criado: 2026-01-06  
> 📝 Versão: 1.0.103.408  
> 🔗 Changelog: [CHANGELOG_V1.0.103.408.md](changelogs/CHANGELOG_V1.0.103.408.md)

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

## Roadmap

### ✅ Concluído (V1.0.103.408)

- [x] Sprint 1: Debouncing + Optimistic Updates
- [x] Sprint 2: Componente PropertyCalendarRow
- [x] Sprint 3: Edge Function calendar-rules-batch
- [x] Sprint 5: CalendarQueueIndicator

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
  - `4a0a440` - Modais Condição/Restrições
  - `ea2f48e` - Optimistic updates + queue
  - `178ce7d` - Edge Function + componentes

- **Arquivos relacionados:**
  - [CalendarGrid.tsx](../components/CalendarGrid.tsx)
  - [useCalendarPricingRules.ts](../hooks/useCalendarPricingRules.ts)
  - [CalendarQueueIndicator.tsx](../components/CalendarQueueIndicator.tsx)
  - [PropertyCalendarRow.tsx](../components/PropertyCalendarRow.tsx)
