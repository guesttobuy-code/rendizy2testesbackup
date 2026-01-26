/**
 * 🔔 RENDIZY - Notifications Modal Overlay
 * v1.0.0 - 2026-01-25
 * 
 * Modal overlay para listagem rápida de notificações no TopBar
 * Abre sobre a tela sem precisar navegar para a página de notificações
 * 
 * @architecture ADR-008 - Componente isolado
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, X, Check, CheckCheck, Trash2, Archive,
  Calendar, CreditCard, MessageCircle, Settings,
  AlertTriangle, AlertCircle, Info, ChevronRight,
  Filter, MoreHorizontal
} from 'lucide-react';
import { cn } from '../ui/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { getSupabaseClient } from '../../utils/supabase/client';
import type { Notification, NotificationType, NotificationPriority, notificationTypeConfig, priorityConfig } from './types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToPage?: () => void;
}

// Configurações inline para não depender de export
const typeIcons: Record<NotificationType, typeof Bell> = {
  nova_reserva: Calendar,
  check_in_hoje: Calendar,
  check_out_hoje: Calendar,
  cancelamento: Calendar,
  alteracao_reserva: Calendar,
  pagamento_recebido: CreditCard,
  pagamento_pendente: CreditCard,
  pagamento_atrasado: CreditCard,
  reembolso: CreditCard,
  nova_mensagem: MessageCircle,
  mensagem_nao_lida: MessageCircle,
  avaliacao_hospede: MessageCircle,
  manutencao: Settings,
  integracao_erro: AlertTriangle,
  sistema: Info,
  alerta: AlertCircle
};

const typeColors: Record<NotificationType, string> = {
  nova_reserva: 'bg-emerald-500',
  check_in_hoje: 'bg-blue-500',
  check_out_hoje: 'bg-orange-500',
  cancelamento: 'bg-red-500',
  alteracao_reserva: 'bg-amber-500',
  pagamento_recebido: 'bg-green-500',
  pagamento_pendente: 'bg-yellow-500',
  pagamento_atrasado: 'bg-red-500',
  reembolso: 'bg-purple-500',
  nova_mensagem: 'bg-blue-500',
  mensagem_nao_lida: 'bg-indigo-500',
  avaliacao_hospede: 'bg-pink-500',
  manutencao: 'bg-gray-500',
  integracao_erro: 'bg-red-600',
  sistema: 'bg-gray-600',
  alerta: 'bg-orange-600'
};

const priorityStyles: Record<NotificationPriority, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-blue-500',
  low: 'border-l-gray-400'
};

// Função auxiliar para tempo relativo
function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Agora';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return date.toLocaleDateString('pt-BR');
}

export function NotificationsModal({ isOpen, onClose, onNavigateToPage }: NotificationsModalProps) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Carregar notificações
  useEffect(() => {
    if (!isOpen) return;
    
    const supabase = getSupabaseClient();
    
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (filter === 'unread') {
          query = query.eq('read', false);
        }

        const { data, error } = await query;
        
        if (!error && data) {
          setNotifications(data as Notification[]);
        }
      } catch (err) {
        console.error('Erro ao carregar notificações:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Real-time updates
    const channel = supabase
      .channel('notifications_modal')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications'
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, filter]);

  // Marcar como lida
  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const supabase = getSupabaseClient();
    
    await (supabase.from('notifications') as any)
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', id);
    
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  // Marcar todas como lidas
  const handleMarkAllAsRead = async () => {
    const supabase = getSupabaseClient();
    
    await (supabase.from('notifications') as any)
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('read', false);
    
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Arquivar notificação
  const handleArchive = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const supabase = getSupabaseClient();
    
    await (supabase.from('notifications') as any)
      .update({ archived: true, archived_at: new Date().toISOString() })
      .eq('id', id);
    
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Deletar notificação
  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const supabase = getSupabaseClient();
    
    await (supabase.from('notifications') as any)
      .delete()
      .eq('id', id);
    
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Navegar para página de notificações
  const handleViewAll = () => {
    onClose();
    if (onNavigateToPage) {
      onNavigateToPage();
    } else {
      navigate('/notificacoes');
    }
  };

  // Clicar em uma notificação
  const handleNotificationClick = (notification: Notification) => {
    // Marcar como lida
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }

    // Navegar se tiver action_url
    if (notification.action_url) {
      onClose();
      navigate(notification.action_url);
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-[60] backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        className={cn(
          "fixed top-16 right-4 z-[70]",
          "w-[420px] max-h-[calc(100vh-100px)]",
          "bg-white dark:bg-gray-800",
          "rounded-xl shadow-2xl",
          "border border-gray-200 dark:border-gray-700",
          "flex flex-col",
          "animate-in fade-in slide-in-from-top-2 duration-200"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
              <Bell className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Notificações
              </h2>
              {unreadCount > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {unreadCount} não {unreadCount === 1 ? 'lida' : 'lidas'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filtro rápido */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
              <button
                onClick={() => setFilter('unread')}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                  filter === 'unread'
                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                )}
              >
                Não lidas
              </button>
              <button
                onClick={() => setFilter('all')}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                  filter === 'all'
                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                )}
              >
                Todas
              </button>
            </div>

            {/* Botão fechar */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Ações em massa */}
        {unreadCount > 0 && (
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700/50">
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas como lidas
            </button>
          </div>
        )}

        {/* Lista de notificações */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Carregando...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                <Bell className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {filter === 'unread' ? 'Nenhuma notificação não lida' : 'Nenhuma notificação'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Você está em dia! 🎉
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {notifications.map((notification) => {
                const Icon = typeIcons[notification.type as NotificationType] || Bell;
                const colorClass = typeColors[notification.type as NotificationType] || 'bg-gray-500';
                const priorityClass = priorityStyles[notification.priority as NotificationPriority] || 'border-l-gray-400';
                const isHovered = hoveredId === notification.id;

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "relative px-4 py-3 cursor-pointer transition-all duration-150",
                      "border-l-[3px]",
                      priorityClass,
                      notification.read
                        ? "bg-white dark:bg-gray-800"
                        : "bg-amber-50/50 dark:bg-amber-900/10",
                      "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                    onMouseEnter={() => setHoveredId(notification.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <div className="flex gap-3">
                      {/* Ícone */}
                      <div className={cn(
                        "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center",
                        colorClass
                      )}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-sm line-clamp-1",
                            notification.read
                              ? "text-gray-700 dark:text-gray-300"
                              : "text-gray-900 dark:text-white font-medium"
                          )}>
                            {notification.title}
                          </p>
                          
                          {/* Indicador não lida */}
                          {!notification.read && (
                            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500 mt-1.5" />
                          )}
                        </div>
                        
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>

                        {/* Metadados */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {timeAgo(notification.created_at)}
                          </span>
                          {notification.property_name && (
                            <>
                              <span className="text-gray-300 dark:text-gray-600">•</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                                {notification.property_name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Ações rápidas (aparecem no hover) */}
                      {isHovered && (
                        <div 
                          className="flex items-center gap-1 absolute right-3 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 shadow-sm rounded-lg p-1 border border-gray-200 dark:border-gray-600"
                          onClick={e => e.stopPropagation()}
                        >
                          {!notification.read && (
                            <button
                              onClick={(e) => handleMarkAsRead(notification.id, e)}
                              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              title="Marcar como lida"
                            >
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleArchive(notification.id, e)}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Arquivar"
                          >
                            <Archive className="h-3.5 w-3.5 text-gray-400 hover:text-blue-500" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(notification.id, e)}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
          <button
            onClick={handleViewAll}
            className={cn(
              "w-full flex items-center justify-center gap-2",
              "px-4 py-2 rounded-lg",
              "bg-gradient-to-r from-amber-500 to-orange-600",
              "text-white text-sm font-medium",
              "hover:from-amber-600 hover:to-orange-700",
              "transition-all duration-200 hover:shadow-md"
            )}
          >
            Ver todas as notificações
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}

export default NotificationsModal;
