// PropertyCalendarRow.tsx
// ============================================================================
// COMPONENTE: Linha de Propriedade do Calendário (Isolada)
// ============================================================================
//
// CRIADO: 2026-01-06 (commit 178ce7d)
// STATUS: ✅ Pronto para uso, 🔄 Integração com CalendarGrid pendente
//
// PROPÓSITO:
// Isolar a renderização de cada propriedade do calendário em um componente
// separado com React.memo para evitar re-renders desnecessários.
//
// OTIMIZAÇÕES INCLUÍDAS:
// 1. React.memo com comparação customizada (arePropsEqual)
// 2. Preparado para virtualização futura com react-window
// 3. Aceita prop `style` para posicionamento virtual
//
// INTEGRAÇÃO FUTURA (Sprint 4):
// Este componente será usado com react-window para virtualizar o grid:
// ```tsx
// import { VariableSizeList as List } from 'react-window';
// 
// <List itemCount={properties.length} itemSize={() => ROW_HEIGHT}>
//   {({ index, style }) => (
//     <PropertyCalendarRow 
//       data={{ property: properties[index], ... }}
//       handlers={handlers}
//       style={style}
//     />
//   )}
// </List>
// ```
//
// ⚠️ NOTA: Por enquanto NÃO está integrado no CalendarGrid.tsx
// A integração foi adiada para evitar riscos em arquivo de 1600+ linhas.
//
// ============================================================================

import React, { memo, useMemo, useCallback } from 'react';
import { Property, Reservation } from '../App';
import { ReservationCard } from './ReservationCard';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { parseDateLocal } from '../utils/dateLocal';
import { CalendarPricingRule } from '../hooks/useCalendarPricingRules';

// ============================================================================
// TYPES
// ============================================================================

type DiscountPackagePreset = 'weekly' | 'monthly' | 'custom';

type DiscountPackageRule = {
  id: string;
  preset: DiscountPackagePreset;
  min_nights: number;
  discount_percent: number;
};

interface PropertyRowData {
  property: Property & { minNights?: number }; // minNights pode vir de dados expandidos
  days: Date[];
  reservations: Reservation[];
  blocks: any[];
  isExpanded: boolean;
  leftColWidth: number;
  packageRows: DiscountPackageRule[];
}

interface PropertyRowHandlers {
  onToggleExpand: (propertyId: string) => void;
  onPriceEdit: (propertyId: string, startDate: Date, endDate: Date) => void;
  onMinNightsEdit: (propertyId: string, startDate: Date, endDate: Date) => void;
  onConditionEdit?: (propertyId: string, startDate: Date, endDate: Date) => void;
  onRestrictionsEdit?: (propertyId: string, startDate: Date, endDate: Date) => void;
  onEmptyClick: (propertyId: string, startDate: Date, endDate: Date) => void;
  onReservationClick: (reservation: Reservation) => void;
  onBlockClick?: (block: any) => void;
  getRuleForDate: (propertyId: string | null, date: Date, applyBatchRules?: boolean) => CalendarPricingRule | null;
  
  // Selection handlers
  isDateInPriceSelection: (propertyId: string, date: Date) => boolean;
  isDateInMinNightsSelection: (propertyId: string, date: Date) => boolean;
  isDateInEmptySelection: (propertyId: string, date: Date) => boolean;
  isDateInConditionSelection: (propertyId: string, date: Date) => boolean;
  isDateInRestrictionsSelection: (propertyId: string, date: Date) => boolean;
  isDateInBasePriceSelection: (propertyId: string, date: Date) => boolean;
  isDateInPackagePriceSelection: (propertyId: string, date: Date, packageId: string) => boolean;
  
  // Mouse handlers
  handlePriceMouseDown: (propertyId: string, date: Date) => void;
  handlePriceMouseEnter: (propertyId: string, date: Date) => void;
  handlePriceMouseUp: () => void;
  handleMinNightsMouseDown: (propertyId: string, date: Date) => void;
  handleMinNightsMouseEnter: (propertyId: string, date: Date) => void;
  handleMinNightsMouseUp: () => void;
  handleEmptyMouseDown: (propertyId: string, date: Date) => void;
  handleEmptyMouseEnter: (propertyId: string, date: Date) => void;
  handleEmptyMouseUp: () => void;
  handleConditionMouseDown: (propertyId: string, date: Date) => void;
  handleConditionMouseEnter: (propertyId: string, date: Date) => void;
  handleConditionMouseUp: () => void;
  handleRestrictionsMouseDown: (propertyId: string, date: Date) => void;
  handleRestrictionsMouseEnter: (propertyId: string, date: Date) => void;
  handleRestrictionsMouseUp: () => void;
  handleBasePriceMouseDown: (propertyId: string, date: Date) => void;
  handleBasePriceMouseEnter: (propertyId: string, date: Date) => void;
  handleBasePriceMouseUp: () => void;
  handlePackagePriceMouseDown: (propertyId: string, date: Date, packageId: string) => void;
  handlePackagePriceMouseEnter: (propertyId: string, date: Date, packageId: string) => void;
  handlePackagePriceMouseUp: () => void;
}

