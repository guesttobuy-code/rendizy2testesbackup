import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { Reservation, Property } from '../../utils/api';
import { MainSidebar } from '../MainSidebar';
import { LoadingProgress } from '../LoadingProgress';
import { ReservationsManagement } from '../ReservationsManagement';
import { CreateReservationWizard } from '../CreateReservationWizard';
import { ReservationDetailsModal } from '../ReservationDetailsModal';
import { cn } from '../ui/utils';
import { toast } from 'sonner';

interface ReservationsModuleProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  initialLoading: boolean;
  onModuleChange: (moduleId: string) => void;
  onSearchReservation?: (query: string) => Promise<boolean>;
  onAdvancedSearch?: (query: string) => any[];
  onViewDetails?: (reservation: Reservation) => void;
  onEditReservation?: (reservation: Reservation) => void;
  onCancelReservation?: (reservation: Reservation) => void;
  onCreateReservation?: () => void;
}

export function ReservationsModule({
  sidebarCollapsed,
  setSidebarCollapsed,
  initialLoading,
  onModuleChange,
  onSearchReservation,
  onAdvancedSearch,
  onViewDetails,
  onEditReservation,
  onCancelReservation,
  onCreateReservation,
}: ReservationsModuleProps) {
  const [createWizardOpen, setCreateWizardOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const location = useLocation();

  useEffect(() => {
    if (location.state && location.state.action === 'viewDetails' && location.state.reservation) {
      setSelectedReservation(location.state.reservation);
      setDetailsModalOpen(true);
      // Clear state to prevent reopening on refresh? 
      // React Router state persists on refresh, but maybe that's desired.
      // To clear, we'd need to navigate(location.pathname, { replace: true, state: {} }).
      // For now, let's keep it simple.
    }
  }, [location.state]);

  const handleCreateReservation = () => {
    if (onCreateReservation) {
      onCreateReservation();
    } else {
      setCreateWizardOpen(true);
    }
  };

  const handleViewDetails = (reservation: Reservation) => {
    if (onViewDetails) {
      onViewDetails(reservation);
    } else {
      setSelectedReservation(reservation);
      setDetailsModalOpen(true);
    }
  };

  const handleCreateComplete = (data: any) => {
    console.log('Reserva criada:', data);
    toast.success('Reserva criada com sucesso!');
    setCreateWizardOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <LoadingProgress isLoading={initialLoading} />

      <MainSidebar
        activeModule="central-reservas"
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
          <ReservationsManagement
            onViewDetails={handleViewDetails as any}
            onEditReservation={onEditReservation}
            onCancelReservation={onCancelReservation}
            onCreateReservation={handleCreateReservation}
          />
        </div>
      </div>

      <CreateReservationWizard
        open={createWizardOpen}
        onClose={() => setCreateWizardOpen(false)}
        onComplete={handleCreateComplete}
      />

      {selectedReservation && (
        <ReservationDetailsModal
          isOpen={detailsModalOpen}
          onClose={() => setDetailsModalOpen(false)}
          reservation={selectedReservation as any}
          onEdit={onEditReservation}
          onCancelReservation={(id) => {
            // Se tivermos o objeto completo, podemos chamar onCancelReservation
            // Mas o modal retorna ID. Precisamos ver como o App lida com isso.
            // O App.tsx espera (reservation: Reservation).
            // O ReservationDetailsModal chama onCancelReservation(reservation.id).
            // Isso parece incompatível se o App espera objeto.
            // Vamos verificar o App.tsx novamente.
            if (onCancelReservation && selectedReservation) {
              onCancelReservation(selectedReservation);
            }
          }}
        />
      )}
    </div>
  );
}
