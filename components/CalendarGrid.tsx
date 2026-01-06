import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Property, Reservation } from '../App';
import { ReservationCard } from './ReservationCard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { BulkPriceConditionModal } from './BulkPriceConditionModal';
import { BulkRestrictionsModal } from './BulkRestrictionsModal';
import { BulkMinNightsModal } from './BulkMinNightsModal';
import { CalendarHeaderDates } from './CalendarHeaderDates';
import { CalendarBulkRules } from './CalendarBulkRules';
import { parseDateLocal } from '../utils/dateLocal';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { useCalendarPricingRules, CalendarPricingRule } from '../hooks/useCalendarPricingRules';

type DiscountPackagePreset = 'weekly' | 'monthly' | 'custom';

type DiscountPackageRule = {
  id: string;
  preset: DiscountPackagePreset;
  min_nights: number;
  discount_percent: number;
};

type DiscountPackagesSettings = {
  rules: DiscountPackageRule[];
};

const DEFAULT_DISCOUNT_PACKAGES_SETTINGS: DiscountPackagesSettings = {
  rules: [
    { id: 'weekly', preset: 'weekly', min_nights: 7, discount_percent: 2 },
    { id: 'custom_15', preset: 'custom', min_nights: 15, discount_percent: 4 },
    { id: 'monthly', preset: 'monthly', min_nights: 28, discount_percent: 12 }
  ]
};

function getFunctionHeaders(): Record<string, string> {
  const token = localStorage.getItem('rendizy-token');
  return {
    apikey: publicAnonKey,
    Authorization: `Bearer ${publicAnonKey}`,
    ...(token ? { 'X-Auth-Token': token } : {})
  };
}

