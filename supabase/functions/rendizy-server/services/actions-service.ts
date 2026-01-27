// ============================================================================
// ACTIONS SERVICE - Executa ações das automações
// ============================================================================
// Implementa as ações disponíveis: notificações, relatórios, alertas
// Agora integrado com o sistema modular de notificações (cápsulas)
// ============================================================================

import { getSupabaseClient } from '../kv_store.tsx';
import { logInfo, logError } from '../utils.ts';
import type { AutomationEvent } from './event-bus.ts';

// Import do sistema de notificações modular
import { 
  sendEmail, 
  sendSms, 
  sendWhatsApp, 
  sendInApp 
} from './notifications/dispatcher.ts';

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
 * Ação: Notificar (chat interno, email, WhatsApp, SMS)
 * Agora usa o sistema modular de notificações
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
    case 'in_app':
    case 'dashboard':
      return await notifyInApp(processedMessage, automation.organization_id, action.payload);
    
    case 'email':
      return await notifyEmail(
        processedMessage, 
        action.payload?.recipient || action.payload?.to, 
        action.payload?.subject || 'Notificação Rendizy',
        automation.organization_id
      );
    
    case 'whatsapp':
      return await notifyWhatsApp(
        processedMessage, 
        action.payload?.phone || action.payload?.to, 
        automation.organization_id
      );
    
    case 'sms':
      return await notifySms(
        processedMessage,
        action.payload?.phone || action.payload?.to,
        automation.organization_id
      );
    
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

  // Enviar como notificação de alta prioridade via sistema modular
  return await notifyInApp(`🚨 ALERTA: ${processedMessage}`, automation.organization_id, {
    priority: 'urgent',
    type: 'error',
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

// ============================================================================
// FUNÇÕES DE NOTIFICAÇÃO (usam o sistema modular de cápsulas)
// ============================================================================

/**
 * Notificar via dashboard (in-app)
 * Usa o provider in-app do sistema modular
 */
async function notifyInApp(
  message: string,
  organizationId: string,
  options?: Record<string, any>
): Promise<any> {
  try {
    const result = await sendInApp(
      organizationId,
      options?.title || 'Notificação',
      message,
      {
        type: options?.type || 'info',
        priority: options?.priority || 'normal',
        actionUrl: options?.actionUrl,
        actionLabel: options?.actionLabel,
        userId: options?.userId,
        metadata: options,
      }
    );

    logInfo('[ActionsService] Notificação in-app enviada', {
      success: result.success,
      messageId: result.messageId,
    });

    return result;
  } catch (error) {
    logError('[ActionsService] Erro ao enviar notificação in-app', error);
    throw error;
  }
}

/**
 * Notificar via email
 * Usa Resend ou Brevo conforme configurado
 */
async function notifyEmail(
  message: string,
  recipient: string | undefined,
  subject: string,
  organizationId: string
): Promise<any> {
  if (!recipient) {
    logError('[ActionsService] Email: destinatário não informado');
    return { success: false, error: 'Destinatário não informado' };
  }

  try {
    const result = await sendEmail(
      organizationId,
      recipient,
      subject,
      `<div style="font-family: Arial, sans-serif; padding: 20px;">${message}</div>`
    );

    logInfo('[ActionsService] Email enviado', {
      success: result.success,
      provider: result.provider,
      messageId: result.messageId,
    });

    return result;
  } catch (error) {
    logError('[ActionsService] Erro ao enviar email', error);
    throw error;
  }
}

/**
 * Notificar via WhatsApp
 * Usa Evolution API conforme configurado
 */
async function notifyWhatsApp(
  message: string,
  phone: string | undefined,
  organizationId: string
): Promise<any> {
  if (!phone) {
    logError('[ActionsService] WhatsApp: telefone não informado');
    return { success: false, error: 'Telefone não informado' };
  }

  try {
    const result = await sendWhatsApp(
      organizationId,
      phone,
      message
    );

    logInfo('[ActionsService] WhatsApp enviado', {
      success: result.success,
      provider: result.provider,
      messageId: result.messageId,
    });

    return result;
  } catch (error) {
    logError('[ActionsService] Erro ao enviar WhatsApp', error);
    throw error;
  }
}

/**
 * Notificar via SMS
 * Usa Brevo SMS conforme configurado
 */
async function notifySms(
  message: string,
  phone: string | undefined,
  organizationId: string
): Promise<any> {
  if (!phone) {
    logError('[ActionsService] SMS: telefone não informado');
    return { success: false, error: 'Telefone não informado' };
  }

  try {
    const result = await sendSms(
      organizationId,
      phone,
      message
    );

    logInfo('[ActionsService] SMS enviado', {
      success: result.success,
      provider: result.provider,
      messageId: result.messageId,
    });

    return result;
  } catch (error) {
    logError('[ActionsService] Erro ao enviar SMS', error);
    throw error;
  }
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

