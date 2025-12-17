/**
 * CALENDAR CONTEXT
 * Gerencia estado centralizado do calendário sem afetar UI existente
 * v1.0.0 - Refatoração invisível
 */

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
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
}

// ============================================
// INITIAL STATE
// ============================================

const initialState: CalendarState = {
  properties: [],
  selectedProperties: [],
  loadingProperties: false,
  
  reservations: [],
  blocks: [],
  loadingReservations: false,
  
  currentView: 'calendar',
  currentMonth: new Date(),
  dateRange: {
    from: new Date(2025, 9, 24),
    to: new Date(2025, 10, 11)
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
  
  // Helper methods para manter compatibilidade com código existente
  const setProperties = (properties: Property[]) => {
    dispatch({ type: 'SET_PROPERTIES', payload: properties });
  };
  
  const setSelectedProperties = (properties: string[] | ((prev: string[]) => string[])) => {
    const newProperties = typeof properties === 'function' 
      ? properties(state.selectedProperties)
      : properties;
    dispatch({ type: 'SET_SELECTED_PROPERTIES', payload: newProperties });
  };
  
  const setReservations = (reservations: Reservation[]) => {
    dispatch({ type: 'SET_RESERVATIONS', payload: reservations });
  };
  
  const setBlocks = (blocks: any[]) => {
    dispatch({ type: 'SET_BLOCKS', payload: blocks });
  };
  
  const setCurrentView = (view: 'calendar' | 'list' | 'timeline') => {
    dispatch({ type: 'SET_VIEW', payload: view });
  };
  
  const setCurrentMonth = (date: Date) => {
    dispatch({ type: 'SET_MONTH', payload: date });
  };
  
  const setDateRange = (range: { from: Date; to: Date }) => {
    dispatch({ type: 'SET_DATE_RANGE', payload: range });
  };
  
  const setSelectedReservationTypes = (types: string[]) => {
    dispatch({ type: 'SET_RESERVATION_TYPES', payload: types });
  };
  
  const triggerRefresh = () => {
    dispatch({ type: 'TRIGGER_REFRESH' });
  };
  
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
