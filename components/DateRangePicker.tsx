/**
 * 🎯 COMPONENTE PADRÃO OFICIAL - DateRangePicker v1.0.52
 * 
 * Este é o seletor de datas PADRÃO e OBRIGATÓRIO para ranges (de-até) no Rendizy.
 * 
 * ⚠️ REGRA CRÍTICA:
 * - SEMPRE use este componente para seleção de ranges de datas
 * - NÃO crie novos seletores de datas com range
 * - NÃO use Calendar do shadcn diretamente para ranges
 * 
 * 📋 Casos de Uso:
 * ✅ Filtros de período, reservas, bloqueios, sazonalidade, cotações, exportações
 * ❌ Data única (use Calendar do shadcn)
 * ❌ Data + hora (use Calendar + Input)
 * 
 * 📚 Documentação: /guidelines/DateRangePicker-Standard.md
 * 
 * Features:
 * - 📅 Dois meses lado a lado
 * - 🔄 Navegação de mês/ano
 * - 🎯 Seleção em 2 cliques
 * - 🔵 Highlight de range
 * - 🇧🇷 Localização PT-BR
 * - ✅ Botões Aplicar/Cancelar
 * - 💡 Preview em tempo real
 */

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DateRangePickerProps {
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
}

export function DateRangePicker({ dateRange, onDateRangeChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectingFrom, setSelectingFrom] = useState<Date | null>(null);
  const [tempDateRange, setTempDateRange] = useState<{ from: Date; to: Date }>(dateRange);

  const nextMonth = addMonths(currentMonth, 1);

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handlePreviousYear = () => {
    setCurrentMonth(subMonths(currentMonth, 12));
  };

  const handleNextYear = () => {
    setCurrentMonth(addMonths(currentMonth, 12));
  };

  const handleDateClick = (date: Date) => {
    if (!selectingFrom) {
      setSelectingFrom(date);
    } else {
      if (date < selectingFrom) {
        setTempDateRange({ from: date, to: selectingFrom });
      } else {
        setTempDateRange({ from: selectingFrom, to: date });
      }
      setSelectingFrom(null);
    }
  };

  const handleApply = () => {
    onDateRangeChange(tempDateRange);
    setIsOpen(false);
    setSelectingFrom(null);
  };

  const handleCancel = () => {
    setTempDateRange(dateRange);
    setSelectingFrom(null);
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setTempDateRange(dateRange);
      setSelectingFrom(null);
    }
    setIsOpen(open);
  };

  const renderMonth = (month: Date) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calendarStart = startOfWeek(monthStart, { locale: ptBR });
    const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });
    
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const weekDays = ['2ª', '3ª', '4ª', '5ª', '6ª', 'SÁ', 'DO'];

    return (
      <div className="flex-1 px-3">
        {/* Month/Year Header */}
        <div className="flex items-center justify-between mb-4">
          {month === currentMonth && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreviousMonth}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          {month !== currentMonth && <div className="w-7" />}
          
          <div className="flex flex-col items-center">
            <div className="text-sm uppercase">
              {format(month, 'MMMM', { locale: ptBR })}
            </div>
          </div>

          {month === currentMonth && <div className="w-7" />}
          {month === nextMonth && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextMonth}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Year Navigation - only on first month */}
        {month === currentMonth && (
          <div className="flex items-center justify-center gap-2 mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreviousYear}
              className="h-6 w-6 p-0"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="text-sm min-w-[60px] text-center">
              {format(month, 'yyyy')}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextYear}
              className="h-6 w-6 p-0"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Year for second month */}
        {month === nextMonth && (
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-6" />
            <span className="text-sm min-w-[60px] text-center">
              {format(month, 'yyyy')}
            </span>
            <div className="w-6" />
          </div>
        )}

        {/* Week days header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day, i) => (
            <div key={i} className="text-center text-[10px] text-gray-500 h-6 flex items-center justify-center">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            const isCurrentMonth = isSameMonth(day, month);
            const isSelected = isSameDay(day, tempDateRange.from) || isSameDay(day, tempDateRange.to);
            const isInRange = isWithinInterval(day, { start: tempDateRange.from, end: tempDateRange.to });
            const isStart = isSameDay(day, tempDateRange.from);
            const isEnd = isSameDay(day, tempDateRange.to);
            const isHovering = selectingFrom && day >= selectingFrom;

            return (
              <button
                key={i}
                onClick={() => isCurrentMonth && handleDateClick(day)}
                disabled={!isCurrentMonth}
                className={`
                  h-8 text-xs relative
                  ${!isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : 'text-gray-900 hover:bg-gray-100'}
                  ${isSelected ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
                  ${isInRange && !isSelected ? 'bg-blue-100' : ''}
                  ${isStart ? 'rounded-l' : ''}
                  ${isEnd ? 'rounded-r' : ''}
                  ${isHovering && !isInRange ? 'bg-blue-50' : ''}
                  transition-colors
                `}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      <Label className="text-xs text-gray-600 mb-1.5 block">De - até</Label>
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-left h-9"
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            <span className="text-xs">
              {format(dateRange.from, "d MMM", { locale: ptBR })} - {format(dateRange.to, "d MMM yyyy", { locale: ptBR })}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-4">
            {/* Two months side by side */}
            <div className="flex gap-4">
              {renderMonth(currentMonth)}
              <div className="w-px bg-gray-200" />
              {renderMonth(nextMonth)}
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t">
              <div className="text-xs text-gray-500">
                {selectingFrom 
                  ? 'Selecione a data final' 
                  : tempDateRange.from && tempDateRange.to 
                    ? `${format(tempDateRange.from, "d MMM", { locale: ptBR })} - ${format(tempDateRange.to, "d MMM yyyy", { locale: ptBR })}`
                    : 'Selecione o período'}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="h-8"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleApply}
                  disabled={!tempDateRange.from || !tempDateRange.to}
                  className="h-8 bg-blue-600 hover:bg-blue-700"
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}
