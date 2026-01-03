import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Crown, LogOut, Settings, UserCircle } from 'lucide-react';

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

export function TopUserMenu() {
  const { user, isAuthenticated, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const shouldHide = !isAuthenticated || location.pathname === '/login';
  if (shouldHide) return null;

  const userName = user?.name || 'Usuário';
  const userEmail = user?.email || (user as any)?.username || '';

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

  const initials = getInitials(userName);

  return (
    <div className="fixed top-4 right-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'h-10 w-10 rounded-full bg-gradient-to-br flex items-center justify-center ring-2 transition-transform active:scale-95',
              isSuperAdmin ? 'from-purple-500 to-pink-600' : 'from-blue-500 to-purple-600',
              'ring-white dark:ring-gray-700'
            )}
            aria-label="Menu do usuário"
          >
            {isSuperAdmin ? (
              <Crown className="h-5 w-5 text-white" />
            ) : (
              <span className="text-sm font-medium text-white">{initials}</span>
            )}
          </button>
        </DropdownMenuTrigger>

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
  );
}
