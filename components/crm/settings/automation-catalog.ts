/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║               CATÁLOGO DE AUTOMAÇÕES - RENDIZY CRM                        ║
 * ║                                                                           ║
 * ║  Catálogo completo de triggers, condições e ações disponíveis para       ║
 * ║  automações no sistema. Inspirado em Zapier/Make/n8n best practices.     ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * @version 1.0.0
 * @date 2026-01-25
 */

// ============================================================================
// TIPOS BASE
// ============================================================================

export type TriggerCategory = 
  | 'reservas'
  | 'financeiro'
  | 'comunicacao'
  | 'crm'
  | 'operacional'
  | 'sistema'
  | 'funis';

export type ActionCategory = 
  | 'notificacoes'
  | 'tarefas'
  | 'comunicacao'
  | 'dados'
  | 'integracao'
  | 'funis';

export type ConditionOperator = 
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'exists'
  | 'not_exists'
  | 'is_empty'
  | 'is_not_empty';

export type StabilityLevel = 'stable' | 'beta' | 'planned';

// ============================================================================
// INTERFACE DO CATÁLOGO
// ============================================================================

export interface TriggerDefinition {
  id: string;
  name: string;
  description: string;
  category: TriggerCategory;
  stability: StabilityLevel;
  icon: string; // Nome do ícone Lucide
  aliases: string[];
  availableFields: PayloadField[];
  examples: string[];
  documentation?: string;
}

export interface PayloadField {
  name: string;
  path: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  description: string;
  example: string;
}

export interface ActionDefinition {
  id: string;
  name: string;
  description: string;
  category: ActionCategory;
  stability: StabilityLevel;
  icon: string;
  requiredFields: ActionField[];
  optionalFields: ActionField[];
  examples: string[];
}

export interface ActionField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'template';
  description: string;
  required: boolean;
  defaultValue?: any;
  options?: { value: string; label: string }[];
}

export interface ConditionDefinition {
  id: string;
  name: string;
  operator: ConditionOperator;
  description: string;
  applicableTo: ('string' | 'number' | 'boolean' | 'date' | 'array')[];
}

// ============================================================================
// CATÁLOGO DE TRIGGERS (EVENTOS)
// ============================================================================

