/**
 * StaysNet Integration - Import Hook
 * Manages import state with useReducer for complex state management
 */

import { useReducer, useCallback } from 'react';
import { StaysNetService } from '../services/staysnet.service';
import { validatePropertyIds, validateImportOptions } from '../utils/validators';
import { staysnetLogger } from '../utils/logger';
import type { ImportProgressData } from '../components/ImportProgress';
import type {
  StaysNetConfig,
  ImportState,
  ImportStats,
  ImportType,
  ImportOptions,
  StaysNetProperty,
  ImportPreview,
  ImportLogEntry,
  ImportLogLevel,
  ImportLogScope,
} from '../types';

export interface UseStaysNetImportReturn extends ImportStateExtended {
  fetchProperties: (config: StaysNetConfig) => Promise<StaysNetProperty[]>;
  importProperties: (config: StaysNetConfig, options: ImportOptions) => Promise<void>;
  importNewProperties: (config: StaysNetConfig) => Promise<void>;
  importReservations: (config: StaysNetConfig, options: ImportOptions) => Promise<void>;
  importGuests: (config: StaysNetConfig, options?: Pick<ImportOptions, 'startDate' | 'endDate' | 'dateType'>) => Promise<void>;
  importAll: (config: StaysNetConfig, options: ImportOptions) => Promise<void>;
  importOneForTest: (config: StaysNetConfig) => Promise<void>;
  toggleProperty: (propertyId: string) => void;
  selectAllProperties: () => void;
  deselectAllProperties: () => void;
  selectProperties: (ids: string[]) => void;
  selectNewProperties: () => void;
  resetImport: () => void;
  clearImportLogs: () => void;
}

// Action types
type ImportAction =
  | { type: 'START_IMPORT'; payload: ImportType }
  | { type: 'IMPORT_SUCCESS'; payload: ImportStats }
  | { type: 'IMPORT_ERROR'; payload: string }
  | { type: 'RESET_IMPORT' }
  | { type: 'FETCH_PROPERTIES_START' }
  | { type: 'FETCH_PROPERTIES_SUCCESS'; payload: StaysNetProperty[] }
  | { type: 'FETCH_PROPERTIES_ERROR'; payload: string }
  | { type: 'SELECT_PROPERTY'; payload: string }
  | { type: 'DESELECT_PROPERTY'; payload: string }
  | { type: 'SELECT_ALL_PROPERTIES' }
  | { type: 'DESELECT_ALL_PROPERTIES' }
  | { type: 'SET_SELECTED_PROPERTIES'; payload: string[] }
  | { type: 'SET_PREVIEW'; payload: ImportPreview | null }
  | { type: 'UPDATE_PROGRESS'; payload: { progress: ImportProgressData; overallProgress: number } }
  | { type: 'ADD_IMPORT_LOG'; payload: ImportLogEntry }
  | { type: 'CLEAR_IMPORT_LOGS' };

interface ImportStateExtended extends ImportState {
  availableProperties: StaysNetProperty[];
  selectedPropertyIds: string[];
  loadingProperties: boolean;
  propertiesError: string | null;
  importProgress: ImportProgressData;
  overallProgress: number;
  preview: ImportPreview | null;
  importLogs: ImportLogEntry[];
}

const initialState: ImportStateExtended = {
  isImporting: false,
  importType: null,
  stats: null,
  error: null,
  availableProperties: [],
  selectedPropertyIds: [],
  loadingProperties: false,
  propertiesError: null,
  importProgress: {},
  overallProgress: 0,
  preview: null,
  importLogs: [],
};

function safeGetHost(baseUrl: string): string | null {
  try {
    return new URL(baseUrl).host;
  } catch {
    return null;
  }
}

function formatStats(stats?: { fetched?: number; created?: number; updated?: number; failed?: number } | null) {
  if (!stats) return null;
  return {
    fetched: stats.fetched ?? 0,
    created: stats.created ?? 0,
    updated: stats.updated ?? 0,
    failed: stats.failed ?? 0,
  };
}

/**
 * Import state reducer
 */
