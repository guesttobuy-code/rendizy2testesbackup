/**
 * RENDIZY - Interpretador Local de Automações
 * 
 * Parser offline que detecta padrões comuns de automação em linguagem natural.
 * Funciona 100% no frontend sem depender de API de IA externa.
 * 
 * QUANDO UMA IA FOR CONTRATADA:
 * Basta mudar USE_LOCAL_INTERPRETER para false que ele vai usar a API real.
 * 
 * @version 1.0.0
 * @date 2026-01-25
 */

import { type AutomationNaturalLanguageResponse, type AutomationDefinition } from '../../utils/api';

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

/** Se true, usa o interpretador local. Se false, tenta a API de IA. */
export const USE_LOCAL_INTERPRETER = true;

// ============================================================================
// PADRÕES DE GATILHOS (TRIGGERS)
// ============================================================================

const TRIGGER_PATTERNS: Array<{
  patterns: RegExp[];
  trigger: string;
  description: string;
}> = [
  {
    patterns: [
      /quando\s+receber\s+mensagem/i,
      /ao\s+receber\s+mensagem/i,
      /nova\s+mensagem/i,
      /mensagem\s+recebida/i,
      /receber\s+uma?\s+mensagem/i,
    ],
    trigger: 'message_received',
    description: 'Quando uma nova mensagem for recebida',
  },
  {
    patterns: [
      /nova\s+reserva/i,
      /reserva\s+criada/i,
      /quando\s+criar\s+reserva/i,
      /ao\s+criar\s+reserva/i,
      /quando\s+houver\s+(uma\s+)?nova\s+reserva/i,
    ],
    trigger: 'reservation_created',
    description: 'Quando uma nova reserva for criada',
  },
  {
    patterns: [
      /check.?in\s+(próximo|amanhã|hoje)/i,
      /antes\s+do\s+check.?in/i,
      /lembrete\s+de\s+check.?in/i,
      /1\s+dia\s+antes\s+do\s+check.?in/i,
    ],
    trigger: 'checkin_approaching',
    description: 'Quando o check-in estiver próximo',
  },
  {
    patterns: [
      /check.?out\s+(próximo|amanhã|hoje)/i,
      /antes\s+do\s+check.?out/i,
      /lembrete\s+de\s+check.?out/i,
    ],
    trigger: 'checkout_approaching',
    description: 'Quando o check-out estiver próximo',
  },
  {
    patterns: [
      /pagamento\s+atrasado/i,
      /pagamento\s+pendente/i,
      /fatura\s+atrasada/i,
      /cobrança\s+pendente/i,
    ],
    trigger: 'payment_overdue',
    description: 'Quando houver pagamento atrasado',
  },
  {
    patterns: [
      /todo\s+dia\s+[àa]s?\s+(\d{1,2})[h:]/i,
      /diariamente\s+[àa]s?\s+(\d{1,2})/i,
      /às?\s+(\d{1,2})[h:]\s*(\d{2})?\s*(todo|diariamente)?/i,
      /(\d{1,2})[h:]\s*(\d{2})?\s*(todo\s+dia|diariamente)/i,
    ],
    trigger: 'scheduled',
    description: 'Agendamento em horário específico',
  },
  {
    patterns: [
      /retorno\s+(hoje|amanhã)?\s*[àa]s?\s*(\d{1,2})[h:]/i,
      /lembrar\s+de\s+retornar/i,
      /notifi(car|que)\s+para\s+retorno/i,
    ],
    trigger: 'scheduled',
    description: 'Lembrete de retorno agendado',
  },
];

// ============================================================================
// PADRÕES DE AÇÕES
// ============================================================================

const ACTION_PATTERNS: Array<{
  patterns: RegExp[];
  action: { type: string; channel?: string };
  description: string;
}> = [
  {
    patterns: [
      /me\s+notifi(car|que)/i,
      /enviar?\s+notifica(ção|r)/i,
      /alertar?(-me)?/i,
      /avisar?(-me)?/i,
      /criar?\s+alerta/i,
    ],
    action: { type: 'send_notification', channel: 'dashboard' },
    description: 'Enviar notificação no dashboard',
  },
  {
    patterns: [
      /enviar?\s+(uma?\s+)?mensagem\s+(no\s+)?whatsapp/i,
      /responder\s+(no\s+)?whatsapp/i,
      /enviar?\s+whatsapp/i,
      /mandar\s+whatsapp/i,
    ],
    action: { type: 'send_message', channel: 'whatsapp' },
    description: 'Enviar mensagem via WhatsApp',
  },
  {
    patterns: [
      /enviar?\s+(um\s+)?e-?mail/i,
      /mandar\s+(um\s+)?e-?mail/i,
      /enviar?\s+por\s+e-?mail/i,
    ],
    action: { type: 'send_message', channel: 'email' },
    description: 'Enviar e-mail',
  },
  {
    patterns: [
      /criar?\s+(uma?\s+)?tarefa/i,
      /adicionar?\s+tarefa/i,
      /criar?\s+to-?do/i,
      /criar?\s+lembrete/i,
    ],
    action: { type: 'create_task' },
    description: 'Criar uma tarefa',
  },
  {
    patterns: [
      /enviar?\s+boas.?vindas/i,
      /mensagem\s+de\s+boas.?vindas/i,
      /dar\s+boas.?vindas/i,
    ],
    action: { type: 'send_message', channel: 'whatsapp' },
    description: 'Enviar mensagem de boas-vindas',
  },
];

