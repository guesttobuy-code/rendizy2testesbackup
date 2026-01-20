/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║ 🔗 useUrlFilters - Hook para sincronização de filtros com URL               ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ Permite que filtros de listagens/calendários sejam persistidos na URL.      ║
 * ║ Benefícios:                                                                  ║
 * ║ - Compartilhamento de links com filtros aplicados                           ║
 * ║ - Refresh mantém o estado dos filtros                                       ║
 * ║ - Back/Forward do navegador funciona corretamente                           ║
 * ║                                                                              ║
 * ║ @author Criado em 2026-01-18                                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { startOfMonth, endOfMonth, addMonths, parseISO, isValid } from 'date-fns';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

export interface UrlFilterConfig<T> {
  /** Nome do parâmetro na URL */
  param: string;
  /** Valor padrão quando não está na URL */
  defaultValue: T;
  /** Converte string da URL para o tipo correto */
  parse: (value: string | null) => T;
  /** Converte valor para string da URL */
  serialize: (value: T) => string | null;
  /** Verifica se o valor é o padrão (não precisa estar na URL) */
  isDefault?: (value: T) => boolean;
}

export interface UseUrlFiltersResult<T extends Record<string, any>> {
  /** Valores atuais dos filtros (da URL ou defaults) */
  filters: T;
  /** Atualiza um filtro específico */
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Atualiza múltiplos filtros de uma vez */
  setFilters: (updates: Partial<T>) => void;
  /** Reseta todos os filtros para valores padrão */
  resetFilters: () => void;
  /** Verifica se há algum filtro ativo (diferente do padrão) */
  hasActiveFilters: boolean;
  /** Gera URL com os filtros atuais para compartilhar */
  getShareableUrl: () => string;
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS DE PARSING
// ════════════════════════════════════════════════════════════════════════════

/** Parse de string para Date (formato ISO: YYYY-MM-DD) */
export const parseDate = (value: string | null, fallback: Date): Date => {
  if (!value) return fallback;
  try {
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

/** Serializa Date para string ISO (YYYY-MM-DD) */
export const serializeDate = (date: Date | null | undefined): string | null => {
  if (!date || !isValid(date)) return null;
  try {
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
};

/** Parse de string para array (separado por vírgula) */
export const parseArray = (value: string | null): string[] => {
  if (!value) return [];
  return value.split(',').map(s => s.trim()).filter(Boolean);
};

/** Serializa array para string (separado por vírgula) */
export const serializeArray = (arr: string[]): string | null => {
  if (!arr || arr.length === 0) return null;
  return arr.join(',');
};

/** Parse de string para número */
export const parseNumber = (value: string | null, fallback: number): number => {
  if (!value) return fallback;
  const num = parseInt(value, 10);
  return Number.isFinite(num) ? num : fallback;
};

// ════════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function useUrlFilters<T extends Record<string, any>>(
  configs: { [K in keyof T]: UrlFilterConfig<T[K]> }
): UseUrlFiltersResult<T> {
  const [searchParams, setSearchParams] = useSearchParams();

  // Extrai valores atuais da URL (ou usa defaults)
  const filters = useMemo(() => {
    const result = {} as T;
    for (const key of Object.keys(configs) as (keyof T)[]) {
      const config = configs[key];
      const urlValue = searchParams.get(config.param);
      result[key] = config.parse(urlValue);
    }
    return result;
  }, [searchParams, configs]);

  // Atualiza um filtro
  const setFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    const config = configs[key];
    const serialized = config.serialize(value);
    const isDefault = config.isDefault ? config.isDefault(value) : serialized === config.serialize(config.defaultValue);

    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (isDefault || serialized === null) {
        next.delete(config.param);
      } else {
        next.set(config.param, serialized);
      }
      return next;
    }, { replace: true });
  }, [configs, setSearchParams]);

  // Atualiza múltiplos filtros
  const setFilters = useCallback((updates: Partial<T>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      for (const key of Object.keys(updates) as (keyof T)[]) {
        const config = configs[key];
        const value = updates[key] as T[keyof T];
        const serialized = config.serialize(value);
        const isDefault = config.isDefault ? config.isDefault(value) : serialized === config.serialize(config.defaultValue);

        if (isDefault || serialized === null) {
          next.delete(config.param);
        } else {
          next.set(config.param, serialized);
        }
      }
      return next;
    }, { replace: true });
  }, [configs, setSearchParams]);

  // Reseta todos os filtros
  const resetFilters = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      for (const key of Object.keys(configs) as (keyof T)[]) {
        next.delete(configs[key].param);
      }
      return next;
    }, { replace: true });
  }, [configs, setSearchParams]);

  // Verifica se há filtros ativos
  const hasActiveFilters = useMemo(() => {
    for (const key of Object.keys(configs) as (keyof T)[]) {
      const config = configs[key];
      const value = filters[key];
      const isDefault = config.isDefault ? config.isDefault(value) : false;
      if (!isDefault) {
        const serialized = config.serialize(value);
        const defaultSerialized = config.serialize(config.defaultValue);
        if (serialized !== defaultSerialized) return true;
      }
    }
    return false;
  }, [filters, configs]);

  // Gera URL compartilhável
  const getShareableUrl = useCallback(() => {
    return `${window.location.origin}${window.location.pathname}?${searchParams.toString()}`;
  }, [searchParams]);

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    hasActiveFilters,
    getShareableUrl,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÕES PRÉ-DEFINIDAS PARA MÓDULOS COMUNS
