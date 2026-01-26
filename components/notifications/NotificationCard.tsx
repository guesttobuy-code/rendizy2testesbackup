/**
 * 🔔 RENDIZY - Notification Card
 * v1.0.0 - 2026-01-25
 * 
 * Card individual de notificação com design moderno
 * Suporta diferentes tipos, prioridades e ações
 */

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { 
  Bell,
  CalendarPlus,
  CalendarX,
  CalendarClock,
  LogIn,
  LogOut,
  CircleDollarSign,
  MessageSquare,
  Star,
  Wrench,
  Settings,
  Zap,
  RefreshCw,
  AlertTriangle,
  Clock,
  Check,
  Archive,
  Trash2,
  ExternalLink,
  MoreHorizontal,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../ui/dropdown-menu';
import { cn } from '../ui/utils';
import { 
  Notification, 
  NotificationType,
  notificationTypeConfig,
  priorityConfig 
} from './types';

interface NotificationCardProps {
  notification: Notification;
  onMarkRead?: (id: string) => void;
  onMarkUnread?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClick?: (notification: Notification) => void;
  compact?: boolean;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  CalendarPlus,
  CalendarX,
  CalendarClock,
  LogIn,
  LogOut,
  CircleDollarSign,
  MessageSquare,
  Star,
  Wrench,
  Settings,
  Zap,
  RefreshCw,
  AlertTriangle,
  Clock,
  Bell
};

export function NotificationCard({
  notification,
  onMarkRead,
  onMarkUnread,
  onArchive,
  onDelete,
  onClick,
  compact = false
}: NotificationCardProps) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  
  const config = notificationTypeConfig[notification.type] || notificationTypeConfig.general;
  const priorityConf = priorityConfig[notification.priority];
  const IconComponent = iconMap[config.icon] || Bell;

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: ptBR
  });

  const handleClick = () => {
    if (onClick) {
      onClick(notification);
    } else if (notification.action_url) {
      navigate(notification.action_url);
    }
    
    // Marcar como lida ao clicar
    if (!notification.read && onMarkRead) {
      onMarkRead(notification.id);
    }
  };

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200",
          "hover:bg-gray-50 dark:hover:bg-gray-700/50",
          !notification.read && "bg-blue-50/50 dark:bg-blue-900/10"
        )}
        onClick={handleClick}
      >
        {/* Ícone */}
        <div className={cn("p-1.5 rounded-full flex-shrink-0", config.bgColor)}>
          <IconComponent className={cn("h-3.5 w-3.5", config.color)} />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn(
              "text-sm line-clamp-2",
              notification.read ? "text-gray-600 dark:text-gray-400" : "text-gray-900 dark:text-gray-100 font-medium"
            )}>
              {notification.title}
            </p>
            {!notification.read && (
              <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {timeAgo}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex gap-4 p-4 rounded-xl border transition-all duration-200 cursor-pointer",
        "hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600",
        notification.read 
          ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" 
          : "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800"
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Indicador de Prioridade */}
      {notification.priority !== 'low' && (
        <div className={cn(
          "absolute left-0 top-4 bottom-4 w-1 rounded-r-full",
          notification.priority === 'critical' && "bg-red-500",
          notification.priority === 'high' && "bg-orange-500",
          notification.priority === 'medium' && "bg-blue-500"
        )} />
      )}

      {/* Ícone */}
      <div className={cn(
        "p-3 rounded-xl flex-shrink-0 transition-transform duration-200",
        config.bgColor,
        isHovered && "scale-110"
      )}>
        <IconComponent className={cn("h-5 w-5", config.color)} />
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn("text-[10px] px-1.5", config.color, "border-current")}>
              {config.label}
            </Badge>
            {notification.priority !== 'low' && (
              <Badge className={cn("text-[10px] px-1.5", priorityConf.bgColor, priorityConf.color)}>
                {priorityConf.label}
              </Badge>
            )}
          </div>
          
          {/* Menu de Ações */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
                  isHovered && "opacity-100"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {notification.read ? (
                onMarkUnread && (
                  <DropdownMenuItem onClick={(e) => handleAction(e, () => onMarkUnread(notification.id))}>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Marcar como não lida
                  </DropdownMenuItem>
                )
              ) : (
                onMarkRead && (
                  <DropdownMenuItem onClick={(e) => handleAction(e, () => onMarkRead(notification.id))}>
                    <Eye className="h-4 w-4 mr-2" />
                    Marcar como lida
                  </DropdownMenuItem>
                )
              )}
              
              {notification.action_url && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  navigate(notification.action_url!);
                }}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {notification.action_label || 'Abrir'}
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              {onArchive && (
                <DropdownMenuItem onClick={(e) => handleAction(e, () => onArchive(notification.id))}>
                  <Archive className="h-4 w-4 mr-2" />
                  Arquivar
                </DropdownMenuItem>
              )}
              
              {onDelete && (
                <DropdownMenuItem 
                  onClick={(e) => handleAction(e, () => onDelete(notification.id))}
                  className="text-red-600 dark:text-red-400 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Título */}
        <h3 className={cn(
          "text-sm mb-1",
          notification.read 
            ? "text-gray-700 dark:text-gray-300" 
            : "text-gray-900 dark:text-gray-100 font-semibold"
        )}>
          {notification.title}
        </h3>

        {/* Mensagem */}
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
          {notification.message}
        </p>

        {/* Metadados */}
        {notification.metadata && Object.keys(notification.metadata).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {notification.metadata.property_name && (
              <Badge variant="secondary" className="text-[10px]">
                🏠 {notification.metadata.property_name}
              </Badge>
            )}
            {notification.metadata.guest_name && (
              <Badge variant="secondary" className="text-[10px]">
                👤 {notification.metadata.guest_name}
              </Badge>
            )}
            {notification.metadata.amount && (
              <Badge variant="secondary" className="text-[10px]">
                💰 R$ {notification.metadata.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Badge>
            )}
            {notification.metadata.check_in && notification.metadata.check_out && (
              <Badge variant="secondary" className="text-[10px]">
                📅 {new Date(notification.metadata.check_in).toLocaleDateString('pt-BR')} - {new Date(notification.metadata.check_out).toLocaleDateString('pt-BR')}
              </Badge>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {timeAgo}
          </span>
          
          {notification.action_url && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 p-0"
              onClick={(e) => {
                e.stopPropagation();
                navigate(notification.action_url!);
              }}
            >
              {notification.action_label || 'Ver detalhes'}
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Indicador de não lida */}
      {!notification.read && (
        <div className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
      )}
    </div>
  );
}
