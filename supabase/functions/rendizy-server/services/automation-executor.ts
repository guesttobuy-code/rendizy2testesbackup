// ============================================================================
// AUTOMATION EXECUTOR - Executa automações quando eventos são disparados
// ============================================================================

import { getSupabaseClient } from '../kv_store.tsx';
import { logInfo, logError } from '../utils.ts';
import type { AutomationEvent } from './event-bus.ts';
import { executeAction } from './actions-service.ts';

interface Automation {
  id: string;
  organization_id: string;
  name: string;
  definition: {
    trigger: {
      type: string;
      field?: string;
      operator?: string;
      value?: any;
      threshold?: number;
    };
    conditions?: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
    actions: Array<{
      type: string;
      channel?: string;
      template?: string;
      payload?: Record<string, any>;
    }>;
  };
  trigger_count: number;
}

/**
 * Executa uma automação quando um evento correspondente é disparado
 */
export async function executeAutomation(
  automation: Automation,
  event: AutomationEvent
): Promise<void> {
  const startTime = Date.now();
  
  try {
    logInfo(`[Executor] Executando automação: ${automation.name} (${automation.id})`);

    // 1. Validar condições
    const conditionsMet = await validateConditions(automation.definition.conditions || [], event);
    
    if (!conditionsMet) {
      logInfo(`[Executor] Condições não atendidas para automação ${automation.id}`);
      await logExecution(automation.id, automation.organization_id, event, {
        status: 'skipped',
        conditions_met: false,
      });
      return;
    }

    // 2. Executar ações sequencialmente
    const actionsExecuted: any[] = [];
    let hasError = false;
    let errorMessage: string | undefined;

    for (const action of automation.definition.actions) {
      try {
        logInfo(`[Executor] Executando ação: ${action.type}`);
        const result = await executeAction(action, event, automation);
        actionsExecuted.push({
          type: action.type,
          success: true,
          result,
        });
      } catch (error: any) {
        logError(`[Executor] Erro ao executar ação ${action.type}`, error);
        hasError = true;
        errorMessage = error.message || 'Erro desconhecido';
        actionsExecuted.push({
          type: action.type,
          success: false,
          error: errorMessage,
        });
        // Continuar com outras ações mesmo se uma falhar
      }
    }

    // 3. Atualizar contador de triggers
    const supabase = getSupabaseClient();
    await supabase
      .from('automations')
      .update({
        trigger_count: (automation.trigger_count || 0) + 1,
        last_triggered_at: new Date().toISOString(),
      })
      .eq('id', automation.id);

    // 4. Registrar execução
    const executionTime = Date.now() - startTime;
    await logExecution(automation.id, automation.organization_id, event, {
      status: hasError ? 'failed' : 'success',
      conditions_met: true,
      actions_executed: actionsExecuted,
      error_message: errorMessage,
      execution_time_ms: executionTime,
    });

    logInfo(`[Executor] Automação ${automation.id} executada com sucesso`);
  } catch (error: any) {
    logError(`[Executor] Erro inesperado ao executar automação ${automation.id}`, error);
    await logExecution(automation.id, automation.organization_id, event, {
      status: 'failed',
      conditions_met: false,
      error_message: error.message || 'Erro inesperado',
      execution_time_ms: Date.now() - startTime,
    });
  }
}

/**
 * Valida se as condições da automação são atendidas pelo evento
 */
async function validateConditions(
  conditions: Array<{ field: string; operator: string; value: any }>,
  event: AutomationEvent
): Promise<boolean> {
  if (!conditions || conditions.length === 0) {
    return true; // Sem condições = sempre válido
  }

  for (const condition of conditions) {
    const fieldValue = getNestedValue(event.payload, condition.field);
    const conditionMet = evaluateCondition(fieldValue, condition.operator, condition.value);

    if (!conditionMet) {
      logInfo(`[Executor] Condição não atendida: ${condition.field} ${condition.operator} ${condition.value}`);
      return false;
    }
  }

  return true;
}

/**
 * Avalia uma condição individual
 */
function evaluateCondition(fieldValue: any, operator: string, expectedValue: any): boolean {
  switch (operator) {
    case 'eq':
      return fieldValue === expectedValue;
    case 'ne':
      return fieldValue !== expectedValue;
    case 'gt':
      return Number(fieldValue) > Number(expectedValue);
    case 'gte':
      return Number(fieldValue) >= Number(expectedValue);
    case 'lt':
      return Number(fieldValue) < Number(expectedValue);
    case 'lte':
      return Number(fieldValue) <= Number(expectedValue);
    case 'contains':
      return String(fieldValue).includes(String(expectedValue));
    case 'startsWith':
      return String(fieldValue).startsWith(String(expectedValue));
    case 'endsWith':
      return String(fieldValue).endsWith(String(expectedValue));
    case 'in':
      return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);
    default:
      logError(`[Executor] Operador desconhecido: ${operator}`);
      return false;
  }
}

/**
 * Obtém valor aninhado de um objeto usando notação de ponto (ex: "pricing.total")
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Registra a execução da automação no banco
 */
async function logExecution(
  automationId: string,
  organizationId: string,
  event: AutomationEvent,
  result: {
    status: 'success' | 'failed' | 'skipped';
    conditions_met: boolean;
    actions_executed?: any;
    error_message?: string;
    execution_time_ms?: number;
  }
): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    await supabase.from('automation_executions').insert({
      automation_id: automationId,
      organization_id: organizationId,
      status: result.status,
      trigger_event: event.type,
      conditions_met: result.conditions_met,
      actions_executed: result.actions_executed || null,
      error_message: result.error_message || null,
      execution_time_ms: result.execution_time_ms || null,
    });
  } catch (error) {
    logError('[Executor] Erro ao registrar execução', error);
  }
}

