/**
 * CALENDAR CONTEXT
 * Gerencia estado centralizado do calendário sem afetar UI existente
 * v1.1.0 - Adicionado URL sync para persistência de filtros
 * 
 * 🔗 URL SYNC:
 * - Filtros são persistidos na URL (view, props, from, to, types)
 * - Permite compartilhar links com filtros aplicados
 * - Refresh mantém o estado dos filtros
 */

import React, { createContext, useContext, useReducer, ReactNode, useEffect, useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { parseISO, isValid, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import type { Property, Reservation } from '../App';

// ============================================
// TYPES
// ============================================

interface CalendarState {
  // Properties
  properties: Property[];
  selectedProperties: string[];
  loadingProperties: boolean;
  
  // Reservations & Blocks
  reservations: Reservation[];
  blocks: any[];
  loadingReservations: boolean;
  
  // UI State
  currentView: 'calendar' | 'list' | 'timeline';
  currentMonth: Date;
  dateRange: { from: Date; to: Date };
  selectedReservationTypes: string[];
  
  // Refresh
  refreshKey: number;
}

type CalendarAction =
  | { type: 'SET_PROPERTIES'; payload: Property[] }
  | { type: 'SET_LOADING_PROPERTIES'; payload: boolean }
  | { type: 'TOGGLE_PROPERTY'; payload: string }
  | { type: 'SET_SELECTED_PROPERTIES'; payload: string[] }
  | { type: 'SET_RESERVATIONS'; payload: Reservation[] }
  | { type: 'SET_BLOCKS'; payload: any[] }
  | { type: 'SET_LOADING_RESERVATIONS'; payload: boolean }
  | { type: 'SET_VIEW'; payload: 'calendar' | 'list' | 'timeline' }
  | { type: 'SET_MONTH'; payload: Date }
  | { type: 'SET_DATE_RANGE'; payload: { from: Date; to: Date } }
  | { type: 'SET_RESERVATION_TYPES'; payload: string[] }
  | { type: 'TRIGGER_REFRESH' };

interface CalendarContextValue {
  state: CalendarState;
  dispatch: React.Dispatch<CalendarAction>;
  
  // Helper methods (mantém compatibilidade com código existente)
  setProperties: (properties: Property[]) => void;
  setSelectedProperties: (properties: string[] | ((prev: string[]) => string[])) => void;
  setReservations: (reservations: Reservation[]) => void;
  setBlocks: (blocks: any[]) => void;
  setCurrentView: (view: 'calendar' | 'list' | 'timeline') => void;
  setCurrentMonth: (date: Date) => void;
  setDateRange: (range: { from: Date; to: Date }) => void;
  setSelectedReservationTypes: (types: string[]) => void;
  triggerRefresh: () => void;
  
  // 🔗 URL sync helpers
  copyFilterUrl: () => void;
  resetAllFilters: () => void;
  applyFilters: () => void;
  hasActiveFilters: boolean;
  hasPendingChanges: boolean;
  urlCopied: boolean;
  
  // Draft state (para exibição nos filtros)
  draftView: 'calendar' | 'list' | 'timeline';
  draftDateRange: { from: Date; to: Date };
  draftSelectedProperties: string[];
  draftReservationTypes: string[];
  setDraftView: (view: 'calendar' | 'list' | 'timeline') => void;
  setDraftDateRange: (range: { from: Date; to: Date }) => void;
  setDraftSelectedProperties: (props: string[] | ((prev: string[]) => string[])) => void;
  setDraftReservationTypes: (types: string[]) => void;
}

// ============================================
// INITIAL STATE - Começando a partir de HOJE
// ============================================

const today = new Date();
const oneMonthFromNow = new Date(today);
oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

const initialState: CalendarState = {
  properties: [],
  selectedProperties: [],
  loadingProperties: false,
  
  reservations: [],
  blocks: [],
  loadingReservations: false,
  
  currentView: 'calendar',
  currentMonth: today,
  dateRange: {
    from: today,
    to: oneMonthFromNow
  },
  selectedReservationTypes: ['pending', 'confirmed', 'checked_in', 'checked_out'],
  
  refreshKey: 0,
};

// ============================================
// REDUCER
// ============================================

function calendarReducer(state: CalendarState, action: CalendarAction): CalendarState {
  switch (action.type) {
    case 'SET_PROPERTIES':
      return { ...state, properties: action.payload };
      
    case 'SET_LOADING_PROPERTIES':
      return { ...state, loadingProperties: action.payload };
      
    case 'TOGGLE_PROPERTY': {
      const id = action.payload;
      const isSelected = state.selectedProperties.includes(id);
      return {
        ...state,
        selectedProperties: isSelected
          ? state.selectedProperties.filter(p => p !== id)
          : [...state.selectedProperties, id]
      };
    }
    
    case 'SET_SELECTED_PROPERTIES':
      return { ...state, selectedProperties: action.payload };
      
    case 'SET_RESERVATIONS':
      return { ...state, reservations: action.payload };
      
    case 'SET_BLOCKS':
      return { ...state, blocks: action.payload };
      
    case 'SET_LOADING_RESERVATIONS':
      return { ...state, loadingReservations: action.payload };
      
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };
      
    case 'SET_MONTH':
      return { ...state, currentMonth: action.payload };
      
    case 'SET_DATE_RANGE':
      return { ...state, dateRange: action.payload };
      
    case 'SET_RESERVATION_TYPES':
      return { ...state, selectedReservationTypes: action.payload };
      
    case 'TRIGGER_REFRESH':
      return { ...state, refreshKey: state.refreshKey + 1 };
      
    default:
      return state;
  }
}

// ============================================
// CONTEXT
// ============================================

const CalendarContext = createContext<CalendarContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

interface CalendarProviderProps {
  children: ReactNode;
}

export function CalendarProvider({ children }: CalendarProviderProps) {
  const [state, dispatch] = useReducer(calendarReducer, initialState);
  const [searchParams, setSearchParams] = useSearchParams();
  const [urlCopied, setUrlCopied] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  // ════════════════════════════════════════════════════════════════════════════
  // 🔗 DRAFT STATE - Filtros editáveis (não aplicados ainda)
  // ════════════════════════════════════════════════════════════════════════════
  const [draftView, setDraftView] = useState<'calendar' | 'list' | 'timeline'>('calendar');
  const [draftDateRange, setDraftDateRangeState] = useState<{ from: Date; to: Date }>({
    from: new Date(),
    to: new Date(new Date().setDate(new Date().getDate() + 30))
  });
  const [draftSelectedProperties, setDraftSelectedPropertiesState] = useState<string[]>([]);
  const [draftReservationTypes, setDraftReservationTypes] = useState<string[]>([
    'pending', 'confirmed', 'checked_in', 'checked_out'
  ]);
  
  // ════════════════════════════════════════════════════════════════════════════
  // 🔗 URL SYNC - Helpers
  // ════════════════════════════════════════════════════════════════════════════
  
  const parseDate = useCallback((value: string | null, fallback: Date): Date => {
    if (!value) return fallback;
    try {
      const parsed = parseISO(value);
      return isValid(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }, []);

  const serializeDate = useCallback((date: Date | null | undefined): string | null => {
    if (!date || !isValid(date)) return null;
    try {
      return date.toISOString().split('T')[0];
    } catch {
      return null;
    }
  }, []);

  // Defaults - Começa HOJE e vai até 30 dias à frente
  const defaultDateFrom = useMemo(() => new Date(), []);
  const defaultDateTo = useMemo(() => addMonths(new Date(), 1), []);

  // ════════════════════════════════════════════════════════════════════════════
  // 🔗 INICIALIZAÇÃO - Ler URL params uma vez e sincronizar draft
  // ════════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    if (initialized) return;
    
    // View
    const viewParam = searchParams.get('view');
    if (viewParam === 'list' || viewParam === 'timeline') {
      dispatch({ type: 'SET_VIEW', payload: viewParam });
      setDraftView(viewParam);
    }
    
    // Date Range
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const dateFrom = parseDate(fromParam, defaultDateFrom);
    const dateTo = parseDate(toParam, defaultDateTo);
    
    dispatch({ type: 'SET_DATE_RANGE', payload: { from: dateFrom, to: dateTo } });
    setDraftDateRangeState({ from: dateFrom, to: dateTo });
    
    // Types
    const typesParam = searchParams.get('types');
    if (typesParam) {
      const types = typesParam.split(',').filter(Boolean);
      if (types.length > 0) {
        dispatch({ type: 'SET_RESERVATION_TYPES', payload: types });
        setDraftReservationTypes(types);
      }
    }
    
    setInitialized(true);
  }, [initialized, searchParams, parseDate, defaultDateFrom, defaultDateTo]);
  
  // Sincronizar draft quando state muda (ex: por URL externa ou inicialização)
  useEffect(() => {
    setDraftView(state.currentView);
    setDraftDateRangeState(state.dateRange);
    setDraftReservationTypes(state.selectedReservationTypes);
    // Só sincroniza selectedProperties se o draft ainda estiver vazio (inicialização)
    // ou se vier de URL (o state muda mas draft ainda não tem valor)
    if (state.selectedProperties.length > 0 && draftSelectedProperties.length === 0) {
      setDraftSelectedPropertiesState(state.selectedProperties);
    }
  }, [state.currentView, state.dateRange, state.selectedReservationTypes, state.selectedProperties]);
  
  // ════════════════════════════════════════════════════════════════════════════
  // Verificar se há mudanças pendentes
  // ════════════════════════════════════════════════════════════════════════════
  
  const hasPendingChanges = useMemo(() => {
    const viewChanged = draftView !== state.currentView;
    const dateFromChanged = serializeDate(draftDateRange.from) !== serializeDate(state.dateRange.from);
    const dateToChanged = serializeDate(draftDateRange.to) !== serializeDate(state.dateRange.to);
    
    // Comparar propriedades selecionadas (só se ambos tiverem valores)
    let propsChanged = false;
    if (draftSelectedProperties.length > 0 && state.selectedProperties.length > 0) {
      const draftSorted = [...draftSelectedProperties].sort().join(',');
      const stateSorted = [...state.selectedProperties].sort().join(',');
      propsChanged = draftSorted !== stateSorted;
    }
    
    const typesChanged = JSON.stringify([...draftReservationTypes].sort()) !== JSON.stringify([...state.selectedReservationTypes].sort());
    
    return viewChanged || dateFromChanged || dateToChanged || propsChanged || typesChanged;
  }, [draftView, draftDateRange, draftSelectedProperties, draftReservationTypes, 
      state.currentView, state.dateRange, state.selectedProperties, state.selectedReservationTypes, 
      serializeDate]);
  
  // ════════════════════════════════════════════════════════════════════════════
  // 🔍 APLICAR FILTROS - Chamado ao clicar em "Buscar"
  // ════════════════════════════════════════════════════════════════════════════
  
  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    
    // View
    if (draftView !== 'calendar') {
      params.set('view', draftView);
    }
    
    // Date Range
    const fromStr = serializeDate(draftDateRange.from);
    const toStr = serializeDate(draftDateRange.to);
    const defaultFromStr = serializeDate(defaultDateFrom);
    const defaultToStr = serializeDate(defaultDateTo);
    
    if (fromStr && fromStr !== defaultFromStr) {
      params.set('from', fromStr);
    }
    if (toStr && toStr !== defaultToStr) {
      params.set('to', toStr);
    }
    
    // Properties
    if (draftSelectedProperties.length > 0 && 
        state.properties.length > 0 && 
        draftSelectedProperties.length < state.properties.length) {
      params.set('props', draftSelectedProperties.join(','));
    }
    
    // Types
    const defaultTypes = ['pending', 'confirmed', 'checked_in', 'checked_out'];
    const isDefaultTypes = draftReservationTypes.length === defaultTypes.length && 
                          draftReservationTypes.every(t => defaultTypes.includes(t));
    if (!isDefaultTypes) {
      params.set('types', draftReservationTypes.join(','));
    }
    
    // Aplicar ao state
    dispatch({ type: 'SET_VIEW', payload: draftView });
    dispatch({ type: 'SET_DATE_RANGE', payload: draftDateRange });
    dispatch({ type: 'SET_SELECTED_PROPERTIES', payload: draftSelectedProperties });
    dispatch({ type: 'SET_RESERVATION_TYPES', payload: draftReservationTypes });
    
    // Atualizar URL
    setSearchParams(params, { replace: true });
    
    // Refresh
    dispatch({ type: 'TRIGGER_REFRESH' });
  }, [draftView, draftDateRange, draftSelectedProperties, draftReservationTypes, 
      state.properties.length, serializeDate, defaultDateFrom, defaultDateTo, setSearchParams]);
  
  // ════════════════════════════════════════════════════════════════════════════
  // Setters para Draft
  // ════════════════════════════════════════════════════════════════════════════
  
  const setDraftDateRange = useCallback((range: { from: Date; to: Date }) => {
    setDraftDateRangeState(range);
  }, []);
  
  const setDraftSelectedProperties = useCallback((props: string[] | ((prev: string[]) => string[])) => {
    setDraftSelectedPropertiesState(prev => {
      return typeof props === 'function' ? props(prev) : props;
    });
  }, []);
  
  // ════════════════════════════════════════════════════════════════════════════
  // Helper methods para manter compatibilidade com código existente
  // ════════════════════════════════════════════════════════════════════════════
  
  const setProperties = (properties: Property[]) => {
    dispatch({ type: 'SET_PROPERTIES', payload: properties });
    
    // Se há props na URL, aplicar após carregar propriedades
    const propsParam = searchParams.get('props');
    if (propsParam && properties.length > 0) {
      const propsFromUrl = propsParam.split(',').filter(Boolean);
      const validProps = propsFromUrl.filter(id => properties.some(p => p.id === id));
      if (validProps.length > 0) {
        dispatch({ type: 'SET_SELECTED_PROPERTIES', payload: validProps });
        setDraftSelectedPropertiesState(validProps);
      } else {
        // Se nenhuma propriedade da URL for válida, selecionar todas
        dispatch({ type: 'SET_SELECTED_PROPERTIES', payload: properties.map(p => p.id) });
        setDraftSelectedPropertiesState(properties.map(p => p.id));
      }
    } else if (state.selectedProperties.length === 0) {
      // Sem URL params, selecionar todas
      dispatch({ type: 'SET_SELECTED_PROPERTIES', payload: properties.map(p => p.id) });
      setDraftSelectedPropertiesState(properties.map(p => p.id));
    }
  };
  
  // Esses setters agora atualizam APENAS o draft (não aplicam direto)
  const setSelectedProperties = useCallback((properties: string[] | ((prev: string[]) => string[])) => {
    setDraftSelectedPropertiesState(prev => {
      return typeof properties === 'function' ? properties(prev) : properties;
    });
  }, []);
  
  const setReservations = (reservations: Reservation[]) => {
    console.log('📝 [CalendarContext] setReservations chamado com', reservations?.length, 'reservas');
    dispatch({ type: 'SET_RESERVATIONS', payload: reservations });
  };
  
  const setBlocks = (blocks: any[]) => {
    dispatch({ type: 'SET_BLOCKS', payload: blocks });
  };
  
  const setCurrentView = useCallback((view: 'calendar' | 'list' | 'timeline') => {
    setDraftView(view);
  }, []);
  
  const setCurrentMonth = (date: Date) => {
    dispatch({ type: 'SET_MONTH', payload: date });
  };
  
  const setDateRange = useCallback((range: { from: Date; to: Date }) => {
    setDraftDateRangeState(range);
  }, []);
  
  const setSelectedReservationTypes = useCallback((types: string[]) => {
    setDraftReservationTypes(types);
  }, []);
  
  const triggerRefresh = () => {
    dispatch({ type: 'TRIGGER_REFRESH' });
  };
  
  // ════════════════════════════════════════════════════════════════════════════
  // 🔗 URL SYNC - Copy e Reset
  // ════════════════════════════════════════════════════════════════════════════
  
  const copyFilterUrl = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}?${searchParams.toString()}`;
    navigator.clipboard.writeText(url).then(() => {
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    }).catch(console.error);
  }, [searchParams]);
  
  const resetAllFilters = useCallback(() => {
    // Reset draft
    setDraftView('calendar');
    setDraftDateRangeState({ from: defaultDateFrom, to: defaultDateTo });
    setDraftReservationTypes(['pending', 'confirmed', 'checked_in', 'checked_out']);
    if (state.properties.length > 0) {
      setDraftSelectedPropertiesState(state.properties.map(p => p.id));
    }
    
    // Reset state
    setSearchParams(new URLSearchParams(), { replace: true });
    dispatch({ type: 'SET_VIEW', payload: 'calendar' });
    dispatch({ type: 'SET_DATE_RANGE', payload: { from: defaultDateFrom, to: defaultDateTo } });
    dispatch({ type: 'SET_RESERVATION_TYPES', payload: ['pending', 'confirmed', 'checked_in', 'checked_out'] });
    if (state.properties.length > 0) {
      dispatch({ type: 'SET_SELECTED_PROPERTIES', payload: state.properties.map(p => p.id) });
    }
  }, [setSearchParams, defaultDateFrom, defaultDateTo, state.properties]);
  
  const hasActiveFilters = useMemo(() => {
    return state.currentView !== 'calendar' ||
           searchParams.has('from') ||
           searchParams.has('to') ||
           searchParams.has('types') ||
           searchParams.has('props');
  }, [state.currentView, searchParams]);
  
  const value: CalendarContextValue = {
    state,
    dispatch,
    setProperties,
    setSelectedProperties,
    setReservations,
    setBlocks,
    setCurrentView,
    setCurrentMonth,
    setDateRange,
    setSelectedReservationTypes,
    triggerRefresh,
    copyFilterUrl,
    resetAllFilters,
    applyFilters,
    hasActiveFilters,
    hasPendingChanges,
    urlCopied,
    draftView,
    draftDateRange,
    draftSelectedProperties,
    draftReservationTypes,
    setDraftView,
    setDraftDateRange,
    setDraftSelectedProperties,
    setDraftReservationTypes,
  };
  
  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useCalendar() {
  const context = useContext(CalendarContext);
  
  if (!context) {
    throw new Error('useCalendar deve ser usado dentro de CalendarProvider');
  }
  
  return context;
}

// ============================================
// EXPORTS
// ============================================

export type { CalendarState, CalendarAction, CalendarContextValue };
