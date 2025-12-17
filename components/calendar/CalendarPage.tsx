/**
 * CALENDAR PAGE
 * Wrapper otimizado que usa CalendarContext + React Query
 * Mantém 100% da UI existente, apenas otimiza gestão de estado
 * v1.0.0 - Refatoração invisível
 */

import { useEffect } from 'react';
import { CalendarProvider, useCalendar } from '../../contexts/CalendarContext';
import { useProperties, useReservations, useCalendarData } from '../../hooks/useCalendarData';
import { CalendarModule } from './CalendarModule';
import type { Property, Reservation } from '../../App';

interface CalendarPageProps {
  // Props do App.tsx (mantém compatibilidade)
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  initialLoading: boolean;
  onModuleChange: (moduleId: string) => void;
  onSearchReservation?: (query: string) => Promise<boolean>;
  onAdvancedSearch?: (query: string) => any[];
  setExportModal: (show: boolean) => void;
  handleEmptyClick: (propertyId: string, startDate: Date, endDate: Date) => void;
  handleReservationClick: (reservation: Reservation) => void;
  handleOpenBlockDetails: (block: any) => void;
}

/**
 * Componente interno que consome o context
 */
function CalendarPageContent(props: CalendarPageProps) {
  const { 
    state, 
    setProperties, 
    setSelectedProperties, 
    setReservations, 
    setBlocks,
    setDateRange,
    setSelectedReservationTypes,
    setCurrentView,
    setCurrentMonth
  } = useCalendar();
  
  // ✅ React Query: Carregar propriedades com cache
  const { 
    data: propertiesData, 
    isLoading: loadingProperties
  } = useProperties();
  
  // ✅ React Query: Carregar reservas com cache
  const { 
    data: reservationsData
  } = useReservations();
  
  // ✅ React Query: Carregar dados do calendário (bloqueios, preços)
  const { 
    data: calendarData 
  } = useCalendarData({
    propertyIds: state.selectedProperties,
    dateRange: state.dateRange,
    enabled: state.selectedProperties.length > 0
  });
  
  // ✅ Sincronizar dados do React Query com o context
  useEffect(() => {
    if (propertiesData) {
      console.log('📊 [CalendarPage] Sincronizando propriedades:', propertiesData.length);
      setProperties(propertiesData);
      
      // Auto-selecionar todas as propriedades na primeira carga
      if (state.selectedProperties.length === 0) {
        setSelectedProperties(propertiesData.map((p: Property) => p.id));
      }
    }
  }, [propertiesData]);
  
  useEffect(() => {
    if (reservationsData) {
      console.log('📊 [CalendarPage] Sincronizando reservas:', reservationsData.length);
      setReservations(reservationsData as Reservation[]);
    }
  }, [reservationsData]);
  
  useEffect(() => {
    if (calendarData?.blocks) {
      console.log('📊 [CalendarPage] Sincronizando bloqueios:', calendarData.blocks.length);
      setBlocks(calendarData.blocks);
    }
  }, [calendarData]);
  
  // ✅ Passa dados do context para CalendarModule (mantém interface existente)
  return (
    <CalendarModule
      sidebarCollapsed={props.sidebarCollapsed}
      setSidebarCollapsed={props.setSidebarCollapsed}
      initialLoading={props.initialLoading || loadingProperties}
      onModuleChange={props.onModuleChange}
      onSearchReservation={props.onSearchReservation}
      onAdvancedSearch={props.onAdvancedSearch}
      
      // Estado gerenciado pelo context
      properties={state.properties}
      selectedProperties={state.selectedProperties}
      setSelectedProperties={setSelectedProperties}
      reservations={state.reservations}
      blocks={state.blocks}
      dateRange={state.dateRange}
      setDateRange={setDateRange}
      selectedReservationTypes={state.selectedReservationTypes}
      setSelectedReservationTypes={setSelectedReservationTypes}
      currentView={state.currentView}
      setCurrentView={setCurrentView}
      currentMonth={state.currentMonth}
      setCurrentMonth={setCurrentMonth}
      refreshKey={state.refreshKey}
      
      // Handlers
      setExportModal={props.setExportModal}
      handleEmptyClick={props.handleEmptyClick}
      handleReservationClick={props.handleReservationClick}
      handleOpenBlockDetails={props.handleOpenBlockDetails}
    />
  );
}

/**
 * Componente principal exportado
 * Wraps CalendarPageContent com CalendarProvider
 */
export function CalendarPage(props: CalendarPageProps) {
  return (
    <CalendarProvider>
      <CalendarPageContent {...props} />
    </CalendarProvider>
  );
}
