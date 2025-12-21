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
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
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
          'flex flex-col min-h-screen transition-all duration-300',
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

          {/* ✅ FIX v1.0.103.424: Scroll container com headers fixos DENTRO dele */}
          <div className="flex-1 flex flex-col">
            {/* Header 1: CalendarHeader - FIXO NO TOPO (fora do scroll) */}
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

            {/* Scroll container - permite sticky dos filhos dentro dele */}
            <div className="flex-1 overflow-auto">
              {currentView === 'calendar' && (
                <Calendar
                  properties={properties.filter((p) => selectedProperties.includes(p.id))}
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
                  properties={properties.filter((p) => selectedProperties.includes(p.id))}
                  reservations={reservations}
                  selectedReservationTypes={selectedReservationTypes}
                  onReservationClick={handleReservationClick}
                />
              )}

              {currentView === 'timeline' && (
                <TimelineView
                  properties={properties.filter((p) => selectedProperties.includes(p.id))}
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


