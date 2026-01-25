/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    RENDIZY AUTOMATION ENGINE                              ║
 * ║                                                                           ║
 * ║  Engine de execução de automações. Processa triggers, avalia condições   ║
 * ║  e executa ações definidas nas automações ativas.                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * @version 1.0.0
 * @date 2026-01-25
 * 
 * FLUXO:
 * 1. Evento acontece no sistema (ex: mensagem recebida)
 * 2. Engine busca automações ativas com trigger compatível
 * 3. Avalia condições de cada automação
 * 4. Executa ações das automações que passaram nas condições
 * 5. Registra execução no histórico
 */

import { getSupabaseClient } from './kv_store.tsx';
import { logInfo, logError } from './utils.ts';

// ============================================================================
// TIPOS
// ============================================================================

export interface AutomationTriggerEvent {
  /** Tipo do evento (message_received, reservation_created, etc.) */
  type: string;
  /** Organização onde o evento ocorreu */
  organizationId: string;
  /** Dados do evento */
  payload: Record<string, any>;
  /** Timestamp do evento */
  timestamp: string;
}

export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'exists' | 'not_exists';
  value: any;
}

export interface AutomationAction {
  type: string;
  channel?: string;
  template?: string;
  payload?: Record<string, any>;
}

export interface AutomationDefinition {
  name: string;
  description?: string;
  trigger: {
    type: string;
    field?: string;
    operator?: string;
    value?: any;
    schedule?: string;
    threshold?: number;
  };
  conditions?: AutomationCondition[];
  actions: AutomationAction[];
  metadata?: {
    priority?: 'baixa' | 'media' | 'alta';
    requiresApproval?: boolean;
    notifyChannels?: string[];
  };
}

export interface Automation {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  definition: AutomationDefinition;
  status: 'draft' | 'active' | 'paused';
  module?: string;
  channel?: string;
  priority?: string;
  created_at: string;
  updated_at: string;
}

export interface ExecutionResult {
  automationId: string;
  automationName: string;
  success: boolean;
  actionsExecuted: number;
  error?: string;
  duration: number;
}

// ============================================================================
// TRIGGER TYPE MAPPING
// ============================================================================

const TRIGGER_TYPE_ALIASES: Record<string, string[]> = {
  'message_received': ['message_received', 'nova_mensagem', 'mensagem_recebida', 'new_message', 'chat_message'],
  'reservation_created': ['reservation_created', 'nova_reserva', 'new_reservation', 'reserva_criada'],
  'reservation_confirmed': ['reservation_confirmed', 'reserva_confirmada', 'booking_confirmed'],
  'checkin_approaching': ['checkin_approaching', 'checkin_proximo', 'pre_checkin', 'before_checkin'],
  'checkout_approaching': ['checkout_approaching', 'checkout_proximo', 'pre_checkout', 'before_checkout'],
  'payment_received': ['payment_received', 'pagamento_recebido', 'payment_completed'],
  'payment_overdue': ['payment_overdue', 'pagamento_atrasado', 'payment_late'],
  'task_created': ['task_created', 'tarefa_criada', 'new_task'],
  'lead_qualified': ['lead_qualified', 'lead_qualificado', 'opportunity_qualified'],
  'manual': ['manual', 'manual_trigger', 'on_demand'],
};

function normalizeTriggerType(type: string): string {
  const lower = type.toLowerCase().trim();
  for (const [normalized, aliases] of Object.entries(TRIGGER_TYPE_ALIASES)) {
    if (aliases.includes(lower)) {
      return normalized;
    }
  }
  return lower;
}

// ============================================================================
// CONDITION EVALUATOR
// ============================================================================

