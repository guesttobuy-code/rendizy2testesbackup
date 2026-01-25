/**
 * 🎯 TOP BAR - Barra Superior Fixa do Sistema Rendizy
 * v1.0.0 - 2026-01-25
 * 
 * Componente responsável por organizar botões de ação rápida no canto superior direito:
 * - Automações: Abre modal de criação de automação
 * - Notificações: Mostra painel de notificações com badge de contagem
 * - Ações Rápidas: Abre modal de ações rápidas (reservas, cotações, etc.)
 * - Menu do Usuário: Login/Logout e configurações
 */
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Crown, LogOut, Settings, UserCircle, 
  Bell, Zap, Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from './ui/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { getSupabaseClient } from '../utils/supabase/client';

interface TopBarProps {
  onOpenQuickActions?: () => void;
  onOpenAutomations?: () => void;
}

export function TopBar({ 
  onOpenQuickActions, 
  onOpenAutomations 
}: TopBarProps) {
  const { user, isAuthenticated, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Não mostrar TopBar na página de login
  const shouldHide = !isAuthenticated || location.pathname === '/login';
  if (shouldHide) return null;

  const userName = user?.name || 'Usuário';
  const userEmail = user?.email || (user as any)?.username || '';
  const userAvatar = user?.avatar; // ✅ v1.0.105.001: Suporta avatar do usuário

  // Carregar notificações não lidas
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const supabase = getSupabaseClient();
    
    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('read', false)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (!error && data) {
          setNotifications(data);
          setUnreadNotifications(data.length);
        }
      } catch (err) {
        console.log('Notificações não carregadas:', err);
      }
    };

    fetchNotifications();

    // Subscrever para atualizações em tempo real
    const channel = supabase
      .channel('notifications_changes')
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
  }, [isAuthenticated]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const supabase = getSupabaseClient();
      await (supabase
        .from('notifications') as any)
        .update({ read: true })
        .eq('read', false);
      setUnreadNotifications(0);
      setNotifications([]);
    } catch (err) {
      console.error('Erro ao marcar notificações como lidas:', err);
    }
  };

  const initials = getInitials(userName);

  return (
    <TooltipProvider>
      <div className="fixed top-3 right-4 z-50 flex items-center gap-2">
        {/* Botão Automações */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onOpenAutomations}
              className={cn(
                "h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600",
                "flex items-center justify-center",
                "ring-2 ring-white dark:ring-gray-700",
                "transition-all duration-200 hover:scale-105 active:scale-95",
                "shadow-md hover:shadow-lg"
              )}
              aria-label="Automações"
            >
              <Sparkles className="h-4 w-4 text-white" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Automações</p>
          </TooltipContent>
        </Tooltip>

        {/* Botão Notificações */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              <DropdownMenu open={showNotificationsPanel} onOpenChange={setShowNotificationsPanel}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "h-9 w-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-600",
                      "flex items-center justify-center",
                      "ring-2 ring-white dark:ring-gray-700",
                      "transition-all duration-200 hover:scale-105 active:scale-95",
                      "shadow-md hover:shadow-lg"
                    )}
                    aria-label="Notificações"
                  >
                    <Bell className="h-4 w-4 text-white" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  side="bottom"
                  className="w-80 bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700"
                >
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span className="text-gray-900 dark:text-gray-100">Notificações</span>
                    {unreadNotifications > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                      >
                        Marcar todas como lidas
                      </button>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />

                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Nenhuma notificação
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.map((notification) => (
                        <DropdownMenuItem
                          key={notification.id}
                          className="flex flex-col items-start gap-1 py-3"
                        >
                          <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(notification.created_at).toLocaleString('pt-BR')}
                          </p>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  )}

                  <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
                  <DropdownMenuItem
                    className="justify-center text-blue-600 dark:text-blue-400"
                    onSelect={() => navigate('/notificacoes')}
                  >
                    Ver todas as notificações
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Badge de contagem */}
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Notificações {unreadNotifications > 0 ? `(${unreadNotifications})` : ''}</p>
          </TooltipContent>
        </Tooltip>

        {/* Botão Ações Rápidas */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onOpenQuickActions}
              className={cn(
                "h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600",
                "flex items-center justify-center",
                "ring-2 ring-white dark:ring-gray-700",
                "transition-all duration-200 hover:scale-105 active:scale-95",
                "shadow-md hover:shadow-lg"
              )}
              aria-label="Ações Rápidas"
            >
              <Zap className="h-4 w-4 text-white" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Ações Rápidas</p>
          </TooltipContent>
        </Tooltip>

        {/* Menu do Usuário */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'h-9 w-9 rounded-full flex items-center justify-center overflow-hidden',
                    'ring-2 transition-all duration-200 hover:scale-105 active:scale-95',
                    'shadow-md hover:shadow-lg',
                    !userAvatar && 'bg-gradient-to-br',
                    !userAvatar && (isSuperAdmin ? 'from-purple-500 to-pink-600' : 'from-blue-500 to-indigo-600'),
                    'ring-white dark:ring-gray-700'
                  )}
                  aria-label="Menu do usuário"
                >
                  {userAvatar ? (
                    <img 
                      src={userAvatar} 
                      alt={userName}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        // Fallback para iniciais se imagem falhar
                        (e.target as HTMLImageElement).style.display = 'none';
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent) {
                          parent.innerHTML = `<span class="text-xs font-medium text-white">${initials}</span>`;
                          parent.classList.add('bg-gradient-to-br', 'from-blue-500', 'to-indigo-600');
                        }
                      }}
                    />
                  ) : isSuperAdmin ? (
                    <Crown className="h-4 w-4 text-white" />
                  ) : (
                    <span className="text-xs font-medium text-white">{initials}</span>
                  )}
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{userName}</p>
            </TooltipContent>
          </Tooltip>

          <DropdownMenuContent
            align="end"
            side="bottom"
            className={cn('w-64', 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700')}
          >
            <DropdownMenuLabel className="text-gray-900 dark:text-gray-100">Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />

            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{userName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{userEmail}</p>
            </div>

            <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />

            <DropdownMenuItem
              onSelect={() => navigate('/settings')}
              className="text-gray-700 dark:text-gray-200 focus:bg-gray-100 dark:focus:bg-gray-700"
            >
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() => navigate('/minha-conta')}
              className="text-gray-700 dark:text-gray-200 focus:bg-gray-100 dark:focus:bg-gray-700"
            >
              <UserCircle className="mr-2 h-4 w-4" />
              Minha Conta
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />

            <DropdownMenuItem
              onSelect={handleLogout}
              disabled={isLoggingOut}
              className={cn(
                'text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20 focus:text-red-700 dark:focus:text-red-300',
                isLoggingOut && 'opacity-50 cursor-not-allowed'
              )}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLoggingOut ? 'Saindo...' : 'Sair'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}
