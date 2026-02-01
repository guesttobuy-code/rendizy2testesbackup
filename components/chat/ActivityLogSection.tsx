/**
 * ACTIVITY LOG SECTION
 * 
 * Seção colapsável de histórico de atividades para o sidebar do chat
 * Mostra cards diferentes por tipo de ação: cotação, check-in, observação, etc.
 * 
 * @version 1.0.0
 * @date 2026-01-30
 * 
 * CARACTERÍSTICAS:
 * - Colapsável por padrão (lazy load)
 * - Cards específicos por tipo de ação
 * - Paginação com "Ver mais"
 * - Formatação de data relativa
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  History,
  ChevronDown,
  ChevronUp,
  Calculator,
  CheckCircle2,
  StickyNote,
  Calendar,
  Building2,
  Briefcase,
  Lock,
  MessageSquare,
  Loader2,
  Clock,
  User,
  DollarSign,
  Moon,
  Users,
  ArrowRight
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  useActivityLogs, 
  ActivityLog, 
  ActivityActionType,
  QuotationData,
  CheckinStatusData,
  ObservationData,
  ReservationData,
  DealData,
  BlockData,
  MessageData
} from '../../src/hooks/useActivityLogs';
import { formatDistanceToNow, format, parseISO, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============================================
// TYPES
// ============================================

interface ActivityLogSectionProps {
  /** Telefone do contato para carregar logs */
  contactPhone: string;
  /** Classe CSS adicional */
  className?: string;
}

// ============================================
// HELPERS
// ============================================

/**
 * Formata data de forma relativa (hoje, ontem, há X horas)
 */
function formatRelativeDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    
    if (isToday(date)) {
      return `Hoje às ${format(date, 'HH:mm')}`;
    }
    
    if (isYesterday(date)) {
      return `Ontem às ${format(date, 'HH:mm')}`;
    }
    
    // Se foi nos últimos 7 dias, usar "há X dias"
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    }
    
    // Senão, mostrar data completa
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

/**
 * Formata valor em reais
 */
