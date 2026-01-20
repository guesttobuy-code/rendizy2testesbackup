/**
 * RENDIZY - Period Picker Component
 * Seletor de período com atalhos rápidos
 */

import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { Calendar } from '../../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../../ui/utils';

export interface PeriodPickerProps {
  startDate?: Date;
  endDate?: Date;
  onChange: (start: Date, end: Date) => void;
  className?: string;
}

type QuickPeriod = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'ytd';

const quickPeriods: { label: string; value: QuickPeriod }[] = [
  { label: 'Hoje', value: 'today' },
  { label: 'Ontem', value: 'yesterday' },
  { label: 'Esta Semana', value: 'this_week' },
  { label: 'Semana Passada', value: 'last_week' },
  { label: 'Este Mês', value: 'this_month' },
  { label: 'Mês Passado', value: 'last_month' },
  { label: 'Este Trimestre', value: 'this_quarter' },
  { label: 'Este Ano', value: 'this_year' },
  { label: 'Ano até Hoje', value: 'ytd' }
];

function getQuickPeriodDates(period: QuickPeriod): [Date, Date] {
  const today = new Date();
  
  switch (period) {
    case 'today':
      return [startOfDay(today), endOfDay(today)];
    
    case 'yesterday':
      const yesterday = subDays(today, 1);
      return [startOfDay(yesterday), endOfDay(yesterday)];
    
    case 'this_week':
      return [startOfWeek(today, { weekStartsOn: 0 }), endOfWeek(today, { weekStartsOn: 0 })];
    
    case 'last_week':
      const lastWeek = subDays(today, 7);
      return [startOfWeek(lastWeek, { weekStartsOn: 0 }), endOfWeek(lastWeek, { weekStartsOn: 0 })];
    
    case 'this_month':
      return [startOfMonth(today), endOfMonth(today)];
    
    case 'last_month':
      const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return [startOfMonth(lastMonthDate), endOfMonth(lastMonthDate)];
    
    case 'this_quarter':
      return [startOfQuarter(today), endOfQuarter(today)];
    
    case 'this_year':
      return [startOfYear(today), endOfYear(today)];
    
    case 'ytd':
      return [startOfYear(today), endOfDay(today)];
    
    default:
      return [startOfMonth(today), endOfMonth(today)];
  }
}

export function PeriodPicker({ startDate, endDate, onChange, className }: PeriodPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleQuickPeriod = (period: QuickPeriod) => {
    const [start, end] = getQuickPeriodDates(period);
    onChange(start, end);
    setIsOpen(false);
  };

  const formatPeriod = () => {
    if (!startDate || !endDate) return 'Selecione o período';
    
    if (format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd')) {
      return format(startDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
    }
    
    return `${format(startDate, 'dd/MM/yy')} - ${format(endDate, 'dd/MM/yy')}`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start text-left',
            !startDate && 'text-gray-500',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatPeriod()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Quick periods sidebar */}
          <div className="border-r p-2 space-y-1 min-w-[140px]">
            <div className="text-xs text-gray-500 px-2 py-1 mb-1">
              Períodos rápidos
            </div>
            {quickPeriods.map((period) => (
              <Button
                key={period.value}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-left text-xs h-8"
                onClick={() => handleQuickPeriod(period.value)}
              >
                {period.label}
              </Button>
            ))}
          </div>

          {/* Calendar */}
          <div className="p-3">
            <Calendar
              mode="range"
              selected={{
                from: startDate,
                to: endDate
              }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  onChange(range.from, range.to);
                  setIsOpen(false);
                }
              }}
              numberOfMonths={2}
              locale={ptBR}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default PeriodPicker;
