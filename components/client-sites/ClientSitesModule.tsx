import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { MainSidebar } from '../MainSidebar';
import { LoadingProgress } from '../LoadingProgress';
import { ClientSitesManager } from '../ClientSitesManager';
import { cn } from '../ui/utils';
import { ClientSitesInternalAreaPage } from './ClientSitesInternalAreaPage';
import { ClientSitesComponentsAndDataPage } from './ClientSitesComponentsAndDataPage';

interface ClientSitesModuleProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  initialLoading: boolean;
  onModuleChange: (moduleId: string) => void;
  onSearchReservation?: (query: string) => Promise<boolean>;
  onAdvancedSearch?: (query: string) => any[];
}

export function ClientSitesModule({
  sidebarCollapsed,
  setSidebarCollapsed,
  initialLoading,
  onModuleChange,
  onSearchReservation,
  onAdvancedSearch,
}: ClientSitesModuleProps) {
  const location = useLocation();

  const activeModule = (() => {
    const p = location.pathname;
    if (p.includes('/sites-clientes/componentes-dados')) return 'motor-reservas-componentes-dados';
    if (p.includes('/sites-clientes/area-interna')) return 'motor-reservas-area-interna';
    return 'motor-reservas-sites';
  })();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <LoadingProgress isLoading={initialLoading} />

      <MainSidebar
        activeModule={activeModule}
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
          <Routes>
            <Route index element={<Navigate to="sites" replace />} />
            <Route path="sites" element={<ClientSitesManager />} />
            <Route path="componentes-dados" element={<ClientSitesComponentsAndDataPage />} />
            <Route path="area-interna" element={<ClientSitesInternalAreaPage />} />
            <Route path="*" element={<Navigate to="." replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