function formatCurrency(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Configuração visual por tipo de ação
 */
const ACTION_CONFIG: Record<ActivityActionType, {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}> = {
  quotation: {
    label: 'Cotação',
    icon: Calculator,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
  },
  checkin_status: {
    label: 'Check-in',
    icon: CheckCircle2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
  },
  observation: {
    label: 'Observação',
    icon: StickyNote,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
  },
  reservation: {
    label: 'Reserva',
    icon: Calendar,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
  },
  deal_created: {
    label: 'Negociação',
    icon: Briefcase,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
  },
  block_created: {
    label: 'Bloqueio',
    icon: Lock,
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
  },
  message_sent: {
    label: 'Mensagem',
    icon: MessageSquare,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-800',
  },
};

// ============================================
// CARD COMPONENTS
// ============================================

/**
 * Card de Cotação
 */
function QuotationCard({ data }: { data: QuotationData }) {
  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
        <Building2 className="h-3 w-3" />
        <span className="font-medium truncate">{data.property_name}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-gray-500">
          <Calendar className="h-3 w-3" />
          <span>{format(parseISO(data.check_in), 'dd/MM')}</span>
        </div>
        <ArrowRight className="h-3 w-3 text-gray-400" />
        <div className="flex items-center gap-1 text-gray-500">
          <span>{format(parseISO(data.check_out), 'dd/MM')}</span>
        </div>
        <Badge variant="secondary" className="text-[10px] h-4 px-1">
          <Moon className="h-2.5 w-2.5 mr-0.5" />
          {data.nights}
        </Badge>
      </div>
      
      <div className="flex items-center justify-between">
        {data.guests && (
          <div className="flex items-center gap-1 text-gray-500">
            <Users className="h-3 w-3" />
            <span>{data.guests} hósp.</span>
          </div>
        )}
        <div className="flex items-center gap-1 font-semibold text-green-600">
          <DollarSign className="h-3 w-3" />
          <span>{formatCurrency(data.total_value, data.currency)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Card de Status de Check-in
 */
function CheckinStatusCard({ data }: { data: CheckinStatusData }) {
  const statusLabels: Record<string, string> = {
    pending: 'Pendente',
    instructions_sent: 'Instruções Enviadas',
    checked_in: 'Check-in Realizado',
    checked_out: 'Check-out Realizado',
  };

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
        <Building2 className="h-3 w-3" />
        <span className="font-medium truncate">{data.property_name}</span>
      </div>
      
      {data.guest_name && (
        <div className="flex items-center gap-1.5 text-gray-500">
          <User className="h-3 w-3" />
          <span>{data.guest_name}</span>
        </div>
      )}
      
      {data.reservation_code && (
        <Badge variant="outline" className="font-mono text-[10px]">
          {data.reservation_code}
        </Badge>
      )}
      
      <div className="flex items-center gap-2">
        {data.old_status && (
          <>
            <Badge variant="secondary" className="text-[10px]">
              {statusLabels[data.old_status] || data.old_status}
            </Badge>
            <ArrowRight className="h-3 w-3 text-gray-400" />
          </>
        )}
        <Badge className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
          {statusLabels[data.new_status] || data.new_status}
        </Badge>
      </div>
      
      {data.instructions_sent && (
        <div className="flex items-center gap-1 text-green-600 text-[10px]">
          <CheckCircle2 className="h-3 w-3" />
          <span>Instruções enviadas</span>
        </div>
      )}
    </div>
  );
}

/**
 * Card de Observação
 */
function ObservationCard({ data }: { data: ObservationData }) {
  return (
    <div className="text-xs">
      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap line-clamp-3">
        {data.text}
      </p>
      {data.category && (
        <Badge variant="secondary" className="mt-2 text-[10px]">
          {data.category}
        </Badge>
      )}
    </div>
  );
}

/**
 * Card de Reserva
 */
function ReservationCard({ data }: { data: ReservationData }) {
  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
        <Building2 className="h-3 w-3" />
        <span className="font-medium truncate">{data.property_name}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="font-mono text-[10px]">
          {data.reservation_code}
        </Badge>
      </div>
      
      <div className="flex items-center gap-1.5 text-gray-500">
        <User className="h-3 w-3" />
        <span>{data.guest_name}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-gray-500">
          <Calendar className="h-3 w-3" />
          <span>{format(parseISO(data.check_in), 'dd/MM')}</span>
        </div>
        <ArrowRight className="h-3 w-3 text-gray-400" />
        <span className="text-gray-500">{format(parseISO(data.check_out), 'dd/MM')}</span>
      </div>
      
      {data.total_value && (
        <div className="flex items-center gap-1 font-semibold text-purple-600">
          <DollarSign className="h-3 w-3" />
          <span>{formatCurrency(data.total_value)}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Card de Deal
 */
function DealCard({ data }: { data: DealData }) {
  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
        <Briefcase className="h-3 w-3" />
        <span className="font-medium truncate">{data.deal_name}</span>
      </div>
      
      {data.stage && (
        <Badge variant="secondary" className="text-[10px]">
          {data.stage}
        </Badge>
      )}
      
      {data.value && (
        <div className="flex items-center gap-1 font-semibold text-orange-600">
          <DollarSign className="h-3 w-3" />
          <span>{formatCurrency(data.value)}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Card de Bloqueio
 */
function BlockCard({ data }: { data: BlockData }) {
  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
        <Building2 className="h-3 w-3" />
        <span className="font-medium truncate">{data.property_name}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-gray-500">
          <Lock className="h-3 w-3" />
          <span>{format(parseISO(data.start_date), 'dd/MM')}</span>
        </div>
        <ArrowRight className="h-3 w-3 text-gray-400" />
        <span className="text-gray-500">{format(parseISO(data.end_date), 'dd/MM')}</span>
      </div>
      
      {data.reason && (
        <p className="text-gray-500 italic">"{data.reason}"</p>
      )}
    </div>
  );
}

/**
 * Card de Mensagem
 */
function MessageCard({ data }: { data: MessageData }) {
  return (
    <div className="space-y-1 text-xs">
      {data.template_name && (
        <Badge variant="secondary" className="text-[10px]">
          {data.template_name}
        </Badge>
      )}
      <p className="text-gray-600 dark:text-gray-400 line-clamp-2 italic">
        "{data.message_preview}"
      </p>
    </div>
  );
}

/**
 * Renderiza o card apropriado para o tipo de ação
 */
function ActivityCard({ log }: { log: ActivityLog }) {
  const config = ACTION_CONFIG[log.action_type];
  const Icon = config.icon;

  const renderContent = () => {
    switch (log.action_type) {
      case 'quotation':
        return <QuotationCard data={log.action_data as QuotationData} />;
      case 'checkin_status':
        return <CheckinStatusCard data={log.action_data as CheckinStatusData} />;
      case 'observation':
        return <ObservationCard data={log.action_data as ObservationData} />;
      case 'reservation':
        return <ReservationCard data={log.action_data as ReservationData} />;
      case 'deal_created':
        return <DealCard data={log.action_data as DealData} />;
      case 'block_created':
        return <BlockCard data={log.action_data as BlockData} />;
      case 'message_sent':
        return <MessageCard data={log.action_data as MessageData} />;
      default:
        return <pre className="text-xs">{JSON.stringify(log.action_data, null, 2)}</pre>;
    }
  };

  return (
    <div className={`rounded-lg border p-3 ${config.bgColor} border-gray-200 dark:border-gray-700`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Icon className={`h-3.5 w-3.5 ${config.color}`} />
          <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
        </div>
        <span className="text-[10px] text-gray-400">
          {formatRelativeDate(log.created_at)}
        </span>
      </div>
      
      {/* Content */}
      {renderContent()}
      
      {/* Footer - Usuário */}
      {log.user_name && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-1 text-[10px] text-gray-400">
          <User className="h-2.5 w-2.5" />
          <span>{log.user_name}</span>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ActivityLogSection({ contactPhone, className = '' }: ActivityLogSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { logs, isLoading, hasMore, error, loadLogs, loadMore, clearLogs, setWatchPhone } = useActivityLogs();

  // Normalizar o telefone da mesma forma que o hook faz
  const normalizedPhone = contactPhone
    ?.replace(/^whatsapp-/, '')
    .replace(/@s\.whatsapp\.net$/, '')
    .replace(/@c\.us$/, '')
    .replace(/@lid$/, '') || '';

  // Quando trocar de contato: limpar logs, fechar seção, mas CONTINUAR observando o novo telefone
  useEffect(() => {
    clearLogs();
    setIsExpanded(false);
    
    // Importante: Definir o telefone a ser observado IMEDIATAMENTE
    // Isso permite receber novos logs mesmo antes de expandir a seção
    if (normalizedPhone) {
      setWatchPhone(normalizedPhone);
    }
  }, [normalizedPhone, clearLogs, setWatchPhone]);

  // Carregar logs quando expandir
  const handleToggleExpand = useCallback(() => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    
    if (newExpanded && normalizedPhone) {
      // Carregar logs ao expandir (o currentPhone já está definido)
      loadLogs(normalizedPhone);
    }
  }, [isExpanded, normalizedPhone, loadLogs]);

  // Handler para carregar mais
  const handleLoadMore = useCallback(() => {
    loadMore();
  }, [loadMore]);

  return (
    <div className={`border-t border-gray-100 dark:border-gray-800 ${className}`}>
      {/* Toggle Header */}
      <button
        onClick={handleToggleExpand}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase">Histórico</span>
          {logs.length > 0 && (
            <Badge variant="secondary" className="h-4 min-w-[20px] px-1 text-[10px]">
              {logs.length}
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 max-h-[400px] overflow-y-auto">
          {/* Loading inicial */}
          {isLoading && logs.length === 0 && (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Carregando histórico...</span>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className="text-center py-4 text-red-500 text-sm">
              {error}
            </div>
          )}

          {/* Lista vazia */}
          {!isLoading && !error && logs.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma atividade registrada</p>
              <p className="text-xs mt-1">As ações feitas nesta conversa aparecerão aqui</p>
            </div>
          )}

          {/* Lista de logs */}
          {logs.map((log) => (
            <ActivityCard key={log.id} log={log} />
          ))}

          {/* Botão Ver Mais */}
          {hasMore && logs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-gray-500"
              onClick={handleLoadMore}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-2" />
                  Carregando...
                </>
              ) : (
                <>Ver mais</>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default ActivityLogSection;
