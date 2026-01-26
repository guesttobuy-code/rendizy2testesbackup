/**
 * 🔔 RENDIZY - Notifications Management
 * v1.0.0 - 2026-01-25
 * 
 * Página completa de gestão de notificações
 * Layout: Sidebar de filtros + Grid de cards de notificações
 * Segue padrão do Calendário
 * 
 * @architecture ADR-008 - Componente isolado
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  BellOff, 
  Settings, 
  Trash2, 
  Archive,
  CheckCheck,
  RefreshCw,
  Filter,
  LayoutGrid,
  List as ListIcon
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';
import { getSupabaseClient } from '../../utils/supabase/client';
import { cn } from '../ui/utils';
import { NotificationsFilterSidebar } from './NotificationsFilterSidebar';
import { NotificationCard } from './NotificationCard';
import { 
  Notification, 
  NotificationType, 
  NotificationPriority,
  notificationTypeConfig 
} from './types';

interface NotificationsManagementProps {
  // Layout props
  className?: string;
}

// Dados mock para demonstração (será substituído por dados reais do Supabase)
const mockNotifications: Notification[] = [
  {
    id: '1',
    organization_id: '00000000-0000-0000-0000-000000000000',
    title: 'Nova reserva confirmada',
    message: 'João Silva confirmou reserva para Casa da Praia de 25/01 a 30/01/2026',
    type: 'reservation_new',
    priority: 'high',
    read: false,
    archived: false,
    reference_type: 'reservation',
    reference_id: 'res-123',
    metadata: {
      property_name: 'Casa da Praia',
      guest_name: 'João Silva',
      amount: 2500,
      check_in: '2026-01-25',
      check_out: '2026-01-30'
    },
    action_url: '/reservations?id=res-123',
    action_label: 'Ver reserva',
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() // 5 min atrás
  },
  {
    id: '2',
    organization_id: '00000000-0000-0000-0000-000000000000',
    title: 'Check-in hoje',
    message: 'Maria Santos faz check-in hoje às 14h no Apartamento Centro',
    type: 'checkin_today',
    priority: 'medium',
    read: false,
    archived: false,
    reference_type: 'reservation',
    reference_id: 'res-456',
    metadata: {
      property_name: 'Apartamento Centro',
      guest_name: 'Maria Santos',
      check_in: new Date().toISOString().split('T')[0]
    },
    action_url: '/reservations?id=res-456',
    action_label: 'Ver detalhes',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 min atrás
  },
  {
    id: '3',
    organization_id: '00000000-0000-0000-0000-000000000000',
    title: 'Pagamento recebido',
    message: 'Recebido pagamento de R$ 1.800,00 referente à reserva de Carlos Oliveira',
    type: 'payment_received',
    priority: 'low',
    read: true,
    archived: false,
    reference_type: 'payment',
    reference_id: 'pay-789',
    metadata: {
      guest_name: 'Carlos Oliveira',
      amount: 1800
    },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2h atrás
  },
  {
    id: '4',
    organization_id: '00000000-0000-0000-0000-000000000000',
    title: 'Nova mensagem no WhatsApp',
    message: 'Ana Paula enviou uma mensagem perguntando sobre disponibilidade',
    type: 'message_received',
    priority: 'medium',
    read: false,
    archived: false,
    reference_type: 'message',
    reference_id: 'msg-101',
    metadata: {
      guest_name: 'Ana Paula'
    },
    action_url: '/chat',
    action_label: 'Abrir chat',
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString() // 1h atrás
  },
  {
    id: '5',
    organization_id: '00000000-0000-0000-0000-000000000000',
    title: 'Cancelamento de reserva',
    message: 'Pedro Almeida cancelou a reserva para Chalé da Montanha',
    type: 'reservation_cancel',
    priority: 'critical',
    read: false,
    archived: false,
    reference_type: 'reservation',
    reference_id: 'res-789',
    metadata: {
      property_name: 'Chalé da Montanha',
      guest_name: 'Pedro Almeida',
      check_in: '2026-02-01',
      check_out: '2026-02-05'
    },
    action_url: '/reservations?id=res-789',
    action_label: 'Ver detalhes',
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString() // 15 min atrás
  },
  {
    id: '6',
    organization_id: '00000000-0000-0000-0000-000000000000',
    title: 'Automação executada',
    message: 'Mensagem de boas-vindas enviada automaticamente para Fernanda Costa',
    type: 'automation_triggered',
    priority: 'low',
    read: true,
    archived: false,
    metadata: {
      guest_name: 'Fernanda Costa'
    },
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString() // 45 min atrás
  },
  {
    id: '7',
    organization_id: '00000000-0000-0000-0000-000000000000',
    title: 'Sincronização concluída',
    message: 'Calendários do Airbnb e Booking.com sincronizados com sucesso',
    type: 'sync_complete',
    priority: 'low',
    read: true,
    archived: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() // 3h atrás
  },
  {
    id: '8',
    organization_id: '00000000-0000-0000-0000-000000000000',
    title: 'Nova avaliação recebida',
    message: 'Ricardo Mendes deixou uma avaliação de 5 estrelas para Casa da Praia',
    type: 'review_received',
    priority: 'medium',
    read: false,
    archived: false,
    reference_type: 'property',
    reference_id: 'prop-123',
    metadata: {
      property_name: 'Casa da Praia',
      guest_name: 'Ricardo Mendes'
    },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() // 5h atrás
  },
  {
    id: '9',
    organization_id: '00000000-0000-0000-0000-000000000000',
    title: 'Pagamento pendente',
    message: 'Aguardando pagamento de R$ 3.200,00 de Lucas Ferreira (vence em 2 dias)',
    type: 'payment_pending',
    priority: 'high',
    read: false,
    archived: false,
    reference_type: 'payment',
    reference_id: 'pay-456',
    metadata: {
      guest_name: 'Lucas Ferreira',
      amount: 3200
    },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString() // 8h atrás
  },
  {
    id: '10',
    organization_id: '00000000-0000-0000-0000-000000000000',
    title: 'Check-out hoje',
    message: 'Juliana Rocha faz check-out hoje às 11h no Apartamento Centro',
    type: 'checkout_today',
    priority: 'medium',
    read: true,
    archived: false,
    reference_type: 'reservation',
    reference_id: 'res-999',
    metadata: {
      property_name: 'Apartamento Centro',
      guest_name: 'Juliana Rocha',
      check_out: new Date().toISOString().split('T')[0]
    },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString() // 1h atrás
  }
];

export function NotificationsManagement({ className }: NotificationsManagementProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Filtros
  const [selectedTypes, setSelectedTypes] = useState<NotificationType[]>(
    Object.keys(notificationTypeConfig) as NotificationType[]
  );
  const [selectedPriorities, setSelectedPriorities] = useState<NotificationPriority[]>([]);
  const [readStatus, setReadStatus] = useState<'all' | 'read' | 'unread'>('all');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  // Carregar notificações do Supabase
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const supabase = getSupabaseClient();
        
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (!error && data && data.length > 0) {
          setNotifications(data as Notification[]);
        } else {
          // Usar mock se não houver dados reais
          console.log('Usando notificações mock para demonstração');
        }
      } catch (err) {
        console.log('Usando notificações mock:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Realtime subscription
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel('notifications_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setNotifications(prev => [payload.new as Notification, ...prev]);
          toast.info('Nova notificação recebida');
        } else if (payload.eventType === 'UPDATE') {
          setNotifications(prev => 
            prev.map(n => n.id === payload.new.id ? payload.new as Notification : n)
          );
        } else if (payload.eventType === 'DELETE') {
          setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filtrar notificações
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      // Filtro de tipo
      if (selectedTypes.length > 0 && !selectedTypes.includes(notification.type)) {
        return false;
      }

      // Filtro de prioridade
      if (selectedPriorities.length > 0 && !selectedPriorities.includes(notification.priority)) {
        return false;
      }

      // Filtro de status de leitura
      if (readStatus === 'read' && !notification.read) return false;
      if (readStatus === 'unread' && notification.read) return false;

      // Filtro de data
      if (dateRange) {
        const notificationDate = new Date(notification.created_at);
        if (notificationDate < dateRange.from || notificationDate > dateRange.to) {
          return false;
        }
      }

      // Filtro de busca
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = notification.title.toLowerCase().includes(query);
        const matchesMessage = notification.message.toLowerCase().includes(query);
        const matchesGuest = notification.metadata?.guest_name?.toLowerCase().includes(query);
        const matchesProperty = notification.metadata?.property_name?.toLowerCase().includes(query);
        
        if (!matchesTitle && !matchesMessage && !matchesGuest && !matchesProperty) {
          return false;
        }
      }

      // Não mostrar arquivadas
      if (notification.archived) return false;

      return true;
    });
  }, [notifications, selectedTypes, selectedPriorities, readStatus, dateRange, searchQuery]);

  // Contagens
  const totalCount = notifications.filter(n => !n.archived).length;
  const unreadCount = notifications.filter(n => !n.read && !n.archived).length;

  // Ações
  const handleMarkRead = async (id: string) => {
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', id);
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n)
      );
    } catch (err) {
      // Fallback para mock
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    }
  };

  const handleMarkUnread = async (id: string) => {
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from('notifications')
        .update({ read: false, read_at: null })
        .eq('id', id);
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: false, read_at: undefined } : n)
      );
    } catch (err) {
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: false } : n)
      );
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from('notifications')
        .update({ archived: true })
        .eq('id', id);
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, archived: true } : n)
      );
      toast.success('Notificação arquivada');
    } catch (err) {
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, archived: true } : n)
      );
      toast.success('Notificação arquivada');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notificação excluída');
    } catch (err) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notificação excluída');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('read', false);
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      toast.success('Todas as notificações marcadas como lidas');
    } catch (err) {
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      toast.success('Todas as notificações marcadas como lidas');
    }
  };

  const handleClearFilters = () => {
    setSelectedTypes(Object.keys(notificationTypeConfig) as NotificationType[]);
    setSelectedPriorities([]);
    setReadStatus('all');
    setDateRange(undefined);
    setSearchQuery('');
  };

  const handleRefresh = async () => {
    setLoading(true);
    // Simular refresh
    await new Promise(resolve => setTimeout(resolve, 500));
    setLoading(false);
    toast.success('Notificações atualizadas');
  };

  return (
    <div className={cn("flex h-full bg-gray-50 dark:bg-gray-900", className)}>
      {/* Sidebar de Filtros */}
      <NotificationsFilterSidebar
        selectedTypes={selectedTypes}
        onTypesChange={setSelectedTypes}
        selectedPriorities={selectedPriorities}
        onPrioritiesChange={setSelectedPriorities}
        readStatus={readStatus}
        onReadStatusChange={setReadStatus}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalCount={totalCount}
        unreadCount={unreadCount}
        filteredCount={filteredNotifications.length}
        onMarkAllRead={handleMarkAllRead}
        onClearFilters={handleClearFilters}
      />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          {/* ✅ v1.0.105.001: pr-52 para espaço do TopBar */}
          <div className="flex items-center justify-between pr-52">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Bell className="h-6 w-6 text-orange-500" />
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Notificações
                </h1>
              </div>
              {unreadCount > 0 && (
                <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  {unreadCount} não lidas
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Modo de Visualização */}
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'list')}>
                <TabsList className="bg-gray-100 dark:bg-gray-700">
                  <TabsTrigger value="grid" className="px-3">
                    <LayoutGrid className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="list" className="px-3">
                    <ListIcon className="h-4 w-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Refresh */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Atualizar
              </Button>

              {/* Configurações */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/settings?tab=notifications')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Preferências
              </Button>
            </div>
          </div>
        </div>

        {/* Lista de Notificações */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <BellOff className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Nenhuma notificação encontrada
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                {searchQuery || readStatus !== 'all' || selectedPriorities.length > 0
                  ? 'Tente ajustar os filtros para ver mais notificações.'
                  : 'Quando houver novidades, você será notificado aqui.'}
              </p>
              {(searchQuery || readStatus !== 'all' || selectedPriorities.length > 0) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="mt-4"
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className={cn(
              viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" 
                : "flex flex-col gap-3"
            )}>
              {filteredNotifications.map(notification => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                  onMarkUnread={handleMarkUnread}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                  compact={viewMode === 'list'}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