function buildDiscountLabel(rule: DiscountPackageRule): string {
  const nn = String(rule.min_nights ?? 0).padStart(2, '0');
  if (rule.preset === 'weekly') return `Semanal 07 (R$)`;
  if (rule.preset === 'monthly') return `Mensal 28 (R$)`;
  return `Personalizado ${nn} (R$)`;
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

interface CalendarProps {
  currentMonth: Date;
  properties: Property[];
  reservations: Reservation[];
  blocks?: any[];
  dateRange?: { from: Date; to: Date };
  onPriceEdit: (propertyId: string, startDate: Date, endDate: Date) => void;
  onMinNightsEdit: (propertyId: string, startDate: Date, endDate: Date) => void;
  onEmptyClick: (propertyId: string, startDate: Date, endDate: Date) => void;
  onReservationClick: (reservation: Reservation) => void;
  onBlockClick?: (block: any) => void;
}

function splitTwoLines(input: string, firstLineMax = 30, secondLineMax = 30): { line1: string; line2?: string } {
  const text = (input || '').trim().replace(/\s+/g, ' ');
  if (!text) return { line1: 'Sem nome' };

  const words = text.split(' ').filter(Boolean);

  const fitWords = (startIndex: number, maxLen: number): { line: string; nextIndex: number } => {
    if (startIndex >= words.length) return { line: '', nextIndex: startIndex };

    const firstWord = words[startIndex];
    if ((firstWord || '').length > maxLen) {
      // Palavra maior que o limite: não quebrar; deixa truncar via CSS.
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

  // Adiciona reticências sem quebrar palavras: se não couber, remove palavras do fim.
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
    // fallback: se ficou vazio, volta para original e deixa truncar via CSS
    line2 = `${l2.line}${ellipsis}`;
  }

  return { line1: l1.line, line2 };
}

// Generate calendar days
// Suporta dateRange para gerar 60+ dias através de múltiplos meses
const getDaysInMonth = (date: Date, dateRange?: { from: Date; to: Date }) => {
  // Se dateRange fornecido, gerar todos os dias do range
  if (dateRange) {
    const days: Date[] = [];
    // ✅ FIX v1.0.103.407: Incluir o dia anterior ao from para ver cards de reservas que terminam hoje
    const currentDate = new Date(dateRange.from);
    currentDate.setDate(currentDate.getDate() - 1); // Começar 1 dia antes
    currentDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateRange.to);
    endDate.setHours(0, 0, 0, 0);
    
    while (currentDate <= endDate) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }
  
  // Fallback: gerar apenas o mês atual (comportamento original)
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const days: Date[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }
  
  return days;
};



const getReservationForPropertyAndDate = (
  propertyId: string,
  date: Date,
  reservations: Reservation[]
): Reservation | null => {
  return reservations.find(r => {
    if (r.propertyId !== propertyId) return false;
    const checkIn = parseDateLocal((r as any).checkIn) || new Date(0);
    const checkOut = parseDateLocal((r as any).checkOut) || new Date(0);
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
  // ✅ FIX v1.0.103.365: Usar data local em vez de UTC para evitar problemas de fuso horário
  const formatLocalDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const debugInfo = {
    blocksReceived: blocks?.length || 0,
    propertyIdSearching: propertyId,
    dateSearching: formatLocalDate(date)  // ✅ Usar data local
  };
  
  if (!blocks || blocks.length === 0) {
    // Logar apenas na primeira chamada para evitar spam
    if (debugInfo.dateSearching.endsWith('-19')) {
      console.log('🔍 [getBlockForPropertyAndDate] Sem bloqueios ou array vazio', debugInfo);
    }
    return null;
  }
  
  // ✅ FIX: Normalizar datas de bloqueio para YYYY-MM-DD
  // Alguns registros podem vir como ISO (ex: 2026-01-06T00:00:00.000Z).
  // Também suportar backend/ambientes que retornam snake_case.
  const toYmd = (v: unknown): string => {
    if (!v) return '';
    const s = String(v).trim();
    if (!s) return '';
    return s.split('T')[0].split(' ')[0];
  };

  const currentDateStr = formatLocalDate(date);

  const foundBlockRaw = blocks.find((b: any) => {
    const blockPropertyId = String(b?.propertyId ?? b?.property_id ?? '').trim();
    if (!blockPropertyId || blockPropertyId !== propertyId) return false;

    const startYmd = toYmd(b?.startDate ?? b?.start_date);
    const endYmd = toYmd(b?.endDate ?? b?.end_date);

    // Block ocupa de startDate (inclusive) até endDate (exclusive)
    const matches = !!startYmd && !!endYmd && currentDateStr >= startYmd && currentDateStr < endYmd;

    if (matches) {
      console.log('✅ [getBlockForPropertyAndDate] Bloqueio encontrado:', {
        blockId: b?.id,
        propertyId: blockPropertyId,
        startDate: startYmd,
        endDate: endYmd,
        currentDateStr,
        nights: b?.nights,
      });
    }

    return matches;
  }) || null;

  if (!foundBlockRaw) return null;

  // Retornar bloco com shape consistente para o resto do CalendarGrid
  return {
    ...foundBlockRaw,
    propertyId: String(foundBlockRaw?.propertyId ?? foundBlockRaw?.property_id ?? '').trim(),
    startDate: toYmd(foundBlockRaw?.startDate ?? foundBlockRaw?.start_date),
    endDate: toYmd(foundBlockRaw?.endDate ?? foundBlockRaw?.end_date),
  };
};

// Nova função: Retorna TODAS as reservas que ocupam uma data (para detectar sobreposições)
const getAllReservationsForPropertyAndDate = (
  propertyId: string,
  date: Date,
  reservations: Reservation[]
): Reservation[] => {
  // ✅ FIX v1.0.103.365: Usar comparação de strings para evitar timezone issues
  const formatLocalDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const currentDateStr = formatLocalDate(date);
  
  return reservations.filter(r => {
    if (r.propertyId !== propertyId) return false;
    
    // Extrair apenas YYYY-MM-DD das strings de checkIn/checkOut
    const checkInStr = r.checkIn.split('T')[0];
    const checkOutStr = r.checkOut.split('T')[0];
    
    // LÓGICA HOTELEIRA: Check-out não ocupa o dia (previne overbooking)
    return currentDateStr >= checkInStr && currentDateStr < checkOutStr;
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
  dateRange,
  onPriceEdit,
  onMinNightsEdit,
  onEmptyClick,
  onReservationClick,
  onBlockClick
}: CalendarProps) {
  const propertyCollator = useMemo(
    () => new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true }),
    []
  );

  const sortedProperties = useMemo(() => {
    const keyFor = (p: Property): string => {
      const raw = String((p as any)?.internalId || (p as any)?.name || '').trim();
      if (!raw) return `\uffff\uffff\uffff-${String((p as any)?.id ?? '')}`;
      return raw;
    };

    return [...(properties || [])].sort((a, b) => {
      const ka = keyFor(a);
      const kb = keyFor(b);
      const byName = propertyCollator.compare(ka, kb);
      if (byName !== 0) return byName;
      return String((a as any)?.id ?? '').localeCompare(String((b as any)?.id ?? ''));
    });
  }, [properties, propertyCollator]);

  const formatPriceCell = (value: number | undefined | null): string => {
    if (value === null || value === undefined) return '—';
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return '—';
    const rounded = Math.round(n * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  };

  // Coluna de imóveis redimensionável (splitter)
  const DEFAULT_LEFT_COL_WIDTH = 180;
  const MIN_LEFT_COL_WIDTH = 160;
  const MAX_LEFT_COL_WIDTH = 420;
  const [leftColWidth, setLeftColWidth] = useState<number>(DEFAULT_LEFT_COL_WIDTH);
  const resizingRef = useRef<{ startX: number; startWidth: number; isResizing: boolean }>({
    startX: 0,
    startWidth: DEFAULT_LEFT_COL_WIDTH,
    isResizing: false
  });

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current.isResizing) return;
      const next = resizingRef.current.startWidth + (e.clientX - resizingRef.current.startX);
      const clamped = Math.max(MIN_LEFT_COL_WIDTH, Math.min(MAX_LEFT_COL_WIDTH, next));
      setLeftColWidth(clamped);
    };

    const onMouseUp = () => {
      if (!resizingRef.current.isResizing) return;
      resizingRef.current.isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const startResizeLeftCol = (e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = { startX: e.clientX, startWidth: leftColWidth, isResizing: true };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  // 🔍 DEBUG: Verificar se bloqueios chegam como props
        useEffect(() => {
          // Logs removidos para melhorar performance de renderização
        }, [blocks, properties, reservations]);
  
  // Usar dateRange se fornecido, senão usar currentMonth (memoizado)
  const days = useMemo(() => {
    return dateRange ? getDaysInMonth(currentMonth, dateRange) : getDaysInMonth(currentMonth);
  }, [currentMonth, dateRange]);
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

  // Discount packages (Semanal 07 / Personalizado NN / Mensal 28)
  const [discountPackages, setDiscountPackages] = useState<DiscountPackagesSettings>(DEFAULT_DISCOUNT_PACKAGES_SETTINGS);

  // Organization ID para regras de calendário
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  // Hook de regras de calendário (multi-tenant)
  const {
    rules: calendarRules,
    getRuleForDate,
    upsertRule,
    bulkUpsertRules,
    loading: rulesLoading,
    refreshRules
  } = useCalendarPricingRules({
    organizationId,
    dateRange
  });

  // Base price row selection states
  const [basePriceSelectionStart, setBasePriceSelectionStart] = useState<{ propertyId: string; date: Date } | null>(null);
  const [basePriceSelectionEnd, setBasePriceSelectionEnd] = useState<{ propertyId: string; date: Date } | null>(null);
  const [isSelectingBasePrice, setIsSelectingBasePrice] = useState(false);

  // Discount package price row selection (generic)
  const [packagePriceSelectionStart, setPackagePriceSelectionStart] = useState<{ key: string; propertyId: string; date: Date } | null>(null);
  const [packagePriceSelectionEnd, setPackagePriceSelectionEnd] = useState<{ key: string; propertyId: string; date: Date } | null>(null);
  const [isSelectingPackagePrice, setIsSelectingPackagePrice] = useState(false);

  const normalizePackageRows = (settings: unknown): DiscountPackageRule[] => {
    const rules = Array.isArray((settings as any)?.rules) ? ((settings as any).rules as DiscountPackageRule[]) : [];
    return rules
      .map((r) => ({
        ...r,
        min_nights: r.preset === 'weekly' ? 7 : r.preset === 'monthly' ? 28 : Math.max(1, Math.round(Number((r as any).min_nights || 1))),
        discount_percent: Math.min(100, Math.max(0, Number((r as any).discount_percent || 0)))
      }))
      .sort((a, b) => a.min_nights - b.min_nights);
  };

  const orgPackageRows = useMemo(() => normalizePackageRows(discountPackages), [discountPackages]);

  const packageRowsByPropertyId = useMemo(() => {
    const map = new Map<string, DiscountPackageRule[]>();

    for (const p of sortedProperties) {
      const rawOverride = (p as any)?.discountPackagesOverride;

      let override: any = rawOverride;
      if (typeof override === 'string') {
        try {
          override = JSON.parse(override);
        } catch {
          override = null;
        }
      }

      const effective = override && Array.isArray(override?.rules) ? override : discountPackages;
      map.set(String((p as any)?.id ?? ''), normalizePackageRows(effective));
    }

    return map;
  }, [sortedProperties, discountPackages]);

  useEffect(() => {
    const loadDiscountPackages = async () => {
      try {
        const meUrl = `https://${projectId}.supabase.co/functions/v1/rendizy-server/auth/me`;
        const meResp = await fetch(meUrl, { headers: getFunctionHeaders() });
        const meData = await meResp.json();

        if (!meResp.ok || !meData?.success) {
          return;
        }

        const orgId = String(meData?.user?.organizationId ?? meData?.user?.organization?.id ?? '').trim();
        if (!orgId) return;

        // Guardar organizationId para uso no hook de regras
        setOrganizationId(orgId);

        const url = `https://${projectId}.supabase.co/functions/v1/rendizy-server/organizations/${orgId}/discount-packages`;
        const resp = await fetch(url, { headers: getFunctionHeaders() });
        const data = await resp.json();
        if (!resp.ok || !data?.success) return;

        setDiscountPackages((data.settings ?? DEFAULT_DISCOUNT_PACKAGES_SETTINGS) as DiscountPackagesSettings);
      } catch {
        // silent: calendar should remain usable
      }
    };

    loadDiscountPackages();
  }, []);

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
            // Evitar logs a cada célula para reduzir overhead
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

  // Discount package price handlers (generic)
  const handlePackagePriceMouseDown = (key: string, propertyId: string, date: Date) => {
    setPackagePriceSelectionStart({ key, propertyId, date });
    setIsSelectingPackagePrice(true);
  };

  const handlePackagePriceMouseEnter = (key: string, propertyId: string, date: Date) => {
    if (isSelectingPackagePrice && packagePriceSelectionStart && packagePriceSelectionStart.key === key && packagePriceSelectionStart.propertyId === propertyId) {
      setPackagePriceSelectionEnd({ key, propertyId, date });
    }
  };

  const handlePackagePriceMouseUp = () => {
    if (packagePriceSelectionStart && packagePriceSelectionEnd) {
      const start = packagePriceSelectionStart.date < packagePriceSelectionEnd.date ? packagePriceSelectionStart.date : packagePriceSelectionEnd.date;
      const end = packagePriceSelectionStart.date > packagePriceSelectionEnd.date ? packagePriceSelectionStart.date : packagePriceSelectionEnd.date;
      onPriceEdit(packagePriceSelectionStart.propertyId, start, end);
    } else if (packagePriceSelectionStart) {
      onPriceEdit(packagePriceSelectionStart.propertyId, packagePriceSelectionStart.date, packagePriceSelectionStart.date);
    }
    setPackagePriceSelectionStart(null);
    setPackagePriceSelectionEnd(null);
    setIsSelectingPackagePrice(false);
  };

  const isDateInPackagePriceSelection = (key: string, propertyId: string, date: Date) => {
    if (!packagePriceSelectionStart || packagePriceSelectionStart.key !== key || packagePriceSelectionStart.propertyId !== propertyId) return false;
    if (!packagePriceSelectionEnd) return date.getTime() === packagePriceSelectionStart.date.getTime();

    const start = packagePriceSelectionStart.date < packagePriceSelectionEnd.date ? packagePriceSelectionStart.date : packagePriceSelectionEnd.date;
    const end = packagePriceSelectionStart.date > packagePriceSelectionEnd.date ? packagePriceSelectionStart.date : packagePriceSelectionEnd.date;
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
      if (isSelectingPackagePrice) handlePackagePriceMouseUp();
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isSelecting, isSelectingMinNights, isSelectingEmpty, isSelectingGlobalPrice, isSelectingGlobalRestrictions, isSelectingGlobalMinNights, isSelectingBasePrice, isSelectingPackagePrice]);

  return (
    <div className="relative h-full w-full overflow-auto">
      <div className="relative w-max min-w-full">
        {/* ✅ FIX v1.0.103.428: Headers + Tabela em estrutura simples */}
        <TooltipProvider>
        {/* Header das Datas - STICKY TOP-0 */}
        <CalendarHeaderDates days={days} leftColWidth={leftColWidth} />

        {/* Tabela com Regras em Lote e Propriedades */}
        <table className="w-max min-w-full border-collapse bg-white">
          <thead className="sticky top-16 z-40 bg-white border-b border-gray-200 shadow-md">
              {/* ✅ FIX v1.0.103.426: Regras em Lote em componente separado */}
              <CalendarBulkRules
                days={days}
                isBulkRulesExpanded={isBulkRulesExpanded}
                setIsBulkRulesExpanded={setIsBulkRulesExpanded}
                isDateInGlobalPriceSelection={isDateInGlobalPriceSelection}
                isDateInGlobalRestrictionsSelection={isDateInGlobalRestrictionsSelection}
                isDateInGlobalMinNightsSelection={isDateInGlobalMinNightsSelection}
                handleGlobalPriceMouseDown={handleGlobalPriceMouseDown}
                handleGlobalPriceMouseEnter={handleGlobalPriceMouseEnter}
                handleGlobalPriceMouseUp={handleGlobalPriceMouseUp}
                handleGlobalRestrictionsMouseDown={handleGlobalRestrictionsMouseDown}
                handleGlobalRestrictionsMouseEnter={handleGlobalRestrictionsMouseEnter}
                handleGlobalRestrictionsMouseUp={handleGlobalRestrictionsMouseUp}
                handleGlobalMinNightsMouseDown={handleGlobalMinNightsMouseDown}
                handleGlobalMinNightsMouseEnter={handleGlobalMinNightsMouseEnter}
                handleGlobalMinNightsMouseUp={handleGlobalMinNightsMouseUp}
                getGlobalRuleForDate={(date) => getRuleForDate(null, date, false)}
              />

              {/* Anúncios - Imóveis Section Header */}
              <tr className="border-b border-gray-200 bg-gray-50">
                <td
                  className="sticky left-0 z-30 bg-gray-50 border-r border-gray-200 p-2 relative"
                  style={{ width: `${leftColWidth}px`, minWidth: `${leftColWidth}px`, maxWidth: `${leftColWidth}px` }}
                >
                  <span className="text-sm text-gray-700">Anúncios - Imóveis</span>
                  <div
                    className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-gray-200"
                    onMouseDown={startResizeLeftCol}
                    title="Arraste para ajustar a largura"
                  />
                </td>
                {days.map((day, idx) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const dayNormalized = new Date(day);
                  dayNormalized.setHours(0, 0, 0, 0);
                  const isToday = dayNormalized.getTime() === today.getTime();

                  return (
                    <td
                      key={idx}
                      className={`border-r border-gray-200 min-w-[80px] w-20 ${
                        isToday ? 'bg-blue-50' : 'bg-gray-50'
                      }`}
                    />
                  );
                })}
              </tr>
            </thead>

            {/* ✅ FIX v1.0.103.426: Corpo da tabela - ROLA */}
            <tbody>
              {sortedProperties.map((property) => {
                const isExpanded = expandedProperties.has(property.id);
                const packageRowsForProperty = packageRowsByPropertyId.get(property.id) ?? orgPackageRows;
                
                return (
                  <React.Fragment key={property.id}>
                    {/* Reservations row */}
                    <tr className="border-b border-gray-200">
                      <td 
                        className="sticky left-0 z-30 bg-white border-r border-gray-200 p-1.5 relative"
                        style={{ width: `${leftColWidth}px`, minWidth: `${leftColWidth}px`, maxWidth: `${leftColWidth}px` }}
                      >
                        <div className="flex items-center gap-2">
                          {/* Imagem menor com lazy-loading para identificação rápida do imóvel */}
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
                                  href={`/anuncios-ultimate/${property.id}/edit`}
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
                        <div
                          className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-gray-200"
                          onMouseDown={startResizeLeftCol}
                          title="Arraste para ajustar a largura"
                        />
                      </td>
                      {days.map((day, idx) => {
                        const allReservationsOnDay = getAllReservationsForPropertyAndDate(property.id, day, reservations);
                        const blockOnDay = getBlockForPropertyAndDate(property.id, day, blocks);
                        const isSelected = isDateInEmptySelection(property.id, day);
                        
                        // ✅ FIX v1.0.103.407: Detectar dia atual para destaque
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const dayNormalized = new Date(day);
                        dayNormalized.setHours(0, 0, 0, 0);
                        const isToday = dayNormalized.getTime() === today.getTime();
                        
                        // ✅ FIX v1.0.103.366: Helper para extrair data local sem timezone
                        const formatLocalDate = (d: Date): string => {
                          const year = d.getFullYear();
                          const month = String(d.getMonth() + 1).padStart(2, '0');
                          const dayNum = String(d.getDate()).padStart(2, '0');
                          return `${year}-${month}-${dayNum}`;
                        };
                        
                        const dayStr = formatLocalDate(day);

                        const MS_PER_DAY = 24 * 60 * 60 * 1000;
                        const normalizeDateOnly = (d: Date): Date => {
                          const nd = new Date(d);
                          nd.setHours(0, 0, 0, 0);
                          return nd;
                        };
                        const ymdToUtcMs = (ymd: string): number => {
                          const [y, m, d] = ymd.split('-').map(Number);
                          return Date.UTC(y, (m || 1) - 1, d || 1);
                        };
                        const utcMsFromLocalDate = (d: Date): number => {
                          return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
                        };
                        const diffDays = (from: Date, to: Date): number => {
                          // Usa UTC midnight para evitar bugs de timezone/DST
                          const a = utcMsFromLocalDate(normalizeDateOnly(from));
                          const b = utcMsFromLocalDate(normalizeDateOnly(to));
                          return Math.round((b - a) / MS_PER_DAY);
                        };

                        const visibleEnd = normalizeDateOnly(days[days.length - 1]);
                        const visibleEndExclusive = new Date(visibleEnd);
                        visibleEndExclusive.setDate(visibleEndExclusive.getDate() + 1);
                        const visibleEndStr = formatLocalDate(visibleEnd);
                        const visibleEndExclusiveUtcMs = ymdToUtcMs(visibleEndStr) + MS_PER_DAY;
                        const cellDate = normalizeDateOnly(day);
                        const cellUtcMs = ymdToUtcMs(dayStr);

                        const BASE_CARD_LEFT_PX = 40;
                        const CONTINUING_LEFT_PX = -12; // passa por baixo da borda/sticky
                        
                        // ✅ FIX v1.0.103.411: Renderizar apenas reservas que COMEÇAM neste dia
                        // O card já se estende naturalmente pelos dias (width = nights * 80px)
                        // Com dia anterior incluído no range, vemos a continuação dos cards automaticamente
                        const reservationsStartingToday = allReservationsOnDay.filter(r => {
                          const checkInStr = r.checkIn.split('T')[0];
                          return checkInStr === dayStr;
                        });

                        // ✅ FIX v1.0.105.xxx: Reservas que começaram ANTES do range visível e ainda estão ativas
                        // precisam ser ancoradas no primeiro dia visível (senão o card some na borda esquerda).
                        const reservationsContinuingIntoView = (idx === 0)
                          ? allReservationsOnDay.filter(r => {
                              const checkInStr = r.checkIn.split('T')[0];
                              return checkInStr < dayStr;
                            })
                          : [];

                        const reservationsAnchoredToday = idx === 0
                          ? [...reservationsStartingToday, ...reservationsContinuingIntoView]
                          : reservationsStartingToday;
                        
                        // Normalizar datas do bloqueio (pode vir ISO)
                        const blockStartYmd = blockOnDay?.startDate ? String(blockOnDay.startDate).split('T')[0].split(' ')[0] : '';
                        const blockEndYmd = blockOnDay?.endDate ? String(blockOnDay.endDate).split('T')[0].split(' ')[0] : '';

                        // Verificar se o bloqueio deve renderizar ancorado neste dia
                        // - Se começa hoje: renderiza normalmente
                        // - Se começou antes do range visível: renderiza no 1º dia visível (idx === 0)
                        const blockAnchoredToday = !!blockOnDay && (
                          blockStartYmd === dayStr ||
                          (idx === 0 && blockStartYmd < dayStr)
                        );

                        // ✅ Recorte do bloqueio dentro do range visível
                        // Block ocupa de startDate (inclusive) até endDate (exclusive)
                        const parseYmdToLocalDate = (ymd: string): Date => {
                          // Força local midnight para evitar deslocamento de timezone
                          return normalizeDateOnly(new Date(`${ymd}T00:00:00`));
                        };
                        const blockEndExclusive = blockEndYmd
                          ? parseYmdToLocalDate(blockEndYmd)
                          : null;
                        const clippedBlockEndExclusive = (blockEndExclusive && blockEndExclusive.getTime() > visibleEndExclusive.getTime())
                          ? visibleEndExclusive
                          : blockEndExclusive;
                        const visibleBlockNights = (blockOnDay && clippedBlockEndExclusive)
                          ? Math.max(1, diffDays(cellDate, clippedBlockEndExclusive))
                          : (blockOnDay?.nights || 1);
                        
                        // Debug APENAS para primeiras iterações
                        if (idx < 5 && blockOnDay) {
                          console.log('🔍 [CalendarGrid] Bloqueio detectado:', {
                            dayStr,  // ✅ Usar dayStr local
                            blockStartDate: blockOnDay.startDate,
                            blockAnchoredToday,
                            blockNights: blockOnDay.nights,
                            propertyId: property.id
                          });
                        }
                        
                        return (
                          <td
                            key={idx}
                            className={`border-r border-gray-200 p-0.5 h-12 align-top relative group min-w-[80px] w-20 ${
                              isToday ? 'bg-blue-50' : ''
                            } ${
                              allReservationsOnDay.length === 0 && !blockOnDay
                                ? `hover:bg-blue-100 ${isSelectingEmpty ? 'cursor-grabbing' : 'cursor-pointer'}` 
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
                            
                            {/* Renderizar bloqueio ancorado neste dia */}
                            {blockAnchoredToday && (
                              <div
                                className="absolute top-0.5 h-11 bg-orange-100 border border-orange-400 rounded flex items-center justify-center z-10 cursor-pointer hover:bg-orange-200 transition-colors"
                                style={{
                                  left: `${(idx === 0 && blockStartYmd < dayStr) ? CONTINUING_LEFT_PX : BASE_CARD_LEFT_PX}px`,
                                  width: `${((visibleBlockNights * 80) - 6) + (BASE_CARD_LEFT_PX - ((idx === 0 && blockStartYmd < dayStr) ? CONTINUING_LEFT_PX : BASE_CARD_LEFT_PX))}px`,
                                  borderRadius: (idx === 0 && blockStartYmd < dayStr) ? '0 8px 8px 0' : '8px'
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
                            
                            {/* ✅ FIX v1.0.103.411: Renderizar apenas reservas que começam neste dia */}
                            {/* O card se estende automaticamente pelos dias - não duplicar! */}
                            {reservationsAnchoredToday.map((reservation, resIdx) => {
                              // Check for adjacent reservations
                              let hasAdjacentPrev = false;
                              let hasAdjacentNext = false;

                              const reservationCheckInStr = reservation.checkIn.split('T')[0];
                              const reservationCheckOutStr = reservation.checkOut.split('T')[0];
                              
                              // Check if there's a reservation starting on this reservation's checkout day
                              const nextReservation = reservations.find(r => {
                                if (r.propertyId !== property.id || r.id === reservation.id) return false;
                                const nextCheckInStr = r.checkIn.split('T')[0];
                                return nextCheckInStr === reservationCheckOutStr;
                              });
                              hasAdjacentNext = !!nextReservation;
                              
                              // Check if there's a reservation ending on this reservation's checkin day
                              const prevReservation = reservations.find(r => {
                                if (r.propertyId !== property.id || r.id === reservation.id) return false;
                                const prevCheckOutStr = r.checkOut.split('T')[0];
                                return prevCheckOutStr === reservationCheckInStr;
                              });
                              hasAdjacentPrev = !!prevReservation;

                              // ✅ Recorte do card dentro do range visível
                              // - Se a reserva começou antes do primeiro dia, renderiza a partir do 1º dia
                              // - Se termina depois do último dia visível, encurta para não “vazar”
                              const segmentEndExclusiveUtcMs = Math.min(ymdToUtcMs(reservationCheckOutStr), visibleEndExclusiveUtcMs);
                              const visibleNights = Math.max(1, Math.round((segmentEndExclusiveUtcMs - cellUtcMs) / MS_PER_DAY));

                              const isContinuingFromLeft = idx === 0 && reservationCheckInStr < dayStr;
                              const cardLeftPx = isContinuingFromLeft ? CONTINUING_LEFT_PX : BASE_CARD_LEFT_PX;
                              const widthAdjustPx = BASE_CARD_LEFT_PX - cardLeftPx;

                              const effectiveHasAdjacentPrev = hasAdjacentPrev || isContinuingFromLeft;
                              
                              return (
                                <div 
                                  key={reservation.id} 
                                  className={resIdx < reservationsAnchoredToday.length - 1 ? 'mb-1' : ''}
                                  onClick={() => onReservationClick(reservation)}
                                >
                                  <ReservationCard
                                    reservation={reservation}
                                    days={visibleNights}
                                    hasAdjacentNext={hasAdjacentNext}
                                    hasAdjacentPrev={effectiveHasAdjacentPrev}
                                    stackIndex={resIdx}
                                    totalStacked={reservationsAnchoredToday.length}
                                    leftPx={cardLeftPx}
                                    widthAdjustPx={widthAdjustPx}
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
                          <td
                            className="sticky left-0 z-30 bg-orange-50 border-r border-gray-200 p-1 pl-12"
                            style={{ width: `${leftColWidth}px`, minWidth: `${leftColWidth}px`, maxWidth: `${leftColWidth}px` }}
                          >
                            <div className="flex items-center gap-2 text-xs text-orange-700">
                              <span className="text-orange-600">%</span>
                              <span>Condição (%)</span>
                            </div>
                          </td>
                          {days.map((day, idx) => {
                            const isSelected = isDateInSelection(property.id, day);
                            // Buscar regra do banco para esta data
                            const rule = getRuleForDate(property.id, day, false);
                            const conditionPercent = rule?.condition_percent ?? 0;
                            const conditionDisplay = conditionPercent !== 0 
                              ? (conditionPercent > 0 ? `+${conditionPercent}%` : `${conditionPercent}%`)
                              : '—';
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
                                onMouseDown={() => handlePriceMouseDown(property.id, day)}
                                onMouseEnter={() => handlePriceMouseEnter(property.id, day)}
                                onMouseUp={handlePriceMouseUp}
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
                            // Buscar regra do banco para esta data
                            const rule = getRuleForDate(property.id, day, false);
                            const restriction = rule?.restriction;
                            const restrictionDisplay = restriction || '—';
                            const hasRestriction = !!restriction;
                            return (
                              <td
                                key={idx}
                                className={`border-r border-gray-200 p-1 h-8 text-center text-xs cursor-pointer hover:bg-red-100 min-w-[80px] w-20 ${
                                  hasRestriction ? 'bg-red-100' : 'bg-red-50'
                                }`}
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
                            const isSelected = isDateInMinNightsSelection(property.id, day);
                            // Buscar regra do banco para esta data
                            const rule = getRuleForDate(property.id, day, false);
                            const minNights = rule?.min_nights ?? 1;
                            const hasCustomMinNights = minNights > 1;
                            return (
                              <td
                                key={idx}
                                className={`border-r border-gray-200 p-1 h-8 text-center text-xs cursor-pointer transition-colors select-none min-w-[80px] w-20 ${
                                  isSelected ? 'bg-blue-300 ring-2 ring-blue-500 ring-inset' : hasCustomMinNights ? 'bg-blue-100' : 'bg-blue-50 hover:bg-blue-100'
                                }`}
                                onMouseDown={() => handleMinNightsMouseDown(property.id, day)}
                                onMouseEnter={() => handleMinNightsMouseEnter(property.id, day)}
                                onMouseUp={handleMinNightsMouseUp}
                              >
                                <span className={hasCustomMinNights ? 'text-blue-800 font-medium' : 'text-blue-700'}>{minNights}</span>
                              </td>
                            );
                          })}
                        </tr>

                        {/* Base (R$) row */}
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <td
                            className="sticky left-0 z-30 bg-gray-50 border-r border-gray-200 p-1 pl-12"
                            style={{ width: `${leftColWidth}px`, minWidth: `${leftColWidth}px`, maxWidth: `${leftColWidth}px` }}
                          >
                            <div className="flex items-center gap-2 text-xs text-gray-700">
                              <span className="text-gray-600">💰</span>
                              <span>Base (R$)</span>
                            </div>
                          </td>
                          {days.map((day, idx) => {
                            const isSelected = isDateInBasePriceSelection(property.id, day);
                            const basePrice = property.basePrice;
                            return (
                              <td
                                key={idx}
                                className={`border-r border-gray-200 p-1 h-8 text-center text-xs cursor-pointer transition-colors select-none min-w-[80px] w-20 ${
                                  isSelected ? 'bg-blue-200 ring-2 ring-blue-400 ring-inset' : 'bg-gray-50 hover:bg-gray-100'
                                }`}
                                onMouseDown={() => handleBasePriceMouseDown(property.id, day)}
                                onMouseEnter={() => handleBasePriceMouseEnter(property.id, day)}
                                onMouseUp={handleBasePriceMouseUp}
                              >
                                <span className="text-blue-600">{formatPriceCell(basePrice)}</span>
                              </td>
                            );
                          })}
                        </tr>

                        {/* Discount packages rows (Semanal 07 / Personalizado NN / Mensal 28) */}
                        {packageRowsForProperty.map((rule) => {
                          const classes = discountColorClasses(rule.preset);
                          const icon = rule.preset === 'weekly' ? '📅' : rule.preset === 'monthly' ? '📆' : '⭐';
                          const label = buildDiscountLabel(rule);
                          return (
                            <tr key={rule.id} className={`border-b border-gray-100 ${classes.rowBg}`}>
                              <td
                                className={`sticky left-0 z-30 ${classes.stickyBg} border-r border-gray-200 p-1 pl-12`}
                                style={{ width: `${leftColWidth}px`, minWidth: `${leftColWidth}px`, maxWidth: `${leftColWidth}px` }}
                              >
                                <div className={`flex items-center gap-2 text-xs ${classes.text}`}>
                                  <span className={classes.iconText}>{icon}</span>
                                  <span>{label}</span>
                                </div>
                              </td>
                              {days.map((day, idx) => {
                                const isSelected = isDateInPackagePriceSelection(rule.id, property.id, day);
                                const basePrice = property.basePrice;
                                const discounted =
                                  typeof basePrice === 'number'
                                    ? basePrice * (1 - (Number(rule.discount_percent || 0) / 100))
                                    : undefined;
                                return (
                                  <td
                                    key={idx}
                                    className={`border-r border-gray-200 p-1 h-8 text-center text-xs cursor-pointer transition-colors select-none min-w-[80px] w-20 ${
                                      isSelected ? 'bg-blue-200 ring-2 ring-blue-400 ring-inset' : classes.hoverBg
                                    }`}
                                    onMouseDown={() => handlePackagePriceMouseDown(rule.id, property.id, day)}
                                    onMouseEnter={() => handlePackagePriceMouseEnter(rule.id, property.id, day)}
                                    onMouseUp={handlePackagePriceMouseUp}
                                  >
                                    <span className="text-blue-600">{formatPriceCell(discounted)}</span>
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
              })}
              </tbody>
            </table>
        </TooltipProvider>

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
            properties={sortedProperties}
            onSave={(data) => {
              console.log('Bulk Price Condition saved:', data);
              console.log('Properties affected:', sortedProperties.map(p => p.id));
              // TODO: Implement bulk price condition logic for selected properties only
            }}
          />

          <BulkRestrictionsModal
            isOpen={bulkRestrictionsModalOpen}
            onClose={() => setBulkRestrictionsModalOpen(false)}
            startDate={selectedBulkDates.start}
            endDate={selectedBulkDates.end}
            properties={sortedProperties}
            onSave={(data) => {
              console.log('Bulk Restrictions saved:', data);
              console.log('Properties affected:', sortedProperties.map(p => p.id));
              // TODO: Implement bulk restrictions logic for selected properties only
            }}
          />

          <BulkMinNightsModal
            isOpen={bulkMinNightsModalOpen}
            onClose={() => setBulkMinNightsModalOpen(false)}
            startDate={selectedBulkDates.start}
            endDate={selectedBulkDates.end}
            properties={sortedProperties}
            onSave={(data) => {
              console.log('Bulk Min Nights saved:', data);
              console.log('Properties affected:', sortedProperties.map(p => p.id));
              // TODO: Implement bulk min nights logic for selected properties only
            }}
          />
        </>
      )}
      </div>
    </div>
  );
}
