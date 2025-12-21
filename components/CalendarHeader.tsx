import React from 'react';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Calendar, Download, Settings, Grid3x3, List, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalendarHeaderProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  currentView: 'calendar' | 'list' | 'timeline';
  onViewChange: (view: 'calendar' | 'list' | 'timeline') => void;
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
  selectedProperties: string[];
  selectedReservationTypes: string[];
  onReservationTypesChange: (types: string[]) => void;
  onExport: () => void;
}

export function CalendarHeader({ 
  currentMonth, 
  onMonthChange, 
  currentView,
  onViewChange,
  dateRange,
  onDateRangeChange,
  onExport 
}: CalendarHeaderProps) {
  const monthName = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // ✅ Navegação de dateRange (60 dias)
  const handlePrevDateRange = () => {
    const daysToMove = 60;
    const newFrom = new Date(dateRange.from);
    newFrom.setDate(newFrom.getDate() - daysToMove);
    const newTo = new Date(dateRange.to);
    newTo.setDate(newTo.getDate() - daysToMove);
    onDateRangeChange({ from: newFrom, to: newTo });
  };

  const handleNextDateRange = () => {
    const daysToMove = 60;
    const newFrom = new Date(dateRange.from);
    newFrom.setDate(newFrom.getDate() + daysToMove);
    const newTo = new Date(dateRange.to);
    newTo.setDate(newTo.getDate() + daysToMove);
    onDateRangeChange({ from: newFrom, to: newTo });
  };

  const handleToday = () => {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setDate(nextMonth.getDate() + 30);
    onDateRangeChange({ from: today, to: nextMonth });
    onMonthChange(today);
  };

  const handlePrevMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    onMonthChange(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    onMonthChange(newMonth);
  };

  const dateRangeText = `${format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`;

  return (
    <div className="bg-red-200 border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Navigation */}
        <div className="flex items-center gap-4">
          <h1 className="text-gray-900">Calendário Geral</h1>
          
          <div className="flex items-center gap-2">
            {/* Month Navigation (for single month view) */}
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevMonth}
              className="h-8 w-8"
              title="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="min-w-[200px] text-center">
              <span className="text-gray-900 capitalize">{monthName}</span>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextMonth}
              className="h-8 w-8"
              title="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Date Range Navigation (60+ days) */}
            <div className="ml-4 flex items-center gap-2 pl-4 border-l border-gray-300">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevDateRange}
                className="h-8 w-8"
                title="60 dias anteriores"
              >
                <ChevronLeft className="h-4 w-4" />
                <ChevronLeft className="h-4 w-4 -ml-3" />
              </Button>
              
              <div className="min-w-[220px] text-center text-sm text-gray-600">
                {dateRangeText}
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextDateRange}
                className="h-8 w-8"
                title="Próximos 60 dias"
              >
                <ChevronRight className="h-4 w-4" />
                <ChevronRight className="h-4 w-4 -ml-3" />
              </Button>
            </div>

            <Button variant="ghost" size="sm" onClick={handleToday}>
              <Calendar className="h-4 w-4 mr-2" />
              Hoje
            </Button>
          </div>
        </div>

        {/* Right side - View toggle & Actions */}
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex border border-gray-300 rounded-md">
            <Button
              variant={currentView === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewChange('calendar')}
              className="rounded-r-none"
            >
              <Grid3x3 className="h-4 w-4 mr-2" />
              Grade
            </Button>
            <Button
              variant={currentView === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewChange('list')}
              className="rounded-none border-x border-gray-300"
            >
              <List className="h-4 w-4 mr-2" />
              Lista
            </Button>
            <Button
              variant={currentView === 'timeline' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewChange('timeline')}
              className="rounded-l-none"
            >
              <Clock className="h-4 w-4 mr-2" />
              Timeline
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>
    </div>
  );
}