// ════════════════════════════════════════════════════════════════════════════

/** Configuração de filtros para o módulo de Reservas */
export interface ReservationsUrlFilters {
  status: string;
  platform: string;
  dateFrom: Date;
  dateTo: Date;
  dateField: 'created' | 'checkin' | 'checkout';
  properties: string[];
  page: number;
}

const defaultDateFrom = startOfMonth(new Date());
const defaultDateTo = endOfMonth(addMonths(new Date(), 1));

export const reservationsFilterConfigs: { [K in keyof ReservationsUrlFilters]: UrlFilterConfig<ReservationsUrlFilters[K]> } = {
  status: {
    param: 'status',
    defaultValue: 'all',
    parse: (v) => v || 'all',
    serialize: (v) => v === 'all' ? null : v,
    isDefault: (v) => v === 'all',
  },
  platform: {
    param: 'platform',
    defaultValue: 'all',
    parse: (v) => v || 'all',
    serialize: (v) => v === 'all' ? null : v,
    isDefault: (v) => v === 'all',
  },
  dateFrom: {
    param: 'from',
    defaultValue: defaultDateFrom,
    parse: (v) => parseDate(v, defaultDateFrom),
    serialize: serializeDate,
  },
  dateTo: {
    param: 'to',
    defaultValue: defaultDateTo,
    parse: (v) => parseDate(v, defaultDateTo),
    serialize: serializeDate,
  },
  dateField: {
    param: 'dateField',
    defaultValue: 'checkin',
    parse: (v) => (v === 'created' || v === 'checkin' || v === 'checkout') ? v : 'checkin',
    serialize: (v) => v === 'checkin' ? null : v,
    isDefault: (v) => v === 'checkin',
  },
  properties: {
    param: 'props',
    defaultValue: [],
    parse: parseArray,
    serialize: serializeArray,
    isDefault: (v) => v.length === 0,
  },
  page: {
    param: 'page',
    defaultValue: 1,
    parse: (v) => parseNumber(v, 1),
    serialize: (v) => v === 1 ? null : String(v),
    isDefault: (v) => v === 1,
  },
};

/** Configuração de filtros para o módulo de Calendário */
export interface CalendarUrlFilters {
  properties: string[];
  view: 'calendar' | 'list' | 'timeline';
  types: string[];
  dateFrom: Date;
  dateTo: Date;
}

const calendarDefaultDateFrom = startOfMonth(new Date());
const calendarDefaultDateTo = endOfMonth(addMonths(new Date(), 2));

export const calendarFilterConfigs: { [K in keyof CalendarUrlFilters]: UrlFilterConfig<CalendarUrlFilters[K]> } = {
  properties: {
    param: 'props',
    defaultValue: [],
    parse: parseArray,
    serialize: serializeArray,
    isDefault: (v) => v.length === 0,
  },
  view: {
    param: 'view',
    defaultValue: 'calendar',
    parse: (v) => (v === 'calendar' || v === 'list' || v === 'timeline') ? v : 'calendar',
    serialize: (v) => v === 'calendar' ? null : v,
    isDefault: (v) => v === 'calendar',
  },
  types: {
    param: 'types',
    defaultValue: [],
    parse: parseArray,
    serialize: serializeArray,
    isDefault: (v) => v.length === 0,
  },
  dateFrom: {
    param: 'from',
    defaultValue: calendarDefaultDateFrom,
    parse: (v) => parseDate(v, calendarDefaultDateFrom),
    serialize: serializeDate,
  },
  dateTo: {
    param: 'to',
    defaultValue: calendarDefaultDateTo,
    parse: (v) => parseDate(v, calendarDefaultDateTo),
    serialize: serializeDate,
  },
};

// ════════════════════════════════════════════════════════════════════════════
// HOOKS ESPECÍFICOS POR MÓDULO (para facilitar o uso)
// ════════════════════════════════════════════════════════════════════════════

/** Hook pronto para uso no módulo de Reservas */
export function useReservationsUrlFilters() {
  return useUrlFilters<ReservationsUrlFilters>(reservationsFilterConfigs);
}

/** Hook pronto para uso no módulo de Calendário */
export function useCalendarUrlFilters() {
  return useUrlFilters<CalendarUrlFilters>(calendarFilterConfigs);
}
