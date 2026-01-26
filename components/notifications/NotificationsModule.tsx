/**
 * 🔔 RENDIZY - Notifications Module (Cápsula)
 * v1.0.0 - 2026-01-25
 * 
 * Módulo encapsulado de notificações
 * Inclui Sidebar + TopBar + Conteúdo
 * 
 * @architecture ADR-008 - Módulo isolado
 */

import { MainSidebar } from '../MainSidebar';
import { LoadingProgress } from '../LoadingProgress';
import { NotificationsManagement } from './NotificationsManagement';
import { cn } from '../ui/utils';

interface NotificationsModuleProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  initialLoading: boolean;
  onModuleChange: (module: string) => void;
  onSearchReservation: (query: string) => void;
  onAdvancedSearch: () => void;
}

export function NotificationsModule({
  sidebarCollapsed,
  setSidebarCollapsed,
  initialLoading,
  onModuleChange,
  onSearchReservation,
  onAdvancedSearch
}: NotificationsModuleProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <LoadingProgress isLoading={initialLoading} />

      <MainSidebar
        activeModule="notificacoes"
        onModuleChange={onModuleChange}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSearchReservation={onSearchReservation}
        onAdvancedSearch={onAdvancedSearch}
      />

      <div
        className={cn(
          "flex flex-col min-h-screen transition-all duration-300",
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"
        )}
      >
        {/* Spacer para TopBar */}
        <div className="h-14 flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" />
        
        <div className="flex-1 overflow-hidden">
          <NotificationsManagement />
        </div>
      </div>
    </div>
  );
}

export default NotificationsModule;