function importReducer(state: ImportStateExtended, action: ImportAction): ImportStateExtended {
  switch (action.type) {
    case 'START_IMPORT':
      return {
        ...state,
        isImporting: true,
        importType: action.payload,
        stats: null,
        error: null,
      };

    case 'IMPORT_SUCCESS':
      return {
        ...state,
        isImporting: false,
        stats: action.payload,
        error: null,
      };

    case 'IMPORT_ERROR':
      return {
        ...state,
        isImporting: false,
        error: action.payload,
      };

    case 'RESET_IMPORT':
      return {
        ...state,
        isImporting: false,
        importType: null,
        stats: null,
        error: null,
      };

    case 'FETCH_PROPERTIES_START':
      return {
        ...state,
        loadingProperties: true,
        propertiesError: null,
      };

    case 'FETCH_PROPERTIES_SUCCESS':
      return {
        ...state,
        loadingProperties: false,
        availableProperties: action.payload,
        propertiesError: null,
      };

    case 'FETCH_PROPERTIES_ERROR':
      return {
        ...state,
        loadingProperties: false,
        propertiesError: action.payload,
      };

    case 'SELECT_PROPERTY':
      return {
        ...state,
        selectedPropertyIds: [...state.selectedPropertyIds, action.payload],
      };

    case 'DESELECT_PROPERTY':
      return {
        ...state,
        selectedPropertyIds: state.selectedPropertyIds.filter((id) => id !== action.payload),
      };

    case 'SELECT_ALL_PROPERTIES':
      return {
        ...state,
        selectedPropertyIds: state.availableProperties.map((p) => p.id),
      };

    case 'DESELECT_ALL_PROPERTIES':
      return {
        ...state,
        selectedPropertyIds: [],
      };

    case 'SET_SELECTED_PROPERTIES':
      return {
        ...state,
        selectedPropertyIds: action.payload,
      };

    case 'SET_PREVIEW':
      return {
        ...state,
        preview: action.payload,
      };

    case 'UPDATE_PROGRESS':
      return {
        ...state,
        importProgress: action.payload.progress,
        overallProgress: action.payload.overallProgress,
      };

    case 'ADD_IMPORT_LOG': {
      const next = [...state.importLogs, action.payload];
      // Keep last 200 entries to avoid unbounded growth.
      return { ...state, importLogs: next.slice(-200) };
    }

    case 'CLEAR_IMPORT_LOGS':
      return { ...state, importLogs: [] };

    default:
      return state;
  }
}

