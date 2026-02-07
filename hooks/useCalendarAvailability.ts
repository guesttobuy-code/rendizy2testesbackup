// useCalendarAvailability.ts
// ============================================================================
// HOOK V3: Calendário via Rate Plans
// ============================================================================
// ADR: /docs/ADR_RATE_PLANS_CALENDAR_INTEGRATION.md
//
// PROPÓSITO:
// Substituir useCalendarPricingRules.ts, lendo de:
//   - rate_plan_availability (is_closed, CTA, CTD, min_nights)
//   - rate_plan_pricing_overrides (ajustes de preço por data)
//   - rate_plans (preço base, configurações gerais)
//
// FORMATO DE SAÍDA:
// Mantém compatibilidade com CalendarPricingRule para transição suave.
// Os componentes de calendário não precisam mudar.
//
// ESCRITA:
// Usa Edge Function /calendar-availability/batch (nova rota)
//
// MIGRAÇÃO:
// 1. Importar useCalendarAvailability no lugar de useCalendarPricingRules
// 2. Testar, validar UI
// 3. Após estabilizar, remover hook antigo
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// CONFIG
// ============================================================================

const projectId = 'odcgnzfremrqnvtitpcc';
const DEBOUNCE_MS = 500;
const MAX_QUEUE_SIZE = 100;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;

// ============================================================================
// TYPES - Compatíveis com useCalendarPricingRules
// ============================================================================

/**
 * Regra de calendário "virtual" - convertida de rate_plan_* tables
 * Mantém interface do hook antigo para compatibilidade
 */
export interface CalendarPricingRule {
  id: string;
  organization_id: string;
  property_id: string | null;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  base_price?: number;
  condition_percent: number;    // Vem de rate_plan_pricing_overrides.price_adjustment_value
  min_nights: number;           // Vem de rate_plan_availability.min_nights
  max_nights?: number;          // Vem de rate_plan_availability.max_nights
  restriction: string | null;   // Derivado de is_closed, closed_to_arrival, closed_to_departure
  priority: number;
  updated_at?: string;
  // Campos extras do rate_plan
  rate_plan_id?: string;
  rate_plan_code?: string;
}

/**
 * Dados brutos de rate_plan_availability
 */
interface RatePlanAvailability {
  id: string;
  rate_plan_id: string;
  property_id: string;
  date: string; // YYYY-MM-DD
  available_units?: number;
  is_closed: boolean;
  closed_to_arrival: boolean;
  closed_to_departure: boolean;
  stop_sell: boolean;
  min_nights: number | null;
  max_nights: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Dados brutos de rate_plan_pricing_overrides
 */
interface RatePlanPricingOverride {
  id: string;
  rate_plan_id: string;
  date_from: string;
  date_to: string;
  override_type: 'fixed_price' | 'adjustment';
  price_adjustment_type: 'absolute' | 'percentage';
  price_adjustment_value: number;
  min_nights: number | null;
  reason?: string;
  is_active: boolean;
  created_at: string;
}

/**
 * Rate plan base info
 */
interface RatePlan {
  id: string;
  organization_id: string;
  property_id: string;
  code: string;
  name_pt: string;
  price_adjustment_type: string;
  price_adjustment_value: number;
  min_nights: number;
  is_default: boolean;
  is_active: boolean;
}

// Map de regras por property_id e data
export type RulesByPropertyAndDate = Map<string | null, Map<string, CalendarPricingRule>>;

interface QueueOperation {
  type: 'upsert' | 'delete';
  rule: Partial<CalendarPricingRule>;
  tempId?: string;
  timestamp: number;
}

interface QueueStatus {
  pending: number;
  processing: boolean;
  lastFlush: number | null;
  errors: string[];
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDateYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MTkxMTQsImV4cCI6MjA0MjA5NTExNH0.jtlE6Scj_r8xBfZ2exHTXB6RQbE3Z0iFKMNJ0NfYMuI',
  };