export const TRIGGERS_CATALOG: TriggerDefinition[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // RESERVAS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'reservation_created',
    name: 'Reserva Criada',
    description: 'Dispara quando uma nova reserva é criada no sistema, independente da origem (site, OTA, manual).',
    category: 'reservas',
    stability: 'stable',
    icon: 'CalendarPlus',
    aliases: ['nova_reserva', 'new_reservation', 'reserva_criada'],
    availableFields: [
      { name: 'ID da Reserva', path: 'reservationId', type: 'string', description: 'Identificador único da reserva', example: 'res_abc123' },
      { name: 'Imóvel', path: 'propertyId', type: 'string', description: 'ID do imóvel reservado', example: 'prop_xyz789' },
      { name: 'Hóspede', path: 'guestName', type: 'string', description: 'Nome completo do hóspede', example: 'João Silva' },
      { name: 'Check-in', path: 'checkin', type: 'date', description: 'Data do check-in', example: '2026-02-01' },
      { name: 'Check-out', path: 'checkout', type: 'date', description: 'Data do check-out', example: '2026-02-05' },
      { name: 'Valor Total', path: 'totalAmount', type: 'number', description: 'Valor total da reserva', example: '1500.00' },
      { name: 'Canal', path: 'channel', type: 'string', description: 'Canal de origem (Airbnb, Booking, Direto)', example: 'Airbnb' },
      { name: 'Email', path: 'guestEmail', type: 'string', description: 'Email do hóspede', example: 'joao@email.com' },
      { name: 'Telefone', path: 'guestPhone', type: 'string', description: 'Telefone do hóspede', example: '+5511999999999' },
    ],
    examples: [
      'Enviar email de boas-vindas ao criar reserva',
      'Criar tarefa de limpeza para o dia anterior ao check-in',
      'Notificar equipe sobre nova reserva VIP',
    ],
  },
  {
    id: 'reservation_confirmed',
    name: 'Reserva Confirmada',
    description: 'Dispara quando uma reserva tem seu pagamento confirmado ou status alterado para confirmado.',
    category: 'reservas',
    stability: 'stable',
    icon: 'CalendarCheck',
    aliases: ['reserva_confirmada', 'booking_confirmed'],
    availableFields: [
      { name: 'ID da Reserva', path: 'reservationId', type: 'string', description: 'Identificador único da reserva', example: 'res_abc123' },
      { name: 'Imóvel', path: 'propertyId', type: 'string', description: 'ID do imóvel reservado', example: 'prop_xyz789' },
      { name: 'Valor Pago', path: 'amountPaid', type: 'number', description: 'Valor efetivamente pago', example: '1500.00' },
      { name: 'Método Pagamento', path: 'paymentMethod', type: 'string', description: 'Forma de pagamento utilizada', example: 'credit_card' },
    ],
    examples: [
      'Enviar voucher de confirmação ao hóspede',
      'Bloquear calendário em outras OTAs',
      'Criar registro financeiro de receita',
    ],
  },
  {
    id: 'reservation_cancelled',
    name: 'Reserva Cancelada',
    description: 'Dispara quando uma reserva é cancelada, seja pelo hóspede, administrador ou automaticamente.',
    category: 'reservas',
    stability: 'stable',
    icon: 'CalendarX',
    aliases: ['reserva_cancelada', 'booking_cancelled'],
    availableFields: [
      { name: 'ID da Reserva', path: 'reservationId', type: 'string', description: 'Identificador único da reserva', example: 'res_abc123' },
      { name: 'Motivo', path: 'cancellationReason', type: 'string', description: 'Motivo do cancelamento', example: 'Solicitação do hóspede' },
      { name: 'Reembolso', path: 'refundAmount', type: 'number', description: 'Valor a ser reembolsado', example: '750.00' },
      { name: 'Cancelado Por', path: 'cancelledBy', type: 'string', description: 'Quem solicitou o cancelamento', example: 'guest' },
    ],
    examples: [
      'Liberar calendário em outras OTAs',
      'Processar reembolso automático',
      'Notificar proprietário sobre cancelamento',
    ],
  },
  {
    id: 'checkin_approaching',
    name: 'Check-in se Aproximando',
    description: 'Dispara X dias/horas antes do check-in. Configurável por threshold.',
    category: 'reservas',
    stability: 'stable',
    icon: 'LogIn',
    aliases: ['checkin_proximo', 'pre_checkin', 'before_checkin'],
    availableFields: [
      { name: 'ID da Reserva', path: 'reservationId', type: 'string', description: 'Identificador único da reserva', example: 'res_abc123' },
      { name: 'Hóspede', path: 'guestName', type: 'string', description: 'Nome do hóspede', example: 'João Silva' },
      { name: 'Data Check-in', path: 'checkin', type: 'date', description: 'Data do check-in', example: '2026-02-01' },
      { name: 'Dias Restantes', path: 'daysUntilCheckin', type: 'number', description: 'Dias até o check-in', example: '2' },
      { name: 'Imóvel', path: 'propertyName', type: 'string', description: 'Nome do imóvel', example: 'Apartamento Centro' },
    ],
    examples: [
      'Enviar instruções de check-in 24h antes',
      'Criar tarefa de vistoria prévia',
      'Enviar WhatsApp com código de acesso',
    ],
  },
  {
    id: 'checkout_approaching',
    name: 'Check-out se Aproximando',
    description: 'Dispara X dias/horas antes do check-out. Ideal para lembrete de saída.',
    category: 'reservas',
    stability: 'stable',
    icon: 'LogOut',
    aliases: ['checkout_proximo', 'pre_checkout', 'before_checkout'],
    availableFields: [
      { name: 'ID da Reserva', path: 'reservationId', type: 'string', description: 'Identificador único da reserva', example: 'res_abc123' },
      { name: 'Hóspede', path: 'guestName', type: 'string', description: 'Nome do hóspede', example: 'João Silva' },
      { name: 'Data Check-out', path: 'checkout', type: 'date', description: 'Data do check-out', example: '2026-02-05' },
      { name: 'Horário Check-out', path: 'checkoutTime', type: 'string', description: 'Horário limite de saída', example: '11:00' },
    ],
    examples: [
      'Enviar lembrete de check-out no dia anterior',
      'Agendar limpeza pós-checkout',
      'Solicitar avaliação ao hóspede',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FINANCEIRO
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'payment_received',
    name: 'Pagamento Recebido',
    description: 'Dispara quando um pagamento é registrado ou confirmado no sistema.',
    category: 'financeiro',
    stability: 'stable',
    icon: 'CircleDollarSign',
    aliases: ['pagamento_recebido', 'payment_completed'],
    availableFields: [
      { name: 'ID Transação', path: 'transactionId', type: 'string', description: 'ID único da transação', example: 'txn_123' },
      { name: 'Valor', path: 'amount', type: 'number', description: 'Valor do pagamento', example: '1500.00' },
      { name: 'Origem', path: 'source', type: 'string', description: 'Origem do pagamento', example: 'stripe' },
      { name: 'Reserva', path: 'reservationId', type: 'string', description: 'Reserva associada (se houver)', example: 'res_abc123' },
    ],
    examples: [
      'Confirmar reserva automaticamente',
      'Enviar recibo por email',
      'Registrar no plano de contas',
    ],
  },
  {
    id: 'payment_overdue',
    name: 'Pagamento Atrasado',
    description: 'Dispara quando um pagamento está vencido há X dias.',
    category: 'financeiro',
    stability: 'stable',
    icon: 'AlertCircle',
    aliases: ['pagamento_atrasado', 'payment_late'],
    availableFields: [
      { name: 'ID Cobrança', path: 'invoiceId', type: 'string', description: 'ID da cobrança', example: 'inv_456' },
      { name: 'Valor Devido', path: 'amountDue', type: 'number', description: 'Valor em aberto', example: '500.00' },
      { name: 'Dias Atraso', path: 'daysOverdue', type: 'number', description: 'Dias em atraso', example: '5' },
      { name: 'Cliente', path: 'customerName', type: 'string', description: 'Nome do devedor', example: 'João Silva' },
    ],
    examples: [
      'Enviar lembrete de cobrança',
      'Criar tarefa de follow-up',
      'Notificar gestor financeiro',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // COMUNICAÇÃO
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'message_received',
    name: 'Mensagem Recebida',
    description: 'Dispara quando uma nova mensagem é recebida em qualquer canal (WhatsApp, Chat, Email).',
    category: 'comunicacao',
    stability: 'stable',
    icon: 'MessageSquare',
    aliases: ['nova_mensagem', 'mensagem_recebida', 'new_message', 'chat_message'],
    availableFields: [
      { name: 'ID Mensagem', path: 'messageId', type: 'string', description: 'ID único da mensagem', example: 'msg_789' },
      { name: 'Canal', path: 'channel', type: 'string', description: 'Canal de origem', example: 'whatsapp' },
      { name: 'Remetente', path: 'senderName', type: 'string', description: 'Nome do remetente', example: 'João Silva' },
      { name: 'Telefone', path: 'senderPhone', type: 'string', description: 'Telefone do remetente', example: '+5511999999999' },
      { name: 'Conteúdo', path: 'content', type: 'string', description: 'Texto da mensagem', example: 'Olá, gostaria de saber...' },
      { name: 'Tem Mídia', path: 'hasMedia', type: 'boolean', description: 'Se contém anexo', example: 'false' },
    ],
    examples: [
      'Resposta automática fora do horário',
      'Classificar lead por palavras-chave',
      'Notificar atendente responsável',
    ],
  },
  {
    id: 'conversation_idle',
    name: 'Conversa Ociosa',
    description: 'Dispara quando uma conversa não tem resposta há X horas.',
    category: 'comunicacao',
    stability: 'beta',
    icon: 'Clock',
    aliases: ['conversa_parada', 'no_response'],
    availableFields: [
      { name: 'ID Conversa', path: 'conversationId', type: 'string', description: 'ID da conversa', example: 'conv_123' },
      { name: 'Horas Ociosa', path: 'idleHours', type: 'number', description: 'Horas sem resposta', example: '24' },
      { name: 'Última Mensagem', path: 'lastMessageAt', type: 'date', description: 'Quando foi a última mensagem', example: '2026-01-24T10:30:00Z' },
    ],
    examples: [
      'Enviar follow-up automático',
      'Alertar supervisor',
      'Mover lead para "sem resposta"',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CRM
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'task_created',
    name: 'Tarefa Criada',
    description: 'Dispara quando uma nova tarefa é criada no sistema de tarefas.',
    category: 'crm',
    stability: 'stable',
    icon: 'CheckSquare',
    aliases: ['tarefa_criada', 'new_task'],
    availableFields: [
      { name: 'ID Tarefa', path: 'taskId', type: 'string', description: 'ID único da tarefa', example: 'task_456' },
      { name: 'Título', path: 'title', type: 'string', description: 'Título da tarefa', example: 'Limpeza Apt 101' },
      { name: 'Responsável', path: 'assignee', type: 'string', description: 'Pessoa responsável', example: 'Maria Silva' },
      { name: 'Prioridade', path: 'priority', type: 'string', description: 'Nível de prioridade', example: 'alta' },
      { name: 'Prazo', path: 'dueDate', type: 'date', description: 'Data limite', example: '2026-02-01' },
    ],
    examples: [
      'Notificar responsável por push/WhatsApp',
      'Criar evento no Google Calendar',
      'Atribuir automaticamente baseado em regras',
    ],
  },
  {
    id: 'task_completed',
    name: 'Tarefa Concluída',
    description: 'Dispara quando uma tarefa é marcada como concluída.',
    category: 'crm',
    stability: 'stable',
    icon: 'CheckCircle2',
    aliases: ['tarefa_concluida', 'task_done'],
    availableFields: [
      { name: 'ID Tarefa', path: 'taskId', type: 'string', description: 'ID único da tarefa', example: 'task_456' },
      { name: 'Título', path: 'title', type: 'string', description: 'Título da tarefa', example: 'Limpeza Apt 101' },
      { name: 'Concluída Por', path: 'completedBy', type: 'string', description: 'Quem concluiu', example: 'Maria Silva' },
      { name: 'Duração', path: 'duration', type: 'number', description: 'Tempo gasto (minutos)', example: '45' },
    ],
    examples: [
      'Notificar gestor sobre conclusão',
      'Disparar próxima tarefa na cadeia',
      'Registrar tempo no relatório',
    ],
  },
  {
    id: 'lead_qualified',
    name: 'Lead Qualificado',
    description: 'Dispara quando um lead atinge critérios de qualificação definidos.',
    category: 'crm',
    stability: 'stable',
    icon: 'UserCheck',
    aliases: ['lead_qualificado', 'opportunity_qualified'],
    availableFields: [
      { name: 'ID Lead', path: 'leadId', type: 'string', description: 'ID único do lead', example: 'lead_789' },
      { name: 'Nome', path: 'name', type: 'string', description: 'Nome do lead', example: 'João Silva' },
      { name: 'Score', path: 'score', type: 'number', description: 'Pontuação de qualificação', example: '85' },
      { name: 'Canal', path: 'source', type: 'string', description: 'Origem do lead', example: 'website' },
      { name: 'Interesse', path: 'interest', type: 'string', description: 'Produto/serviço de interesse', example: 'Aluguel temporada' },
    ],
    examples: [
      'Atribuir ao vendedor disponível',
      'Enviar proposta comercial',
      'Criar oportunidade no funil',
    ],
  },
  {
    id: 'deal_stage_changed',
    name: 'Estágio do Deal Alterado',
    description: 'Dispara quando um deal/oportunidade muda de estágio no funil.',
    category: 'crm',
    stability: 'stable',
    icon: 'GitBranch',
    aliases: ['mudanca_estagio', 'stage_changed', 'deal_moved'],
    availableFields: [
      { name: 'ID Deal', path: 'dealId', type: 'string', description: 'ID único do deal', example: 'deal_123' },
      { name: 'Título', path: 'title', type: 'string', description: 'Título do deal', example: 'Proposta João Silva' },
      { name: 'Estágio Anterior', path: 'previousStage', type: 'string', description: 'Estágio de onde saiu', example: 'Proposta Enviada' },
      { name: 'Novo Estágio', path: 'newStage', type: 'string', description: 'Estágio atual', example: 'Negociação' },
      { name: 'Valor', path: 'value', type: 'number', description: 'Valor do deal', example: '15000.00' },
    ],
    examples: [
      'Notificar sobre deals em negociação',
      'Criar tarefa de follow-up',
      'Atualizar forecast de vendas',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // OPERACIONAL
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'maintenance_due',
    name: 'Manutenção Programada',
    description: 'Dispara quando uma manutenção preventiva está próxima do vencimento.',
    category: 'operacional',
    stability: 'beta',
    icon: 'Wrench',
    aliases: ['manutencao_vencendo', 'maintenance_approaching'],
    availableFields: [
      { name: 'ID Manutenção', path: 'maintenanceId', type: 'string', description: 'ID do registro', example: 'maint_123' },
      { name: 'Tipo', path: 'type', type: 'string', description: 'Tipo de manutenção', example: 'Ar condicionado' },
      { name: 'Imóvel', path: 'propertyName', type: 'string', description: 'Imóvel afetado', example: 'Apartamento 101' },
      { name: 'Vencimento', path: 'dueDate', type: 'date', description: 'Data prevista', example: '2026-02-15' },
    ],
    examples: [
      'Criar tarefa para técnico',
      'Solicitar orçamento a fornecedor',
      'Alertar gestor de manutenção',
    ],
  },
  {
    id: 'inventory_low',
    name: 'Estoque Baixo',
    description: 'Dispara quando um item de inventário atinge o nível mínimo.',
    category: 'operacional',
    stability: 'planned',
    icon: 'Package',
    aliases: ['estoque_baixo', 'low_stock'],
    availableFields: [
      { name: 'Item', path: 'itemName', type: 'string', description: 'Nome do item', example: 'Toalhas de banho' },
      { name: 'Quantidade Atual', path: 'currentQty', type: 'number', description: 'Quantidade em estoque', example: '5' },
      { name: 'Mínimo', path: 'minQty', type: 'number', description: 'Quantidade mínima definida', example: '10' },
    ],
    examples: [
      'Criar ordem de compra',
      'Notificar setor de compras',
      'Reservar de outro imóvel',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SISTEMA
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'manual',
    name: 'Trigger Manual',
    description: 'Automação disparada manualmente pelo usuário ou via API.',
    category: 'sistema',
    stability: 'stable',
    icon: 'Play',
    aliases: ['manual', 'manual_trigger', 'on_demand'],
    availableFields: [
      { name: 'Usuário', path: 'triggeredBy', type: 'string', description: 'Quem disparou', example: 'admin@rendizy.com' },
      { name: 'Parâmetros', path: 'params', type: 'object', description: 'Parâmetros customizados', example: '{ "target": "all" }' },
    ],
    examples: [
      'Reprocessar batch de dados',
      'Enviar comunicado em massa',
      'Executar limpeza de cache',
    ],
  },
  {
    id: 'cron_daily',
    name: 'Agendamento Diário',
    description: 'Executa todos os dias em horário específico.',
    category: 'sistema',
    stability: 'stable',
    icon: 'Calendar',
    aliases: ['diario', 'daily', 'scheduled_daily'],
    availableFields: [
      { name: 'Horário', path: 'time', type: 'string', description: 'Horário de execução', example: '08:00' },
      { name: 'Timezone', path: 'timezone', type: 'string', description: 'Fuso horário', example: 'America/Sao_Paulo' },
    ],
    examples: [
      'Enviar relatório diário',
      'Verificar check-ins do dia',
      'Sincronizar calendários',
    ],
  },
  {
    id: 'cron_hourly',
    name: 'Agendamento por Hora',
    description: 'Executa a cada X horas.',
    category: 'sistema',
    stability: 'stable',
    icon: 'Timer',
    aliases: ['por_hora', 'hourly', 'scheduled_hourly'],
    availableFields: [
      { name: 'Intervalo', path: 'intervalHours', type: 'number', description: 'A cada X horas', example: '4' },
    ],
    examples: [
      'Sincronizar preços com OTAs',
      'Verificar status de pagamentos',
      'Atualizar disponibilidade',
    ],
  },
  {
    id: 'webhook_received',
    name: 'Webhook Recebido',
    description: 'Dispara quando um webhook externo é recebido.',
    category: 'sistema',
    stability: 'stable',
    icon: 'Webhook',
    aliases: ['webhook', 'external_webhook'],
    availableFields: [
      { name: 'Origem', path: 'source', type: 'string', description: 'Sistema de origem', example: 'stays_net' },
      { name: 'Tipo Evento', path: 'eventType', type: 'string', description: 'Tipo do webhook', example: 'reservation.new' },
      { name: 'Payload', path: 'payload', type: 'object', description: 'Dados do webhook', example: '{ ... }' },
    ],
    examples: [
      'Processar reserva de OTA',
      'Sincronizar pagamento externo',
      'Atualizar status de entrega',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FUNIS DE VENDAS - Entrada de Leads
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'funnel_lead_arrived_whatsapp',
    name: 'Lead Chegou via WhatsApp',
    description: 'Dispara quando um novo lead entra pelo número de WhatsApp vinculado ao funil.',
    category: 'funis',
    stability: 'stable',
    icon: 'MessageCircle',
    aliases: ['lead_whatsapp', 'novo_lead_whatsapp', 'whatsapp_lead'],
    availableFields: [
      { name: 'Número WhatsApp', path: 'whatsappNumber', type: 'string', description: 'Número que recebeu a mensagem', example: '+5511999999999' },
      { name: 'Instância', path: 'instanceName', type: 'string', description: 'Nome da instância WhatsApp', example: 'vendas_principal' },
      { name: 'Nome Contato', path: 'contactName', type: 'string', description: 'Nome do lead no WhatsApp', example: 'João Silva' },
      { name: 'Telefone Lead', path: 'leadPhone', type: 'string', description: 'Telefone do lead', example: '+5511888888888' },
      { name: 'Primeira Mensagem', path: 'firstMessage', type: 'string', description: 'Conteúdo da primeira mensagem', example: 'Olá, gostaria de saber...' },
      { name: 'Data/Hora', path: 'receivedAt', type: 'date', description: 'Quando a mensagem chegou', example: '2026-01-26T10:30:00Z' },
      { name: 'Funil Vinculado', path: 'funnelId', type: 'string', description: 'ID do funil de destino', example: 'funnel_vendas' },
    ],
    examples: [
      'Criar lead automaticamente no funil de vendas',
      'Atribuir vendedor de plantão',
      'Enviar mensagem de boas-vindas',
    ],
  },
  {
    id: 'funnel_lead_arrived_chatbot',
    name: 'Lead Chegou via Chatbot',
    description: 'Dispara quando um lead completa o fluxo do chatbot configurado.',
    category: 'funis',
    stability: 'stable',
    icon: 'Bot',
    aliases: ['lead_chatbot', 'chatbot_completed', 'bot_lead'],
    availableFields: [
      { name: 'Chatbot ID', path: 'chatbotId', type: 'string', description: 'ID do chatbot usado', example: 'bot_qualificacao' },
      { name: 'Nome Chatbot', path: 'chatbotName', type: 'string', description: 'Nome do chatbot', example: 'Bot Qualificação Inicial' },
      { name: 'Respostas', path: 'answers', type: 'object', description: 'Respostas coletadas', example: '{ "interesse": "compra", "orcamento": "50k" }' },
      { name: 'Nome Lead', path: 'leadName', type: 'string', description: 'Nome informado pelo lead', example: 'Maria Santos' },
      { name: 'Email Lead', path: 'leadEmail', type: 'string', description: 'Email do lead', example: 'maria@email.com' },
      { name: 'Telefone Lead', path: 'leadPhone', type: 'string', description: 'Telefone do lead', example: '+5511888888888' },
      { name: 'Score Chatbot', path: 'botScore', type: 'number', description: 'Pontuação calculada pelo bot', example: '85' },
    ],
    examples: [
      'Mover para etapa baseado no score',
      'Atribuir vendedor especializado',
      'Criar tarefa de follow-up',
    ],
  },
  {
    id: 'funnel_lead_arrived_form',
    name: 'Lead Chegou via Formulário',
    description: 'Dispara quando um formulário do site/landing page é preenchido.',
    category: 'funis',
    stability: 'stable',
    icon: 'FileInput',
    aliases: ['lead_formulario', 'form_submitted', 'landing_page_lead'],
    availableFields: [
      { name: 'Formulário ID', path: 'formId', type: 'string', description: 'ID do formulário', example: 'form_contato_site' },
      { name: 'Nome Formulário', path: 'formName', type: 'string', description: 'Nome do formulário', example: 'Contato Site Principal' },
      { name: 'Campos', path: 'fields', type: 'object', description: 'Dados preenchidos', example: '{ "nome": "João", "email": "joao@..." }' },
      { name: 'URL Origem', path: 'sourceUrl', type: 'string', description: 'Página onde preencheu', example: 'https://site.com/imoveis' },
      { name: 'UTM Source', path: 'utmSource', type: 'string', description: 'Origem da campanha', example: 'google' },
      { name: 'UTM Medium', path: 'utmMedium', type: 'string', description: 'Meio da campanha', example: 'cpc' },
      { name: 'UTM Campaign', path: 'utmCampaign', type: 'string', description: 'Nome da campanha', example: 'verao_2026' },
      { name: 'Referrer', path: 'referrer', type: 'string', description: 'Site de referência', example: 'google.com' },
    ],
    examples: [
      'Criar lead com dados do formulário',
      'Classificar por origem da campanha',
      'Enviar email de confirmação',
    ],
  },
  {
    id: 'funnel_lead_arrived_email',
    name: 'Lead Chegou via Email',
    description: 'Dispara quando um email é recebido na caixa de entrada vinculada ao funil.',
    category: 'funis',
    stability: 'stable',
    icon: 'Mail',
    aliases: ['lead_email', 'email_received_lead', 'inbox_lead'],
    availableFields: [
      { name: 'Caixa Email', path: 'emailInbox', type: 'string', description: 'Email que recebeu', example: 'vendas@empresa.com' },
      { name: 'Assunto', path: 'subject', type: 'string', description: 'Assunto do email', example: 'Interesse em imóvel' },
      { name: 'Remetente', path: 'senderEmail', type: 'string', description: 'Email do lead', example: 'joao@gmail.com' },
      { name: 'Nome Remetente', path: 'senderName', type: 'string', description: 'Nome do remetente', example: 'João Silva' },
      { name: 'Conteúdo', path: 'emailBody', type: 'string', description: 'Corpo do email', example: 'Olá, vi o anúncio...' },
      { name: 'Tem Anexo', path: 'hasAttachment', type: 'boolean', description: 'Se tem arquivos anexados', example: 'false' },
    ],
    examples: [
      'Criar lead automaticamente',
      'Responder com template automático',
      'Classificar por assunto',
    ],
  },
  {
    id: 'funnel_lead_imported',
    name: 'Lead Importado/Criado Manual',
    description: 'Dispara quando um lead é criado manualmente ou importado por planilha.',
    category: 'funis',
    stability: 'stable',
    icon: 'UserPlus',
    aliases: ['lead_manual', 'lead_importado', 'manual_lead'],
    availableFields: [
      { name: 'Criado Por', path: 'createdBy', type: 'string', description: 'Usuário que criou', example: 'admin@empresa.com' },
      { name: 'Método', path: 'method', type: 'string', description: 'Como foi criado', example: 'manual' },
      { name: 'Origem Informada', path: 'declaredSource', type: 'string', description: 'Origem declarada', example: 'Indicação cliente' },
      { name: 'Nome Lead', path: 'leadName', type: 'string', description: 'Nome do lead', example: 'Carlos Souza' },
      { name: 'Email Lead', path: 'leadEmail', type: 'string', description: 'Email do lead', example: 'carlos@email.com' },
      { name: 'Telefone Lead', path: 'leadPhone', type: 'string', description: 'Telefone do lead', example: '+5511777777777' },
    ],
    examples: [
      'Notificar responsável sobre novo lead',
      'Criar tarefa de primeiro contato',
      'Adicionar tag por origem',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FUNIS DE VENDAS - Movimentação no Funil
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'funnel_lead_entered',
    name: 'Lead Entrou no Funil',
    description: 'Dispara quando um lead é adicionado a um funil (qualquer origem).',
    category: 'funis',
    stability: 'stable',
    icon: 'LogIn',
    aliases: ['lead_novo_funil', 'funnel_entry', 'lead_added_funnel'],
    availableFields: [
      { name: 'Lead ID', path: 'leadId', type: 'string', description: 'ID do lead', example: 'lead_abc123' },
      { name: 'Nome Lead', path: 'leadName', type: 'string', description: 'Nome do lead', example: 'João Silva' },
      { name: 'Funil ID', path: 'funnelId', type: 'string', description: 'ID do funil', example: 'funnel_vendas' },
      { name: 'Nome Funil', path: 'funnelName', type: 'string', description: 'Nome do funil', example: 'Funil de Vendas Principal' },
      { name: 'Etapa Inicial', path: 'initialStage', type: 'string', description: 'Etapa onde entrou', example: 'Novos Leads' },
      { name: 'Origem', path: 'source', type: 'string', description: 'Como chegou ao funil', example: 'whatsapp' },
      { name: 'Data Entrada', path: 'enteredAt', type: 'date', description: 'Quando entrou', example: '2026-01-26T10:30:00Z' },
    ],
    examples: [
      'Enviar mensagem de boas-vindas',
      'Atribuir vendedor disponível',
      'Criar primeira tarefa',
    ],
  },
  {
    id: 'funnel_lead_stage_changed',
    name: 'Lead Mudou de Etapa',
    description: 'Dispara quando um lead é movido para outra etapa do funil.',
    category: 'funis',
    stability: 'stable',
    icon: 'ArrowRightLeft',
    aliases: ['mudou_etapa', 'stage_changed', 'lead_movido'],
    availableFields: [
      { name: 'Lead ID', path: 'leadId', type: 'string', description: 'ID do lead', example: 'lead_abc123' },
      { name: 'Nome Lead', path: 'leadName', type: 'string', description: 'Nome do lead', example: 'João Silva' },
      { name: 'Funil ID', path: 'funnelId', type: 'string', description: 'ID do funil', example: 'funnel_vendas' },
      { name: 'Etapa Anterior', path: 'previousStage', type: 'string', description: 'Etapa de origem', example: 'Novos Leads' },
      { name: 'Etapa Anterior ID', path: 'previousStageId', type: 'string', description: 'ID da etapa anterior', example: 'stage_novos' },
      { name: 'Etapa Atual', path: 'currentStage', type: 'string', description: 'Nova etapa', example: 'Qualificados' },
      { name: 'Etapa Atual ID', path: 'currentStageId', type: 'string', description: 'ID da nova etapa', example: 'stage_qualificados' },
      { name: 'Movido Por', path: 'movedBy', type: 'string', description: 'Quem moveu', example: 'vendedor@empresa.com' },
      { name: 'Valor Negócio', path: 'dealValue', type: 'number', description: 'Valor do negócio', example: '15000' },
    ],
    examples: [
      'Notificar sobre lead avançando',
      'Criar tarefa para nova etapa',
      'Atualizar previsão de vendas',
    ],
  },
  {
    id: 'funnel_lead_advanced',
    name: 'Lead Avançou Etapa',
    description: 'Dispara quando um lead avança para uma etapa posterior (progresso positivo).',
    category: 'funis',
    stability: 'stable',
    icon: 'TrendingUp',
    aliases: ['lead_avancou', 'lead_progrediu', 'stage_advanced'],
    availableFields: [
      { name: 'Lead ID', path: 'leadId', type: 'string', description: 'ID do lead', example: 'lead_abc123' },
      { name: 'Nome Lead', path: 'leadName', type: 'string', description: 'Nome do lead', example: 'João Silva' },
      { name: 'Etapa Anterior', path: 'previousStage', type: 'string', description: 'Etapa de origem', example: 'Proposta Enviada' },
      { name: 'Etapa Atual', path: 'currentStage', type: 'string', description: 'Nova etapa', example: 'Negociação' },
      { name: 'Posição Anterior', path: 'previousPosition', type: 'number', description: 'Ordem da etapa anterior', example: '3' },
      { name: 'Posição Atual', path: 'currentPosition', type: 'number', description: 'Ordem da etapa atual', example: '4' },
      { name: 'Valor Negócio', path: 'dealValue', type: 'number', description: 'Valor do negócio', example: '25000' },
    ],
    examples: [
      'Notificar gerente sobre hot lead',
      'Adicionar tag "Em progresso"',
      'Criar tarefa de fechamento',
    ],
  },
  {
    id: 'funnel_lead_regressed',
    name: 'Lead Retrocedeu Etapa',
    description: 'Dispara quando um lead volta para uma etapa anterior (regressão).',
    category: 'funis',
    stability: 'stable',
    icon: 'TrendingDown',
    aliases: ['lead_retrocedeu', 'lead_voltou', 'stage_regressed'],
    availableFields: [
      { name: 'Lead ID', path: 'leadId', type: 'string', description: 'ID do lead', example: 'lead_abc123' },
      { name: 'Nome Lead', path: 'leadName', type: 'string', description: 'Nome do lead', example: 'João Silva' },
      { name: 'Etapa Anterior', path: 'previousStage', type: 'string', description: 'Etapa de origem', example: 'Negociação' },
      { name: 'Etapa Atual', path: 'currentStage', type: 'string', description: 'Nova etapa', example: 'Qualificação' },
      { name: 'Motivo', path: 'reason', type: 'string', description: 'Motivo da regressão', example: 'Cliente pediu mais tempo' },
    ],
    examples: [
      'Notificar gerente sobre regressão',
      'Registrar motivo no histórico',
      'Criar tarefa de reengajamento',
    ],
  },
  {
    id: 'funnel_lead_stalled',
    name: 'Lead Parado há X Dias',
    description: 'Dispara quando um lead está na mesma etapa por um número de dias definido.',
    category: 'funis',
    stability: 'stable',
    icon: 'Clock',
    aliases: ['lead_parado', 'lead_estagnado', 'stalled_lead'],
    availableFields: [
      { name: 'Lead ID', path: 'leadId', type: 'string', description: 'ID do lead', example: 'lead_abc123' },
      { name: 'Nome Lead', path: 'leadName', type: 'string', description: 'Nome do lead', example: 'João Silva' },
      { name: 'Etapa Atual', path: 'currentStage', type: 'string', description: 'Etapa onde está parado', example: 'Proposta Enviada' },
      { name: 'Dias Parado', path: 'daysSinceUpdate', type: 'number', description: 'Dias sem movimentação', example: '7' },
      { name: 'Última Interação', path: 'lastInteractionAt', type: 'date', description: 'Data da última ação', example: '2026-01-19T15:00:00Z' },
      { name: 'Responsável', path: 'assignedTo', type: 'string', description: 'Vendedor responsável', example: 'vendedor@empresa.com' },
      { name: 'Valor Negócio', path: 'dealValue', type: 'number', description: 'Valor do negócio', example: '20000' },
    ],
    examples: [
      'Enviar follow-up automático',
      'Alertar responsável',
      'Notificar gerente sobre lead frio',
    ],
  },
  {
    id: 'funnel_lead_won',
    name: 'Lead Ganho (Venda Fechada)',
    description: 'Dispara quando um lead é marcado como ganho/venda fechada.',
    category: 'funis',
    stability: 'stable',
    icon: 'Trophy',
    aliases: ['lead_ganho', 'venda_fechada', 'deal_won'],
    availableFields: [
      { name: 'Lead ID', path: 'leadId', type: 'string', description: 'ID do lead', example: 'lead_abc123' },
      { name: 'Nome Lead', path: 'leadName', type: 'string', description: 'Nome do cliente', example: 'João Silva' },
      { name: 'Valor Final', path: 'finalValue', type: 'number', description: 'Valor da venda', example: '25000' },
      { name: 'Vendedor', path: 'salesRep', type: 'string', description: 'Quem fechou', example: 'vendedor@empresa.com' },
      { name: 'Tempo no Funil', path: 'daysInFunnel', type: 'number', description: 'Dias desde entrada', example: '15' },
      { name: 'Produto/Serviço', path: 'product', type: 'string', description: 'O que foi vendido', example: 'Apartamento Centro' },
    ],
    examples: [
      'Criar cliente no sistema',
      'Gerar contrato automático',
      'Mover para funil de onboarding',
    ],
  },
  {
    id: 'funnel_lead_lost',
    name: 'Lead Perdido',
    description: 'Dispara quando um lead é marcado como perdido.',
    category: 'funis',
    stability: 'stable',
    icon: 'XCircle',
    aliases: ['lead_perdido', 'oportunidade_perdida', 'deal_lost'],
    availableFields: [
      { name: 'Lead ID', path: 'leadId', type: 'string', description: 'ID do lead', example: 'lead_abc123' },
      { name: 'Nome Lead', path: 'leadName', type: 'string', description: 'Nome do lead', example: 'João Silva' },
      { name: 'Motivo Perda', path: 'lossReason', type: 'string', description: 'Por que perdeu', example: 'Preço muito alto' },
      { name: 'Etapa Final', path: 'finalStage', type: 'string', description: 'Onde estava quando perdeu', example: 'Negociação' },
      { name: 'Valor Perdido', path: 'lostValue', type: 'number', description: 'Valor da oportunidade', example: '30000' },
      { name: 'Concorrente', path: 'competitor', type: 'string', description: 'Concorrente que ganhou', example: 'Empresa X' },
    ],
    examples: [
      'Registrar motivo para análise',
      'Agendar recontato futuro',
      'Mover para funil de reativação',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FUNIS DE VENDAS - Interações e Engajamento
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'funnel_lead_responded',
    name: 'Lead Respondeu Mensagem',
    description: 'Dispara quando um lead responde via qualquer canal (WhatsApp, Email, etc).',
    category: 'funis',
    stability: 'stable',
    icon: 'Reply',
    aliases: ['lead_respondeu', 'resposta_lead', 'lead_reply'],
    availableFields: [
      { name: 'Lead ID', path: 'leadId', type: 'string', description: 'ID do lead', example: 'lead_abc123' },
      { name: 'Nome Lead', path: 'leadName', type: 'string', description: 'Nome do lead', example: 'João Silva' },
      { name: 'Canal', path: 'channel', type: 'string', description: 'Por onde respondeu', example: 'whatsapp' },
      { name: 'Mensagem', path: 'message', type: 'string', description: 'Conteúdo da resposta', example: 'Sim, tenho interesse!' },
      { name: 'Tempo Resposta', path: 'responseTimeMinutes', type: 'number', description: 'Minutos para responder', example: '45' },
      { name: 'É Primeira Resposta', path: 'isFirstReply', type: 'boolean', description: 'Se é a primeira resposta do lead', example: 'true' },
    ],
    examples: [
      'Mover para etapa "Respondeu"',
      'Notificar vendedor imediatamente',
      'Atualizar score do lead',
    ],
  },
  {
    id: 'funnel_lead_task_completed',
    name: 'Tarefa do Lead Concluída',
    description: 'Dispara quando uma tarefa associada ao lead é finalizada.',
    category: 'funis',
    stability: 'stable',
    icon: 'CheckSquare',
    aliases: ['tarefa_lead_concluida', 'lead_task_done'],
    availableFields: [
      { name: 'Lead ID', path: 'leadId', type: 'string', description: 'ID do lead', example: 'lead_abc123' },
      { name: 'Tarefa ID', path: 'taskId', type: 'string', description: 'ID da tarefa', example: 'task_xyz' },
      { name: 'Tipo Tarefa', path: 'taskType', type: 'string', description: 'Tipo da tarefa', example: 'Ligação' },
      { name: 'Título Tarefa', path: 'taskTitle', type: 'string', description: 'Título da tarefa', example: 'Ligar para apresentar proposta' },
      { name: 'Resultado', path: 'outcome', type: 'string', description: 'Resultado da tarefa', example: 'Cliente interessado' },
      { name: 'Concluída Por', path: 'completedBy', type: 'string', description: 'Quem concluiu', example: 'vendedor@empresa.com' },
    ],
    examples: [
      'Criar próxima tarefa do fluxo',
      'Mover lead baseado no resultado',
      'Atualizar métricas do vendedor',
    ],
  },
  {
    id: 'funnel_lead_note_added',
    name: 'Nota Adicionada ao Lead',
    description: 'Dispara quando uma nota/comentário é registrado no lead.',
    category: 'funis',
    stability: 'stable',
    icon: 'StickyNote',
    aliases: ['nota_lead', 'comentario_lead', 'lead_note'],
    availableFields: [
      { name: 'Lead ID', path: 'leadId', type: 'string', description: 'ID do lead', example: 'lead_abc123' },
      { name: 'Nota', path: 'noteContent', type: 'string', description: 'Conteúdo da nota', example: 'Cliente pediu prazo maior' },
      { name: 'Autor', path: 'author', type: 'string', description: 'Quem escreveu', example: 'vendedor@empresa.com' },
      { name: 'É Privada', path: 'isPrivate', type: 'boolean', description: 'Se é nota privada', example: 'false' },
    ],
    examples: [
      'Notificar gerente sobre notas críticas',
      'Atualizar última interação',
      'Classificar lead por conteúdo',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FUNIS DE VENDAS - Valores e Propostas
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'funnel_lead_value_changed',
    name: 'Valor do Negócio Alterado',
    description: 'Dispara quando o valor estimado do negócio é modificado.',
    category: 'funis',
    stability: 'stable',
    icon: 'DollarSign',
    aliases: ['valor_alterado', 'deal_value_changed'],
    availableFields: [
      { name: 'Lead ID', path: 'leadId', type: 'string', description: 'ID do lead', example: 'lead_abc123' },
      { name: 'Nome Lead', path: 'leadName', type: 'string', description: 'Nome do lead', example: 'João Silva' },
      { name: 'Valor Anterior', path: 'previousValue', type: 'number', description: 'Valor antes', example: '15000' },
      { name: 'Valor Novo', path: 'newValue', type: 'number', description: 'Valor depois', example: '25000' },
      { name: 'Variação', path: 'valueChange', type: 'number', description: 'Diferença', example: '10000' },
      { name: 'Alterado Por', path: 'changedBy', type: 'string', description: 'Quem alterou', example: 'vendedor@empresa.com' },
    ],
    examples: [
      'Recalcular forecast de vendas',
      'Notificar sobre aumento significativo',
      'Atualizar prioridade do lead',
    ],
  },
  {
    id: 'funnel_proposal_sent',
    name: 'Proposta Enviada',
    description: 'Dispara quando uma proposta comercial é enviada ao lead.',
    category: 'funis',
    stability: 'stable',
    icon: 'FileText',
    aliases: ['proposta_enviada', 'quote_sent'],
    availableFields: [
      { name: 'Lead ID', path: 'leadId', type: 'string', description: 'ID do lead', example: 'lead_abc123' },
      { name: 'Proposta ID', path: 'proposalId', type: 'string', description: 'ID da proposta', example: 'prop_xyz' },
      { name: 'Valor Proposta', path: 'proposalValue', type: 'number', description: 'Valor da proposta', example: '25000' },
      { name: 'Válido Até', path: 'validUntil', type: 'date', description: 'Data de validade', example: '2026-02-10' },
      { name: 'Produtos', path: 'products', type: 'string', description: 'Itens da proposta', example: 'Apartamento 2 quartos' },
      { name: 'Enviada Por', path: 'sentBy', type: 'string', description: 'Quem enviou', example: 'vendedor@empresa.com' },
    ],
    examples: [
      'Mover para etapa "Proposta Enviada"',
      'Criar tarefa de follow-up',
      'Agendar lembrete de validade',
    ],
  },
  {
    id: 'funnel_proposal_accepted',
    name: 'Proposta Aceita',
    description: 'Dispara quando o cliente aceita uma proposta comercial.',
    category: 'funis',
    stability: 'stable',
    icon: 'CheckCircle',
    aliases: ['proposta_aceita', 'quote_accepted'],
    availableFields: [
      { name: 'Lead ID', path: 'leadId', type: 'string', description: 'ID do lead', example: 'lead_abc123' },
      { name: 'Proposta ID', path: 'proposalId', type: 'string', description: 'ID da proposta', example: 'prop_xyz' },
      { name: 'Valor Aceito', path: 'acceptedValue', type: 'number', description: 'Valor final', example: '24000' },
      { name: 'Desconto', path: 'discount', type: 'number', description: 'Desconto aplicado', example: '1000' },
      { name: 'Data Aceite', path: 'acceptedAt', type: 'date', description: 'Quando aceitou', example: '2026-01-26T16:00:00Z' },
    ],
    examples: [
      'Marcar como venda fechada',
      'Gerar contrato',
      'Notificar toda a equipe',
    ],
  },
  {
    id: 'funnel_proposal_rejected',
    name: 'Proposta Recusada',
    description: 'Dispara quando o cliente recusa uma proposta comercial.',
    category: 'funis',
    stability: 'stable',
    icon: 'XSquare',
    aliases: ['proposta_recusada', 'quote_rejected'],
    availableFields: [
      { name: 'Lead ID', path: 'leadId', type: 'string', description: 'ID do lead', example: 'lead_abc123' },
      { name: 'Proposta ID', path: 'proposalId', type: 'string', description: 'ID da proposta', example: 'prop_xyz' },
      { name: 'Motivo', path: 'rejectionReason', type: 'string', description: 'Por que recusou', example: 'Preço acima do orçamento' },
      { name: 'Valor Recusado', path: 'rejectedValue', type: 'number', description: 'Valor que foi recusado', example: '25000' },
      { name: 'Aceita Contraproposta', path: 'openToCounter', type: 'boolean', description: 'Se aceita negociar', example: 'true' },
    ],
    examples: [
      'Criar tarefa de negociação',
      'Gerar contraproposta automática',
      'Registrar feedback para análise',
    ],
  },
];

// ============================================================================
// CATÁLOGO DE AÇÕES
// ============================================================================

export const ACTIONS_CATALOG: ActionDefinition[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // NOTIFICAÇÕES
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'send_notification',
    name: 'Enviar Notificação',
    description: 'Envia uma notificação para o dashboard/app do usuário.',
    category: 'notificacoes',
    stability: 'stable',
    icon: 'Bell',
    requiredFields: [
      { name: 'title', type: 'string', description: 'Título da notificação', required: true },
      { name: 'message', type: 'template', description: 'Mensagem (suporta {{variáveis}})', required: true },
    ],
    optionalFields: [
      { name: 'priority', type: 'select', description: 'Prioridade', required: false, defaultValue: 'normal', options: [
        { value: 'low', label: 'Baixa' },
        { value: 'normal', label: 'Normal' },
        { value: 'high', label: 'Alta' },
        { value: 'urgent', label: 'Urgente' },
      ]},
      { name: 'targetUser', type: 'string', description: 'Usuário específico (deixe vazio para todos)', required: false },
    ],
    examples: [
      'Notificar sobre nova reserva',
      'Alertar pagamento atrasado',
    ],
  },
  {
    id: 'send_email',
    name: 'Enviar Email',
    description: 'Envia um email para destinatário especificado.',
    category: 'notificacoes',
    stability: 'stable',
    icon: 'Mail',
    requiredFields: [
      { name: 'to', type: 'template', description: 'Email do destinatário (ex: {{guestEmail}})', required: true },
      { name: 'subject', type: 'template', description: 'Assunto do email', required: true },
      { name: 'body', type: 'template', description: 'Corpo do email (HTML ou texto)', required: true },
    ],
    optionalFields: [
      { name: 'templateId', type: 'string', description: 'ID de template pré-definido', required: false },
      { name: 'cc', type: 'string', description: 'Cópia para', required: false },
    ],
    examples: [
      'Enviar confirmação de reserva',
      'Lembrete de check-in',
    ],
  },
  {
    id: 'send_whatsapp',
    name: 'Enviar WhatsApp',
    description: 'Envia mensagem via WhatsApp (requer integração Evolution API).',
    category: 'notificacoes',
    stability: 'stable',
    icon: 'MessageCircle',
    requiredFields: [
      { name: 'to', type: 'template', description: 'Número do destinatário (ex: {{guestPhone}})', required: true },
      { name: 'message', type: 'template', description: 'Mensagem a enviar', required: true },
    ],
    optionalFields: [
      { name: 'templateName', type: 'string', description: 'Template aprovado do WhatsApp Business', required: false },
      { name: 'mediaUrl', type: 'string', description: 'URL de mídia a anexar', required: false },
    ],
    examples: [
      'Enviar código de acesso',
      'Lembrete de check-out',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TAREFAS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'create_task',
    name: 'Criar Tarefa',
    description: 'Cria uma nova tarefa no sistema de gestão.',
    category: 'tarefas',
    stability: 'stable',
    icon: 'Plus',
    requiredFields: [
      { name: 'title', type: 'template', description: 'Título da tarefa', required: true },
    ],
    optionalFields: [
      { name: 'description', type: 'template', description: 'Descrição detalhada', required: false },
      { name: 'assignee', type: 'string', description: 'Responsável (email ou ID)', required: false },
      { name: 'dueDate', type: 'template', description: 'Data limite (ex: {{checkin}})', required: false },
      { name: 'priority', type: 'select', description: 'Prioridade', required: false, defaultValue: 'media', options: [
        { value: 'baixa', label: 'Baixa' },
        { value: 'media', label: 'Média' },
        { value: 'alta', label: 'Alta' },
        { value: 'urgente', label: 'Urgente' },
      ]},
      { name: 'tags', type: 'string', description: 'Tags separadas por vírgula', required: false },
    ],
    examples: [
      'Criar tarefa de limpeza',
      'Agendar vistoria',
    ],
  },
  {
    id: 'update_task',
    name: 'Atualizar Tarefa',
    description: 'Atualiza uma tarefa existente.',
    category: 'tarefas',
    stability: 'beta',
    icon: 'Edit',
    requiredFields: [
      { name: 'taskId', type: 'template', description: 'ID da tarefa a atualizar', required: true },
    ],
    optionalFields: [
      { name: 'status', type: 'select', description: 'Novo status', required: false, options: [
        { value: 'pending', label: 'Pendente' },
        { value: 'in_progress', label: 'Em Andamento' },
        { value: 'completed', label: 'Concluída' },
        { value: 'cancelled', label: 'Cancelada' },
      ]},
      { name: 'assignee', type: 'string', description: 'Novo responsável', required: false },
    ],
    examples: [
      'Marcar tarefa como concluída',
      'Reatribuir tarefa',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DADOS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'update_record',
    name: 'Atualizar Registro',
    description: 'Atualiza campos de um registro no banco de dados.',
    category: 'dados',
    stability: 'beta',
    icon: 'Database',
    requiredFields: [
      { name: 'table', type: 'select', description: 'Tabela a atualizar', required: true, options: [
        { value: 'reservations', label: 'Reservas' },
        { value: 'contacts', label: 'Contatos' },
        { value: 'deals', label: 'Deals' },
        { value: 'tasks', label: 'Tarefas' },
      ]},
      { name: 'recordId', type: 'template', description: 'ID do registro', required: true },
      { name: 'updates', type: 'string', description: 'JSON com campos a atualizar', required: true },
    ],
    optionalFields: [],
    examples: [
      'Atualizar status de reserva',
      'Adicionar tag ao contato',
    ],
  },
  {
    id: 'log',
    name: 'Registrar Log',
    description: 'Registra uma entrada no log de automações para auditoria.',
    category: 'dados',
    stability: 'stable',
    icon: 'FileText',
    requiredFields: [
      { name: 'message', type: 'template', description: 'Mensagem do log', required: true },
    ],
    optionalFields: [
      { name: 'level', type: 'select', description: 'Nível do log', required: false, defaultValue: 'info', options: [
        { value: 'debug', label: 'Debug' },
        { value: 'info', label: 'Info' },
        { value: 'warn', label: 'Warning' },
        { value: 'error', label: 'Error' },
      ]},
      { name: 'data', type: 'string', description: 'Dados adicionais (JSON)', required: false },
    ],
    examples: [
      'Registrar execução de automação',
      'Log de erro para debug',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // INTEGRAÇÃO
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'webhook',
    name: 'Chamar Webhook',
    description: 'Faz uma requisição HTTP para um endpoint externo.',
    category: 'integracao',
    stability: 'stable',
    icon: 'Globe',
    requiredFields: [
      { name: 'url', type: 'string', description: 'URL do webhook', required: true },
      { name: 'method', type: 'select', description: 'Método HTTP', required: true, options: [
        { value: 'POST', label: 'POST' },
        { value: 'GET', label: 'GET' },
        { value: 'PUT', label: 'PUT' },
        { value: 'PATCH', label: 'PATCH' },
      ]},
    ],
    optionalFields: [
      { name: 'headers', type: 'string', description: 'Headers (JSON)', required: false },
      { name: 'body', type: 'template', description: 'Body da requisição', required: false },
    ],
    examples: [
      'Notificar sistema externo',
      'Integrar com Zapier/Make',
    ],
  },
  {
    id: 'delay',
    name: 'Aguardar',
    description: 'Pausa a execução por um período antes de continuar.',
    category: 'integracao',
    stability: 'beta',
    icon: 'Hourglass',
    requiredFields: [
      { name: 'duration', type: 'number', description: 'Duração em minutos', required: true },
    ],
    optionalFields: [],
    examples: [
      'Esperar 30min antes de enviar follow-up',
      'Delay entre ações',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FUNIS DE VENDAS - Movimentação
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'funnel_move_to_stage',
    name: 'Mover Lead para Etapa',
    description: 'Move o lead para uma etapa específica do funil atual.',
    category: 'funis',
    stability: 'stable',
    icon: 'ArrowRight',
    requiredFields: [
      { name: 'targetStageId', type: 'select', description: 'Etapa de destino', required: true, options: [] },
    ],
    optionalFields: [
      { name: 'reason', type: 'template', description: 'Motivo da movimentação', required: false },
      { name: 'notifyOwner', type: 'boolean', description: 'Notificar responsável', required: false, defaultValue: true },
    ],
    examples: [
      'Mover para "Qualificados" após resposta',
      'Avançar para "Negociação" após proposta aceita',
    ],
  },
  {
    id: 'funnel_move_to_funnel',
    name: 'Mover Lead para Outro Funil',
    description: 'Transfere o lead para um funil diferente.',
    category: 'funis',
    stability: 'stable',
    icon: 'ArrowRightLeft',
    requiredFields: [
      { name: 'targetFunnelId', type: 'select', description: 'Funil de destino', required: true, options: [] },
      { name: 'targetStageId', type: 'select', description: 'Etapa inicial no novo funil', required: true, options: [] },
    ],
    optionalFields: [
      { name: 'keepHistory', type: 'boolean', description: 'Manter histórico do funil anterior', required: false, defaultValue: true },
      { name: 'reason', type: 'template', description: 'Motivo da transferência', required: false },
    ],
    examples: [
      'Mover para funil de onboarding após venda',
      'Transferir para funil de reativação',
    ],
  },
  {
    id: 'funnel_mark_won',
    name: 'Marcar Lead como Ganho',
    description: 'Marca o lead como convertido/venda fechada.',
    category: 'funis',
    stability: 'stable',
    icon: 'Trophy',
    requiredFields: [],
    optionalFields: [
      { name: 'finalValue', type: 'template', description: 'Valor final da venda (usar {{dealValue}} se já definido)', required: false },
      { name: 'product', type: 'template', description: 'Produto/serviço vendido', required: false },
      { name: 'notes', type: 'template', description: 'Observações do fechamento', required: false },
    ],
    examples: [
      'Fechar venda com valor do deal',
      'Marcar como ganho e registrar produto',
    ],
  },
  {
    id: 'funnel_mark_lost',
    name: 'Marcar Lead como Perdido',
    description: 'Marca o lead como perdido/oportunidade encerrada.',
    category: 'funis',
    stability: 'stable',
    icon: 'XCircle',
    requiredFields: [
      { name: 'lossReason', type: 'template', description: 'Motivo da perda', required: true },
    ],
    optionalFields: [
      { name: 'competitor', type: 'string', description: 'Concorrente que ganhou', required: false },
      { name: 'scheduleReactivation', type: 'boolean', description: 'Agendar reativação futura', required: false, defaultValue: false },
      { name: 'reactivationDays', type: 'number', description: 'Dias para tentar reativar', required: false, defaultValue: 90 },
    ],
    examples: [
      'Perda por preço - reativar em 60 dias',
      'Perda para concorrente específico',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FUNIS DE VENDAS - Atribuição
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'funnel_assign_owner',
    name: 'Atribuir Responsável ao Lead',
    description: 'Define ou altera o vendedor responsável pelo lead.',
    category: 'funis',
    stability: 'stable',
    icon: 'UserCheck',
    requiredFields: [
      { name: 'assignmentType', type: 'select', description: 'Tipo de atribuição', required: true, options: [
        { value: 'specific', label: 'Usuário específico' },
        { value: 'round_robin', label: 'Rodízio automático' },
        { value: 'least_busy', label: 'Menos ocupado' },
        { value: 'by_region', label: 'Por região' },
        { value: 'by_product', label: 'Por produto/expertise' },
      ]},
    ],
    optionalFields: [
      { name: 'specificUserId', type: 'select', description: 'Usuário (se específico)', required: false, options: [] },
      { name: 'teamId', type: 'select', description: 'Equipe para rodízio', required: false, options: [] },
      { name: 'notifyAssignee', type: 'boolean', description: 'Notificar novo responsável', required: false, defaultValue: true },
      { name: 'notifyMessage', type: 'template', description: 'Mensagem de notificação', required: false },
    ],
    examples: [
      'Distribuir leads por rodízio',
      'Atribuir ao vendedor menos ocupado',
    ],
  },
  {
    id: 'funnel_add_collaborator',
    name: 'Adicionar Colaborador ao Lead',
    description: 'Adiciona um usuário como colaborador (não proprietário) do lead.',
    category: 'funis',
    stability: 'stable',
    icon: 'UserPlus',
    requiredFields: [
      { name: 'userId', type: 'select', description: 'Usuário a adicionar', required: true, options: [] },
    ],
    optionalFields: [
      { name: 'role', type: 'select', description: 'Papel do colaborador', required: false, defaultValue: 'viewer', options: [
        { value: 'viewer', label: 'Visualizador' },
        { value: 'contributor', label: 'Contribuidor' },
        { value: 'manager', label: 'Gerente' },
      ]},
      { name: 'notify', type: 'boolean', description: 'Notificar sobre adição', required: false, defaultValue: true },
    ],
    examples: [
      'Adicionar gerente para acompanhar deal grande',
      'Incluir especialista técnico',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FUNIS DE VENDAS - Tarefas e Follow-up
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'funnel_create_followup',
    name: 'Criar Tarefa de Follow-up',
    description: 'Cria uma tarefa de acompanhamento associada ao lead.',
    category: 'funis',
    stability: 'stable',
    icon: 'CalendarPlus',
    requiredFields: [
      { name: 'taskType', type: 'select', description: 'Tipo da tarefa', required: true, options: [
        { value: 'call', label: 'Ligação' },
        { value: 'email', label: 'Email' },
        { value: 'whatsapp', label: 'WhatsApp' },
        { value: 'meeting', label: 'Reunião' },
        { value: 'visit', label: 'Visita' },
        { value: 'proposal', label: 'Enviar Proposta' },
        { value: 'other', label: 'Outro' },
      ]},
      { name: 'title', type: 'template', description: 'Título da tarefa', required: true },
    ],
    optionalFields: [
      { name: 'description', type: 'template', description: 'Descrição/roteiro', required: false },
      { name: 'dueInHours', type: 'number', description: 'Prazo em horas a partir de agora', required: false, defaultValue: 24 },
      { name: 'dueDate', type: 'template', description: 'Data específica (alternativo a horas)', required: false },
      { name: 'priority', type: 'select', description: 'Prioridade', required: false, defaultValue: 'normal', options: [
        { value: 'low', label: 'Baixa' },
        { value: 'normal', label: 'Normal' },
        { value: 'high', label: 'Alta' },
        { value: 'urgent', label: 'Urgente' },
      ]},
      { name: 'assignToOwner', type: 'boolean', description: 'Atribuir ao responsável do lead', required: false, defaultValue: true },
    ],
    examples: [
      'Criar tarefa de ligação em 2 horas',
      'Agendar reunião de apresentação',
    ],
  },
  {
    id: 'funnel_schedule_sequence',
    name: 'Iniciar Sequência de Follow-up',
    description: 'Inicia uma sequência automática de contatos programados.',
    category: 'funis',
    stability: 'beta',
    icon: 'ListOrdered',
    requiredFields: [
      { name: 'sequenceId', type: 'select', description: 'Sequência a iniciar', required: true, options: [] },
    ],
    optionalFields: [
      { name: 'startDelay', type: 'number', description: 'Delay inicial em horas', required: false, defaultValue: 0 },
      { name: 'skipWeekends', type: 'boolean', description: 'Pular fins de semana', required: false, defaultValue: true },
      { name: 'stopOnReply', type: 'boolean', description: 'Parar se lead responder', required: false, defaultValue: true },
    ],
    examples: [
      'Iniciar cadência de 7 dias',
      'Sequência de reengajamento',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FUNIS DE VENDAS - Comunicação
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'funnel_send_whatsapp',
    name: 'Enviar WhatsApp ao Lead',
    description: 'Envia mensagem WhatsApp usando o telefone do lead.',
    category: 'funis',
    stability: 'stable',
    icon: 'MessageCircle',
    requiredFields: [
      { name: 'message', type: 'template', description: 'Mensagem (suporta {{variáveis}} do lead)', required: true },
    ],
    optionalFields: [
      { name: 'instanceId', type: 'select', description: 'Instância WhatsApp a usar', required: false, options: [] },
      { name: 'templateId', type: 'select', description: 'Template aprovado', required: false, options: [] },
      { name: 'mediaUrl', type: 'string', description: 'URL de imagem/documento', required: false },
      { name: 'registerActivity', type: 'boolean', description: 'Registrar como atividade', required: false, defaultValue: true },
    ],
    examples: [
      'Mensagem de boas-vindas personalizada',
      'Enviar proposta por WhatsApp',
    ],
  },
  {
    id: 'funnel_send_email',
    name: 'Enviar Email ao Lead',
    description: 'Envia email usando o endereço do lead.',
    category: 'funis',
    stability: 'stable',
    icon: 'Mail',
    requiredFields: [
      { name: 'subject', type: 'template', description: 'Assunto do email', required: true },
      { name: 'body', type: 'template', description: 'Corpo do email (HTML suportado)', required: true },
    ],
    optionalFields: [
      { name: 'templateId', type: 'select', description: 'Template de email', required: false, options: [] },
      { name: 'fromName', type: 'string', description: 'Nome do remetente', required: false },
      { name: 'replyTo', type: 'string', description: 'Email para resposta', required: false },
      { name: 'attachments', type: 'string', description: 'URLs de anexos (JSON array)', required: false },
      { name: 'registerActivity', type: 'boolean', description: 'Registrar como atividade', required: false, defaultValue: true },
    ],
    examples: [
      'Email de apresentação comercial',
      'Proposta formal por email',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FUNIS DE VENDAS - Dados do Lead
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'funnel_update_lead_data',
    name: 'Atualizar Dados do Lead',
    description: 'Modifica campos do lead (valor, tags, campos personalizados, etc).',
    category: 'funis',
    stability: 'stable',
    icon: 'Edit',
    requiredFields: [],
    optionalFields: [
      { name: 'dealValue', type: 'template', description: 'Novo valor do negócio', required: false },
      { name: 'expectedCloseDate', type: 'template', description: 'Previsão de fechamento', required: false },
      { name: 'temperature', type: 'select', description: 'Temperatura do lead', required: false, options: [
        { value: 'cold', label: 'Frio' },
        { value: 'warm', label: 'Morno' },
        { value: 'hot', label: 'Quente' },
      ]},
      { name: 'priority', type: 'select', description: 'Prioridade', required: false, options: [
        { value: 'low', label: 'Baixa' },
        { value: 'normal', label: 'Normal' },
        { value: 'high', label: 'Alta' },
      ]},
      { name: 'customFields', type: 'string', description: 'Campos personalizados (JSON)', required: false },
    ],
    examples: [
      'Aumentar temperatura após resposta',
      'Definir valor baseado em interesse',
    ],
  },
  {
    id: 'funnel_add_tag',
    name: 'Adicionar Tag ao Lead',
    description: 'Adiciona uma ou mais tags ao lead.',
    category: 'funis',
    stability: 'stable',
    icon: 'Tag',
    requiredFields: [
      { name: 'tags', type: 'template', description: 'Tags a adicionar (separadas por vírgula)', required: true },
    ],
    optionalFields: [
      { name: 'replaceExisting', type: 'boolean', description: 'Substituir tags existentes', required: false, defaultValue: false },
    ],
    examples: [
      'Adicionar "Respondeu" quando responder',
      'Marcar origem da campanha',
    ],
  },
  {
    id: 'funnel_remove_tag',
    name: 'Remover Tag do Lead',
    description: 'Remove uma ou mais tags do lead.',
    category: 'funis',
    stability: 'stable',
    icon: 'TagOff',
    requiredFields: [
      { name: 'tags', type: 'template', description: 'Tags a remover (separadas por vírgula)', required: true },
    ],
    optionalFields: [],
    examples: [
      'Remover "Novo" após primeira interação',
      'Limpar tag de campanha expirada',
    ],
  },
  {
    id: 'funnel_add_note',
    name: 'Adicionar Nota ao Lead',
    description: 'Registra uma nota/comentário no histórico do lead.',
    category: 'funis',
    stability: 'stable',
    icon: 'StickyNote',
    requiredFields: [
      { name: 'content', type: 'template', description: 'Conteúdo da nota', required: true },
    ],
    optionalFields: [
      { name: 'isPrivate', type: 'boolean', description: 'Nota privada (não visível ao lead)', required: false, defaultValue: true },
      { name: 'pinned', type: 'boolean', description: 'Fixar no topo', required: false, defaultValue: false },
    ],
    examples: [
      'Registrar origem automática',
      'Nota sobre interação via automação',
    ],
  },
  {
    id: 'funnel_update_score',
    name: 'Atualizar Score do Lead',
    description: 'Modifica a pontuação/score do lead.',
    category: 'funis',
    stability: 'stable',
    icon: 'TrendingUp',
    requiredFields: [
      { name: 'scoreAction', type: 'select', description: 'Ação no score', required: true, options: [
        { value: 'set', label: 'Definir valor' },
        { value: 'add', label: 'Adicionar pontos' },
        { value: 'subtract', label: 'Subtrair pontos' },
        { value: 'multiply', label: 'Multiplicar' },
      ]},
      { name: 'value', type: 'number', description: 'Valor para a operação', required: true },
    ],
    optionalFields: [
      { name: 'maxScore', type: 'number', description: 'Limite máximo do score', required: false, defaultValue: 100 },
      { name: 'minScore', type: 'number', description: 'Limite mínimo do score', required: false, defaultValue: 0 },
    ],
    examples: [
      '+10 pontos quando responde',
      '-5 pontos por dia sem interação',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FUNIS DE VENDAS - Notificações Internas
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'funnel_notify_team',
    name: 'Notificar Equipe sobre Lead',
    description: 'Envia notificação interna sobre o lead para usuários específicos.',
    category: 'funis',
    stability: 'stable',
    icon: 'Bell',
    requiredFields: [
      { name: 'title', type: 'template', description: 'Título da notificação', required: true },
      { name: 'message', type: 'template', description: 'Mensagem (suporta {{variáveis}})', required: true },
    ],
    optionalFields: [
      { name: 'notifyType', type: 'select', description: 'Quem notificar', required: false, defaultValue: 'owner', options: [
        { value: 'owner', label: 'Responsável do lead' },
        { value: 'team', label: 'Toda a equipe' },
        { value: 'managers', label: 'Apenas gerentes' },
        { value: 'specific', label: 'Usuários específicos' },
      ]},
      { name: 'specificUsers', type: 'string', description: 'IDs de usuários (se específico)', required: false },
      { name: 'priority', type: 'select', description: 'Prioridade', required: false, defaultValue: 'normal', options: [
        { value: 'low', label: 'Baixa' },
        { value: 'normal', label: 'Normal' },
        { value: 'high', label: 'Alta' },
        { value: 'urgent', label: 'Urgente' },
      ]},
      { name: 'channels', type: 'string', description: 'Canais de notificação (app, email, whatsapp)', required: false, defaultValue: 'app' },
    ],
    examples: [
      'Alertar gerente sobre lead quente',
      'Notificar equipe sobre venda fechada',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FUNIS DE VENDAS - Integração CRM
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'funnel_create_contact',
    name: 'Criar/Atualizar Contato no CRM',
    description: 'Cria ou atualiza o contato no módulo de CRM principal.',
    category: 'funis',
    stability: 'stable',
    icon: 'UserPlus',
    requiredFields: [],
    optionalFields: [
      { name: 'updateIfExists', type: 'boolean', description: 'Atualizar se já existir', required: false, defaultValue: true },
      { name: 'contactType', type: 'select', description: 'Tipo de contato', required: false, defaultValue: 'lead', options: [
        { value: 'lead', label: 'Lead' },
        { value: 'prospect', label: 'Prospect' },
        { value: 'customer', label: 'Cliente' },
      ]},
      { name: 'additionalData', type: 'string', description: 'Dados extras para o contato (JSON)', required: false },
    ],
    examples: [
      'Converter lead em cliente após venda',
      'Sincronizar dados com CRM',
    ],
  },
  {
    id: 'funnel_duplicate_check',
    name: 'Verificar e Mesclar Duplicados',
    description: 'Verifica se existe lead duplicado e mescla se encontrar.',
    category: 'funis',
    stability: 'beta',
    icon: 'Copy',
    requiredFields: [
      { name: 'matchFields', type: 'string', description: 'Campos para verificar duplicação (email, phone)', required: true },
    ],
    optionalFields: [
      { name: 'autoMerge', type: 'boolean', description: 'Mesclar automaticamente', required: false, defaultValue: false },
      { name: 'preferNewest', type: 'boolean', description: 'Preferir dados mais recentes', required: false, defaultValue: true },
      { name: 'notifyOnDuplicate', type: 'boolean', description: 'Notificar se encontrar duplicado', required: false, defaultValue: true },
    ],
    examples: [
      'Verificar duplicado por email e telefone',
      'Mesclar leads automaticamente',
    ],
  },
];

// ============================================================================
// CATÁLOGO DE CONDIÇÕES
// ============================================================================

export const CONDITIONS_CATALOG: ConditionDefinition[] = [
  { id: 'equals', name: 'É igual a', operator: 'equals', description: 'O valor do campo é exatamente igual ao valor especificado', applicableTo: ['string', 'number', 'boolean'] },
  { id: 'not_equals', name: 'É diferente de', operator: 'not_equals', description: 'O valor do campo é diferente do valor especificado', applicableTo: ['string', 'number', 'boolean'] },
  { id: 'contains', name: 'Contém', operator: 'contains', description: 'O texto do campo contém o valor especificado', applicableTo: ['string', 'array'] },
  { id: 'not_contains', name: 'Não contém', operator: 'not_contains', description: 'O texto do campo não contém o valor especificado', applicableTo: ['string', 'array'] },
  { id: 'gt', name: 'Maior que', operator: 'gt', description: 'O valor numérico é maior que o especificado', applicableTo: ['number', 'date'] },
  { id: 'lt', name: 'Menor que', operator: 'lt', description: 'O valor numérico é menor que o especificado', applicableTo: ['number', 'date'] },
  { id: 'gte', name: 'Maior ou igual a', operator: 'gte', description: 'O valor numérico é maior ou igual ao especificado', applicableTo: ['number', 'date'] },
  { id: 'lte', name: 'Menor ou igual a', operator: 'lte', description: 'O valor numérico é menor ou igual ao especificado', applicableTo: ['number', 'date'] },
  { id: 'exists', name: 'Existe', operator: 'exists', description: 'O campo existe e não é nulo', applicableTo: ['string', 'number', 'boolean', 'date', 'array'] },
  { id: 'not_exists', name: 'Não existe', operator: 'not_exists', description: 'O campo não existe ou é nulo', applicableTo: ['string', 'number', 'boolean', 'date', 'array'] },
  { id: 'is_empty', name: 'Está vazio', operator: 'is_empty', description: 'O campo está vazio (string vazia ou array vazio)', applicableTo: ['string', 'array'] },
  { id: 'is_not_empty', name: 'Não está vazio', operator: 'is_not_empty', description: 'O campo tem algum valor', applicableTo: ['string', 'array'] },
];

// ============================================================================
// HELPERS
// ============================================================================

export const CATEGORY_LABELS: Record<TriggerCategory | ActionCategory, string> = {
  reservas: 'Reservas',
  financeiro: 'Financeiro',
  comunicacao: 'Comunicação',
  crm: 'CRM & Tarefas',
  operacional: 'Operacional',
  sistema: 'Sistema',
  funis: 'Funis de Vendas',
  notificacoes: 'Notificações',
  tarefas: 'Tarefas',
  dados: 'Dados',
  integracao: 'Integração',
};

export const CATEGORY_ICONS: Record<TriggerCategory | ActionCategory, string> = {
  reservas: 'Calendar',
  financeiro: 'DollarSign',
  comunicacao: 'MessageSquare',
  crm: 'Users',
  operacional: 'Settings',
  sistema: 'Server',
  funis: 'Target',
  notificacoes: 'Bell',
  tarefas: 'CheckSquare',
  dados: 'Database',
  integracao: 'Link',
};

export function getTriggersByCategory(category: TriggerCategory): TriggerDefinition[] {
  return TRIGGERS_CATALOG.filter(t => t.category === category);
}

export function getActionsByCategory(category: ActionCategory): ActionDefinition[] {
  return ACTIONS_CATALOG.filter(a => a.category === category);
}

export function getStableTriggers(): TriggerDefinition[] {
  return TRIGGERS_CATALOG.filter(t => t.stability === 'stable');
}

export function getStableActions(): ActionDefinition[] {
  return ACTIONS_CATALOG.filter(a => a.stability === 'stable');
}
