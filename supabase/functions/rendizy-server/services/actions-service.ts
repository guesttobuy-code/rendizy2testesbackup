// ============================================================================
// ACTIONS SERVICE - Executa ações das automações
// ============================================================================
// Implementa as ações disponíveis: notificações, relatórios, alertas
// ============================================================================

import { getSupabaseClient } from '../kv_store.tsx';
import { logInfo, logError } from '../utils.ts';
import type { AutomationEvent } from './event-bus.ts';

interface AutomationAction {
  type: string;
  channel?: string;
  template?: string;
  payload?: Record<string, any>;
}

interface Automation {
  id: string;
  organization_id: string;
  name: string;
  definition: any;
}

/**
 * Executa uma ação de automação
 */
export async function executeAction(
  action: AutomationAction,
  event: AutomationEvent,
  automation: Automation
): Promise<any> {
  logInfo(`[ActionsService] Executando ação: ${action.type}`, { channel: action.channel });

  switch (action.type) {
    case 'notify':
      return await executeNotifyAction(action, event, automation);
    
    case 'report':
      return await executeReportAction(action, event, automation);
    
    case 'alert':
      return await executeAlertAction(action, event, automation);
    
    case 'create_task':
      return await executeCreateTaskAction(action, event, automation);
    
    default:
      throw new Error(`Tipo de ação desconhecido: ${action.type}`);
  }
}

/**
 * Ação: Notificar (chat interno, email, etc.)
 */
async function executeNotifyAction(
  action: AutomationAction,
  event: AutomationEvent,
  automation: Automation
): Promise<any> {
  const channel = action.channel || 'chat';
  const message = action.template || action.payload?.message || 'Notificação automática';

  // Substituir variáveis no template
  const processedMessage = replaceVariables(message, event, automation);

  switch (channel) {
    case 'chat':
      return await notifyChat(processedMessage, automation.organization_id, action.payload);
    
    case 'email':
      return await notifyEmail(processedMessage, action.payload?.recipient, automation.organization_id);
    
    case 'whatsapp':
      return await notifyWhatsApp(processedMessage, action.payload?.phone, automation.organization_id);
    
    default:
      throw new Error(`Canal de notificação desconhecido: ${channel}`);
  }
}

/**
 * Ação: Gerar relatório
 */
async function executeReportAction(
  action: AutomationAction,
  event: AutomationEvent,
  automation: Automation
): Promise<any> {
  logInfo('[ActionsService] Gerando relatório', { type: action.payload?.reportType });

  // Por enquanto, apenas loga. Pode ser expandido para gerar PDF, enviar email, etc.
  const reportData = {
    type: action.payload?.reportType || 'summary',
    event: event.type,
    timestamp: new Date().toISOString(),
    data: event.payload,
  };

  logInfo('[ActionsService] Relatório gerado', reportData);
  
  return {
    success: true,
    report: reportData,
  };
}

/**
 * Ação: Alerta (similar a notificação, mas com prioridade alta)
 */
async function executeAlertAction(
  action: AutomationAction,
  event: AutomationEvent,
  automation: Automation
): Promise<any> {
  const message = action.template || action.payload?.message || 'Alerta automático';
  const processedMessage = replaceVariables(message, event, automation);

  // Enviar como notificação de alta prioridade
  return await notifyChat(`🚨 ALERTA: ${processedMessage}`, automation.organization_id, {
    priority: 'high',
    ...action.payload,
  });
}

/**
 * Ação: Criar tarefa
 */
async function executeCreateTaskAction(
  action: AutomationAction,
  event: AutomationEvent,
  automation: Automation
): Promise<any> {
  const title = action.payload?.title || 'Tarefa automática';
  const description = action.payload?.description || '';
  const processedTitle = replaceVariables(title, event, automation);
  const processedDescription = replaceVariables(description, event, automation);

  // Por enquanto, apenas loga. Pode ser integrado com módulo de tarefas no futuro
  logInfo('[ActionsService] Tarefa criada', {
    title: processedTitle,
    description: processedDescription,
  });

  return {
    success: true,
    task: {
      title: processedTitle,
      description: processedDescription,
    },
  };
}

/**
 * Notificar via chat interno
 */
async function notifyChat(
  message: string,
  organizationId: string,
  options?: Record<string, any>
): Promise<any> {
  try {
    const supabase = getSupabaseClient();
    
    // Criar mensagem no chat interno
    // Por enquanto, apenas loga. Pode ser integrado com módulo de chat no futuro
    logInfo('[ActionsService] Notificação no chat', {
      message,
      organizationId,
      options,
    });

    return {
      success: true,
      channel: 'chat',
      message,
    };
  } catch (error) {
    logError('[ActionsService] Erro ao notificar no chat', error);
    throw error;
  }
}

/**
 * Notificar via email
 */
async function notifyEmail(
  message: string,
  recipient: string | undefined,
  organizationId: string
): Promise<any> {
  logInfo('[ActionsService] Notificação por email', {
    recipient,
    message: message.substring(0, 50) + '...',
  });

  // Por enquanto, apenas loga. Pode ser integrado com SendGrid/Mailgun no futuro
  return {
    success: true,
    channel: 'email',
    recipient,
  };
}

/**
 * Notificar via WhatsApp
 */
async function notifyWhatsApp(
  message: string,
  phone: string | undefined,
  organizationId: string
): Promise<any> {
  logInfo('[ActionsService] Notificação por WhatsApp', {
    phone,
    message: message.substring(0, 50) + '...',
  });

  // Por enquanto, apenas loga. Pode ser integrado com Evolution API no futuro
  return {
    success: true,
    channel: 'whatsapp',
    phone,
  };
}

/**
 * Substitui variáveis no template (ex: {{reservationId}}, {{total}})
 */
function replaceVariables(
  template: string,
  event: AutomationEvent,
  automation: Automation
): string {
  let result = template;

  // Variáveis do evento
  Object.keys(event.payload).forEach((key) => {
    const value = event.payload[key];
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value || ''));
  });

  // Variáveis especiais
  result = result.replace(/{{eventType}}/g, event.type);
  result = result.replace(/{{timestamp}}/g, new Date().toLocaleString('pt-BR'));
  result = result.replace(/{{automationName}}/g, automation.name);

  return result;
}

