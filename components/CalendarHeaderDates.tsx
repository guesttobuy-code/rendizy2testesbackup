import React from 'react';

interface CalendarHeaderDatesProps {
  days: Date[];
  leftColWidth: number;
}

export function CalendarHeaderDates({ days, leftColWidth }: CalendarHeaderDatesProps) {
  return (
    <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-md h-16">
      <div className="flex h-full">
        <div
          className="sticky left-0 z-[60] bg-white border-r border-gray-200 p-2 text-left flex items-center flex-shrink-0"
          style={{ width: `${leftColWidth}px`, minWidth: `${leftColWidth}px`, maxWidth: `${leftColWidth}px` }}
        >
          <span className="text-sm text-gray-600">Padrão</span>
        </div>
        {days.map((day, idx) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const dayNormalized = new Date(day);
          dayNormalized.setHours(0, 0, 0, 0);
          const isToday = dayNormalized.getTime() === today.getTime();

          return (
            <div
              key={idx}
              className={`border-r border-gray-200 p-1.5 min-w-[80px] text-center flex-shrink-0 ${
                isToday ? 'bg-gray-100' : 'bg-white'
              }`}
            >
              <div className="flex flex-col items-center gap-0 py-0.5">
                <div
                  className={`text-sm font-medium ${
                    isToday ? 'text-blue-900' : 'text-gray-900'
                  }`}
                >
                  {day.getDate()}
                </div>
                <div
                  className={`text-2xs uppercase leading-tight ${
                    isToday ? 'text-blue-700' : 'text-gray-500'
                  }`}
                >
                  {day
                    .toLocaleDateString('pt-BR', { weekday: 'short' })
                    .replace('.', '')}
                </div>
                <div
                  className={`text-2xs leading-tight ${
                    isToday ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  {day.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
