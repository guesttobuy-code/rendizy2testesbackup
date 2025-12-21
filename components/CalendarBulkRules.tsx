import React from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface CalendarBulkRulesProps {
  days: Date[];
  isBulkRulesExpanded: boolean;
  setIsBulkRulesExpanded: (expanded: boolean) => void;
  isDateInGlobalPriceSelection: (day: Date) => boolean;
  isDateInGlobalRestrictionsSelection: (day: Date) => boolean;
  isDateInGlobalMinNightsSelection: (day: Date) => boolean;
  handleGlobalPriceMouseDown: (day: Date, e: React.MouseEvent) => void;
  handleGlobalPriceMouseEnter: (day: Date, e: React.MouseEvent) => void;
  handleGlobalPriceMouseUp: () => void;
  handleGlobalRestrictionsMouseDown: (day: Date, e: React.MouseEvent) => void;
  handleGlobalRestrictionsMouseEnter: (day: Date, e: React.MouseEvent) => void;
  handleGlobalRestrictionsMouseUp: () => void;
  handleGlobalMinNightsMouseDown: (day: Date, e: React.MouseEvent) => void;
  handleGlobalMinNightsMouseEnter: (day: Date, e: React.MouseEvent) => void;
  handleGlobalMinNightsMouseUp: () => void;
}

