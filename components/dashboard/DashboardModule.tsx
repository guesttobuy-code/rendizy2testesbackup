import React from 'react';
import { MainSidebar } from '../MainSidebar';
import { LoadingProgress } from '../LoadingProgress';
import { DashboardInicialSimple } from '../DashboardInicialSimple';
import { cn } from '../ui/utils';
import type { Reservation, Property } from '../../App';

interface DashboardModuleProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  initialLoading: boolean;
  onModuleChange: (moduleId: string) => void;
  onSearchReservation?: (query: string) => Promise<boolean>;
  onAdvancedSearch?: (query: string) => any[];
  conflicts: any[];
  reservations: Reservation[];
  properties: Property[];
  onReservationClick: (reservation: Reservation) => void;
  onDismissConflictAlert: () => void;
}

export function DashboardModule({
  sidebarCollapsed,
  setSidebarCollapsed,
  initialLoading,
  onModuleChange,
  onSearchReservation,
  onAdvancedSearch,
  conflicts,
  reservations,
  properties,
  onReservationClick,
  onDismissConflictAlert,
}: DashboardModuleProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <LoadingProgress isLoading={initialLoading} />

      <MainSidebar
        activeModule="painel-inicial"
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
        <DashboardInicialSimple
          conflicts={conflicts}
          onReservationClick={onReservationClick}
          onDismissConflictAlert={onDismissConflictAlert}
          reservations={reservations}
          properties={properties}
        />
      </div>
    </div>
  );
}


