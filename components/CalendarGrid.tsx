import React, { useState, useEffect } from 'react';
import { Property, Reservation } from '../App';
import { ReservationCard } from './ReservationCard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { BulkPriceConditionModal } from './BulkPriceConditionModal';
import { BulkRestrictionsModal } from './BulkRestrictionsModal';
import { BulkMinNightsModal } from './BulkMinNightsModal';

interface CalendarProps {
  currentMonth: Date;
  properties: Property[];
  reservations: Reservation[];
  blocks?: any[];
  onPriceEdit: (propertyId: string, startDate: Date, endDate: Date) => void;
  onMinNightsEdit: (propertyId: string, startDate: Date, endDate: Date) => void;
  onEmptyClick: (propertyId: string, startDate: Date, endDate: Date) => void;
  onReservationClick: (reservation: Reservation) => void;
  onBlockClick?: (block: any) => void;
}

// Generate calendar days
const getDaysInMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const days: Date[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }
  
  return days;
};

// Mock base prices (por dia)
const getBasePrice = (propertyId: string, date: Date): number => {
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0; // Fri, Sat, Sun
  
  const basePrices: Record<string, { weekday: number; weekend: number }> = {
    '1': { weekday: 300, weekend: 400 },
    '2': { weekday: 250, weekend: 350 },
    '3': { weekday: 200, weekend: 280 },
    '4': { weekday: 280, weekend: 380 }
  };
  
  return isWeekend 
    ? basePrices[propertyId]?.weekend || 300 
    : basePrices[propertyId]?.weekday || 250;
};

const getReservationForPropertyAndDate = (
  propertyId: string,
  date: Date,
  reservations: Reservation[]
): Reservation | null => {
  return reservations.find(r => {
    if (r.propertyId !== propertyId) return false;
    const checkIn = new Date(r.checkIn);
    const checkOut = new Date(r.checkOut);
    checkIn.setHours(0, 0, 0, 0);
    checkOut.setHours(0, 0, 0, 0);
    const currentDate = new Date(date);
    currentDate.setHours(0, 0, 0, 0);
    
    // LÓGICA HOTELEIRA: Check-in ocupa o dia, check-out NÃO ocupa (liberado às 12h)
    // Exemplo: 24→26 ocupa apenas dias 24 e 25 (dia 26 fica livre para nova reserva)
    // Isso PREVINE OVERBOOKING permitindo: reserva A (24-26) + reserva B (26-29) = SEM conflito
    return currentDate >= checkIn && currentDate < checkOut;
  }) || null;
};

const getBlockForPropertyAndDate = (
  propertyId: string,
  date: Date,
  blocks: any[]
): any | null => {
  if (!blocks || blocks.length === 0) return null;
  
  return blocks.find(b => {
    if (b.propertyId !== propertyId) return false;
    
    // Parse dates from YYYY-MM-DD format
    const [startYear, startMonth, startDay] = b.startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = b.endDate.split('-').map(Number);
    
    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);
    
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    
    const currentDate = new Date(date);
    currentDate.setHours(0, 0, 0, 0);
    
    // Mesma lógica hoteleira: startDate ocupa, endDate não ocupa
    return currentDate >= startDate && currentDate < endDate;
  }) || null;
};

// Nova função: Retorna TODAS as reservas que ocupam uma data (para detectar sobreposições)
const getAllReservationsForPropertyAndDate = (
  propertyId: string,
  date: Date,
  reservations: Reservation[]
): Reservation[] => {
  return reservations.filter(r => {
    if (r.propertyId !== propertyId) return false;
    const checkIn = new Date(r.checkIn);
    const checkOut = new Date(r.checkOut);
    checkIn.setHours(0, 0, 0, 0);
    checkOut.setHours(0, 0, 0, 0);
    const currentDate = new Date(date);
    currentDate.setHours(0, 0, 0, 0);
    
    // LÓGICA HOTELEIRA: Check-out não ocupa o dia (previne overbooking)
    return currentDate >= checkIn && currentDate < checkOut;
  });
};

const getPlatformColor = (platform: string) => {
  const colors: Record<string, string> = {
    airbnb: 'bg-red-500',
    booking: 'bg-blue-500',
    direct: 'bg-green-500',
    decolar: 'bg-orange-500'
  };
  return colors[platform] || 'bg-gray-500';
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-800 border-green-300',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    blocked: 'bg-gray-100 text-gray-800 border-gray-300',
    maintenance: 'bg-red-100 text-red-800 border-red-300'
  };
  return colors[status] || 'bg-gray-100';
};

