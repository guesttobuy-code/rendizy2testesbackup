/**
 * 🔔 RENDIZY - Notification Types
 * v1.0.0 - 2026-01-25
 * 
 * Tipos e interfaces para o módulo de notificações
 */

export type NotificationType = 
  | 'reservation_new'
  | 'reservation_update'
  | 'reservation_cancel'
  | 'checkin_today'
  | 'checkout_today'
  | 'payment_received'
  | 'payment_pending'
  | 'message_received'
  | 'review_received'
  | 'maintenance_alert'
  | 'system_update'
  | 'automation_triggered'
  | 'sync_complete'
  | 'sync_error'
  | 'general';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export type NotificationChannel = 'email' | 'push' | 'sms' | 'whatsapp' | 'in_app';

export interface Notification {
  id: string;
  organization_id: string;
  user_id?: string;
  
  // Conteúdo
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  
  // Status
  read: boolean;
  archived: boolean;
  
  // Referências
  reference_type?: 'reservation' | 'property' | 'guest' | 'payment' | 'message';
  reference_id?: string;
  
  // Metadados
  metadata?: {
    property_name?: string;
    guest_name?: string;
    amount?: number;
    check_in?: string;
    check_out?: string;
    [key: string]: any;
  };
  
  // Links
  action_url?: string;
  action_label?: string;
  
  // Timestamps
  created_at: string;
  read_at?: string;
  expires_at?: string;
}

export interface NotificationFilters {
  types: NotificationType[];
  priorities: NotificationPriority[];
  readStatus: 'all' | 'read' | 'unread';
  dateRange?: {
    from: Date;
    to: Date;
  };
  searchQuery: string;
}

export interface NotificationPreferences {
  email_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  
  // Por tipo de notificação
  preferences_by_type: {
    [key in NotificationType]?: {
      enabled: boolean;
      channels: NotificationChannel[];
    };
  };
  
  // Horários de silêncio
  quiet_hours?: {
    enabled: boolean;
    start_time: string; // HH:mm
    end_time: string;   // HH:mm
  };
}

// Helpers para ícones e cores
export const notificationTypeConfig: Record<NotificationType, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}> = {
  reservation_new: {
    label: 'Nova Reserva',
    icon: 'CalendarPlus',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30'
  },
  reservation_update: {
    label: 'Atualização de Reserva',
    icon: 'CalendarClock',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30'
  },
  reservation_cancel: {
    label: 'Cancelamento',
    icon: 'CalendarX',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30'
  },
  checkin_today: {
    label: 'Check-in Hoje',
    icon: 'LogIn',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30'
  },
  checkout_today: {
    label: 'Check-out Hoje',
    icon: 'LogOut',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30'
  },
  payment_received: {
    label: 'Pagamento Recebido',
    icon: 'CircleDollarSign',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30'
  },
  payment_pending: {
    label: 'Pagamento Pendente',
    icon: 'Clock',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30'
  },
  message_received: {
    label: 'Nova Mensagem',
    icon: 'MessageSquare',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30'
  },
  review_received: {
    label: 'Nova Avaliação',
    icon: 'Star',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30'
  },
  maintenance_alert: {
    label: 'Alerta de Manutenção',
    icon: 'Wrench',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30'
  },
  system_update: {
    label: 'Atualização do Sistema',
    icon: 'Settings',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-700/30'
  },
  automation_triggered: {
    label: 'Automação Executada',
    icon: 'Zap',
    color: 'text-violet-600',
    bgColor: 'bg-violet-100 dark:bg-violet-900/30'
  },
  sync_complete: {
    label: 'Sincronização Concluída',
    icon: 'RefreshCw',
    color: 'text-teal-600',
    bgColor: 'bg-teal-100 dark:bg-teal-900/30'
  },
  sync_error: {
    label: 'Erro de Sincronização',
    icon: 'AlertTriangle',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30'
  },
  general: {
    label: 'Geral',
    icon: 'Bell',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-700/30'
  }
};

export const priorityConfig: Record<NotificationPriority, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  low: {
    label: 'Baixa',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-700'
  },
  medium: {
    label: 'Média',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30'
  },
  high: {
    label: 'Alta',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30'
  },
  critical: {
    label: 'Crítica',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30'
  }
};
