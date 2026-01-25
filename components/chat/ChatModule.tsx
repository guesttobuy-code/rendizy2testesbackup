/**
 * ChatModule - Módulo de Chat do Rendizy
 * 
 * @version v2.0.0 - Refatorado para usar SimpleChatInbox
 * @date 2026-01-22
 * 
 * Changelog:
 * - v2.0.0: Substituído ChatInboxWithEvolution por SimpleChatInbox
 *   - Removido Kanban desnecessário
 *   - Fluxo simplificado e fluido
 *   - Polling automático funcionando
 */

import React from 'react';
import { MainSidebar } from '../MainSidebar';
import { LoadingProgress } from '../LoadingProgress';
import { SimpleChatInbox } from './SimpleChatInbox';
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
        {/* ✅ v1.0.105.001: Espaço para TopBar com linha divisória */}
        <div className="h-14 flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" />
        
        {/* ✅ v2.0.0: Chat simplificado e funcional */}
        <div className="flex-1 overflow-hidden h-[calc(100vh-56px)]">
          <SimpleChatInbox />
        </div>
      </div>
    </div>
  );
}


