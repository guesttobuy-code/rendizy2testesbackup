// useCalendarPricingRules.ts
// ============================================================================
// ⚠️ ATENÇÃO: ARQUIVO CRÍTICO DO CALENDÁRIO - LEIA ANTES DE MODIFICAR
// ============================================================================
// 
// 🚨 DEPRECATION NOTICE (2026-02-07):
// Este hook será substituído por useCalendarAvailability.ts que usa:
//   - rate_plan_availability (restrições por dia)
//   - rate_plan_pricing_overrides (ajustes de preço)
// 
// MIGRAÇÃO:
// 1. Set USE_V3_RATE_PLANS = true abaixo para ativar novo sistema
// 2. Testar calendário, validar comportamento
// 3. Após validação, remover este arquivo
//
// HISTÓRICO DE VERSÕES:
// - V1 (original): Chamadas síncronas diretas ao Supabase
// - V2 (2026-01-06): Debouncing + optimistic updates + batch queue
// - V2.1 (2026-01-06): Suporte a Edge Function calendar-rules-batch
// - V3 (2026-02-07): Migração para rate_plan_* tables → useCalendarAvailability.ts
//
// ARQUITETURA V2.1:
// ┌─────────────────────────────────────────────────────────────────┐
// │ 1. Usuário clica → applyOptimisticRule() → UI atualiza IMEDIATO │
// │ 2. Operação entra na queue (operationQueueRef)                  │
// │ 3. Debounce 500ms agrupa múltiplas operações                    │
// │ 4. flushQueue() → Edge Function (ou REST fallback)              │
// │ 5. CalendarQueueIndicator mostra status visual                  │
// └─────────────────────────────────────────────────────────────────┘
//
// COMMITS RELACIONADOS:
// - ea2f48e: perf(calendar): add optimistic updates + batch queue system
// - 178ce7d: perf(calendar): add edge function batch + queue indicator
//
// EDGE FUNCTION: supabase/functions/calendar-rules-batch/index.ts
// INDICADOR: components/CalendarQueueIndicator.tsx
// COMPONENTE ROW: components/PropertyCalendarRow.tsx (preparado para virtualização)
//
// REGRAS DE OURO:
// 1. NUNCA remover o debounce - protege contra flood de requests
// 2. SEMPRE manter o optimistic update - UX crítica para resposta rápida
// 3. USE_EDGE_FUNCTION = true é o padrão (mais eficiente)
// 4. Fallback para REST API existe caso Edge Function falhe
// 5. MAX_QUEUE_SIZE força flush se fila muito grande (proteção)
//
// ============================================================================
// Hook para carregar e salvar regras de calendário do banco
// V2.1: Otimizado com debouncing, optimistic updates, batch queue + Edge Function
// ============================================================================
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// ============================================================================
// V3 FEATURE FLAG - ATIVAR NOVO SISTEMA
// ============================================================================
// Set para true para usar rate_plan_* tables em vez de calendar_pricing_rules
// ⚠️ TESTE BEM ANTES DE ATIVAR EM PRODUÇÃO
const USE_V3_RATE_PLANS = false;

// Re-export do V3 hook para quem quiser usar diretamente
export { useCalendarAvailability } from './useCalendarAvailability';
export type { CalendarPricingRule as CalendarPricingRuleV3 } from './useCalendarAvailability';

// ============================================================================
// CONFIGURAÇÃO DE PERFORMANCE
// ⚠️ Ajuste com cuidado - afeta diretamente a experiência do usuário
// ============================================================================
const DEBOUNCE_MS = 500;           // Tempo para agrupar operações (não diminuir muito!)
const MAX_QUEUE_SIZE = 100;        // Máximo de operações na fila antes de flush forçado
const RETRY_ATTEMPTS = 3;          // Tentativas em caso de falha de rede
const RETRY_DELAY_MS = 1000;       // Delay entre tentativas (exponential backoff futuro)
const USE_EDGE_FUNCTION = true;    // true = Edge Function (recomendado), false = REST direto

