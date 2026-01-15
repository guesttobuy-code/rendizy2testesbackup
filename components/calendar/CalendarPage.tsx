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
import { useQuery } from '@tanstack/react-query';
import { calendarApi } from '../../utils/api';

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
  handlePriceEdit?: (propertyId: string, startDate: Date, endDate: Date) => void;
  handleMinNightsEdit?: (propertyId: string, startDate: Date, endDate: Date) => void;
  handleConditionEdit?: (propertyId: string, startDate: Date, endDate: Date) => void;
  handleRestrictionsEdit?: (propertyId: string, startDate: Date, endDate: Date) => void;
  calendarRulesRefreshToken?: number;
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
  
  // ✅ BUSCAR BLOQUEIOS diretamente (bypassing useCalendarData)
  const { 
    data: blocksData,
    isLoading: blocksLoading,
    error: blocksError
  } = useQuery({
    queryKey: ['blocks', state.selectedProperties],
    queryFn: async () => {
      if (state.selectedProperties.length === 0) {
        console.log('⏭️ [CalendarPage] Nenhuma propriedade selecionada, pulando busca de bloqueios');
        return [];
      }
      
      console.log(`🔄 [CalendarPage] Buscando bloqueios para ${state.selectedProperties.length} propriedades`);
      console.log(`📤 [CalendarPage] PropertyIDs: ${JSON.stringify(state.selectedProperties)}`);
      
      const blocksResponse = await calendarApi.getBlocks(state.selectedProperties);
      console.log(`📥 [CalendarPage] Resposta da API de bloqueios:`, blocksResponse);

      if (!blocksResponse.success) {
        console.error(`❌ [CalendarPage] Erro ao buscar bloqueios:`, blocksResponse.error);
        // ✅ Estabilidade: não retornar [] e apagar estado existente.
        throw new Error(blocksResponse.error || 'Falha ao buscar bloqueios');
      }

      const blocks = blocksResponse.data || [];
      console.log(`✅ [CalendarPage] ${blocks.length} bloqueios carregados`);
      return blocks;
    },
    enabled: state.selectedProperties.length > 0,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
  
  console.log('🔍 [CalendarPage] Bloqueios:', { blocksData, blocksLoading, blocksError });
  
  // ✅ React Query: Carregar dados do calendário (preços)
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
    console.log('🔄 [CalendarPage] blocksData changed:', blocksData);
    if (blocksData && Array.isArray(blocksData)) {
      console.log('📊 [CalendarPage] Sincronizando bloqueios:', blocksData.length);
      setBlocks(blocksData);
    } else {
      console.log('⚠️ [CalendarPage] blocksData não é array:', blocksData);
    }
  }, [blocksData]);
  
  useEffect(() => {
    if (calendarData?.blocks) {
      console.log('📊 [CalendarPage] Sincronizando bloqueios do calendarData:', calendarData.blocks.length);
      // Não sobrescrever se já temos blocksData do useQuery direto
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
      calendarRulesRefreshToken={props.calendarRulesRefreshToken}
      
      // Handlers
      setExportModal={props.setExportModal}
      handleEmptyClick={props.handleEmptyClick}
      handleReservationClick={props.handleReservationClick}
      handleOpenBlockDetails={props.handleOpenBlockDetails}
      handlePriceEdit={props.handlePriceEdit}
      handleMinNightsEdit={props.handleMinNightsEdit}
      handleConditionEdit={props.handleConditionEdit}
      handleRestrictionsEdit={props.handleRestrictionsEdit}
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