export function CalendarBulkRules({
  days,
  isBulkRulesExpanded,
  setIsBulkRulesExpanded,
  isDateInGlobalPriceSelection,
  isDateInGlobalRestrictionsSelection,
  isDateInGlobalMinNightsSelection,
  handleGlobalPriceMouseDown,
  handleGlobalPriceMouseEnter,
  handleGlobalPriceMouseUp,
  handleGlobalRestrictionsMouseDown,
  handleGlobalRestrictionsMouseEnter,
  handleGlobalRestrictionsMouseUp,
  handleGlobalMinNightsMouseDown,
  handleGlobalMinNightsMouseEnter,
  handleGlobalMinNightsMouseUp,
}: CalendarBulkRulesProps) {
  return (
    <>
      <tr className="border-b border-gray-200 bg-white">
        <th className="sticky left-0 z-50 bg-white border-r border-gray-200 p-2 w-[180px] min-w-[180px] max-w-[180px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Regras em Lote</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-4 h-4 rounded-full border border-gray-400 flex items-center justify-center cursor-help hover:bg-gray-200 transition-colors">
                    <Info className="h-2.5 w-2.5 text-gray-600" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="text-sm">
                    A alteração em Regras em Lote, seguirão estritamente para os imóveis selecionados com as regras de filtros avançados. Imóveis não selecionados, não receberão Regras em lote.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <button
              onClick={() => setIsBulkRulesExpanded(!isBulkRulesExpanded)}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
            >
              {isBulkRulesExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              )}
            </button>
          </div>
        </th>
        {days.map((day, idx) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const dayNormalized = new Date(day);
          dayNormalized.setHours(0, 0, 0, 0);
          const isToday = dayNormalized.getTime() === today.getTime();

          return (
            <th
              key={idx}
              className={`border-r border-gray-200 min-w-[80px] w-20 ${
                isToday ? 'bg-gray-100' : 'bg-white'
              }`}
            />
          );
        })}
      </tr>

      {isBulkRulesExpanded && (
        <>
          {/* Condição (%) row */}
          <tr className="border-b border-gray-100 bg-orange-50">
            <td className="sticky left-0 z-10 bg-orange-50 border-r border-gray-200 p-1 pl-8">
              <div className="flex items-center gap-2 text-xs text-orange-700">
                <span className="text-orange-600">%</span>
                <span>Condição (%)</span>
              </div>
            </td>
            {days.map((day, idx) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const dayNormalized = new Date(day);
              dayNormalized.setHours(0, 0, 0, 0);
              const isToday = dayNormalized.getTime() === today.getTime();
              const isSelected = isDateInGlobalPriceSelection(day);

              return (
                <td
                  key={idx}
                  className={`border-r border-gray-200 p-1 h-8 text-center text-xs cursor-pointer transition-colors select-none min-w-[80px] w-20 ${
                    isSelected
                      ? 'bg-blue-200 ring-2 ring-blue-400 ring-inset'
                      : isToday
                        ? 'bg-orange-100'
                        : 'bg-orange-50 hover:bg-orange-100'
                  }`}
                  onMouseDown={(e) => handleGlobalPriceMouseDown(day, e)}
                  onMouseEnter={(e) => handleGlobalPriceMouseEnter(day, e)}
                  onMouseUp={handleGlobalPriceMouseUp}
                >
                  <span className="text-green-600">-10%</span>
                </td>
              );
            })}
          </tr>

          {/* Restrições row */}
          <tr className="border-b border-gray-100 bg-red-50">
            <td className="sticky left-0 z-10 bg-red-50 border-r border-gray-200 p-1 pl-8">
              <div className="flex items-center gap-2 text-xs text-red-700">
                <span className="text-red-600">🚫</span>
                <span>Restrições</span>
              </div>
            </td>
            {days.map((day, idx) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const dayNormalized = new Date(day);
              dayNormalized.setHours(0, 0, 0, 0);
              const isToday = dayNormalized.getTime() === today.getTime();
              const dayOfWeek = day.getDay();
              const isSunday = dayOfWeek === 0;
              const isSelected = isDateInGlobalRestrictionsSelection(day);

              return (
                <td
                  key={idx}
                  className={`border-r border-gray-200 p-1 h-8 text-center text-xs cursor-pointer transition-colors select-none min-w-[80px] w-20 ${
                    isSelected
                      ? 'bg-blue-200 ring-2 ring-blue-400 ring-inset'
                      : isToday
                        ? isSunday
                          ? 'bg-red-200'
                          : 'bg-red-100'
                        : isSunday
                          ? 'bg-red-200 hover:bg-red-300'
                          : 'bg-red-50 hover:bg-red-100'
                  }`}
                  onMouseDown={(e) => handleGlobalRestrictionsMouseDown(day, e)}
                  onMouseEnter={(e) => handleGlobalRestrictionsMouseEnter(day, e)}
                  onMouseUp={handleGlobalRestrictionsMouseUp}
                >
                  {isSunday ? '🚫' : '—'}
                </td>
              );
            })}
          </tr>

          {/* Mín. Noites row */}
          <tr className="border-b border-gray-200 bg-blue-50">
            <td className="sticky left-0 z-10 bg-blue-50 border-r border-gray-200 p-1 pl-8">
              <div className="flex items-center gap-2 text-xs text-blue-700">
                <span className="text-blue-600">🌙</span>
                <span>Mín. noites</span>
              </div>
            </td>
            {days.map((day, idx) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const dayNormalized = new Date(day);
              dayNormalized.setHours(0, 0, 0, 0);
              const isToday = dayNormalized.getTime() === today.getTime();
              const isSelected = isDateInGlobalMinNightsSelection(day);

              return (
                <td
                  key={idx}
                  className={`border-r border-gray-200 p-1 h-8 text-center text-xs cursor-pointer transition-colors select-none min-w-[80px] w-20 ${
                    isSelected
                      ? 'bg-blue-300 ring-2 ring-blue-500 ring-inset'
                      : isToday
                        ? 'bg-blue-100'
                        : 'bg-blue-50 hover:bg-blue-100'
                  }`}
                  onMouseDown={(e) => handleGlobalMinNightsMouseDown(day, e)}
                  onMouseEnter={(e) => handleGlobalMinNightsMouseEnter(day, e)}
                  onMouseUp={handleGlobalMinNightsMouseUp}
                >
                  <span className="text-blue-700">1</span>
                </td>
              );
            })}
          </tr>
        </>
      )}
    </>
  );
}