export function Calendar({ 
  currentMonth, 
  properties, 
  reservations,
  blocks = [],
  onPriceEdit,
  onMinNightsEdit,
  onEmptyClick,
  onReservationClick,
  onBlockClick
}: CalendarProps) {
  const days = getDaysInMonth(currentMonth);
  const [priceSelectionStart, setPriceSelectionStart] = useState<{ propertyId: string; date: Date } | null>(null);
  const [priceSelectionEnd, setPriceSelectionEnd] = useState<{ propertyId: string; date: Date } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  
  const [minNightsSelectionStart, setMinNightsSelectionStart] = useState<{ propertyId: string; date: Date } | null>(null);
  const [minNightsSelectionEnd, setMinNightsSelectionEnd] = useState<{ propertyId: string; date: Date } | null>(null);
  const [isSelectingMinNights, setIsSelectingMinNights] = useState(false);
  
  const [emptySelectionStart, setEmptySelectionStart] = useState<{ propertyId: string; date: Date } | null>(null);
  const [emptySelectionEnd, setEmptySelectionEnd] = useState<{ propertyId: string; date: Date } | null>(null);
  const [isSelectingEmpty, setIsSelectingEmpty] = useState(false);

  // Property expansion state
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  
  // Bulk rules expansion state
  const [isBulkRulesExpanded, setIsBulkRulesExpanded] = useState(false);

  // Global/Bulk selection states
  const [globalPriceSelectionStart, setGlobalPriceSelectionStart] = useState<Date | null>(null);
  const [globalPriceSelectionEnd, setGlobalPriceSelectionEnd] = useState<Date | null>(null);
  const [isSelectingGlobalPrice, setIsSelectingGlobalPrice] = useState(false);

  const [globalRestrictionsSelectionStart, setGlobalRestrictionsSelectionStart] = useState<Date | null>(null);
  const [globalRestrictionsSelectionEnd, setGlobalRestrictionsSelectionEnd] = useState<Date | null>(null);
  const [isSelectingGlobalRestrictions, setIsSelectingGlobalRestrictions] = useState(false);

  const [globalMinNightsSelectionStart, setGlobalMinNightsSelectionStart] = useState<Date | null>(null);
  const [globalMinNightsSelectionEnd, setGlobalMinNightsSelectionEnd] = useState<Date | null>(null);
  const [isSelectingGlobalMinNights, setIsSelectingGlobalMinNights] = useState(false);

  // Tooltip position for showing selection range
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [tooltipContent, setTooltipContent] = useState<string>('');

  // Bulk modals state
  const [bulkPriceModalOpen, setBulkPriceModalOpen] = useState(false);
  const [bulkRestrictionsModalOpen, setBulkRestrictionsModalOpen] = useState(false);
  const [bulkMinNightsModalOpen, setBulkMinNightsModalOpen] = useState(false);
  const [selectedBulkDates, setSelectedBulkDates] = useState<{ start: Date; end: Date } | null>(null);

  // Base price row selection states
  const [basePriceSelectionStart, setBasePriceSelectionStart] = useState<{ propertyId: string; date: Date } | null>(null);
  const [basePriceSelectionEnd, setBasePriceSelectionEnd] = useState<{ propertyId: string; date: Date } | null>(null);
  const [isSelectingBasePrice, setIsSelectingBasePrice] = useState(false);

  // Semanal 07 price row selection states
  const [weekly7PriceSelectionStart, setWeekly7PriceSelectionStart] = useState<{ propertyId: string; date: Date } | null>(null);
  const [weekly7PriceSelectionEnd, setWeekly7PriceSelectionEnd] = useState<{ propertyId: string; date: Date } | null>(null);
  const [isSelectingWeekly7Price, setIsSelectingWeekly7Price] = useState(false);

  // Personalizado 15 price row selection states
  const [custom15PriceSelectionStart, setCustom15PriceSelectionStart] = useState<{ propertyId: string; date: Date } | null>(null);
  const [custom15PriceSelectionEnd, setCustom15PriceSelectionEnd] = useState<{ propertyId: string; date: Date } | null>(null);
  const [isSelectingCustom15Price, setIsSelectingCustom15Price] = useState(false);

  // Mensal 28 price row selection states
  const [monthly28PriceSelectionStart, setMonthly28PriceSelectionStart] = useState<{ propertyId: string; date: Date } | null>(null);
  const [monthly28PriceSelectionEnd, setMonthly28PriceSelectionEnd] = useState<{ propertyId: string; date: Date } | null>(null);
  const [isSelectingMonthly28Price, setIsSelectingMonthly28Price] = useState(false);

  const togglePropertyExpansion = (propertyId: string) => {
    setExpandedProperties(prev => {
      const newSet = new Set(prev);
      if (newSet.has(propertyId)) {
        newSet.delete(propertyId);
      } else {
        newSet.add(propertyId);
      }
      return newSet;
    });
  };

  const handlePriceMouseDown = (propertyId: string, date: Date) => {
    setPriceSelectionStart({ propertyId, date });
    setIsSelecting(true);
  };

  const handlePriceMouseEnter = (propertyId: string, date: Date) => {
    if (isSelecting && priceSelectionStart && priceSelectionStart.propertyId === propertyId) {
      setPriceSelectionEnd({ propertyId, date });
    }
  };

  const handlePriceMouseUp = () => {
    if (priceSelectionStart && priceSelectionEnd) {
      const start = priceSelectionStart.date < priceSelectionEnd.date ? priceSelectionStart.date : priceSelectionEnd.date;
      const end = priceSelectionStart.date > priceSelectionEnd.date ? priceSelectionStart.date : priceSelectionEnd.date;
      onPriceEdit(priceSelectionStart.propertyId, start, end);
    } else if (priceSelectionStart) {
      // Single day selection
      onPriceEdit(priceSelectionStart.propertyId, priceSelectionStart.date, priceSelectionStart.date);
    }
    setPriceSelectionStart(null);
    setPriceSelectionEnd(null);
    setIsSelecting(false);
  };

  const isDateInSelection = (propertyId: string, date: Date) => {
    if (!priceSelectionStart || priceSelectionStart.propertyId !== propertyId) return false;
    if (!priceSelectionEnd) return date.getTime() === priceSelectionStart.date.getTime();
    
    const start = priceSelectionStart.date < priceSelectionEnd.date ? priceSelectionStart.date : priceSelectionEnd.date;
    const end = priceSelectionStart.date > priceSelectionEnd.date ? priceSelectionStart.date : priceSelectionEnd.date;
    
    return date >= start && date <= end;
  };

  // Min nights handlers
  const handleMinNightsMouseDown = (propertyId: string, date: Date) => {
    setMinNightsSelectionStart({ propertyId, date });
    setIsSelectingMinNights(true);
  };

  const handleMinNightsMouseEnter = (propertyId: string, date: Date) => {
    if (isSelectingMinNights && minNightsSelectionStart && minNightsSelectionStart.propertyId === propertyId) {
      setMinNightsSelectionEnd({ propertyId, date });
    }
  };

  const handleMinNightsMouseUp = () => {
    if (minNightsSelectionStart && minNightsSelectionEnd) {
      const start = minNightsSelectionStart.date < minNightsSelectionEnd.date ? minNightsSelectionStart.date : minNightsSelectionEnd.date;
      const end = minNightsSelectionStart.date > minNightsSelectionEnd.date ? minNightsSelectionStart.date : minNightsSelectionEnd.date;
      onMinNightsEdit(minNightsSelectionStart.propertyId, start, end);
    } else if (minNightsSelectionStart) {
      onMinNightsEdit(minNightsSelectionStart.propertyId, minNightsSelectionStart.date, minNightsSelectionStart.date);
    }
    setMinNightsSelectionStart(null);
    setMinNightsSelectionEnd(null);
    setIsSelectingMinNights(false);
  };

  const isDateInMinNightsSelection = (propertyId: string, date: Date) => {
    if (!minNightsSelectionStart || minNightsSelectionStart.propertyId !== propertyId) return false;
    if (!minNightsSelectionEnd) return date.getTime() === minNightsSelectionStart.date.getTime();
    
    const start = minNightsSelectionStart.date < minNightsSelectionEnd.date ? minNightsSelectionStart.date : minNightsSelectionEnd.date;
    const end = minNightsSelectionStart.date > minNightsSelectionEnd.date ? minNightsSelectionStart.date : minNightsSelectionEnd.date;
    
    return date >= start && date <= end;
  };

  // Empty space handlers
  const handleEmptyMouseDown = (propertyId: string, date: Date) => {
    setEmptySelectionStart({ propertyId, date });
    setIsSelectingEmpty(true);
  };

  const handleEmptyMouseEnter = (propertyId: string, date: Date) => {
    if (isSelectingEmpty && emptySelectionStart && emptySelectionStart.propertyId === propertyId) {
      // Always update selection end, even if there's a reservation
      // The visual highlighting will stop at days without reservations
      setEmptySelectionEnd({ propertyId, date });
    }
  };

  const handleEmptyMouseUp = () => {
    if (emptySelectionStart && emptySelectionEnd) {
      let start = emptySelectionStart.date < emptySelectionEnd.date ? emptySelectionStart.date : emptySelectionEnd.date;
      let end = emptySelectionStart.date > emptySelectionEnd.date ? emptySelectionStart.date : emptySelectionEnd.date;
      
      // Find the last available day (without reservation) in the selection
      const currentDate = new Date(start);
      const endTime = end.getTime();
      let lastAvailableDate = new Date(start);
      
      while (currentDate.getTime() <= endTime) {
        const hasReservation = getReservationForPropertyAndDate(emptySelectionStart.propertyId, currentDate, reservations);
        if (!hasReservation) {
          lastAvailableDate = new Date(currentDate);
        } else {
          // Stop at first reservation found
          break;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Add one day to the end to make it inclusive (checkout date)
      const checkoutDate = new Date(lastAvailableDate);
      checkoutDate.setDate(checkoutDate.getDate() + 1);
      onEmptyClick(emptySelectionStart.propertyId, start, checkoutDate);
    } else if (emptySelectionStart) {
      // Single day selection: checkin = selected day, checkout = next day
      const checkoutDate = new Date(emptySelectionStart.date);
      checkoutDate.setDate(checkoutDate.getDate() + 1);
      onEmptyClick(emptySelectionStart.propertyId, emptySelectionStart.date, checkoutDate);
    }
    setEmptySelectionStart(null);
    setEmptySelectionEnd(null);
    setIsSelectingEmpty(false);
  };

  const isDateInEmptySelection = (propertyId: string, date: Date) => {
    if (!emptySelectionStart || emptySelectionStart.propertyId !== propertyId) return false;
    if (!emptySelectionEnd) return date.getTime() === emptySelectionStart.date.getTime();
    
    // Normalize dates to compare only date part (ignore time)
    const dateTime = new Date(date).setHours(0, 0, 0, 0);
    const startTime = new Date(emptySelectionStart.date).setHours(0, 0, 0, 0);
    const endTime = new Date(emptySelectionEnd.date).setHours(0, 0, 0, 0);
    
    const start = Math.min(startTime, endTime);
    const end = Math.max(startTime, endTime);
    
    return dateTime >= start && dateTime <= end;
  };

  // Global Price handlers
  const handleGlobalPriceMouseDown = (date: Date, e: React.MouseEvent) => {
    setGlobalPriceSelectionStart(date);
    setIsSelectingGlobalPrice(true);
    updateTooltip(e, date, date);
  };

  const handleGlobalPriceMouseEnter = (date: Date, e: React.MouseEvent) => {
    if (isSelectingGlobalPrice && globalPriceSelectionStart) {
      setGlobalPriceSelectionEnd(date);
      updateTooltip(e, globalPriceSelectionStart, date);
    }
  };

  const handleGlobalPriceMouseUp = () => {
    if (globalPriceSelectionStart) {
      const end = globalPriceSelectionEnd || globalPriceSelectionStart;
      const start = globalPriceSelectionStart < end ? globalPriceSelectionStart : end;
      const finalEnd = globalPriceSelectionStart > end ? globalPriceSelectionStart : end;
      
      setSelectedBulkDates({ start, end: finalEnd });
      setBulkPriceModalOpen(true);
    }
    setGlobalPriceSelectionStart(null);
    setGlobalPriceSelectionEnd(null);
    setIsSelectingGlobalPrice(false);
    setTooltipPosition(null);
  };

  const isDateInGlobalPriceSelection = (date: Date) => {
    if (!globalPriceSelectionStart) return false;
    if (!globalPriceSelectionEnd) return date.getTime() === globalPriceSelectionStart.getTime();
    
    const start = globalPriceSelectionStart < globalPriceSelectionEnd ? globalPriceSelectionStart : globalPriceSelectionEnd;
    const end = globalPriceSelectionStart > globalPriceSelectionEnd ? globalPriceSelectionStart : globalPriceSelectionEnd;
    
    return date >= start && date <= end;
  };

  // Global Restrictions handlers
  const handleGlobalRestrictionsMouseDown = (date: Date, e: React.MouseEvent) => {
    setGlobalRestrictionsSelectionStart(date);
    setIsSelectingGlobalRestrictions(true);
    updateTooltip(e, date, date);
  };

  const handleGlobalRestrictionsMouseEnter = (date: Date, e: React.MouseEvent) => {
    if (isSelectingGlobalRestrictions && globalRestrictionsSelectionStart) {
      setGlobalRestrictionsSelectionEnd(date);
      updateTooltip(e, globalRestrictionsSelectionStart, date);
    }
  };

  const handleGlobalRestrictionsMouseUp = () => {
    if (globalRestrictionsSelectionStart) {
      const end = globalRestrictionsSelectionEnd || globalRestrictionsSelectionStart;
      const start = globalRestrictionsSelectionStart < end ? globalRestrictionsSelectionStart : end;
      const finalEnd = globalRestrictionsSelectionStart > end ? globalRestrictionsSelectionStart : end;
      
      setSelectedBulkDates({ start, end: finalEnd });
      setBulkRestrictionsModalOpen(true);
    }
    setGlobalRestrictionsSelectionStart(null);
    setGlobalRestrictionsSelectionEnd(null);
    setIsSelectingGlobalRestrictions(false);
    setTooltipPosition(null);
  };

  const isDateInGlobalRestrictionsSelection = (date: Date) => {
    if (!globalRestrictionsSelectionStart) return false;
    if (!globalRestrictionsSelectionEnd) return date.getTime() === globalRestrictionsSelectionStart.getTime();
    
    const start = globalRestrictionsSelectionStart < globalRestrictionsSelectionEnd ? globalRestrictionsSelectionStart : globalRestrictionsSelectionEnd;
    const end = globalRestrictionsSelectionStart > globalRestrictionsSelectionEnd ? globalRestrictionsSelectionStart : globalRestrictionsSelectionEnd;
    
    return date >= start && date <= end;
  };

  // Global Min Nights handlers
  const handleGlobalMinNightsMouseDown = (date: Date, e: React.MouseEvent) => {
    setGlobalMinNightsSelectionStart(date);
    setIsSelectingGlobalMinNights(true);
    updateTooltip(e, date, date);
  };

  const handleGlobalMinNightsMouseEnter = (date: Date, e: React.MouseEvent) => {
    if (isSelectingGlobalMinNights && globalMinNightsSelectionStart) {
      setGlobalMinNightsSelectionEnd(date);
      updateTooltip(e, globalMinNightsSelectionStart, date);
    }
  };

  const handleGlobalMinNightsMouseUp = () => {
    if (globalMinNightsSelectionStart) {
      const end = globalMinNightsSelectionEnd || globalMinNightsSelectionStart;
      const start = globalMinNightsSelectionStart < end ? globalMinNightsSelectionStart : end;
      const finalEnd = globalMinNightsSelectionStart > end ? globalMinNightsSelectionStart : end;
      
      setSelectedBulkDates({ start, end: finalEnd });
      setBulkMinNightsModalOpen(true);
    }
    setGlobalMinNightsSelectionStart(null);
    setGlobalMinNightsSelectionEnd(null);
    setIsSelectingGlobalMinNights(false);
    setTooltipPosition(null);
  };

  const isDateInGlobalMinNightsSelection = (date: Date) => {
    if (!globalMinNightsSelectionStart) return false;
    if (!globalMinNightsSelectionEnd) return date.getTime() === globalMinNightsSelectionStart.getTime();
    
    const start = globalMinNightsSelectionStart < globalMinNightsSelectionEnd ? globalMinNightsSelectionStart : globalMinNightsSelectionEnd;
    const end = globalMinNightsSelectionStart > globalMinNightsSelectionEnd ? globalMinNightsSelectionStart : globalMinNightsSelectionEnd;
    
    return date >= start && date <= end;
  };

  // Base Price handlers
  const handleBasePriceMouseDown = (propertyId: string, date: Date) => {
    setBasePriceSelectionStart({ propertyId, date });
    setIsSelectingBasePrice(true);
  };

  const handleBasePriceMouseEnter = (propertyId: string, date: Date) => {
    if (isSelectingBasePrice && basePriceSelectionStart && basePriceSelectionStart.propertyId === propertyId) {
      setBasePriceSelectionEnd({ propertyId, date });
    }
  };

  const handleBasePriceMouseUp = () => {
    if (basePriceSelectionStart && basePriceSelectionEnd) {
      const start = basePriceSelectionStart.date < basePriceSelectionEnd.date ? basePriceSelectionStart.date : basePriceSelectionEnd.date;
      const end = basePriceSelectionStart.date > basePriceSelectionEnd.date ? basePriceSelectionStart.date : basePriceSelectionEnd.date;
      onPriceEdit(basePriceSelectionStart.propertyId, start, end);
    } else if (basePriceSelectionStart) {
      onPriceEdit(basePriceSelectionStart.propertyId, basePriceSelectionStart.date, basePriceSelectionStart.date);
    }
    setBasePriceSelectionStart(null);
    setBasePriceSelectionEnd(null);
    setIsSelectingBasePrice(false);
  };

  const isDateInBasePriceSelection = (propertyId: string, date: Date) => {
    if (!basePriceSelectionStart || basePriceSelectionStart.propertyId !== propertyId) return false;
    if (!basePriceSelectionEnd) return date.getTime() === basePriceSelectionStart.date.getTime();
    
    const start = basePriceSelectionStart.date < basePriceSelectionEnd.date ? basePriceSelectionStart.date : basePriceSelectionEnd.date;
    const end = basePriceSelectionStart.date > basePriceSelectionEnd.date ? basePriceSelectionStart.date : basePriceSelectionEnd.date;
    
    return date >= start && date <= end;
  };

  // Weekly 7 Price handlers
  const handleWeekly7PriceMouseDown = (propertyId: string, date: Date) => {
    setWeekly7PriceSelectionStart({ propertyId, date });
    setIsSelectingWeekly7Price(true);
  };

  const handleWeekly7PriceMouseEnter = (propertyId: string, date: Date) => {
    if (isSelectingWeekly7Price && weekly7PriceSelectionStart && weekly7PriceSelectionStart.propertyId === propertyId) {
      setWeekly7PriceSelectionEnd({ propertyId, date });
    }
  };

  const handleWeekly7PriceMouseUp = () => {
    if (weekly7PriceSelectionStart && weekly7PriceSelectionEnd) {
      const start = weekly7PriceSelectionStart.date < weekly7PriceSelectionEnd.date ? weekly7PriceSelectionStart.date : weekly7PriceSelectionEnd.date;
      const end = weekly7PriceSelectionStart.date > weekly7PriceSelectionEnd.date ? weekly7PriceSelectionStart.date : weekly7PriceSelectionEnd.date;
      onPriceEdit(weekly7PriceSelectionStart.propertyId, start, end);
    } else if (weekly7PriceSelectionStart) {
      onPriceEdit(weekly7PriceSelectionStart.propertyId, weekly7PriceSelectionStart.date, weekly7PriceSelectionStart.date);
    }
    setWeekly7PriceSelectionStart(null);
    setWeekly7PriceSelectionEnd(null);
    setIsSelectingWeekly7Price(false);
  };

  const isDateInWeekly7PriceSelection = (propertyId: string, date: Date) => {
    if (!weekly7PriceSelectionStart || weekly7PriceSelectionStart.propertyId !== propertyId) return false;
    if (!weekly7PriceSelectionEnd) return date.getTime() === weekly7PriceSelectionStart.date.getTime();
    
    const start = weekly7PriceSelectionStart.date < weekly7PriceSelectionEnd.date ? weekly7PriceSelectionStart.date : weekly7PriceSelectionEnd.date;
    const end = weekly7PriceSelectionStart.date > weekly7PriceSelectionEnd.date ? weekly7PriceSelectionStart.date : weekly7PriceSelectionEnd.date;
    
    return date >= start && date <= end;
  };

  // Custom 15 Price handlers
  const handleCustom15PriceMouseDown = (propertyId: string, date: Date) => {
    setCustom15PriceSelectionStart({ propertyId, date });
    setIsSelectingCustom15Price(true);
  };

  const handleCustom15PriceMouseEnter = (propertyId: string, date: Date) => {
    if (isSelectingCustom15Price && custom15PriceSelectionStart && custom15PriceSelectionStart.propertyId === propertyId) {
      setCustom15PriceSelectionEnd({ propertyId, date });
    }
  };

  const handleCustom15PriceMouseUp = () => {
    if (custom15PriceSelectionStart && custom15PriceSelectionEnd) {
      const start = custom15PriceSelectionStart.date < custom15PriceSelectionEnd.date ? custom15PriceSelectionStart.date : custom15PriceSelectionEnd.date;
      const end = custom15PriceSelectionStart.date > custom15PriceSelectionEnd.date ? custom15PriceSelectionStart.date : custom15PriceSelectionEnd.date;
      onPriceEdit(custom15PriceSelectionStart.propertyId, start, end);
    } else if (custom15PriceSelectionStart) {
      onPriceEdit(custom15PriceSelectionStart.propertyId, custom15PriceSelectionStart.date, custom15PriceSelectionStart.date);
    }
    setCustom15PriceSelectionStart(null);
    setCustom15PriceSelectionEnd(null);
    setIsSelectingCustom15Price(false);
  };

  const isDateInCustom15PriceSelection = (propertyId: string, date: Date) => {
    if (!custom15PriceSelectionStart || custom15PriceSelectionStart.propertyId !== propertyId) return false;
    if (!custom15PriceSelectionEnd) return date.getTime() === custom15PriceSelectionStart.date.getTime();
    
    const start = custom15PriceSelectionStart.date < custom15PriceSelectionEnd.date ? custom15PriceSelectionStart.date : custom15PriceSelectionEnd.date;
    const end = custom15PriceSelectionStart.date > custom15PriceSelectionEnd.date ? custom15PriceSelectionStart.date : custom15PriceSelectionEnd.date;
    
    return date >= start && date <= end;
  };

  // Monthly 28 Price handlers
  const handleMonthly28PriceMouseDown = (propertyId: string, date: Date) => {
    setMonthly28PriceSelectionStart({ propertyId, date });
    setIsSelectingMonthly28Price(true);
  };

  const handleMonthly28PriceMouseEnter = (propertyId: string, date: Date) => {
    if (isSelectingMonthly28Price && monthly28PriceSelectionStart && monthly28PriceSelectionStart.propertyId === propertyId) {
      setMonthly28PriceSelectionEnd({ propertyId, date });
    }
  };

  const handleMonthly28PriceMouseUp = () => {
    if (monthly28PriceSelectionStart && monthly28PriceSelectionEnd) {
      const start = monthly28PriceSelectionStart.date < monthly28PriceSelectionEnd.date ? monthly28PriceSelectionStart.date : monthly28PriceSelectionEnd.date;
      const end = monthly28PriceSelectionStart.date > monthly28PriceSelectionEnd.date ? monthly28PriceSelectionStart.date : monthly28PriceSelectionEnd.date;
      onPriceEdit(monthly28PriceSelectionStart.propertyId, start, end);
    } else if (monthly28PriceSelectionStart) {
      onPriceEdit(monthly28PriceSelectionStart.propertyId, monthly28PriceSelectionStart.date, monthly28PriceSelectionStart.date);
    }
    setMonthly28PriceSelectionStart(null);
    setMonthly28PriceSelectionEnd(null);
    setIsSelectingMonthly28Price(false);
  };

  const isDateInMonthly28PriceSelection = (propertyId: string, date: Date) => {
    if (!monthly28PriceSelectionStart || monthly28PriceSelectionStart.propertyId !== propertyId) return false;
    if (!monthly28PriceSelectionEnd) return date.getTime() === monthly28PriceSelectionStart.date.getTime();
    
    const start = monthly28PriceSelectionStart.date < monthly28PriceSelectionEnd.date ? monthly28PriceSelectionStart.date : monthly28PriceSelectionEnd.date;
    const end = monthly28PriceSelectionStart.date > monthly28PriceSelectionEnd.date ? monthly28PriceSelectionStart.date : monthly28PriceSelectionEnd.date;
    
    return date >= start && date <= end;
  };

  // Tooltip helper
  const updateTooltip = (e: React.MouseEvent, startDate: Date, endDate: Date) => {
    const start = startDate < endDate ? startDate : endDate;
    const end = startDate > endDate ? startDate : endDate;
    
    const formatDate = (date: Date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const content = nights === 1 
      ? formatDate(start)
      : `${formatDate(start)} - ${formatDate(end)} (${nights} dias)`;
    
    setTooltipContent(content);
    setTooltipPosition({ x: e.clientX + 10, y: e.clientY + 10 });
  };

  // Global mouseup listener to handle selection end
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelecting) handlePriceMouseUp();
      if (isSelectingMinNights) handleMinNightsMouseUp();
      if (isSelectingEmpty) handleEmptyMouseUp();
      if (isSelectingGlobalPrice) handleGlobalPriceMouseUp();
      if (isSelectingGlobalRestrictions) handleGlobalRestrictionsMouseUp();
      if (isSelectingGlobalMinNights) handleGlobalMinNightsMouseUp();
      if (isSelectingBasePrice) handleBasePriceMouseUp();
      if (isSelectingWeekly7Price) handleWeekly7PriceMouseUp();
      if (isSelectingCustom15Price) handleCustom15PriceMouseUp();
      if (isSelectingMonthly28Price) handleMonthly28PriceMouseUp();
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isSelecting, isSelectingMinNights, isSelectingEmpty, isSelectingGlobalPrice, isSelectingGlobalRestrictions, isSelectingGlobalMinNights, isSelectingBasePrice, isSelectingWeekly7Price, isSelectingCustom15Price, isSelectingMonthly28Price]);

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col h-full">
        <div className="flex-1 overflow-auto">
          <TooltipProvider>
            <table className="w-full border-collapse">
            {/* Header with days - Sticky (fixo durante rolagem vertical e horizontal) */}
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="sticky top-0 left-0 z-40 bg-gray-50 border-r border-gray-200 p-2 text-left min-w-[200px] shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                  <span className="text-sm text-gray-600">Padrão</span>
                </th>
                {days.map((day, idx) => (
                  <th
                    key={idx}
                    className="sticky top-0 z-30 border-r border-gray-200 p-1.5 min-w-[80px] text-center bg-gray-50"
                  >
                    <div className="flex flex-col items-center gap-0 py-0.5">
                      <div className="text-sm text-gray-900 font-medium">
                        {day.getDate()}
                      </div>
                      <div className="text-gray-500 text-2xs uppercase leading-tight">
                        {day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                      </div>
                      <div className="text-gray-400 text-2xs leading-tight">
                        {day.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

              <tbody>
                {/* Regras em Lote Section */}
                <tr className="border-b border-gray-200 bg-gray-100">
                  <td className="sticky left-0 z-10 bg-gray-100 border-r border-gray-200 p-2">
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
                  </td>
                  {days.map((day, idx) => (
                    <td key={idx} className="border-r border-gray-200 bg-gray-100"></td>
                  ))}
                </tr>

                {/* Bulk Rules rows - Only shown when expanded */}
                {isBulkRulesExpanded && (
                  <>
                    {/* Condição (%) row - GLOBAL */}
                    <tr className="border-b border-gray-100 bg-orange-50">
                      <td className="sticky left-0 z-10 bg-orange-50 border-r border-gray-200 p-1 pl-8">
                        <div className="flex items-center gap-2 text-xs text-orange-700">
                          <span className="text-orange-600">%</span>
                          <span>Condição (%)</span>
                        </div>
                      </td>
                      {days.map((day, idx) => {
                        const isSelected = isDateInGlobalPriceSelection(day);
                        return (
                          <td
                            key={idx}
                            className={`border-r border-gray-200 p-1 h-8 text-center text-xs cursor-pointer transition-colors select-none ${
                              isSelected ? 'bg-blue-200 ring-2 ring-blue-400 ring-inset' : 'bg-orange-50 hover:bg-orange-100'
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

                    {/* Restrições row - GLOBAL */}
                    <tr className="border-b border-gray-100 bg-red-50">
                      <td className="sticky left-0 z-10 bg-red-50 border-r border-gray-200 p-1 pl-8">
                        <div className="flex items-center gap-2 text-xs text-red-700">
                          <span className="text-red-600">🚫</span>
                          <span>Restrições</span>
                        </div>
                      </td>
                      {days.map((day, idx) => {
                        const dayOfWeek = day.getDay();
                        const isSunday = dayOfWeek === 0;
                        const isSelected = isDateInGlobalRestrictionsSelection(day);
                        return (
                          <td
                            key={idx}
                            className={`border-r border-gray-200 p-1 h-8 text-center text-xs cursor-pointer transition-colors select-none ${
                              isSelected ? 'bg-blue-200 ring-2 ring-blue-400 ring-inset' : 
                              isSunday ? 'bg-red-200 hover:bg-red-300' : 'bg-red-50 hover:bg-red-100'
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

                    {/* Mín. Noites row - GLOBAL */}
                    <tr className="border-b border-gray-200 bg-blue-50">
                      <td className="sticky left-0 z-10 bg-blue-50 border-r border-gray-200 p-1 pl-8">
                        <div className="flex items-center gap-2 text-xs text-blue-700">
                          <span className="text-blue-600">🌙</span>
                          <span>Mín. noites</span>
                        </div>
                      </td>
                      {days.map((day, idx) => {
                        const isSelected = isDateInGlobalMinNightsSelection(day);
                        return (
                          <td
                            key={idx}
                            className={`border-r border-gray-200 p-1 h-8 text-center text-xs cursor-pointer transition-colors select-none ${
                              isSelected ? 'bg-blue-300 ring-2 ring-blue-500 ring-inset' : 'bg-blue-50 hover:bg-blue-100'
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

                {/* Anúncios - Imóveis Section Header */}
                <tr className="border-b border-gray-200 bg-gray-50">
                  <td className="sticky left-0 z-10 bg-gray-50 border-r border-gray-200 p-2">
                    <span className="text-sm text-gray-700">Anúncios - Imóveis</span>
                  </td>
                  {days.map((day, idx) => (
                    <td key={idx} className="border-r border-gray-200 bg-gray-50"></td>
                  ))}
                </tr>

              {properties.map((property) => {
                const isExpanded = expandedProperties.has(property.id);
                
                return (
                  <React.Fragment key={property.id}>
                    {/* Reservations row */}
                    <tr className="border-b border-gray-200">
                      <td 
                        className="sticky left-0 z-10 bg-white border-r border-gray-200 p-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={property.image}
                            alt={property.name}
                            className="w-9 h-9 rounded object-cover"
                          />
                          <div className="flex-1">
                            <div className="text-sm text-gray-900">{property.name}</div>
                            <div className="text-gray-500 text-xs">{property.type}</div>
                          </div>
                          <button
                            onClick={() => togglePropertyExpansion(property.id)}
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
                      {days.map((day, idx) => {
                        const allReservationsOnDay = getAllReservationsForPropertyAndDate(property.id, day, reservations);
                        const blockOnDay = getBlockForPropertyAndDate(property.id, day, blocks);
                        const isSelected = isDateInEmptySelection(property.id, day);
                        
                        // Renderizar apenas reservas que COMEÇAM neste dia (primeira célula)
                        const reservationsStartingToday = allReservationsOnDay.filter(r => 
                          new Date(r.checkIn).toDateString() === day.toDateString()
                        );
                        
                        // Verificar se o bloqueio COMEÇA neste dia
                        const blockStartsToday = blockOnDay && blockOnDay.startDate === day.toISOString().split('T')[0];
                        
                        return (
                          <td
                            key={idx}
                            className={`border-r border-gray-200 p-0.5 h-12 align-top relative group ${
                              allReservationsOnDay.length === 0 && !blockOnDay
                                ? `hover:bg-blue-50 ${isSelectingEmpty ? 'cursor-grabbing' : 'cursor-pointer'}` 
                                : ''
                            }`}
                            onMouseDown={() => allReservationsOnDay.length === 0 && !blockOnDay && handleEmptyMouseDown(property.id, day)}
                            onMouseEnter={() => handleEmptyMouseEnter(property.id, day)}
                            onMouseUp={handleEmptyMouseUp}
                            style={{ userSelect: 'none' }}
                          >
                            {/* Selection highlight - BELOW reservation (z-index lower) */}
                            {isSelected && (
                              <div className="absolute inset-0 bg-blue-100 border-2 border-blue-400 pointer-events-none z-0" />
                            )}
                            
                            {/* Renderizar bloqueio se começar neste dia */}
                            {blockStartsToday && (
                              <div
                                className="absolute top-0.5 h-11 bg-orange-100 border border-orange-400 rounded flex items-center justify-center z-10 cursor-pointer hover:bg-orange-200 transition-colors"
                                style={{
                                  left: '40px', // LÓGICA HOTELEIRA: check-in às 14h (meio da célula)
                                  width: `${(blockOnDay.nights * 80) - 6}px` // Cada dia = 80px, termina às 12h do último dia
                                }}
                                onClick={() => onBlockClick?.(blockOnDay)}
                                title={`Bloqueio: ${blockOnDay.reason || 'Manutenção'}`}
                              >
                                <div className="text-xs text-orange-800 px-2 truncate">
                                  <span className="font-medium">🔧 {blockOnDay.reason || 'Manutenção'}</span>
                                  {blockOnDay.notes && <div className="text-2xs opacity-75 truncate">{blockOnDay.notes}</div>}
                                </div>
                              </div>
                            )}
                            
                            {/* Renderizar todas as reservas que COMEÇAM neste dia */}
                            {reservationsStartingToday.map((reservation, resIdx) => {
                              // Check for adjacent reservations
                              let hasAdjacentPrev = false;
                              let hasAdjacentNext = false;
                              
                              const checkOutDate = new Date(reservation.checkOut);
                              checkOutDate.setHours(0, 0, 0, 0);
                              
                              // Check if there's a reservation starting on this reservation's checkout day
                              const nextReservation = reservations.find(r => {
                                if (r.propertyId !== property.id || r.id === reservation.id) return false;
                                const nextCheckIn = new Date(r.checkIn);
                                nextCheckIn.setHours(0, 0, 0, 0);
                                return nextCheckIn.getTime() === checkOutDate.getTime();
                              });
                              hasAdjacentNext = !!nextReservation;
                              
                              // Check if there's a reservation ending on this reservation's checkin day
                              const checkInDate = new Date(reservation.checkIn);
                              checkInDate.setHours(0, 0, 0, 0);
                              
                              const prevReservation = reservations.find(r => {
                                if (r.propertyId !== property.id || r.id === reservation.id) return false;
                                const prevCheckOut = new Date(r.checkOut);
                                prevCheckOut.setHours(0, 0, 0, 0);
                                return prevCheckOut.getTime() === checkInDate.getTime();
                              });
                              hasAdjacentPrev = !!prevReservation;
                              
                              return (
                                <div 
                                  key={reservation.id} 
                                  className={resIdx < reservationsStartingToday.length - 1 ? 'mb-1' : ''}
                                  onClick={() => onReservationClick(reservation)}
                                >
                                  <ReservationCard
                                    reservation={reservation}
                                    days={reservation.nights}
                                    hasAdjacentNext={hasAdjacentNext}
                                    hasAdjacentPrev={hasAdjacentPrev}
                                    stackIndex={resIdx}
                                    totalStacked={reservationsStartingToday.length}
                                  />
                                </div>
                              );
                            })}
                            
                            {allReservationsOnDay.length === 0 && !blockOnDay && (
                              <div className="h-full flex items-center justify-center text-xs text-gray-400 group-hover:text-blue-500 transition-colors">
                                {isSelected ? (
                                  <span className="text-blue-600 font-semibold">✓</span>
                                ) : (
                                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">+</span>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Property-specific rows - Only shown when expanded */}
                    {isExpanded && (
                      <>
                        {/* Condições row */}
                        <tr className="border-b border-gray-100 bg-orange-50">
                          <td className="sticky left-0 z-10 bg-orange-50 border-r border-gray-200 p-1 pl-12">
                            <div className="flex items-center gap-2 text-xs text-orange-700">
                              <span className="text-orange-600">%</span>
                              <span>Condição (%)</span>
                            </div>
                          </td>
                          {days.map((day, idx) => {
                            const isSelected = isDateInSelection(property.id, day);
                            return (
                              <td
                                key={idx}
                                className={`border-r border-gray-200 p-1 h-8 text-center text-sm cursor-pointer transition-colors select-none ${
                                  isSelected ? 'bg-blue-200 ring-2 ring-blue-400 ring-inset' : 'bg-orange-50 hover:bg-orange-100'
                                }`}
                                onMouseDown={() => handlePriceMouseDown(property.id, day)}
                                onMouseEnter={() => handlePriceMouseEnter(property.id, day)}
                                onMouseUp={handlePriceMouseUp}
                              >
                                <span className="text-green-600">+15%</span>
                              </td>
                            );
                          })}
                        </tr>

                        {/* Restrições row */}
                        <tr className="border-b border-gray-100 bg-red-50">
                          <td className="sticky left-0 z-10 bg-red-50 border-r border-gray-200 p-1 pl-12">
                            <div className="flex items-center gap-2 text-xs text-red-700">
                              <span className="text-red-600">🚫</span>
                              <span>Restrições</span>
                            </div>
                          </td>
                          {days.map((day, idx) => (
                            <td
                              key={idx}
                              className="border-r border-gray-200 p-1 h-8 text-center text-xs bg-red-50 cursor-pointer hover:bg-red-100"
                            >
                              —
                            </td>
                          ))}
                        </tr>

                        {/* Mín. Noites row */}
                        <tr className="border-b border-gray-100 bg-blue-50">
                          <td className="sticky left-0 z-10 bg-blue-50 border-r border-gray-200 p-1 pl-12">
                            <div className="flex items-center gap-2 text-xs text-blue-700">
                              <span className="text-blue-600">🌙</span>
                              <span>Mín. noites</span>
                            </div>
                          </td>
                          {days.map((day, idx) => {
                            const isSelected = isDateInMinNightsSelection(property.id, day);
                            return (
                              <td
                                key={idx}
                                className={`border-r border-gray-200 p-1 h-8 text-center text-xs cursor-pointer transition-colors select-none ${
                                  isSelected ? 'bg-blue-300 ring-2 ring-blue-500 ring-inset' : 'bg-blue-50 hover:bg-blue-100'
                                }`}
                                onMouseDown={() => handleMinNightsMouseDown(property.id, day)}
                                onMouseEnter={() => handleMinNightsMouseEnter(property.id, day)}
                                onMouseUp={handleMinNightsMouseUp}
                              >
                                <span className="text-blue-700">1</span>
                              </td>
                            );
                          })}
                        </tr>

                        {/* Base (R$) row */}
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <td className="sticky left-0 z-10 bg-gray-50 border-r border-gray-200 p-1 pl-12">
                            <div className="flex items-center gap-2 text-xs text-gray-700">
                              <span className="text-gray-600">💰</span>
                              <span>Base (R$)</span>
                            </div>
                          </td>
                          {days.map((day, idx) => {
                            const isSelected = isDateInBasePriceSelection(property.id, day);
                            return (
                              <td
                                key={idx}
                                className={`border-r border-gray-200 p-1 h-8 text-center text-xs cursor-pointer transition-colors select-none ${
                                  isSelected ? 'bg-blue-200 ring-2 ring-blue-400 ring-inset' : 'bg-gray-50 hover:bg-gray-100'
                                }`}
                                onMouseDown={() => handleBasePriceMouseDown(property.id, day)}
                                onMouseEnter={() => handleBasePriceMouseEnter(property.id, day)}
                                onMouseUp={handleBasePriceMouseUp}
                              >
                                <span className="text-blue-600">398</span>
                              </td>
                            );
                          })}
                        </tr>

                        {/* Semanal 07 (R$) row */}
                        <tr className="border-b border-gray-100 bg-cyan-50">
                          <td className="sticky left-0 z-10 bg-cyan-50 border-r border-gray-200 p-1 pl-12">
                            <div className="flex items-center gap-2 text-xs text-cyan-700">
                              <span className="text-cyan-600">📅</span>
                              <span>Semanal 07 (R$)</span>
                            </div>
                          </td>
                          {days.map((day, idx) => {
                            const isSelected = isDateInWeekly7PriceSelection(property.id, day);
                            return (
                              <td
                                key={idx}
                                className={`border-r border-gray-200 p-1 h-8 text-center text-xs cursor-pointer transition-colors select-none ${
                                  isSelected ? 'bg-blue-200 ring-2 ring-blue-400 ring-inset' : 'bg-cyan-50 hover:bg-cyan-100'
                                }`}
                                onMouseDown={() => handleWeekly7PriceMouseDown(property.id, day)}
                                onMouseEnter={() => handleWeekly7PriceMouseEnter(property.id, day)}
                                onMouseUp={handleWeekly7PriceMouseUp}
                              >
                                <span className="text-blue-600">390.04</span>
                              </td>
                            );
                          })}
                        </tr>

                        {/* Personalizado 15 (R$) row */}
                        <tr className="border-b border-gray-100 bg-purple-50">
                          <td className="sticky left-0 z-10 bg-purple-50 border-r border-gray-200 p-1 pl-12">
                            <div className="flex items-center gap-2 text-xs text-purple-700">
                              <span className="text-purple-600">⭐</span>
                              <span>Personalizado 15 (R$)</span>
                            </div>
                          </td>
                          {days.map((day, idx) => {
                            const isSelected = isDateInCustom15PriceSelection(property.id, day);
                            return (
                              <td
                                key={idx}
                                className={`border-r border-gray-200 p-1 h-8 text-center text-xs cursor-pointer transition-colors select-none ${
                                  isSelected ? 'bg-blue-200 ring-2 ring-blue-400 ring-inset' : 'bg-purple-50 hover:bg-purple-100'
                                }`}
                                onMouseDown={() => handleCustom15PriceMouseDown(property.id, day)}
                                onMouseEnter={() => handleCustom15PriceMouseEnter(property.id, day)}
                                onMouseUp={handleCustom15PriceMouseUp}
                              >
                                <span className="text-blue-600">382.08</span>
                              </td>
                            );
                          })}
                        </tr>

                        {/* Mensal 28 (R$) row */}
                        <tr className="border-b border-gray-200 bg-teal-50">
                          <td className="sticky left-0 z-10 bg-teal-50 border-r border-gray-200 p-1 pl-12">
                            <div className="flex items-center gap-2 text-xs text-teal-700">
                              <span className="text-teal-600">📆</span>
                              <span>Mensal 28 (R$)</span>
                            </div>
                          </td>
                          {days.map((day, idx) => {
                            const isSelected = isDateInMonthly28PriceSelection(property.id, day);
                            return (
                              <td
                                key={idx}
                                className={`border-r border-gray-200 p-1 h-8 text-center text-xs cursor-pointer transition-colors select-none ${
                                  isSelected ? 'bg-blue-200 ring-2 ring-blue-400 ring-inset' : 'bg-teal-50 hover:bg-teal-100'
                                }`}
                                onMouseDown={() => handleMonthly28PriceMouseDown(property.id, day)}
                                onMouseEnter={() => handleMonthly28PriceMouseEnter(property.id, day)}
                                onMouseUp={handleMonthly28PriceMouseUp}
                              >
                                <span className="text-blue-600">350.24</span>
                              </td>
                            );
                          })}
                        </tr>
                      </>
                    )}
                  </React.Fragment>
                );
              })}
              </tbody>
            </table>

          </TooltipProvider>
        </div>
      </div>

      {/* Drag Selection Tooltip - Mostra quantas noites estão selecionadas */}
      {isSelectingEmpty && emptySelectionStart && emptySelectionEnd && (() => {
        const start = emptySelectionStart.date < emptySelectionEnd.date 
          ? emptySelectionStart.date 
          : emptySelectionEnd.date;
        const end = emptySelectionStart.date > emptySelectionEnd.date 
          ? emptySelectionStart.date 
          : emptySelectionEnd.date;
        
        const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const checkIn = start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        const checkOut = new Date(end.getTime() + 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        
        return (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">📅</span>
                <div className="flex flex-col">
                  <span className="text-xs opacity-90">Selecionando</span>
                  <span className="font-semibold">{nights} noite{nights > 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="h-8 w-px bg-white/30" />
              <div className="text-sm">
                {checkIn} → {checkOut}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Selection Tooltip - Caixinha preta */}
      {tooltipPosition && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
          }}
        >
          <div className="bg-black text-white text-xs px-3 py-1.5 rounded shadow-lg whitespace-nowrap">
            {tooltipContent}
          </div>
        </div>
      )}

      {/* Bulk Modals */}
      {selectedBulkDates && (
        <>
          <BulkPriceConditionModal
            isOpen={bulkPriceModalOpen}
            onClose={() => setBulkPriceModalOpen(false)}
            startDate={selectedBulkDates.start}
            endDate={selectedBulkDates.end}
            properties={properties}
            onSave={(data) => {
              console.log('Bulk Price Condition saved:', data);
              console.log('Properties affected:', properties.map(p => p.id));
              // TODO: Implement bulk price condition logic for selected properties only
            }}
          />

          <BulkRestrictionsModal
            isOpen={bulkRestrictionsModalOpen}
            onClose={() => setBulkRestrictionsModalOpen(false)}
            startDate={selectedBulkDates.start}
            endDate={selectedBulkDates.end}
            properties={properties}
            onSave={(data) => {
              console.log('Bulk Restrictions saved:', data);
              console.log('Properties affected:', properties.map(p => p.id));
              // TODO: Implement bulk restrictions logic for selected properties only
            }}
          />

          <BulkMinNightsModal
            isOpen={bulkMinNightsModalOpen}
            onClose={() => setBulkMinNightsModalOpen(false)}
            startDate={selectedBulkDates.start}
            endDate={selectedBulkDates.end}
            properties={properties}
            onSave={(data) => {
              console.log('Bulk Min Nights saved:', data);
              console.log('Properties affected:', properties.map(p => p.id));
              // TODO: Implement bulk min nights logic for selected properties only
            }}
          />
        </>
      )}
    </>
  );
}
