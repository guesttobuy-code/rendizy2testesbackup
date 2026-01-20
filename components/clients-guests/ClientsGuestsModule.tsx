/**
 * RENDIZY - Clientes e Hóspedes Module (Cápsula)
 * 
 * Módulo encapsulado seguindo arquitetura de cápsulas
 * Padrão: Cada botão do menu lateral = 1 cápsula isolada
 * 
 * @version v1.0.103.342
 * @date 2025-12-14
 * 
 * ✅ ARQUITETURA DE CÁPSULAS:
 * - Isolamento completo do módulo
 * - Layout próprio (MainSidebar + conteúdo)
 * - Se este módulo cair, outros continuam funcionando
 * - Alinhado com: CalendarModule, GuestsModule, AdminMasterModule
 */

import React from 'react';
import { MainSidebar } from '../MainSidebar';
import { LoadingProgress } from '../LoadingProgress';
import { ClientsAndGuestsManagement } from '../ClientsAndGuestsManagement';
import { cn } from '../ui/utils';

interface ClientsGuestsModuleProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  initialLoading: boolean;
  onModuleChange: (moduleId: string) => void;
  onSearchReservation?: (query: string) => Promise<boolean>;
  onAdvancedSearch?: (query: string) => any[];
}

/**
 * Cápsula do módulo de Clientes e Hóspedes
 * Gerencia layout completo: sidebar + conteúdo
 */
export function ClientsGuestsModule({
  sidebarCollapsed,
  setSidebarCollapsed,
  initialLoading,
  onModuleChange,
  onSearchReservation,
  onAdvancedSearch,
}: ClientsGuestsModuleProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <LoadingProgress isLoading={initialLoading} />

      <MainSidebar
        activeModule="clientes-hospedes"
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
          <ClientsAndGuestsManagement />
        </div>
      </div>
    </div>
  );
}