// ============================================================================
// PADRÕES DE CONDIÇÕES
// ============================================================================

const CONDITION_PATTERNS: Array<{
  patterns: RegExp[];
  condition: { field: string; operator: string };
  extractValue: (match: RegExpMatchArray) => string;
}> = [
  {
    patterns: [
      /de\s+([A-Za-zÀ-ú\s]+?)(?:\s*,|\s+me|\s+enviar|\s+notificar|$)/i,
      /mensagem\s+de\s+([A-Za-zÀ-ú\s]+?)(?:\s*,|\s+me|\s+enviar|$)/i,
    ],
    condition: { field: 'contact_name', operator: 'contains' },
    extractValue: (match) => match[1]?.trim() || '',
  },
  {
    patterns: [
      /contendo?\s+['"]?([^'"]+)['"]?/i,
      /com\s+(?:a\s+)?palavra\s+['"]?([^'"]+)['"]?/i,
      /que\s+contenha\s+['"]?([^'"]+)['"]?/i,
    ],
    condition: { field: 'message_content', operator: 'contains' },
    extractValue: (match) => match[1]?.trim() || '',
  },
  {
    patterns: [
      /contato\s+([A-Za-zÀ-ú\s]+)/i,
      /do\s+contato\s+([A-Za-zÀ-ú\s]+)/i,
    ],
    condition: { field: 'contact_name', operator: 'contains' },
    extractValue: (match) => match[1]?.trim() || '',
  },
];

// ============================================================================
// FUNÇÕES DE INTERPRETAÇÃO
// ============================================================================

/**
 * Detecta o tipo de gatilho baseado no texto
 */
function detectTrigger(input: string): { type: string; description: string } | null {
  for (const pattern of TRIGGER_PATTERNS) {
    for (const regex of pattern.patterns) {
      if (regex.test(input)) {
        return { type: pattern.trigger, description: pattern.description };
      }
    }
  }
  return null;
}

/**
 * Detecta as ações mencionadas no texto
 */
function detectActions(input: string): Array<{ type: string; channel?: string; description: string }> {
  const actions: Array<{ type: string; channel?: string; description: string }> = [];
  
  for (const pattern of ACTION_PATTERNS) {
    for (const regex of pattern.patterns) {
      if (regex.test(input)) {
        // Evitar duplicatas
        if (!actions.some(a => a.type === pattern.action.type && a.channel === pattern.action.channel)) {
          actions.push({
            ...pattern.action,
            description: pattern.description,
          });
        }
        break;
      }
    }
  }
  
  // Se não encontrou ação explícita, assume notificação
  if (actions.length === 0) {
    actions.push({
      type: 'send_notification',
      channel: 'dashboard',
      description: 'Enviar notificação no dashboard',
    });
  }
  
  return actions;
}

/**
 * Detecta condições no texto
 */
function detectConditions(input: string): Array<{ field: string; operator: string; value: string }> {
  const conditions: Array<{ field: string; operator: string; value: string }> = [];
  
  for (const pattern of CONDITION_PATTERNS) {
    for (const regex of pattern.patterns) {
      const match = input.match(regex);
      if (match) {
        const value = pattern.extractValue(match);
        if (value && value.length > 1) {
          conditions.push({
            ...pattern.condition,
            value,
          });
        }
        break;
      }
    }
  }
  
  return conditions;
}

/**
 * Extrai horário do texto
 */
function extractTime(input: string): { hour: number; minute: number } | null {
  // Padrões: "21h", "21:00", "às 21h", "21 horas"
  const timePatterns = [
    /(\d{1,2})[h:]\s*(\d{2})?/i,
    /às?\s+(\d{1,2})\s*h/i,
    /(\d{1,2})\s+horas?/i,
  ];
  
  for (const regex of timePatterns) {
    const match = input.match(regex);
    if (match) {
      const hour = parseInt(match[1], 10);
      const minute = match[2] ? parseInt(match[2], 10) : 0;
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return { hour, minute };
      }
    }
  }
  
  return null;
}