function evaluateCondition(condition: AutomationCondition, eventPayload: Record<string, any>): boolean {
  try {
    // Navegar pelo campo (suporta dot notation: "contact.name")
    const fieldPath = condition.field.split('.');
    let value: any = eventPayload;
    
    for (const part of fieldPath) {
      if (value === undefined || value === null) break;
      value = value[part];
    }

    const compareValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return value == compareValue; // Comparação flexível
      
      case 'not_equals':
        return value != compareValue;
      
      case 'contains':
        if (typeof value === 'string') {
          return value.toLowerCase().includes(String(compareValue).toLowerCase());
        }
        if (Array.isArray(value)) {
          return value.includes(compareValue);
        }
        return false;
      
      case 'not_contains':
        if (typeof value === 'string') {
          return !value.toLowerCase().includes(String(compareValue).toLowerCase());
        }
        if (Array.isArray(value)) {
          return !value.includes(compareValue);
        }
        return true;
      
      case 'gt':
        return Number(value) > Number(compareValue);
      
      case 'lt':
        return Number(value) < Number(compareValue);
      
      case 'gte':
        return Number(value) >= Number(compareValue);
      
      case 'lte':
        return Number(value) <= Number(compareValue);
      
      case 'exists':
        return value !== undefined && value !== null;
      
      case 'not_exists':
        return value === undefined || value === null;
      
      default:
        logError(`[AutomationEngine] Operador desconhecido: ${condition.operator}`);
        return false;
    }
  } catch (error) {
    logError(`[AutomationEngine] Erro ao avaliar condição:`, error);
    return false;
  }
}

function evaluateAllConditions(conditions: AutomationCondition[] | undefined, eventPayload: Record<string, any>): boolean {
  if (!conditions || conditions.length === 0) {
    return true; // Sem condições = sempre passa
  }

  // Todas as condições devem ser verdadeiras (AND lógico)
  return conditions.every(condition => evaluateCondition(condition, eventPayload));
}

// ============================================================================
// ACTION EXECUTOR
// ============================================================================

