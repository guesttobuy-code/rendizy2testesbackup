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

      {isBulkRulesExpanded && null}
    </>
  );
}