/**
 * Gera um nome amigável para a automação
 */
function generateName(trigger: string, actions: Array<{ type: string }>, conditions: Array<{ value?: string }>): string {
  const triggerNames: Record<string, string> = {
    message_received: 'Mensagem',
    reservation_created: 'Nova reserva',
    checkin_approaching: 'Check-in próximo',
    checkout_approaching: 'Check-out próximo',
    payment_overdue: 'Pagamento atrasado',
    scheduled: 'Agendamento',
  };
  
  const actionNames: Record<string, string> = {
    send_notification: 'Notificar',
    send_message: 'Enviar',
    create_task: 'Criar tarefa',
  };
  
  const triggerPart = triggerNames[trigger] || 'Evento';
  const actionPart = actions.length > 0 ? actionNames[actions[0].type] || 'Ação' : 'Ação';
  const conditionPart = conditions.length > 0 && conditions[0].value 
    ? ` - ${conditions[0].value.slice(0, 20)}`
    : '';
  
  return `${triggerPart} → ${actionPart}${conditionPart}`;
}

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

/**
 * Interpreta texto em linguagem natural e gera uma definição de automação.
 * Funciona 100% offline sem depender de API de IA.
 */
export function interpretLocalAutomation(
  input: string,
  context?: {
    module?: string;
    channel?: string;
    priority?: string;
    contactName?: string;
  }
): AutomationNaturalLanguageResponse {
  const normalizedInput = input.toLowerCase().trim();
  
  // 1. Detectar gatilho
  const trigger = detectTrigger(normalizedInput);
  
  // 2. Detectar ações
  const actions = detectActions(normalizedInput);
  
  // 3. Detectar condições
  const conditions = detectConditions(input); // Manter case original para nomes
  
  // 4. Extrair horário se for agendamento
  const time = extractTime(normalizedInput);
  
  // Se não conseguiu detectar gatilho, retorna resposta conversacional
  if (!trigger) {
    return {
      definition: null,
      conversationalResponse: `Não consegui identificar claramente o gatilho da automação. 

Tente ser mais específico, por exemplo:
• "Quando receber mensagem de [Nome], me notificar"
• "Nova reserva → enviar boas-vindas via WhatsApp"
• "1 dia antes do check-in, enviar instruções"
• "Todo dia às 9h, verificar pagamentos pendentes"`,
      ai_interpretation_summary: 'Gatilho não identificado',
      provider: 'local',
      model: 'pattern-matcher-v1',
      rawText: input,
    };
  }
  
  // Construir definição da automação
  const definition: AutomationDefinition = {
    name: generateName(trigger.type, actions, conditions),
    description: `Automação: ${trigger.description}${conditions.length > 0 ? ` com condições` : ''}`,
    trigger: {
      type: trigger.type,
      ...(time && trigger.type === 'scheduled' ? { schedule: `${time.hour}:${time.minute.toString().padStart(2, '0')}` } : {}),
    },
    conditions: conditions.length > 0 ? conditions.map(c => ({
      field: c.field,
      operator: c.operator,
      value: c.value,
    })) : undefined,
    actions: actions.map(a => ({
      type: a.type,
      channel: a.channel,
      template: a.type === 'send_notification' ? 'Alerta automático: {{trigger_description}}' : undefined,
      payload: {},
    })),
    metadata: {
      priority: (context?.priority as 'baixa' | 'media' | 'alta') || 'media',
      requiresApproval: false,
      notifyChannels: ['dashboard'],
    },
  };
  
  // Gerar resumo
  const summaryParts = [
    `📍 Gatilho: ${trigger.description}`,
    conditions.length > 0 ? `🎯 Condições: ${conditions.map(c => `${c.field} ${c.operator} "${c.value}"`).join(', ')}` : null,
    `⚡ Ações: ${actions.map(a => a.description).join(', ')}`,
  ].filter(Boolean);
  
  return {
    definition,
    ai_interpretation_summary: summaryParts.join(' | '),
    impact_description: `Esta automação será executada automaticamente ${trigger.description.toLowerCase()}.`,
    provider: 'local',
    model: 'pattern-matcher-v1',
    rawText: input,
  };
}

/**
 * Verifica se o interpretador local está habilitado
 */
export function isLocalInterpreterEnabled(): boolean {
  return USE_LOCAL_INTERPRETER;
}