async function executeAction(
  action: AutomationAction, 
  eventPayload: Record<string, any>,
  organizationId: string,
  automationName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logInfo(`[AutomationEngine] Executando ação: ${action.type}`, { organizationId, automationName });

    switch (action.type) {
      // ─────────────────────────────────────────────────────────────
      // NOTIFICAÇÃO NO DASHBOARD
      // ─────────────────────────────────────────────────────────────
      case 'send_notification':
      case 'notification':
      case 'notificar':
      case 'dashboard_notification': {
        const supabase = getSupabaseClient();
        
        // Substituir variáveis no template
        let title = action.payload?.title || `Automação: ${automationName}`;
        let message = action.payload?.message || action.template || 'Evento processado pela automação';
        
        // Substituir placeholders {{campo}} pelos valores do payload
        const replaceVariables = (text: string) => {
          return text.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
            const parts = path.split('.');
            let value: any = eventPayload;
            for (const part of parts) {
              if (value === undefined || value === null) return match;
              value = value[part];
            }
            return value !== undefined ? String(value) : match;
          });
        };

        title = replaceVariables(title);
        message = replaceVariables(message);

        // Inserir notificação no banco
        const { error } = await supabase.from('notifications').insert({
          organization_id: organizationId,
          type: 'automation',
          title,
          message,
          priority: action.payload?.priority || 'normal',
          read: false,
          data: {
            automationName,
            eventType: eventPayload._eventType,
            actionType: action.type,
          },
          created_at: new Date().toISOString(),
        });

        if (error) {
          logError(`[AutomationEngine] Erro ao criar notificação:`, error);
          return { success: false, error: error.message };
        }

        logInfo(`[AutomationEngine] ✅ Notificação criada: ${title}`);
        return { success: true };
      }

      // ─────────────────────────────────────────────────────────────
      // CRIAR TAREFA
      // ─────────────────────────────────────────────────────────────
      case 'create_task':
      case 'criar_tarefa':
      case 'task': {
        const supabase = getSupabaseClient();
        
        let taskTitle = action.payload?.title || action.payload?.titulo || `Tarefa: ${automationName}`;
        let taskDescription = action.payload?.description || action.payload?.descricao || '';
        
        // Substituir variáveis
        const replaceVariables = (text: string) => {
          return text.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
            const parts = path.split('.');
            let value: any = eventPayload;
            for (const part of parts) {
              if (value === undefined || value === null) return match;
              value = value[part];
            }
            return value !== undefined ? String(value) : match;
          });
        };

        taskTitle = replaceVariables(taskTitle);
        taskDescription = replaceVariables(taskDescription);

        // Calcular data de vencimento
        let dueDate = action.payload?.due_date || action.payload?.data_vencimento;
        if (!dueDate) {
          // Padrão: 1 dia a partir de agora
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          dueDate = tomorrow.toISOString().split('T')[0];
        }

        // Inserir tarefa (tabela crm_tasks ou tasks)
        const { error } = await supabase.from('crm_tasks').insert({
          organization_id: organizationId,
          titulo: taskTitle,
          descricao: taskDescription,
          tipo: action.payload?.type || 'other',
          data_vencimento: dueDate,
          prioridade: action.payload?.priority || 'media',
          status: 'pendente',
          criada_por: 'automacao',
          automacao_origem: automationName,
          created_at: new Date().toISOString(),
        });

        if (error) {
          // Se tabela não existe, tentar notificação como fallback
          logError(`[AutomationEngine] Erro ao criar tarefa (tabela pode não existir):`, error);
          
          // Fallback: criar notificação
          await supabase.from('notifications').insert({
            organization_id: organizationId,
            type: 'task_automation',
            title: `📋 Nova Tarefa: ${taskTitle}`,
            message: taskDescription || 'Tarefa criada por automação',
            priority: 'high',
            read: false,
            data: { automationName, taskTitle, dueDate },
            created_at: new Date().toISOString(),
          });
          
          return { success: true }; // Considera sucesso com fallback
        }

        logInfo(`[AutomationEngine] ✅ Tarefa criada: ${taskTitle}`);
        return { success: true };
      }

      // ─────────────────────────────────────────────────────────────
      // LOG APENAS (para debug/desenvolvimento)
      // ─────────────────────────────────────────────────────────────
      case 'log':
      case 'debug': {
        const message = action.payload?.message || 'Automação executada';
        logInfo(`[AutomationEngine] 📝 LOG: ${message}`, eventPayload);
        return { success: true };
      }

      // ─────────────────────────────────────────────────────────────
      // WEBHOOK (chamar URL externa)
      // ─────────────────────────────────────────────────────────────
      case 'webhook':
      case 'http_request': {
        const url = action.payload?.url;
        if (!url) {
          return { success: false, error: 'URL do webhook não fornecida' };
        }

        try {
          const response = await fetch(url, {
            method: action.payload?.method || 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(action.payload?.headers || {}),
            },
            body: JSON.stringify({
              event: eventPayload,
              automation: automationName,
              timestamp: new Date().toISOString(),
            }),
          });

          if (!response.ok) {
            return { success: false, error: `Webhook retornou ${response.status}` };
          }

          logInfo(`[AutomationEngine] ✅ Webhook chamado: ${url}`);
          return { success: true };
        } catch (fetchError: any) {
          return { success: false, error: fetchError.message };
        }
      }

      // ─────────────────────────────────────────────────────────────
      // AÇÃO NÃO IMPLEMENTADA
      // ─────────────────────────────────────────────────────────────
      default:
        logInfo(`[AutomationEngine] ⚠️ Ação não implementada: ${action.type}`);
        return { success: true }; // Não falha, apenas pula
    }
  } catch (error: any) {
    logError(`[AutomationEngine] Erro ao executar ação ${action.type}:`, error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// MAIN ENGINE FUNCTION
// ============================================================================

/**
 * Processa um evento e executa automações compatíveis
 */
export async function processAutomationTrigger(event: AutomationTriggerEvent): Promise<ExecutionResult[]> {
  const startTime = Date.now();
  const results: ExecutionResult[] = [];

  try {
    logInfo(`[AutomationEngine] 🚀 Processando evento: ${event.type}`, {
      organizationId: event.organizationId,
      timestamp: event.timestamp,
    });

    const supabase = getSupabaseClient();
    const normalizedType = normalizeTriggerType(event.type);

    // 1. Buscar automações ativas da organização
    const { data: automations, error: fetchError } = await supabase
      .from('automations')
      .select('*')
      .eq('organization_id', event.organizationId)
      .eq('status', 'active');

    if (fetchError) {
      logError(`[AutomationEngine] Erro ao buscar automações:`, fetchError);
      return results;
    }

    if (!automations || automations.length === 0) {
      logInfo(`[AutomationEngine] Nenhuma automação ativa encontrada para org ${event.organizationId}`);
      return results;
    }

    logInfo(`[AutomationEngine] ${automations.length} automação(ões) ativa(s) encontrada(s)`);

    // 2. Filtrar automações com trigger compatível
    const matchingAutomations = automations.filter((automation: Automation) => {
      const triggerType = normalizeTriggerType(automation.definition.trigger.type);
      return triggerType === normalizedType;
    });

    if (matchingAutomations.length === 0) {
      logInfo(`[AutomationEngine] Nenhuma automação com trigger "${normalizedType}" encontrada`);
      return results;
    }

    logInfo(`[AutomationEngine] ${matchingAutomations.length} automação(ões) com trigger compatível`);

    // 3. Processar cada automação
    for (const automation of matchingAutomations) {
      const automationStart = Date.now();
      let actionsExecuted = 0;
      let hasError = false;
      let errorMessage = '';

      try {
        // Avaliar condições
        const eventPayloadWithMeta = {
          ...event.payload,
          _eventType: event.type,
          _timestamp: event.timestamp,
        };

        const conditionsPassed = evaluateAllConditions(
          automation.definition.conditions,
          eventPayloadWithMeta
        );

        if (!conditionsPassed) {
          logInfo(`[AutomationEngine] Automação "${automation.name}" não passou nas condições`);
          
          // Registrar como "skipped"
          results.push({
            automationId: automation.id,
            automationName: automation.name,
            success: true,
            actionsExecuted: 0,
            duration: Date.now() - automationStart,
          });
          continue;
        }

        logInfo(`[AutomationEngine] ✅ Condições aprovadas para "${automation.name}"`);

        // Executar ações
        for (const action of automation.definition.actions) {
          const actionResult = await executeAction(
            action,
            eventPayloadWithMeta,
            event.organizationId,
            automation.name
          );

          if (actionResult.success) {
            actionsExecuted++;
          } else {
            hasError = true;
            errorMessage = actionResult.error || 'Erro desconhecido';
            logError(`[AutomationEngine] Erro na ação "${action.type}": ${errorMessage}`);
          }
        }

        // Registrar execução no histórico
        try {
          await supabase.from('automation_executions').insert({
            automation_id: automation.id,
            organization_id: event.organizationId,
            trigger_event: event,
            started_at: new Date(automationStart).toISOString(),
            completed_at: new Date().toISOString(),
            status: hasError ? 'partial' : 'completed',
            steps_executed: automation.definition.actions.map((a: AutomationAction, i: number) => ({
              index: i,
              type: a.type,
              executed: i < actionsExecuted,
            })),
            error_message: hasError ? errorMessage : null,
          });
        } catch (insertError) {
          // Não falha se não conseguir registrar (tabela pode não existir)
          logError(`[AutomationEngine] Erro ao registrar execução:`, insertError);
        }

      } catch (automationError: any) {
        hasError = true;
        errorMessage = automationError.message;
        logError(`[AutomationEngine] Erro ao processar automação "${automation.name}":`, automationError);
      }

      results.push({
        automationId: automation.id,
        automationName: automation.name,
        success: !hasError,
        actionsExecuted,
        error: hasError ? errorMessage : undefined,
        duration: Date.now() - automationStart,
      });
    }

    const totalDuration = Date.now() - startTime;
    logInfo(`[AutomationEngine] ✅ Processamento concluído em ${totalDuration}ms`, {
      totalAutomations: matchingAutomations.length,
      successCount: results.filter(r => r.success).length,
    });

  } catch (error: any) {
    logError(`[AutomationEngine] Erro fatal no processamento:`, error);
  }

  return results;
}

// ============================================================================
// HELPER: Disparar evento de automação
// ============================================================================

/**
 * Função utilitária para disparar eventos de automação de qualquer lugar do sistema
 */
export async function triggerAutomationEvent(
  type: string,
  organizationId: string,
  payload: Record<string, any>
): Promise<ExecutionResult[]> {
  return processAutomationTrigger({
    type,
    organizationId,
    payload,
    timestamp: new Date().toISOString(),
  });
}

export default { processAutomationTrigger, triggerAutomationEvent };