interface PropertyCalendarRowProps {
  data: PropertyRowData;
  handlers: PropertyRowHandlers;
  style?: React.CSSProperties; // Para react-window
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function splitTwoLines(input: string, firstLineMax = 30, secondLineMax = 30): { line1: string; line2?: string } {
  const text = (input || '').trim().replace(/\s+/g, ' ');
  if (!text) return { line1: 'Sem nome' };

  const words = text.split(' ').filter(Boolean);

  const fitWords = (startIndex: number, maxLen: number): { line: string; nextIndex: number } => {
    if (startIndex >= words.length) return { line: '', nextIndex: startIndex };

    const firstWord = words[startIndex];
    if ((firstWord || '').length > maxLen) {
      return { line: firstWord, nextIndex: startIndex + 1 };
    }

    let line = '';
    let i = startIndex;
    while (i < words.length) {
      const w = words[i];
      const candidate = line ? `${line} ${w}` : w;
      if (candidate.length > maxLen) break;
      line = candidate;
      i += 1;
    }
    return { line, nextIndex: i };
  };

  const l1 = fitWords(0, firstLineMax);
  if (!l1.line) return { line1: 'Sem nome' };
  if (l1.nextIndex >= words.length) return { line1: l1.line };

  const l2 = fitWords(l1.nextIndex, secondLineMax);
  if (!l2.line) return { line1: l1.line };

  const hasMore = l2.nextIndex < words.length;
  if (!hasMore) return { line1: l1.line, line2: l2.line };

  const ellipsis = '…';
  let line2 = l2.line;
  while (line2.length + ellipsis.length > secondLineMax && line2.includes(' ')) {
    const parts = line2.split(' ');
    parts.pop();
    line2 = parts.join(' ');
  }
  if (line2.length + ellipsis.length <= secondLineMax) {
    line2 = `${line2}${ellipsis}`;
  } else if (line2 !== l2.line) {
    line2 = `${l2.line}${ellipsis}`;
  }

  return { line1: l1.line, line2 };
}

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const dayNum = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayNum}`;
}

function getAllReservationsForPropertyAndDate(
  propertyId: string,
  date: Date,
  reservations: Reservation[]
): Reservation[] {
  return reservations.filter(r => {
    if (r.propertyId !== propertyId) return false;
    const checkIn = parseDateLocal((r as any).checkIn) || new Date(0);
    const checkOut = parseDateLocal((r as any).checkOut) || new Date(0);
    checkIn.setHours(0, 0, 0, 0);
    checkOut.setHours(0, 0, 0, 0);
    const currentDate = new Date(date);
    currentDate.setHours(0, 0, 0, 0);
    return currentDate >= checkIn && currentDate < checkOut;
  });
}

function getBlockForPropertyAndDate(
  propertyId: string,
  date: Date,
  blocks: any[]
): any | null {
  const dayStr = formatLocalDate(date);
  
  return blocks.find(b => {
    if (b.property_id !== propertyId) return false;
    const bStart = b.start_date?.split('T')[0] || '';
    const bEnd = b.end_date?.split('T')[0] || '';
    return dayStr >= bStart && dayStr < bEnd;
  }) || null;
}

function discountColorClasses(preset: DiscountPackagePreset): { rowBg: string; stickyBg: string; text: string; iconText: string; hoverBg: string } {
  if (preset === 'weekly') {
    return { rowBg: 'bg-cyan-50', stickyBg: 'bg-cyan-50', text: 'text-cyan-700', iconText: 'text-cyan-600', hoverBg: 'bg-cyan-50 hover:bg-cyan-100' };
  }
  if (preset === 'monthly') {
    return { rowBg: 'bg-teal-50', stickyBg: 'bg-teal-50', text: 'text-teal-700', iconText: 'text-teal-600', hoverBg: 'bg-teal-50 hover:bg-teal-100' };
  }
  return { rowBg: 'bg-purple-50', stickyBg: 'bg-purple-50', text: 'text-purple-700', iconText: 'text-purple-600', hoverBg: 'bg-purple-50 hover:bg-purple-100' };
}

function buildDiscountLabel(rule: DiscountPackageRule): string {
  const nn = String(rule.min_nights ?? 0).padStart(2, '0');
  if (rule.preset === 'weekly') return `Semanal 07 (R$)`;
  if (rule.preset === 'monthly') return `Mensal 28 (R$)`;
  return `Personalizado ${nn} (R$)`;
}

// ============================================================================
// COMPONENT
// ============================================================================

function PropertyCalendarRowComponent({ data, handlers, style }: PropertyCalendarRowProps) {
  const { property, days, reservations, blocks, isExpanded, leftColWidth, packageRows } = data;
  
  // Memoize today check
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  
  const isToday = useCallback((day: Date) => {
    const d = new Date(day);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  }, [today]);

  return (
    <React.Fragment>
      {/* Main reservation row */}
      <tr className="border-b border-gray-200" style={style}>
        {/* Sticky property name cell */}
        <td 
          className="sticky left-0 z-30 bg-white border-r border-gray-200 p-1.5 relative"
          style={{ width: `${leftColWidth}px`, minWidth: `${leftColWidth}px`, maxWidth: `${leftColWidth}px` }}
        >
          <div className="flex items-center gap-2">
            <img
              src={property.image}
              alt={property.name}
              loading="lazy"
              decoding="async"
              width={28}
              height={28}
              className="w-7 h-7 rounded object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              {(() => {
                const displayName = property.internalId || property.name || 'Sem nome';
                const { line1, line2 } = splitTwoLines(displayName, 30, 30);
                return (
                  <a
                    href={`/properties/${property.id}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-gray-900 leading-4 hover:underline"
                    title={displayName}
                  >
                    <span className="block truncate">{line1}</span>
                    {line2 ? <span className="block truncate">{line2}</span> : null}
                  </a>
                );
              })()}
            </div>
            <button
              onClick={() => handlers.onToggleExpand(property.id)}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              )}
            </button>
          </div>
        </td>
        
        {/* Day cells */}
        {days.map((day, idx) => {
          const allReservationsOnDay = getAllReservationsForPropertyAndDate(property.id, day, reservations);
          const blockOnDay = getBlockForPropertyAndDate(property.id, day, blocks);
          const isSelected = handlers.isDateInEmptySelection(property.id, day);
          const isTodayCell = isToday(day);
          
          return (
            <td
              key={idx}
              className={`relative border-r border-gray-200 min-w-[80px] w-20 h-12 cursor-pointer transition-colors ${
                isSelected 
                  ? 'bg-blue-200 ring-2 ring-blue-400 ring-inset' 
                  : isTodayCell 
                    ? 'bg-blue-50' 
                    : 'bg-white hover:bg-gray-50'
              }`}
              onMouseDown={() => handlers.handleEmptyMouseDown(property.id, day)}
              onMouseEnter={() => handlers.handleEmptyMouseEnter(property.id, day)}
              onMouseUp={handlers.handleEmptyMouseUp}
            >
              {/* Block indicator */}
              {blockOnDay && (
                <div 
                  className="absolute inset-0 bg-gray-300 opacity-50 cursor-pointer"
                  onClick={() => handlers.onBlockClick?.(blockOnDay)}
                  title={`Bloqueio: ${blockOnDay.reason || 'Sem motivo'}`}
                />
              )}
              
              {/* Reservations */}
              {allReservationsOnDay.map((res, resIdx) => {
                // Calcular duração da reserva em dias
                const checkIn = parseDateLocal((res as any).checkIn) || new Date();
                const checkOut = parseDateLocal((res as any).checkOut) || new Date();
                const durationDays = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
                
                return (
                  <div
                    key={res.id || resIdx}
                    className="absolute inset-0 flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlers.onReservationClick(res);
                    }}
                  >
                    <ReservationCard
                      reservation={res}
                      days={durationDays}
                      onClick={() => handlers.onReservationClick(res)}
                    />
                  </div>
                );
              })}
            </td>
          );
        })}
      </tr>
      
      {/* Expanded rows (only render if expanded) */}
      {isExpanded && (
        <>
          {/* Condição % row */}
          <tr className="border-b border-gray-100 bg-orange-50">
            <td
              className="sticky left-0 z-30 bg-orange-50 border-r border-gray-200 p-1 pl-12"
              style={{ width: `${leftColWidth}px`, minWidth: `${leftColWidth}px`, maxWidth: `${leftColWidth}px` }}
            >
              <div className="flex items-center gap-2 text-xs text-orange-700">
                <span className="text-orange-600">📊</span>
                <span>Condição %</span>
              </div>
            </td>
            {days.map((day, idx) => {
              const rule = handlers.getRuleForDate(property.id, day, false);
              const conditionPercent = rule?.condition_percent ?? 0;
              const conditionDisplay = conditionPercent !== 0 ? `${conditionPercent > 0 ? '+' : ''}${conditionPercent}%` : '—';
              const isSelected = handlers.isDateInConditionSelection(property.id, day);
              const conditionColor = conditionPercent > 0 
                ? 'text-green-600' 
                : conditionPercent < 0 
                  ? 'text-red-600' 
                  : 'text-gray-400';
              
              return (
                <td
                  key={idx}
                  className={`border-r border-gray-200 p-1 h-8 text-center text-sm cursor-pointer transition-colors select-none min-w-[80px] w-20 ${
                    isSelected ? 'bg-blue-200 ring-2 ring-blue-400 ring-inset' : 'bg-orange-50 hover:bg-orange-100'
                  }`}
                  onMouseDown={() => handlers.handleConditionMouseDown(property.id, day)}
                  onMouseEnter={() => handlers.handleConditionMouseEnter(property.id, day)}
                  onMouseUp={handlers.handleConditionMouseUp}
                >
                  <span className={conditionColor}>{conditionDisplay}</span>
                </td>
              );
            })}
          </tr>

          {/* Restrições row */}
          <tr className="border-b border-gray-100 bg-red-50">
            <td
              className="sticky left-0 z-30 bg-red-50 border-r border-gray-200 p-1 pl-12"
              style={{ width: `${leftColWidth}px`, minWidth: `${leftColWidth}px`, maxWidth: `${leftColWidth}px` }}
            >
              <div className="flex items-center gap-2 text-xs text-red-700">
                <span className="text-red-600">🚫</span>
                <span>Restrições</span>
              </div>
            </td>
            {days.map((day, idx) => {
              const rule = handlers.getRuleForDate(property.id, day, false);
              const restriction = rule?.restriction;
              const restrictionDisplay = restriction || '—';
              const hasRestriction = !!restriction;
              const isSelected = handlers.isDateInRestrictionsSelection(property.id, day);
              
              return (
                <td
                  key={idx}
                  className={`border-r border-gray-200 p-1 h-8 text-center text-xs cursor-pointer transition-colors select-none min-w-[80px] w-20 ${
                    isSelected ? 'bg-blue-200 ring-2 ring-blue-400 ring-inset' : hasRestriction ? 'bg-red-100 hover:bg-red-200' : 'bg-red-50 hover:bg-red-100'
                  }`}
                  onMouseDown={() => handlers.handleRestrictionsMouseDown(property.id, day)}
                  onMouseEnter={() => handlers.handleRestrictionsMouseEnter(property.id, day)}
                  onMouseUp={handlers.handleRestrictionsMouseUp}
                >
                  <span className={hasRestriction ? 'text-red-700 font-medium' : 'text-gray-400'}>
                    {restrictionDisplay}
                  </span>
                </td>
              );
            })}
          </tr>

          {/* Mín. Noites row */}
          <tr className="border-b border-gray-100 bg-blue-50">
            <td
              className="sticky left-0 z-30 bg-blue-50 border-r border-gray-200 p-1 pl-12"
              style={{ width: `${leftColWidth}px`, minWidth: `${leftColWidth}px`, maxWidth: `${leftColWidth}px` }}
            >
              <div className="flex items-center gap-2 text-xs text-blue-700">
                <span className="text-blue-600">🌙</span>
                <span>Mín. noites</span>
              </div>
            </td>
            {days.map((day, idx) => {
              const rule = handlers.getRuleForDate(property.id, day, false);
              const minNights = rule?.min_nights ?? property.minNights ?? 1;
              const isSelected = handlers.isDateInMinNightsSelection(property.id, day);
              
              return (
                <td
                  key={idx}
                  className={`border-r border-gray-200 p-1 h-8 text-center text-sm cursor-pointer transition-colors select-none min-w-[80px] w-20 ${
                    isSelected ? 'bg-blue-200 ring-2 ring-blue-400 ring-inset' : 'bg-blue-50 hover:bg-blue-100'
                  }`}
                  onMouseDown={() => handlers.handleMinNightsMouseDown(property.id, day)}
                  onMouseEnter={() => handlers.handleMinNightsMouseEnter(property.id, day)}
                  onMouseUp={handlers.handleMinNightsMouseUp}
                >
                  <span className="text-blue-700">{minNights}</span>
                </td>
              );
            })}
          </tr>

          {/* Preço base row */}
          <tr className="border-b border-gray-100 bg-green-50">
            <td
              className="sticky left-0 z-30 bg-green-50 border-r border-gray-200 p-1 pl-12"
              style={{ width: `${leftColWidth}px`, minWidth: `${leftColWidth}px`, maxWidth: `${leftColWidth}px` }}
            >
              <div className="flex items-center gap-2 text-xs text-green-700">
                <span className="text-green-600">💵</span>
                <span>Diária (R$)</span>
              </div>
            </td>
            {days.map((day, idx) => {
              const basePrice = property.basePrice ?? 0;
              const isSelected = handlers.isDateInBasePriceSelection(property.id, day);
              
              return (
                <td
                  key={idx}
                  className={`border-r border-gray-200 p-1 h-8 text-center text-sm cursor-pointer transition-colors select-none min-w-[80px] w-20 ${
                    isSelected ? 'bg-blue-200 ring-2 ring-blue-400 ring-inset' : 'bg-green-50 hover:bg-green-100'
                  }`}
                  onMouseDown={() => handlers.handleBasePriceMouseDown(property.id, day)}
                  onMouseEnter={() => handlers.handleBasePriceMouseEnter(property.id, day)}
                  onMouseUp={handlers.handleBasePriceMouseUp}
                >
                  <span className="text-green-700">{basePrice > 0 ? basePrice.toLocaleString('pt-BR') : '—'}</span>
                </td>
              );
            })}
          </tr>

          {/* Package discount rows */}
          {packageRows.map((pkgRule) => {
            const colors = discountColorClasses(pkgRule.preset);
            const label = buildDiscountLabel(pkgRule);
            
            return (
              <tr key={pkgRule.id} className={`border-b border-gray-100 ${colors.rowBg}`}>
                <td
                  className={`sticky left-0 z-30 ${colors.stickyBg} border-r border-gray-200 p-1 pl-12`}
                  style={{ width: `${leftColWidth}px`, minWidth: `${leftColWidth}px`, maxWidth: `${leftColWidth}px` }}
                >
                  <div className={`flex items-center gap-2 text-xs ${colors.text}`}>
                    <span className={colors.iconText}>📦</span>
                    <span>{label}</span>
                  </div>
                </td>
                {days.map((day, idx) => {
                  const basePrice = property.basePrice ?? 0;
                  const discountedPrice = basePrice > 0 
                    ? Math.round(basePrice * (1 - pkgRule.discount_percent / 100))
                    : 0;
                  const isSelected = handlers.isDateInPackagePriceSelection(property.id, day, pkgRule.id);
                  
                  return (
                    <td
                      key={idx}
                      className={`border-r border-gray-200 p-1 h-8 text-center text-sm cursor-pointer transition-colors select-none min-w-[80px] w-20 ${
                        isSelected ? 'bg-blue-200 ring-2 ring-blue-400 ring-inset' : colors.hoverBg
                      }`}
                      onMouseDown={() => handlers.handlePackagePriceMouseDown(property.id, day, pkgRule.id)}
                      onMouseEnter={() => handlers.handlePackagePriceMouseEnter(property.id, day, pkgRule.id)}
                      onMouseUp={handlers.handlePackagePriceMouseUp}
                    >
                      <span className={colors.text}>
                        {discountedPrice > 0 ? discountedPrice.toLocaleString('pt-BR') : '—'}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </>
      )}
    </React.Fragment>
  );
}

// Export memoized component to prevent unnecessary re-renders
export const PropertyCalendarRow = memo(PropertyCalendarRowComponent, (prevProps, nextProps) => {
  // Custom comparison for performance
  const prevData = prevProps.data;
  const nextData = nextProps.data;
  
  // Check if essential data changed
  if (prevData.property.id !== nextData.property.id) return false;
  if (prevData.isExpanded !== nextData.isExpanded) return false;
  if (prevData.leftColWidth !== nextData.leftColWidth) return false;
  if (prevData.days.length !== nextData.days.length) return false;
  if (prevData.reservations.length !== nextData.reservations.length) return false;
  if (prevData.blocks.length !== nextData.blocks.length) return false;
  
  // Check if property data changed
  if (prevData.property.basePrice !== nextData.property.basePrice) return false;
  if (prevData.property.minNights !== nextData.property.minNights) return false;
  if (prevData.property.name !== nextData.property.name) return false;
  if (prevData.property.image !== nextData.property.image) return false;
  
  // Check package rows
  if (prevData.packageRows.length !== nextData.packageRows.length) return false;
  
  // If we get here, props are considered equal
  return true;
});

PropertyCalendarRow.displayName = 'PropertyCalendarRow';