// Tipo da regra de calendário
export interface CalendarPricingRule {
  id?: string;
  organization_id: string;
  property_id: string | null; // null = batch/global rule
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  base_price?: number | null;
  condition_percent: number;
  min_nights: number;
  restriction: string | null;
  priority?: number;
  created_at?: string;
  updated_at?: string;
}

// Mapa de regras por data para acesso rápido
export type RulesByDate = Map<string, CalendarPricingRule>;
// Mapa por property_id → RulesByDate
export type RulesByPropertyAndDate = Map<string | null, RulesByDate>;

interface UseCalendarPricingRulesParams {
  organizationId: string | null;
  dateRange?: { from: Date; to: Date };
}

// Tipo de operação na fila
type QueueOperation = {
  type: 'upsert' | 'delete';
  rule: Partial<CalendarPricingRule>;
  tempId?: string; // ID temporário para optimistic update
  timestamp: number;
};

// Status da fila de operações
interface QueueStatus {
  pending: number;
  processing: boolean;
  lastFlush: number | null;
  errors: string[];
}

interface UseCalendarPricingRulesReturn {
  rules: CalendarPricingRule[];
  rulesByPropertyAndDate: RulesByPropertyAndDate;
  loading: boolean;
  error: string | null;
  
  // Métodos
  refreshRules: () => Promise<void>;
  
  // Buscar regra para uma data específica
  getRuleForDate: (propertyId: string | null, date: Date, applyBatchRules?: boolean) => CalendarPricingRule | null;
  
  // Criar/atualizar regra (agora com optimistic update)
  upsertRule: (rule: Partial<CalendarPricingRule>) => Promise<{ success: boolean; error?: string }>;
  
  // Deletar regra
  deleteRule: (ruleId: string) => Promise<{ success: boolean; error?: string }>;
  
  // Criar regras em lote
  bulkUpsertRules: (rules: Partial<CalendarPricingRule>[]) => Promise<{ success: boolean; error?: string }>;
  
  // V2: Novos métodos para queue
  queueStatus: QueueStatus;
  flushQueue: () => Promise<void>;
  
  // V2: Versão otimista (atualiza UI imediatamente)
  upsertRuleOptimistic: (rule: Partial<CalendarPricingRule>) => void;
  bulkUpsertOptimistic: (rules: Partial<CalendarPricingRule>[]) => void;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('rendizy-token');
  return {
    apikey: publicAnonKey,
    Authorization: `Bearer ${publicAnonKey}`,
    'Content-Type': 'application/json',
    ...(token ? { 'X-Auth-Token': token } : {})
  };
}

function formatDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function useCalendarPricingRules({
  organizationId,
  dateRange
}: UseCalendarPricingRulesParams): UseCalendarPricingRulesReturn {
  const [rules, setRules] = useState<CalendarPricingRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Mapa indexado para lookup rápido
  const [rulesByPropertyAndDate, setRulesByPropertyAndDate] = useState<RulesByPropertyAndDate>(new Map());
  
  // V2: Queue de operações pendentes
  const operationQueueRef = useRef<QueueOperation[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFlushingRef = useRef(false);
  
  // V2: Status da fila
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    pending: 0,
    processing: false,
    lastFlush: null,
    errors: []
  });
  
  // V2: Gerar ID temporário para optimistic updates
  const generateTempId = useCallback(() => {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);
  
  // Função para indexar regras em mapa
  const indexRules = useCallback((rules: CalendarPricingRule[]) => {
    const map: RulesByPropertyAndDate = new Map();
    
    for (const rule of rules) {
      const propKey = rule.property_id; // pode ser null para batch
      
      if (!map.has(propKey)) {
        map.set(propKey, new Map());
      }
      
      const dateMap = map.get(propKey)!;
      
      // Expandir range de datas e indexar cada dia
      const start = new Date(rule.start_date + 'T00:00:00');
      const end = new Date(rule.end_date + 'T00:00:00');
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateKey = formatDateYMD(d);
        // Manter regra com maior prioridade
        const existing = dateMap.get(dateKey);
        if (!existing || (rule.priority ?? 0) > (existing.priority ?? 0)) {
          dateMap.set(dateKey, rule);
        }
      }
    }
    
    return map;
  }, []);
  
  // Carregar regras da API
  const refreshRules = useCallback(async () => {
    if (!organizationId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('rendizy-token');
      let rulesArray: CalendarPricingRule[] = [];

      if (token) {
        const edgeUrl = new URL(`https://${projectId}.supabase.co/functions/v1/rendizy-server/calendar-rules/batch`);
        if (dateRange) {
          const fromStr = formatDateYMD(dateRange.from);
          const toStr = formatDateYMD(dateRange.to);
          edgeUrl.searchParams.set('from', fromStr);
          edgeUrl.searchParams.set('to', toStr);
          console.log(`[useCalendarPricingRules] refreshRules via edge with dateRange: ${fromStr} -> ${toStr}`);
        } else {
          console.log(`[useCalendarPricingRules] refreshRules via edge WITHOUT dateRange (loading ALL rules)`);
        }

        const edgeResp = await fetch(edgeUrl.toString(), {
          method: 'GET',
          headers: getAuthHeaders()
        });

        if (!edgeResp.ok) {
          const body = await edgeResp.text();
          throw new Error(`HTTP ${edgeResp.status}: ${body}`);
        }

        const edgeData = await edgeResp.json();
        rulesArray = Array.isArray(edgeData?.data) ? edgeData.data : [];
      } else {
        let url = `https://${projectId}.supabase.co/rest/v1/calendar_pricing_rules`;
        url += `?organization_id=eq.${organizationId}`;
        url += `&select=*`;
        url += `&order=priority.desc,created_at.desc`;
        
        // Filtrar por range de datas se fornecido
        if (dateRange) {
          const fromStr = formatDateYMD(dateRange.from);
          const toStr = formatDateYMD(dateRange.to);
          // Regras que intersectam o range
          url += `&start_date=lte.${toStr}&end_date=gte.${fromStr}`;
          console.log(`[useCalendarPricingRules] refreshRules (anon) with dateRange: ${fromStr} -> ${toStr}`);
        } else {
          console.log(`[useCalendarPricingRules] refreshRules (anon) WITHOUT dateRange (loading ALL rules)`);
        }
        
        const resp = await fetch(url, {
          method: 'GET',
          headers: getAuthHeaders()
        });
        
        if (!resp.ok) {
          const body = await resp.text();
          throw new Error(`HTTP ${resp.status}: ${body}`);
        }
        
        const data = await resp.json();
        rulesArray = Array.isArray(data) ? data : [];
      }
      
      console.log(`[useCalendarPricingRules] refreshRules loaded ${rulesArray.length} rules from DB`);
      if (rulesArray.length > 0) {
        console.log(`[useCalendarPricingRules] First rule:`, rulesArray[0]);
      }
      
      setRules(rulesArray);
      setRulesByPropertyAndDate(indexRules(rulesArray));
      
    } catch (err: any) {
      console.error('[useCalendarPricingRules] refreshRules error:', err);
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [organizationId, dateRange, indexRules]);
  
  // Carregar regras quando organizationId ou dateRange mudar
  useEffect(() => {
    if (organizationId) {
      refreshRules();
    }
  }, [organizationId, dateRange?.from?.getTime(), dateRange?.to?.getTime(), refreshRules]);
  
  // Buscar regra para uma data específica
  const getRuleForDate = useCallback((
    propertyId: string | null,
    date: Date,
    applyBatchRules = false
  ): CalendarPricingRule | null => {
    const dateKey = formatDateYMD(date);
    
    // 1. Tentar regra específica do imóvel
    if (propertyId) {
      const propRules = rulesByPropertyAndDate.get(propertyId);
      if (propRules) {
        const propRule = propRules.get(dateKey);
        if (propRule && !applyBatchRules) {
          return propRule;
        }
      }
    }
    
    // 2. Tentar regra global/batch (property_id = null)
    const globalRules = rulesByPropertyAndDate.get(null);
    if (globalRules) {
      const globalRule = globalRules.get(dateKey);
      if (globalRule) {
        // Se applyBatchRules=true, batch sobrepõe
        if (applyBatchRules) return globalRule;
        
        // Senão, usar se não há regra específica
        if (propertyId) {
          const propRules = rulesByPropertyAndDate.get(propertyId);
          if (!propRules || !propRules.get(dateKey)) {
            return globalRule;
          }
        } else {
          return globalRule;
        }
      }
    }
    
    // 3. Se applyBatchRules=false e há regra específica, usar ela
    if (propertyId && !applyBatchRules) {
      const propRules = rulesByPropertyAndDate.get(propertyId);
      if (propRules) {
        return propRules.get(dateKey) || null;
      }
    }
    
    return null;
  }, [rulesByPropertyAndDate]);
  
  // Criar/atualizar regra
  const upsertRule = useCallback(async (rule: Partial<CalendarPricingRule>) => {
    if (!organizationId) return { success: false, error: 'No organization ID' };
    
    try {
      const payload = {
        ...rule,
        organization_id: organizationId,
        updated_at: new Date().toISOString()
      };
      
      let url = `https://${projectId}.supabase.co/rest/v1/calendar_pricing_rules`;
      let method = 'POST';
      
      // Se tem id, é update
      if (rule.id) {
        url += `?id=eq.${rule.id}`;
        method = 'PATCH';
      }
      
      const resp = await fetch(url, {
        method,
        headers: {
          ...getAuthHeaders(),
          'Prefer': rule.id ? 'return=representation' : 'return=representation,resolution=merge-duplicates'
        },
        body: JSON.stringify(payload)
      });
      
      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${body}`);
      }
      
      // Refresh para pegar dados atualizados
      await refreshRules();
      
      return { success: true };
      
    } catch (err: any) {
      console.error('[useCalendarPricingRules] upsertRule error:', err);
      return { success: false, error: err?.message || String(err) };
    }
  }, [organizationId, refreshRules]);
  
  // Deletar regra
  const deleteRule = useCallback(async (ruleId: string) => {
    try {
      const url = `https://${projectId}.supabase.co/rest/v1/calendar_pricing_rules?id=eq.${ruleId}`;
      
      const resp = await fetch(url, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${body}`);
      }
      
      // Refresh
      await refreshRules();
      
      return { success: true };
      
    } catch (err: any) {
      console.error('[useCalendarPricingRules] deleteRule error:', err);
      return { success: false, error: err?.message || String(err) };
    }
  }, [refreshRules]);
  
  // Criar regras em lote
  const bulkUpsertRules = useCallback(async (newRules: Partial<CalendarPricingRule>[]) => {
    if (!organizationId) return { success: false, error: 'No organization ID' };
    if (!newRules.length) return { success: true };
    
    try {
      const payload = newRules.map(r => ({
        ...r,
        organization_id: organizationId,
        updated_at: new Date().toISOString()
      }));
      
      const url = `https://${projectId}.supabase.co/rest/v1/calendar_pricing_rules`;
      
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      });
      
      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${body}`);
      }
      
      // Refresh
      await refreshRules();
      
      return { success: true };
      
    } catch (err: any) {
      console.error('[useCalendarPricingRules] bulkUpsertRules error:', err);
      return { success: false, error: err?.message || String(err) };
    }
  }, [organizationId, refreshRules]);
  
  // ==========================================================================
  // V2: OPTIMISTIC UPDATES + QUEUE SYSTEM
  // ==========================================================================
  
  // Aplicar regra otimisticamente no estado local
  const applyOptimisticRule = useCallback((rule: Partial<CalendarPricingRule>, tempId?: string) => {
    if (!organizationId) return;
    
    const fullRule: CalendarPricingRule = {
      id: tempId || rule.id || generateTempId(),
      organization_id: organizationId,
      property_id: rule.property_id ?? null,
      start_date: rule.start_date || formatDateYMD(new Date()),
      end_date: rule.end_date || formatDateYMD(new Date()),
      condition_percent: rule.condition_percent ?? 0,
      min_nights: rule.min_nights ?? 1,
      restriction: rule.restriction ?? null,
      priority: rule.priority ?? 0,
      updated_at: new Date().toISOString()
    };
    
    // Atualizar estado local imediatamente
    setRules(prev => {
      // Remover regra existente se for update
      const filtered = prev.filter(r => r.id !== fullRule.id);
      return [...filtered, fullRule];
    });
    
    // Reindexar
    setRulesByPropertyAndDate(prev => {
      const newMap = new Map(prev);
      const propKey = fullRule.property_id;
      
      if (!newMap.has(propKey)) {
        newMap.set(propKey, new Map());
      }
      
      const dateMap = new Map(newMap.get(propKey)!);
      
      // Expandir range de datas
      const start = new Date(fullRule.start_date + 'T00:00:00');
      const end = new Date(fullRule.end_date + 'T00:00:00');
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateKey = formatDateYMD(d);
        const existing = dateMap.get(dateKey);
        if (!existing || (fullRule.priority ?? 0) >= (existing.priority ?? 0)) {
          dateMap.set(dateKey, fullRule);
        }
      }
      
      newMap.set(propKey, dateMap);
      return newMap;
    });
    
    return fullRule.id;
  }, [organizationId, generateTempId]);
  
  // Flush da fila de operações
  const flushQueue = useCallback(async () => {
    if (isFlushingRef.current || operationQueueRef.current.length === 0) return;
    if (!organizationId) return;
    
    isFlushingRef.current = true;
    setQueueStatus(prev => ({ ...prev, processing: true }));
    
    // Pegar operações da fila
    const operations = [...operationQueueRef.current];
    operationQueueRef.current = [];
    
    console.log(`[useCalendarPricingRules] Flushing ${operations.length} operations`);
    
    try {
      // ======================================================================
      // V2.1: Usar Edge Function para batch quando habilitado
      // ======================================================================
      if (USE_EDGE_FUNCTION) {
        const edgeFunctionUrl = `https://${projectId}.supabase.co/functions/v1/rendizy-server/calendar-rules/batch`;
        
        // Converter operações para formato da Edge Function
        const batchOperations = operations.map(op => ({
          type: op.type as 'upsert' | 'delete',
          id: op.rule.id,
          property_id: op.rule.property_id || '',
          // Usar start_date e end_date (formato da tabela)
          start_date: op.rule.start_date || '',
          end_date: op.rule.end_date || op.rule.start_date || '',
          min_nights: op.rule.min_nights,
          condition_percent: op.rule.condition_percent,
          restriction: op.rule.restriction,
        }));
        
        let attempt = 0;
        let success = false;
        
        while (attempt < RETRY_ATTEMPTS && !success) {
          try {
            const resp = await fetch(edgeFunctionUrl, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({
                operations: batchOperations,
                organization_id: organizationId,
              }),
            });
            
            if (resp.ok) {
              const result = await resp.json();
              console.log(`[useCalendarPricingRules] Edge batch result:`, result);
              success = true;
              
              if (result.failed > 0) {
                setQueueStatus(prev => ({
                  ...prev,
                  errors: [...prev.errors, `${result.failed} operations failed`],
                }));
              }
            } else {
              const body = await resp.text();
              throw new Error(`Edge Function HTTP ${resp.status}: ${body}`);
            }
          } catch (err) {
            attempt++;
            console.warn(`[useCalendarPricingRules] Edge batch attempt ${attempt} failed:`, err);
            if (attempt < RETRY_ATTEMPTS) {
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            } else {
              throw err;
            }
          }
        }
        
      } else {
        // ====================================================================
        // Fallback: Usar REST API direta (método anterior)
        // ====================================================================
        
        // Agrupar upserts
        const upserts = operations
          .filter(op => op.type === 'upsert')
          .map(op => ({
            ...op.rule,
            organization_id: organizationId,
            updated_at: new Date().toISOString()
          }));
        
        // Agrupar deletes
        const deleteIds = operations
          .filter(op => op.type === 'delete' && op.rule.id)
          .map(op => op.rule.id!);
        
        // Executar upserts em batch
        if (upserts.length > 0) {
          const url = `https://${projectId}.supabase.co/rest/v1/calendar_pricing_rules`;
          
          // Tentar com retry
          let attempt = 0;
          let success = false;
          
          while (attempt < RETRY_ATTEMPTS && !success) {
            try {
              const resp = await fetch(url, {
                method: 'POST',
                headers: {
                  ...getAuthHeaders(),
                  'Prefer': 'return=representation,resolution=merge-duplicates'
                },
                body: JSON.stringify(upserts)
              });
              
              if (resp.ok) {
                success = true;
              } else {
                const body = await resp.text();
                throw new Error(`HTTP ${resp.status}: ${body}`);
              }
            } catch (err) {
              attempt++;
              if (attempt < RETRY_ATTEMPTS) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
              } else {
                throw err;
              }
            }
          }
        }
        
        // Executar deletes
        for (const id of deleteIds) {
          const url = `https://${projectId}.supabase.co/rest/v1/calendar_pricing_rules?id=eq.${id}`;
          await fetch(url, { method: 'DELETE', headers: getAuthHeaders() });
        }
      }
      
      setQueueStatus(prev => ({
        ...prev,
        processing: false,
        lastFlush: Date.now(),
        pending: operationQueueRef.current.length,
        errors: []
      }));
      
      // Refresh para sincronizar com servidor
      await refreshRules();
      
    } catch (err: any) {
      console.error('[useCalendarPricingRules] flushQueue error:', err);
      setQueueStatus(prev => ({
        ...prev,
        processing: false,
        errors: [...prev.errors, err?.message || String(err)]
      }));
      
      // Rollback: refresh para pegar estado real do servidor
      await refreshRules();
    } finally {
      isFlushingRef.current = false;
    }
  }, [organizationId, refreshRules]);
  
  // Agendar flush com debounce
  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
    }
    
    flushTimerRef.current = setTimeout(() => {
      flushQueue();
    }, DEBOUNCE_MS);
    
    // Flush forçado se fila muito grande
    if (operationQueueRef.current.length >= MAX_QUEUE_SIZE) {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushQueue();
    }
  }, [flushQueue]);
  
  // V2: Upsert otimista (atualiza UI imediatamente, persiste em background)
  const upsertRuleOptimistic = useCallback((rule: Partial<CalendarPricingRule>) => {
    const tempId = generateTempId();
    
    // Aplicar na UI imediatamente
    applyOptimisticRule(rule, tempId);
    
    // Adicionar à fila
    operationQueueRef.current.push({
      type: 'upsert',
      rule,
      tempId,
      timestamp: Date.now()
    });
    
    setQueueStatus(prev => ({ ...prev, pending: operationQueueRef.current.length }));
    
    // Agendar flush
    scheduleFlush();
  }, [applyOptimisticRule, generateTempId, scheduleFlush]);
  
  // V2: Bulk upsert otimista
  const bulkUpsertOptimistic = useCallback((newRules: Partial<CalendarPricingRule>[]) => {
    for (const rule of newRules) {
      const tempId = generateTempId();
      applyOptimisticRule(rule, tempId);
      
      operationQueueRef.current.push({
        type: 'upsert',
        rule,
        tempId,
        timestamp: Date.now()
      });
    }
    
    setQueueStatus(prev => ({ ...prev, pending: operationQueueRef.current.length }));
    scheduleFlush();
  }, [applyOptimisticRule, generateTempId, scheduleFlush]);
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
      }
      // Flush pendente ao desmontar
      if (operationQueueRef.current.length > 0) {
        flushQueue();
      }
    };
  }, [flushQueue]);
  
  return {
    rules,
    rulesByPropertyAndDate,
    loading,
    error,
    refreshRules,
    getRuleForDate,
    upsertRule,
    deleteRule,
    bulkUpsertRules,
    // V2: Novos métodos
    queueStatus,
    flushQueue,
    upsertRuleOptimistic,
    bulkUpsertOptimistic
  };
}