  const token = localStorage.getItem('rendizy-token');
  if (token) {
    headers['x-auth-token'] = token;
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Converter restriction enum para campo único (compatibilidade)
 */
function deriveRestriction(avail: RatePlanAvailability): string | null {
  if (avail.is_closed) return 'closed';
  if (avail.stop_sell) return 'stop_sell';
  if (avail.closed_to_arrival && avail.closed_to_departure) return 'closed';
  if (avail.closed_to_arrival) return 'no_checkin';
  if (avail.closed_to_departure) return 'no_checkout';
  return null;
}

/**
 * Converter restriction string para campos booleanos
 */
function parseRestriction(restriction: string | null): {
  is_closed: boolean;
  closed_to_arrival: boolean;
  closed_to_departure: boolean;
  stop_sell: boolean;
} {
  const result = {
    is_closed: false,
    closed_to_arrival: false,
    closed_to_departure: false,
    stop_sell: false,
  };

  if (!restriction) return result;

  switch (restriction) {
    case 'closed':
    case 'blocked':
      result.is_closed = true;
      break;
    case 'stop_sell':
      result.stop_sell = true;
      break;
    case 'no_checkin':
    case 'closed_to_arrival':
      result.closed_to_arrival = true;
      break;
    case 'no_checkout':
    case 'closed_to_departure':
      result.closed_to_departure = true;
      break;
  }

  return result;
}

// ============================================================================
// HOOK
// ============================================================================

interface UseCalendarAvailabilityOptions {
  organizationId: string | null;
  dateRange?: { from: Date; to: Date };
  propertyId?: string;
}

export function useCalendarAvailability({
  organizationId,
  dateRange,
  propertyId,
}: UseCalendarAvailabilityOptions) {
  // State
  const [rules, setRules] = useState<CalendarPricingRule[]>([]);
  const [rulesByPropertyAndDate, setRulesByPropertyAndDate] = useState<RulesByPropertyAndDate>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Queue refs
  const operationQueueRef = useRef<QueueOperation[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFlushingRef = useRef(false);

  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    pending: 0,
    processing: false,
    lastFlush: null,
    errors: [],
  });

  // Generate temp ID
  const generateTempId = useCallback(() => {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // ============================================================================
  // INDEX RULES
  // ============================================================================

  const indexRules = useCallback((rules: CalendarPricingRule[]) => {
    const map: RulesByPropertyAndDate = new Map();

    for (const rule of rules) {
      const propKey = rule.property_id;

      if (!map.has(propKey)) {
        map.set(propKey, new Map());
      }

      const dateMap = map.get(propKey)!;

      // Expandir range de datas e indexar cada dia
      const start = new Date(rule.start_date + 'T00:00:00');
      const end = new Date(rule.end_date + 'T00:00:00');

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateKey = formatDateYMD(d);
        const existing = dateMap.get(dateKey);
        if (!existing || (rule.priority ?? 0) > (existing.priority ?? 0)) {
          dateMap.set(dateKey, rule);
        }
      }
    }

    return map;
  }, []);

  // ============================================================================
  // REFRESH RULES - READ FROM RATE_PLAN TABLES
  // ============================================================================

  const refreshRules = useCallback(async () => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    try {
      // Primeiro: buscar rate_plans STANDARD da org
      let ratePlansUrl = `https://${projectId}.supabase.co/rest/v1/rate_plans`;
      ratePlansUrl += `?organization_id=eq.${organizationId}`;
      ratePlansUrl += `&code=eq.STANDARD`;
      ratePlansUrl += `&is_active=eq.true`;
      ratePlansUrl += `&select=id,organization_id,property_id,code,name_pt,min_nights,is_default`;

      const rpResp = await fetch(ratePlansUrl, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!rpResp.ok) {
        throw new Error(`Rate plans fetch failed: ${rpResp.status}`);
      }

      const ratePlans: RatePlan[] = await rpResp.json();
      const ratePlanIds = ratePlans.map(rp => rp.id);
      const ratePlanMap = new Map(ratePlans.map(rp => [rp.id, rp]));

      if (ratePlanIds.length === 0) {
        console.log('[useCalendarAvailability] No STANDARD rate plans found');
        setRules([]);
        setRulesByPropertyAndDate(new Map());
        setLoading(false);
        return;
      }

      // Segundo: buscar availability para esses rate_plans
      let availUrl = `https://${projectId}.supabase.co/rest/v1/rate_plan_availability`;
      availUrl += `?rate_plan_id=in.(${ratePlanIds.join(',')})`;
      availUrl += `&select=*`;
      availUrl += `&order=date.asc`;

      if (dateRange) {
        const fromStr = formatDateYMD(dateRange.from);
        const toStr = formatDateYMD(dateRange.to);
        availUrl += `&date=gte.${fromStr}&date=lte.${toStr}`;
      }

      if (propertyId) {
        availUrl += `&property_id=eq.${propertyId}`;
      }

      const availResp = await fetch(availUrl, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!availResp.ok) {
        throw new Error(`Availability fetch failed: ${availResp.status}`);
      }

      const availability: RatePlanAvailability[] = await availResp.json();

      // Terceiro: buscar pricing overrides para esses rate_plans
      let overridesUrl = `https://${projectId}.supabase.co/rest/v1/rate_plan_pricing_overrides`;
      overridesUrl += `?rate_plan_id=in.(${ratePlanIds.join(',')})`;
      overridesUrl += `&is_active=eq.true`;
      overridesUrl += `&select=*`;

      if (dateRange) {
        const fromStr = formatDateYMD(dateRange.from);
        const toStr = formatDateYMD(dateRange.to);
        // Overrides que intersectam o range
        overridesUrl += `&date_from=lte.${toStr}&date_to=gte.${fromStr}`;
      }

      const overridesResp = await fetch(overridesUrl, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!overridesResp.ok) {
        throw new Error(`Overrides fetch failed: ${overridesResp.status}`);
      }

      const overrides: RatePlanPricingOverride[] = await overridesResp.json();

      // ====================================================================
      // CONVERTER PARA CalendarPricingRule FORMAT
      // ====================================================================

      const rulesMap = new Map<string, CalendarPricingRule>();

      // Processar availability -> CalendarPricingRule (1 por dia)
      for (const avail of availability) {
        const rp = ratePlanMap.get(avail.rate_plan_id);
        if (!rp) continue;

        const key = `${avail.property_id}_${avail.date}`;

        const rule: CalendarPricingRule = {
          id: avail.id,
          organization_id: rp.organization_id,
          property_id: avail.property_id,
          start_date: avail.date,
          end_date: avail.date,
          condition_percent: 0, // Será sobrescrito por override se houver
          min_nights: avail.min_nights ?? rp.min_nights ?? 1,
          max_nights: avail.max_nights ?? undefined,
          restriction: deriveRestriction(avail),
          priority: 1,
          rate_plan_id: rp.id,
          rate_plan_code: rp.code,
          updated_at: avail.updated_at,
        };

        rulesMap.set(key, rule);
      }

      // Processar overrides -> mesclar condition_percent
      for (const override of overrides) {
        const rp = ratePlanMap.get(override.rate_plan_id);
        if (!rp) continue;

        // Expandir range de datas do override
        const start = new Date(override.date_from + 'T00:00:00');
        const end = new Date(override.date_to + 'T00:00:00');

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateKey = formatDateYMD(d);
          const key = `${rp.property_id}_${dateKey}`;

          const existingRule = rulesMap.get(key);

          if (existingRule) {
            // Mesclar condition_percent do override
            if (override.price_adjustment_type === 'percentage') {
              existingRule.condition_percent = override.price_adjustment_value;
            }
            if (override.min_nights) {
              existingRule.min_nights = override.min_nights;
            }
          } else {
            // Criar nova regra só com override (sem availability específica)
            const rule: CalendarPricingRule = {
              id: override.id,
              organization_id: rp.organization_id,
              property_id: rp.property_id,
              start_date: dateKey,
              end_date: dateKey,
              condition_percent: override.price_adjustment_type === 'percentage'
                ? override.price_adjustment_value
                : 0,
              min_nights: override.min_nights ?? rp.min_nights ?? 1,
              restriction: null,
              priority: 1,
              rate_plan_id: rp.id,
              rate_plan_code: rp.code,
            };
            rulesMap.set(key, rule);
          }
        }
      }

      const rulesArray = Array.from(rulesMap.values());

      console.log(`[useCalendarAvailability] Loaded ${rulesArray.length} rules (${availability.length} avail, ${overrides.length} overrides)`);

      setRules(rulesArray);
      setRulesByPropertyAndDate(indexRules(rulesArray));

    } catch (err: any) {
      console.error('[useCalendarAvailability] refreshRules error:', err);
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [organizationId, dateRange, propertyId, indexRules]);

  // Load on mount / when deps change
  useEffect(() => {
    if (organizationId) {
      refreshRules();
    }
  }, [organizationId, dateRange?.from?.getTime(), dateRange?.to?.getTime(), propertyId, refreshRules]);

  // ============================================================================
  // GET RULE FOR DATE
  // ============================================================================

  const getRuleForDate = useCallback((
    propertyId: string | null,
    date: Date,
    applyBatchRules = false
  ): CalendarPricingRule | null => {
    const dateKey = formatDateYMD(date);

    // Tentar regra específica do imóvel
    if (propertyId) {
      const propRules = rulesByPropertyAndDate.get(propertyId);
      if (propRules) {
        const propRule = propRules.get(dateKey);
        if (propRule) return propRule;
      }
    }

    // Tentar regra global (property_id = null)
    if (applyBatchRules) {
      const globalRules = rulesByPropertyAndDate.get(null);
      if (globalRules) {
        return globalRules.get(dateKey) || null;
      }
    }

    return null;
  }, [rulesByPropertyAndDate]);

  // ============================================================================
  // WRITE OPERATIONS - VIA EDGE FUNCTION
  // ============================================================================

  const flushQueue = useCallback(async () => {
    if (isFlushingRef.current || operationQueueRef.current.length === 0) return;
    if (!organizationId) return;

    isFlushingRef.current = true;
    setQueueStatus(prev => ({ ...prev, processing: true }));

    const operations = [...operationQueueRef.current];
    operationQueueRef.current = [];

    console.log(`[useCalendarAvailability] Flushing ${operations.length} operations`);

    try {
      const edgeFunctionUrl = `https://${projectId}.supabase.co/functions/v1/rendizy-server/calendar-availability/batch`;

      // Converter operações para formato da Edge Function
      const batchOperations = operations.map(op => {
        const restrictionFields = parseRestriction(op.rule.restriction ?? null);
        return {
          type: op.type as 'upsert' | 'delete',
          id: op.rule.id,
          property_id: op.rule.property_id || '',
          rate_plan_id: op.rule.rate_plan_id,
          start_date: op.rule.start_date || '',
          end_date: op.rule.end_date || op.rule.start_date || '',
          // Availability fields
          is_closed: restrictionFields.is_closed,
          closed_to_arrival: restrictionFields.closed_to_arrival,
          closed_to_departure: restrictionFields.closed_to_departure,
          stop_sell: restrictionFields.stop_sell,
          min_nights: op.rule.min_nights,
          max_nights: op.rule.max_nights,
          // Pricing override fields
          condition_percent: op.rule.condition_percent,
        };
      });

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
            console.log(`[useCalendarAvailability] Batch result:`, result);
            success = true;

            if (result.failed > 0) {
              setQueueStatus(prev => ({
                ...prev,
                errors: [...prev.errors, `${result.failed} operations failed`],
              }));
            }
          } else {
            const body = await resp.text();
            throw new Error(`HTTP ${resp.status}: ${body}`);
          }
        } catch (err) {
          attempt++;
          console.warn(`[useCalendarAvailability] Batch attempt ${attempt} failed:`, err);
          if (attempt < RETRY_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          } else {
            throw err;
          }
        }
      }

      setQueueStatus(prev => ({
        ...prev,
        processing: false,
        lastFlush: Date.now(),
        pending: operationQueueRef.current.length,
        errors: [],
      }));

      await refreshRules();

    } catch (err: any) {
      console.error('[useCalendarAvailability] flushQueue error:', err);
      setQueueStatus(prev => ({
        ...prev,
        processing: false,
        errors: [...prev.errors, err?.message || String(err)],
      }));
      await refreshRules();
    } finally {
      isFlushingRef.current = false;
    }
  }, [organizationId, refreshRules]);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
    }

    flushTimerRef.current = setTimeout(() => {
      flushQueue();
    }, DEBOUNCE_MS);

    if (operationQueueRef.current.length >= MAX_QUEUE_SIZE) {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushQueue();
    }
  }, [flushQueue]);

  // Apply optimistic update
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
      max_nights: rule.max_nights,
      restriction: rule.restriction ?? null,
      priority: rule.priority ?? 0,
      rate_plan_id: rule.rate_plan_id,
      rate_plan_code: rule.rate_plan_code,
      updated_at: new Date().toISOString(),
    };

    setRules(prev => {
      const filtered = prev.filter(r => r.id !== fullRule.id);
      return [...filtered, fullRule];
    });

    setRulesByPropertyAndDate(prev => {
      const newMap = new Map(prev);
      const propKey = fullRule.property_id;

      if (!newMap.has(propKey)) {
        newMap.set(propKey, new Map());
      }

      const dateMap = new Map(newMap.get(propKey)!);
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

  // Optimistic upsert
  const upsertRuleOptimistic = useCallback((rule: Partial<CalendarPricingRule>) => {
    const tempId = generateTempId();

    applyOptimisticRule(rule, tempId);

    operationQueueRef.current.push({
      type: 'upsert',
      rule,
      tempId,
      timestamp: Date.now(),
    });

    setQueueStatus(prev => ({ ...prev, pending: operationQueueRef.current.length }));
    scheduleFlush();
  }, [applyOptimisticRule, generateTempId, scheduleFlush]);

  // Bulk optimistic upsert
  const bulkUpsertOptimistic = useCallback((newRules: Partial<CalendarPricingRule>[]) => {
    for (const rule of newRules) {
      const tempId = generateTempId();
      applyOptimisticRule(rule, tempId);

      operationQueueRef.current.push({
        type: 'upsert',
        rule,
        tempId,
        timestamp: Date.now(),
      });
    }

    setQueueStatus(prev => ({ ...prev, pending: operationQueueRef.current.length }));
    scheduleFlush();
  }, [applyOptimisticRule, generateTempId, scheduleFlush]);

  // Sync upsert (legacy compatibility)
  const upsertRule = useCallback(async (rule: Partial<CalendarPricingRule>) => {
    upsertRuleOptimistic(rule);
    return { success: true };
  }, [upsertRuleOptimistic]);

  // Bulk upsert (legacy compatibility)
  const bulkUpsertRules = useCallback(async (newRules: Partial<CalendarPricingRule>[]) => {
    bulkUpsertOptimistic(newRules);
    return { success: true };
  }, [bulkUpsertOptimistic]);

  // Delete rule
  const deleteRule = useCallback(async (ruleId: string) => {
    // Remove from local state
    setRules(prev => prev.filter(r => r.id !== ruleId));

    setRulesByPropertyAndDate(prev => {
      const newMap = new Map();
      for (const [propKey, dateMap] of prev.entries()) {
        const newDateMap = new Map();
        for (const [dateKey, rule] of dateMap.entries()) {
          if (rule.id !== ruleId) {
            newDateMap.set(dateKey, rule);
          }
        }
        if (newDateMap.size > 0) {
          newMap.set(propKey, newDateMap);
        }
      }
      return newMap;
    });

    operationQueueRef.current.push({
      type: 'delete',
      rule: { id: ruleId },
      timestamp: Date.now(),
    });

    scheduleFlush();
    return { success: true };
  }, [scheduleFlush]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
      }
      if (operationQueueRef.current.length > 0) {
        flushQueue();
      }
    };
  }, [flushQueue]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Data
    rules,
    rulesByPropertyAndDate,
    loading,
    error,
    // Read methods
    refreshRules,
    getRuleForDate,
    // Write methods (sync - legacy)
    upsertRule,
    deleteRule,
    bulkUpsertRules,
    // Write methods (optimistic - V2)
    queueStatus,
    flushQueue,
    upsertRuleOptimistic,
    bulkUpsertOptimistic,
  };
}

export default useCalendarAvailability;
