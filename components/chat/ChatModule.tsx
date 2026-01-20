import React from 'react';
import { MainSidebar } from '../MainSidebar';
import { LoadingProgress } from '../LoadingProgress';
import { ChatInboxWithEvolution } from '../ChatInboxWithEvolution';
import { cn } from '../ui/utils';

interface ChatModuleProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  initialLoading: boolean;
  onModuleChange: (moduleId: string) => void;
  onSearchReservation?: (query: string) => Promise<boolean>;
  onAdvancedSearch?: (query: string) => any[];
}

export function ChatModule({
  sidebarCollapsed,
  setSidebarCollapsed,
  initialLoading,
  onModuleChange,
  onSearchReservation,
  onAdvancedSearch,
}: ChatModuleProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <LoadingProgress isLoading={initialLoading} />

      <MainSidebar
        activeModule="central-mensagens"
        onModuleChange={onModuleChange}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSearchReservation={onSearchReservation}
        onAdvancedSearch={onAdvancedSearch}
      />

      <div
        className={cn(
          'flex flex-col min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72',
        )}
      >
        <div className="flex-1 overflow-hidden">
          <ChatInboxWithEvolution />
        </div>
      </div>
    </div>
  );
}


