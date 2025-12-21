import React from 'react';
import { MainSidebar } from '../MainSidebar';
import { LoadingProgress } from '../LoadingProgress';
import { PropertySidebar } from '../PropertySidebar';
import { CalendarHeader } from '../CalendarHeader';
import { Calendar } from '../CalendarGrid';
import { ListView } from '../ListView';
import { TimelineView } from '../TimelineView';
import { cn } from '../ui/utils';
import type { Property, Reservation } from '../../App';

interface CalendarModuleProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  initialLoading: boolean;
  onModuleChange: (moduleId: string) => void;
  onSearchReservation?: (query: string) => Promise<boolean>;
  onAdvancedSearch?: (query: string) => any[];
  properties: Property[];
  selectedProperties: string[];
  setSelectedProperties: (updater: (prev: string[]) => string[]) => void;
  reservations: Reservation[];
  blocks: any[];
  dateRange: { from: Date; to: Date };
  setDateRange: (range: { from: Date; to: Date }) => void;
  selectedReservationTypes: string[];
  setSelectedReservationTypes: (types: string[]) => void;
  currentView: 'calendar' | 'list' | 'timeline';
  setCurrentView: (view: 'calendar' | 'list' | 'timeline') => void;
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  refreshKey: number;
  setExportModal: (open: boolean) => void;
  handleEmptyClick: (propertyId: string, startDate: Date, endDate: Date) => void;
  handleReservationClick: (reservation: Reservation) => void;
  handleOpenBlockDetails: (block: any) => void;
}

export function CalendarModule({
  sidebarCollapsed,
  setSidebarCollapsed,
  initialLoading,
  onModuleChange,
  onSearchReservation,
  onAdvancedSearch,
  properties,
  selectedProperties,
  setSelectedProperties,
  reservations,
  blocks,
  dateRange,
  setDateRange,
  selectedReservationTypes,
  setSelectedReservationTypes,
  currentView,
  setCurrentView,
  currentMonth,
  setCurrentMonth,
  refreshKey,
  setExportModal,
  handleEmptyClick,
  handleReservationClick,
  handleOpenBlockDetails,
}: CalendarModuleProps) {
  // Paginação de propriedades para reduzir DOM e melhorar performance
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(50);

  const filteredProperties = React.useMemo(
    () => properties.filter((p) => selectedProperties.includes(p.id)),
    [properties, selectedProperties]
  );
  const totalPages = Math.max(1, Math.ceil(filteredProperties.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedProperties = React.useMemo(
    () => filteredProperties.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredProperties, safePage, pageSize]
  );

  return (
    <div className="h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors">
      <LoadingProgress isLoading={initialLoading} />

      <MainSidebar
        activeModule="calendario"
        onModuleChange={onModuleChange}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSearchReservation={onSearchReservation}
        onAdvancedSearch={onAdvancedSearch}
      />

      <div
        className={cn(
          'flex flex-col h-full transition-all duration-300',
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72',
        )}
      >
        <div className="flex flex-1 min-h-0">
          <PropertySidebar
            properties={properties}
            selectedProperties={selectedProperties}
            onToggleProperty={(id) => {
              setSelectedProperties((prev) =>
                prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
              );
            }}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            selectedReservationTypes={selectedReservationTypes}
            onReservationTypesChange={setSelectedReservationTypes}
            currentView={currentView}
            onViewChange={setCurrentView}
          />

          {/* ✅ FIX v1.0.103.428: Estrutura com scroll separado para células */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Header 1: CalendarHeader - FIXO NO TOPO (fora de qualquer scroll) */}
            <CalendarHeader
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              currentView={currentView}
              onViewChange={setCurrentView}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              selectedProperties={selectedProperties}
              selectedReservationTypes={selectedReservationTypes}
              onReservationTypesChange={setSelectedReservationTypes}
              onExport={() => setExportModal(true)}
            />

            {/* Barra de Paginação */}
            <div className="flex items-center gap-2 px-4 py-2 border-t border-b bg-white">
              <span className="text-sm text-gray-700">Imóveis: {filteredProperties.length}</span>
              <div className="flex items-center gap-2 ml-auto">
                <label className="text-sm text-gray-600">Por página</label>
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={pageSize}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPageSize(val);
                    setPage(1);
                  }}
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <button
                  className="px-2 py-1 border rounded text-sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                >
                  ◀
                </button>
                <span className="text-sm">Página {safePage} / {totalPages}</span>
                <button
                  className="px-2 py-1 border rounded text-sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                >
                  ▶
                </button>
              </div>
            </div>

            {/* 🎁 Container de scroll ISOLADO para o calendário - permite scroll X e Y */}
            <div className="flex-1 min-h-0 overflow-auto">
              {currentView === 'calendar' && (
                <Calendar
                  properties={paginatedProperties}
                  reservations={reservations}
                  blocks={blocks}
                  currentMonth={currentMonth}
                  dateRange={dateRange}
                  onPriceEdit={(propertyId, startDate, endDate) => console.log('Price edit', propertyId, startDate, endDate)}
                  onMinNightsEdit={(propertyId, startDate, endDate) => console.log('Min nights edit', propertyId, startDate, endDate)}
                  onEmptyClick={handleEmptyClick}
                  onReservationClick={handleReservationClick}
                  onBlockClick={handleOpenBlockDetails}
                />
              )}

              {currentView === 'list' && (
                <ListView
                  properties={paginatedProperties}
                  reservations={reservations}
                  selectedReservationTypes={selectedReservationTypes}
                  onReservationClick={handleReservationClick}
                />
              )}

              {currentView === 'timeline' && (
                <TimelineView
                  properties={paginatedProperties}
                  reservations={reservations}
                  blocks={blocks}
                  dateRange={dateRange}
                  selectedReservationTypes={selectedReservationTypes}
                  onReservationClick={handleReservationClick}
                  onBlockClick={handleOpenBlockDetails}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


