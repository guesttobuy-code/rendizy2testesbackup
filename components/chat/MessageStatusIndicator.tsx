/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                         MESSAGE STATUS INDICATOR                           ║
 * ║                                                                            ║
 * ║  🔒 ZONA_CRITICA_CHAT - Indicadores de status de mensagem (ACK)           ║
 * ║  ✔️  WAHA_ACK - Baseado nos níveis de ACK do WhatsApp                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Componente para exibir status de entrega de mensagens.
 * 
 * ACK Levels (WhatsApp/WAHA):
 * - ACK_ERROR (-1): Erro no envio
 * - ACK_PENDING (0): Aguardando envio
 * - ACK_SERVER (1): Entregue ao servidor WhatsApp
 * - ACK_DEVICE (2): Entregue ao dispositivo do destinatário
 * - ACK_READ (3): Lido pelo destinatário
 * - ACK_PLAYED (4): Áudio/vídeo reproduzido
 * 
 * @version 1.0.0
 * @date 2026-01-25
 * @see /docs/ROADMAP-CHAT.md
 */

import { Check, CheckCheck, Clock, AlertCircle, Loader2, Play } from 'lucide-react';
import { cn } from '../ui/utils';

// ============================================
// TYPES
// ============================================

export type MessageAck = -1 | 0 | 1 | 2 | 3 | 4;
export type MessageStatus = 'error' | 'pending' | 'sent' | 'delivered' | 'read' | 'played';

export interface MessageStatusIndicatorProps {
  /** ACK numérico do WAHA (-1 a 4) */
  ack?: MessageAck | number;
  /** Status semântico (alternativa ao ack) */
  status?: MessageStatus;
  /** Se a mensagem é do usuário (fromMe) */
  fromMe?: boolean;
  /** Tamanho do ícone */
  size?: 'xs' | 'sm' | 'md';
  /** Mostrar label textual */
  showLabel?: boolean;
  /** Classe CSS adicional */
  className?: string;
}

// ============================================
// HELPERS
// ============================================

/**
 * Converte ACK numérico para status semântico
 */
export function ackToStatus(ack: number): MessageStatus {
  switch (ack) {
    case -1: return 'error';
    case 0: return 'pending';
    case 1: return 'sent';
    case 2: return 'delivered';
    case 3: return 'read';
    case 4: return 'played';
    default: return 'pending';
  }
}

/**
 * Converte status semântico para ACK numérico
 */
export function statusToAck(status: MessageStatus): MessageAck {
  switch (status) {
    case 'error': return -1;
    case 'pending': return 0;
    case 'sent': return 1;
    case 'delivered': return 2;
    case 'read': return 3;
    case 'played': return 4;
    default: return 0;
  }
}

/**
 * Retorna o label em português para o status
 */
export function getStatusLabel(status: MessageStatus): string {
  switch (status) {
    case 'error': return 'Erro';
    case 'pending': return 'Enviando...';
    case 'sent': return 'Enviada';
    case 'delivered': return 'Entregue';
    case 'read': return 'Lida';
    case 'played': return 'Reproduzida';
    default: return '';
  }
}

// ============================================
// SIZE CONFIG
// ============================================

const sizeConfig = {
  xs: { icon: 'h-2.5 w-2.5', text: 'text-[9px]' },
  sm: { icon: 'h-3 w-3', text: 'text-[10px]' },
  md: { icon: 'h-4 w-4', text: 'text-xs' },
};

// ============================================
// COMPONENT
// ============================================

export function MessageStatusIndicator({
  ack,
  status: propStatus,
  fromMe = true,
  size = 'sm',
  showLabel = false,
  className,
}: MessageStatusIndicatorProps) {
  // Só mostrar indicador para mensagens enviadas pelo usuário
  if (!fromMe) return null;
  
  // Determinar status
  const status: MessageStatus = propStatus || (ack !== undefined ? ackToStatus(ack) : 'pending');
  
  const { icon: iconSize, text: textSize } = sizeConfig[size];
  
  // Renderizar ícone baseado no status
  const renderIcon = () => {
    switch (status) {
      case 'error':
        return <AlertCircle className={cn(iconSize, 'text-red-400')} />;
      case 'pending':
        return <Loader2 className={cn(iconSize, 'animate-spin text-gray-300')} />;
      case 'sent':
        return <Check className={cn(iconSize, 'text-gray-300')} />;
      case 'delivered':
        return <CheckCheck className={cn(iconSize, 'text-gray-300')} />;
      case 'read':
        return <CheckCheck className={cn(iconSize, 'text-blue-400')} />;
      case 'played':
        return (
          <span className="relative">
            <CheckCheck className={cn(iconSize, 'text-blue-400')} />
            <Play className={cn('absolute -top-0.5 -right-1', iconSize, 'text-blue-400 scale-50')} />
          </span>
        );
      default:
        return <Clock className={cn(iconSize, 'text-gray-300')} />;
    }
  };
  
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {renderIcon()}
      {showLabel && (
        <span className={cn(textSize, 'text-current opacity-70')}>
          {getStatusLabel(status)}
        </span>
      )}
    </span>
  );
}

// ============================================
// TOOLTIP VERSION
// ============================================

export interface MessageStatusWithTooltipProps extends MessageStatusIndicatorProps {
  /** Timestamp da mensagem */
  timestamp?: Date;
}

export function MessageStatusWithTooltip({
  timestamp,
  ...props
}: MessageStatusWithTooltipProps) {
  const status = props.status || (props.ack !== undefined ? ackToStatus(props.ack) : 'pending');
  
  const tooltipText = [
    getStatusLabel(status),
    timestamp && timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  ].filter(Boolean).join(' • ');
  
  return (
    <span title={tooltipText}>
      <MessageStatusIndicator {...props} />
    </span>
  );
}

export default MessageStatusIndicator;
