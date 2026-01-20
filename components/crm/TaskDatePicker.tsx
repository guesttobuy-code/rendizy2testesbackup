import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../ui/utils';

interface TaskDatePickerProps {
  value?: string; // ISO date string
  onChange: (date: string | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function TaskDatePicker({
  value,
  onChange,
  placeholder = 'Selecionar prazo',
  className,
}: TaskDatePickerProps) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(value) : undefined;

  const getQuickOptions = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const thisWeekend = new Date(today);
    const dayOfWeek = today.getDay();
    const daysUntilSaturday = 6 - dayOfWeek;
    thisWeekend.setDate(today.getDate() + daysUntilSaturday);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const twoWeeks = new Date(today);
    twoWeeks.setDate(twoWeeks.getDate() + 14);
    
    const fourWeeks = new Date(today);
    fourWeeks.setDate(fourWeeks.getDate() + 28);

    return [
      { label: 'Hoje', date: today, short: format(today, 'EEE', { locale: ptBR }) },
      { label: 'Amanhã', date: tomorrow, short: format(tomorrow, 'EEE', { locale: ptBR }) },
      { label: 'Este fim de semana', date: thisWeekend, short: format(thisWeekend, 'EEE', { locale: ptBR }) },
      { label: 'Próxima semana', date: nextWeek, short: format(nextWeek, 'EEE', { locale: ptBR }) },
      { label: '2 semanas', date: twoWeeks, short: format(twoWeeks, 'dd MMM', { locale: ptBR }) },
      { label: '4 semanas', date: fourWeeks, short: format(fourWeeks, 'dd MMM', { locale: ptBR }) },
    ];
  };

  const handleQuickSelect = (selectedDate: Date) => {
    onChange(selectedDate.toISOString());
    setOpen(false);
  };

  const handleCalendarSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      onChange(selectedDate.toISOString());
      setOpen(false);
    }
  };

  const handleClear = () => {
    onChange(undefined);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            format(date, "PPP", { locale: ptBR })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Quick Options */}
          <div className="w-64 border-r p-3">
            <div className="space-y-1">
              {getQuickOptions().map((option, index) => (
                <button
                  key={index}
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between"
                  onClick={() => handleQuickSelect(option.date)}
                >
                  <span>{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.short}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t">
              <button
                className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-muted-foreground"
                onClick={handleClear}
              >
                Remover prazo
              </button>
            </div>
          </div>

          {/* Calendar */}
          <div className="p-3">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleCalendarSelect}
              initialFocus
              locale={ptBR}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

