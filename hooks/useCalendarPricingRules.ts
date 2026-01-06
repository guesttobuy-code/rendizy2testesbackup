// useCalendarPricingRules.ts
// Hook para carregar e salvar regras de calendário do banco
import { useState, useEffect, useCallback } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// Tipo da regra de calendário
export interface CalendarPricingRule {
  id?: string;
  organization_id: string;
  property_id: string | null; // null = batch/global rule
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
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

interface UseCalendarPricingRulesReturn {
  rules: CalendarPricingRule[];
  rulesByPropertyAndDate: RulesByPropertyAndDate;
  loading: boolean;
  error: string | null;
  
  // Métodos
  refreshRules: () => Promise<void>;
  
  // Buscar regra para uma data específica
  getRuleForDate: (propertyId: string | null, date: Date, applyBatchRules?: boolean) => CalendarPricingRule | null;
  
  // Criar/atualizar regra
  upsertRule: (rule: Partial<CalendarPricingRule>) => Promise<{ success: boolean; error?: string }>;
  
  // Deletar regra
  deleteRule: (ruleId: string) => Promise<{ success: boolean; error?: string }>;
  
  // Criar regras em lote
  bulkUpsertRules: (rules: Partial<CalendarPricingRule>[]) => Promise<{ success: boolean; error?: string }>;
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
      const rulesArray = Array.isArray(data) ? data : [];
      
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
  
  return {
    rules,
    rulesByPropertyAndDate,
    loading,
    error,
    refreshRules,
    getRuleForDate,
    upsertRule,
    deleteRule,
    bulkUpsertRules
  };
}