export function useStaysNetImport(): UseStaysNetImportReturn {
  const [state, dispatch] = useReducer(importReducer, initialState);

  const addImportLog = useCallback(
    (level: ImportLogLevel, scope: ImportLogScope, message: string, details?: Record<string, unknown>) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      dispatch({
        type: 'ADD_IMPORT_LOG',
        payload: {
          id,
          timestamp: new Date().toISOString(),
          level,
          scope,
          message,
          details,
        },
      });
    },
    []
  );

  const clearImportLogs = useCallback(() => {
    dispatch({ type: 'CLEAR_IMPORT_LOGS' });
  }, []);

  const startPseudoProgress = useCallback(
    (step: keyof ImportProgressData, overallStart = 5, overallCap = 90) => {
      let overall = overallStart;

      // Init step progress
      dispatch({
        type: 'UPDATE_PROGRESS',
        payload: {
          progress: {
            [step]: { total: 100, current: Math.max(0, Math.min(100, overallStart)), status: 'in-progress' },
          },
          overallProgress: overallStart,
        },
      });

      const timer = window.setInterval(() => {
        // Avança lentamente até ~90% para mostrar atividade enquanto a request roda.
        overall = Math.min(overall + Math.random() * 7 + 1, overallCap);
        const current = Math.max(0, Math.min(100, Math.round(overall)));

        dispatch({
          type: 'UPDATE_PROGRESS',
          payload: {
            progress: {
              [step]: { total: 100, current, status: 'in-progress' },
            },
            overallProgress: current,
          },
        });
      }, 450);

      return () => window.clearInterval(timer);
    },
    []
  );

  /**
   * Fetch available properties
   */
  const fetchProperties = useCallback(async (config: StaysNetConfig): Promise<StaysNetProperty[]> => {
    staysnetLogger.properties.info('Buscando propriedades disponíveis...');
    dispatch({ type: 'FETCH_PROPERTIES_START' });

    addImportLog(
      'info',
      'properties',
      'Iniciando busca de imóveis (propriedades) no Stays.net',
      {
        baseUrlHost: safeGetHost(config.baseUrl) || undefined,
      }
    );

    try {
      const rawProperties = await StaysNetService.fetchAllProperties(config);

      // Normaliza: Stays.net entrega `_id`, mas o UI usa `id`
      const properties: StaysNetProperty[] = (rawProperties || [])
        .map((p: any) => ({ ...p, id: p?._id || p?.id }))
        .filter((p: any) => Boolean(p?.id));

      dispatch({ type: 'FETCH_PROPERTIES_SUCCESS', payload: properties });
      staysnetLogger.properties.success(`${properties.length} propriedades carregadas`);

      addImportLog('success', 'properties', 'Imóveis carregados com sucesso', {
        fetchedProperties: properties.length,
      });

      const propertyIds = properties.map((p) => p.id).filter(Boolean);
      
      console.log(`[useStaysNetImport] 🔍 Extracted ${propertyIds.length} property IDs`);
      console.log(`[useStaysNetImport] 📋 Sample IDs:`, propertyIds.slice(0, 5));
      
      try {
        const preview = await StaysNetService.previewImport(propertyIds);
        dispatch({ type: 'SET_PREVIEW', payload: preview });
        // Seleciona por padrão apenas os novos para evitar duplicações
        dispatch({ type: 'SET_SELECTED_PROPERTIES', payload: preview.newIds || [] });
        staysnetLogger.import.info('Preview de importação gerado', preview);

        addImportLog('success', 'properties', 'Preview de importação gerado', {
          totalRemote: preview.totalRemote,
          existingCount: preview.existingCount,
          newCount: preview.newCount,
          selectedNewByDefault: (preview.newIds || []).length,
        });
      } catch (previewError) {
        staysnetLogger.import.error('Erro ao gerar preview de importação', previewError);
        dispatch({ type: 'SET_PREVIEW', payload: null });

        addImportLog('error', 'properties', 'Falha ao gerar preview de importação', {
          error: (previewError as Error)?.message || String(previewError),
        });
      }

      return properties;
    } catch (error) {
      const errorMessage = (error as Error).message;
      dispatch({ type: 'FETCH_PROPERTIES_ERROR', payload: errorMessage });
      staysnetLogger.properties.error('Erro ao buscar propriedades', error);

      addImportLog('error', 'properties', 'Falha ao buscar imóveis (propriedades)', {
        error: errorMessage,
      });

      return [];
    }
  }, [addImportLog]);

  /**
   * Import properties
   */
  const importProperties = useCallback(
    async (config: StaysNetConfig, options: ImportOptions) => {
      staysnetLogger.import.info('Iniciando importação de propriedades...');
      dispatch({ type: 'START_IMPORT', payload: 'properties' });

      const startedAt = Date.now();
      addImportLog('info', 'properties', 'Iniciando importação de imóveis (propriedades)', {
        selectedProperties: options.selectedPropertyIds?.length || 0,
      });

      try {
        // Validate
        const validation = validatePropertyIds(options.selectedPropertyIds);
        if (!validation.isValid) {
          throw new Error(validation.message);
        }

        const total = options.selectedPropertyIds.length;

        // Simulate progress (since backend doesn't support streaming yet)
        const updateProgress = (current: number) => {
          const percentage = (current / total) * 100;
          dispatch({
            type: 'UPDATE_PROGRESS',
            payload: {
              progress: {
                properties: {
                  total,
                  current,
                  status: current < total ? 'in-progress' : 'completed',
                },
              },
              overallProgress: percentage,
            },
          });
        };

        // Initial progress
        updateProgress(0);

        // Start import
        const result = await StaysNetService.importProperties(config, options);

        // Complete progress
        updateProgress(total);

        dispatch({ type: 'IMPORT_SUCCESS', payload: result.stats });

        addImportLog('success', 'properties', 'Importação de imóveis concluída', {
          durationMs: Date.now() - startedAt,
          properties: formatStats(result.stats?.properties) || undefined,
        });
      } catch (error) {
        const errorMessage = (error as Error).message;
        dispatch({ type: 'IMPORT_ERROR', payload: errorMessage });

        addImportLog('error', 'properties', 'Falha na importação de imóveis (propriedades)', {
          durationMs: Date.now() - startedAt,
          error: errorMessage,
        });
        throw error;
      }
    },
    [addImportLog]
  );

  /**
   * Import only new properties detected in preview (no duplications)
   */
  const importNewProperties = useCallback(
    async (config: StaysNetConfig) => {
      const newIds = state.preview?.newIds || [];

      if (!newIds.length) {
        throw new Error('Nenhum imóvel novo encontrado para importar');
      }

      // Garante seleção alinhada com o que será enviado
      dispatch({ type: 'SET_SELECTED_PROPERTIES', payload: newIds });

      await importProperties(config, { selectedPropertyIds: newIds });
    },
    [state.preview?.newIds, importProperties]
  );

  /**
   * Import reservations
   */
  const importReservations = useCallback(
    async (config: StaysNetConfig, options: ImportOptions) => {
      staysnetLogger.import.info('Iniciando importação de reservas...');
      dispatch({ type: 'START_IMPORT', payload: 'reservations' });

      const startedAt = Date.now();
      addImportLog('info', 'reservations', 'Iniciando importação de reservas', {
        selectedProperties: options.selectedPropertyIds?.length || 0,
        startDate: options.startDate || undefined,
        endDate: options.endDate || undefined,
        dateType: options.dateType || undefined,
      });

      let stop: (() => void) | null = null;

      try {
        // Validate
        const validation = validateImportOptions(options);
        if (!validation.isValid) {
          throw new Error(validation.message);
        }

        stop = startPseudoProgress('reservations');

        const result = await StaysNetService.importReservations(config, options);

        stop();
        stop = null;
        dispatch({
          type: 'UPDATE_PROGRESS',
          payload: {
            progress: {
              reservations: { total: 100, current: 100, status: 'completed' },
            },
            overallProgress: 100,
          },
        });

        dispatch({ type: 'IMPORT_SUCCESS', payload: result.stats });

        addImportLog('success', 'reservations', 'Importação de reservas concluída', {
          durationMs: Date.now() - startedAt,
          reservations: formatStats(result.stats?.reservations) || undefined,
        });
      } catch (error) {
        const errorMessage = (error as Error).message;
        dispatch({
          type: 'UPDATE_PROGRESS',
          payload: {
            progress: {
              reservations: { total: 100, current: 100, status: 'error' },
            },
            overallProgress: Math.max(state.overallProgress, 0),
          },
        });
        dispatch({ type: 'IMPORT_ERROR', payload: errorMessage });

        addImportLog('error', 'reservations', 'Falha na importação de reservas', {
          durationMs: Date.now() - startedAt,
          error: errorMessage,
        });
        throw error;
      } finally {
        if (stop) stop();
      }
    },
    [addImportLog, startPseudoProgress, state.overallProgress]
  );

  /**
   * Import guests
   */
  const importGuests = useCallback(
    async (config: StaysNetConfig, options?: Pick<ImportOptions, 'startDate' | 'endDate' | 'dateType'>) => {
    staysnetLogger.import.info('Iniciando importação de hóspedes...');
    dispatch({ type: 'START_IMPORT', payload: 'guests' });

    const startedAt = Date.now();
    addImportLog('info', 'guests', 'Iniciando importação de hóspedes', {
      note: 'Este passo extrai hóspedes a partir das reservas retornadas pela Stays.net.',
      startDate: options?.startDate || undefined,
      endDate: options?.endDate || undefined,
      dateType: options?.dateType || undefined,
    });

    let stop: (() => void) | null = null;

    try {
      stop = startPseudoProgress('guests');
      const result = await StaysNetService.importGuests(config, options);

      stop();
      stop = null;
      dispatch({
        type: 'UPDATE_PROGRESS',
        payload: {
          progress: {
            guests: { total: 100, current: 100, status: 'completed' },
          },
          overallProgress: 100,
        },
      });

      dispatch({ type: 'IMPORT_SUCCESS', payload: result.stats });

      addImportLog('success', 'guests', 'Importação de hóspedes concluída', {
        durationMs: Date.now() - startedAt,
        guests: formatStats(result.stats?.guests) || undefined,
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      dispatch({
        type: 'UPDATE_PROGRESS',
        payload: {
          progress: {
            guests: { total: 100, current: 100, status: 'error' },
          },
          overallProgress: Math.max(state.overallProgress, 0),
        },
      });
      dispatch({ type: 'IMPORT_ERROR', payload: errorMessage });

      addImportLog('error', 'guests', 'Falha na importação de hóspedes', {
        durationMs: Date.now() - startedAt,
        error: errorMessage,
      });
      throw error;
    } finally {
      if (stop) stop();
    }
    },
    [addImportLog, startPseudoProgress, state.overallProgress]
  );

  /**
   * Import all (full sync)
   */
  const importAll = useCallback(
    async (config: StaysNetConfig, options: ImportOptions) => {
      staysnetLogger.import.info('Iniciando importação completa...');
      dispatch({ type: 'START_IMPORT', payload: 'all' });

      const startedAt = Date.now();
      addImportLog('info', 'all', 'Iniciando importação completa (imóveis + reservas + hóspedes)', {
        selectedProperties: options.selectedPropertyIds?.length || 0,
        startDate: options.startDate || undefined,
        endDate: options.endDate || undefined,
        dateType: options.dateType || undefined,
      });

      try {
        // Validate
        const propertyValidation = validatePropertyIds(options.selectedPropertyIds);
        const optionsValidation = validateImportOptions(options);

        if (!propertyValidation.isValid) {
          throw new Error(propertyValidation.message);
        }
        if (!optionsValidation.isValid) {
          throw new Error(optionsValidation.message);
        }

        // Progresso por etapas (properties -> reservations -> guests)
        dispatch({
          type: 'UPDATE_PROGRESS',
          payload: {
            progress: {
              properties: { total: 100, current: 0, status: 'pending' },
              reservations: { total: 100, current: 0, status: 'pending' },
              guests: { total: 100, current: 0, status: 'pending' },
            },
            overallProgress: 0,
          },
        });

        dispatch({
          type: 'UPDATE_PROGRESS',
          payload: {
            progress: {
              properties: { total: 100, current: 10, status: 'in-progress' },
              reservations: { total: 100, current: 0, status: 'pending' },
              guests: { total: 100, current: 0, status: 'pending' },
            },
            overallProgress: 5,
          },
        });

        const propertiesResult = await StaysNetService.importProperties(config, options);
        addImportLog('success', 'all', 'Etapa imóveis (propriedades) concluída', {
          properties: formatStats(propertiesResult.stats?.properties) || undefined,
        });
        dispatch({
          type: 'UPDATE_PROGRESS',
          payload: {
            progress: {
              properties: { total: 100, current: 100, status: 'completed' },
              reservations: { total: 100, current: 10, status: 'in-progress' },
              guests: { total: 100, current: 0, status: 'pending' },
            },
            overallProgress: 35,
          },
        });

        const reservationsResult = await StaysNetService.importReservations(config, options);
        addImportLog('success', 'all', 'Etapa reservas concluída', {
          reservations: formatStats(reservationsResult.stats?.reservations) || undefined,
        });
        dispatch({
          type: 'UPDATE_PROGRESS',
          payload: {
            progress: {
              properties: { total: 100, current: 100, status: 'completed' },
              reservations: { total: 100, current: 100, status: 'completed' },
              guests: { total: 100, current: 10, status: 'in-progress' },
            },
            overallProgress: 70,
          },
        });

        const guestsResult = await StaysNetService.importGuests(config, options);
        addImportLog('success', 'all', 'Etapa hóspedes concluída', {
          guests: formatStats(guestsResult.stats?.guests) || undefined,
        });
        dispatch({
          type: 'UPDATE_PROGRESS',
          payload: {
            progress: {
              properties: { total: 100, current: 100, status: 'completed' },
              reservations: { total: 100, current: 100, status: 'completed' },
              guests: { total: 100, current: 100, status: 'completed' },
            },
            overallProgress: 100,
          },
        });

        const result = {
          success: true,
          stats: {
            ...(propertiesResult.stats || {}),
            ...(reservationsResult.stats || {}),
            ...(guestsResult.stats || {}),
          },
        };

        dispatch({ type: 'IMPORT_SUCCESS', payload: result.stats });

        addImportLog('success', 'all', 'Importação completa concluída', {
          durationMs: Date.now() - startedAt,
          properties: formatStats(propertiesResult.stats?.properties) || undefined,
          reservations: formatStats(reservationsResult.stats?.reservations) || undefined,
          guests: formatStats(guestsResult.stats?.guests) || undefined,
        });
      } catch (error) {
        const errorMessage = (error as Error).message;
        dispatch({ type: 'IMPORT_ERROR', payload: errorMessage });

        addImportLog('error', 'all', 'Falha na importação completa', {
          durationMs: Date.now() - startedAt,
          error: errorMessage,
        });
        throw error;
      }
    },
    [addImportLog]
  );

  /**
   * Toggle property selection
   */
  const toggleProperty = useCallback((propertyId: string) => {
    dispatch({
      type: state.selectedPropertyIds.includes(propertyId)
        ? 'DESELECT_PROPERTY'
        : 'SELECT_PROPERTY',
      payload: propertyId,
    });
  }, [state.selectedPropertyIds]);

  /**
   * Select all properties
   */
  const selectAllProperties = useCallback(() => {
    dispatch({ type: 'SELECT_ALL_PROPERTIES' });
  }, []);

  /**
   * Deselect all properties
   */
  const deselectAllProperties = useCallback(() => {
    dispatch({ type: 'DESELECT_ALL_PROPERTIES' });
  }, []);

  /**
   * Select explicit list of properties (e.g., só novos)
   */
  const selectProperties = useCallback((ids: string[]) => {
    dispatch({ type: 'SET_SELECTED_PROPERTIES', payload: ids });
  }, []);

  /**
   * Select only new properties from preview to evitar duplicação
   */
  const selectNewProperties = useCallback(() => {
    const newIds = state.preview?.newIds || [];
    dispatch({ type: 'SET_SELECTED_PROPERTIES', payload: newIds });
  }, [state.preview?.newIds]);

  /**
   * Reset import state
   */
  const resetImport = useCallback(() => {
    dispatch({ type: 'RESET_IMPORT' });
  }, []);

  /**
   * 🧪 Import ONE property for testing with detailed logs
   * This function maps the entire data flow for debugging
   */
  const importOneForTest = useCallback(
    async (config: StaysNetConfig) => {
      dispatch({ type: 'START_IMPORT', payload: 'test' as ImportType });

      const startedAt = Date.now();
      addImportLog('info', 'test', 'Iniciando importação de teste (1 imóvel)', {
        baseUrlHost: safeGetHost(config.baseUrl) || undefined,
      });

      try {
        // Get first property
        const firstProperty = state.availableProperties[0];
        if (!firstProperty) {
          throw new Error('Nenhuma propriedade disponível para teste');
        }

        console.log('🧪 ==========================================');
        console.log('🧪 TESTE DE IMPORTAÇÃO - 1 IMÓVEL');
        console.log('🧪 ==========================================');
        console.log('');
        console.log('📦 DADOS DA API STAYS.NET:');
        console.log('Property ID:', firstProperty.id);
        console.log('Property Name:', firstProperty.name || firstProperty.internalName);
        console.log('Internal Name:', firstProperty.internalName);
        console.log('');
        console.log('📋 DADOS COMPLETOS (JSON):');
        console.log(JSON.stringify(firstProperty, null, 2));
        console.log('');
        console.log('⏳ Enviando para backend...');

        // Import only this property
        const result = await StaysNetService.importProperties(config, {
          selectedPropertyIds: [firstProperty.id],
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });

        console.log('');
        console.log('✅ IMPORTAÇÃO CONCLUÍDA!');
        console.log('');
        console.log('📊 ESTATÍSTICAS:');
        console.log(JSON.stringify(result.stats, null, 2));
        console.log('');
        console.log('🎯 PRÓXIMOS PASSOS:');
        console.log('1. Verificar tabela "anuncios" no banco');
        console.log('2. Verificar mapeamento de campos');
        console.log('3. Confirmar relacionamentos (property_id, etc)');
        console.log('');
        console.log('🧪 ==========================================');

        dispatch({ type: 'IMPORT_SUCCESS', payload: result.stats });

        addImportLog('success', 'test', 'Importação de teste concluída', {
          durationMs: Date.now() - startedAt,
          properties: formatStats(result.stats?.properties) || undefined,
        });
      } catch (error) {
        console.error('');
        console.error('❌ ERRO NA IMPORTAÇÃO DE TESTE:');
        console.error(error);
        console.error('');
        
        const errorMessage = (error as Error).message;
        dispatch({ type: 'IMPORT_ERROR', payload: errorMessage });

        addImportLog('error', 'test', 'Falha na importação de teste', {
          durationMs: Date.now() - startedAt,
          error: errorMessage,
        });
        throw error;
      }
    },
    [addImportLog, state.availableProperties]
  );

  return {
    ...state,
    fetchProperties,
    importProperties,
    importNewProperties,
    importReservations,
    importGuests,
    importAll,
    importOneForTest,
    toggleProperty,
    selectAllProperties,
    deselectAllProperties,
    selectProperties,
    selectNewProperties,
    resetImport,
    clearImportLogs,
  };
}
